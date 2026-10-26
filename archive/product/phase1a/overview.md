# Phase 1a — Single-user core (overview)

**Goal:** user can replace their solo-finance spreadsheet — log, categorize, review their own transactions across multiple accounts. Backend ships full CRUD for accounts / transactions / categories / tags, with the balance-cache invariant atomically maintained.

**Canonical scope + exit criteria:** [`../phases.md §Phase 1a`](../phases.md). The files in this folder are the operational handoff plan, BE/DB-only for now (FE plan deferred — see [§Status](#status)).

---

## Files in this folder

| File | For | What it covers |
|---|---|---|
| [`overview.md`](overview.md) | Everyone | You are here. Locked decisions inherited from Phase 0, sub-milestones, BE/DB exit criteria, scope guard. |
| [`db.md`](db.md) | Backend engineer | 5 new migrations (categories, tags, accounts, transactions, transaction_tags), per-user seeds at registration, balance-cache invariant test |
| [`be.md`](be.md) | Backend engineer | 4 new modules (`categories`, `tags`, `accounts`, `transactions`), registration seed hook, atomic balance flow, endpoint inventory, validation rules |

`fe.md` deferred — wait until BE endpoints stabilize.

---

## Locked decisions inherited from Phase 0

All Phase 0 stack + convention locks carry forward unchanged:

| Concern | Lock |
|---|---|
| **Stack** | Go + Gin, `pgx/v5`, PostgreSQL 15+, `golang-migrate`, Docker |
| **Module layout** | `handler.go` / `service.go` / `store.go` / `model.go` per module under `internal/modules/<name>/` |
| **DB conventions** | UUID v7 PKs (Go-side); `created_at` / `updated_at` / `created_by_user_id` / `updated_by_user_id` audit cols on every table; `set_timestamp` trigger reused; FK naming per [`schema.md`](../../design/database/schema.md) |
| **Migration tooling** | `golang-migrate`; one `init_<table>` migration per table; `IF NOT EXISTS` on up; mandatory down |
| **Single-currency** | THB only in Phase 1; `currency` columns ship in schema but multi-currency UI / FX is Phase 2 |
| **Error envelope** | Reuse `internal/platform/response` helpers from Phase 0 |
| **Auth middleware** | Reuse `auth.Middleware` + `auth.UserIDFromContext` |

---

## Sub-milestones (BE/DB only)

Build in this order so each step is independently mergeable and avoids partial-balance-cache states:

| Sub | Focus | Independently testable? |
|---|---|---|
| **1a.1** | Categories + tags. System + starter seed at registration. No transactions referencing them yet — seed verified by inspection. | ✅ |
| **1a.2** | Accounts (plain CRUD + archive + summary). Opening-balance / adjust-balance endpoints stubbed but not wired to transactions yet (return `501` or behind a flag). | ✅ for non-balance operations |
| **1a.3** | Transactions full module + plumb back into accounts. The balance-cache invariant lands here: `SELECT FOR UPDATE`, atomic insert/update/delete + balance recompute, lock ordering for transfers, opening-balance + adjust-balance auto-create transactions. | ✅ |

Each sub-milestone = its own PR / commit cluster. CI deferred per Phase 0.

---

## Phase 1a BE/DB exit criteria

- [ ] User can create accounts of all 5 types via API; opening balance auto-creates an `Opening Balance` transaction; balance reflects it
- [ ] User can log expense / income transactions; `accounts.balance` updates atomically
- [ ] User can log a transfer; two transaction rows are inserted with one `transfer_group_id`; both account balances update atomically
- [ ] `POST /v1/accounts/:id/adjust-balance` creates an `Adjustment` transaction and reconciles the cache
- [ ] User can filter transactions by account / category / date / type; pagination works (default 20, max 100)
- [ ] User can categorize transactions and attach/detach tags
- [ ] `GET /v1/accounts/:id/summary` and `GET /v1/transactions/summary` return correct totals (transfers excluded from cross-account summary)
- [ ] Soft-deleted accounts excluded from default lists; archived categories excluded from pickers
- [ ] At registration, the user receives 6 system categories + 28 starter user categories
- [ ] Balance-cache invariant test passes: `accounts.balance == SUM(transactions)` for all accounts after a synthetic 1000-tx workload
- [ ] All 5 migrations apply cleanly; all 5 down migrations roll back cleanly
- [ ] Module structure (categories / tags / accounts / transactions) follows the Phase 0 reference pattern (handler/service/store/model)

---

## NOT in Phase 1a (scope guard)

If anyone proposes adding any of these, push to the noted phase:

- Splits / shared expenses (the `splits` array on `POST /v1/transactions`) → **Phase 1b**
- Contacts, projects, project_transactions, personal_debts, notifications → **Phase 1b**
- Multi-currency (cross-currency transfers, FX rate, conversion at display) → **Phase 2**
- Push delivery, dashboard, charts, exports, receipt photos → **Phase 2**
- Production infra, CI/CD, monitoring → **Phase 3**
- Account `sort_order` use (column ships, but no reorder endpoint) → **Phase 2**
- Bulk recategorize, suggest-edit workflow → **Phase 3**
- Reconciliation job + admin recalculate endpoint → **Phase 3**
- iOS — not planned

---

## Schema columns deferred from `transactions` table

The 1a `transactions` migration **omits** these columns; 1b/1c migrations add them when the referenced tables exist:

| Column | Adds in | Why deferred |
|---|---|---|
| `project_id` | 1b | FK target `projects` doesn't exist yet; column auto-managed by 1b claim/split-resolve flows |
| `source_split_id` | 1b | FK target `shared_expense_splits` doesn't exist yet |
| `source_project_transaction_id` | 1b | FK target `project_transactions` doesn't exist yet |
| `scheduled_transaction_id` | 1c | FK target `scheduled_transactions` doesn't exist yet |

Adding these in later migrations is `ALTER TABLE … ADD COLUMN … NULL` plus a CREATE INDEX — clean, reversible. Until then, the 1a CHECK constraints simplify accordingly (no source-FK XOR rule).

---

## Risks specific to 1a

- **Balance-cache atomicity is the central correctness bet.** Worth a dedicated integration test with concurrent writers (50 goroutines × 20 transfers each) before declaring 1a done. If `SUM(transactions) != balance` at the end, ship-blocker.
- **System category auto-assignment has 3 entry points** (opening balance, adjust-balance, transfer). Easy to drift. Centralize in one `categories.SystemFor(userID, kind)` helper.
- **Transfer = two rows, lock-order by lowest account UUID** to avoid deadlock under concurrent writes. Documented as an explicit rule in [`be.md`](be.md).
- **Splits ship in 1b, but the `splits` field on `POST /v1/transactions` request body must be explicitly rejected in 1a** (`400 SPLITS_NOT_SUPPORTED_YET`) so 1b can introduce the validator without surprising existing clients.
- **No `project_id` settable on `POST /v1/transactions`** — lock this at validator level so 1b's claim/split-resolve flow is the only writer. Reject `400 VALIDATION_ERROR` if present.
- **System categories cannot be deleted, but `name` is editable.** Easy to forget; enforce in the categories store, not just the handler.

---

## Status

- **Created** — 2026-04-27
- **BE/DB plan** — drafted; see [`be.md`](be.md), [`db.md`](db.md)
- **FE plan** — deferred until BE endpoints settle
- **CI/CD** — still deferred per Phase 0
- **Maintained** — this folder is a kickoff plan; canonical scope updates go in [`../phases.md`](../phases.md)
