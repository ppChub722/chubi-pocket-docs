# App-3 inbox (0.4.1-2: settings page + "หนี้" kind app)

Session chubi-pocket-9d. Owns: `features/settings`, `features/preferences`, `features/recurring`, `notification_settings_*`. Items: P7, P3, P5, P6, SA14, hide amounts removed, notification settings on / off per type; K10–K13.

## Shared-file notices
- 2026-10-27: arb (append + gen-l10n), hub_registry.dart (SettingsGroupRow), app_router.dart (/settings/app, /money, /sync; /page-prefs to come), ui `DetailRow.helperMaxLines`, `AppIcons.sync` / `AppIcons.filter`, `app.dart` (PreferencesSyncCubit provider, MoneyVisibilityCubit gone).
- Outside my folders, small edits: `auth/domain/user.dart` (User model), `users/data/users_repository.dart`, `notifications/data/notifications_repository.dart` (settings methods only), `notifications/domain/notification.dart` (settings classes moved out, re-exported), `categories/.../category_detail_page.dart` (fee switch removed), `personal_debts/.../debt_person_page.dart` (auto-sync switch, App-1 OK'd), accounts / home / hub pages (hide-amounts leftovers).

## 2026-10-27 — progress (not DONE yet)
Done so far · analyze (my features + touched files): clean · tests: preferences_sync 3, settings_profile_pages 2, notification_settings 3, notification_cubits, notification_tile, recurring (incl. new recurring_debt_kind 3) all pass; ratchets hub_coverage / feature_visuals / page_refresh / page_flows green; hub smoke 49/49.
- **P7 settings home** (`settings_page.dart`): profile hero, ONE card of `SettingsGroupRow`s (new kit row: icon tile + label + one-line summary; hub demo in Detail sections) for แอป / เงิน / ซิงก์อัตโนมัติ / การแจ้งเตือน / ตัวกรองและการเรียง, then archive / export (เร็วๆ นี้) / version, logout. Summaries from the signed-in user only (no own call).
- **แอป** (`settings_app_page.dart`): theme, mode, language, **two font rows** (ฟอนต์ภาษาไทย / ภาษาอังกฤษ; `FontIdCubit` now keeps one font per language), preview.
- **เงิน** (`settings_money_page.dart`): การแสดงตัวเลข (currency, sign, colour, decimals) + ค่าเริ่มต้นตอนจดรายการ (กระเป๋าหลัก, หมวดค่าธรรมเนียม moved from the category page; `fee_category` ref from /users/me).
- **ซิงก์อัตโนมัติ** (`settings_sync_page.dart`): the two switches = `AutoSyncSetting(kind)` (settings/presentation/widgets), one PUT /users/me, AuthCubit updated → same value everywhere. No "กระเป๋าที่รับเงิน" row (owner change via Lead).
- **SA14:** `AutoSyncSetting(kind: debts)` on the person page (linked person only). Event page: App-2 asked to drop in `AutoSyncSetting(kind: events)` (their file).
- **การแจ้งเตือน** (`notification_settings_page.dart` + cubit): on / off per type from the BE `types` list (page order, groups shared_bill / event / recurring / request; requests = one "เปิดตลอด" row; unknown types / groups left out). One PUT of the whole `muted_types`. `NotificationSettings` / `DefaultAccountRef` moved to `notifications/domain/notification_settings.dart` (re-exported from notification.dart); `NotifyMode` / `auto_types` gone.
- **P3** `PreferencesSyncCubit` (root, lazy false): theme_id / theme_mode / language / font_th / font_en. Local cubits = boot cache; after login the server wins; null keys filled from the device in ONE PUT; a change here = one PUT of that key; a failed save stays pending (not overwritten by the server) and retries after 30 s / on the next change.
- **Hide amounts removed:** MoneyVisibilityCubit, `isMoneyHidden`, `kMoneyPrivacyEnabled`, `MoneyVisibilityToggle`, IdentifierRow `hidden`, the storage key, hub demos. `MoneyText.hideable` left as a no-op (App-1 callers drop it later).
- **K10:** `RecurringKind.debt`, `RecurringPauseReason.noBalance`, type `debt` parses (no throw), Recurring person / debtSub / direction / personBalance / zeroRounds, RecurringItem person + `debtEntry`, RecurringWrite debt body (no category / tags / goal).
- page_flows: settings-home / -app / -money / -sync / -notifications.

Next: P6 (page prefs + the ตัวกรองและการเรียง page), K11–K13.
Not mine, red at my run: api_spec_ratchet (`GET` / `DELETE /event-bills/{pt_id}` not in a flow; App-1 / BE-1), quick_create_sheet `openEventBill` (App-1 in flight).

## 2026-10-28 — P7, P3, P5, P6, SA14, hide amounts, notification on / off, K10–K13
DONE · analyze lib: no errors / warnings · tests (my set + kit / API ratchets): 138 pass, 1 red not mine (below) · hub smoke green
Everything in the progress entry above, plus:
- **P6 page prefs:** `preferences/page_prefs.dart` = one spec of every page's remembered choices (wire = enum names; first option = default; `.set` fields for collapsed ids / colour / icon filters) + `readPagePref` / `rememberPagePref` (one PUT /users/me, merged per page). Settings › ตัวกรองและการเรียง (`settings_page_prefs_page.dart`): a row per page with a one-line summary + "เปลี่ยนแล้ว" badge → `/settings/page-prefs/:page` (a dropdown per choice; id / colour sets shown, set on the page itself; reset this page) and "คืนค่าเริ่มต้นทั้งหมด" (confirm). Wired into the 9 list pages (wallets, budgets (+ `BudgetsCubit.applyPrefs`), goals (+ `SavingGoalsCubit.applyPrefs`), recurring, categories, tags, contacts, debts, pending: restore at open, remember every user change); events by App-2. Pending page: a stored filter is ignored while its filter bar is hidden (no items from others).
- **P5:** nothing to change: quick create already takes the server default (main wallet first since BE-3 X10), then the device's last wallet.
- **K11 rule form:** kind หนี้: [กับใคร] ⇄ [กระเป๋า] FlowCards in the money's direction (arrow swaps), person via the debt person picker (`showDebtPersonPicker`), wallet optional ("ไม่ระบุกระเป๋า" = ledger only), จดหนี้ | จ่ายหนี้ row, no category / tags / goal, a saved rule can't switch between หนี้ and a money kind; `RecurringPreset` takes `person_name` / `contact`.
- **K12:** a filled debt slot opens `/personal-debts/entries/{id}`; "ผูกกับรายการที่มีอยู่" picks an entry of that person (same kind + direction; `debt_entry_id`, 409 ITEM_ALREADY_LINKED asks to move); 409 NOTHING_OWED = a friendly message (single + bulk); rows show "person | จดหนี้/จ่ายหนี้"; item sign from `direction` (BE-3 added it to items).
- **K13:** `no_balance` chip ("ไม่มียอดค้าง") in ต้องจัดการ / rule rows + detail notice; person page: the person's หนี้ rules (`DebtPersonPage.recurring`, BE-3) as rows → `/recurring/{id}`, and "ตั้งเป็นรายการประจำ" → a new rule preset with the person.
- arb added (this round): settings*, notifSet*, pagePref*, fpRecurringKindDebt, occurrenceNothingOwed, recurringPausedNoBalance, recurringNoBalanceChip, debtsPersonAddRecurring, occurrenceDebtPickEmpty. Value changed: settingsMainWalletHint. Now unused (cleanup): notifSettingsTitle, notifSettingsReceive, notifSettingsLegend, notifStateOff / Notify / Auto, notifAutoAddDebt / CopyToBook / UpdateCopy / ApplySplitChange, notifDefaultAccount(None), settingsNotificationsHint, settingsNotificationsSummary, settingsComingIn04, categoryFeeSwitchLabel / Helper / Failed, commonShowAmounts / HideAmounts (check before removing).
- Tests added: preferences_sync, page_prefs, notification_settings, settings_profile_pages (rewritten), recurring_debt_kind, recurring_debt_occurrence.

deviations / notes:
- Files outside my folders, small: `personal_debts/domain/debt_ledger.dart` (DebtEntryQuery.kind, DebtPersonRecurring), `personal_debts/.../debt_person_cubit.dart` (holds `recurring`), `debt_person_page.dart` (App-1 OK'd), budgets / saving_goals cubits + list pages, accounts / categories / tags / contacts / pending pages (P6 wiring), `category_detail_page.dart` (fee switch moved to Settings › เงิน), `auth/domain/user.dart`, `users_repository.dart`, `notifications_repository.dart` (settings calls only), `MoneyText.hideable` = no-op (App-1 drops its callers).
- **Open, needs FE-CORE / App-1:** the occurrence sheet of a หนี้ slot is the shared entry sheet (`quick_create_sheet.dart` EntrySheetConfig / DraftForm): it can't show a person field or hide category / tags yet. The person shows in the subtitle and those fields are never sent; a debt mode in EntrySheetConfig would finish it.
- NOTHING_OWED is matched by code; it isn't in openapi.yaml yet (BE-3).
- The person page's rule list refreshes on the page's next load, not right after creating a rule.
- Red, not mine: api_spec_ratchet lists old project endpoints no flow calls any more (`/projects/{id}/bills`, `/projects/quick`, `.../copy`, `.../my-books`) = App-2 SA15 / BE-2 V16; `test/features/transactions/event_pick_test.dart` compile error (another session in flight).

## Handoff 2026-10-28
All App-3 items done. Gotchas: preferences live in `PreferencesSyncCubit` (theme / mode / language / fonts) and `page_prefs.dart` (list choices); the two auto-sync switches = `AutoSyncSetting` (reads / writes the signed-in user; one value everywhere). `FontIdCubit` keeps a font per language (`fontFor`, `setFor`, `changes`).

## 2026-10-28 — spare: debt mode in the entry sheet (หนี้ slot)
DONE · analyze (quick_create_sheet, draft_form, features/recurring): clean · tests: recurring + feature_visuals + raw_widgets + save_bodies 44/44
- `DraftForm.debtPersonCard` (optional, default null = unchanged): chip layout shows that card where the category card is and drops the tag row.
- `EntrySheetConfig.debtPerson` / `showEntrySheet(debtPerson:)` (optional EmbeddedPerson): the sheet builds a read-only PickCard + PersonMark from it and passes it to DraftForm.
- `occurrence_actions.dart`: a หนี้ slot's sheet passes `debtPerson: item.person`. Category / tags were already never sent for debt items.
- Additive only, App-1 told first (OK'd; they had just added privateNote / SA6 there, my edits sit on top).

## 2026-10-28 — auto-accept switches (owner 2026-10-28, "รับบิลใหม่อัตโนมัติ")
DONE · analyze (settings, auth, users, personal_debts, projects): clean · tests: settings + preferences + personal_debts + feature_visuals + raw_widgets 45/45
- `User.autoAcceptEvents` (default true) / `autoAcceptDebts` (default false) from `/users/me` (BE-3 spec, exact names); `UsersRepository.setAutoAccept` (one PUT).
- `AutoSyncSetting` gains `which: AutoSyncSwitch.sync | accept` and `named` (the row names the switch, for the event / person page); `autoSyncRows(kind)` = [รับบิลใหม่อัตโนมัติ, ซิงก์อัตโนมัติ] for one SectionCard.
- Settings › ซิงก์อัตโนมัติ: section "รับบิลใหม่อัตโนมัติ" (legend: เปิด = ลงสมุดทันที / ปิด = แจ้งเตือน "เพิ่มในสมุด") with อีเวนต์ + หนี้และแบ่งจ่าย, then section "ซิงก์อัตโนมัติ" as before.
- Person page (linked person): both rows. Event page: App-2 asked to swap its section to `autoSyncRows(AutoSyncKind.events)` (their file).
- arb: settingsAcceptTitle / Legend / EventsHint / DebtsHint / ShortHint, settingsSyncShortHint. The settings home summary still shows only the sync switches.

## 2026-10-28 — test round (owner order for idle sessions)
DONE · analyze (preferences, settings): clean · tests: preferences, settings, recurring, notification_settings, multi_payer_math, page_flows 44 pass
1. Reds from the reports: notification_cubits_test, event_pick_test, feature_visuals, api_spec ratchet = all green at my run (fixed meanwhile by their owners).
2. New logic tests:
   - `users_repository_test`: the /users/me bodies of the four account switches (auto_sync_* / auto_accept_*: only the flipped one goes), app preferences (only the keys sent), page_prefs (one page / reset one / reset all).
   - `page_prefs_test`: remember-last via the new pure `mergePagePref(current, patch)` (newest wins, other keys stay, same value / same list = null = no call). `rememberPagePref` now uses it (no behaviour change).
   - `settings_profile_pages_test`: auto_accept parse + owner defaults (events on, debts off).
   - NEW `test/features/transactions/multi_payer_math_test.dart` (agreed with App-1, against `LinkDraft` + `splitBookBodies`; no lib edits): จ่ายแทน card (my part = bill − theirs to the satang, เกินยอด / ยังขาด, all paid by them, หารเท่ากัน odd satang), two-payer body Σ payers = Σ shares = bill (satang split, + other sharers, รับแทน income), one payer = no payers list. Proportional who-owes-whom is BE-only (the preview), so not tested app-side.
   - Already covered by their owners (checked, nothing added): bill edit routing (bill_edit_route_test: open / completed / disconnected), shared-bill accept routes (notification_cubits_test accept / reject table incl. shared_bill_created / deleted), หนี้ rule draft + slot actions (recurring_debt_kind_test, recurring_debt_occurrence_test).
3. Hub: my new kit piece (SettingsGroupRow) has its demo; my new screens are in page_flows (the hub's API Pages). No new sheets.
Red, not mine: hub_coverage_test: `EventBillPayer` exported from ui.dart without a hub demo (App-1 / App-2 in flight).

## 2026-10-28 — hub_coverage red (EventBillPayer)
DONE · hub_coverage_test: pass
- `EventBillPayer` (App-2's, not App-1's) already had demos on the hub Events page (`domain_events_page.dart`); only the page's `covers` list in `hub_registry.dart` lacked it. Added the name; no other change.
