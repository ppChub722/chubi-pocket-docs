# 06 — Shared Expenses (Splits)

Split-bill mechanics. When a transaction is shared across multiple people, this module tracks who owes what — both for **personal-context splits** (Alice's personal expense, splits with friends) and **project-context splits** (a project_transaction with member splits).

This module owns the `shared_expense_splits` table and the resolve actions that turn a split into personal-book entries.

Personal_debts (the I-owe / owed-to-me dashboard) lives in [`12-personal-debts.md`](12-personal-debts.md). Notification triggers and delivery are in [`13-notifications.md`](13-notifications.md).

References: `transactions` and `project_transactions` (parent rows for splits via polymorphic FKs), `contacts`, `project_members`.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 1b | Phase 2 | Phase 3 |
|---|---|---|---|
| Splits on personal transactions (`person_name` / `contact_id` / `project_member_id` debtors) | ✅ | ✅ | ✅ |
| Splits on project_transactions (`project_member_id` debtors) | ✅ | ✅ | ✅ |
| Resolve actions: pay / receive / add-as-debt | ✅ | ✅ | ✅ |
| Per-caller computed settlement state | ✅ | ✅ | ✅ |
| Splits migrate to personal mirror on claim (linked actor) | ✅ | ✅ | ✅ |
| Fixed and percentage split types | ✅ | ✅ | ✅ |
| Notifications on split lifecycle events | ✅ | ✅ | ✅ |
| Bulk settle (pay many splits at once) | — | ✅ | ✅ |
| Payment rounding helpers | — | ✅ | ✅ |

---

## 1. Schema

Tables owned by this module: `shared_expense_splits`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#06--shared-expenses-splits`](../database/schema.md#06--shared-expenses-splits).

Notable behavior:

- **Polymorphic parent** — `source_transaction_id` (personal) OR `source_project_transaction_id` (project), exactly one set.
- **Debtor identifier gated by parent context** (API-enforced):
  - Project-context split → `project_member_id` only
  - Personal-context split (parent has `project_id IS NULL`) → `contact_id` or `person_name` only
  - Post-claim mirror split (parent has `project_id IS NOT NULL`) → `project_member_id` only
- **No `paid_amount` / `is_settled` columns** — settlement is per-caller computed from personal `transactions.source_split_id` (see §2.3).

---

## 2. Core concepts

### 2.1 Two contexts for splits

Splits attach to two kinds of parent. The mechanics are the same; only the parent table and debtor identifier differ.

**Personal-context split** — parent is a personal `transactions` row created by the user with no project involvement (`project_id IS NULL`). Debtor identified by `contact_id` or `person_name` (never `project_member_id`). The parent's account drops at save time; splits track who owes the parent's owner.

**Project-context split** — parent is a `project_transactions` row. Debtor is a `project_member_id`. No account is touched at parent save time; the project ledger is the canonical record. After the actor claims, splits migrate to the actor's personal mirror — but the debtor identifier stays `project_member_id` (the migration only rewrites the parent FK, not the split's identity).

Both kinds use the same `shared_expense_splits` table. The polymorphic source FK is the only structural difference.

**The two contexts don't mix:** a personal transaction with `project_id IS NULL` cannot have splits targeting `project_member_id`. Splitting with project members requires creating a `project_transaction` instead. This keeps the rule "splits' debtor identifier is determined by parent context" — no ambiguity.

### 2.2 Splits migrate to personal mirror on claim

When a linked project member claims their own project_transaction onto their personal book (see [`10-projects.md`](10-projects.md)), the project_transaction's splits **migrate** to the personal mirror — same split IDs, parent FK rewritten:

```sql
UPDATE shared_expense_splits
SET source_transaction_id = <mirror_id>,
    source_project_transaction_id = NULL
WHERE source_project_transaction_id = <original_pt_id>;
```

The original project_transaction stays as a project ledger record but loses its splits. Anything referencing the splits (personal entries, personal_debts) keeps working transparently because split IDs don't change.

For non-linked actors (ad-hoc / contact members), no claim happens; splits stay on the project_transaction.

### 2.3 Settlement state is per-caller computed

There is no global "this split is settled" flag. Each caller's resolution status on a split is computed from their own personal book:

- **Settled from caller's view** if their personal `transactions` rows with `source_split_id = this.id` sum to ≥ `owed_amount`, with matching `type` for their role (`expense` if debtor, `income` if creditor)
- **Unresolved** otherwise

Two callers can disagree and both be right. Bob may have recorded his payment (his expense entry references the split) while Alice hasn't recorded receipt yet. The mismatch reflects real-world reality and is surfaced in the dashboard ("Bob says paid; you haven't confirmed").

A `personal_debts` row referencing the split (`source_split_id`) tracks the debtor's deferred obligation; its `paid_amount` is auto-bumped when a personal expense with the same `source_split_id` lands. See [`12-personal-debts.md`](12-personal-debts.md).

### 2.4 Resolve actions create personal-book entries

Three actions can be triggered on a split. Each is independent; multiple invocations are allowed (no idempotency check).

- **Pay** (caller = debtor): create a personal expense with `source_split_id` set, account chosen by caller. Multiple pays allowed (partial payments).
- **Receive** (caller = creditor): create a personal income with `source_split_id` set, account chosen by caller. Multiple receives allowed.
- **Add-as-debt** (caller = debtor): create a `personal_debts` row referencing the split. No money moves; tracking only.

No global state is mutated by any action — each call writes to the caller's own book. The caller decides what their book reflects.

### 2.5 Notifications fire at split lifecycle events

Notification triggers (full schema and delivery in [`13-notifications.md`](13-notifications.md)):

- **`split_created`** — fired to each linked debtor when a split with their identity is saved
- **`split_paid`** — fired to the creditor when a debtor's `pay` action lands
- **`split_received`** — fired to the debtor when the creditor's `receive` action lands (closure signal)
- **`split_parent_changed`** — fired to all involved when the parent transaction is edited or deleted

Notifications deep-link to the parent context — project view for project-context splits, personal flow for personal-context splits.

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 Splits — created via parent endpoint

Splits are not created standalone. They're created as part of:

- `POST /v1/transactions` (personal context) — see [`04-transactions.md`](04-transactions.md)
- `POST /v1/projects/:id/project-transactions` (project context) — see [`10-projects.md`](10-projects.md)

Editing splits is part of `PUT` on the parent (replace-all semantics). Deleting splits is part of parent edit or parent delete (cascades).

### 3.2 `GET /v1/shared-expenses/splits`

List splits relevant to the caller — every split they're involved in (as creditor or debtor), across personal and project contexts.

**Query parameters:**

| Name | Description |
|---|---|
| `direction` | `owed_to_me` / `i_owe` / `all` (default `all`) |
| `resolved` | `true` / `false` / `all` (default `false` — show open) |
| `project_id` | Filter to a specific project |
| `from`, `to` | Date range of parent transaction |
| `page`, `per_page` | Standard pagination |

**Response:**

```json
{
  "data": [
    {
      "id": "0190e5-split1",
      "parent": {
        "kind": "project_transaction",
        "id": "0190e5-pt1",
        "project_id": "0190e5-japan",
        "date": "2026-04-25",
        "note": "Hotel night 1"
      },
      "creditor": {
        "type": "project_member",
        "member_id": "0190e5-m-grandma",
        "display_name": "Grandma"
      },
      "debtor": {
        "type": "project_member",
        "member_id": "0190e5-m-alice",
        "display_name": "Alice"
      },
      "owed_amount": 1000.00,
      "outstanding_from_my_view": 1000.00,
      "my_resolution_status": "unresolved",
      "my_role": "debtor"
    }
  ],
  "total_outstanding_owed_to_me": 0,
  "total_outstanding_i_owe": 1000.00
}
```

`outstanding_from_my_view` = `owed_amount` − sum of caller's personal entries with `source_split_id = this.id` (matching role/type).

### 3.3 `POST /v1/shared-expenses/splits/:id/pay`

Caller (the debtor on the split) creates a personal expense.

**Request body:**

```json
{
  "account_id": "0190e5-bob-kbank",
  "amount": 1000.00,
  "date": "2026-04-26",
  "note": "PromptPay"
}
```

| Field | Required | Rules |
|---|---|---|
| `account_id` | ✅ | Must belong to caller |
| `amount` | — | Defaults to `outstanding_from_my_view`; partial allowed; multiple calls allowed |
| `date` | — | Defaults to today in caller's timezone |
| `note` | — | |

**Backend (atomic):**

1. Validate caller is the debtor (split's `contact.app_user_id = caller`, OR `project_member.user_id = caller`)
2. Insert personal `transactions` row: `type=expense`, `account_id`, `amount`, `source_split_id = split.id`, `project_id` = parent's `project_id` if any
3. `accounts.balance −= amount`
4. Auto-bump any of caller's `personal_debts.paid_amount` rows where `source_split_id = split.id`
5. Fire `split_paid` notification to creditor (if linked) — see [`13-notifications.md`](13-notifications.md)

**Success — `201 Created`:** the created personal transaction.

**Errors:** `400 NOT_DEBTOR`, `400 OVERPAYMENT_PROTECTION` (optional Phase 2+ guard), `401`, `403`, `404`.

### 3.4 `POST /v1/shared-expenses/splits/:id/receive`

Caller (the creditor — owner of the parent personal transaction, or actor of the parent project_transaction) creates a personal income recording money received.

**Request body:**

```json
{
  "account_id": "0190e5-alice-kbank",
  "amount": 1000.00,
  "date": "2026-04-26",
  "note": "Cash from Bob"
}
```

| Field | Required | Rules |
|---|---|---|
| `account_id` | ✅ | Must belong to caller |
| `amount` | — | Defaults to `outstanding_from_my_view`; partial allowed; multiple calls allowed |
| `date` | — | Defaults to today |
| `note` | — | |

**Backend (atomic):**

1. Validate caller is the creditor
2. Insert personal `transactions` row: `type=income`, `account_id`, `amount`, `source_split_id = split.id`, `project_id` = parent's if any
3. `accounts.balance += amount`
4. Fire `split_received` notification to the debtor (if linked) — closure signal

**Success — `201 Created`:** the created personal transaction.

**Errors:** `400 NOT_CREDITOR`, `401`, `403`, `404`.

### 3.5 `POST /v1/shared-expenses/splits/:id/add-as-debt`

Caller (the debtor) creates a `personal_debts` row tracking this obligation without paying.

**Request body:** empty (all info derived from the split).

**Backend:** see [`12-personal-debts.md`](12-personal-debts.md) for the row schema and creation logic.

**Errors:** `400 NOT_DEBTOR`, `400 ALREADY_TRACKED` (caller already has a `personal_debts` row for this split), `401`, `403`, `404`.

### 3.6 `GET /v1/shared-expenses/splits/:id`

Get full detail on a single split, including all of caller's personal entries that reference it (history of pays / receives) and any of caller's personal_debts referencing it.

**Response:**

```json
{
  "id": "...",
  "parent": { "kind": "...", "id": "...", "project_id": "..." },
  "creditor": { ... },
  "debtor": { ... },
  "owed_amount": 1000.00,
  "split_type": "fixed",
  "my_resolution_status": "unresolved",
  "my_personal_entries": [
    {
      "id": "0190e5-tx2",
      "type": "expense",
      "amount": 500.00,
      "date": "2026-04-26",
      "account_id": "..."
    }
  ],
  "my_personal_debt": {
    "id": "0190e5-debt1",
    "amount": 1000.00,
    "paid_amount": 500.00,
    "status": "open"
  }
}
```

---

## 4. Design decisions

### 4.1 No settlement confirmation table, no `mark-paid`

Earlier versions of this spec had a `split_settlements` table recording per-payment confirmations, `paid_amount` / `is_settled` columns on splits, and a `mark-paid` endpoint for creditor-only settlement. All dropped under the unified model. Reasons:

- **No two-sided handshake** — each user's resolution into their own book is independent. The creditor's confirmation isn't a separate event; it's just the creditor's personal income entry.
- **Per-caller computed state is sufficient** — both creditor and debtor's books tell the truth from their side. The dashboard joins them.
- **`mark-paid` was a hack** for ad-hoc debtor cases. Under the unified model, the creditor uses `receive` directly with whatever amount/date they recorded — same shape as any other receipt.

Trade-off: no audit log of "creditor confirmed receipt of payment X." But that audit is recoverable from the personal `transactions` rows themselves (filter by `source_split_id`, sum by date).

### 4.2 Polymorphic source on splits

Two nullable FKs (`source_transaction_id`, `source_project_transaction_id`) with a CHECK that exactly one is set. Avoids a table-per-context split or a single-column polymorphic association with a `source_type` discriminator (which can't be enforced with a real FK).

### 4.3 Splits migrate (not duplicate) on claim

When a linked actor claims their own project_transaction, splits' `source_project_transaction_id` is rewritten to `source_transaction_id`. Same split IDs, no duplication.

Non-destructive: any `transactions.source_split_id` and `personal_debts.source_split_id` references continue to work. They just transparently now point at splits on a personal transaction instead of a project_transaction.

UX rationale: when Bob looks at his ฿3,000 personal expense in his own book, he should see the splits inline — without having to navigate to the project to discover what was split with whom. Migration puts the splits on the right parent for that view.

### 4.4 Per-caller computed settlement state

`paid_amount` and `is_settled` columns are dropped because they imply a single source of truth that doesn't exist under the two-books philosophy. Each caller's status comes from their own personal book entries with `source_split_id`.

Cost: queries for "is this split settled from my view" require a sum-over-personal-tx subquery. Phase 2+ may add a materialized view if this becomes hot.

### 4.5 Three-way debtor identification — gated by parent context

`person_name` / `contact_id` / `project_member_id` — exactly one set per row. But the choice isn't free; it's determined by the parent ledger:

- **Personal-context splits** (parent is `transactions`, `project_id IS NULL`) use `contact_id` or `person_name` only. `project_member_id` is rejected because the parent isn't in any project.
- **Project-context splits** (parent is `project_transactions`, OR a personal mirror with `source_project_transaction_id` set) use `project_member_id` only. Project membership is the identity space.

Why gate it: allowing personal-context splits to target project members would imply a personal transaction is "in" a project — which contradicts the unified rule that project-context spending lives in `project_transactions`. The user's path to "split a personal transaction with project members" is to create a project_transaction instead.

The CHECK in §1.1 enforces single identity; the API layer enforces parent-vs-debtor compatibility.

### 4.6 No edit-after-resolve protection on splits

Splits have no separate edit guard. Editing `owed_amount` doesn't touch personal_debts that reference the split (they keep their own `amount`); personal entries with `source_split_id` are unaffected by definition (their amount stays as recorded). The parent transaction's edit rules apply (see [`04-transactions.md`](04-transactions.md) and [`10-projects.md`](10-projects.md)).

### 4.7 Multiple resolves allowed; no idempotency

A caller can tap pay/receive/add-as-debt repeatedly. Each creates an additional row. This matches the user's mental model — their book is their book; if they want three partial-payment entries against one split, that's their choice. The dashboard sums to compute settlement state; no "duplicate" detection.

### 4.8 Resolve endpoints live on the splits router (not project router)

Endpoints `POST /v1/shared-expenses/splits/:id/{pay,receive,add-as-debt}` work uniformly for any split, regardless of parent context. Earlier drafts had `POST /v1/projects/:id/resolve/pay` and similar — dropped in favor of the universal split-rooted endpoints.

The project router still exposes `POST /v1/projects/:id/resolve-all` as a batch convenience (see [`10-projects.md`](10-projects.md) §3.7).

---

## 5. Open questions

- **Rounding helpers** — Splitting ฿1000 three ways = ฿333.33, ฿333.33, ฿333.34. Phase 2+ UI auto-adjusts one share by a cent.
- **Bulk settle endpoint** — "Pay all my debts to Alice across this project" — Phase 2+ convenience.
- **Percentage-split auto-adjust on amount edit** — If parent amount changes, recompute fixed amounts from percentages? Phase 2+ toggle.
- **Overpayment protection** — Currently no guard; caller can record more than `owed_amount`. Phase 2+ may add an opt-in soft warning.
- **Email-only split debtors** — Splitting with someone who isn't yet a contact, identified by email — Phase 3+ for invite flows.
- **Notification suppression on receive** — `split_received` is closure-only and might be noise for active splitters; per-user mute setting deferred to Phase 2.

---

## 6. Status

- **Phase** — spec; Phase 1b implementation pending
- **Last updated** — 2026-04-26
- **Version** — 0.2 (unified model)
  - Drops `paid_amount`, `is_settled`, `split_settlements` table, `mark-paid` endpoint
  - Polymorphic source FKs (`source_transaction_id` / `source_project_transaction_id`)
  - Per-caller computed settlement state
  - Splits migrate to personal mirror on claim (linked actor)
  - **Debtor identifier gated by parent context** — personal-context splits only use `contact_id` / `person_name`; project-context splits only use `project_member_id`. A personal transaction with no project cannot split with project members directly (must use a `project_transaction` instead).
  - `personal_debts` extracted to [`12-personal-debts.md`](12-personal-debts.md)
  - Notifications extracted to [`13-notifications.md`](13-notifications.md)
- **Version 0.1** — initial 3-table design (`shared_expense_splits` + `split_settlements` + `personal_debts` colocated); two-sided settlement handshake; `mark-paid` endpoint.
