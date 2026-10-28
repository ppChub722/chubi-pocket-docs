# App-2 inbox (0.4.1-1: recurring + shared pieces)

Owns: `features/recurring`, `core/data` (effects), `transaction_detail_page.dart`, `transaction_edit.dart`, `project_detail_page.dart` (settle).
Items: B1 (app), B2 (app), R6 (app), R10, R12 (app warning), E6 (app), E7, tx detail disconnect.

## Shared-file notices
- 2026-10-27: App-2 appends arb keys (app_th/en.arb) for R12 (fpRecurringAutoCreateZeroWarn) and the tx-detail disconnect (txLinkDisconnect*); runs gen-l10n after.
- 2026-10-27: App-2 edits `quick_create_sheet.dart` `_deleteEditTx` only (R10: no "skip occurrence?" ask, no `skipOccurrence`); `TransactionsRepository.delete` / `TransactionsCubit.remove` lose `skipOccurrence`.
- 2026-10-27 (E8 app, taken from App-1): App-2 now owns `event_bill_sheet.dart`; edits `quick_create_sheet.dart` อีเวนต์ tab save (`_paybackInEvent` / `_bookEventDebts` / `_repayNow` chain → ONE `bookEventBill` with `new_event`), `projects_repository.dart` / `project.dart` (E8 parts).

## 2026-10-27 — E7 + R6 (app) + R12 (app) + tx-detail disconnect
DONE · analyze clean (recurring / projects / transactions) · tests: event_pick, recurring, projects, save_bodies 43/43 pass; my new R12 test in recurring_writes_test can't load right now: App-1's in-flight `personal_debts_repository.dart` (DebtRepaymentResult) breaks the compile; re-run when it's in.
- **E7:** `project_detail_page.dart` settle uses `pairs` (same SettleLine shape, mine / recorded set by the same BE line()).
- **R6:** `recurring_detail_page.dart` no scope question; `RecurringRepository.update(id, write)` sends no `scope` / `also_update_link` / `also_update_tx` (BE-2 contract); `RecurringDetail.txUpdateFailed` and `RecurringDraft.txFieldsDiffer` removed.
- **R12:** `RecurringDraft.canAutoCreate` = wallet only; `autoCreateWarns` (on + no / 0 amount) → warning AppMessage under the toggle. There is no "varying amount" flag in the rule: no amount = varying.
- **Disconnect:** event card (view mode) has "ตัดการเชื่อม" → confirm → ONE call `PUT /projects/{id}/project-transactions/{bill_id}/my-books {unlink:[tx]}`, then refreshOne (the answer carries no tx; B2 effects will replace it). The edit-mode ✕ does the same now: `applyEventChange(billId:)` → my-books unlink instead of `removeBill` (removeBill only when the tx has no bill). Paid card: no disconnect (Lead).
- arb appended: fpRecurringAutoCreateNeedsWallet, fpRecurringAutoCreateZeroWarn, txLinkDisconnect / Title / Body / ed.
- Unused arb keys now (leave for a cleanup pass, arb is shared): fpRecurringTxScopeTitle / Future / All, fpRecurringTxUpdateFailed, fpRecurringAutoCreateNeeds.
- Open (rule f, not mine): switching the ผูกกับ tab away from อีเวนต์ (link_mode switch, BE link_mode.go) still removes my origin bill from the event; picking another event from my tx (applyEventChange A → B, move=true) moves the bill.

## 2026-10-27 — R10 (app, against BE-2's contract) + R12 test
DONE · analyze clean (my files + quick_create_sheet) · tests: recurring (incl. the R12 draft test), event_pick, transaction_wire, save_bodies, projects 49/49 pass
- **Tx delete asks nothing about links** (R2 + rule f): `transaction_detail_page` / `quick_create_sheet._deleteEditTx` = the plain delete confirm; `askDeleteRecurringTx` removed; `TransactionsRepository.delete` / `TransactionsCubit.remove` lose `skipOccurrence`. The event-origin "ลบรายการที่ผูกไว้ด้วยไหม" ask is gone too (Lead: nothing from my book changes the bill); `alsoDeleteLink` stays in the repo, unused by pages.
- **Save ask:** `linkedSaveAsks` = event bill only (R1: a recurring slot reads the tx). `Transaction.hasPromptedLink` (transaction.dart, App-1's file) is now unused.
- **Skipped slot (R4):** the occurrence sheet offers ยืนยัน / ผูกกับรายการที่มีอยู่ / จ่ายแล้ว on a skipped one (plus ยกเลิกการข้าม).
- **Filled slot skip:** a snack "ตัดการเชื่อมรายการก่อน" instead of the old keep / delete-tx prompt; `skipOccurrence` has no `delete_tx`.
- **จ่ายแล้ว amount (R5):** `markOccurrencePaid(amount:)`; the sheet sends its amount in mark-paid; the focus card's จ่ายแล้ว on a row with no amount opens the sheet; bulk จ่ายแล้วที่เลือก sends `items[].amount` and leaves out rows with none (like ยืนยัน).
- **pause_reason (R7):** `RecurringPauseReason` on Recurring and RecurringParent (BE-2 added `pause_reason` to RecurringRef on items at my ask); detail notice per reason (overdue_limit warning, goal_inactive); ต้องจัดการ rows get a "ค้าง 3 งวด" chip.
- arb appended: occurrenceSkipFilled, recurringPausedOverdue / Goal, recurringOverdueLimitChip. Newly unused: txDeleteRecurringTitle / Body / Only / Skip, occurrenceSkipLinkedTitle / KeepTx / DeleteTx, linkedDeleteTitle / ThisOnly / Both (check before removing).
- Not run against a live BE (the code is still landing).

## 2026-10-27 — B2 (app): effects
DONE · analyze clean (core, the 3 cubits) · tests: transactions_cubit_placement (2 new: effects table, WriteEffects.of) 5/5 pass
- `lib/core/data/write_effects.dart`: `WriteEffects` (the BE `Effects` as JSON, typed getters per key; a missing key = none), `WriteEffectsBus` (one handler; a failing cache is skipped) and the `ApplyWriteEffects` cubit mixin (ends with the cubit).
- `ApiClient._effectsReader`: next to `_syncVersionsReader`; every response body with `effects` is published. Pages need no extra call.
- Applied by: `TransactionsCubit.applyEffects` (removed drop, changed patch in place, new rows placed by the list's sort / filter; every live list takes them itself, so no cross-refresh; totals / unjudgeable filters still refresh), `AccountsCubit` (account_balances → patchBalances), `DebtDirectoryCubit` (person_balances → applyBalance; App-1's file, hook only).
- Not applied at cache level: `debts` / `removed_debt_ids` (person page state, App-1), `slots` (recurring pages already patch from ItemWriteResult), `bills` / `removed_bill_ids` (the event page patches from EventPatch). Pages can read them with `WriteEffects.of(res.data)`.
- Existing manual patches (patchRow, patchBalances from a result) stay: patching twice gives the same state.

## Known (owner 2026-10-27, via Lead)
- In 0.4.1-1 the ผูกกับ tab switch off อีเวนต์ (link_mode) and picking another event from my tx (A → B move) still change the bill; 0.4.1-2 replaces them with the bill form.
- E6 (app) dropped from App-2: BE-2's book-bill call sets the bill's linked_transaction_id.

## 2026-10-27 — B1 (app): untouched 0 saves (tx forms)
DONE · analyze clean · tests: new edit_problem_test 1/1; my whole set (recurring, projects, event_pick, transaction_wire, save_bodies, edit_problem, transactions_cubit_placement, core/data) 74/74 pass
- `transactionEditProblem(savedAmount:)`: a tx whose stored amount is 0 saves while the field is still 0 / empty; a typed amount stays > 0; a new tx still needs > 0. Wired in `transaction_detail_page` and the quick create edit (`quick_create_sheet`, one argument).
- The debt half of B1: done by App-1 (debt_entry_detail_page: a stored-0 entry saves untouched, the PUT omits amount; the quick-create debt form only creates, so it stays > 0).

## App-2 status
All items done: E7, R6, R12, tx-detail disconnect, R10, B2, B1 (tx forms). E6 dropped (Lead). Built against the specs; nothing run against a live BE yet.

## 2026-10-27 — E8 (app, finished from App-1's hand-off) + D9 (app)
DONE · analyze clean (touched files) · tests: personal_debts (incl. new debt_disconnect_test 3), notifications, event_book_body (new), save_bodies, projects, page_flows + api_spec ratchets 82/82; hub smoke 49/49
- **E8:** the event bill sheet already made ONE /event-bills call (App-1). Left part done: quick create's ผูกกับ อีเวนต์ tab now saves with ONE `bookEventBill` (`project_id` or `new_event`) built by the new `transactions/presentation/event_book_body.dart` (bill: payer, my share + everyone's share, `paid_back` on "คืนแล้ว"; my_books: on, tx, debt = "จดหนี้ด้วย", wallet only when I paid, category, personal tags). Removed from `quick_create_sheet.dart`: quickCreate / addBills + setTags + `_bookEventDebts` + `_paybackInEvent` (resolvePeople + payback rows + repayments). `_repayNow` stays for แบ่ง (not an event). page_flows: quick-create step "บันทึก (ผูกกับ อีเวนต์ tab)" → bookEventBill.
- Not done (optional per App-1): `_debtAlreadyBooked` still the sheet's first guess before the preview lands; the DebtResultBox wallet line still local (preview.wallets exists). `eventBillBody` in quick_create_bodies.dart is now only used by its test.
- **D9:** `PersonalDebtsRepository.disconnect(id)` (POST /personal-debts/{id}/disconnect); `DebtEntry.partnerLinked` / `disconnectedAt`; the debt detail page shows "เชื่อมกับสมุดของ {name}" + "ตัดการเชื่อม" (view mode only, outside `_edit`, confirm → ONE call → the page follows the answer). `NotificationType.debtDisconnected`: tile (link icon, "{who} ตัดการเชื่อมหนี้ {amount} แล้ว", info only; a tap opens the deep link = my entry), a mute row in notification settings (splits group), a hub example. page_flows: debt-detail "ตัดการเชื่อม" → disconnectDebtPartner (ratchet green again).
- Not built: hiding "อัปเดตตาม" on a disconnected copy's old split_changed notices (the BE stops sending them).
- arb appended: notifTypeDebtDisconnected, notifDebtDisconnected, debtDisconnectTitle / Body, debtPartnerLinked.

## 2026-10-27 — B2 (app) on recurring writes (BE-2 spec: effects.slots)
DONE · analyze clean (features/recurring) · tests: recurring 12/12 (new: effects.slots patch a page list)
- Transactions / wallets of recurring writes already ride the bus (TransactionsCubit / AccountsCubit). New: `ItemWriteResult.fromEffects` (effects.slots → a patch) and both recurring pages listen to `WriteEffectsBus`: the home page patches its month list + ต้องจัดการ (a slot that newly needs handling reloads ต้องจัดการ only), the detail page patches this rule's produced / upcoming lists. So a tx deleted / unlinked from another tab (effects.slots = the skipped slot) shows at once, no re-fetch.
- The pages' own write handlers (_onChanged / _applyItems) are unchanged; patching twice is the same state.

## 2026-10-27 — close-out: eventBillBody removed
DONE · analyze clean · tests: save_bodies + event_book_body 19/19
- `eventBillBody` removed from quick_create_bodies.dart; its half of save_bodies_test went with it (the test keeps the event sheet's `projectBillBody` part, renamed "quick create event sheet: its own bill"). The อีเวนต์ tab body is covered by event_book_body_test.dart. `_debtAlreadyBooked` / DebtResultBox left as they are.

---
# 0.4.1-2 — App-2 = chubi-pocket-9b (events app + notifications)
Owns: `project_detail_page.dart` (+ members page, project_common, project_tx_tiles, event_errors), notification tiles / routes / actions. Split agreed with App-1: event_pick.dart old calls = App-1 (SA9); notification_actions + tx-detail `_disconnectEvent` = App-2 (SA15). NotificationSettings / NotifyMode (in notification.dart) handed to App-3.

## Shared-file notices
- 2026-10-27: arb appended (eventComplete*, eventCompleted*, eventErrCompleted / NotActive / EmptyPerson, evbReceives) + gen-l10n. `project.dart` Project gains `canComplete` / `completedAt` / `isCompleted` (App-1 OK'd). page_flows: event-detail step → `completeProject`.

## 2026-10-27 — V3 (complete = confirm + lock) + Q-E3 board wording — IN PROGRESS (waits on BE-2's openapi)
- Contract from BE-2 (75): POST /projects/{id}/complete (op `completeProject`) → EventPatch + effects; `completed_at`, `can_complete`; 409 PROJECT_NOT_ACTIVE / EVENT_COMPLETED / EVENT_HAS_EMPTY_PERSON; restore of an archived once-completed event → completed.
- App: status "เสร็จสิ้น" (offered only with `can_complete`) → confirm "ปิดอีเวนต์ถาวร?" → ONE call; a completed event: no ✏️ / long-press edit, no invite, rows locked (ProjectView.rowsLocked = locked | is_locked | completed), members page read-only, an info notice under the hero; status menu then = เสร็จสิ้น | เก็บถาวร (archive / restore). Error codes mapped.
- Q-E3: an income bill's line 2 reads "{name} รับ" (board tile); the bill sheet's wording is App-1's.
- Tests: event_model (V3 group) + event_errors pass. page_flows / api_spec ratchets red until `completeProject` is in openapi (+ BE-1's in-flight dangling $refs EventBillView / DeleteResult / ApplyResult — not mine).

## 2026-10-27 — SA15 (my part) + SA13 (notification types) + V3 contract live
- **V3:** BE-2's `completeProject` is in openapi + routed (migration 101); app as above. page_flows ratchet green for it.
- **SA15 (agreed split with App-1: event_pick.dart old calls = App-1 SA9):**
  - `copyToPersonal` removed from ProjectsRepository; new `applyEventBill(ptId)` / `disconnectEventBill(ptId)` → `MyBillCopyRef {transactionId, connected}` (effects ride the bus).
  - Notifications: ONE accept route `AcceptRoute.applyBill` for shared_bill_created / shared_bill_deleted / project_tx_changed / old project_tx_recorded_for_you → POST /event-bills/{pt}/apply (replaces copy + the plain-PUT "อัปเดตตาม"; = the notification half of SA12). New copy → opens my tx (to pick category / wallet); changed → snack; deleted → snack; BILL_GONE / BILL_DISCONNECTED / PROJECT_LOCKED in plain words.
  - Tx detail event card "ตัดการเชื่อม" → POST /event-bills/{pt}/disconnect (my tx + my debts of the bill become plain; no refreshOne, effects patch the row); new confirm text `txLinkDisconnectBodyCopy`.
  - Still calling old endpoints (not mine): event_pick.dart (App-1 SA9).
- **SA13:** NotificationType + sharedBillCreated / sharedBillDeleted / sharedBillDisconnected / eventCompleted / eventMemberRemoved; tiles (titles, icons, "เพิ่มในสมุด", "ลบตาม" / "เก็บไว้", amount = my_amount); a tap on a `/event-bills/{id}` deep link goes to `/projects/{id}?bill={pt}` (event) or my copy tx (split) via `notificationLinkOf` until App-1's SA2 opener exists; hub examples (shared bill ask, bill deleted ask, event completed). Mute rows = App-3.
- arb appended: notifActionAddToBook / RemoveMine / KeepMine, notifSharedBill* / notifEvent*, notifBillRemovedMine / Gone / DisconnectedMine, txLinkDisconnectBodyCopy. Newly unused (cleanup pass): txLinkDisconnectBody, notifActionCopyToBook stays (old rows).
- Tests: new shared_bill_notices_test 3/3, notification_tile_test pass; event_model + event_errors pass. notification_cubits_test does not compile right now: App-3's in-flight settings rework (NotifyMode / setMode gone) — my route-table lines in it are updated. api_spec ratchet: only GET / DELETE /event-bills left (App-1 SA2 bill form).
- Next (waiting on BE-2 specs): V15 empty person row + ต้องจัดการ entry, V9/V10 claim UI, V6/V7 lump, V12 settle after completion, V8 retire `_recordSettle`.

## 2026-10-27 — V15 (empty person) + SA14 (event page switch) + bill deep links
- **V15:** `ProjectMember.removedAt / isRemoved`, `Project.emptyPersonBillCount`; kit `PersonLevel.empty` (PersonMark = a dashed empty ring; EventBillRow / EventBillChildRow mute the name; the hub's PersonLevel loops show it). Bill tiles: a removed member's spot reads "ยังไม่ระบุคน"; a tap on it (payer or share) → `ContactPicker.payer` (me / contact / typed name) → ONE `assignRemovedMember` with bill_ids = that bill. Event page ต้องจัดการ: a warning AppMessage "{n} บิลมีช่องคนว่าง…" + "ใส่คน" (picks whose spots when several removed, then all their bills). New `projects/presentation/event_assign.dart` (billPersonOf, assignEmptySpots, assignAllEmptySpots). page_flows: event-detail → assignRemovedMember.
- **SA14 (my part):** event page view: a "ซิงก์อัตโนมัติ" SectionCard with App-3's `AutoSyncSetting(kind: events)` under the members strip (hidden once completed).
- **Deep links:** `/event-bills/{id}` taps → App-1's `openEventBill` (notification_routes `billOfLink`; the earlier fallback is gone).
- **For App-1 (SA1):** their guard added at the top of transaction_detail_page `_enterEdit` (shared-bill copy → openEventBill).
- arb appended: evbEmptyPerson, evbAssignMe / Title / Whose / Action, evbAssigned, evbEmptyPersonsNotice.
- Tests: event_model (V3 + V15 groups), event_errors, shared_bill_notices, notification_tile 20/20.
- api_spec ratchet left red by others / next: GET / DELETE /event-bills (App-1), GET /projects/{id}/claimable (BE-2 V9, my V10 next).

## 2026-10-27 — V7 lump / V8 app / V9-V10 claim sheet + P6 board sort
- **Claim sheet (V6/V7/V9/V10):** new `projects/domain/claim.dart` (ClaimableBill, ClaimResult), ProjectsRepository `claimable(projectId, memberId:)` + `claimBills(...)`, `projects/presentation/event_claim.dart` `showClaimSheet(...)`: kit ItemPickerSheet (multi; groups "{name} ติดฉัน" / "ฉันติด {name}" / "คืนเงิน / ให้ยืม"; claimed rows disabled "ลงสมุดแล้ว"; unclaimed ticked) → ONE POST /projects/{id}/claim; CLAIM_MIXED_DIRECTION / BILL_ALREADY_BOOKED in plain words.
- **V7 + V8 (app):** event สรุป tab: a pair row with me → "จดเป็นหนี้" opens the claim sheet with that person (replaces `_recordSettle` = the old {event_id} debt via createDebtEntry; removed). After a claim: board + settle reload.
- **V10:** entry points live in App-1's files (quick-create debt mode, event_pick.dart) — offered showClaimSheet to App-1 (onlyBillId + linkTransactionId for the tx form's join); waiting on their answer.
- **P6 (for App-3):** event board opens in the remembered `PagePrefIds.events` sort; a sort pick remembers it.
- page_flows: event-detail → listClaimableBills, claimBills. arb appended: evbClaim* (Title / TheyOwe / IOwe / Paybacks / Untitled / Done / Note / Confirm / Nothing / Mixed / Already), evbClaimed. Newly unused: evbSettleRecordBody (cleanup pass).
- Tests: event_model (V3, V15, claim parse) + page_flows + api_spec ratchets 16/16 green.
- Left: V12 (settle after completion + "ลงในสมุดฉัน", waits on BE-2), V10 wiring (App-1 answer), debt detail listing its bills (DebtEntry.bills — debt page owner?).
- 2026-10-27: V10 wiring agreed: App-1 calls `showClaimSheet` from quick-create debt mode and event_pick.dart (SA9); App-2 doesn't touch those files.
- 2026-10-27 (Lead OK): App-2 edits `debt_entry_detail_page.dart` (V7 lump bills section) + the DebtEntry model's `bills` parse; App-1 told.

## 2026-10-27 — V7 debt detail: a lump lists its bills
- `DebtEntry.bills` (`DebtBillPart`: pt_id, event EventRef, description, amount, in_sync, edit_in_bill) in personal_debts/domain/debt_ledger.dart.
- transactions/presentation/pages/debt_entry_detail_page.dart: a headed "บิลในหนี้ก้อนนี้" SectionCard (last section, view mode, only when bills > 1; one bill already shows in "มาจาก"): AppListRow per bill (description | event name or "แบ่งจ่าย", amount, "ไม่ตรง" caption when out of sync); a tap → App-1's `openEventBill`.
- arb appended: debtBillsTitle, debtBillSplit, debtBillOutOfSync. Test: new debt_bills_test 1/1.

## 2026-10-27 — V12 + V10 person filter; App-2 0.4.1-2 DONE
- **V10 (sheet side):** `showClaimSheet(context, {projectId, memberId?, contactId?, personName?, memberName?, onlyBillId?, linkTransactionId?})`: a person by member / my contact / typed name (BE-2 resolves contact_id / person_name on GET /claimable) → lump mode; `linkTransactionId` alone → join mode (single-select over bills someone else paid where I hold no copy; `ClaimableBill.joinable`). App-1 wires it from quick-create debt mode + event_pick.dart (SA9).
- **V12:** `EventSettle.simplifiedAvailable / myBookedAt / mySimplified`; ProjectsRepository `bookEventSettle`; new `projects/presentation/event_settle_book.dart` `bookMySettle` (per my simplified line: wallet picker → category picker (expense when I pay, income when I receive; none allowed) → ONE confirm → ONE POST /projects/{id}/settle/book). สรุป tab: [ตามคู่จริง | จ่ายน้อยครั้งสุด] SegmentedChoice only when completed; simplified + not booked → "ลงในสมุดฉัน"; booked → success note with the date; pair rows can't be claimed after the booking. Not built: `link_transaction_id` per line (connect an existing tx instead of a new one) — the API takes it; a later UI pass.
- arb appended: evbJoinTitle / JoinPaidBy / Joined, evbSettlePairs / Simplified / Book / BookTitle / BookBody / Booked / BookedOn / AlreadyBooked, evbBookLinePay / Get. page_flows: bookEventSettle.

### Summary of App-2's 0.4.1-2 items
- V3 complete = confirm + lock UI · V7 lump (สรุป pair row → claim sheet) + debt detail lists a lump's bills · V8 app (`_recordSettle` {event_id} debt removed) · V10 claim sheet (wiring = App-1) · V12 settle after completion · V13 app (shared_bill_deleted "ลบตาม" = apply) · V15 empty person row + ต้องจัดการ banner + assign · SA13 notification types · SA15 my part (copyToPersonal gone, notices + tx-detail disconnect on the new calls; event_pick = App-1) · Q-E3 income bill wording on the board · page_flows for every new call. Extras for peers: App-1's SA1 guard in tx detail, openEventBill deep links, App-3's AutoSyncSetting + P6 board sort on the event page.
- Tests (mine only): event_model, event_errors, debt_bills, shared_bill_notices, notification_tile + page_flows / api_spec ratchets — 22/22 green at the end.
- Cleanup-pass candidates (arb, now unused): txLinkDisconnectBody, evbSettleRecordBody, notifActionCopyToBook only for old rows (keep), plus the 0.4.1-1 list above.
- Known gaps: V12 "connect an existing tx" per line; `createDebtEntry(eventId:)` param in PersonalDebtsRepository unused by me now (V8 BE retires {event_id} debts).

## 2026-10-27 — spare: V10 tx side ("ผูกกับบิลในอีเวนต์") + V16 check
- transaction_detail_page (view mode): an InfoBox row "ผูกกับบิลในอีเวนต์ ›" for an expense / income with no event and no bill (canEdit) → `EventPicker.one(allowCreate: false, showClosed: false)` → `showClaimSheet(projectId, linkTransactionId: tx.id)` (join mode: one bill someone else paid where I hold no copy) → ONE claim; the row comes back through effects. arb: txJoinBill.
- `ProjectsCubit.quickCreate` removed (no callers). V16 status sent to BE-2: the app's only remaining old-endpoint calls (/projects/quick, /projects/{id}/bills add/remove, my-books) are in event_pick.dart (App-1 SA9).
- Analyze clean (tx detail, projects). No new tests (UI wiring only; the join filter `ClaimableBill.joinable` sits on the parsed model).

## 2026-10-28 — Added items: delete a completed event (done) · multi-payer (waits on BE-2)
- **Delete (owner: completed events deletable; bills stay as standalone split bills, copies connected):** BE-2's contract (delete_linked_txs dropped; answer {id, split_bill_count, effects}). App: `ProjectsRepository.delete(id) → int` / `ProjectsCubit.delete(id) → int` (no flag); the confirm is ONE dialog "ลบแค่อีเวนต์ บิลข้างในยังอยู่ เป็นบิลแบ่งจ่าย…" + ONE call (the delete-preview call is gone; my rows re-point via effects, no balance patch). A completed event: the hero status menu = เสร็จสิ้น | เก็บถาวร | ลบ (null option = delete; completed has no edit mode). EndZone consequence → "บิลข้างในยังอยู่ เป็นบิลแบ่งจ่าย". `event_delete_choice.dart` (DeleteChoice / deleteLinkedTxsOf) removed + its test; projects_cubit_test updated.
- **App-3 ask:** event page sync section → `SectionCard(children: autoSyncRows(AutoSyncKind.events))` (รับบิลใหม่อัตโนมัติ + ซิงก์อัตโนมัติ, no title; still hidden once completed).
- **S16 fallout (BE-1 removed the split-request accept + split-change apply):** `PersonalDebtsRepository.acceptSplit / applySplit` + `DebtSplitChangeResult` removed (App-1 told); AcceptRoute.split / splitChange removed; old split_created / split_changed rows are info only (no button; routed to applyBill, a no-op without a bill id); page_flows steps dropped.
- arb appended: eventDeleteKeepsBills, eventDeleteKeepsBillsShort. Newly unused (cleanup): eventDeleteBody / KeepTxs / WithTxs, fpM5bEventDeleteNumbers, fpEventsDeleteConsequence, notifActionAddDebt, notifSplitChange* (Deleted / Updated / Used / Stale / Gone).
- Tests: projects 24/24; notifications + personal_debts + ratchets 24/24.
- **Multi-payer (board line 2 / settle / lump "จ่าย: ลี 700 | ปอนด์ 500"):** not started, no `payers` in openapi yet.

## 2026-10-28 — multi-payer display (board + claim sheet) — DONE
- Contract (BE-2): BoardRow.payers / ClaimableBill.payers [BillPayer {member, amount}], biggest first, one entry for a single payer; SettleLine unchanged (pairs / simplified now proportional, amounts just change → nothing to build in สรุป).
- **Kit:** `EventBillRow.payers` + new `EventBillPayer {name, amount (formatted), level, iconCode}` (event_bill_row.dart, exported via ui.dart already): with 2+ payers the payer line reads "[verb]: (mark) ลี ฿700 | (mark) ปอนด์ ฿500"; one payer keeps "ลี จ่าย". Hub: a two-payer EventBillRow example on the events domain page.
- **Board:** project_tx_tiles passes every payer (from App-1's `ProjectTransaction.payers`) when there are 2+; names / levels via the event members (removed → "ยังไม่ระบุคน").
- **Claim sheet:** `ClaimableBill.payers`; a multi-payer bill's subtitle adds "จ่าย ลี ฿700, ปอนด์ ฿500" (lump and join modes; join keeps "{name} จ่าย" for one payer).
- arb appended: evbPayersLine (re-read after App-1's cleanup; my keys are all referenced and still there).
- Tests: event_model (claimable payers), projects_cubit, hub_pages_smoke, page_flows, api_spec ratchet — 69/69.

## 2026-10-28 — tests + cleanup (owner order for idle sessions)
- (1) App-3's ask was already in: the event page shows `autoSyncRows(AutoSyncKind.events)` (รับบิลใหม่อัตโนมัติ + ซิงก์อัตโนมัติ).
- **Logic made testable:** `eventStatusOptions(current, completed:, canComplete:)` (project_common; the page's status menu uses it) and `projectBillPayers(l, view, bill, money)` (project_tx_tiles; the board tile uses it).
- **New test** `test/features/projects/event_flows_test.dart` (6): status menu (active / no right / completed + archived-completed), multi-payer lines (2 payers incl. a removed one → empty spot; one payer → none), join filter (`ClaimableBill.joinable`), and every new event request's path / body (complete, delete without flag + split_bill_count, assign with / without bill_ids, claimable by contact / name, claimBills incl. link_transaction_id, settle/book → booked, apply / disconnect). No duplication: App-3's tests are settings / preferences / recurring; App-1's are the bill form + multi-payer math. Already existing from earlier today: event_model (V3, V15, claim + payers parse, V12 settle parse), event_errors, shared_bill_notices (types, deep links, apply answer), notification_cubits route table, debt_bills, projects_cubit (delete).
- **Dead code removed (SA15 / V16):** ProjectsRepository `createTransaction`, `updateTransaction`, `deleteTransaction`, `toggleMark`, `listTags` (no callers; App-1 had already removed quickCreate / addBills / removeBill / setMyBooks / resolvePeople), `ProjectSplitInput`, the event delete preview (`EventDeletePreview`, `ProjectDetail.deletePreview`, `detail(deletePreview:)`). page_flows: the spec ops still listed (createProjectTransaction / updateProjectTransaction / markProjectTransaction / deleteProjectTransaction) are marked "no caller — retired with V16" so the ratchet stays green until BE-2 removes them.
- Hub: the two-payer EventBillRow example (earlier today); PersonLevel.empty shows in the existing PersonLevel loops. No new screens of mine need their own hub page (sheets reuse kit ItemPickerSheet / pickers / dialogs).
- Arb: nothing left — App-1's sweep already removed every key I had listed as unused.
- Tests run: hub_coverage, feature_visuals, layering, raw_widgets, test/features/projects, my notification / debt tests, page_flows + api_spec ratchets — 52/52 green.
