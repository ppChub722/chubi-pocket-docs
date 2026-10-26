# Recurring pages on the 0.4.0 design (FE-pages items 12-14)

Branch `worktree-agent-ac4a984335175e12c` (from `feat/0.4.0-fe-pages` 2c17992). English only; UI strings Thai (arb keys `fpRecurring...`).

## What changed, per file

Pages (lib/features/recurring/presentation)
- `pages/recurring_home_page.dart` (rewritten): LIST. `ListSummaryCard` ("30 วันข้างหน้า ต้องจ่าย" = BE `due_30d_total`, amber alert "รอใส่ยอด n รายการ" = `awaiting_amount_count`, tap goes to the เตือนจ่าย tab, info line with `month_pay` / `month_receive`, 🔍 toggle) over `TabbedListPageBody` with 3 swipe tabs: รายการประจำ (kind != reminder; paused group "หยุดไว้" at the bottom, faded), เตือนจ่าย (split "ถึงแล้ว · อยู่ใน pending" / "จะถึง" by `current_occurrence.status`; "รอยอด" when no amount; tab badge = `awaiting_amount_count`), ปฏิทิน (`MonthCalendar`, dots per day, tapped day's items listed below). Open = ONE call (`GET /recurring`); both list tabs are split from it by `kind` (no extra call); the calendar loads its month lazily (`GET /recurring-items?month=`), month stepper re-asks. Pull-to-refresh via `ListPageBody.onRetry`; failed reload with data keeps the rows + snackbar; skeleton only for the first load. Search (`q`) and the status chip as before. `?tab=upcoming` now opens the calendar; `?tab=reminder` added.
- `pages/recurring_detail_page.dart` (NEW, replaces `recurring_page.dart` + `recurring_settings_page.dart`): ONE page, view ⇄ edit in place (`EditModeMixin`), also create (`/recurring/new`) and `/recurring/:id/settings` (= opens straight in edit). VIEW: `HeroCard` (A: status chip with พัก/ทำต่อ menu + kind chip, ✏️; B icon + description; C `HeroNumber` "ต่อครั้ง" = BE `amount`, "รอใส่ยอด" for a reminder with no amount; E tiles via `SummaryTileView` ปีละ=`yearly_cost` (installment: งวด n/N from `progress`) / บันทึกแล้ว=`saved_count` / รอยืนยัน=`pending_count`; F `HeroAlert` "รอใส่ยอด · due" for a reminder with no amount) → ending-soon / paused notice → tag row → ONE `InfoBox` (ทำซ้ำ + ถัดไป · หมวด · จ่ายจาก / เข้ากระเป๋า · เริ่ม – สิ้นสุด · ทดลองฟรีถึง) → `NoteSection` (above the tabs) → `TabbedDetailBody` tabs [งวดที่ผ่านมา] [ล่วงหน้า]. งวดที่ผ่านมา = produced items with state chips + popover actions (as before), long-press enters bulk select (SelectionToolbar + "เสร็จ"). ล่วงหน้า (lazy `listRecurringRuleItems`) = `NextOccurrenceCard` for the first item with แก้ยอด / เลื่อนวัน / ข้าม (ใส่ยอด primary when no amount) + `OccurrenceDates` chips for the rest (edited amber, skipped struck, "เพิ่มเติม ›" loads the next page; a chip opens a small menu: แก้ยอด / เลื่อนวัน / ข้าม / กู้คืน / แก้ไขเต็ม). Each action = ONE call (`PUT /recurring-items/:id {date, amount, scope: this}` or `POST …/archive`) and the answer patches the lists. EDIT / CREATE: `HeroCard(editing:true)` with the 4 kind chips (switch the fields; `RecurringDraft.withKind`), icon ✎ + `HeroNameInput` + `HeroDescription`, `HeroAmountField` (optional + hint for เตือนจ่าย), `TagRow` with add, info rows as pickers (ทำซ้ำ: presets / กำหนดเอง / เลือกวันเอง as before, หมวด, จ่ายจาก (+ โอนไปกระเป๋า), แบบ (reminder: expense / transfer), เริ่ม, สิ้นสุด = ไม่กำหนด / ถึงวันที่ / ครบ N งวด, installment: จำนวนงวด, subscription: ทดลองฟรีถึง), `NoteSection`, `EndZone` (ทำสำเนา → เก็บถาวร/กู้คืน → ลบ with the existing confirm / linked prompts). Save keeps the scope prompts (upcoming / all + linked). Hidden in edit mode: tiles, tabs, occurrences, status chip.
- `recurring_draft.dart` (NEW): `RecurringDraft` (edit snapshot, kind switching, `toWrite`) + `RecurringPreset` (`?kind &type &amount &category &name &account` → form prefill; type picks the kind when `kind` is absent: income → รายรับ, transfer → เตือนจ่าย).
- `recurring_rows.dart`: saving removed; amount nullable ("รอยอด" through new `TxRow.amountText`); `recurringKindLabel`; long-press hook on item rows. `recurring_item_actions.dart`: saving removed only.
- Deleted: `recurring_page.dart`, `recurring_settings_page.dart`, `widgets/recurring_summary_card.dart` (feature-local own-look card). lib/features/recurring now has ZERO own-look widgets (only data → kit wrappers: `RecurringRow`, `RecurringItemRow`).

Domain / data
- `recurring.dart`: `RecurringKind`, `kind`, `trialUntil`, `yearlyCost`, `savedCount`, `pendingCount`, `nextAmount`, `currentOccurrence`; `amount` nullable; `RecurringWrite` (kind, trial, amount 0 for reminder, no saving; `toJson(forUpdate:)` sends `trial_until: ""` only on PUT). `recurring_item.dart`: amount nullable, saving removed. `recurring_summary.dart`: `due30dTotal`, `awaitingAmountCount`, `byKind`, `nextAmount`.
- `recurring_repository.dart`: `duplicate`, `calendar(month)`, `editOccurrence`; `upcoming()` removed (the old all-upcoming tab is gone).
- Router (`app_router.dart`): `/recurring/new` reads `kind, type, amount, category, name, account` (saving/goal dropped); `/recurring/:id` and `/recurring/:id/settings` both build `RecurringDetailPage`.

Kit (lib/ui; exported in `ui.dart`; all in hub page `recurring` `covers:`; demos in `lib/hub/pages/domain_recurring_page.dart`)
- `organisms/month_calendar.dart`: `MonthCalendar`, `CalendarDot` (generic, data in via params; ui.dart `export 'organisms/month_calendar.dart';`).
- `domain/recurring/next_occurrence_card.dart`: `NextOccurrenceCard`, `NextOccurrenceAction`, `OccurrenceDates`, `OccurrenceDate`, `OccurrenceDateKind`.
- `domain/recurring/occurrence_sheet.dart`: `showOccurrenceSheet` (+ `OccurrenceEdit`, `OccurrenceFocus`), `showCountSheet`.
- Small additions to existing kit: `TxRow.amountText` (words in place of the amount), `EndZoneAction.icon` (neutral ทำสำเนา under `EndZoneKind.close`).
- `hub_registry.dart` covers added: MonthCalendar, CalendarDot, NextOccurrenceCard, NextOccurrenceAction, OccurrenceDates, OccurrenceDate, OccurrenceDateKind, OccurrenceEdit, OccurrenceFocus, showOccurrenceSheet, showCountSheet.

page_flows.dart (`// fe-pages` block): `recurring-occurrence` (updateRecurringItem, archiveRecurringItem, restoreRecurringItem), `recurring-duplicate` (duplicateRecurring); `recurring-home` rewritten (listRecurring, listRecurringItems `?month=`).

ARB: ~70 `fpRecurring...` keys appended at the end of both files (gen-l10n run; generated files committed as the repo tracks them).

## Decisions taken
- Detail + settings merged into one page (the budgets pattern) · reference: ✏️ opens edit directly, no read-only view · keep `/recurring/:id/settings` route, it already means "edit" (undo: split a thin page again).
- List tabs split from ONE `GET /recurring` by `kind` on the client · BE has no kind filter, avoids 2 calls · ask BE for `?kind=` if lists get paged.
- Reminder tab grouping by `current_occurrence.status` (pending / not_created = "ถึงแล้ว") · BE number, no date maths in FE.
- Hero number label "ต่อครั้ง" = BE `amount` (not "ต่อเดือน") · the BE has no per-month figure for one setting and the FE must not derive it · see BE request 1.
- Installment hero tile "งวด n/N" replaces ปีละ · reference spec says "installment: งวด n/N" · undo: always ปีละ.
- ล่วงหน้า tab keeps a second lazy call (`listRecurringRuleItems?tab=upcoming`) · detail response only carries produced items · BE request 2.
- After an occurrence write the page quietly re-reads the setting (`getRecurring`) to refresh tiles / next date · item writes don't return the setting · BE request 3 (then delete `_syncRecurring`).
- Section title "ล่วงหน้าทั้งหมด n งวด" uses `counts.upcoming` · avoids FE subtraction.
- Skipped future occurrences show as struck chips (taken from the past tab's list, archived + future date); the BE `upcoming` tab does not return skipped ones.
- Bulk select kept, but only after long-press on a past row (reference) · undo: always-on toolbar.
- Coming back from a recurring page the list always reloads (the page may have replaced itself with a copy after ทำสำเนา, so its pop result is not trusted).
- ทำสำเนา = `EndZoneKind.close` slot with a copy icon (no new kind) → `pushReplacement` to the copy.
- `?tab=upcoming` (quick create, dashboard) opens the calendar tab · the upcoming-items tab no longer exists.
- Delete has no preview: recurring has no `include=delete_preview` in the openapi; the existing confirm / "ลบรายการจริงด้วยไหม" prompts stay.
- Wrapper rows (`RecurringRow`, `RecurringItemRow`) stay as data → `TxRow` mappers (no styling) · they are not own-look.

## Requests to BE
1. A per-month cost for one setting (`monthly_amount`) so the hero can say "ต่อเดือน" as in the reference (today only `amount` per occurrence and `yearly_cost`).
2. Embed the first page of UPCOMING items (or at least the next occurrence + `counts`) in `GET /recurring/:id` so the detail is one call.
3. Return the updated `recurring` (counts, next_date, pending_count, status) in the item write answers (`PUT / archive / restore …/recurring-items/:id`) so no quiet re-read is needed.
4. Optional `?kind=` on `GET /recurring` (reminders vs the rest) if the list gets paged.
5. `include=delete_preview` for recurring (how many items / linked txs go) if wanted in the end zone.

## Unfinished / notes
- No per-day grouping of the calendar beyond the client filter by selected day (BE says group by date on the client).
- Date badge on list rows (reference: amber within 3 days) not done: `TxRow` has no date badge; the row shows the due text (`DueText`) instead.
- Duplicate flow (`pushReplacement`) is not covered by a page test (needs a router); the repository call is simple.
- `test/hub/page_flows_test.dart` and `api_spec_ratchet_test.dart` could not run here: they read `../chubi-pocket-be/internal/apidoc/openapi.yaml`, which is absent next to this worktree (the ratchet skips; page_flows fails in `setUpAll` before my change too). I checked by hand that every operationId I listed exists in `chubi-pocket-be-040/.../openapi.yaml` (duplicateRecurring, listRecurringItems, updateRecurringItem, archiveRecurringItem, restoreRecurringItem) and that every `dio` call of the pages is in a flow.

## Tests / analyze
- `flutter test test/features/recurring` (rewritten, 26 tests: model + 0.4.0 JSON, write body, prefill, list tabs + summary alert + reminder tab + calendar + search + failed reload + network down, detail hero tiles / upcoming card / แก้ยอด / ข้าม / reminder without amount / failing load / malformed body, edit form kinds / prefill / saved edit mode): all pass.
- `test/ui/hub_coverage_test.dart`, `test/ui/layering_test.dart`, `test/ui/tx_row_marker_test.dart`: pass.
- `flutter analyze lib test/features/recurring`: no issues.
