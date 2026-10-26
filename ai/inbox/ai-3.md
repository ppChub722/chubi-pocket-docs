# AI-3 inbox (lists + cleanup + close)

## 2026-10-26 14:52 — 0.4.1-0 AI-3: H2, A5, G2, G3, G5, E2
DONE · app, all uncommitted in the shared tree · analyze: VS Code diagnostics clean on every touched file (no flutter analyze while the tree is shared) · test: not run (CLAUDE.md: ask first)
- **H2** no debt item counts: quick create "กับใคร" picker drops the "ค้าง N รายการ" subtitle (the balance on the right stays); Home debts tile caption shows nothing while debts are open (amount only). Hub hero demo fact without the count. Person counts ("N คน") stay — they are people, not items. `debtsOpenCount` / `homeDebtsOpen` now unused → G6.
- **A5** category detail: a non-NOT_FOUND detail error is kept and shown with retry (retry reloads the list only if it failed, plus the detail). Event settle section: a failed load shows ErrorView + retry in the section instead of the skeleton forever (no snackbar).
- **G2 / G3 / G5** deleted `ui/domain/money/settle_sheet.dart` + hub demo, `features/projects/.../resolve_sheet.dart`, `ui/domain/projects/event_resolve_sheet.dart`, `saving_plan_preview.dart` + its test block; ui.dart exports, hub covers (sheets-transactions = 3 sheets, sheets-projects = AddMember only), the AccountPicker "resolve" demo.
- **E2** every list page on AppListHeader / AppListToolbar: accounts, budgets list + detail day header, categories, contacts, notifications, pending, debt person (day note, type check), debts list, events list + bills toolbar, recurring (all + calendar), goals list + history day header, tags (view + edit bars), transactions, item_picker. Recurring calendar = AppListHeader(month / picked day as ✕ chip, status + kind filters, 🔍) + toolbar (search + sort); the FilterBar and the "ทั้งเดือน" chip are gone. Deleted ListToolbar + ToolbarToggleState / ToolbarToggleButton (`templates/list_toolbar.dart`), DateGroupHeader, `test/ui/toolbar_toggle_test.dart`; hub demos moved over (toolbar_toggle_demo kept on the new pieces).
- Kit: `AppListToolbar.trailing` (a non-sort end: sort menu, edit / bulk delete) and `ListHeaderTrailing.text(color:)` (coloured note, w600) + hub demos.
deviations/notes:
- **SectionHeader stays** (Home / More / dashboard heads keep it per the owner's E2 answer), so it is not deleted.
- Heads look smaller / bolder everywhere (14 w600) and day totals use the header value style — check on device.
- `recurringWholeMonth` l10n key now unused → G6.
- Still to do (LAST, after AI-1 / AI-2 / AI-4 say done): G6 unused l10n keys, the full run, device checks (J).

## 2026-10-26 14:53 — 0.4.1-0 AI-3: G6
DONE · app/lib/l10n/app_en.arb + app_th.arb + gen · gen-l10n: clean · re-scan: 0 unused keys
- Removed 541 keys no Dart file in lib/ or test/ names (2,412 → 1,871), with their @-metadata; line-based so the arb layout stays. All AI-4 new keys kept. AI-1 / AI-2 / AI-4 said done first; no arb keys from now on.
- Still to do: the full run (waiting for the owner's go on tests) + device checks (J).

## 2026-10-26 15:17 — 0.4.1-0 AI-3: full run
DONE · flutter analyze: no issues · flutter test: 371 passed · go vet: clean · go test ./... with TEST_DATABASE_URL: all ok, 0 SKIP (DB tests ran)
- Local DB migrated 77 → 80 first (078 budget_period_base, 079 saving_goal_period, 080 paid_by_income), owner's go.
- First run had 3 failures: AI-2 fixed feature_visuals baseline + hub smoke domain/progress; mine (personal_debts_page raw TextStyle) → textTheme.titleSmall.copyWith. That run's counts may be mixed: $TEMP/t.log is shared by every session; logs now go to per-session files.
- Left: device checks (J) — owner or QA.
