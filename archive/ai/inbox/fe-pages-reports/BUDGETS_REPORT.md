# Budgets pages on the 0.4.0 design — report

Branch: `worktree-agent-afa04e3f8bad5fe7f` (based on `feat/0.4.0-fe-pages`; see "Setup note").

## What changed, per file

- `lib/features/budgets/presentation/pages/budget_detail_page.dart` — rewritten.
  - VIEW: `HeroCard` (chips: status for non-active states, period kind, range + "วันที่ n/N", open-ended, "เฉพาะรอบนี้"; icon 40 + description; `HeroNumber` ยังใช้ได้ / เกิน with "/ ฿limit", colour = BE tone else the icon tint; `HeroBar` with the pace `marker` from `forecast.pace_pct`, left "ใช้ไป ฿X", right "ควรใช้ถึงวันนี้ N%"; 3 `SummaryTileView` tiles from the BE forecast). No action bar. `SettingsSection` (นับอะไรบ้าง / เตือนเมื่อใช้ถึง / ทำซ้ำทุกรอบ) and `NoteSection` sit above the tabs. Recurring budget: `TabbedDetailBody` with pinned tabs [รายการในรอบนี้] [ทุกรอบ] (compact bar, page dots, pull-to-refresh via `ListPageBody.onRetry` = the page's one load). One-off / open-ended budget: `DetailLayout` with the items as `records`.
  - Items: `DateGroupHeader` per day + `TxRow`; each row says why it counts ("นับเพราะ: หมวด …" etc., from `item.reason`).
  - ทุกรอบ: `ProgressCard.compact` per period (pace tick on the current one); tap = `showPeriodLimitSheet` → `PUT /budgets/:id/periods/:period_id`; "คืนเป็นค่าเดิม" sends `amount: null`. The answer is the page AT THAT PERIOD: the current period's answer replaces the page, an older one only patches its row (`BudgetDetail.afterPeriodWrite`).
  - EDIT / CREATE: `DetailLayout` with `HeroCard(editing: true)` (rule chip ▾, 44 `EditableCircle`, `HeroNameInput`, `HeroDescription`, `HeroAmountField` "เพดานงบ"), `InfoBox` start / end, `SettingsSection` with the pickers (every expense toggle, categories / tags / wallets, warn menu, repeat toggle), `NoteSection`, `EndZone` (ปิดงบ if `actions.close` · เก็บถาวร / กู้คืน · ลบ, each with confirm dialog and the existing repo calls). Bar / tiles / forecast / items / tabs are hidden.
  - A failed reload with data on screen keeps the data and shows an `AppMessage`; first-load failure keeps the full-page error + retry. Quick-create preset kept.
- `.../budgets_list_page.dart` — the list was NOT on `ListSummaryCard` in the base branch (own `BudgetSummaryCard`); rebuilt on `ListSummaryCard` (tinted, BE totals, bar, 4 health tiles as `SummaryTile`s, 🔍 action) and rows now use `ProgressRemainder` / `ProgressBadges`.
- `.../budget_labels.dart` — added `budgetScopeSummary`, `budgetReasonText`.
- `.../domain/budget_detail.dart`, `budget_period.dart` — `BudgetForecast.{available, projectedEnd, daysLeft, pacePct}`, `BudgetReason` + `BudgetItem.reason`, `BudgetDetail.afterPeriodWrite`, `BudgetPeriodPage.replace`.
- Deleted: `budget_summary_card.dart`, `budget_view_sections.dart`, `budget_period_sheet.dart` (own-look). `lib/features/budgets` now has zero own-look widget classes (only pages, mappers and picker wrappers).
- ARB (appended at the end of both files, prefix `fpBudgets…`, 29 keys) + regenerated `lib/l10n/gen`.

## Kit pieces added

| Piece | File | ui.dart | hub page covers |
|---|---|---|---|
| `showPeriodLimitSheet`, `PeriodLimitResult` | `lib/ui/domain/progress/period_limit_sheet.dart` | `export 'domain/progress/period_limit_sheet.dart';` | `budgets` page (`'showPeriodLimitSheet'`, `'PeriodLimitResult'`) + demo in `lib/hub/pages/domain_budgets_page.dart` |
| `ProgressRemainder`, `ProgressBadges` | appended to `lib/ui/domain/progress/progress_card.dart` (already exported) | — | `progress` page (`'ProgressRemainder'`, `'ProgressBadges'`) + demo in the ProgressCard row demo of `domain_progress_page.dart` |
| `SettingSummaryRow(error:)` | `lib/ui/organisms/settings_section.dart` | — | already covered |

## Decisions taken

1. Tile "ใช้ได้วันละ" shows `forecast.daily_allowance`, not `forecast.available` · `available` is limit − used (the reference's ฿129 = 10,000 / 77 days is the daily allowance) · swap the field in `_tiles`.
2. View-mode rows of การตั้งค่า (นับอะไรบ้าง, เตือนเมื่อใช้ถึง, ทำซ้ำทุกรอบ) start edit mode instead of saving live · there is no combined scope editor sheet and each change would need a full PUT (+ "ใช้กับรอบไหน" for repeat) · wire a live PUT per row.
3. The settings toggle "ทำซ้ำทุกรอบ" in view mode enters edit mode and applies the change to the draft (old `_change` pattern) · same reason · as 2.
4. Open-ended / one-off budgets get no tabs (items right below the note) · there are no periods to list · give them a single tab.
5. ทุกรอบ rows only edit the period's limit, they no longer open that period's dashboard (the old "view another period" is gone) · reference: "tap = edit that period's limit" · re-add an `onOpenPeriod` using `getBudget?period_id`.
6. Tiles are display-only (no onTap) · the brief gives no tile actions · give them filters / jumps later.
7. One badge per period row (this period › this period only › status) instead of up to three chips · avoids own layout in the feature · extend `ProgressBadges` use.
8. List pace tick still comes from `budgetPaceFraction` (client elapsed fraction), only the detail uses the BE's `pace_pct` · BE sends none per list row (see requests) · switch when BE adds it.
9. Edit mode shows start and end as two `InfoRow`s (not one "เริ่ม – สิ้นสุด" row) · each opens its own picker · merge into one row if wanted.
10. `HeroSpacing`-sized `SizedBox` / `Column` in the one-off layout (banner above the hero, footer column of "show more" + meta) is the only layout code left in the page · no kit slot for a banner · add an `AppMessage` slot to `DetailLayout`.
11. Money strings on the page use `budgetRowMoney` (drops ".00", respects the 👁 hide) · "Rows drop .00" rule · use `moneyString` for decimals.

## Requests to BE

- `period.pace_pct` (elapsed %) on every row of `GET /budgets` so the list's pace tick needs no client elapsed-fraction math.
- Optional: a `delete_preview` for budgets (the matrix has none; the confirm text is static now).

## Setup note

The worktree branch started from `main` (0.3.1-10), not from `feat/0.4.0-fe-pages`; I fast-forwarded it to `feat/0.4.0-fe-pages` (`git merge --ff-only`) before working, so all kit pieces were available.

## Unfinished / not verified on device

- Nothing run on a device or emulator (by rule). The compact hero bar, pinned tabs and NestedScrollView refresh behaviour were only covered by widget tests at 800x6000.
- Tapping ✏️ on tiles / scope row-by-row live editing: see decisions 2 and 6.

## Tests and analyze

- `flutter test test/features/budgets` — 33 tests, all pass (new: hero numbers + pace + tiles, over-budget hero, settings / note order, reasons + day headers, periods tab + override call + reset to base, failed reload keeps data + message, one-off page, edit form + end zone, archive / delete confirm, create, network-down, malformed body, domain `afterPeriodWrite`).
- `flutter test test/ui/hub_coverage_test.dart test/ui/layering_test.dart test/ui/progress_kit_test.dart test/features/home/home_skeleton_geometry_test.dart` — pass.
- `flutter analyze lib/features/budgets lib/ui lib/hub test/features/budgets` — no issues. `dart format` clean.
