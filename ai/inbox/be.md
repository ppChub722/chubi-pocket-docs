## 2026-10-17 — FE-pages recurring + events asks (Lead approved 1-8)
DONE · commit on feat/0.4.0-be · recurring: `monthly_amount` on the setting; `GET /recurring/:id` embeds `upcoming` (first page) and `?include=delete_preview` → {items, linked_transactions, pending_drafts}; item writes (create-now, update/batch, archive/restore, delete, link, unlink) carry `setting` (the owning setting after the write; null when several); `GET /recurring?kind=` · events: `GET /projects?status=unsettled|receivable|ended` (derived, never archived; receivable = someone owes me, a subset of unsettled, cheap so kept) · board `payer_member_id` filter · `GET /projects/:id/detail?include=delete_preview` → {bills, members, linked_tx_count} · recurring / projects / apidoc tests ok.

## 2026-10-17 — FE-core M4/M5 follow-ups
DONE · commit c80c5d1 on feat/0.4.0-be · pending POST answer {data, summary}, PUT answer = draft + `summary` · accounts invite accept/reject + contacts link-request answers carry the notification `summary` (project link-request answers return the event, unchanged) · GET /me/archived items: `can_restore` (wallets and events: owner only) + `secondary {kind: balance|limit|target|planned|amount, amount}` (null for contacts) · GET /recurring picker hints `category_id` / `amount` (with for_type) give `likely: true` (same category, or amount within 5 pct), likely rows first · `POST /recurring-items/:id/unlink` returns {item}, open again · pending / recurring / accounts / contacts / me / notifications / apidoc tests ok.

## 2026-10-17 — FE-core M4/M5 follow-ups
DONE · pending POST answer {data, summary}, PUT answer = draft + `summary` · accounts invite accept/reject + contacts link-request answers carry notification `summary` (project link-request answers return the event, unchanged) · GET /me/archived items: `can_restore` (wallets/events owner only) + `secondary {kind: balance|limit|target|planned|amount, amount}` (null for contacts) · GET /recurring picker hints `category_id` / `amount` (with for_type) → `likely: true` (same category or amount ±5## 2026-10-17 — goals asks (FE-pages)
DONE · summary.month_plan_total / month_saved_total · history[].plan (cumulative plan line = min(target, k × goal month_plan); null without plan / on the spare) · `GET /saving-goals?sort=created|deadline|progress|remaining|name` (400 otherwise) · `GET /saving-goals/:id?include=delete_preview` → {entries, saved_amount, can_delete} · month_short is null when the goal has no plan (0 when the plan is met) · split `wallet_id: null` = the part in no wallet · saving_goals + apidoc tests ok.

## 2026-10-17 — budgets: pace_pct on list rows + delete_preview (FE-pages)
DONE · `period.pace_pct` on every period (list rows included; null for open-ended / non-current) · `GET /budgets/:id?include=delete_preview` → `delete_preview {periods, overridden_periods, categories, wallets}` (null otherwise; transactions are never touched) · budgets/apidoc/dashboard/me tests ok · commit on feat/0.4.0-be. Noted: the detail tile uses `forecast.daily_allowance`.

## 2026-10-17 — page-ready follow-ups: summaries on writes, notification filter, contacts (FE-core / FE-pages / Lead)
DONE · BE commits df0ba85 + next on feat/0.4.0-be · own tests green (notifications, pending, users, recurring, contacts, personal_debts, apidoc); strict Dart YAML parse OK.

**Contract (all additive unless noted):**
- Pending `submit` / `submit-ready` / `{id}/submit` / `discard` / `DELETE {id}` answers carry `summary` (same PendingSummary as the list, computed after the write).
- Notifications `read` / `actioned` / `dismiss` / `restore` / `read-all` / `DELETE` answers carry `summary` {all, needs_answer, unread, dismissed}; `GET /notifications` summary gained `all` (= not dismissed); new filter `?awaits_answer=true` (exactly the rows `summary.needs_answer` counts).
- `GET /users/me` → `notification_summary {on, auto}` (on = mutable types not muted, auto = types running automatically).
- BREAKING (pre-release): `/notifications/settings` no longer has `auto_resolve_own_in_projects` (use `/users/me` `auto_copy_own_event_bills`).
- `recurring_ending` payload now `{recurring_id, name, left, start_date, end {kind, date?, count?}}` (for ต่ออีก); `POST /recurring/:id/extend` now marks that notice actioned.
- Contacts: `linked_user.username`; contact detail always has `unlinked_total {names, records}`; `?include=delete_preview` → `delete_preview {debt_records, event_members, linked}` (null otherwise). Comma list works with `unlinked_names`.

**x-used-by note for Lead:** the app ratchet ignores the spec's `x-used-by` (it takes usage from `page_flows.dart`), so adding it in the yaml does nothing. The 13 operations it flags need entries in the FE's page_flows.dart: deleteAccount, setGoalAutoSave, clearGoalAutoSave, setSpareAutoSave, clearSpareAutoSave, getMyArchived, restoreNotification, submitReadyPending, submitOnePending, archiveProject, restoreProject, linkRecurringItem, duplicateRecurring.

**Decisions taken:** #30 notification summary counts hidden rows only in `dismissed`; #31 delete_preview counts personal_debts + project_members rows (records keep the name as text); #32 `notification_summary.on` counts only mutable types.

## 2026-10-17 — debts people list `sort` (FE-pages request)
DONE · `GET /personal-debts/people?sort=oldest|amount|recent` (default oldest: days_outstanding desc, none last, then |net| desc; amount: |net| desc; recent: last activity desc; 400 on other values) · totals / `*_people` counts cover ALL people (they ignore q / side / all / paging, as assumed) · test `TestPeopleSort`, personal_debts + apidoc ok · spec 12 · commit on feat/0.4.0-be.

## 2026-10-17 — 0.4.0 M5 close (BE, feat/0.4.0-be)
DONE M5 · `go vet ./...` clean and `go test -count=1 ./...` green on my own DB `chubi_test_040` (migrations 001–064; all 24 test packages ok, 0 failures) · docs: api-document "Delete / archive / restore matrix", specs 02 / 03 / 04 / 05 / 08 / 09 / 10 / 11 / 12 / 13 updated per milestone. Branch `feat/0.4.0-be` in `../chubi-pocket-be-040`, not merged / pushed / tagged. Apply migrations 062, 063, 064 (and 061 from 0.3.3) on the real local DB when you rebuild docker from the merge.

**Delete / archive audit (the matrix is in api-document):** every entity with an archive state has archive + restore + delete routes with the final state in the answer. One gap found and closed: **events** had `status: archived` (PUT only) but no routes → added `POST /projects/:id/archive` and `/restore` (owner; restore = active; same answer as PUT, the EventPatch). Not changed, for Lead / the owner to rule on:
- **Saving goals:** archive is refused while the goal holds money (409 GOAL_HAS_SAVINGS) and delete only when empty. The rule "archive = hide, always allowed" would let an archived goal keep counting its money; today the app must close the goal (ปิดเป้าหมาย) first. Left as built in 0.3.1-10.
- **Event restore** always returns to `active` (the previous status is not kept).
- Categories / tags / transactions / debt entries / pending drafts are delete-only by design.

**FE contract delta** (additive): `POST /projects/:id/archive` and `/restore` → EventPatch (FE-pages: the event end zone).

**Decisions taken**
28. Event restore = active (no previous-status memory) · no column for it · add `status_before_archive` later.
29. I ran the whole BE suite once at the end on my own DB (not only changed packages) because nearly every package changed; the Docker engine + `chubi_pocket_db` were started by me after the overnight stop.

**State for Lead:** all BE work of the 0.4.0 brief is done (M1–M5). Commits on `feat/0.4.0-be` (oldest first): merge of 0.3.3 → wallets → debts → goals + auto-saving (062) → categories → budgets → events → transactions list → pending → M3 bundle (063) → recurring (064) → events archive routes.
## 2026-10-17 — 0.4.0 M4 recurring (BE, feat/0.4.0-be)
DONE M4 · migration 064 (`kind`, `trial_until`, amount ≥ 0, type check without saving; old rows migrated) · tests (changed packages, `chubi_test_040`): recurring, pending, dashboard, budgets, transactions, apidoc ok · docs: spec 11, api-document. Two M3 regressions found by this run and fixed: `needs_input` was null on the update answer; the dashboard attention test used `project_invite` as "plain info" (it now awaits an answer).

**FE contract delta (forward-ready)**
- **Kinds (→ FE-pages)** `POST /recurring` takes `kind: subscription | installment | income | reminder` (+ `trial_until` for a subscription); `type` is optional (the kind implies it; reminder may be `transfer`); `amount` is optional ONLY for a reminder (0 / absent). An installment needs `end {kind: count, count}`. `PUT /recurring/:id` takes `kind`, `trial_until` ("" clears). Every setting: `kind`, `trial_until`, `yearly_cost`, `saved_count`, `pending_count`, `next_date`, `next_amount`, `current_occurrence`. `amount` (setting + item) and `summary.next.amount` are now **nullable** (null = a reminder with no amount). The `saving` type is gone (goal auto-saving replaces it).
- **Reminder drafts** (→ FE-core pending) the draft made on the day has no amount: `needs_input: [amount…]`, `can_confirm: false`, confirm answers `MISSING_AMOUNT` until it has one.
- **Summaries (→ FE-pages)** `GET /recurring` `summary` + `due_30d_total`, `awaiting_amount_count`, `by_kind {subscription, installment, income, reminder: {count, monthly, yearly}}`.
- **Calendar (→ FE-pages)** `GET /recurring-items?month=YYYY-MM` (items of the month, every status, oldest first, `per_page` 100). **Occurrence edits:** `PUT /recurring-items/:id {date, amount}` (one occurrence); skip = `POST /recurring-items/:id/archive`. **Duplicate:** `POST /recurring/:id/duplicate` → 201 with the copy's page.
- **Picker / link (→ FE-core quick create + tx detail)** `GET /recurring?for_type=expense|income|transfer` = active settings a transaction of that type can link to, each with `current_occurrence {item_id, date, days_until, amount|null, status}`. `POST /recurring-items/:id/link {transaction_id}` → `{item, transaction, amount_differs, rule_amount, transaction_amount, account_balances}`; on `amount_differs` ask "อัปเดตยอดรายการประจำด้วยไหม?" and on yes `PUT /recurring/:id {amount}` (no separate amount route). Linking a reminder sets that period's real amount and leaves the setting without one. 409 `ITEM_ALREADY_LINKED` (done / skipped / tx already linked), 400 type mismatch.

**Decisions taken**
21. "No amount" on a reminder is stored as 0 (column `amount NUMERIC NOT NULL CHECK (amount >= 0)`) and shown as null · avoids a nullable column through the generator · switch to NULL later.
22. Old rows: expense → subscription (installment when it had an end count), income → income, transfer → reminder · the brief's "migrate old rows" · easy to re-map by SQL.
23. Calendar = `?month=` on the existing items list (not a new endpoint) · ground rule 6 · a dedicated route later if grouping by day is wanted.
24. Skip an occurrence = the existing archive action; move / edit-amount = the existing item PUT · already there · documented.
25. Picker = `for_type` filter + `current_occurrence` on the existing list; "current period" = the earliest not-done, not-skipped occurrence within one cycle of today (daily 1 day, weekly 7, monthly 31, yearly 366 × interval) · defines "current period" · change `windowDays`.
26. Updating the setting's amount after a link = the existing `PUT /recurring/:id` (scope upcoming) · rule 1 · a dedicated route only if FE needs one.
27. Creating a `saving` recurring is rejected now (400); the old saving code paths stay only for existing items' saving_entry links · removal is M5 cleanup.

## 2026-10-17 — 0.4.0 M3 + ground rule 6 review (BE, feat/0.4.0-be)
DONE M3 · migration 063 (data fix: old event deep links) · tests (changed packages, `chubi_test_040`): pending, notifications, users, me, accounts, categories, personal_debts, apidoc ok · docs: spec 02 / 03 / 05 / 12 / 13, api-document.

**FE contract delta (forward-ready)**
- **Pending (→ FE-core)** each draft: `needs_input: [amount|type|date|wallet|wallet_to|category]` (empty = ready) and `can_confirm` (false while a hard key — amount, type, date, a transfer's wallets — is missing: confirm answers it in `failed[]`, the draft stays). `GET /pending-transactions` + `summary {count, expense_total, income_total, needs_input_count, ready_count, by_source {recurring, manual, other_people, slip, other}}`. New actions: `POST /pending-transactions/submit-ready` (confirms every draft with empty needs_input) and `POST /pending-transactions/:id/submit`; both answer like `submit`.
- **Notifications (→ FE-core)** `GET /notifications` + `summary {needs_answer, unread, dismissed}` (over all, not narrowed by the filter). `awaits_answer` now true for `project_invite` (accept / reject: `POST /projects/link-requests/:id/accept|reject`, deep link already that route) and `recurring_ending` (ต่ออีก = `POST /recurring/:id/extend`; ปล่อยให้จบ = mark actioned). `recurring_due` deep-links `/pending`. Event-bill notifications deep-link `/projects/:id` (the app has no per-bill route). Settings: `split_paid` / `split_received` not settable; `recurring_due` / `recurring_ending` mutable (already).
- **/users/me (→ FE-core)** `default_account` (AccountRef | null) + `auto_copy_own_event_bills`; `PUT` takes `default_account_id` (uuid | null | absent) and `auto_copy_own_event_bills`. The old `auto_resolve_own_in_projects` is still accepted / returned by `/notifications/settings` (same stored value) until FE-core confirms the move.
- **Archived hub (→ FE-core)** `GET /me/archived` → `{total, wallets, budgets, goals, events, contacts, recurring}` each `{count, items[{id, name, icon_code, archived_at}]}`; `GET /me/counts` `counts.archived` = total.
- **Categories (→ FE-core)** `GET /categories/:id` `path` = ancestors root→parent each `{id, name, icon_code}` (list rows too); a duplicate sibling name on create / update / move = **422 `CATEGORY_NAME_DUPLICATE`**, `details: {field: "name"}` (was 400 DUPLICATE_NAME).
- **Wallets (→ FE-pages)** `totals` + `cash_split [{type, pct}]` (bank, cash, e_wallet order, only types that have wallets; 0 each when cash_total ≤ 0) and `card_remaining` (limits − card_debt, ≥ 0). Delete confirm: `GET /accounts/:id?include=delete_preview`.

**Ground rule 6 review — folded**
- Debt person page: `GET /personal-debts/people/:key` now carries `summary_message {text, entries, net}` and its `items` default to the CURRENT cycle (`?cycle=earlier|all` and `/entries` page the rest). The `…/summary-message` route is gone.
- Wallet delete preview: now `delete_preview` in `GET /accounts/:id?include=delete_preview`; the `/accounts/:id/delete-preview` route is gone.
- Kept as separate routes: actions (`submit-ready`, `:id/submit`, auto-save PUT/DELETE, archive / restore / delete) and the paged "load more" (`/entries`, `/periods`, `/items`); `GET /me/archived` is a page with no existing answer to extend (its count rides on `/me/counts`).
- Already inline: wallets / debts / goals / categories / budgets / events / transactions / recurring numbers and summaries.

**Decisions taken**
15. Pending `ready` = no `needs_input` key at all (soft keys wallet / category count): submit-ready skips a draft without category or wallet · the owner's "needs_input (no amount / category / wallet)" · treat soft keys as ready by filtering on `can_confirm` instead.
16. Pending `by_source`: recurring = recurring / upcoming / auto_save, manual = manual / chat, other_people = project_update / project_copy / split / partner, slip = ocr / slip, rest = other · maps today's free-text sources.
17. `auto_resolve_own_in_projects` stays in notification settings next to the new `/users/me` field (one stored value) · removing it breaks the current app · drop it from notification settings when FE-core confirms.
18. Debt person page default = current cycle only (was all entries) · the "earlier cycles" fold loads on demand · `?cycle=all`.
19. Category duplicate = 422 (was 400) with the field · FE-core asked.
20. The Docker engine was off after the overnight stop; I started Docker Desktop and `chubi_pocket_db` only (not the app container) to run tests.

## 2026-10-17 — 0.4.0 M2 (BE, feat/0.4.0-be)
DONE M2 · 3 more commits (budgets, events, transactions list) · no migration · tests (changed packages, `chubi_test_040`): budgets, projects, transactions, dashboard, accounts, apidoc ok · docs: spec 04 / 08 / 10, api-document.

**Item 6 (contacts):** checked, nothing to change: archive only hides (no 409 anywhere), contact delete snapshots the shown name and falls back to level 1; both covered by tests on the 0.3.3 branch that are merged.

**FE contract delta (forward-ready)** — all additive.
- **Budget detail (→ FE-pages)** `forecast` + `available` (limit − used), `projected_end` (= forecast_end), `days_left` (today included), `pace_pct` (elapsed / total, the pace tick); last three null for open-ended / non-current periods. Every budget item has `reason` (all | category | sub_category | tag | wallet). Periods list: `GET /budgets/:id/periods` (exists); per-period limit override = the existing `PUT /budgets/:id/periods/:period_id` (partial; `amount` null = back to base), no PATCH added.
- **Events (→ FE-pages)** Event row: `my_paid`, `my_share`, `my_receivable`, `my_payable` (both ≥ 0), `remaining` (planned − (expense − income)); positions (`summary.members[]`, `my_position`): `receivable`, `payable`. List `summary`: `my_share_total`, `paid_total`, `receivable_total` (active events) + `counts {active, unsettled, ended}`; same whatever the filter. Event tags: owner + every contributor may create / rename / restyle / delete (viewers read-only) and bills filter with `?tag_id` (already so; verified).
- **Transactions list (→ FE-pages)** `GET /transactions` + `avg_daily_spend` and `daily: [{date, income, expense}]` (my share, zero-filled, whole range): range = `from`/`to`, with only `from` that month, with neither the current month (user tz, `X-Timezone`). `avg_daily_spend` = range expense / days that have happened. `totals` unchanged.

**Decisions taken**
11. Budget per-period override stays PUT (no PATCH alias) · same behaviour, one route fewer to keep · add a PATCH route if FE insists.
12. Event tag permissions: viewers stay read-only (contributors + owner write) · "every member" read as every member who can write; viewers cannot add bills either · allow viewers by relaxing `tagWriteGate`.
13. Event list `summary.counts.unsettled` counts active AND ended events where my receivable / payable ≠ 0 (not archived) · the card says "ยังไม่เคลียร์" · restrict to ended if wanted.
14. Transactions list: `avg_daily_spend` / `daily` sit at the TOP of the list answer, not inside `totals` · `totals` has a positional struct in tests and is shared · move later.

## 2026-10-17 — 0.4.0 M1 (BE, branch feat/0.4.0-be, worktree chubi-pocket-be-040)
DONE M1 · 5 commits on top of main 1b5dfe0 (the 0.3.3 merge is clean: no conflicts, build + vet green) · migration 062 (`saving_auto`, up + down; data move of old recurring ออม rules) · tests (changed packages, DB `chubi_test_040` at migrations 001–062): accounts, personal_debts, saving_goals, recurring, pending, categories, apidoc, me, dashboard ok · docs: spec 03 §2.5b, 05 §3.2, 09 §0.7, 12 §0, api-document. Never pushed / merged.

**FE contract delta (forward-ready)**
- **Wallets (→ FE-pages)** `GET /accounts` + every wallet answer: `month_in`, `month_out` (this month's income / expense cash on the wallet, user tz; transfers and opening / adjustment rows excluded), `due_date_next`, `days_until_due` (cards with a due day). Existing: `savings.{saved, available}`, `credit_limit`, `statement_date`, `payment_due_date`, `minimum_payment`. List `totals` adds `total`, `cash_total`, `card_debt`, `card_used_pct`, `saved_total`, `available_total` (`by_type[].count` = the group header counts). `GET /accounts` honours `X-Timezone`.
- **Debts (→ FE-pages)** person: `cleared_at`, `days_outstanding`; `GET /personal-debts/people/:key` and `/entries` take `cycle=current|earlier`; entries in those lists have `in_current_cycle`; `counts.{current, earlier}`; people `totals` adds `owed_to_me_people`, `i_owe_people`, `over_30_days_people`; new `GET /personal-debts/people/:key/summary-message` → `{text, entries, net}`.
- **Goals (→ FE-pages)** goal: `month_plan`, `month_saved`, `month_short`, `status` (reached | on_track | behind | none), `behind_months`, `auto_save: {amount, day, wallet|null, next_date} | null`. List summary adds `saved_total`, `month_short_total`, `unallocated`. New `PUT|DELETE /saving-goals/:id/auto-save` and `/saving-goals/spare/auto-save` (body `{amount, day 1–31, account_id|null}`; answer = goal / spare page). **Breaking inside the goal pages:** the detail's `auto_save` LIST is gone (now `goal.auto_save`, an object); `SpareDetail.auto_save` is an object | null. A confirmed auto-save draft with no wallet saves with no wallet.
- **Categories (→ FE-core)** every category (list + detail): `month_spent`, `month_count` (this month, sub-categories included; my share).

**Decisions taken** (what · why · how to undo)
1. Wallet card fields keep the existing names `statement_date` / `payment_due_date` (the brief's `due_day` / `statement_day`) · they already exist with the same meaning, a rename would break the app for nothing · add aliases if FE prefers.
2. Wallet `total` = `net`, `cash_total` = `assets`, `card_debt` = `liabilities` (redundant aliases as briefed) · FE reads the briefed names · drop the aliases later.
3. Wallet `month_in` / `month_out` count the wallet's cash rows of ALL authors (a shared wallet's flow), not my share · it is the wallet's cash · restrict to my rows if wanted.
4. Debts: `days_outstanding` = oldest entry of the CURRENT cycle not labelled paid, in the user's STORED timezone (not the header) · every `person_balance` in write answers needs it without a header · pass the header through later.
5. Debt totals keep `owed_to_me` / `i_owe` as numbers and add `*_people` counts (the brief's `{amount, people}` objects would break the existing contract) · additive · reshape later.
6. Debt cycle boundary = the last entry where the running balance (book order) is ≈ 0; a person with an unsettled start has a single cycle.
7. Goal `month_plan` = auto-saving amount, else `needed_monthly`; `status` maps the old `pace` (late → behind) · FE gets the briefed names, `pace` stays · drop `pace` later.
8. Auto-saving: one setting per goal / unallocated, table `saving_auto`, ONE draft per month on the day (31 = last day); source `auto_save`; old recurring ออม rules moved by migration 062 (data disposable) · creating new ออม rules in recurring stays accepted until M4 · remove in M4.
9. Categories: names `month_spent` / `month_count` (brief: spent / count) · clearer next to the existing counts; write answers carry 0.
10. Test DB: own throwaway `chubi_test_040` (never `chubi_test` / `chubi_pocket_db`).

## 2026-10-17 — saving entry with no wallet = NO wallet (owner correction, 0.3.3 branch)
DONE (9th local commit on feat/0.3.3-delete-archive) · the write-time default-wallet stamp is removed: `POST /saving-entries` `kind: save` with no `wallet_id` stores `account_id` NULL (`defaultWallet` helper deleted); explicit `wallet_id` unchanged. NULL = outside any wallet: counts for the goal / unallocated, never for a wallet's available / spare. Spec: openapi `SavingEntryRequest.wallet_id`, spec 09 §0.6, api-document; test `TestSavingsWithoutWallet` now sets a default wallet and asserts it is ignored · saving_goals tests ok on `chubi_test_033`.
FE: `wallet_id` is optional on save; a save with no wallet never touches any wallet's numbers. (Not yet: recurring / pending saving drafts still need a wallet; recurring loses ออม later per Lead.)

## 2026-10-16 — GET /budgets summary card (0.3.1-11, main tree on top of item 1)
DONE · files: `budgets/{model,service,handler,budgets_test}.go`, `apidoc/openapi.yaml` · no migration · `go vet` clean · tests: budgets + dashboard + apidoc ok (on `chubi_test`) · docs: spec 08 · no commit.

**FE contract delta (forward-ready)** — additive, safe for the current build.
- `GET /budgets` → `summary` (same whatever `status` / `health`) gains: `total_limit`, `total_used`, `total_remaining` (signed), `used_pct` (int, not clamped, 0 when limit 0), `counts: {all, ok, near, over}`. Existing keys (`active_count`, `over_count`, `warn_count`, `pace_count`, ended / archived) unchanged.
- Basis: the ACTIVE budgets (active + upcoming = `active_count`), each at its current period. `total_limit` = plain sum of the current periods' amounts (override counts); `total_used` counts each transaction / event share ONCE across overlapping budgets (may be less than the sum of rows' `period.used`); `counts.near` = status warn (the budget's own `warn_pct`), `over` = status over, `ok` = ok + pace; ok + near + over = all.
- New `?health=normal|near|over` on the list: narrows `data` only (normal = ok + pace), not `summary`; 400 on other values.
- Every `period` has `on_pace_to_exceed: bool` (forecast says the current period ends over; independent of `status`, so a warn row can carry it). The older `status: "pace"` still exists for the ordering / `pace_count`.
- Elapsed ratio for a pace tick: NOT added; the row's `period.start` / `period.end` (and `days_left`) are enough (elapsed = (today − start + 1) / (end − start + 1)); open-ended periods have no tick.
- fe-core asked for different key names (`used / limit / remaining / pct / count_*`); Lead's brief fixed the `total_*` / `counts.*` names above, so those are the final ones.

## 2026-10-16 — GET /recurring summary (0.3.1-11, main tree on top of item 1)
DONE · files: `recurring/{summary.go (new),model.go,service.go,handler.go,recurring_test.go}`, `apidoc/openapi.yaml` · no migration · `go vet` clean · tests: recurring + apidoc ok (on `chubi_test`) · docs: spec 11 · no commit.

**FE contract delta (forward-ready)** — additive, safe for the current build.
- `GET /recurring` has a new top-level `summary: { month_pay, month_receive, next: {id, name, date, amount, type} | null }`, identical whatever `status` / `q` / page.
- `month_*` = per-month equivalent of the ACTIVE settings only (paused / archived / ended / on an archived wallet excluded; transfers and savings count as neither): daily = amount × 30.4375 / interval; weekly = amount × weekdays (none = 1) × 4.3481 / interval; monthly = amount / interval; yearly = amount / (12 × interval); custom dates = amount × the dates in the CURRENT month. Example: 100 every 7 days = 434.82.
- `next` = nearest upcoming (today or later) occurrence of an active setting of ANY type (so a transfer / saving can be `next`; the FE can show its `type`); null when none.
- New optional `q` (name substring, case-insensitive): narrows `data` / `pagination` only, not `summary` or `counts`.
- Not covered: income and expense rules in different currencies are simply added (currency is a label now).

## 2026-10-16 — contact delete snapshots the shown name
DONE (8th local commit) · `RestoreOnContactDeleteTx` now uses `shared.PersonNameSQL` (nickname when shown, else linked profile name, else display_name); test asserts "Beebee"; personal_debts + contacts tests ok; spec 07 updated. Wallet-invite 409 and `counterpart_debt_id` left as is (Lead's answers). BE work idle until the merge go.

## 2026-10-16 — contacts vs money records (owner decision; replaces the CONTACT_ARCHIVED rule of step 6)
DONE (7th local commit on feat/0.3.3-delete-archive) · no migration · `go vet ./...` clean · tests (changed packages, `chubi_test_033`): personal_debts, projects, pending, transactions, contacts, accounts, apidoc ok · docs: spec 07, api-document, plan doc, openapi (error text).

**1. Archived-contact blocking removed.** No 409 `CONTACT_ARCHIVED` on: debt entries (new, repayment, retargeting an entry), splits (create + edit incl. linking a split to an archived contact), event quick-add, pending submit. `last_used_at` bumps for archived contacts again. The error vars / mappings are gone (`transactions.ErrSplitContactArchived`, `personal_debts.ErrContactArchived`). Kept on purpose: (a) inviting an ARCHIVED contact to a shared wallet is still 409 `CONTACT_ARCHIVED` in the accounts module (a picker rule, not a money record; say if that should go too); (b) the event "add members' contact" lookup still prefers non-archived contacts (a picker preference, never blocks). The partner-side mirror contact choice (active first) stays; the DB allows one contact per linked user anyway.

**2. What contact DELETE does today (checked): it already falls back to level 1.** `DELETE /contacts/:id` runs in one tx: `RestoreOnContactDeleteTx` writes the contact's `display_name` onto `counterparty_person_name` of every debt entry of the user that references it, then deletes the contact; `personal_debts.counterparty_contact_id` is `ON DELETE SET NULL`. Only `personal_debts` references `contacts` (verified from the FKs). Result: contact id NULL, name kept as a snapshot, amounts unchanged, the entries show up as a typed-name person. **No code change needed.** I added a test (`TestContactsAndDebtsAreIndependent`): 3 entries (one before, two after archiving) → delete → 3 rows, 0 linked, sum unchanged, name "Bee old", one typed-name person in `GET /personal-debts/people`.
- Level 3 (linked): once the contact id is NULL, `linkedPartnerTx` finds no partner, so no more split notifications / mirror updates flow from those entries: the link ends. The other user's book is untouched. I did NOT clear `counterpart_debt_id` (my entry still points at their mirror row): it only feeds the "from <name>" source label of mirror rows and is never written to their book; clearing it would blank that label on mirror rows. Say if you want it cleared anyway.
- Snapshot caveat: the snapshot is the contact's `display_name`. A contact shown with a nickname (`show_nickname`) or a linked user's live profile name will come back under `display_name`, not the nickname. If the owner wants the shown name kept, it is a one-line change (use the same resolved name the views use).
- Relinking: per record via the picker (entry edit with a contact key) and the `unlinked-names` / `absorb` flow work unchanged on these now-typed entries.

## 2026-10-16 — 0.3.3 BE, step 12 (wallet delete) — BE part of 0.3.3 complete
DONE (6th local commit on feat/0.3.3-delete-archive, worktree `chubi-pocket-be-033`; no merge / push) · migration 061 now also has the step 11 + 12 parts (still ONE file; up applies fresh 001→061, down + re-up verified) · `go vet ./...` clean · tests (changed packages, `chubi_test_033`): accounts, saving_goals, transactions, recurring, dashboard, me, pending, budgets, apidoc ok. Docs: spec 03 §2.5a / §2.6 / §3.10, spec 09 §0.6, api-document, plan doc. **Ships with the app + MIN_APP_BUILD** (old app's archive button = DELETE would hard-delete).

**FE contract delta (forward-ready)**
- `DELETE /accounts/:id` = REAL delete → `{ id, deleted: { transactions, transfers, system_rows_deleted, recurring, saving_entries: { count, amount } } }` (was the archived Account). Owner only; 409 ACCOUNT_HAS_MEMBERS. The app's "archive" button must call `POST /accounts/:id/archive`.
- `GET /accounts/:id/delete-preview` → the same counts (operationId `previewAccountDelete`), for the confirm dialog. Saving entries are "kept, unlinked from any wallet".
- What a delete does: opening / adjustment rows deleted; all other rows (every author) keep living with `account` null; transfer: the leg of the deleted wallet becomes wallet-less, the twin is untouched (`transfer_peer.account` null, spec 04 §4.16a); recurring settings keep running wallet-less; default-wallet setting cleared; budget wallet scopes drop the wallet; pending drafts naming it get `last_error` at submit.
- **Saving entries with no wallet:** `SavingEntry.wallet`, `SavingWalletShare.wallet` nullable; the entry's wallet bucket ref has null id / name. Wallet-less money counts for the goal (`saved_amount`, `by_wallet` shows a share with `wallet: null`) and never for any wallet. `POST /saving-entries` `kind: save`: `wallet_id` is now OPTIONAL: omitted → the user's default wallet is stamped at write time when still usable, else the entry has no wallet. Withdraw / move largest-first now includes the wallet-less pool.
- Not done / follow-ups: recurring saving rules and pending 🐷 drafts still require a wallet (unchanged); budgets scoped only to a deleted wallet lose that scope entry (check how an empty wallet scope reads before the app ships: I did not change budgets); repayments to an archived contact still blocked (owner asking).

**Merge notes for Lead** (branch is from f503d9c, without item 1): expect conflicts in `accounts/service.go`, `accounts/model.go`, `accounts/api_test.go` (other_currency_count / archive tests), `transactions/service.go` (transfer create: item 1 removed the currency mismatch, this branch refactored the transfer update), `personal_debts/split_flow.go` / `service.go` (currency line). The spec yaml gets edits from both: resolve by keeping both sets. The test DB `chubi_test_033` has migrations 001–061; `chubi_test` (item 1) is at 060, so tests of the two trees don't clash. Apply 061 on the real local DB when you rebuild docker from the merged tree.

## 2026-10-16 — 0.3.3 BE, steps 7 / 5 / 6 / 10 / 11 (branch feat/0.3.3-delete-archive)
DONE (5 local commits in worktree `chubi-pocket-be-033`, from f503d9c: **without item 1**; no merge / push) · one migration `000061_states_delete_archive` (up + down; **breaking for the current app build**: see below) · tests: changed packages only, on the throwaway DB `chubi_test_033` (migrations 001-061): categories, me, transactions, notifications, personal_debts, projects, pending, accounts, budgets, dashboard, recurring, saving_goals, apidoc all ok. Docs: spec 03 / 04 / 05 / 07 / 13, api-document (recent additions), plan doc status block. Plan steps 3 / 8 / 9 are obsolete (reasons in the plan doc and my earlier message).

**FE contract delta (forward-ready)**
- **Categories (7):** `categories.status` is gone: no `status` key on a category, `GET /categories` takes no `status` param. Migration drops the column and rebuilds the sibling-name unique index without the status filter.
- **Notifications (5):** `GET /notifications` hides dismissed rows by default; `?dismissed=true` = hidden only, `?dismissed=all`. New `POST /notifications/:id/restore` → `{notification, badges}` (clears `dismissed_at`, read stays, idempotent). Unread counts are unchanged (dismissed rows are already read).
- **Contacts (6):** new debt entries (`POST /personal-debts/people/:key/entries`, edit that retargets to a contact), splits on bills, event quick-add and pending submit with an ARCHIVED contact answer **409 `CONTACT_ARCHIVED`**; `last_used_at` is not bumped for archived contacts; the contact's existing debts still count everywhere. (Decision: ALL new entries with the person are blocked, including a repayment; restore the contact first. Say if repayments should stay allowed.)
- **Transfers (10):** a transfer leg may have no wallet (only after a wallet delete, step 12). `transfer_peer.account` is **nullable** (null = the twin has no wallet; `transfer_peer` itself is still set). Edit: `account_id` = OUT leg wallet, `transfer_to_account_id` = IN leg wallet, each re-filed on its own; a wallet-less leg can be given a wallet; a leg that has a wallet cannot be cleared (400 VALIDATION_ERROR); same wallet on both → TRANSFER_SAME_ACCOUNT. `TRANSFER_NEEDS_WALLETS` on edit is gone for the one-sided case. Create still needs both wallets.
- **Wallet archive (11):** `POST /accounts/:id/archive` (owner; 409 ACCOUNT_HAS_MEMBERS) and the existing `POST /accounts/:id/restore`. `DELETE /accounts/:id` **still archives** until step 12 (its operationId is now `deleteAccount`). Wallet `status` is `active | archived` (`closed` is merged into archived). An archived wallet: out of the default list; out of EVERY calculation (wallet totals, transaction summaries, budgets, dashboard: via `ReportScopePredicate`); its rows are hidden from `GET /transactions` unless `include_archived=true` or `account_id` = that wallet; READ-ONLY: new / edit / delete a row, tags, transfer in or out, debt entry, pending submit, recurring write → **409 `ACCOUNT_ARCHIVED`**. Recurring settings on it auto-pause (already the case). Saving goals still answer 404 ACCOUNT_NOT_FOUND for an archived wallet (not 409; saving entries already on it are untouched).
- **Compat note for the merge with item 1:** both touch `accounts/service.go`, `accounts/model.go`, `transactions/service.go` (transfer create), `personal_debts/split_flow.go`; item 1 removed the currency mismatch check that this branch still has, and `other_currency_count`.

**Step 12 proposal (needs Lead's OK before I build it)**
1. `DELETE /accounts/:id` = hard delete (owner only; 409 ACCOUNT_HAS_MEMBERS), one tx: delete the wallet's system rows (opening / adjustment); `transactions.account_id = NULL` for every other row (all authors, both transfer legs); recurring rules → `account_id`/`to_account_id` NULL (status unchanged); `saving_entries.account_id` → NULL (migration: nullable, FK `ON DELETE SET NULL`); `default_account_id` → NULL; then delete the wallet.
2. `GET /accounts/:id/delete-preview` → `{transactions, transfers, system_rows_deleted, recurring, saving_entries: {count, amount}}` ("kept, unlinked").
3. **Saving entries with no wallet ("null = default wallet"):** I propose NULL = **unallocated**, not a late-bound default. A wallet-less entry still counts for its goal's `saved_amount` and appears in the goal's `by_wallet` as one "no wallet" share, but it belongs to no wallet, so it never affects any wallet's available / spare numbers or the per-wallet no-negative check (there is nothing to go negative). Reading "null = the current default wallet" would make a goal's saved amount and a wallet's spare silently change when the default wallet changes or is deleted. For the "add money to a goal without picking a wallet" case: stamp the user's default wallet (`default_account_id`) on the entry at WRITE time when no wallet is sent (stable afterwards); if there is no default wallet, store NULL (unallocated). That gives "no wallet = default wallet, a normal saving" for the owner without the drift. Shape change: `saving_entries.account_id` nullable, entry views / `by_wallet[].wallet` nullable, `POST /saving-goals/:id/save` `account_id` optional.
4. Order of work: migration part 3 → delete + preview → saving entry nullable → tests → docs. Ships with the app and `MIN_APP_BUILD` (old app's "archive" = DELETE would hard-delete).

## 2026-10-16 — 0.3.1-11 item 1: currency from the user setting
DONE · files (be): `users/{model,store}.go`, `accounts/{model,service}.go`, `transactions/{service,handler}.go`, `pending/service.go`, `projects/{pt_store,model,quick}.go`, `personal_debts/{split_flow,service}.go`, `dashboard/{service,store}.go`, `apidoc/openapi.yaml` + tests · migration: none · tests (changed packages only, `chubi_test` DB): users, accounts, apidoc, projects, transactions, personal_debts, pending, dashboard all ok · docs: api-document.md (recent additions), spec 02 §3.4, spec 04, api-v2-notes, ux-overhaul-contract. No commit.

**Survey.** Currency columns: `users`, `accounts`, `personal_debts`, `project_transactions` (budgets / goals / transactions have none: they read the user's or the wallet's). Already server-filled: wallet create, debt entries (empty → user's), event rows (request field was `json:"-"`). Client-sendable: only `POST /auth/register` `currency` (first setup, kept, default THB) and, new, `PUT /users/me`.

**Changes**
- `PUT /users/me` takes `currency` (3 letters, upper-cased). Relabel only: one tx UPDATEs `users`, the user's `accounts`, `personal_debts` and own `project_transactions` rows, so the column always equals the setting (recommended option). Shared wallets owned by someone else keep their owner's label.
- Event rows always use the recorder's currency (`CreateProjectTransactionRequest.Currency` removed). Debt entries (own and the partner's mirror) are filled from each owner's setting, not copied from the other user; notification payloads still carry the splitter's amount/currency as-is.
- Calculations ignore currency: wallet totals sum every tracked wallet; `other_currency_count` removed; transfers between any two wallets (`TRANSFER_CURRENCY_MISMATCH` removed); dashboard `currency` was hard-coded THB, now the user setting.

**FE contract delta (forward-ready)**
- `PUT /users/me` `{ "currency": "USD" }` → profile with the new `currency`. Show the "relabel only, no conversion" warning before saving (FE).
- `GET /accounts` `totals.other_currency_count` is gone. `TRANSFER_CURRENCY_MISMATCH` is gone (remove any handling). `GET /dashboard` `currency` = the user's.
- Display amounts with the viewer's `/users/me` currency (symbol + decimals). Wallets / entries still carry `currency` (equals the setting). Breaking for the old build, fine under forced update.
- Not tested: a direct relabel test of accounts / debts rows (the users test covers the setting + response only).


## 2026-10-11 — pending drafts get an event (draft.project_id)
DONE · files: `pending/{model,service,service_test,event_test}.go`, `projects/quick.go`, `cmd/api/main.go` · go vet clean · go test -count=1 ./... all ok (TEST_DATABASE_URL set) · migration: none (draft is JSON) · docs: `design/api/ux-overhaul-contract.md` §14, `design/api/api-document.md` (recent-additions line), `design/spec/10-projects.md` §4.25

**FE contract delta (forward-ready)**
- `draft.project_id`: nullable uuid, same name as on transactions. Returned by `POST` / `PUT` / `GET /pending-transactions` inside `draft`. Omitted from the JSON when empty (like every other draft key), so read it as absent = none. There is no single-draft GET; list returns it.
- Not validated at save: an unknown / closed / foreign event saves fine. `kind: create` only; ignored for `settle_debt` / `update_tx`.
- Confirm (`POST /pending-transactions/submit`) with a `project_id` = the "add a new bill to an event" path (`POST /projects/:id/bills` with `new_transaction`), in the same DB transaction as tags + draft removal. Bill is a normal transaction (balance moves) linked to the event; draft `splits` go onto the board, never into personal debts; members are added as in quick create. Expense / income only.
- Event failures come back as `failed[]` + `last_error` (never a 5xx), nothing is written, draft stays; `PUT` clears `last_error`. New codes: `PROJECT_NOT_FOUND` (gone), `PROJECT_NOT_ACTIVE` (completed), `PROJECT_LOCKED` (cancelled / archived), `PROJECT_NOT_MEMBER`, `PROJECT_READ_ONLY` (viewer), `TX_NOT_BILLABLE` (transfer).
- Split codes on submit (event or not): `INVALID_SPLIT` (blank name / amount ≤ 0), `SPLITS_EXCEED_AMOUNT`, `CONTACT_NOT_FOUND`.
- Compatibility: additive. Safe for the live build (MIN_APP_BUILD=0). `NewService` for pending takes the projects service (wired in main.go).

**Item 4 — incomplete / unbalanced splits (differs from "validates like tx create" today)**
- Save: any splits are accepted (the `required` / `gt=0` binding on `SplitInput` only runs on the HTTP tx body, not on the draft). Unchanged.
- Confirm BEFORE this change: Σ > amount → `SUBMIT_FAILED` with a raw message (non-event path: the debts creator error; event path: board check). A blank `person_name` confirmed successfully (empty-named split created); `owed_amount: 0` failed with a raw DB check-constraint message (`SUBMIT_FAILED`). So it did differ from tx create.
- Now: submit checks split shape first (`INVALID_SPLIT`) and maps Σ > amount to `SPLITS_EXCEED_AMOUNT`. The `SPLITS_EXCEED_SHARE` rule is not part of creating a bill (it's the edit-splits rule), so it isn't applied here.

**Implementation notes**
- `projects.AddBills` split into a tx-taking `addBillsTx`; new `projects.AddNewBillTx(ctx, tx, user, event, CreateRequest)` used by pending submit. `AddBills` behaviour unchanged (full projects tests pass).
- Event checks run in the shared function before any write; membership is checked after the event status (same order as the endpoint, so a non-member of a completed event sees `PROJECT_NOT_ACTIVE`).
- Tests (`pending/event_test.go`, DB; `service_test.go`, unit): save/update/list keep project_id; confirm into an event (balance, link, board rows, no personal debts, draft deleted); no-event confirm unchanged; gone / completed / cancelled / archived / non-member / viewer / transfer → coded failure, no leak; retry after fixing; bad splits.
- `gofmt` on `projects/quick.go` also re-aligned the existing `quickBill` struct (whitespace only).

## 2026-10-12 — split identity unlock (lift SPLIT_IDENTITY_LOCKED for tx split edits)
DONE · evaluation verdict: no blocker · files: `personal_debts/split_edit.go`, `personal_debts/split_edit_test.go`, `transactions/{service,handler}.go` (error var + 422 mapping removed) · go vet clean · go test -count=1 ./... all ok · migration: none · docs: `design/spec/04-transactions.md` §3.4a, `design/api/api-document.md` (recent-additions line), `ai/skills/chubi-be/SKILL.md`

**Evaluation**
- (a) Debts / repayments: the swap uses the same removal the list edit already does (`removeDebtTx`): unpaid row deleted; repaid row stays at amount 0 with its settled amount (shows overpaid, repayment tx untouched) — exactly "remove + re-add" today. The new person is a fresh debt row (new `debt_id`, nothing repaid). No unique index on (source tx, contact) or on contact, so a swap back to a previously removed/zeroed person is fine.
- Event board: the lock only ever existed in the tx split edit (`checkIdentityEditTx`). Board member splits have their own rules and are untouched. A bill inside an event can still have personal splits on my share; the swap works the same there.
- (b) Notifications: old partner — same as removal today: mirror exists → `split_changed` removed (auto-apply if their switch is on); no mirror yet → their pending `split_created` is superseded. New person, if linked to an app user → `split_created` via the normal create path. No-one's book is written (ledger-not-sync holds). Notifications to the old partner are one-shot per swap (verified: exactly one removed).
- Σ validation unchanged (the swap keeps the sent amount; Σ ≤ amount is checked as before).

**Behaviour** (`PUT /v1/transactions/:id/splits`)
- Kept item whose current contact is linked to an app user, and `contact_id` changes (another contact, or `null`) → remove old + add new in the same DB transaction; new amount = the item's `owed_amount`. Name defaults as before (new contact's display_name; kept name when dropping to a free name).
- Rename that keeps the same linked contact → in place, silent, same row (before: 422). This is my reading of "changing the person"; say if you want a rename on a linked split to be a swap too.
- Unlinked / free-name splits: unchanged (in place).

**FE contract delta (forward-ready)**
- `422 SPLIT_IDENTITY_LOCKED` no longer exists. Drop its handling; the picker can change person on any split.
- After a swap of a linked person the item has a **new `debt_id`** and appears after the other rows (created later); the old row, if it had repayments, is still listed at amount 0 under the old person (overpaid), otherwise gone. Re-read splits from the response; don't keep the old `debt_id`.
- Safe for the live build (MIN_APP_BUILD=0): an error code is no longer returned; no field added or removed.

**Tests** (`TestEditSplitsIdentity`, `TestEditSplitsIdentityUnlinkedContact`): linked rename in place + silent; same identity sent back = no change; linked Partner → free name (old row gone, new row 100, Partner hears one split_changed removed); repaid linked Bee → Partner's contact (old row 0 with 50 repaid, Bee hears removed, Partner hears split_created for the new row); linked → free name with a repayment.

## 2026-10-12 — API design review: page-ready data (PROPOSAL, no code written)
Input: `ai/reports/api-audit-2026-10-12.md`. Principle: the BE sends page-ready data; the FE never loads a whole reference list to look up a name / icon / colour / flag by id.

### 0. Audit claims checked against the code
| Claim | Verdict |
|---|---|
| `EmbeddedRef{id,name}` only on tx account / category | TRUE (`transactions/model.go:92`; the list query joins only `a.name`, `c.name`, `store.go:245`). Dashboard `recent` reuses the same struct. |
| Category system flag / kind not available | TRUE and worse: `is_system` is sent but `SystemKind` is `json:"-"` (`categories/model.go:42`), so `system_kind` never reaches the app. The transfer direction is guessed from a name because of this. |
| `SplitRef` bare + snapshot | TRUE (`SplitsFor`, `transactions/store.go:794`: `counterparty_person_name`, `contact_id`, no contact join). |
| `PersonalDebt` snapshot only | TRUE (`debtColumns`; `GetByID` / `List` have no contact join). |
| `/personal-debts/people` is live but unused | TRUE, with 4 gaps: uses `contacts.display_name` (not the linked user's name); icon = the contact's own (not the linked user's); **open debts only** (a person with only settled debts is absent); no paging; free names group by `lower(name)` with no key to ask for "this person's debts". |
| Pending draft is all bare ids | TRUE (`pending/model.go`). |
| No transfer twin ref | TRUE. `transfer_group_id` is on the row, but there's no lookup by group either. |
| No unread-count endpoint | TRUE (`unread_count` only comes back inside `GET /notifications`, `notifications/store.go:150`). |
| "GET /accounts/:id unused", "`counterparty_contact_id` filter unused", GET /transactions/:id, scheduled /:id, contacts/:id | **FE-only**: the BE already has all of them. `GET /accounts/:id` returns any status (archived too). The debts filter only works for contact people, not free names (needs the new person endpoint). |
| Spec says live contact name | TRUE (07 §45, 06 §2.5), not implemented. **The contacts module contradicts it**: `contacts/model.go:19` says linked contacts display `linked_user_display_name` in preference to the stored `display_name` → see Owner Q1. |

Extra BE gaps found: tx create/update have no `tag_ids` (every tag = a separate POST/DELETE); `POST /pending-transactions/submit` returns ids only (no row, no balance); no bulk discard; goals `linked_account` has no icon/type; the fee-category flag exists only in `GET /users/me`; notification settings `default_account_id` is bare; project board rows carry `transaction_member_id` only.

### 1. Response-shape changes (all additive unless stated)
Shared shapes (new Go types, supersets of today's `{id,name}`):
- `AccountRef` = `{id, name, icon_code, logo_url, type, currency, archived}`
- `CategoryRef` = `{id, name, icon_code, type, is_system, system_kind, parent_id}` (sub-categories keep their OWN icon per the standing decision, so no parent icon is needed; `parent_name` only if FE-A wants a breadcrumb)
- `EventRef` = `{id, name, icon_code, status}`
- `PersonRef` = `{name, contact_id, icon_code, linked, linked_user_id}`. **Name rule (server-side, one SQL fragment in `shared`):** contact set → the LIVE contact name (see Q1 for linked contacts); contact missing / deleted → the stored snapshot. Icon = linked user's icon, else the contact's, else null (free name → the FE draws 👤).

| # | Endpoint(s) | Change |
|---|---|---|
| 1 | `GET /transactions`, `GET /transactions/:id`, `POST` / `PUT` responses, `GET /dashboard` (`recent`), scheduled "generated" rows | `account` → `AccountRef`, `category` → `CategoryRef`, `project` → `EventRef` (existing keys keep `id`, `name`). |
| 2 | same rows, transfers only | new `transfer_peer: {id, direction: "out" or "in", account: AccountRef}` (the twin). Kills the "whole day's transfers" lookup and the name-guessing. |
| 3 | `GET /transactions/:id` `splits[]` | each `SplitRef` gets `person: PersonRef`; `person_name` now returns the **resolved** name (same key, live value). |
| 4 | `GET /personal-debts`, `/:id`, create / update / settle / cancel responses | `person: PersonRef`; `counterparty_person_name` returns the resolved name; the raw snapshot stays in the DB only. |
| 5 | `GET /personal-debts/people` | per row: `key` (`c:<contact_id>` or `n:<lower name>`), `person: PersonRef`, `open_count`, `settled_count`; optional `status=all` to include people with only settled debts; optional `page` / `per_page` (no params = everything, as today). Totals header unchanged. |
| 6 | **NEW** `GET /personal-debts/people/:key` | `{person, totals:{owed_to_me_open, i_owe_open, open_count, settled_count}, data:[debt+person], pagination}`; `status` filter (default all), `direction`, page / per_page. One call for the person page, free names included. |
| 7 | `GET /pending-transactions` | each draft gets a read-only `resolved: {account, transfer_to_account, category, tags[], project, splits:[{person: PersonRef}]}`; a dangling id → null + `missing: ["category_id"]`. Write shape unchanged. |
| 8 | `POST /pending-transactions/submit` | each `submitted[]` item also carries `transaction` (full detail) + `account_balance_after`. **NEW** `POST /pending-transactions/discard {ids}` (bulk, 1 call). |
| 9 | **NEW** `GET /notifications/unread-count` → `{unread_count}`; **NEW** `GET /me/counts` → `{unread_notifications, pending_drafts, categories, tags, contacts, active_events, open_debts, budgets, goals:{count, progress_pct}}` | badge + More hub in one cheap call. |
| 10 | `POST /transactions`, `PUT /transactions/:id` | accept `tag_ids` (create: set; update: replace-set, absent = unchanged); **NEW** `PUT /transactions/:id/tags {tag_ids}`. Replaces DELETE×k + POST + GET. |
| 11 | `GET /categories`, `/categories/:id` | expose `system_kind`; detail gets `is_fee_category` (drops the `/users/me` call). |
| 12 | `GET /contacts/:id?include=unlinked_names` | embeds the unlinked-names list (today a separate global call). |
| 13 | goals `linked_account`; `GET /notifications/settings`; project board rows | `AccountRef`; `default_account: AccountRef` next to the id; `transaction_member: {id, display_name, icon_code, user_id}` next to `transaction_member_id`. |
| 14 | `PUT /transactions/:id/splits` (the rule change you asked for) | on a split that has a contact (kept or new), a sent `person_name` is **ignored**: the name follows the contact; free-name rows still rename in place. The "silent rename on the same linked contact" path goes away (200, no error). |

### 2. Calls on open, BEFORE → AFTER (key pages; estimates from the audit)
| Page | Before | After |
|---|---|---|
| Home | 6–8 cold (accounts + categories just for icons, badge ping-pong) | ~3–4 (no lookup lists, 1 counts call) |
| Transactions list | 2 + per-row cache joins | 1 (+ `/tags` only when the filter sheet opens) |
| Transaction detail | cold: list p1 + `/:id` + `/contacts` + day's transfers; warm 0–3 | 1 (`GET /:id`: refs, splits' persons, twin all inside); warm 0–1 |
| Debts list | 1 + ⌈N/100⌉ + `/contacts`, every visit | 1 (`/people`) |
| Debt person page | ⌈N/100⌉ cold | 1 (`/people/:key`, paged on scroll) |
| Debt detail | 0–1 + contacts cache | 0–1 (person embedded) |
| Contact detail | 2 | 1 (`include=unlinked_names`) |
| Pending | 4 (drafts + accounts + categories + tags) | 1; bulk discard N → 1; submit needs no refetch |
| Quick create save | ≈5+ (POST, full `/accounts`, tag POSTs, GET) | 1 (`tag_ids` inline; `account_balance_after` already returned) |
| More hub | 3 (2 full lists) | 1 (`/me/counts`) |
| Category detail | 2 | 1 |
| Notifications badge | polled list call | `/me/counts` (or `/unread-count`) |

FE-only fixes (no BE work; use what exists): scheduled detail must `GET /scheduled-transactions/:id` (the "not found" bug); wallet detail uses `GET /accounts/:id` for archived; quick create uses `account_balance_after` (`patchBalance`); `/contacts` loaded lazily; transaction detail uses `GET /:id` directly; fix `'/personal-debts/split-changes//apply'` (id not interpolated); drill-down category filter without the cache; badge double-start; event picker `GET /projects` cached.

### 3. Breaking vs additive; migrations
- **Additive: #1–#13** (new keys, new endpoints, richer refs). Old builds ignore the new keys.
- **Value change, same shape:** `person_name` / `counterparty_person_name` now return the live name. No key removed or renamed; an old build just starts showing renamed contacts correctly. I recommend this over leaving the snapshot in the same key (that is the trap behind the audit's bug).
- **#14** is behaviour only (no field change). Safe with `MIN_APP_BUILD=0`; **nothing here needs `MIN_APP_BUILD` to move.**
- **Migrations: none required** (everything is a join). Optional: index `personal_debts(user_id, counterparty_contact_id)` for the person endpoint; I'll ask before adding it, and at today's data size it isn't needed.

### 4. Order of work (BE effort, rough) and what the FE changes
| Step | BE | FE must change |
|---|---|---|
| A. `AccountRef` / `CategoryRef` / `EventRef` + `system_kind` + `transfer_peer` (#1, #2, #11) | ~1.5 d | tiles / detail read the embedded refs; delete the categories + accounts cache joins and the Home warm-up; twin + direction from `transfer_peer` / `system_kind` |
| B. `PersonRef` + live names (#3, #4, #14) | ~1.5 d | render `person.*`; drop the contacts-cache lookup in tx detail / debt detail; stop sending `person_name` for contact rows |
| C. people + person endpoint (#5, #6). **Do together with the 0.3.1-8 debts rework**: its "repayments tie to the person, net = debts − repayments" changes the same aggregation, so doing it twice is waste | ~1.5 d | rebuild debts list + person page on the two endpoints (biggest FE item); drop `listAll` |
| D. pending `resolved` + submit embeds + bulk discard (#7, #8) | ~1 d | pending page without the 3 lists; patch from the submit response; one discard call |
| E. `/me/counts` + `/unread-count` (#9) | ~0.5 d | badge + More hub; remove the 30 s list poll |
| F. `tag_ids` on create / update + `PUT …/tags` (#10) | ~0.5 d | quick create / edit send tags inline |
| G. small ones (#12, #13, goals icon, settings ref, board member ref) | ~1 d | drop the leftover lookups |

Total ≈ 7–8 BE days; every step ships alone and additive. A and B give the biggest drop for the least work and unblock the FE cleanup; C is the one that changes a whole page.

### 5. Owner questions
1. **Linked contact, which name?** Spec 07 §45 / 06 §2.5 say `contacts.display_name` (my label for them). The contacts module and the app today show the linked user's profile name instead (the stored `display_name` is only a stale snapshot for a later unlink). My recommendation: linked → the linked user's profile name (live, consistent with the contact list); unlinked contact → `contact.display_name`; no contact → snapshot; and send `person.label` (= `contact.display_name`) so the UI can show both if wanted. Lead's "my label for them" remark points the other way, so this needs the owner.
2. **People with only settled debts:** show them in the debts list (zero totals, greyed) or hide them as today? I'd show them under a "settled" filter.

Assumptions for FE-A to confirm: `parent_name` in `CategoryRef` (breadcrumb) is optional; the debts list needs only people, no flat debt list.

## 2026-10-12 — API spec v1 (OpenAPI 3.1, DRAFT for owner review) — no handlers changed
DONE · files: `chubi-pocket-be/internal/apidoc/{openapi.yaml,apidoc.go,apidoc_test.go}`, `cmd/api/main.go` (one route), `go.mod` (goccy/go-yaml now a direct dep) · go vet clean · `go test ./internal/apidoc/` ok (refs resolve, every op has summary / tags / operationId / x-used-by, path params declared, required keys exist) · migration: none yet (see Q1)

**Where / how**
- Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml` (embedded, converted to JSON once).
- Served at **`GET /api/v1/openapi.json`**, public, read-only, registered on the engine (not the versioned group, so an app build rejected with 426 can still read it). At serve time it injects `x-registered-routes` (what the server really registers under `/api/v1`) and `x-spec-routes` (method + path pairs in the spec) so the hub's coverage counter is exact.
- Format agreed with FE-A (chubi-pocket-81): `tags=[module]`, `components.schemas` with description + example, `x-breaking` (string), `x-used-by: [{page, calls}]`. Page slugs used: home, transactions-list, wallet-detail, category-detail, transaction-detail, quick-create-sheet, edit-transaction-sheet, split-editor, pending, more-hub, notifications-badge, settings-notifications, categories-list, contacts-list, contact-detail (+ touch-point pages: goals-*, budgets-list, scheduled-list, debts-list, debt-detail, event-detail).

**Contents:** 60 schemas, 32 operations. Shared first: `Uuid, Date, DateTime, Money, CurrencyCode, IconCode, Page, Error, AccountRef, CategoryRef, EventRef, TagRef, UserRef, PersonRef, MemberRef, TransferPeer, WalletBalance`. Then Transactions (list, create, get, update, delete, edit splits, **set tags**), Pending (list, create, update, delete, **discard**, submit), `GET /me/counts`, `GET /notifications/unread-count`, notification settings, categories (list, detail), contacts (list, create, detail with `include=unlinked_names`, update), dashboard, and touch-points (goals, budgets, scheduled, debts list / detail / people, event board rows).

**Rules written into the spec header:** clean shapes (no old-key compatibility); thin FE; no lookup lists; one person-name rule (nickname → linked user's profile name → contact display_name → snapshot only when there is no contact); every response key always present (null = none, arrays never null); money = JSON number; **every write returns the post-write balances of all wallets it touched** (`account_balances: [{account_id, balance}]`).

**Breaking changes (all need MIN_APP_BUILD = the 0.3.1-9 build)**
1. Transaction row (list / detail / writes): `account`, `category`, `project` become full refs (`AccountRef` with icon / type / group / archived; `CategoryRef` with `system_kind`; `EventRef`); `is_resolve` → `is_repayment`; `category_render` and `is_recurring` removed (the author's category is just `category`); new `transfer_peer`; `splits[].person` + resolved `person_name`; `account_balance_after` removed from the row.
2. `POST /transactions` / `PUT /transactions/:id`: response = `{rows[], account_balances[]}` (was a bare row / `{transfer_group_id, rows}`); request gains `tag_ids`, loses `project_id`.
3. `DELETE /transactions/:id`: returns `{id, account_balances[]}` (was `{success, message}`).
4. `POST /transactions/:id/tags` and `DELETE /transactions/:id/tags/:tag_id` **removed**; `PUT /transactions/:id/tags` replaces them.
5. `PUT /transactions/:id/splits`: `person_name` is ignored on a split that has a contact (the "rename on the same linked contact" path goes away); response = `Transaction`.
6. Pending: items gain `resolved`; `submit` → `submitted[] = {id, rows}`, `failed[] = {id, error, pending}`, top-level `account_balances` + `badges` (was `transaction_id`); `DELETE /pending-transactions/:id` returns `{discarded, skipped, remaining_count}`; new `POST /pending-transactions/discard`.
7. Contacts: `name` (resolved) + `nickname` added; flat `linked_user_display_name / _email / _icon_code` → `linked_user {id, display_name, email, icon_code}`; `icon_code` = resolved icon; `unlinked_names` on detail with `?include=`.
8. Categories: `system_kind` exposed; detail gets `is_fee_category` (no `/users/me` call).
9. Notification settings: `default_account_id` → `default_account` (`AccountRef`) in responses (request keeps the id).
10. Dashboard: `recent` = new Transaction rows; `top_categories[]` = `{category: CategoryRef|null, expense, count}`; `badges` added.
11. Touch-points: goals `linked_account` → `AccountRef` + `linked_account_balance`; budgets `category` → `CategoryRef`; scheduled `account` / `category` → shared refs; debts: `counterparty_person_name` removed from responses, `person: PersonRef` added (people rows: `display_name` + `icon_code` → `person`); event board rows gain `transaction_member`.
Additive only: `/me/counts`, `/notifications/unread-count`, `badges`, `resolved`, `include=unlinked_names`.

**Coverage note** (`go test -v -run Coverage ./internal/apidoc/` prints it): `main.go` registers 144 routes under `/api/v1`; 28 have a spec entry; **116 are not in the spec yet** and keep their current shape: accounts (all 17: CRUD, members, identifiers, summary, saving-allocations, adjust-balance, reorder …), auth (register / login / logout / password), users/me (+ deactivate / reactivate / packs), tags (CRUD), `GET /transactions/summary`, categories write routes (create / update / delete / reorder), budgets write routes + overview + `/:id`, saving goals write routes, scheduled (create / update / delete / pause / resume / cancel / generate-now / upcoming / history / `/:id`), personal debts writes (create / update / delete / cancel / settle / split-changes / split-requests), contacts actions (archive / restore / absorb / link-request flows / unlink / delete / sender-profile / unlinked-names), notifications (list / read / read-all / actioned / dismiss / delete), projects (everything except the board list: CRUD, members, bills, quick, link-requests, board writes, summary, tags, leave, transfer), slip import (scan-slip, parse-text, check, reset), payment-providers, app/version.
New in the spec, not built yet: `GET /me/counts`, `GET /notifications/unread-count`, `POST /pending-transactions/discard`, `PUT /transactions/{id}/tags`. Removed by the spec: the two tag attach / detach routes (counted in the 116 until they are deleted).
Outside this spec but covered by the balances rule (they move money): debt `settle`, `POST /projects/:id/bills` + `/projects/quick`, scheduled `generate-now`, `adjust-balance` (already returns the account).

**Questions for Lead / owner**
1. **Nickname does not exist.** `contacts.nickname` was dropped in migration 29 (merged into `display_name`). The decided rule needs it back → a migration (new nullable `contacts.nickname`) plus `nickname` on create / update. I wrote it into the spec; confirm the migration (breaking for nothing: data is disposable). If the owner meant "my label = `display_name`", the rule collapses to profile name → display_name → snapshot, and I'd drop `nickname` + `Contact.display_name` stays the label.
2. The two tag attach / detach routes are removed. OK, or keep them next to `PUT …/tags`?
3. Writes that move money but are outside this draft (settle, bills / quick create, generate-now): must they return `account_balances` in 0.3.1-9 too, or with their own pages? I assumed "when implemented / touched".
4. The openapi route is public (no token) and bypasses the version check, so the hub can read it from any build. Fine for prod too?
5. I kept both `GET /me/counts` (badges + More) and `GET /notifications/unread-count` (tiny poll), as in your list.

STOP: no handler code written; waiting for the owner's review in /#/dev.

### 2026-10-12 addendum — Lead's answers applied to the spec (still no handler code)
- Q2: the two old tag routes stay removed in the spec (`PUT /transactions/:id/tags` replaces them).
- Q3: spec now has 4 money-moving touch-points that gain only `account_balances`: `POST /personal-debts/{id}/settle`, `POST /projects/{id}/bills`, `POST /projects/quick`, `POST /scheduled-transactions/{id}/generate-now` (new schema `WriteBalancesTouch`). Spec = 36 operations now (apidoc tests pass).
- Q4: `GET /api/v1/openapi.json` is public locally and requires a logged-in user when `APP_ENV=production` (still outside the 426 version check). Only change in `cmd/api/main.go`.
- Q1 (nickname): waiting for Lead; no migration added.

### 2026-10-12 addendum 2 — nickname is back (owner answer to Q1)
- Migration **053** (`000053_contacts_nickname.up/down.sql`): `contacts.nickname VARCHAR(100)` (nullable) + `contacts.show_nickname BOOLEAN NOT NULL DEFAULT TRUE`. Files only: not applied anywhere, no handler code. Additive for the current schema; ships with 0.3.1-9.
- Spec: `Contact` returns `nickname`, `show_nickname` and the resolved `name`; create / update accept both; the name rule is written as one fragment (nickname if set AND shown → linked user's live profile name → `display_name` → snapshot only without a contact) in the header, `PersonRef` and `Contact`. The FE setting lives on the contact page.

## 2026-10-12 — API spec v2 (every reached page, TARGET shapes) — no handler code
DONE · `internal/apidoc/openapi.yaml` (version `0.3.1-9-draft2`) · 97 operations · go vet clean, `go test ./internal/apidoc/` ok · migration 053 (nickname) files only, not applied.

**Coverage.** `main.go` registers 144 routes under `/api/v1`; **92 have a spec entry**, 52 do not: all of them belong to pages not reached yet (budgets, saving goals, scheduled, debts writes, events / projects) except the two tag routes the spec REMOVES (`POST /transactions/:id/tags`, `DELETE /transactions/:id/tags/:tag_id`). The 5 new routes in the spec that do not exist yet: `GET /me/counts`, `GET /notifications/unread-count`, `POST /pending-transactions/discard`, `PUT /transactions/:id/tags`, `GET /transactions/form-options`.
`x-used-by` is optional now (the hub reads FE-A's page-flow registry); operationIds are stable — FE-A, rename nothing on your side without asking.

**New page-ready endpoints / merges (what the flows should say)**
| Page | On open | Per button |
|---|---|---|
| Home | `getDashboard` (1) — now carries `pending` (the รอยืนยัน block), `attention` (ต้องจัดการ) and `badges`; no accounts / categories / pending / notifications calls | — |
| Transactions list | `listTransactions` (1); rows are self-contained | filter sheet opens → `getTransactionFormOptions` (1, lazy) |
| Transaction detail | `getTransaction` (1): refs, tags, event, transfer twin, splits with persons, flags | `updateTransaction` / `deleteTransaction` / `setTransactionTags` / `editSplits` — each returns the final state (+ `account_balances`) |
| Quick create sheet | **`getTransactionFormOptions` (1, NEW)**: wallets (+ balance, default), categories (flat), tags, active events, fee category. Contacts are NOT in it: `listContacts` (1) only when the user opens the split editor | `createTransaction` (1, tags inline) or `createPending` |
| Pending | `listPending` (1, rows carry `resolved`) | `updatePending`, `deletePending`, **`discardPending`** (bulk), `submitPending` (returns rows + `account_balances` + `badges`); slip import: `checkSlips`, `scanSlip`, `parseText` (stub), `resetSlipHistory`, `listPaymentProviders` |
| Wallets list | `listAccounts` (1; `totals` inside) | `createAccount`, `reorderAccounts` |
| Wallet detail | **`getAccount?include=summary,members` (1)**: wallet + members + this month's totals; the members tab reads `members_history` from the same response | `updateAccount`, `archiveAccount`, `adjustAccountBalance`, `addAccountIdentifier`, `inviteAccountMember`, `removeAccountMember`, `transferAccountOwnership`, `updateAccountReportScope`; the tx list of the wallet = `listTransactions?account_id=` (1) |
| Categories | `listCategories` (1) | `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`; detail = `getCategory` (1, includes the fee flag, no `/users/me`) |
| Tags | `listTags` (1, with `usage_count`) | `createTag`, `updateTag`, `deleteTag` (`getTag` only if a detail page needs it) |
| Contacts | `listContacts` (1) | detail = `getContact?include=unlinked_names` (1); `createContact`, `updateContact` (nickname / show_nickname), `deleteContact`, `archiveContact`, `restoreContact`, `requestContactLink`, `unlinkContact`, `absorbContactNames`; link-request flows return contact + notification + badges |
| Notifications | `listNotifications` (1, items display-ready) | `markNotificationRead`, `markNotificationActioned`, `dismissNotification`, `readAllNotifications`, `deleteNotification` — each returns the item + fresh `badges` |
| Badge / More | `getMyCounts` (1) for More; `getUnreadCount` for the cheap poll (or fold into `getMyCounts`) | — |
| Settings | `getNotificationSettings` (1; `default_account` is a full ref) | `updateNotificationSettings`; the wallet picker uses `listAccounts` |
| Auth / me | `getMe` (1) after login; `getAppVersion` on boot / resume | `login`, `register`, `logout`, `changePassword`, `updateMe`, `deactivateMe`, `reactivateMe` |

**Notes for the owner's review**
- Dashboard (Home) grew two blocks (`pending`, `attention`) so Home really is one call; `attention` = unread / actionable notifications, newest 10 — FE-A to confirm that matches "ต้องจัดการ".
- Account shape is rebuilt (member `display_name` → `name`, `group`, `my_role`, `can_edit`, `is_me`); every wallet write returns the wallet; member actions return `{account, members}`.
- Every notification action returns the notification in its new state + `badges`; so does every link-request / invite action.
- `GET /users/me`: `preferences` is typed (`timezone`, `theme`, `language`, `fee_category_id`).
- Slip endpoints drop the `{success, message, data}` envelope (bare bodies like the rest); `parseText` is still the 0.3.2 stub.

**All operationIds (97)**

**Accounts**

| operationId | route |
|---|---|
| `removeAccountMember` | DELETE `/accounts/{id}/members/{member_id}` |
| `archiveAccount` | DELETE `/accounts/{id}` |
| `listAccountMembers` | GET `/accounts/{id}/members` |
| `getAccountSummary` | GET `/accounts/{id}/summary` |
| `getAccount` | GET `/accounts/{id}` |
| `listAccounts` | GET `/accounts` |
| `reorderAccounts` | PATCH `/accounts/reorder` |
| `acceptAccountInvite` | POST `/accounts/invites/{notification_id}/accept` |
| `rejectAccountInvite` | POST `/accounts/invites/{notification_id}/reject` |
| `adjustAccountBalance` | POST `/accounts/{id}/adjust-balance` |
| `addAccountIdentifier` | POST `/accounts/{id}/identifiers` |
| `inviteAccountMember` | POST `/accounts/{id}/members` |
| `transferAccountOwnership` | POST `/accounts/{id}/transfer-ownership` |
| `createAccount` | POST `/accounts` |
| `updateAccountReportScope` | PUT `/accounts/{id}/report-scope` |
| `updateAccount` | PUT `/accounts/{id}` |

**Auth**

| operationId | route |
|---|---|
| `login` | POST `/auth/login` |
| `logout` | POST `/auth/logout` |
| `register` | POST `/auth/register` |
| `changePassword` | PUT `/auth/password` |

**Categories**

| operationId | route |
|---|---|
| `deleteCategory` | DELETE `/categories/{id}` |
| `getCategory` | GET `/categories/{id}` |
| `listCategories` | GET `/categories` |
| `reorderCategories` | PATCH `/categories/reorder` |
| `createCategory` | POST `/categories` |
| `updateCategory` | PUT `/categories/{id}` |

**Contacts**

| operationId | route |
|---|---|
| `deleteContact` | DELETE `/contacts/{id}` |
| `getLinkRequestSender` | GET `/contacts/link-requests/{notification_id}/sender-profile` |
| `listUnlinkedNames` | GET `/contacts/unlinked-names` |
| `getContact` | GET `/contacts/{id}` |
| `listContacts` | GET `/contacts` |
| `acceptContactLinkRequest` | POST `/contacts/link-requests/{notification_id}/accept` |
| `createLinkedContactFromRequest` | POST `/contacts/link-requests/{notification_id}/create-linked-contact` |
| `linkExistingContactFromRequest` | POST `/contacts/link-requests/{notification_id}/link-existing-contact/{contact_id}` |
| `rejectContactLinkRequest` | POST `/contacts/link-requests/{notification_id}/reject` |
| `absorbContactNames` | POST `/contacts/{id}/absorb` |
| `archiveContact` | POST `/contacts/{id}/archive` |
| `requestContactLink` | POST `/contacts/{id}/request-link` |
| `restoreContact` | POST `/contacts/{id}/restore` |
| `unlinkContact` | POST `/contacts/{id}/unlink` |
| `createContact` | POST `/contacts` |
| `updateContact` | PUT `/contacts/{id}` |

**Dashboard**

| operationId | route |
|---|---|
| `getDashboard` | GET `/dashboard` |

**Me**

| operationId | route |
|---|---|
| `getAppVersion` | GET `/app/version` |
| `getMyCounts` | GET `/me/counts` |
| `listMyPacks` | GET `/users/me/packs` |
| `getMe` | GET `/users/me` |
| `deactivateMe` | POST `/users/me/deactivate` |
| `reactivateMe` | POST `/users/me/reactivate` |
| `changeMyPassword` | PUT `/users/me/password` |
| `updateMe` | PUT `/users/me` |

**Notifications**

| operationId | route |
|---|---|
| `deleteNotification` | DELETE `/notifications/{id}` |
| `getNotificationSettings` | GET `/notifications/settings` |
| `getUnreadCount` | GET `/notifications/unread-count` |
| `listNotifications` | GET `/notifications` |
| `readAllNotifications` | POST `/notifications/read-all` |
| `markNotificationActioned` | POST `/notifications/{id}/actioned` |
| `dismissNotification` | POST `/notifications/{id}/dismiss` |
| `markNotificationRead` | POST `/notifications/{id}/read` |
| `updateNotificationSettings` | PUT `/notifications/settings` |

**Pending**

| operationId | route |
|---|---|
| `deletePending` | DELETE `/pending-transactions/{id}` |
| `resetSlipHistory` | DELETE `/slip-imports` |
| `listPaymentProviders` | GET `/payment-providers` |
| `listPending` | GET `/pending-transactions` |
| `discardPending` | POST `/pending-transactions/discard` |
| `parseText` | POST `/pending-transactions/parse-text` |
| `scanSlip` | POST `/pending-transactions/scan-slip` |
| `submitPending` | POST `/pending-transactions/submit` |
| `createPending` | POST `/pending-transactions` |
| `checkSlips` | POST `/slip-imports/check` |
| `updatePending` | PUT `/pending-transactions/{id}` |

**Tags**

| operationId | route |
|---|---|
| `deleteTag` | DELETE `/tags/{id}` |
| `getTag` | GET `/tags/{id}` |
| `listTags` | GET `/tags` |
| `createTag` | POST `/tags` |
| `updateTag` | PUT `/tags/{id}` |

**Touch-point**

| operationId | route |
|---|---|
| `listBudgets` | GET `/budgets` |
| `listDebtPeople` | GET `/personal-debts/people` |
| `getDebt` | GET `/personal-debts/{id}` |
| `listDebts` | GET `/personal-debts` |
| `listBoardRows` | GET `/projects/{id}/transactions` |
| `getSavingGoal` | GET `/saving-goals/{id}` |
| `listSavingGoals` | GET `/saving-goals` |
| `listScheduled` | GET `/scheduled-transactions` |
| `settleDebt` | POST `/personal-debts/{id}/settle` |
| `quickCreateEvent` | POST `/projects/quick` |
| `addBillsToEvent` | POST `/projects/{id}/bills` |
| `generateScheduledNow` | POST `/scheduled-transactions/{id}/generate-now` |

**Transactions**

| operationId | route |
|---|---|
| `deleteTransaction` | DELETE `/transactions/{id}` |
| `getTransactionFormOptions` | GET `/transactions/form-options` |
| `getTransactionSummary` | GET `/transactions/summary` |
| `getTransaction` | GET `/transactions/{id}` |
| `listTransactions` | GET `/transactions` |
| `createTransaction` | POST `/transactions` |
| `editSplits` | PUT `/transactions/{id}/splits` |
| `setTransactionTags` | PUT `/transactions/{id}/tags` |
| `updateTransaction` | PUT `/transactions/{id}` |

### 2026-10-12 addendum 3 — spec v2 after FE-A's answers (still no handler code)
- Home to-do card rule written into the spec: `Dashboard.pending = {total, items(first 5)}`, `Dashboard.attention = {total, items(first 10)}` where rows = `dismissed_at IS NULL AND (read_at IS NULL OR awaits_answer)`, `total = max(unread badge total, matching rows)`. `Notification.is_actionable` is renamed `awaits_answer` with FE-A's exact rule (link request / invite not actioned; one-tap types; superseded and unsuggested ones excluded). The card's third group is the dashboard's own `upcoming` block.
- Dropped as duplicates / merged: `GET /accounts/{id}/summary` (use `getAccount?include=summary`), `GET /accounts/{id}/members` (use `?include=members`; `POST …/members` stays), `GET /tags/{id}` (the list has everything), `PUT /users/me/password` (the app uses `PUT /auth/password`). `GET /transactions/summary` stays (analytics; no reached page uses it yet).

## 2026-10-12 — API spec v2 IMPLEMENTED (93 ops + nickname + locked currency)
DONE · modules: transactions, accounts, categories, tags, contacts, notifications, users, auth, appversion, **me** (new), pending, imports, dashboard, + touch-points saving_goals, budgets, scheduled_transactions, personal_debts, projects · migration 053 (contacts.nickname / show_nickname; applied on the local DB) · `go vet ./...` clean · `go test -count=1 ./...` (TEST_DATABASE_URL set) all packages ok · deviations from the spec: 0 (the spec was adjusted where the code needed a status / key — see below). No commit, no deploy.

**How the code stays true to the spec**
- `internal/apidoc/conform.go`: `apidoc.Response(operationId, status, body)` / `Request(...)` validate a real body against the yaml (undocumented key, missing required key, null where none allowed, wrong type / enum / uuid / date all fail). Every handler test goes through `internal/apidoc/apitest` (`Engine`, `Do`, `Conform`).
- `TestSpecRoutesAreRegistered`: every operation in the yaml is a route `main.go` registers. 93 operations; `main.go` registers 144 − the removed routes; the routes not in the spec belong to pages not reached yet (budgets / goals / scheduled / events / debts writes).
- Shared building blocks: `internal/shared/{refs,writes,notification_view}.go` (refs + batch loaders, `PersonNameSQL`, wallet balances, badges, the display-ready notification).

**Route changes made in `cmd/api/main.go`**
Added: `GET /me/counts`, `GET /notifications/unread-count`, `GET /transactions/form-options`, `PUT /transactions/:id/tags`, `POST /accounts/:id/restore`, `POST /pending-transactions/discard`, `importsHandler.WithResolver(...)`. Removed: `PUT /users/me/password`, `GET /accounts/:id/summary`, `GET /accounts/:id/members`, `GET /tags/:id`, `POST /transactions/:id/tags`, `DELETE /transactions/:id/tags/:tag_id`. `GET /api/v1/openapi.json` needs a login in production.

**Changes to the spec while implementing** (all recorded in the yaml): 409 / 400 / 401 error responses found by the tests (notification state conflict, settings type not mutable, register conflicts, wrong password, link-request states, discard 400); `restoreAccount`; `AccountList` archived_count + totals breakdown; `MembersResult.account` nullable (leaving); `Category.depth` / `path`, `DeleteCategoryResult.reparented`, `listCategories?status`; `Contact.email` resolved, `SenderProfile.contact_id`; `Notification.awaits_answer` (FE rule); `Dashboard.pending / attention / badges`; `listBoardRows` + `pagination`; `SummaryGroup` account / category required; user-level currency; `settle` / `bills` / `quick` answer 200. Behaviour notes: `chubi-pocket-docs/design/api/api-v2-notes.md` (also linked from api-document.md and spec 04 / 07).

**Fixes found on the way:** notification list filter `from` / `to` returned 500 (ambiguous column); `reactivateMe` dereferenced the context user; an `update_tx` draft ignored `account_id` / `category_id` (presence flags) — now applied; `GET /payment-providers` no longer sends `created_at` / `updated_at`.

**Currency inventory (no change made beyond the owner's rule: user-level, locked, wallets take the user's)**
- Columns: `users.currency` (VARCHAR, default 'THB'), `accounts.currency`, `budgets.currency`, `personal_debts.currency`, `project_transactions.currency` (VARCHAR, no default). **No** currency column on `transactions`, scheduled transactions, saving goals (inherit the linked wallet's), projects, contacts.
- Responses carrying it: Profile / AuthUser / register (`currency`, user-level, locked); Account + AccountRef + `AccountList.totals.currency`; Transaction (`currency` = the wallet's else the user's, derived) and TransactionSummary / Dashboard (`currency` = the user's); budgets, personal debts (+ their notification payloads `split_created` / `split_changed`), saving goals (inherited), event board rows (`project_transactions.currency`). `/personal-debts/people` no longer sends a top-level `currency`.
- Risk to note: wallets created before 0.3.1-9 keep their own currency; `totals` only sums wallets in the user's currency (`other_currency_count` for the rest). Debts / budgets / board rows still copy a currency at creation (from the wallet or the user), unchanged.

**Open points for Lead**
- Spec says 200 for settle / bills / quick; before they were 201 (FE adopts when those pages are redone).
- `settle`'s `account_balances` only covers the caller's wallet (the creditor's auto-receive wallet is the other user's).
- `splits` on a transaction lists only the caller's debts while `split_count` counts the author's (shared wallet co-members).
- Pre-existing, untouched: `gofmt -l` still lists a few files with line-ending noise.

### 2026-10-12 addendum 4 — spec coverage 144/144 (routes documented as they are today)
The remaining 50 routes (events / projects, budgets, saving goals, scheduled, debts writes) are in the spec as they behave today (no behaviour change; legacy `{success, message}` envelopes and odd statuses are described, not fixed). Quirks the documentation recorded: unmapped plain errors answering 500 (project add-member variants, role owner, request-link on a linked member, project link-request accept/reject for a missing notification, budget scope/project consistency checks, debt update status=settled with settled_amount < amount), accept-split and project copy answer 201 even when the row existed, PUT/DELETE on a board row / member do not check the row against the project in the path, saving-allocations answers 400 ACCOUNT_NOT_OWNED. `x-used-by` is not used (FE registry). New operationIds:

- Budgets: archiveBudget (POST /budgets/{id}/archive)
- Budgets: createBudget (POST /budgets)
- Budgets: deleteBudget (DELETE /budgets/{id})
- Budgets: getBudget (GET /budgets/{id})
- Budgets: getBudgetsOverview (GET /budgets/overview)
- Budgets: restoreBudget (POST /budgets/{id}/restore)
- Budgets: updateBudget (PUT /budgets/{id})
- Debts: acceptDebtSplitRequest (POST /personal-debts/split-requests/{notification_id}/accept)
- Debts: applyDebtSplitChange (POST /personal-debts/split-changes/{notification_id}/apply)
- Debts: cancelDebt (POST /personal-debts/{id}/cancel)
- Debts: createDebt (POST /personal-debts)
- Debts: deleteDebt (DELETE /personal-debts/{id})
- Debts: updateDebt (PUT /personal-debts/{id})
- Projects: acceptProjectLinkRequest (POST /projects/link-requests/{notification_id}/accept)
- Projects: addProjectMember (POST /projects/{id}/members)
- Projects: copyProjectTransactionToPersonal (POST /projects/{id}/project-transactions/{pt_id}/copy)
- Projects: createProject (POST /projects)
- Projects: createProjectTransaction (POST /projects/{id}/project-transactions)
- Projects: deleteProject (DELETE /projects/{id})
- Projects: deleteProjectTransaction (DELETE /projects/{id}/project-transactions/{pt_id})
- Projects: getProject (GET /projects/{id})
- Projects: getProjectSummary (GET /projects/{id}/summary)
- Projects: leaveProject (POST /projects/{id}/leave)
- Projects: listProjectMembers (GET /projects/{id}/members)
- Projects: listProjectTags (GET /projects/{id}/tags)
- Projects: listProjects (GET /projects)
- Projects: markProjectTransaction (PUT /projects/{id}/project-transactions/{pt_id}/mark)
- Projects: rejectProjectLinkRequest (POST /projects/link-requests/{notification_id}/reject)
- Projects: removeBillFromProject (DELETE /projects/{id}/bills/{transaction_id})
- Projects: removeProjectMember (DELETE /projects/{id}/members/{member_id})
- Projects: requestProjectMemberLink (POST /projects/{id}/members/{member_id}/request-link)
- Projects: transferProjectOwnership (POST /projects/{id}/transfer-ownership)
- Projects: updateProject (PUT /projects/{id})
- Projects: updateProjectMember (PUT /projects/{id}/members/{member_id})
- Projects: updateProjectTransaction (PUT /projects/{id}/project-transactions/{pt_id})
- Saving goals: archiveSavingGoal (POST /saving-goals/{id}/archive)
- Saving goals: createSavingGoal (POST /saving-goals)
- Saving goals: deleteSavingGoal (DELETE /saving-goals/{id})
- Saving goals: getAccountSavingAllocations (GET /accounts/{id}/saving-allocations)
- Saving goals: restoreSavingGoal (POST /saving-goals/{id}/restore)
- Saving goals: updateSavingGoal (PUT /saving-goals/{id})
- Scheduled: cancelScheduled (POST /scheduled-transactions/{id}/cancel)
- Scheduled: createScheduled (POST /scheduled-transactions)
- Scheduled: deleteScheduled (DELETE /scheduled-transactions/{id})
- Scheduled: getScheduled (GET /scheduled-transactions/{id})
- Scheduled: getScheduledHistory (GET /scheduled-transactions/{id}/history)
- Scheduled: listScheduledUpcoming (GET /scheduled-transactions/upcoming)
- Scheduled: pauseScheduled (POST /scheduled-transactions/{id}/pause)
- Scheduled: resumeScheduled (POST /scheduled-transactions/{id}/resume)
- Scheduled: updateScheduled (PUT /scheduled-transactions/{id})

## Handoff 2026-10-13
**Unfinished / loose ends (none blocking):**
- Design docs: only `design/api/api-v2-notes.md` (+ links, spec 04 / 07 notes) describe API v2; the per-module specs (06 / 10 / 12 / 13) and `ux-overhaul-contract.md` still show the old shapes where they disagree (the yaml wins). Debts rework + people endpoints are 0.3.1-10 (not started).
- The 50 routes documented "as today" in the spec (projects / budgets / goals / scheduled / debts writes) were read from the code, not response-tested; their odd behaviours (500 for plain errors, 201 on re-accept / re-copy, `settle` / `bills` / `quick` now 200, `settle.account_balances` = caller's wallet only) are described, not fixed.
- `gofmt -l` still lists a few files with CRLF noise (not real diffs).

**Does `go test ./...` on :5433 wipe data? No.** There is no TRUNCATE anywhere, and no unscoped DELETE/UPDATE in the tests: every DB test creates its own throwaway users (random uuids, usernames `tdb_*` / `qct_*` / `evt_*`) and its own wallets / categories / debts, and removes them by those user ids in `t.Cleanup` (also when the test fails). It does INSERT rows into the live DB while it runs (briefly) and leaves nothing behind. Caveat: it still writes to the DB you point it at, a crashed run (kill -9) could leave `tdb_*` / `qct_*` / `evt_*` rows, and nothing guarantees every future test stays scoped. To be safe with the prod restore, use a throwaway DB in the same container:
1. `docker exec chubi_pocket_db psql -U chubadmin -d postgres -c "CREATE DATABASE chubi_test"`
2. migrate it (PowerShell): `docker run --rm --network chubi-pocket-be_default -v "<repo>/chubi-pocket-be/migrations:/migrations" migrate/migrate -path=/migrations -database "postgres://chubadmin:admin1234@db:5432/chubi_test?sslmode=disable" up` (check the network name with `docker network ls`; the compose `migrate` service uses the same image)
3. `TEST_DATABASE_URL=postgres://chubadmin:admin1234@localhost:5433/chubi_test?sslmode=disable go test -count=1 ./...` (unset = tests that need the DB SKIP silently; the default DSN IS the :5433 dev DB).

**Gotchas for the next BE:**
1. The OpenAPI yaml (`internal/apidoc/openapi.yaml`, 144 ops) is the source of truth; handler tests call `apitest.Conform(t, "<operationId>", status, body)` and fail on any undocumented / missing key. `TestSpecRoutesAreRegistered` ties spec ↔ `main.go`; `go test -v -run Coverage ./internal/apidoc/` lists routes missing from the spec. Rules: `internal/apidoc/IMPLEMENTING.md`.
2. The yaml mixes hand-written YAML-flow blocks and JSON-style blocks; a text edit that breaks either fails every apidoc test at once. In this shell a heredoc containing apostrophes / backticks breaks: write files with the Write tool, not `cat <<EOF`; `sed`/`node -e` with nested quotes is fragile too.
3. Shared building blocks live in `internal/shared` (`refs.go` batch loaders + `PersonNameSQL`, `writes.go` balances / badges, `notification_view.go`): the person name rule is ONE SQL fragment (nickname if shown → linked user's profile name → display_name → snapshot only without a contact); a contact split ignores a sent `person_name`.
4. Migrations: latest is 053 (contacts.nickname / show_nickname); currency is user-level and locked (`users.currency`, wallets take it, no migration was needed). The local DB must be at 053 or DB tests skip / fail.
5. Every money-moving write returns `account_balances` (`shared.LoadWalletBalances` after commit); keep that when adding writes. Bodies are bare (no `{success,message,data}`), keys always present, arrays `[]`.
6. Run `go vet` / `go test` with `TEST_DATABASE_URL` set (the release gate wants 0 SKIP); the apidoc tests take a few seconds because the 360 KB yaml is parsed per test binary.


## 2026-10-13 00:53 — 0.3.1-10 BE: debts (person ledger) + events
DONE · spec first in `internal/apidoc/openapi.yaml` (tags Debts / Events, version 0.3.1-10), then code · `go vet ./...` clean · `go test -count=1 ./...` with `TEST_DATABASE_URL` → 23 packages ok, 191 tests PASS, **0 SKIP**, 0 FAIL (run on the throwaway `chubi_test` DB at migration 055; the prod-restore DB on :5433 was not touched).
Nothing committed / deployed. The local BE (:8080) and its DB are still on build 55 / migration 053.

**Migrations (new, both breaking, the forced update covers it):**
- `000054_debt_person_ledger`: personal_debts → entries (`direction` paid | received, `date`, `paid`, `source_kind`; drops `settled_amount` / `status`). Data: owed_to_me → paid, i_owe → received; settled → paid label; every repayment tx becomes its own entry and stays its wallet side; cancelled debts and splits kept at 0 are deleted; `split_paid` notifications removed. Unique `transactions.source_personal_debt_id`.
- `000055_event_tags`: drops `projects.type`; new `event_tags`, `project_transaction_tags`, `project_my_tags`; free-text bill tags → event tags (first spelling per name per event); drops `project_transactions.tags`.
- Both tested up → down → up on a copy of the prod restore (6 debts → 6 paid split entries, 1 cancelled deleted; tags conversion checked with sample data). The down files are best effort.

**Debts (spec 12 §0)**
- New: `GET /personal-debts/people` (paged; q / all / side; `totals` = DebtTotals), `GET /personal-debts/people/:key`, `GET|POST /personal-debts/people/:key/entries`, `GET|PUT|DELETE /personal-debts/:id` (new shapes). Accept / apply return the entry + `person_balance` (apply: updated | deleted, no zeroed).
- Retired: `GET|POST /personal-debts`, `/cancel`, `/settle`, `split_paid` (no notice on pay / receive).
- An entry with a wallet owns ONE transaction: both directions are synced. The tx side keeps the Debt Paid / Received category (400 SYSTEM_TRANSACTION_IMMUTABLE), can't drop its wallet (400 DEBT_TX_NEEDS_WALLET), author only (403 DEBT_TX_AUTHOR_ONLY). Deleting either deletes both.
- Split-sourced entries edit only description / note / paid (409 ENTRY_MANAGED_BY_SOURCE). Deleting a split entry takes it off its bill and notifies a linked partner "removed".
- `Dashboard.debts` + `/me/counts.debts_summary` = DebtTotals; `open_debts` = people with something open (was open rows). Pending `settle_debt` submits as an opposite-direction entry for the target's person.

**Events (spec 10 §0; rev 2 asks A1–A5, A10, A11, A12)**
- `Event` rows: no type / currency; my tags; totals, my_net, flags. List: status / q / tag_id / sort. `GET /projects/:id/detail` = one call. The board nests splits and carries event tags, my_share, locked, linked, source_tx (owner only).
- Every write returns `EventPatch` (+ AddBillsResult / EventCopyResult / EventTagWriteResult variants). Create / quick / accept return EventDetail; delete / leave return `{id}`.
- Event tags CRUD + `POST /projects/:id/tags/import`. My tags = `PUT /projects/:id {tag_ids}` (any member, private).
- A pulled tx = a bill made from it. Money is linked both ways; tags (→ event tags by name) and texts are copied once; the tx gets `event_bill {event, bill_id, linked}`. A split labelled paid blocks the pull (422 TX_SPLIT_PAID).
- A7 delivered as `GET /transactions?can_join_event=true`. A8 dropped per Lead (add member keeps typed name / email; bad input is 400 now, was 500).

**FE contract delta (forward-ready)**
- Transaction: `is_repayment` + `source_personal_debt_id` removed → `counterparty {entry_id, key, person, direction, paid}`; new `event_bill`. Split: `key`, `paid`, direction paid | received; `settled_amount` / `status` gone. TransactionWriteResult + `person_balance`; DeleteTransactionResult + `debt_entry_id`, `person_balance`.
- Debts: all routes and shapes as listed above (fe-debt + fe-core briefed directly).
- Events: every project route's shape changed (fe-event + fe-core briefed). Notable: quick create answers 201 with `{detail, new_transaction_id, account_balances}`; DELETE bills/:tx answers 200 EventPatch (was 204); the board is parents-only with `children`; bills take `tag_ids` (no `tags` / `currency`).
- Errors: 403 FORBIDDEN_ROLE (was NOT_OWNER), 409 PROJECT_LOCKED (was 400), 409 PT_IS_CHILD (was 400), 409 OWNER_CANNOT_LEAVE (was 400), 400 SPLITS_EXCEED_AMOUNT (was SPLITS_EXCEED_PARENT), 422 NO_SHARE_TO_COPY (was 400 NOTHING_TO_COPY), plus the new codes in spec 10 §0 / spec 12 §0.

**My calls (flag if the owner disagrees)**
1. Linked bill money: only the source tx's owner may change a bill's amount / date; anyone else gets 409 BILL_MONEY_LINKED (otherwise another member would write my book). Deleting the source tx leaves the bill on the board, unlinked.
2. Event positions fixed: the payer's share = what the splits leave, so nets sum to 0. Before, a 300 bill split 100 / 100 showed the payer share 0 / net +300.
3. Deleting an event with bills is allowed now: personal txs are unlinked, not deleted (`PROJECT_HAS_TRANSACTIONS` is gone).
4. Old floating repayment txs keep their tx with `account: null`.

**Not done / on hold:** A6 resolve endpoint, A9 settlement, members as a tab (owner hold). The "create missing tags?" prompt of resolve / claim: the name-matching helper `projects.MatchPersonalTags` is ready; copies already auto-attach same-name tags.

**Docs:** spec 12 §0 (new), spec 10 §0 (new), spec 13 (split_paid retired), `design/api/api-document.md` (recent-additions lines §04 / §10 / §12), `design/api/api-v2-notes.md`.

**For DevOps / the next local build:** run migrations 054 + 055 on the local DB before the new BE starts (the old app build can't read the new shapes; the forced update covers prod). The throwaway test DB `chubi_test` (same container) is at 055 and can be reused.


## 2026-10-13 02:30 — 0.3.1-10 BE brief 2: events by prompt (A) + recurring (B)
DONE · spec first (`internal/apidoc/openapi.yaml`, tag Recurring + Events / Transactions deltas), then code · `go vet ./...` clean · `go test -count=1 ./...` with `TEST_DATABASE_URL` → 23 packages ok, 195 PASS, **0 SKIP**, 0 FAIL (throwaway `chubi_test` DB at migration 057; the prod-restore DB on :5433 was not touched).
Nothing committed / deployed.

**Migrations (new, breaking, the forced update covers it):**
- `000056_event_bill_link`: `project_transactions.linked_transaction_id` (FK transactions, ON DELETE SET NULL, unique), backfilled from payer + amount. The bill ↔ tx link is now explicit (it survives diverging amounts).
- `000057_recurring`: **drops `scheduled_transactions` and `transactions.scheduled_transaction_id` (old rows are NOT migrated, per the owner)**; new `recurring_rules`, `recurring_items`; notification types `recurring_due`, `recurring_ending`. Tested up → down → up on `chubi_test`.

**A. Events (owner answers to my 4 calls)**
- Call 1: any member with rights may edit a bill's amount / date. Mine with `also_update_link: true` changes my tx too; without it, the bill only. Another member's edit never touches my tx: I get `project_tx_changed` with `personal_transaction_id` ("อัปเดตตาม"). `409 BILL_MONEY_LINKED` dropped. The tx side: `PUT /transactions/:id {also_update_link}` changes the bill.
- Call 3: `DELETE /projects/:id?delete_linked_txs=true` → `EventDeleteResult {id, deleted_transaction_count, account_balances}`; `Event.linked_tx_count`.
- New: `DELETE /transactions/:id?also_delete_link=true` also deletes the bill made from it when I may edit the event (else it stays, unlinked) → result `bill_id`.

**B. Recurring (spec 11, rewritten; fe-recurrent plan rev 3 + owner changes)**
- Setting = the generator (daily / weekly with every N weeks + weekdays / monthly day or Nth weekday / yearly / hand-picked dates; end none / date / count, ≤ 2 years after the start; no end = horizon 3 months daily-weekly, 1 year monthly-yearly; extend).
- Items = own records linked to a pending draft or a real tx (same mechanism as event bills). Status from the link: upcoming / pending / done / not_created; archived = user flag; delete = real delete. Each item has `seq` (3/12) and an internal `slot` (its rule date), so an item can move dates without a duplicate.
- The due check runs inside `GET /me/counts`, `/dashboard`, `/notifications`, `/notifications/unread-count` and every recurring read. It only produces items of ACTIVE settings and one-offs (paused produce nothing). One pending draft each, exactly once (row locks). It sends ONE grouped `recurring_due` notice and a `recurring_ending` notice when 2 are left. Settings on an archived wallet auto-pause.
- "สร้างใหม่" (`POST /recurring-items/:id/create`): target pending | transaction, any field incl. the date (a future date → upcoming). Manual items. Bulk `POST /recurring-items/batch` edit / create / archive / restore / delete. Edits scope this / following / past / upcoming / all + `also_update_link` (no notification).
- Transactions: a future-dated create → one-off upcoming (`rows: []`, `upcoming`); an edit to a future date MOVES the row out (400 `FUTURE_DATE_NOT_ALLOWED` for transfers / debt / event-bill / others' rows); rows carry `recurring_item`; `DELETE ?also_delete_link=true` → `recurring_item_id`.
- Deleting a linked item: `?delete_linked_tx=true`. Deleting a setting: `?delete_linked_txs=true`.
- Scheduled module, routes and its me / dashboard counts are gone. `MeCounts.recurring {active_count, upcoming_count}`; the dashboard `upcoming` list reads the items.

**FE contract delta (forward-ready; fe-recurrent / fe-core / fe-event had the spec)**
- One change since the spec ping: requests use `RecurrenceRuleInput` (only `freq` required) and `RecurrenceEndInput` (only `kind` required). Responses keep the full `RecurrenceRule` / `RecurrenceEnd`.
- `/scheduled-transactions/*` removed; `PendingTransaction.source` gains `recurring` | `upcoming` with `source_ref {item_id, recurring, seq, total}`.
- Errors: 400 INVALID_RULE / END_TOO_FAR / ACCOUNT_NOT_FOUND / INVALID_CATEGORY / TAG_NOT_FOUND / FUTURE_DATE_NOT_ALLOWED; 409 INVALID_TRANSITION / ITEM_ALREADY_LINKED (batch: `details.ids`).

**My calls (flag if the owner disagrees)**
1. `also_update_link` on an item linked to a TRANSFER changes the item only (the pair is edited from the transaction).
2. Renaming a setting updates the description of items still showing the old name (an item without its own description shows the setting's name).
3. Resume on a setting whose wallet is archived → 400 ACCOUNT_NOT_FOUND. Restore puts a setting back as paused, not active.
4. A manual item dated today or earlier starts "ยังไม่สร้าง" (not auto-produced); dated later it is upcoming and the due check produces it on its date.

**Docs:** spec 11 (rewritten as Recurring), spec 10 §0.4, spec 13 §2.9 / 2.10 / 2.5a, spec 04 §2.6, `design/api/api-document.md` (§04 / §10 / §11 / §13 lines).

**For DevOps / the next local build:** run migrations 054 → 057 on the local DB before the new BE starts. The due check reads the recurring tables on every boot call, so the BE fails without 057. `chubi_test` is at 057.

**Next:** brief 3 (wallets `track_balance`, saving goals G1–G7, the agreed budget items), each spec first + an FE ping.


## 2026-10-13 — 0.3.1-10 BE brief 3: wallets track_balance, goals fix, budgets v2
DONE · spec first in `internal/apidoc/openapi.yaml`, then code · `go vet ./...` clean · `go test -count=1 ./...` with `TEST_DATABASE_URL` → 23 packages ok, 198 PASS, **0 SKIP**, 0 FAIL (throwaway `chubi_test` DB at migration 059; the prod-restore DB was only read: 1 personal yearly budget, which 059 converts).
Nothing committed / deployed.

**Migrations (new):**
- `000058_wallet_track_balance` — `accounts.track_balance` (default true). Additive.
- `000059_budgets_v2` — BREAKING for budgets.
  - New tables: budgets v2 + `budget_categories`, `budget_wallets`, `budget_periods`.
  - Personal v1 budgets → recurring budgets on their category (+ sub-categories), same period. Event-scope budgets are dropped.
  - Tested up → down → up.

**1. Wallets — `track_balance` (spec 03 note; fe-core pinged)**
- `Account.track_balance`. Create takes it (false = no opening balance).
- `PUT {track_balance: true, current_balance}` turns it back on in ONE call (an adjustment row when it differs).
- Adjust on an untracked wallet → 409 BALANCE_NOT_TRACKED.
- Untracked wallets are left out of `AccountList.totals` (counted in `untracked_count`), the dashboard net worth and card-due reminders.

**2. Saving goals (per Lead: % work stopped until goals v2; spec 09 note; fe-saving pinged)**
- A goal on an archived / given-away wallet shows the REAL wallet (live AccountRef, `archived: true`, that wallet's currency / balance). The "(archived)" / THB placeholder is gone.
- Every goal read / write answers the full `SavingGoal` schema (replaces SavingGoalTouch).

**3. Budgets v2 (spec 08 §0, rewritten; fe-budget + fe-core pinged)**
- Named tracker; scope all / categories (± sub-categories) / tag names / wallets, OR-matched.
- Recurring periods (`rule` daily|weekly|monthly|yearly × interval; end none|date|count) or one range (fixed / open until ปิดงบ).
- Each started period is stored with its own amount / note: `PUT /budgets/:id/periods/:period_id`.
- Setup edits take `apply` following | all.
- Sources:
  - USED = normal / recurring-linked txs + my share of event bills (once);
  - EXPECTED = upcoming recurring items + pending drafts (current period).
- Status over > warn (per-budget warn_pct, default 80, null = off) > pace > ok, with tone.
- Forecast: daily allowance, avg, forecast end / over date, history avg of 6.
- Routes:
  - `GET /budgets` (status / sort; hero counts)
  - `GET /budgets/:id` (one call: forecast, by_source, by_category, 6 periods, items)
  - `/periods`, `/items`, `/close`, `/archive`, `/restore`
  - DELETE → `{id}`
- The FE asks B1–B7 are covered by the v2 shapes: page-ready list + summary, BE status / tone, past periods, writes return the page, no currency field (user currency), spent = my_share via report scope, the full spec schema.

**FE contract delta**
- Wallets: `track_balance`, `current_balance`, `untracked_count`, 409 BALANCE_NOT_TRACKED.
- Goals: no shape change (SavingGoal spelled out); `linked_account` / `currency` are the real wallet's.
- Budgets: everything new. `/budgets/overview` is gone; `category_id`, `period`, `scope`, `project_id` and `currency` are gone.
- `Category.budget_count` now = budgets tracking the category; a delete takes it out of their scope.

**My calls on budgets (sent to Lead; flag any the owner disagrees with)**
1. Events: one "อีเวนต์" source per the decision (the mockup's claimed / unclaimed split dropped).
2. A mixed scope is OR. "everything" excludes system rows and debt entries' txs.
3. Tag names match my tx tags, a bill's event tags and my tags on the event.
4. Expected = upcoming + pending in the current period; open-ended looks 30 days ahead.
5. Pace shows even with ไม่เตือน; open-ended budgets get no pace chip.
6. Periods:
   - "following" keeps past periods (a rule change runs from the current period's start);
   - "all" re-amounts every period not set on its own, and a rule sent with all rebuilds from the start (per-period edits survive where the start date matches).
7. ปิดงบ = ends today; เก็บถาวร is separate.
8. Budget totals (Home tile / More) sum the current periods of active budgets, so overlapping budgets add up twice.

**Not built (by Lead):** goals หยุดนับ / paused state, header total, form-options, free %.

**For DevOps / the next local build:** run migrations 054 → 059 on the local DB before the new BE starts. `chubi_test` is at 059.


## 2026-10-13 — 0.3.1-10 BE: saving goals v2 (Lead brief, owner mockup goals-v2.html)
DONE · spec first (`openapi.yaml`, tag Saving goals; fe-saving + fe-core pinged), then code · `go vet ./...` clean · `go test -count=1 ./...` with `TEST_DATABASE_URL` → 23 packages ok, 198 PASS, **0 SKIP**, 0 FAIL (`chubi_test` at migration 060).
Nothing committed / deployed.

**Migration `000060_goals_v2` (breaking; up → down → up tested)**
- Goals drop `linked_account_id` / `allocation_pct` and gain `milestones` and `closed_at`; state is active | completed | archived. Old goals are kept with 0 saved.
- New `saving_entries` table: one wallet · from → to bucket · amount · date · note · source · group_id.
- `recurring_rules.type` gains `saving` + `goal_id`; `recurring_items.saving_entry_id`; pending kind `saving`.

**What it does (spec 09 §0, rewritten)**
- **Notebook, not transactions.**
  - Kinds: save (wallet available → spare / goal), withdraw (→ back to its wallet), move (spare / goal ↔ spare / goal).
  - Multi-wallet moves write one row per wallet under one group_id: largest-first auto-split, or explicit `splits` (400 SPLIT_MISMATCH).
  - A (bucket, wallet) never goes below 0 (409 INSUFFICIENT_SAVING + details.available), and that includes edits and deletes.
  - Saved above the wallet balance is allowed: a red flag only.
- **Wallets:** `Account.savings` {balance, saved, spare, available (null if untracked), saved_exceeds_balance, over_by, buckets}. Saving into an untracked wallet → 400 WALLET_NOT_TRACKED.
- **Goals:**
  - BE-computed figures: needed_monthly, pace_monthly (3-month net), eta_date, pace reached | on_track | late (+ late_months) | none, milestones, history (month-end balances), by_wallet shares.
  - Close {to: spare | wallets} → completed (every part goes to spare or back to its own wallet).
  - Delete / archive while holding money → 409 GOAL_HAS_SAVINGS. Saving into a goal that isn't active → 409 GOAL_NOT_ACTIVE.
- **Write results:** every write returns SavingWriteResult {entries, goals touched, spare, wallets' savings, goal_page | spare_page}. The two pages were added per fe-saving's ask (via Lead): one button = one call.
- **Recurring ออม:** a saving setting produces 🐷 pending drafts; submitting one makes a saving entry linked to the item; the goal page lists auto_save.
- **Home / More:** `/dashboard.saving_goals` and `/me/counts.goals` = SavingTotals {count, saved, in_goals, spare, available}.

**FE contract delta**
- Goals: all new shapes, built on fe-saving's proposal. Differences: a nested detail page, page-based entries paging, the `pace` enum, `actions` flags. `/accounts/:id/saving-allocations`, ALLOCATION_EXCEEDED and free % are gone.
- Wallets gain `savings`.
- Pending: kind `saving`, `draft.goal_id`, `resolved.goal`, `submitted[].saving_entry_id` (rows [] for a saving). New submit error codes MISSING_ACCOUNT, WALLET_NOT_TRACKED, GOAL_NOT_ACTIVE.
- Recurring: type `saving`, `goal_id` / `goal`, `RecurringItem.saving_entry_id`.

**My calls (flag if the owner disagrees)**
1. completed is a stored state set only by ปิดเป้าหมาย; reaching 100 % is pace=reached and stays active.
2. needed_monthly uses 30.44-day months, rounded up to the baht (the mockup's ฿5,500 vs the computed ฿5,571 looks hand-rounded). pace = net (withdrawals count).
3. Delete / archive need an empty goal (close first). Entries keep pointing at a deleted goal as a nameless goal.
4. Saving into an untracked wallet is refused (available makes no sense there).

**For DevOps / the next local build:** run migrations 054 → 060 before the new BE starts.
