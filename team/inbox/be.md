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

## 2026-10-20 — 0.4.0-2 BE: many auto-saves per saving goal + app test fixes
DONE · files: migrations/000067_goal_many_auto_saves.{up,down}.sql; internal/shared/recurrence/recurrence.go (the pure rule engine, moved out of recurring); internal/modules/recurring/{rule,model,writes,autosave}.go; internal/modules/saving_goals/{auto,model,service,handler}.go; cmd/api/main.go (2 routes); internal/apidoc/openapi.yaml; tests in saving_goals/goals_test.go and recurring/recurring_test.go · `go build ./...` + `go vet` clean · `go test -count=1 ./...` all packages ok, and the DB tests DID run (against a copy DB `chubi_pocket_test` on :5433, not the dev DB; 000067 up, down and up again were checked there).
- **Contract:** goal + spare pages get `auto_saves[]` ({id, amount, wallet, rule, start_date, end, next_date}); `auto_save` stays (first item, old shape, `next_date` may now be null). New `PUT /saving-goals/:id/auto-saves` (`setGoalAutoSaves`) and `/saving-goals/spare/auto-saves` (`setSpareAutoSaves`): body `{items:[...]}` replaces the set (id = update in place, keeps its marker; no id = add; unlisted = deleted; `[]` clears; `items` required; max 20). Old `PUT|DELETE .../auto-save` keep working (PUT = ONE monthly item, start today, first row kept). In `api-document.md`.
- **Producer:** per item, every occurrence from `start_date` to today, inside `end`, after `last_produced` → one saving draft (`ref.auto_save_id`); newest 12 per item per run; the goal must be active, the spare is always on. `month_plan` = Σ amount × occurrences in the current month.
- **Schema (000067):** `saving_auto` loses `day` / `last_month` and the unique (user_id, goal_id) index; gains `rule` / `end_rule` (JSONB, the API shapes), `start_date`, `last_produced`. Backfill: monthly, interval 1, `start_date = created_at::date`, marker inside last_month's month.
- **Engine:** `recurring.Rule` now embeds `recurrence.Spec`; its old methods are thin wrappers, so /recurring behaves as before (recurring tests pass).
- **App test fixes (same task):** the 18 failing app tests from the full run are fixed (stale expectations after the hero / picker-card changes, `CountMark` moved into `lib/ui` with a hub cover, `PickerData` hub cover, api_unused_baseline, hub smoke needsApp, item_picker); changed files re-run: 127 passed.
- **Notes:** legacy `PUT /auto-save` starts today, so day 5 set on the 20th makes no draft this month and `month_plan` is 0 this month (it used to be the full amount). The engine stops after 1000 dates from the start (a daily auto-save older than ~2.7 years would not reach today).
- **Needs a BE rebuild:** YES. Local BE was rebuilt and migrated to 067 by `scripts/local-deploy.sh` on 2026-10-20 (working tree, includes the other sessions' uncommitted budgets AND-scope change). VPS: migrate 067 and redeploy together; the old BE breaks on `saving_auto` once 067 is applied. NOTHING COMMITTED.

## 2026-10-20 — 0.4.0-2 BE plan (scan only, NO code yet): C1–C7
READ-ONLY scan (code + local dev DB; no edits, no tests, no rebuild). Waiting for the owner's "จัด" and the answers to Q1–Q14. New migrations take numbers 068+ in the order below. Nothing here touches 000067 (multi auto-saves, done).

**C1 — cut the one-off upcoming; a future tx stays a tx** · size L (the riskiest of the set)
- Remove: `transactions/recurring_link.go` (`isFuture`, `createUpcoming`, `moveToUpcoming`, `ErrFutureDateNotAllowed`, the two recurring-interface methods); `transactions/service.go` `CreateWrite` (~l.196) and `UpdateWrite` (~l.482): a future date just takes the normal create / update path; `recurring/writes.go` `CreateUpcomingTx` / `MoveToUpcomingTx` / `draftFromCreate` (~l.1083–1126); the delete-linked-tx-on-future-move in `UpdateItem` (~l.813); the `CreateNow` future branch; `Items(kind=one_off)` and the handler `kind` enum (service.go ~l.795, handler.go l.317); `produceTx` source `upcoming` (service.go ~l.234); pending `Source == "upcoming"` (pending/service.go l.380, readiness.go l.79); `POST /recurring-items` (one-off create, `CreateItem`) and its `Batch` op if only one-offs use it.
- `rule_id IS NULL` branches to drop (~10): recurring/service.go l.153, 778, 786, 794–796; recurring/summary.go l.191; budgets/count.go l.90; dashboard/store.go l.40; me/me.go l.137.
- Reads cut at today (a future tx must not count): accounts/enrich.go month flow (`BETWEEN first AND last` → `LEAST(last, today)`); balance readers: accounts/store.go, transactions/formoptions.go, shared/savings.go (x2), shared/writes.go, transactions/store.go:326; categories/month.go; budgets/count.go (`t.date BETWEEN $2 AND $3` also `<= today`); personal_debts, tags, dashboard totals, transactions/daily.go totals, reports. The transactions LIST itself still shows future rows.
- **Q1 ก (recommended): keep `accounts.balance` as is (the write path keeps applying every delta, future ones too) and give read-time "effective balance" = balance − Σ signed future tx** through ONE SQL helper (`shared.EffectiveBalanceExpr(alias, today)`) used by the ~6 balance readers; a future tx moves into the balance by itself on its day. Pro: no job; edit / delete unchanged. Con: every new balance reader must use the helper (I add a test that greps for raw `a.balance` reads); "today" is the user's TZ so the helper takes it as a parameter.
- **Q1 ข: deferred apply:** `ApplyBalanceDeltaTx` only when `date <= today`; new `transactions.balance_applied` (migration) + an apply-due step in `DueCheck` (runs on every recurring read, pull-to-refresh, /me/counts), and edit / delete / date move must know whether the delta was applied. Pro: `accounts.balance` is always the real one. Con: more write-path branches, balance lags until a DueCheck runs, backfill for existing future rows.
- **Q8 (does a future tx count as รอจ่าย in budgets?):** yes → a `'future_tx'` branch in `countSQL` (counts_as expected, `t.date > today`) while the main tx branch stays `<= today`; no → just the `<= today` cut. About S either way.
- **Q2 (existing one-off rows):** local dev has 4 one-off items (2 with a pending draft, 1 with a tx). Migration 068, `convert` (recommended): for each one-off item without a tx insert a real transaction at its date from `draft` (balance delta per Q1), delete its pending draft, delete the item; the item that already has a tx just loses the item. `delete` option: drop the items + their pending drafts. Afterwards `recurring_items.rule_id` is NOT NULL.
- API: remove `POST /recurring-items`, `kind=one_off`, the transactions response field `upcoming`, the `FUTURE_DATE_NOT_ALLOWED` code and pending `source: upcoming`. An old app that still sends a future date now simply gets a normal tx (no error).
- Risks: balance semantics (Q1) touch every money screen; a future tx edited to a past date or deleted must keep the helper honest; any report that sums `transactions` without a date cut would silently include the future (one test per reader). Sync fingerprints are unaffected.
- Tests affected: recurring_test.go (all `upcoming` / one-off / `FUTURE_DATE_NOT_ALLOWED` cases removed or rewritten), transactions (future create / move), accounts (balance + month flow), budgets, dashboard, me/counts, pending (source upcoming), sync, api spec ratchet. New: one future tx leaves balance, month flow, budget used and report totals unchanged today and correct on its day.

**C2 — the occurrence name becomes the tx description** · size M
- New `recurring/occname.go`: pure `OccurrenceName(rule, occDate, nextDate, seq, total, lang)`; used by `generateTx` / `Extend` (the only places that make items); `draftFromRule` stops copying `r.Description` (it keeps `Note`; description = the name). Language from the user's preferences JSON `language` (users/model.go), default th.
- Period names exactly as in the brief (daily "ประจำวันที่ 20 ต.ค. 2026", weekly "ประจำสัปดาห์ 20–26 ต.ค. 2026", every 2 weeks "ประจำ 20 ต.ค. – 2 พ.ย. 2026", monthly "ประจำเดือน ต.ค. 2026", every 3 months "ประจำ ต.ค. – ธ.ค. 2026", yearly "ประจำปี 2026", installments "งวด 5/12" before "ประจำ", English "Netflix – Oct 2026"). **Q7 (recommended yes):** `dates` rules → "ประจำวันที่ …"; weekly with several weekdays → named like daily; the LAST occurrence (no next) uses the normal step length.
- Named ONCE at creation; moving the date never renames. A rule rename reaches only items still on the auto name: `recurring_items.auto_name BOOLEAN NOT NULL DEFAULT TRUE` (migration 069); any manual edit of the tx / draft description sets it FALSE (`edited` can't serve: any field sets it). Backfill: unproduced items get `draft.description` = the new name with `auto_name = TRUE`; produced items (pending / tx) are left alone.
- API: no new field (the name is just `description`); openapi notes only. Month names via small th / en tables.
- Risks: names after a frequency edit (rebuild regenerates unproduced items, so they re-name); installment `seq/total` change on rebuild.
- Tests: recurring_test.go (draft description assertions), new occname_test.go (table test per frequency, th / en, last occurrence, dates), migration backfill test.

**C3 — data for the new recurring pages** · size L
- Month summary with REAL totals for any month: `GET /recurring-items/summary?month=YYYY-MM` (or `?month=` on the `GET /recurring` summary): pay, receive, item count, awaiting-amount count: new SQL over `recurring_items` ⨝ rules by `i.date` in the month INCLUDING produced items (today `summary()` / `dueWindow` only look 30 days ahead).
- Detail stats on `GET /recurring/:id` (`stats`): paid_total, remaining_total, last_period, avg / last / max amount, `series: [{period, amount}]` for the line chart: from produced items' tx amounts (`item.transaction_id`), remaining = unproduced items × amount.
- Pending filterable by recurring: `GET /pending-transactions?recurring_id=` (join via `recurring_items.pending_id`). NOT yet verified where the pending list parses its filters; I confirm when coding. Fallback: a per-rule `needs_action` list on the detail.
- No-end rules past the materialized horizon (Q3): **compute live (recommended):** `RuleItems(tab=upcoming)` / `Items(status=upcoming)` append virtual occurrences from `r.occurrences()` beyond `generated_until`, paged, flagged `virtual: true` (id = rule_id + date, materialized on demand); **or auto-roll + drop Extend:** DueCheck keeps `generated_until` ≥ today + horizon and `POST /recurring/:id/extend` becomes a no-op for old apps.
- Keep user-edited / skipped occurrences on edit / pause / archive (Q4 recommended yes): `dropUnproducedTx` (service.go l.109; called from Update l.435, Pause l.574, Archive l.620, DueCheck auto-pause) gets `AND NOT edited` (it already keeps `manual`, archived, produced); a rebuild re-matches kept rows by `slot`.
- Seq restart on rebuild: renumber `seq` of surviving + new items 1..N by date in one statement (new items restart at 1 today and collide with kept ones, so "งวด 5/12" would lie).
- Risks: summary cost (indexed by `idx_recurring_items_user_date`); virtual occurrences need a stable id if the app wants to act on them.
- Tests: recurring_test.go (summary any month, stats, kept edited items, seq renumber, virtual upcoming paging), pending filter test, api spec ratchet.

**C4 — saving goals: month plan for any month** · size S
- `GET /saving-goals?month=YYYY-MM`, `GET /saving-goals/:id?month=` and the spare: `goalViews(…, month)` uses it for `month_saved` (already `nets[month]`), `month_plan` (auto-saves: occurrences in THAT month, `autoSet.monthPlan` generalised; no auto-saves: `needed_monthly`), `month_short`; default = current month. Files: saving_goals/service.go (`goalViews`, `Spare`, `Get`, `List`), auto.go (`autoViews(today, month)`), handler.go (parse + validate `month`), openapi.
- Tests: goals_test.go (past / future month plan with many auto-saves, bad month → 400).

**C5 — budget items: each tag's icon_code** · size S
- `budgets.Item.Tags []string` stays (old apps); add `tag_refs: [{name, icon_code}]`: one extra query over `tags` by lower(name) for the page's rows. Files: budgets/service.go (item build ~l.335), model.go, openapi. Tag names with no personal tag (event / recurring tags) get `icon_code: null`.
- Tests: budgets_test.go (items with a tagged tx → tag_refs icon).

**C6 — docs + tests** · size S (rides on C1–C5)
- `internal/apidoc/openapi.yaml` + `design/api/api-document.md` per change; Go tests as listed per task. I will NOT run them until the owner says; then `go vet` + `go test` against the copy DB `chubi_pocket_test` (:5433), never the dev DB.

**C7 — only if Q14 ข: credit-card `month_in` counts transfers in as payments** · size S
- accounts/enrich.go month flow: for credit types add the in-row of transfers (2 rows per group_id; the in-row carries the card's `account_id`) to `month_in`; same in `GET /accounts/{id}/summary`. Risk: `month_in` then means "payments" on a card; a separate wire name (`payments_in`) is clearer if the app prefers.
- Tests: accounts tests (card with a transfer in this month).

**Order after "จัด":** C4, C5 (small, independent) → C1 (needs Q1 / Q2 / Q8) → C2 (068 / 069 order) → C3 (Q3 / Q4) → C6 tests + docs → C7 if chosen. Every migration goes onto the copy DB first; the dev DB and the VPS only when the owner says (BE rebuild / redeploy is never mine to start).

## 2026-10-20 — 0.4.0-2 BE plan v2 (RE-SCAN after Q1–Q14 answers; scan only, NO code): C1 / C2 / C3 (+ what C4–C7 now do)
READ-ONLY (code + local dev DB). Replaces the C1 / C2 / C3 sections of my first plan; C4, C5, C6, C7 stay as in that entry (C7 is ON: Q14 ข). Still waiting for "จัด".

**What the owner's Q3 model does to the code (the big picture)**
Today the whole recurring module is built on MATERIALIZED items: `generateTx` writes one `recurring_items` row per occurrence up to `generated_until`; `recurringViews` (counts / next / progress / ending_soon / current_occurrence), `itemViews`, `Items`, `RuleItems`, `summary` / `dueWindow`, `DueCheck`, budgets `countSQL`, dashboard `UpcomingItems`, me `upcoming_count`, `Extend`, `dropUnproducedTx` all read those rows. In the new model a row exists only when produced or user-edited / skipped; everything else is COMPUTED from the rule. So this is a rewrite of the item lifecycle, not a patch: C3 is now **XL**, C1 stays L, C2 gets simpler.

**Engine (shared/recurrence) — the one "compute + merge stored" function** · size L
- `recurrence.Spec` gains `Between(from, to, limit)` with ARITHMETIC fast-forward (daily / weekly / monthly / yearly jump to the first occurrence ≥ from) — today `Occurrences` walks from the start and stops at 1000 dates, so a daily rule older than ~2.7 years would never reach today; paging by year needs this anyway. Also `IndexOf(date)` → `seq` (computed, never stored from now on).
- `recurrence.LoadRules(ctx, q, userID, ids…)` (the rule-row scan moves out of `recurring/store.go`) and `recurrence.Expected(ctx, q, userID, from, to, filter) []Occ`: for every ACTIVE rule, Between(from, to) → left-merge the stored rows by (rule_id, slot): a stored row overrides amount / date / account / category / note / description and carries `item_id`, `state` (upcoming | pending | done | skipped); a skipped row (archived) is dropped from "expected"; a produced row is not expected (it is history); a stored row whose slot is no longer an occurrence stays (shown as an edited occurrence on its own date, Q4). Pure Go over two queries (rules, stored rows in range); no per-occurrence SQL.
- Every reader below uses it: budgets expected / รอจ่าย, dashboard upcoming, me `upcoming_count`, notifications, `/recurring-items?month=`, the detail upcoming tab, the list-row next date.
- Risk: the rule loader moves package (recurring keeps a thin wrapper, like `rule.go` today); cost per request = O(active rules × window), fine for tens of rules.

**C1 — cut the one-off, future tx stays a tx** · size L (unchanged scope + the Q answers)
- Removal list, `rule_id IS NULL` branches, today-cut readers: as in plan v1. Q1 ก: ONE helper `shared.EffectiveBalanceExpr(alias, today)` = balance − Σ signed future tx, used by accounts store, formoptions, shared/savings (x2), shared/writes, transactions/store.go:326; the cached `accounts.balance` and `ApplyBalanceDeltaTx` stay as they are. No `balance_applied` column.
- Q2 ข: migration 068 DELETES one-off items (`rule_id IS NULL`) and their pending drafts (`pending_transactions` rows whose id is a one-off's `pending_id`); a one-off that already has a tx keeps the tx (only the item goes). Then `recurring_items.rule_id` NOT NULL.
- Q8 ก: budgets `countSQL` gets a 'future_tx' branch (counts_as expected, source `"future_tx"`, `t.date > today` and `<= period end`), the main tx branch stays `<= today`. Budget item source values after: normal | recurring | event | upcoming | pending | future_tx (`upcoming` stays: it now means a COMPUTED recurring occurrence). The expected-recurring branch of `countSQL` is replaced by computed rows passed in as a JSON parameter (`jsonb_to_recordset($11)`) so the existing AND-scope filter in SQL keeps applying; the `pending` branch is unchanged.
- API: as in v1 (remove `POST /recurring-items` one-off create, `kind=one_off`, tx `upcoming` field, `FUTURE_DATE_NOT_ALLOWED`, pending `source: upcoming`).

**C2 — occurrence name = tx description** · size M → simpler than v1: NO `auto_name` column, NO migration 069
- `recurring/occname.go`: pure `OccurrenceName(rule, slot, nextSlot, seq, total, lang)` (period rules + Q7 special cases exactly as in the brief). Computed at PRODUCTION time (into the pending draft `description`) and when a computed occurrence is DISPLAYED (user language from preferences JSON `language`, default th). It uses the SLOT date (the original), so moving the date never renames it.
- A rule rename follows automatically for every unstored occurrence (the name is recomputed from the current rule name). A stored (edited) row keeps a `draft.description` ONLY if the user changed the name; the BE strips the auto name when it stores a row, so "has an override" = `draft.description` present. `draftFromRule` stops copying the rule's description (keeps note).
- Risks: an existing produced pending / tx keeps its old description (not touched); "last occurrence uses a normal step length" needs the next slot even for the final one (computed from the rule's step, not from the next row).

**C3 — recurring on the owner's model** · size XL
- **Migration 068 (one migration, in this order):** (1) delete one-off items + their pending drafts (Q2 ข); (2) add `recurring_rules.produced_until DATE` and backfill = max(date) of the rule's produced items, else `start_date − 1 day`; (3) delete every rule item that is unproduced AND unedited AND not manual AND not skipped (`produced_at IS NULL AND pending_id IS NULL AND transaction_id IS NULL AND NOT edited AND NOT manual AND NOT archived`), including those already due today — DueCheck re-creates them from `produced_until`; (4) `rule_id NOT NULL`. `recurring_items.seq` stays in the table for old rows but is no longer written (seq is computed).
- **DueCheck (service.go l.115):** per active rule, `Between(produced_until + 1, today)` → for each due slot: INSERT the stored row `(rule_id, slot, date)` with `ON CONFLICT (rule_id, slot) DO NOTHING` (the unique index `idx_recurring_items_rule_slot` already exists, so two parallel DueChecks cannot produce twice) → pending draft from rule + stored override, link `pending_id` → move `produced_until` to the last slot. Catches up ALL missed occurrences, not just today (cap suggestion: newest 24 per rule per run, like auto-saves cap 12; a rule created with an old start would otherwise flood — I need the owner's number). A stored row that is skipped produces nothing; an edited one produces with its stored values. The ending notice keeps working for rules WITH an end (left = computed remaining ≤ 2); `ending_notified` stays; no-end rules never notify (no `ending_soon`).
- **Produced rows stay**: pending_id → transaction_id (existing `OnDraftSubmitted` / `TxEditedTx` / `TxDeletingTx` keep working), so the history tab shows which tx each occurrence became.
- **`dropUnproducedTx` is deleted** (callers: Update l.435, Pause l.574, Archive l.620, DueCheck auto-pause). Rule edits touch only the rule; computed occurrences follow; stored ones stay (Q4 ก). **`generateTx` and `Extend` for the materialized horizon are deleted**; `POST /recurring/:id/extend` stays only as a thin "push the END out" for rules WITH an end (old apps), no item generation. `generated_until` / `total_count` stay for end rules only.
- **Addressing an unstored occurrence = rule_id + slot** (the original date). New: `PUT /recurring/{id}/occurrences/{slot}` (amount / date / skip / name / note / account … → upserts the stored row, returns the item), `DELETE …/{slot}` (skip ↔ `POST …/{slot}/restore`), `POST …/{slot}/create-now`, `POST …/{slot}/link {transaction_id}`. The existing `/recurring-items/{id}/…` calls keep working for STORED rows. Item JSON gets `rule_id`, `slot`, nullable `id` (null = computed, not stored), `stored: bool`; `Occurrence.item_id` (tx-form picker, `current_occurrence`) becomes nullable with `slot` next to it; link / unlink accept `{rule_id, slot}` and store the row on first use.
- **Reads:** `GET /recurring-items?month=YYYY-MM` = stored ∪ computed for that month (all pages, history included, so the app can total a month client-side — no month-totals endpoint). `GET /recurring/{id}` detail upcoming tab: no-end rules → `?from=YYYY-MM-DD&months=12` (default today, 12 months; "ดูปีถัดไป" = from + 12, "ไปที่เดือน" = any `from`), rules with an end → all occurrences, paged. `Recurring` rows: `next_date` / `next_amount` / `current_occurrence` computed; `counts.upcoming` and `progress.total` only for rules with an end (null for no-end); `ending_soon` only for end rules; new `avg_amount` (average of the rule's produced amounts, else the rule amount); optional `chain: [{slot, state}]` for installment rules with ≤ 60 occurrences. `summary()` / `dueWindow` switch to the merge function (30-day pay / receive / awaiting).
- **Pending filter** `GET /pending-transactions?recurring_id=` (join via `recurring_items.pending_id`); I still have to confirm where the pending list parses its filters (not found in pending/handler.go by the quick scan).
- **Sync:** the `recurring` dataset (rules list + next occurrence) stays synced; computed occurrences are NOT synced. `sync/fingerprint.go` adds the user's TODAY (user TZ) to the recurring fingerprint (the next date changes with the day without any write). The data hash for `recurring_items` stays by `updated_at` (stored rows only).
- **Risks:** (1) biggest: ~20 functions in recurring/service.go + writes.go change meaning, plus budgets / dashboard / me / pending readers, in one go; (2) a rule edit can leave a stored edited row on an old slot next to the new computed one (e.g. monthly day 5 → day 10: the edited Oct 5 stays and Oct 10 is computed) — accepted by Q4, flag if the owner dislikes; (3) DueCheck is a write inside reads (already so today) and now does more work after a long gap; (4) the engine fast-forward must be exactly equivalent to today's walk (a table test per frequency compares the two); (5) old apps that call `/recurring-items/{id}` for an occurrence that is no longer stored get 404 → the app side must move to the by-slot calls (A / B own that).
- **Tests affected:** recurring_test.go (nearly all of it: items, Extend, rebuild, one-off, upcoming, counts), budgets_test.go (expected / future_tx), dashboard + me tests (upcoming), pending tests (source upcoming, recurring_id filter), sync tests (fingerprint + today), api spec ratchet. New: engine Between table test (equals the old walk), DueCheck catch-up + idempotence (two runs), skipped / edited rows, stored row on a dropped slot, by-slot writes, month list merge, migration 068 on the copy DB (rows deleted, `produced_until` right, no double production after it).

**Migrations (final order):** 068 (one-off + unedited-future deletes, `produced_until`, `rule_id NOT NULL`) → nothing else for C1 / C2 / C3. (069 `auto_name` is DROPPED.) C4 / C5 / C7 need none. Down for 068 restores only the schema (deleted rows are not recreated; I'll say so in the file).
**Sizes:** engine L · C1 L · C2 M · C3 XL · C4 S · C5 S · C6 S · C7 S. **Order after "จัด":** C4, C5, C7 (independent) → engine + 068 → C3 (DueCheck, reads, by-slot writes) → C1 (future tx, balance helper, budgets) → C2 → C6 tests + docs (copy DB only; dev DB and the VPS only when the owner says).

## 2026-10-20 — 0.4.0-2 BE plan v3 (recurring leaves pending; linking kept; scan only, NO code)
READ-ONLY (code + local dev DB). Folds the owner's "REMOVE recurring from pending" into plan v2: it changes the C3 DueCheck / migration 068 parts and adds the confirm / skip / link-by-slot API; the rest of v2 (engine `Between` + `Expected`, C1, C2, C4–C7) stands. R19 (catch-up cap) is gone. Still waiting for "จัด".

**DueCheck stops producing (service.go l.115, `produceTx`, `generateTx`)**
- DueCheck no longer inserts pending drafts for recurring. What stays in it: the auto-pause of rules whose wallet is archived, `produceAutoSaves` (saving auto-saves are separate and still make 🐷 drafts), and the ending notice for rules WITH an end (left = computed remaining ≤ 2). `produceTx`, `generateTx`, `dropUnproducedTx`, `OnDraftSubmitted` for NEW drafts and the pending `source recurring / upcoming` handling (pending/service.go l.380, readiness.go l.79, `pending.counts.recurring`) go. Old recurring drafts are left alone (no migration): `OnDraftSubmitted` stays as a tiny no-op-safe hook so submitting an old draft still links its item.
- **"Due" is a computed state:** an occurrence with `date <= today` and no stored `done` / `skipped` row. Item states become: `upcoming` (computed) · `due` (computed, date ≤ today) · `done` (stored, has `transaction_id`) · `skipped` (stored, archived); legacy `pending` rows keep showing as `pending` until their draft is submitted or deleted.
- **Notification `recurring_due`** (RecurringDueTx, deep link /pending): no pending page entry any more → recommend DROP the due notice (the ต้องจัดการ card is the surface); keep `recurring_ending`. **Q-R22 for the owner:** keep a due notice at all?

**Lower bound for "overdue" (new owner question R23)**
With no production, every unrecorded past slot is overdue, so a rule typed with an old `start_date` would show a long overdue list (daily since last year = hundreds). Proposal: new `recurring_rules.tracked_from DATE` = the rule's creation date (the first slot ≥ it can be due); earlier slots are history-only (visible, never "due"; the user can still link a tx to one). **Q-R23:** is that right, or should overdue go back to the rule's `start_date` (with a bulk skip-all)? Recommended: `tracked_from = created_at::date`.

**Actions on an occurrence (rule + slot)** — all create / update the stored row on first use; one occurrence ↔ one tx (existing unique indexes `(rule_id, slot)` and `transaction_id`)
- `POST /recurring/{id}/occurrences/{slot}/confirm {amount?, date?, account_id?, …}` → creates the tx directly through `transactions.Create` (type / account / category / tags / note from the rule, description = the C2 occurrence name, amount = override else the rule's; unknown-amount rule with no override → 400 `AMOUNT_REQUIRED`), stores the row with `transaction_id`; returns the item + the tx + balances. **Q-R21:** default tx date = the SLOT date (recommended: books it in the right period; the app can send `date: today`) or today?
- `POST …/{slot}/skip` and `…/restore` (stored row, `archived = true/false`; restore on a row with no other override deletes the row).
- Bulk per rule: `POST /recurring/{id}/occurrences/confirm-ready` (every due, not-skipped occurrence whose amount is known; response lists created tx + the ones left out and why) and `POST /recurring/{id}/occurrences/skip-ready` (every due occurrence).
- `PUT …/{slot}` (edit amount / date / name / note / account → stored row) and `GET …/{slot}` as in v2.
- **Linking kept**, extended to rule + slot: `POST /recurring/{id}/occurrences/{slot}/link {transaction_id}` and `POST …/{slot}/unlink`; the old `POST /recurring-items/{id}/link|unlink` keep working for stored rows. Link rules: same type as the rule (`ErrValidation` today), tx not already linked, the occurrence not done / skipped; the tx KEEPS its own date and amount (early / late payment fine; no `edited` flag, `date` of the row = the slot); `amount_differs` + `rule_amount` stay in the result (the "update the rule's amount?" ask keeps working). Quick create with a rule picked stays two calls (create tx, then link by rule + slot); an existing tx is linked later from tx detail (`recurring_item_id` on the tx becomes `recurring: {rule, slot, item_id|null}`) or from the recurring side. **Unlink** returns the occurrence to its computed state: delete the row if it carries no other override, else only clear `transaction_id`. Deleting the linked tx behaves the same (`TxDeletingTx`; `also_delete_link` result keeps `recurring_item_id` when the row stays).

**Counts / reads the card and badges need**
- `GET /recurring-items?state=due|upcoming|done|skipped|all&month=&rule_id=&page=`: `state=due` = overdue + due-today occurrences (computed ∪ stored-edited, not done / skipped) PLUS this month's unknown-amount upcoming (R1) flagged `needs_amount`; `month=` = stored ∪ computed for that month (as v2).
- `GET /me/counts` `recurring`: `active_count`, `upcoming_count` (computed, next 14 days), NEW `due_count` (due / overdue) and `needs_amount_count`; `GET /dashboard`: `recurring_due {count, total}`; `pending.counts.recurring` dropped; `GET /recurring` `summary` gains `due_count` / `due_total`. Pending list `?recurring_id=` is no longer needed (A13 / B1 read the recurring API) — dropped from the plan.
- **Budgets / dashboard unchanged in meaning:** a due-unrecorded occurrence still counts as expected / รอจ่าย (source `upcoming`, now = computed), a future tx as `future_tx` (Q8 ก).

**Migration 068 (replaces v2's list; ONE migration, this order)**
(1) delete one-off items + their pending drafts (Q2 ข); (2) add `recurring_rules.tracked_from DATE` (backfill `LEAST(created_at::date, MIN(stored slot))`) — NOT `produced_until`; (3) delete every rule item that is unrecorded and unedited: `transaction_id IS NULL AND saving_entry_id IS NULL AND pending_id IS NULL AND NOT edited AND NOT manual AND NOT archived` (future AND due ones — due ones come back as computed `due`; the legacy `not_created` rows too); (4) `rule_id NOT NULL`. Legacy rows with a live `pending_id` and rows with a `transaction_id` stay. Down restores the schema only (deleted rows are not recreated).

**Sync:** unchanged from v2 (today added to the recurring fingerprint); the due state changes with the day, so the same fingerprint trick covers `due_count`.

**Risks (new / changed)**
(1) Overdue explosion without R23's lower bound. (2) `confirm-ready` creates many tx in one request: single DB transaction, all-or-nothing, balances returned. (3) Race: two confirms of the same slot → the `(rule_id, slot)` unique index makes the second one a 409 `ALREADY_RECORDED`. (4) Old pending recurring drafts keep living in the pending list until the owner clears them (accepted: not used for real). (5) The notice `recurring_due` removal changes the unread-badge numbers (A / B own the app side).
**Tests affected / new:** recurring_test.go (rewritten: due state, confirm with / without override, skip / restore, bulk, link / unlink by slot, link keeps date / amount, delete linked tx returns the occurrence, tracked_from lower bound), pending tests (no recurring source), me / dashboard counts (`due_count`), notifications (no `recurring_due`), budgets (`upcoming` computed + `future_tx`), sync fingerprint (today), migration 068 on the copy DB (due rows come back as computed, legacy pending untouched, linked rows untouched).
**Sizes:** C3 stays XL (a bit bigger: confirm / bulk / link-by-slot), engine L, C1 L, C2 M, C4–C7 S. **Migrations:** 068 only. **New owner questions:** R21 (confirm date: slot vs today), R22 (any due notice?), R23 (overdue lower bound: creation date vs start date).

## 2026-10-20 — 0.4.0-2 BE plan v3.1 (linking rules checked against v3; scan only, NO code)
READ-ONLY. The owner's linking rules (points 1–5 from นายA) checked against plan v3. v3 covered the basics; these are the gaps and what I add. Still one migration (068); no size change (inside C3 XL).

1. **One occurrence ↔ one tx; swap.** Today `Link` answers 409 `ALREADY_LINKED` when the occurrence or the tx is taken (link.go). Add `replace: true` to the link body (`POST /recurring/{id}/occurrences/{slot}/link {transaction_id, replace?}` and the old `/recurring-items/{id}/link`): in ONE DB transaction the previous tx is unlinked (the old tx stays, only the link goes) and the new one linked. If the NEW tx is already linked to another occurrence, `replace: true` moves it (that other occurrence returns to computed). Without `replace` the 409 stays and now carries `details: {linked_transaction_id, transaction: {id, amount, date, description}}` (or the other occurrence's `{rule_id, slot}`) so the app can ask "swap?" without a second call.
2. **The tx keeps its date / amount; the occurrence shows the tx amount.** v3 already keeps the tx untouched. Added: the item JSON of a linked occurrence has `amount` = the tx's amount (read from the join, not copied into the stored draft) and `transaction: {id, amount, date, description}`; `amount_differs` / `rule_amount` stay in the link result.
3. **Quick-create picker (two steps).**
   - Step 1 rules: `GET /recurring?sort=due&type=<expense|income|transfer>` (existing list + hint) gets `sort=due`: order by the nearest due occurrence, overdue first, then upcoming, rules with nothing due last; each row already carries `next_date` / `current_occurrence`; add `due_count` (overdue) per rule row.
   - Step 2 one rule's occurrences: `GET /recurring/{id}/occurrences?tx_date=YYYY-MM-DD&past=3&upcoming=3` returns overdue (all, capped 24 newest) + the recent `past` slots + the next `upcoming` ones, each `{rule_id, slot, date, state: due|upcoming|done|skipped, id|null, amount, transaction|null}`; computed + stored merged by the engine.
   - "Nearest" pick computed by the BE: the response has `suggested_slot` = the oldest overdue not-done occurrence, else the not-done occurrence whose slot is nearest `tx_date` (ties → the earlier one); null when none is free.
4. **Deleting either linked side — the app asks, the API takes the option (atomic):**
   - Delete tx + skip its occurrence: `DELETE /transactions/{id}?skip_occurrence=true` → deletes the tx and stores the occurrence as skipped in the same DB transaction. Plain `DELETE` (no param) = the tx goes and the occurrence returns to computed (due / upcoming again) — v3 behaviour. (`also_delete_link` stays for event bills only; for a recurring link it is replaced by `skip_occurrence`.) The result `recurring_item_id` / `recurring` says what happened.
   - Skip / delete an occurrence that has a tx: `POST …/{slot}/skip {delete_tx?: bool}` and `DELETE /recurring-items/{id}?delete_linked=true` (existing flag): with `delete_tx: true` the tx is deleted first (balances returned), then the row stored as skipped. Without it the tx stays and only the link goes (the row becomes skipped, `transaction_id` cleared).
   - Rule delete: existing `deletePreview` on `GET /recurring/{id}` (its linked-tx count now = stored rows with a `transaction_id`) + the existing `DELETE /recurring/{id}?delete_linked=true` (deletes the linked tx too); without the flag the tx stay and only the rule + its stored rows go.
5. **No auto-match suggestion** this round: nothing built for it; `suggested_slot` is only the "nearest" pick above, not a match score.
**Tests added to the v3 list:** link replace (swap), link of an already-linked tx (move), 409 details, picker occurrences + suggested_slot (oldest overdue, nearest to tx_date, none), `sort=due` order, tx delete with / without `skip_occurrence`, skip with / without `delete_tx`, rule delete with `delete_linked`.

## 2026-10-20 — 0.4.0-2 BE plan v3.2 (R20 / R21 / R23 answers + the "paid without a tx" state; scan only, NO code)
READ-ONLY. Folds the owner's answers into v3 / v3.1. Still ONE migration (068); C3 stays XL (a little more: rule-edit propagation + the `paid` state).

**States (final):** `upcoming` · `due` (overdue / due today) · `done` (stored row with `transaction_id`) · `paid` (cleared WITHOUT a tx, "แม่จ่ายให้") · `skipped` (stored, archived) · legacy `pending` (old drafts only). Wire enum for items: `upcoming | due | done | paid | skipped | pending`.
- **`paid` = a stored row with `cleared_at` set and no `transaction_id`** (new column `recurring_items.cleared_at TIMESTAMPTZ`, migration 068). It is not due, not expected, not an expense in budgets (nothing to count), and counts as paid for installment progress (`progress.done` = done + paid + the implicit ones below).
- **Occurrences before the rule's creation (`tracked_from` = `created_at::date`, R23 answered)** are `paid` IMPLICITLY: computed, no row, `stored: false`, never overdue, they count in installment progress; the user can still link a tx to one (the row is stored then).
- Actions: `POST …/{slot}/mark-paid` ("จ่ายแล้ว", stores the row with `cleared_at`; allowed on due / upcoming) and `…/unmark-paid` (deletes the row if it has no other override, else clears `cleared_at`). Link on a `paid` row sets `transaction_id` (state `done`, `cleared_at` kept); **unlink returns a row that has `cleared_at` to `paid` (never due), as the owner said**; a row that never had `cleared_at` (made by confirm / a direct link) returns to computed `due` / `upcoming` on unlink or on deleting its tx (v3.1). **Q-R24 for the owner:** is that last part right, or should ANY unlinked occurrence become `paid`? (my default: only rows that were cleared first.)
- Bulk per rule (all idempotent, one DB transaction): `confirm-ready` (due + known amount → tx, dated the occurrence date), `mark-paid-ready` (every due occurrence → `paid`), `skip-ready` (every due occurrence → `skipped`). The ready list is the rule's current `due` set; `tracked_from` already keeps it short.

**R21: confirm tx date = the OCCURRENCE (slot) date** (`transactions.date`, not `created_at`), overridable by `date` in the body (the sheet edits it). Settled; nothing else changes in `confirm`.

**R20: a rule edit asks ONE question** — `PUT /recurring/{id}` gets `also_update_tx: bool` (same pattern as `also_update_link` elsewhere):
- The question applies only when `name`, `category_id`, `account_id` (wallet), `tag_ids` or `note` change AND the rule has recorded tx. The app needs the count first: `GET /recurring/{id}` gets `recorded_tx_count` (stored rows with a `transaction_id`); no new endpoint.
- `also_update_tx = true`: for every recorded tx of the rule the BE updates ONLY those descriptive fields, through `transactions.Update` per tx (so a wallet change moves the balance correctly); NEVER date / amount. A name change rewrites a tx's `description` only if it still equals the AUTO name computed from the old rule name for that slot (a description the user edited is left alone); category / wallet / tags / note are overwritten. Result lists `updated_tx_count` and the ids that could not be updated with a reason (e.g. a transfer type, an archived wallet) — it never fails the whole rule edit.
- Date / frequency / amount changes never ask and never touch recorded tx; they act on future (computed) occurrences only; edited (stored) occurrences stay (Q4); and by R20-v1 an edited occurrence REPLACES the computed one of the same period (C2 period span, by SLOT).
- Risks: many `transactions.Update` calls in one request (single DB transaction, all-or-nothing per tx but the rule edit commits first; I'd run it AFTER the rule update commits and report partial failures); a wallet change on a tx that is part of a transfer / split / event bill is refused for that tx.

**Budgets / dashboard / counts with `paid`:** `paid` is not expected (no รอจ่าย) and not an expense; `due_count` excludes it; `upcoming_count` unchanged. Budget source values unchanged (normal | recurring | event | upcoming | pending | future_tx).

**Migration 068 (final, one file, this order):** (1) delete one-off items + their pending drafts; (2) add `recurring_rules.tracked_from DATE` (backfill `LEAST(created_at::date, MIN(stored slot))`), `recurring_rules.due_notified_until DATE` (backfill = the migration day), `recurring_items.cleared_at TIMESTAMPTZ`; (3) delete unrecorded + unedited rule items (`transaction_id`, `saving_entry_id`, `pending_id` all NULL, not edited / manual / archived) including legacy `not_created` rows; (4) `rule_id NOT NULL`. Down = schema only.
**Tests added:** mark-paid / unmark-paid, paid not due / not expected / counts in progress, implicit paid before `tracked_from`, link on paid, unlink of paid vs unlink of a confirmed row, mark-paid-ready + skip-ready, `also_update_tx` (fields only, auto-name rule, wallet change moves balance, date / amount untouched, partial failures reported), `recorded_tx_count`, confirm date = slot.
**New owner question:** R24 (unlink of a never-cleared occurrence: back to due, my default, or paid?).

## 2026-10-20 — 0.4.0-2 BE plan v3.3: C8 auto-create ("บันทึกอัตโนมัติเมื่อถึงวัน") delta (scan only, NO code)
READ-ONLY. Adds C8 on top of v3.2. Still ONE migration (068, three more columns). Size: **C8 = M** (C3 stays XL; C8 reuses the confirm path, so most of the cost is validation, the marker and the notice).

**Rule setting + validation**
- `recurring_rules.auto_create BOOLEAN NOT NULL DEFAULT FALSE` (read / write on `POST /recurring`, `PUT /recurring/{id}`, returned on the rule JSON as `auto_create`; plus read-only `auto_create_since: date|null` = the day it was switched on).
- Allowed only when the amount is FIXED (rule amount > 0; a "ใส่ทุกครั้ง" / reminder rule has none) and the rule has a wallet (`account_id`; a transfer also needs `to_account_id`, as today): otherwise 400 `AUTO_CREATE_NEEDS_AMOUNT` / `AUTO_CREATE_NEEDS_WALLET`. The same check runs on every later edit: clearing the amount or the wallet of a rule with `auto_create = true` is refused with the same codes (the app turns the switch off first). Types expense / income / transfer as the rule allows (saving rules no longer exist).

**Marker (no back-creation, no re-creation)**
- `recurring_rules.auto_created_until DATE`. Switching `auto_create` ON sets it to `today − 1` (user TZ), so an occurrence due today counts as "since" and anything due before the switch stays `due` in ต้องจัดการ; switching OFF leaves the value but DueCheck ignores the rule, and switching ON again resets it to `today − 1` (the off period is never back-created). Resume after a pause also resets it to `today − 1`, and **resume must set `tracked_from = today`** too (the paused gap is not overdue) — noted for C3, same migration.
- DueCheck (after the recurring work, before the notice): per ACTIVE rule with `auto_create`, lock the rule row (`FOR UPDATE SKIP LOCKED`), take the slots in `(auto_created_until, today]` from the engine (merged with stored rows), and for each:
  - stored `skipped` / `paid` / `done` → nothing; stored edited (not done) → use ITS stored values (amount, wallet, category, note …); computed → rule values;
  - create the tx through `transactions.CreateInTx` in the SAME DB transaction as the row insert (`INSERT … ON CONFLICT (rule_id, slot)`), dated the OCCURRENCE date, description = the C2 occurrence name, the row stored as `done` with `transaction_id` and `auto_created_at = now()` — exactly the confirm path (one shared `recordOccurrenceTx`, used by `confirm`, `confirm-ready` and auto);
  - then `auto_created_until = today`. A slot whose tx creation fails (archived wallet, validation) is left `due` (and counted as "not created" in the log); it is NOT retried by auto later (marker moved on) — the user finishes it in ต้องจัดการ.
- No re-creation: the marker only moves forward; deleting an auto-created tx returns the occurrence to `due` / `upcoming` (v3.1; `skip_occurrence` option) and auto never recreates it. Two parallel DueChecks cannot double-create (row lock + the `(rule_id, slot)` unique index).
- Because DueCheck runs on reads (list / detail / dashboard / me / notifications / sync), the tx appear when the user next opens the app, dated the day they were due; no clock job.

**Notice:** new notification type `recurring_auto_created`, ONE grouped notice per user per day (upsert by user + type + date; count accumulates, no unread-badge bump beyond the one row), payload `{count, date}`, text "บันทึกอัตโนมัติ N รายการ" (app side). Proposed deep link `/recurring?focus=auto` (ภาพรวม shows a "บันทึกอัตโนมัติล่าสุด" strip). That strip reads `GET /recurring-items?state=done&auto=true&since=YYYY-MM-DD`; every item JSON also gets `auto_created: bool` (from `auto_created_at`).

**Migration 068 additions:** `recurring_rules.auto_create BOOLEAN NOT NULL DEFAULT FALSE`, `recurring_rules.auto_created_until DATE`, `recurring_items.auto_created_at TIMESTAMPTZ`; notification type enum / check if the table constrains `type` (to verify when coding).
**Fields:** rule JSON `auto_create`, `auto_create_since`; item JSON `auto_created`. **Endpoints:** no new write endpoint; one new filter (`auto=true`, `since=`) on `GET /recurring-items`. **Errors:** `AUTO_CREATE_NEEDS_AMOUNT`, `AUTO_CREATE_NEEDS_WALLET`.
**Risks:** (1) money moves without a tap: an expense can push a wallet negative (the same rule as a manual tx: today a tx may overdraw an untracked / credit wallet; I follow `transactions.Create`'s checks and leave a refused slot `due`); (2) an edited occurrence is honoured, so a stale edit creates its stale values (accepted; that is what "edited" means); (3) the notice depends on a DueCheck run, i.e. the first app open of the day; (4) CreateInTx inside the recurring DueCheck transaction couples the two modules' locking (balance row locks) — one rule per transaction to keep locks short.
**Tests:** validation (amount / wallet / transfer / edit that clears them), switch ON then slot due today vs before the switch, edited / skipped / paid / done slots, tx date = slot date + name, marker moves and no re-creation after deleting the tx, parallel DueChecks (no double), a failing slot stays due, resume resets the marker and `tracked_from`, grouped daily notice (count accumulates, one row), `auto=true` filter + `auto_created`, openapi conformance.

### 2026-10-20 — plan v3.3 correction (นายA-fe, owner)
C8 notice deep link is plain `/recurring` (ภาพรวม opens on this month's list); the `GET /recurring-items auto=true&since=` filter is DROPPED (the month list already shows auto-created rows as paid rows tagged by `item.auto_created`). Everything else in v3.3 stands.

## 2026-10-20 — 0.4.0-2 BE: C4 (goals ?month=) + C5 (budget item tag icons) landed — CODED, not run, not deployed
DONE · files: saving_goals/{service,auto,handler,writes}.go, budgets/{service,model}.go, internal/apidoc/openapi.yaml, tests saving_goals/goals_test.go (`TestGoalMonthParam`) + budgets/budgets_test.go (tag_refs assertions inside `TestBudgetTagRangeWithEvent`) · `go build ./...` + `go vet` clean · tests NOT run (the owner said no Go test runs; docker / the DB is stopped at the owner's request). Needs a BE rebuild: YES (no migration for C4 / C5).

**C4 contract — `GET /saving-goals?month=YYYY-MM` and `GET /saving-goals/{id}?month=YYYY-MM`**
- `month` optional (default = this month in the user's TZ); anything that is not `YYYY-MM` → 400 `VALIDATION_ERROR`.
- It sets the month for `month_plan`, `month_saved`, `month_short` of every goal, and for the list `summary` month totals (`month_plan_total`, `month_saved_total`, `month_short_total`). `month_saved` = net saved in THAT month (history already stored per month).
- `month_plan`: a goal WITH auto-saves = Σ amount × the occurrences of each item that fall in that month (a daily rule counts every day of the month, a monthly one once, a rule that has not started or has ended counts 0 in that month); a goal without auto-saves = `needed_monthly` whatever the month (a rate, not a calendar fact). Closed goals still get `month_plan: null`.
- The spare (`GET /saving-goals/spare`) has no `month_plan`, so it takes no `month` param. Writes keep returning this month's numbers.

**C5 contract — budget items: `tag_refs`**
- Every `BudgetItem` (in `GET /budgets/{id}` `items`, `GET /budgets/{id}/items`) gets `tag_refs: [{name, icon_code}]`, same order as `tags`; `icon_code` is the icon of the user's own tag with that name (case-insensitive), `null` for a name that is not one of the user's tags (event / recurring tags). `tags: [string]` is unchanged.
- Note for C3: the item's `recurring` link in budget rows currently resolves through `recurring_items` ids; it is reworked when computed occurrences land (rows without a stored id get `item_id: null` + `rule_id` + `slot`).

## 2026-10-20 — 0.4.0-2 BE: C1 landed (future tx stays a tx; one-off upcoming removed) — CODED, tests NOT run, not deployed
DONE · files: shared/future.go (new: `TodaySQL`, `SignedTxSQL`, `FutureDeltaSQL`, `EffectiveBalanceSQL`), shared/{savings,writes}.go, accounts/{store,enrich}.go, categories/month.go, transactions/{recurring_link,service,model,handler,store,daily,formoptions}.go, recurring/{writes,service,summary,handler}.go, budgets/{count,model,handler,service}.go, dashboard/store.go, me/me.go, migrations/000068_recurring_computed_occurrences.{up,down}.sql (C1 part), openapi.yaml, tests recurring_test.go (rewritten future-tx block + `shownBalance` helper) and budgets_test.go (`TestBudgetFutureTransactionIsExpected`) · `go build ./...` + `go vet ./internal/...` clean · tests NOT run (owner: no Go test runs). Migration 068 (C1 part: delete one-off items + their pending drafts, `rule_id NOT NULL`) applied up / down / up on the COPY DB `chubi_pocket_test` only; dev DB is still at 067. Needs a BE rebuild AND migration 068 (it keeps growing: C3 / C8 add steps to the same file).

**Contract (what the app sees)**
- `POST /transactions` and `PUT /transactions/{id}` with a date after today (user's TZ) are now PLAIN transactions: `rows` has the row(s); the response no longer has `upcoming`; `FUTURE_DATE_NOT_ALLOWED` is gone (transfers, debt entries and event bills may carry a future date too). The row stays in `GET /transactions` (the list shows future rows).
- Everything that counts stops at today: wallet `balance` (Account.balance, `account_balances` in write results, form-options wallet balances, saving "available") = cached balance − Σ future tx of that wallet (one SQL helper, `shared.EffectiveBalanceSQL`; `accounts.balance` itself still holds the future deltas, so the number moves into place on the day by itself); wallet month flow (`month_in` / `month_out`) and account summary, category month figures, `GET /transactions` `totals` + daily series, `GET /transactions/summary` (dashboard, reports), budget `used`. The list's pagination `total` still counts future rows.
- Budgets: a future-dated expense inside the current period is `counts_as: expected`, `kind: "transaction"`, new source value `"future_tx"` (also a `by_source` row and `?source=future_tx` on the items call); `upcoming` stays and now means an unproduced recurring occurrence only. It becomes `used` (source normal / recurring) from its day.
- Removed: `POST /recurring-items` without `recurring_id` (400 `VALIDATION_ERROR`; `recurring_id` is now required: it only adds an extra occurrence to a setting), `GET /recurring-items?kind=one_off` (400), the `upcoming` field of TransactionWriteResult, pending source `upcoming` is never produced any more.
- Unchanged for now (C3 reworks them): rule items, DueCheck, `Extend`, pending drafts of rules.

**Notes / risks**
- A wallet's shown balance uses the OWNER's timezone in write results (`LoadWalletBalances` has no caller id) and the caller's timezone on reads; they differ only around midnight for a shared wallet across timezones.
- NOT done (said I would): a test that greps for raw `a.balance` reads. Balance readers I changed: accounts List / GetByID / getAnyMember, form-options, LoadWalletSavings, LoadSavingTotals, LoadWalletBalances; left on the cached value on purpose: `GetAccountBalanceTx` (integrity under lock), RETURNING of account insert / update.
- Sync: the accounts and recurring datasets already hash the user's today, so a future tx arriving on its day re-syncs them.

## 2026-10-20 — 0.4.0-2 BE status + proposed split of the remaining work (the owner asked นายA to split it)
**Landed (coded, build + vet clean, tests NOT run, nothing deployed):** C4 (goals `?month=`), C5 (budget item `tag_refs`), C1 (future tx stays a tx, effective balance helper, budget `future_tx`, one-off removal; migration 068 C1-part). Earlier: multi auto-saves + migration 067 (deployed locally). Details: the entries above.
**Remaining:** C2 (names), C3 (computed occurrences, XL), C8 (auto-create), C7, C6 (openapi / api-document / tests). C3 + C8 + the core of C2 are one tightly-coupled rewrite inside the `recurring` package (service.go, writes.go, link.go, summary.go, handler.go, ~4000 lines): I keep THAT. These pieces are separable and can go to other sessions NOW (each only touches the files named; none edits `recurring/*.go` except where stated):

1. **E-engine (small-medium): `internal/shared/recurrence/recurrence.go` + new `recurrence_test.go`.** Add `func (r *Spec) Between(from, to time.Time) []time.Time`: the occurrences with from <= d <= to that are inside the end (end date / count via `GeneratedUntil` after `Limits`, `dates` freq filtered), with ARITHMETIC fast-forward for daily / weekly / monthly / yearly (jump to the first period that can hold `from`; do not walk from the start; no 1000-date cap in the jump). It must equal `Occurrences(...)` filtered to [from, to] for every freq (table test over daily / weekly with weekdays / monthly day + nth weekday / yearly / dates / count end / date end, intervals 1 and 3, start years back). I use it as `Spec.Between`.
2. **C2-name (small): new `internal/modules/recurring/occname.go` + `occname_test.go`** (pure, no DB): `func OccurrenceName(in OccNameInput) string`, `type OccNameInput struct { RuleName, Freq string; Interval int; Weekdays []int; Slot time.Time; Seq, Total int /* Total 0 = no installment */; Lang string /* "th" | "en" */ }`. Thai / English formats exactly as in the brief (daily "ประจำวันที่ 20 ต.ค. 2026"; weekly "ประจำสัปดาห์ 20–26 ต.ค. 2026"; every 2 weeks "ประจำ 20 ต.ค. – 2 พ.ย. 2026"; monthly "ประจำเดือน ต.ค. 2026"; every 3 months "ประจำ ต.ค. – ธ.ค. 2026"; yearly "ประจำปี 2026"; installments put "งวด 5/12" before "ประจำ"; English "Netflix – Oct 2026" style; Q7: `dates` and weekly-with-several-weekdays are named like daily; the span is sized from the FREQUENCY (slot + step), never from the next row, so the last occurrence is normal). Gregorian years (2026). Output = "{RuleName} {…}".
3. **Readers (medium): wire budgets / dashboard / me to a shared contract I just added: `internal/shared/expected.go` (`ExpectedOccurrence`, `Expecter.ExpectedBetween(ctx, userID, from, to)`).** Each module gets `WithExpected(e shared.Expecter)`; when set it replaces its recurring-items SQL, when nil it keeps today's SQL (so nothing breaks before my C3 lands): (a) budgets: `count.go` recurring_item branch → computed rows passed as a JSON parameter into the CTE (`jsonb_to_recordset`) so the AND-scope filter keeps applying; the row keeps `kind: recurring_item`, source `upcoming`, counts_as expected, `item_id` (stored id or null), plus `rule_id` / `slot` on the item JSON (openapi + `BudgetItem.recurring` link accept a null item id); (b) dashboard `UpcomingItems` (next 14 days, Due = false only); (c) `me` `upcoming_count` (next 14 days) + NEW `due_count` (Due = true) + `needs_amount_count` (Amount == 0, this month). Wiring in `cmd/api/main.go` is mine at the end (`recurringService` is passed in).
4. **Notifications (small): `internal/modules/notifications`:** `RecurringDueTx` deep link → `/recurring?focus=due`; new type `recurring_auto_created` with `RecurringAutoCreatedTx(ctx, tx, userID, count int, date string)` = ONE grouped notice per user per day (upsert by user + type + date, count accumulates), payload `{count, date}`, deep link `/recurring`; check whether the `notifications.type` column has a CHECK / enum that needs a value in migration 068 (tell me the line to add; I own that file).
5. **C7 (small): `accounts/enrich.go` + `GET /accounts/{id}/summary`:** a credit-card wallet's `month_in` counts transfers IN as payments (a transfer is 2 rows per `transfer_group_id`; the in-row carries the card's account_id and category system_kind TRANSFER_IN); keep the future-tx cut I added (`last` capped at today); openapi + a test in accounts tests.
6. **C6 later (after I land C3 / C8):** whoever is free writes `design/api/api-document.md` + openapi review + the tests for items 1–5; I do the recurring ones.
**Mine (C3 + C8 + C2 integration):** migration 068 rest (columns `tracked_from`, `due_notified_until`, `auto_create`, `auto_created_until`, `cleared_at`, `auto_created_at`; deletes), occurrence merge + states, DueCheck (no production, due notice, auto-create), item / rule views + `stats`, by-slot writes (confirm / skip / restore / mark-paid / link / unlink / bulk / edit), `Expecter` implementation, tx-delete options, `also_update_tx`. Contracts stay as in plans v3 – v3.3 + the answers sent to B-fe / A-fe.

### 2026-10-20 — split approved (นายA-fe, owner: "แบ่งตามนี้ ลงมือเลย", no new scan round)
- 1 engine `Spec.Between` → นายD (chubi-pocket-e2)
- 2 `occname.go` + 4 notifications → นายB-fe
- 5 C7 + 3 readers (`WithExpected`) → นายE (chubi-pocket-ea)
- 6 C6 (api-document + openapi review + tests for 1–5) → นายA-fe, after C3 / C8 land
- นายC keeps C3 + C8 + the C2 integration + the 068 file.
- Rules for all: go build + vet only; no Go test runs, no commits, no BE / docker rebuild; migration lines go to นายC. Each one reports in their own inbox file and pings นายA + นายC.

## 2026-10-20 — 0.4.0-2 BE: C3 + C8 + C2 integration landed (computed occurrences) — CODED, tests NOT run, NOT deployed
DONE · `go build ./...` + `go vet ./...` clean (all packages incl. test files) · tests NOT run (owner / A: no Go test runs yet) · migration 068 (final) applied up / down / up on a fresh COPY of the dev DB (`chubi_pocket_test`, with ppond's real data: 17 items → 1 stored, rule `tracked_from` backfilled); the dev DB is still at 067 · needs BE rebuild + migration 068 (+ I stopped nothing; the local BE is the old build).
Files: recurring/{occ,slot,service,writes,link,summary,handler,model,store,duplicate,occurrence,rule}.go (occname.go is นายB's), shared/{expected,future}.go, shared/recurrence (นายD's `Between`), transactions/{recurring_link,service,handler}.go (tx delete hook), cmd/api/main.go (routes + `WithExpected` wiring), migrations/000068_*, tests recurring/recurring_test.go (rewritten for the new model; 11 tests) + the 3 `DeleteWrite` call sites.
**NOT done / for C6 (นายA):** openapi.yaml + api-document.md for everything below (the apidoc conformance tests will fail until the new routes / fields are in openapi: `Item`, `Recurring`, `Detail.stats`, `Detail.tx_update`, `RecurringRef.kind`, the occurrence routes), plus the openapi for C8.

**Migration 068 (one file):** deletes one-off items + their pending drafts and sets `recurring_items.rule_id NOT NULL`; adds `recurring_rules.tracked_from` (backfill LEAST(created_at, min stored slot)), `due_notified_until` (= the migration day), `auto_create`, `auto_created_until`, and `recurring_items.cleared_at`, `auto_created_at`; deletes every unrecorded + unedited + unskipped row (a due one comes back computed; legacy rows with a pending draft or a transaction stay); widens `notifications_type_check` with `recurring_auto_created` and points old `recurring_due` notices at `/recurring?focus=due`.

**Model:** upcoming occurrences are COMPUTED from the rule (`Spec.Between`), never stored. A row of `recurring_items` exists only for an occurrence that is recorded (tx), cleared (paid), skipped or edited. DueCheck no longer produces anything into pending; "due" is a state (date ≤ today and not recorded). A stored row keeps its `slot` (the original date); a computed occurrence is addressed by `rule_id + slot`. An edited row stays when the rule changes and replaces the computed occurrence of the same period.

**Item JSON** (everywhere: month list, due list, picker, rule items, write results): `{id|null, rule_id, slot, stored, auto_created, needs_amount, recurring {id, name, icon_code, kind}, seq, total, date, days_until, status, edited, manual, type, amount (= the tx amount when recorded; null = unknown), account, to_account, category, goal, tags, description (the occurrence name unless overridden), note, splits, project, pending_id (legacy), transaction {id, description, account, amount, date}|null, saving_entry_id, created_at|null, updated_at|null}`. `status`: `upcoming | due | done | paid | skipped | pending(legacy)`. A slot before the rule's `tracked_from` (= its creation day) is implicitly `paid`.
**Recurring (rule) JSON** adds: `counts {upcoming (only for a rule with an end), due, pending, done, paid, skipped, not_created(=due), archived(=skipped)}`, `due_count`, `avg_amount`, `chain [{slot,status}]` (rules with an end, ≤ 60), `auto_create`, `recorded_tx_count`; `progress.done` = recorded + paid + the implicit ones, `progress.total` null without an end; `ending_soon` only for rules with an end; `current_occurrence {item_id|null, rule_id, slot, date, days_until, amount, status}` = the oldest due, else the next one in the window. Summary adds `due_count`, `due_total`.
**Detail** (`GET /recurring/{id}`) adds `stats {paid_count, paid_total, remaining_total|null, last_period, avg_amount, last_amount, max_amount, series[{slot,date,amount}] (newest 24)}` and, after an edit that sent `also_update_tx`, `tx_update {updated_tx_count, failed[{transaction_id, reason}]}`.

**Reads:** `GET /recurring-items?status=upcoming|due|done|paid|skipped|pending|all (also state=, not_created=due, archived=skipped)&month=YYYY-MM&rule_id=&page=&per_page=` → `{data, pagination, window:null}`; `status=due` = overdue + due today + this month's upcoming ones with no amount (flagged `needs_amount`); `month=` = stored ∪ computed of that month (every status, oldest first, per_page 100); default (upcoming) = the next 120 days; `status=all` needs a month (400 otherwise). `GET /recurring/{id}/items?tab=produced|upcoming[&from=YYYY-MM-DD&months=12(max 24)]`: produced = history (recorded / paid / skipped / due, newest first); upcoming for a rule WITHOUT an end = a window of `months` from `from` (default tomorrow) with `window {from,to,next_from}`, a rule with an end = all of it, paged. `GET /recurring/{id}/occurrences?tx_date=&past=3&upcoming=3` → `{data, suggested_slot}` (overdue newest 24 + `past` earlier + `upcoming` next; suggested = the oldest overdue, else the open one nearest tx_date). `GET /recurring` is ordered overdue first (oldest), then the next one coming, none last (the picker keeps `likely` first).
**Writes** (all → `ItemWriteResult {item, transaction, account_balances, setting}`; slot = YYYY-MM-DD):
- `PUT /recurring/{id}/occurrences/{slot}` partial (`amount, date, description, note, account_id, to_account_id, category_id, tag_ids, also_update_link`; key present = set, null = clear).
- `POST …/{slot}/confirm` {amount?, date?, …overrides}: creates the tx now, dated the occurrence date unless `date`; 400 `AMOUNT_REQUIRED`, 409 `ALREADY_RECORDED`.
- `POST …/{slot}/skip` {delete_tx?}; `…/restore`; `…/mark-paid` ("จ่ายแล้ว", no tx); `…/unmark-paid`.
- `POST …/{slot}/link` {transaction_id, replace?} → `LinkResult {item, transaction, amount_differs, rule_amount, transaction_amount, account_balances, setting}`; the tx keeps its date and amount; 409 `ITEM_ALREADY_LINKED` with `details {transaction, other{rule_id,slot}}` unless `replace`; `POST …/{slot}/unlink` (tx stays; the occurrence goes back to computed, or to paid if it was cleared first).
- Bulk per rule (→ `{items, left_out[{slot,reason:"needs_amount"}], account_balances, setting}`): `POST /recurring/{id}/occurrences/confirm-ready | mark-paid-ready | skip-ready`.
- Old by-id calls keep working for STORED rows: `GET|PUT|DELETE /recurring-items/{id}` (PUT = scope this only), `POST /recurring-items/{id}/link|unlink|archive|restore`, `POST /recurring-items` (extra occurrence, `recurring_id` required). REMOVED: `POST /recurring-items/batch`, `POST /recurring-items/{id}/create`.
- `DELETE /transactions/{id}?skip_occurrence=true`: deletes the tx and skips the occurrence it recorded; without it the occurrence goes back to due / upcoming (paid if cleared first). Any tx delete now releases its occurrence (before, only with `also_delete_link`).
- Rule edit: `PUT /recurring/{id}` accepts `auto_create` and `also_update_tx`. `also_update_tx` pushes name / category / wallet / tags / note to the transactions already recorded (never date / amount); a name only when the tx description still is the OLD auto name; `Detail.recorded_tx_count` is the N for the question. `POST /recurring/{id}/resume` sets `tracked_from` = today (the paused gap is not overdue) and resets auto-create's marker. `POST /recurring/{id}/extend` only pushes the END of a rule that has one (409 otherwise). `DELETE /recurring/{id}?delete_linked=true` unchanged (deletes the recorded tx too).

**C8 auto-create:** rule field `auto_create` (read / write on POST / PUT /recurring); needs a fixed amount and a wallet: 400 `AUTO_CREATE_NEEDS_AMOUNT` / `AUTO_CREATE_NEEDS_WALLET` (also on an edit that clears them). Switching it on sets `auto_created_until` = yesterday (today's due slot counts, older ones stay due; off / on again and resume reset it). DueCheck records, per active rule, the occurrences in (marker, today]: skipped / paid / recorded ones are left, an edited one uses its values, tx dated the occurrence date, description = the occurrence name, row stored `done` + `auto_created_at` (item `auto_created: true`), in the same DB transaction; a failing one stays due (a savepoint). Deleting an auto-made tx returns the occurrence to due and it is never re-created. One grouped `recurring_auto_created` notice per user per day (`{count, date}`, deep link `/recurring`). Created on the first DueCheck of the day (app open), no clock job. NOTE: I dropped `auto_create_since` (the marker moves every day, so it was not "since").
**C2 names:** the occurrence name (`OccurrenceName`, นายB's) is the tx description / the item `description`: computed at production and display from the SLOT (moving the date never renames), user language from preferences; a stored row keeps a name only if the user typed one, so a rule rename reaches every unstored occurrence. No `auto_name` column (migration 069 dropped).
**Due notice:** `recurring_due` is ONE grouped notice counting the occurrences that came due since `due_notified_until`; deep link `/recurring?focus=due`.
**Sync:** the recurring dataset fingerprint already hashes the user's today, so the due state re-syncs each day.
**Readers:** budgets / dashboard / me read `ExpectedBetween` (wired in main.go): budget `upcoming` items now come from computed + edited occurrences; me gets `due_count` / `needs_amount_count`.
**Known gaps:** a stored row's `seq` (tx detail "n/N") is the seq at the time it was stored; the old tests of the removed Batch / create-now flows are gone; no test runs happened, so expect fixes after the first run.

### 2026-10-20 — 0.4.0-2 BE: what to check on the device once the BE is rebuilt + 068 is migrated (for the owner)
1. A future-dated transaction: add one dated tomorrow. It appears in the list, but the wallet balance, month totals and budget "used" do not move until that day; the budget shows it as รอจ่าย.
2. A recurring setting with a past start date: occurrences before the day it was created are treated as paid (never overdue); the ones from the creation day on that are not recorded show as due. Nothing new appears in pending any more (old recurring drafts already there stay).
3. On a due occurrence: ยืนยัน (creates the tx, dated the occurrence date), ข้าม / ยกเลิกข้าม, จ่ายแล้ว (no tx) / ยกเลิก, ผูกกับรายการที่มี (swap asks first), bulk "ยืนยันทั้งหมดที่พร้อม / จ่ายแล้วทั้งหมด / ข้ามทั้งหมด" on one setting.
4. Delete a transaction that records an occurrence: the occurrence goes back to due (paid if you had cleared it first); with "ข้ามรอบนี้ด้วย" it becomes skipped.
5. Edit a recurring setting's name: unrecorded occurrences rename by themselves; the "apply to N recorded transactions?" question changes only name / category / wallet / tags / note of old transactions, never date or amount.
6. Auto-create (บันทึกอัตโนมัติ): turn it on for a setting with a fixed amount and a wallet; from the next app open, occurrences that come due are recorded by themselves (tagged อัตโนมัติ) and one quiet notice per day says how many. Occurrences that were due before you switched it on stay due.
7. No-end settings: the upcoming tab shows 12 months with "ดูปีถัดไป"; settings with an end show all occurrences; the installment chain (งวด n/N) and the stats (paid total, average, chart series) are on the detail page.
8. The unallocated-saving and goal pages: a goal can have several auto-saves (done earlier); goals list takes ?month= for the month plan.
9. Migration 068 deletes one-off upcoming items (and their drafts) and the unrecorded future items of every setting; they are computed again, so counts may look different after the migration.

### 2026-10-20 — C3 / C8 review fixes (นายA's review items 1–12) — CODED, build + vet clean, tests NOT run
1. DueCheck no longer writes on every read: `due_notified_until` / `auto_created_until` updates are `… IS DISTINCT FROM`, and a rule already looked at today skips its queries (so `updated_at`, the sync fingerprint and `Recurring.updated_at` only move on a real change).
2. Resume: new `recurring_rules.paused_from` (set on pause, on archive of an active rule, on the archived-wallet auto-pause; backfilled from `updated_at` for paused / archived rules). Resume NO LONGER moves `tracked_from`: what was due before the pause stays due; the slots in [paused_from, today) are stored as SKIPPED rows; `due_notified_until` = today, auto-create's marker = yesterday. `TestDueNoticeResumeAndEdit` now asserts that (a 1-slot gap).
3. Manual items: kept (`POST /recurring-items` stays). A manual row (slot NULL) answers to its date in `loadOcc` when no computed occurrence sits on it, and `POST /recurring-items/{id}/link|unlink` act on THAT row (they no longer go through the slot).
4. "Same period" replacement: monthly / yearly settings map an edited row to the occurrence of the same calendar month / year (n months / years for an interval of n); daily / weekly / dates keep the [slot, next slot) span.
5. The tx edit / delete hooks find the row by the transaction OR the other leg of its transfer group, whoever owns the row (so a shared-wallet member's edit / delete and a delete via the other leg release the occurrence).
6. A legacy pending draft on an occurrence is deleted when the occurrence is confirmed or skipped without delete_tx (no second tx on a later submit).
7. `GET /recurring-items?status=due|upcoming` and the per-rule counts use ACTIVE settings only (like me / summary / `ExpectedBetween`).
8. `confirm-ready` runs each occurrence in its own savepoint: one that is refused (archived wallet, deleted category …) is left out with `left_out.reason = "refused"`, the others are recorded. **openapi: `LeftOut.reason` is now `needs_amount | refused`.**
9. Migration 068: stale rows are deleted BEFORE `tracked_from` is worked out (it counts the surviving rows only); down comment fixed; the file notes that its dates use the DB time zone; `paused_from` added.
10. `also_update_tx`: the wallet a transaction left is in `account_balances` too.
11. The picker list is oldest first and `suggested_slot` is the oldest overdue one of ALL (before the 24 cut); an occurrence edit with `amount: null` clears the amount (a setting's amount still can't be cleared: 400); the caller's `X-Timezone` now rides in the request context on every protected route (middleware in main.go), so `slotItem / viewRow / ExpectedBetween / settingOf` see it.
12. Perf: the per-read DueCheck work is gated by the day markers (item 1). NOT changed: `bulkItems` still builds each item one by one, and budgets call `ExpectedBetween` once per budget window.
Tests: `TestBulkOccurrences` / `TestRecurringKinds` count only `status = due` items (the list also carries this month's upcoming ones without an amount), so they no longer depend on the day of the month.

## 2026-10-20 — local deploy 068 (done at the owner's word via นายA; no Go tests run, no commits)
- Before: dev DB at migration 67; recurring_rules 1 · recurring_items 17 (4 one-off, 3 with a pending draft, 1 with a tx) · pending_transactions 3 · notifications 6. A full `pg_dump` was taken first (scratchpad `dev_db_before_068.sql`, 356 KB).
- `scripts/local-deploy.sh` (docker compose up -d --build: build → migrate → app): migration **68, not dirty**, health 200, "Server ready". Build is the working tree as it stands (includes every session's uncommitted code).
- After: recurring_rules 1 (ppond's; tracked_from 2026-10-18, due_notified_until today, paused_from null, auto_create false) · recurring_items **1** (the 4 one-offs and the 12 unrecorded untouched rows are gone; the one left is the legacy row with a pending draft) · pending_transactions **1** (the 2 one-off drafts went with their items; the transaction of the one-off that had one stays) · notifications 6. Nothing else of ppond's was touched.
- Containers now: `chubi_pocket_db` + `chubi_pocket_app` up; `chubi-postgres` (the other one) still stopped.
- Smoke (a fresh user `smoke_c_068`, removed again afterwards, ppond untouched): health 200; GET /recurring/{id} → counts {upcoming 3, due 1, …, not_created 1}, due_count 1, progress {done 2 (implicit paid), total 6}, chain [paid paid due upcoming×3], current_occurrence {item_id null, slot today, status due}, avg_amount 100, auto_create false, stats {paid_count 0, remaining_total 400, series []}, upcoming = 3 items (window null: it has an end), history = the 1 due occurrence (id null, stored false, description "Netflix งวด 3/6 ประจำ 20–26 ต.ค. 2026"); GET /recurring → summary due_count 1, due_total 100, due_30d_total 400; GET /recurring-items?status=due → 1 item (id null) + pagination, window null; POST …/occurrences/{today}/confirm → item done, stored, wallet 1000 → 900; GET …/occurrences?tx_date= → data oldest first, suggested_slot the next open one once nothing is overdue; GET /me/counts recurring {active 1, upcoming 2, due_count 0, needs_amount_count 0}; GET /dashboard upcoming items carry rule_id + slot; a no-end monthly rule created today → counts upcoming 0, progress.total null, chain [], due 1 (today's slot).
- Odd / worth knowing: a "daily / every 7" rule is named like a week-span ("ประจำ 20–26 ต.ค. 2026") — that is นายB's naming (a 7-day step = a week), fine. Nothing failed.

## 2026-10-20 — Go tests: full run (นายC; fix loop 1 of 3 used)
- Setup: a fresh test DB `chubi_pocket_test` (a clone of the dev DB, already at migration 068; NOT ppond's DB), `TEST_DATABASE_URL=postgres://…:5433/chubi_pocket_test`. The DB tests DID run: `go test -count=1 -v ./internal/modules/recurring` shows 15 PASS lines and no SKIP (a skipped run would take ~0 s).
- Run 1 (`go test -count=1 ./...`): every package **ok** except `internal/apidoc` — `TestResponseConformance` (stale fixture: the spec now requires `counts.recurring.due_count` and `needs_amount_count` in getMyCounts).
- Fix (loop 1): added those two keys to the test's valid body in `internal/apidoc/conform_test.go` (a stale test; the contract is right). Re-ran `./internal/apidoc/...`: ok.
- Final state, per package: accounts · appversion · auth · budgets · categories · contacts · dashboard · imports (+ocr, slip) · me · notifications · pending · personal_debts · projects · recurring (15 tests incl. the 11 rewritten) · saving_goals · sync · tags · transactions · users · platform/logger · shared · shared/recurrence · apidoc — all **ok**. No FAIL left. `cmd/api` has no tests.
- Not changed: no behaviour was bent to a test; no other session's code needed a fix. No commits. The local BE stays as deployed.

### 2026-10-20 — C1 gap: future-dated EVENT bills in budgets (นายA's find) — fixed, budgets tests ok
Confirmed: the budgets event branch (`budgets/count.go`) had no today cut, so a future-dated event bill counted as `used` while a future tx stopped at today. Fix: the event branch now emits `counts_as = used` when the bill's date ≤ today (user TZ) and `expected` when it is after today (only inside the expected window of the current period, the same `$8 / $9 / $10` as the other expected rows); source stays `event`, kind `event_bill`. New test `TestBudgetFutureEventBillIsExpected` (a past bill 100 → used, a future one 70 → expected). Ran only `./internal/modules/budgets` on the test DB: ok. The local BE still runs the build from before this fix (restart it to get it).

## 0.4.0-3 saving goals long-term totals (sub-agent)
DONE · `GET /saving-goals` `summary` gains (additive, no migration, nothing breaks for the FE):
- `target_total` = Σ target of the listed ACTIVE goals with a target · `target_saved_total` = Σ saved of the same goals (uncapped) · `target_short_total` = Σ max(0, target − saved) per goal · `target_percent` = floor(saved/target × 100), cap 100, 0 when target_total is 0.
- `count_short` (target, not reached, not completed) · `count_done` (completed, or reached) · `count_no_target` (no target, not completed). Precedence: completed → done; no target → no_target; reached → done; else short. Sum = `data` length for every status filter.
- Scope chosen: the target_* sums use the same status-filtered goal set as the summary, but only state `active` (a closed goal holds 0 after closing, archived = out of all calcs), so `?status=completed|archived` report 0 sums; counts cover every listed goal. `month_*` totals and `?month=` unchanged.
- Files (be): `internal/modules/saving_goals/{model.go, service.go (longTermTotals), goals_test.go}`, `internal/apidoc/openapi.yaml` (SavingGoalList.summary). Docs: spec 09 §0.10 (new), api-document §09 recent-additions line.
- Tests: new `TestListLongTermTotals` (DB: empty list, over-target, reached, short, ongoing, completed + the completed list) and `TestLongTermTotalsBuckets` (pure: archived, completed with/without target, floor, cap). `go vet` clean; `TEST_DATABASE_URL=…/chubi_test_043 go test -count=1 ./internal/modules/saving_goals/ ./internal/apidoc/...` → both ok, 0 SKIP.
- Surprising: (1) the old test DBs are unusable (`chubi_test` at 060; `chubi_test_040` / `_033` have no schema_migrations), so I created a fresh throwaway `chubi_test_043` migrated 001→068. (2) `target_percent` can read 100 while `target_short_total` > 0 (one goal's surplus offsets another's gap, as briefed: uncapped Σ saved) — FE may want to show the short amount anyway. (3) gofmt realigned the pre-existing misaligned GoalView / ListSummary fields in model.go (whitespace only). No commit; local docker BE not rebuilt.
**Addendum (owner option A, 2026-10-21):** `target_saved_total` = Σ min(saved, target) per goal (capped per goal); `target_percent` is floor of that capped sum / `target_total`, so it reads 100 only when nothing is short, and `target_total − target_saved_total == target_short_total` always. Point (2) above no longer applies.
Tests: identity asserted in both tests; DB test now Over 1500/1000 next to Short 2500/10000 → saved 5500, short 7500, 42 %; unit test adds over-only → 100 %. openapi, spec 09 §0.10 and the api-document note updated.
`go vet` clean; `go test -count=1 ./internal/modules/saving_goals/ ./internal/apidoc/...` on `chubi_test_043` → both ok, 0 SKIP. No commit, no docker rebuild.

## 0.4.0-3 repayments as transactions (sub-agent)
DONE (2026-10-21) — owner's debt model: a repayment is a TRANSACTION tied to the person. No commit, no docker rebuild.
- **Migration 069** `repayment_transactions` (BREAKING for the current app: person page `items` shape): `transactions.repay_contact_id` UUID NULL FK contacts ON DELETE SET NULL, `transactions.repay_person_name` VARCHAR(100) NULL (mirror of `counterparty_contact_id` / `counterparty_person_name`); CHECK `transactions_repay_person_check` (both NULL, or name non-blank + type expense|income + no `source_personal_debt_id` + no transfer group); 2 partial indexes. Up/down/up tested on `chubi_test_043` (now at 069). Old repayment-like debt rows are NOT converted (can't be told apart; they keep counting as debts, balances unchanged).
- **NEW `POST /personal-debts/people/{key}/repayments`** body `{kind: "pay"|"receive", amount>0, date? (default today), account_id? (optional, same as POST /transactions), description?, note?, tag_ids?, mark_paid_ids? (label only), person_name?}` → 201 `{transaction: Transaction (full row, = GET /transactions/{id}), item: DebtStatementItem, person_balance: DebtPerson, account_balances: [WalletBalance]}`. pay = expense / Debt Paid (net +), receive = income / Debt Received (net −). Errors as entries (INVALID_PERSON_KEY, CONTACT_NOT_FOUND, ENTRY_NOT_FOUND, TAG_NOT_FOUND, ACCOUNT_NOT_FOUND, 409 ACCOUNT_ARCHIVED).
- **Balance/cycles** over one ledger (`shared.DebtLedgerSQL` = debts ∪ repayment txs, signed, book order date, created_at, id): net, cleared_at, days_outstanding (unpaid debts only), entry_count (debts + repayments), open_count (unpaid debts), people list/totals, `/me/counts.open_debts`, summary message ("ฉันจ่ายคืน" + / "ได้รับคืนจาก" −). A debt's linked tx never counts. Listing rule unchanged.
- **Statement** (`GET /personal-debts/people/{key}?cycle=current|earlier|all`): `items: DebtStatementItem[]` newest first: `{kind: "debt"|"repayment", id (debt id | tx id), key, direction: paid|received (= sign), amount, signed_amount, date, description, note, paid (bool; null on repayment), source (DebtSource|null; null on repayment), transaction: {id, account}|null (debt's linked tx | the repayment tx itself), in_current_cycle, created_at, updated_at}`. `counts` over both (`money` = debts with tx + repayments).
- **Transaction rows** gain `repayment_person: {key, name, contact_id|null, person: PersonRef}|null` (author only). PUT /transactions/{id} on a repayment: amount/date/wallet (droppable)/text/tags OK, category → 400 SYSTEM_TRANSACTION_IMMUTABLE, non-author → 403 DEBT_TX_AUTHOR_ONLY; write result `person_balance` = the person's new balance. DELETE removes it, also returns `person_balance`. `?counterparty_key=` lists the person's debt txs + repayments.
- **Pending `settle_debt`** → `RepayEntry` now creates a repayment tx (opposite of the target debt's direction; debt untouched). `POST …/entries` = DEBTS only (mark_paid_ids kept); `GET …/entries` = debts only.
- Also: contacts delete/absorb/unlinked-names/delete-preview cover repayments; sync `debt_people` fingerprint includes repayment txs; an `n:` write without `person_name` keeps the person's current spelling (was: the lower-cased key text).
- Files (be): migrations/000069_repayment_transactions.{up,down}.sql; internal/shared/debts.go; transactions/{model,store,debt_link,service,detail}.go; personal_debts/{model,service,store,cycle,message,handler}.go + handler_test.go, NEW repayment_test.go; pending/ NEW settle_test.go; contacts/store.go; me/me.go; sync/fingerprint.go; cmd/api/main.go (route); internal/apidoc/openapi.yaml (also holds the earlier uncommitted saving-goals edit). Docs: spec 12 rewritten (stale settle/cancel/settled_amount gone), api-document §12 note, schema.md (transactions + personal_debts).
- Tests (`chubi_test_043`): NEW TestRepaymentLeeScenario (−60, −500 w/ linked income tx (net stays −560, wallet +500), pay 400, −70 → −230; pay 230 → 0 + cleared_at; statement 5 items interleaved repayment/debt/repayment/debt/debt; edit 400→300 → −100; delete 230 → −330; counterparty_key), TestRepaymentReceiveAndKeys (receive for "they owe me" contact, mark_paid label, typed name vs contact keys, validation, contact delete → typed name), TestRepayEntryMakesRepaymentTx, pending TestSubmitSettleDebtMakesRepaymentTx. `go vet` clean; `go test -count=1 -v` personal_debts, transactions, pending, contacts, me, shared, apidoc, sync → all ok, 0 SKIP.
- **FE must know:** record a repayment with POST …/repayments (not an opposite-direction entry); person page `items` are now DebtStatementItem (switch on `kind`; repayment → open GET /transactions/{id}); tx detail reads `repayment_person`; repayment tx edit/delete via /transactions; a local BE rebuild + migrate 069 is needed before testing.

## 0.4.0-3 ผูกกับ — B1: paid-by + link_mode + totals fix (BE session, 2026-10-21)
DONE. Not committed, no docker rebuild. Builds on the uncommitted 069 tree (it now holds 46 changed files).

**Representation (migration 070 `paid_by`, Lead GO 2026-10-21; additive):**
- `transactions.paid_by_amount` DECIMAL NULL. CHECK: NULL, or > 0, ≤ amount, and expense only.
  - Bill 123, Lee paid 13, I paid 110: `amount = 123` (the bill = my consumption), `paid_by_amount = 13`.
  - Reports, budgets, dashboard, list totals and `my_share` (ShareAmountExpr) are unchanged, so they count 123.
  - The wallet moves only the cash part, `amount − paid_by_amount` = 110. That drives the cached balance delta on create / update / delete (`Transaction.Cash()`), the future-dated effective balance (`shared.SignedTxSQL` → new `shared.CashAmountSQL`), the wallet card `month_out` (accounts/enrich) and the wallet summary (accounts SummaryAggregate: `LEAST(my_share, cash)`).
  - paid_by = the bill → no wallet: `account_id` is dropped.
- `personal_debts.paid_for_transaction_id` UUID NULL, UNIQUE, FK → transactions ON DELETE CASCADE. `source_kind` gains `paid_by`.
  - The debt "I owe Lee 13" is `received`, source paid_by, with amount = paid_by_amount and date / description = the row's. It is written in the same DB tx by `DebtLinks.SetPaidByTx`.
  - It is a NEW link, not `source_transaction_id`, so it never lowers my_share.
  - From the debts page it is managed by its tx: money edits → 409 ENTRY_MANAGED_BY_SOURCE (existing rule); DELETE → 409 DEBT_MANAGED_BY_TX (new).
- Migration up/down/up tested on `chubi_test_043` (now at 070).

**Behaviour:**
- **Create, pending submit, PUT `paid_by {contact_id | person_name, amount}`:**
  - PUT: absent = unchanged (the debt still follows date / description); an object sets it; another person = the old debt is removed (the partner is told) and a new one is made; `null` = removed (the wallet takes the whole amount).
  - A lower amount below paid_by → 400 PAID_BY_EXCEEDS_AMOUNT.
  - Income → 400 PAID_BY_EXPENSE_ONLY. No person → VALIDATION_ERROR. A foreign contact → CONTACT_NOT_FOUND.
  - One way at a time, 400 LINK_MODE_CONFLICT for: paid_by + splits; paid_by + source_project_transaction_id; paid_by on a split or event row; `PUT /:id/splits` on a paid row; pulling a paid row into an event (projects quick / pull). `can_join_event` is false on paid rows.
  - Write answers carry `person_balance` (the paid-by person; on removal the old one). DELETE removes the own debt with the row and returns `person_balance`.
- **Linked payer:** the usual split_created goes out. Its payload gains `recipient_direction` (`paid` here; `received` = a normal split; missing on old notices = received). Their mirror is a plain `paid` debt with no expense. A paid_by change sends split_changed (amount / removed).
- **Partner side (Lead: in B1):**
  - When a `received` mirror of a split on an EXPENSE is created (auto or accept), the partner also gets an expense: amount = share, paid_by_amount = share, no wallet, description = the splitter's. Category = the partner's non-system expense category with the same name as the splitter's (case-insensitive, trimmed, top-level first), else none. The name match is one indexed join, so it isn't costly.
  - It is linked by `paid_for_transaction_id`; `paid_by.source = partner`.
  - Money-locked: amount / date / account_id / paid_by → 409 PAID_BY_LOCKED. Category, text and tags are free.
  - "อัปเดตตาม" (apply, or auto-apply) sets both the debt and the expense amount. A removed split deletes both.
  - Deleting the expense keeps their debt (unlinked). Deleting the mirror debt from the debts page also deletes the expense (it has no wallet).
  - Mirrors from before 070 have no expense (no backfill).
- **Read side:**
  - Every row: `link_mode` (event if project / source_project_transaction / event bill; split if it has splits; paid if paid_by; else personal), `paid_by {debt_id, key, person, amount, my_paid, source me|partner, paid}` (author only) and `wallet_amount`.
  - Pending `resolved.paid_by {person, amount, my_paid}` + `resolved.link_mode`, and `draft.paid_by`. New submit codes: INVALID_PAID_BY, PAID_BY_EXPENSE_ONLY, PAID_BY_EXCEEDS_AMOUNT, LINK_MODE_CONFLICT.
  - DebtSource: `paid_by` → `{id: the expense, title}`; `partner` → `id` = my expense of it (was always null).
- **Totals fix:**
  - `GET /transactions` totals income / expense + `daily` skip categories with `include_in_report = false`, like reports. This covers Debt Paid / Received; opening / adjustment and any user category set that way are skipped too, the same rule as reports. `totals.count` is unchanged (still counts them).
  - Wallet card `month_in` / `month_out` skip DEBT_PAID / DEBT_RECEIVED. The account summary already skipped non-report categories.

**Files (be):**
- migrations/000070_paid_by.{up,down}.sql.
- transactions: model.go (PaidByAmount, Cash(), link modes, PaidByInput / PaidBy, detail + request fields), NEW paid_by.go, service.go (create / update / delete, cash deltas, EditSplits guard), store.go (columns, UpdateRowTx paid_by arg, totals reportable, can_join filter), detail.go, debt_link.go (DebtLinks gains SetPaidByTx / PaidByDeletingTx; CreatePaidForTxInTx, SetPaidForAmountTx), daily.go, handler.go (codes).
- personal_debts: NEW paid_by.go, model.go, store.go (column, entry view source), service.go (DeleteEntry), split_flow.go (mirror expense, recipient_direction), split_apply.go (method; moves the expense), split_edit.go (ParentID for paid_by), handler.go.
- pending: model.go, resolve.go, service.go. accounts: enrich.go, store.go. projects: quick.go, handler.go. notifications: model.go. shared: future.go. apidoc/openapi.yaml.
- gofmt also realigned pre-existing misaligned structs in the files I touched (whitespace only).

**Docs:** spec 04 §2.8 (+ list numbers note, status), spec 12 §1.5a (+ endpoints, data history, status), spec 13 §2.1 (`recipient_direction`), spec 03 (month flow), api-document §04 / §12 / §13 recent additions, schema.md (transactions + personal_debts, v0.15).

**Tests** (`chubi_test_043`, 0 SKIP): `go build ./...`, `go vet ./internal/...` clean.
- `go test -count=1` on transactions, personal_debts, pending, accounts, projects, notifications, shared/..., apidoc/... → all ok.
- NEW personal_debts/paid_by_test.go:
  - TestPaidByLeeScenario: 123 / 13 → wallet −110, net −13, debt source; 409s; bill 150; paid 20; paid all → no wallet; lower bill refused; Mom replaces Lee; note-only keeps it; null removes it; delete.
  - TestPaidByRules: income / over / no person / with splits / foreign contact; paid by a contact in full; splits ↔ paid conflicts.
  - TestListTotalsSkipDebtCategories.
  - TestPartnerSplitMakesMyExpense: category name match, lock, note edit, อัปเดตตาม 30→45, delete keeps the mirror.
  - TestPaidByLinkedPayer: recipient_direction paid, mirror has no expense, removed notice.
- accounts TestWalletFlowCashAndDebtCategories. Pending settle_test gains a paid_by draft (resolved + submit + wallet). The pending test env now wires `WithDebtLinks` (as prod does).

**Breaking for the current app:** none (additive keys). **Needs a local BE rebuild + migrate 069 + 070 before FE testing** (waits for the owner's word).

**Open / notes for Lead:**
- (1) The brief's "top amount = the BILL" vs decisions.md "Paid by someone else" ("The top amount = MY share"): I followed the brief / mock B (amount = bill). Decisions.md still says MY share.
- (2) B3's mode switching (split ↔ paid ↔ event with preview) is not in B1: today those switches answer LINK_MODE_CONFLICT, and only paid ↔ personal works via PUT.

## 0.4.0-3 ผูกกับ — B2: event bill with any payer / members (BE session, 2026-10-21)
DONE. No migration, additive, not committed, no docker rebuild.

**Request:** `POST /projects/{id}/bills`, `POST /projects/quick` and pending event drafts (`draft.payer` / `draft.members`) take these next to `new_transaction` (amount = the BILL):
- `payer: BillPerson` = `{me: true}` (default) | `{member_id}` | `{contact_id}` | `{person_name}`.
- `members: [BillMember {…same person forms, share ≥ 0}]`.
- Built in `projects/bill_people.go` (`addPeopleBillTx`), called from `pullBillsTx` when payer or members are set.

**Rules:**
- The payer's share = the rest of the bill (its listed share is ignored).
- Σ the other shares ≤ the bill → else SPLITS_EXCEED_AMOUNT.
- 400 VALIDATION_ERROR (`ErrBadBillPeople`): a person listed twice (a typed name matched case-insensitively), or payer / members without new_transaction.
- With payer / members, splits or paid_by → LINK_MODE_CONFLICT.
- member_id not in the event (or left) → MEMBER_NOT_IN_PROJECT. Foreign contact → CONTACT_NOT_FOUND.
- **Auto-add by any member:** the bills path already let any writer (AssertCanWrite) add people through `quickMemberBuilder`; B2 reuses it. A contact linked to a user becomes a linked member (+ project_added); other contacts and typed names become typed members.
- **Follow-up (Lead GO):** `POST /projects/{id}/members` with `ad_hoc` is now open to any writable member (not viewers); an email invite stays owner-only. Covered by a test at the end of TestBillPeopleSomeoneElsePaid. Spec 10 §0.4a and openapi are updated.
- **I paid:** unchanged model. My tx = the bill on my wallet, the linked bill (`linked_transaction_id`), the other shares as board splits.
- **Someone else paid** (expense only, else VALIDATION_ERROR):
  - The board parent's `transaction_member_id` = the payer, with no linked tx, and every other member's share (mine included) as a split.
  - My tx = my share: expense, NO wallet (account_id ignored), my category / description / note / tags, `source_project_transaction_id` = the bill. It is a copy, `event_bill.linked` false.
  - `new_transaction_id` = it, or null when I have no share. Pending then answers NO_SHARE.
  - A linked payer gets `project_tx_recorded_for_you` (existing `notifyRecordedTx`; it auto-copies for them if their setting is auto).

**Read side:**
- Tx detail / write answers: `event_bill` gains `payer` (MemberRef), `bill_amount` and `members [{member, share}]` (payer first with the rest). These are null / 0 / null on list rows, to keep lists lean.
- New `shared.LoadEventBillPeople`. `LoadMemberRefs` moved to shared; projects keeps a wrapper.
- Pending `resolved.bill_people {payer, members}` = `ResolvedBillPerson {me, member_id, contact_id, name, share?}`; name is empty for a plain me.
- Submit codes: INVALID_BILL_PEOPLE, NO_SHARE, PROJECT_NOT_MEMBER, LINK_MODE_CONFLICT (payer / members without project_id, or with splits / paid_by).

**Files (be):**
- projects: NEW bill_people.go, model.go (BillPeople / BillPerson / BillMember embedded in QuickCreateRequest / AddBillsRequest), quick.go (pullBillsTx / AddNewBillTx take people), pt_store.go (LoadMemberRefs → shared), handler.go (codes).
- shared: NEW members.go.
- transactions: model.go (EventBillLink fields), detail.go.
- pending: model.go, resolve.go, service.go.
- apidoc/openapi.yaml: BillPerson / BillMember / BillShare / ResolvedBillPerson, EventBillLink, AddBillsRequest / QuickCreateEventRequest, Draft / DraftResolved, SubmitError codes.

**Docs:** spec 10 §0.4a (new), spec 04 §2.8 (event-tab line), api-document §10 recent additions.

**Tests** (`chubi_test_043`, 0 SKIP): `go build` / `go vet` clean; projects, pending, transactions, personal_debts, shared, apidoc all ok.
- NEW projects/bill_people_test.go:
  - TestBillPeopleIPaid: linked contact + typed name auto-added, shares, event_bill people, no personal_debts.
  - TestBillPeopleSomeoneElsePaid: Bee paid → my copy of 100 with no wallet, payer's rest 80, recorded-for-you notice; rules: income, over, twice, with splits, no new bill, foreign member; a bill without me → no tx.
- pending TestEventDraftWithPayer: resolved bill_people; submit → my share with no wallet; payer without an event → LINK_MODE_CONFLICT.

## 0.4.0-3 ผูกกับ — B3: mode switching, preview, linked pair (BE session, 2026-10-21)
DONE. No migration, additive (except one behaviour note below). Not committed, no docker rebuild. Also in this entry: Lead's small add (event members `contact_id`).

**1. Mode switch on `PUT /transactions/{id}`** (transactions/link_mode.go `switchModeTx`):
- `link_mode` personal | split | paid | event, plus that mode's data: `splits` (SplitEdit[]), `paid_by`, or `event {project_id, payer?, members?}`. One DB tx.
- Order: drop the old mode first, then the field edits, then the new mode.
  - Leaving an event: `EventLinks.LeaveTx` = detachBillTx(restore=false). The bill made from the row is removed from the board and its board splits are NOT restored; a copy just unlinks.
  - Leaving split: splitsEditor(nil). Debts are deleted; linked partners get split_changed "removed".
  - Leaving paid: paid_by → null, so the debt is deleted and the wallet takes the full amount.
- Entering split: `applySplitsTx` (same checks as PUT /:id/splits).
- Entering an event: `EventLinks.JoinTx` reuses B2's addPeopleBillTx with the EXISTING row.
  - I paid → the row becomes the bill.
  - Someone else paid → the row becomes my share, no wallet (its money comes back); my share 0 → 422 NO_SHARE_TO_COPY.
  - A different event = a move.
- Repayments are untouched ("Repayments stay").
- Rules:
  - Author only → 403 SPLITS_AUTHOR_ONLY. Debt wallet side / repayment → 400 SYSTEM_TRANSACTION_IMMUTABLE.
  - Missing data → 400 LINK_MODE_INPUT. Another mode's data → LINK_MODE_CONFLICT.
  - Without link_mode, `splits` edits a split / personal row (conflict on paid / event) and `event` is refused.
  - A partner-mirrored row is locked (PAID_BY_LOCKED covers mode switches too).
- The answer adds `person_balances` (every person the row touched before / after; omitted when none).

**2. Preview `?preview=true`:**
- Runs the full edit in a SAVEPOINT. It reads the after-state (rows, person nets, wallet balances), rolls the savepoint back, then reads the before-state in the outer tx. Then everything is rolled back: no notification goes out.
- Answer: `TransactionPreview {preview, rows, people [{key, person, before, after, delta}], wallets [{account_id, before, after, delta}]}`.
- People = the row's split / paid-by / debt / repayment persons. Event-board positions are not in it.
- New `DebtLinks.PersonNetTx(q)` (querier-aware) supports it.

**3. Linked pair, my tx ↔ the event bill** (projects/event_link.go; Lead's gap list):
- Gap 4, live link state: `event_bill` gains `kind origin|copy`, `in_sync`, `differences [{field amount|date|description|note, mine, event}]`. Detail / write answers only; null on lists and on another member's row.
  - Computed from `shared.LoadEventBillPeople` (it now also returns date / description / note / linked tx).
  - Tags are copied on apply but not compared (personal vs event tags would never be "in sync").
  - Lead asked for `event_link {…}`; I put it on the existing `event_bill` object to avoid two links. Say if you want a separate key.
- Gap 1, all fields both ways:
  - My tx → bill: `apply_to_event` on PUT. `also_update_link` now does the same for events, and also reaches copies.
    - Origin: amount, date, description, note, tags (as event tags by name).
    - Copy: date, description, note, and its amount as my share. My split is replaced, or if I'm the payer the bill becomes my share + others.
    - Copies do NOT push tags: one member's tags would replace everyone's event tags.
  - Bill → my tx: `apply_to_my_tx` on the bill edit (`also_update_link` now = the same, all fields, copies too). Matching personal tags are ADDED, never removed.
- Gap 2: a bill edit's patch carries `my_transaction` (my linked row after the edit, with in_sync / differences), so the FE asks even when I edited the bill myself.
- Gap 3, resolve later: NEW `POST /transactions/{id}/apply-event`. It reads the bill as it is NOW and marks my project_tx_changed notices for that row actioned.
  - Copies pointing at split CHILD rows are now found everywhere: personalCopyTx, myLinkedTxTx, PTRecipientsForChange.
- Gap 5: `POST /personal-debts/people/{key}/entries {bill_id}` → source event + bill + project. Must be an active member, else 400 BILL_NOT_FOUND. Its money stays editable (UpdateEntry lets source event through; its wallet tx syncs like a manual one).
- Gap 6: project_tx_changed auto-apply is kept as is.
- Deleting either side still unlinks (unchanged).
- **Behaviour note:** `also_update_link` used to push / pull only amount + date and only for the origin. It now carries all fields and copies too, because Lead's gap 1 asks for that. Say if old clients rely on the narrow behaviour.

**4. Lead adds:**
- `POST /projects/{id}/members` ad_hoc is open to any writable member (reported earlier).
- `EventMember.contact_id` = my contact for that member: a linked member → my contact with that linked_user_id; a typed member → my contact with the same name. Null on my own row. fe-A has been told.

**Refactors:** BillPerson / BillMember / BillPeople moved to `shared` (projects keeps type aliases). LoadMemberRefs is in shared. `billWriterTx` / `dispatchAddedTx` were extracted from addBillsTx / pullBillsTx.

**Files (be):**
- transactions: NEW link_mode.go, service.go (`updateOrPreview`, `Preview`, person_balances), model.go (UpdateRequest link_mode / splits / event / apply_to_event, EventTarget, PersonDelta / WalletDelta / PreviewResult, EventBillLink kind / in_sync / differences, PersonBalances), event_link.go (EventLinks), debt_link.go (PersonNetTx), detail.go, handler.go (preview, LINK_MODE_INPUT).
- projects: NEW event_link.go, bill_people.go (existing tx), quick.go (billWriterTx, dispatchAddedTx), pt_service.go (apply_to_my_tx, my_transaction), pt_store.go (recipients), personal_copy.go (child-row copies), service.go (ad_hoc), views.go (contact_id), model.go, handler.go (ApplyEventToTx).
- personal_debts: paid_by.go (PersonNetTx), service.go (bill_id, event money editable), model.go, store.go, handler.go.
- shared: NEW billpeople.go, members.go (differences).
- cmd/api/main.go (WithEventLinks, route). apidoc/openapi.yaml.

**Docs:** spec 04 §2.9 (new), spec 10 §0.4b (new) + §0.4a member rule, spec 12 §1.5 (event source), api-document §04 B3 note.

**Tests** (`chubi_test_043`, 0 SKIP): `go build` / `go vet ./internal/...` clean.
- transactions, personal_debts, pending, accounts, projects, notifications, contacts, recurring, shared/..., apidoc/... → all ok.
- NEW personal_debts/link_mode_test.go TestLinkModeSwitchAndPreview: split → paid preview (Bee 100 → 0, Lee 0 → −50, wallet 700 → 750, nothing saved), then the real switch (person_balances 2); LINK_MODE_INPUT / CONFLICT cases; paid → split; split → personal (no debts left).
- NEW projects/event_link_test.go TestLinkModeEventSwitches:
  - personal → event (I paid; origin, in sync, share 100) → personal (board row gone).
  - → event paid by Bee (copy 120, wallet back to 1000).
  - apply_to_event 150 → my share 150.
  - Bill description edit → my_transaction out of sync (description) → apply-event → in sync; apply_to_my_tx date.
  - "as debt" with bill_id (source event, amount editable, unknown bill → BILL_NOT_FOUND).
  - Members contact_id.
- The projects test fixture now wires `WithEventLinks` (as main.go does).

**Not done / open:**
- (a) Preview shows person and wallet moves only, not event-board positions.
- (b) Editing a bill's payer / members from tx detail when the row is already in the same event is not part of PUT. Use the bill edit (project-transactions PUT with splits).

## 0.4.0-3 debt pages API (BE session, 2026-10-22)
DONE (Lead brief, owner "ต่อเลย ให้จบทุกงาน"). Branch wip/0.4.0-3, uncommitted, no docker rebuild, no migration. Mocks read: DebtsList, DebtPerson, DebtEntry / Edit, QuickCreateDebt.

**1. People list (`GET /personal-debts/people`):**
- Rows gain `side` (receivable | payable | clear), `first_activity_at`, and `last_activity {kind debt|repayment, id, title, direction, amount, signed_amount, date}` (from peopleSQL: the line with the highest book rank).
  - title = the line's description. FE words a null title, e.g. "คุณจ่ายคืน ฿400".
- `days_outstanding` already existed.
- `totals` gain `receivable_total`, `payable_total` (same values as owed_to_me / i_owe, kept for Home / More / dashboard) and `counts {all, receivable, payable, overdue_30}`.
- `side=receivable | payable | overdue_30` filters the list (owed_to_me / i_owe still accepted).
- `shared.DebtLedgerSQL` gains a `descr` column; `shared.DebtSide`.

**2. Person page:**
- Every statement item gets `running_balance`. It is a window over ALL the person's lines in book order, applied before the cycle filter, so the earlier pages are right too.
- The page gets `days [{date, change, balance_after, count}]` built from the page's items. A day split across pages shows its part on each page.
- Cycles: `cleared_at` + `counts.earlier` + `?cycle=earlier` already exist (confirmed) and drive the "ดูรอบก่อน" divider.
- `summary_message` gains `text_balance_only` ("ยอดกับ X ตอนนี้: ฉันรอรับจาก / รอจ่ายให้ X N บาท") and `since`.
  - `text`'s header gains "(ตั้งแต่ d)".
  - Its total line now reads "รวม ฉันรอรับจาก X …" / "รวม ฉันรอจ่ายให้ X …" (was "… ค้างจ่ายฉัน …", wording rule). handler_test is updated for it.

**3. Debt detail "มาจาก":**
- `origin {kind split|paid_by|partner|event|cash, transaction_id, bill_id, event_id, title, amount, date, account}` on every DebtEntry and on statement debt items.
- One SQL in entryViewSQL. Event origins come from the bill (`source_project_transaction_id`): amount / date / description, no wallet.
- Cash = a manual debt with its own wallet tx.
- Null = ledger-only.
- `source` is unchanged (it still means "managed by a split").

**4. Quick create preview:**
- `POST …/entries?preview=true` and `POST …/repayments?preview=true` → 200 `DebtPreview {preview, people: [PersonDelta], wallets: [WalletDelta]}`, B3's shape minus rows.
- The write runs in a DB tx that is always rolled back. Before = after − the line's signed amount; wallet before / after are read in the tx.
- `CreateEntry` / `CreateRepayment` were split into `createEntryTx` / `createRepaymentTx` so the preview and the write share them (same validation, same errors).
- `PersonDelta` (transactions) gains `side_before`, `side_after`, `flipped` via `transactions.NewPersonDelta`. B3's tx preview uses it too.

**5. Overpay:**
- An overpaid settle was always allowed; nothing caps it.
- Both creates now return `balance_change` (PersonDelta), and `flipped` = true when the side changes (test: รอจ่าย 160, pay 200 → รอรับ 40).
- Entry writes other than create keep `balance_change: null`.

**Files (be):**
- personal_debts: model.go, store.go (peopleSQL, peopleCols, scanPerson, statement running balance, statementDays, entryViewSQL origin), service.go (create/preview split, Person days), message.go, handler.go (side values, preview), NEW pages_test.go, handler_test.go + paid_by_test.go (asserts).
- shared/debts.go.
- transactions: model.go (PersonDelta sides, NewPersonDelta), link_mode.go.
- apidoc: openapi.yaml (DebtPerson, DebtTotals, DebtSummaryMessage, DebtOrigin NEW, DebtEntry, DebtPersonPage.days, DebtStatementItem, write results, PersonDelta / WalletDelta / DebtPreview NEW, TransactionPreview refs, operations), conform_test.go (getMyCounts fixture).

**Docs:** spec 12 §2.4 (new), api-document §12 note.

**Tests** (`chubi_test_043`, 0 SKIP): `go vet ./internal/...` clean.
- personal_debts, transactions, me, dashboard, sync, projects, pending, contacts, shared/..., apidoc/... → all ok.
- NEW TestDebtPagesAPI:
  - Lee 60 (40 days ago) + 500 cash + pay 400: last_activity, side, first date, totals and counts, overdue_30 filter.
  - running_balance −160 / −560 / −60; days.
  - text_balance_only; split origin; cash origin.
  - Preview record (wallet −50, nothing saved); preview overpay (flipped); real overpay balance_change.
- TestPaidByLeeScenario also checks the paid_by origin.

**Breaking for the current app:** the `summary_message.text` wording only. Everything else is additive.


## 2026-10-28 12:19 — 0.4.2 1a: Telegram hello (BE session)
DONE · base be `7b1f6bc`, nothing committed · go vet + go test (telegram, logger, apidoc; config has no tests) ok, **0 skip**, on a fresh `chubi_test_042` (every `migrations/*.up.sql`, head 120).

**Files (be):**
- NEW `internal/modules/telegram/`:
  - `types.go`: Update / Message / Chat / User / WebhookInfo.
  - `client.go`: Bot API over net/http (SendMessage with reply_parameters, SetWebhook with allowed_updates=["message"], GetWebhookInfo, GetMe). Errors drop the *url.Error URL and mask the token.
  - `handler.go`: HandleUpdate, the reply table, dedupe (last 1000 ids in memory + the table's unique key), one log line per update with no text.
  - `webhook.go`: Serve (constant-time secret → 401, else always 200 with an empty body), `New` (nil = off), `Start` (getMe → setWebhook → getWebhookInfo in a goroutine), ParseChatIDs.
  - `store.go`: Save, `ON CONFLICT (update_id) DO NOTHING`.
  - tests: client_test, handler_test, webhook_test (incl. the store test on the DB).
- NEW `migrations/000120_telegram_messages.{up,down}.sql`: id, update_id UNIQUE, chat_id, from_username NULL, text, received_at (= Telegram's message date), index (chat_id, received_at DESC).
- `internal/platform/config/config.go`: `TelegramConfig` + the 4 keys (gofmt also re-aligned JWTConfig / OCRConfig).
- `cmd/api/main.go`: `telegram.New` after the other services; `api.POST("/telegram/webhook", …)` sits right after `/health`, BEFORE `api.Use(version middleware)`, so it gets no build check, JWT or sync. `Start()` runs after the server goroutine.
- `internal/platform/logger/gin_logger.go`: `GinLoggerMiddleware(log, logBodies, noBodyPaths...)`, called with `telegram.Path`. This was needed: prod runs `LOG_BODIES=true` (runbook §6), and without the opt-out the request log printed the webhook body, i.e. the message text. A scratch test confirmed the leak; the webhook test now checks for it.
- `internal/apidoc/openapi.yaml`: `telegramWebhook` (tag `Internal`, `x-internal: true`, `security: []`, header param, 200 empty / 401) + schemas `TelegramUpdate`, `TelegramMessage` + tag `Internal`.
- `.env.example`, `.env.prod.example`, `docker-compose.deploy.yml`: the 4 keys (`${…:-}`).
- **app** `test/hub/api_unused_baseline.txt`: + `POST /telegram/webhook`. The app's API ratchet fails on a spec endpoint no page flow lists, and the app never calls this one. `flutter test test/hub/api_spec_ratchet_test.dart` passes.

**Env keys:** `TELEGRAM_BOT_TOKEN` (empty = off), `TELEGRAM_WEBHOOK_SECRET` (1–256 `A-Za-z0-9_-`; anything else = bot off + an error log), `TELEGRAM_WEBHOOK_URL` (setWebhook on start; empty = skipped with a warning), `TELEGRAM_ALLOWED_CHAT_IDS` (comma list; bad entries skipped with a warning; empty = nobody).

**Replies:** the plan's table. My own choices:
- The `/start` hello is "สวัสดีครับ ส่งข้อความมาได้เลย".
- Not-allowed is "ยังไม่เปิดให้ใช้ (chat id: N)", sent for any private message from that chat (including /start).
- Only allowed text is kept; /start and not-allowed chats are not.
- A failed save still replies.

**Tests (15):**
- client: paths and bodies, reply_parameters only with replyTo, token absent from the API error / transport error (closed server) / non-JSON answer.
- handler table: 10 rows (allowed text / photo / not allowed / /start ×2 / /start not allowed / group / channel / edited / empty).
- dedupe: memory, then a "restart" caught by the store key.
- store or send failure; the log has no text plus the expected keys; seenSet eviction; ParseChatIDs.
- webhook: missing / wrong / prefix secret → 401 with no reply; good → 200 with an empty body and one reply, no text in the request log with bodies on, a resend gets no second reply; bad JSON / empty / `[]` → 200 with no reply.
- `New` off without a token or with a bad secret, token never logged; `Start` calls getMe → setWebhook → getWebhookInfo; `Store.Save` on the DB (insert, conflict, row values).

**Docs:** NEW `modules/16-telegram.md` (+ modules/README row), `ref/api-document.md` (public-endpoints line + status 0.10), `ref/schema.md` (§16 + TOC + status 0.18, head 120), `modules/data-model.md` (2 rows), `ops/ops-runbook.md` (§3 "Telegram bot": keys, restart, log lines, a query on the kept texts; §6 flag row).

**On the VPS (Lead):**
1. Migration 120 runs with the deploy (additive, not breaking: no app change, no MIN_APP_BUILD bump).
2. The ppForge compose (`ppforge-infra/apps/chubi/docker-compose.yml`) uses `env_file: .env`, so it needs no edit; just add the 4 keys to `/srv/chubi/.env`:
   - the owner pastes the token
   - Lead makes the secret (`openssl rand -hex 32`)
   - `TELEGRAM_WEBHOOK_URL=https://chubipocket-api.ppforge.dev/api/v1/telegram/webhook`
   - `TELEGRAM_ALLOWED_CHAT_IDS` empty at first
3. `docker compose up -d app`, then `docker logs … | grep telegram` should show "telegram: on" @bot and "telegram: webhook" url=… pending=0.
4. The owner messages the bot, gets "ยังไม่เปิดให้ใช้ (chat id: N)". Put N in `TELEGRAM_ALLOWED_CHAT_IDS`, `up -d app`, then a message gets "ได้รับข้อความแล้ว ✓".
5. Check that Caddy passes `/api/v1/telegram/webhook` and the `X-Telegram-Bot-Api-Secret-Token` header through (Caddy keeps headers by default).

**Breaking for the app:** none.
