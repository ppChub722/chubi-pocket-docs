# BE-3 inbox (0.4.1-2: "หนี้" recurring kind + settings on the server + the two auto-sync switches)

Owns: `recurring/*`, `users/*`, `notifications/*` (except the 092 CHECK), `sync` (P4), migrations 110–119. Test DB: `chubi_test_be3`.
Items: S4 (= X9), K1–K9, P1, P2, P4, P6, P7 (BE), X10.

## Progress 2026-10-27 (interim, not DONE)
Spec (openapi.yaml) for the day-1 items is in. App-3 (chubi-pocket-9d) builds against it.

Done in code, tests green in my packages (users, notifications, shared, personal_debts; transactions TestFormOptionsHandler):
- **Migration 110** `settings_sync_switches`: `user_notification_settings.auto_sync_events` / `auto_sync_debts` (BOOLEAN NOT NULL DEFAULT TRUE, on for everyone, Q-B9). DROPS `auto_types` and `auto_resolve_own_in_projects`. Strips the never-sent `theme` / `language` registration defaults from `user_preferences` (P2). Breaking for the current app build.
- **S4 / X9:** `notifications.Delivery{Deliver, Auto, SyncEvents, SyncDebts}`; `Auto` follows the type's switch (split_* → debts, project_tx_* → events) and does not depend on mute (muted + auto = applied silently). The 4 early returns in BE-1's files now read `!Deliver && !Auto`. `pt_service` reads `AutoSyncEvents` (the old auto-copy of my own bills folds into it).
- `/notifications/settings`: `types[{type, group, on, mutable}]` in page order (from `pageTypes` in service.go; BE-1 / BE-2 added their new types there), `auto_sync_events`, `auto_sync_debts`; `auto_types` is gone.
- **P1 / P6 / P7:** `/users/me` adds `auto_sync_events`, `auto_sync_debts`, `fee_category` (CategoryRef) and `notification_summary {on, total}`. `auto_copy_own_event_bills` is gone. New preferences: `theme_mode` (light|dark|system), `theme_id`, `language` (th|en, checked), `font_th`, `font_en`, `page_prefs`. `page_prefs` merges per page (page ids allow-listed, each entry ≤ 2 KB, null = reset a page, `page_prefs: null` = reset all). `theme` is rejected.
- Person page `auto_sync_debts`, event detail `auto_sync_events`, both via `shared.UserPrefs` (now also reads the switches). The event-detail query budget goes 9 → 10.
- **P4:** sync dataset `profile` (= GET /users/me). Recurring / FormDefaults hash only the preference keys they read, so a page_prefs write doesn't re-sync them. FormDefaults also follows `default_account_id`; Recurring follows contacts + personal_debts (the "หนี้" kind). `cmd/api/main.go`: `Users: usersService` in `datasync.Services`.
- **X10:** form default wallet = the main wallet (`default_account_id`) while it's in the list, else the last used, else the first.
- **Migration 111** `recurring_debt_kind` (K1): kind / type `debt`, pause_reason `no_balance`, rule columns `contact_id`, `person_name`, `debt_kind`, `debt_direction`, `zero_rounds`, `recurring_items.debt_entry_id` (UNIQUE, SET NULL). Up / down / up checked.

Decisions taken:
- ONE main wallet (`default_account`). The mock's "กระเป๋าที่รับเงิน" row is dropped (Lead OK; Lead is asking the owner).

Next: K2–K9 code, then docs (modules 02 / 11 / 13, api-document, schema).

## 2026-10-27 — S4 (X9), P1, P2, P4, P6, P7 (BE), X10, K1–K9 (+ K13 BE part)
DONE · files: be `internal/modules/{notifications,users,recurring,sync}`, `internal/shared/{prefs,person_recurring}.go`, `transactions/formoptions.go`, `cmd/api/main.go` (2 wiring lines), small edits in BE-1 / BE-2 files listed below; migrations **110, 111, 112**; openapi.yaml · vet / test: go vet clean; go test ok for users, notifications, shared, sync, recurring, personal_debts, apidoc, dashboard, budgets, transactions TestFormOptionsHandler (TEST_DATABASE_URL = `chubi_test_be3`, 0 skip). The full projects package fails on peers' in-flight work (same failures with my switch defaults turned off).

What's built (interim entry above has S4 / P* details):
- **K1–K3:** migration 111 (kind / type `debt`, `no_balance`, rule person / debt_kind / debt_direction / zero_rounds, `recurring_items.debt_entry_id`). Rule fields + validation (no category / tags / goal; CONTACT_NOT_FOUND / CONTACT_ARCHIVED). Views: `person`, `debt_kind`, `direction`, `person_balance`, `zero_rounds`, `by_kind.debt`. Items: `person`, `debt_kind`, `direction`, `debt_entry`. Link by `debt_entry_id`.
- **K4:** confirm / bulk confirm / auto-create book the entry through `personal_debts.CreateEntryTx` in the same DB tx (+ its tx when the setting has a wallet). mark-paid (one / bulk) books it without a tx. `effects` carry the entry, its person balance, its tx.
- **K5:** จ่ายหนี้ = min(rule, owed), on read and at booking (409 NOTHING_OWED when nothing is owed). Due check: nothing owed → due rounds skipped + `zero_rounds`; the 3rd → paused `no_balance`. Owed → the count restarts and only the newest due slot waits. A `no_balance` rule resumes when the person owes again: the DueCheckDaily guard looks for it, so the next POST /sync resumes it at the current period.
- **K6:** migration 112, a BEFORE DELETE trigger on personal_debts: the slot is skipped with the entry's amount (covers every delete path).
- **K7:** contact delete keeps the name; absorbing names moves the rules too (2 statements in `personal_debts/store.go`).
- **K8:** month_pay / month_receive / due_30d by direction; budgets skip them (type ≠ expense); the Recurring sync set adds contacts + personal_debts.
- **K13 (BE, asked by App-3):** `DebtPersonPage.recurring` = the person's "หนี้" settings, via the hook `personal_debts.WithRecurring` (no import cycle).

FE contract delta (all in openapi.yaml; App-3 has it):
- `/notifications/settings`: `auto_types` gone; `types`, `auto_sync_events`, `auto_sync_debts` added.
- `/users/me`: `auto_copy_own_event_bills` gone; `auto_sync_*` and `fee_category` added; `notification_summary {on, total}`; preferences `theme` → `theme_mode`, plus `theme_id`, `font_th`, `font_en`, `page_prefs`.
- EventDetail `auto_sync_events`; DebtPersonPage `auto_sync_debts` + `recurring`.
- Sync dataset `profile`; FormDefaults main wallet first.
- Recurring kind `debt` as above.
- Breaking for the current app build (MIN bump).

Edits in others' files:
- BE-1 (agreed): `split_edit.go`, `split_flow.go`, `personal_copy.go` ×2, `pt_service.go` (one line each). Tests: `split_edit_test.go` (fixture switches auto_sync_debts off after the first mirror + `autoSync` helper), `paid_by_test.go`, `projects/bills_test.go`.
- personal_debts (unowned): `store.go` (K7), `service.go` / `model.go` (person page `auto_sync_debts` + `recurring` hook).
- BE-2 (told): `projects/model.go` + `views.go` (EventDetail.auto_sync_events). `touch_test.go`: event-detail query budget 9 → 10.
- sync tests: first-sync budget 29 → 31 (the new profile dataset).

Deviations / notes:
- Q-K6: a "หนี้" rule with a connected contact books exactly like a manual entry (`CreateEntryTx`), which today sends nothing to the other user. If the owner wants a notice, that's a debts-module change for all manual entries.
- Deleting a debt setting with `delete_linked` doesn't delete its entries (they stay in the person book; `debt_entry_id` just goes).
- I used sed for the ruleColumns scan / save edit in recurring/store.go (6 lines) and one import line before noticing the Read + Edit rule; Edit everywhere after.

Open:
- K8 "recurring link on the debt view": a debt entry's page doesn't show which setting it came from yet. Needs a `recurring` link field on `DebtEntry` (BE-1 area): say if wanted.
- Lead asking the owner: one main wallet vs the mock's second "กระเป๋าที่รับเงิน".

## 2026-10-28 — NOTHING_OWED in the spec + mark-paid-ready fix
DONE · files: be `internal/apidoc/openapi.yaml`, `recurring/slot.go`, `recurring/debt_kind_test.go` · go vet clean; go test ok for recurring and apidoc (`chubi_test_be3`).
- Spec: 409 `NOTHING_OWED` on confirmRecurringOccurrence and markRecurringOccurrencePaid (a จ่ายหนี้ occurrence, not edited, with nothing owed). The bulk endpoints (confirm-ready, mark-paid-ready, settle) document it as left_out `needs_amount`, plus how kind debt books.
- Bug found while checking: `mark-paid-ready` on a debt setting set the plain paid mark (no entry). Fixed: each due occurrence now books its entry without a transaction (savepoint each). `confirm-ready` lists a nothing-owed one as `needs_amount` (was `refused`). Test added.

## 2026-10-28 — S15 + S16 (for BE-1) and the auto-accept switches
DONE · migrations **094** (S15, in BE-1's block, BE-1's OK) and **113** (auto-accept); openapi.yaml; docs (api-document, schema, spec 13) · go vet clean; go test ok for personal_debts, transactions, users, notifications, shared, sync, apidoc, recurring (`chubi_test_be3`, which now also has 095, 102–105). projects: one failure, `TestMultiPayerPairs`. It's BE-2's new multi-payer test, and the spec has no `listProjectTransactions` yet, so it isn't mine. Every other projects test passes.

**S16, the one-way split mirror is retired:**
- personal_debts: removed createMirrorTx, splitToPartnerTx, AcceptSplitRequest, ApplySplitChange / applySplitChangeTx, notifySplitChangeTx, linkedPartnerTx, displayNameTx, mirrorExpenseTx, ErrNotSplitRequest / ErrNotSplitChange / ErrSplitChangeStale / ErrNotificationActioned, SplitChangeResult, and the 2 handlers.
- transactions: removed ErrPaidByLocked (409 PAID_BY_LOCKED), PaidBySourcePartner, the partner() branches, CreatePaidForTxInTx, SetPaidForAmountTx.
- projects: removed notifyRecordedTx / notifyChangedTx / suggestedUpdate.
- main.go: the 2 routes are gone. openapi: both paths removed (a REMOVED comment stays in their place), DebtSplitChangeResult removed, `PaidBy.source` enum is [me] only.
- Behaviour now: transaction `splits` / `paid_by` work as before. A linked contact just gets no copy and no split_created / split_changed notice. Deleting a split / paid_by debt doesn't notify. Changing a split's person relinks in place (same debt id; the old remove + add swap is gone).
- Tests (done by a helper agent, checked by me):
  - personal_debts: TestEditSplits / TestEditSplitsIdentity / TestEditSplitsIdentityUnlinkedContact / TestSplitsFollowTheirBill / TestSplitDirectionsByParentType trimmed to the splitter's own debts plus "the partner's book stays empty".
  - Deleted TestEditSplitsRemovePartner, TestEditSplitsBeforePartnerAdded, TestPartnerSplitMakesMyExpense.
  - TestPaidByLinkedPayer rewritten: no mirror, source me.
  - TestDisconnectPartnerCopy → TestDisconnectNotLinked.
  - projects: personal_copy_test.go deleted (suggestedUpdate only); TestSuggestedUpdateCarriesText deleted; TestRemoveBill adjusted; TestPullMovesLinkedSplitOffPartnersBook → TestPullMovesLinkedSplitToBoard.

**S15, migration 094 `wipe_split_mirrors` (down = no-op):** deletes
- the splitter rows of mirrored pairs (source_kind transaction / paid_by with a counterpart_debt_id), found first while the link still exists;
- the partner mirrors' wallet-less expenses, which cascades their rows;
- any partner row left;
- every split_created / split_changed notice (their actions are gone).
Kept: plain splits / paid-by debts with typed names or unlinked contacts, and pairs already disconnected (D9). The local DB has no mirrored pairs (7 plain split rows stay). On prod it removes whatever pairs exist; a paid_by expense whose debt goes keeps its paid_by_amount.

**Auto-accept (owner 2026-10-28):** `user_notification_settings.auto_accept_events` (default TRUE) / `auto_accept_debts` (default FALSE), migration 113. They're on GET/PUT /notifications/settings, GET/PUT /users/me, EventDetail and DebtPersonPage (through `shared.UserPrefs`, no extra query). `notifications.Delivery.AcceptEvents` / `AcceptDebts` are filled by the same single read, for BE-1's create path. `users.saveSettingsTx` now takes one map of switch columns (fixed list).

FE delta:
- App-2: the app still lists acceptDebtSplitRequest / applyDebtSplitChange in page_flows and calls `applySplit` (personal_debts_repository.dart:271). Those routes are gone, so the app must move off them (or Lead hands the cleanup to App-2).
- App-3: auto_accept fields as it proposed.

## 2026-10-28 — test + cleanup round (owner order), apply answer
DONE · go vet clean; go test ok for notifications, auth, personal_debts, recurring, users, apidoc (`chubi_test_be3`). projects: my new flow tests 2 pass + 1 fails on purpose (bug below).
**Tests**
- `recurring/debt_kind_test.go` TestDebtKindMoneyEndToEnd: lend Bee 900 from the wallet (wallet 1000 → 100, Bee owes 900). Three จ่ายหนี้ rounds of 300 bring it back (wallet 1000, Bee 0); the 4th → 409 NOTHING_OWED.
- `projects/flows_be3_test.go` (new file, written by a helper, checked by me):
  - TestFlowSharedSplitBill (900 / 300 each): create → auto-accept off (notice) / apply / auto-accept on (copy at once) → edit with auto-sync on (follows) / off (asks, "ไม่ตรง") → apply → disconnect → delete (Q-B5: B keeps plain records), plus a delete-while-connected variant. PASS.
  - TestFlowEventBillAutoAccept: PASS.
  - **TestFlowSplitBillEditBeforeAccept FAILS: a likely bug** (BE-1 told). B has auto-accept off and hasn't answered the new bill; A edits it; B's copy + debt are written at once by auto_sync, and B's accept notice is silently answered. Plan: a new bill becomes a copy only by auto-accept or "เพิ่มในสมุด". `shared_bill.go` ~:849–869 fanOutTx; event bills have the same gap. If Lead / owner says it's intended, flip the asserts at flows_be3_test.go:351-356.
- Left to BE-2 (they asked): complete / lock / event delete / multi-payer / settle / lumps.
**Apply answer (App-1 ask, BE-1's OK):** `EventBillApplyResult.bill: EventBillView | null` (apply + disconnect). Built in `bill_view.go` applyResult only; spec updated; a check added in TestBillFormCalls. That test currently fails conformance because MyBillCopy's in-progress multi-payer fields (`my_paid`, `paid_by_parts`) aren't in the spec yet (BE-1 told).
**Cleanup**
- notifications dead code after S16 removed: DispatchSplitCreated / DispatchSplitChanged / DispatchProjectTxRecorded, RefreshSplitCreatedTx, SupersedeSplitNoticesTx, the Split* / ProjectTxRecorded payloads. split_created / split_changed / project_tx_recorded_for_you also left the settings page list and the switch map. The Type* constants stay (rows / CHECK).
- P2 gap fixed: registration no longer writes `theme` / `language` (`auth/store.go`).
- Docs (helper audit of 092–113, checked): ref/schema.md now covers every migration 092–113 (093 projects.kind + shared_bill_opt_outs + private_note, 095, 101 lock trigger, 103 / 105 tables, 104, 111 / 112 columns and triggers, §02 preference keys). ref/api-document.md has the missing 0.4.1-2 bullets (BE-1 / BE-2 / BE-3 blocks).
- Open, noticed by the audit: the payers lock trigger in 105 doesn't fire on DELETE (BE-2 told). api-document's 0.4.0-3 block still says "income paid by another" = 400; left as history (Q-E3 changed it).
- 2026-10-28 follow-up: BE-1 fixed fanOutTx (an edit auto-syncs only members who hold the bill; one who never accepted gets a fresh asking notice). All 3 TestFlow* pass on `chubi_test_be3`.
