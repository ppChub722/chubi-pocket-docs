# Backlog (discussed, not started)

Lead keeps this list current. Delete an item once it's briefed, or move it into STATUS "In progress".

Release scope comes from `product/roadmap-1.0.md` (owner 2026-10-15). Items here that the roadmap puts out of scope (Play Store, monetization, web / admin, receipt photos, multi-currency) are dropped.

## 0.3.1-11: currency auto from the user setting (owner 2026-10-15; rules in decisions.md → Currency)
- BE: fill every record's currency from the user's setting; allow changing the user currency (relabel, no conversion).
- FE: remove hard-coded THB / ฿ (events create, budgets create, goals list, …) → the user's currency with its decimals; profile setting becomes editable with a warning.

## Offline mode leftovers (FE-B handoff 2026-10-13; the core is done, the tree is green)
- Page-specific submit buttons are not disabled while offline: quick create, auth, and pages with their own AppButtons.
- The shell wiring has no tests. Nobody has run it against a stopped local BE yet (ask DevOps to stop the container).
- The BE should spec `GET /health` in OpenAPI; it was added to the api_flows baseline.

## Bugs reported by the owner (logged, not briefed)
- **Bottom bar missing after a fast back** (2026-10-13, prod 0.3.1-9): pressing back quickly from an edit page that hides the bottom bar (via ShellChromeHider) to a main tab leaves the bottom bar hidden. Likely a race in the hide/show (the restore runs before the pop finishes, or the hide of the leaving page lands after the show). Owner: "ยังไม่แก้ รับเรื่องไว้ก่อน".
- **Contact detail "doesn't open"** (2026-10-13, prod build 55). FE-D checked it: NOT a code bug. The VPS went offline again ~21:55, and the page sits on the skeleton for 10–25 s (connect 10 s + receive 15 s) before the error + retry shows. Fix proposal (Lead: do it in the template, all detail pages):
  - any load failure, not only ApiException, → full-page error + retry (today a non-Api exception leaves the skeleton forever; contact_detail_page `_load` ~line 86)
  - show the error / retry sooner (shorter detail-load timeout)
  - add test/features/contacts/contact_detail_page_test.dart (prod-shaped JSON + a failing load); contacts has no page tests at all
- **Change password back to a separate page** (2026-10-13): undo the collapsible section in Profile settings; the entry row "เปลี่ยนรหัสผ่าน ›" goes in a section right under the username row (decisions.md updated).
- Seen in the same screenshot (not reported by the owner): on Profile settings, scrolled content shows through under the status bar at the top ("ชื่อที่แสดง" drawn behind the clock), and a filled email shows stacked (the one-row question is still open).

## Note for the scheduled / recurrence round (owner 2026-10-12)
- Places using DayOfMonthGrid (scheduled tx, wallet statement/due day…) may need CUSTOM recurrence: every N weeks, several days a month (e.g. the 3rd and 27th), etc.
- Consider borrowing the Google Calendar recurrence model (iCal RRULE: FREQ / INTERVAL / BYDAY / BYMONTHDAY) and its "custom repeat" UI.

## 0.3.1-10: debts rework (after the API cleanup, owner 2026-10-12)
- Debts UI gets finished ONCE in 0.3.1-10, together with the model rework (owner 2026-10-13). No more debts UI tweaks in 0.3.1-9: today's state is the hub-adopted minimal one; cancel sits in การจัดการ until the model removes it.
- API item C (`/personal-debts/people` + `/people/:key`, paged, live names) built together with the new debt model.
- The debts list builds its own search + chips outside ListToolbar (`personal_debts_page.dart:102`). Move it onto ListToolbar in the rework so it gets the 28 chips and the toolbar layout (FE-E 2026-10-13).
- Bugs held for that round:
  - "อัปเดตตาม" URL (`personal_debts_repository.dart:99`)
  - scheduled detail "not found" (the scheduled round)

## (done) App hub (design system), BOTH FEs, before any feature work (owner 2026-10-12: "design first, then features")
- Phase 0 map is DONE: `ai/inbox/fe-a.md` "App hub, Phase 0: THE MAP" (106 rows, missing atoms AppInput / AppCard / AppText…, 30 hub pages, FE-A/FE-B split, ~12–14 days). It has 8 owner questions, open.
- Phase 1 (the bulk move, a half-day freeze) starts after the 0.3.1-8 APK is out.
- **Architecture:**
  - ppForge UI library (core, later) → app UI layer = the gate (`ui.dart`, app tokens, domain components, app hub) → features import only the gate
  - no core yet: build the app hub now and extract the core from it later
- **Discipline:**
  - tag every piece `generic` / `domain`
  - generic pieces never import features / app models / l10n strings / money colours
  - tokens split into structure vs app values
- **Phases:**
  - 0. FE-A map (read-only): level, generic/domain, users, blockers, missing atoms (AppInput…), folder plan, hub URL map → owner review
  - 1. move files into `lib/ui/{tokens,atoms,molecules,organisms,templates,domain}`, no behaviour change
  - 2. the new English-only hub replaces /dev:
    - every piece gets its own page with all variants + "used by"
    - Templates: DetailPage / ListPage / FormSheet / TransactionDetail
    - Debug: Logs, Imports lab, Theme switcher
    - delete the old gallery + detail playground (D1)
    - QA re-points its scripts
  - 3. missing atoms, one at a time (hub first, then migrate)
  - 4. the detail standard leftovers, decided on the DetailPage template:
    - placeholder values: faint, tap → edit + add
    - 🔒 next to the value
    - every green section heading has a description right under it
    - tinted hero background + a faint watermark icon for every entity
    - wallet: "เลขอ้างอิง", one slip hint, a members description, the "ในรายงานของฉัน" duplicate
- FE-A's earlier /dev tidy-up proposal (ai/inbox/fe-a.md) is superseded by this plan.

## Debts rework (after the UI round; model agreed in principle, confirm details before briefing)
- **New model:**
  - a debt is a record "who owes whom how much"
  - "mark paid" is just a label; to stop counting a debt, delete it
  - repayment transactions tie to the PERSON (contact / name), not to a debt
  - net per person = debts − repayments (overpaid simply flips the side)
- No notifications on pay/receive (only on creation + split edits).
- **Quick create:** mode chips [รายการ] [จ่ายหนี้]. Debt mode = pick a person (PersonMark, only people with open debts) → amount → wallet; optional "mark these debts paid" (multi-select). From a debt page the centre + opens debt mode preset to that person; the + button colour follows the page.
- **Debt pages:**
  - list = people list like contacts (3-level PersonMark)
  - person detail = hero (net) + tabs "รายการหนี้" (default: a timeline of debts + repayments; search/filter/sort shows debts only) and "ประวัติการจ่าย" (repayment txs, with search/filter/sort)
- **BE work:** repayment tx linked to a counterparty instead of `source_personal_debt_id`; `settled_amount` semantics retired; person net endpoint; repayment history in the API. Debt PUT may change identity/amount only for manual debts (split debts are edited on the transaction).
- **Bugs:**
  - **B1–B7** (BE survey; most disappear with the new model)
  - the **"อัปเดตตาม" URL bug** on prod (`/personal-debts/split-changes//apply`)
  - FE debt survey issues: overpaid edit blocked, mixed currencies summed, stale caches, the "ค้างอยู่" label on settled
- **QA explore 2026-10-11** (`ai/inbox/qa.md`; scripts `ai/qa/`, `node run-debts.mjs`):
  - FAIL: "บันทึกเป็นผู้ติดต่อ" on the new-debt form creates no contact
  - FAIL: a deleted debt's URL shows a generic error, not "not found"
  - notes:
    - a cancelled debt still shows คงค้าง
    - deleting a debt leaves its repayment txs
    - English system category names "Debt Received/Paid"
    - ติด wording differs between the More tile and the list
    - the URL doesn't follow pushed pages
    - no discard prompt on the new-debt form
    - "ลบหนี้นี้" sits below the fold
- **Docs:** spec 12 / 13 / schema are stale (BE drift report). Rewrite them with the new model.

## Remaining pages (after the UI round; surveys done, discuss page by page with the owner)
- **Events:**
  - list shows only 20 (no paging)
  - THB hard-coded on a new event
  - type maxLength 50 vs BE 30
  - planned-on-create double call
  - the resolve tab is "coming soon"
  - the resolve sheet's category chip has no icon / colour (the model it gets has no getter; FE-D 2026-10-13)
  - multi-select add from the event page
  - member picker → PickerSheet
  - "โปรเจกต์ → อีเวนต์" wording (~33 strings)
- **Budgets:**
  - spent doesn't refresh after tx changes
  - THB on create
  - cards/period picker on kit
  - archived view
  - past periods (needs BE)
- **Scheduled:**
  - paused/cancelled vanish (FE-only bug: status=active hard-coded)
  - stale detail after cancel / last installment
  - raw ISO dates
  - status not shown in the list
  - the form is still old-style (shared DraftForm)
- **Saving goals:**
  - ฿ hard-coded in the list
  - no free-capacity hint on create
  - progress not refreshing
  - archived view
  - BE archived-wallet snapshot conflicts with the hide rule

## UI kit (pending owner decision)
- Chip sizes 3 tiers (mini 20 / chip 28 / control 32) + migrate every chip onto AppChip (steps 2–3: role chips on AppChip, then delete the old chips and the 4 Material chips).
- Detail patterns: pick one design for 7 divergences (✏️ placement, status placement, scheduled _VariantPill / goal AppBadge, archive colour, meta line, empty note on event/wallet, PickerTile vs DetailRow ›).
- Date picker is still Material (calendar): own picker later?

## Infra / process
- Offsite backup copy runs in release.sh; the prod QA account was declined.
- Migration squash + reset/seed scripts (deferred).
- VPS migration plan exists (`engineering/vps-migration.md`); bring it up only when the owner asks.

## Dashboard: "แผนเดือนนี้" (owner 2026-10-13: a dashboard sub-feature, later)
- Expected income (recurring) − recurring bills − goal contributions − category budgets = free to spend, plus a daily allowance. Built on Recurring.

## Small open items (0.3.1-11)
- Tapping a pending 🐷 saving draft confirms it directly; it should open an edit sheet first (fe-saving).

## NEXT: 0.3.1-11 UI review round (owner 2026-10-13 04:30; 0.3.1-10 shipped as is)
- Owner on the local build: "UI แปลกมาก น่าจะต้องปรับอีกเยอะ". Flow: owner sends screenshots per page → Lead discusses → fixes at the kit / template root (pixel tests) → release 0.3.1-11.

## Recurring + subscriptions round (owner 2026-10-17; discussed, not briefed)
- **Recurring picker (link a tx to a recurring):** tx detail and quick create get a "รายการประจำ" row in the section renamed "ผูกกับ" (owner 2026-10-17, was "แบ่งรายการ"; rows แบ่งกับคน · อีเวนต์ · รายการประจำ), right after the event row; the picker holds recurring + เตือนจ่าย, "likely" group first (category / amount match). Linking a เตือนจ่าย makes this tx the period's real amount. Mock: artifact "Chubi List Pages" → รายการ → Quick create. Tap → a recurring picker sheet (active rules, search; "+ create a new recurring from this tx" prefilled with amount / category / wallet / day). Linking makes the tx that period's occurrence (upcoming → in tx). Binds to the CURRENT period's occurrence (owner 2026-10-17): that occurrence is consumed (state → in tx with the tx id), so it leaves upcoming and no pending draft is made for it (an existing pending draft for it is removed). If the amount differs: ask once whether to update the rule; a mismatch is fine either way.
- **Subscription flag:** a "เป็นค่าสมาชิก" switch on the recurring setup (owner picked the switch over category-based). The recurring list card shows ค่าสมาชิก / บิลอื่น ๆ tiles with per-month + per-year totals (tappable filters).
- **Wanted:** 9 quarterly "review subscriptions" prompt (yearly totals, one-tap pause) · 10 free-trial end date + reminder 2 days before · 11 yearly renewal reminder 7 days before · 12 shared subscription (family plan): auto-create debts for the members each period · 15 installments "งวด 3/10 · ends …" · 16 move one occurrence's date / skip it · 17 calendar month view (interesting, later) · 18 reminder 1 day before due (needs push, 0.4).
- **Decided:** 13 how-to-cancel = just the note field · 14 an occurrence's amount is always editable (no averaging).
- **Also decided (owner 2026-10-17):** no "repeat" switch in quick create (the recurring picker covers it) · no templates · from slips → later, with the slip-scan work · duplicate: recurring page first (every record type later) · price change = the amount-mismatch question above.
- **Not picked yet:** 2 auto-detect repeating txs → suggest.
- **เตือนจ่าย (owner 2026-10-17):** bills / card payments are NOT recurring money. They become a recurring type "เตือนจ่าย": same setup (name, description, category, tags, wallet, rule; expense or transfer) but the amount is optional. On the day: a notification + a pending draft WITHOUT an amount ("ใส่ยอด"); the amount is entered in pending or on the recurring page; a draft without an amount can't be confirmed. Recurring types: ค่าสมาชิก / ผ่อนชำระ / รายรับ / เตือนจ่าย (no ออม: auto-saving lives on the goal; no บิล / โอน types).
- **Recurring page = 3 swipeable tabs** (labels visible, under the summary card): รายการประจำ · เตือนจ่าย · ปฏิทิน. One summary card: "30 วันข้างหน้า ต้องจ่าย ฿X · รอใส่ยอด n รายการ".
- **Page indicator on every swipe-tab page (owner 2026-10-17, noted, do later "all at once"):** the dots under swipeable tabs (active = a short teal pill, others = grey dots) on EVERY page with swipe tabs: wallet detail, event detail, recurring (3 tabs), saving-goal detail (2 tabs), plus any other TabbedListPageBody / AppTabBar page (fe-core to list them). One kit piece (name proposal `AppPageIndicator`), exported in ui.dart and demoed in the hub (hub convention); built into the swipe-tab template so pages get it for free. Placement (owner 2026-10-17): at the END of each tab's content, in the flow (not floating, not sticky, not under the tab bar). lib/ui is frozen → do it with the library UI round or as a kit exception.
