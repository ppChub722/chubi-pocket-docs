# Events pages — 0.4.0 rework report

Branch: `worktree-agent-a1a9adf60ab7f1ba0` (reset onto `feat/0.4.0-fe-pages` e7ec562 first: the worktree had been created from the stale 0.3.1-10 commit 4d838f1, so none of the new kit existed).

## What changed

Feature (`lib/features/projects`)
- `pages/projects_page.dart`: list on `ListPageBody` — pinned `ListSummaryCard` (my_share_total, "ฉันจ่ายไป → รอรับ", 3 `SummaryTile` status filters with BE counts, 🔍 `ToolbarToggleButton`) + collapsed `ListToolbar` (search, my-tags chip, sort chip) + `EventListRow` rows + dashed add tile. Failed refresh with data keeps rows + `AppMessage`; page-fill paging kept.
- `pages/project_detail_page.dart`: ONE page (no tabs) for view / edit / create (`id == null`; `/projects/new` now builds it). View = `DetailLayout`: `HeroCard` (status ▾ + date chip, 🔍, ✏️, icon, description, `HeroNumber` ใช้ไปรวม, `HeroBar` only with a plan, tiles ส่วนของฉัน / รอรับ|รอจ่าย, `HeroValueLine` for income) → `TagRow` "แท็กของฉัน" → `PeopleStrip` → `NoteSection` → records (hidden `ListToolbar`, event-tag `ChipRow`, bills grouped by day in `SectionCard`s, add tile). Edit = `HeroCard(editing)` + `HeroAmountField` + `TagRow` + `InfoBox` date range + `SettingsSection` (manage tags) + `NoteSection` + `EndZone` (archive / restore, delete with the 3-choice dialog). Overview hidden in edit.
- `project_board_controller.dart` (new, logic only): bills filter (q, tag, mine, payer, sort) + paging, one call per change.
- `widgets/event_tags_manager.dart` (new, thin wrapper): BE calls for the kit sheet.
- `widgets/project_tx_tiles.dart`: `ProjectTxIcon` class → `projectTxIcon()` function; bill row shows "X จ่าย · หาร n คน".
- Deleted: `project_form_page.dart`, `project_dashboard_tab.dart`, `project_tx_list_tab.dart`.
- Domain / data / cubit: `Project` + my_paid / my_share / my_receivable / my_payable / remaining; positions receivable / payable; `ProjectListSummary`; `writeEventTag` (POST/PUT), `deleteEventTag`, `archive`, `restore`; cubit summary + tile filters + archive / restore; `ProjectView.apply` refreshes rows' tags.
- `lib/core/router/app_router.dart`: `/projects/new` → `ProjectDetailPage()`.
- ARB: 66 `fpEvents…` keys appended (th + en).

Kit (all exported via ui.dart or existing files; all in `covers:`)
- `EventListRow` (`domain/events/event_list_row.dart`, ui.dart line `export 'domain/events/event_list_row.dart';`) — hub: Events page demo; covers `EventListRow`.
- `EventTagsSheet`, `EventTagItem`, `EventTagsLabels` (`domain/events/event_tags_sheet.dart`, exported) — Events hub demo; covers added.
- `HeroValueLine` (hero_card.dart) — covers in Hero card page; demo added there. `HeroAmountField.helper` added.
- `DetailRecords` (detail_layout.dart) — covers + demo in Hero card page.
- `PeopleStripMember.lead`, `PeopleStrip.actionLabel/onAction` (demo updated), `ChipRow.label`, `TagRow.label`, `ListToolbar.sidePadding`, `AppIcons.download`.
- `EventCard` kept untouched (now unused by the app; still demoed/tested). Name `EventRow` was taken by `split_event_section.dart`, hence `EventListRow`.

## Decisions taken
- Status tiles: BE `status` has no unsettled / ended · so tiles read `all` and narrow by row fields (status, my_receivable / my_payable), paging a few pages if a page narrows to nothing · undo: send BE `status=unsettled|ended` and drop `_inFilter` narrowing in `projects_cubit.dart`.
- Default tile กำลังทำ is ringed; tapping the ringed tile returns to it · cubit/picker need `active` as default · undo in `_tiles`.
- Kept the my-tags filter chip in the list toolbar (spec lists only search + sort) · otherwise personal tags can't filter · remove the chip in `_toolbar`.
- คนจ่าย filter is client-side on loaded bills (BE has no param) · see BE request · undo when BE adds it.
- "ส่วนของฉัน" tile toggles the BE's `mine` bills filter; รอรับ/รอจ่าย tile is display only (no BE filter exists) · undo: set onTap.
- No bottom-+ event preset exists (`QuickCreatePreset` has no event mode and the shell is out of scope): bills are added with a dashed "+ เพิ่มรายการ" tile in the records, as before · add an event preset later.
- Status menu keeps all 4 statuses (incl. archived via PUT) plus the new archive route in the end zone; archived events show "กู้คืน" in the end zone.
- Create merged into `ProjectDetailPage` (no separate form page) · settings (manage tags) and end zone hidden while creating.
- Dates: one range picker; ✕ on the chip clears both.
- Records use `SectionCard` per day (DetailLayout pads 16, rows are boxed).
- Edit-mode my-tags change is part of the form (sent as `tag_ids` on save); in view mode it is one immediate PUT.

## Requests to BE
1. `GET /projects?status=unsettled|ended` (counts exist, filters don't).
2. `member_id` filter on `GET /projects/:id/transactions` (payer filter).
3. A `?mine`-like filter for "bills where someone owes me" if the รอรับ tile should filter.
4. `include=delete_preview` for events is not in openapi; `linked_tx_count` is used.

## Not done / notes
- Bottom + for events (see decisions). Members page (`/projects/:id/members`) untouched (already kit-only).
- Event tag viewers: BE keeps viewers read-only; the sheet doesn't gate on role.
- Hub pages for new classes are in existing hub files; no new hub page.

## Tests / analyze
- `flutter test test/features/projects`: 29 passed (new list tiles/rows, summary, unsettled filter, failed-refresh-keeps-rows, detail hero + budget bar only when set + income line + member strip + tag filter chips, failing load, edit hides overview, create, archive, manage-tags sheet, 3-choice delete; model tests for new BE numbers). Ratchets `hub_coverage_test` + `layering_test` passed earlier (once, before the final edits to tests only).
- `flutter analyze` on lib/features/projects, test/features/projects, lib/ui, lib/hub, lib/core/router: no issues.
