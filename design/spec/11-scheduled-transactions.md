# 11 — Scheduled Transactions

Templates that auto-generate transactions on a recurring schedule. Covers three use cases via one table:

- **Recurring** — indefinite subscription or regular income/expense (Netflix, salary, rent)
- **Installment** — finite structured plan with fixed count (BNPL, appliance financing)
- **Loan** — installment with interest rate (car loan, mortgage, friend-loan with schedule)

Same table, distinguished by `entry_type` and optional `interest_rate`.

This module owns `scheduled_transactions`. The scheduler job creates rows in `transactions` with `scheduled_transaction_id` set.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 1c | Phase 2 | Phase 3 |
|---|---|---|---|
| CRUD on recurring / installment / loan entries | ✅ | ✅ | ✅ |
| Pause / resume / cancel | ✅ | ✅ | ✅ |
| Manual "trigger now" button (dev) | ✅ | ✅ | ✅ |
| Automatic scheduler (hourly cron) | — | — | ✅ |
| Day-31-in-30-day-month last-day-of-month policy | ✅ | ✅ | ✅ |
| Installment auto-complete on payoff | ✅ | ✅ | ✅ |
| Interest rate on installments (loan support) | ✅ | ✅ | ✅ |
| Upcoming-due notifications | — | ✅ | ✅ |
| Counterparty link (`creditor_contact_id` / `_member_id`) | — | ✅ | ✅ |
| Transfer-type scheduled entries | — | ✅ | ✅ |
| Amortization schedule (principal vs. interest per payment) | — | — | optional |

---

## 1. Schema

Tables owned by this module: `scheduled_transactions`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#11--scheduled-transactions`](../database/schema.md#11--scheduled-transactions).

The installment-only fields (`total_amount`, `down_payment`, `total_installments`, `remaining_installments`, `interest_rate`) are NULL when `entry_type = 'recurring'` and required when `entry_type = 'installment'` (API-enforced).

---

## 2. Semantics & lifecycle

### 2.1 Entry types

**Recurring:**
- Indefinite repetition
- `total_installments` / `remaining_installments` NULL
- User pauses or cancels to stop
- Examples: Netflix ฿299/mo, rent ฿15,000/mo, salary +฿50,000/mo

**Installment (no interest):**
- Fixed count of payments
- `total_amount` = principal (sum of all installments + down_payment)
- Auto-completes when `remaining_installments = 0`
- Examples: BNPL appliance ฿5,000/mo × 10 = ฿50,000

**Installment (with interest = Loan):**
- Same shape as installment, but `interest_rate > 0`
- `total_amount` = principal + interest combined (lifetime total)
- `monthly_payment` is the fixed amount computed externally (by the user or their bank)
- UI can label this as "Loan" vs. "Installment" based on interest_rate presence
- Examples: Car loan ฿9,435/mo × 60 months at 5% APR, total ฿566,100

### 2.2 Scheduler behavior

**Phase 1c:** no real scheduler runs. Users hit `POST /v1/scheduled-transactions/:id/generate-now` to manually trigger generation (for dev / dogfooding).

**Phase 3:** real scheduler runs hourly. For each active row where `next_billing_date <= today in user's tz`:

1. Create a `transactions` row:
   - `user_id`, `account_id`, `type`, `amount`, `category_id` — from the scheduled entry
   - `scheduled_transaction_id` = this entry's id
   - `date` = `next_billing_date`
2. Update account balance atomically
3. Advance `next_billing_date` by `billing_cycle`
4. If `entry_type = 'installment'`: decrement `remaining_installments`
5. If `remaining_installments = 0`: set `status = 'completed'`; stop generating

All steps run in a single DB transaction.

### 2.3 Day-boundary policy

When `billing_cycle = 'monthly'` and `next_billing_date.day = 31` but the next month has fewer days, policy: **fire on the last day of that month.**

```
current_next_billing_date = 2026-04-30 (originally 2026-03-31 advanced monthly)
Scheduler fires on April 30.
Advance monthly → try May 31. May has 31 days → OK.

From April 30:
  Advance monthly → May 30 (naive) OR May 31 (day-preservation)?
```

Two policies:
- **Day-preservation** (my recommendation): keep the original intended day. If it was originally 31, try to use 31 each month; if month doesn't have 31, use last day. May→31, June→30, July→31.
- **Naive month increment**: April 30 → May 30 → June 30 → etc., forgetting the original was 31

**Day-preservation is standard.** Store `original_day` somewhere (or just remember via `DATE_PART('day', original_next_billing_date)` — tricky). Practical solution: store `day_of_month` as an additional field, or derive from creation date.

**Phase 1c implementation:** use `day_of_month = EXTRACT(day from creation_date)` stored at create time. Scheduler advances using `min(day_of_month, days_in_target_month)`.

Same logic for `day_of_week` (weekly), `month_of_year` + `day` (yearly).

### 2.4 Pause / resume / cancel

**Pause:**
- `status = 'paused'`
- Scheduler skips pausing entries
- `next_billing_date` unchanged (doesn't advance while paused)
- User resumes → scheduler picks up from the stored date (may fire immediately if date is in the past)

**Resume:**
- `status = 'active'`
- If `next_billing_date < today`: entry is "behind" — user's choice to backfill or skip to current period (Phase 2+ option). Phase 1c just picks up from current `next_billing_date`.

**Cancel:**
- `status = 'cancelled'` — final state
- Cannot resume; must create a new entry if needed

**Complete (auto):**
- Installment hits `remaining_installments = 0`
- `status = 'completed'`
- Final state; scheduler ignores

### 2.5 User edits after creation

Edits affect **future cycles only.** Past generated transactions are snapshots of the state at generation time.

Example: Netflix ฿299 → user edits to ฿349 on May 15. Future generations (June 1, July 1, ...) use ฿349. Past transactions (April 1, May 1) stay at ฿299.

Same for `category_id`, `account_id`, `billing_cycle`, etc. — only affect future.

User can also edit or delete any past generated transaction (per `transactions` rules) without affecting the schedule.

### 2.6 Counterparty for loans — deferred to Phase 2+

Phase 1c: if user has a loan from a friend (Alice lent Bob ฿10,000), Bob creates a scheduled_transaction with:
- `name = "Loan from Alice"`
- `type = 'expense'`
- `entry_type = 'installment'`
- `interest_rate = 0` (or positive if charged interest)

The creditor (Alice) isn't linked to the schedule in any structured way — just in the name.

Phase 2+ adds `creditor_contact_id` / `creditor_member_id` on scheduled_transactions for loans. Allows:
- Bob's loan payments auto-update Alice's side (via split settlement logic)
- Both sides see the loan in reports

### 2.7 Transfer-type scheduled transactions — deferred

Phase 1c doesn't support scheduled transfers ("Every month transfer ฿5,000 from checking to savings"). Would require two account IDs on the schedule row. Complicates the schema.

User workaround Phase 1c: manually transfer each month.

Phase 2+ adds support with `entry_type = 'recurring'` + `type = 'transfer'` + `destination_account_id`.

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `POST /v1/scheduled-transactions`

Create a scheduled entry.

**Request body (recurring):**

```json
{
  "name": "Netflix",
  "type": "expense",
  "entry_type": "recurring",
  "amount": 299.00,
  "account_id": "0190e5-credit",
  "category_id": "0190e5-subscriptions",
  "billing_cycle": "monthly",
  "next_billing_date": "2026-05-01"
}
```

**Request body (installment without interest):**

```json
{
  "name": "LG Refrigerator",
  "type": "expense",
  "entry_type": "installment",
  "amount": 5000.00,
  "account_id": "0190e5-credit",
  "category_id": "0190e5-appliances",
  "billing_cycle": "monthly",
  "next_billing_date": "2026-05-15",
  "total_amount": 50000.00,
  "down_payment": 0,
  "total_installments": 10,
  "remaining_installments": 10
}
```

**Request body (loan — installment with interest):**

```json
{
  "name": "Car loan (SCB)",
  "type": "expense",
  "entry_type": "installment",
  "amount": 9435.62,
  "account_id": "0190e5-checking",
  "category_id": "0190e5-loans",
  "billing_cycle": "monthly",
  "next_billing_date": "2026-05-01",
  "total_amount": 566137.00,
  "down_payment": 100000,
  "total_installments": 60,
  "remaining_installments": 60,
  "interest_rate": 5.00
}
```

**Field rules:**

| Field | Required | Rules |
|---|---|---|
| `name` | ✅ | 1–100 chars |
| `type` | ✅ | `'expense'` / `'income'` |
| `entry_type` | ✅ | `'recurring'` / `'installment'` |
| `amount` | ✅ | > 0 |
| `account_id` | ✅ | Must belong to caller |
| `category_id` | — | Must match `type` (expense cat for expense type, etc.); not system category |
| `billing_cycle` | ✅ | One of the four values |
| `next_billing_date` | ✅ | Today or future |
| `total_amount` | installment: ✅ | Required for installments |
| `down_payment` | — | Optional, default 0 |
| `total_installments` | installment: ✅ | > 0 |
| `remaining_installments` | installment: ✅ | ≤ `total_installments`; typically = total on create |
| `interest_rate` | — | 0 to ~99.99 |

**Success — `201 Created`:** the scheduled row.

**Errors:** `400 VALIDATION_ERROR`, `400 INSTALLMENT_FIELDS_REQUIRED` (when entry_type='installment' missing required fields), `400 RECURRING_EXTRA_FIELDS` (when entry_type='recurring' has installment-only fields), `401`, `403`, `404`.

### 3.2 `GET /v1/scheduled-transactions`

List the caller's schedules.

**Query parameters:**

| Name | Description |
|---|---|
| `status` | `active` (default) / `paused` / `cancelled` / `completed` / `all` |
| `entry_type` | `recurring` / `installment` / `all` |
| `type` | `expense` / `income` / `all` |
| `account_id` | Filter by account |

**Response:**

```json
{
  "data": [
    {
      "id": "0190e5...",
      "name": "Netflix",
      "type": "expense",
      "entry_type": "recurring",
      "amount": 299.00,
      "account": { "id": "...", "name": "Credit Card" },
      "category": { "id": "...", "name": "Subscriptions" },
      "billing_cycle": "monthly",
      "next_billing_date": "2026-05-01",
      "status": "active",
      "note": null,
      "interest_rate": null,
      "total_installments": null,
      "remaining_installments": null,
      "total_amount": null,
      "down_payment": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### 3.3 `GET /v1/scheduled-transactions/upcoming`

Due in the next N days.

**Query parameters:**

| Name | Description |
|---|---|
| `days` | Default 7; max 90 |

**Response:**

```json
{
  "data": [
    { "id": "...", "name": "Netflix", "next_billing_date": "2026-05-01", "amount": 299.00, "days_until": 6 },
    { "id": "...", "name": "Rent", "next_billing_date": "2026-05-01", "amount": 15000.00, "days_until": 6 }
  ],
  "total_expense_due": 15299.00,
  "total_income_due": 0.00
}
```

### 3.4 `GET /v1/scheduled-transactions/:id`

Single entry with detailed fields + generated-transactions history.

### 3.5 `PUT /v1/scheduled-transactions/:id`

Update editable fields. Partial.

**Editable:** `name`, `amount`, `account_id`, `category_id`, `billing_cycle`, `next_billing_date`, `note`, `interest_rate`, `total_amount`, `down_payment`, `total_installments`, `remaining_installments`.
**Not editable:** `type`, `entry_type`, `user_id`, `status` (use pause / resume / cancel endpoints), `created_at`.

Effects:
- `amount` change → future generated transactions use new amount; past untouched
- `billing_cycle` change → `next_billing_date` is recomputed from today using new cycle? Or kept? Policy: **kept** — user explicitly sets `next_billing_date` if they want to shift
- `remaining_installments` change → backend recomputes completion state if hits 0
- `total_installments` lowered below `remaining_installments` → `400 VALIDATION_ERROR`

### 3.6 `DELETE /v1/scheduled-transactions/:id`

Hard delete. Generated transactions stay (they're in `transactions` table; not cascaded).

Consider: deleting loses the schedule's history context for those generated rows. Phase 3 could archive instead. Phase 1c: hard delete.

### 3.7 Pause / resume / cancel

- `POST /v1/scheduled-transactions/:id/pause` — set `status='paused'`
- `POST /v1/scheduled-transactions/:id/resume` — set `status='active'` (must be currently paused)
- `POST /v1/scheduled-transactions/:id/cancel` — set `status='cancelled'` (terminal)

Validation: transitions only allowed from specific states:

```
active → paused, cancelled
paused → active, cancelled
completed → (none; terminal)
cancelled → (none; terminal)
```

**Errors:** `400 INVALID_TRANSITION`, `401`, `403`, `404`.

### 3.8 `POST /v1/scheduled-transactions/:id/generate-now`

Manually trigger generation. Used for Phase 1c dev / dogfooding (no real scheduler yet) and Phase 2+ as a power-user "force generate" action.

**Backend:** runs the scheduler logic for this one entry, regardless of whether `next_billing_date` is today. Creates one transaction, advances `next_billing_date`, decrements `remaining_installments` if applicable.

**Success — `200 OK`:**

```json
{
  "generated_transaction": { "id": "0190e5-tx", "amount": 299.00, "date": "2026-04-25" },
  "schedule_updated": {
    "next_billing_date": "2026-05-25",
    "remaining_installments": null,
    "status": "active"
  }
}
```

### 3.9 `GET /v1/scheduled-transactions/:id/history`

List transactions previously generated by this schedule.

**Response:**

```json
{
  "data": [
    { "id": "0190e5-tx3", "amount": 299.00, "date": "2026-04-01", "generated_at": "2026-04-01T01:00:00Z" },
    { "id": "0190e5-tx2", "amount": 299.00, "date": "2026-03-01", "generated_at": "2026-03-01T01:00:00Z" }
  ],
  "total_generated": 3,
  "total_amount_generated": 897.00
}
```

Derived from `transactions WHERE scheduled_transaction_id = :id ORDER BY date DESC`.

---

## 4. Design decisions

### 4.1 One table, three use cases

Unified `scheduled_transactions` for recurring + installment + loan. Discriminated by `entry_type` and `interest_rate`. Rejected alternatives:

- **Separate `recurrings` / `installments` / `loans` tables** — triples the schema surface for minor type differences
- **Unify further under one "obligations" table with personal_debts** — different lifecycles (automated scheduler vs. manual tracking)

Keeping three related but distinct concepts in one table works because they share the scheduler infrastructure.

### 4.2 Loans are installments with interest

Instead of a separate `'loan'` entry_type, loans are `entry_type='installment'` with `interest_rate > 0`. UI labels them "Loan" based on that flag. Schema stays minimal.

`total_amount` is **principal + interest combined** (the lifetime total paid). No per-payment principal/interest breakdown — that requires amortization math, deferred to Phase 3+ if needed.

### 4.3 Template semantics — edits affect future only

A scheduled entry is a template for future generations. Editing it updates the template; past generated transactions are snapshots of the state-at-generation-time and stay unchanged.

This means: user changes Netflix from ฿299 to ฿349 — past transactions preserved, future uses new amount. Users who want to retroactively fix old transactions edit those specific transactions directly.

### 4.4 Day-of-month policy — last-day fallback

For monthly schedules, if the original day (e.g., 31) doesn't exist in a given month, fire on the last day of that month. Preserves intent ("end of month payment") better than a naive +30 / +31 day advance.

Same for Feb 29 in non-leap years (use Feb 28).

Implementation: store `day_of_month` (or derive from the original creation/billing date) and clamp to `min(day_of_month, days_in_target_month)` on advance.

### 4.5 Phase 1c = manual trigger, Phase 3 = real scheduler

Phase 1c: `POST /v1/scheduled-transactions/:id/generate-now` lets user force-generate. No cron. Acceptable for dogfooding.

Phase 3: real hourly cron runs the scheduler. Per-user tz-aware. Missed cycles (VPS down): catch-up logic runs for each overdue entry.

### 4.6 Status transitions are explicit

User can't just `PUT status` freely — must use dedicated pause/resume/cancel endpoints. Prevents invalid transitions (e.g., resuming a cancelled entry). Auto-transitions (`completed` on installment payoff) bypass user action.

### 4.7 Generated transactions are fully editable/deletable

Users edit or delete a generated transaction any time. The scheduled entry doesn't care — it generates next cycle normally. This preserves flexibility (user can correct errors in a specific month's Netflix charge without affecting the subscription schedule).

### 4.8 No counterparty field in Phase 1c

Phase 1c loans don't link to a creditor contact or project member. User encodes in the `name` field ("Loan from Alice"). Phase 2+ adds `creditor_contact_id` / `creditor_member_id` for proper linkage.

### 4.9 No transfer-type in Phase 1c

Scheduled transfers ("monthly auto-save ฿5,000 to savings") require two accounts. Schema complication deferred. Workaround: user manually transfers monthly. Phase 2+ adds.

### 4.10 `remaining_installments` on the schedule vs. computing from history

Stored column, not computed from `COUNT(generated transactions)`. Faster reads. Risk of drift if scheduler errors: mitigated by idempotent scheduler (use database transactions with unique constraints to prevent double-generation).

Reconciliation logic (Phase 3): job verifies `total - remaining = count(generated transactions)`; alerts on mismatch.

### 4.11 Income-type scheduled entries

Supported. `type='income'` entry generates income transactions on schedule. Use case: salary, rental income, dividends.

### 4.12 Category validation on create

`category_id` must match `type`:
- `type='expense'` → expense-type category
- `type='income'` → income-type category
- System categories (Opening Balance / Adjustment / Transfer IN / OUT) not allowed

Same rules as [`04-transactions.md §2.3`](04-transactions.md).

### 4.13 Backfill on resume

If user pauses in March and resumes in June, `next_billing_date` might still be March 15. On resume: scheduler will fire immediately (or on next hourly check), generating one transaction dated March 15, then advance to April 15, generate another, and so on until caught up. Phase 1c behavior.

Phase 2+ UX: "3 missed cycles — backfill or skip to current?" prompt.

### 4.14 Down payment is recorded separately

For installments with `down_payment > 0`, the down payment is NOT auto-generated by the scheduler. User records it as a separate one-off transaction at purchase time (or the scheduler could generate it as the "zeroth" installment on create — Phase 2+ decision).

Phase 1c: `down_payment` is metadata only; user records the initial payment manually.

---

## 5. Open questions

- **Auto-record down payment on create?** Phase 2+ could auto-create a one-time transaction representing the down payment.
- **Installment payoff early.** User pays off a loan faster than scheduled. Should the schedule auto-complete, or continue generating tiny rounding payments? Phase 2+ policy.
- **Rate changes on variable-rate loans.** Interest rates change on some mortgages. Currently `interest_rate` is a single value. Phase 3+ if this becomes a real use case.
- **Backfill policy on resume.** Phase 2 UX — "backfill missed cycles" vs "skip to current."
- **Reconciliation job.** Phase 3 scheduler drift check.
- **Bulk edit / clone schedules.** "Duplicate this recurring for next year" — Phase 2+ convenience.
- **Notification triggers.** Phase 2 — "Netflix due in 3 days," "Car loan has 6 payments left."
- **Amortization schedule display.** Phase 3+ shows principal vs. interest per payment — would require separate table or computed view.
- **Holidays / skipped-day handling.** If `next_billing_date` falls on a holiday, fire anyway? (Calendar dates don't care about holidays; schedules are calendar-date based.) Phase 3+ policy if banking behavior matters.

---

## 6. Status

- **Phase** — spec; Phase 1c implementation pending
- **Last updated** — 2026-04-25
- **Version** — 0.1 (initial draft; one table for recurring/installment/loan; template-with-future-only edits; Phase 1c manual trigger; day-of-month clamping)
