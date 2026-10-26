# fe-saving — saving goals (0.3.1-10)

Newest at the bottom.

## 2026-10-13 — PLAN: saving goals pages (read-only, nothing edited)
Sources: `design/spec/09-saving-goals.md` (+ business-rules rule 10, schema.md:588), `openapi.yaml` (saving-goal paths ~4156–4932, `SavingGoalTouch` ~6544), BE `internal/modules/saving_goals`, app `lib/features/saving_goals`, `ai/decisions.md`, fe-core's preset report, fe-plans.md §4/§7. Shared kit pieces agreed with fe-budget.

### 1. Facts

**Spec (v0.1)**
- A goal is a target laid over ONE real wallet. Progress is never stored: `current = wallet balance × allocation_pct / 100`.
- Per wallet, the ACTIVE allocations sum to ≤ 100. Leaving allocation empty on create = all the free capacity. Archiving frees capacity; restoring re-checks it (ALLOCATION_EXCEEDED).
- Completion is computed, not a status, and not sticky (it flips back if the balance drops). Status is only `active | archived`.
- The wallet can't be changed after create. Currency = the wallet's.
- Delete = hard delete. `required_monthly` is "FE-computed" in the spec, which thin FE overrides.
- The spec says nothing about archived wallets, shared wallets or wallets with tracking off.

**BE**
- 8 routes, all in openapi. The list takes `status` (active default / archived / all), `account_id` and `is_completed`, but the spec declares no query params.
- `SavingGoalTouch` is only partly spelled out (`additionalProperties: true`).
- Go `buildView` computes `current_amount`, `progress_pct` (uncapped), `remaining_amount`, `is_completed` and `days_remaining`. It has no `required_monthly`.
- `days_remaining` uses server time with the deadline at UTC midnight, so it can be off by a day for Bangkok.
- ALLOCATION_EXCEEDED has no details (no free pct).
- **Archived-wallet bug:** Get / Update / Archive / Restore fall back to `{name "(archived)", balance 0, currency "THB"}`, so progress reads 0. List shows the real balance. The two disagree.
- Goals on archived wallets stay in the active list and are counted on Home (dashboard tile) and in `/me` counts.
- Restore doesn't check that the wallet is active.
- Only the wallet OWNER can link a goal. After `transfer-ownership`, the old owner's goals fall back to "(archived)"/THB/0 for good.
- No `track_balance` exists anywhere yet.
- Tests cover only the create/get/list shape and the text fields.

**App**
- **List:** `ListPageBody`, but:
  - rows are a feature-local `SavingGoalCard` (hand-built Row/Column, raw `GestureDetector`, `SizedBox`es, `Align`)
  - money uses `moneyString` with the default `฿`, not the goal currency
  - there is no archived view and no filter
  - `loadIfNeeded` holds an app-wide cache, so progress goes stale after transactions
- **Detail** (one page for create / view / edit; `DetailPageBody` + `EditModeMixin`, description in the hero):
  - **getById is never called:** open = `SavingGoalsCubit.loadIfNeeded()` (the whole list) + `AccountsCubit.loadIfNeeded()` (for the wallet join), so 2 calls. Pull-to-refresh reloads the whole list.
  - Hand-built hero footer (Column + `SizedBox` + a copied display style).
  - Hand `topInset` / `bottomInset` maths.
  - Hand error column under the wallet row.
  - Note in its own SectionCard; the standard puts it in the top box.
  - Imports `transactions/.../account_picker_sheet.dart` and `accounts/.../wallet_value_chip.dart`.
- **Client-side computation:**
  - `requiredMonthly` (`days / 30.44`)
  - currency fallback `?? 'THB'`
  - `_isoDate`
  - "emptied allocation = keep the old one"
- **Never wired:** restore (no UI), `GET /accounts/{id}/saving-allocations` (no free-capacity hint), the `wallet-savings` flow.
- **Writes** patch the cache from the response. Archive throws its response away.
- No goal preset for quick create (both pages = `none`).
- Tests: 2 parse tests. No page or cubit tests.

### 2. Plan (hub templates + kit only; feature = state / API / navigation)

**State:** drop the app-wide list cache for these pages.
- The list page and the detail page each own a small page cubit: open = 1 call, pull-to-refresh = the same call, writes patch from the response.
- Home keeps its `markStale` hook via a tiny "goals changed" signal. The dashboard tile stays BE-computed.
- Re-fetching on every open fixes "progress not refreshing": a goal follows its wallet balance, which any transaction changes.

**List `/saving-goals`**
- `ListPageBody` + `ListToolbar` chips (กำลังออม · เก็บถาวร; one size down, per the rule).
- Header: a `ProgressSummary` (saved / target over all counted goals, from the BE).
- Rows: `ProgressCard`:
  - icon
  - name
  - subtitle = wallet name
  - trailing = `StatusChip` (สำเร็จ / หยุดนับ / เก็บถาวร), else the allocation % badge
  - value line "฿x จาก ฿y" + `%` from the BE
- `AddTile` at the end. `EmptyView`, plus one per filter.
- Open = `GET /saving-goals?status=active|archived` (1 call). Paused goals (§Q2) sort last in the active list.

**Detail `/saving-goals/:id`** (contact-page reference)
1. **Hero:** `HeaderCard`, with:
   - tint = the icon colour
   - `StatusChip` in the top row
   - ✏️ right
   - name + `HeroDescription`
   - footer `ProgressSummary`: current, "จาก ฿target", bar, %
   - a paused goal shows no amounts, only the reason
2. **Top box** (no heading):
   - wallet = entity chip, `DetailRow` 🔒 after create
   - target
   - allocation (`AppInput` percent in edit, with the free-capacity line "ว่าง 40% (฿12,000)" under it from the BE)
   - deadline (`showAppDatePicker`, clearable; value + "อีก n วัน / เลยกำหนด n วัน")
   - note
3. **"ความคืบหน้า" section:** remaining, days left, required per month. All BE values; hidden when null.
4. **Paused:** an `AppMessage` (warning) under the hero, with the reason (wallet archived / tracking off / not your wallet) and, where one exists, the fix ("เปิดกระเป๋า" → wallet page via `openPage`).
5. **Edit mode:** `ManageSection`, archive (amber) / delete (red). An archived goal shows "กู้คืน" (restore). ALLOCATION_EXCEEDED shows as an inline error on the allocation field, with the free % from the error details.
6. `DetailMeta` at the bottom.
- Open = `GET /saving-goals/{id}` (1 call, page-ready: free capacity included, no wallet join).
- Each button = 1 call (save PUT, archive, restore, delete), and each write returns the full page-ready goal.

**Create** (`/saving-goals/new`): stays the detail page in create mode, like wallet / category / contact create (so the old Q1 isn't re-asked for goals).
- Open = `GET /saving-goals/form-options` (1 call): the eligible wallets (owned, active, tracked, with free capacity), each with `free_pct` / `free_amount`.
- The kit `AccountPickerSheet` shows them, with `WalletPickItem.subtitle` = "ว่าง 40%".
- Picking a wallet makes NO call (the hint is already there). Save = POST.

**Rules covered**
- **Currency:** the user's single currency, via the kit default (kit ask K4). No `฿` / `THB` in the feature.
- **Pull-to-refresh:** template default on both pages, off in edit mode.
- **Skeletons:** first load only (template).
- **Offline:** template + `ModeActionBar` handle it. I'll check that `editActionBar` is the gated piece, and that the date picker / picker sheet don't fire calls offline.
- **Quick create preset (Q3):** goal detail → `QuickCreatePreset(account: linked wallet)` (tx mode, tx colour), so "+" = put money into the goal's wallet. List → none.

**Deleted from the feature:**
- `SavingGoalCard`
- `requiredMonthly`
- `_isoDate`
- the THB fallback
- the `AccountsCubit` / transactions picker / `walletValueChip` imports
- the hand insets / footer / error column

**Tests:**
- page tests for list and detail, with prod-shaped JSON + a failed-load case + paused + archived
- a cubit test for patch-from-response

### 3. BE asks (spec first in openapi.yaml)
- **G1 `GET /saving-goals`** — page-ready list:
  - declare `status` (`active|archived|all`), `account_id`, `is_completed`
  - return `{summary: {saved, target, progress_pct, counted}, data: [Goal]}`
  - the summary skips paused goals
- **G2 Goal schema, fully spelled out (no `additionalProperties`), plus:**
  - `required_monthly` (null without a deadline / when overdue / when done)
  - `state` = `active | completed | paused | archived` with `paused_reason` = `wallet_archived | wallet_untracked | wallet_not_owned` (the BE decides; the FE only maps state → chip / tone)
  - `free_allocation_pct` + `free_allocation_amount` for this goal's wallet, excluding this goal
  - `days_remaining` computed in the user's timezone
  - currency = the user's (no `"THB"` literal)
- **G3 Archived / untracked / transferred wallet = paused** (Q2), the same on every path:
  - real wallet ref
  - amounts null (not 0)
  - left out of the summary, the Home tile and `/me` counts
  - keeps its allocation
  - restore of an archived goal on a non-active wallet → stays paused
  - remove the `(archived)`/`THB` fallback in `service.go`
- **G4 `GET /saving-goals/form-options`:** eligible wallets (owned, active, tracked) with `free_pct` / `free_amount`, plus the user currency. Replaces the unused `saving-allocations` call for create. Keep or drop `saving-allocations` with the wallet page (fe-core's call).
- **G5 Writes** (POST, PUT, archive, restore) return the full G2 goal.
  - ALLOCATION_EXCEEDED gets `details: {free_pct, free_amount}`.
  - Create on an untracked wallet → `WALLET_NOT_TRACKED` (400).
- **G6 `track_balance`** (decisions.md, not briefed yet): when it ships, goals on such a wallet go to paused (G3). Optional: the wallet's switch-off confirm shows "n เป้าหมายจะหยุดนับ" from a `goal_count` on the wallet.
- **G7 Tests:** ALLOCATION_EXCEEDED, auto allocation, restore re-check, paused on archive / untracked / transfer, `days_remaining` around midnight.

### 4. Kit asks (fe-core; hub first). ProgressCard / StatusChip agreed with fe-budget.
- **K1 `ProgressCard`** (domain organism; goal rows, budget rows):
  - leading `IconCode` tile, optional
  - title + one caption subtitle line (caller string)
  - trailing slot (badge or `StatusChip`)
  - `ProgressRow`: value clamped 0..1 visually, colour = tone (ok = entity tint via `IconCode.tintFor`; warn / danger / success / muted)
  - value line = a caller-supplied label (String, e.g. "ใช้ไป ฿x จาก ฿y" / "฿x จาก ฿y") + optional danger second line ("เกินงบ ฿z")
  - trailing % text caller-supplied and NOT clamped ("104%")
  - `onTap`
  - `.skeleton` with the same slots
- **K2 `StatusChip`** (generic molecule): tone + label + optional icon → `AppChip(selected)`, size from `ChipSizeScope`.
  - Goals: สำเร็จ (success) · หยุดนับ (warning) · เก็บถาวร (muted).
  - Budgets: ใกล้เต็ม (warning) · เกินงบ (danger) · เก็บถาวร (muted).
- **K3 `ProgressSummary`** (molecule, no icon):
  - big money title (money role)
  - optional caption
  - `ProgressRow`
  - optional footnote line ("เหลือ ฿z · เกิน n งบ")
  - `.skeleton`
  - Goal hero footer, goals list header, budget list header / hero. `ProgressCard` can compose it.
- **K4 Default currency:** `MoneyText` / `moneyString` default to the user's currency from a scope set from `/me`, instead of `'฿'`, so no page passes a symbol (fixes every ฿ hard-code app-wide).
- **K5 Wallet entity chip in the kit:** move `walletValueChip` (accounts feature) into `ui/domain/money`, so the goal wallet row uses it via `ui.dart`.
- **K6 (small)**
  - `ListPageBody` card spacing (a `rowGap`, or the card-list mode), so lists of cards need no `SizedBox`.
  - A date-value helper for display rows (date + "อีก n วัน" / "เลยกำหนด n วัน" from a BE day count). Skip it if fe-core prefers the l10n line in the feature.

### 5. Owner questions (each with a recommendation)
1. **Free capacity on create:** show it in the wallet picker ("ว่าง 40%") and under the allocation field, and leave out wallets with 0% free / tracking off? **Recommend: yes.** One call on open, no surprise errors.
2. **A goal whose wallet is archived, has tracking off, or was given to someone else** (replaces old Q3): **Recommend "หยุดนับ" (paused).**
   - It stays in the active list (at the end) with a warning chip + reason.
   - It shows no amounts and isn't counted in totals / Home.
   - It keeps its %.
   - It resumes by itself once the wallet is back / tracking is on.
   - The alternative (old Q3) moves it to "เก็บถาวร", which hides a goal the user never archived.
3. **Quick create "+" on the goal page:** **Recommend: preset to the goal's wallet** (tx mode), so "+" = add money to what you're saving in. List page = plain tx.
4. **List header summary** "ออมแล้ว ฿x จาก ฿y" over all counted goals: **Recommend: yes.** One BE number, the same as the Home tile.

## 2026-10-13 — goals v2 BUILD (feature code + tests; kit pieces pending fe-core)
Built against the BE's goals v2 spec (openapi.yaml, tag "Saving goals"). The % allocation code is deleted (`saving_allocation_summary`, `saving_goal_status`, `saving_goal_card`, wallet picker / `walletValueChip` imports, `requiredMonthly`, `_isoDate` stays only for the write body).

**Done (lib/features/saving_goals/**)**
- Domain: `SavingGoal` (state active|completed|archived, pace reached|on_track|late|none, BE needed / pace / ETA / milestones / `actions` flags / closed_at), `SavingEntry` (+ `SavingEndpoint` = SavingBucketRef, page `{data, pagination}`), `SavingGoalDetail` (nested; goal null = the spare page), `SavingGoalsOverview` (summary + spare + goals), `SavingWriteResult` (goals[] + spare + entries).
- Data: `SavingGoalsRepository` (list ?status, detail, entries page, create / update / archive / restore / delete / close, POST /saving-entries save|withdraw|move with optional `splits`, PUT / DELETE entry).
- State: `SavingGoalsCubit` (list: ONE call per open, status chips re-open it, `markStale()`; Home still listens to `goals`) + `SavingGoalCubit` (one goal page or `spare`: one call on open, paged entries).
- Pages (kit pieces only, wording in `widgets/saving_goal_texts.dart`):
  - List: totals header (SummaryStats), status chips (กำลังออม / สำเร็จ / เก็บถาวร), the spare row, goal rows (progress, deadline, pace chip), add tile.
  - Goal page: hero + progress, top box (target, deadline, note), action row, overview (needed / pace / ETA / time left / auto-save), by wallet, saving entries (paged), close / restore button (from `actions`), archive / delete in edit mode.
  - Spare page (`/saving-goals/spare`).
  - Create / edit: name, description, target, deadline, note, icon. No wallet, no %.
- arb: 38 `sgv2*` keys th + en (append-only, gen-l10n run).
- Tests: `saving_goal_parse_test` (7: prod-shaped JSON for goal / detail / spare / list / write answer) + `saving_goals_pages_test` (4: list + detail with prod-shaped JSON, failed first load = full-page error, ONE call on open).

**Waiting on fe-core (each is a `TODO(kit-Kn)` in the code; the page runs on today's kit meanwhile)**
- K1 ProgressCard / K3 ProgressSummary (list rows, hero footer) · K7 MilestoneRow + K8 SavingHistoryChart (goal page; the data is parsed already) · K9 BreakdownRow · K10 SavingTxRow · K11 SavingMoveSheet (withdraw / move) · K12 CloseGoalDialog (today `showChoiceDialog`, no per-wallet list) · K13 quick create ออม (add savings) · K14 plain button slot (close / restore).
- The action row (เพิ่มเงินออม / ถอน / ย้าย) is DISABLED until K11 / K13 land; I'll wire them to the sheets' results (`addEntry` is ready in the cubit).
- "ออมอัตโนมัติ" row has no tap yet (open the recurring ออม item: fe-core / fe-recurrent route).

**BE asks**
1. `SavingWriteResult` has no by-wallet / history / entries of the page I'm on, so after a money write I re-read the page (2 calls per button). Please add this page's `SavingGoalDetail` (e.g. `detail`) to the write answer when the request carries the goal id (or always for the `goal_id` bucket).
2. `GET /saving-goals?status=` list rows lack `by_wallet` (fine); no ask.

**Not verified:** nothing run on a device. The `progress_pct` bar uses `/100` of the BE value only.

**Update (same day):** wired to BE's `goal_page` / `spare_page`: a goal page button is now ONE call and the answer replaces the page (the re-read and BE ask 1 above are gone). My own checks: `dart analyze lib/features/saving_goals test/features/saving_goals` clean, `flutter test test/features/saving_goals` 12/12. Per the owner's new rule I did NOT run the full suite after this. Earlier full run (before the rule, other sessions' work mid-flight) showed 5 reds, none in goals files: cross_tab_links (budgets push), api_spec_ratchet, page_flows (passed on re-run), hub `domain/saving` smoke (a timeout; fe-core's hub page; it also failed alone, so check it when kit pieces land).

## 2026-10-13 late — goals v2: ALL saving work (handover from fe-core)
**Done**
- Goal page on fe-core's kit: `ProgressHeroFooter`, `StatGrid` / `StatTile` (needed · pace · ETA · time left), `MilestoneRow`, `SavingHistoryChart` (actual + projection at the pace + needed line), `BreakdownRow` (by wallet), `SavingTxRow` (entries; tap = delete with a confirm), `showCloseGoalDialog` (per-wallet return list), `ActionBar` under the hero. List rows = `ProgressCard`.
- เพิ่มเงินออม = quick create in ออม mode with the goal chosen; ถอน / ย้าย = `showSavingMoveSheet` (auto largest-first split from `by_wallet`, ✏️ editable; move asks the target via an option sheet: spare or another goal). Every button = ONE call; the answer `goal_page` / `spare_page` replaces the page.
- Goal page declares `QuickCreatePreset.saving(goalId)` so the shell "+" adds savings into this goal. "ออมอัตโนมัติ" row → `openPage('/recurring/<id>')` or `/recurring/new?type=saving&goal=<id>` (fe-recurrent's contract).
- Quick create ออม mode (`quick_create_sheet.dart` + new `saving_entry_form.dart`): `[รายการ] [หนี้] [ออม]` chips, EntryCard with the 🐷 badge + mode colour, from-wallet row (free amount under the amount; over it = red warning, still saves), target row (spare + active goals, preset goal selected), date, note. Save = `POST /saving-entries` (one call) → `AccountsCubit.patchSavings(wallets[].savings)` (new, from the write answer), list / Home marked stale, snackbar. Mode switch carries amount / note / date.
- Wallet page: the action bar gets "เพิ่มเงินออม" (quick create ออม on that wallet) when the wallet tracks its balance (`onAddSaving` still overrides).
- Tests: saving_goals 12 + `quick_create_saving_mode_test` 2 (preset, free-amount warning, ONE write, stale marks); wallet savings / debt-mode / entry sheet / quick-create-mode suites green. English label of the mode chip is now "Savings" (was "Save", clashed with the Save button in tests).

**Open**
- Pending 🐷 row: tap still = confirm dialog (`pendingSavingConfirm`); editing a saving draft in the sheet (prefill ออม mode from `PendingDraft.goalId`) is NOT done — it needs the draft-edit path (`draft:`) to carry a saving draft; say if you want it in 0.3.1-10.
- Recurring ออม = fe-recurrent.
- Hub smoke `domain/saving` timeout (fe-core's hub page) still to be checked by the full run.
- Nothing seen on a device.
