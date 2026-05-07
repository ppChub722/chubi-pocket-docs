# 09 — Saving Goals

Target-based savings tracked by linking to a real account. Progress derives from the linked account's balance × the goal's allocation percentage. Multiple goals can share one account via percentage allocation.

No `saving_goal_id` tag on transactions. No stored progress. Goal progress is always computed from the account balance + allocation.

This module owns `saving_goals`. References `accounts` (required link source). No changes to `transactions` schema.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 1c | Phase 2 | Phase 3 |
|---|---|---|---|
| Solo saving goals linked to an account | ✅ | ✅ | ✅ |
| Multiple goals per account via % allocation | ✅ | ✅ | ✅ |
| Progress computed from balance × allocation | ✅ | ✅ | ✅ |
| Deadline + required-monthly calc | ✅ (frontend-computed) | ✅ | ✅ |
| Auto-completion (progress ≥ target) | ✅ | ✅ | ✅ |
| Notifications on target reached | — | ✅ | ✅ |
| Forecasting ("on pace to reach by X") | — | ✅ | ✅ |
| Virtual sub-accounts / envelopes | — | — | optional |
| Shared saving goals with members | — | — | optional (or use a project) |
| Standalone goals (no account link) | — | — | optional |

---

## 1. Schema

Tables owned by this module: `saving_goals`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#09--saving-goals`](../database/schema.md#09--saving-goals).

**API-layer allocation sum constraint:** for any `linked_account_id`, the sum of `allocation_pct` across `status='active'` goals must be ≤ 100. Complex CHECK at DB level is avoided; enforced on create / update / restore.

**No stored progress.** `current_amount` computed from `linked_account.balance × allocation_pct / 100`; `is_completed` from `current_amount >= target_amount`; `currency` inherits from `linked_account.currency`.

---

## 2. Computed fields

On every read:

| Field | Formula |
|---|---|
| `current_amount` | `linked_account.balance × allocation_pct / 100` |
| `currency` | `linked_account.currency` |
| `progress_pct` | `(current_amount / target_amount) × 100` |
| `is_completed` | `current_amount >= target_amount` |
| `remaining_amount` | `max(0, target_amount - current_amount)` |
| `days_remaining` | `deadline - today` (if deadline set) |
| `months_remaining` | `(days_remaining / 30.44)` approximation |
| `required_monthly` | `remaining_amount / max(1, months_remaining)` — frontend-computed for display |

Completion is **not sticky** — if balance drops below target, `is_completed` returns false. Matches reality: funds used = goal not achieved right now.

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `POST /v1/saving-goals`

Create a goal.

**Request body:**

```json
{
  "name": "Emergency Fund",
  "target_amount": 100000.00,
  "linked_account_id": "0190e5-savings",
  "allocation_pct": 40.00,
  "deadline": "2026-12-31",
  "icon": "shield",
  "color": "#4CAF50"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | 1–100 chars |
| `target_amount` | number | ✅ | > 0 |
| `linked_account_id` | string | ✅ | Must belong to caller |
| `allocation_pct` | number | — | 0 < pct ≤ 100; defaults to remaining capacity on the linked account (`100 - sum(active goals' allocation_pct)`). Existing goals' allocations are never silently mutated. |
| `deadline` | date | — | Future date |
| `icon`, `color`, `note` | | — | |

**Default allocation suggestion (server-side):**

If user omits `allocation_pct`, backend computes a default:

1. Find the remaining allocation capacity on `linked_account_id`: `100 - sum(active goals' allocation_pct)`
2. New goal's `allocation_pct` = that remaining capacity (clamped to (0, 100])
3. Existing goals' `allocation_pct` values are NEVER silently changed — the new goal fills only what is unallocated

If remaining capacity is 0 (account fully allocated), creation is rejected with `400 ALLOCATION_EXCEEDED` and the user must explicitly lower another goal's allocation first.

Default is just a starting point; user can override on create. If an explicit value exceeds capacity → `400 ALLOCATION_EXCEEDED`.

**Success — `201 Created`:** the goal with computed fields.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid target, allocation, etc. |
| 400 | `ALLOCATION_EXCEEDED` | Sum of allocations on account would exceed 100% |
| 400 | `ACCOUNT_NOT_OWNED` | Linked account doesn't belong to caller |
| 401 | `UNAUTHORIZED` | |
| 404 | `ACCOUNT_NOT_FOUND` | |

### 3.2 `GET /v1/saving-goals`

List goals with computed progress.

**Query parameters:**

| Name | Description |
|---|---|
| `status` | `active` (default) / `archived` / `all` |
| `account_id` | Filter to a specific account |
| `is_completed` | `true` / `false` |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "0190e5...",
      "name": "Emergency Fund",
      "target_amount": 100000.00,
      "currency": "THB",
      "linked_account": {
        "id": "0190e5-savings",
        "name": "KBank Savings",
        "balance": 120000.00
      },
      "allocation_pct": 40.00,
      "current_amount": 48000.00,
      "progress_pct": 48.00,
      "is_completed": false,
      "remaining_amount": 52000.00,
      "deadline": "2026-12-31",
      "days_remaining": 250,
      "required_monthly": 6333.33,
      "icon": "shield",
      "color": "#4CAF50",
      "status": "active",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 3.3 `GET /v1/saving-goals/:id`

Single goal with computed fields.

### 3.4 `PUT /v1/saving-goals/:id`

Update goal fields. Partial.

**Editable:** `name`, `target_amount`, `allocation_pct`, `deadline`, `icon`, `color`, `note`, `status`.
**Not editable:** `linked_account_id` (delete + recreate if wrong).

**Allocation changes:** if new `allocation_pct` would push the account's total sum over 100%, returns `400 ALLOCATION_EXCEEDED`. User must first lower another goal's allocation.

**Target changes:** raising the target may flip `is_completed` to false on next read (no explicit action — it's computed).

**Errors:** `400 VALIDATION_ERROR`, `400 ALLOCATION_EXCEEDED`, `401`, `403`, `404`.

### 3.5 `DELETE /v1/saving-goals/:id`

Hard delete. Always permitted (no cascading references — account + transactions untouched).

**Success — `200 OK`:** `{ "message": "Saving goal deleted" }`.

### 3.6 `POST /v1/saving-goals/:id/archive`, `POST /v1/saving-goals/:id/restore`

Archive sets `status='archived'`. Frees allocation_pct capacity on the linked account (other goals can now use it).

Restore:
- Checks current allocation sum on account + this goal's stored `allocation_pct`
- If total would exceed 100% → `400 ALLOCATION_EXCEEDED`, user must first lower this goal's allocation or adjust others
- Else restores with `status='active'`

### 3.7 `GET /v1/accounts/:id/saving-allocations`

Helper endpoint: view all goals' allocations on an account at once.

**Response — `200 OK`:**

```json
{
  "account_id": "0190e5-savings",
  "account_balance": 120000.00,
  "currency": "THB",
  "active_goals": [
    { "id": "0190e5-g1", "name": "Emergency", "allocation_pct": 40.00, "current_amount": 48000.00 },
    { "id": "0190e5-g2", "name": "House", "allocation_pct": 50.00, "current_amount": 60000.00 }
  ],
  "allocated_pct": 90.00,
  "unallocated_pct": 10.00,
  "unallocated_amount": 12000.00
}
```

Used in UI to show the allocation "pie" for an account.

---

## 4. Design decisions

### 4.1 Linked account required

A saving goal always lives in a real account. The account holds the money; the goal is a target overlay.

Rejected alternatives:
- **Standalone goals with manual progress** — user manually ticks up progress without a real account. Weak model; easy to drift from reality. Phase 2+ if asked.
- **Goals as virtual accounts** — goals ARE accounts. Overlaps with real accounts in confusing ways.

### 4.2 Allocation percentage — multi-goal per account

Multiple goals can share an account via percentage allocation. Default on create: **fill the remaining capacity** on the account into the new goal. Existing goals are never silently mutated — if the user wants equal shares, they explicitly lower the existing goals first or override `allocation_pct` on each goal individually. Rationale: silent mutation of existing rows on what looks like an unrelated POST is surprising and easy to miss in a list view.

Progress per goal = `account.balance × allocation_pct / 100`. Deposits distribute proportionally; withdrawals deduct proportionally.

Sum of active goals' allocations on an account ≤ 100%. The remainder is "unallocated" — money in the account not assigned to any goal.

### 4.3 Completion is computed, not sticky

`is_completed` is recomputed on every read from `current_amount >= target_amount`. If the user withdraws for a real emergency and balance drops, `is_completed` flips back to false.

Rationale: matches reality. If you used the fund, you're not currently "done saving" — you have work to do to restore it. Non-sticky completion respects that.

### 4.4 Progress has no tagging mechanism

Earlier designs considered `transactions.saving_goal_id` to allow per-transaction allocation. Dropped in favor of:

- Progress = account balance × allocation_pct
- Deposits and withdrawals affect progress automatically (via balance changes)
- User doesn't have to tag transactions

Trade-off: can't earmark specific transactions as "this went to the goal" — all money flows through the account proportionally. Acceptable for Phase 1c.

### 4.5 No per-goal currency column

Currency is inherited from the linked account. Changing the account's currency would be a big operation anyway (see [`03-accounts.md §3.8`](03-accounts.md)). For cross-currency saving, use accounts in different currencies.

### 4.6 Deadline math is frontend

`required_monthly = (target_amount - current_amount) / months_until_deadline` is a simple computation the client can do. Optional backend convenience in responses; not stored.

Phase 2+ adds richer projections (trend-based forecasting, "you'll reach by X" based on historical contribution rate) — those land as backend endpoints when the math gets complex.

### 4.7 Hard delete, no cascades

Deleting a goal removes only the goal row. The linked account stays; its balance unchanged. Transactions in that account stay; they aren't tagged to the goal anyway.

No soft-delete needed (unlike categories / accounts / contacts) because goals have no dependent references that would break on delete.

### 4.8 Allocation sum constraint enforced at API

DB-level constraint for "sum per account ≤ 100" would require a trigger. API-layer check is simpler and has the same effect:

- `POST /v1/saving-goals` — check sum + new.allocation_pct ≤ 100
- `PUT /v1/saving-goals/:id` (allocation change) — check sum_excluding_this + new value ≤ 100
- `POST /v1/saving-goals/:id/restore` — check sum_excluding_this + stored allocation_pct ≤ 100

Race conditions between concurrent creates/updates on the same account: wrapped in a DB transaction with `SELECT ... FOR UPDATE` on existing rows.

### 4.9 Archive frees capacity; restore may be blocked

Archiving a goal doesn't preserve its allocation slot — the capacity becomes available for other goals immediately. If user later restores, the capacity must still be free, or the user must adjust to make room.

Alternative (hold the slot) rejected: encourages zombie allocation percentages tying up capacity for archived goals.

### 4.10 Contribution targeting is deferred

"I want this ฿5,000 to go specifically to Emergency Fund, not split proportionally" is a reasonable request but adds complexity (envelope-style sub-accounts).

Phase 1c: all contributions distribute per current allocation. If user wants to target a specific goal, they temporarily adjust allocation to 100% for that goal, deposit, then rebalance.

Phase 2+ could add virtual sub-accounts if demand.

---

## 5. Open questions

- **Bulk allocation UI.** A slider that auto-adjusts siblings. Phase 2 UX, not a schema change.
- **Goal priority order.** If you must dip into savings, which goal's allocation gets reduced first? Phase 2+ policy flag.
- **Savings rate / contribution tracking.** "How much did I add to this goal last month?" derivable from transactions on the linked account × allocation_pct; display-only; frontend can compute.
- **Shared goals.** Couples saving together. Out of scope for Phase 1c — use a project with `type='saving'` and `budget_goal = target` as a workaround, or Phase 2+ native sharing via `saving_goal_members` table.
- **Goal completion celebration / confetti.** Phase 2 UX.
- **Historical snapshots.** "Where was my Emergency Fund in Jan 2026?" — not stored. Derivable from historical account balance × historical allocation (but allocation isn't versioned). Phase 3+ if asked.

---

## 6. Status

- **Phase** — Phase 1c shipped (BE migration 000034 + Flutter `/saving-goals` routes). `required_monthly` is FE-computed per §2.6.
- **Last updated** — 2026-05-07
- **Version** — 0.1 (initial draft; account-linked, percentage allocation, computed progress, non-sticky completion)
