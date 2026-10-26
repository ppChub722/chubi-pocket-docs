# AI-2 inbox (kit + offline, session chubi-pocket-ce)

## 2026-10-26 — 0.4.1-0 AI-2: E1, E4, H9, H4, E3, B
DONE · app, all uncommitted in the shared tree · analyze: dart analyze on every touched file/folder clean · test: not run (CLAUDE.md: ask first)

**E1 raw buttons → kit**
- `AppButton` gets `color` (text / outlined only).
- `AppIconButton.bare` gets `selected`.
- New `AppIconButton.fab`.
- Moved to kit buttons:
  - app_list_header link → AppButton (done first, so AI-3 could start E2)
  - app_message actions, error_view retry, icon_maker colour dialog, boot_error_app copy → AppButton
  - SplitRowAction ✕ and hero fold → AppIconButton.bare
  - chat_dial send / FAB → AppIconButton.filled / .fab
  - amount_input ± → AppChip
  - account detail "ยังไม่มีเลข" → DetailAddRow
- HintLine: kept, because AI-4 uses it for the A7 future-date hint. It lost `linkLabel` / `onTap` and its InkWell; its two link users became AppButton(text, chip).
- `raw_widgets_test` now also scans lib/ui + lib/app for raw Material buttons (TextButton, FilledButton, OutlinedButton, ElevatedButton, IconButton, FAB). Only app_button.dart / app_icon_button.dart may use them. SectionHeader's action (it stays for Home / More) is an AppButton now too, so the baseline is empty.
- Left on purpose:
  - the InkWells of composite kit pieces: the top bar back | crumb pill (the Hero flight), CycleDivider (its label wraps), the due_card rows
  - those are kit-internal taps, not standalone buttons

**E4 deleted (hub-only):**
- EventCard, PositionRow, BreakdownRow, ProgressHeroFooter, ProgressSummary, DueGroupHeader. Their exports, covers and hub demos are gone too.
- EventTagRef moved to `domain/events/event_tag_ref.dart`.
- Note: `settleAllActions` (occurrence_actions.dart) has 0 callers.

**H9:** hero field geometry `AppInputSize.hero` goes from 48 / 38 to 44 / 34 (value row / baseline). The gap under the label is 4 px smaller for the amount + description in the tx hero (quick create, occurrence) and for HeroAmountField. The descender room is unchanged. No geometry test: the test diet allows no kit widget tests, and the old hero_alignment_test is gone.

**H4 budgets list card** (mock PfUF7urgDESwUDPv6ugt7m "ใหม่"; owner 2026-10-26: pace line + bubble in the budget colour, nothing extra over 100%):
- `ProgressRow(expectedCapsule:)`
- ProgressCard's default row is now the mock layout:
  - % pill on the fill
  - capsule รอจ่าย with a legend
  - the status chip under the bar on the left
  - "ใช้ ฿x จาก ฿y" at the right
  - เหลือ / เกิน stacked at the top right
- `ProgressCard.compact` (the period rows) is unchanged.
- The list passes tone neutral, so the bar is the budget's colour.
- "ตามเพซจะเกิน" is gone from the list and the detail periods (`budgetStatusChip` returns null for pace).
- bgPaceBubble is now "แผน {amount}" / "Plan {amount}" (gen-l10n run).
- Removed `ProgressCard.alignWithTitle`, plus overLabel / struckLabel on the default ctor.

**E3 → AppListRow:** tx detail `_splitRow`, wallet `_MemberRow`, `IdentifierRow`, the contact's linked-account row, the wallet "saved in" rows. Not moved: link_view's view-mode ShareRows. In a ShareCard they would no longer match the edit-mode card (ShareRow / SplitRow geometry), so they stay ShareRow.

**B offline gating:**
- `OccurrenceAction.submits` (default true) is passed to AppButton / SheetOption in OccurrenceActions and the focus card buttons.
- DueSelectBar skip / paid / confirm buttons are gated.
- Quick create: the bar action is gated, and the entry chips are disabled offline.
- saving_move_sheet footer is gated.
- `submits: true` on: recurring pause / resume, the wallet member menu, contact unlink.
- `SettingDropdownRow` / `SettingMenuRow` get `submits` (default true). It is false for language (local), the recurring kind / mode rows and the budget warn row (edit-mode working copies).
- Hub "submits — offline" demo shows the new gates.
- No assertion test was added: under the test diet, the hub smoke renders the offline demo.

**Shared files touched:** ui.dart, hub_registry.dart, app_th/en.arb (one value) + gen, amount_input / event_bill_row (with AI-4's A1 changes in the same files).
