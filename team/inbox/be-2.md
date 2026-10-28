# BE-2 inbox (0.4.1-1: recurring + events BE)

Owns: `recurring`, `projects`, the recurring hooks in `transactions` / `saving_goals`, migrations 090–099.
Items: R1–R9, R11, R12 (BE), B4, E6 (BE), E8 (BE "book bill" call).

## Shared-file notices
- 2026-10-27 — editing `internal/apidoc/openapi.yaml`: E8 book-bill endpoint + R5 paid-without-tx amount (recurring + projects sections only).
- 2026-10-27 — will edit `transactions/service.go` (R1: drop `also_update_link` for recurring; R2: drop `skip_occurrence`) and `transactions/debt_link.go` (R3: recurring skip hook in `DeleteDebtTxInTx`, the delete paths only). BE-1: ping me before reshaping those delete functions.
- 2026-10-27 — edited `cmd/api/main.go`: routes POST /event-bills + PUT /event-bills/:pt_id, `projectsService.WithDebts(personalDebtsService)` (E8).
- 2026-10-27 — edited `transactions/service.go` (recurring hook in deleteSingleInTx / deleteTransferInTx, TxEditedTx call gone, AllowZero check), `transactions/model.go` (CreateRequest.AllowZero), `transactions/recurring_link.go`, `shared/debts.go` (RecurringRef.PauseReason).

## 2026-10-27 — CONTRACT (spec only, code follows): E8 book-bill + recurring R1–R12
Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml` (+ `ref/api-document.md` §10 / §11 "Recent additions 2026-10-27"). Agreed with BE-1: `Effects` (BE-1's schema) on every answer below that writes a linked side; my debts / repayments go through BE-1's `personal_debts.CreateEntryTx` (D3 rows).

**App-1 (bill sheet + quick create อีเวนต์ tab) — E8:**
- `POST /event-bills` `{project_id | new_event {name, icon_code}, bill: EventBillInput, my_books: EventBillBooks}` → 201 `EventBillBookResult` (EventPatch + `my_books` + `paybacks` + `transaction_id` + `effects`).
- `PUT /event-bills/{pt_id}` `{bill?, my_books, apply_to_my_tx?}` → 200 same. `bill` absent = the "ลงบัญชี" books-only mode.
- `bill`: `kind` expense | income | payback, `amount`, `date`, `description`, `note`, `tag_ids` (event tags), `payer` (BillPerson, default me), `members` [BillMember + `paid_back`], `from` / `to` (payback).
- `my_books`: `on`, `tx`, `debt` (null on a payback = the server decides, E5), `account_id`, `category_id`, `tag_ids` (personal).
- `?preview=true` → `EventBillBookPreview {preview, people [PersonDelta], wallets [WalletDelta], debt_default}`: the sheet's before → after lines; drop the app-side `_netWith` / `_debtAlreadyBooked` math.
- E2–E5 handled by the server (see the operation description), so the app sends the ticks and the "คืนแล้ว" flags only.

**App-2 (recurring):**
- R2: `DELETE /transactions/{id}` always skips the slot (no question, no `skip_occurrence`).
- R1 / R6: no `also_update_link` on occurrence / item edits; no `also_update_tx` / `scope` / `tx_update` on the setting edit. A filled occurrence → 409 ALREADY_RECORDED on edit / skip (unlink first).
- R4: confirm / link / mark-paid on a skipped occurrence.
- R5: `POST …/occurrences/{slot}/mark-paid {amount?}` (400 AMOUNT_REQUIRED); bulk `mark_paid` with `items[].amount` (left_out needs_amount); mark-paid-ready leaves out needs_amount.
- R7: `Recurring.pause_reason` manual | overdue_limit | goal_inactive | null. ต้องจัดการ shows "ค้าง 3 งวด" for overdue_limit; the 3 due slots stay listed while it is paused.
- R8 / R9: resume = the current period's occurrence next, nothing for the gap.
- R12: auto-create takes any amount / wallet; the AUTO_CREATE_NEEDS_* errors are gone (the form shows the warning instead).

## 2026-10-27 — R1–R9, R11, R12 (BE), B4, E6 (BE), E8 (BE)
DONE · no commit · migration **090** (`recurring_rules.pause_reason` + `gaps`; clears `recurring_due_checks`) · test DB `chubi_test_be2` (at 090, incl. BE-1's 081–084)
**Tests (0 SKIP):** `go build ./...` ok, `go vet` clean on my packages; recurring, projects, saving_goals, shared/recurrence, apidoc all ok.

**Recurring (`recurring/*`, new `overdue.go`):**
- R1: `viewOccs` reads a filled slot from its tx / saving entry (`filledValues`). `TxEditedTx` and `syncLinkTx` are gone. Editing / skipping a filled slot → 409 ALREADY_RECORDED.
- R2: `TxDeletingTx(ctx, tx, txID)` always skips the slot, keeping the tx's last values + date (`keepTxValuesTx`).
- R3: the hook runs in `transactions.deleteSingleInTx` / `deleteTransferInTx`, so every delete path hits it. Saving entries: SQL in `saving_goals.deleteEntryTx`. Recurring's own `unlinkTx` lets go first.
- R4: confirm / link / mark-paid take skipped (and paid) slots.
- R5: mark-paid keeps an amount (`MarkPaidRequest`, bulk `items[].amount`, needs_amount).
- R6: `pushToRecorded`, `also_update_tx`, `scope` and `tx_update` are gone.
- R7: `overdueLimit` in DueCheck; any pause stores its due slots (`pauseTx`); paused settings list their stored due rows (`listable`, `activeOnly`); `pause_reason` on Recurring + RecurringRef; goal close sets `goal_inactive`.
- R8 / R9: `resumeGap` → `Spec.Gaps` (shared/recurrence filters `Occurrences` / `Between`; `MaxEnd` adds the gap time). A count end shifts, a date end keeps its date.
- R12: `autoDraftTx` drops a gone / archived wallet, category or tag; amount 0 via `transactions.CreateRequest.AllowZero` (BE-1's 084 relaxed the DB check). The archived-wallet auto-pause and `AUTO_CREATE_NEEDS_*` are gone.
- R11: recurring_test.go updated; new overdue_test.go (overdue limit, resume gap / installment shift, delete from any path).

**Events (`projects/`):**
- B4: `replaceSplitChildrenTx` updates split rows in place. A member who left the bill: their copy is unlinked (remembered on the bill) before the row goes.
- E8: new `book_bill.go` + `book_bill_handler.go`, routes `POST /event-bills` and `PUT /event-bills/:pt_id`, `?preview=true`. Debts / repayments go through `personal_debts.CreateEntryTx` (BE-1).
- E2–E5: handled inside E8.
- E6: a payer booking later becomes the bill's origin (`asOrigin`).
- Tests: book_bill_test.go (I paid + คืนแล้ว, someone else paid, me paid back, payback default + preview, books-only E6, B4 copy kept).

**Docs:** openapi (recurring + E8; RecurringRef.pause_reason for App-2), api-document §10 / §11, schema.md (`recurring_rules` 090 rows + auto_create; Lead bumps the version line), spec 10 §0 and spec 11 §0.

**FE contract delta:** as in the CONTRACT entry above, plus: `POST /event-bills` answers 201, or 200 with preview. `RecurringRef.pause_reason`. Mark-paid on a slot with no amount → 400 AMOUNT_REQUIRED.

**Open / not done:**
- (a) Recurring write answers don't carry `effects` yet (spec unchanged there), and the tx delete's `effects.slots` needs a recurring view hook for BE-1's DeleteResult. Say if you want it in this round.
- (b) E8 edit: un-ticking "คืนแล้ว" doesn't remove a payback row made earlier (delete it on the board). My debts don't follow a bill edit (0.4.1-2 auto sync).
- (c) `transactions.DeleteWrite` keeps its 5th (ignored) flag so BE-1's tests needn't change; drop it at close.
- (d) Old `/projects/:id/bills` / `my-books` / `copy` stay for the old app until App-1 moves to `/event-bills`.
- (e) My test DB is at 090: a new 085–089 from BE-1 needs it recreated (drop + migrate up).

## 2026-10-27 — B2 effects on recurring writes (Lead: this round)
DONE · no migration · tests: recurring, projects, saving_goals, apidoc ok (0 SKIP), `go vet` clean.
- Spec first: `effects` (required) on RecurringItemWriteResult / ItemsWriteResult / BulkResult / OccurrenceBulkResult / LinkResult / UnlinkResult / ItemDeleteResult / DeleteResult.
- Code: new `recurring/effects.go` (`effectsOf`, `SlotView`), filled in every write answer.
- Contents: slots = the occurrences changed; transactions = the ones they hold, or the one an unlink let go; removed_transaction_ids = the ones deleted; account_balances.
- `DELETE /transactions/:id` lists the skipped occurrence in `effects.slots` (`RecurringLinks.SlotView`; two lines in BE-1's DeleteWrite).
- Open item (a) of the entry above is closed. Kept as App-2 asked: `/projects/quick`, `/projects/{id}/bills`, `…/my-books` (nothing was removed).

## 2026-10-27 — close-out: un-tick "คืนแล้ว" (open b) + DeleteWrite flag (open c)
DONE · migration **091** (`project_transactions.paid_back_for_id` + partial index) · tests (`chubi_test_be2` at 091, 0 SKIP): projects, recurring, personal_debts, transactions, apidoc ok; `go vet` clean.

**(b) Un-tick "คืนแล้ว":**
- A payback row made for a ticked member remembers its bill. My E2 repayment now hangs on that payback row, not on the bill.
- On `PUT /event-bills/:pt_id` with `bill`, the members' `paid_back` ticks are the wanted state:
  - newly ticked → a row (+ my repayment when I paid and record the debts);
  - un-ticked or gone → `removePayback`: my repayment rows of it and their wallet txs, then the row (`deleteBoardRowTx`), all in the same DB tx;
  - share changed → remade.
- Effects: `removed_bill_ids` / `removed_debt_ids` / `removed_transaction_ids`. A second save no longer duplicates the row.
- `BoardSplit.paid_back` (spec + views; read in the existing board query, so the event detail stays at 9 queries).
- Test: `TestRebookBillUntickPaidBack` (un-tick removes row + repayment + its wallet tx; re-tick once; share change remakes at 120).
- Known: my bill DEBT for that person doesn't follow a share change (0.4.1-2 auto sync), so after a share change the person shows the difference.

**(c):** `transactions.DeleteWrite(ctx, userID, id, alsoDeleteLink)`, 4 args. Updated the handler and the callers in personal_debts tests (handler_test, paid_by_test, repayment_test, split_follow_test) and projects/touch_test.

**Docs:** openapi (BoardSplit.paid_back, rebookEventBill), api-document §10, schema.md (`paid_back_for_id`), spec 10 §0.
**For App-2 (E8 app):** send each member's `paid_back` on PUT as the tick should be now (prefill it from `BoardSplit.paid_back`). Sending false removes the payback row made earlier.

## 2026-10-27 — 0.4.1-2 BE-2 (events) — progress 1: V5 table + helpers, V4 / X5, V1 / V2 (in progress, not DONE)
Migrations **100** (`personal_debt_bills`, backfill) · **101** (`projects.completed_at` + trigger `project_transactions_locked`, `project_members.removed_at`). Test DB `chubi_test_be2` at 110 (092, 093, 110 from the others applied).
- **V5 (agreed with BE-1):** `personal_debt_bills(debt_id, user_id, pt_id, member_id, transaction_id, amount)`, UNIQUE(user_id, pt_id, member_id) = X7 at DB level. Only kind=debt; paybacks keep `source_project_transaction_id` (091). During 0.4.1-2 per-bill debts keep `source_project_transaction_id` set too (dropped later by me). Helpers `personal_debts/bill_parts.go` (BillPartTx, BillPartsOfBillTx / OfDebtTx, LinkBillPartTx, SetBillPartAmountTx, SetBillPartTransactionTx, UnlinkBillPartTx; debt.amount = Σ parts, own tx synced; 0 parts → plain debt). `EntryInput.MemberID / BillTransactionID` → CreateEntryTx writes the part. my-books unlink of debts deletes the parts; tx-detail disconnect clears the part's tx.
- **V4 / X5:** budgets `ev` CTE skips a bill when my tx was unlinked from it (`transactions.unlinked_project_transaction_id`); tx-detail disconnect now sets that column. Test `TestBudgetUnlinkedBillCountsOnce` (logic ok).
- **V1 / V2:** `POST /projects/{id}/complete` (`completeProject`); `writable`: create_pt / edit_pt / member_crud / new `mark` → `ErrEventCompleted` (409 EVENT_COMPLETED) on completed; `resolve` (my books) still allowed (one-time copy). PUT rules (`completedUpdate`), DELETE refused, restore → completed. Notices `event_completed` (new file `notifications/event_notices.go`, told BE-3). Pending project_tx_* notices superseded. Test `TestEventComplete` (logic ok).
- Spec: Event.completed_at / can_complete (required), completeProject, DebtEntry.bills[] / DebtBillPart (not required yet), restore / PUT / DELETE descriptions. Docs: schema.md, api-document §10, spec 10 §0.
- **Conformance noise not mine:** EventRef.kind (BE-1) and Event.auto_sync_events (BE-3) are required in the spec before their code fills them → budgets / projects conform checks fail until then.
- **Gotcha:** `git stash` in this shared tree stashes everyone's work — never use it (I did once, popped back clean).
- Next: V15 (remove → removed_at + event_member_removed; leave = disconnect), V13 (event branch of DELETE /event-bills), V9 / X7, V11, V6, V12, V8 / V14, V16.

## 2026-10-27 — 0.4.1-2 BE-2 — progress 2 (not DONE)
Migrations now **100–102** (102 = `project_transactions.payback_kind` payback | loan, V11). Test DB `chubi_test_be2` at 111 (+ 092 / 093 / 110 / 111 from others).
- **V15:** remove = `removed_at` + spot stays as empty person (`MemberRef.removed`, `EventMember.removed_at`, `Event.empty_person_bill_count`), the removed user's book disconnected (`member_leave.go` `disconnectBookTx`) + `event_member_removed`; leave = book disconnected, no notice. `POST /projects/{id}/members/{member_id}/assign` (`assignRemovedMember`). Test `TestRemoveMemberEmptySpotAndAssign`.
- **V13:** `deleteEventBillTx` (`bill_delete.go`) for BE-1's `DELETE /event-bills/{pt_id}` event branch: per member auto_sync_events on → `dropCopyTx`, off → plain + `shared_bill_deleted` (applied false, ids); paybacks made for the bill deleted; bill row deleted. Not wired / tested yet on my side (BE-1 calls it).
- **V6 / V9 / V11 / X7:** `GET /projects/{id}/claimable` + `POST /projects/{id}/claim` (`claim.go`): lump of one direction = one debt + parts + "จ่ายโดย X" copies; debt-type bills by `payback_kind` (repayment / debt row); `link_transaction_id` for one bill. `DebtEntry.bills[]` filled (`personal_debts/store.go loadBillParts`, amount-based in_sync). Board `my_books.debt` sees parts; settle's event-level debts ignore lumps. Test `TestClaimBills`.
- **V14:** income bills in settle pairs, `Event.my_net`, summary positions (receiver owes each split). Test `TestIncomeBillInSettle`.
- Tests green: projects (my tests), personal_debts (whole pkg), budgets X5 test, apidoc.
- Next: V12 (settle after completion: simplified + "ลงในสมุดฉัน" one-time set, migration 103 for the per-member booking), V8 (retire `{event_id}` debts), V16 (old endpoints, last), docs for V11–V15 + claim.

## 2026-10-27 — 0.4.1-2 BE-2 (events) — DONE except V16 (waits on App-2 SA15)
**Items done:** V1, V2, V4 (X5), V5, V6, V8, V9 (X7), V11, V12, V13 (X6), V14, V15. **Open:** V16 (retire `/projects/{id}/bills`, `…/my-books`, `…/copy`, `/projects/quick`, `bill_people.go` — after App-1 / App-2 stop calling them) and dropping `personal_debts.source_project_transaction_id` for kind=debt (kept during the round; readers moved to `personal_debt_bills` where I touched them).
**Migrations (100–104):** 100 `personal_debt_bills` (+ backfill) · 101 `projects.completed_at` + trigger `project_transactions_locked` + `project_members.removed_at` · 102 `project_transactions.payback_kind` · 103 `event_settle_bookings` · 104 deletes the retired `{event_id}` line debts (**data wipe**, pre-release; ones with their own wallet tx become plain). All breaking for the current app build (forced update).
**Tests** (`chubi_test_be2` at 112, 0 SKIP): projects (mine: TestEventComplete, TestRemoveMemberEmptySpotAndAssign, TestClaimBills, TestBookSimplifiedSettle, TestIncomeBillInSettle, TestDeleteEventBillBySwitch, TestEventArchiveRestore — ok; **2 failures are BE-1's S9 guard**: TestLinkModeEventSwitches, TestEventsAPI:293, told BE-1), personal_debts, budgets, notifications, pending, shared, apidoc ok; `go vet` clean on those.
**Files:** new `projects/{complete,claim,settle_book,member_leave,member_assign,bill_delete}.go` (+ tests), `personal_debts/bill_parts.go`, `notifications/event_notices.go`; edits in `projects/{settle,store,service,views,handler,model,pt_store,pt_service,detach,my_books}.go`, `personal_debts/{book,store,model,service,handler}.go`, `budgets/count.go`, `pending/service.go`, `shared/{refs,members}.go`, `cmd/api/main.go`, openapi.

### FE contract delta (forward-ready)
- **Complete:** `POST /projects/{id}/complete` (`completeProject`) → EventPatch + effects; 403 FORBIDDEN_ROLE, 409 PROJECT_NOT_ACTIVE / EVENT_HAS_EMPTY_PERSON {bill_ids}. `Event.completed_at`, `can_complete`, `empty_person_bill_count`. Completed: every write 409 EVENT_COMPLETED except my `tag_ids` + archive; restore → completed; PUT status completed → 400 USE_COMPLETE_ENDPOINT; DELETE refused. Notice `event_completed`.
- **Members:** `MemberRef.removed`, `EventMember.removed_at`; `POST /projects/{id}/members/{member_id}/assign` (`assignRemovedMember`) {to: BillPerson, bill_ids?}; 409 MEMBER_NOT_REMOVED. Remove → notice `event_member_removed`; remove / leave disconnect that user's book.
- **Claims:** `GET /projects/{id}/claimable[?member_id|contact_id|person_name]` (`listClaimableBills`), `POST /projects/{id}/claim` (`claimBills`) {member_id, bill_ids, create_copies?, link_transaction_id?, description?, note?, due_date?, preview?} → {debts, effects, bills}; 400 CLAIM_MIXED_DIRECTION / NOT_IN_BILL, 409 BILL_ALREADY_BOOKED / SETTLE_BOOKED. `DebtEntry.bills[]` (`DebtBillPart`).
- **Debt-type bill:** `payback_kind` payback | loan on BoardRow, EventBillInput (BE-1 writes it), ClaimableBill.
- **Settle:** income bills count (receiver owes each split; also `my_net` + positions). `EventSettle.simplified_available`, `my_settle_booking`; `POST /projects/{id}/settle/book` (`bookEventSettle`) {lines: [{member_id, account_id?, category_id?, link_transaction_id?}], preview?}; 409 EVENT_NOT_COMPLETED / SETTLE_BOOKED, 400 SETTLE_LINES. `SettleLine.recorded` = claimed / booked.
- **Retired:** `bill_id` / `event_id` on person-book entries + repayments → 400 USE_CLAIM.
- **Delete bill:** event branch of BE-1's `DELETE /event-bills/{pt_id}` (per member's auto_sync_events; `shared_bill_deleted` applied true/false).

### Gotchas / decisions to confirm (defaults built)
- A lump covers ONE direction; debt-type bills never join a lump (a row each).
- Settle money lines are plain txs (no project link; the DB forbids project_id without a bill source); the category is the user's pick (system categories refused), so a "pay C 300" line counted as an expense would show in reports — the app should suggest a non-report category.
- "Off" side of a bill delete keeps a lump's amount (part removed without shrinking) until the user applies.
- Event-level budget rule X5 also covers a tx-detail disconnect (now sets `transactions.unlinked_project_transaction_id`).
- Never use `git stash` in the shared tree.

## 2026-10-28 — 0.4.1-2 BE-2 — V16 + multi-payer (my part) + event delete keeps bills — DONE
Migration **105** (`project_transaction_payers` + lock trigger + view `project_bill_pairs`). Test DB `chubi_test_be2` rebuilt from all migrations, at 113.
- **V16:** routes + handlers + spec ops/schemas removed: `POST /projects/quick`, `POST /projects/{id}/bills`, `DELETE /projects/{id}/bills/{tx}`, `POST …/copy`, `PUT …/my-books` (QuickCreateEvent*, AddBills*, EventCopyResult, MyBooks* schemas). The app had no callers (App-1 / App-2 confirmed; grep clean). **Left on purpose:** the service methods (`QuickCreate`, `AddBills`, `RemoveBill`, `CopyToPersonal`, `SetMyBooks`) — ~45 service-level tests use them and they share helpers with pending drafts (`AddNewBillTx` → `pullBillsTx`) and the tx event link; old HTTP tests reach them through test-only `legacy_routes_test.go`. Cut them with the migration squash.
- **Multi-payer (mine):** payers table (rows only for 2+ payers; `transaction_member_id` = the biggest), view = proportional real pairs (share_m × paid_p / bill). Settle pairs, claimable / claim (netted per bill + person; copies = my share), `Event.my_net` / `my_paid`, summary positions read it. `BoardRow.payers` + `ClaimableBill.payers` (required, from the board query, no extra query). Go helpers `BillPairsTx`, `BillPayersTx`, `SetBillPayersTx`, `billPayersOf` for BE-1. Spec: `EventBillInput.payers` (BillPayerInput), `BillPayer`. **BE-1 owns** the input handling (book / rebook / preview, PAYERS_SUM), copy roles (tx = max(paid, share)), MyBillCopy.my_paid / paid_by, paid_back per payer. Test `TestMultiPayerPairs` (owner's 123 example + a 2-payer / 2-share bill).
- **Event delete (owner 2026-10-28):** `DELETE /projects/{id}` (active or completed) moves every bill / payback to a standalone split bill via BE-1's `billToSplitTx` (completed_at cleared first so the lock lets them move), deletes the event, `event_deleted` to the other linked members (`notifications/event_notices.go`, type in BE-1's 095). Answer `EventDeleteResult {id, split_bill_count, effects}`; `delete_linked_txs` retired. Test `TestDeleteEventWithLinkedTxs` rewritten; `TestEventComplete` now deletes the completed event.
- **Tests** (0 SKIP): projects — all mine pass; **2 failures are BE-1's in progress** (TestBillFormCalls: MyBillCopy / EventBillView spec mismatch; TestEventBillPersonalSplits: their ShareAmountExpr change) — told BE-1. apidoc, notifications, pending, personal_debts, budgets ok. `go vet` clean on projects / notifications.

### FE contract delta
- `EventBillInput.payers: [{me|member_id|contact_id|person_name, amount}]` (Σ = amount; with `payer` → 400). `BoardRow.payers`, `ClaimableBill.payers`: `[{member: MemberRef, amount}]`, biggest first. Settle / claimable amounts are the proportional pairs.
- `DELETE /projects/{id}` → `{id, split_bill_count, effects}`; no `delete_linked_txs`; completed events deletable; notice `event_deleted` {project_id, project_name, split_bill_count}.
- Removed operationIds: quickCreateEvent, addBillsToEvent, removeBillFromProject, copyProjectTransactionToPersonal, setProjectTransactionMyBooks.

## 2026-10-28 — 0.4.1-2 BE-2 — test round + cleanup — DONE
- **New DB tests** (projects): `TestMultiPayerSettleProportional` (1,200: ลี 700 + ปอนด์ 500, 4 × 300 → A owes ลี 175 / ปอนด์ 125, B the same, ปอนด์ owes ลี 50; A my_net −300), `TestMultiPayerLumpThenDeleteEvent` (lump with ลี across two multi-payer bills = 375, copies = my share 300 each, double claim 409; complete → delete: both bills become split bills, payers rows kept, lump parts + copies still connected, amount 375). Earlier: `TestMultiPayerPairs` (123: 110 + 13), complete / remove + assign / claims / settle booking / income / bill delete by switch / X5. Told BE-3 which flows I cover.
- **Bug found by the new test, fixed by BE-1:** `bill_move.go` didn't re-map `personal_debt_bills.member_id` → an event delete cascaded the old members and dropped every lump part (a plain move left parts on the old member).
- **Cleanup:** docs — schema.md (105 table + view), api-document §10 (multi-payer, delete, V16; the old quick / bills section and the archive table marked removed / superseded), spec 10 §0 + old delete / pull lines marked superseded. Dead code: V16 handlers / routes / spec ops / schemas gone; the service entry points stay (pending + tests, see the V16 entry). `go vet` clean on projects, personal_debts, notifications, budgets, shared, cmd.
- **Tests** (`chubi_test_be2` at 113, 0 SKIP): apidoc, personal_debts, pending, budgets, notifications ok; projects: all mine ok, **1 failure = BE-3's new `TestFlowSplitBillEditBeforeAccept`** (an edit writes B's copy / debt before B accepted — BE-1's fan-out vs auto-accept).
- **Follow-up (BE-3 audit):** migration 105's payers lock trigger now fires on DELETE too (was INSERT / UPDATE only); 105 is unshipped, edited in place — re-create the trigger on test DBs that already ran 105. Tests still green.
