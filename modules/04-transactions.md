# 04 — Transactions

Every money movement — expense, income, transfer — lives as one or more rows in the `transactions` table. This is the central module; most other modules reference it.

**Transaction =** a single row affecting one account. For transfers (two accounts involved), two rows are inserted, linked by `transfer_group_id`.

This module owns the `transactions` table. References: `accounts` (balance cache maintained by this module), `categories` (required for transfers, optional otherwise), `projects` (shared-visibility tag), `scheduled_transactions` (auto-gen source), `shared_expense_splits` (this module writes splits for shared expenses; splits module [06](06-shared-expenses.md) defines their schema), `project_transactions` (back-reference target for claim — see [`10-projects.md`](10-projects.md)).

**Edit/delete is fully free.** The transaction's `user_id` can edit any field or delete the row at any time, regardless of splits, debts, or project context. Drift between this row and any downstream personal_debts (auto-bumped via `source_split_id`) or shared-book views is documented behavior under the unified shared-expenses model — see [`06-shared-expenses.md`](06-shared-expenses.md) §4.6.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](README.md).

---

## Phase summary

| Concern | Phase 0/1 | Phase 2 | Phase 3 |
|---|---|---|---|
| CRUD on expense / income / transfer | ✅ | ✅ | ✅ |
| Atomic balance updates on `accounts` | ✅ | ✅ | ✅ |
| Split bills (shared expenses) | ✅ | ✅ | ✅ |
| Project tag for shared visibility | ✅ | ✅ | ✅ |
| Scheduled-transaction origin tag | ✅ | ✅ | ✅ |
| Resolve link to a split (`source_split_id`) | ✅ | ✅ | ✅ |
| Claim link to a project_transaction (`source_project_transaction_id`) | ✅ | ✅ | ✅ |
| Per-transaction currency (multi-currency) | single currency (inherits account) | ✅ cross-currency transfers | ✅ |
| Receipt OCR (no photo storage) | — | ✅ | ✅ |
| Bulk operations | — | — | ✅ (admin / power-user web) |
| Suggest-edit proposal workflow (non-creator edits) | — | — | ✅ |

---

## 1. Schema

Tables owned by this module: `transactions`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#04--transactions`](../ref/schema.md#04--transactions).

Notable column behavior:

- `project_id` — auto-set only on rows that mirror a project (claim or split-resolve). Never settable directly via `POST /v1/transactions`. Bare personal transactions always have `project_id = NULL`.
- `source_split_id` — set when this transaction was created via a split-rooted resolve action (`pay` or `receive`). Used for per-caller computed settlement state.
- `source_project_transaction_id` — set when this transaction was created via the actor's claim of a project_transaction.

Intentionally absent: `currency` (inherited from `account.currency`), `photo_url` (Phase 2 OCR without storage), `saving_goal_id` (computed from balance × allocation), `is_split` boolean (inferable from existence of splits).

---

## 2. Semantics

### 2.1 Amount is always positive

Direction of money flow is determined by `type` (and `category_id` for transfers):

| `type` | `category_id` | Effect on account |
|---|---|---|
| `expense` | any user category | `account.balance -= amount` |
| `income` | any user category | `account.balance += amount` |
| `transfer` | `Transfer OUT` (system) | `account.balance -= amount` |
| `transfer` | `Transfer IN` (system) | `account.balance += amount` |

### 2.2 Transfer = two rows, one transfer_group_id

A transfer is always **two transaction rows** sharing the same `transfer_group_id`:

- Row A: `type='transfer'`, `category=Transfer OUT`, `account_id=source` → debits source
- Row B: `type='transfer'`, `category=Transfer IN`, `account_id=destination` → credits destination

```
Alice transfers ฿1,000 from KBank to Cash:

Row A: type=transfer, account=KBank, category=Transfer OUT, amount=1000, transfer_group_id=g1
Row B: type=transfer, account=Cash,  category=Transfer IN,  amount=1000, transfer_group_id=g1

Net effect:
  KBank.balance -= 1000
  Cash.balance  += 1000
```

Both rows inserted atomically (single DB transaction with row locks on both accounts). API accepts one create request; backend fans out to two rows.

**Phase 1 constraint:** source and destination accounts must have the same `currency`. Cross-currency transfers = Phase 2.

**Cross-currency transfer (Phase 2):** amounts can differ. User enters both amounts (from source currency and to destination currency) based on real bank data. System computes effective rate for display only (`Row A.amount / Row B.amount`). No stored `exchange_rate` column.

### 2.3 Category rules

- **`expense` / `income`:** category is **optional**. NULL means "uncategorized."
- **`transfer`:** category is **required** and must be one of the two system categories:
  - `Transfer OUT` (expense-type) — for the debit side
  - `Transfer IN` (income-type) — for the credit side
- Category **type must match** transaction type (expense transactions use expense categories; income transactions use income categories) — enforced at API.
- System categories (`Opening Balance`, `Adjustment`, `Transfer IN`, `Transfer OUT`) are **auto-assigned by the backend** in the following flows:
  - `POST /v1/accounts` with opening balance → creates transaction with `Opening Balance` category
  - `POST /v1/accounts/:id/adjust-balance` → creates transaction with `Adjustment` category
  - `POST /v1/transactions` with `type='transfer'` → auto-assigns `Transfer IN` / `Transfer OUT` based on direction

### 2.4 Balance cache invariant

`accounts.balance` is a cached sum of this account's transactions. Every transaction write updates it atomically in the same DB transaction as the row write. Details in [`03-accounts.md §3.2–3.6`](03-accounts.md).

### 2.5 Project visibility

Transactions with `project_id` set are visible to all linked members of that project via the shared-book view (see [`10-projects.md §2.1`](10-projects.md)). The transaction is still **owned** by `user_id` (creator only edits).

### 2.6 Future dates and recurring links (0.4.0-2, updated 2026-10-20)

Replaces the 0.3.1-10 flow, where a future date made or moved the row into a one-off "upcoming" item of the recurring module. Owner 2026-10-20: the one-off upcoming is cut. `scheduled_transaction_id` is still gone (migration 057). Fields: [`api-document.md` §04](../ref/api-document.md#04--transactions).

**A future-dated transaction is a plain transaction.**
- Saved from quick create, or edited in tx detail, with a date after today (user's timezone), it is a normal committed row in `transactions`: no pending step, no upcoming item, no `upcoming` field on the write result and no error. Transfers, debt entries and event bills may carry a future date too.
- Editing a row to a future date just saves it; the detail page stays open. Quick create shows no note under a future date.
- What counts stops at today. Until its day the row is in no wallet balance (spec 03 §3.2a, the effective balance), `month_in` / `month_out`, list `totals` and `daily` (§3.2, 0.4.0 list numbers), `GET /transactions/summary` (dashboard, reports), category month figures or budget `used`. On its day it counts by itself (no job, no second write).
- Budgets show a future expense inside the current period as expected: source `future_tx`, chip "ล่วงหน้า" (spec 08 §0.2).
- The list shows it (§3.2), and the pagination `total` counts it.
- App: in the transactions list a future row is dimmed and carries "อีก N วัน" ("พรุ่งนี้" for tomorrow; no tag on today's rows). The list's period can step into future months (the period pill's › and swipe), so a future row is reached by stepping forward. With the default newest-first sort the future rows sit on top.
- The recurring module keeps only recurring settings. The old one-off upcoming items and their pending drafts were removed by migration 068.

**Recurring links.** A row may record ONE occurrence of a recurring setting (`recurring_item {item_id, recurring, seq, total}` on the row: a recorded occurrence is always a stored row). One occurrence ↔ one transaction; the transaction keeps its own date and amount. The occurrence model is in [`11-scheduled-transactions.md`](11-scheduled-transactions.md).
- Linking from quick create takes two steps: the setting (nearest due first), then its occurrence. The top group is "งวดใกล้เคียง", then ค้าง / งวดถัดไป / งวดที่ผ่านมา. An occurrence that another transaction holds asks "สลับรายการที่ผูก?" before the swap. Linking can also happen later, from tx detail or from the recurring page.
- Edits with `also_update_link: true` also reach the occurrence the row records.
- Deleting the transaction always releases its occurrence (§3.5). The app asks "ลบรายการนี้?" with two choices plus cancel: "ลบรายการอย่างเดียว (งวดกลับเป็นค้าง)" → `DELETE /v1/transactions/:id`, the occurrence goes back to due / upcoming by its date (to paid if it had been marked paid before); "ลบรายการและข้ามงวดนี้" → `?skip_occurrence=true`, the occurrence becomes skipped in the same DB transaction. Unlinking keeps the transaction and releases the occurrence the same way.
- `DELETE ?also_delete_link=true` stays for event bills; for a recurring link `skip_occurrence` takes its place.

### 2.8 Link modes and "paid by someone else" (0.4.0-3, migration 070; income 0.4.1-0, migration 080)

Owner 2026-10-21 (`rules/decisions.md` "Paid by someone else", REVISED / REFINED). Quick create's ผูกกับ row has four tabs, **ส่วนตัว | แบ่ง | จ่ายแทน | อีเวนต์**, and the top amount is the BILL. A bill is shared ONE way at a time.
- **`link_mode`** on every row (list, detail, write answers) and on every pending draft (`resolved.link_mode`): `event` = an event bill or a copy of one; `split` = it has splits; `paid` = someone paid (part of) it for me, or received (part of) my income; `personal` = all mine. It tells the form which tab to reopen; the data for it is `splits` / `paid_by` / `event_bill`.
- **paid_by.** `POST /transactions`, `PUT /transactions/:id` and pending drafts take `paid_by {contact_id | person_name, amount}` (one payer). Bill 123, Lee paid 13 → ONE expense with `amount 123`, `paid_by_amount 13`:
  - reports, budgets, list totals and `my_share` count **123** (my consumption);
  - the wallet moves the cash part only, **110** (`wallet_amount` = amount − paid_by.amount). It drives the cached balance, the future-dated effective balance (`shared.SignedTxSQL`), the wallet card's month out and the wallet summary (`LEAST(my_share, cash)`). `paid_by.amount = amount` → no wallet (any `account_id` sent is dropped);
  - the debt "I owe Lee 13" is made in the same call (spec 12 §1.5a). The write answer's `person_balance` is Lee's new balance.
  - Row view: `paid_by {debt_id, key, person, amount, my_paid, source me | partner, paid}` (author only).
- **รับแทน (income, 0.4.1-0, migration 080).** `paid_by` also goes on an income: someone received part of my income for me. Income 123, Lee received 13 → `amount 123`, `paid_by_amount 13`: the income counts **123**, the wallet moves **110** (`my_paid` = what reached my wallet; all of it → no wallet), and the debt is "Lee owes me 13" (a `paid` entry, spec 12 §1.5a). On an expense the debt stays "I owe them" (`received`). `link_mode` is `paid` for both.
- **Rules.** Expense or income only: a transfer can't carry paid_by (400 `PAID_BY_EXPENSE_ONLY`). `paid_by.amount ≤ amount`, and a later lower amount is refused too (400 `PAID_BY_EXCEEDS_AMOUNT`). A person is required (400 `VALIDATION_ERROR`); a foreign contact → 400 `CONTACT_NOT_FOUND`. Exclusive with splits and events: paid_by with `splits` / `source_project_transaction_id`, paid_by on a row that has splits or is in an event, splits on a paid row (`PUT /:id/splits`), and pulling a paid row into an event all give 400 `LINK_MODE_CONFLICT`. `can_join_event` is false on a paid row. Switching modes on an existing row (split ↔ paid ↔ event, with a preview) is 0.4.0-3 B3.
- **PUT.** `paid_by` absent = unchanged (the debt still follows the row's date and description); an object sets or replaces it (another person = the old debt goes, a new one comes, a linked payer gets `split_changed` "removed" + `split_created`); `null` removes it (the wallet then takes the whole amount).
- **Partner mirror.** A linked user's split on me also lands as my expense of my share with `paid_by.source partner` (spec 12 §1.5a): its amount / date / wallet / paid_by follow their bill (409 `PAID_BY_LOCKED`); category, description, note and tags are mine.
- **DELETE.** My own paid_by debt goes with the row (a linked payer gets "removed"); a partner mirror's debt stays, unlinked. `person_balance` is returned.
- **Event tab (B2).** The อีเวนต์ tab saves through the event bills endpoints with `payer` / `members` (spec 10 §0.4a); someone else paid → my row is my share with no wallet. The row's `event_bill {payer, bill_amount, members}` rebuilds the tab.

### 2.9 Switching link modes, preview, linked pair (0.4.0-3 B3)
- **One call per switch.** `PUT /transactions/:id` takes `link_mode` (personal | split | paid | event) with that mode's data: `splits` (SplitEdit[], as `PUT /:id/splits`), `paid_by`, or `event {project_id, payer?, members?}`. Order inside one DB transaction:
  1. The old mode's data goes. Leaving an event: the bill made from the row is removed from the board (its board splits are NOT brought back), a copy just unlinks. Leaving split: the split debts are deleted and linked partners get `split_changed` "removed". Leaving paid: the paid-by debt is deleted and the wallet takes the whole amount.
  2. The field edits (amount, wallet, …).
  3. The new mode's data. Into an event: I paid → the row becomes the bill; someone else paid → the row becomes my share with no wallet (its money comes back). Another event = a move.
  - Repayments are never touched (they belong to the person).
  - Author only (403 `SPLITS_AUTHOR_ONLY`); not on a debt's wallet side or a repayment (400 `SYSTEM_TRANSACTION_IMMUTABLE`).
  - 400 `LINK_MODE_INPUT`: the new mode came without its data. 400 `LINK_MODE_CONFLICT`: another mode's data was sent. Without `link_mode`, `splits` edits a split / personal row and `event` is refused.
  - A partner-mirrored row is money-locked (409 `PAID_BY_LOCKED`, includes any mode switch).
  - The write answer adds `person_balances` (every person the row touched before / after).
- **Preview.** `PUT /transactions/:id?preview=true` runs the whole edit in a savepoint and rolls it back. It answers `TransactionPreview {preview, rows, people [{key, person, before, after, delta}], wallets [{account_id, before, after, delta}]}`, for the confirm dialog. Nothing is saved and no notification goes out. People = the row's split / paid-by / debt / repayment persons; event-board positions are not part of it.
- **My book vs the event book** (owner 2026-10-21). A row linked to an event bill is the bill's **origin** (the bill was made from it: amount = the bill) or my **copy** (amount = my share). Neither side changes the other by itself:
  - `event_bill` (detail / write answers) carries `kind origin | copy`, `in_sync` and `differences [{field amount | date | description | note, mine, event}]`, computed live. Tags are copied on apply, never compared.
  - My row → the bill: `apply_to_event: true` on PUT (also `also_update_link`). An origin sends amount / date / description / note / tags (as event tags). A copy sends date / description / note and its amount as my share (my split, or the bill's rest when I am its payer). The bill's other people get `project_tx_changed`.
  - The bill → my row: `apply_to_my_tx: true` on the bill edit (spec 10 §0.4b), or later `POST /transactions/:id/apply-event`. Both read the bill as it is NOW; matching personal tags are added; my `project_tx_changed` notices for the row are marked actioned.
  - Deleting either side unlinks (as before).

### 2.7 Resolve back-references

Two nullable FKs on `transactions` capture the source of personal entries created via the unified shared-expenses flows:

- `source_split_id` → the `shared_expense_splits.id` this entry resolves (set on `pay` and `receive` actions). The debtor's payment expense has it; the creditor's receipt income has it. Either side computes settlement state per-caller by summing personal entries with this FK matching the split.
- `source_project_transaction_id` → the `project_transactions.id` this entry mirrors (set only on the actor's claim action). When a linked actor claims their project_transaction, splits migrate to this personal mirror via `source_transaction_id` rewrite.

At most one is set per row. Standalone personal transactions (no split, no claim) have both NULL.

Details in [`06-shared-expenses.md`](06-shared-expenses.md) and [`10-projects.md`](10-projects.md).

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `POST /v1/transactions`

Create a transaction.

**Request body (single-account — expense or income):**

```json
{
  "type": "expense",
  "account_id": "0190e5-kbank",
  "amount": 250.00,
  "category_id": "0190e5-food-restaurants",
  "date": "2026-04-24",
  "note": "Lunch with coworker",
  "project_id": null
}
```

**Request body (transfer — one request, two rows created):**

```json
{
  "type": "transfer",
  "account_id": "0190e5-kbank",
  "transfer_to_account_id": "0190e5-cash",
  "amount": 1000.00,
  "date": "2026-04-24",
  "note": "Weekly cash withdrawal"
}
```

For transfers, the API accepts a `transfer_to_account_id` field. Backend creates the two rows with matching `transfer_group_id` and auto-assigns the system categories.

**Request body (with split — personal-context expense to be shared):**

```json
{
  "type": "expense",
  "account_id": "0190e5-kbank",
  "amount": 3000.00,
  "category_id": "0190e5-food",
  "date": "2026-04-24",
  "note": "Dinner with friends",
  "splits": [
    { "person_name": "Bob",   "contact_id": "0190e5-bob",   "owed_amount": 1000.00 },
    { "person_name": "Carol", "contact_id": "0190e5-carol", "owed_amount": 1000.00 }
  ],
  "my_share": 1000.00
}
```

Splits create rows in `shared_expense_splits` (schema in [`06-shared-expenses.md`](06-shared-expenses.md)). Each split row **must include `person_name`** (the durable display label) and may optionally include `contact_id` to promote the row to a structured contact reference. The two coexist; the service writes `person_name = COALESCE(contact.nickname, contact.display_name)` whenever `contact_id` is set so the snapshot is in step with the link. See [`06-shared-expenses.md §2.5`](06-shared-expenses.md). `project_member_id` ships with the projects module (1b.2) — splitting with project members on a personal transaction is allowed there, but for now (1b.1) it isn't a valid field on the request.

| Field | Type | Required | Rules |
|---|---|---|---|
| `type` | string | ✅ | `'expense'` / `'income'` / `'transfer'` |
| `account_id` | string | ✅ | Must belong to caller |
| `amount` | number | ✅ | > 0 |
| `category_id` | string | transfer: no (auto-set) — otherwise optional | Matches transaction type; not system category unless transfer |
| `date` | date | ✅ | Calendar date in user's tz |
| `note` | string | — | Free-text |
| `transfer_to_account_id` | string | required if type=transfer | Must belong to caller; must differ from `account_id`; same currency (Phase 1) |
| `splits` | array | — | For personal-context shared expenses; each split row requires `person_name` (always) and may include `contact_id` (optional structured ref). See [`06-shared-expenses.md §2.5`](06-shared-expenses.md). |
| `my_share` | number | required if `splits` present | Caller's own share amount (included in total) |

**Note: no `project_id` parameter.** Personal transactions cannot be created with `project_id` set. The field is auto-managed: it's set on the row only when the row is a project mirror (a claim or a split-resolve, both created via dedicated endpoints in [`10-projects.md`](10-projects.md) §3.7 and [`06-shared-expenses.md`](06-shared-expenses.md) §3). To "associate" a personal transaction with a project, either (a) record it as a `project_transaction` instead, or (b) tag it with a `tag` (see [`05-categories-tags.md`](05-categories-tags.md)).

**Split validation rules:**

- Sum of all splits' `owed_amount` + `my_share` must equal `amount` (otherwise `400 SPLITS_MISMATCH`)
- At least one split row required if `splits` is present
- Each split row sets exactly one of `contact_id` / `person_name` (not `project_member_id`)
- Transfer transactions cannot have splits

**Notification side effects:** for each split with a debtor whose `contact.linked_user_id` is set (linked contact), a `split_created` notification fires per the splitter's `auto_notify_linked_split_contacts` setting (see [`13-notifications.md`](13-notifications.md)).

**Success — `201 Created`:** expense / income answer with the same detail as `GET /v1/transactions/:id` (§3.3: `splits`, `split_count`, tags, project, shared-wallet fields) plus `account_balance_after` (2026-10-10; before that `splits` was missing from the create response).

```json
{
  "id": "0190e5-tx1",
  "type": "expense",
  "account_id": "0190e5-kbank",
  "account": { "id": "0190e5-kbank", "name": "KBank" },
  "amount": 3000.00,
  "category": { "id": "...", "name": "Food" },
  "date": "2026-04-24",
  "note": "Team dinner",
  "has_splits": true,
  "split_count": 2,
  "splits": [
    { "debt_id": "0190e5-d1", "person_name": "Bob",   "contact_id": "0190e5-bob", "direction": "owed_to_me", "amount": 1000.00, "settled_amount": 0, "status": "open" },
    { "debt_id": "0190e5-d2", "person_name": "Carol", "contact_id": null,         "direction": "owed_to_me", "amount": 1000.00, "settled_amount": 0, "status": "open" }
  ],
  "tags": [],
  "account_balance_after": 12000.00,
  "created_at": "2026-04-24T14:00:00Z"
}
```

For transfers, response includes both rows:

```json
{
  "transfer_group_id": "g1",
  "rows": [
    { "id": "...", "account_id": "...kbank", "category": "Transfer OUT", "amount": 1000.00 },
    { "id": "...", "account_id": "...cash",  "category": "Transfer IN",  "amount": 1000.00 }
  ]
}
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid fields |
| 400 | `CATEGORY_TYPE_MISMATCH` | Expense category used on income tx or vice versa |
| 400 | `TRANSFER_SAME_ACCOUNT` | `account_id = transfer_to_account_id` |
| 400 | `SYSTEM_CATEGORY_NOT_ALLOWED` | User tried to use a system category on a non-transfer transaction |
| 400 | `SPLITS_MISMATCH` | Sum of splits + my_share ≠ amount |
| 400 | `SPLITS_ON_TRANSFER` | Transfer with splits attached |
| 401 | `UNAUTHORIZED` | |
| 403 | `FORBIDDEN` | Account / category / project not owned / accessible |
| 404 | `ACCOUNT_NOT_FOUND` | |

### 3.2 `GET /v1/transactions`

List transactions for the caller's own book (not shared-book — that's `GET /v1/projects/:id/transactions`).

**Query parameters:**

| Name | Description |
|---|---|
| `account_id` | Filter by account |
| `category_id` | Filter by category (exact, not descendant rollup) |
| `type` | Filter by `expense` / `income` / `transfer` |
| `project_id` | Filter by project (caller's own rows tagged to project) |
| `from`, `to` | Date range (YYYY-MM-DD) |
| `has_splits` | `true` / `false` |
| `page`, `per_page` | Standard pagination; default 20, max 100 |
| `sort` | `date_desc` (default) / `date_asc` / `amount_desc` / `amount_asc` |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "0190e5-tx1",
      "type": "expense",
      "account": { "id": "...", "name": "KBank" },
      "category": { "id": "...", "name": "Food > Restaurants" },
      "amount": 250.00,
      "date": "2026-04-24",
      "note": "Lunch",
      "project_id": null,
      "has_splits": false,
      "is_recurring": false,
      "is_settlement": false,
      "created_at": "..."
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 142, "total_pages": 8 },
  "totals": { "income": 12000.00, "expense": 8540.00, "net": 3460.00, "count": 57 }
}
```

Derived booleans in response: `has_splits` (any `shared_expense_splits` for this tx), `is_recurring` (`scheduled_transaction_id IS NOT NULL`), `is_resolve` (`source_split_id IS NOT NULL` OR `source_project_transaction_id IS NOT NULL`).

`totals` (2026-10-10): money over the **whole filtered set** — every page, the same filters and visibility as the rows (all of them optional; no `from`/`to` = all time). `income` / `expense` = sums of income / expense rows; transfers count in neither. `net` = income − expense. `count` = the income + expense rows (`pagination.total` also counts both transfer rows). System rows (opening balance, adjustments, debt settlements) count like any other row the list shows. Sent on every page. Unlike `GET /v1/transactions/summary`, there is no report-scope or reportable-category narrowing.

Future-dated rows (0.4.0-2, updated 2026-10-20; §2.6): the list returns them like any row (with `date_desc` they come first) and `pagination.total` counts them, but `totals` leaves them out until their day.

### 3.3 `GET /v1/transactions/:id`

Single transaction with full details — account, category, splits, project, scheduled_transaction reference, transfer pair (if transfer).

Fields added 2026-10-10 (list rows carry them too unless noted):

- `split_count` — how many debt rows this transaction made in its owner's book (0 = none; `has_splits` = `split_count > 0`).
- `splits` — **detail only** (GET /:id, the create / update / PUT splits responses; never on list rows), always an array: `[{debt_id, person_name, contact_id, direction, amount, settled_amount, status}]`, oldest first, only the caller's own debt rows (a shared-wallet member who isn't the author gets `[]`).
- `project` — `{id, name}` when `project_id` is set; key absent otherwise.
- `created_at` / `updated_at` — RFC3339 timestamps (were always there).

Fields added 2026-10-10, second round (list rows too):

- `my_share` — expense / income only (absent on transfers): the author's share, what every report counts (spec 12 §4.5). `amount` − the bill's split debts that aren't forgiven − for an **event bill** (in an event at full amount, its author the board row's actor) also the other members' board splits. Floored at 0. `amount` itself stays the cash that moved.
- `can_split` — the row can carry personal splits: expense / income, not a debt repayment or system row (opening balance / adjustment). Event bills too — their own splits are a layer on my share (spec 10 §4.25).
- `can_edit_splits` — `can_split` and the caller is the author (`PUT /:id/splits`).
- `can_join_event` — the caller may pull it into an event (`POST /v1/projects/:id/bills`, `/projects/quick`; `"move": true` when it already has `project_id`): the author, expense / income, not a repayment or system row, no split repaid or forgiven (an event bill's own splits don't move with it, so they never block).

### 3.4a `PUT /v1/transactions/:id/splits` — edit a bill's splits (2026-10-10)

Body = the **whole new list**: `{"splits": [{"debt_id": uuid, "owed_amount": n, "person_name"?, "contact_id"?} | {"person_name", "contact_id"?, "owed_amount"}]}`. Each item:
- an existing `debt_id` → keeps it, re-amounted;
- no `debt_id` → adds a person;
- a split left out → removed; `[]` removes all.

**Changing a saved split's person (2026-10-10; lock lifted 2026-10-12):** `person_name` / `contact_id` on a kept item — left out or equal to the current values = no change; `"contact_id": null` (the key present) drops the contact, back to a free name.
- The split is a **free name, or its contact has no app account** (`linked_user_id` null) → the person changes in place: rename, switch to another of my contacts, link to a contact, or drop back to a free name. Same debt row, repayments kept, nobody notified. A new contact's `display_name` is the default name. If the new contact **has** an app account, they get `split_created` for the split's current amount, exactly as for a new split.
- The split's contact **is linked to an app user** (they may hold a mirror), and the contact changes (another contact, or `"contact_id": null`) → **remove + add in one transaction**, same amount (the amount sent on the item): the old split is removed exactly as if it were left out of the list — the old partner hears `split_changed` removed ("อัปเดตตาม"), or their pending `split_created` is superseded; unpaid → the row is deleted, repaid → it stays at 0 (overpaid); the new person is a **new debt row** (new `debt_id`, nothing repaid, appended after the others) and, if linked to an app user, gets `split_created`. Never touches anyone's book. A **rename that keeps the same linked contact** is in place and silent (same row). There is no identity lock any more. **A split that has a contact always shows the contact's resolved name (API v2, 2026-10-12): a sent `person_name` on it is ignored (same contact → ignored; a changed contact → that contact's name); only a free-name split renames in place.**

Rules:
- Author only, expense / income only.
- Σ `owed_amount` ≤ the transaction amount (`400 SPLITS_EXCEED_AMOUNT`).
- Repayments **don't** constrain edits: amounts may go below what was repaid (overpaid, spec 12 §3.9). A removed person who repaid keeps a 0-amount debt; an unpaid one is deleted.
- Other errors:
  - `403 SPLITS_AUTHOR_ONLY`
  - `400 SPLITS_ON_TRANSFER`
  - `400 VALIDATION_ERROR` (unknown or duplicate `debt_id`, a new person without a name)
  - `400 CONTACT_NOT_FOUND`
  - `409 CONTACT_ARCHIVED`
  - `400 SPLITS_EXCEED_SHARE` (an event bill: Σ > amount − the board's member splits, spec 10 §4.25)
  - `400 SYSTEM_TRANSACTION_IMMUTABLE` (a debt repayment or another system row)

Response: the transaction detail with updated `splits`. Linked partners hear about it through `split_created` (added) / `split_changed` (re-amounted / removed), spec 13.

### 3.4b Deleting a repayment row (2026-10-10)

A row with `source_personal_debt_id` (a debt repayment, system category Debt Paid / Received) can now be **deleted**: the balance is reversed and its amount comes off the debt's `settled_amount` (floored at 0). Editing or unlinking repayments ("ไม่ใช่การจ่ายหนี้") is deferred to the debt-repayment round — they stay read-only (`SYSTEM_TRANSACTION_IMMUTABLE`).

### 3.4 `PUT /v1/transactions/:id`

Update editable fields. Caller must be `user_id`. Edits are unconditional — no edit-after-resolve guards under the unified shared-expenses model (see [`06-shared-expenses.md`](06-shared-expenses.md) §4.6 and [`10-projects.md`](10-projects.md) §4.18).

**Editable:** `amount`, `date`, `category_id`, `note`, `splits` (replace-all).
**Not editable:** `type`, `user_id`, `account_id`, `transfer_to_account_id` (delete + recreate if needed), `transfer_group_id`, `scheduled_transaction_id`, `source_split_id`, `source_project_transaction_id`, `project_id`, `created_at`.

`project_id` is not editable because it's auto-managed from the source FKs (claim or split-resolve). To change a row's project association, the underlying source must change — which means deleting and recreating via the appropriate project flow.

**Amount changes:** account balance re-adjusted atomically (compute delta; apply to account).

**Splits replaced:** old splits deleted; new splits inserted. Any personal_debts that referenced the old splits via `source_split_id` get their FK cleared (`ON DELETE SET NULL`); the debt rows themselves stay (debtor's tracking).

**Currency / account change not allowed:** if user wants this, they delete and recreate.

**Notification side effects:** `split_created` may fire for newly-introduced splits (per the splitter's setting). No notifications fire for split removals — debtors find out at next sync.

**Errors:** `400 VALIDATION_ERROR`, `400 SPLITS_MISMATCH`, `401`, `403`, `404`.

### 3.5 `DELETE /v1/transactions/:id`

Hard delete. Caller must be `user_id`. Unconditional — no settlement guards.

**Backend flow:**

1. Delete splits (cascade) — any `personal_debts.source_split_id` referencing them is set NULL
2. If `type = 'transfer'`, delete the paired row too (via `transfer_group_id`)
3. Reverse account balance changes atomically
4. Delete the transaction row(s)

If the transaction had `source_split_id` set (it was a resolve action — `pay` or `receive`), deleting it removes the personal-side record of the resolution. The split itself stays (it lives on the parent transaction); per-caller settlement state recomputes accordingly.

If the transaction records a recurring occurrence (0.4.0-2, updated 2026-10-20; §2.6), the delete releases it in the same DB transaction: the occurrence goes back to due / upcoming by its date (to paid if it had been marked paid first). With `?skip_occurrence=true` the occurrence is stored as skipped instead. The other leg of a transfer, or a shared-wallet member's delete, releases it the same way.

If the transaction had `source_project_transaction_id` set (it was a claim), deleting it removes the personal mirror. The project_transaction stays as the project ledger record. **Splits that were migrated to the personal mirror at claim time stay on the personal mirror** — they don't auto-migrate back to the project_transaction. (If you want to fully unwind a claim, the actor would re-claim afterwards, which would re-create the personal mirror; the splits would still need to be re-pointed manually. Phase 2+ may add an auto-migrate-back on claim deletion.)

**Errors:** `401`, `403`, `404`.

### 3.6 `GET /v1/transactions/summary`

Aggregated totals across date range.

**Query parameters:**

| Name | Required | Description |
|---|---|---|
| `from` | ✅ | Start date |
| `to` | ✅ | End date |
| `account_id` | — | Filter by account |
| `category_id` | — | Filter by category (with hierarchy rollup) |
| `project_id` | — | Filter by project |
| `group_by` | — | `day` / `week` / `month` / `category` / `account` |

**Response — `200 OK`:**

```json
{
  "from": "2026-04-01",
  "to": "2026-04-30",
  "currency": "THB",
  "total_income": 50000.00,
  "total_expense": 32000.00,
  "net": 18000.00,
  "transaction_count": 42,
  "by_category": [
    { "category_id": "...", "category_name": "Food", "total": 8500.00, "count": 12 },
    { "category_id": "...", "category_name": "Transport", "total": 4200.00, "count": 8 }
  ]
}
```

Transfers are excluded from income/expense aggregates (they're just money movement, not spending or earning).

Rows dated after today are left out until their day, even when `to` is later (0.4.0-2, updated 2026-10-20; §2.6).

---

## 4. Design decisions

### 4.1 Three transaction types, direction encoded in category for transfers

Rejected: four types (`expense` / `income` / `transfer_in` / `transfer_out`). Using category (Transfer IN / Transfer OUT) to encode transfer direction:

- Keeps the `type` enum small (3 values)
- Reuses the existing system-category mechanism
- `category_id` is already a required field for transfers, so no extra column

### 4.2 Amount always positive

Direction comes from `type` (for expense/income) or from `category_id` (for transfers). Negative amounts would duplicate the information and invite bugs.

### 4.3 Transfer = two rows, linked by group_id

Industry-standard pattern (YNAB, Actual Budget, Firefly III). Each row's `account_id` clearly identifies which account is affected. Per-account queries are trivially `WHERE account_id = ?`. Transfer as a single row with `transfer_to_account_id` (the alternative) requires OR clauses everywhere and mixes debit/credit logic.

### 4.4 Currency inherited from account

No per-transaction `currency` column. A transaction in KBank (THB) is in THB; always. For cross-currency movements, the user creates a transfer to a different-currency account — each leg records the real amount in each account's currency. Phase 2 surfaces this UX.

### 4.5 No photo storage

Phase 2 adds OCR: user takes a photo, client sends to an OCR endpoint, backend returns extracted fields (amount, date, merchant). Image is not stored. Privacy + cost benefits. No `photo_url` column.

### 4.6 Edit rules — creator only in Phase 1

Only the transaction's `user_id` can edit. Even inside a project (where transactions are visible to members), non-creators can only view. Phase 3+ could add "suggest edit" workflow.

### 4.7 Splits are hard-rolled into the transaction API

`POST /v1/transactions` accepts a `splits` array for shared expenses. No separate "create split" endpoint in typical flows — the split is part of the transaction create operation, inserted atomically.

Later manipulation (adding a split, removing one, etc.) uses `PUT /v1/transactions/:id` with replace-all semantics on `splits`.

### 4.8 Transfer category auto-assignment

Backend sets `Transfer IN` / `Transfer OUT` on transfer rows automatically. User can't specify (attempting returns `SYSTEM_CATEGORY_NOT_ALLOWED`). Keeps direction semantic unambiguous.

### 4.9 Atomic writes

Every transaction create / update / delete runs inside a single DB transaction:

- Transaction row write
- Related account(s) balance update — `SELECT ... FOR UPDATE` on account rows first
- Split rows insert / delete if applicable
- Scheduled-transaction counter updates (for installments) if applicable

If any step fails, whole thing rolls back. No partial state. Lock ordering (lowest account ID first) prevents deadlocks between concurrent transfers.

### 4.10 Balance cache updates

Every write updates `accounts.balance` directly in the same DB transaction. Details in [`03-accounts.md §3.2`](03-accounts.md). Reconciliation job (Phase 3+) catches any drift from `SUM(transactions)`.

### 4.11 Notes have no DB length cap

`note` is `TEXT` — DB accepts any length. API-layer advisory limit (~500 chars) for UI purposes, but not enforced as a constraint. Users who really want to paste a long note can.

### 4.12 Dates are calendar dates, not timestamps

`transactions.date` is `DATE` (no time component). A transaction is "on April 24" without needing to say "at 14:03 +07." This matches how users think about money. Timezone interpretation for "today" / "this month" uses `user.preferences.timezone` (see [`02-users.md §3.6`](02-users.md)).

`created_at` is a real timestamp — used for audit ordering, not for business logic.

### 4.13 Transfers exclude from income/expense totals

In `/transactions/summary`, transfers are neither income nor expense — they're internal money movement. Aggregates exclude rows where `type='transfer'`. Per-account summaries (in `03-accounts.md §2.7`) do count transfers as "money in" / "money out" for that specific account, which is a different lens.

### 4.14 Immutable fields after create

`user_id`, `account_id`, `type`, `transfer_to_account_id` (via paired row), `transfer_group_id`, `scheduled_transaction_id`, `source_split_id`, `source_project_transaction_id`, `project_id`, `created_at`. Changing any of these effectively means "different transaction" — user deletes and recreates.

`project_id` is in this list because it's derived from the source FKs (claim or split-resolve). It cannot be set or changed by direct user action.

This avoids complex re-balancing logic and preserves audit integrity.

### 4.16 Edits and deletes are unconditional

The owner (`user_id`) can edit or delete any transaction at any time, regardless of:

- Whether splits hang off it (splits cascade-delete)
- Whether the splits have been resolved by other members on their personal books (per-caller settlement state recomputes)
- Whether other members have personal_debts referencing the splits (`source_split_id` becomes NULL on split delete)
- Whether the transaction itself is a resolve action (`source_split_id` set) or a claim mirror (`source_project_transaction_id` set)

This is the unified shared-expenses model. Settlement state is per-caller computed; there's no global state to corrupt by editing. Drift between this transaction and any downstream personal_debts or other members' personal entries is documented behavior — surfaced by `project_tx_changed` notifications (for project-context parents) so other members can update their books if they choose.

Earlier drafts had `SPLITS_HAVE_SETTLEMENTS` and `HAS_SETTLEMENTS` guards. Removed under the unified model.

### 4.16a Transfer legs without a wallet (0.3.3)

A transfer stays two rows sharing `transfer_group_id`; OUT / IN come from the system category (Transfer Out / Transfer In), not from the wallet. When a wallet is deleted (spec 03 §delete) its leg keeps living with `account_id = NULL`; the other leg and its wallet balance are unchanged and reports are unaffected (transfer categories are not in reports).

- Create: both wallets are still required. A wallet-less leg only comes from deleting a wallet.
- Edit (from either row): amount / date / description / note move only the legs that have a wallet. `account_id` = the OUT leg's wallet, `transfer_to_account_id` = the IN leg's; each is re-filed on its own. A wallet-less leg can be given a wallet (its balance moves); a leg that has a wallet cannot be cleared (400); the legs cannot share a wallet.
- Delete: removes both rows, reverses only the legs that have a wallet.
- Authorization: a wallet-less leg needs no membership; the leg that has a wallet needs it as before (both legs wallet-less: the author only).
- `transfer_peer.account` is `null` when the twin has no wallet (the page shows "ไม่ผูกกระเป๋า" and offers a wallet picker).

### 4.15 Account change via delete + recreate

Acknowledged this is friction — users make "which account" mistakes commonly. The alternative (allow account_id change) requires:

- Reversing old account's balance
- Updating new account's balance
- Validating new account belongs to caller, same currency (Phase 1), etc.

Implementable but adds edge cases. Deferred to Phase 2 as "Move transaction to different account" helper endpoint.

---

## 5. Open questions

- **Recurring-generated transaction "badge."** Phase 2 UX: generated transactions show "Recurring" label. `scheduled_transaction_id` is already available in responses.
- **Multi-line transactions / splits-within-one-account.** E.g., buying ฿3,000 at a supermarket, ฿500 was "Food," ฿2,500 was "Household." Phase 3+ — would need a `transaction_line_items` table. Not in scope.
- **Pending / cleared state.** Some apps track "pending" (not yet cleared at bank) separately. Not in Phase 1 scope; all transactions are cleared on create.
- **Auto-categorization.** Phase 3+ could learn user's patterns and suggest categories for new transactions. Nice-to-have, not essential.
- **Bulk recategorize.** Phase 2+ — when a user archives a category, offer "move all transactions to another category" in one batch.
- **Suggest-edit workflow inside projects.** Phase 3+ — non-creators can propose edits that creator approves. Requires new table for edit proposals.
- **FX rate API for Phase 2 multi-currency.** External provider (exchangerate-api.com, frankfurter.app). Cache daily. Client-side fetch for display-only amounts.
- **Pagination alternatives.** Cursor-based pagination for very large histories. Phase 3+ if offset pagination gets slow.

---

## 6. Status

- **Phase** — spec; Phase 1a implementation pending
- **Last updated** — 2026-04-26; 0.4.0-2 notes 2026-10-20 (future-dated rows + recurring links §2.6, list §3.2, delete §3.5, summary §3.6, list numbers); 0.4.0-3 2026-10-21 (link modes + paid_by §2.8, list totals skip debt categories)
- **Version** — 0.2 (unified shared-expenses model)
  - Renamed `settles_split_id` → `source_split_id` for naming consistency
  - Added `source_project_transaction_id` for the actor-claim mirror (links a personal entry back to the project_transaction it mirrors)
  - `project_id` becomes auto-managed: only set on rows that mirror a project (via `source_split_id` or `source_project_transaction_id`). No longer settable directly via `POST /v1/transactions`. Plain personal transactions always have `project_id = NULL`.
  - Personal-context splits cannot use `project_member_id` debtors — they use `contact_id` or `person_name` only. Splitting with project members requires creating a `project_transaction` instead.
  - Removed edit-after-resolve guards (`SPLITS_HAVE_SETTLEMENTS`, `HAS_SETTLEMENTS`) — the owner can freely edit/delete; settlement is per-caller computed
  - Notification side effects on split create / split delete documented
- **Version 0.1** — initial draft; 3-type model with transfer-via-category, two-row transfers, per-account currency, no photo storage, atomic balance updates, `settles_split_id` for settlement linkage

## 0.4.0 list numbers

`GET /transactions` also returns `avg_daily_spend` and `daily`: both follow the list's date range (`from` / `to`; with only `from`, that month; with neither, the CURRENT month in the user's timezone) and every other filter. `daily` = one `{date, income, expense}` per day of the range (my share, zero-filled, the whole range even past today; empty when the range is over 366 days). `avg_daily_spend` = the range's expense / the days of it that have happened (up to today, at least 1). `totals` is unchanged (it follows the filters as before).

0.4.0-2 (updated 2026-10-20): `daily` and `totals` count rows up to today only, so the days after today stay 0 even when future-dated rows exist (§2.6).

0.4.0-3 (2026-10-21): like reports, `totals.income` / `totals.expense` and `daily` leave out rows whose category is kept out of reports (`include_in_report = false`: Debt Paid / Debt Received repayments, opening balance, adjustments, and any user category set that way). `totals.count` still counts them. The wallet card's `month_in` / `month_out` (spec 03) also skip Debt Paid / Debt Received, and `month_out` counts a paid_by row's cash part (§2.8).
