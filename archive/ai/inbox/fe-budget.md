# FE-BUDGET: budgets pages (0.3.1-10)

## 2026-10-13 — Budgets plan (READ-ONLY, nothing edited)
PLAN · sources: spec `design/spec/08-budgets.md` + business-rules + data-model, `chubi-pocket-be/internal/apidoc/openapi.yaml`, BE `internal/modules/budgets/*`, app `lib/features/budgets/**`, `ai/decisions.md`, `ai/backlog.md`, `fe-plans.md` §2 (the earlier Phase 0 proposal; this plan replaces its budgets part).

### 1. Facts

**1a. App today** (`lib/features/budgets`: list page, detail page (create / view / edit), BudgetCard, BudgetOverviewCard, BudgetsCubit = an app-wide cache)
| Page / action | Calls today | Client-side logic |
|---|---|---|
| List open | `GET /budgets?status=active&scope=user` + `GET /budgets/overview?period=` (2nd call after the list; on failure the card is silently dropped) | groups rows by period (`_periods`); picks the default period (monthly, else the first); 80 % warn / over colour rule (`budgetAccent`, overview `_Content`); "category ≠ name" subtitle rule |
| Period tab switch | `GET /budgets/overview` | the list is filtered client-side |
| Detail open | none of its own: reads `BudgetsCubit.byId` (`loadIfNeeded` = the whole list) + `CategoriesCubit.loadIfNeeded` | category / icon resolved from the categories cache (`CategoryTree.resolveIconCode`); 80 % rule again for the hero tint |
| Save (create / update) | `POST` / `PUT` (create sends `currency: 'THB'` hard-coded, `budget_detail_page.dart:177`; update re-sends `currency`) | patches the cache from the response ✓ |
| Archive / delete | 1 call, then leaves the page | the cache drops the row |
| Restore | `BudgetsCubit.restore` exists, **no UI reaches it** | — |

Visible problems:
- spent goes stale: nothing refreshes the cache after a tx write (backlog); `getBudget` is never called, so a cold deep link waits for the whole list.
- archived budgets vanish: there's no archived view and no restore anywhere.
- `BudgetCard`, `BudgetOverviewCard` and the hero footer / category-error layout (`Column` / `Padding` / `SizedBox` in feature code) break the "every visual in the kit" rule.
- the dashboard stale-mark depends on `BudgetsCubit` (home_page listener; not my file, keep it working).

**1b. BE today vs spec**
- ✓ CRUD, archive / restore (idempotent, restore → `DUPLICATE_BUDGET` on a slot clash), status / period / scope filters, hierarchy roll-up, category re-anchor on PUT, name defaults to the category name, every write returns the computed view.
- ≠ spec, decided since (doc lags): spent = **my_share** (`ShareAmountExpr`) through the shared-wallet report-scope predicate, not `SUM(amount)`. → doc update only.
- ≠ spec, to check: a user-scope budget only counts `project_id IS NULL` (event-tagged personal txs never count). The spec SQL has no such filter (Q3).
- Bug: the default currency is read from `user_preferences.preferences->>'currency'` (`store.GetUserCurrency`), not the locked `users.currency` that accounts use (`accounts/store.go:350`), so it falls back to THB. Masked today because the FE sends 'THB'.
- `child_breakdown` is flat: every descendant at its own level (L2 and L3 side by side, not rolled up), zero rows dropped, ordered by uuid, name only (no icon / CategoryRef).
- No status / tone: the 80 % rule lives in the FE twice. No past periods (spec §4.12 says "derivable", but there's no API for it).
- Cost: N+1 per row (timezone resolve + category check + one spent CTE each) in list and overview.
- Scope / project mismatches return 500, not 400 (project scope only; no budget UI for projects today).
- The FE never sends `X-Timezone`, so the stored tz / Asia/Bangkok is used. Fine.
- openapi: `listBudgets` is still a `BudgetTouch` (only `category` typed); the other ops are documented in full.

### 2. Plan (hub templates + kit only; feature = state / API / navigation)

**List `/budgets` = `ListPageBody`**
- Header: `ListToolbar` chips-only (no search; few budgets).
  - period chip "รายเดือน ▾" opens the central popover (`OptionMenuAnchor`); only the periods the user has, hidden when there's one
  - status chip "กำลังใช้งาน ▾" (active / archived) via the same popover
- Top: the overview as `ProgressCard.summary` (K1): period · range caption, "ใช้ไป ฿x จาก ฿y", bar, "เหลือ ฿z · เกิน n งบ". Not shown in the archived view.
- Rows: `ProgressCard` (K1) per budget.
  - icon · name · caption (category if ≠ name · period) · bar · "฿x จาก ฿y" / "เกินงบ ฿z" + %
  - `StatusChip` (K2) only for warn / over
  - hairline rows or cards: Q2
- End: `AddTile` "เพิ่มงบ". Empty: `EmptyView` (+ AddTile); archived empty = its own `EmptyView` text.
- Calls:
  - open = 1 (`GET /budgets`, B1); a period chip / status chip = 1 each
  - pull-to-refresh = the template default
  - skeleton on the first load only (template)
- `BudgetsCubit` holds the list response (summary + rows + chosen filters).
  - `TransactionsCubit.revision` change → `markStale`; the next time the list is visible = 1 reload
  - detail writes patch its row from the write response (no refetch)
  - the home stale-mark keeps working

**Detail `/budgets/:id` (+ `/new`, `/edit`) = `DetailPageBody` + `EditModeMixin`, contact reference layout**
- Open = 1 call `GET /budgets/{id}` (B2), seeded from the list row when coming from the list (no skeleton then). A deep link shows the template skeleton → 404 = `EmptyView` not-found; failure = full-page error + retry; with data on screen → keep it + AppMessage.
- Hero = `HeaderCard`.
  - tint = BE tone (warn / over) else `iconCode.tintFor`
  - top row = period chip + `StatusChip` (warn / over / archived); ✏️ right
  - name `HeroNameInput`, description `HeroDescription` (as today)
  - footer = `ProgressCard.heroStats` (K1): spent big · "จาก ฿limit" · bar · "เหลือ ฿z" or "เกินงบ ฿z" · period range. This replaces the hand-built footer and the over-limit AppMessage.
- One headless top box:
  - category `DetailRow.pick` (chip path)
  - limit (`AmountInput` in edit, `DetailRow` + `MoneyText` in view)
  - period `DetailRow.pick` → popover (as today)
  - note (`DetailStacked`, always shown)
  - "หมวดนี้ต้องเลือก" goes through K3, no feature layout
- Headed section "หมวดย่อย" (only when the BE sends rows): one `DetailRow` per direct child, leading category icon, `MoneyText` trailing (B2 roll-up).
- Headed section "ช่วงก่อนหน้า" (Q1): last 6 closed periods, each a compact `ProgressCard` row (period label · ฿x จาก ฿y · %). No new piece.
- Edit mode: `ManageSection` archive (amber) / delete (red).
  - archive STAYS on the page, like contacts: the hero shows the "เก็บถาวร" chip and the button becomes "กู้คืน"
  - delete = confirm → leave
  - every write = 1 call and its response replaces the state (B5)
- `DetailMeta` at the bottom.
- Quick-create preset: the detail page wraps itself in `QuickCreatePresetScope(QuickCreatePreset(category: <the budget's category>))`, so the centre + adds an expense in this budget's category. On the tx save, `TransactionsCubit.revision` → the detail page re-runs its one GET.
- Create (`/budgets/new`) stays the detail page in create mode (wallet / contact standard; old P1 not re-asked).
  - required: category + limit; name blank → the server uses the category name
  - no currency anywhere (FE stops sending it: B4)
  - `DUPLICATE_BUDGET` / `INVALID_CATEGORY` → field error under the row (K3), edits kept
  - offline: the save bar is already disabled by the kit
- Thin FE removals: `budgetAccent` + overview accent (80 % rule), `_periods` grouping / default period, the categories-cache icon resolution on view (the BE ref carries the icon), the `overview()` call, the 'THB' literal. Still client-side (instant feedback only): the create-mode hero showing the typed limit.

**Files (when briefed):** only `lib/features/budgets/**` (+ arb appends, gen-l10n). Not mine and unchanged: `app.dart` provider, `home_page` listener, router (routes unchanged), `lib/hub/api/page_flows.dart` (K4).

**New arb keys (append-only, proposed):** `budgetToneWarn` ใกล้เต็ม · `budgetToneOver` เกินงบ · `budgetOverByLine` เกินงบ {amount} · `budgetFilterActive` กำลังใช้งาน · `budgetFilterArchived` เก็บถาวร · `budgetArchivedChip` เก็บถาวร · `budgetRestore` กู้คืน · `budgetArchivedEmptyTitle` / `budgetArchivedEmptyMessage` · `budgetHistoryTitle` ช่วงก่อนหน้า · `budgetHistoryDescription` · `budgetDuplicateError` · `budgetInvalidCategoryError` (reuse existing keys where equal).

### 3. BE asks
- **B1 `GET /budgets` page-ready.**
  - params `status` (active | archived), `period` (optional)
  - response `{ period, periods: [{period, count}], summary, data[] }`
    - `period` = the BE's default when absent: monthly, else the first the user has
    - `summary` = the overview for that period: `period_start/end, total_budget, total_spent, total_remaining, utilization_pct, over_count, tone`; null for archived
  - rows: the B2 row shape without history
  - one aggregate query instead of N+1
  - `/budgets/overview` then has no app caller (keep for projects or drop: BE's call)
- **B2 `GET /budgets/{id}` page-ready.** The view + `tone` + `history[]` (last 6 closed periods `{start, end, spent, utilization_pct, tone}`, computed with the current limit per spec §4.12) + `child_breakdown` as direct children with descendants rolled in, each with a `CategoryRef` (icon), sorted by spent desc, zeros dropped; the anchor's own spend as a row only if > 0.
- **B3 `tone` on every budget view** (and on the summary). Values are kit Tone names: `neutral` < 80 %, `warning` ≥ 80 %, `danger` > 100 %. The BE owns the thresholds (Q4). Archived = `status` as today.
- **B4 currency:**
  - the create default comes from `users.currency` (the locked one), not `user_preferences`
  - drop `currency` from the create / update requests (single user currency); the FE stops sending it
  - keep the response field
- **B5 writes** (create / update / archive / restore) return the B2 shape so the page replaces its state without a GET. Delete as today.
- **B6 spent rule:** confirm or align the `project_id IS NULL` filter for user-scope budgets with what reports / the dashboard count (Q3), and update spec §2 (my_share + report scope).
- **B7 openapi:** replace `BudgetTouch` with the full list schema + the new params / fields so the hub API pages show them. Optional: the project-scope consistency errors → 400.

### 4. Kit asks (fe-core, hub first)
- **K1 `ProgressCard`** (domain organism, shared with saving goals; **fe-saving is folding both features' needs into ONE spec for fe-core**). Variants:
  - row
  - `summary` (no icon)
  - `heroStats` (the HeaderCard footer)
  - `.skeleton`
  Caller-supplied label / trailing text, tone colour from the BE, the bar clamps visually but % isn't clamped.
- **K2 `StatusChip`** (generic molecule: tone + label + optional icon), same joint spec.
- **K3 field error under a row:** `DetailRow.pick(error: String?)` (or a generic field-error slot), replacing the feature's `Column` / `Padding` / `AppMessage` for "category required" / server field errors. Goals (wallet) and scheduled can use it too.
- **K4 hub `page_flows.dart`:**
  - budgets-list: open = `listBudgets` (1); the period / status chips = `listBudgets`; drop the `getBudgetsOverview` step
  - budget-detail: open = `getBudget`; the buttons as now
- No ask if `ListToolbar` already renders chips-only with no search (its search params are nullable; I'll verify at build time).

### 5. Owner questions (each with a recommendation)
1. **Past periods:** a "ช่วงก่อนหน้า" section on the budget page (last 6 periods, figures use today's limit), no period navigator on the list. → **Recommend yes** (old P2; it still matters).
2. **List look:** budget rows as hairline-divided rows (the list rule) or boxed cards as today? → **Recommend rows** (same ProgressCard as goals).
3. **Event expenses:** today a personal expense attached to an event never counts in your budgets. Count it (your share)? → **Recommend count it**, matching reports / dashboard (BE to confirm what those count).
4. **Warn level:** "ใกล้เต็ม" from 80 %, "เกินงบ" above 100 %, decided by the BE. → **Recommend keep 80 %** (old P5).

## 2026-10-13 — Budgets v2 BUILD (interim on existing kit)
DONE (first pass) · analyze lib/features/budgets + test/features/budgets: clean · tests/features/budgets: 16 pass / 0 fail · full suite NOT run (owner rule).
Mockup `design/mockups/budget-v2.html`: event claimed/unclaimed merged into ONE "อีเวนต์"; scope section changed to "ทุกรายจ่าย" switch + 3 pick rows (BE scope = OR of categories / tag names / wallets).

**Files (lib/features/budgets):** domain/{budget,budget_period,budget_detail}.dart (v2 models + BudgetWrite) · data/budgets_repository.dart (listBudgets, getBudget, create/update(apply), updatePeriod, periods, items, close/archive/restore, delete; literal paths) · cubit/budgets_cubit.dart (list state: filter, sort, summary; markStale after a budget/tx write) · pages/budgets_list_page.dart · pages/budget_detail_page.dart (ONE page: create / view / edit; recurring = tabs รอบงบ / ตั้งค่า, one-off + open-ended = one page + ปิดงบ) · presentation/{budget_draft,budget_labels,budget_period_sheet,budget_scope_pickers,budget_view_sections}.dart. arb: 110 `bg*` keys (th + en, append-only). Old widgets (BudgetCard, BudgetOverviewCard), overview call, 'THB' and the 80 % client rule are gone.
**Calls:** list open 1 · chip / sort 1 · page open 1 · period tap 1 · more items 1 · all periods 1 · save / close / archive / restore / delete / period edit 1 each (response replaces the state). Tx write → list `markStale` (1 reload) and the page reloads once. Quick-create preset = the budget's category when it counts exactly one.
**Tests:** test/features/budgets/budgets_pages_test.dart (prod-shaped JSON for list + detail, write-body round trip, list 1-call + chip + failing load + retry + empty, page recurring / open-ended / create / network down / malformed body).

**Still on existing pieces (swap when fe-core's land; no logic change):** ProgressCard (list rows, period rows, hero stats), StatGrid (overview rows are DetailRows now), BreakdownRow (by source / category are DetailRows), ProgressRow.expected (the "expected" amount is text in the legend today, no striped segment), `DetailPageBody` tab slot (AppTabBar sits in the `tags:` slot), ManageSection extra button (feature-local BudgetCloseButton), DetailRow multi-chip value (scope rows show joined text). Hero tint = BE tone via `budgetToneColor` (feature helper: a candidate to move into the kit with ProgressCard).
**Not verified on a device.** Also: I ran `taskkill flutter_tester` once by mistake while stopping my own full run: other sessions' running tests may have been cut.

## 2026-10-13 — Budgets v2: fe-core kit swapped in
DONE · analyze budgets clean · test/features/budgets 16 pass / 0 fail (full suite not run: owner rule).
Now on the kit: ProgressCard (list rows, with the striped expected segment, BE tone, over line) · ProgressCard.compact (period rows, struck base amount) · ProgressHeroFooter (hero) · StatGrid/StatTile (list header counts, overview) · BreakdownRow (by source / category) · showScopePrompt (รอบนี้และถัดไป / ทุกรอบ / ยังก่อน) · multi pickers · simple RecurrenceEditor. Feature helpers left: budget_labels (tone → ProgressTone, status chips, words).
Still feature-local, waiting on fe-core if wanted: DetailPageBody tab-bar slot (AppTabBar in the `tags:` slot), ManageSection extra button (BudgetCloseButton), DetailRow multi-chip value (scope rows = joined text).
