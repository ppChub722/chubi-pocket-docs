# BE-1 inbox (0.4.1-1: base + person book BE)

Owns: `personal_debts`, `categories`, `notifications`, `shared`, the debt side of `transactions` (`debt_link.go`, `link_mode.go`), migrations 081–089.
Items: B1 (BE), B2 (BE `shared.Effects`), B3, D1, D2, D3, D5, D6 (BE), D8, D9 (BE), D10 (BE).

## Shared-file notices
- 2026-10-27 — editing `internal/apidoc/openapi.yaml`: D3 (repayment rows) + D2 / D10 (one link kind, link on create) + B2 (`Effects` schema, `effects` on debt / transaction write answers). Debts section, Transaction / TransactionWriteResult / DeleteTransactionResult / CategoryRef schemas, new `Effects` schema. BE-2: `Effects.slots` / `Effects.bills` shapes are yours to fill; tell me if you need fields changed.
- 2026-10-27 — will edit `transactions/debt_link.go` (D1 / D2 / D3: debt tx create / sync / delete keep the entry; repayment tx goes through `source_personal_debt_id`), `transactions/store.go` (drop `repay_*` reads, counterparty filter) and `transactions/service.go` (D8 split date / amount / delete; tx delete answers `effects`). BE-2: I will NOT reshape the signatures of `DeleteInTx` / `DeleteDebtTxInTx`; I change what `DeleteDebtTxInTx` does to the entry (keeps it, ledger-only). Ping me before you change those two.

## 2026-10-27 — contract: D3 + D2 / D10 + B2 + D5 kinds (openapi only, code follows)
DONE (spec) · files: be `internal/apidoc/openapi.yaml`, docs `ref/api-document.md` (04 recent additions) · `go test ./internal/apidoc/` ok
FE contract delta (App-1 / App-2 build on this):
- `Effects` (new schema, B2): `{transactions[Transaction], removed_transaction_ids, debts[DebtEntry], removed_debt_ids, slots[RecurringItem], bills[BoardRow], removed_bill_ids, person_balances[DebtPerson], account_balances[WalletBalance]}`; every key present, the answer's own record included. On: TransactionWriteResult, DeleteTransactionResult, DebtEntryWriteResult, DebtEntryDeleteResult, DebtSplitChangeResult (+ BE-2's recurring / event writes).
- `DebtEntry.kind` debt | repayment (required). Repayment: paid false, due_date null, origin null, source null | {kind event}.
- `DebtEntry.linked_transaction`, `DebtEntryDetail.linked_transaction`, `DebtEntryWriteResult.linked_transaction` REMOVED. `DebtEntryTx.connected` (true = existing tx connected later, can disconnect).
- `DebtEntryWriteResult` gains `item` (DebtStatementItem, create only) + `effects`.
- `POST …/repayments` → 201 DebtEntryWriteResult (DebtRepaymentResult + RepaymentPerson REMOVED). Body: `kind` required, `amount` required unless `link_transaction_id`; new `create_transaction`, `link_transaction_id`, `mark_all_paid`. No account_id + no create_transaction = ledger-only (BREAKING: was a wallet-less tx).
- `POST …/entries`: `amount` optional with `link_transaction_id`; new tx category LOAN_GIVEN / LOAN_TAKEN.
- `DebtStatementItem.id` / `last_activity.id` = the ENTRY id for repayments too → every statement line opens GET /personal-debts/{id} (D4).
- `GET …/entries?kind=debt|repayment|all` (default debt).
- `PUT /personal-debts/{id}` works on repayments (paid / due_date → 400); with a connected tx: account_id / create_transaction / tag_ids / direction → 400.
- `POST /personal-debts/{id}/link`: connect + sync (entry takes tx amount + date; tx takes the kind category, old kept); entry with a tx → 409 ENTRY_HAS_TRANSACTION. `…/unlink`: connected tx only, restores category; else 409 TX_NOT_DISCONNECTABLE.
- `Transaction.repayment_person` REMOVED; `DebtLink` gains `kind`, `connected`. DELETE /transactions/{id} of an entry's tx keeps the entry (ledger-only); `debt_entry_id` = that entry.
- `CategoryRef.system_kind` + LOAN_GIVEN / LOAN_TAKEN.
Not in this step: D6 (category lock errors), D9 (partner disconnect endpoint), B3 notification type — spec'd when I reach them.
- 2026-10-27 — edited `cmd/api/main.go`: one route line, POST /personal-debts/:id/disconnect (D9).

## 2026-10-27 — BE-1 0.4.1-1: B1 (BE), B2 (BE), B3, D1, D2, D3, D5, D6 (BE), D8, D9 (BE), D10 (BE)
DONE · migrations 081–084 · `go vet ./...` clean · tests on throwaway `chubi_test_be1` (migrated 001→084; 081–083 also down→up with seeded repayment / soft-link rows): personal_debts, transactions, pending, notifications, categories, contacts, me, dashboard, shared/... ok, 0 SKIP; projects TestSetMyBooks ok (the rest of projects + recurring / sync / apidoc are BE-2's moving parts).

**Migrations (BE-1 block):**
- 081 `personal_debts.kind` (debt | repayment). Every 069 repayment tx → a row (same id); wallet-less ones lose their tx (owner answer 7); the rest become the row's tx (`source_personal_debt_id`); an event payback's bill link moves onto the row. `transactions.repay_*` + check + indexes dropped.
- 082 system categories LOAN_GIVEN / LOAN_TAKEN for every user (seed.go too); existing debt txs move to them (repayment txs stay DEBT_*).
- 083 one link kind: `transactions.debt_connected` + `debt_prev_category_id`; 076 soft links folded in (tx takes the kind category, old kept; row takes tx amount + date); `personal_debts.linked_transaction_id` dropped.
- 084 `transactions.amount >= 0`, `personal_debts.amount >= 0` (B1, system-written 0; typed input stays > 0 in the API; BE-2 adds `CreateRequest.AllowZero`), `personal_debts.disconnected_at`, notification type `debt_disconnected`.
- Breaking for the current app build: yes (the contract below). Data: nothing wiped.

**Code:**
- shared: one-table `DebtLedgerSQL`; `DebtLink.kind/connected`; NEW `effects.go` (`Effects`, `NewEffects`, `Merge`).
- personal_debts: NEW `book.go` (`EntryInput` + `CreateEntryTx` for BE-2's E8, connect checks, effects builder, `DebtEffects`, ปิดหนี้), NEW `disconnect.go` (D9), NEW `split_follow.go` (D8); service/store/model/ledger/handler for repayment rows, connect / disconnect, effects on every write; `TxDeletedTx` keeps the row (D1).
- transactions: `ConnectDebtTxInTx` / `DisconnectDebtTxInTx`, kind-aware debt category, repayment-tx code removed, `effects` on create / update / delete answers (`effects.go`), D8 hooks in `updateSingleInTx` / `deleteSingleInTx`.
- categories: D6 lock (rename / include_in_report → 400 SYSTEM_CATEGORY_IMMUTABLE; same value OK; icon editable).
- notifications: `debt_disconnected` type + payload + dispatcher (supersedes pending split notices of the pair).
- projects (with BE-2's OK): my_books.go / views.go repay readers → repayment rows; contacts/store.go, sync/fingerprint.go repay readers dropped.

**FE contract delta (openapi):** as in the "contract" entry above, plus:
- D9: `POST /personal-debts/{id}/disconnect` → DebtEntryWriteResult; 409 DEBT_NOT_LINKED. `DebtEntry.partner_linked`, `DebtEntry.disconnected_at`. Notification `debt_disconnected` payload {debt_id, key, person_name, amount, direction, description}, info only.
- D6: PUT /categories/{id} on a system category: a different name / include_in_report → 400 SYSTEM_CATEGORY_IMMUTABLE.
- D8: PUT /transactions/{id} amount-only below the split sum → 400 SPLITS_EXCEED_AMOUNT; split debts follow the bill date; deleting a bill deletes its splits.

**Tests added / changed:** link_tx_test (connect + sync + disconnect, create with link), disconnect_test (D9), split_follow_test (the three D8 bugs), system_lock_test (D5 seed + D6), repayment_test (rows, ledger-only repayment, tx delete keeps row, effects), handler_test (LOAN_* category, tx delete keeps entry, counterparty filter via link), pending settle_test, projects my_books_test.

**Notes / not done:**
- `Effects.slots` / `bills` are filled by BE-2's hooks; my tx-delete effects list the removed tx, the kept entry, the person and the wallet. Split debts removed with a bill (D8) are not listed in `removed_debt_ids` yet (their people are in `person_balances`).
- Debt description generation (D7) is app-side; the BE stores what it gets.
- `ref/schema.md` 0.17 line, spec 12 §0a, api-document §04 + §12 updated.

---
# 0.4.1-2 — BE-1 (shared bills): S1–S3, S5–S17, X4, X8, 092

## Shared-file notices (0.4.1-2)
- 2026-10-27 — `internal/apidoc/openapi.yaml`: /event-bills (POST desc, GET / PUT / DELETE /{pt_id}, POST /{pt_id}/apply, /{pt_id}/disconnect), apply-event, PUT / DELETE /transactions desc, PUT /personal-debts desc; schemas EventRef.kind, Event.kind, EventBillInput.payer, EventBillBooks.private_note, EventBillBookRequest.split, EventBillRebookRequest (expected_updated_at, move), EventBillMove, EventBillView, MyBillCopy, EventBillApplyResult, EventBillDeleteResult, EventBillLink (edit_in_bill, pending_update), Transaction.private_note, UpdateTransactionRequest.private_note, DebtEntry.private_note, DebtEntryUpdateRequest.private_note, NotificationType (+5 types). Deprecation notes on copy / my-books / splits.
- 2026-10-27 — `cmd/api/main.go`: 4 route lines (GET / DELETE /event-bills/:pt_id, POST …/apply, …/disconnect; 501 until built).

## 2026-10-27 — contract: shared bills (openapi only, code follows)
DONE (spec) · `go test ./internal/apidoc/` ok for my part (TestSpecRoutesAreRegistered fails only on BE-2's POST /projects/{id}/complete, not registered yet).
Decisions I took (Lead: override if wrong):
- **Every split is a split bill** (owner Q-B3, Lead OK): quick create แบ่งกับคน saves via `POST /event-bills {split: true}` whoever the people are; a name-only person gets no copy. Owner 2026-10-27 (via Lead): คนจ่ายแทน / รับแทน too (payer = that person, members = me + them). Transaction `splits` / `paid_by` + `PUT /transactions/{id}/splits` deprecated, removed in S16.
- Q-B1 / B8–B13 Lead defaults taken: follow each member's switch on create; a remote payer's copy = the whole bill (no wallet yet) + debts; switches = BE-3's auto_sync_events (event) / auto_sync_debts (split); muted + auto = silent apply; no copy → no private note; personal tags; the my-copy block replaces ⤓.
- A copy arrives with no wallet / category / tags; "จ่ายโดย P" = no wallet + the debt; "คืนแล้ว" on me = no debt, wallet mine to pick.
- Disconnect = my copy tx AND my debts of that bill become plain together (no tx-only unlink); a marker table keeps it (rule f: deleting my copy disconnects; the bill no longer reaches me until I connect again).
- Apply is live (the bill now wins), no stale check; a newer notice supersedes an older unanswered one.
- `shared_bill_created` replaces `project_tx_recorded_for_you` (old rows still render).
FE contract delta (App-1 / App-2 / App-3):
- `POST /event-bills`: `split: true` target (exactly one of project_id / new_event / split); payer ≠ me on income OK; split bills ignore `bill.tag_ids`.
- `GET /event-bills/{pt_id}` → EventBillView {bill (BoardRow), event (EventRef + kind), members, tags, rights {can_edit, can_delete, can_change_payer, can_move}, my_copy (MyBillCopy | null), updated_at}. MyBillCopy {connected, role payer|share|payback_from|payback_to, amount, transaction, paid_by (MemberRef: "จ่ายโดย"), paid_back_me, debts[], in_sync, differences, pending_update, private_note}.
- `PUT /event-bills/{pt_id}`: payer may change; `expected_updated_at` → 409 BILL_CHANGED (details.bill = EventBillView); `move {project_id | new_event | split}` (400 MOVE_TARGET); `my_books.private_note`; `my_books.on false` = disconnect, true = connect again; `apply_to_my_tx` ignored.
- `DELETE /event-bills/{pt_id}[?keep_my_tx=true]` → EventBillDeleteResult {id, project_id, removed_project, event (EventPatch | null), effects}.
- `POST /event-bills/{pt_id}/apply` / `…/disconnect` → EventBillApplyResult {my_copy, effects}. 409 BILL_DISCONNECTED / PROJECT_LOCKED, 410 BILL_GONE.
- `POST /transactions/{id}/apply-event` = apply of its bill (+ debts, effects).
- Tx: `private_note`; `project` null on a split copy; `event_bill.edit_in_bill`, `.pending_update`, `in_sync` / `differences` on list rows. `PUT /transactions/{id}` on a connected copy: only category / tags / private_note / account (when the money is mine) → else 409 SHARED_BILL_FIELD. `DELETE /transactions/{id}` of a copy = disconnect (bill unchanged; `also_delete_link` ignored).
- Debt: `private_note`; `bills[]` (BE-2's DebtBillPart, I fill in_sync / differences / edit_in_bill); `PUT /personal-debts/{id}` on a bill debt → only paid / due_date / private_note, else 409 SHARED_BILL_FIELD.
- Notifications: shared_bill_created {project_transaction_id, project_id, project_kind, project_name, description, amount, my_role, my_amount, payer_name, applied, personal_transaction_id} → /event-bills/{id}; shared_bill_deleted {…, my_transaction_ids[], my_debt_ids[], applied}; shared_bill_disconnected {project_transaction_id, project_kind, description, amount, person_name}; event_completed / event_member_removed (BE-2's payloads); project_tx_changed + project_kind, applied; accept = POST /event-bills/{id}/apply.
- Old calls deprecated (V16 removes): POST …/project-transactions/{pt}/copy, PUT …/my-books.

## 2026-10-28 — BE-1 0.4.1-2: shared bills (S1–S3, S5–S11, S13, S14, S17, X4, X8, 092 / 093 / 095, auto-accept, multi-payer copies, money check)
DONE · S15 + S16 handed to BE-3 (Lead's routing; see be-3.md) · migrations 092 (notification CHECK), 093 (projects.kind, shared_bill_opt_outs, transactions / personal_debts.private_note), 095 (event_deleted for BE-2) · `go vet ./internal/...` clean · tests on chubi_test_be1 (at 113 incl. everyone's 094–113): projects, transactions, personal_debts, apidoc, budgets, categories, accounts, shared all ok, 0 SKIP. notifications: 1 fail `TestAutoIndependentOfMute` (split_* auto after S16, BE-3 told). 092 / 093 round-tripped up → down → up.

**Code (be):**
- projects/shared_bill.go NEW — the copy engine: `loadBillTx` (shares, payers + real pairs from BE-2's view, "คืนแล้ว" rows per payer), `applyCopyTx` (one member's copy: tx max(paid, share), wallet rule, origin = main payer, debts netted per person from the pairs, payer repayments per payback row, drop when no part), `fanOutTx` (create → auto-accept, edit → auto-sync; info vs asking notices; supersede), `disconnectCopyTx` / `reconnectCopyTx` / `CopyDeletingTx` (rule f).
- projects/bill_view.go NEW — GetBill / ApplyBill (+ apply on a deleted event bill's asking notice) / DisconnectBill / DeleteBill (split branch; event branch = BE-2's deleteEventBillTx), `BillChangedError`.
- projects/bill_move.go NEW — S17 move (rows first, then members / payers / bill parts re-mapped; copies' and debts' project follow; empty split dropped) + `billToSplitTx` for BE-2's event delete.
- projects/book_bill.go — `split: true` target, payer may change, `payers` (PAYERS_SUM), payback_kind (BE-2 V11), editor's copy through the engine (`myCopy`), `expected_updated_at`, move, paybacks per payer, every member's repayments removed with a tick, fan-out at the end.
- projects/pt_service.go / bill_people.go — the old create / edit paths fan out (no more notifyRecordedTx / notifyChangedTx; fixes BE-2's PAYBACK_NOT_COPYABLE); pt_store.go X8 filter; store.go GetByIDForCaller 404s a split; kind = 'event' on the lists (projects store / numbers, me counts + archived, contacts delete preview, form-options events).
- transactions — X4 (delete effects list split / paid-by debts), shared_copy.go NEW (UpdateCopyInTx, SetPrivateNoteTx, SetCopyPaidByTx, the S9 / S11 guard, pending bills), detail.go S8 (in_sync / differences / edit_in_bill / pending_update on list rows, project null on a split copy), rule f in delete, apply-event = bill apply, errors SHARED_BILL_FIELD / PRIVATE_NOTE_NOT_SHARED.
- personal_debts — bill_copy.go NEW (GetEntryTx, DeleteEntryTx, SyncBillRowTx, RowEffects, the S9 / S11 guard on PUT), X4 hook returns, private_note on the view.
- shared/share.go — `ShareAmountExpr`: a bill copy counts GREATEST(LEAST(amount, my share) − my splits, 0) (multi-payer safe; single-payer numbers unchanged).
- notifications/shared_bill.go NEW (3 types, payloads, dispatchers, SupersedeBillNoticesTx; pageTypes), ProjectTxChangedPayload + project_kind / applied.
- Tests: projects/shared_bill_test.go NEW (split bill reaches members, money 900/300 + รับแทน, bill form calls, guards, move, multi-payer, X8); adjusted to the new rules: touch_test (switch off for the "asks" path, S9 refusal, rule f), event_link_test (S9), bill_people_test / bills_test (Bee gets her copy). split_follow_test / paid_by_test (X4).

**Owner check (money):** OK. 900 split 3 ways → payer wallet −900, counted 300, others owe 300 each; non-payer copy 300, no wallet, counted 300, owes 300; รับแทน mirrors; multi-payer 600/300 → wallets −600 / −300, counted 300 each, nets right.

**FE contract delta since the spec entry:** `EventBillInput.payers` (BillPayerInput, 400 PAYERS_SUM); `MyBillCopy.my_paid`, `paid_by_parts[]` (BillPayer); auto-accept decides the first copy (split bills default off → `shared_bill_created` asks); apply / disconnect also answer `bill` (BE-3); `event_deleted` type (BE-2's payload). Old routes removed by BE-2 / BE-3 (copy, my-books, split-requests / split-changes).

**Notes / not done:**
- A disconnected payer copy is a plain 900 tx + plain debts (counts 900); Lead's proposal "OK as plain" pending the owner.
- Income + "คืนแล้ว" keeps the old direction (ticked member → payer) — fine for expense; for income the receiver is the one who owes, so the tick reads oddly; untested edge.
- Docs: spec 10 §0 (shared bills), 04 / 12 notes, api-document §04 lines. ref/schema.md was already updated (093 / 095 rows) — checked.

## 2026-10-28 — BE-1 tests + cleanup (Lead's order)
DONE · `go vet` clean on projects / transactions / personal_debts / notifications / shared · projects package green on chubi_test_be1 (incl. BE-3's flows_be3_test.go).
- Fix (found by BE-3's TestFlowSplitBillEditBeforeAccept): an edit reached a member who had never accepted the bill through auto-sync. Now auto-sync reaches only a member who holds the bill (a copy tx or a bill part); one who never accepted gets a fresh asking `shared_bill_created` with the bill as it is now (`fanOutTx`).
- Fix (found by BE-2): a move / event delete now re-maps `personal_debt_bills.member_id` too (lumps survive).
- Gap tests added (no overlap with BE-3's flows): TestPaidBackRemotePayerAndReconnect ("คืนแล้ว" in a remote payer's book = debt + repayment, net 0; disconnect → connect again relinks the same tx, in sync). TestMoveSharedBill now turns Bee's auto-accept on (it had passed through the bug above).
- Docs in: spec 10 §0 (shared bills), 04 / 12 notes, api-document §04; schema.md already had 092–095 / 093 rows (checked).
