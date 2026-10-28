# 12 — Personal Debts (the person ledger)

> **0.4.1-2 (BE-1, shared bills — spec 10 §0):** a debt of a shared bill (a bill part, `bills[]`) or a "คืนแล้ว" repayment of one follows the bill: amount, date, direction, person, description, note are the bill form's (409 `SHARED_BILL_FIELD` on `PUT /personal-debts/{id}` while the event syncs); `paid`, `due_date`, `private_note` stay mine. The bill engine makes / re-amounts / removes these rows for every member (netted per person from the bill's real pairs). Disconnecting my copy turns them into plain debts (`unlinked_project_transaction_id` remembers the bill).

What the user and each other person owe each other: debts ("Lee paid for my food, I owe 60", "borrowed 500 from Lee") and repayments ("จ่ายคืนลี 400"). One balance per person.

Shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`, tag **Debts**. Global conventions in [`overview.md`](README.md). Owner decisions: `rules/decisions.md` "Debt model" (2026-10-21), "Wording" (2026-10-23).

## 0a. 0.4.1-1 "linked = synced" (migrations 081–084) — overrides §0 and everything below
- **One person book (D3, 081).** Every row of `personal_debts` is a person-book row: `kind` = `debt` | `repayment`. A repayment (จ่ายคืน = `paid`, net +; รับคืน = `received`, net −) is tied to the person, never to a debt, exactly like a debt row. Balance = Σ signed rows (paid +, received −), one ledger query (`shared.DebtLedgerSQL`); transactions never count. 069's repayment transactions (`transactions.repay_*`) are gone: each became a row (same id); a wallet-less one lost its transaction (owner answer 7), the rest are the row's transaction. An event payback's bill link sits on the row (`source_project_transaction_id`, source `event`).
- **The transaction is optional on every kind (D3 / D10).** None = ledger-only ("paid outside the app": the balance moves, no wallet does). New = `create_transaction` (or an `account_id`), wallet optional ("ไม่ระบุกระเป๋า"). Existing = `link_transaction_id` on create, or `POST /personal-debts/:id/link` later. Breaking: a repayment with no `account_id` and no `create_transaction` is now ledger-only (it used to make a wallet-less transaction).
- **Connected = synced (D1 / D2, 083).** A row and its transaction (`transactions.source_personal_debt_id`) share amount, date, description and note: editing either writes both. One link kind: 076's soft link folded in. `transactions.debt_connected` = an existing transaction connected later; it can be disconnected (`POST …/unlink`, back to its old category `debt_prev_category_id`); one made from the row can't (409 `TX_NOT_DISCONNECTABLE`). Connecting takes the transaction's amount and date and gives it the kind category. Deleting a row's transaction keeps the row, ledger-only (the balance doesn't move); deleting a row deletes a transaction made from it but only disconnects a connected one.
- **Kind = category (D5, 082).** System categories `LOAN_GIVEN` (a debt I paid: lend) / `LOAN_TAKEN` (a debt they paid: borrow) / `DEBT_PAID` (repayment I pay) / `DEBT_RECEIVED` (repayment I get), all out of reports; existing debt transactions moved to `LOAN_*`. System categories can't be renamed or have `include_in_report` changed (D6, 400 `SYSTEM_CATEGORY_IMMUTABLE`); the icon stays editable.
- **แบ่ง follows its bill (D8).** A bill's split debts take its date; an amount-only edit below their sum → 400 `SPLITS_EXCEED_AMOUNT`; deleting the bill deletes them (a linked partner gets `split_changed` removed).
- **Cross-user disconnect (D9, 084).** `POST /personal-debts/:id/disconnect`: either side of a linked pair (`entry.partner_linked`) breaks the link between the two books; both rows stay as plain debts (same amount), `counterpart_debt_id` cleared on both, `disconnected_at` set; no more `split_changed`; a partner mirror with my expense of it becomes my own `paid_by` debt. The other user gets `debt_disconnected`. My own tx ⇄ row link stays.
- **Amount 0 (B1, 084).** Only the system writes 0 (a sync from a linked side, a recurring auto-create); typed amounts stay > 0 in the API.
- **`effects` (B2).** Every person-book write and transaction write answers `effects` (openapi `Effects`).
- **Statement / lists.** Every statement line's `id` is the row id (repayments too) and opens `GET /personal-debts/:id`. `GET …/entries?kind=debt|repayment|all`. `POST …/repayments {mark_all_paid}` = "ปิดหนี้" (labels only).

## 0. Current (0.4.1-0) — overrides older text below
- **Wording.** A person with net > 0 is a **ลูกหนี้** (they owe me), net < 0 a **เจ้าหนี้** (I owe them), 0 = **เคลียร์แล้ว**. Never รอรับ / รอจ่าย / ติด for debts. The share texts say "<name> เป็นลูกหนี้ …" / "<name> เป็นเจ้าหนี้ …" (§2.4).
- **กำหนดจ่าย (071).** `due_date` on a debt entry only, never on a repayment. Optional; before the entry's `date` → 400 `VALIDATION_ERROR`. Create takes it; `PUT` `null` clears, absent leaves it. `DebtPerson.next_due_date` = the earliest `due_date` among the unpaid debts on the person's current side (net > 0 → paid entries, net < 0 → received); null at 0.
- **Event book unlink (073).** "ลงบัญชีของฉัน" off on a bill (`PUT /projects/:id/project-transactions/:pt_id/my-books`, spec 10): my `event` debt from that bill stays in my book as a manual debt (source cleared) and keeps the bill in `unlinked_project_transaction_id`; turned on again, a still-unlinked, still-manual debt gets its `event` source back.
- **บันทึกในรายการ (076).** A manual debt may point at one of my existing transactions: `personal_debts.linked_transaction_id`, `entry.linked_transaction` (+ the full row as `linked_transaction` on detail / write answers). Soft link: the transaction keeps its category, amount and wallet and still counts in reports / budgets; the amounts may differ; it is not a ledger line. `POST /personal-debts/:id/link {transaction_id}` / `POST /personal-debts/:id/unlink` (§3). Unlinking or deleting the debt keeps the transaction; deleting the transaction only clears the link (`ON DELETE SET NULL`).
- **รับแทน (0.4.1-0, migration 080).** `paid_by` also goes on an income: someone received part of my income for me. The paid-by debt is then `paid` ("they owe me"); on an expense it stays `received` (§1.5a).
- **`GET /transactions?counterparty_key`** lists the person's debts' own transactions, the bills split with them, the paid_by bills (incl. a partner mirror's expense), the transactions linked to their debts, and their repayments (§3).

## 1. Model (0.4.0-3, migration 069)

### 1.1 Debts and repayments
- A **DEBT** is a ledger record in `personal_debts`: `{person, direction paid | received, amount > 0, date, optional due_date, description, note, paid label, optional own transaction, optional linked transaction (§0), optional split source}`.
  - **paid** = I paid them / for them (they owe me, signed +amount); **received** = they paid me / for me (I owe them, signed −amount).
  - A debt MAY carry its **own transaction** (`transactions.source_personal_debt_id`, see §1.3), e.g. the 500 I borrowed landing in my wallet, OR be linked to one of my existing transactions (`linked_transaction_id`, §0; never both). Either moves the wallet but **never changes the person's balance**.
- A **REPAYMENT** is a **transaction** tied to the **person** (not to a debt): `transactions.repay_contact_id` + `repay_person_name` (§1.4).
  - **pay** = I pay them back: an expense in the system category Debt Paid, signed **+amount**.
  - **receive** = they pay me back: an income in Debt Received, signed **−amount**.
  - Both categories are out of reports (`include_in_report = false`); the wallet moves like any transaction.
- **Balance per person** (`net`) = Σ signed debts + Σ signed repayments. > 0 = they owe me (ลูกหนี้), < 0 = I owe them (เจ้าหนี้), 0 = cleared (เคลียร์แล้ว). It can flip sign freely.
  - Example (Lee): debts −60, −500 (with its own income tx), −70; repayment pay 400 (+400) → net −230. A final pay 230 → 0, cleared.
- **"จ่ายแล้ว"** (`personal_debts.paid`) is an optional manual label per debt: never set automatically, never changes a number. The balance alone decides when it's done.
- No cancel, no `settled_amount`, no `outstanding`, no `status`: stop counting = delete (hard). Repayments are deleted as transactions.

### 1.2 Person key
`c:<contact_id>` (one of my contacts) or `n:<name>` (a typed name, matched case-insensitively; the BE returns it lower-cased and trimmed). `shared.DebtKey` / `shared.DebtKeySQL` (debts) / `shared.RepayKeySQL` (repayments). A typed name and a contact are separate people (merge them by linking: §1.6). Writing to an `n:` key without `person_name` keeps the person's current spelling (the latest line's snapshot); `person_name` sets it.

### 1.3 A debt's own transaction (one record)
Not the soft `linked_transaction` of §0: linking one deletes the own transaction, and creating an own transaction (`PUT … account_id` / `create_transaction`) drops the link.
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
`source_kind`: `transaction` = a split on my bill (the bill owns amount / person / date); `partner` = another user's split on me (the mirror); `event` = the event resolve sheet's "as debt" (0.4.0-3 B3: `POST …/entries {bill_id}`, the entry keeps the bill (`source_project_transaction_id`) and its event; 400 `BILL_NOT_FOUND` unless I am an active member; its money STAYS editable, it is my own record; "ลงบัญชีของฉัน" off unlinks it, §0). On `transaction` / `partner` / `paid_by` only description / note / paid change (409 `ENTRY_MANAGED_BY_SOURCE`). Deleting a `transaction` split takes it off the bill (my_share grows; a linked partner gets `split_changed` "removed"). An expense split = a `paid` debt (they owe me); an income split = `received`. The mirror on a linked partner's side has the opposite direction; each user owns their own rows (ledger, not sync).

### 1.5a Paid by someone else (0.4.0-3, migration 070; income 0.4.1-0, migration 080)
Owner 2026-10-21 ("Paid by someone else", quick create tab จ่ายแทน). Someone paid (part of) MY expense: I record a real expense of the whole bill, and the same save makes the debt I owe.
- **รับแทน (income, 0.4.1-0).** Someone received (part of) MY income for me: the income counts its whole amount, the wallet moves `amount − paid_by_amount`, and the debt is a `paid` entry ("they owe me"). Everything else below applies the same way; a linked person's notice / mirror takes the opposite side (`recipient_direction: received`), and no partner expense is made for it.
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

### 2.4 Debt pages, page-ready (0.4.0-3, mocks "หนี้ · …" + "Quick create · หนี้: 2 chip + ลูกศรสลับทิศ")
- **People list** (`GET /people`). Each row adds:
  - `side` (receivable | payable | clear)
  - `first_activity_at` (the first line ever)
  - `last_activity {kind debt | repayment, id, title (its description), direction, amount, signed_amount, date}`: the row's second line ("ค่าตั๋ว | 1 ก.ย." / "คุณจ่ายคืน ฿400 | 10 ต.ค.")
  - `days_outstanding` (existing)
- **List totals** add `receivable_total`, `payable_total` and `counts {all, receivable, payable, overdue_30}` for the hero and the chips. `side=receivable | payable | overdue_30` filters the list (owed_to_me / i_owe still work).
- **Person page**:
  - Every statement item has `running_balance`: the balance right after it, in book order over all lines.
  - `days [{date, change, balance_after, count}]` groups the page's items by day for the day headers ("เพิ่ม ฿70" / "ลดลง ฿400").
  - The "ดูรอบก่อน" divider shows when `counts.earlier > 0`; its label comes from `cleared_at`; `?cycle=earlier` pages the earlier cycles.
- **Share sheet** (`summary_message`) has two variants:
  - `text` = "รอบนี้": "สรุปยอดกับ X (ตั้งแต่ d)", the cycle's lines, then "รวม X เป็นลูกหนี้ …" / "รวม X เป็นเจ้าหนี้ …" (0 = "ยอดตอนนี้เคลียร์กันหมดแล้ว").
  - `text_balance_only` = "ยอดคงเหลืออย่างเดียว": "ยอดกับ X ตอนนี้: X เป็นลูกหนี้ / เป็นเจ้าหนี้ …".
  - Both follow the wording rule (0.4.1-0): ลูกหนี้ / เจ้าหนี้, never "ติด". `since` = the cycle's first date.
- **Debt detail "มาจาก"**: every debt (entry views and statement debt items) carries `origin {kind split | paid_by | partner | event | cash, transaction_id, bill_id, event_id, title, amount, date, account}`:
  - split = my bill; paid_by = my expense someone paid part of, or my income someone received part of; partner = my expense of their split; event = the bill (no wallet); cash = a loan / borrow's own wallet transaction.
  - Null for a ledger-only debt. The debt itself has no wallet.
- **Quick create preview**: `POST …/entries?preview=true` (record, with or without a transaction) and `POST …/repayments?preview=true` (settle) run the write and roll it back. They answer `DebtPreview {preview, people: [PersonDelta {key, person, before, after, delta, side_before, side_after, flipped}], wallets: [WalletDelta]}`, the same shape as a transaction preview: the result box "ลี ตอนนี้ → หลังบันทึก" plus the wallet effect.
- **Overpaid settle** is allowed: the balance crosses 0. Every create (entries and repayments) returns `balance_change` (a PersonDelta); `flipped: true` when the side changed (Lee เจ้าหนี้ 230, pay 300 → ลูกหนี้ 70).

The pending `settle_debt` draft (target = a debt) submits as a **repayment transaction** to that debt's person in the opposite direction (a paid debt → receive; a received debt → pay), on the draft's wallet; the debt is not touched.

## 3. Endpoints
| Route | What |
|---|---|
| `GET /personal-debts/people?page&per_page&q&all&side&sort` | One row per person (`DebtPerson`) + `totals` (`DebtTotals`). |
| `GET /personal-debts/people/:key?cycle&page&per_page` | The person page in one call: `DebtPerson` + `counts` + the statement (`items`, §2.3) + `summary_message`. A contact key with no lines answers zeros; a typed key with none → 404. |
| `GET /personal-debts/people/:key/entries` | DEBTS only: `q`, `sort`, `direction`, `paid`, `cycle`, `money=true` (has a linked tx), `account_id`, `from` / `to`. Feeds the "mark paid" list (`paid=false`). |
| `POST /personal-debts/people/:key/entries` | Record a DEBT: `{direction, amount, date?, due_date?, account_id?, create_transaction?, description?, note?, tag_ids?, mark_paid_ids?, person_name?, bill_id?, event_id?}` → 201 `DebtEntryWriteResult {entry, person_balance, previous_person_balance, transaction, account_balances}`. |
| `POST /personal-debts/people/:key/repayments` | Record a REPAYMENT: `{kind pay \| receive, amount, date?, account_id?, description?, note?, tag_ids?, mark_paid_ids?, person_name?}` → 201 `DebtRepaymentResult {transaction (full row), item (statement line), person_balance, account_balances}`. `account_id` optional (as on POST /transactions). `mark_paid_ids` labels debts of the same person paid (label only; 400 `ENTRY_NOT_FOUND` otherwise). |
| `GET /personal-debts/:id` | A debt in tx-detail debt mode: `{entry, person_balance, transaction (full row \| null)}`. |
| `PUT /personal-debts/:id` | Partial; `account_id: null` = ledger-only (tx deleted), a value creates / moves the tx; `key` moves a manual debt to another person (`previous_person_balance` set); `due_date` (null clears). |
| `DELETE /personal-debts/:id` | `{id, transaction_id, person_balance, account_balances}`. A `paid_by` debt → 409 `DEBT_MANAGED_BY_TX` (§1.5a). A linked transaction (§0) stays. |
| `POST /personal-debts/:id/link` | `{transaction_id}` → `DebtEntryWriteResult`. Manual debts only (409 `ENTRY_MANAGED_BY_SOURCE`); one of my plain transactions of the debt's direction (paid = expense, received = income; not a debt / repayment / event / paid_by / system row: 400 `TX_NOT_LINKABLE`); one transaction per debt (409 `DEBT_TX_ALREADY_LINKED`); 404 `TRANSACTION_NOT_FOUND`. The debt's own transaction is deleted; linking again replaces the link. |
| `POST /personal-debts/:id/unlink` | Clears the link; the transaction is not touched → `DebtEntryWriteResult`. |
| `POST /personal-debts/split-requests/:nid/accept` | Mirror debt (`partner`) → `DebtEntryWriteResult`. |
| `POST /personal-debts/split-changes/:nid/apply` | `{result updated \| deleted, entry, person_balance}`. |

`GET /transactions?counterparty_key=<key>` lists a person's money: their debts' own transactions, the bills split with them, the paid_by bills (incl. a partner mirror's expense), the transactions linked to their debts (§0), AND their repayments. `Dashboard.debts` and `/me/counts.debts_summary` are `DebtTotals` (the same query as the people header). No notifications on pay / receive (`split_paid` retired).

## 4. Design decisions
- **Repayments are transactions (owner 2026-10-21).** Money paid back is real cash with a wallet, so it is a transaction; it belongs to the person (one balance per person), not to a single debt — no allocation of a payment across debts, no "settled amount".
- **The paid label is a label.** Users tick off debts they consider done; it never moves a number, so the balance stays honest.
- **Two rows for a linked-contact split.** Each user's book is independent (ledger, not sync); the partner gets `split_created` / `split_changed` prompts with one-tap actions.
- **Accounts stay cash; reports count my share.** `accounts.balance` is real cash; reports, budgets and list totals count `my_share` (`shared.ShareAmountExpr`: amount − the bill's split debts in its author's book − for an event bill the other members' board splits). Debt Paid / Debt Received rows are out of reports.

## 5. Data history
- **054 (0.3.1-10):** `owed_to_me` → paid, `i_owe` → received; `settled` → the paid label; each old repayment transaction became its own opposite-direction debt row (its wallet side); cancelled debts and splits at 0 deleted; `settled_amount` / `status` dropped.
- **070 (0.4.0-3):** `transactions.paid_by_amount` (CHECK: null, or > 0, ≤ amount, expense only), `personal_debts.paid_for_transaction_id` (unique, ON DELETE CASCADE), `source_kind` gains `paid_by`. No data converted.
- **069 (0.4.0-3):** `transactions.repay_contact_id` / `repay_person_name` + CHECK + indexes. Old repayment-like debt rows (from 054 or recorded before 0.4.0-3 as opposite-direction entries) are NOT converted: they can't be told apart from real debts; they keep counting as debts with the same sign, so balances don't change.
- **071 (0.4.0-3):** `personal_debts.due_date` (DATE, nullable).
- **073 (0.4.0-3):** `unlinked_project_transaction_id` on `personal_debts` and `transactions`, `project_transactions.unlinked_transaction_id` (all `ON DELETE SET NULL`).
- **076 (0.4.0-4):** `personal_debts.linked_transaction_id` (unique, `ON DELETE SET NULL`).
- **080 (0.4.1-0):** the `paid_by_amount` CHECK allows `type IN ('expense', 'income')`. No data converted.

## 6. Status
- **Last updated** — 2026-10-26 (0.4.1-0: §0 — due_date, event-book unlink, linked transaction, paid_by on income, ลูกหนี้ / เจ้าหนี้ wording, counterparty_key). 2026-10-21 (0.4.0-3: repayments as transactions; paid by someone else §1.5a; this file rewritten: the 1b-era settle / cancel / settled_amount sections are gone)
- **Migrations** — 24 (bidirectional table), 054 (person ledger), 069 (repayment transactions), 070 (paid_by), 071 (due_date), 073 (event-book unlink), 076 (linked transaction), 080 (paid_by on income)

- 0.4.1-2 (BE-3): the person page also answers `auto_sync_debts` (the debts switch, spec 13) and `recurring` (the person's "หนี้" recurring settings, spec 11 K13). Deleting an entry that fills a "หนี้" occurrence skips that occurrence with its amount (trigger, migration 112). Contact delete / absorb carry "หนี้" settings along (K7).
