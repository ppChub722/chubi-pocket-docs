# 08 — Budgets

Per-category spending limits with a recurrence period. Advisory (not blocking) — the app warns you when you exceed, but never rejects a transaction.

Supports two scopes in Phase 1c:

- **User scope** — "I spend max ฿5,000/mo on Food overall"
- **Project scope** — "Japan trip Food budget: ฿10,000 total" (inherits project visibility)

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

**Editable:** `amount`, `period`, `currency`, `status`.
**Not editable:** `category_id`, `scope`, `project_id` (delete + recreate if wrong).

Changing `period` mid-cycle: the current period is recomputed against the new period boundaries immediately.

**Errors:** `400 VALIDATION_ERROR`, `400 DUPLICATE_BUDGET`, `401`, `403`, `404`.

### 3.5 `DELETE /v1/budgets/:id`

Hard delete. Simple since budgets don't have dependent rows.

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
- Project: "On this Japan trip, cap Food spend at ฿10,000 total"

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

- **Budget editing history.** Keep a log of budget-amount changes? Phase 3+.
- **Budget alerts.** Phase 2 notifications for 80% / 100% / 120% thresholds. Configurable per budget?
- **Projected end-of-period.** Phase 2 UX: "On pace to spend ฿6,200 by end of April." Based on daily burn rate.
- **Shared budgets outside projects.** Phase 2+ if couples want to share a Food budget without a project container.
- **Auto-archive on project archive.** When a project is archived, should its project-scope budgets also archive? Probably yes — reduces clutter. Phase 2 polish.
- **Copy budgets.** Phase 2+ "duplicate my user-scope budgets for next year" quick action.

---

## 6. Status

- **Phase** — Phase 1c shipped (BE migration 000035 + Flutter `/budgets` routes). User-scope budgets live; project-scope still wired via project detail page (Phase 1c plan).
- **Last updated** — 2026-05-07
- **Version** — 0.1 (initial draft; user + project scopes, 3-level hierarchy rollup, advisory-only, fresh rollover)
