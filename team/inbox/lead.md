# Lead inbox — 0.4.0 decisions for the owner

Newest on top. The team logs non-breaking choices under "Decisions taken" in its own inbox; Lead confirms or overrides each one here so the owner can review them in one place (owner back 2026-10-18).

Format: `- [role] what · why · how to undo — Lead: OK / changed to …`

## Owner decisions this session (2026-10-17)
- Feature-widget audit: fixed in 0.4.0 via a ratchet + moving widgets during page reworks.
- Short text values in detail boxes: one row; long values fall back to stacked.
- UI library package name: parked.
- Artifact = layout only; looks come from the kit; where the mockup differs, reuse existing page patterns.
- Run to the end of M5 unattended; non-breaking choices decided by the team + Lead.
- Pending page: UI frozen in 0.4.0, logic in scope.
- New kit pieces: no per-piece hub review this round (Lead's option ข., taken as implied by "run to M5").

## Team decisions (confirmed / overridden by Lead)
- [fe-pages, M1] Debt refresh after any save uses a static "book changed" signal (`DebtBook`, same pattern as `TransactionsCubit.bookChanged`) instead of a shell callback · covers every opener (shell +, notification actions) · undo: delete debt_book.dart, pass `onDebtSaved` from the shell — Lead: OK.

- [be, M1] Lead: all 10 OK (details in ai/inbox/be.md M1 entry):
  1. credit wallet fields keep the existing `statement_date` / `payment_due_date` names (no rename)
  2. wallet `total` / `cash_total` / `card_debt` are aliases of net / assets / liabilities
  3. wallet month in / out = the wallet's cash from ALL members (shared wallet flow, matches "wallet balances stay cash")
  4. debt `days_outstanding` = oldest unpaid entry of the current cycle, in the user's stored timezone
  5. debt totals stay numbers + added `*_people` counts (no breaking reshape)
  6. a debt cycle ends where the running balance hits 0
  7. goal `month_plan` = auto-saving amount, else needed per month; `status` from the old pace
  8. auto-saving = one setting per goal / unallocated, one 🐷 draft per month on the day (31 = last day); old recurring ออม rules moved (migration 062)
  9. category numbers named `month_spent` / `month_count`
  10. BE tests use their own throwaway DB `chubi_test_040`
- [be, M2] Lead: 11 / 13 / 14 OK; 12 kept for now, owner question below.
  - 11. the budget per-period limit override stays a PUT route (no PATCH alias)
  - 12. event tags: owner + contributors write, VIEWERS read-only (viewers can't add bills either)
  - 13. event list "ยังไม่เคลียร์" counts active AND ended events where my รอรับ / รอจ่าย ≠ 0
  - 14. tx list `avg_daily_spend` / `daily` sit at the top of the list answer, not inside `totals`
- [fe-core, M1] Lead: OK, both.
  - Category detail stops using the loaded category list: the BE returns the parent path and checks duplicate names itself (field error).
  - The app sends the X-Timezone header on every call (one global interceptor), so "this month" numbers use the phone's timezone.
- [be, M3 + rule-6 review] Lead: all OK.
  - folded into page answers: the debt summary message → the person page; the wallet delete preview → `?include=delete_preview`
  - 15. a pending draft is "ready" only with nothing missing (no amount / category / wallet gaps); bulk confirm skips the rest
  - 16. pending sources grouped as ประจำ (recurring, upcoming, auto-save) / ใส่เอง (manual, chat) / คนอื่น (events, splits, partner) / สลิป
  - 17. "บันทึกรายการที่ฉันจ่ายเอง…" also lives on /users/me; the old notification-settings copy stays until FE-core switches (no break)
  - 18. the debt person page shows the current cycle; earlier cycles load on tap ("รอบก่อนหน้านี้ ›", as in the reference)
  - 19. a duplicate category name answers 422 with the field
  - 20. BE started Docker Desktop + the local DB only (not the app container) to run its tests after the restart
- [fe-core, M1 + rule 7] Lead: all OK.
  1. X-Timezone header from the device (new package `flutter_timezone`)
  2. refresh-on-show built once in PullToRefresh + a page-pop observer (sheets don't trigger it)
  3. categories hero shows only the type chip ("hidden from report" chip dropped, per the reference)
  4. รวมในรายงาน saves instantly in view mode (reverts + snackbar on failure)
  5. feature-visuals ratchet = a text heuristic, baseline 68 widgets in 35 files (may only shrink)
  6. one standard gap between detail sections
- [be, M4] Lead: all OK.
  - 21. a เตือนจ่าย with no amount is stored as 0 and shown as "no amount"
  - 22. old recurring rows: expense → ค่าสมาชิก (ผ่อนชำระ when it had an end count), income → รายรับ, transfer → เตือนจ่าย (transfer)
  - 23. calendar = `?month=` on the existing list, no new endpoint
  - 24. skip an occurrence / move its date / edit its amount use the existing routes
  - 25. the recurring picker uses a filter on the existing list; "current period" = the earliest open occurrence within one cycle of today
  - 26. "update the rule amount too" uses the existing recurring PUT
  - 27. new ออม recurring rules are rejected; old saving code goes in M5 cleanup

## Incidents
- 2026-10-17 06:11: Windows Update (TrustedInstaller, KB5127648 + driver updates) restarted the PC 3 times, which killed every session; the PC slept 08:14, and the owner woke it at 13:46. No work was lost (all of it was in the worktrees). New sessions: BE 98 · FE-core 31 · FE-pages 8c · Lead 2d. Prevention suggested to the owner: pause updates + `powercfg /change standby-timeout-ac 0` before overnight runs.

## Progress
- be M1 done (5 commits on feat/0.4.0-be, worktree chubi-pocket-be-040): 0.3.3 merged clean, wallets / debts / goals + auto-saving / categories numbers. Now on M2.
- be M2 done (11 commits): budget detail numbers + "why it counts", events numbers + list summary, tx list daily series. Now on M3.
- fe-pages M1 done (commit 1bcca3c): debt saved from the shell + refreshes the list and person page; the person page + presets the direction from the balance. Waiting on FE-core's kit + categories model page.
- [fe-pages, M2 wallets] Lead:
  - OVERRIDDEN: a shared wallet kept its สมาชิก tab next to the overview member strip → tab dropped (reference: tabs ภาพรวม / รายการ, members only in the strip; tap a member = actions sheet)
  - OK: the per-goal savings section stays on the wallet overview (different data from the split bar)
  - CHANGED: credit used % / available were computed in the app → BE now sends them per wallet
  - CHANGED: month เงินเข้า / เงินออก tiles only switched tabs → they filter the รายการ tab (tiles = filters)
  - OK: wallet card + member avatar stack moved into the kit; quick-create presets for debt direction and ชำระบัตร; wallet delete preview wired in M5
- [fe-core, M2 pending logic + M3 settings / notifications] Lead:
  - OK: pending "ใส่เอง" includes chat drafts; notification settings layout + names from the reference; theme mode keeps the existing chips (kit piece) instead of the mockup's segmented control; profile security sits in the settings slot
  - STOPGAP until BE lands: pending counts recounted in the app after a change; the inbox "ทั้งหมด" tile uses a cached total
  - OVERRIDDEN: hide / restore / read-all re-fetched the inbox → BE returns the updated summary in every write answer (rule: no re-fetch after a write); BE also adds `summary.all`, an awaits-answer filter, a settings-row summary on /users/me, and fixes openapi.yaml (it failed 2 app tests)
- [fe-core, M4 ผูกกับ + M5 archived hub] Lead: 14, 15, 17, 18, 19 OK; 16 CHANGED.
  - 14. tx detail: the separate recurring section is gone; the linked chip in ผูกกับ shows it
  - 15. quick create asks "อัปเดตยอดรายการประจำด้วยไหม?" in a dialog, because the sheet closes after save
  - 16. "น่าจะใช่" group was dropped (no BE flag) → BE adds a ranking flag, the group comes back
  - 17–19. archived hub: restore via one repository, tap a row = its detail, route under settings
  - Label: "แบ่งกับคน" in quick create + tx detail + the pending draft EDIT sheet (it IS the quick-create sheet, shared); only the pending batch-add layout keeps "แบ่งยอด" (pending UI frozen). Lead: OK as is.
  - BE follow-ups asked: summaries on pending POST / PUT and notification actions, archived can_restore + row text, the ranking flag, an unlink-from-recurring call

- [be ← fe-pages asks, recurring + events] Lead: approved 1–8, dropped 9. Recurring: per-month amount, upcoming items embedded in the detail answer (one call per page), the updated setting returned on occurrence writes (no re-fetch), a kind filter, a delete preview. Events: ?status=unsettled|ended for the tiles, the board payer filter (in the reference), a delete preview. Dropped: a "someone owes me" filter (same as unsettled).

- [fe-pages, M5] BUG FOUND + FIXED (branch): the wallet "เก็บถาวร" button called DELETE /accounts/:id, a HARD delete on the 0.3.3+ BE. Now archive = POST /accounts/:id/archive; ลบ = delete preview → confirm with BE numbers → DELETE. Lead checked main: AccountsRepository.archive() was the only bad call. Not live anywhere (prod runs the old BE; the local docker BE has not been rebuilt).

- [fe-pages, M2–M5 collected] Lead: all OK.
  - tx list: ONE "ตัวกรอง" chip opening the existing filter sheet (not the mockup's 3 chips; reuses an existing pattern)
  - wallet เงินเข้า / เงินออก tiles filter the embedded tx list
  - debt person page: a paged list page, hero tint follows รอรับ / รอจ่าย, no compact bar on scroll
  - events: "new event" opens the detail page in create mode (the old form + dashboard tabs are deleted); the ส่วนของฉัน tile filters my bills; status tiles use the BE status filter
  - budgets: ใช้ได้วันละ = the BE daily allowance; tapping a settings row opens edit mode
  - goals: a third list group "ยังไม่มีแผนรายเดือน"
  - recurring: detail + edit are one page (✏️ opens edit directly); the hero shows the BE monthly amount
  - contacts: the nickname switch is always enabled; a linked contact keeps an unlink row
  - not used: the recurring kind filter and the events "receivable" filter (BE built them; harmless)

## Merges (local main, not pushed)
- BE: feat/0.4.0-be fast-forwarded into main → 0f7465a (recurring + events asks 2d50b22, budgets pace + delete preview, M1–M5 + follow-ups: debts sort, credit fields, openapi fix, write-answer summaries, contacts asks, migrations 061–064). go vet + build clean; BE ran the whole suite green on its own DB. The real local DB still needs 061–064 when the owner orders a local rebuild.
- App main 3ca3539: FE-core fast-forwarded to 29719ee, then feat/0.4.0-fe-pages merged twice (no conflicts). After the fixes, the 9 failed files were re-run: 70/70 pass. 0.4.0 is GREEN locally. FINAL full run (16:2x): analyze clean · go vet clean · flutter test 1077 pass / 9 fail, all ratchets or hub pages, no page logic: FE-pages 5 (openPage, onRefresh ×2, flows ×2, baseline shrink), FE-core 4 hub pages (progress / recurring, one 10-min hang). Earlier mid-round run (e4ad5df): Lead full run: analyze clean · test 980 pass / 2 fail, both hub ratchets (page_flows: 3 new endpoints not in a flow → FE-core; api_spec: new BE endpoints lack x-used-by → BE). The [E] log lines in the run are expected error-path tests.

## Questions held for the owner
- ANSWERED 2026-10-17: YES, archive allowed with money inside; plus goals may have NO target (open-ended, e.g. saving for a child). Not built yet. — **Archive a saving goal that still holds money?** Today BE answers 409 (GOAL_HAS_SAVINGS): archive only when empty; the user closes the goal first (its money goes to ยังไม่จัดสรร or back to the wallets). Archiving with money inside would make that money drop out of every total. Lead's pick: keep the block, with a hint in the end zone "ปิดเป้าหมายก่อน".
- ANSWERED 2026-10-17: NO, viewers stay read-only (as built). — **Event tags: may a VIEWER edit them?** Owner said "every member". BE reads it as every member who can write (owner + contributors); viewers stay read-only, like for bills. One-line switch (`tagWriteGate`). Lead's pick: keep viewers read-only.

## 2026-10-31 15:30 — 0.4.2-3 released
DONE · tags `v0.4.2-3`: be `9f8f3ee` · app `f58f669` (build 220) · docs `b48c939` · prod migration 130, MIN = LATEST = 220 · analyze clean · flutter test 851 passed · go vet clean · go test 425 passed / 0 failed / 0 skipped (throwaway DB from the tag's migrations)
- Split phase A1 + A2, F1–F3 notification model, B2 (Idempotency-Key on every edit page), B3 (field errors, offline / slow / server-down), loading gaps, B 30–33, A merge, currency lock; details `team/releases/0.4.2-3.md`, `now/briefs/0.4.2-3-plan.md`.
- Deviations / notes:
  - 2 BE tests failed on 31 Oct = a real month-end bug (`AddDate` rolled 31 Oct + 1 month into 1 Dec in a card's next due date and a saving goal's ETA). Fixed in BE `9f8f3ee` with plain tests; the BE tag was moved from `982057f` to `9f8f3ee` before anything used it (force-pushed once).
  - `release.sh` offsite step failed on the old Happy-Host address in `ppforge-infra/backup/pull-to-dev.sh`; default fixed (ppforge-infra `33bd11f`, local, not pushed), release.sh re-run finished the offsite copy and wrote the entry.
  - Migrations 129 / 130 are irreversible; the pre-deploy dump is `chubi_pocket-20261031-1517.dump.gz`. Rehearsed on the 2026-10-31 snapshot first (books identical).
  - Housekeeping: merged branches / `wip/*` deleted (local + remote); kept app `refactor/pp-forge-decouple` and BE `origin/feat/split-transactions` (old history). Prod dump copy on the dev PC kept as a backup (owner).
  - Owner still to do: hub review (A0, Thai error texts, BusyLock fading) and the on-phone test list in the release note.
