# Phase 1a — Database

**Goal:** 5 new tables added via migrations 3–7 (`categories`, `tags`, `transaction_tags`, `accounts`, `transactions`); per-user seed of 6 system + 28 starter categories at registration; balance-cache invariant established and tested.

**Stack** (locked from Phase 0): PostgreSQL 15+, UUID v7 PKs (Go-side), `golang-migrate`, audit columns + `set_timestamp` trigger on every table.

For the canonical schema, see [`../../design/database/schema.md`](../../design/database/schema.md) sections 03 / 04 / 05. For the migration tooling and conventions, see [`../phase0/db.md`](../phase0/db.md).

---

## Migration order

FK dependencies dictate the order: `categories` and `accounts` must exist before `transactions`; `transactions` and `tags` must exist before `transaction_tags`.

| # | File | Tables | FKs to existing |
|---|---|---|---|
| 3 | `000003_init_categories.up.sql` | `categories` | `users.id` (owner + audit), self (`parent_id`) |
| 4 | `000004_init_tags.up.sql` | `tags` | `users.id` (owner + audit) |
| 5 | `000005_init_accounts.up.sql` | `accounts` | `users.id` (owner + audit) |
| 6 | `000006_init_transactions.up.sql` | `transactions` | `accounts.id`, `categories.id`, `users.id` |
| 7 | `000007_init_transaction_tags.up.sql` | `transaction_tags` | `transactions.id`, `tags.id`, `users.id` |

Each migration: idempotent up (`IF NOT EXISTS`), mandatory down, `set_timestamp` trigger on every table with `updated_at`.

---

## Tasks

### 000003 — `categories`

Per [`schema.md#05--categories--tags`](../../design/database/schema.md#05--categories--tags). Key points for the migration:

- [ ] Columns per schema (§ `categories`); `type CHECK IN ('income','expense')`, `status CHECK IN ('active','archived')`
- [ ] CHECK `id != parent_id` (no self-parenting)
- [ ] FK `parent_id → categories(id)` — no `ON DELETE CASCADE` (handler does grandparent-shift on delete)
- [ ] FK `user_id → users(id) ON DELETE CASCADE`
- [ ] **Indexes:**
  - `idx_categories_user (user_id, status)`
  - `idx_categories_parent (parent_id)`
  - `idx_categories_name UNIQUE (user_id, type, parent_id, LOWER(name)) WHERE status = 'active'` — partial-unique for case-insensitive sibling uniqueness, archived rows excluded
- [ ] `set_timestamp` trigger
- [ ] **API-layer rules** (not in DB): 3-layer depth limit; system categories have no `parent_id`

### 000004 — `tags`

- [ ] Columns per schema (§ `tags`)
- [ ] FK `user_id → users(id) ON DELETE CASCADE`
- [ ] **Indexes:**
  - `idx_tags_user (user_id)`
  - `idx_tags_name UNIQUE (user_id, LOWER(name))` — case-insensitive uniqueness
- [ ] `set_timestamp` trigger

### 000005 — `accounts`

Per [`schema.md#03--accounts`](../../design/database/schema.md#03--accounts):

- [ ] Columns per schema (§ `accounts`); `type CHECK IN ('cash','bank','e_wallet','credit_card','pay_later')`, `status CHECK IN ('active','archived','closed')`
- [ ] `balance DECIMAL(15,2) NOT NULL DEFAULT 0` — **comment in migration**: "Cached SUM(transactions). Maintained atomically by transaction service. Never updated except via balance-update path."
- [ ] CHECK `statement_date BETWEEN 1 AND 31` (NULL ok); same for `payment_due_date`
- [ ] FK `user_id → users(id) ON DELETE CASCADE`
- [ ] **Indexes:**
  - `idx_accounts_user (user_id, status)`
  - `idx_accounts_user_sort (user_id, sort_order)` — schema ships now, sort feature is Phase 2
- [ ] `set_timestamp` trigger
- [ ] **API-layer rules** (not in DB): credit-field requirement when `type IN ('credit_card','pay_later')`; `balance` not directly mutable via PUT

### 000006 — `transactions`

Per [`schema.md#04--transactions`](../../design/database/schema.md#04--transactions). **Phase 1a omits 4 columns** — see [`overview.md §Schema columns deferred`](overview.md#schema-columns-deferred-from-transactions-table). The 1a `transactions` table includes:

- [ ] `id`, `user_id`, `account_id`, `type`, `amount`, `category_id`, `date`, `note`, `transfer_group_id`, audit cols
- [ ] CHECK `type IN ('expense','income','transfer')`
- [ ] CHECK `amount > 0`
- [ ] FK `user_id → users(id)` (no CASCADE — users are anonymized, never hard-deleted; see schema §02)
- [ ] FK `account_id → accounts(id)` — **no CASCADE** (handler enforces "archive accounts, never delete" — `DELETE /v1/accounts/:id` is soft); FK protects against orphaning
- [ ] FK `category_id → categories(id)` ON DELETE SET NULL (when category hard-deleted from archived state with 0 references — per [`schema.md`](../../design/database/schema.md))
- [ ] **Indexes** (1a-relevant subset only — 1b/1c add more when their columns appear):
  - `idx_transactions_user_date (user_id, date DESC, created_at DESC)`
  - `idx_transactions_account_date (account_id, date DESC, created_at DESC)`
  - `idx_transactions_category (category_id, date DESC) WHERE category_id IS NOT NULL`
  - `idx_transactions_transfer_group (transfer_group_id) WHERE transfer_group_id IS NOT NULL`
- [ ] `set_timestamp` trigger
- [ ] **API-layer rules** (not in DB):
  - `type='transfer'` ⇒ `category_id` is one of the two system Transfer cats; `transfer_group_id NOT NULL`
  - `type IN ('expense','income')` ⇒ `transfer_group_id IS NULL`
  - Category type matches transaction type (expense cats on expense tx, etc.)
  - System categories (`Opening Balance`, `Adjustment`, `Transfer IN/OUT`) cannot be assigned by client — backend auto-sets

### 000007 — `transaction_tags`

- [ ] Columns per schema (§ `transaction_tags`); composite PK `(transaction_id, tag_id)`
- [ ] FK `transaction_id → transactions(id) ON DELETE CASCADE`
- [ ] FK `tag_id → tags(id) ON DELETE CASCADE`
- [ ] No additional indexes (composite PK covers both lookup directions in PG); add `idx_transaction_tags_tag (tag_id)` only if `usage_count` queries get slow

---

## Per-user seed at registration

System + starter categories are seeded **in Go**, not SQL — one row per user, inside the same DB transaction as `INSERT INTO users` (extending the existing `auth.Store.CreateUser` pattern that already inserts `user_preferences`).

See [`be.md §Registration seed hook`](be.md#registration-seed-hook) for the wiring. Catalog below.

### 6 system categories per user

Per [`05-categories-tags.md §2.1`](../../design/spec/05-categories-tags.md). All have `is_system = true`, `parent_id = NULL`.

| Name | Type | Used by |
|---|---|---|
| `Opening Balance` | `income` | `POST /v1/accounts` with positive opening |
| `Opening Balance` | `expense` | `POST /v1/accounts` with negative opening |
| `Adjustment` | `income` | `POST /v1/accounts/:id/adjust-balance` (delta > 0) |
| `Adjustment` | `expense` | `POST /v1/accounts/:id/adjust-balance` (delta < 0) |
| `Transfer In` | `income` | Every transfer-in row |
| `Transfer Out` | `expense` | Every transfer-out row |

Backend lookup helper: `categories.SystemFor(ctx, userID, kind)` where `kind` is one of `OPENING_IN/OPENING_OUT/ADJUST_IN/ADJUST_OUT/TRANSFER_IN/TRANSFER_OUT`. Cache per-request (`gin.Context`); resolve once.

### 28 starter user categories per user

Per [`05-categories-tags.md §2.2`](../../design/spec/05-categories-tags.md), English Phase 1 names. Stored in a Go slice constant (`internal/modules/categories/seed.go`); inserted in tree order (parents first, then children that point at the just-inserted parent IDs).

Expense (root + children):

```
Food → Restaurants, Groceries, Coffee & Drinks
Transport → Taxi / Grab, Public Transit, Fuel
Bills & Utilities → Electricity, Water, Internet, Phone
Shopping → Clothing, Electronics
Health → Medical, Pharmacy
Entertainment → Movies, Subscriptions
Personal Care
Education
Gifts & Donations
Travel
Others
```

Income: `Salary, Freelance, Interest, Refund, Gift, Others`.

---

## Balance-cache invariant test

The contract from [`03-accounts.md §3.2`](../../design/spec/03-accounts.md): `accounts.balance == SUM(transactions)` for every account, with `income` adding, `expense` subtracting, and transfers counted on both sides.

Phase 1a verification:

- [ ] **Unit test** — `transactions.Service` insert/update/delete each leave the cache consistent for a single account
- [ ] **Concurrency test** — 50 goroutines × 20 transfers each on a shared pool of 5 accounts; at the end, sum the transactions per account, compare against `accounts.balance`, expect equality. Locks via `SELECT … FOR UPDATE` ordered by lowest UUID.
- [ ] **Crash test** — kill the service mid-write (panic + recovery); verify no partial-balance state (`tx.Rollback` runs in `defer`)

Phase 3 will add a scheduled reconciliation job + admin `recalculate` endpoint; Phase 1a relies on the invariant holding by construction.

---

## Conventions reminders

- **Never edit a merged migration.** Schema corrections = a new migration with the next sequence number.
- **`IF NOT EXISTS` on up; mandatory down** that drops the table (and any new trigger) cleanly.
- **Postgres 15 has no native `gen_uuid_v7()`.** Generate UUIDs in Go (`uuid.NewV7()`) per the Phase 0 decision.
- **No `ON DELETE CASCADE` on `transactions.account_id`.** Handler enforces archive-only on accounts; FK protects from accidental orphans.
- **Comment the `accounts.balance` cache contract in the migration body.** Future readers must not be tempted to `UPDATE accounts SET balance = …` outside the transaction service.

---

## Verification

- [ ] `migrate up` from a fresh DB applies migrations 1–7 cleanly
- [ ] `migrate down 5` rolls back to Phase 0 state cleanly; `migrate up 5` reapplies
- [ ] After `auth/register`, inspecting the new user's rows shows 6 system cats + 28 starter cats present, with parents pointing at the right IDs
- [ ] Inserting a row in `transactions` updates `accounts.balance` by the right delta (verified manually via psql for the first few cases; integration test for the rest)
- [ ] Concurrency test passes (above)

---

## What you read

- [`../../design/database/schema.md`](../../design/database/schema.md) — full schema; sections 03 / 04 / 05 are 1a-owned
- [`../../design/spec/03-accounts.md`](../../design/spec/03-accounts.md) — balance-cache contract, opening-balance auto-tx, adjust-balance flow
- [`../../design/spec/04-transactions.md`](../../design/spec/04-transactions.md) — atomic write rules, transfer two-row pattern, immutable fields
- [`../../design/spec/05-categories-tags.md`](../../design/spec/05-categories-tags.md) — seed catalog, hierarchy rules, soft-delete behavior
- [`../phase0/db.md`](../phase0/db.md) — migration tooling decisions inherited

## What you don't need to read

- Spec modules 06–13 (1b/1c). The 4 deferred columns on `transactions` are flagged in [`overview.md`](overview.md); ignore the rest.

---

## Done when

- [ ] All 5 migrations apply + roll back cleanly
- [ ] Per-user seed inserts 34 category rows on registration (6 system + 28 starter)
- [ ] Balance-cache concurrency test green
- [ ] System category lookup helper (`categories.SystemFor`) exists and is reused by accounts + transactions modules
