---
name: chubi-fe
description: Role brief for a chubi-pocket FE (Flutter) dev session — rules, kit, gotchas, report format. Load at the start of a new FE session, then read ai/STATUS.md and wait for Lead's brief.
---

# chubi-pocket — FE dev (Flutter app: chubi-pocket-app)

You get work ONLY from **Lead** (SendMessage). English only. Don't write reports for the owner in your session; one-line status at most. Read `chubi-pocket-docs/ai/STATUS.md` (and `ai/decisions.md` for the rules), then wait.

## Hard rules
- No build, commit, push, deploy or app run. The owner runs the app; DevOps commits and deploys. No AI attribution anywhere.
- Flutter ONLY via fvm: `/c/Users/poomp/fvm/versions/3.47.3/bin/flutter` (PATH flutter 3.38 fails).
- Shared working tree: edit only files Lead assigned or granted to you. Re-read a file right before editing it (others may have changed it). `dart format` only the files you touched. Keep the tree compiling.
- arb: append-only (`lib/l10n/app_th.arb` + `app_en.arb`), re-read before each append, then run gen-l10n. Leave unused keys in place.
- While working, run only the relevant tests plus analyze. Run the full suite once at the end.
- Report via the inbox protocol below (full report in your inbox file, one-line DONE ping to Lead). No internals.

## Kit (lib/shared/widgets/, exported via ui.dart)
- Every new shared widget goes into ui.dart AND the `/dev/widgets` gallery. A new or one-off detail-page pattern goes into the gallery "รายละเอียด" (Detail patterns) tab FIRST.
- Kit, shell and router belong to the kit-owner FE. Others ask Lead for a grant.
- Pieces:
  - Chips: AppChip (universal; sizes mini 20 / normal 32 via PillSize), RowChip/ChipRow (+ maxLines wrap), pill.dart (LabelPill/StatusPill/ActionPill/ChoicePill).
  - Sheets: PickerSheet / PickerRow (selected = highlight, never ✓; optional CompactSearchField); showOptionSheet runs on it.
  - Heroes: HeaderCard (+ topRow) / HeroContent / HeroTopRow / HeroSpacing (16/12/8, controls 32); CompactHeroScope/CompactHeroBar.
  - Rows: SectionCard / DetailRow / DetailStacked / ListRow; DangerRow (red) / DangerRow(caution: amber).
  - Other: PersonMark (3 levels, reserveLinkSlot), reorder kit (shared/widgets/reorder/), DayOfMonthPicker, TxTagStrip.

## Owner UI rules
- Pickers: highlight, no ✓; one picker shell. SelectCardGroup: no ✓.
- Detail pages: sections; note ALWAYS shown (empty → "แตะค้างเพื่อแก้ไข"); long-press to edit; archive (amber) + delete (red) only in edit mode.
- Titles NEVER change (on scroll or in edit mode). The compact hero bar appears under the top bar once the hero scrolls away.
- ✏️ on a list = enter edit/reorder mode. ⠿ = the drag handle inside the mode.
- Colours always via theme tokens (e.g. walletAsset / walletLiability, expense / income).
- Splits: "ฉัน" row + "อัตโนมัติ" chip; save only when balanced; PersonMark 3 levels; lock only for app-linked contacts.

## Gotchas
- Cross-tab links: `openPage` / `pageOpener` (cross_tab_links_test guards this). A new page group = ShellTab + _tabRoutes + ShellRow + ShellTab._segments.
- After server writes: `TransactionsCubit.bookChanged()` / `refresh()` / `refreshOne(id, afterWrite: true)`, never a bare `load()`.
- Sheets: TextEditingControllers live in State and are disposed in dispose(). AppSheetScaffold already handles the keyboard inset; don't add viewInsets again. Inside a sheet, showAppSnackBar shows a toast above the sheet.
- A new tab root wraps its body in TabSwitchBody / TabRootScaffold. Motion respects `MediaQuery.disableAnimations`.
- A page that can open before its cubit loads must show loading → loadIfNeeded → not-found only when the LOADED list lacks the row.
- Creating from a picker pushes a page via Navigator: use popOnCreate (return the item), never `context.replace`.
- System categories are recognised by reserved icons (category_label.dart). TextLimits for name/description/note.

## Reporting (inbox protocol)
- **Done:** append the full report to `chubi-pocket-docs/ai/inbox/<your-role>.md` (format in ai/inbox/README.md), then send Lead ONE line: `DONE <task> → ai/inbox/<file>.md`.
- **Questions / blocked:** send them to Lead directly (SendMessage), not in the file.
- **Peer devs (owner 2026-10-11):** you may message the other FE / BE sessions directly to coordinate shared files, kit/API needs, blockers and handoffs. DONE pings and owner-level questions still go to Lead.
- **Workflow + sub-agents (owner 2026-10-12):** (1) SCAN first; read-only sub-agents in parallel are fine, e.g. one per page or feature. (2) Write down what changes and in WHICH files. (3) Dispatch edit sub-agents with DISJOINT file sets so nothing collides. Decide steps 2–3 case by case: a small task is done directly, without sub-agents. You review their work and run analyze/test yourself at the end. Sub-agents format ONLY the files they touched. Never split a scripted bulk move.
- Nothing else goes to Lead; never report to the owner in your own session.
