# Brief: ppForge UI library (extract chubi-pocket's UI into a reusable Flutter package)

_From: Lead (chubi-pocket), 2026-10-15. Owner-approved: build the library, and chubi-pocket moves onto it._

## Goal
Turn chubi-pocket's UI kit into a separate, **ready-made** Flutter package. A new project should get the whole look and the working pieces by adding the dependency: a theme, widgets, page templates, shell pieces and a dev gallery. It only plugs in its data, strings, icons and colours. chubi-pocket becomes the library's first consumer, and from then on UI fixes happen in the library, not in the app.

"Ready-made" means:
- tokens + theme engine (light / dark, theme presets)
- every generic widget: atoms → molecules → organisms
- page templates: list, detail, tabbed detail, editable detail, form sheet, dashboard, auth
- shell pieces: chrome hide / show, tab back-history scaffolding, fade branches, keyboard insets
- the dev hub (gallery + playground), which a host app can mount at `/dev`

## Where things are today
`chubi-pocket-app` = `c:\Users\poomp\Documents\ppond\projects\chubi-pocket\chubi-pocket-app`, docs = `…\chubi-pocket-docs`.

- **Kit** `lib/ui/` (~232 files), single export `lib/ui/ui.dart` ("the gate").
  - **Generic, take these:** `tokens/` (root files only), `atoms/`, `molecules/`, `organisms/` (incl. `charts/`, `reorder/`), `templates/`.
  - **App-specific, leave in chubi:** `tokens/app/` (AppColors money colours, AppIcons, modules, currencies, TextLimits, QuickCreateMode, fonts, themes) and `domain/` (people, money, icons + packs, transactions, events, recurring, saving, …).
- **Hub** `lib/hub/`: registry (`HubPage.generic`, `covers`), index, frame, `hub_kit`, `hub_playground`, `hub_toolbar`, 50 pages. API section (`hub/api/`, OpenAPI viewer) and Debug section are part of the owner's standard dev portal too. Routes are in `lib/core/router/app_router.dart` (`/dev/ui/<level>/<slug>`, `/dev/<api|labs|debug>/<slug>`).
- **Shell** `lib/app/shell/`.
  - Generic already: `shell_chrome.dart`, `fade_branch_container.dart`, `keyboard_insets_guard.dart`, `tab_root_scaffold.dart`. `tab_nav.dart` is generic except for `tokens/app/app_modules`.
  - App-bound, stay: `main_shell`, `main_bottom_nav`, `app_top_bar`, `more_page`, `quick_create_context`. The bottom bar / top bar *looks* are worth turning into configurable library pieces later; ask first.
- **Strings:** generic widgets read text from `UiConfig` / `UiStrings` / `UiErrors` (English defaults); chubi fills them in `lib/ui/domain/l10n/app_ui_config.dart`. Keep this pattern: the library never ships app copy or Thai.
- **Docs to read first:** `chubi-pocket-docs/engineering/app-hub.md` (layers, generic rules, how to add a piece; its URLs lack the `/ui/` segment); `ai/decisions.md` → "UI" (owner's visual rules, which the library must keep); `ai/inbox/fe-a.md` → "App hub, Phase 0: THE MAP" (G/D tagging per piece) and its "Handoff 2026-10-13" (kit gotchas).

## Leaks to cut (generic files that still import app code)
The layering test (`test/ui/layering_test.dart`) does not catch these:
- `AppIcons` (tokens/app): used by ~38 generic files. **Biggest blocker.** Replace with a semantic icon set the host can override (library defaults).
- `AppColors` (tokens/app): imported by `tokens/tone.dart`, `atoms/app_chip.dart`, `atoms/icon_tile.dart`, `molecules/danger_row.dart`, `molecules/stat_grid.dart`, `organisms/pull_to_refresh.dart`. Move the generic roles into a library colour extension; money colours (income / expense / wallet) stay in chubi.
- `atoms/user_avatar.dart` → `domain/icons`. `molecules/option_menu.dart` → `domain/icons/icon_registry`.
- `molecules/summary_stats.dart` → `domain/money/money_text`. `molecules/detail_meta.dart` → `core/utils/date_formatter`.
- `templates/edit_mode_mixin.dart` → `app/shell/shell_chrome` + `tab_nav` (move those into the library with it).
- `UiStrings.currencySymbol` defaults to `฿`. Make it neutral.
- Borderline names: `molecules/split_row.dart` (generic API, bill-split origin) and `organisms/charts/saving_history_chart.dart`. Rename or keep in chubi; your call, list it in the report.
- `organisms/divided_rows.dart` is not exported from the gate; check for others.

## Order of work
1. **Extract with no visual change.**
   - Create the package and move the generic layers, shell pieces and hub infrastructure.
   - Cut the leaks through injection points (icons, colours, strings, formatters).
   - Bring over the gallery as the package's `example/` app.
   - Port the guard tests: `layering_test`, `hub_coverage_test`, `hub_duplicates_test`, `raw_widgets_test`, the pixel tests (`app_input_size_test`, `framed_input_affix_test`, `list_toolbar_height_test`) and the `test/shared/` kit tests. Baselines can only shrink.
2. **Switch chubi-pocket onto the library.**
   - `lib/ui/ui.dart` re-exports the library plus chubi's `tokens/app` + `domain/`.
   - Features keep importing only `ui/ui.dart`.
   - Done = `flutter analyze` 0 issues, all tests pass, screens look the same.
3. **Then** the owner's UI review round (chubi 0.3.1-11) happens IN the library.

**Kit freeze:** while steps 1–2 run, the chubi team does not change `lib/ui/` (Lead enforces this). Changes you need in chubi-pocket-app go on a branch / worktree that Lead merges; never commit to chubi's main branch yourself.

## Constraints
- **Flutter:** 3.47.3 via fvm (the PATH `flutter` 3.38 fails pub resolution). Dart sdk `^3.11.4`. Lints `flutter_lints ^6.0.0`.
- **Core library deps:** `flutter`, `intl`, `go_router` (shell / edit mode) only.
  - No `flutter_bloc`, `dio` or app models in the core.
  - `google_fonts` belongs to the theme presets.
  - The hub API / Debug sections need `dio`, `image_picker`, `package_info_plus`, so put them in a separate entry point or sub-package so the core stays light.
- **Tests:** no goldens yet. Pixel tests use `RepaintBoundary.toImage`. Pump with `ThemeData(extensions: [sweetTheme.lightColors])`, not `ThemeBuilder` (`google_fonts` can't load offline).
- **Language:** code, comments, commits and docs in English.
- **Commits:** no AI attribution lines (no `Co-Authored-By`).
- **Running the app:** the owner runs apps themselves. Give the run command; don't start the app.
- **Prod:** never touch chubi-pocket prod, the VPS or the release tags.

## Open: ask the owner before building
- Package name (proposal `ppforge_ui`) and repo location (proposal: a sibling folder `…\ppond\projects\ppforge-ui`, its own git repo).
- How chubi depends on it: a path dependency while developing, then a git tag.
- Whether the bottom bar / top bar become library pieces now or later.

## Report
Write progress and the final report to `chubi-pocket-docs/ai/inbox/ui-lib.md` (newest on top). Lead reads it and coordinates the chubi side. Include:
- what moved
- the injection points you created (icons, colours, strings, formatters)
- leaks left + baselines
- analyze / test results in both repos

## Kit changes made on chubi main after the freeze (owner-approved exceptions)
Port these into the library when you sync. fe-core lists the exact files / APIs in `ai/inbox/fe-core.md`.
- 2026-10-16: hero / summary card top-right action slot (✏️ on detail heroes, 🔍 on list summary cards); collapsible search + filter row in ListPageBody / ListToolbar (toggle from the 🔍, red dot while a hidden filter is active); ProgressCard pace marker + state colours; lower AddTile.
