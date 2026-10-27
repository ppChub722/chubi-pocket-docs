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
