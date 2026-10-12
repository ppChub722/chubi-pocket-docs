## 2026-10-12 — FE-D events pages: Phase 0 PROPOSAL (no code changed)
PROPOSAL · read-only scan (3 sub-agents: FE feature, BE module, hub kit) · files: none edited
Sources: ai/decisions.md (Design system, Thin FE, Dev hub, Events, Splits), ai/backlog.md "Remaining pages → Events", ai/reports/api-audit-2026-10-12.md, lib/ui + lib/hub, openapi.yaml, be/internal/modules/projects, lib/features/projects.

Terms: code name stays `projects` (API/route/files); UI copy says "อีเวนต์". BE routes are at `cmd/api/main.go:436-460`; **openapi.yaml documents only 3 of the 25 project routes** (`/projects/{id}/transactions`, `/bills`, `/quick`, all touch-points). The hub API page therefore can't show the event API → ask A10.

---
### 0. Today in one table
| Page | Opens with | Per button | Layout today |
|---|---|---|---|
| list (`projects_page`) | 1 GET /projects (+ a 2nd on every return from detail, skeleton flash) | filter = 1 GET | ListView by hand, private `_ProjectCard`, **no paging (BE default 20, FE never sends page)** |
| detail (`project_detail_page`) | **4 GETs** (project, members, transactions per_page=100 page 1, summary) | every tick/untick/delete/save/status/add = **the same 4 GETs again** | Scaffold + own tab bar (no NestedScroll/CompactHero), private `_LockBanner`, `_BarRow` |
| board rows (`project_tx_tiles`) | – | tick = resolve sheet (POST /transactions + bookChanged + accounts.load + PUT mark) + 4 GETs | `_ChildRow`, `_ResolveSheet` 225 lines of client rules |
| members (`project_members_page`) | 2 GETs (project again + members) | each action + 2 GETs, then detail does 4 more on return | raw Material `ListTile`, hash-colour avatar |
| form (`project_form_page`) | – | save = POST + (plan) PUT, then pushReplacement → 4 GETs | page + EditModeMixin; type maxLength 50 |
Client-side business logic to remove (Thin FE): tree building (`buildProjectTxTree`), paid-by / top-tags / recent aggregation (dashboard:38-73), filter+sort over whole list (tx_list_tab:38-74), canAddTx / rowsLocked / isResolveReady / isOwner rules (project_common:93-115), resolve rules (tiles:144-150, 439-458), currency = first row's or 'THB' (project_common:105).

---
## 1. Layout from hub pieces (+ new shared pieces)

Tabs for detail: **สรุป · รายการ · สมาชิก** (Q2). Recipe = accounts detail (`account_detail_page`: CompactHeroScope + NestedScrollView + pinned AppTabBar + AppTabPager, edit mode forces tab 1 and disables paging). Resolve folds into สรุป as a section (Q1), so no 3rd "coming soon" tab and no separate members page.

### 1a. Events list — template `ListPageBody`
- Pinned header: `AppInput.search` + `FilterBar` (status filter via `OptionMenuAnchor`/`AppChip`, sort chip) — all existing.
- Rows: NEW `EventCard` (domain/events) replaces `_ProjectCard`: icon, name, status AppChip (mini), meta line (members · date range), plan progress (`ProgressRow` when planned), my net `MoneyText`. Dimmed when locked (cf. `ListRow.dimmed`).
- States via `ListPageBody` (skeleton first load only, error+retry, `EmptyView`); empty CTA for every filter, not just "active". `AddTile` footer kept.
- Paging: extend `ListPageBody` with `onLoadMore`/`hasMore` + a small footer spinner (shared with FE-C/FE-E lists; ask FE-A).

### 1b. Event detail — `HeaderCard` + tabbed shell (accounts recipe), edit via `EditModeMixin`
- Hero `HeaderCard`: top row = status AppChip (tap = status sheet, owner only) + type AppChip; title = `AppInput.title` in edit; footer = plan `ProgressRow`. ✏️ owner only. Titles never change; `CompactHeroScope` bar appears when hero scrolls away. Lock/lifecycle notice = existing `MessageBanner` (drops private `_LockBanner`).
- **สรุป** tab (`SectionCard`s, DetailPageBody `buildSections` pattern): (1) totals `SummaryStats` (expense/income/plan); (2) "ตำแหน่งของฉัน" my paid/share/net; (3) per-member positions: NEW `PositionRow` (PersonMark + paid/share + signed `MoneyText`); (4) เคลียร์ยอด settlement suggestions (Q1/A9); (5) by tag: `ProgressRow` list (replaces `_BarRow`); (6) note/description `DetailStacked`, long-press edit; `ManageSection` (archive amber + delete red, edit mode only) + `DetailMeta`.
- **รายการ** tab: `FilterBar` (type / only mine / sort / tag) + search; rows NEW `EventBillRow` (+ child rows for splits) grouped by `DateGroupHeader`; `AddTile` / FAB-style add. Server paged.
- **สมาชิก** tab: `SectionCard`s per status (active / pending / left) with NEW `PersonRow` rows; add via picker; owner row actions via existing `showActionSheet`; "leave" = `DangerRow`.
- Locked/permission state: BE flags (`can_add_bill`, `can_edit`, `can_manage_members`, `is_owner`) drive enabled/disabled; no role logic in FE.

### 1c. Board / bills
- `EventBillRow` (NEW, domain/events): leading tick (`SelectCheck`-style resolve state), title (description ?? tags ?? "—"), payer mini `PersonMark` + tags (`TxRow`'s tag InlineSpans style), amount right (`MoneyText`), line 2 = split summary; locked rows are inert (fixes the empty action-sheet bug).
- Child (split) rows: `SplitRow` look (aligned slots, PersonMark 3 levels) read-only, "ส่วนของฉัน" muted; the tick on a child = my resolve.
- Add existing bills (multi-select): `PickerSheet` + multi-select mode (NEW `PickerRow` multi: square checkbox atom `SelectCheck`, footer button "เพิ่ม (n)") listing attachable bills (A7). New single bill = existing quick-create in event mode (unchanged scope).

### 1d. Members + member picker
- Members rows = `PersonRow` (NEW, molecule/domain-people; PersonMark 3 levels + `reserveLinkSlot`, name, caption, role AppChip, trailing slot). Kills `ProjectMemberAvatar` (hash-colour, hard-coded palette). `PersonRow` is likely reusable by contacts/debts → ask FE-C.
- Add member = `PickerSheet` (searchable, multi-select) over contact candidates (A8) + `PickerCreateRow` "เพิ่มเป็นชื่อ “…”" for ad-hoc; email invite only as a fallback field inside the create row. Replaces `AddMemberSheet` + `showContactPickerSheet`. Role stays contributor; role toggle in the row action sheet.

### 1e. Resolve sheet (per row, my share)
- `FormSheet` (title "เคลียร์รายการนี้", primary "เคลียร์"): header shows my share (read-only `MoneyText`, from BE); kind = `SelectCardGroup` (บันทึกเป็นรายการ / บันทึกเป็นหนี้ — only the kinds BE says are allowed); wallet + category = `DetailRow.pick` → existing pickers; saving overlay; failed save stays (snackbar above sheet). Undo-resolve = tick again (1 call).
- No client rules: BE decides can-resolve, amount (my share), direction, counterparty, currency.

### 1f. Event form (create; edit stays inline on detail)
- Create page = `EditModeMixin` + `DetailPageBody` with `_isCreate` (category create recipe). Hero: `EditableCircle` icon + `AppInput.title`. Sections: "ข้อมูล" (type = free text `AppInput` + preset `AppChip`s ทริป / ปาร์ตี้ / โปรเจกต์ …, TextLimits.eventType = 30), "งบ" (planned `AmountInput` + `CurrencyTile`), "วันที่" (start/end `DetailRow.pick`), description/note (TextLimits). One POST.

### New shared pieces (FE-A builds; each also goes in ui.dart + hub; I'd file them under `domain/events` + one people/pickers)
1. **EventCard** — domain/events — the list row (see 1a).
2. **EventBillRow** (+ child row) — domain/events — board bill row with resolve tick.
3. **PositionRow** — domain/events (or domain/people) — member paid/share/net line.
4. **PersonRow** — domain/people — member/contact row on PersonMark (shared need with contacts/debts).
5. **PickerRow multi-select mode + footer count button** — organisms/picker_sheet — multi add bills / members (check with FE-C/FE-E, same need).
6. **ListPageBody `onLoadMore`** — templates/list_page_body — paging.
Not new: LockBanner → `MessageBanner`; `_BarRow` → `ProgressRow` (maybe a `leading` param); status label/tone helper stays a feature helper supplying Thai strings. `TextLimits.eventType` token = FE-A.
Hub-first: pieces 1–6 are demoed in the hub (Domain "events" page + Pickers/Templates pages) and reviewed by the owner before I touch pages.

---
## 2. Target API flow (Thin FE) — asks to BE
Principle: open = 1 call, button = 1 call, write response returns the new state.

| Page / action | Target | Today |
|---|---|---|
| list open / filter / search / page | **GET /projects?status&q&sort&page&per_page** → rows already hold: id, name, type, icon, status, currency, planned_amount, total_expense, my_net, members_count (active), start/end, my_role, is_locked. Real paging, `status=all` documented. | 1 + 1 on every return; no q; no paging |
| detail open | **GET /projects/:id/detail** → `{project (+currency, my_member_id, my_role, flags: is_owner/can_add_bill/can_edit/can_manage_members), summary (totals, plan, my_position, members[] with is_me/paid/share/net, by_tag with share, settlement[] if kept), members[] (MemberRef: name/icon/is_me/linked/status/role), board: {rows (first page), pagination}}` | **4 calls** |
| board tab filter / page | **GET /projects/:id/transactions?type&mine&q&tag&sort&page&per_page** → parent rows with nested `children[]`, embedded `transaction_member`, `my_share`, `my_resolve {can_resolve, marked, copy_tx_id}`, `locked` | flat parents+children, bare ids, FE joins, 100-row cap |
| add / edit / delete a row, tick, status change, member change | each **1 call → returns `{row?, summary, project?, members?, account_balances?}`** (a "patch") the FE applies; no refetch | 4 GETs after each |
| resolve | **POST /projects/:id/project-transactions/:pt/resolve** `{kind, account_id?, category_id?}` → atomic mark + personal tx/debt, returns patch + `account_balances` | POST /transactions + bookChanged + accounts.load + PUT mark + 4 GETs |
| add existing bills | `GET /projects/:id/bill-candidates?q&page` (or `GET /transactions?attachable_to=…`) then existing `POST /bills` with many `transaction_ids` (returns patch) | no candidate list; FE filters whole tx cache |
| member picker | `GET /projects/:id/member-candidates?q` (contacts not yet members, linked flag) + `POST /members` accepting `contact_id` list or `{display_name}` ad-hoc | FE reads contacts cubit, sends email |
| create | **POST /projects** accepts planned_amount, currency, start/end, type ≤ 30 → returns detail-ready Project; FE navigates, detail = 1 call | POST + PUT, dup on retry |
| members page | gone (tab inside detail payload) | 2 + 4 GETs |

BE asks (numbered, for Lead to route):
- **A1** list rows page-ready + q/sort/paging + status=all documented.
- **A2** `GET /projects/:id/detail` page-ready payload (above).
- **A3** board rows: nested children, embedded member (implement the existing `BoardRowTouch`/`transaction_member` touch-point), my_share, my_resolve, locked, server filters + paging.
- **A4** every event write returns a state patch (+ account_balances where money moved) — row create/update/delete, mark, bills add/remove, status PUT, member add/update/remove, leave/transfer.
- **A5** project **currency** (column, set at create, immutable once rows exist; rows inherit it; summary single-currency); create accepts planned_amount/dates/currency; validate end ≥ start; type ≤ 30.
- **A6** atomic resolve endpoint (kind rules, my_share amount, debt direction/counterparty server-side).
- **A7** bill-candidates endpoint (billable, not already in an event, not transfer/repayment/system category), searchable + paged.
- **A8** member candidates + add by contact (multi) + ad-hoc; real `request-link` (re-send invite) or delete it; AddMember bad input returns 400 not 500; `members_count` (≠ pending) vs `summary.member_count` unified.
- **A9** (only if Q1 = settlement) `settlement[] = [{from_member, to_member, amount}]` minimal transfers in summary.
- **A10** OpenAPI for all 25 project routes with `x-used-by` (event-list / event-detail / event-members / resolve-sheet / event-form) so the hub API page covers events; also `is_resolve → is_repayment` rename pending in Go.
→ 10 API asks.

---
## 3. Thai strings (proposal only; I won't touch the arb)
**Wording sweep "โปรเจกต์ → อีเวนต์":** ~33 arb lines still say โปรเจกต์ (navProjects "โปรเจกต์ & อีเวนต์" → "อีเวนต์"; moreProjects, debtSourceProject, pendingSourceProject, projectsSearchHint, projectsEmptyTitle, projectsNoMatch, projectNewTitle, projectEditTitle, projectNameLabel, projectStatusLockBody, projectDeleteBody, projectDeleted, projectTxEmpty, projectResolveDebtHint, projectLeaveBody, projectLeft, projectMemberRemove, projectTxNewTitle, projectTxDescriptionPast, notifProjectTxForYou/Changed/Invite/Added, notifGroupProjects, notifType*, notifAutoResolveProject, projectDeleteThis, projectIconLabel …). This edits existing values in place (keys unchanged), which conflicts with "arb append-only" → needs Lead's OK (Q5). Keys are NOT renamed now (Phase 3).
Dead keys left in place: projectsPlaceholderTitle/Message, projectResolveComingSoon (+ delete dead `projects_placeholder_page.dart`).

**New keys (th):**
- list: eventsFilterEmpty "ไม่พบอีเวนต์ในตัวกรองนี้", eventsSearchHint "ค้นหาอีเวนต์"
- tabs: eventTabSummary "สรุป", eventTabBills "รายการ", eventTabMembers "สมาชิก"
- form: eventCurrencyLabel "สกุลเงิน", eventCurrencyLocked "เปลี่ยนไม่ได้เมื่อมีรายการแล้ว", eventStartDateLabel "วันเริ่ม", eventEndDateLabel "วันสิ้นสุด", eventDatesInvalid "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", eventTypePresetTrip "ทริป", eventTypePresetParty "ปาร์ตี้", eventTypePresetProject "โปรเจกต์", eventTypePresetOther "อื่น ๆ"
- summary: eventPositionsTitle "ตำแหน่งของแต่ละคน", eventPositionPaid "จ่ายไป", eventPositionShare "ส่วนของตัวเอง", eventPositionNet "สุทธิ"
- settlement (Q1): eventSettlementTitle "เคลียร์ยอด", eventSettlementDesc "ใครต้องจ่ายใคร", eventSettlementLine "{from} จ่าย {to}", eventSettlementDone "เคลียร์ครบแล้ว"
- bills: eventBillsAddExisting "เพิ่มบิลที่มีอยู่", eventBillsPickerTitle "เลือกบิลเข้าอีเวนต์", eventBillsAddCta "เพิ่ม ({n})", eventBillsPickerEmpty "ไม่มีบิลที่เพิ่มได้", eventBillsAdded "เพิ่ม {n} บิลแล้ว"
- members: eventMemberAddTitle "เพิ่มสมาชิก", eventMemberSearchHint "ค้นหาผู้ติดต่อ", eventMemberAddByName "เพิ่มเป็นชื่อ “{name}”", eventMembersAdded "เพิ่ม {n} คนแล้ว", eventMemberInviteAgain "ส่งคำเชิญอีกครั้ง"
- resolve: eventResolveTitle "เคลียร์รายการนี้", eventResolveCta "เคลียร์", eventResolveAsTx "บันทึกเป็นรายการ", eventResolveAsDebt "บันทึกเป็นหนี้", eventResolveMyShare "ส่วนของคุณ", eventResolveUndo "ยกเลิกการเคลียร์"
- manage: eventArchiveThis "เก็บอีเวนต์ถาวร", eventLoadMoreFailed "โหลดเพิ่มไม่สำเร็จ"
- errors: eventErrNotMember, eventErrReadOnly (map BE PROJECT_LOCKED / PROJECT_NOT_ACTIVE / FORBIDDEN_ROLE; now surfaced as raw)

---
## 4. Backlog issues closed
Listed in the brief: list shows only 20 (A1 paging) · THB hard-coded (A5, project currency, no 'THB' fallback) · type maxLength 50 vs 30 (TextLimits.eventType=30) · planned-on-create double call (A5, single POST; also fixes duplicate-on-retry) · resolve tab "coming soon" (settlement section / removed tab) · multi-select add (A7 + multi PickerRow) · member picker → PickerSheet (A8) · wording sweep (~33 lines).
Also closed by the same design: detail 100-row truncation (dashboard totals vs list mismatch) · 4-GET refetch amplification and members-page re-fetch · list skeleton flash on return · silent reload errors / spinner hang on non-Api exceptions (the page-state rewrite uses AsyncStateView; errors visible) · locked child row still opens an empty sheet · hash-colour `ProjectMemberAvatar` (→ PersonMark) · dead `ProjectsPlaceholderPage` and unused `requestLink` · list empty CTA only for "active" · "all" status sent literally · type/dates not editable after create · add-member no validation/dedupe (BE-side now) · per-row `_ResolveSheet` client rules (A6).
Not covered here (still open): quick-create event-mode sheet internals (transactions feature, owned elsewhere; I'd only adapt it to the new patch responses) · pending/draft event picker (uses `ProjectsCubit.loadIfNeeded` — would move to a slim `GET /projects?picker=1`; confirm with FE-B who owns pending).

---
## 5. Owner questions (n = 8)
1. **Resolve tab:** replace "coming soon" with a **settlement section** in สรุป (who pays whom, minimal transfers, BE-computed) + the per-row resolve tick, or only keep the per-row tick (drop the tab, no settlement)? Recommend: settlement section.
2. **Tabs:** สรุป · รายการ · สมาชิก, with members as a tab (the separate members page goes away, `/projects/:id/members` deep link opens the tab)? Recommend yes.
3. **Currency:** one currency per event, chosen at create, locked once rows exist (default = my default currency)? Recommend yes.
4. **Event type:** keep free text (≤ 30) + preset chips (ทริป / ปาร์ตี้ / โปรเจกต์ / อื่น ๆ), or a fixed list?
5. **Wording/route:** OK to change the existing arb values โปรเจกต์ → อีเวนต์ in place (exception to append-only), and keep the route `/projects` for now (rename to `/events` later)?
6. **Resolve sheet:** amount always = my share (drop today's "share only" switch)? Recommend yes.
7. **Dates:** add optional start/end date to the form (BE supports it, the app never sent them, so list date ranges are always empty)?
8. **Dashboard:** drop "recent 3" (the รายการ tab is one swipe away) and keep top-5 tags (BE-sorted)?

---
## Suggested order (after owner review of the hub pieces)
hub pieces (FE-A) → BE A1–A5,A10 → list → detail + summary → board → members + picker → form → resolve (A6) / bills picker (A7). Each page lands as one disjoint file set; I'd use read-only scans only, edit sub-agents only where file sets are disjoint (list / form / members).
Dependencies: BE `detail` endpoint blocks detail; until then FE could adapt the 4-call load behind one repository method (thin-FE debt, flagged). Coordinate with FE-C (PersonRow, multi PickerRow) and FE-A (ListPageBody paging, TextLimits.eventType, hub domain page).

## 2026-10-12 — API v2 adoption (pending / notifications / more / me / badge + minimal events)
DONE · analyze: 2 unused-import warnings, both in files other sessions are editing (home_page.dart categories_cubit import; personal_debts debt_widgets.dart contacts_cubit import) · full suite: 412 passed
files:
- notifications: lib/features/notifications/** (model actor/state/awaits_answer, unread-count poll, write replies patch list + badges, settings default_account) + 2 tests rewritten
- auth/me/version: users_repository (no currency on updateMe), user.dart, app_version repo/info (bare body); settings_page: currency = locked DetailRow; arb +profileCurrencyLabel
- More: new lib/features/me_counts/** (1 call GET /me/counts), more_page.dart owns its cubit, pull-to-refresh
- pending: domain (DraftResolved, DiscardResult, submit result with failed[].pending / balances / badges), repo discard(ids), cubit discardMany/submit patch, pending_page renders from `resolved` (no account/category/tag cache joins), batch page; quick_create_sheet.dart _submitDraft only (patchBalances + bookChanged); new test pending_v2_test
- events (minimal): ProjectMemberRef + ProjectTransaction.transactionMember (memberOf with fallback), QuickCreateResult.accountBalances, resolve sheet patches balances
deviations / open:
- More cards lost figures /me/counts doesn't provide: debts owed/iOwe amounts, budgets %, scheduled due-soon (now count-only / static). Ask BE if the owner wants them back in counts.
- Wallet currency picker in lib/features/accounts must go (wallets take no currency) — not my files.
- Optional (not mine): home_page.dart use p.resolved.category?.name in _DraftsBlock and pass onUnreadChanged: UnreadBadgeCubit.setCount; delete unused settingsDefaultCurrency* arb keys later; TYPE_NOT_MUTABLE has no Thai string (shows server message).
- gen-l10n printed an l10n.yaml hint; analyze finds profileCurrencyLabel fine.
- edit sheet (quick_create_sheet/draft_form) still prefills from account/category caches, not `resolved`/form-options (owned by transactions).
- Events agent ran dart format on the whole projects dir (format churn possible in untouched files).

- 2026-10-12 follow-up: More cards restored (debts owed/owe, budgets %, scheduled due in 14d) from the extended /me/counts; pending submit already patches wallets from account_balances.
