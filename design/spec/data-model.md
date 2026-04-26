# Data Model

Cross-table view of the schema: how tables relate, which patterns are shared, and which invariants span modules. For column-level details (types, constraints, indexes) go to [`../database/schema.md`](../database/schema.md).

The schema has **25 tables** organized into 13 modules. Each module is owned by a per-module spec (`NN-*.md`); the table inventory is in [`../database/schema.md`](../database/schema.md#table-of-contents).

---

## Module groupings

| Group | Module(s) | Tables |
|---|---|---|
| **Identity & sessions** | 01 — Auth | `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_identities` |
| **User profile** | 02 — Users | `user_preferences`, `notification_preferences` (extensions of `users`) |
| **Money primitives** | 03 — Accounts, 04 — Transactions, 05 — Categories & Tags | `accounts`, `transactions`, `categories`, `tags`, `transaction_tags` |
| **Sharing** | 06 — Splits, 07 — Contacts | `shared_expense_splits`, `contacts`, `contact_invites` |
| **Goals** | 08 — Budgets, 09 — Saving Goals | `budgets`, `saving_goals` |
| **Collaboration** | 10 — Projects | `projects`, `project_members`, `project_invites`, `project_transactions` |
| **Automation** | 11 — Scheduled Transactions | `scheduled_transactions` |
| **Personal debts** | 12 — Personal Debts | `personal_debts` |
| **Notifications** | 13 — Notifications | `notifications`, `user_notification_settings` |

---

## ERD — core money flow

The most-touched part of the schema:

```
users ─┬─< accounts ──< transactions ─┬─> categories
       │                              ├─> projects (nullable; auto-set on claim/resolve)
       │                              ├─> scheduled_transactions (nullable)
       │                              ├─> shared_expense_splits (source_split_id; nullable)
       │                              └─> project_transactions (source_project_transaction_id; nullable)
       ├─< categories (self-FK: parent_id, ≤3 levels)
       ├─< tags
       └─< transactions

transactions ─< transaction_tags >─ tags

shared_expense_splits ─┬─> transactions (source_transaction_id; nullable)
                       ├─> project_transactions (source_project_transaction_id; nullable)
                       └─> contacts | project_members | person_name (one of three; debtor identity)
```

**Legend:** `─<` one-to-many, `>─` many-to-one, `──>` reference (FK).

---

## ERD — projects & collaboration

```
users ─< projects (owner_user_id) ─┬─< project_members ─> users (user_id; nullable)
                                   │                   └─> contacts (contact_id; nullable)
                                   ├─< project_invites ─> project_members
                                   └─< project_transactions ─┬─> project_members (transaction_member_id)
                                                             └─> users (record_user_id)
```

`project_transactions` is the **canonical project ledger** — separate from personal `transactions`. Project rows never touch a personal account at insert time. Real money movement happens via:
- **Claim** — actor mirrors a `project_transactions` row onto their personal `transactions` book (sets `transactions.source_project_transaction_id`)
- **Split-resolve** — debtors / creditors create personal entries that reference the split (sets `transactions.source_split_id`)

See [10-projects.md](10-projects.md) for the full claim/resolve flow.

---

## ERD — contacts, debts, notifications

```
users ─┬─< contacts ──> users (app_user_id; nullable, set on link-accept)
       │                └─< contact_invites
       ├─< personal_debts ─┬─> contacts (creditor_contact_id; nullable)
       │                   ├─> shared_expense_splits (source_split_id; nullable)
       │                   └─> projects (project_id; nullable)
       └─< notifications (recipient_user_id) ──> users (actor_user_id; nullable)
```

`personal_debts` is independent of `shared_expense_splits` — can be created manually OR auto from a split via `add-as-debt`. The link is via `source_split_id`.

---

## Cross-cutting patterns

### Audit columns on every table

Every table carries:
- `created_at`, `created_by_user_id` (nullable; `NULL` = system)
- `updated_at`, `updated_by_user_id` (nullable; `NULL` = system)

`created_by_user_id` / `updated_by_user_id` are FKs to `users.id`. App layer sets them; DB does not auto-fill. See [`../database/schema.md`](../database/schema.md) Conventions.

### Polymorphic-FK avoidance via dual nullable FKs

`shared_expense_splits` can have either of two parent table types:
- `source_transaction_id` → `transactions.id` (personal context)
- `source_project_transaction_id` → `project_transactions.id` (project context)

Both columns nullable; CHECK enforces exactly one is set. Same pattern for the debtor identity (one of `contact_id` / `project_member_id` / `person_name`).

This avoids the Rails-style `*_id` + `*_type` polymorphic discriminator (which the project explicitly rejects per the FK naming rule).

### Self-FKs use `parent_id` style (no table suffix)

- `categories.parent_id` → `categories.id` (3-level hierarchy)
- `refresh_tokens.replaced_by_id` → `refresh_tokens.id` (token rotation chain)

### Splits migrate at claim

When a project actor claims a `project_transaction`, any existing splits linked to it migrate from `source_project_transaction_id` to `source_transaction_id` (now pointing to the actor's personal mirror). Debtor identity also migrates from `project_member_id` to `contact_id` if a corresponding contact link exists. See [06-shared-expenses.md](06-shared-expenses.md).

### Users are never hard-deleted

`users.id` is referenced by `created_by_user_id` / `updated_by_user_id` on every table, plus owned and shared tables. To preserve audit trails and other users' linked data, deletion is anonymize-and-archive only:

- `pending_deletion` (30-day grace, recoverable)
- → `archived` (PII wiped, row preserved forever)

See [02-users.md §3.11](02-users.md#311-account-deletion-anonymizes-after-a-30-day-grace-period-no-hard-delete).

---

## Tables NOT in this folder's narratives

These are infrastructure tables — covered in their owning module's spec but rarely surface in cross-module discussion:

| Table | Module | Notes |
|---|---|---|
| `refresh_tokens` | 01-auth | Phase 2+; rotation chain via `replaced_by_id` |
| `email_verification_tokens` | 01-auth | Phase 2+; short-lived, single-use |
| `password_reset_tokens` | 01-auth | Phase 2+; short-lived, single-use |
| `oauth_identities` | 01-auth | Phase 3+; one row per (user, provider) |
| `transaction_tags` | 05 | M:N junction |
| `contact_invites` | 07-contacts | Short-lived invite codes |
| `project_invites` | 10-projects | Short-lived invite codes |
| `notifications` | 13 | One row per (recipient, event) |
| `user_notification_settings` | 13 | One row per user; lazy-created |

---

## Status

- **Last updated** — 2026-04-26
- **Version** — 0.2 (refreshed against schema v0.4: 25 tables, current ERD by group, polymorphic-FK pattern, audit columns, anonymize-on-archive, splits-migrate-at-claim)
