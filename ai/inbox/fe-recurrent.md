# FE-RECURRENT: scheduled / recurring transactions (รายการประจำ)

## 2026-10-13 — Plan for 0.3.1-10 (read-only, nothing edited) — SUPERSEDED by rev 2 below (owner replaced the model)
PLAN · sources: spec `design/spec/11-scheduled-transactions.md` + `design/database/schema.md:745-798`, `openapi.yaml` (scheduled paths), BE `internal/modules/scheduled_transactions`, app `lib/features/scheduled_transactions` + `transactions/.../draft_form_scheduled.dart` + `quick_create_sheet.dart`, `ai/decisions.md`, `ai/backlog.md`, `fe-plans.md` §3/§7.

### 1. Facts

**Spec vs BE vs openapi**
- Model: `entry_type` = recurring | installment (no `loan` value: "loan" = installment with `interest_rate > 0`, a UI label only). `billing_cycle` = daily / weekly / monthly / yearly + `day_of_month` (from next_billing_date). No interval, no weekday / month fields, no tags / splits / event, no end date.
- **No generation job exists.** The spec plans an hourly cron for "Phase 3"; the BE has none (`main.go:124`). The ONLY trigger is `POST /:id/generate-now`, which posts whatever the date (not idempotent: repeated taps keep posting future cycles) and posts to ARCHIVED wallets too. Overdue rows just stay overdue (they show in home "coming up").
- Generated = a real posted tx (`scheduled_transaction_id`; description = schedule name, note = schedule note). Interest / total / down payment are stored only and never computed.
- Status: active ⇄ paused, active / paused → cancelled (terminal), completed is automatic when remaining hits 0. DELETE = hard delete, generated txs stay (link set NULL).
- List `GET /scheduled-transactions?status=` accepts ONE value (`active` default, paused / cancelled / completed / all; unknown = all). Rows embed AccountRef / CategoryRef but nothing computed (no days_until / overdue / progress / counts / allowed actions). No paging.
- `GET /:id` exists (bare view, no history). `/history` and `/upcoming` are separate calls. Writes return the bare view; generate-now returns `{generated_transaction, schedule_updated, account_balances}`.
- openapi drift: list query params undocumented; create / update error lists swapped (INVALID_TRANSITION on create, installment codes on update); `remaining_installments` is required by code but not by the spec text (the code comment says it defaults to total, the code doesn't); update skips the recurring / installment checks and allows edits of cancelled / completed; remaining → 0 by edit doesn't complete; list / upcoming errors are 500; `/upcoming` = 7 days while home uses 14 (home reads the dashboard block, not `/upcoming`).
- Custom recurrence: nowhere in spec / schema / BE.

**App today**
- List: `ListPageBody` of hand-built `ScheduledCard`s (feature-local layout), AddTile; no filters, no status on rows, raw ISO dates.
- Detail: `DetailPageBody` but NO edit mode (✏️ opens the quick-create sheet); private `_ToneIcon` / `_StatRow` / `_TextRow` / `_GenerateNowCard` / `_HistorySection` with raw Padding / Row / colours; status menu on the hero chip (OptionMenuAnchor).
- Form: the scheduled mode of the shared `DraftForm` (TxHeroCard look, not the quick-form EntryCard look); `scheduledProblem` duplicates server validation; default next date = today + 7. Quick-create presets (`QuickCreatePreset{mode: tx|debt}`) have no scheduled mode; scheduled pages register no preset.
- **Vanish / not-found root cause:** the repository lists `status=active` only (`scheduled_transactions_repository.dart:17`), so paused / cancelled / completed drop out of the one cache on the next load; `cancel` and a completing `generateNow` remove the row at once (`scheduled_transactions_cubit.dart:117,149`); the detail reads `cubit.byId(id) ?? _last` and never calls `getById`, so a cold open (deep link, home "coming up") shows "not found" and a cancelled entry keeps painting its old status.
- Client-side logic to drop: status → tone / allowed actions (`canPause/...`), variant label (duplicated), `remaining ?? 0`, interest `toStringAsFixed`, history total fallback, local cache patching after generate-now, `accounts.load()` fallback.
- Tests: none for list / detail / form (only `generate_now_result_test` + route mapping).

### 2. Plan (hub templates + kit only; feature = state / API / navigation)

**List `/scheduled-transactions`** — `ListPageBody` + `ListToolbar` (filter chips 28, no ✏️: nothing to reorder):
- chips: ใช้งาน (default = active + paused) · เสร็จสิ้น · เก็บถาวร (or ยกเลิก, see Q3) · ทั้งหมด, each with its count badge from the BE. Chip switch = 1 call.
- optional header: `SummaryStats` "ต่อเดือน: จ่าย / รับ" from BE totals (S1).
- rows: hairline-divided kit row (K3): icon · name · wallet mini chip | amount (type colour); line 2: relative due ("อีก 3 วัน" / "เลยกำหนด 2 วัน") · cycle · `n/N งวด` for installments; status chip only when not active.
- + = quick create in scheduled mode (page preset). Empty / error / skeleton / pull-to-refresh from the template.
- Calls: open = `GET ?status=active,paused` (1). Write responses patch the list; no reloads.

**Detail `/scheduled-transactions/:id`** — `DetailPageBody` + `EditModeMixin`, contact-page reference:
1. Hero (`HeaderCard`, tint = icon colour): name, description under it; top row = status chip (tap → central popover: พัก / ทำต่อ / เก็บถาวร per BE `actions`) + variant chip; ✏️ right; footer = amount + next due (date + relative).
2. `ActionBar` under the hero (like wallets): "บันทึกงวดนี้" (generate the due cycle; with Q1 = drafts, "ข้ามงวดนี้" too). Hidden when the BE says the action isn't allowed.
3. One headless box: wallet chip · category chip path · รอบ (cycle / recurrence text) · วันถัดไป · note (always shown).
4. Section "การผ่อน" (installment / loan only): `ProgressRow` paid n/N, total, paid so far, remaining amount, down payment, interest % (all from the BE).
5. Section "งวดที่จะถึง": next 3 dates (BE-computed, clamp rules included).
6. Section "ประวัติ": generated txs (date + amount, tap → tx detail) + count / total footer (K4).
7. Edit mode: fields edit in place (AppInput / DetailRow pickers / date sheet / cycle popover); type + variant locked 🔒; archive (amber) + delete (red) buttons; then `DetailMeta`.
- Calls: open = `GET /:id` page-ready (1) for ANY status → fixes not-found, stale and vanish on the detail. Each button = 1 call returning the new page state (+ `account_balances` where money moved: `AccountsCubit.patchBalances`). No `byId` cache reads, no `_last`.

**Create** — the ONE quick-create sheet, new mode `scheduled` (decisions: one sheet + per-page presets):
- the scheduled list / detail register `QuickCreatePreset(mode: scheduled)`; the + takes the scheduled mode colour.
- body = the quick-form look: `EntryCard` (type + first date · name + amount · wallet row · category row), then a compact section "รอบ" (variant chips, cycle popover, installments fields when installment / loan). Description / note as in quick create.
- validation: instant required / > 0 only; the BE returns field errors (drop `scheduledProblem`). Save = `POST` (1), the response is inserted into the list.
- `draft_form_scheduled.dart` and the `scheduled:` flag are deleted at the end.

**Phasing**
- A (today's API, can start now): detail opens with `GET /:id` and owns its state; writes replace that state; cancel / complete no longer drop the row; list chips call the single-value `status` (ใช้งาน temporarily = active, paused under its own chip until S1); page tests (prod-shaped JSON + failing load) for list + detail.
- B (after S1–S3 + kit): rows / hero / sections on the kit pieces, BE flags replace client logic, edit in place.
- C (after Q1 / S4): generation + drafts wiring, quick-create scheduled mode.
- D (only if Q5 = yes): custom recurrence.

### 3. BE asks
- **S1 List page-ready:** `status` multi-value (`active,paused`) + `all`, 400 on unknown values; `meta.status_counts`; per row: `variant` (recurring | installment | loan), `next_due {date, days_until, overdue}`, `progress {paid, total}` for installments, `actions {pause, resume, archive|cancel, generate, skip}`; optional `meta.monthly {expense, income}` for the header. Errors 4xx, not 500.
- **S2 Detail page-ready:** `GET /:id` (any status) = the view + `actions` + `next_due` + `progress {paid_count, total_count, paid_amount, remaining_amount}` + `upcoming[]` (next 3 dates) + `history {items (latest 20, paged later), count, total}`.
- **S3 Writes return the S2 shape:** pause / resume / cancel(or archive / restore) / update / generate; generate also returns `account_balances` + the created tx id; delete returns `{id}`.
- **S4 Generation** (shape depends on Q1 / Q2): a daily job in the user's timezone; idempotent per (schedule, cycle date) (generate-now posts only the due cycle, never a future one twice); skip archived wallets (→ auto-pause, see Q6); catch-up per Q2; pending-draft source `scheduled` if Q1 = drafts (confirm = tx with `scheduled_transaction_id`, reject = skip that cycle).
- **S5 Validation consistency:** `remaining_installments` defaults to total; update re-runs the recurring / installment checks and rejects edits of terminal rows; remaining → 0 by edit completes; category optional + clearable (decisions: tx category optional); fix the swapped error lists.
- **S6 Lifecycle per Q3:** archive / restore endpoints (or keep cancel) + the hide rule (archived = not in upcoming, dashboard, counts).
- **S7 openapi:** document every query param, request / response (incl. history, generate-now body), error codes; `page_flows.dart` gets updated to match (fe-core / hub owner).
- (Q5 = yes only) **S8 Recurrence:** `interval` + `by_weekday[]` + `by_month_day[]` (RRULE subset: FREQ / INTERVAL / BYDAY / BYMONTHDAY), the BE computes every next date.

### 4. Kit asks (fe-core, hub first, owner reviews there)
Fewest pieces, all shared with budgets / goals / debts / home:
- **K1 `StatusChip`** (molecule, generic): status kind (active / paused / done / cancelled / archived / warning / over) + label → `AppChip` with the right tone. Today the tone map is private to the scheduled hero.
- **K2 `DueText` / relative date** (domain, l10n via UiStrings): ISO date + `days_until` → "วันนี้" / "พรุ่งนี้" / "อีก 3 วัน" / "เลยกำหนด 2 วัน" + a localized short date. Kills raw ISO here, also fits home "coming up" and debts.
- **K3 list row:** either `TxRow` / `MoneyListTile` get a generic line-2 meta slot (texts / mini chips) + an optional status chip, or a domain `ScheduledRow` (+ skeleton). Recommendation: extend the existing row, no new class.
- **K4 `MoneyHistorySection`** (domain organism): dated amount rows (tap) + count / total footer + skeleton + empty. Reused by goal contributions and debt entries.
- **K5 quick create:** `QuickCreateMode.scheduled` + its mode colour token; `EntryCard` name slot label configurable ("ชื่อ" vs "ค่าอะไร?"); a compact schedule section (variant chips, cycle popover row, date row, installment fields) as a domain organism.
- **K6 offline:** `ActionBar` and `OptionMenuAnchor` actions disabled while offline (FE-B left page-specific buttons ungated).
- (Q5 = yes only) **K7 `RecurrencePickerSheet`** (generic, Google-Calendar "custom repeat": every N day / week / month / year, weekday toggles, multi-select `DayOfMonthGrid`) + a recurrence text formatter; reusable for wallet statement / due days.
No new pieces needed for: hero (`HeaderCard`), sections (`SectionCard` / `DetailRow`), progress (`ProgressRow`), totals (`SummaryStats`), dates (`showAppDatePicker`), popovers (`OptionMenuAnchor`).

### 5. Owner questions (short, with a recommendation)
1. **Automatic posting.** Today nothing posts by itself (only the "สร้างตอนนี้" button). On the due date the app should: (a) create a pending draft you confirm with one tap (amount editable, reject = skip) · (b) post a real transaction automatically. **Recommend (a)**; an "บันทึกอัตโนมัติ" switch per schedule can come later.
2. **Missed cycles** (after a pause or downtime). **Recommend:** resume starts from the next future date (no backfill); otherwise one draft per missed cycle.
3. **ยกเลิก → เก็บถาวร.** Replace the terminal "ยกเลิก" with the app-wide pair: เก็บถาวร (stops, hidden, not counted, restorable → paused) + ลบ (hard delete, generated txs stay). Filter chips ใช้งาน / เสร็จสิ้น / เก็บถาวร / ทั้งหมด. **Recommend yes** (old fe-plans Q4).
4. **Create flow.** Create in the one quick-create sheet (scheduled mode, preset on the scheduled pages, quick-form look); edit in place on the detail page. **Recommend yes** (old fe-plans Q1).
5. **Custom recurrence** (every N weeks, the 3rd and 27th…) in 0.3.1-10? **Recommend no:** keep the 4 cycles now; add a "กำหนดเอง…" option in a follow-up (BE model change + 1 kit sheet).
6. **Archived wallet.** A schedule on a wallet that gets archived: **recommend** auto-pause + a notice on the detail page; restoring the wallet doesn't auto-resume.
(Old fe-plans §7: Q1 and Q4 are folded into 4 and 3 above; Q2 / Q3 / Q5 are budgets / goals; there is no P6.)

---

## 2026-10-13 — Plan rev 2: recurring + upcoming transactions (read-only, nothing edited)
PLAN · follows `ai/decisions.md` "Recurring + upcoming transactions (owner 2026-10-13)". Extra BE facts from a read-only scan of `chubi-pocket-be` (below). Rev 1's facts about today's app / BE still hold; its plan, asks and questions are replaced.

### 1. Facts that shape the plan
- **Balances are stored.** `accounts.balance` is a cached sum updated by every tx write (`transactions/store.go:336 ApplyBalanceDeltaTx`, plus a copy in `scheduled_transactions/store.go:495`). Nothing recomputes it from transactions. It feeds wallet pages and totals, `LoadWalletBalances` (write responses), saving-goal progress (balance × allocation), `/me` goals, and dashboard net worth / card due.
- **Nothing is date-aware.** No read filters `date <= today`:
  - tx list + totals: from / to optional, so with no range future rows show
  - `/transactions/summary`, dashboard summary / categories / trend: whole month
  - dashboard "recent": no filter, so future rows would sort first
  - wallet summary: whole month
  - budgets spent: whole period
  - personal debts: split rows exist from creation, no date filter
  - projects: totals and counts have no date filter
- **No job runner, no push.** Notifications are created only inside user-action transactions (`notifications/dispatcher.go:51`).
- **"Today" is inconsistent:** `ResolveTimezone` (X-Timezone → preference → Asia/Bangkok) is used by dashboard / me / upcoming, but opening and adjust balance use server `time.Now()`, and debts use DB `CURRENT_DATE`.
- **Rows:** transfer = 2 rows (`transfer_group_id`); adjust balance = a system tx computed from the stored balance and accepts any date. `transactions.date` is DATE with `(user_id, date)` and `(account_id, date)` indexes; `scheduled_transaction_id` already exists (FK, SET NULL). Tx create accepts future dates today.

### 2. Pages (FE-RECURRENT) — hub templates + kit only
**A. Management page** (one page, replaces `/scheduled-transactions`; route / tab / crumb = fe-core): `TabbedListPageBody` with tabs [รายการประจำ] [รายการล่วงหน้า].
- **Tab รายการประจำ:** `ListToolbar` chips ใช้งาน (active + paused, default) · เก็บถาวร · ทั้งหมด (counts from the BE).
  - Rows: icon · name · amount (type colour). Line 2: rule text ("ทุกวันที่ 3") · next date (relative) · `n/N` when it has an end. A paused / ending-soon chip when it applies.
  - Tap → recurring page. + → recurring page in create mode.
  - Open = 1 call; chip switch = 1 call.
- **Tab รายการล่วงหน้า:** all future txs (standalone + 🔁 from a recurring), grouped by day like the tx list (same `TxRow`, 🔁 marker); chips ทั้งหมด · ประจำ · ครั้งเดียว.
  - Tap → tx detail. + → quick create (the owner picks the future date there).
  - Data = the tx list endpoint with the upcoming filter (one endpoint for this tab AND the tx-list chip), paged.

**B. Recurring page** `/recurring/:id` + create mode (`DetailPageBody` + `EditModeMixin`, contact-page reference; NOT a quick-create mode):
1. Hero: icon, name, description under it; top row = status chip (tap → central popover พัก / ทำต่อ, from the BE `actions`); ✏️ right. Footer: amount + next date (relative).
2. Tags row under the hero.
3. One headless box: wallet chip (+ "to" wallet if transfers are allowed, Q5) · category chip path · รอบ (popover: ทุกวัน / ทุกสัปดาห์ / ทุกเดือน / ทุกปี / กำหนดเอง… → multi-date sheet) · เริ่ม (date) · สิ้นสุด (ไม่มี / วันที่ / จำนวนงวด; the BE returns the count) · note.
4. Ending soon (2 left, from the BE): warning `AppMessage` + "ต่ออีก" (1 call).
5. Section "รายการ":
   - while no single tx was edited: the one-line summary ("Netflix 419 ฿ · ทุกวันที่ 3 · 4/12")
   - once any was edited: the list of its txs (past + upcoming, edited ones marked); tap → tx detail
6. Edit mode: archive (amber) + delete (red), then `DetailMeta`.
- Saving an edit asks the scope (ทุกรายการที่จะถึง / ทั้งหมด) when values changed. A rule change (cycle / dates / start / end) only rebuilds the upcoming txs.
- Open = 1 call (page-ready); save / pause / resume / extend / archive / restore / delete = 1 call each. The response is the new page state (+ `account_balances` only when a tx dated ≤ today changed).

**C. Edit-scope choice** (shared with tx detail): on save or delete of a tx that has a recurring parent, a central popover with 5 options: เฉพาะรายการนี้ · รายการนี้และถัดไป · รายการที่ผ่านมาทั้งหมด · รายการที่จะถึงทั้งหมด · ทั้งหมด. One call with `scope`.

**Removed:** `features/scheduled_transactions/*` (rebuilt as `features/recurring`), `draft_form_scheduled.dart`, the `scheduled:` flag in the quick-create sheet, the generate-now / history UI, and the 73 `scheduled*` arb keys (arb is append-only: old keys stay unused, new `recurring*` keys get appended).

### 3. Touchpoints owned by others
- **fe-core (kit / shell / router / quick create):**
  - routes + ShellTab entry for the management page
  - the More-tab entry
  - quick create: when the date is in the future, a hint line under the date ("รายการล่วงหน้า: จะนับเมื่อถึงวันที่ 3 พ.ย.")
  - the edit-scope popover wiring in the shared tx save path if it lives in the sheet
- **tx list / tx detail owner:**
  - a "ล่วงหน้า" filter chip on the tx list (same endpoint + flag as tab 2)
  - tx detail for a future tx: an "ล่วงหน้า" status chip in the hero top row
  - a "🔁 Netflix · งวด 3/12 ›" row linking to the recurring page
  - the scope popover on save / delete
- **home owner:** "coming up" = future txs from the dashboard block (the BE changes the source; the card look moves to the kit).
- **BE:** dashboard, budgets, reports / summary, wallet summary, saving goals, `/me` counts, debts, projects all become date-aware (S2).

### 4. BE asks
- **S1 Model / migration**
  - New `recurring_transactions` (replaces `scheduled_transactions`): user, name, description, note, icon, type (expense / income [/ transfer, Q5]), amount, account (+ to_account), category (optional), tags (join table), `rule_kind` (daily / weekly / monthly / yearly / custom), anchor day from the start date, `custom_dates[]` (custom), `start_date`, end (none / date / count; date ≤ start + 2 years; count → the BE computes the end), `generated_until` (horizon), status (active / paused / archived), timestamps.
  - `transactions`: rename `scheduled_transaction_id` → `recurring_id`, add `recurring_seq` (n) and `detached` / `edited` (true once edited alone).
  - Drop generate-now, `/history`, `/upcoming`, next_billing_date / remaining / interest / down payment / total (see Q6).
  - Migrate today's prod schedules per Q7.
- **S2 Date-aware rule across ALL calcs.** One "as of today" (the user's timezone via `ResolveTimezone`, everywhere: also opening / adjust balance and debts) and ONE shared SQL predicate `date <= :today` used by:
  - tx list (default; `upcoming=true` flips it to `date > :today`, sorted ascending)
  - totals / summary (range end clipped to today)
  - dashboard (summary, categories, trend, recent)
  - wallet summary, budgets spent, debts (split / personal_debts rows of a future tx are hidden until its date: join the tx date), project totals and counts
  - `/me` counts
  - Reports / ranges that end in the future simply show "as of today".
- **S3 Balances (stored today).** No job, so a stored "as of today" balance can't roll at midnight. **Recommended:**
  - keep `accounts.balance` = the sum of ALL rows (future ones included: writes keep using `ApplyBalanceDeltaTx` unchanged, every date, no special cases)
  - on read, the balance is `balance − SUM(rows of that account with date > :today)` (indexed on `(account_id, date)`, few future rows)
  - put that read in ONE helper used by wallets, wallet totals, `LoadWalletBalances`, saving goals, `/me` goals, dashboard net worth / card due
  - adjust balance: date must be ≤ today, delta computed against the as-of-today balance
  - alternative: drop the stored balance and `SUM(date <= today)` on read (simplest, more read cost)
  - not recommended: a daily roll job
- **S4 Horizon + extend:**
  - create writes every occurrence up to the end, or with no end up to the horizon (monthly / yearly 1 year, daily / weekly 3 months)
  - custom = one row per picked date
  - `ending_soon` = 2 or fewer upcoming left (also at the horizon of a no-end rule)
  - `POST /recurring/{id}/extend` writes the next block (no end: one more horizon; with an end: the owner picks a new end)
  - pause = delete the upcoming rows (date > today) and keep the past; resume = rebuild from tomorrow (Q2). Archive = the same + hidden; restore → paused. An archived wallet auto-pauses its recurrings.
- **S5 Edit scopes:**
  - `PATCH /transactions/{id}` and `DELETE` take `scope` = this | this_and_following | past | upcoming | all, applied to rows with the same `recurring_id`
  - field edits (amount, wallet, category, tags, description, note) update every row in the scope; a past-dated change moves balances like any tx edit
  - "this" sets `edited`
  - a rule / date change with `this_and_following` ends the old recurring before this row and starts a new one (Google Calendar behaviour), so the old one's past stays intact
  - one transaction per call; the response returns the changed tx (or recurring page state) + `account_balances`
- **S6 Endpoints (page-ready, 1 call per open / button):**
  - `GET /recurring?status=active,paused|archived|all` → rows with rule parts, next date + days_until, `n/N`, `ending_soon`, `status`, plus `meta.counts`
  - `GET /recurring/{id}` → setup + `actions` + `ending_soon` + either `summary` (no edited row) or `occurrences[]` (paged)
  - `POST /recurring` (create, writes rows) · `PATCH /recurring/{id}` (+ `scope`: upcoming | all)
  - `POST /recurring/{id}/pause|resume|archive|restore|extend` · `DELETE /recurring/{id}` (`keep_past` default true)
  - `GET /transactions?upcoming=true` (+ `recurring=only|none`)
  - tx responses carry `is_upcoming` + `recurring {id, name, seq, total}`
  - all of this in `openapi.yaml`
- **S7 Notifications without a job:** add `visible_from` (date) to notification rows; the inbox / unread count filters `visible_from <= today`.
  - "ending soon" (`recurring_ending`): a row created at create / extend time, visible from the date of the 2nd-last occurrence; it gets rewritten on extend / rule change / pause / delete
  - the same mechanism defers `split_created` for a future tx with splits until its date (Q4)
  - no push exists, so it is inbox only
- **S8 Clean-up:** remove the generate-now path and its balance copy (`scheduled_transactions/store.go:495`); remove the `/upcoming` window mismatch (dashboard keeps its own 14-day block, reading future txs).

### 5. Kit asks (fe-core, hub first)
- **K1 `StatusChip`** (generic): active / paused / archived / ending-soon / upcoming → `AppChip` tone. Shared with budgets / goals.
- **K2 `DueText`** (domain, l10n): date + days_until → "วันนี้" / "พรุ่งนี้" / "อีก 3 วัน" + a short Thai date. Also home "coming up" and the future-date hint.
- **K3 `RecurrenceText`** (domain, l10n): rule parts → "ทุกวัน" / "ทุกวันจันทร์" / "ทุกวันที่ 3" / "ทุกปี 3 ต.ค." / "กำหนดเอง 5 วัน" (+ "· 4/12").
- **K4 `MultiDatePickerSheet`** (generic organism): calendar multi-select, picked dates as removable chips, min / max (≤ 2 years). For custom recurrence.
- **K5 central popover with a title** (if `OptionMenu` has none): used by the 5-way scope choice and the cycle choice. No new class if the popover already takes a header.
- **K6 row extensions:**
  - `TxRow`: a 🔁 marker + optional `n/N`
  - the recurring list row: reuse `TxRow` / `MoneyListTile` with a generic line-2 meta slot and an optional status chip (no new class preferred)
- **K7 future-date hint:** a `dateHint` line under the date in `EntryCard` / `TxHeroCard` (fe-core already owns these).
- **K8 offline:** `ActionBar` / popover actions disabled while offline.
Not needed: hero (`HeaderCard`), sections (`SectionCard` / `DetailRow`), warning (`AppMessage`), dates (`showAppDatePicker`), tabs (`TabbedListPageBody`).

### 6. Order
1. Kit K1–K8 on the hub (owner review). In parallel, BE S1 / S3 / S2, then S4–S7.
2. FE builds the management page + recurring page against the S6 spec (pre-release: unbuilt APIs are OK), with page tests (prod-shaped JSON + a failing load) for both.
3. Touchpoints by their owners (tx list chip, tx detail row + scope, quick-create hint, home).
4. Delete the old scheduled feature + routes.

### 7. Owner questions (short, each with a recommendation)
1. **Pause / archive and the upcoming txs.** Pausing deletes the upcoming txs (individually edited ones too), and resuming rebuilds them from tomorrow. **Recommend yes** (nothing hidden is left lying around).
2. **Bulk edit vs individually edited txs.** "รายการที่จะถึงทั้งหมด" / "ทั้งหมด" overwrite only the fields you changed, on every tx in the scope, edited ones included. **Recommend yes** (like Google Calendar).
3. **Edit scope from the recurring page.** Editing the setup applies to the upcoming txs by default, with "ทั้งหมด" as the other choice (past ones change only when picked). **Recommend yes.**
4. **Splits / events on future txs.** A standalone future tx may have splits / an event; the other person's debt and notification appear ON the date, not at creation. Recurring setups have no splits / events this round. **Recommend yes.**
5. **Recurring transfers** (e.g. a monthly move to savings): each occurrence is a normal transfer. **Recommend yes** (cheap once rows are materialised).
6. **Installment extras.** Total / down payment / interest were never calculated. Proposal: drop them; an installment is simply a recurring with a count or end date and shows `n/N`. **Recommend yes.**
7. **Today's scheduled entries** (prod data). Active / paused ones become recurrings starting at their next billing date; cancelled / completed setups are dropped, their past txs stay as normal txs. **Recommend yes.**
8. **Archiving a wallet with upcoming txs.** The confirm says "มีรายการล่วงหน้า n รายการ"; standalone ones are deleted, recurrings pause. **Recommend yes.**

---

## 2026-10-13 — Plan rev 3: FINAL model (read-only, only what changed vs rev 2)
PLAN · follows `ai/decisions.md` "Recurring + upcoming (owner 2026-10-13, FINAL)". Work order: debts → events → recurring. Facts used: `pending_transactions` (migration 046) holds a POST /transactions body in `draft`, with free-text `source` + `source_ref`, and never touches balances.

### What rev 3 drops from rev 2
- Rev 2's S2 (date-aware calcs everywhere), S3 (balance minus future rows), S7 (`visible_from` on notifications) and the tx-list "ล่วงหน้า" chip are all gone: upcoming items never enter `transactions`, so totals, balances and reports stay as they are.
- Rev 2 questions 1, 4 and 8 are obsolete. 2 and 3 stand as defaults (no need to re-ask). 6 and 7 are kept below.

### Pages (changes only)
- **Management page** (tabs stay):
  - [รายการประจำ]: same as rev 2.
  - [รายการล่วงหน้า]: lists OCCURRENCES in state upcoming (one-off + 🔁), grouped by date.
    - Tap → the occurrence in the quick-form look (`EntryCard`), editable before its date (OT this month). Saving a 🔁 one asks the scope.
    - Row popover: ส่งเข้ารอยืนยันเลย · ข้าม (delete).
  - Pull-to-refresh = recheck (the open call runs the due check).
- **Recurring page** (rev 2 layout), section "รายการ" changes:
  - Summary line while nothing was edited; otherwise the occurrence list, each row with its STATE chip: ล่วงหน้า / รอยืนยัน / บันทึกแล้ว / ข้าม.
  - Row actions by state (popover): upcoming → edit · ส่งเข้ารอยืนยันเลย · ข้าม; pending → open the draft (pending page); done → open the tx; skipped / tx deleted → สร้างใหม่ (back to pending).
  - **Batch:** select-mode on the linked txs (kit `SelectionToolbar`) → edit fields / delete in one call.
  - Pull-to-refresh = recheck.
- **Edit scope popover:** same 5 options. "all past" = the linked real txs (balances move like any tx edit); "upcoming" = occurrences in state upcoming. Pending drafts are never touched (Q1).

### Touchpoints (others own them)
- **fe-core (quick create, shell):**
  - quick create with a date after today shows a line under the date: "รายการล่วงหน้า › จะเข้ารอยืนยันวันที่ 3 พ.ย." (tap → the management page, upcoming tab)
  - saving it is the usual ONE call; the BE answers with a one-off upcoming instead of a tx
  - route + More entry for the management page
- **pending owner:**
  - drafts with `source = recurring | upcoming` show a source chip "🔁 Netflix · 3/12" / "ล่วงหน้า"
  - submit / delete keep their one call (the BE updates the occurrence state)
- **notifications owner:**
  - new types `recurring_due` (grouped "มีรายการประจำรอยืนยัน n รายการ", tap → pending) and `recurring_ending` (tap → the recurring page)
  - pull-to-refresh on the notifications page = recheck (its open call runs the check)
- **tx detail owner:**
  - a linked tx shows "🔁 Netflix · งวด 3/12 ›" (→ recurring page) and asks the scope on save / delete
  - the date picker max = today (Q3)
- **home owner:** "coming up" reads occurrences (BE dashboard block).

### BE asks (replace rev 2 S1–S8)
- **R1 Model:**
  - `recurring_transactions` = the setup (rev 2 S1 fields, minus installment extras per Q5)
  - `recurring_occurrences`:
    - `id`, `user_id`, `recurring_id` (NULL = one-off), `seq`, `date`
    - value overrides (amount, wallet, category, tags, description, note; one-offs also splits / event = a full draft body); NULL = inherit
    - `edited`, `state` upcoming | pending | done | skipped, `pending_id`, `transaction_id`, timestamps
  - `transactions.recurring_id` (rename of `scheduled_transaction_id`) + `occurrence_id`
  - `pending_transactions.occurrence_id` (FK, UNIQUE): the idempotency key
- **R2 Due check:**
  - runs inside the boot call. **Recommend the badge-count call** (the one returning the pending + unread counts), so the new counts come back in the same response; the BE / fe-core confirm which call that is.
  - the open calls of the management page, the recurring page and notifications also run it
  - one DB transaction:
    1. `UPDATE occurrences SET state='pending' WHERE state='upcoming' AND date <= today(user tz) AND recurring active … RETURNING`
    2. insert one draft each (`source` recurring / upcoming, `source_ref` {recurring, seq, total})
    3. upsert ONE unread grouped `recurring_due` notification with the new total
  - safe on concurrent opens (row locks / the UNIQUE key)
  - also creates `recurring_ending` once when ≤ 2 upcoming are left
- **R3 Pending hooks:**
  - submit with an `occurrence_id` → the tx gets `recurring_id` / `occurrence_id`, occurrence `done`
  - deleting the draft → occurrence `skipped`
  - deleting the linked tx → occurrence `skipped` with `transaction_id` cleared
- **R4 Lifecycle:**
  - pause = the check skips it; on resume, the dates that passed while paused become `skipped` (Q2)
  - archive = pause + hidden; restore → paused
  - an archived wallet auto-pauses its recurrings
  - horizon + "ต่ออีก" (`POST /recurring/{id}/extend`) as rev 2
- **R5 Scopes:**
  - `PATCH` / `DELETE /recurring-occurrences/{id}` and the linked-tx `PATCH` / `DELETE /transactions/{id}` take `scope` (this | this_and_following | past | upcoming | all)
  - field edits apply across occurrences (upcoming) and linked txs (past)
  - a rule change with this_and_following splits the series
  - a batch endpoint covers the selected linked txs
- **R6 Endpoints (1 per open / button, page-ready, returning the new state):**
  - `GET /recurring?status=` (rows + counts) · `GET /recurring/{id}` (setup + `actions` + `ending_soon` + summary or occurrences [state, tx / pending ids], paged)
  - `POST` / `PATCH` / `DELETE /recurring` · `/pause|resume|archive|restore|extend`
  - `GET /recurring-occurrences?state=upcoming` (one-off + 🔁, paged)
  - `POST /recurring-occurrences/{id}/send` (to pending now; also re-create from skipped)
  - `POST /transactions` with a date after today (user tz) → 201 `{kind: "upcoming", occurrence}`
  - everything in `openapi.yaml`
- **R7 Clean-up:** drop generate-now, `/history`, `/upcoming`, the balance copy in `scheduled_transactions/store.go:495`; migrate today's schedules (Q6).

### Kit asks (changes vs rev 2 K1–K8)
- **K1 `StatusChip`** gains the occurrence states (ล่วงหน้า / รอยืนยัน / บันทึกแล้ว / ข้าม).
- **K7** is now the quick-create "upcoming" hint line under the date (fe-core).
- New **K9:** the quick-form edit of ONE occurrence reuses `QuickCreateSheetShell` + `EntryCard` in an "edit upcoming" variant (title + save, no mode chips). No new class if the shell takes those params.
- The rest is unchanged: K2 `DueText`, K3 `RecurrenceText`, K4 `MultiDatePickerSheet`, K5 popover title, K6 `TxRow` 🔁 marker, K8 offline. Batch uses the existing `SelectionToolbar`.

### Questions (few, each with a recommendation)
1. **Pending drafts in a bulk edit** ("รายการที่จะถึงทั้งหมด" / "ทั้งหมด"): left untouched, since pending ends the recurring process. **Recommend yes.**
2. **Dates passed while paused** are marked "ข้าม" on the recurring page (re-creatable with "สร้างใหม่"), not sent to pending on resume. **Recommend yes.**
3. **Moving a real tx to a future date** (tx detail edit): not allowed; future dates only come from quick create / the recurring page. **Recommend yes.**
4. **A linked tx deleted** from the tx pages: its occurrence shows "ข้าม" with "สร้างใหม่". **Recommend yes.**
5. **Installment extras** (total / down payment / interest, never calculated): drop them; an installment = a recurring with a count or end date (`n/N`). **Recommend yes.**
6. **Today's scheduled entries:** active / paused ones become recurrings from their next billing date; the rest are dropped (their past txs stay). **Recommend yes.**

---

## 2026-10-13 — BUILD: the API contract the FE codes against (until BE's spec lands)
Working assumptions for BE (`be`). Names are free to change; the FE follows the spec once it lands. All dates are `YYYY-MM-DD` in the user's timezone. Refs = the shared `AccountRef` / `CategoryRef` / `TagRef`.

**Recurring** (the setup / generator):
```
{ id, name, description, note, icon_code, type: expense|income, amount,
  account: AccountRef, category: CategoryRef|null, tags: [TagRef],
  rule: { freq: daily|weekly|monthly|yearly|dates, interval: 1..,
          weekdays: [1..7] (ISO, weekly), monthly: { mode: day|weekday, day: 1..31, nth: 1..5|-1, weekday: 1..7 },
          dates: [date] (freq = dates) },
  start_date, end: { kind: none|date|count, date, count },
  status: active|paused|archived,
  next_date: date|null, days_until: int|null,
  progress: { done: int, total: int|null },          // n/N; total null = no end
  ending_soon: bool,                                 // ≤ 2 upcoming left (incl. the horizon of a no-end rule)
  counts: { upcoming, not_created, pending, done, archived },
  edited_any: bool,                                  // false → the page shows the one-line summary
  actions: { pause, resume, archive, restore, extend },
  created_at, updated_at }
```
**Item** (one occurrence or a manual entry; part 2 + the upcoming tab):
```
{ id, recurring: { id, name, icon_code }|null (null = one-off), seq: int|null, total: int|null,
  date, days_until, type, amount, account, category, tags, description, note,
  status: upcoming|not_created|pending|done|archived,      // derived from the link + date + the archived flag
  link: { pending_id, transaction_id }|null, edited: bool, manual: bool }
```
**Calls** (1 per page open / button; writes return the new state):
- `GET /recurring?status=current|archived|all` (current = active + paused, default) → `{data:[Recurring], meta:{counts:{current, archived, all}}}`
- `GET /recurring/{id}` → `{recurring, items:{data:[Item], next_cursor}}` (items = produced, i.e. status ≠ upcoming, date desc). The due check runs here too (pull-to-refresh = recheck).
- `GET /recurring/{id}/items?tab=produced|upcoming&cursor=` (lazy tab / paging)
- `GET /recurring-items?status=upcoming&cursor=` (management tab รายการล่วงหน้า: one-off + 🔁, date asc)
- `POST /recurring` · `PATCH /recurring/{id}` (a rule / start / end change rebuilds the upcoming items) · `DELETE /recurring/{id}?delete_linked=` → Recurring / `{id}`
- `POST /recurring/{id}/pause|resume|archive|restore|extend` → Recurring
- `POST /recurring-items` (manual: `{recurring_id|null, date, …fields}`) → Item
- `PATCH /recurring-items/{id}` `{…fields, scope: this|following|past|upcoming|all, other_side: bool}` → `{items:[Item], account_balances?}`
- `DELETE /recurring-items/{id}?delete_linked=bool` → `{id, account_balances?}`
- `POST /recurring-items/{id}/create` `{target: pending|transaction, …fields}` → `{item, account_balances?}` (a date after today keeps it upcoming)
- `POST /recurring-items/{id}/archive|restore` → Item
- `POST /recurring-items/batch` `{ids, action: create|archive|restore|delete|edit, target?, fields?, delete_linked?}` → `{items, deleted_ids, account_balances?}`
(Superseded by BE's spec in openapi.yaml, tag Recurring; the FE follows the spec.)

---

## 2026-10-13 — BUILD: recurring pages (0.3.1-10)
DONE · analyze: 0 issues (whole tree) · tests: 772 pass / 1 fail (test/ui/tx_row_marker_test.dart = fe-core K2 TxRow in flight, not mine) · nothing committed / built / run.

**Files (all mine, new):** `lib/features/recurring/`
- `domain/recurrence_rule.dart`: the API's `rule` / `start_date` / `end` ⇄ the kit's `RecurrenceRule` (+ `ymd` / `parseYmd` / `today`)
- `domain/recurring.dart`: `Recurring` (page-ready: progress, counts, `edited_any`, `actions`, `ending_soon`), `RecurringWrite` (create / PUT body)
- `domain/recurring_item.dart`: `RecurringItem` (state = kit `OccurrenceState`, link = `pending_id` + `transaction` (`BoardSourceTx`, same shape as event bills)), `ItemPage` (page-numbered), `RecurringDetail`, `ItemWriteResult` (+ `applyTo`), `ItemScope`, `ItemTarget`
- `data/recurring_repository.dart`: every spec op (list / get / create / PUT / delete / pause·resume·archive·restore·extend / items / upcoming / item create·PUT·delete·create-from·archive·restore / batch), all writes return the new state; `account_balances` → `AccountsCubit.patchBalances`
- `presentation/pages/recurring_home_page.dart`: `/recurring`, `TabbedListPageBody` [รายการประจำ] (ListToolbar chips ใช้งาน / เก็บถาวร / ทั้งหมด with counts) [รายการล่วงหน้า] (all upcoming items, day groups, paged). Open = ONE call (the shown tab); the other tab loads lazily.
- `presentation/pages/recurring_settings_page.dart`: `/recurring/new` + `/recurring/:id/settings`, `DetailPageBody` + `EditModeMixin`: hero (icon, name, description, type chip popover, status chip) → tags → one box (amount, wallet / to-wallet, category, ทำซ้ำ, เริ่ม, สิ้นสุด, note) → archive / restore + delete (edit mode) → meta. ทำซ้ำ = Google-Calendar presets from the start date + "เลือกวันเอง…" (`showMultiDatePicker`). Save asks the scope (upcoming / all) when item values changed, then the linked prompt when produced items exist. Delete asks whether to delete the saved transactions too. Pops a `RecurringSettingsResult`.
- `presentation/pages/recurring_page.dart`: `/recurring/:id`, `TabbedDetailBody`: hero (✏️ → settings; status chip → พัก / ทำต่อ; amount; rule · n/N · next due) → "ต่ออีก" message when ending / paused notice → tabs [รายการ] (produced items, `SelectionToolbar` bulk: สร้างใหม่ / เก็บถาวร / ลบ, + เพิ่มรายการ) [ล่วงหน้า] (lazy; a one-line summary until an item was edited). Open = ONE call (`getRecurring`, which runs the due check: pull = recheck).
- `presentation/recurring_item_actions.dart`: the per-item popover by state (แก้ไข · ส่งเข้ารอยืนยันเลย · สร้างใหม่ · เปิดรายการรอยืนยัน / เปิดรายการ · เก็บถาวร / กู้คืน · ไปที่รายการประจำ · ลบ); edit / สร้างใหม่ / เพิ่มรายการ use fe-core's `showEntrySheet` (any field incl. the date; สร้างใหม่ = [รอยืนยัน] [บันทึกเลย]); edit asks the 5-way scope + the linked prompt; delete with a linked tx asks "ลบรายการจริงด้วยไหม" (`showLinkedPrompt`)
- `presentation/recurring_rows.dart`: thin model → kit `TxRow` wrappers (setup row, item row with `OccurrenceStateChip`), day grouping / labels
- `presentation/recurring_writes.dart`: `markRecurringChanged` → `DashboardCubit.markStale()` after every recurring write
- Tests: `test/features/recurring/recurring_pages_test.dart` (11): rule round-trip, item link/state parse; each page with prod-shaped JSON (one call on open), network down → error + retry, malformed body → error (no endless skeleton), create mode.
- arb: 84 `recurring*` / `upcoming*` keys appended (th + en), gen-l10n run.
- Deleted (fe-core rewired everything first): `lib/features/scheduled_transactions/**`, `test/features/scheduled_transactions/**`. The old 73 `scheduled*` arb keys stay (append-only), now unused.

**Waiting on fe-core (TODOs in code):**
- K2 TxRow `linked` 🔗 / `recurring` 🔁 / `progress` / status slot / `dimmed` (status rides in `source` for now)
- K3 `RecurrenceSheet` ("กำหนดเอง…": every N, weekdays, Nth weekday, end after N): today the presets + hand-picked dates; "ครบ n ครั้ง" picks from a 2–60 list
- K6 `showEditScopeChoice` (today an OptionSheet with the same 5 labels)
- StatusChip `onTap` + ▾ (the hero status uses an AppChip ▾ for now)
- page_flows: done by fe-core (test/hub green); repository paths are one literal per op for the endpoint scan

**Not done / notes:**
- No quick-create preset on the recurring pages (decisions say "decided when the page is reworked"): the centre + stays plain tx mode. Owner call.
- Item counts in the hero / tab badge refresh on the next open or recurring write (item writes return items, not the recurring).
- Not run on a device: the owner reviews in the app.

### Update (same day, later)
- Adopted fe-core's kit: `StatusChip(onTap)` (hero status), `showEditScopeChoice` + `EditScope` (replaces my `ItemScope`; `.toJson()` extension in `recurring_item.dart`), TxRow `statusChip` / `recurring` / `progress` / `linked` / `dimmed` / `metaLeading` (`DueText`) / `meta` in `recurring_rows.dart`. Those TODOs are gone; still open: K3 `showRecurrenceSheet` ("กำหนดเอง…", count field).
- `end` in write bodies now carries only the kind + its value (BE's `RecurrenceEndInput`).
- Final: analyze 0 issues · full test 783 pass / 0 fail.
- K3 adopted: "กำหนดเอง…" in the ทำซ้ำ picker and the สิ้นสุด row both open `showRecurrenceSheet(initial: rule)` (my 2–60 count list is gone). A hand-picked-dates rule opened in it comes back as monthly (kit behaviour). No open kit TODOs left in recurring.

---

## 2026-10-13 — ออม (saving) recurring type
DONE · tests: `test/features/recurring` 16 pass / 0 fail (own tests only, per the owner's new rule; no full analyze / test run) · `flutter analyze lib/features/recurring` 0 issues · nothing committed / built / run.
- **Models:** `Recurring` / `RecurringItem` gain `isSaving` + `goal` (`SavingGoalRef`, reused from pending); wire type `saving` (the `type` field stays a placeholder expense). `RecurringWrite` sends `type: saving` + `goal_id` (null = ยังไม่จัดสรร), never category / tags / to-account. The entry-sheet draft (`PendingDraft.isSaving` / `goalId`) and `itemFieldsJson` carry it, so edit / สร้างใหม่ / เพิ่มรายการ work for ออม items.
- **Settings page:** the hero top row gets a kind toggle [รายการ] [ออม] in edit / create (view mode shows an ออม chip). ออม box = amount · จากกระเป๋า · ออมเข้า (ยังไม่จัดสรร or an active goal, via an option sheet over `SavingGoalsRepository.list()`) · ทำซ้ำ · เริ่ม · สิ้นสุด · note. No category, tags or transfer. The name is optional for ออม (default "ออมเงิน" / "ออม · <goal>").
- **Lists / recurring page:** ออม rows and the hero use the 🐷 tile (`AppIcons.savingDeposit`), amount unsigned, line 2 "→ goal / ยังไม่จัดสรร". Item popover / pending link behave as for tx items (the 🐷 pending row itself is fe-core's).
- **Route + params for the goal page ("🔁 ออมอัตโนมัติ", fe-saving):** if the goal already has an auto-save recurring → `openPage(context, '/recurring/<recurringId>')`; else create with the preset → `openPage(context, '/recurring/new?type=saving&goal=<goalId>')` (optional `&account=<accountId>`). The router must build `RecurringSettingsPage(saving: type == 'saving', goalId: goal, accountId: account)` (fe-core wiring asked).
- arb: 6 keys appended (`recurringKind*`, `recurringFieldFromWallet`, `recurringFieldGoal`, `recurringSaving*`).
- Not done: a kit goal picker (an option sheet is used); amount > available is not checked (BE: red warning only).
