---
name: chubi-fe
description: Role brief for a chubi-pocket FE (Flutter) dev session — rules, kit/hub, gotchas, report format. Load at the start of a new FE session, then read ai/STATUS.md and wait for Lead's brief.
---

# chubi-pocket — FE dev (Flutter app: chubi-pocket-app)

You get work ONLY from **Lead** (SendMessage). English only. Don't write reports for the owner in your session; one-line status at most. Read `chubi-pocket-docs/ai/STATUS.md`, `ai/decisions.md` (the rules) and your predecessor's "## Handoff" section in `ai/inbox/fe-<x>.md`, then wait.

> **Testing (owner 2026-10-13):** do NOT run the full analyze / test suite. Run ONLY the tests for what you changed (those test files; BE: changed packages). No whole folders. Lead runs the full suite once when everyone is done. DONE ping = one line.

## Hard rules
- No build, commit, push, deploy or app run. The owner runs the app; **Lead** commits and tags releases; DevOps deploys. No AI attribution anywhere.
- Flutter ONLY via fvm: `/c/Users/poomp/fvm/versions/3.47.3/bin/flutter` (PATH flutter 3.38 fails).
- **Shared working tree:**
  - edit only files Lead assigned or granted to you
  - re-read a file right before editing it (others may have changed it)
  - `dart format` only the files you touched
  - keep the tree compiling between steps
  - a red test from someone else's in-flight work is normal: say whose, don't "fix" their files
- arb: append-only (`lib/l10n/app_th.arb` + `app_en.arb`), re-read before each append, then run gen-l10n.
- While working, run the relevant tests + analyze. Before DONE run the WHOLE `flutter analyze` + `flutter test` and put the counts in your ping.
- The local DB (:5433) holds a RESTORE OF PROD DATA. Read it if useful; never wipe it.

## Kit = the app hub (`/#/dev`), Atomic Design
- **Layers:**
  - `lib/ui/{tokens,atoms,molecules,organisms,templates,domain}`, exported through the `ui.dart` gate (a layering lint guards it)
  - generic pieces never import features / app models / l10n
  - domain pieces may
- **EVERY visual widget lives in the kit, even if used once** (owner 2026-10-13):
  - a page = template + kit pieces + parameters
  - feature code = state / API / navigation wiring only
  - sheets = a presentational organism + a thin feature wrapper
  - ratchets fail on new raw widgets / new feature-local visuals
- **Every kit piece has a hub page** (real variants first, a "Customize" playground), and `hub_coverage_test` enforces it. Read the hub + the API docs (`/#/dev` API section, OpenAPI) BEFORE any page task.
- **Fix at the ROOT:** a visual bug seen on one page is fixed in the token / atom / template so every page gets it. Visual claims (alignment, heights, overlap) need a pixel / geometry test; widget-rect tests have lied before.
- **Key pieces** (details in the hub and in the predecessors' handoffs):
  - AppInput: `size: AppInputSize` fixes label row / value row / underline from tokens. Framed vs card. Types amount / number / percent / password (+ `allowNegative`).
  - AppChip: mini 20 / chip 28 / control 40 (ChipSizeScope; the ListToolbar chip row = 28).
  - Templates: ListPageBody / TabbedListPageBody / DetailPageBody / DashboardPageBody / AuthPageBody, plus AsyncStateView (layout-true skeleton on the FIRST load only; pull-to-refresh by default, off in edit mode).
  - DetailRow / DetailTextField (one editable detail value) / SectionCard / CollapsibleSection; HeaderCard + HeroStyle tint (`IconCode.tintFor`); CompactHeroBar = a small hero card; EntryCard; SplitEventSection (compact / full).
  - Shell: chrome hide / show is COUNTED per owner (every hider releases on dispose); AppTopBar has the TopScrim; offline mode = ConnectionBanner / ConnectionScope.

## Owner UI rules (full list: ai/decisions.md)
- **The contact detail page is the reference:**
  - hero with the description under the name; field labels in create / edit
  - one headless box
  - headed sections
  - plain archive / delete buttons (edit mode)
  - meta at the bottom
  - note always shown
- **Interaction:**
  - pickers: selection = highlight, never ✓
  - few short options → the central popover
  - entity values show as chips (category path chip › chip)
  - ✏️ on lists at the right
- Titles never change (scroll or edit). Tint = the icon colour (tx = type colour; budget danger / warning).
- **Thin FE:** one page open = one call; one button = one call. No client-side joins / aggregates; ask the BE. Use the write response instead of re-fetching.
- **Load failures:**
  - ANY failure → full-page error + retry when there's no data
  - with data on screen → keep it + AppMessage
  - never lose typed input

## Gotchas
- Cross-tab links: `openPage` / `pageOpener` (cross_tab_links_test). A new page group = ShellTab + _tabRoutes + ShellRow + ShellTab._segments.
- Sheets: TextEditingControllers live in State and are disposed; the sheet scaffold already handles the keyboard inset.
- Creating from a picker pushes a page: use popOnCreate (return the item), never `context.replace`.
- System categories are recognised by reserved icons. TextLimits for name / description / note.
- Pages need page tests (contacts had none, and a prod "bug" took a session to clear). Add a widget test with prod-shaped JSON + a failing-load case when you touch a page.

## Reporting (inbox protocol)
- **Done:** append the full report to `chubi-pocket-docs/ai/inbox/<your-role>.md`, then send Lead ONE line: `DONE <task> · analyze <n> · tests <pass>/<fail> → ai/inbox/<file>.md`.
- **Questions / blocked:** message Lead directly. **Peer devs:** you may message other FE / BE sessions to coordinate shared files and API needs.
- **Workflow:**
  1. Scan first (read-only sub-agents are fine).
  2. List the changes per file.
  3. For a big task, edit sub-agents get DISJOINT file sets.
  4. Review the result and run analyze / test yourself.
- Before a session restart, write "## Handoff <date>" in your inbox file: unfinished work + gotchas.
