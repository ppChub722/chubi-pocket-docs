# App-2 inbox (0.4.1-1: recurring + shared pieces)

Owns: `features/recurring`, `core/data` (effects), `transaction_detail_page.dart`, `transaction_edit.dart`, `project_detail_page.dart` (settle).
Items: B1 (app), B2 (app), R6 (app), R10, R12 (app warning), E6 (app), E7, tx detail disconnect.

## Shared-file notices
- 2026-10-27: App-2 appends arb keys (app_th/en.arb) for R12 (fpRecurringAutoCreateZeroWarn) and the tx-detail disconnect (txLinkDisconnect*); runs gen-l10n after.
- 2026-10-27: App-2 edits `quick_create_sheet.dart` `_deleteEditTx` only (R10: no "skip occurrence?" ask, no `skipOccurrence`); `TransactionsRepository.delete` / `TransactionsCubit.remove` lose `skipOccurrence`.
- 2026-10-27 (E8 app, taken from App-1): App-2 now owns `event_bill_sheet.dart`; edits `quick_create_sheet.dart` อีเวนต์ tab save (`_paybackInEvent` / `_bookEventDebts` / `_repayNow` chain → ONE `bookEventBill` with `new_event`), `projects_repository.dart` / `project.dart` (E8 parts).

## 2026-10-27 — E7 + R6 (app) + R12 (app) + tx-detail disconnect
DONE · analyze clean (recurring / projects / transactions) · tests: event_pick, recurring, projects, save_bodies 43/43 pass; my new R12 test in recurring_writes_test can't load right now: App-1's in-flight `personal_debts_repository.dart` (DebtRepaymentResult) breaks the compile; re-run when it's in.
- **E7:** `project_detail_page.dart` settle uses `pairs` (same SettleLine shape, mine / recorded set by the same BE line()).
- **R6:** `recurring_detail_page.dart` no scope question; `RecurringRepository.update(id, write)` sends no `scope` / `also_update_link` / `also_update_tx` (BE-2 contract); `RecurringDetail.txUpdateFailed` and `RecurringDraft.txFieldsDiffer` removed.
- **R12:** `RecurringDraft.canAutoCreate` = wallet only; `autoCreateWarns` (on + no / 0 amount) → warning AppMessage under the toggle. There is no "varying amount" flag in the rule: no amount = varying.
- **Disconnect:** event card (view mode) has "ตัดการเชื่อม" → confirm → ONE call `PUT /projects/{id}/project-transactions/{bill_id}/my-books {unlink:[tx]}`, then refreshOne (the answer carries no tx; B2 effects will replace it). The edit-mode ✕ does the same now: `applyEventChange(billId:)` → my-books unlink instead of `removeBill` (removeBill only when the tx has no bill). Paid card: no disconnect (Lead).
- arb appended: fpRecurringAutoCreateNeedsWallet, fpRecurringAutoCreateZeroWarn, txLinkDisconnect / Title / Body / ed.
- Unused arb keys now (leave for a cleanup pass, arb is shared): fpRecurringTxScopeTitle / Future / All, fpRecurringTxUpdateFailed, fpRecurringAutoCreateNeeds.
- Open (rule f, not mine): switching the ผูกกับ tab away from อีเวนต์ (link_mode switch, BE link_mode.go) still removes my origin bill from the event; picking another event from my tx (applyEventChange A → B, move=true) moves the bill.

## 2026-10-27 — R10 (app, against BE-2's contract) + R12 test
DONE · analyze clean (my files + quick_create_sheet) · tests: recurring (incl. the R12 draft test), event_pick, transaction_wire, save_bodies, projects 49/49 pass
- **Tx delete asks nothing about links** (R2 + rule f): `transaction_detail_page` / `quick_create_sheet._deleteEditTx` = the plain delete confirm; `askDeleteRecurringTx` removed; `TransactionsRepository.delete` / `TransactionsCubit.remove` lose `skipOccurrence`. The event-origin "ลบรายการที่ผูกไว้ด้วยไหม" ask is gone too (Lead: nothing from my book changes the bill); `alsoDeleteLink` stays in the repo, unused by pages.
- **Save ask:** `linkedSaveAsks` = event bill only (R1: a recurring slot reads the tx). `Transaction.hasPromptedLink` (transaction.dart, App-1's file) is now unused.
- **Skipped slot (R4):** the occurrence sheet offers ยืนยัน / ผูกกับรายการที่มีอยู่ / จ่ายแล้ว on a skipped one (plus ยกเลิกการข้าม).
- **Filled slot skip:** a snack "ตัดการเชื่อมรายการก่อน" instead of the old keep / delete-tx prompt; `skipOccurrence` has no `delete_tx`.
- **จ่ายแล้ว amount (R5):** `markOccurrencePaid(amount:)`; the sheet sends its amount in mark-paid; the focus card's จ่ายแล้ว on a row with no amount opens the sheet; bulk จ่ายแล้วที่เลือก sends `items[].amount` and leaves out rows with none (like ยืนยัน).
- **pause_reason (R7):** `RecurringPauseReason` on Recurring and RecurringParent (BE-2 added `pause_reason` to RecurringRef on items at my ask); detail notice per reason (overdue_limit warning, goal_inactive); ต้องจัดการ rows get a "ค้าง 3 งวด" chip.
- arb appended: occurrenceSkipFilled, recurringPausedOverdue / Goal, recurringOverdueLimitChip. Newly unused: txDeleteRecurringTitle / Body / Only / Skip, occurrenceSkipLinkedTitle / KeepTx / DeleteTx, linkedDeleteTitle / ThisOnly / Both (check before removing).
- Not run against a live BE (the code is still landing).

## 2026-10-27 — B2 (app): effects
DONE · analyze clean (core, the 3 cubits) · tests: transactions_cubit_placement (2 new: effects table, WriteEffects.of) 5/5 pass
- `lib/core/data/write_effects.dart`: `WriteEffects` (the BE `Effects` as JSON, typed getters per key; a missing key = none), `WriteEffectsBus` (one handler; a failing cache is skipped) and the `ApplyWriteEffects` cubit mixin (ends with the cubit).
- `ApiClient._effectsReader`: next to `_syncVersionsReader`; every response body with `effects` is published. Pages need no extra call.
- Applied by: `TransactionsCubit.applyEffects` (removed drop, changed patch in place, new rows placed by the list's sort / filter; every live list takes them itself, so no cross-refresh; totals / unjudgeable filters still refresh), `AccountsCubit` (account_balances → patchBalances), `DebtDirectoryCubit` (person_balances → applyBalance; App-1's file, hook only).
- Not applied at cache level: `debts` / `removed_debt_ids` (person page state, App-1), `slots` (recurring pages already patch from ItemWriteResult), `bills` / `removed_bill_ids` (the event page patches from EventPatch). Pages can read them with `WriteEffects.of(res.data)`.
- Existing manual patches (patchRow, patchBalances from a result) stay: patching twice gives the same state.

## Known (owner 2026-10-27, via Lead)
- In 0.4.1-1 the ผูกกับ tab switch off อีเวนต์ (link_mode) and picking another event from my tx (A → B move) still change the bill; 0.4.1-2 replaces them with the bill form.
- E6 (app) dropped from App-2: BE-2's book-bill call sets the bill's linked_transaction_id.

## 2026-10-27 — B1 (app): untouched 0 saves (tx forms)
DONE · analyze clean · tests: new edit_problem_test 1/1; my whole set (recurring, projects, event_pick, transaction_wire, save_bodies, edit_problem, transactions_cubit_placement, core/data) 74/74 pass
- `transactionEditProblem(savedAmount:)`: a tx whose stored amount is 0 saves while the field is still 0 / empty; a typed amount stays > 0; a new tx still needs > 0. Wired in `transaction_detail_page` and the quick create edit (`quick_create_sheet`, one argument).
- The debt half of B1: done by App-1 (debt_entry_detail_page: a stored-0 entry saves untouched, the PUT omits amount; the quick-create debt form only creates, so it stays > 0).

## App-2 status
All items done: E7, R6, R12, tx-detail disconnect, R10, B2, B1 (tx forms). E6 dropped (Lead). Built against the specs; nothing run against a live BE yet.

## 2026-10-27 — E8 (app, finished from App-1's hand-off) + D9 (app)
DONE · analyze clean (touched files) · tests: personal_debts (incl. new debt_disconnect_test 3), notifications, event_book_body (new), save_bodies, projects, page_flows + api_spec ratchets 82/82; hub smoke 49/49
- **E8:** the event bill sheet already made ONE /event-bills call (App-1). Left part done: quick create's ผูกกับ อีเวนต์ tab now saves with ONE `bookEventBill` (`project_id` or `new_event`) built by the new `transactions/presentation/event_book_body.dart` (bill: payer, my share + everyone's share, `paid_back` on "คืนแล้ว"; my_books: on, tx, debt = "จดหนี้ด้วย", wallet only when I paid, category, personal tags). Removed from `quick_create_sheet.dart`: quickCreate / addBills + setTags + `_bookEventDebts` + `_paybackInEvent` (resolvePeople + payback rows + repayments). `_repayNow` stays for แบ่ง (not an event). page_flows: quick-create step "บันทึก (ผูกกับ อีเวนต์ tab)" → bookEventBill.
- Not done (optional per App-1): `_debtAlreadyBooked` still the sheet's first guess before the preview lands; the DebtResultBox wallet line still local (preview.wallets exists). `eventBillBody` in quick_create_bodies.dart is now only used by its test.
- **D9:** `PersonalDebtsRepository.disconnect(id)` (POST /personal-debts/{id}/disconnect); `DebtEntry.partnerLinked` / `disconnectedAt`; the debt detail page shows "เชื่อมกับสมุดของ {name}" + "ตัดการเชื่อม" (view mode only, outside `_edit`, confirm → ONE call → the page follows the answer). `NotificationType.debtDisconnected`: tile (link icon, "{who} ตัดการเชื่อมหนี้ {amount} แล้ว", info only; a tap opens the deep link = my entry), a mute row in notification settings (splits group), a hub example. page_flows: debt-detail "ตัดการเชื่อม" → disconnectDebtPartner (ratchet green again).
- Not built: hiding "อัปเดตตาม" on a disconnected copy's old split_changed notices (the BE stops sending them).
- arb appended: notifTypeDebtDisconnected, notifDebtDisconnected, debtDisconnectTitle / Body, debtPartnerLinked.

## 2026-10-27 — B2 (app) on recurring writes (BE-2 spec: effects.slots)
DONE · analyze clean (features/recurring) · tests: recurring 12/12 (new: effects.slots patch a page list)
- Transactions / wallets of recurring writes already ride the bus (TransactionsCubit / AccountsCubit). New: `ItemWriteResult.fromEffects` (effects.slots → a patch) and both recurring pages listen to `WriteEffectsBus`: the home page patches its month list + ต้องจัดการ (a slot that newly needs handling reloads ต้องจัดการ only), the detail page patches this rule's produced / upcoming lists. So a tx deleted / unlinked from another tab (effects.slots = the skipped slot) shows at once, no re-fetch.
- The pages' own write handlers (_onChanged / _applyItems) are unchanged; patching twice is the same state.

## 2026-10-27 — close-out: eventBillBody removed
DONE · analyze clean · tests: save_bodies + event_book_body 19/19
- `eventBillBody` removed from quick_create_bodies.dart; its half of save_bodies_test went with it (the test keeps the event sheet's `projectBillBody` part, renamed "quick create event sheet: its own bill"). The อีเวนต์ tab body is covered by event_book_body_test.dart. `_debtAlreadyBooked` / DebtResultBox left as they are.
