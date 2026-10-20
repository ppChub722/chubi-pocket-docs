## 2026-10-11 — FE-B kit-owner UI round (items 4, 5, 6, 7, 14–18)
DONE · analyze: no issues · full test suite: 318 passed
files:
- kit (new): shared/widgets/feedback/saving_overlay.dart, feedback/error_snackbar.dart, buttons/bulk_delete_button.dart, data/tx_row.dart, inputs/theme_mode_chips.dart (all in ui.dart + /dev/widgets)
- kit (edited): layout/detail_rows.dart (SectionCard.hint), buttons/app_icon_button.dart (selected), chips/app_chip.dart (mini leading 14px), edit_mode/edit_mode_mixin.dart (editScope wraps SavingOverlay)
- app: shell (app_top_bar.dart, main_shell.dart, quick_create_context.dart), transaction_tile.dart, pending_page.dart, tags_page.dart, categories_page.dart, accounts_page.dart, category_detail_page.dart, change_password_page.dart, settings_page.dart, account_identifier.dart, identifier_widgets.dart, account_detail_page.dart
- arb: accountIdentifiersHint (th/en)
- test: account_identifier_test expects plain digits
items:
- 4: identifiers are plain digits on edit and view (no grouping; formatter only clips length). SectionCard got a `hint`; the wallet's numbers section shows "ส่วนนี้ใช้จับคู่บัญชีตอนสแกนสลิปเท่านั้น".
- 5: BulkDeleteButton (red trash icon, no label, right end) on tags bar (FilterBar.trailing) and pending tool row. ModeActionBar has no delete action.
- 6: SavingOverlay. editScope() in EditModeMixin wraps it, so every detail page that calls setSaving gets it automatically (account, category, tag, profile, contact, project, budget, debt, goal, tx detail). Also categories reorder, accounts reorder, change-password.
- 7: showErrorSnackBar(context, error, onRetry:). AsyncStateView already did full-page ErrorView + retry on list pages (all list pages in my scope already used it); category_detail_page now uses AsyncStateView.fallback (skeleton → error+retry → not found). Existing save/action failure snackbars left as they were.
- 14: pending page wraps its body in QuickCreatePresetScope(QuickCreatePreset(onAdd: …)); the shell's centre + runs onAdd → push /pending/new.
- 15/16: TxRow is the one row. TransactionTile and the pending card both use it: title + wallet mini chip (wallet icon), line 2 = [source mini chip] · category · #tags, amount right. Pending: date removed from the card → day-group headers (undated first), flat rows (no card border), checkbox kept, warning line kept. Pending add page and the "แก้ร่าง" sheet untouched.
- 17: AppIconButton.selected = bottom-nav active look (primaryContainer + primary ring). Chips light up by the visible shell branch. Profile chip: avatar (32) in a 40 frame, neutral when inactive, active look on the profile page.
- 18: ThemeModeChips (☀️/🌙/📱 icon chips, selected = highlight) replaces the 3 text tabs in settings.
deviations/notes:
- Profile frame: I could not tell which "dark green frame" was meant (the avatar's own icon_code border?). I added the neutral chip frame around the avatar; the avatar's own style is unchanged. Tell me if the avatar's own border should go.
- Wallet chip in tx rows shows the wallet icon only if the wallet is in AccountsCubit; otherwise text only. Tags stay as coloured #text (not chips) as before.
- Not exercised in the running app (owner runs it).

## 2026-10-11 — Detail-page standard in the gallery (for owner review; no real page touched)
DONE · analyze: no issues · tests: 319 passed
files: dev/detail_patterns_tab.dart (rules card · Part 1 sample updated · new Part 1b standard heroes · every Part 2 variant tagged), shared/widgets/layout/detail_rows.dart (new `DetailRow.pick` + `DetailRow.locked`)
kit:
- `DetailRow.pick(label, value, emptyText, onTap, locked…)` = picker row `label value ›`; empty value keeps the row with a muted emptyText (rule 8 + 9). Caller passes the localised text ("ไม่ได้เลือก" = l.quickEventNone).
- `DetailRow(locked: true)` = 🔒 leading icon, row not dimmed (rule 10). EventRow already did this.
gallery:
- "รายละเอียด" tab: rules card (10 rules) → Part 1 sample (adds pick rows incl. an empty one + a locked row) → Part 1b standard heroes (tx · wallet · contact · category · scheduled · goal, last four rebuilt: ✏️ + status AppChips in the top row, entity-coloured border) → Part 2 catalogue, each variant tagged "= standard" or "→ migrates to X" (table `_verdicts` at the top of the file; Part 2 is "as today" so it still shows the old shapes).
- Chips stay at the current normal 32.
migration split — what changes per page (nothing done yet):
- contact_detail_page: hero gets a top row (status chips: linked etc. as AppChip) + ✏️ moves into it; subtitle no longer holds status; add DetailMeta; empty pickers (email etc.) keep a row "ไม่ได้เลือก"; archive = amber if it has archive.
- category_detail_page: hero = rebuilt (type AppChip + ✏️ in top row, border in the type colour); parent picker → DetailRow.pick; DetailMeta; delete only (no archive).
- account_detail_page (wallet): amount into the hero footer slot; status chip in top row; รายงาน etc. fine; archive row → amber in การจัดการ (it is red + label "เก็บกระเป๋านี้ถาวร" today); add DetailMeta.
- transaction_detail_page: reference hero, unchanged; locked event row already 🔒; check any PickCard in view mode.
- personal_debt_detail_page: StatusPill from subtitle → top-row chip; ✏️ into top row; "บันทึกเมื่อ" row → DetailMeta; locked look → 🔒 leading; delete only.
- project_detail_page (event): status + type chips → top row, ✏️ into it; hide-when-empty rows → keep with "ไม่ได้เลือก"; note always shown; DetailMeta.
- budget_detail_page: ✏️ + period chip in top row; PickCard (หมวด) → DetailRow.pick; archive amber + delete red (both red today); DetailMeta.
- saving_goal_detail_page: "ครบเป้าแล้ว" AppBadge → AppChip in top row, ✏️ into it; PickCard (กระเป๋า) → DetailRow.pick; archive amber + delete red; DetailMeta.
- scheduled_transaction_detail_page: hand-made _VariantPill → AppChip, status + variant chips in top row, ✏️ into it; DetailMeta.
- event resolve sheet / event member splits (PickerTile): not detail pages — rule 8 says PickerTile retires "on detail pages"; question for Lead whether those two keep it.
- All: loading/error/not-found already standard; note always shown (event + wallet non-owner hid it).
notes: tags stay `#text` on the tx row (unchanged). TxHeroCard is shown as it is today — FE-A's item 8 changes to it will show once landed.
update (Lead): PickerTile retires — the event resolve sheet and event member splits migrate to DetailRow › in the events round. Part 2 tag changed to "→ migrates to DetailRow ›; PickerTile retires". No page edits.

## 2026-10-11 — Detail pages migrated to the standard + chips → AppChip (FE-B)
DONE · analyze: no issues · full test suite: 324 passed · old-chip refs left in my files: 0
(the 7 pages were done by three delegated sub-agents under my review; I verified analyze + tests on the whole tree)
kit: `ManageSection` (layout/manage_section.dart: การจัดการ, archive amber + delete red, edit mode only), `detailMetaLines()` (layout/detail_meta.dart), `DetailRow.pick/locked`, arb `detailManageTitle`. Domain models Account/Category/Contact/Project/Budget/SavingGoal/ScheduledTransaction gained `createdAt`/`updatedAt` (BE already sends them) → DetailMeta.
pages:
- wallet (account_detail): type chip outlined, shared chip selected, "ปรับยอด" = tinted AppChip (no shadow); archive → ManageSection (amber, archive only); DetailMeta; members/scope rows `locked` (🔒) instead of dimmed section; chips in members view / archived list / accounts sort / identifier rows → AppChip.
- category_detail: top row type chip (+ hidden-from-report chip), border = type colour; parent picker = DetailRow.pick ("ไม่มี" when empty — existing key categoryFormParentNone); create-mode type = AppChip pair; ManageSection delete only; DetailMeta. categories_page filters → AppChip.
- contact_detail: top row linked + archived AppChips, ✏️ right; archive/restore + delete → ManageSection; DetailMeta. contacts_page filters → AppChip. ContactLinkedPill no longer used.
- event (project_detail): status + type AppChips in top row; note always shown; ManageSection (delete); DetailMeta (edit mode only — page is a header over tabs); PickerTiles in project_tx_tiles (resolve sheet / member splits) → DetailRow.pick; ProjectStatusPill deleted.
- budget_detail: period chip in top row; category + period = DetailRow.pick (period opens showOptionSheet); archive amber + delete red; breakdown rows `locked`; DetailMeta.
- saving_goal_detail: "ครบเป้าแล้ว" AppChip in top row (badge removed; % stays AppBadge); wallet = DetailRow.pick (locked after create); archive amber + delete red; DetailMeta.
- scheduled_detail: status + variant AppChips in top row; _VariantPill deleted (page + card); category row always shown; note always shown (long-press edits); delete ManageSection always shown (no in-place edit mode here); DetailMeta.
gallery: widget_gallery_screen / compact_hero_demo / reorder_demo / detail_patterns_tab / detail_playground_screen no longer reference old chips (showcase-only demo blocks of old chips deleted; AppChip tab covers them). app_chip_tab.dart (FE-A's, granted): dropped the ProjectStatusPill + ContactLinkedPill _Compare rows + 2 imports.
deviations/open:
- ContactLinkedPill still DEFINED in contacts/widgets/contact_linked_mark.dart (unused now) — FE-A deletes with the old chips.
- Contact linked-email field is still a locked InlineField + hint (DetailStacked has no locked option), not a 🔒 row.
- Contact "actions" section still uses SectionCard(locked:) (section-level dimming).
- DetailRow.pick has no error text; "required" messages (event account, budget category, goal wallet) are red text under the row.
- PickCard still used by tx form / MemberPickCard (not detail pages in scope). PickerTile still used by debt form, draft_form_event, currency_tile (debts round / FE-A).
- AppChip allows one trailing: an active filter shows the count badge instead of ▾.
- Sub-agents ran dart format on whole feature dirs (accounts, categories, contacts, projects, budgets, saving_goals, scheduled_transactions): possible format-only churn there.
- Not run in the app (owner runs it).

## 2026-10-12 — App hub P2 (FE-B share): AppCard · AppAvatar · AppSpinner · AppIcon/AppIconSize · PickerTile/WalletSummaryTitle retired
DONE · analyze: clean except FE-A's in-flight tags_page.dart (unused `scheme`/`border`, line ~767) · tests: all pass except test/ui/layering_test.dart (stale baseline lines for FE-A's removed inline_field.dart / app_search_bar.dart)
atoms (lib/ui/atoms, exported via ui.dart): AppCard (styles plain/bordered/accent/tinted/flat, borderColor/borderWidth/selected/onTap/margin/padding; TintedCard deleted → TintedIconBadge in atoms/tinted_icon_badge.dart), AppAvatar (name / .tinted / .icon / .label; UserAvatar is the domain wrapper), AppSpinner (small 16 / medium 24 / large 36), AppIcon + tokens/icon_size.dart (xs12 sm16 md20 lg24 xl32 hero56; size null = inherit IconTheme).
sites migrated by two sub-agents (Edit-tool only) across features + lib/app: ~40 Card/Material/BoxDecoration surfaces → AppCard, CircleAvatar → AppAvatar, CircularProgressIndicator → AppSpinner, ~100 raw Icon( → AppIcon (sizes snapped to the scale: 14→16, 18→20, 22→24, 28→32). ui internals: pick_card, header_card → AppCard; people.dart, option_menu → AppAvatar; saving_overlay → AppSpinner.
PickerTile → DetailRow ›: new DetailRow.horizontalInset (0 inside forms); sites: currency_tile (read-only = locked 🔒 row), draft_form_event member split, personal_debt_form_page counterparty (error text = red line under the row). picker_tile.dart deleted. WalletSummaryTitle deleted (+ gallery demos).
hub: lib/hub/hub_kit.dart (HubDemo/HubCell/HubRow helpers), pages atoms/card, atoms/badge-avatar, atoms/switch-check-divider (also shows spinner, skeletons, AppIcon scale, AddTile, SelectCheck) registered with `covers`; hub_uncovered_baseline.txt regenerated (shrank).
deliberately left: bespoke shell chrome in lib/app/shell (top bar chips/pill, bottom nav glass bar, FAB ring), notification_tile/update_banner Materials, boot_error_app panel, SelectableFrame tile in personal_debts_page (different radius), non-literal icon sizes (account_card badge, identifier size*0.9), lib/ui/atoms/app_button.dart's 18px spinner (FE-A's file; should become AppSpinner small).
visual changes to eyeball: icon size snapping; the two lock banners (project/tx detail) are now bordered lg-radius panels; contact _LinkBanner has the tinted gradient; settings theme tile has a bordered-card outline.
open: tokens/sizes hub page (icon sizes) not written yet; tokens pages are FE-A's per the map — tell me if you want me to take "sizes".

## 2026-10-12 — App hub P3 (FE-B share): rows/bars + section/hero/reorder/charts hub pages, l10n decoupling
DONE · analyze: no issues · tests: 333 passed (incl. test/ui layering + hub coverage ratchets)
- l10n decoupled (UiConfig/UiStrings, Thai filled in AppUiConfig): header_card (edit tooltip), manage_section (title), detail_meta/detailMetaLines (created/updated labels), option_menu (clear), reorder_move_bar (4 tooltips). New UiStrings fields: manageTitle, recordCreated, recordUpdated, reorderOutdent/MoveUp/MoveDown/Indent. test/dev/detail_patterns_tab_test wraps AppUiConfig.
- Hub pages (English, all variants/states) registered with `covers`: molecules/rows (DetailRow(+pick, locked), DetailStacked, DetailAddRow, SectionCard, SectionBand, SectionHeader, ListRow, DangerRow), molecules/bars (tabs, ModeActionBar, PinnedBar, HeroContent/HeroTopRow, CompactHeroBar+Scope, FilterBar, ChipRow, SelectableFrame, popover anchors), organisms/section-hero (HeaderCard incl. no-chips collapse, mock detail page view/edit, ManageSection, DetailMeta, LockedInEdit, SummaryStats, ProgressRow), organisms/reorder-charts (reorder tree + flat list demo, donut, paired bars). Pages are in lib/hub/pages/{molecules_rows,molecules_bars,organisms_section_hero,organisms_reorder_charts}_page.dart.
- Not shown on a page: reorder_outline's static helper (pure logic). CompactHeroBar demo uses plain chips (the tx/wallet presets live in lib/dev and need feature classes).

## 2026-10-12 — App hub P4 (FE-B share): DetailPage/ListPage templates, 7 detail pages, domain hub pages, avatar size ladder
DONE · lib analyze clean; test/ui + test/hub + test/shared + test/dev pass. Whole-suite run currently fails to LOAD 9 tx test files (split_draft_test, splits_rework_test, draft_chip_layout_test …: `identityLocked` / `savedContactLinked` missing on SplitDraft) = someone else's in-flight splits work, not mine.
- Kit: SectionCard.description (one line under every green heading; old `hint` renamed); DetailPlaceholder (the one faint placeholder style); DetailRow locked → 🔒 right after the value (labels stay aligned); HeaderCard.glyph + tinted wash (AppCard tinted + 1.5 accent border) = watermark hero; DetailPageBody + ListPageBody templates; AvatarMetrics token (glyph / initials / frame scale with size: 20 → 64) used by AppAvatar, IconCodeWidget (icon-maker frames), IconBubble, TintedIconBadge, EditableCircle badge.
- Pages (sub-agents): wallet (identifiers heading "เลขอ้างอิง" + ONE slip hint; report section heading "รายงาน" vs row "ในรายงานของฉัน"; empty identifiers = tappable placeholder → edit + add), category (hero subtitle no longer repeats the parent; DetailPageBody), contact (empty email/phone placeholders tap → edit + focus; DetailPageBody), event (glyph + accent from icon colour; members groups get a description line), budget / goal / scheduled (DetailPageBody, glyph, placeholders tap → edit + picker, descriptions). New arb: accountReport/Members/Credit/Opening/Type…Description, walletMembersHistoryDescription, categorySettingsSectionDescription, contactActionsSectionDescription, contactFieldNotSet, budgetDetailBreakdownDescription, scheduledDetailHistoryDescription, projectMembers*Description.
- Hub: templates/detail-page, templates/list-page, domain/people-accounts, domain/others (+ size-ladder demo for every avatar mode on atoms/badge-avatar); smoke test passes for all my live pages (people-accounts / others stay in the needsApp skip list — they use cubits).
- Visual changes the owner will notice: heroes tinted + watermark; section headings have a one-line description; placeholders one faint style and tappable (enter edit + add); 🔒 now right of the value; gap after the hero follows DetailPageBody; wallet "เลขอ้างอิง"/"รายงาน" wording; category hero has no parent subtitle; avatars/icon circles: bigger glyph on small sizes, thinner frames, thicker on large; members group description lines; scheduled account row has a › when empty.
- Not done: ListPageBody is built + documented but NO list page adopts it yet (budgets/goals/scheduled/projects lists are the easy ones); icon_maker frame thickness changed globally (check one real avatar).

## 2026-10-12 — FE-only API fixes (0.3.1-9, from api-audit-2026-10-12)
DONE · analyze: no issues · tests: 372 passed
1. Wallet detail: a non-active id → `GET /accounts/:id` (new AccountsRepository.getById / AccountsCubit.getById), no more whole archived list (account_detail_page). The accounts page's archived COUNT still loads the archived list — left for /me/counts (note for that round).
2. Quick create + tx edit: `AccountsCubit.patchBalances(Map)` from the answer's `account_balance_after` per row instead of GET /accounts: quick_create_sheet (plain create; falls back to one reload for event bills / tags-attach failure / a row without a balance) and transaction_edit (same wallet(s); a moved row also changed the OLD wallet → reload). Not changed: tx delete (transaction_detail_page) and pending submit still reload (delete returns no balance; pending submit is a batch).
3. Notification badge: UnreadBadgeCubit starts once — at create only when a session already exists, otherwise from the auth listener at login (was: always at create + again at login).
4. Dashboard drill-down: transactions_list_page loads the categories cache first when the initial category isn't cached, so the filter is no longer silently dropped.
5. Contacts lazy: SplitsSection no longer loads contacts on mount; only when a split person exists (initState if drafts exist, didUpdateWidget when the first one is added). The contact picker still loads on open.
6. Event picker: ProjectsCubit.loadIfNeeded() (loaded + 'active' filter = cached) used by event_pick instead of load() on every open.
Left alone (their own rounds): debts / events / budgets / scheduled / goals bugs.

## 2026-10-12 — Templates + sweep + ratchet

- ListPageBody: added paging (hasMore/loadingMore/onLoadMore, row skeletons at end), `builder` for custom scrollables (reorder/tree), `controller`. Search/filters/selection/bulk delete = `header` widgets (AppInput.search, FilterBar, SelectAllCount + BulkDeleteButton). Grouped list = flat children with SectionHeaders. DetailPageBody/FormSheet/DashboardPageBody unchanged (already cover order rule, saving/dirty/destructive, snapshot/period zones).
- Ratchet: test/ui/raw_widgets_test.dart + raw_widgets_baseline.txt (per file+pattern counts; fails on increase; UPDATE_BASELINE=1 to shrink). Baseline total 83 hits.
- Sweep by owner (file:line, pattern):
```
accounts/presentation/pages/accounts_page.dart:465:          style: TextStyle(color: liability, fontWeight: Fo
accounts/presentation/pages/accounts_page.dart:473:          style: const TextStyle(fontWeight: FontWeight.w60
accounts/presentation/pages/accounts_page.dart:560:                          decoration: BoxDecoration(
accounts/presentation/pages/accounts_page.dart:587:                      style: const TextStyle(fontWeight: Fo
accounts/presentation/widgets/account_card.dart:368:        child: LinearProgressIndicator(
accounts/presentation/widgets/bank_picker_sheet.dart:93:    '002': Color(0xFF1E4598), // BBL
accounts/presentation/widgets/bank_picker_sheet.dart:94:    '004': Color(0xFF138F2D), // KBANK
accounts/presentation/widgets/bank_picker_sheet.dart:95:    '006': Color(0xFF1BA5E1), // KTB
accounts/presentation/widgets/bank_picker_sheet.dart:96:    '011': Color(0xFF0050F0), // TTB
accounts/presentation/widgets/bank_picker_sheet.dart:97:    '014': Color(0xFF4E2E7F), // SCB
accounts/presentation/widgets/bank_picker_sheet.dart:98:    '022': Color(0xFF7E2F36), // CIMB
accounts/presentation/widgets/bank_picker_sheet.dart:99:    '024': Color(0xFF0B3979), // UOB
accounts/presentation/widgets/bank_picker_sheet.dart:100:    '025': Color(0xFFFEC43B), // BAY
accounts/presentation/widgets/bank_picker_sheet.dart:101:    '030': Color(0xFFEB198D), // GSB
accounts/presentation/widgets/bank_picker_sheet.dart:102:    '033': Color(0xFFF57D23), // GHB
accounts/presentation/widgets/bank_picker_sheet.dart:103:    '034': Color(0xFF4B9B2E), // BAAC
accounts/presentation/widgets/bank_picker_sheet.dart:104:    '067': Color(0xFF12549F), // TISCO
accounts/presentation/widgets/bank_picker_sheet.dart:105:    '069': Color(0xFF199CC5), // KKP
accounts/presentation/widgets/bank_picker_sheet.dart:106:    '073': Color(0xFF6D6E71), // LH Bank
accounts/presentation/widgets/bank_picker_sheet.dart:110:    Color(0xFF5C6BC0),
accounts/presentation/widgets/bank_picker_sheet.dart:111:    Color(0xFF26A69A),
accounts/presentation/widgets/bank_picker_sheet.dart:112:    Color(0xFFEF6C00),
accounts/presentation/widgets/bank_picker_sheet.dart:113:    Color(0xFF8D6E63),
accounts/presentation/widgets/bank_picker_sheet.dart:114:    Color(0xFF7E57C2),
accounts/presentation/widgets/bank_picker_sheet.dart:115:    Color(0xFF00897B),
accounts/presentation/widgets/bank_picker_sheet.dart:140:        ? Colors.black87
accounts/presentation/widgets/bank_picker_sheet.dart:141:        : Colors.white;
accounts/presentation/widgets/bank_picker_sheet.dart:147:      decoration: BoxDecoration(color: color, shape: 
accounts/presentation/widgets/bank_picker_sheet.dart:152:          style: TextStyle(
accounts/presentation/widgets/bank_picker_sheet.dart:155:            fontSize: size * 0.32,
accounts/presentation/widgets/member_avatar_stack.dart:43:                  decoration: BoxDecoration(
accounts/presentation/widgets/wallet_members_view.dart:317:    final destructive = TextStyle(color: scheme.err
app_version/presentation/widgets/update_banner.dart:66:                  style: TextStyle(color: scheme.onPrim
app_version/presentation/widgets/update_banner.dart:69:              TextButton(
auth/presentation/pages/login_page.dart:118:                          TextButton(
auth/presentation/pages/register_page.dart:234:                          TextButton(
auth/presentation/widgets/auth_widgets.dart:91:      child: OutlinedButton(
auth/presentation/widgets/auth_widgets.dart:108:              decoration: BoxDecoration(
auth/presentation/widgets/auth_widgets.dart:114:                style: TextStyle(
auth/presentation/widgets/auth_widgets.dart:116:                  fontSize: 13,
categories/presentation/pages/categories_page.dart:785:                  IconButton(
categories/presentation/widgets/category_picker_sheet.dart:278:            ? IconButton(
contacts/presentation/pages/contact_detail_page.dart:654:            trailing: TextButton(
contacts/presentation/pages/contact_detail_page.dart:796:                  ListTile(
contacts/presentation/pages/contact_form_page.dart:237:                    style: TextStyle(
home/presentation/pages/home_page.dart:639:                                        decoration: BoxDecoration(
home/presentation/pages/home_page.dart:711:          decoration: BoxDecoration(
home/presentation/pages/home_page.dart:1149:                  TextButton(
notifications/presentation/widgets/notification_tile.dart:71:          : Colors.transparent,
notifications/presentation/widgets/notification_tile.dart:164:                    decoration: BoxDecoration(
pending/presentation/pages/pending_batch_add_page.dart:190:                  TextButton(
pending/presentation/pages/pending_page.dart:513:            style: TextStyle(
personal_debts/presentation/pages/debt_person_page.dart:163:                          ).copyWith(dividerColor:
personal_debts/presentation/pages/personal_debts_page.dart:299:    return ListTile(
personal_debts/presentation/widgets/debt_widgets.dart:281:    final d = await showDatePicker(
projects/presentation/pages/project_members_page.dart:254:                      child: ListTile(
projects/presentation/widgets/project_common.dart:46:    Color(0xFF64B5F6),
projects/presentation/widgets/project_common.dart:47:    Color(0xFFAED581),
projects/presentation/widgets/project_common.dart:48:    Color(0xFFFFB74D),
projects/presentation/widgets/project_common.dart:49:    Color(0xFFBA68C8),
projects/presentation/widgets/project_common.dart:50:    Color(0xFF4DD0E1),
projects/presentation/widgets/project_common.dart:51:    Color(0xFFF06292),
projects/presentation/widgets/project_common.dart:52:    Color(0xFF9575CD),
projects/presentation/widgets/project_common.dart:53:    Color(0xFFFFD54F),
projects/presentation/widgets/project_common.dart:54:    Color(0xFFA1887F),
projects/presentation/widgets/project_common.dart:55:    Color(0xFF4FC3F7),
projects/presentation/widgets/project_common.dart:56:    Color(0xFF7986CB),
projects/presentation/widgets/project_common.dart:57:    Color(0xFFE57373),
projects/presentation/widgets/project_tx_tiles.dart:373:                        style: TextStyle(color: scheme
saving_goals/presentation/pages/saving_goal_detail_page.dart:200:    final picked = await showDatePicker(
scheduled_transactions/presentation/pages/scheduled_transaction_detail_page.dart:600:                style: Te
settings/presentation/pages/settings_page.dart:189:                                  decoration: BoxDecoration
settings/presentation/pages/settings_page.dart:312:                      labelStyle: TextStyle(fontFamily: f.f
transactions/presentation/widgets/draft_form.dart:780:    final d = await showDatePicker(
transactions/presentation/widgets/draft_form.dart:1141:            IconButton(
transactions/presentation/widgets/draft_form_event.dart:261:              TextButton(
transactions/presentation/widgets/draft_form_scheduled.dart:342:    final d = await showDatePicker(
transactions/presentation/widgets/event_pick.dart:124:              style: TextStyle(
transactions/presentation/widgets/quick_create_sheet.dart:969:                            decoration: BoxDecor
transactions/presentation/widgets/splits_section.dart:559:        decoration: BoxDecoration(
transactions/presentation/widgets/transaction_tile.dart:102:            style: TextStyle(
transactions/presentation/widgets/tx_compact_hero.dart:57:                : TextStyle(
transactions/presentation/widgets/tx_compact_hero.dart:68:              style: TextStyle(color: theme.colorSch
```

- 2026-10-12 FE-A asks: ListPageBody.builder(context, padding) + floatingBarClearance + TabbedListPageBody; DetailPageBody.hero nullable; EditModeMixin.pageMessenger (editScope installs ScaffoldMessenger). FE-E told.

## 2026-10-12 — zero-raw round: 83 → 11 (accounts 3, home 2, notifications 2, pending 1, projects 1, settings 2). Deprecated: 8 Contact getters + 1 WalletMember alias; callers FE-C (debts, splits), FE-D (notifications, add_member_sheet). Owners messaged.

## 2026-10-12 — Template skeletons (0.3.1-9)
- New kit (lib/ui/organisms/page_skeletons.dart, exported): ListRowSkeleton, DayHeaderSkeleton (ListBreak), ListToolbarSkeleton, ListPageSkeleton(toolbar/grouped/days/rows), HeroSkeleton, TagsStripSkeleton, DetailRowSkeleton, SectionSkeleton, DetailPageSkeleton(tags/rows/sections/topInset); atom SkeletonText (bar laid over invisible text of the real style => exact line heights at any text scale); domain EntryCardSkeleton. Shared separators: organisms/divided_rows.dart (ListPageBody and its skeleton use the same function).
- Templates own the loading state: ListPageBody default skeleton = ListPageSkeleton (grouped when rowDividers); AsyncStateView.fallback (detail pages) default = DetailPageSkeleton; DashboardPageBody keeps its slot blocks.
- First-load guarantee in AsyncStateView: settled once a load finished OR data was shown, so a reload/pull/filter never swaps content for the skeleton (fixes pages that pass loading: status == loading).
- Tests: test/ui/skeleton_geometry_test.dart (row, DetailRow, hero, headed section, toolbar heights equal real). Hub: list-page + detail-page show the skeletons; coverage entries added.
- Owner action: pages passing their own `skeleton:` (LoadingView(), _DetailSkeleton, ContactsListSkeleton, TagsListSkeleton, _AccountsSkeleton, budgets) should drop it to get the template skeleton.
- Tree note: other sessions' sheet refactors (ResolvePick*, AdjustBalance*, AppTextRole…) currently break `flutter analyze lib`; my files analyze clean.

## Handoff 2026-10-13 (FE-B)
State: `flutter analyze` = No issues; full `flutter test` = 579 passed. Nothing committed/built (owner's rule). Tree compiles.

**Done this round (all green, in the tree)**
- Templates: ListPageBody (header/children/builder(ctx,padding)/paging/refreshEnabled/clearTopBar/rowDividers: hairlines + header hairline + 8px band), TabbedListPageBody, ListToolbar, DetailPageBody (tags slot, merges all heading-less groups into ONE top box, onRefresh auto-off in edit via EditModeScope), DashboardPageBody (+DashboardPageSkeleton), AuthPageBody (+BrandHeader, OrDivider, SocialSignInButton, LanguageThemeBar), HeroDescription/HeroNameInput (edit labels), ManageSection = buttons only.
- Skeletons mirror real layout (organisms/page_skeletons.dart, atoms SkeletonText, shared organisms/divided_rows.dart); geometry test in test/ui/skeleton_geometry_test.dart.
- Fail-fast: ApiClient GET timeouts 5s connect/10s receive (writes unchanged); AsyncStateView: skeleton ONLY on first load, `slowAfter` (8s) retry safety net, any non-Api error → error+retry; 5 page loads + 2 cubits now use `catch (e, st)` + ApiException.from; tests: test/ui/async_state_failsafe_test.dart, test/core/network/page_load_timeouts_test.dart, test/features/contacts/contact_detail_page_test.dart.
- Offline mode: ApiClient.onUnreachable/onReachable (interceptor), core/network/connection_cubit.dart (polls GET /health 3→10s backoff, backOnline +reconnects), kit ConnectionScope + ConnectionBanner, domain OfflineBanner (now takes ServerConnectionState), wired in app.dart (ConnectionCubit provider, ConnectionScope, MediaQuery.removePadding when banner shows); AsyncStateView errors at once when offline & no data; PullToRefresh reloads when reconnects changes; ModeActionBar/FormSheet/ManageSection disable while offline. arb: connectionOffline/Reconnecting/Back/Retry (th+en, gen-l10n run). Tests: test/ui/offline_mode_test.dart, test/core/network/connection_cubit_test.dart. `GET /health` added to test/hub/api_flows_baseline.txt (not in the BE spec — ask BE to spec it, then remove) + a 'connection' flow in hub/api/page_flows.dart.

**Left / not done**
- Offline gating only covers the kit pieces above; page-specific submit buttons (quick-create sheet, auth login/register submit, tag/category forms with their own AppButton) are NOT disabled while offline — wrap with `ConnectionScope.isOffline(context)` or move onto FormSheet/ModeActionBar.
- Cold-start offline (splash/boot/first page) not specially handled beyond the template error; no test of the shell wiring (app.dart builder) — only kit + cubit are tested; never run against a stopped BE container (ask DevOps).
- Dashboard skeleton slot heights are defaults (110/90/160+140/176): home should pass its real heights. EntryCardSkeleton exists but no page uses it; hub has no demo for it.
- Owners still pass their own `skeleton:`/not all pages wire onRefresh — template defaults apply once they drop them.
- Unverified on device: everything visual (nothing eyeballed by me).

**Files touched (main)**: lib/ui/{templates,organisms,molecules,atoms,domain/brand,domain/feedback}, lib/core/network/{api_client,connection_cubit}.dart, lib/app/app.dart, lib/l10n/*.arb, lib/hub/{hub_registry,pages/templates_*,pages/domain_others_page,api/page_flows}.dart, tests above.

**Gotchas for my successor**
1. Heredocs with quotes/apostrophes fail in this shell — write files with the Write tool; there is no python.
2. ui layering: generic layers (tokens/atoms/molecules/organisms/templates) must not import domain/features/l10n/core (layering_test); pass strings via params or UiStrings; AsyncStateView is organisms — it can't import ApiException (uses TimeoutException/Object).
3. Widget tests: Dio never completes under fake-async (use a fake repository, or SyncTransformer + real async); AppMessage/AppChip need the AppColors theme extension in the test theme; pages with AppTopBar need Pending/UnreadBadge/Auth cubits provided.
4. Every new gate-exported class must be in a hub page `covers` (hub_coverage_test) and a piece lives on ONE page (hub_duplicates); new endpoints must be in a page flow or the api_flows baseline.
5. Template contracts: lists clear the top bar themselves (never add paddingOf.top in pages); skeleton only on the first load (AsyncStateView `_settled`); EditModeMixin.editScope installs EditModeScope + its own ScaffoldMessenger (pageMessenger); SectionCard without heading is a BOX, DetailPageBody merges all headless ones.

## 2026-10-20 12:38 — 0.4.0-2 (นายB-fe): pickers, budget period card, budget view scope, saving-goal plan + many auto-saves, wallet hero mock
DONE · files: see each block · analyze/test: `flutter analyze lib test` = No issues; NO tests run (owner hasn't said); nothing committed since 470d30f

**1. One picker core for every entity picker**
- Kit: lib/ui/organisms/item_picker.dart (ItemPickerSheet + showItemPicker, PickerItem / Group / Filter / None / Create / FreeText / Action, layouts rows / cards / chips), picker_selection.dart (PickerChildren separate / toggle / always), picker_sheet.dart (+ subtitle, PickerConfirmBar.loading).
- Entity pickers in features: CategoryPicker, AccountPicker, BankPicker, ContactPicker (+ walletInvite, wireNames), TagPicker, EventPicker (tabs เปิดอยู่ / ปิดแล้ว), RecurringPicker, SavingGoalPicker, DebtEntryPicker, EventMemberPicker.
- Kit hooks so lib/ui can call feature pickers: TxFilterPick / TxFilterPicks (tx_filter_sheet.dart), PickBank (identifier_kind_sheet.dart).
- Old sheets deleted: 9 in lib/ui/domain, 6 in lib/features, plus partial cuts. Hub: organisms_item_picker_page, domain_entity_pickers_page. Test: test/ui/item_picker_test.dart.

**2. Hero / menu kit**
- HeroAmountField = AppInput.card hero style (same API).
- SettingMenuRow custom-value field = pill like the menu button.

**3. Budget detail**
- Period card (edit only), `_periodSection`: เริ่ม row, then the NEW kit DetailPairRow (lib/ui/molecules/detail_pair_row.dart, line between columns): ทำซ้ำ ☑ | นับรอบ chips [🔁 round] [📅 first period, budgetRangeShort] [end], or สิ้นสุด.
- View mode: period + scope cards removed. Scope = the NEW kit IconChipStrip (lib/ui/molecules/icon_chip_strip.dart) under the hero, one strip each for categories / wallets / tags. TxTagStrip now uses it. The chips are selected (tinted border).
- l10n: bgFieldRepeatToggle, bgEndOnDate, bgFieldRepeat th = นับรอบ.
- Unused keys (นายA's cleanup): bgFieldRepeatHelp, bgFieldEndHelp, fpBudgetsRepeat*.

**4. Saving goal create / edit: "แผนการออม" + many auto-saves** (BE by นายC, migration 000067)
- Edit body: one SectionCard with:
  - วันที่ครบกำหนด;
  - เงินออมเริ่มต้น (create only: amount + wallet chip → an entry right after create);
  - ออมอัตโนมัติ switch + split-bill-style rows (SplitRow: wallet pill, amount, ✕, then a round chip → showRecurrenceSheet and a next-date chip);
  - + เพิ่มรายการออม.
  No dashboard numbers on the edit page (owner).
- View: the goal's auto-saves are read-only rows (`_autoView`). The spare pool keeps the old single sheet.
- Domain: SavingAutoSave (+id, rule, listFromJson, which falls back to the legacy auto_save) and SavingAutoSaveWrite. SavingGoal.autoSaves; SavingGoalDetail.spareAutoSaves.
- repo / cubit: setAutoSaves → PUT /saving-goals/{id}/auto-saves (setGoalAutoSaves).
- Create = create → createSavingEntry → setGoalAutoSaves. A failure after the goal exists shows sgCreatedPartly and still leaves.
- Files: saving_goal.dart, saving_goals_overview.dart, saving_goals_repository.dart, saving_goal_cubit.dart, saving_goal_detail_page.dart, hub/api/page_flows.dart, test saving_goal_parse_test.dart (2 lines), l10n sg* keys.
- Owner action: run migration 000067 AND rebuild the BE together (the old BE breaks on saving_auto after the migration).

**5. Wallet detail redesign**: mock + plan only; code by นายD (kit) / นายE (page)
- Mock: https://claude.ai/artifact/9iiH4M6b4K4Mx5v5gtNnwW (hero 7 cases, overview tab, transactions tab).

deviations/notes
- Likely failing tests (not run): budgets_pages_test (period / scope text changed), saving goal page tests (edit body changed).
- Open for the owner: credit-card month box ↑ = 0, because the BE month_in counts income only, not transfers (payments). Option (b): the BE counts transfers in for credit types.
- Mockups: budget period (canvas in my scratchpad), saving goal edit https://claude.ai/artifact/96PdcTja6k6sD6WqseGmn6.

## 2026-10-20 14:10 — PLAN 0.4.0-2 B1–B4 (scan only, no code)
PLAN · files: read-only scan of recurring / pending / quick create (app) + recurring summary (BE) · analyze/test: n/a (nothing edited)

### B1 — recurring LIST page rewrite (size L)
**Files**
- rewrite `lib/features/recurring/presentation/pages/recurring_home_page.dart`
- `recurring_rows.dart` (row builders)
- `recurring_repository.dart` (+ month list paging / summary)
- `domain/recurring.dart` (+avgAmount)
- `core/router/app_router.dart` (`?tab=` mapping)
- l10n `fpRecurring*`

**Exists, reusable**
- RecurringDirectoryCubit (SyncBacked): rules + RecurringSummary (byKind count / monthly / yearly).
- `RecurringRepository.calendar(month)` = `GET /recurring-items?month=YYYY-MM`.
  - It returns every status, oldest first, and amount null = unknown.
  - The client reads page 1 only (per_page 100).
  - Paused / archived rules' items are excluded.
  - Items carry no kind.
- PendingCubit: `source.isRecurring` + `recurringRef.itemId`.
- Sheets: `showQuickCreateSheet(draft:)` (confirm / enter amount for a pending draft); `showOccurrenceSheet(amountRequired:)` + `repo.editOccurrence` (amount for an upcoming item).
- Kit: StepperPill.month, TabbedListPageBody / AppTabBar / AppTabPager, SectionCard(trailing:), DateGroupHeader, MonthCalendar (CalendarDot.warning exists but is unused), RecurringRow / RecurringItemRow / TxRow, OccurrenceStateChip, HeroNumber / HeroNote / HeroTiles + SummaryTile(tone amber, onTap), IconTile, ProgressRow.

**Missing**
- Real totals for any month: today's month_pay is an AVERAGE (BE summary.go: amount × monthlyCount).
  - Plan: compute pay / receive / count / awaiting on the client from the month item list, fetching ALL pages (a few daily rules pass 100 / month).
  - Then C3 only needs to cover what the client can't compute (below).
- Kind per item: join on `recurring.id` with the directory rules (no BE needed).
- Variable-amount "เฉลี่ย ฿x": no field anywhere → BE.
- Installment chain per row: Recurring has only progressDone / progressTotal, with no per-occurrence state (wait / skip) → BE, or progress-only.
- ต้องจัดการ:
  - Pending recurring drafts. ยืนยัน = `submitOne` when canConfirm, else open the sheet.
  - The mock also shows a FUTURE item with an unknown amount (ค่าไฟ 23 ต.ค.), which isn't in pending yet (see Q1 below).
- Group header totals: subscription ฿/เดือน | ฿/ปี from byKind; installment "เหลือ ฿x" = amount × (total − done) on the client; variable "เฉลี่ย" needs avg.
- Calendar dots: add warning dots for pending / unknown amount.

**Kit API I'd like from A**
- A2: `ModuleIconTile({required IconData icon, double size = 40})`, colours from HeroColors.
- A4: `OccurrenceChain({required int? total /*null = open-ended*/, required int current, Map<int, ChainState> states = const {}, String Function(int)? label, Color? color})` plus `OccurrenceChain.progress({done, total})` for list rows. `ChainState { paid, waiting, skipped, next, future }`.
- A5: `DateTile.small(DateTime date, {bool showYear})` and `DateTile.big(...)`.
- A6: `OccurrenceRow({Widget? leading /*DateTile or icon*/, required String title /*2 lines*/, Widget? tag, String? sub, required Widget amount, String? amountCaption, Widget? action /*ใส่ยอด / ยืนยัน button*/, bool dimmed, VoidCallback? onTap})`. ต้องจัดการ needs the trailing action; the month list doesn't.
- A11: `MonthCalendar(showStepper: false)`, `TodayLine({required String label})`, and big tabs as an AppTabBar variant (or SegmentedChoice).
- The hero 2-cell strip: HeroTiles + SummaryTile should do. Say if you want a dedicated piece.

**BE (C3)**
1. `avg_amount` on Recurring (mean of the last N done amounts) for variable rows.
2. Optional: `kind` in the item's parent ref (saves the join).
3. Optional: compact per-rule occurrence states for installment chains in list rows (e.g. `chain: ["paid","waiting",...]`); otherwise rows draw progress-only.
4. Q3 (open future): months past the generated horizon come back empty today.
5. NOT needed if the client computes the month totals from `/recurring-items?month` (all pages).

**Risks / open questions**
- Q1: ต้องจัดการ = only the pending recurring drafts (exactly the pending page)? Or also this month's future items with an unknown amount (the mock's ค่าไฟ)? The second kind isn't on the pending page.
- Q2: archived rules lose the current / archived / all filter. Proposal: a "เก็บถาวร N ›" row at the end of รายการประจำทั้งหมด.
- Q3: the + button: there's no reminder tab any more (it used `?kind=reminder`). Proposal: + opens a small kind sheet (สมาชิก / ผ่อน / รายรับ / เตือนจ่าย), then `/recurring/new?kind=`.
- Q4: past months: everything dimmed, no today line. Future months: no dimming.
- Router: `?tab=calendar` → ปฏิทิน; `reminder` / `upcoming` → ภาพรวม. Coordinate with D3, which removes `/recurring?tab=upcoming`.
- Parse crash: the BE allows `type:"saving"` rules / items; `TransactionType.fromJson` throws on unknown values, so one such rule breaks the whole page. Guard it.

**Tests likely affected**
- `test/features/recurring/recurring_pages_test.dart` (list-page group + calendar)
- `test/app/shell/main_shell_test.dart`
- `test/app/shell/cross_tab_links_test.dart`
- `test/app/shell/more_page_test.dart`
- `test/shared/fake_sync.dart`
- `test/features/pending/pending_source_recurring_test.dart`

### B2 — quick create: edit a COMMITTED tx (size M)
**Files**
- `features/transactions/presentation/widgets/quick_create_sheet.dart` (new mode)
- `transaction_edit.dart` (reuse `saveTransactionEdit`)
- `draft_form.dart` (hide splits / event in this mode)
- the caller is A13's history tab

**Exists**
- `TransactionsRepository.get` (GET `/transactions/:id`)
- `DraftFormController.prefillTransaction`
- `saveTransactionEdit` (PUT `/transactions/:id` + splits PUT + linked prompt)
- the skeleton (`quick_create_draft_skeleton`)
- entry mode (`showEntrySheet`) as the pattern

**Missing**
- `showQuickCreateSheet(editTransactionId: …)`: fetch the full tx → prefill → typeLocked, no mode tabs → save through `saveTransactionEdit`, the same rules as tx detail (canEdit / canEditCategory / showLinkedPrompt).
- Proposal (agree with A): only a SIMPLE tx opens in the sheet. Everything else opens tx detail. Complex =
  - debt entry (`counterparty`)
  - system / repayment row
  - `isLocked`
  - another member's row (`!canEditCategory`)
  - `splitCount > 0`
  - event bill (`projectId` / `eventBill`)
  - transfer
  A recurring-linked tx is fine: the linked prompt "this side / both sides" stays.

**Kit:** none needed (title "แก้รายการ").
**BE:** none.

**Risks**
- `saveTransactionEdit` returns movedToUpcoming when the date moves to the future; C1 / D3 remove upcoming, so this must follow D3.
- The C2 period name = description: editing the description here renames that occurrence; fine.

**Tests**
- `test/features/transactions/entry_sheet_test.dart`
- `test/features/transactions/quick_create_draft_skeleton_test.dart`
- `test/features/transactions/tx_detail_linked_test.dart`
- `test/features/transactions/draft_form_controller_test.dart`
- `test/app/shell/quick_create_mode_test.dart`

### B3 — quick create: edit ONE upcoming occurrence (size M)
**Files**
- `quick_create_sheet.dart` (extend entry mode)
- `features/recurring/presentation/recurring_item_actions.dart` (a helper `editOccurrenceInSheet(context, item) → ItemWriteResult?`)
- l10n

**Exists**
- Entry mode: `showEntrySheet` + EntrySheetConfig, used by `editRecurringItem`.
- `RecurringItem.toDraft()`.
- `repo.updateItem(id, draft, scope, alsoUpdateLink)` (PUT `/recurring-items/:id`).
- `setItemArchived` (`/archive`, `/restore`) = ข้าม / ยกเลิกการข้าม (there is no separate "skipped" state; skipped = archived).

**Missing**
- Header "แก้เฉพาะงวดนี้" (A12).
- Skip / un-skip inside the sheet. An archived (skipped) item opens read-only, with "ยกเลิกการข้าม" as the action.
- Save with `scope: thisOne`, skipping `askItemScope`.

**BUG to fix here:** `itemFieldsJson` sends no splits / project, but entry mode (DraftForm chipLayout) still shows an editable splits section and the event slot, so edits there are silently dropped. Hide both in B3, and in `editRecurringItem` too.

**Kit A12:**
- `QuickCreateSheetShell(subtitle: String?)`: muted, under the title.
- `QuickCreateSheetShell(headerBar: Widget?)`: fixed, between the header and the scrolling body; holds `[ข้าม]` or "งวดนี้ถูกข้าม [ยกเลิกการข้าม]".
- An alternative is `actions: List<Widget>` in the title row next to delete.

**BE:** none for the edit (PUT scope 'this' exists). It depends on C3 / Q4: settings edits must keep user-edited occurrences, or B3's edits get wiped.

**Risks**
- `showOccurrenceSheet` (amount / date only) stays for now. Whether A13 replaces it with this sheet is A's call.
- A linked occurrence: `alsoUpdateLink` is false (scope this).

**Tests**
- `test/features/transactions/entry_sheet_test.dart`
- `test/features/recurring/recurring_pages_test.dart` (detail group)
- hub `lib/hub/pages/sheet_demos/quick_create_demo.dart` (coverage)

### B4 — remove RecurringItemPage (if Q6 = ก) (size S, after B2 + B3)
**Callers (only two)**
- `features/home/presentation/pages/home_page.dart:427-430` (`_UpcomingCard`, non-card items)
- `recurring_home_page.dart:165` (`_openItem`, calendar), which goes away with B1

**Replace with `openOccurrence(context, itemId)`:** `getItem` → by state:
- pending → `showQuickCreateSheet(draft:)` (PendingCubit by `pendingId`)
- upcoming / notCreated / archived → the B3 sheet
- done → B2 (or tx detail when complex)

**Delete**
- `recurring_item_page.dart`
- the route at `app_router.dart:472`
- `/recurring/items/:id` in `hub/api/page_flows.dart` if present
- l10n keys used only there

**BE:** none.
**Tests:** home page tests that tap "กำลังจะถึง" (test/features/home/*); `main_shell_test.dart` / `cross_tab_links_test.dart` if they hit the route. RecurringItemPage itself has no tests.

### Order
- B3 and B2 first (needs A12).
- Then B4.
- B1 last (needs A2, A4, A5, A6, A11 + C3 avg). B1's hero / month list / calendar can start on today's data with the client-side totals.

## 2026-10-20 — KIT A5 / A6 / A11 / A16 (hub first)
DONE · files: see below · analyze/test: `flutter analyze lib test` shows no issues in these files (the 33 it reports are in other sessions' work in progress: saving_goals_list_page / its tests / transaction_tile); no tests run

**New kit**
- `lib/ui/molecules/date_tile.dart`
  - `CalendarTile({date, color?, width = 64})`: a tear-off sheet: a month strip in the card's accent (HeroColors), the day big, the weekday.
  - `DateTile({date, caption?, weekday = false, color?, today?})`: the day over its month, plus "yy" when it's not this year ("ม.ค. 27"); the weekday when `weekday:`; any caption ("พรุ่งนี้"). `DateTile.minWidth = 38`.
- `lib/ui/molecules/today_line.dart`: `TodayLine({label, color?})`, the accent label + line.
- `lib/ui/domain/recurring/occurrence_row.dart`
  - `OccurrenceRow({leading, title, tag?, sub?, amount?, amountCaption?, action?, titleMaxLines = 2, dimmed, onTap})`.
  - `OccurrenceAction({label, onTap, warning = false, destructive = false})`.
  - `OccurrenceActions({primary, more = [], moreTooltip})`: the primary is an AppButton (chip size; warning-coloured when `warning`), the rest sit behind ⋯ (an OptionMenuAnchor).
- `lib/ui/domain/recurring/due_card.dart`
  - `DueCard({title, trailing?, children})`: a card with a warning edge.
  - `DueGroupHeader({label, caption?, actions?})`: an item with many due; the actions are an OccurrenceActions for ยืนยันทั้งหมด + จ่ายแล้ว / ข้ามทั้งหมด.
  - `DueMoreRow({label, onTap})`.

**Changed kit (additive, defaults keep the old look)**
- `TxRow(titleMaxLines = 1)`
- `SegmentedChoice(expand = false)`: full width, equal segments, titleSmall label
- `MonthCalendar(showStepper = true)`

**Hub**
- `domain_recurring_page.dart`: MonthCalendar(showStepper:false) under a page stepper, CalendarTile + DateTile, TodayLine + OccurrenceRow (a month's list), DueCard.
- `molecules_pickers_inputs_page.dart`: SegmentedChoice expand.
- `hub_registry` covers: CalendarTile, DateTile, TodayLine, OccurrenceRow, OccurrenceAction, OccurrenceActions, DueCard, DueGroupHeader, DueMoreRow.
- `ui.dart`: 4 exports.

**Notes**
- DueCard is data-agnostic: the page (B1 / A13) maps the C3 occurrences into rows and actions.
- Tags are AppChip(mini, selected, color).
- Unused after this: nothing yet.

## 2026-10-20 — B2 / B3 / B4 + C3 data layer + A15 fixes (CODED, analyze clean, tests not run)
`flutter analyze` on the whole app is clean, except นายA's in-progress recurring_detail_page.dart. Tests have not been run; that waits for the owner. Everything is written against นายC's C3 contract (v3.1–v3.3, not coded yet). With today's BE it falls back: a row without a slot behaves as before.

**C3 data layer** (recurring/{domain,data}; the split with นายA was agreed)
- RecurringItem gets ruleId / slot / stored / autoCreated / needsAmount and `bySlot`. A computed occurrence's id = `slot:{rule}:{slot}`. RecurringParent gets kind.
- ItemWriteResult gets `leftOut` [(slot, reason)]. `applyTo` also matches on rule + slot, so a computed row that got stored replaces its old row.
- OccurrenceState gets `paid`. 'due' parses as notCreated (ค้าง) and 'skipped' as archived (ข้าม).
- RecurringRepository:
  - reads: monthItems(month) / dueItems({ruleId}) (all pages, `status=`), occurrences(ruleId, {txDate, past, upcoming}) → (items, suggestedSlot), getOccurrence(ruleId, slot)
  - writes: confirmOccurrence / skipOccurrence({deleteTx}) / restoreOccurrence / markOccurrencePaid / unmarkOccurrencePaid / updateOccurrence (presence-based PUT) / settleAll(OccurrenceBulk.confirm|markPaid|skip)
- RecurringLinkRepository:
  - linkOccurrence / unlinkOccurrence by slot
  - `replace` on both link calls
  - LinkResult.item
  - LinkOccurrence gets ruleId / slot / linkedTxId plus `.ofItem`; LinkCandidate.replace
- Tolerant parsing, so a computed occurrence (id null) doesn't crash:
  - RecurringItemLink (transactions/domain/refs.dart) gets `slot`
  - UpcomingItem (home/domain/dashboard.dart) gets ruleId / slot
  - CurrentOccurrence.slot: นายA added it

**B2: 2-step link** (owner link rules 1–4)
- RecurringPicker:
  - Step 1: rules sorted by nearest due.
  - Step 2: that rule's occurrences.
    - Groups: งวดใกล้เคียง (BE `suggested_slot`) / ค้าง / งวดถัดไป / งวดที่ผ่านมา. Skipped ones are hidden.
    - A pinned "เลือกรายการประจำอื่น" goes back to step 1.
    - Picking an occurrence another tx holds asks "สลับรายการที่ผูก?". No goes back to step 2; yes links with replace.
  - An old BE (no slot) stays 1 step.
- RecurringLinkHandle:
  - links by slot
  - a 409 ALREADY_LINKED asks swap / move, then retries with replace
  - tx detail passes replace when the tx is moving off its own occurrence, and unlinks by slot
  - quick create passes the tx date

**B3: one occurrence in the quick create sheet**
- New `features/recurring/presentation/occurrence_actions.dart`:
  - `openOccurrenceSheet` / `openOccurrence` (by address)
  - `occurrenceActionsFor` (ต้องจัดการ row buttons)
  - `settleAllActions` (DueGroupHeader bulk)
  - `confirmOccurrence` / `skipOccurrence` / `linkExistingTx` / `occurrenceFields`
- Sheet:
  - subtitle "แก้เฉพาะงวดนี้"
  - chips ข้าม / จ่ายแล้ว / ผูกกับรายการที่มีอยู่ (once settled: ยกเลิกการข้าม, or ยกเลิกจ่ายแล้ว + ผูก)
  - บันทึก = PUT of the changed fields only
  - ยืนยัน = PUT the other edits, then confirm (the tx is dated on the slot unless the date was changed, R21)
  - An occurrence with a tx opens the tx; pending → /pending; no slot → the old item sheet.
- Skipping an occurrence that has a tx asks "ข้ามงวดนี้?" (เก็บรายการไว้ | ลบรายการ), owner rule 5.
- New `TransactionPicker.one` (transactions/presentation/widgets): the tx side of "ผูกกับรายการที่มีอยู่". It shows that type's tx within ±45 days, nearest first, under น่าจะใช่ / ใกล้วันที่. A tx linked elsewhere asks before it moves.
- quick_create_sheet.dart entry mode:
  - new EntrySheetConfig `subtitle` / `chips` (EntrySheetChip)
  - **bug fixed**: an entry no longer shows splits (they were silently dropped)
- Hub (entity pickers → recurring):
  - a fake 2-step RecurringPicker demo (a passed `loadOccurrences` forces step 2)
  - a TransactionPicker demo

**B4**
- Deleted:
  - `recurring_item_page.dart`
  - route `/recurring/items/:id`
  - page flow `recurring-item`, replaced by `recurring-occurrence`, which lists every new occurrence call as unspecified
- Home "ใกล้ถึง" card: a recurring card now opens the occurrence sheet (`openOccurrence`) and reloads the dashboard after a write.
- The ใกล้ถึง group shows a count of the overdue recurring cards, and "ดูทั้งหมด" → `/recurring?focus=due` (plain `/recurring` when nothing is due). **My reading of "badge counts due". Tell me if it's meant somewhere else.**
- The calendar tab's `_openItem` on the old recurring_home_page uses the sheet. That page is replaced in B1.

**A15 review fixes** (in my kit pieces)
- ⋯ tooltip defaults to the new `UiStrings.more` (= l.commonMore).
- A destructive primary → AppButtonVariant.destructive.
- DateTile's muted line uses HeroColors.muted.
- The › is gone from the DueMoreRow doc.
- The hub has a 2-line TxRow.
- New `OccurrenceRow.amountWaiting` ("รอใส่ยอด" in the warning colour).

**Tests touched, not run:**
- the recurring_link_test fake gets the new link methods, and unlinkNow takes a RecurringItemLink
- the tx_detail_link_rows_test / tx_detail_linked_test fakes get `skipOccurrence`

**Left unused, for A18:**
- l10n `recurringItemStatusTitle`, `recurringItemStatusDescription`, `recurringItemStatusUpcoming`, `recurringItemStatusNotCreated`, `recurringItemStatusPending`, `recurringItemStatusDone`, `recurringItemStatusArchived`
- `RecurringItemActions` / `askCreateTarget` / `addRecurringItem` / `createFromRecurringItem` / `askItemScope` (recurring_item_actions.dart): still used only by นายA's detail page (RecurringItemActions). Check after A13.

**Open / for the owner:**
- Bulk ข้ามทั้งหมด / จ่ายแล้วทั้งหมด have no confirm dialog (owner's words didn't ask for one).
- The "อัปเดตยอดรายการประจำด้วยไหม" ask is not shown when linking from the occurrence side.

Next: B1 (the recurring list page).

## 2026-10-20 — B1 recurring list page (CODED, analyze clean, tests not run)
`flutter analyze` on the whole app is clean, except นายA's in-progress recurring_detail_page.dart. Tests have not been run; that waits for the owner.

**Page** `recurring_home_page.dart` is rewritten:
- `RecurringHomeTab { overview, calendar }`, with SegmentedChoice(expand) ภาพรวม | ปฏิทิน at the top. It scrolls with the page; nothing folds.
- Hero:
  - HeroModuleTile + StepperPill.month + MoneyVisibilityToggle
  - จ่ายรวมทั้งเดือน (big) and รายรับ (note), both computed on the client from `monthItems` (every page, skipped ones excluded)
  - HeroTiles: รายการเดือนนี้ N | รอใส่ยอด N (amber; tapping scrolls to ต้องจัดการ)
- ภาพรวม:
  - The month's occurrences inside the hero (HeroInsetBox + OccurrenceRow + DateTile ("พรุ่งนี้") + TodayLine).
    - This month: the past is dimmed unless still waiting.
    - A past month: everything dimmed, no today line (R4).
    - A coming month: nothing dimmed.
  - Each row:
    - tag: ค้าง / รอยืนยัน / จ่ายแล้ว / ข้าม / บันทึกอัตโนมัติ
    - sub: wallet | n/total
    - amount, or amountWaiting "รอใส่ยอด" + "เฉลี่ย ฿x" from the rule's avgAmount
    - tap → openOccurrenceSheet
  - ต้องจัดการ (DueCard, from `dueItems()` (status=due) + client filter): grouped per rule.
    - A rule with ≥ 2: DueGroupHeader (name, "ค้างตั้งแต่ … | N งวด", settleAllActions).
    - Up to 3 rows, each with occurrenceActionsFor; past 3, DueMoreRow → the rule's page.
    - It reuses นายA's keys occurrenceDueTitle / occurrenceDueSince / occurrenceDueMore.
  - รายการประจำทั้งหมด:
    - SectionHeader with 🔍 (ToolbarToggleButton + ListToolbar search) and + (straight to /recurring/new, R3)
    - groups สมาชิก (฿/เดือน | ฿/ปี) / ผ่อน (เหลือ ฿x) / เตือนจ่าย (เฉลี่ย ฿/เดือน) / รายรับ (฿/เดือน), then หยุดไว้
    - no archived rules (R2)
    - Installment rows get the OccurrenceChain (new `endChainDots(Recurring)` in recurring_rows.dart: the BE's `chain`, else from progress).
- ปฏิทิน: MonthCalendar(showStepper: false) inside the hero (warning dots for waiting days), then the picked day's rows with their buttons. An empty day shows nothing (no absence label).
- `?focus=due` scrolls to ต้องจัดการ once it loads. It steps down until the card is built, since the hero can be long.
- Changing the month keeps the old rows until the new ones arrive; a failed new month shows the error view.
- Writes patch with `applyTo`, then reload the month, the due list and the directory.

**Router:** `?tab=calendar` → ปฏิทิน; anything else (old `recurring` / `reminder` / `upcoming`) → ภาพรวม. `?focus=due` → focusDue.

**Data:** `RecurringItem.tryParse`: a row of a type the app doesn't know (the BE's `saving`) is skipped, not a crash. It's used in `occurrences()`.
- **นายA:** please use it in ItemPage.fromJson. Recurring.fromJson has the same `TransactionType.fromJson` throw.

**New l10n:** recurringHomeTabOverview / MonthPay / MonthIncome / MonthCount / ItemCount / Today / AllTitle / PerMonthYear / PerMonth / AvgPerMonth / Left.

**Left unused, for A18:**
- l10n:
  - recurringTabRecurring, fpRecurringTabReminder, fpRecurringListCaption
  - fpRecurringAwaitingAlert, fpRecurringMonthLine
  - fpRecurringGroupDue, fpRecurringGroupComing, fpRecurringAddReminder
  - recurringFilterCurrent / Archived / All, recurringStatusLabel
  - recurringArchivedEmpty, fpRecurringCalendarNone
- code:
  - `RecurringFilter` (recurring.dart)
  - `RecurringList` (recurring_repository.dart)
  - `RecurringRepository.calendar`
  - `RecurringItemRow`, `ItemDateGroup` / `groupItemsByDate` (recurring_rows.dart)
  - `RecurringHomeTab.recurring / reminder` (gone)
- Tests still use some of these.

**Tests likely broken (not run):**
- `test/features/recurring/recurring_pages_test.dart`, list-page group: AppTabBar<RecurringHomeTab>, the old tabs, `calendar()` in the fake repo.
- Possibly `test/app/shell/main_shell_test.dart`, `cross_tab_links_test.dart`, `more_page_test.dart`.

## 2026-10-20 — BE split items 2 (C2 occname) + 4 (notifications) (CODED, vet clean, tests NOT run, not deployed)
This is from นายC's split, approved by the owner via นายA. No Go test runs, no commits, no BE / docker rebuild.

**Checks**
- `go vet ./internal/modules/notifications/` is clean.
- `occname.go` + `occname_test.go` vet and build clean, checked as a standalone copy in my scratchpad.
- `go build ./...` doesn't compile today, because of other sessions' in-progress files:
  - `budgets/count.go`: ItemRecurring, s.expected (นายE's readers)
  - `recurring/occurrence.go:79`: uuid vs *uuid (นายC's C3)
- None of those lines are mine.

**Item 2: `internal/modules/recurring/occname.go`** (new, pure, no DB) **+ `occname_test.go`** (table test, 27 cases, not run)
- Signature: `OccurrenceName(OccNameInput{RuleName, Freq, Interval, Weekdays, Slot, Seq, Total, Lang}) string`.
- Thai:
  - daily: ประจำวันที่ 20 ต.ค. 2026
  - every 3 days: ประจำ 20–22 ต.ค. 2026
  - weekly: ประจำสัปดาห์ 20–26 ต.ค. 2026, which crosses months / years as 28 ต.ค. – 3 พ.ย. 2026 and 29 ธ.ค. 2026 – 4 ม.ค. 2027
  - every 2 weeks: ประจำ 20 ต.ค. – 2 พ.ย. 2026
  - monthly: ประจำเดือน ต.ค. 2026
  - every 3 months: ประจำ ต.ค. – ธ.ค. 2026, or ประจำ พ.ย. 2026 – ม.ค. 2027 across years
  - yearly: ประจำปี 2026; every 2 years: ประจำปี 2026–2027
  - installment: "{name} งวด 5/12 ประจำเดือน ต.ค. 2026"
- English:
  - "Netflix – Oct 2026", "Lunch – 20 Oct 2026", "Swimming – week of 20–26 Oct 2026"
  - "Cleaner – 20 Oct – 2 Nov 2026", "Insurance – Nov 2026 – Jan 2027", "Car tax – 2026"
  - "iPhone 17 5/12 – Oct 2026"
- Q7:
  - `dates` and weekly with several weekdays are named by the day.
  - The span is sized from the rule step (slot + step − 1), never from the next row, so the last occurrence reads like the others.
- Other rules:
  - Interval 0 counts as 1.
  - An empty rule name gives the period only.
  - Any Lang other than "en" is Thai.
  - Years are Gregorian.
- No other recurring/*.go file is touched; นายC integrates it.

**Item 4: notifications** (`model.go`, `service.go`, `recurring.go`)
- `RecurringDueTx`: the deep link is now `/recurring?focus=due`, both for a new notice and when the unread grouped notice is bumped (its `deep_link` is updated too).
- New `TypeRecurringAutoCreated = "recurring_auto_created"`, which can be muted (`mutableTypes`).
- New `RecurringAutoCreatedTx(ctx, tx, userID, count int, date string)`:
  - ONE notice per user per date: an UPDATE adds to `payload.count` where `payload->>'date' = date`, else an INSERT
  - payload `RecurringAutoCreatedPayload{count, date}`, deep link `/recurring`
  - the row stays one row whether read or not, and is not bumped to the top (it's a quiet notice)
  - it takes `pg_advisory_xact_lock(hashtext('recurring_auto_created:' || user || ':' || date))` first, so two due checks at once can't insert two rows for the day. This is the same pattern as saving_goals/store.go, and needs no new index.
- Not added to the attention lists (dashboard `attentionTypes`, `shared/notification_view.go`), because it's quiet.

**`notifications.type` has a CHECK** (`notifications_type_check`, last set in 000057; 068 doesn't touch it). An insert of the new type fails until 068 adds it. Lines for นายC's 068:
- up:
  ```sql
  ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
      'split_created', 'split_paid', 'split_received', 'split_changed',
      'project_tx_recorded_for_you', 'project_tx_changed', 'project_invite',
      'contact_link_request', 'account_invite', 'project_added',
      'recurring_due', 'recurring_ending', 'recurring_auto_created'));
  -- optional: old unread due notices still point at /pending
  UPDATE notifications SET deep_link = '/recurring?focus=due' WHERE type = 'recurring_due' AND deep_link = '/pending';
  ```
- down:
  ```sql
  DELETE FROM notifications WHERE type = 'recurring_auto_created';
  ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
      'split_created', 'split_paid', 'split_received', 'split_changed',
      'project_tx_recorded_for_you', 'project_tx_changed', 'project_invite',
      'contact_link_request', 'account_invite', 'project_added',
      'recurring_due', 'recurring_ending'));
  ```
- `notification_settings.muted_types` has no CHECK, so it needs nothing.

**Left for others**
- openapi.yaml (C6 / นายC): `NotificationType`
  - add `recurring_auto_created` to the enum, with payload {count, date} and deep_link /recurring
  - the recurring_due description still says deep_link /pending
- App (via นายA):
  - a notification tile for `recurring_auto_created` ("บันทึกอัตโนมัติ {count} รายการ" → /recurring)
  - the type in the app's mute settings list if types are listed there
- Tests (C6): a DB test for the per-day grouping (two calls → one row, count summed; a new date → a second row) and for the recurring_due deep link.

## 2026-10-20 — app side of the C8 notices: recurring_auto_created + the due notice moved off pending (CODED, analyze clean, tests not run)
นายA assigned this as part of the approved C8 plan. App only. The whole app analyzes clean. No tests, no commits.

**New type `recurringAutoCreated('recurring_auto_created')`** (notification.dart)
- Parsing was already unknown-safe: `fromWire` falls back to `unknown`.
- Tile:
  - a system notice from "รายการประจำ" with the recurring icon, like recurring_due
  - title `notifRecurringAutoCreated(count)`: "บันทึกอัตโนมัติ {count} รายการ" / "Recorded {count} automatically"
  - no button and not pending (quiet); tap = mark read + the deep link /recurring
- Settings: a row under รายการประจำ with the same off / notify modes as recurring_due (no auto)
  - label `notifTypeRecurringAutoCreated` "บันทึกอัตโนมัติ"
  - hint `notifTypeRecurringAutoCreatedHint` "แจ้งวันละครั้ง ว่าบันทึกให้กี่รายการ | ปิด = ไม่แจ้ง"
- Hub (domain_others_page): a new HubUse for the quiet notice.

**recurring_due follows the new BE link** (recurring is out of pending)
- The button opens the notice's deep link (BE: /recurring?focus=due), else falls back to /recurring?focus=due. It no longer goes to /pending.
- New label `notifActionOpenDue` "ไปจัดการ ›" / "Open ›".
- Texts changed:
  - `notifRecurringDue`: "รายการประจำถึงกำหนด {count} งวด รอจัดการ" / "{count} recurring payments are due"
  - `notifTypeRecurringDueHint`: "อยู่ใน ต้องจัดการ หน้ารายการประจำเสมอ | ปิด = ไม่แจ้ง"

**Left unused, for A18:** l10n `notifActionOpenPending`.

**Tests likely affected (not run):** `test/features/notifications/notifications_inbox_page_test.dart`:
- :460 expects 'Open pending ›'
- the fixture at :144 has deepLink '/pending'
- the settings test may want a row for the new type

## 2026-10-20 — app re-checked against นายC's final C3 contract ("C3 + C8 + C2 integration landed")
The whole app analyzes clean. Tests not run.

**Changed**
- There is no `GET /recurring/{id}/occurrences/{slot}`. The picker endpoint windows around today, not tx_date, so it can't fetch an arbitrary slot either.
- `getOccurrence` is replaced by `RecurringRepository.findOccurrence(ruleId, slot, {date})`. It reads `GET /recurring-items?month=&status=all&rule_id=`, the date's month first (a moved occurrence), then the slot's, and matches the slot.
- `openOccurrence` gets `date`. The home card passes `dueDate`.
- An occurrence that isn't found opens `/recurring/{rule}`.
- Page flow `recurring-occurrence` open step: `listRecurringItems` (?month&status=all&rule_id) instead of the unspecified GET.

**Checked, no change needed**
- `status=all` is always sent with a month (monthItems, findOccurrence).
- `status=due` (ต้องจัดการ) and the statuses due / skipped / paid parse.
- The bulk `left_out` reason is needs_amount.
- LinkResult `item`.
- 409 `ITEM_ALREADY_LINKED` with `details.transaction` / `details.other` (swap vs move prompt).
- `DELETE /transactions/{id}?skip_occurrence=true`.
- Picker `{data, suggested_slot}`.
- Dashboard upcoming rows carry `rule_id` / `slot` (id = the stored item, else the rule).
- The removed `POST /recurring-items/batch` and `/recurring-items/{id}/create` are called only from the unused `RecurringItemActions` / `createFromRecurringItem` path (already on A18).
- `auto_create_since` isn't in my code (นายA's recurring.dart).
- Item `transaction {amount, date}`: the swap prompt names the other tx by description / wallet. The amount isn't shown (BoardSourceTx keeps id / description / account only).

## 2026-10-20 — C6 (my part): openapi recurring + notifications tests (CODED, build + vet clean, tests NOT run)
Assigned by นายA. Source of truth: be.md "C3 + C8 + C2 integration landed" + นายC's Go structs. No Go test runs, no commits, no rebuild.

**Checks**
- `go build ./...` is clean.
- `go vet` is clean for notifications, recurring, apidoc/... and transactions.
- The spec parses with goccy/go-yaml (the BE's lib, in a scratch module): 147 paths, every `$ref` resolves, no duplicate operationIds, every `required` key is in `properties`.
- Every spec route is registered in main.go (the batch / create routes are gone from both).

**openapi.yaml (recurring; นายE's BudgetItem / me edits untouched)**
- New operations (operationIds):
  - `listRecurringOccurrences` (GET /recurring/{id}/occurrences)
  - `confirmRecurringOccurrencesReady`, `markRecurringOccurrencesPaidReady`, `skipRecurringOccurrencesReady`
  - `updateRecurringOccurrence` (PUT …/{slot})
  - `confirmRecurringOccurrence`, `skipRecurringOccurrence`, `restoreRecurringOccurrence`
  - `markRecurringOccurrencePaid`, `unmarkRecurringOccurrencePaid`
  - `linkRecurringOccurrence`, `unlinkRecurringOccurrence`
  - new path parameter `SlotPath`
- Removed:
  - `batchRecurringItems` (POST /recurring-items/batch)
  - `createFromRecurringItem` (POST /recurring-items/{id}/create)
  - the schemas RecurringItemBatchRequest / RecurringItemBatchResult / RecurringItemCreateNowRequest
- Schemas:
  - `RecurringItem`:
    - id nullable; new rule_id, slot, stored, auto_created, needs_amount
    - status: upcoming | due | done | paid | skipped | pending
    - `transaction` uses the new `RecurringItemTx` {id, description, account, amount, date}. LinkedTx stays as it is for event bills.
    - created_at / updated_at are nullable
  - `RecurringRef.kind`: optional, because only the recurring module sends it (omitempty)
  - `Recurring`:
    - counts {upcoming, due, pending, done, paid, skipped, not_created, archived}
    - due_count, avg_amount, chain [{slot, status}], auto_create, recorded_tx_count
    - `RecurringOccurrence`: item_id nullable, rule_id, slot, status upcoming | due
  - `RecurringItemList.window` (required, null except tab=upcoming of a no-end setting)
  - `RecurringDetail.stats` + `tx_update`
  - summary due_count / due_total
  - requests:
    - create / update `auto_create`; update `also_update_tx`
    - `RecurringLinkRequest.replace`
    - new: RecurringOccurrenceEditRequest, RecurringConfirmRequest, RecurringSkipRequest
  - results: RecurringOccurrencesResult, RecurringBulkResult (left_out reason needs_amount), RecurringUnlinkResult (also used by the by-id unlink)
- Params:
  - listRecurringItems: status due / paid / skipped / pending / all (+ the old names), `state` alias, `rule_id`
  - listRecurringRuleItems: `from` / `months`
  - deleteTransaction: `skip_occurrence`
  - extendRecurring: now declares 409
- Errors documented: AUTO_CREATE_NEEDS_AMOUNT / AUTO_CREATE_NEEDS_WALLET / AMOUNT_REQUIRED / ALREADY_RECORDED / ITEM_ALREADY_LINKED (details.transaction / details.other).
- `NotificationType`: + recurring_auto_created; recurring_due's deep link is /recurring?focus=due.
- Descriptions are rewritten for the computed model: create / update / pause / resume / extend / delete, the by-id calls as the stored-row forms, and the tx delete.

**recurring_test.go (นายC's):** only the empty `op` strings were filled in, 78 calls:
- every recurring call and the deleteTransaction calls get their operationId, with error statuses only where the spec declares them
- the 3 GET / PUT /transactions calls stay ""

**notifications/handler_test.go** (new, DB-backed, not run):
- `TestRecurringAutoCreatedGroupsPerDay`:
  - 2 + 3 on the same day → 1 row of 5, link /recurring; 0 → no change
  - read, then +1 the same day → still one row (6), still read
  - a new day → its own row
  - listed by listNotifications (conform)
  - muted → nothing written
- `TestRecurringDueDeepLink`:
  - a new notice → /recurring?focus=due
  - an old unread one on /pending, bumped → 1 row, count 3, the new link
  - due(0) → no change

**For the first test run (นายC / C6)**
- the conformance of every recurring call now runs against the new schemas
- where Go and spec could differ:
  - `current_occurrence.status` is assumed upcoming | due only
  - RecurringRef.kind is optional
  - chain statuses include pending

## 2026-10-20 — after นายC's "C3 / C8 review fixes": openapi + the settle-all snack (CODED, analyze / build / vet clean, tests not run)
**openapi.yaml**
- `RecurringBulkResult.left_out.reason`: needs_amount | refused; confirm-ready description says each occurrence runs on its own savepoint.
- `resumeRecurring`:
  - what was due before the pause stays due
  - the occurrences in the pause (from the pause day to yesterday) are stored as SKIPPED
  - tracked_from is untouched
  - the due notice and auto-create start from today
- `listRecurringOccurrences.suggested_slot`: the oldest overdue occurrence of ALL, even past the 24 listed.
- `linkRecurringItem` acts on the stored row itself, a manual one included.
- me/counts: the stale "0 until the occurrences are computed (recurring v3)" clause is gone.
- The spec parses (147 paths, refs OK). `go build ./...` and vet (apidoc, recurring) are clean.

**App**
- The `settleAllActions` snack is split by reason, joined with " | ": "เหลือ N งวดที่ยังไม่มียอด" (needs_amount) and the new `occurrenceLeftOutRefused` "บันทึกไม่ได้ N งวด" / "N couldn't be recorded" (refused). With nothing left out it shows the plain saved snack.
- Picker (review item 11): step 2 groups by state and `suggested_slot`, not by list order, so oldest-first changes nothing. Clearing an occurrence's amount already sends `amount: null`.
- flutter analyze is clean.

## 2026-10-20 — test run + fixes, my folders (owner: "สั่งให้แก้เทสได้เลย แบ่งๆ กัน", via นายA) — ALL PASS after 2 fix loops
Folders: test/features/transactions, recurring, pending, notifications, home, pickers_test.dart. First run: 275 passed, 18 failed. After 2 loops: 0 failed (the last re-run of the failing files: 40 / 40).

**Per folder (first run → now)**
- transactions: 7 failed → 0.
  - `tx_detail_linked_test`: 3 stale. A recurring-linked tx now asks owner rule 5 ("Delete only (the occurrence is due again)" / "Delete and skip the occurrence" / Cancel → `skip_occurrence`), not the old "Delete the linked item too?". The fake records skip_occurrence; Cancel taps the dialog's one.
  - `recurring_link_test`: 4 failed. 1 stale: a 409 now asks "สลับรายการที่ผูก?" (owner rule 1, swap asks). The unanswered dialog hung the file, so the 3 after it timed out.
    - The test is split into ยกเลิก (its message, one try) and สลับ (a second link with replace).
    - The fake throws only without replace and logs " (replace)".
- recurring: 9 failed → 0. `recurring_pages_test` list-page group: stale, the old 3-tab page. Rewritten for B1:
  - the opening reads (month + due)
  - big tabs above the hero above the rules; every rule by kind
  - month totals / tiles / list / today line
  - ต้องจัดการ: rows + buttons + the per-rule header
  - ปฏิทิน: grid + day, no new read
  - search, failed sync, ?tab=calendar, paused group, network down + retry
  - The fake gets monthItems / dueItems in place of calendar(); `_occ` builds C3-shaped occurrences.
- pending: 1 failed → 0. `pending_saving_test`: stale. นายD removed PendingSource.recurring (D3; the owner: old drafts "ปล่อยไป", confirmed by นายA), so the test now expects no recurring chip.
- notifications: 1 failed → 0. `notifications_inbox_page_test`: stale wording. The due notice says "3 recurring payments are due" / "Open ›", fixture link /recurring?focus=due.
- home, pickers_test.dart: all passed.

**A real bug found and fixed (my B1 page):** `recurring_home_page.dart` passed `isEmpty: false` to ListPageBody, so it never showed the skeleton or the error view: a failed month load showed an empty month. Now `isEmpty: _items == null`.

**Note for the others:** test/app (main_shell / cross_tab_links, นายE's folders) may open /recurring. The page now shows a skeleton until the month loads, and its fake repo needs `monthItems` / `dueItems`.
