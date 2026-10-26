# RESULT2: recurring + events adopt the BE's new fields

## Per-file changes
Recurring
- domain/recurring.dart: `monthlyAmount` (monthly_amount).
- domain/recurring_item.dart: `RecurringDetail.upcoming` + `deletePreview` (`RecurringDeletePreview`); `ItemWriteResult.setting`.
- data/recurring_repository.dart: `get(id, {deletePreview})` sends `include=delete_preview`.
- pages/recurring_detail_page.dart: hero "ต่อเดือน" = monthly_amount; info row "จำนวนต่อครั้ง" = amount (view mode); ONE call on open (upcoming comes with it; lazy upcoming load and `_syncRecurring` removed; load-more upcoming still uses the items endpoint); item writes patch the setting from `setting` (null -> `_load()`); ลบ = one preview call, dialog prints items / drafts / linked numbers (linked > 0 keeps the keep/with-txs prompt).

Events
- domain/project.dart: `EventDeletePreview`, `ProjectDetail.deletePreview`; `Project.linkedTxCount` removed.
- data/projects_repository.dart: `detail(deletePreview:)`, `listTransactions(payerMemberId:)`.
- cubit/projects_cubit.dart: tiles send `status` (unsettled / ended / ...) as is; client narrowing + multi-page paging removed. `patch()` only drops a row for stored statuses.
- project_board_controller.dart: payer filter is server side (`payer_member_id`, ONE call); client payer narrowing removed.
- pages/project_detail_page.dart: ลบ = one `detail?include=delete_preview` call; the 3-choice dialog takes `linked_tx_count` from it; message shows bills / members.

l10n: fpM5bRecurringPerMonth, fpM5bRecurringAmountPerTime, fpM5bRecurringDeleteNumbers, fpM5bEventDeleteNumbers (th + en, gen-l10n run).

## page_flows entries
- event-detail: ลบ button -> getProjectDetail (?include=delete_preview); dialog confirm -> deleteProject.
- recurring-settings: ลบ button -> getRecurring (?include=delete_preview); dialog confirm -> deleteRecurring.
- No new operationIds. Params verified by hand in openapi.yaml (include, payer_member_id, status enum incl. unsettled/receivable/ended, monthly_amount, upcoming, setting).

## Decisions (how to undo)
- Recurring list `?kind=` NOT adopted: the list loads once and splits the settings / reminders tabs client-side; the settings tab spans 3 kinds and `kind` takes one value, and the open call also feeds both badges + summary. Needs a BE multi-kind value or one call per tab.
- `receivable` NOT used: the events card has no receivable tile / filter (only a money summary).
- Event `patch()` keeps a row under a derived tile until the next load. Undo: restore `_inFilter` from git history.
- Event delete preview uses the detail endpoint (the only one with include=delete_preview), so it also returns the board; one call.
- `Project.linkedTxCount` removed. Undo: re-add the field from `linked_tx_count`.

## Tests (the 2 changed files, run once: all passed; analyze clean on touched folders)
- recurring: open = ONE call (upcoming rides along), hero per month / info row per time, item write patches setting (no re-read), null setting re-runs the page call, delete preview numbers.
- events: tiles send status unsettled / ended (no client narrowing), payer filter sends payer_member_id in one call (controller test), delete = one preview call + numbers in dialog.

## Unfinished
- Recurring list `kind` param (see above); the payer filter has a controller test only, no widget-level test.
