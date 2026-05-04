# 12 — Personal Debts (bidirectional)

The unified obligations ledger. Tracks "I owe X" and "Y owes me" in one
table — every commitment between the user and another party, regardless
of how it originated. Replaces the old two-table design (`shared_expense_splits`
+ debtor-only `personal_debts`) that shipped in 1b.1; merged in migration 24.

References: `transactions` (origin + settlement), `contacts`, `projects`
(1b.2), `project_transactions` (1b.2).

Global conventions in [`overview.md`](overview.md).

---

## 1. The model

### 1.1 Three layers

The app keeps **three separate truths**:

| Layer | What it tracks | Mutability |
|---|---|---|
| **Account** (`accounts.balance`) | Real cash. ฿4000 went out, balance dropped ฿4000. Never adjusted to reflect "my share". | Recomputed atomically on every transaction |
| **Transactions** (`transactions`) | The cash event itself. Full amount, account, category, date. | Mutable per spec §04 |
| **Personal debts** (`personal_debts`) | Relationship state — "X owes Y". Bidirectional, person-grouped. Net positions. | Mutable: cancel, settle, direct-edit |

The `personal_debts` row never moves money — it's metadata on top of
transactions, capturing the obligation that a transaction created.
Settlement of a debt creates *another* transaction that moves money,
with `source_personal_debt_id` pointing back at the debt.

### 1.2 Schema overview

Full column definitions in [`../database/schema.md#12--personal-debts-bidirectional`](../database/schema.md).

Key columns:

- `direction` — `'i_owe'` (counterparty is creditor) | `'owed_to_me'` (counterparty is debtor)
- `counterparty_contact_id` (nullable) + `counterparty_person_name` (always set) — direction-agnostic identification
- `source_transaction_id` (nullable) — origin transaction in this row's owner's book; NULL for manual debts and partner-side mirror rows
- `amount`, `settled_amount`, `status` (`open`/`settled`/`cancelled`)

### 1.3 Per-user ownership

Every row is owned by one user (`user_id`). When a split is created with
a linked contact, **two rows are created**, one in each user's book —
each user can edit theirs independently. If Alice creates expense + split
with linked Bob, the rows are:

| `user_id` | `direction` | `counterparty_*` | `source_transaction_id` |
|---|---|---|---|
| Alice | `owed_to_me` | Bob | Alice's transaction |
| Bob | `i_owe` | Alice | NULL (Bob has no transaction in his book) |

Bob can delete his row without affecting Alice's. Alice can edit her row
without affecting Bob's. This respects each user's sovereignty over their
own book.

### 1.4 Origin paths

A `personal_debts` row can be created via:

| Trigger | `source_transaction_id` | Direction |
|---|---|---|
| `POST /v1/transactions` with `splits[]` (splitter side) | parent transaction | `owed_to_me` |
| Same call's mirror on linked partner's side | NULL (no tx in partner's book) | `i_owe` |
| Manual `POST /v1/personal-debts` (cash loan, IOU, broken item) | NULL | caller picks |
| 1b.2: `POST /v1/projects/:id/project-transactions` with `splits[]` | NULL (project context uses `source_project_transaction_id`) | actor side / member side |

---

## 2. Settlement

Two ways `settled_amount` advances:

### 2.1 Through a transaction (default — money actually moves)

User creates a real income/expense via the settle endpoint:

```
POST /v1/personal-debts/:id/settle
{
  "account_id": "...",
  "amount": 2000,
  "date": "2026-05-04"
}
```

BE creates:
- One `transactions` row in the caller's book
  - `type=expense` for `i_owe` debts (paying back)
  - `type=income` for `owed_to_me` debts (receiving back)
  - `source_personal_debt_id = debtId`
  - Account balance updates accordingly
- Auto-bump: `personal_debts.settled_amount += amount`, status flips to `settled` if covered

### 2.2 Direct edit (no money — adjustments)

User edits the row directly via `PUT /v1/personal-debts/:id`:

```
{ "settled_amount": 2000 }     // marked partially/fully settled
{ "amount": 1500 }              // changed total (e.g., agreed lower)
{ "status": "cancelled" }       // forgiven / written off
```

Use cases:
- Forgiveness in exchange for a favor ("I'll do the dishes for a week instead of paying you back")
- Math correction (entered ฿2000, actual ฿1800)
- Negotiated amount ("just give me ฿1500, we're square")
- User doesn't track a cash account and partner paid cash

### 2.3 Settle endpoint flag

`POST /v1/personal-debts/:id/settle?direct=true` — explicit direct-edit mode.
Skips the transaction entirely and bumps `settled_amount` only. Useful when
the FE wants a single endpoint with toggle.

---

## 3. API

All endpoints require auth. Paths under `/api/v1`.

### 3.1 `GET /v1/personal-debts/people`

People view — aggregated by counterparty with net position.

**Response:**

```json
{
  "currency": "THB",
  "total_owed_to_me": 2000,
  "total_i_owe": 1000,
  "net_position": 1000,
  "data": [
    {
      "contact_id": "0190e5-bob",
      "display_name": "Bob",
      "owed_to_me_open": 500,
      "i_owe_open": 0,
      "net_position": 500,
      "open_count": 2
    },
    {
      "contact_id": null,
      "display_name": "Mom",
      "owed_to_me_open": 0,
      "i_owe_open": 1000,
      "net_position": -1000,
      "open_count": 1
    }
  ]
}
```

Grouping key: `contact_id` when set, else case-insensitive `counterparty_person_name`.
Settled and cancelled rows excluded.

### 3.2 `GET /v1/personal-debts`

Flat list. Filters:

| Name | Description |
|---|---|
| `direction` | `i_owe` / `owed_to_me` |
| `status` | `open` (default) / `settled` / `cancelled` / `all` |
| `counterparty_contact_id` | filter to a specific contact |
| `from`, `to` | date range (`created_at`) |
| `page`, `per_page` | pagination |

### 3.3 `POST /v1/personal-debts`

Manual debt entry. Both directions supported.

**Request:**

```json
{
  "direction": "i_owe",
  "counterparty_contact_id": "0190e5-mom",
  "counterparty_person_name": "Mom",
  "amount": 500,
  "currency": "THB",
  "note": "Cash loan for parking"
}
```

### 3.4 `GET /v1/personal-debts/:id`

### 3.5 `PUT /v1/personal-debts/:id` — direct edit

Editable: `amount`, `settled_amount`, `note`, `status`, `counterparty_*`.

### 3.6 `POST /v1/personal-debts/:id/cancel`

Marks `status='cancelled'`. No money moves.

### 3.7 `POST /v1/personal-debts/:id/settle?direct=<true|false>`

Records a settlement. Default mode (`direct=false`) creates a transaction.
`direct=true` skips the transaction and just bumps `settled_amount`.

**Errors:** `ALREADY_SETTLED`, `ALREADY_CANCELLED`, `OVERPAYMENT`.

### 3.8 `DELETE /v1/personal-debts/:id`

---

## 4. Design decisions

### 4.1 Why bidirectional in one table

Splits + debtor-only personal_debts (the original 1b.1 design) caused
semantic overlap and FE confusion: the same "obligation between two people"
was tracked in two tables with different shapes, two screens, with the
"owed to me" view computed from one and "I owe" from the other.

Unified: every obligation is one row. Direction column says which side
the row owner is on. People view nets directions trivially. The FE has
one screen, one mental model.

### 4.2 Why two rows for linked-contact splits (not one)

Each user's book is independent. Bob can delete his row, edit his note,
mark it settled via a barter agreement — none of which should mutate
Alice's view. A shared row would force conflict resolution (who wins
when both edit?). Two rows = no conflict, each user owns their truth.

Trade-off: the views can drift. Alice says "Bob owes me ฿2000"; Bob says
"I deleted that, never agreed to it". This is realistic — and matches
real life. Linked notifications at create-time alert the partner; both
sides can add notes if they disagree.

### 4.3 No more `shared_expense_splits` table

Removed in migration 24. The factual record of "this transaction was
split this way" lives in `personal_debts` rows with non-NULL
`source_transaction_id`. Querying `WHERE source_transaction_id = T` gives
the breakdown.

### 4.4 Direct edit vs transaction-settle

Both paths exist because real life has both. Money-moves cases create
transactions (audit trail, account balance updates). No-money cases
(forgiveness, barter, math fixes) skip transactions and just adjust
`settled_amount`. Users can pick per-case.

### 4.5 Account stays cash-basis; reports compute share-basis

`accounts.balance` and the transactions table track real money flow.
Spending reports (transactions summary) subtract the SUM of open
`personal_debts` rows where `direction='owed_to_me'` and
`source_transaction_id` matches — giving "my share". The user sees
฿4000 actually went out (cash truth) AND ฿2000 was their real cost
(share truth). Both are correct, neither is fudged.

### 4.6 Auto-bump on transaction with `source_personal_debt_id`

When a transaction with `source_personal_debt_id` lands, the BE looks
up the matching debt row owned by the same user and bumps
`settled_amount`. Single source of settlement state — no two-sided
handshake, no global flag.

If the transaction is rolled back (parent edit, account deletion),
the auto-bump rolls back too (same DB tx).

### 4.7 Manual debts and creditor-side bookkeeping

Manual debts (`source_transaction_id IS NULL`) cover:
- Cash I borrowed yesterday but didn't record the income
- "Bob broke my phone, owes me ฿8000"
- "I'll pay you ฿500 next time we meet" agreements

Both directions can be manual. The key constraint: `counterparty_person_name`
is always set — even free-text entries get displayed by name in the
people view.

---

## 5. Open questions / Phase 2+

- **Notifications** — `debt_created`, `debt_settled` triggers (replacing
  `split_*` types from the deprecated splits design)
- **Bulk settle** — "settle all my open debts with Alice in one tap"
- **Multi-currency dashboard** — nets across currencies (Phase 3+)
- **Auto-archive** — settled debts older than X months hidden from
  default views (user setting)
- **Project-context** — 1b.2's `source_project_transaction_id` and
  `project_id` columns ship dormant; project_transactions with splits
  not yet wired post-refactor

---

## 6. Status

- **Phase** — 1b refactor complete (BE + FE + schema)
- **Last updated** — 2026-05-04
- **Version** — 1.0 (post-merge of splits + debts)
- **Predecessor** — `06-shared-expenses.md` v0.3 (deprecated)
- **Migration** — 24 (drop splits, rebuild personal_debts) + 25 (rename source_split_id)
