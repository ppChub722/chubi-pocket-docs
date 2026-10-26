# Contacts pages on the 0.4.0 design

Branch: worktree-agent-a10b66ce596ab1aed (based on feat/0.4.0-fe-pages 910d86f).
Note: the worktree started on the old 0.3.1-10 commit (4d838f1, no HeroCard / DetailLayout); I reset it to 910d86f before starting.

## What changed per file
- lib/features/contacts/presentation/pages/contact_detail_page.dart: rewritten on the kit.
  - View: HeroCard (chips: archived + link state; links: 💸 CardActionButton -> /personal-debts/people/c:<id> via openPage; ✏️ onEdit; icon PersonMark 40; name HeroNameInput(view); description HeroDescription). Body via DetailLayout: info = InfoBox (ชื่อเล่น / อีเมล / เบอร์โทร, empty rows hidden, long-press -> edit on that field), people = "เชื่อมบัญชี" SectionCard (ส่งคำขอเชื่อม only with email and no link; ยกเลิกการเชื่อม when linked; จับคู่ชื่อในรายการหาร with the BE names / splits), note = NoteSection, meta lines. The old "หนี้กับคนนี้" row is gone.
  - Edit / create: DetailLayout + HeroCard(editing): EditableCircle 44 (icon maker), HeroNameInput, HeroDescription; ONE SectionCard with 3 DetailTextFields; SettingsSection "การตั้งค่า" + SettingToggleRow "แสดงชื่อเล่น" (submits:false); NoteSection editing; EndZone (เก็บถาวร <-> กู้คืน, ลบผู้ติดต่อนี้) on the existing confirm dialogs. "เชื่อมบัญชี" hidden in edit.
  - One load (`GET /contacts/:id?include=unlinked_names`); pull-to-refresh = `_refresh` (off while editing); a failed refresh with data keeps the data + snackbar; first load keeps skeleton / error + retry. All writes patch from the response. Kept: QuickCreatePreset.debt(person), popOnCreate, create-in-place + context.replace, undo history, long-press-to-edit, link request / unlink / absorb / archive / delete flows.
  - `_WireNamesRow` private widget removed (now state methods `_openWireNames` + a DetailRow).
- lib/features/contacts/presentation/widgets/contact_linked_mark.dart: DELETED (ContactAvatar / ContactLinkedIcon were own wrappers around PersonMark).
- lib/features/contacts/presentation/pages/contacts_page.dart: list already matched the reference (no summary card, search always visible, person-look rows). Only change: row leading is `PersonMark` directly (was ContactAvatar).
- lib/features/contacts/domain/contact.dart: `LinkedUser.username` (optional, parsed if the BE sends it).
- lib/l10n/app_th.arb / app_en.arb: appended fpContactsNotLinked, fpContactsLinkedWith(user), fpContactsSettingsDesc, fpContactsLinkSection, fpContactsLinkSectionDesc, fpContactsArchiveConsequence, fpContactsDeleteConsequence.
- test/features/contacts/contact_detail_page_test.dart: page wrapped in a Scaffold (the page's snackbars land on the shell's messenger, as in the app); 6 new tests (see below).
- contact_form_page.dart (link-request accept flows): untouched. It has no styled private widgets, only kit pieces.

## Kit pieces added
None. Everything is existing kit (HeroCard, DetailLayout, InfoBox, SettingsSection, SettingToggleRow, NoteSection, EndZone, SectionCard, DetailRow, CardActionButton, PersonMark, EditableCircle). No ui.dart / hub / covers changes.
Zero own-look widgets remain in lib/features/contacts (the only private widget left, `_ContactRow` in the list, just feeds a kit ListRow).

## Decisions taken
- "แสดงชื่อเล่น" only in edit mode (spec text) · the reference mock also shows it in view, but the spec box says edit-only · re-add a SettingsSection to `_viewHero` siblings (`settings:` in the DetailLayout call) if the mock wins.
- Edit mode of a LINKED contact hides name input and email field (they follow the account), icon stays but is not tappable · "never greyed" rule · show `_editHero` name / `_editInfo` email again.
- Toggle "แสดงชื่อเล่น" is always enabled (was disabled with no nickname) · avoids a greyed control, matches the mock · gate onChanged on a non-empty nickname.
- Link chip text uses `@username` when the BE sends it, else the linked profile name · OpenAPI LinkedUser has no username (see BE requests) · change `_linkLabel`.
- Linked contact keeps an unlink row (tappable row instead of the old text button) in "เชื่อมบัญชี" so the unlink flow survives · spec lists only 2 rows · remove the first `if (c.isLinked)` row.
- Contact delete: existing confirm dialog (contactDeleteTitle/Body); no delete preview in the BE for contacts (openapi only has it for wallets).
- Archived contacts: ✏️ and the end zone work as before; restore sits in the end zone (no consequence line) · one place for archive state · none.
- Name in hero view uses HeroNameInput(editing:false) so long-press-to-edit keeps working · same as before · swap to Text.
- Failed refresh with data = danger snackbar (AppMessage body) · DetailLayout has no banner slot · none.

## Requests to BE
- Add `username` to `LinkedUser` in `GET /contacts/:id` (and list) so the chip can say "เชื่อมกับ @user" (the FE already reads it when present).
- Send the totals for unlinked names (names count and splits count) in the contact detail; the FE still sums `unlinked_names[].count` for "3 ชื่อ · 3 รายการ" (the only number derived in the FE here).
- Optional: `include=delete_preview` for contacts (how many records drop to level 1), like wallets.
- "Silent refresh on show" is not in the DetailLayout template on this branch (only pull + reconnect refresh); the contacts page does not add its own.

## Tests
New / updated (test/features/contacts/contact_detail_page_test.dart, prod-shaped JSON): view (link chip, 💸 + ✏️, info rows, no phone row, no show-nickname, link section with counts, no old debts row), unlinked + email (request row), unlinked no email (no request row), edit mode (3 fields, setting, end zone, link section + 💸 hidden), linked edit hides the email, failed pull-to-refresh keeps the data, plus the existing failing-first-load cases.
Results: `flutter test test/features/contacts test/app/shell/page_presets_test.dart test/ui/hub_coverage_test.dart test/ui/layering_test.dart` = 18 passed, 0 failed; `flutter analyze lib/features/contacts test/features/contacts lib/l10n` = no issues.

## Unfinished
- Nothing known. Not run in the app (per rules).
