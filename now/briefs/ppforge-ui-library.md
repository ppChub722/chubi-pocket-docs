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
- **Docs to read first:** `chubi-pocket-docs/build/app-hub.md` (layers, generic rules, how to add a piece; its URLs lack the `/ui/` segment); `rules/decisions.md` → "UI" (owner's visual rules, which the library must keep); `team/inbox/fe-a.md` → "App hub, Phase 0: THE MAP" (G/D tagging per piece) and its "Handoff 2026-10-13" (kit gotchas).

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

## Status 2026-11-09 (re-extraction from main @ 87b041f)
Worktree `chubi-pocket-app-ppforge`, branch `refactor/pp-forge-ui` (local, not pushed, nothing merged to main); package repo `pp-forge-core`, branch `refactor/from-app-87b041f`. The first extraction (2026-10-17) was dropped; `lib/src` was replaced from main.
- **Leaks cut** (the list below is done): icons (`PpForgeIcons`, 55 semantic icons; `AppIcons` stays in the app and aliases them), colours (`AppColors` generic; wallet colours moved to `ModuleColors`), navigation (`PageExitScope`, host injects the leave action), theme and font registries (`configure(...)`, `AppTheme` takes any ThemeExtensions), strings. Stays in chubi: `ui/domain/` incl. `tokens/` (AppIcons, modules, currencies, ModuleColors, QuickCreateMode, TextLimits, chubi themes).
- **Renamed:** 67 `App*` / `Ui*` types to `PpForge*`; the app keeps the old names as typedefs in `lib/ui/app_aliases.dart`. Files `app_*.dart` are `pp_forge_*.dart` in the package.
- **Layering test** now: generic layers import only generic files + flutter / intl / google_fonts / characters (baseline empty).
- **Step 4 done:** 210 generic files live in the package (`lib/src/`), the app depends on it by path (`../pp-forge-core`), `lib/ui/ui.dart` re-exports it. `flutter analyze` 0 issues in both repos. **No tests run yet** (run on the owner's word).
- **Icon system moved in** (owner decision, differs from "leave icons in chubi" above): the engine is in the package (`PpForgeIconCode` with toJson / fromJson, registry, shapes, backgrounds incl. rainbow / snowflake / wreath / starburst, packs type, swatch grid, icon maker via `showPpForgeIconMaker(packs:, strings:)`). The app keeps `IconType`, the pack data, `type_icon_default`, avatar colours and the l10n wrapper. Design: the DB stores the icon code per user / row, the app reads it, the package draws it. Open: `PpForgeIconRegistry.register` so a host can add its own glyph ids.
- **Step 5 (hub) started:** the portal framework is in the package (`package:pp_forge_core/hub.dart`: `HubLevel` / `HubSection` / `HubPage` as host-extensible classes, `PpForgeHub` registry, `hubRoute()`, an environment-driven toolbar, the playground kit) with 14 kit pages that need no app data. The app keeps `domain` / `api` / `labs` / `debug` and 20 kit-level pages whose demos still use chubi pieces (MoneyText, Avatar, IconDisplay, ApiException, ModuleColors …); they move once their demos use neutral content. `example/` is a new gallery on the framework. Hub order inside a level is now kit pages first, then the app's.
- **Not moved yet:** those 20 demo pages, shell pieces (`fade_branch_container`, `keyboard_insets_guard`, `tab_root_scaffold`, `tab_nav`), guard tests (step 6), the newer UI pieces listed at the end. The package's old `test/` is stale.
- **Not reported** to `team/inbox/ui-lib.md` on purpose (owner 2026-11-09: this work is done on our side, no inbox report).

## Direction 2026-11-09: tablet landscape first
The package targets **mobile and tablet apps only, no web, no desktop**. The next app is **tablet landscape first**; phone and tablet portrait collapse from it later. chubi-pocket-app stays phone-first and is not converted.
- **Size tokens come only from the package, on two axes:** a named step (xs..xl) per role (icon, avatar, button, chip …) times a screen class. An app never writes a pixel number; widgets take the step and read the screen class themselves. Today's literals (`size: 36`, `28`, `18` …, ~150 in the app) are snapped to steps in a separate round (owner picks: snap to nearest step vs add steps).
- **Screen class from the window, not the device** (split-screen on tablets): two-pane at width >= 840dp and height >= 480dp, wide single column at 600 to 840, phone below 600. A phone in landscape is wide but short, so it stays single column.
- **New pieces:** `PpForgeScreenClass`, size tables (`PpForgeSizes.configure`), `PpForgeTwoPane` (list-detail, collapses on phone), a side rail instead of the bottom bar, dialogs / side panels instead of bottom sheets on wide screens, a content max-width for forms and settings. The hub and the gallery preview in a tablet frame (about 1200 x 800dp) with a switch for portrait and phone.
- The bottom bar / top bar question under "Open" is now answered: they become configurable library pieces, as part of this direction.

## Core toolkit (non-UI), decided 2026-11-09
The package also carries what apps share besides widgets, as a **toolkit, not a framework**: each app (chubi-pocket now, a separate chubi-note later) is complete in its own repo with its own backend, accounts, strings and routing, and only consumes core pieces. Core never owns routing, lifecycle or the shell; the app builds instances (api client, session, logger, language service) and passes them in. No global `X.instance`.
- **Entry point `package:pp_forge_core/core.dart`** (the old plan called it `app.dart`); `testing.dart` for test helpers. dio stays out of `ui.dart`.
- **Pieces:** `Result` / `Failure` / `guard` (I/O returns a Result, never throws); `PpForgeApiClient` (dio, every call a Result, the app supplies how a failed response is read so any backend stack works; idempotency keys, retry, reachability signals); `SessionManager` + `TokenStore` / `SecureTokenStore` + `AuthProvider` (accounts are per app; single-flight refresh, one resend after 401); `runAction` + `ActionGate` (no double tap, Result back, the app shows the snackbar); `LanguageService` (language code, not Locale); `KeyValueStore` / `SecureStore` interfaces (the app adapts its storage); `AppEnv` / `AppConfig`; `PpForgeLogger` with sinks (console, rotating file), `Breadcrumbs`; `runBoot`, `AppVersionInfo`, `versionGateRedirect`; `FakeHttpAdapter`.
- **Stays in the app:** endpoints, models, error-code to text tables, login pages, ARB strings, real config values, domain code, and the sync layer (`sync_*`, `data_changes`), which is tied to chubi's `X-Sync-Versions` protocol until a second app needs offline.
- **Rules (test `core_rules_test`):** core imports only downward (foundation < config / storage / log < language / auth < boot < api < action < testing), never the UI layers, only dart / dio / equatable; no `throw` in core code.
- Plan and checklist: `pp-forge-core/PLAN.md`.

## Constraints
_The "Core library deps" line is superseded by the 2026-11-09 decision above (dio, flutter_bloc, secure storage, connectivity, go_router allowed)._

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
- ~~Package name and repo location~~ answered: `pp-forge-core`, sibling folder, its own git repo.
- How chubi depends on it: a path dependency while developing (today), then a git tag before merging to main.
- ~~Bottom bar / top bar~~ answered: library pieces, with the tablet direction above.

## Report
Write progress and the final report to `chubi-pocket-docs/team/inbox/ui-lib.md` (newest on top). Lead reads it and coordinates the chubi side. Include:
- what moved
- the injection points you created (icons, colours, strings, formatters)
- leaks left + baselines
- analyze / test results in both repos

## Kit changes made on chubi main after the freeze (owner-approved exceptions)
Port these into the library when you sync. fe-core lists the exact files / APIs in `team/inbox/fe-core.md`.
- 2026-10-16: hero / summary card top-right action slot (✏️ on detail heroes, 🔍 on list summary cards); collapsible search + filter row in ListPageBody / ListToolbar (toggle from the 🔍, red dot while a hidden filter is active); ProgressCard pace marker + state colours; lower AddTile.
