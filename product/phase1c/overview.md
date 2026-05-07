# Phase 1c — Plan

Kickoff plan for Phase 1c (Planning sub-milestone). Three modules:
budgets, saving-goals, scheduled-transactions. This doc is the
canonical implementation plan; canonical *scope* lives in
[`../phases.md`](../phases.md).

---

## Goal

User can stay within budget, save toward a goal, and automate
scheduled transactions. Per [phases.md §Phase 1c](../phases.md).

## Current state

- BE migration head: **000036** (`init_scheduled_transactions`).
- Phase 1a + 1b modules + cross-cutting IconMaker: **done**.
- Phase 1c BE work: **done** — `saving_goals` (000034), `budgets` (000035),
  `scheduled_transactions` (000036) tables created; all handlers / services /
  stores wired and routes registered in `cmd/api/main.go`.
- Phase 1c FE work: **done** — `/saving-goals`, `/budgets`,
  `/scheduled-transactions` routes (+ `/new`, `/:id`, `/:id/edit`) all
  shipped; More-menu entries wired; cubits + repos provided in `app.dart`;
  l10n keys added (en + th). `flutter analyze` clean.

## Modules at a glance

| # | Module | Spec | BE endpoints | Schema delta | Complexity |
|---|---|---|---|---|---|
| 08 | Budgets | [`08-budgets.md`](../../design/spec/08-budgets.md) | 7 (CRUD + archive/restore + overview) | new `budgets` | Medium — recursive CTE for hierarchy rollup, user + project scope, period math |
| 09 | Saving goals | [`09-saving-goals.md`](../../design/spec/09-saving-goals.md) | 7 (CRUD + archive/restore + per-account allocations) | new `saving_goals` | Low — account-linked, allocation_pct sum constraint, simple compute |
| 11 | Scheduled transactions | [`11-scheduled-transactions.md`](../../design/spec/11-scheduled-transactions.md) | 9 (CRUD + pause/resume/cancel + manual trigger + history) | new `scheduled_transactions` + ALTER `transactions` add `scheduled_transaction_id` | High — lifecycle states, day-of-month math, three variants (recurring / installment / loan), manual trigger writes a real transaction + advances balance |

UI flows (already specced):
[Flow 10 budget](../ui-design/app/flows.md#10-setting-a-budget--p1c) ·
[Flow 11 saving goal](../ui-design/app/flows.md#11-setting-a-saving-goal--p1c) ·
[Flow 12 recurring](../ui-design/app/flows.md#12-setting-up-a-recurring-transaction--p1c).

## Suggested ship order

Modules don't depend on each other (each only uses already-shipped
tables: `accounts`, `categories`, `transactions`, `projects`). Order
is therefore purely a complexity ramp.

1. **Saving goals** — smallest surface; no recursion, no scheduler, no
   project complexity. Good warm-up for the BE patterns.
2. **Budgets** — mid surface; recursive CTE for hierarchy rollup,
   project-scope permission check.
3. **Scheduled transactions** — largest surface; lifecycle state
   machine, day-of-month math, manual trigger atomic with
   `transactions` insert + balance update.

Alternative: spec-numerical order (08 → 09 → 11) puts budgets first.
Same total work either way; preference call.

## Migration sequence

| # | Migration | Owns |
|---|---|---|
| 000034 | `saving_goals` | new `saving_goals` table |
| 000035 | `budgets` | new `budgets` table |
| 000036 | `scheduled_transactions` | new `scheduled_transactions` table + `ALTER transactions ADD scheduled_transaction_id UUID NULL` (FK + index) |

If the order flips to 08 → 09 → 11, the migration numbers reorder
accordingly.

---

## Per-module breakdown

### 1. Saving goals — migration 000034

**Schema** ([schema.md §09](../../design/database/schema.md#09--saving-goals)) —
columns: `id`, `user_id`, `name`, `target_amount`, `linked_account_id`,
`allocation_pct`, `deadline`, `icon_code` (JSONB nullable),
`note`, `status`, `currency` (derived from account at read), timestamps.
Indexes: `(user_id, status)`, `(linked_account_id, status)`.

**API constraint** — sum of `allocation_pct` per `linked_account_id`
across `status='active'` rows ≤ 100. Enforced API-side with
`SELECT … FOR UPDATE` to avoid concurrent-write drift.

**Endpoints** (per spec §3):
- `POST /v1/saving-goals` — create (with default-allocation suggestion if user omits `allocation_pct`)
- `GET /v1/saving-goals` — list with computed progress
- `GET /v1/saving-goals/:id`
- `PUT /v1/saving-goals/:id` — partial; allocation change re-checks sum
- `DELETE /v1/saving-goals/:id`
- `POST /v1/saving-goals/:id/archive` / `restore` — restore re-checks allocation sum
- `GET /v1/accounts/:id/saving-allocations` — pie helper for FE

**FE pages:**
- `/saving-goals` → `SavingGoalsListPage` (entry point in More menu)
- `/saving-goals/new` + `/saving-goals/:id/edit` → `SavingGoalFormPage` (full page; matches `account_form_page.dart` convention — no module uses modals for forms)
- `/saving-goals/:id` → `SavingGoalDetailPage`
- Per-account allocation pie helper widget (consumed by detail / form)

**Exit checklist:**
- [ ] User can create goal linked to an account; progress = balance × allocation
- [ ] Allocation sum > 100 rejected at API
- [ ] Archive frees capacity; restore blocked if would exceed 100
- [ ] `is_completed` re-flips to false when balance drops below target (non-sticky)
- [ ] Goals soft-delete-friendly: hard delete works, no cascades break

### 2. Budgets — migration 000035

**Schema** ([schema.md §08](../../design/database/schema.md#08--budgets)) —
columns: `id`, `user_id`, `category_id`, `project_id` (nullable, ≠ null
for project-scope), `amount`, `period`, `scope`, `currency`, `status`,
`icon_code`, timestamps.

**Uniqueness** — partial unique index on
`(user_id, category_id, period, COALESCE(project_id, '00000000…'))`
WHERE `status='active'`.

**Endpoints** (per spec §3):
- `POST /v1/budgets` — create; rejects income/system categories; project-owner-only for project-scope
- `GET /v1/budgets` — list with computed `current_period`, `child_breakdown`
- `GET /v1/budgets/:id`
- `PUT /v1/budgets/:id` — partial; `category_id` / `scope` / `project_id` not editable
- `DELETE /v1/budgets/:id`
- `POST /v1/budgets/:id/archive` / `restore`
- `GET /v1/budgets/overview` — aggregate across active budgets for a period/scope

**Compute layer:**
- Period start/end in user's tz (from `user_preferences.timezone`)
- Spend per period via recursive CTE on `categories.parent_id`, summing
  `transactions.amount` where `type='expense'` and category in
  descendants and (project-scope: `project_id = budget.project_id`)
- Child breakdown: same query grouped by direct child category

**FE pages:**
- `/budgets` → `BudgetsListPage` with progress bar per row (entry point in More menu)
- `/budgets/new` + `/budgets/:id/edit` → `BudgetFormPage` (full page)
- `/budgets/:id` → `BudgetDetailPage`
- Project-scope budgets list inside project detail page (Phase 1c
  scope; only project owner can create/edit/delete)
- Optional `/budgets/overview` summary card or inline header

**Exit checklist:**
- [ ] User-scope monthly budget tracks spend correctly across the period
- [ ] Parent-category budget includes descendant spending (3 levels)
- [ ] Project-scope budget coexists with user-scope on same category
- [ ] Only project owner can create/edit/delete project-scope budgets
- [ ] Income / system categories rejected on create
- [ ] Archive/restore round-trips; one active per (user, cat, period, project_id)

### 3. Scheduled transactions — migration 000036

**Schema** ([schema.md §11](../../design/database/schema.md#11--scheduled-transactions)) —
columns: `id`, `user_id`, `name`, `type`, `entry_type`, `amount`,
`account_id`, `category_id`, `billing_cycle`, `next_billing_date`,
`status`, `note`, `interest_rate` (nullable), `total_amount`,
`down_payment`, `total_installments`, `remaining_installments`,
`day_of_month` (for day-clamping math), `icon_code`, timestamps.

**Plus:** `ALTER TABLE transactions ADD COLUMN scheduled_transaction_id
UUID NULL REFERENCES scheduled_transactions(id) ON DELETE SET NULL` —
links a generated transaction back to its template.

**Endpoints** (per spec §3):
- `POST /v1/scheduled-transactions` — create (recurring / installment / loan)
- `GET /v1/scheduled-transactions` — list
- `GET /v1/scheduled-transactions/upcoming?days=7` — due-in-N-days helper
- `GET /v1/scheduled-transactions/:id`
- `PUT /v1/scheduled-transactions/:id` — edits affect future cycles only
- `DELETE /v1/scheduled-transactions/:id` — generated transactions stay (FK ON DELETE SET NULL)
- `POST /v1/scheduled-transactions/:id/pause` / `resume` / `cancel` — explicit transitions
- `POST /v1/scheduled-transactions/:id/generate-now` — manual trigger (Phase 1c only; real cron in Phase 3)
- `GET /v1/scheduled-transactions/:id/history` — list previously-generated transactions

**Manual trigger semantics:**
1. Insert one `transactions` row (`scheduled_transaction_id` set, `date = next_billing_date`)
2. Atomically advance `accounts.balance` for the linked account
3. Advance `next_billing_date` by `billing_cycle`, clamped to month end via `day_of_month`
4. If `entry_type='installment'`: decrement `remaining_installments`
5. If `remaining_installments == 0`: set `status='completed'`
All in one DB transaction.

**FE pages:**
- `/scheduled-transactions` → `ScheduledTransactionsListPage` (entry point in More menu)
- `/scheduled-transactions/new` + `/scheduled-transactions/:id/edit` → `ScheduledTransactionFormPage` (full page; segmented Recurring / Installment / Loan)
- `/scheduled-transactions/:id` → `ScheduledTransactionDetailPage` (with manual "Generate now" button + history list)

**Exit checklist:**
- [ ] All three entry-types create successfully with their own field rules
- [ ] Generate-now produces a transaction + advances balance + advances next_billing_date in one tx
- [ ] Day-of-month clamping works (Jan 31 → Feb 28/29 → Mar 31 → Apr 30 → …)
- [ ] Lifecycle transitions enforced; invalid transitions return 400
- [ ] Installment auto-completes at remaining = 0
- [ ] Generated transaction stays after schedule deletion (FK SET NULL)
- [ ] Edits affect future only; past generated transactions unchanged

---

## Cross-cutting

| Item | Notes |
|---|---|
| **More menu** | 3 new entries: Budgets, Saving Goals, Scheduled Transactions. Already specced in [flows.md §Quick reference](../ui-design/app/flows.md). |
| **Routes** | Top-level (matching shipped `/personal-debts`, `/projects`, `/contacts` convention; accessed *via* the More menu, not nested under it): `/budgets`, `/saving-goals`, `/scheduled-transactions` — each with `/new`, `/:id`, `/:id/edit`. |
| **IconMaker integration** | All three tables ship with `icon_code` JSONB (per [schema.md §1](../../design/database/schema.md)). Reuse `IconType` — likely add `IconType.budget`, `IconType.savingGoal`, `IconType.scheduled` with their own per-type base packs (curated icons). Optional in 1c — could ship with `IconType.category` reused for budgets, etc., and split later. |
| **l10n** | en + th from day 1; matches all other 1a/1b modules. Strings in `lib/l10n/app_*.arb`. |
| **Empty states** | 3 new lists need empty-state copy + illustration. Pattern lives in `EmptyView` from Phase 0. |
| **Dashboard surfacing** | Out of scope for 1c (dashboard is Phase 2). Each module surfaces only on its own pages until then. |

## Open decisions to lock before code

1. **Ship order** — proposed: saving-goals → budgets → scheduled. Spec-numerical (08→09→11) is fine alternative. Decide.
2. **PR strategy** — one PR per module (BE+FE+l10n+migration), or BE-first then FE? Proposed: vertical slice per module.
3. **IconMaker per-type packs** — add 3 new `IconType` enum values + `pack_<type>.dart` curated icon lists, or reuse existing types (budget→category, saving_goal→account, scheduled→category)? Proposed: reuse for 1c, split later in Phase 2 polish.
4. **Currency in 1c** — Phase 1 is THB-only. Spec mentions Phase 2 multi-currency. For 1c, store `currency` columns but skip conversion logic (no FX). Confirmed.
5. **Default allocation suggestion (saving-goals)** — spec §3.1 proposes a server-side proportional default if user omits `allocation_pct`. Confirm we want this, or leave it required.
6. **Manual trigger button placement** — on the schedule detail page only, or also on the list as a quick action? Proposed: detail-page only to avoid accidental taps.

## Out of scope (deferred)

Per spec & phases.md:
- Notifications: over-budget, scheduled-due-soon, goal-reached → **Phase 2**
- Forecasting / projections (`projected end-of-period`, `on pace to reach by X`) → **Phase 2**
- Multi-currency / FX conversion → **Phase 2**
- Real scheduler cron (hourly job) → **Phase 3**
- Counterparty linking on loans (`creditor_contact_id` / `_member_id`) → **Phase 2+**
- Transfer-type scheduled transactions → **Phase 2+**
- Rollover (YNAB-envelope) on budgets → **Phase 3+ optional**
- Historical period snapshots (budgets) → **Phase 3+ optional**
- Project Report tab + Project Resolve tab — **already deferred from 1b/1c → Phase 2** (per [phases.md v0.6](../phases.md))

## Acceptance for "Phase 1c done"

- All three modules' exit checklists pass
- All migrations through 000036 apply cleanly + roll back cleanly
- `flutter analyze` clean
- Manual smoke: each module's flow (10/11/12 in [flows.md](../ui-design/app/flows.md)) walks end-to-end on Android and Flutter web
- [phases.md §Phase 1c exit criteria](../phases.md) all green

---

## Status

- **Created** — 2026-05-06
- **Completed** — 2026-05-07
- **Status** — **shipped.** All three modules (saving-goals, budgets, scheduled-transactions) live end-to-end. BE migrations 000034–000036 applied; Flutter app wires every endpoint and `flutter analyze` is clean. Phase 1 overall is complete.
- **Maintained** — this folder is the kickoff plan; canonical scope updates go in [`../phases.md`](../phases.md)
