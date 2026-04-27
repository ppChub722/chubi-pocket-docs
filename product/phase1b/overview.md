# Phase 1b — Multi-user, collaboration, dashboard, notifications (overview)

**Goal:** the user can split bills with friends (contacts they've added), coordinate IOUs across them, track collaborative projects with mixed linked/contact/ad-hoc members, and see in-app notifications when others act on shared state. Backend ships every endpoint in [`design/spec/`](../../design/spec/) for modules 06, 07, 10, 12, 13.

**Canonical scope + exit criteria:** [`../phases.md §Phase 1b`](../phases.md). Files in this folder are the operational handoff plan, BE/DB-only.

---

## Files in this folder

| File | For | What it covers |
|---|---|---|
| [`overview.md`](overview.md) | Everyone | You are here. Sub-milestones, BE/DB exit criteria, scope guard, locked decisions inherited from 1a, and the **invite-via-notification** simplification that drops both invite-code tables. |
| [`db.md`](db.md) | Backend engineer | 9 new migrations + one ALTER on `transactions`; registration-hook extension to seed `user_notification_settings`; polymorphic FK constraints on splits |
| [`be.md`](be.md) | Backend engineer | 5 new modules (`contacts`, `projects`, `splits`, `personal_debts`, `notifications`); extensions to `transactions`; notification-based link-request flow; sub-milestones |

`fe.md` deferred — wait until BE endpoints stabilize.

---

## Spec deviation: invites via notifications, no invite-code tables

This plan replaces the spec's code-based invite mechanism (8-char codes shared out-of-band) with **notification-based link requests** for both contacts and projects. The original spec ([`07-contacts.md §3.7–3.8`](../../design/spec/07-contacts.md), [`10-projects.md §3.3`](../../design/spec/10-projects.md)) is updated **at implementation time**; the spec text itself should be updated to match before / after 1b ships.

**Mechanism:**

```
Alice taps "Send link request" on contact "Mom" (email = mom@example.com)
  → POST /v1/contacts/:mom-id/request-link
  → backend: SELECT id FROM users WHERE email = contact.email LIMIT 1

  if found:                          if NOT found:
    INSERT notifications row           (no DB write)
    type=contact_link_request          
    recipient=found_user               
    payload={contact_id, ...}          
                                       
  Return 200 "Link request sent"     Return 200 "Link request sent"
  (same response either way)         (same response either way)
```

**Privacy preservation:** Alice can never tell whether Mom is on the app — same response in both branches. This achieves spec §4.6's goal ("no enumeration of app users") via a different mechanism than invite codes. The spec's privacy intent is preserved; only the implementation changes.

**Recipient flow:** Mom opens app → sees `contact_link_request` in her notification inbox → taps Accept (sets `contacts.app_user_id`) or Reject (notification dismissed; no link).

**Same model for project member invites.** `project_invite` notification carries member_id + project_id; accept populates `project_members.user_id`; reject leaves the pending member row alone (owner can resend or remove).

**Phase 3 extension:** when `request-link` doesn't match a user, fire an external email (Play Store deep-link to download + claim). No data-model change required — just an extra side effect.

**Dropped from the plan:**
- `contact_invites` table + migration
- `project_invites` table + migration
- 8-char code generation, expiry, lookup, accept-by-code endpoints

**Added:**
- `contact_link_request` notification trigger (new — 7th type for Phase 1b)
- `project_invite` notification trigger (already in plan; semantics changed to link-request)
- `POST /v1/contacts/:id/request-link`, `POST /v1/contacts/link-requests/:notif_id/accept|reject`
- `POST /v1/projects/:id/members/:member_id/request-link`, `POST /v1/projects/link-requests/:notif_id/accept|reject`

---

## Locked decisions inherited from Phase 0/1a

All Phase 0 + 1a stack and convention locks carry forward unchanged:

| Concern | Lock |
|---|---|
| **Stack** | Go + Gin, `pgx/v5`, PostgreSQL 15+, `golang-migrate`, Docker |
| **Module layout** | `handler.go` / `service.go` / `store.go` / `model.go` per module under `internal/modules/<name>/` |
| **DB conventions** | UUID v7 PKs (Go-side); `created_at` / `updated_at` / `created_by_user_id` / `updated_by_user_id` audit cols on every table; `set_timestamp` trigger reused; FK naming per [`schema.md`](../../design/database/schema.md) |
| **Migration tooling** | `golang-migrate`; one `init_<table>` migration per table; `IF NOT EXISTS` on up; mandatory down |
| **Single-currency** | THB only; multi-currency UI / FX still Phase 2 |
| **Error envelope** | Reuse `internal/platform/response` |
| **Auth middleware** | Reuse `auth.Middleware` + `auth.UserIDFromContext` / `UserFromContext` |
| **Tx orchestration pattern** | Service.Method opens tx, calls store/cross-service `*Tx` helpers, commits |
| **Lock ordering** | Lowest-UUID-first when a tx writes to multiple `accounts` rows |

---

## Sub-milestones (BE/DB only)

Six independently-mergeable slices. Each ships its own migration(s) + module(s) plus the wiring needed to make them work end-to-end.

| Sub | Focus | New tables | New module(s) |
|---|---|---|---|
| **1b.1** | Contacts (CRUD + archive + delete; `request-link` stubbed — wired in 1b.6 once notifications fire) | `contacts` | `contacts/` |
| **1b.2** | Notification inbox + per-user settings (no triggers fired yet) | `notifications`, `user_notification_settings` | `notifications/` |
| **1b.3** | Projects + members + ownership / leave (no invite-via-notification yet — wired in 1b.6) | `projects`, `project_members` | `projects/` |
| **1b.4** | Project transactions + claim flow + shared-book read + project summary | `project_transactions` + `transactions.project_id`, `transactions.source_project_transaction_id` columns | extends `projects/` and `transactions/` |
| **1b.5** | Splits + personal_debts + per-caller settlement + resolve actions; wires `contacts.absorb` retroactively | `shared_expense_splits`, `personal_debts` + `transactions.source_split_id` column | new `splits/` + `personal_debts/`; extends `contacts/` |
| **1b.6** | Wire all 7 notification triggers across the modules above (incl. `contact_link_request` + `project_invite` link-request flows) | (no new tables) | extends every producer module |

Build each sub-milestone in order — 1b.5 depends on tables from 1b.1, 1b.3, 1b.4; 1b.6 wires triggers across all of them.

---

## Phase 1b BE/DB exit criteria

Mirrors [`../phases.md §Phase 1b — Exit criteria`](../phases.md), updated for the notification-based invite flow:

### Contacts

- [ ] CRUD on contacts works; archive / restore / delete behave per spec §3
- [ ] `POST /v1/contacts/:id/absorb` rewrites `shared_expense_splits.contact_id` for matching `person_name` rows (wired in 1b.5)
- [ ] **Notification-based link request:**
  - `POST /v1/contacts/:id/request-link` fires `contact_link_request` notification iff `contacts.email` matches a registered user; voids silently otherwise (same 200 response)
  - `POST /v1/contacts/link-requests/:notification_id/accept` populates `contacts.app_user_id` and marks notification `actioned`
  - `POST /v1/contacts/link-requests/:notification_id/reject` marks notification `dismissed`; no link change
  - Uniqueness still enforced (one contact per `(user, app_user_id)`)
- [ ] Linked debtor's app sees splits where they're the debtor (per-caller computed)
- [ ] Hard-delete restores `person_name` from `nickname || display_name` on referencing splits

### Splits (shared expenses)

- [ ] `POST /v1/transactions` accepts `splits` with `contact_id` / `person_name` debtors (no `project_member_id`); rejects `project_member_id` debtors with `400 INVALID_DEBTOR_FOR_CONTEXT`
- [ ] `POST /v1/projects/:id/project-transactions` accepts `splits` with `project_member_id` debtors only
- [ ] `outstanding_from_my_view` and `my_resolution_status` compute correctly per caller (no global state)
- [ ] `pay` creates personal expense with `source_split_id` + auto-bumps any matching `personal_debts.paid_amount` atomically
- [ ] `receive` creates personal income with `source_split_id`
- [ ] `add-as-debt` creates `personal_debts` row with `source_split_id`
- [ ] On linked-actor `claim`: splits migrate (`source_project_transaction_id` rewritten to `source_transaction_id`) — same split IDs

### Personal debts

- [ ] Manual create works (no source split, no project)
- [ ] Auto-close on `pay`: any pre-existing `personal_debts` row with matching `(user_id, source_split_id)` has its `paid_amount` bumped; status flips to `paid` when `paid_amount >= amount`
- [ ] `POST /v1/personal-debts/:id/pay` records personal expense AND bumps `paid_amount` AND fires `split_paid` notification (when applicable) atomically
- [ ] Dashboard joins "I owe" (open `personal_debts`) + "owed to me" (open splits where caller is creditor) per caller

### Projects

- [ ] Three member types via `project_members` (linked / contact / ad-hoc)
- [ ] `record_user_id` may differ from `transaction_member_id` (Alice records on behalf of offline Bob)
- [ ] **Notification-based member invite:**
  - `POST /v1/projects/:id/members` (variant b — direct invite by email): fires `project_invite` notification iff email matches a user; voids silently otherwise
  - `POST /v1/projects/:id/members` (variant a — from linked contact): auto-adds member as `active` (linked contact already consented to link); sends informational `project_invite` notification — Bob can leave anytime
  - `POST /v1/projects/:id/members` (variant c — ad-hoc): no notification, member status = `active` immediately
  - `POST /v1/projects/link-requests/:notification_id/accept` populates `project_members.user_id` + `joined_at`, status = `active`
  - `POST /v1/projects/link-requests/:notification_id/reject` marks notification `dismissed`; member row stays `pending` (owner can re-send or remove)
- [ ] `POST /v1/projects/:id/project-transactions` does NOT touch any personal account at insert time
- [ ] Linked actor's `claim` mirrors row to personal book; balance updates atomically; splits migrate
- [ ] `GET /v1/projects/:id/summary` returns the debt-matrix correctly per caller settlement
- [ ] Lifecycle rules enforced (`active`/`completed`/`cancelled`/`archived` write-gating per [`10-projects.md §3.1`](../../design/spec/10-projects.md))
- [ ] Solo project (one linked member only) works end-to-end with no notifications fired
- [ ] Ownership transfer + soft-remove + `resolve-all` batch work

### Notifications (in-app inbox)

- [ ] All 7 Phase 1b trigger types fire correctly (`split_created`, `split_paid`, `split_received`, `project_tx_recorded_for_you`, `project_tx_changed`, `project_invite`, `contact_link_request`)
- [ ] User can list / mark-read / mark-actioned / dismiss
- [ ] `user_notification_settings` row auto-created at registration with defaults
- [ ] No push delivery (Phase 2)

### Cross-cutting

- [ ] All 9 migrations apply cleanly; all 9 down migrations roll back cleanly
- [ ] `transactions` ALTER (add `project_id` / `source_split_id` / `source_project_transaction_id`) + 3 partial indexes
- [ ] All 1a balance-cache tests still pass (no regression on the central correctness piece)
- [ ] Module structure consistent with 1a / Phase 0 reference pattern (handler/service/store/model)

---

## NOT in Phase 1b (scope guard)

Push to noted phases:

- Multi-currency cross-currency transfers / FX provider → **Phase 2**
- Push delivery (FCM / web push), email digest → **Phase 2**
- Per-trigger mute settings, notification grouping → **Phase 2**
- `personal_debt_cancelled` notification trigger (cancel happens silently in 1b) → **Phase 2**
- Bulk operations (bulk pay, bulk recategorize, bulk absorb) → **Phase 2**
- Dashboard / charts / reports / exports / receipt photos → **Phase 2**
- Fuzzy contact matching, contact merge → **Phase 2**
- Suggest-edit workflow (non-creator edits) → **Phase 3**
- Production infra, CI/CD, monitoring → **Phase 3**
- **External email send when `request-link` email isn't on app** → **Phase 3** (needs email provider)
- Ad-hoc-to-linked member upgrade endpoint → **Phase 2**
- Project export (PDF / CSV) → **Phase 2**
- QR-code link request (scan to link in person) → **Phase 2**
- Concurrent edit / optimistic locking → **Phase 2**
- iOS — not planned

---

## Critical correctness pieces (BE/DB)

These are the parts most likely to drift if implemented carelessly. Each gets a dedicated test in 1b:

1. **Splits-migrate-on-claim atomicity.** Single DB tx: lock the project_transaction row → lock the actor's account → insert personal mirror → `UPDATE shared_expense_splits SET source_transaction_id = mirror, source_project_transaction_id = NULL WHERE source_project_transaction_id = pt_id` → balance delta → commit. Test: 50 concurrent claims on the same PT → only one succeeds; rest hit `ALREADY_CLAIMED`.
2. **Personal-debt auto-bump atomicity.** When `pay` (or `personal-debts/:id/pay`) inserts a personal expense with `source_split_id`, the same DB tx must `UPDATE personal_debts SET paid_amount = LEAST(amount, paid_amount + delta), status = ... WHERE user_id = caller AND source_split_id = $`. Test: split-pay with 0/1/2 personal_debts referencing — all paths behave.
3. **Per-caller settlement state.** Pure read computation. Each split's `outstanding_from_my_view = owed_amount - SUM(my personal entries with source_split_id = this.id, matching role/type)`. Test: two callers with opposite views — both see their own truth.
4. **Polymorphic split FK gating.** API rejects:
   - personal-context (parent has `project_id IS NULL`) split with `project_member_id` debtor → `400 INVALID_DEBTOR_FOR_CONTEXT`
   - project-context split with `contact_id` / `person_name` debtor → same error
   - post-claim split (parent has `project_id IS NOT NULL`) with non-`project_member_id` debtor → same
5. **Notification dispatch is in-tx.** Each trigger insert happens inside the same tx as the action that fires it. If the action fails, the notification doesn't appear.
6. **Link-request privacy preservation.** `POST /v1/contacts/:id/request-link` returns identical 200 response whether the email matches a user or not. Test: 100 calls with unknown emails + 100 calls with known emails → response shape, status code, and average response time should not differ in a way that leaks existence (timing-attack consideration — see [Risks](#risks-specific-to-1b)).
7. **transactions.project_id is auto-managed.** API rejects `project_id` in `POST /v1/transactions` request bodies (1a already does this — 1b extends to set it automatically only on `pay`/`receive`/`claim` flows when the source has a project).
8. **Contact delete restores `person_name`.** Before deleting a contact, the same tx runs `UPDATE shared_expense_splits SET person_name = COALESCE(c.nickname, c.display_name), contact_id = NULL WHERE contact_id = :id`. Otherwise downstream split-readers crash on dangling FK.

---

## New cross-module dependencies (be.md goes deeper)

| Direction | Reason |
|---|---|
| `transactions` → `splits` (via injected validator) | Validate `source_split_id` belongs to caller; auto-derive `project_id` from split's parent |
| `transactions` → `personal_debts` (via injected bumper) | Auto-bump `paid_amount` when personal expense has `source_split_id` |
| `transactions` → `notifications` (via injected dispatcher) | `split_paid` / `split_received` fire on resolve actions |
| `splits` → `transactions` (direct) | `pay` / `receive` insert personal entries via `transactions.Service.CreateInTx` |
| `splits` → `notifications` | `split_created` fires on splits insert |
| `projects` → `contacts` | `POST /v1/projects/:id/members` variant (a) reads contact for member creation |
| `projects` → `transactions` (direct, claim flow) | `claim` inserts personal mirror |
| `projects` → `notifications` | `project_tx_recorded_for_you`, `project_tx_changed`, `project_invite` |
| `personal_debts` → `transactions` | `personal-debts/:id/pay` inserts personal expense |
| `personal_debts` → `notifications` | future `personal_debt_cancelled` (deferred, but wiring shape ready) |
| `contacts` → `splits` (deferred via injection) | `absorb` rewrites split debtor; `delete` restores `person_name` |
| `contacts` → `notifications` | `contact_link_request` fires from `request-link` |
| `notifications` → (none) | Pure consumer; no upward dependencies |

To avoid cycles, the same pattern from 1a (`categories.WithTransactionCounter`) is used: each consumer module exposes a method, main.go wires func types into producers as post-construction injection. Concrete shapes in [`be.md`](be.md).

---

## Risks specific to 1b

- **Splits-migrate-on-claim is the second hot correctness piece** (after the 1a balance invariant). Easy to get the lock ordering wrong — if claim locks accounts but not the splits' parent, two concurrent claims on the same project_transaction could double-create personal mirrors. Solution: `SELECT … FOR UPDATE` on `project_transactions` row before the migrate UPDATE, in addition to the account lock.
- **Per-caller settlement state queries get expensive at scale.** Phase 1b ships the computation as a subquery / window function; Phase 2+ may add a materialized view if dashboard reads slow down. For 1b the assumption is < 1000 splits per user — fine for SQL.
- **Notification dispatcher must be in-tx** but ALSO must not fail the action if a single recipient lookup fails. The dispatcher logs and continues for transient lookup errors; only "deserialization failed for known type" is fatal.
- **`request-link` timing-attack vector.** Even with identical responses, response time can leak existence if the "found user → insert notification → fire trigger handlers" path is slower than the no-op path. Mitigation in 1b: route both branches through the same execution path (always do the lookup; insert is conditional). Phase 2: add a constant-time delay or a small jitter at the handler edge. **Don't add per-IP rate-limiting in 1b** without first checking that the privacy intent isn't accidentally lost (rate-limit signal could itself leak that "this email matched something").
- **Contact `absorb` updates many splits**. With realistic data the `WHERE LOWER(person_name) IN (...)` may touch hundreds of rows. Acceptable. No batch optimization needed in 1b.
- **`personal_debts.paid_amount` overpayment**. Auto-bump path uses `LEAST(amount, paid_amount + delta)` to never violate the CHECK. Manual `personal-debts/:id/pay` rejects overpayment with `400 OVERPAYMENT`. Different paths, different rules — documented in [`be.md`](be.md).
- **`transactions.source_split_id ON DELETE SET NULL`** vs `ON DELETE CASCADE`. Migration uses SET NULL so deleting a parent split doesn't cascade-destroy the debtor's payment record. Same for `personal_debts.source_split_id`.
- **Solo project edge case.** Single linked member project — no notifications should fire on any action. Easy regression: notification dispatcher iterates members and accidentally targets self. Test explicitly via the `is recipient == actor? skip` guard inside `notifications.DispatchTx`.
- **`record_user_id` ≠ `transaction_member_id`.** Alice records on Bob's behalf. The personal-mirror flow (claim) is for Bob, not Alice — careful not to wire claim to `record_user_id`. Test: Alice records, Bob (linked) claims; verify mirror lands in Bob's book, not Alice's.

---

## Schema additions reminder

Phase 1a deferred 4 columns on `transactions`. Phase 1b adds 3 of them (the 4th — `scheduled_transaction_id` — is Phase 1c):

| Column | When | Why |
|---|---|---|
| `project_id` | 1b.4 | FK target `projects` exists; column auto-managed by claim and split-resolve flows |
| `source_split_id` | 1b.5 | FK target `shared_expense_splits` exists |
| `source_project_transaction_id` | 1b.4 | FK target `project_transactions` exists |

Plus 3 partial indexes (`source_split_id WHERE NOT NULL`, `source_project_transaction_id WHERE NOT NULL`, `project_id WHERE NOT NULL`).

The 1a CHECK constraints on `transactions` get extended to add the source-FK XOR rule from [`schema.md §04`](../../design/database/schema.md#04--transactions): at most one of `source_split_id` / `source_project_transaction_id` set; `project_id IS NOT NULL ⇔ at least one of source_* is set`.

---

## Spec docs to update post-implementation

The spec is canonical for design intent. After 1b ships, update these to match the implementation:

- [`07-contacts.md §3.7–3.8, §4.6`](../../design/spec/07-contacts.md) — replace invite-code mechanism with notification-based link-request; preserve §4.6's privacy intent under the new mechanism
- [`10-projects.md §3.3`](../../design/spec/10-projects.md) — replace project_invites table with notification-based flow
- [`13-notifications.md §2`](../../design/spec/13-notifications.md) — add `contact_link_request` trigger; refactor `project_invite` semantics from "code-based" to "link-request"
- [`schema.md §07, §10`](../../design/database/schema.md) — drop `contact_invites` and `project_invites` table definitions

These spec edits are NOT blocking 1b. Track separately.

---

## Status

- **Created** — 2026-04-27
- **BE/DB plan** — drafted; see [`be.md`](be.md), [`db.md`](db.md)
- **Spec deviation** — invites via notifications (this doc §"Spec deviation"); spec text edits queued for post-1b
- **FE plan** — deferred until BE endpoints settle
- **CI/CD** — still deferred per Phase 0
- **Maintained** — this folder is a kickoff plan; canonical scope updates go in [`../phases.md`](../phases.md)
