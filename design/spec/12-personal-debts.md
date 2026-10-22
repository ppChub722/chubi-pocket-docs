# 12 — Personal Debts (the person ledger)

What the user and each other person owe each other: debts ("Lee paid for my food, I owe 60", "borrowed 500 from Lee") and repayments ("จ่ายคืนลี 400"). One balance per person.

Shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`, tag **Debts**. Global conventions in [`overview.md`](overview.md). Owner decision: `ai/decisions.md` "Debt model" (2026-10-21).

## 1. Model (0.4.0-3, migration 069)

### 1.1 Debts and repayments
- A **DEBT** is a ledger record in `personal_debts`: `{person, direction paid | received, amount > 0, date, description, note, paid label, optional linked transaction, optional split source}`.
  - **paid** = I paid them / for them (they owe me, signed +amount); **received** = they paid me / for me (I owe them, signed −amount).
  - A debt MAY carry its own **linked transaction** (`transactions.source_personal_debt_id`, see §1.3), e.g. the 500 I borrowed landing in my wallet. That transaction moves the wallet but **never changes the person's balance**.
- A **REPAYMENT** is a **transaction** tied to the **person** (not to a debt): `transactions.repay_contact_id` + `repay_person_name` (§1.4).
  - **pay** = I pay them back: an expense in the system category Debt Paid, signed **+amount**.
  - **receive** = they pay me back: an income in Debt Received, signed **−amount**.
  - Both categories are out of reports (`include_in_report = false`); the wallet moves like any transaction.
- **Balance per person** (`net`) = Σ signed debts + Σ signed repayments. > 0 = they owe me (รอรับ), < 0 = I owe them (รอจ่าย), 0 = cleared (หายกัน). It can flip sign freely.
  - Example (Lee): debts −60, −500 (with a linked income tx), −70; repayment pay 400 (+400) → net −230. A final pay 230 → 0, cleared.
- **"จ่ายแล้ว"** (`personal_debts.paid`) is an optional manual label per debt: never set automatically, never changes a number. The balance alone decides when it's done.
- No cancel, no `settled_amount`, no `outstanding`, no `status`: stop counting = delete (hard). Repayments are deleted as transactions.

### 1.2 Person key
`c:<contact_id>` (one of my contacts) or `n:<name>` (a typed name, matched case-insensitively; the BE returns it lower-cased and trimmed). `shared.DebtKey` / `shared.DebtKeySQL` (debts) / `shared.RepayKeySQL` (repayments). A typed name and a contact are separate people (merge them by linking: §1.6). Writing to an `n:` key without `person_name` keeps the person's current spelling (the latest line's snapshot); `person_name` sets it.

### 1.3 A debt's linked transaction (one record)
A debt with a wallet transaction owns exactly ONE (`source_personal_debt_id`, unique): paid = expense, received = income, in Debt Paid / Debt Received, same date / amount / description / note.
- Edits on either side write both (`PUT /personal-debts/:id` → the tx; `PUT /transactions/:id` → the debt, via `transactions.DebtLinks`); deleting either deletes both (the wallet balance comes back).
- From the tx side the category stays (400 `SYSTEM_TRANSACTION_IMMUTABLE`), the wallet can't be dropped (400 `DEBT_TX_NEEDS_WALLET`: ledger-only is `PUT /personal-debts/:id {account_id: null}`), and a co-member who isn't the author can't edit / delete it (403 `DEBT_TX_AUTHOR_ONLY`).
- The tx shows `counterparty: {entry_id, key, person, direction, paid}` to its author; it can't carry splits or join an event.
- Tags live only on that transaction (a debt without one takes no tags: 400 `TAGS_NEED_WALLET`).

### 1.4 A repayment transaction
- Made by `POST /personal-debts/people/:key/repayments` (or a pending `settle_debt` draft, §2.3). DB rule (CHECK): the person columns are set only on an expense / income that is not a debt's linked tx and not a transfer; `repay_person_name` is always set on a repayment, `repay_contact_id` only for a contact (`ON DELETE SET NULL`).
- The row shows `repayment_person: {key, name, contact_id, person}` to its author (tx detail "จ่ายคืนให้ ลี ›" / "รับคืนจาก ลี ›" → the person page).
- Edit it like any transaction (`PUT /transactions/:id`: amount, date, wallet (may be dropped), description, note, tags; never the category: 400 `SYSTEM_TRANSACTION_IMMUTABLE`; author only: 403 `DEBT_TX_AUTHOR_ONLY`). The link stays; the balance is computed, so amount / date edits flow in. The write answer's `person_balance` is the person's new balance.
- `DELETE /transactions/:id` deletes the repayment (its answer carries the person's new `person_balance`).
- It can't carry splits or join an event (system category).

### 1.5 Split-sourced debts
`source_kind`: `transaction` = a split on my bill (the bill owns amount / person / date); `partner` = another user's split on me (the mirror); `event` = the event resolve sheet's "as debt" (0.4.0-3 B3: `POST …/entries {bill_id}`, the entry keeps the bill (`source_project_transaction_id`) and its event; 400 `BILL_NOT_FOUND` unless I am an active member; its money STAYS editable, it is my own record). On `transaction` / `partner` / `paid_by` only description / note / paid change (409 `ENTRY_MANAGED_BY_SOURCE`). Deleting a `transaction` split takes it off the bill (my_share grows; a linked partner gets `split_changed` "removed"). An expense split = a `paid` debt (they owe me); an income split = `received`. The mirror on a linked partner's side has the opposite direction; each user owns their own rows (ledger, not sync).

### 1.5a Paid by someone else (0.4.0-3, migration 070)
Owner 2026-10-21 ("Paid by someone else", quick create tab จ่ายแทน). Someone paid (part of) MY expense: I record a real expense of the whole bill, and the same save makes the debt I owe.
- **Shape.** Bill 123, Lee paid 13, I paid 110 = ONE expense `amount 123` with `transactions.paid_by_amount 13`. Reports, budgets and `my_share` count 123 (my consumption). The wallet moves only the cash part, `amount − paid_by_amount` = 110 (`wallet_amount` on the row); they paid it all → no wallet. The debt "I owe Lee 13" is a `received` entry, `source_kind paid_by`, linked back by `personal_debts.paid_for_transaction_id` (unique, `ON DELETE CASCADE`). It is NOT a `source_transaction_id` split, so it never lowers my_share.
- **One record with the expense.** `POST /transactions` / `PUT /transactions/:id` / pending submit take `paid_by {contact_id | person_name, amount}` (spec 04 §2.8). The debt follows the row: amount = paid_by.amount, date and description = the row's. Another person = the old debt goes and a new one comes. `paid_by: null` = the debt goes. Deleting the expense deletes the debt. From the debts page only description / note / paid change (409 `ENTRY_MANAGED_BY_SOURCE`), and `DELETE /personal-debts/:id` → 409 `DEBT_MANAGED_BY_TX`.
- **Linked payer.** When the payer is a contact linked to a user, they get the usual `split_created` notice with `recipient_direction: paid` (they are owed). Their mirror is a plain `paid` debt with no expense. A paid_by change / removal sends `split_changed`, like a split edit.
- **A partner's split on me** (`source_kind partner`, the mirror of a split on THEIR expense) now also makes my expense of my share: `amount` = my share, `paid_by_amount` = the same (paid in full by them), no wallet. The category is my category with the same name as theirs (case-insensitive, top level first), else none. Description = theirs. It is created when the mirror is (auto-accept or the accept tap) and linked by `paid_for_transaction_id`. Its money (amount / date / wallet / paid_by) follows their bill: `PUT` → 409 `PAID_BY_LOCKED`; "อัปเดตตาม" (`split-changes/:nid/apply`, or auto-apply) moves the debt AND the expense, and a removed split deletes both. Category / description / note / tags are mine. Deleting the expense keeps their debt on me (unlinked). Deleting the mirror debt from the debts page deletes the expense too (it has no wallet). Mirrors from before 0.4.0-3 have no expense.
- **DebtSource** on such debts: `paid_by` → `{id: the expense, title: its description or category}`; `partner` → `{id: my expense of it (or null), title: their name}`.

### 1.6 Contacts
Debts and repayments are independent of contacts (spec 07): archiving a contact changes nothing; deleting one drops its debts AND repayments back to the typed name (`RestoreOnContactDeleteTx` writes the live name into the snapshot first); `unlinked-names` and absorb cover both tables.

## 2. Balance, cycles, statement

### 2.1 The ledger
Every number comes from ONE line set (`shared.DebtLedgerSQL`): the debts + the repayment transactions, each signed (§1.1), in book order (date, created_at, id). A debt's linked transaction is not a line.
- `net` = Σ signed; `entry_count` = lines (debts + repayments); `open_count` = debts not labelled paid (a repayment is never open); `last_activity_at` = the latest line date.
- **Listing rule** (`GET /people`, `/me/counts.open_debts`, totals' `open_count`): a person shows when |net| > 0.005 OR a debt isn't labelled paid; `all=true` shows everyone.

### 2.2 Cycles, age, summary message (0.4.0)
- **Cycle.** The running balance over the lines; a cycle ends where it hits 0. `cleared_at` = the date of the last such line (null if never); lines after it = the **current cycle**. `GET /people/:key` takes `cycle=current (default) | earlier | all`; `/entries` takes `cycle` too (debts only); every listed line has `in_current_cycle`.
- **Age.** `days_outstanding` = days (user timezone) since the oldest debt of the current cycle not labelled paid; null when none.
- **Order:** `GET /personal-debts/people?sort=oldest|amount|recent` (default oldest: days_outstanding desc, none last, then |net|). `totals` (`owed_to_me, i_owe, net, open_count, owed_to_me_people, i_owe_people, over_30_days_people`) cover ALL people and ignore `q` / `side` / `all` / paging.
- **Summary message.** `GET /people/:key` carries `summary_message {text, entries, net}`: Thai text, the current-cycle lines oldest first (`+` ฉันจ่ายให้ / ฉันจ่ายคืน, `−` ได้รับจาก / ได้รับคืนจาก, with description) and the total. The FE only shares it.

### 2.3 Statement ("ที่มาของยอด")
`GET /personal-debts/people/:key` `items` = `DebtStatementItem[]`: debts AND repayments interleaved, newest first, page-ready:
`{kind debt | repayment, id (debt id | transaction id), key, direction paid | received (= the sign), amount, signed_amount, date, description, note, paid (debts; null on a repayment), source (debts; null on a repayment), transaction {id, account} (a debt's linked tx | the repayment tx itself), in_current_cycle, created_at, updated_at}`.
`counts {entries, money, current, earlier}` are over the lines (`money` = debts with a linked tx + every repayment).

The pending `settle_debt` draft (target = a debt) submits as a **repayment transaction** to that debt's person in the opposite direction (a paid debt → receive; a received debt → pay), on the draft's wallet; the debt is not touched.

## 3. Endpoints
| Route | What |
|---|---|
| `GET /personal-debts/people?page&per_page&q&all&side&sort` | One row per person (`DebtPerson`) + `totals` (`DebtTotals`). |
| `GET /personal-debts/people/:key?cycle&page&per_page` | The person page in one call: `DebtPerson` + `counts` + the statement (`items`, §2.3) + `summary_message`. A contact key with no lines answers zeros; a typed key with none → 404. |
| `GET /personal-debts/people/:key/entries` | DEBTS only: `q`, `sort`, `direction`, `paid`, `cycle`, `money=true` (has a linked tx), `account_id`, `from` / `to`. Feeds the "mark paid" list (`paid=false`). |
| `POST /personal-debts/people/:key/entries` | Record a DEBT: `{direction, amount, date?, account_id?, create_transaction?, description?, note?, tag_ids?, mark_paid_ids?, person_name?}` → 201 `DebtEntryWriteResult {entry, person_balance, previous_person_balance, transaction, account_balances}`. |
| `POST /personal-debts/people/:key/repayments` | Record a REPAYMENT: `{kind pay \| receive, amount, date?, account_id?, description?, note?, tag_ids?, mark_paid_ids?, person_name?}` → 201 `DebtRepaymentResult {transaction (full row), item (statement line), person_balance, account_balances}`. `account_id` optional (as on POST /transactions). `mark_paid_ids` labels debts of the same person paid (label only; 400 `ENTRY_NOT_FOUND` otherwise). |
| `GET /personal-debts/:id` | A debt in tx-detail debt mode: `{entry, person_balance, transaction (full row \| null)}`. |
| `PUT /personal-debts/:id` | Partial; `account_id: null` = ledger-only (tx deleted), a value creates / moves the tx; `key` moves a manual debt to another person (`previous_person_balance` set). |
| `DELETE /personal-debts/:id` | `{id, transaction_id, person_balance, account_balances}`. A `paid_by` debt → 409 `DEBT_MANAGED_BY_TX` (§1.5a). |
| `POST /personal-debts/split-requests/:nid/accept` | Mirror debt (`partner`) → `DebtEntryWriteResult`. |
| `POST /personal-debts/split-changes/:nid/apply` | `{result updated \| deleted, entry, person_balance}`. |

`GET /transactions?counterparty_key=<key>` lists a person's money: their debts' linked transactions AND their repayments. `Dashboard.debts` and `/me/counts.debts_summary` are `DebtTotals` (the same query as the people header). No notifications on pay / receive (`split_paid` retired).

## 4. Design decisions
- **Repayments are transactions (owner 2026-10-21).** Money paid back is real cash with a wallet, so it is a transaction; it belongs to the person (one balance per person), not to a single debt — no allocation of a payment across debts, no "settled amount".
- **The paid label is a label.** Users tick off debts they consider done; it never moves a number, so the balance stays honest.
- **Two rows for a linked-contact split.** Each user's book is independent (ledger, not sync); the partner gets `split_created` / `split_changed` prompts with one-tap actions.
- **Accounts stay cash; reports count my share.** `accounts.balance` is real cash; reports, budgets and list totals count `my_share` (`shared.ShareAmountExpr`: amount − the bill's split debts in its author's book − for an event bill the other members' board splits). Debt Paid / Debt Received rows are out of reports.

## 5. Data history
- **054 (0.3.1-10):** `owed_to_me` → paid, `i_owe` → received; `settled` → the paid label; each old repayment transaction became its own opposite-direction debt row (its wallet side); cancelled debts and splits at 0 deleted; `settled_amount` / `status` dropped.
- **070 (0.4.0-3):** `transactions.paid_by_amount` (CHECK: null, or > 0, ≤ amount, expense only), `personal_debts.paid_for_transaction_id` (unique, ON DELETE CASCADE), `source_kind` gains `paid_by`. No data converted.
- **069 (0.4.0-3):** `transactions.repay_contact_id` / `repay_person_name` + CHECK + indexes. Old repayment-like debt rows (from 054 or recorded before 0.4.0-3 as opposite-direction entries) are NOT converted: they can't be told apart from real debts; they keep counting as debts with the same sign, so balances don't change.

## 6. Status
- **Last updated** — 2026-10-21 (0.4.0-3: repayments as transactions; paid by someone else §1.5a; this file rewritten: the 1b-era settle / cancel / settled_amount sections are gone)
- **Migrations** — 24 (bidirectional table), 054 (person ledger), 069 (repayment transactions), 070 (paid_by)
