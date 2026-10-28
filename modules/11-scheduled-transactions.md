# 11 — Recurring (replaces Scheduled Transactions)

> **§0 — 0.4.1-1 "the transaction FILLS the occurrence" (migration 090, owner 2026-10-26 / 27). Wins over everything below.**
> - **Filled = the transaction.** A filled occurrence (a transaction or a saving entry) reads every value from it: amount, wallet, category, tags, description, note, date. Nothing is copied into the occurrence's draft (`also_update_link` is gone). The occurrence itself can't be edited or skipped while filled (409 `ALREADY_RECORDED`): edit the transaction, or unlink it first. A setting edit never touches a filled occurrence (`also_update_tx` / `tx_update` are gone).
> - **Deleting the transaction skips the occurrence**, from ANY path (the transaction page, a debt, an event bill, a split, a saving entry), in the same DB transaction. The occurrence keeps the transaction's last values and date (`edited`), and un-skipping it brings it back due with them. `skip_occurrence` is gone. Recurring's own deletes (setting / item with `delete_linked`) let go of the link first.
> - **A skipped (or paid) occurrence can be filled straight away**: confirm, link, or mark paid; the mark goes.
> - **Paid without a transaction keeps an amount**: the one sent, else the planned one; none → 400 `AMOUNT_REQUIRED` (bulk: `needs_amount`). It counts only in the setting's own stats, never in wallets, budgets or reports.
> - **At most 3 due occurrences.** When a 4th comes due while 3 wait, the setting pauses with `pause_reason = overdue_limit` ("ค้าง 3 งวด"). The 3 are stored and stay due and listed in ต้องจัดการ (`RecurringRef.pause_reason` on every item). Nothing after them is made. Clearing them doesn't resume it. Auto-create settings are never limited. Any pause stores the due occurrences, so they no longer vanish (the old paused-vanish bug). Reasons: `manual`, `overdue_limit`, `goal_inactive`.
> - **Resume = the current period's occurrence next.** The span from the pause up to it becomes a gap (`recurring_rules.gaps`): never made, never listed, not skipped. An installment ending by count shifts its numbers and its end (10 installments, 1–3 paid, back in Nov → no. 4 in Nov, no. 10 six months later); one ending by date keeps its date. Still 3 due → paused again at once.
> - **Auto-create never waits and never fails.** Amount 0 is recorded as 0; a wallet / category that is gone or archived is left off the transaction; every missed occurrence is made at the next due check. An archived wallet no longer pauses any setting. The app warns when auto-create is set with 0 or on a varying amount.

> **0.3.1-10 (migration 057, owner 2026-10-13 FINAL).** The scheduled-transactions module, its table, its routes and `transactions.scheduled_transaction_id` are gone (no migration of the old rows; installment / loan extras dropped). Shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`, tag **Recurring**. The file keeps its name so links still work.
>
> **Updated 2026-10-20 (0.4.0-2, migration 068).** Occurrences are COMPUTED from the rule (no horizon, nothing is written ahead). Recurring is out of pending: due occurrences are handled in the ต้องจัดการ card on the recurring pages. One-off upcoming items are gone (a future-dated transaction is a plain transaction, spec 04). New: "paid without a transaction", linking by occurrence, occurrence names, auto-create. Owner rules: `rules/decisions.md` → "Recurring occurrences, new model", "Recurring list page", "One-off upcoming is CUT". Fields, routes and errors: [`../api/api-document.md` §11](../ref/api-document.md#11--recurring-replaces-scheduled-transactions).

## 1. Two parts

1. **The setting** (`recurring_rules`) — the generator. A Google-Calendar-style rule plus the values of what it produces (type, amount, wallet / to-wallet, category, tags, note) and a name + icon. An occurrence's description is its occurrence name (see "0.4.0-2 occurrence names").
2. **The occurrences** — one per date of the rule. They are **computed from the rule on every read** and never written ahead. A row (`recurring_items`) is stored only when the user edits an occurrence (amount / date / name / note / wallet / category / tags), settles it (ยืนยัน = a transaction, จ่ายแล้ว, ผูก) or skips it. An occurrence is addressed by its setting + **slot** (the rule date it belongs to); a stored row also has an id.
   - A setting edit moves every untouched occurrence. An edited (stored) one keeps its values and replaces the computed one of the same period (monthly / yearly: the same calendar month / year; daily / weekly / custom dates: up to the next slot).
   - An extra occurrence can still be added by hand to a setting (manual). Items without a setting are gone (migration 068 deleted the one-off items and their pending drafts).

## 2. The rule

| `freq` | Meaning |
|---|---|
| `daily` | every `interval` days |
| `weekly` | every `interval` weeks on `weekdays` (ISO 1 = Mon … 7 = Sun; default the start's weekday) |
| `monthly` | every `interval` months, `monthly.mode` `day` (1–31; a short month clamps to its last day) or `weekday` (`nth` 1–5 or -1 = last, + `weekday`) |
| `yearly` | every `interval` years on the start's month / day (Feb 29 clamps) |
| `dates` | hand-picked `dates` (no end; the last date ends it) |

- Starts at `start_date`. **End**: `none` | `date` | `count`. A set end is at most **2 years after the start** (400 `END_TOO_FAR`).
- **No horizon.** Occurrences are computed for whatever range a page asks, so a setting with no end simply goes on (the detail page shows it a year at a time). "ต่ออีก" (extend) only pushes the END of a setting that has one; it generates nothing and re-arms the ending notice.
- Each occurrence has `seq` (its place in the rule, "3/12", for a setting with an end) and its `slot`. Moving an occurrence to another date never changes its slot or its name.
- **Tracked from the creation day.** Occurrences before the day the setting was created in the app count as **paid without a transaction**: never due, they count in installment progress, and a transaction can still be linked to one. So a setting typed with an old start date does not show a long overdue list.

## 3. Occurrence states

| State | When | Shown as |
|---|---|---|
| `upcoming` | computed, date after today | its date / อีก N วัน; the first one is ครั้งถัดไป |
| `due` | date today or earlier and not recorded / paid / skipped (overdue or due today). A computed state, not a draft | warning (รอยืนยัน / ค้าง), listed in ต้องจัดการ |
| `done` | recorded: linked to a transaction (paid with a transaction) | the transaction's amount; tag บันทึกอัตโนมัติ when auto-created |
| `paid` | settled WITHOUT a transaction ("จ่ายแล้ว": someone else paid, or paid outside the app) | จ่ายแล้ว |
| `skipped` | the user skipped it | ข้าม |
| `pending` | legacy only: a pending draft made before 0.4.0-2, still waiting | รอยืนยัน |

- Rows can also carry เลื่อนแล้ว (date moved), แก้แล้ว (edited) and สุดท้าย (the last one of a setting with an end).
- `paid` is not due, not expected in budgets and not an expense; it counts as paid for installment progress (n/N). A transaction can still be linked to it later.
- An occurrence with no known amount (a reminder, or a setting without an amount) that is due or falls in this month needs an amount (รอใส่ยอด, shown in ต้องจัดการ); it cannot be confirmed until the amount is typed.
- ยกเลิกการข้าม, ยกเลิกจ่ายแล้ว and deleting a stored row bring the occurrence back to its computed state by its date (due or upcoming).
- **Pause / resume (owner 2026-10-20).** While paused, a setting has no due, listed or auto-created occurrences; its stored rows stay. On resume, the occurrences that were due BEFORE the pause stay due, and the occurrences inside the paused gap (from the pause day to the day before resume) count as **skipped** (not paid, not due). A setting on an archived wallet is paused by the due check.
- **Archive** = pause + hidden from the list; **restore** → paused.

## 4. The due check (no job runner)

Runs inside the reads the app already makes: `GET /me/counts` (the boot call), `GET /dashboard`, `GET /notifications`, `GET /notifications/unread-count`, every recurring read and sync (pull-to-refresh = recheck). It does its work once per setting per day (a setting already looked at today is skipped), so reads do not write on every call. "Today" = the user's timezone (`X-Timezone` header → `preferences.timezone` → Asia/Bangkok).

1. Settings on an archived wallet are paused.
2. **Nothing is produced into pending.** "Due" is a state of the occurrence (§3), not a draft.
3. **Auto-create**: for settings with บันทึกอัตโนมัติเมื่อถึงวัน on, the occurrences that came due are recorded as transactions (see "0.4.0-2 auto-create"), then one grouped `recurring_auto_created` notice per user per day.
4. **One grouped `recurring_due`** notice counting the occurrences that came due since the last due notice (deep link `/recurring?focus=due`; spec 13 §2.9).
5. `recurring_ending` once per setting WITH an end when 2 or fewer occurrences are left (deep link `/recurring/{id}`; spec 13 §2.10); extend re-arms it. A setting with no end never sends it.

**Old recurring drafts** already in pending are left alone (no migration). The pending page is unchanged this round and shows them as อื่นๆ. Submitting one still links its occurrence. Confirming or skipping that occurrence on the recurring side deletes the old draft, so it cannot make a second transaction.

## 5. Settings: create, edit, pause, delete

- **Create** (+ on the list page): the rule, the values, kind, start / end and the auto-create switch. An occurrence dated on the creation day is due at once; earlier ones count as paid (§2).
- **Edit** changes the setting only. Every untouched occurrence follows; edited ones stay (§1). A rename reaches every unstored occurrence by itself (their names are computed).
- **ONE question, only when it matters (owner R20).** When the edit changes the name, category, wallet, tags or note AND the setting already has recorded transactions, the app asks once whether to apply the change to those N recorded transactions too (`also_update_tx`).
  - Yes = only those fields change on them, never their date or amount. A name is rewritten only on a transaction whose description is still the old automatic name. A wallet change moves the balances.
  - A transaction that cannot take the change (for example a transfer, or an archived wallet) is skipped, and the app says how many were not updated ("อัปเดตรายการที่บันทึกแล้วไม่ได้ N รายการ").
  - Date / frequency / amount changes never ask and never touch recorded transactions; they act on the computed occurrences only.
- **Pause / resume / archive / restore**: §3. **Duplicate**: a copy that starts today with the same end.
- **Delete** the setting: a hard delete of the setting and its stored rows. The app asks whether to delete its N recorded transactions too; otherwise they stay, unlinked.

Shapes, routes and errors: [`../api/api-document.md` §11](../ref/api-document.md#11--recurring-replaces-scheduled-transactions) (Rule JSON and detail, Rule edit).

## 6. Acting on an occurrence

Every action also works on a computed occurrence (by setting + slot); the first action stores its row. The same actions sit in the ต้องจัดการ card, the occurrence sheet and the detail page.

- **ยืนยัน**: creates the transaction now from the setting's values (or the occurrence's edits), dated on the OCCURRENCE date, not today, unless the user changed the date; description = the occurrence name. Refused while the amount is unknown.
- **ใส่ยอด**: type the amount of an occurrence with no known amount, then confirm.
- **จ่ายแล้ว**: settles it without a transaction; ยกเลิกจ่ายแล้ว undoes it. A transaction can still be linked later.
- **ข้าม**: skips it; ยกเลิกการข้าม brings it back. Skipping an occurrence that has a transaction asks "ข้ามงวดนี้?": เก็บรายการไว้ (the transaction stays, only the link goes) | ลบรายการ (the transaction is deleted, the balances come back).
- **ผูกกับรายการที่มีอยู่**: link an existing transaction (§7).
- **Edit this occurrence only** (the occurrence sheet, "แก้เฉพาะงวดนี้"): amount (แก้ยอด), date (เลื่อนวัน), name, note, wallet, category, tags. The row is stored as edited; the setting does not change. A recorded occurrence opens its transaction instead.
- **All at once, per setting** (a setting with 2 or more due): ยืนยันทั้งหมด (every due occurrence with a known amount → a transaction dated its occurrence date), จ่ายแล้วทั้งหมด, ข้ามทั้งหมด. The ones that could not be done are left out and reported: "เหลือ N งวดที่ยังไม่มียอด" (no amount yet) and "บันทึกไม่ได้ N งวด" (refused, for example an archived wallet or a deleted category). There is no confirm dialog for these yet.

Shapes: [`../api/api-document.md` §11](../ref/api-document.md#11--recurring-replaces-scheduled-transactions) (Writes by slot).

## 7. Transactions side (linking)

Owner linking rules (2026-10-20):

- **One occurrence ↔ one transaction**, of the setting's money type; a skipped occurrence cannot take one. When the occurrence already has a transaction, or the transaction already records another occurrence, the app asks first ("สลับรายการที่ผูก?"). Yes swaps: the previous transaction stays (only the link goes), and a transaction moving off another occurrence returns that occurrence to its computed state.
- **The transaction keeps its own date and amount** (an early or late payment is fine). The occurrence then shows the transaction's amount. When it differs from the setting's amount, the app asks "อัปเดตยอดรายการประจำด้วยไหม?" when linking from the transaction side (yes = the setting's amount changes).
- **Where:** quick create (ผูกกับ › รายการประจำ, the two-step picker below; the transaction is saved, then linked), transaction detail later, or the recurring side (ผูกกับรายการที่มีอยู่ opens a transaction picker: that type's transactions within ±45 days, nearest first, under น่าจะใช่ / ใกล้วันที่).
- **Two-step picker** (quick create, transaction detail):
  1. The settings of the transaction's type, nearest due first (overdue first, then the next coming, nothing due last).
  2. That setting's occurrences. The top option is **งวดใกล้เคียง** (the oldest overdue one, else the open one nearest the transaction's date), then ค้าง / งวดถัดไป / งวดที่ผ่านมา. Skipped ones are hidden. "เลือกรายการประจำอื่น" goes back to step 1.
- **Unlink**: the transaction stays; the occurrence goes back to due / upcoming by its date, or to paid if it had been marked paid first.
- **Deleting either side asks about the other:**
  - Deleting the transaction releases its occurrence: back to due / upcoming (paid if it was marked paid first). The delete can also skip the occurrence in the same step (`skip_occurrence`).
  - Skipping an occurrence that has a transaction: §6.
  - Deleting the setting: §5.
- No auto-match suggestion yet.
- A future-dated transaction is a plain transaction (spec 04). A transaction linked to an occurrence shows its recurring link (setting, n/N) on transaction detail.
- Cross-link edits never notify (it's all my own book).

## 8. Counts, readers and sync

- `GET /me/counts` → `counts.recurring {active_count, upcoming_count, due_count, needs_amount_count}`: active settings; occurrences in the next 14 days (not due); due / overdue ones (paid left out); this month's ones with no amount. Recurring is no longer in the pending counts.
- **Home ใกล้ถึง** (dashboard `upcoming`): the occurrences of the next 14 days, never the due ones (see "0.4.0-2 pages").
- **Budgets**: an unrecorded expense occurrence (due or upcoming) with a known amount inside the period counts as expected (รอจ่าย, source `upcoming`), inside the budget's scope; a recorded one counts through its transaction; paid and skipped ones count nothing. A future-dated transaction is source `future_tx` (spec 08).
- **Sync**: the `recurring` dataset (the settings list + each one's next occurrence) is synced; computed occurrences are not. The user's TODAY is part of its fingerprint, so the due state and the next date re-sync when the day changes, with no write. The app re-syncs at local midnight and on resume after the date changed.

## 9. Recurring ออม (saving goals v2) — retired

Retired in 0.4.0 (migration 064): a `saving` setting can no longer be created. Goal auto-saving replaced it (spec 09 §0.7; many auto-saves per goal in 0.4.0-2). Auto-saves still make their own 🐷 pending drafts; that is the goals module, not recurring. An old `saving` row the app does not know is skipped when read, not a crash.

## 10. Not in this release

Shared settings, installment / loan maths (interest, principal split), a background job runner (the due check and auto-create run on reads), auto-match suggestions when linking.

## 0.4.0 recurring (M4)

- **Four kinds** (`kind`, migration 064): `subscription` (an expense that repeats; `trial_until`, `yearly_cost`), `installment` (an expense with a COUNT of payments: `end.kind count` required, `progress {done, total}`), `income`, `reminder` (เตือนจ่าย: expense or transfer, the amount is optional: 0 / absent = none yet). `type` stays the money direction and the kind implies it when omitted; kind omitted = derived (income → income, transfer → reminder, expense with an end count → installment, else subscription). The old ออม / บิล / โอน types are gone (saving moved to the goals, a bill is a subscription / installment, a transfer is a reminder; old rows were migrated). Recurring `amount` / item `amount` are nullable (a reminder).
- **Unknown amount** (0.4.0-2): a reminder's occurrence has no amount until the user types it (ใส่ยอด, §6). Before 0.4.0-2 it was a pending draft with `needs_input`; that is gone.
- **Per-month figures** (the list's kind groups, `by_kind {count, monthly, yearly}` over the ACTIVE settings): daily = amount × 30.4375 / interval; weekly = amount × number of weekdays (none = 1) × 4.3481 / interval; monthly = amount / interval; yearly = amount / (12 × interval); custom dates = amount × the dates falling in the current month. `yearly_cost` = that × 12 (custom dates: × the dates; an installment is capped at amount × count). Transfers are not money in / out. The list page's month hero does NOT use these averages: it totals the real occurrences of the month shown.
- **Month list:** the occurrences of one month (stored + computed, every state, oldest first, active settings only) feed the list page and its calendar.
- **Duplicate:** a copy that starts today with the same end.
- Goal auto-saving replaced the ออม type (spec 09 §0.7); creating a `saving` recurring is no longer possible.

Fields (summary, per-setting figures, `current_occurrence`, `chain`, `stats`): [`../api/api-document.md` §11](../ref/api-document.md#11--recurring-replaces-scheduled-transactions).

## 0.4.0-2 occurrence names

Every occurrence has a name, "{setting name} {period}". It becomes the transaction's description when the occurrence is recorded (ยืนยัน, all at once, auto-create).

| Rule | Thai | English |
|---|---|---|
| daily | `ประจำวันที่ 20 ต.ค. 2026` | `Lunch – 20 Oct 2026` |
| every 3 days | `ประจำ 20–22 ต.ค. 2026` | |
| weekly | `ประจำสัปดาห์ 20–26 ต.ค. 2026` (across months: `28 ต.ค. – 3 พ.ย. 2026`) | `Swimming – week of 20–26 Oct 2026` |
| every 2 weeks | `ประจำ 20 ต.ค. – 2 พ.ย. 2026` | `Cleaner – 20 Oct – 2 Nov 2026` |
| monthly | `ประจำเดือน ต.ค. 2026` | `Netflix – Oct 2026` |
| every 3 months | `ประจำ ต.ค. – ธ.ค. 2026` | `Insurance – Nov 2026 – Jan 2027` |
| yearly | `ประจำปี 2026` (every 2 years: `2026–2027`) | `Car tax – 2026` |
| installment | `… งวด 5/12 ประจำเดือน ต.ค. 2026` | `iPhone 17 5/12 – Oct 2026` |

- Set from the SLOT: moving an occurrence's date never renames it. The span is sized from the rule's step, never from the next occurrence, so the last one reads like the others (an every-7-days rule reads as a week span).
- Custom dates and weekly rules with several weekdays are named like daily.
- The user's language from preferences (anything other than English is Thai), Gregorian years.
- A rename of the setting reaches every unstored occurrence by itself; a stored one keeps a name only if the user typed it. Recorded transactions keep their description unless the R20 question (§5) is answered yes, and then only where it is still the old automatic name.

## 0.4.0-2 auto-create (บันทึกอัตโนมัติเมื่อถึงวัน)

Owner 2026-10-20. A switch on the setting, in edit mode.

- **Only with a fixed amount and a wallet** (a transfer also needs its to-wallet). Otherwise the switch is disabled with a hint line, and the BE refuses it, also on a later edit that clears the amount or the wallet (the switch goes off first).
- **When an occurrence comes due**, the due check records its transaction without asking: dated the occurrence date, description = the occurrence name, with the setting's values or, for an edited occurrence, its edits. Skipped, paid and already recorded occurrences create nothing. The occurrence shows as recorded with the tag บันทึกอัตโนมัติ.
- **From the day it is switched on.** An occurrence due that day counts; ones due earlier stay in ต้องจัดการ. Turning it off and on again, or resuming a paused setting, starts again from that day (the time off is never back-filled).
- **Never re-created.** Deleting an auto-made transaction returns the occurrence to due, and auto-create does not make it again. An occurrence whose transaction is refused (for example an archived wallet) stays due and is not retried.
- **No clock job:** it runs in the due check, on the first app open of the day, so the transactions appear then, dated the day they were due.
- **Notice:** one quiet grouped `recurring_auto_created` per user per day, "บันทึกอัตโนมัติ N รายการ" → `/recurring` (spec 13 §2.11). The detail hero shows a บันทึกอัตโนมัติ chip.
- Money moves without a tap; the same checks as a manual transaction apply.

## 0.4.0-2 pages

Owner 2026-10-20 (list page mock in `rules/decisions.md` → "Recurring list page"). Every look comes from the kit / hub.

- **List page** (`/recurring`):
  - Big top tabs ภาพรวม | ปฏิทิน. Nothing folds; the page scrolls. `?tab=calendar` opens ปฏิทิน; `?focus=due` scrolls to ต้องจัดการ. The old เตือนจ่าย / ปฏิทิน / รายการล่วงหน้า tabs and the current / archived / all filter are gone.
  - Hero: the module tile + a month stepper. The month's pay and receive totals, summed from that month's real occurrences (skipped ones left out). Tiles รายการเดือนนี้ N | รอใส่ยอด N (tap → ต้องจัดการ).
  - ภาพรวม:
    - The month's occurrences in date order with a today line. This month: past rows are dimmed unless still waiting. A past month: all dimmed, no today line. A coming month: nothing dimmed.
    - Each row: date tile, occurrence name, tag (ค้าง / รอยืนยัน / จ่ายแล้ว / ข้าม / บันทึกอัตโนมัติ), wallet | n/N, the amount or รอใส่ยอด + "เฉลี่ย ฿x". A tap opens the occurrence sheet.
    - The ต้องจัดการ card (below).
    - รายการประจำทั้งหมด by kind: สมาชิก (฿/เดือน | ฿/ปี), ผ่อน (เหลือ ฿x, each row with its chain), เตือนจ่าย (เฉลี่ย ฿/เดือน), รายรับ (฿/เดือน), then หยุดไว้ last. Archived settings are not listed. 🔍 search and + sit in the section header. A row opens the setting's detail.
  - ปฏิทิน: the month grid (warning dots on days with something waiting) + the selected day's occurrences with their buttons. An empty day shows nothing.
- **ต้องจัดการ card** (list page and detail page):
  - The due occurrences (overdue + today) plus this month's coming ones that need an amount; on the detail page, only that setting's.
  - Grouped per setting. A setting with 2 or more due gets a header "ค้างตั้งแต่ {month} | N งวด" with the all-at-once actions (§6). Up to 3 rows each, then "ดูทั้ง N งวด" (list → the setting's page; detail → the ประวัติ tab).
  - Each row: date tile, a warning tag (รอยืนยัน, or อีก N วัน for a coming one), amount | wallet, the main button (ยืนยัน, or ใส่ยอด when the amount is unknown) and the other actions behind ⋯.
- **Detail page** (`/recurring/{id}`):
  - Hero, top to bottom:
    - identity + info box (the round, "ตั้งแต่ {month}" or the end) + ✏️
    - the next-occurrence box: calendar tile + "ครั้งถัดไป | อีก N วัน" (installment: "งวดถัดไป (n/N)") + the amount or รอใส่ยอด, with แก้ยอด (ใส่ยอด) | เลื่อนวัน | ข้าม
    - the occurrence chain (a setting with no end: an open chain from the history + the next 3), or an amount line chart for a setting with no fixed amount and 2 or more recorded amounts (dashed average, the next one a hollow "?")
    - 3 stats by kind: installment จ่ายแล้ว / เหลือ / งวดสุดท้าย; no amount เฉลี่ย / ครั้งก่อน / สูงสุด; otherwise ต่อเดือน / ปีละ / บันทึกแล้ว
    - chips: status ▾ (pause / resume) | kind | category | wallet(s) | tags | บันทึกอัตโนมัติ
  - The ต้องจัดการ card under the hero while something is due.
  - Tabs ประวัติ | ล่วงหน้า, each one flat card of rows (no month groups; more rows load as you scroll). ประวัติ = recorded / paid / skipped / due, newest first. ล่วงหน้า: a setting with no end shows a year at a time with ดูปีถัดไป / ไปที่เดือน; a setting with an end shows all of it.
  - A row tap opens the occurrence sheet; a recorded one opens its transaction.
  - Edit mode: the auto-create switch and the R20 question (§5).
  - Gone: the pending tile, batch select, the "add item" (one-off) tile, the old next-occurrence card.
- **Occurrence sheet** (quick create in entry mode, subtitle "แก้เฉพาะงวดนี้"): edits this occurrence only (no splits / event). Chips ข้าม / จ่ายแล้ว / ผูกกับรายการที่มีอยู่; once settled: ยกเลิกการข้าม, or ยกเลิกจ่ายแล้ว + ผูก. บันทึก saves the changed fields; ยืนยัน saves them and records the transaction (dated the occurrence date unless the date was changed). A legacy pending occurrence opens `/pending`.
- **Quick create:** ผูกกับ › รายการประจำ picks a setting, then an occurrence (§7).
- **Home ใกล้ถึง card:** the recurring occurrences of the next 14 days. A tap opens the occurrence sheet; a write reloads home. The group shows how many are due, and "ดูทั้งหมด" opens `/recurring?focus=due` (`/recurring` when nothing is due).
- **Budget detail:** an expected recurring row opens its occurrence sheet; a confirm / skip / link reloads the budget.
- **Notifications:** `recurring_due` "ไปจัดการ ›" → `/recurring?focus=due`; `recurring_auto_created` → `/recurring` (spec 13).

## 0.4.1-2 the "หนี้" kind (K, BE-3; migrations 111–112)
- **A setting tied to a person** (`kind` / `type` `debt`): a contact of mine (`contact_id`) or a typed name (`person_name`, Q-K1); `debt_kind` debt = จดหนี้ | repayment = จ่ายหนี้; `direction` paid | received (the app's arrow). Amount > 0; `account_id` optional (set = each entry also gets its transaction, system debt category); no category, tags or goal; never switches to a money kind.
- **A slot is filled by a person-book entry** (`recurring_items.debt_entry_id`): confirm / bulk confirm / auto-create book it through the debts service in the same DB transaction; mark-paid (one or bulk) books it without a transaction (Q-K2); link takes an existing entry of the same person, kind and direction (`debt_entry_id`). Answers carry `effects` (the entry, its person balance, its transaction). A connected contact gets the entry like a manual debt entry (today: no notice, Q-K6).
- **จ่ายหนี้ (K5):** an occurrence asks min(rule amount, what is owed that way now), worked out on read; a typed amount wins. With nothing owed a confirm answers 409 `NOTHING_OWED`. At the due check: nothing owed → every due occurrence is skipped and counts a zero round; the 3rd pauses the setting (`no_balance`, Q-K4). Something owed → the count restarts and only the newest due occurrence waits (missed rounds dropped, Q-K3). A `no_balance` setting resumes by itself once a new debt makes the person owe again (the due-check guard looks for it, so the next POST /sync does it); the next occurrence is the current period's.
- **Deleting the entry (K6)** skips its occurrence with its amount (trigger `personal_debts_recurring_skip`); un-skip = due with that amount.
- **Contacts (K7):** a deleted contact leaves the name (default 4); absorbing typed names into a contact moves the settings too.
- **Totals (K8):** debt settings count in month_pay (paid) / month_receive (received) and due_30d_total (paid) like money settings, and in the dashboard "ใกล้ถึง"; budgets never see them (only a booked transaction with a category counts there). `by_kind.debt`. The Recurring sync set follows contacts + personal_debts.
- **Person page (K13):** `DebtPersonPage.recurring` lists the person's "หนี้" settings (not archived, newest first) with debt_kind, direction, amount, next date / amount, due count, status, pause_reason; spec 12 links here.
