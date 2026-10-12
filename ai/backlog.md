# Backlog (discussed, not started)

Lead keeps this list current. Delete an item once it's briefed, or move it into STATUS "In progress".

## 0.3.1-9 (in progress): App hub + API hub + API rework (forced update)
- The App hub (Phases 1–4) is DONE and uncommitted.
- API hub:
  - BE writes the OpenAPI spec (A, B, D, E, F, G from ai/inbox/be.md; breaking OK) + `/api/v1/openapi.json`
  - FE-A adds the API + Labs sections to /#/dev
  - **the owner reviews the spec before any code**
- Then the BE implements A/B/D/E/F/G and the FEs adopt them (thin FE); pages not reached yet only get minimal shape adaptation.
- FE-only fixes (FE-B): wallet by id, patchBalance, badge double start, drill-down filter, lazy contacts, event picker cache.

## Note for the scheduled / recurrence round (owner 2026-10-12)
- Places using DayOfMonthGrid (scheduled tx, wallet statement/due day…) may need CUSTOM recurrence: every N weeks, several days a month (e.g. the 3rd and 27th), etc.
- Consider borrowing the Google Calendar recurrence model (iCal RRULE: FREQ / INTERVAL / BYDAY / BYMONTHDAY) and its "custom repeat" UI.

## 0.3.1-10: debts rework (after the API cleanup, owner 2026-10-12)
- Debts UI gets finished ONCE in 0.3.1-10, together with the model rework (owner 2026-10-13). No more debts UI tweaks in 0.3.1-9: today's state is the hub-adopted minimal one; cancel sits in การจัดการ until the model removes it.
- API item C (`/personal-debts/people` + `/people/:key`, paged, live names) built together with the new debt model.
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
