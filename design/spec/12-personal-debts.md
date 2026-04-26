# 12 — Personal Debts

The debtor-side ledger. **"What I owe to others."** A standalone tracker for obligations the user has chosen to log — whether linked to a split or freestanding.

This module owns the `personal_debts` table and the I-owe / owed-to-me dashboard. It's a separate user-facing screen with its own CRUD; settlement state is computed from the user's personal `transactions` and the splits they're involved in (defined in [`06-shared-expenses.md`](06-shared-expenses.md)).

References: `transactions` (user's personal entries that auto-close debts via `source_split_id`), `shared_expense_splits` (optional source via `source_split_id`), `contacts`, `projects`.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 1b | Phase 2 | Phase 3 |
|---|---|---|---|
| Personal_debts CRUD (debtor-side) | ✅ | ✅ | ✅ |
| Add-as-debt from a split (`/shared-expenses/splits/:id/add-as-debt`) | ✅ | ✅ | ✅ |
| Manual debt creation (no split, no project) | ✅ | ✅ | ✅ |
| Auto-close on personal payment with matching `source_split_id` | ✅ | ✅ | ✅ |
| Unified dashboard ("I owe / owed to me") | ✅ | ✅ | ✅ |
| Cancel / forgive a debt | ✅ | ✅ | ✅ |
| Bulk pay (settle many debts at once) | — | ✅ | ✅ |
| Currency conversion across debts | — | — | Phase 3+ |

---

## 1. Schema

Tables owned by this module: `personal_debts`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#12--personal-debts`](../database/schema.md#12--personal-debts).

Notable behavior:

- `creditor_contact_id` (optional) + `creditor_person_name` (always set) — creditor identification. The display name is durable: stays even if the contact is later renamed or deleted.
- `source_split_id` — optional link to the originating split (when row created via `add-as-debt`). `ON DELETE SET NULL` so the debt survives if the split is deleted.
- `paid_amount` is auto-bumped when the user's personal `transactions` with matching `source_split_id` land — see §2.3.
- **No `creditor_member_id`** — dropped under the unified model. Creditor is always identified by contact_id + person_name.

---

## 2. Core concepts

### 2.1 Three ways a row gets created

| Trigger | source_split_id | project_id | creditor_contact_id |
|---|---|---|---|
| **Manual** — Bob owes Somchai for lunch (no split, no project) | NULL | NULL | optional (set if Somchai is a contact) |
| **Add-as-debt from personal-context split** — Alice splits dinner with Bob (linked contact) | set | NULL | optional (set if creditor is in Bob's contacts) |
| **Add-as-debt from project-context split** — Grandma fronted; Carol owes Grandma | set | set | optional (set if Carol has Grandma in her contacts) |

In all three cases, `creditor_person_name` is always set — it's the durable display label, even if the contact is later renamed or deleted.

### 2.2 Creditor identification — three forms

**With contact link:**

```
| creditor_contact_id | creditor_person_name |
| C-alice             | "Alice"              |
```

The contact may itself be linked (`contact.app_user_id` set, creditor is an app user) or unlinked (just a name in the debtor's address book). Either way, the dashboard can render it consistently.

**Person-name only:**

```
| creditor_contact_id | creditor_person_name |
| NULL                | "Grandma"            |
```

Used when the creditor isn't in the debtor's contact book. Common for ad-hoc project members who the debtor hasn't promoted to a contact, or true free-text entries ("the cab driver who fronted my fare").

The debtor can later edit a row to add a `creditor_contact_id` — promoting from name-only to contact-linked.

### 2.3 Auto-close mechanic

When the user creates a personal expense with `source_split_id` set (typically via `/shared-expenses/splits/:id/pay`), the backend looks up any `personal_debts` row with the same `(user_id, source_split_id)` and bumps its `paid_amount` by the expense's `amount`. If `paid_amount >= amount`, status flips to `paid`.

This means add-as-debt followed by pay-now is automatic on the debtor's side — no second action required.

```
SQL sketch:
UPDATE personal_debts
SET paid_amount = paid_amount + :amount,
    status = CASE WHEN paid_amount + :amount >= amount THEN 'paid' ELSE status END,
    updated_at = NOW()
WHERE user_id = :caller AND source_split_id = :split_id;
```

### 2.4 Manual edits and cancellation

The user can edit any field on their own debt rows (creditor_person_name, amount, paid_amount, note). They can also cancel a debt (debt forgiven / written off):

- `POST /v1/personal-debts/:id/cancel` → `status = 'cancelled'`, no money moves
- Editing `paid_amount` directly is allowed (e.g., user paid Alice in cash without going through `/pay`)

Drift between the auto-close machinery and manual edits is fine — last write wins. The dashboard always reflects the current row state.

### 2.5 The unified dashboard — "I owe" vs "owed to me"

The dashboard joins two sources from the caller's perspective:

**I owe** — open `personal_debts` rows where `user_id = caller` and `status = 'open'`. Sum: `amount - paid_amount`.

**Owed to me** — open splits where the caller is the creditor:
- Splits on the caller's personal `transactions` rows (caller created the parent)
- Splits on `project_transactions` where the caller is the actor (`transaction_member.user_id = caller`)
- Splits on personal transactions claimed by the caller (parent's `user_id = caller` and parent has `source_project_transaction_id` set — the post-claim case)

For each split, outstanding from caller's view = `owed_amount - sum(caller's income personal entries with source_split_id = split.id)`.

Two queries; one unified response.

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `GET /v1/personal-debts`

List the caller's own debt rows.

**Query parameters:**

| Name | Description |
|---|---|
| `status` | `open` (default) / `paid` / `cancelled` / `all` |
| `creditor_contact_id` | Filter to a specific contact |
| `project_id` | Filter to a specific project |
| `from`, `to` | Date range (created_at) |
| `page`, `per_page` | Standard pagination |

**Response:**

```json
{
  "data": [
    {
      "id": "0190e5-debt1",
      "creditor_contact_id": "0190e5-alice",
      "creditor_person_name": "Alice",
      "source_split_id": "0190e5-split1",
      "project_id": "0190e5-japan",
      "amount": 1000.00,
      "paid_amount": 0,
      "outstanding": 1000.00,
      "currency": "THB",
      "status": "open",
      "note": "Hotel split",
      "created_at": "..."
    }
  ],
  "total_outstanding_by_currency": { "THB": 1000.00 },
  "pagination": { "page": 1, "per_page": 20, "total": 1, "total_pages": 1 }
}
```

### 3.2 `POST /v1/personal-debts`

Manually add a debt. No source split, no project context.

**Request body:**

```json
{
  "creditor_contact_id": "0190e5-somchai",
  "creditor_person_name": "Somchai",
  "amount": 500.00,
  "currency": "THB",
  "note": "Lunch last Thursday"
}
```

| Field | Required | Rules |
|---|---|---|
| `creditor_person_name` | ✅ | Always required — the display label |
| `creditor_contact_id` | — | Optional — link to contact book |
| `amount` | ✅ | > 0 |
| `currency` | ✅ | ISO 4217 |
| `note` | — | |

(Manual debts have no `source_split_id` or `project_id`. Use `add-as-debt` from a split context for those.)

**Errors:** `400 VALIDATION_ERROR`, `401`.

### 3.3 `PUT /v1/personal-debts/:id`

Edit debt fields. Caller must be `user_id` (debt owner).

**Editable:** `creditor_contact_id`, `creditor_person_name`, `amount`, `paid_amount`, `currency`, `note`, `status`.

Editing `paid_amount` directly is allowed (manual reconciliation). If `status` is changed to `paid`, backend validates `paid_amount >= amount`.

**Errors:** `400 VALIDATION_ERROR`, `401`, `403 NOT_OWNER`, `404`.

### 3.4 `DELETE /v1/personal-debts/:id`

Hard delete. Doesn't touch any linked source split (that lives on the creditor's side).

### 3.5 `POST /v1/personal-debts/:id/cancel`

Convenience endpoint to mark `status = 'cancelled'` without manual edit. Used when a debt is forgiven / written off.

### 3.6 `POST /v1/personal-debts/:id/pay`

Settle a debt by recording a real payment. Creates a personal `transactions` row from the debt's context.

**Request body:**

```json
{
  "account_id": "0190e5-bob-kbank",
  "amount": 500.00,
  "date": "2026-04-26"
}
```

| Field | Required | Rules |
|---|---|---|
| `account_id` | ✅ | Caller's account |
| `amount` | — | Defaults to `outstanding` (`amount - paid_amount`); partial allowed |
| `date` | — | Defaults to today |

**Backend (atomic):**

1. Validate caller is the debt owner
2. Insert personal `transactions` row: `type=expense`, `account_id`, `amount`, `source_split_id` = debt's `source_split_id` if set (else NULL), `project_id` = debt's `project_id`
3. `accounts.balance −= amount`
4. Bump debt's `paid_amount += amount`; flip `status = 'paid'` if paid in full
5. If a split is linked AND its creditor is a linked user, fire `split_paid` notification (delegating to the same notification trigger used by `/shared-expenses/splits/:id/pay`)

**Success — `201 Created`:** the created personal transaction + updated debt.

**Errors:** `400 ALREADY_PAID`, `400 ALREADY_CANCELLED`, `400 OVERPAYMENT`, `401`, `403 NOT_OWNER`, `404`.

### 3.7 `GET /v1/personal-debts/dashboard`

Unified dashboard — both directions.

**Response:**

```json
{
  "currency": "THB",

  "owed_to_me": {
    "total": 2000.00,
    "by_person": [
      {
        "type": "project_member",
        "member_id": "0190e5-m-bob",
        "contact_id": null,
        "display_name": "Bob",
        "total": 1000.00,
        "splits_count": 1
      },
      {
        "type": "contact",
        "contact_id": "0190e5-carol",
        "display_name": "Carol",
        "total": 1000.00,
        "splits_count": 1
      }
    ]
  },

  "i_owe": {
    "total": 1500.00,
    "by_person": [
      {
        "type": "contact",
        "contact_id": "0190e5-somchai",
        "display_name": "Somchai",
        "total": 500.00,
        "source": "personal_debt"
      },
      {
        "type": "person_name",
        "display_name": "Grandma",
        "total": 1000.00,
        "source": "personal_debt"
      }
    ]
  },

  "net_position": 500.00
}
```

`owed_to_me` is computed from splits where caller is creditor, summing `outstanding_from_my_view` per debtor identity. `i_owe` is computed from open `personal_debts` rows.

---

## 4. Design decisions

### 4.1 Drop `creditor_member_id`

The previous schema had `creditor_member_id` as a third creditor-identifier alongside `creditor_contact_id`. Dropped because:

- All creditors can be represented as either a contact (linked or unlinked) or a free-text name. Project members who aren't yet contacts use `creditor_person_name` (debtor-side label) and can be promoted to contacts later via `POST /v1/contacts` with `app_user_id` linking.
- Unifies creditor identification across all three creation triggers (manual / personal-context / project-context).
- The project context is still captured via `project_id` and `source_split_id`.

### 4.2 `creditor_person_name` always set

Always-set display label means the dashboard can always render the debt without joining contacts. Snapshot semantics: "Alice" stays "Alice" even if the user later renames their contact, ensuring debt history doesn't shift.

### 4.3 Separate from splits — own table, own screen

Splits are creditor-side ("Bob owes me"); personal_debts are debtor-side ("I owe Alice"). The two perspectives are complementary but not redundant:

- A split exists from the moment the creditor saves their transaction. The debtor doesn't have to do anything for it to exist.
- A personal_debt exists only when the debtor explicitly tracks it (via add-as-debt, manual entry, or pay-now-which-auto-creates).

Splits are managed in [`06-shared-expenses.md`](06-shared-expenses.md); personal_debts is its own module with its own UI.

### 4.4 Auto-close mechanic via `source_split_id`

When the debtor pays a split (via `/shared-expenses/splits/:id/pay` or `/personal-debts/:id/pay`), the resulting personal expense has `source_split_id` set. The backend uses this to auto-bump any matching `personal_debts.paid_amount`.

This means:
- Add-as-debt followed by pay closes both the debt AND records the personal expense in one tap
- The debtor never has to manually reconcile "I created a personal_debt; I paid; now I need to mark the debt closed"

### 4.5 Manual `paid_amount` edits allowed

The auto-close machinery is helpful but not mandatory. Users can directly edit `paid_amount` (e.g., "I paid Alice ฿300 in cash, didn't go through the app's pay flow"). Last write wins; no conflict detection.

### 4.6 `ON DELETE SET NULL` for source split

If the creditor deletes the parent transaction (and cascade kills the split), the debtor's personal_debt loses its `source_split_id` link but keeps the row. The debt becomes "unlinked" but still exists for the debtor's tracking.

This protects the debtor from data loss when the creditor mutates their book.

### 4.7 Currency stored per row

Manual debts have no parent to inherit from, so currency must be explicit. Auto-created (from add-as-debt) rows inherit from the source split's parent transaction's currency.

Multi-currency dashboard rendering and conversion are deferred to Phase 3+.

### 4.8 Manual debts have no auto-close path

A manual `personal_debts` row (no `source_split_id`) can only be closed via `/personal-debts/:id/pay` or direct `paid_amount` edit. There's no split context to trigger auto-close.

---

## 5. Open questions

- **Bulk pay** — "Settle all my debts to Alice in one go" — single account, multiple debts. Phase 2+.
- **Recurring debts** — "I owe my landlord ฿8,000/mo" — better expressed as a recurring transaction, not a debt. Cross-link with [`11-scheduled-transactions.md`](11-scheduled-transactions.md) at the UI layer.
- **Debt forgiveness notification** — When debtor cancels, notify creditor? Probably yes; Phase 2+.
- **Currency conversion** — Multi-currency dashboard summing — Phase 3+.
- **Promoting person_name to contact** — One-tap from the debt detail view: "Add Grandma to my contacts." Uses existing `POST /v1/contacts` endpoint; no new schema.
- **Statute of limitations / archive** — Auto-archive paid debts older than X months to keep dashboard lean? Phase 2+ user setting.

---

## 6. Status

- **Phase** — spec; Phase 1b implementation pending
- **Last updated** — 2026-04-26
- **Version** — 0.1 (extracted from `06-shared-expenses.md` v0.1; updated for unified model)
  - Drops `creditor_member_id`
  - Renames `creditor_display_name` → `creditor_person_name`
  - Adds `POST /v1/personal-debts/:id/pay` convenience endpoint
  - Adds `GET /v1/personal-debts/dashboard` unified view
  - Auto-close mechanic via `source_split_id` formalized
