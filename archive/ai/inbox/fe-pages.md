# FE-pages inbox (newest on top)

## 2026-10-17 · M2–M5 in one branch (feat/0.4.0-fe-pages)

All module pages are on the 0.4.0 kit and merged into `feat/0.4.0-fe-pages` (main 74d30e1 merged in): wallets, debts, goals, contacts, budgets, events, transactions list, recurring. `flutter analyze lib test` was clean at the last full check; each page was tested at its commit point only (owner rule: test less). Lead runs the full suite.

Full per-page reports (what changed per file, kit pieces, decisions with how to undo, BE requests) are in `ai/inbox/fe-pages-reports/`: DEBTS / CONTACTS / GOALS / BUDGETS / EVENTS / RECURRING (+ RESULT for the M5 follow-ups when it lands). Wallets + transactions list are in the entry below.

**M5 (done, merged @ 118f642):** every end zone on the branch uses the BE delete previews (wallets, contacts, budgets, goals, events, recurring) with archive / restore wired; goals got the sort chip, the month plan / saved caption + bar and the plan line in the chart; recurring uses `monthly_amount`, the embedded `upcoming` (one call) and the item-write `setting`; events send `status=unsettled|ended` and `payer_member_id`. Not adopted: recurring `?kind=` (the list splits tabs client-side and the settings tab covers three kinds → needs a multi-kind value from the BE or a call per tab), events `receivable` (no tile for it). Sub-agent reports: `ai/inbox/fe-pages-reports/` (M5_RESULT.md, M5_RESULT2.md).

**Found in M5:** the wallet "เก็บถาวร" button called `DELETE /accounts/:id`, a HARD delete since 0.3.3. Now `POST /accounts/:id/archive`; ลบ added with the BE `delete_preview` confirm.

**Decisions to confirm (collected)**
- Tx list: one "ตัวกรอง" chip (the existing side sheet) instead of the three หมวด / กระเป๋า / แท็ก chips of the mock · three picker wirings for the same data · replace the chip with three chips opening the same sheet sections.
- Wallet hero in/out tiles drive a `typeFilter` on the embedded tx list (additive param in FE-core's list page).
- Debts person page is a `ListPageBody` (paging), no compact hero bar on scroll; hero tint follows the side.
- Events: `/projects/new` opens the detail page in create mode (old form + dashboard + tx-list tabs deleted); the "ส่วนของฉัน" tile toggles a `mine` bills filter; unsettled / ended tiles filter client-side (BE has no status for them).
- Budgets: "ใช้ได้วันละ" tile = `forecast.daily_allowance`; settings rows start edit mode in view.
- Goals: third list group "ยังไม่มีแผนรายเดือน"; sort chip comes with the M5 follow-up.
- Recurring: detail + edit are one page (✏️ opens edit directly); hero says "ต่อครั้ง" until BE sends a per-month amount.
- Contacts: nickname toggle always enabled; a linked contact keeps an unlink row.

**BE asks sent to chubi-pocket-98** (Lead trims): recurring (per-month amount, upcoming embedded in the detail, setting returned with occurrence writes, ?kind=, delete preview), events (status unsettled / ended, payer filter, delete preview, "owes me" filter). Already built by BE: wallet cash_split / card_remaining / credit_used_pct / credit_available, debts sort, contacts username / unlinked_total / delete_preview, budgets pace_pct / delete_preview, goals month totals / plan / sort / delete_preview.

## 2026-10-17 · M2 wallets done; debts / goals / contacts delegated (branch feat/0.4.0-fe-pages)

**Wallets (commits 9484e55, 1b91120, 910d86f)**
- LIST: `ListSummaryCard` (net · กระเป๋าตังค์ / หนี้บัตร filter tiles from BE `cash_total` / `card_debt` / `cash_split` / `card_remaining` · "ออมไว้ · ใช้ได้จริง" line from `saved_total` / `available_total`), hidden search row with the order chip (default ตามประเภท) + ⇅ จัดลำดับ chip, 2-column cards grouped by type with `SectionHeader` (count + BE subtotal), dashed add tile, archived link. No client sums or percentages (cash split + card remaining come from the BE).
- DETAIL (view): `HeroCard` (type / masked ref / shared chips, icon + description, balance — a card shows its debt, split bar ใช้ได้ / ออมไว้ or limit bar, month in / out tiles, due-date alert), `ActionBar` (ปรับยอด + ออม; card: ชำระบัตร + ปรับยอด), pinned tabs ภาพรวม / รายการ (+ สมาชิก when shared), ภาพรวม = info box + savings by goal + settings + member strip + note + meta + page dots.
- EDIT / create: its own form (`DetailLayout` + `HeroCard(editing:true)`: type ▾ dropdown chip, icon / name / description, opening balance only on create), card terms, reference numbers, settings, note, end zone (เก็บถาวร). No tabs, no balance.
- Kit moves: `AccountCard` family + `MemberAvatarStack` → `lib/ui/domain/money/wallet_card.dart` / `member_avatar_stack.dart` (+2 export lines in ui.dart, covers in hub_registry); `SummaryTileView` made public in `list_summary_card.dart` (HeroCard tiles need it; +covers). Quick create gained `toAccount` (ชำระบัตร = a transfer INTO the card).
- Tests: test/features/accounts (31 pass), hub_coverage + layering pass.

**Delegated (git-worktree sub-agents off this branch; I merge their commits)**: debts (person page statement, list tiles), goals (list, detail, edit, auto-save), contacts (detail / edit). Reports land in each worktree root (DEBTS_REPORT.md / GOALS_REPORT.md / CONTACTS_REPORT.md).

**Decisions taken** (what · why · how to undo)
- Kept the สมาชิก tab when a wallet is shared AND added the member strip in ภาพรวม · decisions.md "members tab only when > 1 member" + reference strip · drop the tab and open member actions from the strip tap.
- Kept the per-goal savings section on the wallet overview (WalletSavingsSection) in addition to the split bar · decisions.md says the wallet page shows saved per goal + spare · delete the section + its test to follow the reference literally.
- Moved `AccountCard` + `MemberAvatarStack` into `lib/ui/domain/money` (FE-core agreed; told them the 2 ui.dart lines) · every visual widget lives in the kit · revert the move commit.
- Added `QuickCreatePreset.debtDirection` and `showQuickCreateSheet(toAccount:)` (shell / quick create files, additive) · person-page direction preset and ชำระบัตร · revert the fields.
- Per-account credit used % / available still come from `Account.creditUtilization` / `creditAvailable` (client getters, pre-existing) · BE sends no per-wallet `credit_used_pct` yet · ask BE for `credit_used_pct` + `credit_available` per wallet, then drop the getters.
- Month in / out tiles tap → switches to the รายการ tab (no filter yet) · the embedded list has no filter hook · add a preset filter to `TransactionsListPage` later.
- Wallet delete (BE `include=delete_preview`) not wired yet · M5 · —

## 2026-10-17 · M1 non-visual fixes (branch feat/0.4.0-fe-pages, worktree chubi-pocket-app-fe-pages)

Done:
1. Debt saved from the shell + now refreshes the debts pages. New `DebtBook` signal (`personal_debts/presentation/cubit/debt_book.dart`): live `DebtPeopleCubit` / `DebtPersonCubit` attach on creation and detach on close; `_saveDebt` in quick create calls `DebtBook.entrySaved(r)`. Person page patches from the response (no call); people list patches the row (`applyBalance`) and reloads once for totals / new people. The person page no longer passes `onDebtSaved` (would double-apply).
2. Person page + presets the direction: `QuickCreatePreset.debt(debtDirection:)` (new field) from `debtDirectionFor(net)` (they owe me → Received, I owe → Paid, settled → default). Used by both the page button and the shell +.
3. Stale TODO / comments removed (`main_shell.dart`, `quick_create_mode_chips.dart`).

Touched shell file (FE-core's area, additive only): `lib/app/shell/quick_create_context.dart` (+ `debtDirection` field), `main_shell.dart` (comment). `lib/ui` touched only for a stale doc comment.

Tests: personal_debts (34) + page_presets + quick_create_debt_mode pass; analyze clean on touched folders. Added a DebtBook test and a debtDirectionFor test.

## Decisions taken
- Used a static live-set signal (`DebtBook`, same pattern as `TransactionsCubit.bookChanged`) instead of a shell callback · works for every opener (shell +, notification action) · undo: delete debt_book.dart and pass `onDebtSaved` from `_openQuickCreate`.
