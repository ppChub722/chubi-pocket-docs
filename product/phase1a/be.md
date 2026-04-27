# Phase 1a — Backend

**Goal:** 4 new modules under `internal/modules/` (`categories`, `tags`, `accounts`, `transactions`); registration extended to seed 34 categories; full CRUD + summaries for the three Phase 1a spec modules; balance-cache invariant maintained atomically by the transaction service.

**Stack** (locked from Phase 0): Go + Gin, `pgx/v5`, `slog`, JWT-bearer middleware. New modules copy the `handler.go` / `service.go` / `store.go` / `model.go` layout used by `auth` and `users`.

For DB migrations + seed catalog, see [`db.md`](db.md). For endpoint contracts, see the spec modules linked per section.

---

## Module dependency graph

```
auth ─────────────────────────┐
                              ▼
users                  categories ◄──┐
                       │              │ (system cat lookup)
                       ▼              │
tags ─── transactions ◄─── accounts ──┘
              ▲                ▲
              └────── (accounts depends on transactions for opening-balance + adjust-balance)
```

Direction summary:

- `auth` imports `categories.Seeder` (interface) — wired in `main.go`
- `accounts` imports `transactions.Service` — needs `CreateInTx` to back the opening-balance + adjust-balance flows
- `transactions` imports `categories` — needs `SystemFor()` for transfer / opening / adjust auto-assignment
- `tags` is leaf
- `categories` imports nothing from 1a modules

No cycles.

---

## Tasks

### Module: `categories`

Folder: `internal/modules/categories/`. Files: `handler.go`, `service.go`, `store.go`, `model.go`, `seed.go` (starter catalog constant).

Endpoints per [`05-categories-tags.md §3`](../../design/spec/05-categories-tags.md):

- [ ] `POST   /v1/categories`
- [ ] `GET    /v1/categories` (filter: `type`, `status`, `include_system`)
- [ ] `GET    /v1/categories/:id` (computes `depth`, `child_count`, `transaction_count`)
- [ ] `PUT    /v1/categories/:id` (partial; cycle check; depth check; sibling-name uniqueness)
- [ ] `DELETE /v1/categories/:id` (grandparent-shift on children; hard-delete if 0 tx else archive)
- [ ] `POST   /v1/categories/:id/restore` (archived → active; auto-reparent if parent still archived)
- [ ] `DELETE /v1/categories/:id/permanent` (only from archived; rejects if any tx still references)

Public exports (consumed by other modules):

- [ ] `categories.Seeder` interface — `SeedForUser(ctx, tx pgx.Tx, userID uuid.UUID) error`. Concrete impl in this package; injected into `auth.Service` via `main.go`.
- [ ] `categories.SystemFor(ctx, userID, kind)` returning `*Category` (or just `id`) — used by `transactions.Service` and `accounts.Service` for auto-assignment. Cache the 6 system cats per request (`sync.Once` per pool too small; use `gin.Context` value).

Store-level invariants:

- [ ] System categories cannot be deleted (store-level guard, not just handler). Any UPDATE that flips `is_system` is also rejected.
- [ ] System category `name` is editable per spec §4.14. Backend matches by `(user_id, is_system, kind_marker)` — store an internal `system_kind` string in code, not in DB; the DB row is identified by the (id) returned at seed time. Recommend: at seed time, write the 6 IDs to a `category_system_lookup` cache or just remember by `(user_id, name DEFAULT, type)` since we control the default names.

  **Recommendation:** add a non-nullable `is_system` column lookup helper but identify the 6 by `(user_id, type, parent_id IS NULL, default_name)`. Since names are stable at seed time and edits are rare, a simple SELECT works. If later edits make this fragile, add a `system_kind VARCHAR(30)` column in a 1a follow-up migration.

- [ ] Grandparent-shift on hard-delete: handler runs in a tx — `UPDATE categories SET parent_id = (SELECT parent_id FROM categories WHERE id = $1) WHERE parent_id = $1`, then `DELETE`.

Errors mapped (per spec): `MAX_DEPTH_EXCEEDED`, `DUPLICATE_NAME`, `INVALID_PARENT`, `CYCLE_DETECTED`, `SYSTEM_CATEGORY`, `SYSTEM_CATEGORY_IMMUTABLE`, `NOT_ARCHIVED`, `HAS_TRANSACTIONS`.

### Module: `tags`

Folder: `internal/modules/tags/`. Files: `handler.go`, `service.go`, `store.go`, `model.go`.

Endpoints per [`05-categories-tags.md §3.8–3.12`](../../design/spec/05-categories-tags.md):

- [ ] `POST   /v1/tags`
- [ ] `GET    /v1/tags` (no pagination; usage_count computed)
- [ ] `GET    /v1/tags/:id`
- [ ] `PUT    /v1/tags/:id`
- [ ] `DELETE /v1/tags/:id` (hard delete; `transaction_tags` cascades)
- [ ] `POST   /v1/transactions/:id/tags` (attach; idempotent on already-attached)
- [ ] `DELETE /v1/transactions/:id/tags/:tag_id` (detach)

The two attach/detach endpoints are physically registered on the transactions router but the junction logic lives in `tags.Service`. Mirror the auth+users cross-module pattern from Phase 0.

Errors mapped: `TAG_EXISTS` (409), `VALIDATION_ERROR`.

### Module: `accounts`

Folder: `internal/modules/accounts/`. Files: `handler.go`, `service.go`, `store.go`, `model.go`.

Endpoints per [`03-accounts.md §2`](../../design/spec/03-accounts.md):

- [ ] `POST   /v1/accounts` (with optional opening balance → calls `transactions.Service.CreateInTx`)
- [ ] `GET    /v1/accounts` (filter: `status`, `type`)
- [ ] `GET    /v1/accounts/:id`
- [ ] `PUT    /v1/accounts/:id` (partial; `balance` field rejected; `type`/`currency` mutable per spec §3.7–3.8)
- [ ] `POST   /v1/accounts/:id/adjust-balance` (compute delta → `transactions.Service.CreateInTx` with `Adjustment` system category)
- [ ] `DELETE /v1/accounts/:id` (always soft → `status='archived'`)
- [ ] `GET    /v1/accounts/:id/summary` (date-range; transfers count as money in/out for this account)

Validation rules (API layer, not DB):

- [ ] `type IN ('credit_card','pay_later')` ⇒ `credit_limit` required; `statement_date`, `payment_due_date`, `minimum_payment` allowed
- [ ] Other `type` values ⇒ all 4 credit fields must be NULL or absent
- [ ] On `PUT` type-change to credit: must include `credit_limit`; from credit: backend nulls out the 4 credit fields
- [ ] `PUT` does not accept `balance` field — return `400 BALANCE_NOT_EDITABLE` if present (alternatively, ignore silently per spec — recommend explicit reject for clarity)
- [ ] `POST /adjust-balance` with `delta == 0` returns `400 NO_OP`

Errors mapped: `VALIDATION_ERROR`, `NO_OP`, `FORBIDDEN`, `NOT_FOUND`.

### Module: `transactions`

Folder: `internal/modules/transactions/`. Files: `handler.go`, `service.go`, `store.go`, `model.go`, `balance.go` (lock-and-update helpers).

Endpoints per [`04-transactions.md §3`](../../design/spec/04-transactions.md):

- [ ] `POST   /v1/transactions` (single-account expense/income, or transfer with `transfer_to_account_id`)
- [ ] `GET    /v1/transactions` (filter: `account_id`, `category_id`, `type`, `from`, `to`, `has_splits`; pagination `page`/`per_page`; sort)
- [ ] `GET    /v1/transactions/:id` (full detail; for transfer, includes paired row via `transfer_group_id`)
- [ ] `PUT    /v1/transactions/:id` (editable: `amount`, `date`, `category_id`, `note`; immutable: `type`, `account_id`, `transfer_to_account_id`, `transfer_group_id`, `user_id`, `created_at`)
- [ ] `DELETE /v1/transactions/:id` (hard delete; for transfer, deletes the paired row; balance reverses atomically)
- [ ] `GET    /v1/transactions/summary` (date range; aggregates by category/account/period; transfers excluded from income/expense totals)

Validation rules (API layer):

- [ ] **Reject `splits` and `my_share` in 1a** — return `400 SPLITS_NOT_SUPPORTED_YET`. (Ships in 1b.)
- [ ] **Reject `project_id` in request body** — return `400 VALIDATION_ERROR`. (Auto-managed; 1b flows are the only writers.)
- [ ] `type='transfer'` requires `transfer_to_account_id`; both accounts owned by caller; both same currency; differ from each other
- [ ] `type='transfer'` ignores any `category_id` in request — backend auto-assigns `Transfer IN`/`Transfer OUT`
- [ ] `type IN ('expense','income')` rejects system categories (`SYSTEM_CATEGORY_NOT_ALLOWED`); category type must match transaction type
- [ ] `amount > 0`

Errors mapped: `VALIDATION_ERROR`, `CATEGORY_TYPE_MISMATCH`, `TRANSFER_SAME_ACCOUNT`, `TRANSFER_CURRENCY_MISMATCH`, `SYSTEM_CATEGORY_NOT_ALLOWED`, `SPLITS_NOT_SUPPORTED_YET`, `ACCOUNT_NOT_FOUND`, `FORBIDDEN`.

### Atomic balance flow (the central correctness piece)

All transaction writes go through a single helper in `transactions/balance.go`. Pseudocode:

```go
// CreateInTx: insert one transaction (or paired transfer rows), update account balances atomically.
// Caller passes a *pgx.Tx so accounts.Service can reuse the same tx for opening-balance / adjust-balance.
func (s *Service) CreateInTx(ctx context.Context, tx pgx.Tx, req CreateRequest) (*Transaction, error) {
    accountIDs := req.AccountIDs() // [src] or [src,dst] for transfer
    sortLowestFirst(accountIDs)    // deadlock prevention

    // 1. Lock accounts in deterministic order
    for _, id := range accountIDs {
        if _, err := tx.Exec(ctx, `SELECT 1 FROM accounts WHERE id=$1 FOR UPDATE`, id); err != nil {
            return nil, err
        }
    }

    // 2. For transfers: auto-assign Transfer IN/OUT, generate transfer_group_id, build 2 rows
    //    For expense/income: validate category type match, build 1 row

    // 3. Insert row(s)
    // 4. UPDATE accounts SET balance = balance ± amount WHERE id = ?
    //    (income/transfer-in: +amount; expense/transfer-out: -amount)

    return result, nil
}

// UpdateInTx: amount/category/date/note edit. Re-locks affected account, computes delta, applies.
// DeleteInTx: locks account(s), deletes row(s), reverses balance.
```

Lock-ordering rule: **always sort the affected account IDs lowest-UUID-first** before acquiring `FOR UPDATE`. This is the only deadlock-prevention pattern; all writes must follow it.

Public surface used by `accounts.Service`:

- [ ] `CreateInTx(ctx, tx, req)` — used by opening-balance auto-tx + adjust-balance flow. The `accounts.Service` opens the tx, inserts the account row, then calls `CreateInTx` for the system-category transaction, then commits.

`accounts.Service.AdjustBalance` flow:

```
1. tx := db.Begin()
2. SELECT balance FROM accounts WHERE id=$1 FOR UPDATE
3. delta := req.NewBalance - currentBalance; if delta == 0 return 400 NO_OP
4. categoryID := categories.SystemFor(userID, ADJUST_IN if delta>0 else ADJUST_OUT)
5. transactions.Service.CreateInTx(ctx, tx, {type: incomeOrExpense, amount: abs(delta), category_id: categoryID, ...})
6. tx.Commit()
```

`accounts.Service.Create` (with non-zero opening balance) follows the same shape with `OPENING_IN/OPENING_OUT` system categories.

---

## Registration seed hook

Phase 0's `auth.Store.CreateUser` already inserts `users` + `user_preferences` in one tx. Extend it to also seed 6 system + 28 starter categories.

**Recommended pattern** — minimal coupling:

1. Define `categories.Seeder` interface in the `categories` package:
   ```go
   type Seeder interface {
       SeedForUser(ctx context.Context, tx pgx.Tx, userID uuid.UUID) error
   }
   ```
2. `categories.NewSeeder(starterCatalog []StarterCat)` returns the concrete impl (uses the in-package `seed.go` constant).
3. `auth.NewService(store, cfg, seeder Seeder)` accepts the seeder; calls `seeder.SeedForUser(ctx, tx, userID)` inside its existing tx.
4. `main.go` wires it: `seeder := categories.NewSeeder(); authService := auth.NewService(authStore, cfg, seeder)`.

Direction: `auth → categories` (one-way). No cycle.

Tasks:

- [ ] Add `seeder Seeder` field to `auth.Service`; pass through `NewService`
- [ ] Modify `auth.Store.CreateUser` to accept the seeder (or refactor: keep `Store` thin and have `Service.Register` orchestrate `CreateUser` + `seeder.SeedForUser` + `tx.Commit`). **Recommendation:** the second — pull the tx orchestration up into `auth.Service.Register` so `Store.CreateUser` becomes a pure DB insert helper. Keeps the `Store` layer tx-agnostic and lets `Service` compose multiple stores under one tx.
- [ ] `main.go` wires `categories.Seeder` into `auth.NewService`

This refactor is small (1 file in auth, plus the new seeder) and pays off later when more registration hooks accumulate (notifications settings in 1b, etc.).

---

## Router wiring (`cmd/api/main.go`)

Add the four new module groups. Ordering inside `protected`:

```go
// (existing)
protected.GET    "/users/me"  ...
protected.PUT    "/users/me"  ...

// (new)
protected.POST   "/categories"
protected.GET    "/categories"
protected.GET    "/categories/:id"
protected.PUT    "/categories/:id"
protected.DELETE "/categories/:id"
protected.POST   "/categories/:id/restore"
protected.DELETE "/categories/:id/permanent"

protected.POST   "/tags"
protected.GET    "/tags"
protected.GET    "/tags/:id"
protected.PUT    "/tags/:id"
protected.DELETE "/tags/:id"

protected.POST   "/accounts"
protected.GET    "/accounts"
protected.GET    "/accounts/:id"
protected.PUT    "/accounts/:id"
protected.DELETE "/accounts/:id"
protected.POST   "/accounts/:id/adjust-balance"
protected.GET    "/accounts/:id/summary"

protected.POST   "/transactions"
protected.GET    "/transactions"
protected.GET    "/transactions/summary"   // before /:id so it doesn't collide
protected.GET    "/transactions/:id"
protected.PUT    "/transactions/:id"
protected.DELETE "/transactions/:id"
protected.POST   "/transactions/:id/tags"
protected.DELETE "/transactions/:id/tags/:tag_id"
```

Note `/transactions/summary` must register before `/transactions/:id` to avoid `:id` swallowing the literal path.

---

## Tests

Match the Phase 0 testing depth — happy path + key edge cases. No 100% coverage push.

- [ ] **Unit tests** — service-level for each module: validation rules, error mappings, depth/cycle checks (categories), opening-balance flow (accounts)
- [ ] **Integration test — balance invariant** (the 1a ship-blocker):
  - 5 accounts, 50 goroutines × 20 transfers each → 1000 transfers total
  - At end, assert `accounts.balance == SUM(transactions per account)` for all 5
  - Failure here means lock ordering is wrong or a write path bypasses the helper
- [ ] **Integration test — transfer atomicity**: kill a transfer mid-flight (panic between row 1 and row 2 inserts); verify rollback leaves both accounts untouched
- [ ] **Smoke test — full happy path**: register → create 2 accounts (one with opening balance) → list categories (expect 34) → create expense → create transfer → adjust balance → list transactions → summary

---

## Manual verification

- [ ] Fresh `docker-compose up` + register flow yields 34 categories
- [ ] Create a `bank` account with `balance: 15000` → `accounts.balance = 15000`, transactions list shows the `Opening Balance` row
- [ ] Create an expense → balance drops correctly
- [ ] Create a transfer between two accounts → both balances update; `GET /transactions` shows two rows with shared `transfer_group_id`
- [ ] `POST /adjust-balance` with `new_balance: 18000` on an account currently at 15000 → 3000 income with `Adjustment` category
- [ ] Archive a category with transactions → status flips to `archived`, transactions still show its name
- [ ] Hard-delete a category with no transactions and one child → child re-parents to grandparent
- [ ] `DELETE /accounts/:id` always returns `archived`, never hard-deletes

---

## What you read

- [`../../design/spec/03-accounts.md`](../../design/spec/03-accounts.md) — accounts endpoints, balance-cache contract, type/currency mutability rules
- [`../../design/spec/04-transactions.md`](../../design/spec/04-transactions.md) — transactions endpoints, atomic write rules, immutable fields, transfer two-row pattern
- [`../../design/spec/05-categories-tags.md`](../../design/spec/05-categories-tags.md) — categories + tags endpoints, system cat seed catalog, hierarchy rules
- [`../../design/spec/overview.md`](../../design/spec/overview.md) — global API conventions (already known from Phase 0)
- [`../../design/database/schema.md`](../../design/database/schema.md) — sections 03 / 04 / 05
- [`db.md`](db.md) — migration order + per-user seed catalog
- Phase 0 source as reference: `internal/modules/auth/`, `internal/modules/users/` for module pattern; `auth.Store.CreateUser` for the in-tx seed pattern

## What you don't need to read

- Spec modules 06–13 (1b/1c). The `splits` request field is rejected with `400 SPLITS_NOT_SUPPORTED_YET` until 1b lands.

---

## Done when

- [ ] All 4 modules built; route table wired; `go test ./...` green
- [ ] Concurrency balance-invariant test passes
- [ ] Registration produces 34 categories; manually verified
- [ ] `accounts.Service.Create` with opening balance correctly creates an `Opening Balance` transaction in the same tx as the account
- [ ] `accounts.Service.AdjustBalance` correctly creates an `Adjustment` transaction and reconciles the cache
- [ ] `transactions.Service` rejects `splits` / `my_share` / `project_id` in request bodies with the documented error codes
- [ ] Transfer creates two rows with one `transfer_group_id`; lock ordering deterministic; concurrent transfers don't deadlock
- [ ] `system_kind` lookup helper (`categories.SystemFor`) is the only place that resolves the 6 system categories — no string-name SELECTs scattered through accounts/transactions code
