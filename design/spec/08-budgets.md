# 08 — Budgets

> **0.3.1-10 — Budgets v2 (migration 059, owner mockup `archive/design/mockups/budget-v2.html`, 2026-10-13).** Section 0 replaces everything below (kept for history: one category, fixed periods, user / project scope, `/budgets/overview` are gone). Shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`, tag **Budgets**.

> **0.4.0-2 (updated 2026-10-20).** The scope is AND across categories / wallets / tags (§0.1). Sources: `upcoming` is now a computed recurring occurrence only, and the new `future_tx` is a future-dated expense, both expected (§0.2). Item rows carry `tag_refs`, `rule_id` and `slot`. The app pages are in §0.7. Fields: [`api-document.md` §08](../api/api-document.md#08--budgets).

## 0. Budgets v2

### 0.1 A named personal tracker
- `name`, `description`, `note`, `icon_code`, a base `amount` per period, `warn_pct` (default 80; null = ไม่เตือน).
- **Scope** (free; budgets may overlap): `all` (every expense), or any mix of categories (each with or without its sub-categories), tag NAMES and wallets.
  - **AND across the lists (0.4.0-2, owner 2026-10-19/20):** a row counts when it matches EVERY list that is set: categories AND wallets AND tags. Within one list any entry will do, and a list left empty does not narrow. Example: category อาหาร + wallet KBank = food paid from KBank only. Before 0.4.0-2 a row counted when it matched ANY of them.
  - The same filter applies to every source in §0.2, computed recurring occurrences included.
  - App (edit mode): the scope card's first row is labelled "นับรายจ่ายไหนบ้าง" (not a card heading), with the hint "นับรายการที่ตรงกับทุกแถวที่เลือก (ในแถวเดียวกัน อันไหนก็ได้)".
- **Time**:
  - recurring ("งบระยะยาว"): `rule {freq daily|weekly|monthly|yearly, interval}` from `start_date` (a month period starts on the start's day, clamped), end `none | date | count`;
  - one range: `start_date` → `end.date`, or open (`end.kind none`) until ปิดงบ.
- **State** (derived): `upcoming` (starts after today) · `active` · `ended` (closed with ปิดงบ, or past its end) · `archived` (เก็บถาวร: hidden, restorable). The list chips: กำลังใช้งาน = upcoming + active; จบแล้ว = ended; archived on its own.

### 0.2 What counts (expense side, my share; owner 2026-10-13)
| Source | Counts as | What |
|---|---|---|
| `normal` | used | my expense transactions dated up to today (`my_share`, report scope), not a debt entry's wallet side, not a system / non-report category |
| `recurring` | used | the same, when the transaction records a recurring occurrence (the row carries `recurring` n/N) |
| `event` | used | my share of an event bill (payer: amount − every split; else my splits; events not cancelled), ONCE: the transaction a bill was made from, or a copy of my share, is not counted again. (0.4.0-2, 2026-10-20) A bill dated after today counts as **expected** (รอจ่าย) until its day, inside the current period, like `future_tx`; then as used |
| `upcoming` | expected | (0.4.0-2) a recurring OCCURRENCE of an active setting, not recorded yet: computed from the setting's rule, or a stored one the user edited (it replaces the computed one of its period). Expense only, with a known amount > 0, dated in the current period (open-ended: the next 30 days). A paid (cleared) or skipped occurrence does not count. The one-off upcoming items are gone. |
| `pending` | expected | pending drafts dated in the current period |
| `future_tx` | expected | (0.4.0-2) my expense transaction dated after today, inside the current period (open-ended: the next 30 days), same filters as `normal`. On its day it becomes `normal` / `recurring` and counts as used. |

- An event bill takes the category / wallet / tags of my transaction behind it when there is one. A tag name also matches the bill's event tags and my tags on the event.
- Expected is the current period only: it is in the forecast, never in %, remaining or status. In the detail ring the expected part (รอจ่าย) is drawn only when it is at least 2% of the ring; a smaller amount shows only in the facts.
- Rows (0.4.0-2): `tag_refs [{name, icon_code}]` sits next to `tags` (same order). `icon_code` is the user's own tag of that name, or null for an event / recurring tag name. An occurrence row (`kind: recurring_item`) carries `rule_id` + `slot` and a `recurring` link whose `item_id` is null while the occurrence is only computed. Its row `id` stays stable (made from the rule + slot).

### 0.3 Periods (instances)
- Every period that has started is stored with its own `amount` and `note`. A new one begins on read. Later periods follow the setup.
- `PUT /budgets/:id/periods/:period_id` sets one period ("เฉพาะรอบนี้": `overridden`; `amount: null` = back to the base).
- `PUT /budgets/:id {apply}` (the prompt "ใช้การตั้งค่าใหม่กับรอบไหน"):
  - `following` (default): the current period and later. Past periods keep their amounts and dates. A rule change runs the new rule from the current period's start.
  - `all`: every period. A rule sent with `all` rebuilds the periods from the start.
  - Overridden periods keep their amount either way.

### 0.4 Status, forecast
- `pct` = used / amount, rounded, not clamped.
- Status, in order: `over` (used > amount) → `warn` (used ≥ warn_pct %) → `pace` (current period: the forecast goes over) → `ok`. Tone: danger / warning / neutral.
- Forecast (current, active periods):
  - avg_daily = used / elapsed days, today included
  - forecast_end = avg_daily × days in the period + expected
  - forecast_over_date = the first day where used + expected + avg_daily × (days after today) passes the amount
  - daily_allowance = ⌊(amount − used − expected) / days left, today included⌋
  - remaining_after_expected
- Open-ended: avg_monthly (= avg_daily × 30), forecast_over_date (no pace chip), this_month.
- Recurring: history_avg = the average used of up to 6 periods before.

### 0.5 API
- `GET /budgets?status=active|ended|archived&sort=risk|name|newest` → each budget at its current period + the hero / chip counts.
  - **Summary card (0.3.1-11)**, same whatever `status` / `health`: `summary` also carries `total_limit`, `total_used`, `total_remaining`, `used_pct`, `counts: {all, ok, near, over}` over the ACTIVE budgets (state active or upcoming = `active_count`) at their CURRENT period. `total_limit` = the plain sum of the current periods' amounts (an overridden period counts its override). `total_used` counts each counted row (transaction / event share) ONCE even when budgets overlap (named budgets with overlapping scopes), so it can be less than the sum of the budgets' `used`. `total_remaining` = limit − used (negative when over); `used_pct` rounded, not clamped, 0 when the limit is 0. `counts`: over = status over; near = status warn (at / above the budget's own `warn_pct`); ok = the rest (ok or pace); ok + near + over = all.
  - `?health=normal|near|over` narrows the ROWS to that group (normal = ok + pace), never the summary (a tile tap = one call). Each `period` has `on_pace_to_exceed` (the forecast says the current period ends over; independent of `status`: the "on pace" row badge).
- `GET /budgets/:id?period_id` → the page in one call: forecast, by_source, by_category (used, share of used), the 6 newest periods, the first 20 items (expected first).
- Paging: `GET /budgets/:id/periods`, `GET /budgets/:id/items?period_id&source` (`source` and `by_source` take the §0.2 values, `future_tx` included).
- `POST /budgets`, `PUT /budgets/:id`, `PUT /budgets/:id/periods/:period_id`, `POST /budgets/:id/close | archive | restore`: each returns the page. `DELETE` → `{id}`.
- Errors: 400 VALIDATION_ERROR / INVALID_RULE / INVALID_CATEGORY / ACCOUNT_NOT_FOUND, 404 NOT_FOUND, 409 INVALID_TRANSITION.
- Home `/dashboard` budgets tile and `/me/counts` `budgets_summary` keep their shapes, summed over active budgets' current periods.
- Currency is no longer sent: amounts are in the user's currency.

### 0.6 Migration 059
Personal v1 budgets become recurring budgets on their category (+ sub-categories), with the same period (anchored on the start of the period they were created in). Event-scope budgets are dropped. Deleting a category takes it out of a budget's scope; `Category.budget_count` = budgets tracking it.

### 0.7 App pages (0.4.0-2, updated 2026-10-20)
Layout only; every look comes from the kit. Budgets use a pie / donut module icon app-wide; the piggy bank belongs to savings (owner 2026-10-20).

**Budgets list hero**
- No round / month stepper (every budget's round differs) and no faint caption. Head: the budget module tile (40, card color), then a bold summary chip; 🔍 on the right.
- The summary chip uses the detail page's status words:
  - **เกินงบ ฿x** (danger) when the total is over: `total_used` > `total_limit`, x = the overage (the same number as the ring).
  - Otherwise **ใช้เร็วกว่าแผน ฿x** (warning) when Σused > Σ plan-to-date, with x = the difference.
  - Otherwise **ตามแผน** (card color).
  - Σ plan-to-date = Σ amount × the elapsed share of the current period, over the active budgets that have such a share (an open-ended budget has no plan and is left out). Σused = the plain sum of the same budgets' `used`. Owner 2026-10-20: it stays the sum of every budget, so a spend inside two overlapping budgets counts in both. The app works it out on the device clock.
- The ring: "เหลือทั้งหมด" ฿`total_remaining` with "จาก ฿`total_limit`". Over the limit it reads "เกิน" with the overage, in danger.
- The facts, each with an icon: ใช้ไปทั้งหมด (receipt) = `total_used`; ใช้แล้ว (pie) = `used_pct` %; งบในรอบนี้ (layers) = "N งบ" (`active_count`).
- The filter chips are count chips that filter (`?health=`): ทั้งหมด | ปกติ | ใกล้เต็ม | เกินงบ.
- The ended / archived tabs: the head is only the module tile + 🔍 (no caption).
- Rows: all in ONE SectionCard. A row's pace tick carries an always-on bubble "แผนถึงวันนี้ ฿x" (amount × the elapsed share).

**Budget detail ring hero** (view mode)
- Identity row: icon + name (one line, ends in "…") + description. Beside ✏️ sits a small info box: the round (e.g. ทุกเดือน), or ครั้งเดียว / ไม่มีกำหนดจบ, with "เหลือ N วัน | elapsed/total days" under it.
- The card color is the budget icon's tint; a warning / over period paints over it.
- Ring + facts (the facts get at least half the row):
  - The ring shows used, the expected part (§0.2, 2% rule), the pace tick and the warn tick. In the centre: "ยังใช้ได้" ฿remaining "จาก ฿amount"; over: "เกิน" ฿overage.
  - Facts with icons: ใช้ไป (receipt); รอจ่าย (clock, only when something is expected); แผนถึงวันนี้ (trend up, when the period has a pace); then ใช้ได้วันละ (calendar), or รอบใหม่เริ่ม {date} (repeat) when a recurring budget is already over.
- Last, at chip size: the plan status chip (active budgets): เกินงบ ฿x → ใช้เร็วกว่าแผน ฿x → ใกล้เต็ม → ตามแผน, first match. Plus "เฉพาะรอบนี้" when the period is overridden. A budget that is not active shows its state chip in the header instead.
- Under the hero in view mode the scope is shown as chip strips (categories, wallets, tags). The scope and period cards appear in edit mode only.
- The period card: เริ่ม, then ทำซ้ำ ☑ with the round chips and the end, or สิ้นสุด. Picking a weekday / day in the repeat sheet moves the start to the next matching date, and the sheet says so ("วันเริ่มจะเลื่อนเป็น …").

**Budget items tab**
- Grouped by day. Each day's rows sit in one SectionCard, with the day header above it. The header total = −(the day's sum, expected rows included).
- No "นับเพราะ…" line (the API's `reason` is not shown) and no "ปกติ" chip.
- A source chip shows only for the other sources: รายการประจำ (`recurring`), อีเวนต์ (`event`), "รายการประจำ | ล่วงหน้า" (`upcoming`), รอยืนยัน (`pending`), ล่วงหน้า (`future_tx`). Expected rows are dimmed.
- The wallet chip and the #tags look like the transaction rows. Each #tag is colored from `tag_refs[].icon_code`; a name with no own tag uses the primary color.
- Taps:
  - a transaction row (normal / recurring / future_tx) → tx detail;
  - an occurrence row (`kind: recurring_item`) → the occurrence sheet ("แก้เฉพาะงวดนี้", spec 11), found by its stored id, or by `rule_id` + `slot` while only computed; a confirm / skip / link there reloads the budget;
  - event bill and pending rows don't open.

---

Per-category spending limits with a recurrence period. Advisory (not blocking) — the app warns you when you exceed, but never rejects a transaction.

Supports two scopes in Phase 1c:

- **User scope** — "I spend max ฿5,000/mo on Food overall"
- **Project scope** — "my Food spending in the Japan trip: max ฿10,000/mo" (inherits project visibility)

Note there is no `'total'` period — project-scope budgets are periodic like
all budgets. A whole-project total lives on `projects.planned_amount`
instead ([`10-projects.md §4.23`](10-projects.md), planned) — that one is
the *group* lens computed from the shared board; budgets here are the
*personal* lens computed from your own book.

This module owns `budgets`. References `categories` (target of each budget) and `transactions` (aggregated for progress). Progress is computed at read time — no stored snapshots.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 1c | Phase 2 | Phase 3 |
|---|---|---|---|
| User-scope budgets | ✅ | ✅ | ✅ |
| Project-scope budgets (per-category within a project) | ✅ | ✅ | ✅ |
| Weekly / monthly / yearly periods | ✅ | ✅ | ✅ |
| Hierarchy rollup (parent includes descendants) | ✅ | ✅ | ✅ |
| Budget overview (all active budgets summary) | ✅ | ✅ | ✅ |
| Over-budget notifications | — | ✅ | ✅ |
| Budget forecasting (projected end-of-period) | — | ✅ | ✅ |
| Rollover (YNAB-style) | — | — | optional |
| Historical period snapshots | — | — | optional |

---

## 1. Schema

Tables owned by this module: `budgets`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#08--budgets`](../database/schema.md#08--budgets).

**Uniqueness rule explained:** a user can have both a user-scope Food monthly budget AND a project-scope Food monthly budget for Japan — those are distinct `(project_id)` values and coexist.

**No historical snapshot table.** Period usage is computed at read time by summing transactions in the category's descendants within the current period. No `budget_usage` snapshot rows. Trade-off: slower queries for long periods vs. storage simplicity. Phase 3+ can add materialized snapshots if read performance degrades.

---

## 2. Computed fields

On every read, the backend computes:

| Field | Formula |
|---|---|
| `current_period_start` | First day of current period, in user's tz |
| `current_period_end` | Last day of current period |
| `spent` | `SUM(transactions.amount)` where type=`expense`, category in budget's category **or any descendant**, in current period, (if project-scope: also `project_id = budget.project_id`) |
| `remaining` | `amount - spent` |
| `utilization_pct` | `spent / amount × 100` |
| `over_limit` | `spent > amount` |
| `child_breakdown` | Per-descendant-category spending |

### 2.1 Period boundary math

Periods are computed in the user's `preferences.timezone` (see [`02-users.md §3.6`](02-users.md)).

| Period | Start | End |
|---|---|---|
| `weekly` | Monday 00:00 in user's tz | Sunday 23:59:59.999 in user's tz |
| `monthly` | 1st 00:00 in user's tz | Last day 23:59:59.999 |
| `yearly` | Jan 1 00:00 in user's tz | Dec 31 23:59:59.999 |

### 2.2 Hierarchy rollup

Categories are up to 3 levels (see [`05-categories-tags.md`](05-categories-tags.md)). A budget on "Food" includes spending on "Food > Restaurants > Thai" because that's a descendant.

Implemented via recursive CTE:

```sql
WITH RECURSIVE descendants AS (
  SELECT id FROM categories WHERE id = :budget.category_id
  UNION ALL
  SELECT c.id FROM categories c
  JOIN descendants d ON c.parent_id = d.id
)
SELECT SUM(t.amount) AS spent
FROM transactions t
WHERE t.user_id = :user_id
  AND t.type = 'expense'
  AND t.category_id IN (SELECT id FROM descendants)
  AND t.date BETWEEN :period_start AND :period_end
  AND (:project_id IS NULL OR t.project_id = :project_id);
```

### 2.3 Fresh each period (no rollover)

Each period starts at 0 spent. Unspent amount does NOT carry over. When April ends, the May window starts fresh with the full `amount`.

Phase 3+ could add rollover behavior if requested.

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `POST /v1/budgets`

Create a budget.

**Request body:**

```json
{
  "category_id": "0190e5...",
  "amount": 5000.00,
  "period": "monthly",
  "scope": "user",
  "project_id": null,
  "currency": "THB"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `category_id` | string | ✅ | Must be expense category (not income); not a system category |
| `amount` | number | ✅ | > 0 |
| `period` | string | ✅ | `'weekly'` / `'monthly'` / `'yearly'` |
| `scope` | string | ✅ | `'user'` / `'project'` |
| `project_id` | string | — | Required if `scope='project'`; caller must be member |
| `currency` | string | — | Defaults to user's currency |

**Validation:**

- Category must be `type='expense'`
- Not already an active budget with same `(user_id, category_id, period, project_id)`
- If scope=project: caller must be project owner (only owner can set project budgets)

**Success — `201 Created`:** the budget with computed fields.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid period/scope/missing project_id |
| 400 | `DUPLICATE_BUDGET` | An active budget already exists for (category, period, project-scope) |
| 400 | `INVALID_CATEGORY` | Category is income-type or system category |
| 401 | `UNAUTHORIZED` | |
| 403 | `FORBIDDEN` | Not project owner (for project-scope budgets) |

### 3.2 `GET /v1/budgets`

List active budgets. Includes computed usage for the current period.

**Query parameters:**

| Name | Description |
|---|---|
| `status` | `active` (default) / `archived` / `all` |
| `period` | Filter by period |
| `scope` | Filter `user` / `project` / `all` |
| `project_id` | Filter to specific project |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "0190e5...",
      "category": { "id": "0190e5-food", "name": "Food" },
      "scope": "user",
      "project_id": null,
      "amount": 5000.00,
      "period": "monthly",
      "currency": "THB",
      "status": "active",
      "current_period": {
        "start": "2026-04-01",
        "end": "2026-04-30",
        "spent": 3200.00,
        "remaining": 1800.00,
        "utilization_pct": 64,
        "over_limit": false
      },
      "child_breakdown": [
        { "category_id": "0190e5-restaurants", "name": "Restaurants", "spent": 2100.00 },
        { "category_id": "0190e5-groceries", "name": "Groceries", "spent": 1100.00 }
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 3.3 `GET /v1/budgets/:id`

Get a single budget with full current-period breakdown (same shape as list item).

### 3.4 `PUT /v1/budgets/:id`

Update budget fields. Partial.

**Editable:** `category_id`, `amount`, `period`, `currency`, `name`, `description`, `note`, `status`. `name` null / "" → back to the category's name (migration 051; on create an absent / blank `name` is the category's name too).
**Not editable:** `scope`, `project_id` (delete + recreate if wrong).

Changing `category_id` (owner decision 2026-10-09): must be an expense-typed, non-system category owned by the budget's user (same rule as create, else `400 INVALID_CATEGORY`). Spent is computed live from transactions, so the new anchor's figures apply immediately; nothing is migrated.

Changing `period` mid-cycle: the current period is recomputed against the new period boundaries immediately.

**Errors:** `400 VALIDATION_ERROR`, `400 INVALID_CATEGORY`, `400 DUPLICATE_BUDGET` (category / period change collides with another active budget), `401`, `403`, `404`.

### 3.5 `DELETE /v1/budgets/:id`

Hard delete. Simple since budgets don't have dependent rows.

**Category deleted → its budgets are deleted too** (`budgets.category_id` FK `ON DELETE CASCADE`, migration 000043; was `RESTRICT`, which made category delete fail with 500). See [`05-categories-tags.md §3.5`](05-categories-tags.md).

**Success — `200 OK`:** `{ "message": "Budget deleted" }`.

### 3.6 `POST /v1/budgets/:id/archive`, `POST /v1/budgets/:id/restore`

Archive sets `status='archived'`. Archived budgets are hidden from `GET /v1/budgets` by default (query with `status=archived` to see them).

Restore reverses. Archive and restore are idempotent.

### 3.7 `GET /v1/budgets/overview`

Summary across all of the caller's active budgets for a period.

**Query parameters:**

| Name | Description |
|---|---|
| `period` | `weekly` / `monthly` (default) / `yearly` |
| `scope` | `user` (default) / `project` / `all` |
| `project_id` | Filter to specific project (required if scope=project) |

**Response — `200 OK`:**

```json
{
  "period": "monthly",
  "period_start": "2026-04-01",
  "period_end": "2026-04-30",
  "scope": "user",
  "project_id": null,
  "total_budget": 25000.00,
  "total_spent": 14500.00,
  "total_remaining": 10500.00,
  "overall_utilization_pct": 58,
  "budgets_over_limit": 1,
  "budgets": [
    {
      "id": "0190e5...",
      "category_name": "Food",
      "amount": 5000.00,
      "spent": 5200.00,
      "over_limit": true,
      "utilization_pct": 104
    }
  ]
}
```

---

## 4. Design decisions

### 4.1 Advisory only, no hard blocking

Budgets warn; they don't block transactions. User's money, user's call. Phase 2 adds push notifications ("80% used", "over budget"); the app never rejects an otherwise-valid transaction because of a budget.

### 4.2 Two scopes: user and project

User-scope budgets enforce personal spending limits regardless of context. Project-scope budgets enforce limits within a specific project. Both can exist for the same category.

- User: "I want to spend max ฿5,000/mo on Food overall"
- Project: "my Food spending in the Japan trip: max ฿10,000/mo"

**Project scope is a personal lens.** `spent` is computed from the
*viewer's own* personal transactions tagged with the project
(`t.user_id = :user_id` in the §2.2 query) — each member tracks their own
spending inside the project, so two members legitimately see different
progress. The *group* total is a different feature:
`projects.planned_amount` ([`10-projects.md §4.23`](10-projects.md),
planned), computed from the shared board and identical for everyone.

Project-scope budgets naturally inherit project visibility — all project members see them. Only the project owner can create/edit/delete them.

### 4.3 Compute at read, not store snapshots

Period usage is recomputed on every query. Simpler schema; always accurate. Trade-off: repeated aggregations for hot paths.

Phase 3+ can add materialized snapshots or query-result caching if scale demands.

### 4.4 Hierarchy rollup via recursive CTE

A parent-category budget includes all descendants' spending. Matches user expectations: "Food" budget covers "Food > Restaurants > Thai."

Performance: for 3 levels with typical tree sizes, the recursive query is fast. Index on `categories.parent_id` supports the CTE.

Child budgets coexist with parent budgets — both can be active. User can set a "Food" limit of ฿5,000 AND "Restaurants" limit of ฿2,000 inside it.

### 4.5 One budget per (user, category, period, project-scope)

Unique constraint. Prevents accidental duplicate budgets. If the user wants both a user-scope and a project-scope Food monthly budget, those are distinct `(project_id)` values and allowed.

### 4.6 Fresh rollover, no YNAB envelopes

Each period starts at 0 spent. Unspent amount doesn't carry. Matches most consumer finance apps (Mint, Monarch, Copilot).

YNAB-style rollover deferred to Phase 3+ if demand materializes.

### 4.7 Multi-currency

`budgets.currency` column exists from Phase 1 but actively matters in Phase 2. In Phase 1 (THB-only), budget currency = user's currency = transaction currency. No conversion needed.

Phase 2: if a transaction's account is in USD but the budget is in THB, the aggregation converts transactions to budget's currency at transaction-date rates.

### 4.8 Status enum, not boolean

Consistent with users / accounts / categories / contacts — `status` enum (`active` / `archived`). Future states (`paused`, etc.) added as values without migration.

### 4.9 Category `type` restricted to expense

Budgets only track spending. Income categories can't have budgets (doesn't semantically map — "I want to earn max ฿50k/mo"? No). Income tracking lives in saving goals and reports.

System categories (Opening Balance, Adjustment, Transfer IN/OUT) also excluded — they aren't real spending.

### 4.10 Period boundaries use user's timezone

A "monthly" budget for a user in Bangkok ends at 2026-04-30 23:59:59+07, which is 2026-04-30 16:59:59 UTC. The rollover job (Phase 3+) checks per-user tz-relative midnight.

For now, backend computes period boundaries dynamically at read time using `user.preferences.timezone`.

### 4.11 Project-scope budget permissions

Only the project owner can create, edit, or delete project-scope budgets. Contributors and viewers can see them but not modify. Matches project's broader permission model.

### 4.12 Historical period data is derivable

"How did I do on Food in January?" → query the budget + sum transactions in January in Food and descendants. No stored snapshot. Always accurate, always current.

Caveat: if the budget was edited mid-period (amount changed from ฿5,000 to ฿6,000), the historical view uses the **current** amount, not the amount-at-the-time. Phase 3+ could add versioning if needed.

---

## 5. Open questions

- **Project-scope permissions vs personal-lens semantics.** §4.11 says only the project *owner* creates project-scope budgets, but `spent` is per-viewer (§4.2) — a member can't set their own tracking budget for the trip. If the personal-lens reading is the intent, any member should be able to create budgets scoped to projects they belong to. Revisit when project budget UI ships.
- **Budget editing history.** Keep a log of budget-amount changes? Phase 3+.
- **Budget alerts.** Phase 2 notifications for 80% / 100% / 120% thresholds. Configurable per budget?
- **Projected end-of-period.** Phase 2 UX: "On pace to spend ฿6,200 by end of April." Based on daily burn rate.
- **Shared budgets outside projects.** Phase 2+ if couples want to share a Food budget without a project container.
- **Auto-archive on project archive.** When a project is archived, should its project-scope budgets also archive? Probably yes — reduces clutter. Phase 2 polish.
- **Copy budgets.** Phase 2+ "duplicate my user-scope budgets for next year" quick action.

---

## 6. Status

- **Phase** — Phase 1c shipped (BE migration 000035 + Flutter `/budgets` routes). User-scope budgets live; project-scope still wired via project detail page (Phase 1c plan).
- **Last updated** — 2026-09-11; 0.4.0-2 notes 2026-10-20 (AND scope §0.1, sources `upcoming` / `future_tx` + row fields §0.2, app pages §0.7)
- **Version** — 0.2 (project scope documented as the personal lens vs `projects.planned_amount` group total; fixed "฿10,000 total" examples that contradicted the period enum; added permissions-vs-lens open question)
- **Version** — 0.1 (initial draft; user + project scopes, 3-level hierarchy rollup, advisory-only, fresh rollover)

## 0.4.0 detail numbers

`GET /budgets/:id` `forecast` also carries `available` (limit − used), `projected_end` (= `forecast_end`), `days_left` (today included) and `pace_pct` (elapsed / total days, the pace tick); the last three are null for an open-ended or non-current period. Every item row has `reason`: why it counts here (first match of `all` / `category` / `sub_category` / `tag` / `wallet`). The app no longer shows it (0.4.0-2, §0.7). The periods list (`GET /budgets/:id/periods`, one row per period with used / amount) and the per-period override (`PUT /budgets/:id/periods/:period_id`, `amount` null = back to the base amount) already exist; the override is a PUT with partial semantics, not a PATCH.
