# 03 — Accounts

Financial accounts — the places money lives. Cash wallets, bank accounts, e-wallets, credit cards, and pay-later services. Every transaction debits or credits an account; the account's balance is always the sum of its transactions (cached for fast reads).

This module owns the `accounts` table. Transactions (which update account balances) are specified in [`04-transactions.md`](04-transactions.md). The contract: **`accounts.balance` is a cache of `SUM(transactions)`, maintained atomically on every transaction write.** No other path mutates balance.

**Loans** and **savings** are not separate account types — see [§3.11](#311-loans-and-savings-are-not-account-types).

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 0/1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Create accounts (5 types) | ✅ | ✅ | ✅ |
| List / view / update / archive | ✅ | ✅ | ✅ |
| Opening balance auto-creates a transaction | ✅ | ✅ | ✅ |
| Manual balance adjust via dedicated endpoint | ✅ | ✅ | ✅ |
| Per-account summary with date filter | ✅ | ✅ | ✅ |
| Per-account currency in schema | ✅ | ✅ | ✅ |
| Multi-currency fully active (display + convert) | single (THB) | ✅ | ✅ |
| Reorder accounts (`sort_order`) | — | ✅ | ✅ |
| Bulk operations (admin / power-user) | — | — | ✅ |
| Balance reconciliation job (admin) | — | — | ✅ |
| Institution column (for bank grouping) | — | — | deferred until real bank integration |

---

## 1. Schema

Tables owned by this module: `accounts`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#03--accounts`](../database/schema.md#03--accounts).

### 1.1 System categories used by this module

The transactions created by this module use two reserved categories seeded at database init:

| Category name | Used for |
|---|---|
| `Opening Balance` | The auto-created transaction when a non-zero opening balance is specified |
| `Adjustment` | The transaction created by `POST /v1/accounts/:id/adjust-balance` |

Both are scoped per-user and seeded on user registration. Users can rename them but cannot delete them. Spec detail in [`05-categories-tags.md`](05-categories-tags.md).

---

## 2. API

All endpoints require authentication. Paths rooted at `/api`.

### 2.1 `POST /v1/accounts`

Create a new account. If a non-zero opening balance is given, an "Opening Balance" transaction is auto-created alongside the account.

**Request body:**

```json
{
  "name": "KBank Savings",
  "type": "bank",
  "balance": 15000.00,
  "currency": "THB",
  "icon": "bank",
  "color": "#2196F3"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | 1–100 chars |
| `type` | string | ✅ | one of the 5 enum values |
| `balance` | number | — | Opening balance; default `0` — see §3.2 |
| `currency` | string | — | ISO 4217; defaults to user's `currency` |
| `icon` | string | — | |
| `color` | string | — | Hex color |
| `credit_limit` | number | ✅ (if credit type) | ≥ 0 |
| `statement_date` | integer | — | 1–31 |
| `payment_due_date` | integer | — | 1–31 |
| `minimum_payment` | number | — | ≥ 0 |

**Backend flow:**

1. Begin DB transaction
2. Insert `accounts` row with `balance = 0`
3. If request `balance != 0`, insert a transaction:
   - `type`: `income` (if balance > 0) or `expense` (if balance < 0 — rare, e.g., opening credit card debt)
   - `amount`: `abs(balance)`
   - `category_id`: Opening Balance system category
   - `date`: today (in user's timezone)
   - `note`: "Opening balance"
4. Transaction service updates `accounts.balance` to match the inserted transaction
5. Commit

**Success — `201 Created`:** the created account with final `balance` reflecting the opening transaction.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid type, missing credit_limit for credit type, credit fields set for non-credit type |
| 401 | `UNAUTHORIZED` | |

### 2.2 `GET /v1/accounts`

List accounts owned by the user.

**Query parameters:**

| Name | Description |
|---|---|
| `status` | Filter by status (`active`, `archived`, `closed`); default `active` |
| `type` | Filter by account type |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "0190e4...",
      "name": "KBank Savings",
      "type": "bank",
      "balance": 15000.00,
      "currency": "THB",
      "icon": "bank",
      "color": "#2196F3",
      "status": "active",
      "credit_limit": null,
      "statement_date": null,
      "payment_due_date": null,
      "minimum_payment": null,
      "sort_order": 0,
      "created_at": "2026-04-24T10:00:00Z",
      "updated_at": "2026-04-24T10:00:00Z"
    }
  ],
  "total": 1
}
```

Default sort: `sort_order ASC, created_at ASC` (Phase 2+). Phase 1: `created_at ASC`.

### 2.3 `GET /v1/accounts/:id`

Get a single account by ID.

**Errors:** `401`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### 2.4 `PUT /v1/accounts/:id`

Update an account's metadata. Partial — only provided fields change.

**`balance` cannot be changed via this endpoint.** Use `POST /v1/accounts/:id/adjust-balance` (see §2.5) or create a transaction.

**Request body:**

```json
{
  "name": "KBank Savings (primary)",
  "type": "bank",
  "currency": "USD",
  "icon": "bank-alt",
  "color": "#1976D2",
  "status": "archived",
  "credit_limit": 50000.00,
  "statement_date": 28,
  "payment_due_date": 15,
  "minimum_payment": 1500.00,
  "sort_order": 1
}
```

All fields optional.

**Special rules:**

- **Changing `type`** — allowed with these constraints:
  - To a credit type: must supply `credit_limit` in the same request
  - From a credit type: credit fields (`credit_limit`, `statement_date`, `payment_due_date`, `minimum_payment`) are auto-set to NULL
  - Warning in the UI: "this changes how the account is classified; statement and billing settings may be reset"
- **Changing `currency`** — allowed, but:
  - Existing transactions keep their original currency (transactions have their own `currency` column — see `04-transactions.md`)
  - Only affects new transactions going forward
  - `balance` is **not** auto-converted (it's a cache of stored transactions, which are in their own currencies)
  - Warning in the UI: "existing transactions keep their original currency; balance display may mix currencies until historical data is converted"

**Response — `200 OK`:** the updated account.

**Errors:** `400 VALIDATION_ERROR`, `401`, `403`, `404`.

### 2.5 `POST /v1/accounts/:id/adjust-balance`

Manually adjust the balance to a target value. Backend computes the delta and creates an "Adjustment" transaction so the balance cache stays consistent with the transaction history.

**Request body:**

```json
{
  "new_balance": 18000.00,
  "date": "2026-04-24",
  "note": "Reconciled with bank statement"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `new_balance` | number | ✅ | Target balance after adjustment |
| `date` | string | — | `YYYY-MM-DD`; default today in user's tz |
| `note` | string | — | Free text |

**Backend flow:**

1. Begin DB transaction
2. Read current `accounts.balance`
3. Compute `delta = new_balance - current_balance`
4. If `delta == 0`, return `400 NO_OP`
5. Insert a transaction:
   - `type`: `income` (delta > 0) or `expense` (delta < 0)
   - `amount`: `abs(delta)`
   - `category_id`: Adjustment system category
   - `date`: as given
   - `note`: as given (or "Balance adjustment" default)
6. Transaction service updates `accounts.balance` to `new_balance`
7. Commit

**Success — `200 OK`:**

```json
{
  "account": { "id": "...", "balance": 18000.00, ... },
  "adjustment_transaction_id": "0190e5..."
}
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `NO_OP` | `new_balance` already matches current |
| 400 | `VALIDATION_ERROR` | Invalid date or balance |
| 401 / 403 / 404 | | |

### 2.6 `DELETE /v1/accounts/:id`

Archive the account. Always soft — sets `status = 'archived'`. Preserves transaction history; archived accounts are hidden from default lists.

To actually hard-delete: impossible while transactions reference it. Delete all transactions first (not recommended — destroys history).

**Success — `200 OK`:**

```json
{ "message": "Account archived", "status": "archived" }
```

**Errors:** `401`, `403`, `404`.

### 2.7 `GET /v1/accounts/:id/summary`

Balance summary and income/expense totals for an account over a date range.

**Query parameters:**

| Name | Required | Description |
|---|---|---|
| `from` | — | Start date (YYYY-MM-DD); default: 30 days ago in user's tz |
| `to` | — | End date; default: today in user's tz |

**Response — `200 OK`:**

```json
{
  "account_id": "0190e4...",
  "balance": 15000.00,
  "currency": "THB",
  "from": "2026-03-25",
  "to": "2026-04-24",
  "total_income": 30000.00,
  "total_expense": 15000.00,
  "net": 15000.00,
  "transaction_count": 42
}
```

`balance` is current balance as of now. `total_income`/`total_expense`/`net` are within the date range. Transfers **in** count as income; transfers **out** count as expense.

---

## 3. Design decisions

### 3.1 Five account types — no loan or savings type

Flat enum: `cash`, `bank`, `e_wallet`, `credit_card`, `pay_later`. Loans and savings are modeled through other modules (see [§3.11](#311-loans-and-savings-are-not-account-types)).

Investment accounts are explicitly out of scope (would require holdings, cost basis, price data).

### 3.2 `balance` is a cache; transactions are the source of truth

**The contract:** `accounts.balance` is always equal to the sum of that account's transactions, with `type=income` adding and `type=expense` subtracting. Transfers count on both sides (debit source, credit destination).

Alternatives considered:

- **Compute on every read** — slow as history grows; personal finance reads balance constantly
- **Event-sourced** — overkill
- **Direct mutable `balance`** — prone to drift; fragile; doesn't explain the balance

Chose: **cached column** maintained atomically by the transaction service. Read speed is fine; writes are the only place balance updates, so drift is contained to one layer.

Phase 3 adds a scheduled reconciliation job that verifies `accounts.balance == SUM(transactions)` and alerts on mismatch, plus an admin `POST /v1/admin/accounts/:id/recalculate` for repair.

### 3.3 Opening balance auto-creates a transaction

When `POST /v1/accounts` includes a non-zero `balance`, backend creates an "Opening Balance" transaction. The balance column starts at 0 and the transaction drives it to the requested value.

Benefits:

- Balance always has a transaction explaining it — no mystery numbers
- The invariant "`balance = SUM(transactions)`" holds from day one
- Consistent with how users think: the opening balance is money that existed before app use

Category: `Opening Balance` (seeded system category — §1.2).

### 3.4 Manual balance adjustment is a transaction, not a column update

`PUT /v1/accounts/:id` does **not** accept `balance`. Direct-write the column would break the invariant in §3.2. Instead, `POST /v1/accounts/:id/adjust-balance` creates an "Adjustment" transaction for the delta.

This means reconciling with a bank statement ("my bank says ฿18,000 but the app says ฿18,250") creates an Adjustment transaction of -฿250. The history shows why the number changed.

### 3.5 `status` enum over `is_active` boolean

For the same reason the users module uses `status` (users §3.3): states will proliferate (`archived`, `closed`, maybe `frozen` later). Starting with a string enum prevents a future migration from boolean.

- `active` — normal
- `archived` — soft-deleted; user-triggered; hidden from default list
- `closed` — bank/provider closed the account; kept for history; labeled "Closed" in UI (Phase 2 UX)

### 3.6 Balance atomicity with transactions

Every transaction write runs inside a DB transaction that:

1. `SELECT ... FOR UPDATE` on the affected account(s) — row-locks them
2. Inserts / updates / deletes the transaction row
3. Updates `accounts.balance` accordingly
4. Commits

For transfers (two accounts), both rows are locked in a consistent order (lowest `id` first) to avoid deadlocks. Detailed rules in [`04-transactions.md §3`](04-transactions.md).

### 3.7 `type` is mutable with rules

Users sometimes re-categorize accounts. Allow `PUT /v1/accounts/:id` to change `type` with these rules:

- To a credit type: `credit_limit` required in same request
- From a credit type: credit fields auto-cleared to NULL
- UI warns about the change

An alternative (new account + transfer + archive old) preserves history more cleanly but costs more user time. Most users change type rarely; when they do, they want the simpler path.

### 3.8 `currency` is mutable with rules

Allow currency change. Historical transactions keep their original currency (they have their own `currency` column from day one — see `04-transactions.md`). Only new transactions default to the new currency. UI warns that balance display may be mixed-currency until historical data is converted (Phase 2 dashboard handles conversion-at-display).

Alternative (lock currency immutably) is cleaner schema-wise but annoys users who legitimately change — e.g., moved from Thailand to another country.

### 3.9 Credit-field validation at API layer, not DB

Type-conditional rule (credit_limit required only for credit types) is enforced in Go, not via DB CHECK. Easier to evolve — if we add a new account type with different rules later, no migration needed.

### 3.10 Archive is always soft; hard delete is not offered

Accounts always have associated transactions (even a fresh account has its "Opening Balance" transaction). Hard-deleting would cascade-destroy transaction history or orphan rows. Neither is desirable. `DELETE /v1/accounts/:id` always archives.

If user truly wants to hard-delete: Phase 3 admin endpoint can do it, logging the cascade for audit.

### 3.11 Loans and savings are not account types

- **Loans** are modeled as `scheduled_transactions.entry_type = 'installment'` with optional `interest_rate` (Phase 1c; see [`11-scheduled-transactions.md`](11-scheduled-transactions.md)). A car loan at ฿10,000/month for 60 months at 5% APR is exactly an installment plan with interest: total amount, monthly payment, remaining count, interest rate, auto-generated monthly transactions. Adding a `loan` account type would duplicate this shape.
- **Savings** are modeled as `saving_goals` (Phase 1c; see [`09-saving-goals.md`](09-saving-goals.md)) linked to a `bank` account. The goal is "reach ฿100,000 in my KBank Savings"; progress tracks the linked account's balance. Adding a `savings` account type would blur the distinction between where money lives (account) and what you're saving toward (goal).

Both fit in Phase 1c without new account types. Keeps this module's schema focused on "places money lives."

### 3.12 Negative balance allowed for any type

Credit accounts go negative by design. Cash/bank can too (overdraft). App doesn't block — surfaces overdrafts as UI cues in Phase 2.

### 3.13 Summary endpoint is per-account

Cross-account totals (net worth, all-account spend) belong in the transactions module ([`04-transactions.md`](04-transactions.md)) and the Phase 2 dashboard.

---

## 4. Open questions

- **Default account for quick-add.** When user taps "+" to log a transaction, which account is pre-selected? Last used / user-marked default / first in sort order? Phase 2 decision.
- **Closing-credit-card UX.** When closing a credit card with outstanding balance: offer a final "final balance" transaction + archive? Phase 2 polish.
- **Account grouping (folders).** "Savings accounts," "Investment-ish accounts," etc. Phase 2 or 3 if real demand appears.
- **Account-level recurring scheduling.** `statement_date` exists but isn't yet used to remind the user. Phase 2 notifications will connect the dots.
- **Manual adjustment editable after creation?** User creates an Adjustment transaction and later wants to edit the amount. Treated as any other transaction — editable. Or lock it? Proposal: editable; UI labels it as "Adjustment" so the user knows what it is.
- **Re-opening a closed/archived account.** Reverse-flow (`PUT /v1/accounts/:id` with `status: active`) works technically. Keep as-is; no special endpoint needed unless a specific UX calls for it.

---

## 5. Status

- **Phase** — spec; Phase 1a implementation pending
- **Last updated** — 2026-04-24
- **Version** — 0.2 (balance-as-cache; opening-balance auto-transaction; adjust-balance endpoint; `status` enum; type/currency mutable; loans/savings via other modules; institution dropped)
