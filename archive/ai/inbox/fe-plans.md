# FE-E plans: budgets, scheduled, saving goals (0.3.1-10)

## 2026-10-12 — Phase 0 proposal (read-only, nothing edited)
PROPOSAL · sources: ai/decisions.md, ai/backlog.md, ai/reports/api-audit-2026-10-12.md, `lib/ui/ui.dart` exports, `openapi.yaml`, the three feature folders (surveyed by one sub-agent per feature).
Caveat: piece names below are taken from `ui.dart`; exact slot params of the templates are confirmed when each page is built.

## 0. Summary
- **New shared pieces: 6** (FE-A builds; `PeriodNavigator` dropped, FE-A 2026-10-12). **API asks: 11.** **Owner questions: 5.**
- Today all three features are half-migrated: details already use `DetailPageBody` + `EditModeMixin`, but the lists are hand-rolled `ListView`s that ignore `ListPageBody`, cards are one-off (`AppCard` + `InkWell` + raw `Text`), and dates / currency / status are formatted ad hoc.
- Root cause of most bugs: every page reads a **whole-list cache** (`loadIfNeeded`), and `GET /:id` is never called (budgets, scheduled and goals all have an unused `getById`). One page-ready `GET` per page fixes "stale", "not found" and "vanish" together.
- OpenAPI documents only the list touch-point per feature (no `{id}`, writes, status filters, history, overview). Every ask below must also land in `openapi.yaml` so the dev hub API pages show it.

## 1. New shared pieces (all go into `ui.dart` AND the hub; FE-A builds)
| # | Name | Level | Why / used by |
|---|---|---|---|
| 1 | `ProgressCard` | organism | Icon + title + "spent/of limit" line + `ProgressRow` + status chip; tone comes from the BE. One card for budget rows, goal rows and the hero stats. Replaces `BudgetCard`, `SavingGoalCard`, `budgetAccent` (client 80% threshold). |
| 2 | ~~PeriodNavigator~~ | — | DROPPED: use `StepperPill.period(unit: StepperUnit.week/month/year, value:, onChanged:, first:, last:)` or `StepperPill.month(...)` (existing preset). Budgets past periods use it as is. |
| 3 | `AppDatePickerSheet` (+ `showAppDatePicker`) | organism | Kit date picker. Replaces 2 raw Material `showDatePicker` (goal deadline, scheduled next billing). |
| 4 | `formatDate` / `DateText` | domain helper | Localised Thai date + relative ("อีก 3 วัน" / "เลยกำหนด 2 วัน"). Fixes raw ISO in scheduled list, detail and history. FE only parses `YYYY-MM-DD` for display. |
| 5 | `StatusChip` | molecule | status/tone + label → `AppChip` (active / paused / completed / cancelled / over-limit / archived). Today the scheduled tone switch is private to its hero. Used by all three features. |
| 6 | `PercentInput` | molecule | Counterpart of `AmountInput` for 0–100 % (goal allocation: today a raw `AppInput` + hand-built `Text('%')` in a fixed 96px box). |
| 7 | `AccountPickerSheet` | organism | Move `showAccountPickerSheet` out of `features/transactions` into the kit (goals needs it; highlight-selected, optional compact search). |

Hub check after the template survey (no change to the count):
- #4 `formatDate`: `DateFormatter.friendly/parseDay` already exist in `core/utils`; the new piece is a kit-level `DateText` + relative-day wrapper over them (not in `ui`, so features can't reach it through `ui.dart`).
- #5 `StatusChip`: only a status→`AppChip(tone, selected: true)` mapper; there is no separate pill class.
- `AmountInput` defaults `currencySymbol = '฿'`: every use in these 3 features must pass the currency symbol. `CurrencyTile` exists for a currency row (budget create, read-only until B4 lands).

Not proposed (existing pieces suffice): history/upcoming rows → `ListRow` + `StatusChip` + `MoneyText`; cycle selector → `ChipRow`/`AppChip`; archived/status filter → `FilterBar`; archived-wallet notice → `MessageBanner`; capacity bar → `ProgressRow`.

## 2. Budgets

### 2.1 List (`/budgets`)
- **Layout:** `ListPageBody` (replaces hand-rolled `ListView`, `AsyncStateView`, `PullToRefresh`).
  - pinned header: `FilterBar` period segment (weekly / monthly / yearly) + `StepperPill.period`; status chips (กำลังใช้งาน / เก็บถาวร) as `ChipRow`.
  - top: `HeaderCard` + `SummaryStats` for the overview (spent / limit / over count) + `ProgressRow`.
  - rows: `ProgressCard` per budget. End: `AddTile`. Empty: `EmptyView`.
- **API (1 call on open):** `GET /budgets?period=monthly&on=2026-10-12&status=active` returns `{summary, data[]}` (summary = the overview, rows already carry the period's spent + tone). Period switch / navigator / status chip = 1 call each. Replaces `GET /budgets` + `GET /budgets/overview` (2+ calls today) and the client-side `_periods` grouping.
- **Closes:** spent not refreshing; cards/period picker on kit; archived view; past periods.
- **Spent-refresh mechanism (FE):** `BudgetsCubit` is marked stale by `TransactionsCubit.bookChanged()`; the next list open refetches (still 1 call). No polling.

### 2.2 Detail (`/budgets/:id`, view + edit)
- **Layout:** `DetailPageBody` + `EditModeMixin` (already). Sections:
  1. hero `HeaderCard`: category icon, title, `StatusChip` (ok / warn / over / archived) in the top row, ✏️ right; spent / limit / remaining as `HeroContent` + `ProgressRow`.
  2. "งบประมาณ" `SectionCard`: category `DetailRow ›`, limit, period `DetailRow ›` (period highlight picker via `PickerSheet`), `StepperPill.period` to view another period.
  3. "หมวดย่อย" child breakdown `SectionCard` (`ListRow` + `MoneyText`).
  4. "ช่วงก่อนหน้า" past periods: `ListRow`s (period label, spent / limit, tone chip).
  5. note section, always shown ("แตะค้างเพื่อแก้ไข"); `DetailMeta` at the bottom.
  6. edit mode only: `ManageSection` archive (amber) + delete (red). Archived budget: hero chip "เก็บถาวร" + a "กู้คืน" action row.
- **API (1 call on open):** `GET /budgets/{id}?on=` returns the budget + `current_period` + `child_breakdown` + `previous_periods[]` (last N) + `tone`. Works for a deep link / cold open. Writes (update / archive / restore) return the full budget; FE uses it instead of re-fetching. Delete = 1 call.
- **Closes:** spent not refreshing; archived view (restore); past periods; cold-open detail.

### 2.3 Create / edit form
- Create = `FormSheet` (see Q1): icon-less; fields category (required, `CategoryPickerSheet`), amount (`AmountInput`), period (`PickerSheet`), name (blank → server names it after the category), description, note (`TextLimits`).
- **Currency:** not sent; the BE defaults it (ask B4). The form shows the currency read-only from the user default, never a hard-coded `'THB'` (budget_detail_page.dart:177).
- Server errors `DUPLICATE_BUDGET`, `INVALID_CATEGORY` → inline field error, keep edits.

### 2.4 API asks (BE)
- **B1** `GET /budgets` page-ready: params `status` (active|archived|all), `period`, `on` (date anchor); response `{summary, data[]}`; each row `current_period` for the anchor + `tone` (ok/warn/over; the BE owns the 80 / 100 thresholds).
- **B2** `GET /budgets/{id}?on=` page-ready: embedded `CategoryRef`, `current_period`, `child_breakdown`, `previous_periods[]`, `tone`, `archived_at`.
- **B3** archive / restore / update / create return the full budget with fresh `current_period` (create / update already do; archive / restore: confirm).
- **B4** `currency` optional on create → BE default (user default currency). Remove the FE `'THB'`.

## 3. Scheduled transactions

### 3.1 List (`/scheduled-transactions`)
- **Layout:** `ListPageBody`; header `FilterBar` status chips: กำลังใช้งาน (default: active + paused) / หยุดชั่วคราว / เสร็จสิ้น / ยกเลิก / ทั้งหมด (counts in `AppBadge` count style).
- **Row:** `ListRow` — leading category/wallet icon from the embedded refs; title; line 2 = variant mini chip · `formatDate(next_billing)` ("อีก 3 วัน"); installments left as a small `ProgressRow` (installment / loan); trailing `MoneyText` + `StatusChip` (not shown for active). `AddTile` at the end.
- **API (1 call):** `GET /scheduled-transactions?status=active,paused` (list of statuses or `all`), with embedded `AccountRef` / `CategoryRef` (the touch-point already promises this; the FE models parse only id + name today), `days_until`, `overdue`, and `status_counts` in a `meta`. Chip switch = 1 call.
- **Closes:** paused / cancelled vanish (the hard-coded `status=active` + cache removal on cancel / complete); status not in the list; raw ISO dates; the missing icons.

### 3.2 Detail (`/scheduled-transactions/:id`)
- **Layout:** `DetailPageBody` + `EditModeMixin` (new for this page; today edit = opens the quick-create sheet).
  1. hero `HeaderCard`: icon, name, top row `StatusChip` (tap → status action sheet: หยุดชั่วคราว / ดำเนินการต่อ / ยกเลิก, as today) + variant chip, ✏️ right; next due `formatDate`, amount.
  2. "รอบถัดไป" / "งวด" section: next due, cycle chip, `ProgressRow` for installments (remaining / total), totals for installment / loan (down payment, interest).
  3. "ตัดอัตโนมัติ" generate-now card (1 button = 1 call; result updates the page from the returned entry + `account_balances`).
  4. "ประวัติ" history section: `ListRow`s with `formatDate` + `MoneyText` (tap → the transaction).
  5. note always shown; `DetailMeta`.
  6. edit mode only: `ManageSection` delete (red). No archive (see Q4).
- **API (1 call on open):** `GET /scheduled-transactions/{id}` returning the entry with refs, `history[]` (latest N) and `upcoming[]` embedded (`?include=` is fine). Writes (pause / resume / cancel / update / generate-now) return the full entry (+ `account_balances`); the FE replaces the page state with it: no list reload, no frozen `_last`.
- **Closes:** stale detail after cancel / last instalment (the entry is no longer dropped from the cache, because the detail owns its own state); detail "not found" in a fresh session / from the Home "coming up" card; raw ISO dates.

### 3.3 Form (own `FormSheet`, leaves `DraftForm`)
- Fields: variant (recurring / installment / loan; locked on edit) via `ChipRow`; name + icon (`EditableCircle`); amount (`AmountInput`); category / wallet (`PickCard` → `PickerSheet`); cycle (`ChipRow`: weekly / monthly / yearly); next billing date (`AppDatePickerSheet`); installment / loan block (total, down payment, installments, remaining, interest as `PercentInput`); description, note.
- Validation: instant feedback only (required, > 0); the BE validates and returns the field errors, so the duplicated `scheduledProblem` rules go away.
- **Closes:** the old form (shared DraftForm / TxHeroCard); Material date picker.

### 3.4 API asks (BE)
- **S1** `GET /scheduled-transactions` documented `status` filter (multi-value or `all`), embedded refs with icons, `days_until`, `overdue`, `meta.status_counts`.
- **S2** `GET /scheduled-transactions/{id}` page-ready: entry + refs + `history[]` + `upcoming[]` (works for any status, including cancelled / completed).
- **S3** pause / resume / cancel / update / generate-now return the full entry (+ `account_balances` on generate-now).
- Document all scheduled endpoints (`{id}`, history, upcoming, pause / resume / cancel, writes) in `openapi.yaml`.

## 4. Saving goals

### 4.1 List (`/saving-goals`)
- **Layout:** `ListPageBody`; header `ChipRow` / `FilterBar` (กำลังออม / เก็บถาวร); rows `ProgressCard` (icon, name, "x of y" with the goal's currency symbol, `ProgressRow`, allocation % `AppBadge`, completed = `StatusChip`); `AddTile`; `EmptyView`.
- **API (1 call):** `GET /saving-goals?status=active|archived|all` (the BE already supports it; document it). Each goal has `currency`, `linked_account` as `AccountRef` (+ `balance`, `archived`), `current_amount`, `progress_pct`, `required_monthly`.
- **Closes:** ฿ hard-coded (the card calls `moneyString` without `symbol:`; fixed by `MoneyText` + `currency`); progress not refreshing (the list is marked stale by `TransactionsCubit.bookChanged()` / account balance changes, refetched on next open); archived view.

### 4.2 Detail (`/saving-goals/:id`, view + edit)
- **Layout:** `DetailPageBody` + `EditModeMixin` (already).
  1. hero `HeaderCard`: icon, name, `StatusChip` (completed / archived) in the top row, ✏️ right; current / target `HeroContent` + `ProgressRow`.
  2. "เป้าหมาย" `SectionCard`: linked wallet `DetailRow` (🔒 after create; icon from `AccountRef`), target, allocation (`PercentInput` in edit, plus the free-capacity hint), deadline (`AppDatePickerSheet`), description.
  3. "ความคืบหน้า" stats: remaining, days left, required per month (BE value, not the client formula `requiredMonthly`).
  4. note section always shown; `DetailMeta`.
  5. edit mode only: `ManageSection` archive (amber) / delete (red); archived goal: "กู้คืน" row (restore has no UI caller today).
  6. `MessageBanner` when the linked wallet is archived (see Q3).
- **API (1 call):** `GET /saving-goals/{id}` page-ready: goal + `AccountRef` + `free_allocation_pct` for the wallet (excluding this goal) + `required_monthly`. No `AccountsCubit.loadIfNeeded()` for the wallet join. Writes return the full goal.
- **Closes:** progress refresh; archived view (restore); free-capacity hint on edit; the wallet join.

### 4.3 Create form (`FormSheet`)
- Fields: icon, name, wallet (`AccountPickerSheet`, required), target (`AmountInput`), allocation (`PercentInput`, optional; empty = auto), deadline (`AppDatePickerSheet`, clearable), description, note.
- **Free-capacity hint:** after the wallet is picked, 1 call `GET /accounts/{id}/saving-allocations` (exists: `unallocated_pct` / `unallocated_amount`, unwired today) → "ว่าง 40% (฿12,000)" under the allocation field; the BE still validates (`ALLOCATION_EXCEEDED` as an inline field error, not a raw snackbar).
- **Currency:** from the picked wallet (the BE falls back to the wallet's currency, never a hard-coded `THB`).
- **Closes:** free-capacity hint; the allocation-exceeded raw message.

### 4.4 API asks (BE)
- **G1** `GET /saving-goals`: document `status=active|archived|all`; add `required_monthly`; `linked_account` as `AccountRef` + `balance`.
- **G2** `GET /saving-goals/{id}` page-ready: `AccountRef`, `free_allocation_pct`, `required_monthly`.
- **G3** archived-wallet rule (Q3): the BE decides visibility and returns `linked_account.archived` / a goal-level `wallet_archived`; also drop the hard-coded `"(archived)"` + `THB` fallback in `service.go` (lines ~93-260).
- **G4** archive / restore / update return the full goal; `ALLOCATION_EXCEEDED` as a coded error with the free pct in its details.

## 5. New Thai strings (keys only; Thai text proposed; append-only to arb)
Shared:
- `commonStatusFilterActive` กำลังใช้งาน · `commonStatusFilterArchived` เก็บถาวร · `commonStatusFilterAll` ทั้งหมด · `commonRestore` กู้คืน · `commonArchivedBadge` เก็บถาวร
- `commonDaysUntil` อีก {n} วัน · `commonDaysOverdue` เลยกำหนด {n} วัน · `commonToday` วันนี้ · `commonTomorrow` พรุ่งนี้
- `commonNotSelected` ไม่ได้เลือก (only if not already present) · `commonBackToNow` กลับปัจจุบัน
Budgets:
- `budgetToneOk` ปกติ · `budgetToneWarn` ใกล้เต็ม · `budgetToneOver` เกินงบ
- `budgetPeriodNavLabel` ช่วง {range} · `budgetPreviousPeriodsTitle` ช่วงก่อนหน้า · `budgetPreviousPeriodsDescription`
- `budgetArchivedEmptyTitle` / `budgetArchivedEmptyMessage` · `budgetRestoreAction` · `budgetFormCurrencyLabel`
- `budgetDuplicateError` · `budgetInvalidCategoryError`
Scheduled:
- `scheduledFilterActive` · `scheduledFilterPaused` · `scheduledFilterCompleted` · `scheduledFilterCancelled` · `scheduledFilterAll`
- `scheduledListEmptyFiltered` · `scheduledNextDueRelative` ({date} · {relative})
- `scheduledSectionNext` รอบถัดไป · `scheduledSectionInstallments` งวด · `scheduledSectionHistory` ประวัติ
- `scheduledUpcomingTitle` · `scheduledHistoryEmpty` (reuse existing if equal)
- `scheduledStatusSheetPause` / `Resume` / `Cancel` (only if not covered by `scheduledDetail*`)
- `scheduledFormCurrencyHint` · `scheduledFormSectionSchedule` · `scheduledFormSectionInstallment`
Saving goals:
- `savingGoalFilterActive` · `savingGoalFilterArchived` · `savingGoalArchivedEmptyTitle` / `Message`
- `savingGoalFreeCapacity` ว่าง {pct}% ({amount}) · `savingGoalAllocationExceeded` เกินสัดส่วนที่ว่าง
- `savingGoalWalletArchivedBanner` กระเป๋าที่ผูกถูกเก็บถาวร · `savingGoalRestoreAction`
- `savingGoalRequiredMonthlyHint` · `savingGoalSectionProgress` ความคืบหน้า · `savingGoalSectionTarget` เป้าหมาย
- `savingGoalWalletLockedHint`

## 6. Backlog coverage
| Issue | Closed by |
|---|---|
| budgets: spent not refreshing | stale-mark on `bookChanged` + 1 page-ready call (B1/B2) |
| budgets: THB on create | B4 |
| budgets: period picker | `StepperPill.period` + `PickerSheet` (kit) |
| budgets: archived view | status chips + restore (B1/B2/B3) |
| budgets: past periods | `on=` anchor + `previous_periods[]` (B1/B2) |
| scheduled: paused / cancelled vanish | S1 + status chips, no cache removal |
| scheduled: stale detail | S2/S3, detail owns its state |
| scheduled: raw ISO dates | `formatDate` / `DateText` |
| scheduled: status in list | `StatusChip` in the row |
| scheduled: old form | own `FormSheet` (Q1) |
| scheduled: detail "not found" | `GET /:id` (S2), loading → load → not-found only when the loaded read says so |
| goals: ฿ hard-coded | `MoneyText` + `currency` |
| goals: free-capacity hint | existing `saving-allocations` call on wallet pick |
| goals: progress refresh | stale-mark on `bookChanged` + page-ready detail (G2) |
| goals: archived view | status chips + restore (G1/G4) |
| goals: archived-wallet conflict | G3 + Q3 |

## 7. Owner questions
1. **Create flow.** Budgets and goals create today = the detail page in edit mode; scheduled create = the shared quick-create sheet. Proposal: all three create in a `FormSheet` (like the hub template), edit in place on the detail page. For scheduled this removes the DraftForm mode (bigger change, closes "old form"). OK, or keep create as the detail page in edit mode?
2. **Budget past periods.** One `StepperPill.period` on the list (the whole list moves to that period) plus "ช่วงก่อนหน้า" rows on the detail. Is that enough, or do you want per-budget history charts?
3. **Goal on an archived wallet.** Today the BE keeps it in the active list with the real balance. Proposal: the goal is hidden from the active list and counted nowhere (hide rule), shown under "เก็บถาวร" with a banner "กระเป๋าที่ผูกถูกเก็บถาวร"; restoring the wallet brings it back. Agree?
4. **Scheduled lifecycle.** Keep status = active / paused / completed / cancelled (ยกเลิก stays as history, visible under its filter chip), delete = hard delete in edit mode only, no archive. Default list filter = active + paused. OK?
5. **Budget warn threshold.** BE owns it: warn at 80 %, over at 100 %. Keep 80?

---

## 2026-10-12 — API v2 adoption: PREP (read-only; edits start when BE pings per module)
Scope: wallets (list/detail/members), categories, tags, contacts (+ nickname), minimal touch-points (budgets / scheduled / goals). Spec: `openapi.yaml` 0.3.1-9-draft2; target flows already in `lib/hub/api/page_flows.dart` (wallet-detail and category-detail list a 2nd open call `listTransactions` for their rows: over the 1-call target, hub-owner decision, not mine).

### Wallets (`features/accounts`)
- Calls: list = 1 (`listAccounts` → `{data,total,totals}`); drop the extra archived-count call (gap W2); detail = 1 `getAccount?include=summary,members` (any status; kills the "active list first, then archived probe"); members tab reads `members_history` (no members endpoint); invite / remove / transfer return `MembersResult{account,members}` → patch, no `_load()` + `AccountsCubit.load()`; create / update / archive / report-scope return `Account` → patch; reorder returns `AccountList`; adjust returns `{account, transaction, account_balances}` → `patchBalances`; accept-invite returns `AcceptInviteResult`.
- Models: member `display_name→name`, +`is_me`, status enum (pending|active|left), `AccountMemberHistory` (nullable joined/left); account +`group, logo_url, status, sort_order, my_role, can_edit`; `AccountDetail` = Account + `summary` + `members_history`; state gains `totals`.
- Logic to BE values: colour group (`AccountType.colorOf/isCredit`, `accountBalanceColor`, adjust sheet) → `account.group`; `_isOwner` (detail + members view) → `can_edit` / `my_role`; `otherMembers(selfId)` → `is_me`; totals card → `totals` (type breakdown / shared / credit used stay client-side until BE adds them: W3). Statement day 31 = last day: day picker must allow it (`kLastDayOfMonth`).
- Ripple (adapt only what breaks): ~25 importers (transactions pickers/tiles/filters, home, pending, debts widgets, notifications actions, saving-goal + scheduled detail, hub pages). Most only read `Account`/cubit; fix compile + `group`/`archived` reads.

### Categories + tags
- Calls: list = 1 (drop `status` param; spec has only `type`, `include_system`); detail = 1 `getCategory` (counts + `is_fee_category`; no `GET /users/me`); delete confirm reads counts from the loaded detail (remove `usage()`); delete returns `{id}` → local remove (children re-parent: C1); update returns `CategoryDetail` → patch; reorder returns whole list (already patched).
- Models: `Category` +`system_kind`, `status`; `CategoryDetail` (+`parent_name, depth, child_count, transaction_count, budget_count, is_fee_category`); `CategoryRef`. `category_label.dart` icon-based system detection → `system_kind` switch (TRANSFER_IN/OUT split replaces the income/expense check).
- Tags: `Tag` unchanged; tag delete → `{id}` (cubit already local). `setTransactionTags` (`PUT /transactions/{id}/tags`, `{tag_ids}`): `attachTags` / `detachTag` are REMOVED → `TransactionsRepository.setTags` + `TransactionsCubit.setTags` = 1 PUT, patch from the returned Transaction; callers after create at `transactions_cubit.dart:350`, `quick_create_sheet.dart:733` (transactions feature = another FE's files; coordinate).
- Fee toggle stays `PUT /users/me` (C3).

### Contacts (+ nickname)
- Calls: detail = 1 `getContact?include=unlinked_names` (kept in page state, passed to the wire sheet); archive / restore / unlink / request-link / update patch `_contact` from the returned `Contact`; absorb returns `{contact, absorbed_count}`, create `{contact, absorbed_count}`, delete `{id, splits_restored}`; list = `loadIfNeeded` on revisit (pull-to-refresh forces).
- Model: +`name` (resolved), `nickname`, `showNickname`; flat `linked_user_*` → `LinkedUser? linkedUser`; `iconCode` = resolved (delete `effectiveIconCode/effectiveName/effectiveDisplayName`); drop `userId` (not in spec); `UnlinkedName`, `AbsorbResult`, `DeleteContactResult`. ~20 call sites read `effectiveName` / linked_* (contacts pages + widgets, wallet invite picker, members view, debts pages/widgets, project add-member sheet, notification_actions): switch to `name`.
- Nickname UI (detail page, edit mode): "ชื่อเล่น" `AppInput.inline` row first in the details section, then `DetailRow(label "แสดงชื่อเล่น", helper, trailing: AppSwitch)` (pattern: hub `templates_detail_page.dart`); linked contacts keep nickname + switch editable while the name is locked; empty nickname sends `null`; the switch is disabled while the nickname is empty; the form edits `display_name` (stored), the title shows `name`.
- New arb keys: `contactNicknameLabel` ชื่อเล่น · `contactNicknameHint` ไม่บังคับ · เช่น แม่ · `contactShowNicknameLabel` แสดงชื่อเล่น · `contactShowNicknameHelper` เปิด = ใช้ชื่อเล่นแทนชื่อจริงทุกที่ (+ adjust `contactLinkLinked`, `contactLinkedLockedHint` wording).

### Minimal touch-points
- Saving goals BREAKS: `SavingGoalLinkedAccount.balance` cast fails (`saving_goal.dart:241`): drop it, add `SavingGoal.linkedAccountBalance` from `linked_account_balance`; fix `fromJson` / `copyWith` / `props`; currency fallback to the ref.
- Scheduled: parsers keep working; adopt `account_balances` on generate-now (`GenerateNowResult.accountBalances`; `scheduled_transaction_detail_page.dart:522` `AccountsCubit.load()` → `patchBalances`).
- Budgets: nothing required (`BudgetCategoryRef` still parses). Optional: use the embedded `CategoryRef` type / parent instead of the cubit lookup.

### Spec gaps sent to BE (peer message)
- W1 restore of an archived wallet: no `status` in `UpdateAccountRequest`, no unarchive op. W2 archived count on `AccountList`. W3 totals breakdown (by type, shared, credit used / limit) or accept a simpler card. W4 `totals` currency handling. W5 `account_balances` = all touched wallets? W6 response when the caller leaves via `removeAccountMember`. W7 error codes (USER_ALREADY_MEMBER, OWNER_MUST_TRANSFER, SCOPE_NOT_ALLOWED…) missing from the response lists.
- C1 category delete: children re-parent; return affected rows or FE reloads. C2 `depth` / `path` on `Category` (breadcrumb). C3 fee flag write response. C4 does `createTransaction` accept `tag_ids`? C5 does `listCategories` still take `status` / include archived?
- K1 resolved `email` on Contact (else FE does `linked_user?.email ?? email`). K2 server-side order of `listContacts` (by `name`?); search stays client-side. K3 nickname > 100 error + empty string → null. K4 debt-person resolved `icon_code` (debts round). K5 link-request sender-profile carrying the matching `contact_id`.

### Owner change (Lead relay, 2026-10-12): no currency choice on wallets
- Wallet create/edit: REMOVE the currency selection (`CurrencyTile` etc. in the account form / detail page). A wallet uses the user's currency (set once on the profile, locked). BE adds `currency` on `/me` and drops it from wallet writes: `CreateAccountRequest` / `UpdateAccountRequest` must no longer be sent `currency`.
- Show it read-only only where needed (`Account.currency` stays on reads). Fold into the wallets step; confirm the BE spec change when the wallets module lands.

### BE answers (chubi-pocket-bc, 2026-10-12): spec updated; BE implementing, will ping per module
- W1 new `POST /accounts/{id}/restore` (`restoreAccount` → Account); `updateAccount` takes no `status` / `currency`. W2 `AccountList.archived_count`. W3 `totals` = `{assets, liabilities, net, currency, by_type[{type,count,balance}], credit_used, credit_limit, shared_count, other_currency_count}` (so the summary card needs no client sums). W4 currency is user-level + locked; totals sum only user-currency wallets. W5 `account_balances` = all touched wallets. W6 leaving via `removeAccountMember` → 200 `{account:null, members:[]}` (drop the wallet locally). W7 error codes in op descriptions (USER_ALREADY_MEMBER, OWNER_MUST_TRANSFER, NOT_OWNER, SCOPE_NOT_ALLOWED, ACCOUNT_HAS_MEMBERS, BALANCE_NOT_EDITABLE, NO_OP, INVALID_IDENTIFIER, CONTACT_*).
- C1 `deleteCategory` → `{id, reparented: Category[]}` (patch the list; no reload). C2 `Category.depth` + `path[{id,name}]` (breadcrumb from the row). C3 fee flag stays `PUT /users/me` (`preferences.fee_category_id`) → Profile; `getCategory.is_fee_category` reflects it. C4 `createTransaction` takes `tag_ids`, `updateTransaction` replaces them (create + tags = 1 call). C5 `listCategories?status=active|archived|all` (default active).
- K1 `Contact.email` resolved (no client fallback). K2 list order: active first, then resolved name case-insensitive; `search` covers name / nickname / display_name / email (server-side). K3 nickname > 100 → 400 VALIDATION_ERROR; ""/null → null; `show_nickname` absent on update = unchanged. K4 debt person = PersonRef with resolved icon (debts round). K5 `getLinkRequestSender` returns `contact_id`.

---

## 2026-10-12 — API v2 adoption (wallets / categories / tags / contacts + minimal touch-points)
DONE · analyze: 1 warning, not mine (`test/features/transactions/transaction_v2_model_test.dart` unused import) · full test suite: 409 passed, 0 failed. Not run in the app (owner/QA runs it); the BE needs a rebuild (DevOps) to try it.
Files:
- accounts: `lib/features/accounts/**` (domain account / wallet_member; repository; cubit; wallet_errors; accounts / detail / archived pages; wallet_members_view, account_card, adjust_balance_sheet, member_avatar_stack, wallet_invite_picker).
- categories + tags: `lib/features/categories/**` (category, category_label, repository, cubit, detail page), tags unchanged (delete already local); transactions: only the tag lines in `quick_create_sheet.dart` (`setTags` repo / cubit were done by the transactions FE).
- contacts: `lib/features/contacts/**` + `app_th.arb` / `app_en.arb` (4 nickname keys, gen-l10n run) + `personal_debts/.../debt_person_page.dart:52` (absorb result) + `test/features/transactions/splits_section_test.dart` (Contact ctor).
- touch-points: `saving_goal.dart` (+ detail wallet-row icon fallback), `scheduled_history.dart`, `scheduled_transaction_detail_page.dart` (generate-now `account_balances` → `patchBalances`), `scheduled_transaction.dart`, `budget.dart`; new tests `saving_goal_parse_test.dart`, `generate_now_result_test.dart`.
- ratchet: `test/hub/page_flows_test.dart` baseline regenerated (UPDATE_BASELINE=1): the removed endpoints `GET /accounts/{}/members`, `POST|DELETE /transactions/{}/tags` are no longer called.
Per page: wallets list = 1 call (wallets + totals + archived_count); wallet detail = 1 (`getAccount?include=summary,members`, any status); members writes patch from `MembersResult`; restore = `POST /restore`; no `AccountsCubit.load()` after writes; colour group / ownership / self from `group` / `can_edit` / `is_me`; no currency sent on wallet writes. Category detail = 1 `getCategory` (no `/users/me`), delete patches `reparented`. Contact detail = 1 `getContact?include=unlinked_names`; archive / restore / unlink / request-link / update / absorb patch from the response; nickname ("ชื่อเล่น") + "แสดงชื่อเล่น" switch (greyed while the nickname is empty; editable on linked contacts).
Deviations / for Lead:
1. Wallet summary card: "Shared pot ฿x" dropped (`totals` has only `shared_count`); `other_currency_count` note not shown (no string; needs an arb key). `AccountsState.totalsStale` + `refreshIfStale()` added: the list re-reads once on open / return from a pushed page because writes return no totals (owner can say "let it lag").
2. `NOT_OWNER` / `BALANCE_NOT_EDITABLE` have no Thai string yet (the BE message shows).
3. Contacts list: local instant search kept (server `search` would be a call per keystroke); the "recent" sort chip is now redundant (server order) and not removed; `contactLinkLinked` / `contactLinkedLockedHint` wording not updated.
4. Compat getters kept (deprecated): `Contact.effectiveName` & co. so debts / projects / notifications compile unchanged; `WalletMember(displayName:)` alias (hub page). Clean-up of those call sites belongs to the other FEs' rounds. `notification_actions.dart` still does `acceptInvite` + `accountsCubit.load()` (could use `accountsCubit.acceptInvite`) and matches contacts locally (BE now sends `contact_id`): not my file.
5. generate-now falls back to `AccountsCubit.load()` when `account_balances` is empty.
6. Category detail on a cold deep link also runs the list `loadIfNeeded` (pickers + duplicate-name check): 2 calls in that case only. `reparented` has direct children only; deeper descendants' cached `depth` / `path` go stale until the next list load.
7. Events-bill path in quick create: tags set by one `PUT /transactions/{id}/tags` after the call (the events endpoints' body has no documented `tag_ids`).
8. `lib/hub/api/page_flows.dart` not edited: its wallet-detail / category-detail still list a 2nd open call (`listTransactions` for their rows).

## 2026-10-12 — follow-ups after Lead's note
- Shared pot restored on the wallets summary card from `totals.shared_balance` ("กระเป๋าร่วม ฿x", next to the card debt); the `other_currency_count` note shown ("อีก N กระเป๋าเป็นสกุลอื่น ไม่นับรวม"); `NOT_OWNER` now has a Thai string. New arb keys (th + en): `accountsSummarySharedPot`, `accountsSummaryOtherCurrency`, `notOwnerError`. Files: `account.dart` (`AccountTotals.sharedBalance`), `accounts_page.dart`, `wallet_errors.dart`. Needs a BE rebuild to see the amount.
- `lib/hub/api/page_flows.dart` matched to reality: wallet-detail opens with ONE call (`getAccount`); `listTransactions` is a lazy "Transactions tab opened" action (the tab body builds on demand); category-detail has no transactions list, so it opens with ONE call (`getCategory`). The file is hub/kit-owner territory (FE-A): FE-A told.
- Compat cleanup list (for when the other FEs finish): `Contact.effectiveName/effectiveDisplayName/effectiveEmail/effectiveIconCode/linkedUserId/linkedUserDisplayName/linkedUserEmail/linkedUserIconCode` (call sites in debts, projects, notifications, accounts invite picker / members view, transactions splits); `WalletMember(displayName:)` alias + getter (hub `domain_people_accounts_page.dart`); `Account.group` derived-from-type fallback (hub samples); `notification_actions.dart` `acceptInvite` + `accountsCubit.load()` and local contact matching (BE now returns `contact_id`).
- Not mine, currently failing: `test/hub/page_flows_test.dart` ratchet on `POST /personal-debts/split-changes/{}/apply` (debts FE's new call; needs a flow or a baseline entry) and a hub-page compile error `counterpartyPersonName` in `lib/hub/pages/domain_others_page.dart:43` (debts model change). Earlier full run was 409/409 green.

---

## 2026-10-13 — Hub adoption (all-hands round), FE-E folders
DONE · analyze: 1 info (kit `lib/ui/molecules/amount_input.dart` unnecessary import, not mine) · full test suite 435 pass, 0 fail (raw_widgets baseline updated; hub_coverage green: `BankBrand` lives in `lib/ui/domain/brand/bank_brand.dart`, covered on hub Domain → Others). Not run in the app: the owner reviews the look.
Pass 1 (templates / layout / AppText / kit pieces):
- ListPageBody: accounts (wallets grid in `children` + archived page), contacts, tags (edit mode via `builder`), budgets, scheduled, saving goals lists. DetailPageBody: account create mode. Cards: `AppCard(onTap:)` + AppText roles + MoneyText (budget / scheduled / goal / account cards; `_UtilizationBar` → ProgressRow). Scheduled history rows → ListRow; account day / scope pickers → DetailRow ›; contacts wire-names sheet and new-tag sheet → FormSheet; contact link form rebuilt from SectionCard / DetailRow(locked) / DetailStacked + ModeActionBar; member avatars → kit AvatarStack; raw IconButton / TextButton / ListTile gone.
Pass 2 (KIT READY): MessageBanner / hand error rows → AppMessage (budgets, goals, contact form, account detail, adjust sheet, scheduled history); tags edit row → `AppInput(dense: true)`; goal allocation → `AppInput(type: percent, dense: true)`; goal deadline → `showAppDatePicker` (clearable); identifier edit row → ListRow + dense AppInput.
Visual shifts to review: wallets summary net label caption (was labelLarge) and weights w800→w700 on hero / net amounts (display role); scheduled amount titleMedium (money role); archived accounts + scheduled / goals lists use the template's default skeleton (6 rows); identifier input is framed, not underlined; member avatar ring 1.5px; link form gained a Cancel button; wire-names + new-tag sheets gained Cancel.
Behaviour decisions for Lead / FE-A:
1. `AppInputType.percent` is integer-only (RangeInputFormatter 0–100), but the BE allocation is a float: a decimal share (33.5) can no longer be typed in the goal form (values loaded from the server still show). Needs a decimal percent formatter in the kit, or accept integers.
2. `AppInputType.reference` is digits-only: not used for wallet identifiers (the "other" kind can hold x / letters).
Not mine / left, with the reason:
- Kit gaps (FE-A): `ListPageBody` tabs header (categories page keeps its pager) + an eager / inset-exposing mode (tags edit list keeps `96 + bottom`); `DetailPageBody.hero` nullable (account overview tab keeps its ListView); `DetailStacked.onLongPress`, `EditableCircle.onLongPress` (GestureDetector wrappers in account / category / contact / goal / scheduled detail); `SheetOption.destructive`; `PickerRow` chevron; `PickerCreateRow.onTap` nullable; AppAvatar variant with a brand colour (BankMark); `SegmentedBar` (wallet summary legend); `EmptyView` compact; named AvatarMetrics sizes; AppText italic; `editScope` snackbar messenger (category detail's `ScaffoldMessenger(key:)`).
- Raw `showDatePicker` left in files I don't own: scheduled next billing (`transactions/.../draft_form_scheduled.dart:342`), `draft_form.dart:779`, `personal_debts/.../debt_widgets.dart:267`; use `showAppDatePicker`.
- Scheduled detail keeps its always-visible ManageSection / no edit mode (today's behaviour; its redesign round).

## 2026-10-13 — Hub adoption: leftovers swapped (after FE-A / FE-B kit landings)
DONE · analyze: clean (0 issues) · full test suite 442 pass, 0 fail. Not run in the app.
Swapped: long-press via `EditableCircle(onLongPress:)` / `DetailStacked(onLongPress:)` (account hero icon, category, contact, goal, scheduled `_TextRow`); `SheetOption(destructive:)`; `PickerRow(chevron:)`; `PickerCreateRow(onTap: null)`; `EmptyView.compact` (tags, pickers); `AppAvatar.brand` in BankMark (shows 1 letter instead of the short code now); `SegmentedBar` on the wallets summary; `AvatarMetrics.size*`; `AppText(italic:)`; `DetailRow.pick(helper:)` for account day / scope rows; goal allocation `decimals: 2`; categories page on `TabbedListPageBody` (header per tab, under the tab bar; deleted `categories_list_skeleton.dart`); tags edit list on `ListPageBody.builder(context, padding)`; account overview tab on `DetailPageBody(hero: null)`; category detail snackbars via the mixin's `pageMessenger` (`_messengerKey` workaround removed).
Still hand-made / for FE-B: `TabbedListPageBody` has no top-bar clearance (categories keeps a `Padding(top: MediaQuery top)`) and its header can't sit between tab bar and list (it swipes with the pages); `ListPageBody` needs `refreshEnabled` (categories disables pull-to-refresh while reordering by a no-op onRetry, the indicator may flash). `IdentifierInputFormatter` kept (reference + allowLetters has no filter / per-kind length caps). `saving_goal_card` icon `GestureDetector(onTap)` kept (EditableCircle's 40px min + pencil would change the look). Identifiers `SectionCard` long-press `GestureDetector` kept. `wallet_invite_picker` caption not an empty state. Raw `showDatePicker` remains in transactions / debts files (not mine).
