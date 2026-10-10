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
| `POST /v1/transactions` with `splits[]` (splitter side) | parent transaction | **by parent type** _(2026-09-16)_: `expense` → `owed_to_me` (splitter fronted money), `income` → `i_owe` (splitter received money that partly belongs to others) |
| Same call's mirror on linked partner's side | NULL (no tx in partner's book) | inverse of the splitter's (`i_owe` on expense, `owed_to_me` on income) |
| Manual `POST /v1/personal-debts` (cash loan, IOU, broken item) | NULL | caller picks |
| 1b.2: `POST /v1/projects/:id/project-transactions` with `splits[]` | NULL (project context uses `source_project_transaction_id`) | actor side / member side |

Settlement already keys off the debt's own direction (§2), so income-split
debts settle naturally: the splitter pays their share out as an expense,
the partner receives it as income. UI wording follows the direction:
expense splits = "หารกับ…", income splits = "แบ่งให้…".

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

### 3.9 Editing a bill's splits, overpaid debts, repayment rows (2026-10-10, migration 052)

**Repayments don't constrain edits (owner).** A split debt's `amount` can be edited below what was already repaid. `outstanding = amount − settled_amount` may then be **negative = overpaid**. Apps show it as `|outstanding|` owed the **other way** (e.g. Pond owed Lee 100, Lee repaid 50, the split is edited to 20 → outstanding −30 → "Pond owes Lee 30"). DB checks are now `amount >= 0` and `settled_amount >= 0` (the old `settled_amount <= amount` is gone).

- **Status:** `settled` only when repaid exactly matches the amount (incl. 0/0); otherwise `open`. Overpaid rows stay `open` so they show. `cancelled` is sticky.
- **People / dashboard totals:** an overpaid row counts on the opposite side (`owed_to_me` overpaid → adds to `i_owe`, and vice versa). Net is unchanged.
- **Settle** on an overpaid debt → `400 DEBT_OVERPAID`. Auto-bump never runs on an overpaid row.
- **Removing a person** from a split (`PUT /v1/transactions/:id/splits`, spec 04): an unpaid debt is deleted. A debt with repayments is **kept at amount 0**, so what they paid shows as overpaid. The repayment transaction is untouched.
- **Repayment rows** (`transactions.source_personal_debt_id`): deleting one takes its amount off the debt's `settled_amount` (floored at 0). Editing / unlinking repayments is deferred to the debt-repayment round.
- **Linked partner** (ledger rule): deleting MY repayment changes only my debt. The partner's book isn't touched and no notification is sent for it (their recorded receipt is theirs). Split re-amounts / removals reach them as `split_changed` (spec 13 §2.8).

### 3.10 `POST /v1/personal-debts/split-changes/:notification_id/apply`

"อัปเดตตาม" on a `split_changed` notification, **one shot**. It makes the caller's own (mirror) debt match:
- `change: amount` → their amount = `new_amount`;
- `removed` → their debt is deleted, or kept at 0 if they recorded repayments.

→ `200 {result: "updated" | "deleted" | "zeroed", debt}`, and the notification is marked actioned.

Errors:
- `409 NOTIFICATION_ACTIONED` — already used
- `409 SPLIT_CHANGE_STALE` — superseded by a newer change, or the split changed or was deleted since
- `400 NOT_SPLIT_CHANGE`
- `404` — their debt is gone

`POST /split-requests/:id/accept` also answers `409 SPLIT_CHANGE_STALE` when the split was removed before it was added.

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

**Implemented 2026-10-10** (one SQL fragment, `shared.ShareAmountExpr`):
share = amount − the bill's split debts in its author's book (both
directions — an income bill's `i_owe` splits too; open or repaid, a
forgiven one doesn't come off) − for an event bill the other members' board
splits (spec 10 §4.25). Floored at 0. Used by the transactions summary
(→ dashboard), list `totals`, a wallet's income / expense summary and
budgets' spent; exposed per row as `my_share` (spec 04 §3.3).

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
- **Last updated** — 2026-09-16
- **Version** — 1.1 (splits on income transactions: debt direction now follows the parent type — §1.4)
- **Version 1.0** — post-merge of splits + debts
- **Predecessor** — `06-shared-expenses.md` v0.3 (deprecated)
- **Migration** — 24 (drop splits, rebuild personal_debts) + 25 (rename source_split_id)
