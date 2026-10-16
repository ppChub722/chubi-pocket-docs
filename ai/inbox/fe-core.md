# fe-core inbox (newest on top)

## 2026-10-16 — Wallet detail hero ✏️ → standard slot
Full analyze/test: see ping. No commit. Only file: `lib/features/accounts/presentation/pages/account_detail_page.dart` (hero top-row ✏️ is now `CardActionButton(AppIcons.edit)`, same as HeaderCard / TxHeroCard). No lib/ui change. Every hero ✏️ is now the same 40px slot.


## 2026-10-16 — Hero ✏️ into the same action slot
analyze 0 · tests 918 pass / 0 fail (full run). No commit.
- Kit exception files: `lib/ui/molecules/card_action_button.dart` (size 32→40 = the one control height; icon 20) · `lib/ui/organisms/header_card.dart` (`onEdit` now renders `CardActionButton(AppIcons.edit)` instead of `AppIconButton.edit`; same position: top row right of `topActions`, or title row when no top row) · `lib/ui/domain/transactions/tx_hero_card.dart` (same swap for its ✏️). Test: `test/ui/toolbar_toggle_test.dart` (HeaderCard ✏️ is a CardActionButton of the standard size).
- So every hero ✏️ and every summary-card 🔍 are the same 40px outlined round button. `AppIconButton.edit` stays for list headers (✏️ reorder rows).
- A hero needing both ✏️ and 🔍 passes the 🔍 in `topActions` (left of ✏️); no new param needed.
- Not touched: wallet hero in account_detail_page (line ~1531 uses AppIconButton.edit for its own row) — say if it should switch too. Transactions / Events summary cards not started (waiting for the owner's pick).


## 2026-10-16 — Task 4: summary-card 🔍 + collapsible toolbar, status dropdown, Budgets redesign
analyze 0 · tests 917 pass / 0 fail (full; `connection_cubit_test` failed once under load, passes alone and on rerun — timing flake, not ours). No commit.

### lib/ui / lib/hub files touched (owner-approved exception) — library AI must port
- NEW `lib/ui/molecules/card_action_button.dart`: `CardActionButton(icon,onTap,tooltip,selected,showDot)` — the standard top-right action slot (32px round, red dot `ValueKey('cardActionDot')`). Exported in `ui.dart`.
- `lib/ui/templates/list_toolbar.dart`: `ListToolbar(collapse: ToolbarToggleState?)` (AnimatedSize hide/show); NEW `ToolbarToggleState` (ValueNotifier<bool>; `.of(pageKey)` remembered per page for the session, closed by default; `.local()`; `.toggle()`; `.resetAll()` for tests) and `ToolbarToggleButton(state, filtered, tooltip)` (the 🔍, dot while hidden + filtered). ListPageBody unchanged (header list already hosts the toolbar).
- `lib/ui/domain/money/debt_summary_card.dart`: new `action:` slot after the 👁.
- `lib/ui/atoms/add_tile.dart`: card variant minHeight 64→44, row 48→44, vertical padding xs, icon 20.
- `lib/ui/molecules/progress_row.dart`: new `marker` (0..1 pace tick, `ValueKey('progressMarker')`).
- `lib/ui/domain/progress/progress_tone.dart`: new `ProgressTone.normal` (= primary/teal).
- `lib/ui/domain/progress/progress_card.dart`: new `trailing` (far right of the name line), `paceMarker`, `alignWithTitle` (bar + footer under the title column); percent text not tinted for `normal`.
- hub: `lib/hub/pages/toolbar_toggle_demo.dart` (new, in the List page template page), progress page marker demo, `hub_registry.dart` covers += ToolbarToggleState / ToolbarToggleButton / CardActionButton. Tests: `test/ui/toolbar_toggle_test.dart`.
- NOT done: "detail heroes that already have ✏️ get the same slot" — only summary cards (Debts, Budgets, Goals, Recurring, Wallets) use the slot; HeaderCard/hero not touched. Say if wanted.

### Pages
- 🔍 in the card + hidden-by-default toolbar, red dot (search text / non-default status / non-default sort): Budgets ('budgets'), Saving goals ('saving_goals'), Recurring ('recurring', hidden on the upcoming tab), Debts ('personal_debts', via `action:`), Wallets ('wallets': new name search + existing sort inside the toolbar, ✏️ reorder kept on its own row; local name filter).
- Status = ONE dropdown chip "สถานะ: … ▾" (OptionMenuAnchor + AppChip): Budgets (ใช้งาน/จบแล้ว/เก็บถาวร), Saving goals (กำลังออม/สำเร็จ/เก็บถาวร), Recurring (ใช้งาน/เก็บถาวร/ทั้งหมด; count chips gone).
- Budgets: new `budget_summary_card.dart` — used / limit, bar, "เหลือรวม ฿X · N%", 4 tappable tiles (ทั้งหมด/ปกติ/ใกล้เต็ม/เกินงบ, ring when selected, tap again clears) → server `?health=` (one call). Row: "เหลือ ฿X" / red "เกิน ฿X" right of the name, short caption "รายปี · เหลือ N วัน", bar+footer under the title, teal→amber→red, pace tick from period start/end (`budgetPaceFraction`, unit-tested), "ตามเพซจะเกิน" mini badge, no .00 on whole amounts. Summary card shows only on the active status; ended/archived get a compact card (caption + 🔍). BE fields used: summary.total_limit/total_used/total_remaining/used_pct/counts{all,ok,near,over}, period.on_pace_to_exceed, `?health=normal|near|over`.
- Recurring: card wired to BE `summary` (parser already matched); search now uses BE `q` (one call per change, stale responses ignored).
- Notes: `MoneyVisibilityToggle` renders nothing while `kMoneyPrivacyEnabled` is off, so the 👁 is not visible yet; kit `moneyString` has no decimals option (budgets use `budgetRowMoney` via CurrencyFormatter) — a `decimals` param would let that helper go. Old arb keys bgStatActive / bgStatPace now unused.


## 2026-10-16 — Task 3: list pages = Debts pattern (Budgets / Saving goals / Recurring)
analyze 0 issues · tests 902 pass / 0 fail (full run). No commit, lib/ui untouched.
Pattern on all three: ListPageBody, summary card margin (lg,sm,lg,xs) → ListToolbar with search + chips → hairline rows (rowDividers) on the page background → AddTile; topInset sm.
- **Budgets:** plain AppCard with caption + 4-stat StatGrid above the toolbar; search by name (local filter in BudgetsCubit: `query` / `visible` / `search()`; `GET /budgets` has no `q`); no-match empty view. Rows (ProgressCard) were already hairline.
- **Saving goals:** AppCard with "saved in total" + big total + StatGrid (in goals / not allocated), no more clipped SummaryStats; toolbar with search + Saving/Reached/Archived; first row = "Not allocated" ListRow with the 🐷 IconTile (Saving chip, no search only), then goal ListRows. Search local (API has only `status`).
- **Recurring** (recurring_home_page.dart): card → tabs → toolbar (recurring tab only) → rows. New feature-level `recurring_summary_card.dart` + `domain/recurring_summary.dart`; local name search. Divider indent kept 64 (TxRow text starts at 64), not 72.
- Tests: one new test per page (inset card above toolbar, search, first row, order); existing prod-shaped / failing-load tests pass.
- **BE gaps:** (1) `GET /recurring` needs top-level `summary: {month_pay, month_receive, next: {name, date, amount, type} | null}` (month totals of active recurrings). Until then the card shows "—" in the boxes (FE reads `body['summary']`, null-safe). (2) Optional `q` on `GET /recurring`, `GET /budgets`, `GET /saving-goals` for server-side search (FE filters loaded rows today).
- Profile currency call checked against BE `UpdateProfileRequest` (currency optional, 3 letters): matches.


## 2026-10-16 — 0.3.1-11 FE (currency + logic bugs)
analyze 0 issues · tests 898 pass / 0 fail. No commit.

**Currency**
- New `lib/core/utils/user_currency.dart`: `context.userCurrency`, `userCurrencySymbol` (select; build() only), `readUserCurrencySymbol` (read; use in builders/handlers). All feature symbols now come from the user's currency (accounts, notifications, recurring, goals, events, budgets). Removed `ProjectView.userCurrency/currency/symbol` + 'THB' fallbacks.
- `CurrencyFormatter`: decimals follow the symbol (¥ = 0), `decimalsOf(code)`; tests added.
- Profile: currency editable (CurrencyTile in edit mode) with a confirm dialog "not converted"; `UsersRepository.updateMe(currency:)`. arb: profileCurrencyChange{Title,Message,Confirm}. NEEDS BE: `PUT /users/me` accepting `currency` (not checked against the new OpenAPI).
- App never sends currency except register (picker kept: decisions say "picked at first setup"; brief says no picker on any form — Lead to decide) and profile.

**Bugs**
- Recurring: the list already shows paused (status=current = active+paused; filter chips exist), test added. Detail went stale after item writes (add/edit/delete/batch/last installment): quiet `GET /recurring/{id}` after them (`_syncRecurring`). BE idea: return the recurring in item-write responses.
- Budgets: list/detail also reload when the tx rows list changes (`bookChanged()` never bumped `revision`).
- Saving goals: `staleTick` + reload on tx change; pending 🐷 draft now opens the sheet (saving-draft support added in quick_create_sheet.dart; confirm from the sheet).
- Events: paging already existed; fixed the real gap (first page fits screen → never loads page 2). Not reproduced the "20" cap on device.
- Offline: no change needed; `AppButton(submits: true)` is disabled offline and every network-calling page already sets it.

**Kit (lib/ui) needs, not done (frozen):** default ฿ in many widgets (`UiConfig`, AmountInput, etc.); `CurrencyFormatter.roundsToZero` callers in kit (money_text, net_balance) don't pass the symbol → JPY zero-check uses 2 decimals; `Currencies` list/decimals belong in the library; hub pages still show THB demo data.
**Other:** `TransactionsCubit.bookChanged()/refresh()` don't bump `revision`. No test for profile currency edit page (no EditProfilePage test exists).

# FE-CORE inbox (kit · hub · shell · router · templates · auth · quick create / tx)

## 2026-10-12 23:30 — 0.3.1-9 leftovers (Lead brief tasks 1–5)
DONE · `flutter analyze` 0 issues · `flutter test` 598 pass / 0 fail (was 579; +19 new) · nothing built / committed.

### 1. Offline gating at the kit root
- `AppButton.submits` (bool): a server-sending button disables itself while `ConnectionScope` is offline. `AppButton.isEnabled(context)` gives the real state; tests should check the inner `ButtonStyleButton.enabled`, not `onPressed`.
- FormSheet and ModeActionBar now use `submits: true`. Their own `ConnectionScope` checks are removed.
- QuickCreateSheetShell: Save and Save-as-draft are `submits`. The draft delete icon is off while offline.
- BulkDeleteButton is off while offline.
- Auth: the login and register submit buttons.
- Also marked `submits` (one line each):
  - pending: submit-selected, batch add (both buttons)
  - scheduled detail: generate-now
  - contact detail: unlink
  - notifications inbox: mark-all-read
  - NotificationTile: accept / reject
- Tag and category forms needed nothing: they already go through `editActionBar` → ModeActionBar.
- Typed input is untouched. The tests check it.
- Hub: `atoms/button` has a new "submits — offline" demo.
- Tests:
  - `test/ui/offline_mode_test.dart` +4: AppButton, FormSheet, quick create save / draft / delete, bulk delete.
  - `test/features/auth/presentation/auth_pages_test.dart` +2: login keeps typed text; register.
- Not covered:
  - Login's keyboard "done" calls `_submit` directly. Offline it fails fast with the network error, and the input is kept.
  - Icon-only server actions outside the kit pieces above (e.g. ⋯ menu items) are not gated.

### 2. Offline shell wiring test
- The `MaterialApp.router` builder chain moved from `app.dart` into `lib/app/connection_shell.dart` (`ConnectionShell`): ConnectionScope, OfflineBanner, UpdateBanner, and top inset removal.
- `test/app/connection_shell_test.dart` (5 tests):
  - online: no banner, the inset is kept
  - offline: banner shows, page top padding is 0, the page stays (no full-screen error)
  - Retry → `retryNow`
  - backOnline: "Connected again" shows, the page reloads exactly once, then the inset returns
  - cold start: no banner

### 3. Cold start while offline
- The splash is the one full-screen error + retry. The banner is hidden while auth is `AuthInitial`, because it would duplicate the splash error. It stays mounted, so the navigator never remounts.
- The splash content sits in `PullToRefresh(enabled: error != null)`. Pull works, and a reconnect re-runs `AuthCubit.init` by itself (before, it waited for a Retry tap).
- `AuthCubit.init` now joins a run already in flight. The version-gate splash and the auth splash are two SplashPage instances; both called `init`, which sent two `/me` calls.
- `test/features/auth/presentation/splash_cold_start_test.dart` (3 tests): offline → ErrorView with the token kept; reconnect → authenticated with no tap; concurrent `init` → one `/me`.

### 4. Skeletons
- **Dashboard:** `DashboardPageBody.skeleton` (a widget) is replaced by `skeletonShape: DashboardSkeletonShape` (slot heights); the template builds the skeleton.
- **Home** passes `HomePage.skeletonShape`, measured from the real page:

  | Slot | Height |
  |---|---|
  | snapshot | 108 |
  | period | 36 |
  | kpi | 94 |
  | charts | 184, 240 |
  | tiles | 132 |

  - The real period bar (`StepperPill.month`) is 36, not 40, so the skeleton's period bar is now 36.
  - `test/features/home/home_skeleton_geometry_test.dart` pumps the real Home with prod-shaped dashboard JSON and checks each slot within ±4 px.
- **Home caveats:**
  - The heights are measured with the test font; there are no bundled app fonts. Text-heavy cards can differ by a few px on a device.
  - The to-do block (drafts / notifications / coming up) depends on data, so the skeleton assumes it is empty. In the local prod data 3 of 4 users have nothing there; the owner has 3 drafts, so on the owner's home the content will push down by that block.
- **EntryCardSkeleton** is rebuilt from the real card's tokens: the top row at control height, the hero field rows (label 24 + value 52 + 8, text-scaled), and the chip rows `itemGap` apart. `test/ui/entry_card_skeleton_geometry_test.dart` is a pixel test against the real EntryCard at text scale 1.0 and 1.3.
- **Where it is used — แก้ร่าง (draft edit):**
  - The sheet now opens at once; before, it waited silently on `form-options` with no feedback on the row.
  - EntryCardSkeleton shows until the options land, then the draft prefills.
  - Close while still loading doesn't ask (nothing to lose yet).
  - A new transaction keeps the real card at once so typing can start; only its chip rows shimmer.
  - Test: `test/features/transactions/quick_create_draft_skeleton_test.dart`.
- Hub: an EntryCardSkeleton demo on `domain/transactions`. The DashboardPageSkeleton cover moved from Detail page to the Dashboard hub page, plus `DashboardSkeletonShape`.

### 5. Template defaults, pull-to-refresh
- **ListPageBody:** `skeleton` (a widget) is replaced by `skeletonShape: ListSkeletonShape`, either rows (the default) or `.grid` (summary block, sort row, cards).
  - Accounts uses `.grid`. The feature-local `_AccountsSkeleton` is deleted.
  - Hub `templates/list-page` has a grid demo.
- **Hand-drawn first loads moved onto `AsyncStateView.fallback`:** notification settings and personal debt detail. Before, their error view had no pull and they had no offline / slow-load handling.
  - Test: `test/features/notifications/notification_settings_page_test.dart` (failed load → error, pullable → retry → page, refresh wired).
- Tags: `refreshEnabled: !isEditing`. The pull showed in edit mode and did nothing.
- Wallet members tab: the kit `ListPageSkeleton(rows: 3)` replaces hand-drawn SkeletonListTiles.
- Contact form (link existing): `DetailPageSkeleton` replaces the old `LoadingView` spinner.
- Every view-mode page / tab has pull-to-refresh except:
  - the events resolve tab: a placeholder EmptyView, so it belongs to the fe-event redesign
  - settings while `/me` is null: it shows nothing
- Hand `PullToRefresh` + `ListView` remain (refresh works) in the More hub, the project dashboard tab and WalletMembersView. Moving them onto templates is the widget audit.

### Notes
- Feature files owned by the read-only feature FEs, touched with tiny edits:
  - `scheduled_transaction_detail_page.dart`: `submits: true`
  - `personal_debt_detail_page.dart`: the fallback state
- Found, not fixed: home `_NetWorthCard` (`home_page.dart` ~389) has a Row with no flex. Long assets / liabilities amounts plus the account count can overflow on narrow phones.
- Breaking kit API: `DashboardPageBody.skeleton` and `ListPageBody.skeleton` are gone (use `skeletonShape`); `DashboardPageSkeleton` takes `shape:`; `EntryCardSkeleton` defaults to `rows: 2` and gained `editing`.

## 2026-10-12 23:55 — quick create per-page default (mode + preset) + the + colour by mode
DONE · `flutter analyze` 0 issues · `flutter test` 613 pass / 0 fail (+15 new) · nothing built / committed. No new API calls; no BE need beyond the already-planned debt person-entry API.

### What changed
- **Kit (hub first):**
  - `tokens/app/quick_create_mode.dart`: `QuickCreateMode { tx, debt }` and THE one mapping, `QuickCreateModeColors.of / onOf` (tx = colorScheme.primary, debt = ModuleColors.people; the glyph is onPrimary, or black / white by brightness).
  - `domain/transactions/quick_create_button.dart`: `QuickCreateButton(mode:)`, the shell's centre + extracted from `main_bottom_nav.dart`. Its fill tweens to the mode colour over `AppDurations.fast` (200 ms), and is instant under reduced motion.
  - `domain/transactions/quick_create_mode_chips.dart`: `QuickCreateModeChips` (`[รายการ] [หนี้]`, each in its mode colour).
  - All exported in `ui.dart`.
- **Hub:** new page `domain/bottom-bar` ("Bottom bar & +"). It demos:
  - the REAL `MainBottomNav` with a mode switch
  - `QuickCreateButton` in every mode
  - the mode chips
- **QuickCreatePreset** (`app/shell/quick_create_context.dart`):
  - Fields: `{mode = tx, account?, category?, tag?, person? (EmbeddedPerson)}`.
  - Helpers: `QuickCreatePreset.debt({person})` and `QuickCreatePreset.none`.
  - Value equality.
  - `onAdd` is REMOVED.
- **Reactive registry:** `QuickCreateContext` is now a ChangeNotifier with `preset`. It re-reads the on-screen page's preset after each frame that can change it:
  - a scope mounts / unmounts / changes
  - a tab switch: the shell sets `currentBranch`; a scope compares it to its own branch (`TabSwitchScope.branchOf`) instead of TickerMode timing
  - a push / pop / remove / replace in any tab: `QuickCreateRouteObserver`, one per StatefulShellBranch in `app_router.dart`
- **Shell:**
  - MainShell rebuilds the bar via `ListenableBuilder(_quickCreate)` → `MainBottomNav(addMode:)`. Pages never pass a colour.
  - Tapping + calls `showQuickCreateSheet(account, category, tag)`. `TODO(debt-mode)`: a debt preset only colours the + for now; the sheet opens in tx mode.
- **showQuickCreateSheet:** new `category` and `tag` params.
  - A category also sets the type (income category → income).
  - A tag goes into `tagIds` / `knownTags`.
- **Per-page lines:**
  - wallet detail → account (unchanged)
  - category detail → category (create mode → none)
  - debts list → `.debt()`
  - debt person page → `.debt(person: EmbeddedPerson(name, contactId))`
  - contact detail → `.debt(person: …linked / icon)` (create → none)
  - pending → the scope is removed: + = normal quick create in tx mode; `/pending/new` is still reached from the page's own add tiles
  - Home / More / tx list / wallets / categories / tags lists → nothing (tx)
  - In personal_debts I only added the two scope lines and their imports.

### Tests
- `test/app/shell/quick_create_mode_test.dart` (8). It drives the real MainShell → MainBottomNav → QuickCreateButton over stub pages, with the route observers as in the app and the REAL PendingPage:
  - the colours (tx = primary ≠ debt = people)
  - no preset → tx
  - push a debt page → debt colour; pop → tx restores
  - the colour tween is mid-way at 60 ms (animated, not a snap)
  - a plain page over a debt page → tx; back → debt
  - tab switch away → tx; back → debt
  - wallet preset
  - pending: + opens QuickCreateSheetShell and the route stays `/pending`
- `test/app/shell/page_presets_test.dart` (5). Real pages under the shell registry:
  - wallet detail → account
  - category detail → category
  - category create → none
  - debts list → debt
  - debt person → debt + person
- `test/features/contacts/contact_detail_page_test.dart` +1: contact → debt + person (contact id, linked user).

### Not done / open
- **Tag detail → tag:** there is no tag detail page (tags are edited inline on the tags list). `tag` is supported in the preset and the sheet, ready for when a page exists.
- **Mode chips in the sheet:** `QuickCreateModeChips` is in the kit and hub, but NOT in the sheet yet. A `หนี้` chip that opens nothing would mislead; it goes in with debt mode.
- **Colour token:** the decision line says "module colour tokens (AppModules)"; I used `ModuleColors.people` as briefed. AppModules is the on/off switch list, not a colour source.
- **Kit gap:** the rest of the bottom bar (`MainBottomNav`) still lives in `lib/app/shell`. The hub page imports it from there. Moving it into the kit is part of the widget audit.

## 2026-10-13 — debts + events: shared kit, debt / event pieces, quick create debt mode, tx detail debt mode + event link
DONE · `flutter analyze` 0 issues · `flutter test` 711 pass / 0 fail (whole tree, incl. fe-debt / fe-event work) · nothing built / committed.

### 1. Shared kit (hub first, tests in test/ui/shared_kit_0_3_1_10_test.dart)
- **ListPageBody paging:**
  - `loadMoreError` + `onRetryMore` → new molecule `LoadMoreErrorRow` ("couldn't load more · Retry"). The loaded rows stay, and scrolling stops asking.
  - `footer` slot.
  - New UiStrings.loadMoreFailed (arb uiLoadMoreFailed).
  - Hub: templates/list-page paging demos.
- **`TabbedDetailBody<T>`** (template):
  - Structure: hero → `belowHero` → pinned AppTabBar → one lazy ListPageBody per tab, plus `compactBar`, `editing`.
  - The template clears the top bar; tab lists get no top inset.
  - Tested: lazy tabs, switching, pull-to-refresh inside a tab, edit lock.
  - Hub: templates/tabbed-detail (live demo with paging + retry).
- **Multi-select picker:** `PickerRow(checked:)` (square SelectCheck + tint) and `PickerConfirmBar` ("เพิ่ม (n)", off at 0, `submits`). Hub: organisms/sheets demo + a live multi-select sheet.
- **SortChip<T> / SortOption<T>:** hub molecules/bars.
- **Tag-chip popover:** no new piece. OptionMenuAnchor with `selected: null` is the action menu (confirmed with fe-event). EventBillRow tag chips are anchorable via `tagAnchorBuilder`.

### 2. Debt + event pieces (built by two sub-agents to fe-debt / fe-event's exact lists; tests test/ui/debt_pieces_test.dart, event_pieces_test.dart incl. TxRow / ListRow geometry)
- **Debts** (hub domain/debts):
  - PersonRow
  - PersonBalanceRow
  - NetBalance (row / hero; 0 = settled caption only)
  - DebtSummaryCard (replaces the feature `_Summary`)
  - LedgerRow (paid ↗ / received ↙, positive amount, wallet / paid chips, source)
- **Events** (hub domain/events):
  - EventCard (+ EventTagRef)
  - EventBillRow (+ EventBillChildRow, the tick, anchorable tag chips; the tags sit on line 1 to keep TxRow height)
  - PositionRow (the share bar)
- **TxHeroCard / EntryCard:** `debt: true` (Paid / Received in the expense / income colours, no transfer) and `amountLocked`. Hub: an EntryCard debt demo on domain/transactions.

### 3. Quick create DEBT MODE (test/features/transactions/quick_create_debt_mode_test.dart, 5 tests)
- The mode chips [รายการ] [หนี้] sit at the top (QuickCreateModeChips, mode colour), only for a new plain entry. Switching carries the amount / description / note / date over.
- `DebtEntryForm` + `DebtEntryController` (features/transactions/presentation/widgets/debt_entry_form.dart):
  - EntryCard(debt)
  - a person chip row (GET people once; picker = everyone + search + "เพิ่มชื่อ “…”" + "เลือกจากผู้ติดต่อ")
  - a wallet row with "ไม่ผูก"
  - tags only with a wallet
  - the compact note
  - a collapsible "ทำเครื่องหมายรายการที่จ่ายครบ" (GET entries paid=false on open; PickerRow checked)
  - the result line "หลังบันทึก: …" (instant feedback)
- **Save** = ONE `createDebtEntry`. Patched from the answer: wallets (`account_balances`), the tx row (`patchRow`), Home (`DashboardCubit.markStale`).
- **showQuickCreateSheet** gains:
  - `preset:` (QuickCreatePreset; debt presets now open debt mode with the person)
  - `onDebtSaved(DebtEntryWriteResult)`
  - `onEventSaved(EventPatch)`
  - `amount:` / `debtDirection:` prefill
  - The return stays Future<bool>.
- **Event mode** now sends event tag IDS (`createEventTag` for new names) and hands back the EventPatch.
- **Notifications:**
  - accept / apply use the new acceptSplit / applySplit.
  - split_paid "บันทึกรับเงิน" = quick create debt mode (person, Received, amount). The old settle sheet is no longer used.
- **PersonalDebtsCubit** is gone from my side: app.dart, home listener, hub cache page + DebtTile demos, tx detail, home test. fe-debt deletes the cubit / old model.

### 4. TX DETAIL in DEBT MODE (test/features/transactions/debt_entry_detail_page_test.dart, 7 tests)
- **Model:** `Transaction.counterparty: DebtLink?` + `isDebtEntry` replace `isRepayment` / `sourcePersonalDebtId` (tx_rules updated; model + event-pick tests updated).
- **`DebtEntryDetailPage`** (features/transactions/presentation/pages/debt_entry_detail_page.dart) uses the same template and hero:
  - TxHeroCard(debt) with the person card (view: tap → the person's page) and the wallet card ("ไม่ผูก" = ledger only)
  - tags only with a wallet
  - a section with the paid label switch + note
  - a "มาจาก" source row (split-sourced entries: only description / note / paid, amount locked, hint banner)
  - ManageSection delete
  - meta
  - EditModeMixin with undo
- **Calls:** ONE GET on open. Save = ONE PUT with only what changed (`clearAccount` → ledger-only drops the tx row). Delete = a confirm that names the wallet tx ("รายการใน “KBank” จะถูกลบด้วย…") → ONE DELETE; patches wallets, drops the tx row, Home stale.
- **Routes:** `/personal-debts/entries/:id` and legacy `/personal-debts/:id` (notification deep links) → DebtEntryDetailPage.
- **TransactionDetailPage:** a row with `counterparty` renders DebtEntryDetailPage (no plain GET first when the cached row says so).

### 5. TX DETAIL event link
- `Transaction.eventBill = EventBillLink {event, billId, linked}`.
- The event row opens `/projects/<event>?bill=<bill>`; fe-event reads `bill`.
- Edit mode with `linked` shows the new kit `LinkedFieldHint` (🔗 + "จำนวนเงินและวันที่ผูกกับบิลในอีเวนต์ — แก้แล้วเปลี่ยนทั้งสองฝั่ง"); fe-event uses it on the bill page too. Hub molecules/rows.

### 6. Contact → debts link
fe-debt edited it under my grant: `/personal-debts/people/c:<id>`; their router block + cross-tab test too.

### Also
- **page_flows.dart:** debts flows (people / person / entry), quick create debt + event-mode calls, notifications split / event actions, fe-event's events block. `api_unused_baseline` += PUT / DELETE /projects/{id}/tags/{tag_id}, GET /projects/{id}/summary, POST …/request-link (spec has them, no page calls them).
- **fe-saving / fe-budget kit asks (K1–K6):** acknowledged and queued behind this work. K4 (user-currency scope for every MoneyText) needs your OK.

### Open
- **Not verified on a device.** The BE debts endpoints are not deployed locally (BE says the owner orders a build).
- **The two debt arrows** are a rotated `arrowForward`. Add AppIcons.paidOut / received if the owner wants real glyphs.
- **Debt mode result:** the debts pages patch from `onDebtSaved`. The return value is still bool.

### 2026-10-13 follow-up (fe-event asks) · analyze 0 · tests 715 / 0
- `EventBillRow(highlighted:)`: a brief primary tint that fades, for the `?bill=` target (fe-event reads the query). Hub demo + test.
- Quick create event-bill edit: a LinkedFieldHint when `projectRow.parent.linked`, with the bill-side string `eventBillLinkedMoneyHint`.
- BE: a linked tx edit below the board splits → 400 SPLITS_EXCEED_AMOUNT. Already mapped in tx detail (txSplitExceeds).

## 2026-10-13 — linked prompt, upcoming, recurring wiring, pending + notifications, kit K2/K3/K6 · analyze 0 · tests 783 / 0

Brief: decisions "Pulling a personal tx in", "Deleting an event with bills", "Recurring + upcoming (FINAL)", plus fe-recurrent "Plan rev 3". No local build; nothing verified on a device.

### 1. Save prompt (kit)
- **`showLinkedPrompt`** (molecules/linked_prompt.dart): [ยังก่อน] [บันทึกเฉพาะฝั่งนี้] [บันทึกและแก้อีกฝั่ง].
  - Labels and title come in as params; `destructive` turns "both" red for delete.
  - Resolves `LinkedChoice.thisSideOnly` / `bothSides`, or null (cancel = nothing is sent).
  - Hub: molecules/feedback.
- arb: `linkedSaveTitle/Cancel/SaveThisOnly/SaveBoth`, `linkedDeleteTitle/ThisOnly/Both`.

### 2. Tx detail
- **No sync:**
  - the "edits change both" LinkedFieldHint is gone from tx detail and the quick create bill edit; the 🔗 / event row stays
  - the kit LinkedFieldHint stays exported, though nothing uses it now; Lead, say if it should go
- **Save:** a tx with an event bill (`linked`) or a `recurring_item` → the prompt → `PUT … also_update_link` true/false.
- **Delete:** a linked tx → the prompt (destructive) replaces the confirm → `DELETE /transactions/{id}?also_delete_link=…`.
  - `DeleteTransactionResult` gains `recurring_item_id` and `bill_id`.
  - Repayments keep their own confirm.
- **🔁 row:**
  - "Recurring · Netflix · 3/12" (`Transaction.recurringItem` = `RecurringItemLink`, plus `label()`) → `/recurring/<recurring_id>`
  - a one-off item → `/recurring?tab=upcoming`
- **Future date:**
  - edit mode shows the HintLine under the date ("รายการล่วงหน้า › จะเข้ารอยืนยันวันที่ …" → upcoming tab)
  - a save answered with `upcoming` drops the row from the book, patches the wallets, shows "ย้ายไปรายการล่วงหน้าแล้ว" and closes the page
- Test: tx_detail_linked_test (8): the row, the 3 save choices, the future date, the 3 delete choices.

### 3. Quick create
- A date after today shows the same HintLine. The save may come back `upcoming` → snackbar `txSavedAsUpcoming`.
- **The hint is NOT tappable in quick create:** leaving the sheet would drop what's typed (owner rule). Lead: tell me if the owner wants it to close the sheet / save first.
- The `scheduled:` mode is removed with draft_form_scheduled.dart and its DraftForm hooks.
- Event bill edit: my own linked bill (`sourceTx`) asks the prompt and passes `alsoUpdateLink` to fe-event's repo.
- **K7 entry sheet:** `showEntrySheet(title, initial, actions, onDelete)` is quick create on a PendingDraft with configurable footer actions. fe-recurrent uses it for item edits.

### 4. Recurring wiring
- **Routes:**
  - `/recurring` (?tab=upcoming)
  - `/recurring/new`
  - `/recurring/:id`
  - `/recurring/:id/settings`
- **Shell:**
  - `ShellTab.scheduled` → `recurring`, segment `recurring`
  - AppModules.recurring, crumbs
  - More card "รายการประจำ" (AppIcons.recurring; `moreLiveDueSoon` from /me/counts `recurring.upcoming_count`)
- **App:** RecurringRepository provided; ScheduledTransactionsCubit/repo removed from app.dart, home listener, cache page and tests. fe-recurrent deleted lib/features/scheduled_transactions.
- **Counts / dashboard:** `MeCounts.recurringActive/recurringUpcoming`; `UpcomingKind.recurring`.
  - A home coming-up recurring card → `/recurring?tab=upcoming`, because the dashboard item carries only the item id.
  - BE could add `recurring_id` to open the setting directly.
- **page_flows:**
  - recurring-home / recurring-detail / recurring-settings as fe-recurrent listed (+ the item entry sheet ops)
  - tx update/delete notes name the link flags
  - flows baseline: the stale scheduled line is dropped; unused baseline += `GET /recurring-items/{id}` (nobody calls it; fe-recurrent confirmed)

### 5. Pending
- `PendingSource.recurring` / `upcoming` + `PendingTransaction.recurringRef`. The chip reads "🔁 Netflix · 3/12" (recurring) / "ล่วงหน้า" (one-off).
- Test: pending_source_recurring_test (3).

### 6. Notifications
- **New types:**
  - `recurring_due`: "รายการประจำถึงกำหนด N รายการ รอยืนยัน" → deep link /pending
  - `recurring_ending`: "{name} เหลืออีก N รายการ — ต่ออีกไหม" → /recurring/{id}
  - 🔁 icon; the actor falls back to "รายการประจำ"
  - Not added to notification settings (no per-type toggle asked)
- **"อัปเดตตาม" on project_tx_changed** (another member edited the bill from my tx):
  - now sends `also_update_link: false`
  - patches wallets from the answer (no accounts reload)
  - a future date → "moved to upcoming"
- **Recheck:** pull-to-refresh on the inbox (GET /notifications) and the badge poll run the BE due check. A new unread marks the dashboard stale, so the pending badge follows.

### 7. Kit (all exported, hub pages + covers)
- **`StatusChip` / `StatusKind`** (molecules) + `onTap` → ▾. `OccurrenceState` / `OccurrenceStateChip` (domain/recurring).
- **`HintLine`** (molecules/rows): a muted line with an optional primary link ›.
- **TxHeroCard / EntryCard `dateNote`.**
- **K2 TxRow:**
  - `metaLeading`, `meta`, `recurring` (🔁 + `progress`), `linked` 🔗, `statusChip`, `dimmed`
  - AppIcons.recurring
  - RecurrenceRule family + `recurrenceLabel` / `RecurrenceText`, `dueLabel` / `DueText`
- **K3 `showRecurrenceSheet` / `RecurrenceEditor`:**
  - every N unit, weekday toggles, monthly day D / Nth / last weekday
  - ends never / on date (≤ start+2y) / after N
  - OK/Cancel; local edit, so not offline-gated
- **K6 `EditScope` + `showEditScopeChoice`:** a central titled popover; the scopes passed, in order; selection = highlight.
- **Also:**
  - `MultiDatePickerSheet` / `showMultiDatePicker`
  - popover `title` on OptionMenuAnchor / MultiOptionMenuAnchor / PopoverAnchor
  - `submits` on ActionBarItem / SheetOption
- **Tests:**
  - recurring_texts
  - tx_row_marker
  - multi_date_picker
  - popover_title_offline
  - recurrence_sheet (7)
  - edit_scope_choice (3)
  - entry_sheet (4)

### Open
- The quick create upcoming hint tap (see 3).
- Dashboard recurring card → setting needs `recurring_id` from BE (see 4).
- Not verified on a device; the recurring BE is not deployed locally.
- Queued: fe-saving K1–K6 (K4 user-currency scope still needs your OK).

## 2026-10-13 (2) — wallets "ติดตามยอดเงิน", budgets v2 kit, More = the hub, goals v2 shared kit (+ handover)
Rule from the owner: no full analyze/test from me; test/ui + test/hub 298/0, analyze clean on the touched areas.

### 1. Wallets "ติดตามยอดเงิน"
- Model: `Account.trackBalance` (+ `showsBalance`), `AccountTotals.untrackedCount`. `toCreateJson` sends `track_balance` (no `balance` when off); `toUpdateJson({currentBalance})` sends `track_balance` (+ `current_balance` only with track on). Repo / cubit `update(account, {currentBalance})` → ONE PUT.
- UI (sub-agent, reviewed): a switch row on create + edit (owner only). Create off → no opening-balance field. Edit off→on → the set-balance sheet first (`showAdjustBalanceFormSheet(setOnly: true)`), cancel = no save. Off hides the balance on the card (both layouts), WalletPickCard, compact hero and detail hero ("ไม่ติดตามยอดเงิน"); credit figures zero; no ปรับยอด; transfers stay. `BALANCE_NOT_TRACKED` mapped. Accounts page: "N wallets not tracked".
- Tests: wallet_track_balance_test (8). Open: whether getTransactionFormOptions sends `track_balance` per wallet (parsed, default true).

### 2. Budgets v2 kit (hub: Domain › Progress, Domain › Budgets) — signatures sent to fe-budget
ProgressRow.expected · ProgressTone · ProgressCard (+ .compact, .skeleton) · ProgressSummary · ProgressHeroFooter · BreakdownRow · StatGrid / StatTile · SourceChips · showScopePrompt (รอบนี้และถัดไป / ทุกรอบ / ยังก่อน) · RecurrenceEditor / showRecurrenceSheet `simple: true` · showCategoryMultiPicker · showAccountMultiPicker · DetailRow(error:) · ListPageBody(rowGap) · walletValueChip in ui.dart · MoneyText default currency from /me (K4). page_flows budgets rewritten to the v2 spec; saving flows rewritten to the goals v2 ops.

### 3. More = the hub
Sections: แผนการเงิน (งบ · เป้าออม · รายการประจำ) · เงินกับคนอื่น (หนี้ · อีเวนต์) · ข้อมูลตั้งต้น (หมวดหมู่ · แท็ก · ผู้ติดต่อ) · เมนูหลัก (Dashboard · รายการ · กระเป๋า · รอยืนยัน · แจ้งเตือน · โปรไฟล์/ตั้งค่า, plain entries with pending / unread counts). ShellRow = planning / people / library; module switches respected. more_page_test + tab_nav / main_shell tests.

### 4. Goals v2 — kit DONE, feature parts HANDED OVER to fe-saving (owner order)
- Kit (hub Domain › Saving goals): MilestoneRow, SavingHistoryChart, SavingTxRow (+ draft), showSavingMoveSheet, showCloseGoalDialog, AppIcons saving*; K14 = the existing ActionBar. Kit split type renamed `SavingMoveSplit`.
- Done by sub-agents: wallet-page savings section (`Account.savings`, WalletSavingsSection), pending 🐷 draft row (`PendingKind.saving`, `PendingSavingRow`).
- Half done: K13 quick create ออม mode — `QuickCreateMode.saving`, `QuickCreatePreset.saving({goalId})`, arb keys, EntryCard/TxHeroCard `typeBadge` + `accentColor`. Not wired in quick_create_sheet.dart. fe-saving owns the rest.
- Recurring ออม: fe-recurrent.
