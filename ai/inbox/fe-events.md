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

## 2026-10-12 — FE-EVENT: events proposal rev 2 (owner answers applied; only the changes)
Based on ai/decisions.md "Event tags" + "Pulling a personal tx in". Everything not listed here stands as in the Phase 0 proposal.

**On hold (owner): E1 settlement · E2 members as a tab · E5 resolve amount.**
- The resolve tab ("coming soon"), the resolve sheet (incl. the share-only switch) and the separate members page `/projects/:id/members` stay as they are, adapted only to the new API.
- Dropped from the plan for now: §1d member picker rework, §1e resolve sheet redesign, A6 atomic resolve, A8 member candidates (except "bad input → 400"), A9 settlement, PersonRow on the members page.

**Changed by the owner's answers**
- E3 — the event **type is dropped** (form, hero chip, list meta, search). In its place:
  - the EVENT gets many **personal tags** (my own tag set, private to each member): a tag row under the hero (detail-page standard), edited with the existing TagPickerSheet; the list filters by tag.
  - BILLS use **event-scoped tags** (one set per event, shared by all members, real entities with icon / colour, usable only inside that event). Today's free-text `tags: [String]` on board rows becomes tag refs.
  - tapping a bill's tag chip → a popover: "+ เพิ่มเข้าแท็กของฉัน" (hidden when I already have a personal tag with that name) · "ดูบิลที่ติดแท็กนี้" (the รายการ tab filtered by it).
  - สรุป "แยกตามแท็ก" (top 5, BE-sorted) gets a "นำเข้าทั้งหมด" action (imports every event tag I don't have yet).
- E4 — the ~33 arb values โปรเจกต์ → อีเวนต์ change in place (keys unchanged); the route stays `/projects`.
- E6 — optional start / end dates in the form; **no currency field** (single user currency; Q3 / A5 currency part dropped).
- E7 — drop "รายการล่าสุด" (recent 3) from สรุป; keep top-5 tags.
- **Pulled-in tx keeps a link** (bill ← personal tx): on the bill, a row "รายการต้นทาง … ›" → tx detail, shown ONLY to the tx owner; the money fields (amount / date / payer / wallet) show a 🔗 hint "แก้แล้วเปลี่ยนทั้งสองฝั่ง"; tags / description / note were copied once and are independent. The tx-detail side ("อยู่ในอีเวนต์ … ›") is fe-core's file.

**Tabs today stay:** สรุป · รายการ (+ เคลียร์ยอด when completed / archived, unchanged).

**API asks, rev 2** (replaces A1–A10; for Lead / BE)
- **A1** `GET /projects?status&q&tag_id[]&sort&page&per_page`: rows carry `tags` (MY personal tags on the event, embedded TagRef with icon / colour), `my_net`, `total_expense`, `planned_amount`, `members_count`, `start_date` / `end_date`, `is_locked`; no `type`; pagination block.
- **A2** `GET /projects/:id/detail` = one call: project (+ `my_member_id`, flags `is_owner` / `can_add_bill` / `can_edit` / `can_manage_members`, my personal `tags`), summary (totals, plan trio, my_position, `by_tag` top 5 as event TagRefs with amount + share + `mine`), members[] (still needed by quick create's payer / split pickers), event tags[], board first page.
- **A3** board rows: nested `children[]`; embedded `transaction_member`; `tags` = event TagRefs `{id, name, icon_code, mine}`; `source_tx` `{id, description}` ONLY when the caller owns the linked personal tx (null otherwise); `linked: bool` (money fields shared with a personal tx); `my_share`; `locked`; server filters `type` / `mine` / `q` / `tag_id` / `sort`; paging.
- **A4** every event write returns a patch `{row?, summary, project?, members?, tags?, account_balances?}`, no refetch (row create / update / delete, mark, bills add / remove, status, member add / update / remove, leave, transfer).
- **A5** `POST /projects` accepts `planned_amount`, `start_date`, `end_date`, `tag_ids` (my personal tags), `icon_code`, description / note in ONE call (validate end ≥ start); `type` removed; currency = the user's currency, set by the server.
- **A11 (new) event tags:** `GET/POST/PUT/DELETE /projects/:id/tags` (name, icon_code), bills take `tag_ids`; `POST /projects/:id/tags/import {tag_ids?}` (empty = all I don't have) → creates personal tags by name, returns the updated event tags (`mine` flags). Resolve / claim auto-attaches same-name personal tags (decisions.md); the "create these tags?" prompt flow can come later.
- **A12 (new) my tags on an event:** `PUT /projects/:id/my-tags {tag_ids}` (per member, private) — or `tag_ids` on `PUT /projects/:id` if BE prefers; returns the project row.
- **A10** OpenAPI for all of the above (`x-used-by`); the hub API page reads it.
- A7 (bill candidates for multi-select add) stays as a later ask; not in this round.

**Kit asks to fe-core (hub first, owner review):** EventCard (list row: icon, name, my tags as mini chips, status chip, meta line members · date range, plan ProgressRow, my net) · EventBillRow (+ child row; tick, payer PersonMark, event-tag mini chips that are tappable, amount, 🔗 linked hint) · PositionRow (paid / share / net — kept for my position + who paid) · a tag-chip popover (or confirm OptionMenuAnchor with action items is the piece) · a "linked field" hint (🔗 + caption on DetailRow) · a source-link DetailRow ("รายการต้นทาง … ›"). ListPageBody paging already exists (`onLoadMore` / `hasMore` / `loadingMore`). Multi-select PickerSheet and PersonRow are NOT needed this round (A7 / members on hold).

**Build order:** arb sweep + type removal + dates (no BE needed) → list on ListPageBody + paging (today's API pages already) → detail on one repository call (adapter over today's 4 GETs until A2 lands, flagged) → patch-from-response as each A4 write lands → event tags + personal tags + source link (A11 / A12 / A3) once BE's spec lands → tests.
Constraints kept: quick create (transactions) reads `ProjectView` / `ProjectTxTree` / `ProjectMember`, and the hub "Others" page demos `ProjectTxTreeTile` — their APIs stay compatible (or move together with fe-core).

## 2026-10-13 — FE-EVENT: events rework on the Events spec (DONE, not run against a live BE)
DONE · `flutter analyze` 0 issues · full `flutter test` 701 pass / 3 fail (none in projects code: 2 hub ratchets need fe-core's page_flows lines, sent; 1 = event_pick_test `txCanJoinEvent`, transactions/tx_rules.dart in-flight elsewhere) · projects tests 14/14.
**The BE handlers don't exist yet** (be: debts first, then events). Everything is coded against openapi.yaml tag "Events", so the event pages fail on the local BE until be ships them (detail = 404 → error + retry page).

**Files (all lib/features/projects/** + tests + arb):**
- domain/project.dart: rewritten for the spec.
  - `Project` = API `Event`: flags is_owner / can_add_bill / can_edit / can_manage_members, `readOnly` (= is_locked), my tags (EmbeddedTag), totals, my_net. `type` is gone.
  - `ProjectMember` = EventMember (`name`, `is_me`).
  - `ProjectTransaction` = BoardRow / BoardSplit, kept FLAT (`flatten`: a bill, then its splits inheriting type / date): `tagRefs` (BoardTag: id / name / icon / mine / count), `linked`, `sourceTx`, `myMark`, `myShare`, `locked`.
  - `ProjectSummary` = EventSummary (positions, by_tag with the tag ref + my share).
  - new: `ProjectDetail` (EventDetail), `EventPatch`, `ProjectPage`, `ProjectSort`.
- data/projects_repository.dart: `list(q, tagIds, sort, page)`, `detail` (GET /detail), `create` → ProjectDetail (plan / dates / tag_ids in ONE POST), `update` → EventPatch (null clears dates / plan; `tag_ids` = my tags).
  - Every write returns `EventPatch`: board create / update / delete / mark, member add / role / remove, transfer.
  - Event tags: `eventTags`, `listTags` (names), `createEventTag`, `importTags`. Board listing: filters + sort + paging.
  - Removed: `summary`, `requestLink`.
  - Kept source-compatible for other features: removeBill (void), copyToPersonal (String), quickCreate / addBills → QuickCreateResult (+ `.patch`).
- cubit/projects_cubit.dart: server-side status / q / tag / sort + paging (`loadMore`); `patch(project)` / `remove(id)` keep the list fresh from event-page writes (no reload on return).
- pages:
  - projects_page: EventCard hairline rows (my tags, my net, plan progress, dates); debounced server search; status menu; my-tags filter (TagPickerSheet, count badge); 3 sorts; paging.
  - project_form_page: type removed; optional start / end dates (bounded pickers, clearable); my tags row; one POST.
  - project_detail_page: ONE call on open; my-tags strip under the hero (one PUT); dates in the top box (view + edit, clearable).
    - Every write applies its EventPatch (info save, status, tick, delete bill, invite, quick-create add / edit via fe-core's new `onEventSaved`) and also patches the list cubit + wallet balances. No 4-GET refetch anywhere.
  - project_members_page (on hold, adapted only): writes apply the patch instead of reloading.
- widgets:
  - project_tx_tiles: board rows on EventBillRow / EventBillChildRow (tick, payer PersonMark level, event-tag chips with icons, 🔗 linked).
    - Tag chip popover (OptionMenuAnchor): "+ เพิ่มเข้าแท็กของฉัน" (hidden when mine) and "ดูบิลที่ติดแท็กนี้".
    - Action sheet: "รายการต้นทาง ›" (only when the BE sends source_tx, i.e. for the tx owner) → openPage(/transactions/:id); the edit action shows the linked hint.
    - Locked rows are inert.
  - project_tx_list_tab: unfiltered = the page's board + paging; any filter / sort / search / tag → server `listBoardRows`, paged, kept in step with page patches.
  - project_dashboard_tab (สรุป): who paid + top-5 tags from the BE summary on PositionRow (no client aggregates); "รายการล่าสุด" dropped (E7); "นำเข้าทั้งหมด" (import every event tag I don't have); a tag row → รายการ filtered by it.
  - project_common: ProjectView gains `apply(EventPatch)`, `withMore`, `withEventTags`, `eventTags`, `tagIdsFor` / `eventTag` (the quick-create bridge), paging; currency = the user's (no 'THB' fallback unless unknown); `projectDateRange` / `projectDay`.
  - resolve_sheet: debts via `createEntry` (fe-debt asked; POST /personal-debts is retired). add_member_sheet returns (name, patch).
- arb (append + in-place):
  - E4: 33 th / 35 en values โปรเจกต์ → อีเวนต์, keys unchanged, `{project}` placeholders kept.
  - New keys: eventStartDateLabel, eventEndDateLabel, eventDatesInvalid, eventDateNone, eventTagShowBills, eventTagAddToMine, eventTagsImportAll, eventTagFilter, eventSourceTx, eventLinkedHint, eventTagsImported. gen-l10n run.
- tests (new):
  - test/features/projects/event_fixtures.dart (spec-shaped JSON)
  - event_model_test.dart (7: parsing, flatten, patch apply / insert / remove, tagIdsFor, mine flags, currency)
  - event_pages_test.dart (7: list = 1 call + EventCard + server search + error / retry; detail = 1 call, error / retry, malformed body → error, a tick = 1 call with the patch applied)

**Done by others for this round:** fe-core built EventCard / EventBillRow / EventBillChildRow / PositionRow (hub domain/events) and changed quick create (tag_ids, createEventTag, `onEventSaved`). Waiting on fe-core: page_flows.dart lines (sent) + api_unused_baseline for the 3 endpoints no page calls yet.

**Open / follow-ups:**
- Unverified on a device and against a real BE (the handlers aren't written). Expect small shape fixes when be ships them.
- TagsCubit has no patch-in: after an import I call `tags.load()` once (an extra GET); the tags owner could add `upsertAll(created)`.
- Members page (on hold): opens with 2 calls (getProject + listProjectMembers). Event-tag editing (rename / icon / delete) has no UI yet: the endpoints are unused.
- Resolve sheet / tab unchanged in behaviour (E1 / E5 on hold); it still writes POST /transactions + PUT mark (2 calls).
- The สรุป by_tag `mine` flags refresh only on the next open after an import (the board / rows update at once).
- Hub "Others" page still demos `ProjectTxTreeTile` (works; fe-core can switch it to EventBillRow).

### Addendum 2026-10-13 (after fe-core's tx-detail link)
- `/projects/:id?bill=<id>` (tx detail "อยู่ในอีเวนต์ … ›"): the event page reads `bill` (GoRouterState; also `ProjectDetailPage(initialBillId:)`), opens on รายการ (pager initial page) and scrolls that bill into view once. No highlight: that needs a kit flag on EventBillRow (asked fe-core).
- The linked-money wording is now the shared `txLinkedMoneyHint` (the edit action's subtitle). The kit LinkedFieldHint belongs in quick create's event-bill edit (fe-core's file); bills have no detail page.
- BE dropped A8 (member-candidates / contact_ids): `addMember(contactIds)` removed.
- fe-core applied the events page_flows block; their full suite is green (analyze 0 · 711 pass). Mine now: analyze 0 · projects tests 15/15 (+1 for `?bill=`).
- (BE events implemented in the BE tree, not running locally until a build is ordered.) Their event error codes now show plain Thai through `presentation/event_errors.dart` `eventErrorText` (PROJECT_LOCKED, FORBIDDEN_ROLE, BILL_MONEY_LINKED, TAG_NAME_TAKEN, TAG_NOT_FOUND, INVALID_DATE_RANGE, NO_SHARE_TO_COPY, OWNER_CANNOT_LEAVE). 7 new arb keys `eventErr*` (th + en). Every events snackbar uses it.
- Bill edit / delete now follow the BE row lock (`BoardRow.locked`: viewer / inactive member / cancelled / archived). Ticking still follows the event status.
- analyze 0 · projects tests 17/17 (+2 error-mapping tests).
- `?bill=` target now passes fe-core's `EventBillRow(highlighted:)` (brief tint); the edit-action subtitle uses the bill-side `eventBillLinkedMoneyHint` (my `eventLinkedHint` key is now unused, left in place since the arb is append-only); `SPLITS_EXCEED_AMOUNT` → `txSplitExceeds`. analyze 0 · projects tests 17/17.

## 2026-10-13 — FE-EVENT: linked money by prompt + 3-choice event delete (Lead brief, owner 2026-10-13)
DONE (my side) · analyze 0 · full suite 718 pass / 1 fail (hub_coverage: `OccurrenceState`, `OccurrenceStateChip`, `StatusChip`, `StatusKind` have no hub page, another session's new kit pieces) · projects tests 21/21.
- **Delete event:** kit `showChoiceDialog`:
  - with linked txs: ยังก่อน (primary) · ยืนยัน ไม่ลบรายการ · ยืนยันและลบ [x] รายการ (destructive), x = `Event.linked_tx_count`
  - without linked txs: ยังก่อน · ยืนยันลบ
  - `ProjectsRepository.delete(id, deleteLinkedTxs:)` sends `delete_linked_txs=true` as a QUERY param. This is provisional: I'll match BE's spec when it lands.
  - After deleting the txs: `TransactionsCubit.bookChanged()`.
  - New arb: eventDeleteBody, eventDeleteKeepTxs, eventDeleteWithTxs, eventDeleteConfirm, eventDeleteNotYet.
  - Tests: 3 choices shown; "ยืนยันและลบ" → txs=true; "ไม่ลบรายการ" → txs=false; "ยังก่อน" → no call. Router-based harness, since the page leaves after a delete.
- **Linked money:**
  - The bill action sheet no longer shows the "edits change both" hint; the 🔗 on the row stays. Test added.
  - The 3-choice SAVE prompt lives in quick create (event-bill edit) and tx detail (my linked tx edit): fe-core's files. I briefed fe-core: prompt only when the linked tx is mine (`sourceTx != null`); they should also drop their LinkedFieldHint wording.
  - `also_update_link` on `updateTransaction`: I'll add it the moment BE's spec lands.
- (spec landed) `updateTransaction(alsoUpdateLink:)` → body `also_update_link` (fe-core wires the save prompt in quick create / tx detail). `delete_linked_txs` is a query param, as sent. Delete now reads `EventDeleteResult.account_balances` and patches the wallets (test checks it). BILL_MONEY_LINKED is gone from the spec, and its mapping is removed (`eventErrMoneyLinked` key left unused, append-only arb). analyze 0 · projects tests 21/21.

## 2026-10-23 — Events LIST page redesign (owner, session chubi-pocket-ad)
DONE · files: app projects_page.dart, projects_cubit.dart, project.dart (ProjectListSummary), ui/domain/events/event_list_row.dart, hub/pages/domain_events_page.dart, app_th/en.arb (fpEvents*), test event_pages_test.dart + event_fixtures.dart · be projects/numbers.go, service.go, handler.go, touch_test.go, apidoc/openapi.yaml · docs spec 10, decisions.md (Wording) · analyze: lib/features/projects, ui/domain/events, hub page, test/features/projects clean; go build + vet clean · tests NOT run (owner to say)
- Mock (owner-approved layout, hero "แบบ 2"): https://claude.ai/artifact/ANuVPgowvpWAo5CMU1ikXn
- Hero like the debts list: HeroSummaryHead (groups icon, "ค้างสุทธิ | N อีเวนต์", net = receivable − payable, signed green/red, 🔍 + CardActionButton +), HeroFactList (ได้คืน | N อีเวนต์ · ต้องจ่าย | N อีเวนต์ · ส่วนของฉัน | กำลังทำ N), HeroFilterChips (ทั้งหมด · กำลังทำ · ยังเคลียร์ไม่หมด · จบแล้ว). The 3 SummaryTiles, MoneyVisibilityToggle and the bottom dashed AddTile are gone (+ in the hero; the empty state keeps its CTA).
- List: rowCards with SectionHeader กำลังทำ | N / จบแล้ว | N, trailing "ส่วนฉัน ฿x" (sum of the loaded rows).
- EventListRow (hub piece) gains `members` (mini 👥 N chip), `statusChip` (StatusChip over = เกินงบ), `footer` (ProgressRow budget bar, only with a plan). Subtitle = dates | ส่วนฉัน (share only when unsettled). Right: ได้คืน / ต้องจ่าย, settled = my share + เคลียร์แล้ว. Dimmed = ended and settled.
- Default filter is now `current` (all but archived), as on the other list pages.
- BE: summary gains payable_total + counts all / receivable / payable; receivable_total now counts ended events too (was active only); new derived statuses current / payable. NEEDS a BE rebuild (owner's word); the same rebuild carries นายE's 071.
- Wording: fpEventsOwed / fpEventsOwe = ได้คืน / ต้องจ่าย, which also changes the event DETAIL hero tile. Removed: fpEventsSummaryCaption, fpEventsPaidLine, fpEventsRowSpent.
- Open (not done): (1) my_net counts bills only. Ticks / resolve don't reduce it, so an event settled outside the bills may stay "ยังเคลียร์". Needs a check. (2) "ค้าง N วัน" like the debts rows would need an event "owing since" date from the BE.

## 2026-10-23 — Events rows → AppListRow (owner split, fe-core 7d) · session chubi-pocket-ad
DONE · files: lib/ui/domain/events/event_list_row.dart, position_row.dart, event_tags_sheet.dart, lib/features/projects/presentation/pages/projects_page.dart, project_members_page.dart, lib/hub/pages/domain_events_page.dart · analyze: events ui, projects feature, hub page, test/features/projects clean · tests NOT run (owner to say)
- No ListRow left in the event files. EventBillRow was not in this round (as briefed).
- EventListRow is now a thin domain wrapper on AppListRow:
  - members → ListRowChip 👥 N in titleChips
  - `status` is a ListRowChip (was a statusChip Widget). The list passes เกินงบ with Tone.danger.
  - `subtitle` String → `meta` List<String>, which becomes line2 parts joined with " | "
  - money → ListRowTrailing.value(MoneyText); the caption tone is success / danger by MoneyTone
  - the budget bar → AppListRow.footer
- PositionRow: title = label, trailing = MoneyText, footer = ProgressRow. A null leading becomes a SizedBox.shrink().
- Event tags sheet: the ⋯ menu is ListRowAction.menu; the subtitle moved to line2.
- Members page: role chip → ListRowTrailing.text (owner in Tone.primary). Linked / ad-hoc is on line2.
- 7d added AppListRow.footer + ListRowAction.menu for this.
- Visual change from the kit rules: titles are normal weight (EventListRow was w600) and the rows' vertical padding is 8 (was 12).

## 2026-10-23 — Event DETAIL hero like the other detail pages · session chubi-pocket-ad
DONE · files: project_detail_page.dart (_viewHero, bills toolbar) · analyze: lib/features/projects clean · tests NOT run
- The hero follows wallet / budget / debt person:
  - HeroIdentity: icon + name + description, with 🔍 and ✏️ (heroEdit) as its actions. The HeroHeader row is gone.
  - HeroNumber ใช้ไปรวม + the budget HeroBar.
  - HeroFactList: ส่วนของฉัน, ได้คืน / ต้องจ่าย (green / red), and รายรับรวม when > 0. These replace the 2 SummaryTiles and the HeroValueLine.
  - HeroChipRow: the status chip (dropdown for the owner) and the date chip.
- The "mine" bill filter (it was a tap on the ส่วนของฉัน tile) is now a ส่วนของฉัน chip in the bills toolbar.

## 2026-10-23 — Event edit hero chips + no link badge on bill avatars · session chubi-pocket-ad
DONE · files: project_detail_page.dart (_editBody), ui/domain/events/event_bill_row.dart, test event_pages_test.dart · analyze clean · tests NOT run
- Edit hero: the status chip moved from the header to a HeroChipRow at the bottom, next to the dates chip, as in view mode.
  - The dates chip: tap opens the range picker, ✕ clears it. With no dates it shows a dashed "วันเริ่ม – สิ้นสุด" chip.
  - The dates InfoRow under the hero is gone.
- EventBillRow: payer / debtor avatars no longer get the 🔗 CornerBadge (owner). A linked member's level is mapped to contact there only; PersonMark itself is unchanged.

## 2026-10-23 — Event edit: status + dates move to การตั้งค่า (owner: they are settings) · session chubi-pocket-ad
DONE · files: project_detail_page.dart (_editBody, _statusRow), app_th/en.arb (−fpEventsSettingsDesc) · analyze clean · tests NOT run
- The edit hero has no chip row now: icon + name + description + planned budget only.
- SettingsSection (การตั้งค่า), shown in create mode too:
  - สถานะ: a SettingDropdownRow + OptionMenuAnchor, owner only, as on the wallet page.
  - วันเริ่ม – สิ้นสุด: a SettingSummaryRow that opens the range picker; with dates set, the trailing chip has ✕ to clear them.
  - จัดการแท็กอีเวนต์: existing events only.
- Removed fpEventsSettingsDesc (its tags-only text no longer fits the section).
- The view hero keeps its status + date chips.

## 2026-10-23 — Event book: event bill sheet + paybacks + สรุป tab (owner) · session chubi-pocket-ad
DONE (code) · analyze: `flutter analyze lib` + test/features/projects + test/ui clean; go build + vet clean · tests NOT run (owner to say) · BE needs a rebuild: migration 072
- Spec: ai/briefs/event-book-be.md. Mock: https://claude.ai/artifact/4TN8TnL66353GddKgjZduz.
- **BE (projects):**
  - migration 072 `payback` type. A payback is a parent (from) plus one child (to) for the whole amount; it is never auto-copied, and /copy answers 422 PAYBACK_NOT_COPYABLE.
  - On a payback, PUT can change who paid back (`transaction_member_id`). On a bill it answers 400 PAYER_FIXED.
  - Positions: sent / received are added, and net = paid − share + sent − received. my_net counts paybacks. transaction_count leaves them out.
  - `BoardRow.my_booked`: a tx, repayment or debt of mine points at the row.
  - `GET /projects/:id/settle`: pairs + simplified.
  - `POST /projects/:id/people`: BillPerson[] → member ids, and non-members are added.
  - personal_debts (agreed with 28): repayments take `bill_id`.
  - openapi updated. touch_test got payback / settle checks (not run).
- **App:**
  - `features/projects/presentation/widgets/event_bill_sheet.dart`: the event's own sheet on QuickCreateSheetShell.
    - Top card: TransactionHeroCard with a new optional extraTypeChip (จ่ายคืน). A payback swaps the bill fields for from → to FlowCards.
    - Then event tags, the note, and "คนในบิล | N" (ShareCard rows in a box that scrolls on its own, each with [จ่าย], [คืนแล้ว], ✕, หารเท่ากัน and + เพิ่มคน).
    - "ลงบัญชีของฉันด้วย" settles my part on save:
      - I paid → addBills: my tx is linked to the bill.
      - Someone else paid → ☑ หนี้ (a debt entry with bill_id and DebtResultBox) and/or ☐ รายการ (a tx with source_project_transaction_id).
      - A payback I'm in → a repayment with bill_id.
    - "คืนแล้ว" writes a payback row (plus a repayment when I paid). 🗑 is in the title row.
  - ContactPicker.people (multi-select): an event-members section on top, then contacts. The debts-mode path is untouched.
  - Bill rows (EventBillRow / ChildRow, new options):
    - New options: tick: false, payerVerb (a bold payer), badge, amountColor.
    - A badge "ยังไม่ลงบัญชี" marks my part when !my_booked.
    - A payback row shows ⇄ "A → B" | "จ่ายคืน | จดโดย X".
    - Tapping a row opens the sheet; the old action sheet / tick → resolve flow is gone.
  - Event detail: TabbedDetailBody [บิล | สรุป].
    - The สรุป tab shows the PeopleStrip, then "ต้องจ่ายกัน" with SegmentedChoice [ตามคู่จริง | จ่ายน้อยครั้งสุด] and AppListRow lines.
    - Each line has a ✓ action that opens the payback sheet already filled in.
    - "เพิ่มบิล" (the AddTile) opens the new sheet.
  - Repos: projects settle / resolvePeople / updateTransaction(transactionMemberId); debts createRepayment(billId).
  - Hub demos: EventBillRow (event book), TransactionHeroCard(extraTypeChip), ContactPicker.people.
  - Strings: evb* (th/en).
  - Tests updated: event_pages_test (tabs, summary, no ticks) and the list fixtures.
- **Not done / open:**
  - (1) The centre capsule "เพิ่มบิล" on event pages is a shell change; a note went to Lead.
  - (2) The event setting "แก้บิลที่ลงบัญชีแล้ว" (ask / always / never) isn't built. Editing a booked bill doesn't ask "แก้ในสมุดของฉันด้วย" yet.
  - (3) The bill row's "รายการต้นทาง ›" link (it was in the old action sheet) is gone.
  - (4) features/projects/.../resolve_sheet.dart is now unused; ui EventResolveSheet is kept (hub). Cleanup is the owner's call.
  - (5) Quick create's project mode (projectRow) is still in quick create but no longer opened from the event page.
- (update) Centre capsule: Lead added QuickCreatePreset.custom. The event DETAIL page uses it in view mode ("เพิ่มบิล", the event tint, opening the event sheet). The list page keeps quick create (Lead's call). Not analyzed (owner: no analyze while sessions edit).
- (update, owner on-device round 1):
  - Child-row badge layout fixed (the amount sits flush right again), and AppDivider.row between people.
  - Bills tab: an always-visible [ทั้งหมด | เฉพาะของฉัน] chip row (the mine chip left the toolbar) and topInset 0.
  - Sheet: the + แท็กอีเวนต์ chip creates an event tag; คืนแล้ว works in edit too; avatars have no 🔗.
  - ลงบัญชีของฉันด้วย is a ShareCard with an AppSwitch. Options use the new kit piece BookOptionCard (ui.dart export + events covers + hub demo; Lead told), with the person line + DebtResultBox inside.
  - สรุป tab: AppTabBar [ยอดสุทธิ | แยกรายคู่] (ยอดสุทธิ = simplified, the default) with swipe on the lines.
- (update) When I paid, ลงบัญชี has two BookOptionCards: รายการ (the bill from my wallet) and หนี้ (ลูกหนี้ N คน: one debt entry each, direction paid, bill_id = the bill; the ones ticked คืนแล้ว are left out and get a repayment instead). Both are ticked by default.
- (update) Payback resolve is split like a bill:
  - [จดหนี้]: a debt entry with bill_id = the payback, so the event's debt lands in my books.
  - [รับคืน / จ่ายคืน]: a repayment with bill_id.
  - Both ticked = even. จดหนี้ starts unticked when my books already hold that debt in full.
  - Wording in the sheet: ไม่เป็นหนี้ (was เคลียร์แล้ว). The person-line chip is เพิ่มหนี้ / ลดหนี้ ฿amount (the row's own amount).
- (update, owner round 2):
  - The budget bar has a dot, a bubble with what's spent, and the budget at the end, in the facts' font size. There is no "เกินงบ ฿x" line in the list rows or the detail hero.
  - Bills tab: one toggle chip "เฉพาะของฉัน", at the right end (the "ทั้งหมด" chip is gone). When it's on, a bill someone else paid shows only my split, and a bill I paid shows no splits.
  - Event sheet, edit mode: "ลงบัญชีของฉันด้วย" starts off, matching the row; only a new bill starts on.
  - The delete moved to a bottom-left button. Kit change: a new optional QuickCreateSheetShell `deleteLabel`, plus a hub demo variant (Lead acked).
  - Open: editing a booked bill (switch on with real ticks; off = unlink). It needs BE per-part link info plus an unlink endpoint, and the meaning of unlink (delete vs detach) is waiting on the owner.
- (update, owner round 3):
  - Budget bar: the fill pill shows the % again (no amount), since "ใช้ไปรวม" (gross) and the bar (net of income) are different numbers.
  - Bills tab: one row with the event tags on the left (scroll, no label) and "เฉพาะของฉัน" fixed on the right, all at ChipSize.chip like the toolbar filters.
  - Unlink / relink (owner chose option ข, unlink):
    - BE: migration 000073 adds transactions.unlinked_project_transaction_id, personal_debts.unlinked_project_transaction_id and project_transactions.unlinked_transaction_id.
    - BE: PUT /projects/:id/project-transactions/:pt_id/my-books {link, unlink} with kinds tx | debt | repay. It returns `relinked`, and BoardRow has my_books.
    - App: an edit shows the switch and ticks as linked. Unticking a linked part unlinks it (it stays in my books). Ticking again relinks the old rows, and only a part the server can't find is created anew. A linked part shows "ลงบัญชีแล้ว" with no pickers and no before → after.
    - BE redeploy pending (owner). No BE test for it yet.
