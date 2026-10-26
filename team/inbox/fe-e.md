
## Handoff 2026-10-13
Role: FE-E (wallets, categories, tags, contacts, budgets, scheduled transactions, saving goals). Full history of reports: `ai/inbox/fe-plans.md` (the 0.3.1-10 PROPOSAL for budgets / scheduled / goals is its first entry).

**Unfinished / open**
- 0.3.1-10 redesigns of budgets / scheduled / goals NOT started (only today's behaviour on the hub kit + API v2 minimal fixes). The proposal asks BE for 11 things (page-ready list/detail per feature, `status` filters, `GET /:id`, history/upcoming embedded, archived-wallet rule, `required_monthly`, free capacity) and the owner 5 questions (create flow in FormSheet, past periods, goal on archived wallet, scheduled lifecycle, warn threshold): none answered yet. The percent decimals / date picker (`showAppDatePicker`) it needed are now in the kit.
- Open owner/kit points: account overview note sits alone in its top box (accepted); wallet create is positive-only (adjust-balance covers negatives via `allowNegative`); wallets summary "shared pot" uses `totals.shared_balance`; raw `showDatePicker` remains in transactions/debts files (not mine).
- Not verified on a device: every UI change this round was analyze/test-checked only (the owner reviews in the app / hub).

**Gotchas**
1. Every cubit's `load()` emits `loading` first: pass the template `loading:` only when the list is EMPTY (first load), or the skeleton replaces the list and kills pull-to-refresh (FE-B now also enforces it in the templates). Detail pages pass `DetailPageBody(onRefresh: <the one open call>)`, never a hand PullToRefresh.
2. Thin FE: one call on open, patch from write responses (`AccountsCubit.patchBalances` for `account_balances`), no reloads after writes; wallet create maps credit/pay-later positive input to a NEGATIVE balance in `_openingBalance` (account_detail_page).
3. Sheets = presentational organism in `lib/ui/domain/*` (plain params in, plain result out, no features/l10n imports; layering test) + thin wrapper in the feature that keeps the old function name; every new ui piece needs `ui.dart` export + a hub `covers` entry (hub_coverage test) and raw-widget hits only go down (`UPDATE_BASELINE=1 flutter test test/ui/raw_widgets_test.dart`).
4. Detail pages: description lives in the hero (`HeroDescription`), heading-less groups merge into ONE top box (icons all-or-none, note via DetailStacked), tint via `iconCode.tintFor` (budget keeps its status colours), description/hero name labels come from the kit. ListToolbar puts filter/sort chips one size down (ChipSizeScope → chip 28) under the 40 search capsule; the chip row fades its right edge instead of clipping. Never re-add `MediaQuery.paddingOf(...).top` on list pages (templates clear the top bar).
5. Flutter only via `/c/Users/poomp/fvm/versions/3.47.3/bin/flutter`; run the full suite at most once per change (it takes minutes and flaky edit_mode tests can fail under load: rerun them alone); sub-agents must not edit `ui.dart` / `hub_registry.dart` concurrently (collect export lines + HubPage entries and add them serially); shell `node -e` with backticks inside double quotes eats the backticked text.

## 2026-10-20 12:38 — Budgets list + budget items + transactions list redesign (E1–E3) and the over-total ring fix
DONE · files: features/budgets/presentation/pages/budgets_list_page.dart, budget_detail_page.dart (items tab: `_itemsTab` / `_itemRows` / `_itemRow`), features/transactions/presentation/pages/transactions_list_page.dart, l10n app_th/app_en.arb + gen x3 (hand-edited) · analyze: clean on the changed files · tests: not run (owner has not said go)
- E1 budgets list: the `_summary` hero is HeroRingRow (ring "เหลือรวม", facts ใช้ไปรวม / ใช้แล้ว N% / งบในรอบนี้) + HeroFilterChips (same cubit.setHealth). Rows sit in one SectionCard (`rowCards: true`); the AddTile moved to `footer`. ProgressCard gets `paceBubble` "แผนถึงวันนี้ ฿x" (x = amount × pace fraction) when the pace fraction exists.
- Over-total fix (asked by นายA-fe): when `totalRemaining < 0` the ring label is `fpBudgetsOverLabel`, the amount is `totalRemaining.abs()`, and the ring color is `AppColors.expense`.
- E2 budget items: `rowCards: true`; DateGroupHeader total = −(sum of the day, expected rows included); the "นับเพราะ…" meta is removed; the source chip shows only for non-normal sources (รายการประจำ / อีเว้นท์ / รอจ่าย), matching decisions.md; wallet chip has fill + glyph and #tags like transaction_tile; the unused `Budget b` parameter of `_itemRow` is dropped.
- E3 transactions list: `rowCards: true` (removed `sidePadding: 0` and `rowDividers`); the wallet-locked AddTile moved from `_rows` to `ListPageBody.footer` (default variant, outside the card).
- New l10n keys: bgPaceBubble(amount), bgRingTotalLeft, bgFactUsedTotal, bgFactUsedPct, bgFactBudgetCount, bgCountBudgets(count) (after bgFactPlanToday).
notes: item #tags are the primary color because BudgetItem.tags are names only (BE must send `icon_code`, already in backlog). `bgSummaryRemaining` and `bgHeroOfLimit` are no longer used (in backlog "0.4.0-2 leftovers"). `budgetReasonText` + fpBudgetsReason* left in place.

## 2026-10-20 12:38 — Wallet detail redesign, Part 2 (2a–2f) with นายB-fe / นายD
DONE · files: features/accounts/presentation/pages/account_detail_page.dart, features/transactions/presentation/pages/transactions_list_page.dart, l10n app_th/app_en.arb + gen x3 (hand-edited) · analyze: `flutter analyze lib test` clean · tests: not run
- 2a hero: header leading = type chip, masked identifier chip, `MemberAvatarStack(size 28, maxVisible 3)` when shared (the "แชร์ N คน" chip is gone). `HeroIdentity.trailing` = `HeroFlowBox`. The credit balance label is "ยอดใช้ไป". Savings bar = `HeroBar.split` with the big legend ใช้ได้ / ออมไว้; `savedExceedsBalance` paints the saved part and amount in warning and adds a HeroAlert "ออมไว้เกินยอดในกระเป๋า ฿{overBy}" (also when balance <= 0). Credit = `HeroBar.split` with a used part, legend "ใช้ไป N%" / "เหลือใช้ จากวงเงิน ฿limit"; the due HeroAlert is kept.
- 2b: the page owns `ValueNotifier<TxPeriod> _period`, passed to `TransactionsListPage(period:)`. The list writes it in `_apply` / the initial post-frame and follows it in `_onPeriod`. The box: this month = a.monthIn / a.monthOut; other periods = `summaryForAccount`, cached per period (cleared when the account changes), keeping the last values while loading and on an ApiException. Label: "ต.ค. นี้" / short month / "MMM yyyy" / year / day, else `period.label`. ‹ › use `period.step` (‹ off for all/custom, › off when the next period is in the future).
- 2c: `headerTiles` + `_monthTiles` removed (the `headerTiles` param is dropped from TransactionsListPage).
- 2d: overview order = info → ออมไว้ใน → สมาชิก → การตั้งค่า → โน้ต → meta. DetailSections has a fixed order, so the overview tab lays its sections out inline with `HeroMetrics.after` gaps. "ออมไว้ใน" = SectionCard + one DetailRow per bucket (IconCodeWidget 36, name, MoneyText, chevron) → `/saving-goals/{id}` or `/saving-goals/spare`; hidden with no buckets.
- 2e: ↑ / ↓ call `_toggleTxType`; the box shows the selected state from `_txType`.
- 2f new keys (next to fpWalletSavedLegend): fpWalletSavedInTitle, fpWalletSavedInDesc, fpWalletThisMonth(month), fpWalletAvailableLabel, fpWalletSavedLabel, fpWalletSavedOverAlert(amount), fpWalletCreditUsedLabel, fpWalletCardUsedLabel(pct), fpWalletCardAvailableLabel(limit).
deviations/notes:
- The box is hidden only when the period is THIS month and it has no in and no out (not any empty month), so a past empty month does not take ‹ › away. Owner may want it otherwise.
- The box also shows for credit wallets (↑ payments / ↓ spending from a.monthIn / a.monthOut). The old tiles were hidden for liability; whether the BE fills monthIn / monthOut for credit is NOT confirmed. Wallets with trackBalance off have no box.
- The credit bar passes a 0-ratio second part only so the right legend dot has a color; a "no dot color" option on HeroBar.split would be cleaner (kit, นายD).
- Now unused, for the cleanup list: fpWalletMonthIn, fpWalletMonthOut, fpWalletCardUsed, accountSharedWith (check other pages first). Not verified on a device.

## 2026-10-20 13:10 — PLAN (not coded): 0.4.0-2 E1–E4 scan
PLAN ONLY · read-only scan, no edits, no tests. Waiting for the owner's "จัด" via นายA.

### E1 Budgets list hero
- Files: features/budgets/presentation/pages/budgets_list_page.dart (`_summary`, the non-active hero branch), l10n app_th/app_en.arb + gen x3.
- Exists: HeroRingRow / HeroRing / HeroFactList / HeroFilterChips (my E1 already uses them); `StatusChip` + `StatusKind.active / warning / over` with `bgStatusOnPlan` / `bgStatusAhead(amount)` / `bgStatusOverBy(amount)` (the budget detail hero builds the same trio at budget_detail_page.dart ~724); `budgetPaceFraction(start,end,now)`; the summary totals (`s.totalUsed`, `s.totalLimit`).
- Missing: A2 module icon tile; A3 bold summary chip; A1 `HeroFact` icon (HeroFact has `dot` now, no `icon`); AppIcons for receipt / pie / layers. The app-side "sum of plan to date" is not computed anywhere.
- Plan:
  1. Replace `HeroCaption(bgSummaryUsedCaption)` with the module tile + summary chip in the hero header (no stepper).
  2. Chip rule: `totalUsed > totalLimit` → over "เกินงบ ฿(used−limit)"; else `totalUsed > Σplan` → warning "ใช้เร็วกว่าแผน ฿(used−Σplan)"; else "ตามแผน".
  3. Σplan = Σ over `state.budgets` with `b.state == active` of `b.period.amount × budgetPaceFraction(...)`.
  4. Rename the two keys' Thai text (เหลือทั้งหมด / ใช้ไปทั้งหมด; en unchanged), add the fact icons (receipt / pie / layers).
- Kit API wanted from A:
  - `HeroModuleTile(icon)`, 40px, takes the card colors, for HeroHeader.leading.
  - `HeroSummaryChip(label, tone)` where tone is HeroColors-based: card (on plan) | warning | danger. Or tell me to use `StatusChip(kind: …, size: control)` if that is what A3 is.
  - `HeroFact(icon:, iconColor:)`.
- BE: none.
- Risks / open questions:
  - Open-ended budgets (no end date) have no pace, so they have no plan. The summary `totalUsed` includes their usage, so "ahead" would be inflated. Proposal: compare Σused of the budgets that have a pace with Σplan of the same set, and use `totalUsed > totalLimit` only for "over". Needs owner/A OK. (Q12 wording change is a plain text swap.)
  - `state.budgets` might not hold every active budget (filter / paging); I will check the cubit before coding.
  - The chip is computed on the device clock; the BE `pace` may differ by hours (same as the row bubble today).
  - `bgSummaryUsedCaption` becomes unused → backlog cleanup list.
- Size: M (S once A2/A3 land).
- Tests likely affected: test/features/budgets/budgets_pages_test.dart; test/ui/feature_visuals_baseline.txt (ratchet).

### E2 Budget detail fact icons
- Files: features/budgets/presentation/pages/budget_detail_page.dart (`HeroFact(...)` list ~806–818 only).
- Exists: the 5 facts (bgFactUsed / bgFactPending / bgFactPlanToday / fpBudgetsTileDaily / bgFactNextRound).
- Missing: A1 `HeroFact(icon:)` and AppIcons receipt / clock / trendingUp / calendar / repeat (AppIcons has `recurring = Icons.repeat`; the rest are not there yet).
- Plan: add `icon:` to each of the 5 facts. Nothing else.
- Kit API: `HeroFact(icon: IconData?, iconColor: Color? = card color)`; AppIcons names `receipt`, `clock`, `trendingUp`, `calendar`, `repeat` (or reuse `recurring`).
- BE: none. Risks: none. Size: S.
- Tests likely affected: test/features/budgets/budgets_pages_test.dart.

### E3 Wallet detail hero (replaces mock 9iiH… and my Part 2 layout; builds on นายB's `below` change)
- Files: features/accounts/presentation/pages/account_detail_page.dart (`_viewHero`, `_flowBox`, `_heroBar`, `_periodLabel`; `_savedInSection` stays), features/accounts/presentation/widgets/wallet_compact_hero.dart (only if the compact bar shows the type chip, to check), l10n arb + gen.
- Exists: `_period` notifier + `_flows` cache + `summaryForAccount` (the month data is done); `_txType` / `_toggleTxType`; `MemberAvatarStack`; `_effectiveScope` + `walletReportScope*` keys; `a.dueDateNext` / `a.daysUntilDue`; `HeroAlert`; `AppChip`; `HeroBar.split`; `HeroFactList`; `_openMembers`.
- Plan (top to bottom):
  1. Identity row: icon + name + description + ✏️ (owner only). The type chip leaves the top right.
  2. "ยอดในกระเป๋า" HeroNumber on a full row (credit: "ยอดใช้ไป").
  3. Split bar (HeroBar parts only, no legend) + `HeroFactList` under it: ใช้ได้ (coin, available color) / ออมไว้ › (piggy, saved color; tap target below). Over-saved keeps the warning part + HeroAlert. Credit: used / available facts with the card icon.
  4. One month row [‹][เงินเข้า ต.ค.][เงินออก ต.ค.][›], fed by the existing `_period` / `_flowOf`; ↑ / ↓ taps keep calling `_toggleTxType`; › is dim on this month.
  5. Bottom chip row: type | report scope | members (MemberAvatarStack inside a chip, tap → `_openMembers`) | a due-date chip for credit.
  6. No-balance wallet: only the month row; the "ไม่ติดตามยอดเงิน" line becomes the chip "จดแค่รายการ" (Q11 recommended); drop `walletTrackOffHero` usage.
- Missing: A9 month row; A10 member chip; A1 fact icons (colored by the segment color); bar legend off option; AppIcons coin / piggy / card.
- Kit API wanted from A:
  - `HeroFlowRow(monthLabel, income, expense, onPrev, onNext, onTapIncome, onTapExpense, selected)`, where › is null on this month. Labels "เงินเข้า ต.ค." / "เงินออก ต.ค." come from the page.
  - `HeroBar.split(showLegend: false)` (parts only). The big legend D shipped would then be unused here.
  - `HeroFact(icon:, iconColor:)` + `onTap` chevron (exists).
  - `MemberChip(members, size, maxVisible, onTap)`.
  - AppIcons: coin, piggy (savingDeposit exists), card.
- New l10n keys (mine): fpWalletRecordOnly "จดแค่รายการ", fpWalletFlowIn(month) "เงินเข้า {month}", fpWalletFlowOut(month) "เงินออก {month}", fpWalletDueChip(date) "ครบกำหนด {date}", possibly fpWalletScopeOwn "เฉพาะของฉัน". The available / saved fact labels and the credit facts reuse existing keys (fpWalletAvailableLabel / fpWalletSavedLabel / fpWalletCardUsedLabel / fpWalletCardAvailableLabel). Now unused → backlog: walletTrackOffHero, fpWalletThisMonth (if the row shows the plain month; to confirm), HeroFlowBox usage.
- BE: Q14 / C7 only (credit-card month_in ≈ 0 shows "เงินเข้า ฿0" until the BE counts incoming transfers as card payments). No new field is needed for E3.
- Risks / open questions (owner or A):
  1. Where does the masked identifier chip go? A's bottom row lists type | scope | members | due, and the identifier is not in the mock list. Proposal: keep it under the name (HeroIdentity.fact) with the description, as นายB placed it.
  2. Credit due date: a bottom chip AND the existing amber HeroAlert would be a duplicate. Proposal: chip always; the alert only when ≤ 7 days.
  3. "ออมไว้ ›" target. Proposal: switch to the overview tab (the "ออมไว้ใน" section is there), or /saving-goals. Owner's call.
  4. Report scope chip: label text. The arb has "เฉพาะที่ฉันจด", A's list says "เฉพาะของฉัน". Reuse the existing key or add a new one? Is the chip tappable (the OptionMenuAnchor in settings can change it)? Proposal: read-only chip, the settings row stays the way to change it.
  5. The month row always shows for trackBalance wallets (even ฿0 / ฿0) since it is also the month navigation, unlike my current "hide when this month is empty". Needs owner OK (replaces the pending question I sent before).
  6. The hero gets taller; the compact-hero scroll threshold is measured from `_heroKey`, so it should adapt, but it needs a device check.
- Size: L (kit pieces + a full `_viewHero` rewrite + 4–5 keys).
- Tests likely affected: test/features/accounts/wallet_track_balance_test.dart; test/features/accounts/wallet_savings_section_test.dart; test/features/accounts/accounts_page_toolbar_test.dart (check); test/ui/feature_visuals_baseline.txt; test/ui/page_refresh_baseline.txt.

### E4 Transactions list: module icon + future-dated rows
- Files: features/transactions/presentation/pages/transactions_list_page.dart (`_summary` header, `_rows`), features/transactions/presentation/widgets/transaction_tile.dart, l10n if the day-count text is new.
- Exists: `TxRow.dimmed` (opacity 0.55); `DueText` in lib/ui/domain/recurring/due_text.dart (to read for the exact API when coding); `Transaction.date` (yyyy-MM-dd); `_summary` header has the period pill + eye + search toggle.
- Missing: A2 module tile; a TxRow slot for the "อีก N วัน" tag (TxRow has `statusChip` / `extra` today; I want A to say which); allowing the list's period to go forward into the future (`TxPeriod.canStepForward` stops at today, and `canSwipe` uses it).
- Plan:
  1. Module tile in the `_summary` HeroHeader.leading beside the period pill.
  2. TransactionTile: `dimmed: date.isAfter(today)` + the day-count tag.
  3. Let `canStepForward` / `canSwipe` allow future periods for the list (the wallet hero › stays dim on this month per A9; the two rules must not clash).
- Kit API: `HeroModuleTile(icon)` (shared with E1); a TxRow option such as `due: String?` (or tell me to pass `DueText` into `statusChip`).
- BE: C1 (future-dated tx stay in the transactions table; totals / balances ignore them). Before C1, no future rows exist, so the FE part can be coded but not seen working.
- Risks / open questions:
  - What the hero totals and the daily bars do for future days (the BE excludes them after C1; the bars already have DailyBarKind.future).
  - Day-count wording and boundaries: today = no tag, tomorrow = "อีก 1 วัน".
  - Sorting 'date_desc' puts future rows first; confirm that is wanted.
- Size: M (S for the FE bits; the wait on C1 is the real cost).
- Tests likely affected: test/features/transactions/transactions_list_summary_test.dart; test/features/transactions/tx_list_redesign_test.dart; test/features/transactions/transaction_tile_refs_test.dart; test/ui/tx_row_marker_test.dart.

### Order I would take
E2 (needs only A1) → E1 (A1–A3) → E3 (A1, A9, A10) → E4 (A2, then BE C1). Hand-edited l10n only; analyze before each report; no tests until the owner says.

## 2026-10-20 15:30 — 0.4.0-2 E1–E4 built (after the owner's "ลุย")
DONE · files: features/budgets/presentation/pages/budgets_list_page.dart, budget_detail_page.dart (hero facts only), features/accounts/presentation/pages/account_detail_page.dart, features/transactions/presentation/pages/transactions_list_page.dart, widgets/tx_period_pill.dart, widgets/transaction_tile.dart, l10n app_th/app_en.arb + gen x3 (hand-edited) · analyze: my files clean (`flutter analyze lib test` shows one error, in lib/hub/pages/sheet_demos/quick_create_demo.dart: `AppIcons.skip` undefined, another session's in-progress work) · tests: not run
- E1 budgets list hero: `HeroModuleTile(AppIcons.budget)` + a summary `StatusChip(emphasis)` in HeroHeader.leading (search toggle only in actions). Chip: `totalUsed > totalLimit` → over (bgStatusOverBy); else Σused > Σplan over the active budgets that have a pace (no end date = no plan) → warning (bgStatusAhead); else on plan (primary tone). The ended / archived hero gets the module tile too. Fact icons: receipt / pie / layers. Thai text: bgRingTotalLeft "เหลือทั้งหมด", bgFactUsedTotal "ใช้ไปทั้งหมด".
- E2 budget detail facts: icons receipt / scheduled / trendingUp / date / recurring.
- E3 wallet detail hero (top to bottom): icon + name + description + ✏️ (owner) → balance HeroNumber full row (credit "ยอดใช้ไป") → split bar (no legend) + HeroFactList (ใช้ได้ = coin, ออมไว้ › = savings icon → overview tab; credit: used = creditCard, available = coin; icon colors = segment colors, warning when over-saved) → over-saved HeroAlert / credit due HeroAlert (no due chip) → `HeroFlowRow` [‹][เงินเข้า ต.ค.][เงินออก ต.ค.][›] (always shown, even ฿0 / ฿0 and for no-balance wallets; › dim on this month via `canStepForward`; ↑ / ↓ call `_toggleTxType`; amounts are "+฿x" / "−฿y") → bottom chips: type | report scope ("รวมในรายงาน" / "เฉพาะฉัน" / "ไม่รวมในรายงาน") | `MemberChip` (tap → members sheet) when shared. Removed: the masked identifier chip, the type chip beside ✏️, the "ไม่ติดตามยอดเงิน" line, the mode chip. The `_period` / `_flows` / `summaryForAccount` sync from Part 2 is unchanged.
- E4 transactions list: `HeroModuleTile(AppIcons.transactions)` before the period pill; future periods reachable (`canSwipe` = `period.step(dir) != null`; the pill's › uses `step(1)`); a row dated after today = `TxRow(dimmed: true, statusChip: DueText(withDate: false))` ("อีก N วัน" / "พรุ่งนี้"). No future rows appear until BE C1 lands. The money-visibility toggle stays in this hero (owner: only new designs leave it out).
- New l10n keys: fpWalletScopeOwnChip, fpWalletFlowIn(month), fpWalletFlowOut(month) (next to the fpWallet* block).
deviations/notes:
- The flow row is also shown for credit wallets (↑ payments / ↓ spending from a.monthIn / a.monthOut); credit month_in counts transfers in only after BE C7.
- On a non-month period the flow labels use the period text (e.g. "เงินเข้า 2569" for a year); "เงินเข้า ต.ค." for a month.
- Not verified on a device.
UNUSED now (for A18):
- l10n (grep-checked, no non-generated user left): bgSummaryUsedCaption, bgSummaryRemaining, bgHeroOfLimit, walletTrackOffHero, accountSharedWith, fpWalletMonthIn, fpWalletMonthOut, fpWalletCardUsed, fpWalletThisMonth, fpWalletAvailableLegend. NOT unused: fpWalletSavedLegend (wallet_card.dart still uses it).
- kit: HeroFlowBox (only the hub demo organisms_app_hero_card_page.dart uses it now), the `HeroBar.split` big-legend params (leftAmount / rightAmount / leftAmountColor / rightAmountColor; no page uses them now, the hub demo may).
- `MoneyVisibilityToggle` stays in use on other pages; only the budgets list stopped using it.
- `TxPeriod.canStepForward` is still used by the wallet hero (keep).

## 2026-10-20 16:10 — Budget items: #tag colors from tag_refs (BE C5)
DONE · files: features/budgets/domain/budget_detail.dart (BudgetItem.tagIcons), features/budgets/presentation/pages/budget_detail_page.dart (`_itemRow`) · analyze: lib/features/budgets clean · tests: not run
- `BudgetItem.tagIcons: Map<String, IconCode>` parsed from `tag_refs [{name, icon_code}]` (only names whose `icon_code` is a map get an entry); `tags` is unchanged.
- `_itemRow` colors each #tag with `tagColor(i.tagIcons[t], palette)`, the same helper as TransactionTile; a name without an icon (event tag, or an older BE without `tag_refs`) falls back to the primary color.
- Needs the BE rebuild (C5) to show; nothing else changes until then. The old backlog line "budget items send tags as names only" can be dropped after the BE is deployed.

## 2026-10-20 17:00 — A15 review fixes on E1–E4
DONE · files: features/budgets/presentation/pages/budgets_list_page.dart, features/accounts/presentation/pages/account_detail_page.dart, features/transactions/presentation/pages/transactions_list_page.dart (a doc comment), l10n app_th.arb + app_localizations_th.dart · analyze: my files clean (`flutter analyze lib test` shows 2 errors in test/features/recurring + test/features/transactions/recurring_link_test.dart: `_Repo.items` override and `RecurringItemLink`, someone else's in-progress recurring work) · tests: not run
- 1 (bug): one `overBy` (= −totalRemaining when negative) feeds both the chip and the ring.
- 2 (rule): the over ring color is `ProgressTone.danger.resolve(...)`, as on the budget detail page; no raw AppColors.
- 3 (bug): `bgSearchHint` ("ค้นหางบประมาณ") and `bgNoMatch` ("ไม่พบงบประมาณที่ตรงกัน") added to app_th.arb and app_localizations_th.dart.
- 4 (rule): the wallet split bar and fact icons take accent / warning from HeroColors (built inside the card with a Builder). Credit "available" icon = `hero.muted` (not the 25%-alpha accent). The saved part is `hero.accent` at 40% alpha (still derived from the card accent), or `hero.warning` when over-saved.
- 5 (bug): removed `_lastFlow`; `_flowOf` returns null while a period loads or after a failed fetch and the row shows "—" for both amounts; nothing is written to state during build.
- 6 (nit): the hero's › now follows the list: any period with a next step is enabled (the list steps into the future per R18). `TxPeriod.canStepForward` has no user left.
- 7 (nit): `_periodLabel` lost its unused `l`; the flow amounts use `signedMoneyString` (a zero amount is shown without a sign, so no "−฿0").
- 8 (nit): the bottom chip row is the kit `ChipRow`.
- 9 (nit): the `period` doc comment is 2 lines.
- 10 (nit): NOT done: `HeroStyle.tinted` has a required `color` and `AppHeroCard.style` is required, so the color argument cannot be dropped; `HeroStyle.plain()` would change the look (white card, no tint).
UNUSED now: `TxPeriod.canStepForward` (in addition to the earlier list).

## 2026-10-20 18:10 — Budgets list: ended / archived hero head; budget source future_tx (BE C1)
DONE · files: features/budgets/presentation/pages/budgets_list_page.dart, features/budgets/domain/budget_detail.dart, features/budgets/presentation/budget_labels.dart, l10n app_th/app_en.arb + gen x3 (hand-edited) · analyze: lib/features/budgets (+ transactions, l10n for the second part) clean · tests: not run
- Ended / archived hero: the HeroCaption is removed, so the head is the module tile + the search toggle on every tab (owner). The status dropdown still carries the ended / archived counts, so `bgFilterEnded` / `bgFilterArchived` stay in use.
- Σused is unchanged (sum over every budget, matching the ring), per the owner.
- BE C1: `BudgetSource.futureTx` ↔ wire `future_tx` (fromJson / toJson), label key `bgSourceFutureTx` (th "ล่วงหน้า", en "Upcoming") in `budgetSourceLabel`; the owner accepted the chip. The row is dimmed already (`counts_as` expected).
- E4 checked against C1: no further FE change. The tx list shows future rows dimmed with "อีก N วัน" and can step into future periods; the totals / daily bars are cut at today by the BE. Not run against the new BE yet (needs the rebuild + migration 068).
- Waiting on BE C7 (credit-card month_in) to verify the wallet flow row.
UNUSED now: none new.

## 2026-10-20 20:30 — BE items 5 + 3 of นายC's split: C7 (card month_in) and the readers wired to the Expecter
DONE (coded; build + vet only, NO Go test run, nothing deployed, BE not rebuilt) · files: internal/modules/accounts/{enrich.go,store.go,api_test.go}, internal/modules/budgets/{count.go,service.go,model.go}, internal/modules/dashboard/{store.go,service.go,model.go}, internal/modules/me/me.go, internal/apidoc/openapi.yaml · `go vet` clean for budgets / dashboard / me / accounts / shared; `go build ./...` fails only in recurring/occurrence.go:79 (`Occurrence{ItemID: iid}`: นายC's in-progress change, not touched) · no migration needed.

### Item 5 — C7 (credit-card month_in counts payments)
- `accounts/enrich.go` (`decorate`, month flow on the wallet list and detail): a transfer row (`type='transfer'`, category `system_kind = 'TRANSFER_IN'`, so the row on the card's own account) adds to `month_in` ONLY when the wallet type is `credit_card` / `pay_later`. Other wallets are unchanged (transfers stay neither in nor out). The future-tx cut (`last` capped at today) is kept. `month_out` is unchanged.
- `accounts/store.go` `SummaryAggregate` (`GET /accounts/{id}?include=summary`, the summary the app reads for other periods): same rule for `total_income`. The transfer-in categories are `include_in_report = false`, so the `include_in_report` filter lets those rows through only for a credit wallet's payments. `t.date <= today` stays.
- Test: `TestAccountPageNumbers` (accounts/api_test.go): the card now expects `month_in = 100` (it was 0) because the test already transfers 100 into the card; added a check that the summary agrees (card income 100 / expense 0, bank 400 / 200).
- openapi: `month_in` description (transfers IN count on credit wallets, up to today).
- FE: the wallet flow row already reads `a.monthIn` (this month) and `summaryForAccount` (other periods); nothing to change there. Not run against the new BE yet.

### Item 3 — readers wired to `shared.Expecter` (`WithExpected(e)`; nil = today's SQL)
- budgets (`budgets.Service.WithExpected`): `count.go` is now `countSQL(expected bool)` = head + the recurring branch + tail. With an Expecter, the recurring_item branch reads the computed occurrences from the JSON parameter `$11` (`jsonb_to_recordset`), so the AND-scope filter still applies. Rows keep `kind recurring_item`, `source upcoming`, `counts_as expected`. Only `type = expense` with `amount > 0` are passed (a stored item without an amount never counted). The description is `Name`, else the rule name; tags are resolved from `TagIDs` as before. `rule_id` and `slot` are new columns of every branch (null elsewhere), `item_id` = the stored id or null.
  - Row id: the stored item id, else a UUIDv5 of (rule id, slot), stable per occurrence (the `id` of a row with no stored item).
  - Item JSON: new `rule_id` + `slot`; `recurring` is a new `ItemRecurring` (like RecurringItemLink with a nullable `item_id`), built from the occurrence (rule name / icon, seq, total); stored rows still read the link from `recurring_items`. `shared.RecurringItemLink` is unchanged (transactions / goals still use it).
  - The transaction / pending branches still LEFT JOIN `recurring_items` (they are not the "recurring_item branch"; นายC reworks those links in C3).
- dashboard (`dashboard.Service.WithExpected`): `upcomingItems` asks `ExpectedBetween(today+1 .. today+14)` and drops `Due`. The row `id` = the stored item, else the rule id; new `rule_id` + `slot` on every recurring item (null on card_due), because a daily setting would otherwise repeat the same id.
- me (`me.Service.WithExpected`): `recurring.active_count` still comes from `recurring_rules`; with an Expecter `upcoming_count` (next 14 days, not due), NEW `due_count` (`Due`) and NEW `needs_amount_count` (`Amount == 0`, dated this month) come from ONE `ExpectedBetween(2000-01-01 .. max(today+14, end of month))`. Both new fields are 0 without an Expecter.
- openapi: BudgetItem (`rule_id`, `slot`, `recurring` → new `BudgetItemRecurring`), me counts (`due_count`, `needs_amount_count`), dashboard upcoming description.
- NOT done: Go tests for item 3 (no fake-Expecter test; นายA's C6), design/api/api-document.md.

### For นายC (wiring in cmd/api/main.go, yours)
- `budgetsSvc.WithExpected(recurringSvc)`, `dashboardSvc.WithExpected(recurringSvc)`, `meSvc.WithExpected(recurringSvc)` (each returns its `*Service`).
- `ExpectedBetween` needs for these readers: `Type` (budgets read `expense` only), `Amount` (0 = unknown), `Date` / `Slot`, `RuleName`, `RuleIcon`, `ItemID` (nil while computed), `CategoryID`, `AccountID`, `TagIDs`, `Seq` / `Total`, `Name`, `Due`.
- `me` calls it with `from = 2000-01-01` to get the overdue ones: the Expecter must clamp to the setting's own lower bound (your R23). It is called on every `/me/counts`, so it should be cheap.
- Budgets call it once per budget window (the current period's range, or today+30 for an open-ended budget).

## 2026-10-20 21:00 — Budget items: tap on a recurring_item row (checked, nothing changed)
DONE (no change) · files: none · analyze: n/a · tests: not run
- `_itemRow` in budget_detail_page.dart: `onTap: i.kind == 'transaction' ? () => openPage(context, '/transactions/${i.id}') : null`. A `recurring_item` row (source upcoming) has NO tap today, nor do `event_bill` / `pending` rows, so per the brief I skipped the `openOccurrence` wiring.
- `BudgetItem` does not parse `recurring` / `rule_id` / `slot` yet; with the BE's new `rule_id`, `slot` and a nullable `recurring.item_id` it can be added (parse them, then `openOccurrence(context, itemId:, ruleId:, slot:, onChanged: reload the budget)`) whenever the owner wants these rows to open the occurrence. Not done without that ask.

## 2026-10-20 21:40 — Budget items: a recurring_item row opens its occurrence
DONE · files: features/budgets/domain/budget_detail.dart (BudgetItem.ruleId / slot), features/budgets/presentation/pages/budget_detail_page.dart (`_itemRow` onTap) · analyze: lib/features/budgets clean · tests: not run
- `BudgetItem` now parses `rule_id` and `slot` (the item's `recurring.item_id` was already read as nullable `recurringItemId`).
- `_itemRow` onTap: `transaction` → the tx page (as before); `recurring_item` with a stored item id, or with a rule id + slot → `openOccurrence(context, itemId: item id ?? '', ruleId:, slot:, onChanged: (_) => _load())`, so a confirm / skip / link reloads the budget (hero + the first page of items); a row with neither (old BE) stays untappable; `event_bill` / `pending` stay untappable.
- `openOccurrence`'s `itemId` is a required non-null String; for a computed occurrence (no stored item) I pass `''` and the rule id + slot (it reads the occurrence by rule + slot in that case). A nullable `itemId` there would be cleaner (นายB's file, not changed).
- budgets now imports features/recurring/presentation/occurrence_actions.dart; if a cross-feature import ratchet exists it may need a baseline update (not run).
UNUSED now: none new.

## 2026-10-20 23:10 — C6 (my part): Go tests for the item 3 readers (written, NOT run)
DONE (written; `go vet` clean for budgets / dashboard / me / accounts incl. test files, `go build ./...` clean; NO test run, no commits, no rebuild) · files: internal/modules/budgets/expected_test.go (new), internal/modules/dashboard/expected_test.go (new), internal/modules/me/expected_test.go (new), internal/modules/me/me_test.go (guard fixed)
- Each file has a small `fakeExpected` (a `shared.Expecter` over fixed occurrences, filtered to [from, to] like the real one). Every endpoint hit goes through `apitest.Conform` (`getBudget`, `listBudgetItems`, `getDashboard`, `getMyCounts`). I did not edit openapi.yaml.
- budgets (4 tests):
  - `TestBudgetReadsComputedOccurrences`: a computed occurrence counts as expected (period expected 70, by_source upcoming 1 / 70); the item is kind recurring_item, source upcoming, counts_as expected, `recurring.item_id` null, `rule_id` + `slot` set, id = UUIDv5(rule, slot), seq / total and the occurrence name come through.
  - `TestBudgetComputedOccurrencesFollowTheScope`: with a category AND tag budget only the row matching both counts (10 of 10 / 20 / 30); with a wallet-scope budget only the scope wallet's row counts (40 of 40 / 50).
  - `TestBudgetStoredRowReplacesTheComputedOne`: the Expecter returns the edited stored row (own id, amount 90, moved date, same slot) instead of the computed one: counted once, the row keeps its slot and its `recurring.item_id`; total 160 with a second computed one.
  - `TestBudgetComputedOccurrencesNeedAKnownExpense`: an income and an amount-less (0) occurrence do not count.
- dashboard (2 tests): `TestDashboardUpcomingReadsComputedOccurrences` (computed row: id = rule id, `rule_id` + `slot`; stored row: its own id; a Due row and one past 14 days are absent; total_expense 400) and `TestDashboardUpcomingWithoutExpecterKeepsStoredItems` (the nil-Expecter guard: the stored item is listed, `rule_id` / `slot` null).
- me (1 test + 1 fixed): `TestMyCountsRecurringFromComputedOccurrences` (due 2 / upcoming 1 / needs_amount 1). The existing `TestMyCountsTileFigures` was the stored-items guard but inserted a rule-less item (rule_id is NOT NULL after migration 068) and expected 2 upcoming; I removed that insert, it now expects 1 upcoming and due / needs_amount 0.
- Spec gaps for นายB: none found by reading; the conformance of these tests with the new fields (`BudgetItem.rule_id` / `slot` / `recurring` = BudgetItemRecurring, me `due_count` / `needs_amount_count`) depends on my earlier openapi edits still being in the file he now owns.
- Risks when they are first run: the wallet-scope budget creation uses `scope.wallet_ids` only (no categories / tags); the user's timezone is assumed Asia/Bangkok (as the budgets fixture does).

## 2026-10-20 23:40 — budgets_test.go: TestBudgetRecurringCategory fixed for migration 068 (not run)
DONE (written; `go vet ./internal/modules/budgets/` clean; NO test run, no commits) · files: internal/modules/budgets/budgets_test.go
- The stored `recurring_items` row had no `rule_id` (NOT NULL after 068). The test now inserts an active `recurring_rules` row (Rent, expense, 50, monthly, on the fixture wallet) and a stored occurrence of it (seq 1, slot = date = the period end, same draft: expense 50, category Food), in one statement; a `t.Cleanup` deletes the user's rules (the fixture only deleted the items).
- What it asserts is unchanged: source upcoming 50, period expected 70 (50 + the 20 pending draft), still on the stored-items path (no Expecter), so it is also the budgets nil-Expecter guard.
- A grep of the module tests shows no other `INSERT INTO recurring_items` without a `rule_id` (budgets, dashboard, me all have one).

## 2026-10-21 — Tests for my folders (owner: "เทสเลย"; fix loop, 2 of 3 loops used): all pass
RESULT: test/features/budgets, test/features/accounts, test/app, test/shared: first run +228 / -11 (all 11 failures were in budgets and accounts; test/app and test/shared had none); after 2 fix loops every file passes (re-runs: the 4 failing files +46/-2, then the last 2 files +36 all passed). No product code was changed, only tests (stale expectations of the old UI, updated to the owner-approved designs). The `[E] unexpected_error ... Budget.fromJson` line in the log is the intended output of the "a malformed body" test, not a failure. No commits.
Files changed (tests only), one line each:
- budgets/budgets_pages_test.dart, list summary card: the head is the module tile + one summary chip (no "Current period | total used" caption); the ring reads "Left in total" / "of ฿12,000" with the "Total spent" fact; the old summaryTile keys became `heroFilter:<label>` (also the "a health tile is ONE call" test, now `heroFilter:Over budget`).
- budgets/budgets_pages_test.dart, budget page hero: ring target "of ฿8,000", facts Spent / Plan to date / Can spend per day, the "฿1,040 ahead of plan" chip and the "24 days left | 8/31" box replace the old bar caption and tiles (which are asserted gone).
- budgets/budgets_pages_test.dart, budget page body: no Time card or "Which spending counts" card in view mode (3 icon strips under the hero instead, then the note, above the tabs); the one-off budget test follows.
- budgets/budgets_pages_test.dart, items: no "Counted because" line; a chip only for the upcoming source ("Recurring | upcoming"), none for normal; tags as #name.
- budgets/budgets_pages_test.dart, edit form: the switch reads "Repeat" (was "Repeat every period").
- accounts/accounts_page_toolbar_test.dart: the list hero filters are chips (`heroFilter:Credit cards`); the All chip clears it (a chip selects, it no longer toggles).
- accounts/wallet_savings_section_test.dart: bank hero facts are label + amount ("Available", "Saved", ฿800); card hero reads "Used on the card", "Used 8%", "Available of the … limit".
- accounts/wallet_track_balance_test.dart: an untracked wallet shows no "Balance not tracked" line (Q11).
Still failing: nothing in my folders. Not run: the Go tests (นายC), the other folders (their owners).

## 2026-10-21 — test/app after นายB's /recurring page fix (isEmpty: _items == null): still green
RESULT: re-ran only the test/app files that touch /recurring or the shell (main_shell_test, more_page_test, cross_tab_links_test, page_presets_test): +32, all passed, nothing to fix, no file changed. No commits. (The fix loop count stays at 2 of 3.)
