# App-1 inbox (0.4.1-1: debts + quick create + bill sheet)

Owns: `features/personal_debts`, the debt mode of quick create (`debt_entry_form.dart`, `quick_create_bodies.dart`), `event_bill_sheet.dart`, `features/categories`.

## Shared-file notices
- 2026-10-27: App-1 appends arb keys (app_th/en.arb) for D5 / D6 / D7 / D11 (categorySystemLoan*, categorySystemLocked*) and may change the en values of categorySystemDebtPaid / DebtReceived to the concept names ("Debt repayment" / "Debt collected"); runs gen-l10n after.

## 2026-10-27 — D7, D11, D6 (app), D5 (app labels)
DONE · files: `categories/presentation/category_label.dart`, `categories/presentation/pages/category_detail_page.dart`, `transactions/domain/refs.dart`, `personal_debts/presentation/debt_wiring.dart`, `transactions/presentation/widgets/transaction_tile.dart`, `transactions/presentation/pages/debt_entry_detail_page.dart`, `transactions/presentation/widgets/debt_entry_form.dart`, arb (3 keys + 2 en values), `test/features/transactions/save_bodies_test.dart`, new `test/features/categories/category_label_test.dart` · analyze (touched files): clean · tests: save_bodies + debt_ledger_cubits 30/30, category_label 2/2
- **D5 app:** `LOAN_GIVEN` → ให้กู้ยืม / Loan given, `LOAN_TAKEN` → กู้ยืม / Loan taken in `categoryDisplayName`. en values of `DEBT_PAID` / `DEBT_RECEIVED` now "Debt repayment" / "Debt collected" (concept table). `EmbeddedCategory.isDebtKind` (all four) added; `EmbeddedCategory.toCategory()` now carries `systemKind`.
- **D6 app:** a system category's detail page: name read-only in edit mode, the parent row not tappable, "นับในรายงาน" shown disabled with the caption "หมวดระบบ: เปลี่ยนชื่อและการนับในรายงานไม่ได้"; icon / description / note still edit. The title uses the l10n name.
- **D7:** no generated debt description anywhere. `debtAutoTitle` → `debtKindName(out, repayment)` (the kind's category name). Quick create debt form: description typed on every kind (repay included), hint = the kind's category name; `describeOrigin` / `originText` / `refreshOrigin` removed. Debt detail: description editable on repayments too; placeholder = kind name. Tx tile: no description → category name (a debt tx with no category → kind name).
- **D11:** every "edit" on a debt page whose origin is my tx (`split` / `paid_by`) calls `editTransaction(context, txId)`: a plain tx opens the quick create sheet (the debt reloads after a save); a split tx opens its detail page **in view mode** (TransactionDetailPage has no `startEditing`; that file is App-2's). Event / partner debts keep this page's edit mode.

deviations/notes:
- arb keys now unused (left in place, append-only rule): `debtOriginFieldLabel`, `debtOriginPickFirst`, `debtOriginLend`, `debtOriginBorrow`, `debtRepayDescPay`, `debtRepayDescReceive`. Lead may drop them at the close.
- BE-1 (D6 BE): the app's category PUT still sends the unchanged `name` / `include_in_report` of a system category; the lock must reject only a *change*, not the same value.
- D5: no legacy reserved-icon fallback for the two loan categories (BE-1 picks their icons).
- 2026-10-27: App-1 takes the D3 / D2 model migration in the app: `personal_debts/domain/*`, `personal_debts/data/personal_debts_repository.dart`, and in the shared `transactions/domain/transaction.dart` the `counterparty` (DebtLink: `kind`, `connected`, `entry_id`) + `repayment_person` removal. `Transaction.repaymentPerson` stays as a getter derived from `counterparty` (kind repayment), so readers keep compiling. App-1 does NOT parse / apply `effects` (B2 app = App-2); write results just keep the raw map if needed.
- 2026-10-27: App-1 edits `quick_create_sheet.dart` (the debt save + the repay chains at ~1380-1470 / ~1880-2010: DebtRepaymentResult → DebtEntryWriteResult; then D10 one-form debt mode) and `event_bill_sheet.dart` (E8).
- 2026-10-27: App-1 adds (additive) `bookEventBill` / `rebookEventBill` to `projects/data/projects_repository.dart` and `EventBillBookResult` / `EventBillBookPreview` to `projects/domain/project.dart` (E8); reads `effects.account_balances` / `effects.person_balances` of that answer only (no generic effects handling).
- 2026-10-27: App-1 edits `lib/hub/api/page_flows.dart` (event-detail: bookEventBill / rebookEventBill steps).

## 2026-10-27 — D3 / D2 app model, D10, D4, B1 (debt half); E8 app handed to App-2
DONE · analyze lib + test: no issues (at the time of the run) · tests: personal_debts + save_bodies + categories + projects + ui ratchets 145 pass; 2 red, both others' in-flight work (see notes)
- **Model (D3 / D2, BE-1's contract):** `DebtLink` gains `repayment` (kind) + `connected`; `Transaction.debtLink` = the raw `counterparty` (debt OR repayment), `counterparty` / `repaymentPerson` / `isDebtEntry` / `isRepayment` now derived getters (`repayment_person` gone; readers unchanged). `DebtEntryTransaction.connected`; `DebtEntryDetail` / `DebtEntryWriteResult` lose `linkedTransaction`; `DebtEntryWriteResult.item` (create); `DebtRepaymentResult` removed (POST …/repayments → `DebtEntryWriteResult`). Repository: `createEntry(amount?, linkTransactionId)`, `createRepayment(amount?, createTransaction, linkTransactionId, markAllPaid)`.
- **D10 (quick create, one form):** "บันทึกในรายการ" switch on every kind (repay included; off = ledger-only, the BREAKING default of D3); when on: the wallet card as before + a "ผูกกับรายการที่มีอยู่" row (TransactionPicker; the picked tx shows as its list row, ✕ = back to a new tx; amount + date follow it, the amount note says so; body sends `link_transaction_id`, no amount / wallet / tags); "ปิดหนี้" is now a switch on the repay side → `mark_all_paid` (the old per-debt "เลือกหนี้" chip is gone); กำหนดจ่าย stays record-only. Bodies: `quick_create_bodies.dart` (record / repay / preview).
- **Debt detail (D2):** a connected tx = `transaction` with `connected: true`: wallet card read-only, tags read-only, no direction swap, the link row shows it with ✕ = `/unlink`; delete names only the entry. The link row shows for debts AND repayments with no tx. A repayment hides the "จ่ายแล้ว" box.
- **D4:** every person-page statement line opens `/personal-debts/entries/{id}` (repayments too).
- **B1 debt half:** the detail page saves a stored-0 entry while its amount is untouched (the PUT then omits amount). The quick-create form only creates: a typed amount stays > 0.
- **E8 (before the rebalance; App-2 owns it now):** one-call save via POST / PUT `/event-bills`, preview wiring, `EventBillBookResult` / `EventBillBookPreview`, page_flows steps, `test/features/projects/event_bill_book_test.dart`. Details in my message to App-2.
- Quick create "คืนแล้ว" chains (`_repayNow`, `_paybackInEvent`) pass `createTransaction: true` to keep today's behaviour under D3 (App-2 is replacing them with the event-bill call).

deviations/notes:
- **Owner check:** "ปิดหนี้" changed from picking specific debts to one switch "label every open debt with this person paid" (BE-1's `mark_all_paid`, D10). Say if the per-debt picker should come back.
- Red at the time of my run, not mine: `hub_pages_smoke` / `api_spec_ratchet` compile error `eventBookBodies` (App-2's in-flight quick_create_sheet edit) and `POST /personal-debts/{id}/disconnect` missing from page_flows (D9, now App-2's).
- Not run against the real BE (BE-1 / BE-2 code still landing).
- `app_router.dart` comment at the `/personal-debts/entries/:id` route still says "a repayment line opens /transactions/{id}" — stale, shared file, left for Lead.
- arb keys added: `debtLinkExistingLabel`, `debtLinkedAmountNote`, `debtCloseAllHint` (+ the earlier three). Unused now: `debtClosePick`, `debtCloseChosen`, `debtQuickCreateTxLabel` (+ the six listed earlier).
