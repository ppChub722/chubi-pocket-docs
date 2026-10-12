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
