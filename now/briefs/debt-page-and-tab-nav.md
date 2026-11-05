# Debt page unified + tab navigation (2026-11-05)

Owner session, 2026-11-05. App commits `5501d2b`, `22caa06`, `50dc5bc` (main, after `3a300a8` = 0.4.2-4+229). BE change is in the working tree, not committed, not deployed.

## 1. One page for a debt and a repayment

**Why:** the two screens in the owner's screenshots were the same record (`personal_debts` row, only `kind` differs: `debt` / `repayment`, each with at most one tx). Repayments opened the tx page, debts opened the debt page, with different layouts.

**Rules decided**
- A debt or a repayment (any tx with `debtLink`) opens `DebtEntryDetailPage`; the tx page is for plain txs only.
- **No linking an existing tx to a debt, ever** (not at create, not later). A wrong entry is deleted and entered again with the right date (0/13 debt txs on the test server were connected). At create there is one choice: save to a wallet or not (the existing toggle). A debt with no tx can still get a wallet later (a NEW tx made from the debt).
- **Delete is both sides, no question:** deleting the debt deletes its tx; deleting the tx deletes the debt.
- No "record debt with the tx" on the tx form (not wanted).

**App** (`debt_entry_detail_page.dart`, `transaction_detail_page.dart`)
- Debt page now follows the tx page: hero (✓ จ่ายแล้ว for a debt, date, edit, amount, title), then ONE `EntrySectionCard` with the flow cards (กับใคร ⇄ กระเป๋า), tags, and the note row (label left, text right, long press edits). The ✓ stays; a repayment has no ✓ / due date.
- Removed: `_pickLink`, `_unlink`, `_linkSection`, the "ผูกรายการ" picker for debts. `repo.linkTx / unlinkTx` and the BE endpoints stay for now.
- Tx page: the repayment-person row, locked-category hint and `repaymentPerson` branches are gone; only an older repayment row with no person is left (read-only system row).

**BE** (`personal_debts/service.go` `TxDeletedTx`, `transactions/service.go` `DeleteWrite`)
- Deleting a debt's tx now deletes the entry too; the answer lists it in `effects.removed_debt_ids`; `person_balance` is after the delete. Tests `handler_test.go` / `repayment_test.go` changed to match (build + vet clean, **not run**). `ref/api-document.md` line about D1 updated.
- Old apps expected the entry to stay: ship BE + app together with the forced update (MIN build). The new app never deletes a debt's tx from the tx page, so the new app works on the old BE too.
- Left for a later round: delete the `link` / `unlink` endpoints and `debt_connected` / `debt_prev_category_id` handling.

## 2. Tab navigation (`app/shell`)

- **Entering a tab starts it over** (all tabs, was settings only): its pages leave unseen, its first page arrives with the tab's entry. To get back to where you were, use back.
- **A back between tabs returns the tab as it was left** (`goTab(back: true)`, no reset).
- **Tapping the open tab** pops it to the first page and replays the entry (`ShellReopen`); already on the first page = nothing.
- Cross-tab links (`openPage`) are not changed: they land on the page and are not reset.
- **Entry animation:** a bottom-bar tab (from another bottom tab or from elsewhere) grows scale 0.8 → 1 + fade out of the bottom centre (was a side slide / slide up). Top-row tabs still slide down; More cards and the bell still grow from the tapped spot; reduced motion = fade.
- Tests: `tab_entry_test.dart`, `tab_nav_test.dart` rewritten for the new rules (**not run**).

## 3. Back slide

`AppPageTransitionsBuilder.popCurve` = `Curves.easeIn` (slow start, quickens), `popDuration` 350 → 260 ms. Used by ←, system back and back between tabs; a predictive-back gesture follows the finger and only its finish is shorter.

## Checks
`flutter analyze lib` clean (before the shell edit: `lib/app` + `test/app` clean). No tests run, no app run.
