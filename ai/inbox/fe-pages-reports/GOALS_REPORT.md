# Saving goals on the 0.4.0 design — report

Branch `worktree-agent-a3bb4e83d1162fcd2` (own worktree, based on `feat/0.4.0-fe-pages` @ 910d86f). Not built, not pushed, not merged.

Note: the worktree started on a stale commit (4d838f1, 0.3.1-10). I `git reset --hard feat/0.4.0-fe-pages` before any change (the branch had no commits of its own), so everything below sits on top of the wallets work.

## What changed, per file

Domain / data / state (`lib/features/saving_goals/`)
- `domain/saving_goal.dart`: new `SavingStatus` (reached / on_track / behind / none) replaces `SavingPace`; `SavingGoal` gains `monthPlan`, `monthSaved`, `monthShort`, `status`, `behindMonths`, `autoSave` (`SavingAutoSave` {amount, day, wallet?, nextDate}); `pace` / `lateMonths` removed.
- `domain/saving_goals_overview.dart`: `SavingSummary` + `savedTotal`, `monthShortTotal`, `unallocated`; `SavingGoalDetail` drops the old `auto_save` LIST, adds `spareAutoSave` (object on the spare page) and an `autoSave` getter (goal's, else spare's); old `SavingAutoSave` (recurring-based) removed.
- `domain/saving_entry.dart`: `SavingEntry.wallet` and `SavingWalletShare.wallet` are nullable (BE: null = money saved with no wallet).
- `domain/saving_plan_preview.dart` (new): the edit form's live "ต้องออม/เดือน" line (instant feedback only, same rule as BE).
- `data/saving_goals_repository.dart`: `setAutoSave(id, amount, day, accountId)` (PUT) and `clearAutoSave(id)` (DELETE); `spare` uses the same paths.
- `presentation/cubit/saving_goal_cubit.dart`: `setAutoSave` / `clearAutoSave`, state patched from the answer (no re-fetch).
- `presentation/widgets/saving_goal_texts.dart`: wording only now: status chip, ETA badge text, auto-save caption (returns kit chips / strings, no layout).
- `presentation/pages/saving_goals_list_page.dart`: rewritten (ListPageBody + ListSummaryCard + hidden ListToolbar + SectionHeader groups + SavingGoalRow + AddTile).
- `presentation/pages/saving_goal_detail_page.dart`: rewritten. View = `TabbedDetailBody` (HeroCard + ActionBar + pinned swipe tabs ภาพรวม / รายการออม + CompactHeroBar), tabs are `ListPageBody`s (pull-to-refresh, page dots, paging come from the template). Edit / create = `DetailLayout` + `HeroCard(editing)` + InfoBox + SettingsSection + NoteSection + EndZone. The spare page ("ยังไม่จัดสรร") shares the page (view only; ออม / ถอน / ย้าย + auto-saving + entries). ZERO own-look widgets in `lib/features/saving_goals` (only kit pieces; `grep Padding|SizedBox|Container|Color(` finds nothing there).

Kit (`lib/ui`) — all exported in `lib/ui/ui.dart`, all in a hub `covers:` list
- `domain/saving/saving_goal_row.dart` → `SavingGoalRow` (list row: icon, name, "ขาด ฿x" / ✓, thick bar in goal colour, "saved / target", ETA badge). ui.dart: `export 'domain/saving/saving_goal_row.dart';` · covers: `SavingGoalRow` (hub page `domain/saving`, demo "SavingGoalRow — behind · on track · reached · archived").
- `domain/saving/saving_auto_save_sheet.dart` → `showSavingAutoSaveSheet`, `SavingAutoSaveSheet`, `SavingAutoSaveWallet`, `SavingAutoSaveResult` (amount · day · wallet; "ไม่มีกระเป๋า" valid; the app supplies the wallet picker). ui.dart line added · covers: those four names · demo "showSavingAutoSaveSheet" on the same hub page.
- `organisms/chart_section.dart` → `ChartSection` (headed box around one chart). ui.dart line added (after saving_history_chart) · covers: `ChartSection` · demo on `domain/saving`.
- `DetailSections` (templates/detail_layout.dart): new view-only `chart` slot between settings and people.
- `SavingTxRow`: optional `date` (leads line 2; the reference shows when each entry happened).
- `ListSummaryCard`: optional `onInfoTap` (makes the info line a link).
- `AddTile`: `inList` flag (inset + spaced like list rows, so the page needs no Padding).
- `ActionBar`: now 1–4 actions (was 2–4): a goal with nothing saved has only ออม (and a closed goal only กู้คืน).
- Hub: `lib/hub/pages/domain_saving_page.dart` (3 demos) + `lib/hub/hub_registry.dart` (covers + summary).

ARB: 49 `fpGoals*` keys appended at the end of `app_th.arb` and `app_en.arb` (re-read the file end right before appending; gen-l10n run).

Tests (`test/features/saving_goals/`): `saving_goal_parse_test.dart` (prod-shaped fixtures with the 0.4.0 fields, spare `auto_save` object, wallet-less entries / shares, SavingPlanPreview) and `saving_goals_pages_test.dart` (19 page tests, listed below).

## Page tests added (prod-shaped JSON, real parsing)
- List: card numbers (saved_total, month_short_total, unallocated), group headers + order, "Short ฿x" row text, ETA badge "Goal May 2027 · 2 months late", never "0 months late", search row hidden / red dot / status dropdown (one more call), failed first load = ErrorView, failed reload keeps rows + message, user currency, reload on tx / stale.
- Detail: ONE call on open; hero (status chip, Saved, "/ target · 65%", due + days left), three month tiles from BE, action bar flags (nothing saved hides ถอน / ย้าย), tabs + entries tab (auto tag, wallet), auto-save toggle = ONE PUT then ONE DELETE (page patched, no re-read), edit form is its own form (no tabs / status / tiles; live line; end zone with archive "Close the goal first"), 409 GOAL_HAS_SAVINGS on archive shows the close-first message, create form, failed load = ErrorView, failed refresh keeps the page, spare page, user currency, reload on tx / stale.

## Results
- `flutter test test/features/saving_goals test/ui/hub_coverage_test.dart test/ui/layering_test.dart` : all pass (34).
- Also run: `test/features/transactions/quick_create_saving_mode_test.dart`, `test/app/shell/cross_tab_links_test.dart` : pass (they use the changed domain).
- `flutter analyze lib/features/saving_goals lib/ui lib/hub test/features/saving_goals` : No issues found.
- Did not run the whole test folders (as ordered). Tests using `ActionBar` elsewhere (budgets, recurring, edit_mode_mixin) not run; the only change is a looser assert (1–4 instead of 2–4).

## Decisions taken
1. Month bar and the right caption "ออมแล้ว ฿X / ฿Y" omitted on the list card · the summary has no month plan / saved totals and the FE must not sum rows · ask BE (below), then add `bar:` to `_summary`.
2. "เดือนนี้ขาดอีก ฿x" is the card's amber `alert` line (shown only when > 0) · the card has one info line and it is the spare link · move to a tile if the owner prefers.
3. Sort chip "⇅ ใกล้ถึงก่อน" not built · the API has no sort param, and ordering is "from the BE" · add a `SortChip` when BE gets `sort=`.
4. A third list group "ยังไม่มีแผนรายเดือน" for active goals whose `month_short` is null (no deadline / no auto-saving) and not reached · otherwise they would read as "ครบแล้ว ✓" · drop the third group in `_children`.
5. "ครบแล้ว ✓" group = `month_short == 0`, or null + reached / closed; "ยังขาด" = `month_short > 0` (classification only, no sums) · matches BE semantics · tweak the predicates.
6. By-wallet breakdown card removed from the view · the reference's ภาพรวม has none (the data is still parsed and feeds the withdraw / move split sheets) · re-add a `SectionCard` of `BreakdownRow`s in `_overviewTab`.
7. Chart only with 2+ entries on the first page (`entries.items.length >= 2`) and history from the BE; no plan / projection line · the BE sends none and the old projection was client-computed · see BE request 2.
8. Auto-save ON default = `month_plan ?? needed_monthly`, day 25, no wallet; with no plan the amount sheet opens instead · spec says "shown/default values", 25 is the reference's example · change `_defaultAutoSaveDay`.
9. The auto-save toggle stays live in edit mode (its own call, not part of the draft); hidden while creating and for closed / archived goals (BE answers 409 GOAL_NOT_ACTIVE) · hidden-not-greyed rule · remove `_editSettings`.
10. Archive row stays visible in the end zone while the goal holds money, consequence "ปิดเป้าหมายก่อน", tap shows the close-first message with no call; a 409 GOAL_HAS_SAVINGS from archive or delete maps to the same words · owner's rule · gate on `actions.archive` only.
11. Delete confirm has no BE preview (no goal delete preview exists in openapi) · plain confirm "ลบถาวร พร้อมประวัติการออม" · add `include=delete_preview` later.
12. Failed reload with data on screen = snackbar "รีเฟรชไม่สำเร็จ…" on both pages (via the page's own messenger) instead of an inline `AppMessage` · an inline banner would need own padding in the feature · swap for `AppMessage` if a kit slot appears.
13. กู้คืน (restore) for a closed / archived goal is the single action under the hero card (`actions.restore`) · EndZone has no restore kind and edit mode hides it for those goals · move if the owner wants it elsewhere.
14. Saved money with NO wallet: split rows get a no-wallet row and the move / withdraw sends NO `splits` (the BE auto-splits) · a wallet-less part has no wallet id to send · confirm with BE how a wallet-less part should be sent.
15. Spare page gets ออม / ถอน / ย้าย + auto-saving + entries, no edit and no ✏️ · it shares the page and has the same money moves · hide the action bar in `_actionBar` for spare.
16. ActionBar relaxed to 1–4 actions · see above · restore the assert if a bare single button is unwanted.
17. `ListSummaryCard` / `AddTile` / `DetailSections` / `SavingTxRow` got small additive params (see Kit) instead of feature-side padding or layout.
18. Spare `auto_save` is the object `{amount, day, wallet, next_date}`, goal `auto_save` is read from the goal · per the contract.

## Requests to BE (nothing is computed in the FE for these)
1. `GET /saving-goals` `summary`: add `month_plan_total` and `month_saved_total` (Σ of the active goals' `month_plan` / `month_saved`) so the card can show the bar and "ออมแล้ว ฿X / ฿Y".
2. Goal / spare page `history`: add the plan line (per month, the cumulative a plan-following saver would have) so the chart can draw "ตามแผน" (the reference's dashed line) without a client projection.
3. Optional `sort=` on `GET /saving-goals` (e.g. `eta`, `short`, `progress`) for the "⇅ ใกล้ถึงก่อน" chip.
4. Optional delete preview for a goal (`include=delete_preview`: entry count, money that would leave) for the confirm dialog.
5. Please confirm: for reached / closed goals is `month_short` 0 or null? (the list puts null + reached into "ครบแล้ว ✓").
6. Please confirm how move / withdraw should send a wallet-less part (see decision 14).

## Unfinished / notes
- Not run on a device or the web build (owner runs the app); layout was checked through widget tests only.
- The tab-per-page shell (`openPage`) links from the old page (recurring `/recurring/new?type=saving&goal=`) were removed with the old auto-save row; recurring has no ออม type any more (BE M4).
- `savingGoal*` / `sgv2*` strings that are no longer used (stale wording about linked wallets) were left in the ARBs (not mine to prune).
