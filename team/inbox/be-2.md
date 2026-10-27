# BE-2 inbox (0.4.1-1: recurring + events BE)

Owns: `recurring`, `projects`, the recurring hooks in `transactions` / `saving_goals`, migrations 090–099.
Items: R1–R9, R11, R12 (BE), B4, E6 (BE), E8 (BE "book bill" call).

## Shared-file notices
- 2026-10-27 — editing `internal/apidoc/openapi.yaml`: E8 book-bill endpoint + R5 paid-without-tx amount (recurring + projects sections only).
- 2026-10-27 — will edit `transactions/service.go` (R1: drop `also_update_link` for recurring; R2: drop `skip_occurrence`) and `transactions/debt_link.go` (R3: recurring skip hook in `DeleteDebtTxInTx`, the delete paths only). BE-1: ping me before reshaping those delete functions.
- 2026-10-27 — edited `cmd/api/main.go`: routes POST /event-bills + PUT /event-bills/:pt_id, `projectsService.WithDebts(personalDebtsService)` (E8).
- 2026-10-27 — edited `transactions/service.go` (recurring hook in deleteSingleInTx / deleteTransferInTx, TxEditedTx call gone, AllowZero check), `transactions/model.go` (CreateRequest.AllowZero), `transactions/recurring_link.go`, `shared/debts.go` (RecurringRef.PauseReason).

## 2026-10-27 — CONTRACT (spec only, code follows): E8 book-bill + recurring R1–R12
Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml` (+ `ref/api-document.md` §10 / §11 "Recent additions 2026-10-27"). Agreed with BE-1: `Effects` (BE-1's schema) on every answer below that writes a linked side; my debts / repayments go through BE-1's `personal_debts.CreateEntryTx` (D3 rows).

**App-1 (bill sheet + quick create อีเวนต์ tab) — E8:**
- `POST /event-bills` `{project_id | new_event {name, icon_code}, bill: EventBillInput, my_books: EventBillBooks}` → 201 `EventBillBookResult` (EventPatch + `my_books` + `paybacks` + `transaction_id` + `effects`).
- `PUT /event-bills/{pt_id}` `{bill?, my_books, apply_to_my_tx?}` → 200 same. `bill` absent = the "ลงบัญชี" books-only mode.
- `bill`: `kind` expense | income | payback, `amount`, `date`, `description`, `note`, `tag_ids` (event tags), `payer` (BillPerson, default me), `members` [BillMember + `paid_back`], `from` / `to` (payback).
- `my_books`: `on`, `tx`, `debt` (null on a payback = the server decides, E5), `account_id`, `category_id`, `tag_ids` (personal).
- `?preview=true` → `EventBillBookPreview {preview, people [PersonDelta], wallets [WalletDelta], debt_default}`: the sheet's before → after lines; drop the app-side `_netWith` / `_debtAlreadyBooked` math.
- E2–E5 handled by the server (see the operation description), so the app sends the ticks and the "คืนแล้ว" flags only.

**App-2 (recurring):**
- R2: `DELETE /transactions/{id}` always skips the slot (no question, no `skip_occurrence`).
- R1 / R6: no `also_update_link` on occurrence / item edits; no `also_update_tx` / `scope` / `tx_update` on the setting edit. A filled occurrence → 409 ALREADY_RECORDED on edit / skip (unlink first).
- R4: confirm / link / mark-paid on a skipped occurrence.
- R5: `POST …/occurrences/{slot}/mark-paid {amount?}` (400 AMOUNT_REQUIRED); bulk `mark_paid` with `items[].amount` (left_out needs_amount); mark-paid-ready leaves out needs_amount.
- R7: `Recurring.pause_reason` manual | overdue_limit | goal_inactive | null. ต้องจัดการ shows "ค้าง 3 งวด" for overdue_limit; the 3 due slots stay listed while it is paused.
- R8 / R9: resume = the current period's occurrence next, nothing for the gap.
- R12: auto-create takes any amount / wallet; the AUTO_CREATE_NEEDS_* errors are gone (the form shows the warning instead).

## 2026-10-27 — R1–R9, R11, R12 (BE), B4, E6 (BE), E8 (BE)
DONE · no commit · migration **090** (`recurring_rules.pause_reason` + `gaps`; clears `recurring_due_checks`) · test DB `chubi_test_be2` (at 090, incl. BE-1's 081–084)
**Tests (0 SKIP):** `go build ./...` ok, `go vet` clean on my packages; recurring, projects, saving_goals, shared/recurrence, apidoc all ok.

**Recurring (`recurring/*`, new `overdue.go`):**
- R1: `viewOccs` reads a filled slot from its tx / saving entry (`filledValues`). `TxEditedTx` and `syncLinkTx` are gone. Editing / skipping a filled slot → 409 ALREADY_RECORDED.
- R2: `TxDeletingTx(ctx, tx, txID)` always skips the slot, keeping the tx's last values + date (`keepTxValuesTx`).
- R3: the hook runs in `transactions.deleteSingleInTx` / `deleteTransferInTx`, so every delete path hits it. Saving entries: SQL in `saving_goals.deleteEntryTx`. Recurring's own `unlinkTx` lets go first.
- R4: confirm / link / mark-paid take skipped (and paid) slots.
- R5: mark-paid keeps an amount (`MarkPaidRequest`, bulk `items[].amount`, needs_amount).
- R6: `pushToRecorded`, `also_update_tx`, `scope` and `tx_update` are gone.
- R7: `overdueLimit` in DueCheck; any pause stores its due slots (`pauseTx`); paused settings list their stored due rows (`listable`, `activeOnly`); `pause_reason` on Recurring + RecurringRef; goal close sets `goal_inactive`.
- R8 / R9: `resumeGap` → `Spec.Gaps` (shared/recurrence filters `Occurrences` / `Between`; `MaxEnd` adds the gap time). A count end shifts, a date end keeps its date.
- R12: `autoDraftTx` drops a gone / archived wallet, category or tag; amount 0 via `transactions.CreateRequest.AllowZero` (BE-1's 084 relaxed the DB check). The archived-wallet auto-pause and `AUTO_CREATE_NEEDS_*` are gone.
- R11: recurring_test.go updated; new overdue_test.go (overdue limit, resume gap / installment shift, delete from any path).

**Events (`projects/`):**
- B4: `replaceSplitChildrenTx` updates split rows in place. A member who left the bill: their copy is unlinked (remembered on the bill) before the row goes.
- E8: new `book_bill.go` + `book_bill_handler.go`, routes `POST /event-bills` and `PUT /event-bills/:pt_id`, `?preview=true`. Debts / repayments go through `personal_debts.CreateEntryTx` (BE-1).
- E2–E5: handled inside E8.
- E6: a payer booking later becomes the bill's origin (`asOrigin`).
- Tests: book_bill_test.go (I paid + คืนแล้ว, someone else paid, me paid back, payback default + preview, books-only E6, B4 copy kept).

**Docs:** openapi (recurring + E8; RecurringRef.pause_reason for App-2), api-document §10 / §11, schema.md (`recurring_rules` 090 rows + auto_create; Lead bumps the version line), spec 10 §0 and spec 11 §0.

**FE contract delta:** as in the CONTRACT entry above, plus: `POST /event-bills` answers 201, or 200 with preview. `RecurringRef.pause_reason`. Mark-paid on a slot with no amount → 400 AMOUNT_REQUIRED.

**Open / not done:**
- (a) Recurring write answers don't carry `effects` yet (spec unchanged there), and the tx delete's `effects.slots` needs a recurring view hook for BE-1's DeleteResult. Say if you want it in this round.
- (b) E8 edit: un-ticking "คืนแล้ว" doesn't remove a payback row made earlier (delete it on the board). My debts don't follow a bill edit (0.4.1-2 auto sync).
- (c) `transactions.DeleteWrite` keeps its 5th (ignored) flag so BE-1's tests needn't change; drop it at close.
- (d) Old `/projects/:id/bills` / `my-books` / `copy` stay for the old app until App-1 moves to `/event-bills`.
- (e) My test DB is at 090: a new 085–089 from BE-1 needs it recreated (drop + migrate up).

## 2026-10-27 — B2 effects on recurring writes (Lead: this round)
DONE · no migration · tests: recurring, projects, saving_goals, apidoc ok (0 SKIP), `go vet` clean.
- Spec first: `effects` (required) on RecurringItemWriteResult / ItemsWriteResult / BulkResult / OccurrenceBulkResult / LinkResult / UnlinkResult / ItemDeleteResult / DeleteResult.
- Code: new `recurring/effects.go` (`effectsOf`, `SlotView`), filled in every write answer.
- Contents: slots = the occurrences changed; transactions = the ones they hold, or the one an unlink let go; removed_transaction_ids = the ones deleted; account_balances.
- `DELETE /transactions/:id` lists the skipped occurrence in `effects.slots` (`RecurringLinks.SlotView`; two lines in BE-1's DeleteWrite).
- Open item (a) of the entry above is closed. Kept as App-2 asked: `/projects/quick`, `/projects/{id}/bills`, `…/my-books` (nothing was removed).

## 2026-10-27 — close-out: un-tick "คืนแล้ว" (open b) + DeleteWrite flag (open c)
DONE · migration **091** (`project_transactions.paid_back_for_id` + partial index) · tests (`chubi_test_be2` at 091, 0 SKIP): projects, recurring, personal_debts, transactions, apidoc ok; `go vet` clean.

**(b) Un-tick "คืนแล้ว":**
- A payback row made for a ticked member remembers its bill. My E2 repayment now hangs on that payback row, not on the bill.
- On `PUT /event-bills/:pt_id` with `bill`, the members' `paid_back` ticks are the wanted state:
  - newly ticked → a row (+ my repayment when I paid and record the debts);
  - un-ticked or gone → `removePayback`: my repayment rows of it and their wallet txs, then the row (`deleteBoardRowTx`), all in the same DB tx;
  - share changed → remade.
- Effects: `removed_bill_ids` / `removed_debt_ids` / `removed_transaction_ids`. A second save no longer duplicates the row.
- `BoardSplit.paid_back` (spec + views; read in the existing board query, so the event detail stays at 9 queries).
- Test: `TestRebookBillUntickPaidBack` (un-tick removes row + repayment + its wallet tx; re-tick once; share change remakes at 120).
- Known: my bill DEBT for that person doesn't follow a share change (0.4.1-2 auto sync), so after a share change the person shows the difference.

**(c):** `transactions.DeleteWrite(ctx, userID, id, alsoDeleteLink)`, 4 args. Updated the handler and the callers in personal_debts tests (handler_test, paid_by_test, repayment_test, split_follow_test) and projects/touch_test.

**Docs:** openapi (BoardSplit.paid_back, rebookEventBill), api-document §10, schema.md (`paid_back_for_id`), spec 10 §0.
**For App-2 (E8 app):** send each member's `paid_back` on PUT as the tick should be now (prefill it from `BoardSplit.paid_back`). Sending false removes the payback row made earlier.
