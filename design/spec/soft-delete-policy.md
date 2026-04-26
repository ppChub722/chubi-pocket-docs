# Soft Delete Policy

Per-table delete behavior. Records with downstream references or audit value are archived (`status = 'archived'` or another phase-out value) rather than hard-deleted.

The mechanism is the **`status` column with phase-out values** — never a `is_active` boolean. Each table's allowed status values are listed in [`../database/schema.md`](../database/schema.md).

---

## Behavior categories

### 1. Never hard-deleted (anonymize + archive forever)

| Table | Mechanism |
|---|---|
| `users` | After 30-day `pending_deletion` grace → anonymize PII (`email`, `display_name`, `avatar_url`, `password_hash`) + `status = 'archived'`. Row preserved forever to keep `created_by_user_id` / `updated_by_user_id` references and other users' linked data intact. See [02-users.md §3.11](02-users.md#311-account-deletion-anonymizes-after-a-30-day-grace-period-no-hard-delete). |

### 2. Soft-archive (`status = 'archived'`)

These tables stay in the DB so historical references remain valid; default list responses exclude `archived` rows.

| Table | Allowed statuses | Notes |
|---|---|---|
| `accounts` | `active`, `archived`, `closed` | Archive when transactions exist; `closed` for explicitly-shut accounts |
| `categories` | `active`, `archived` | Archive if any transactions reference it; the unique-name constraint excludes archived rows so names can be reused |
| `tags` | (no status — see Category 4) | |
| `contacts` | `active`, `archived` | Archive preserves linked-user history |
| `budgets` | `active`, `archived` | |
| `saving_goals` | `active`, `archived` | |

### 3. Status-driven lifecycle (multiple phase-out values)

Tables where the row has a meaningful state machine, not just active/archived.

| Table | Statuses | Terminal states |
|---|---|---|
| `projects` | `active`, `completed`, `cancelled`, `archived` | `cancelled` / `archived` end the project |
| `project_members` | `pending`, `active`, `left` | `left` is soft-removal (preserves history) |
| `scheduled_transactions` | `active`, `paused`, `cancelled`, `completed` | `cancelled` / `completed` end the schedule |
| `personal_debts` | `open`, `paid`, `cancelled` | `paid` / `cancelled` close the debt |

### 4. Hard delete (with referential blocks)

These can be physically removed, but the application layer blocks deletion when a downstream reference would break.

| Table | Block condition |
|---|---|
| `transactions` | Blocked if linked to an unsettled split (settlement transactions exist via `source_split_id` referencing it) |
| `tags` | No block — junction rows in `transaction_tags` auto-removed via `ON DELETE CASCADE` |
| `shared_expense_splits` | Blocked if any settlement transactions exist (`transactions.source_split_id` references it) |
| `transaction_tags` | Junction; deleted by cascade or by removing a tag from a transaction |

### 5. Append-only / lifecycle-managed (no UI delete action)

These tables have their own time-based or single-use lifecycles. There's no user-initiated delete; rows expire, get consumed, or remain as audit log.

| Table | Lifecycle |
|---|---|
| `refresh_tokens` | Revoked via `revoked_at`; expire at `expires_at`. Rotated chains kept for audit. |
| `email_verification_tokens` | Single-use via `used_at`; expire at `expires_at`. |
| `password_reset_tokens` | Single-use via `used_at`; expire at `expires_at`. |
| `oauth_identities` | One row per (user, provider). Removed only if user unlinks the provider. |
| `contact_invites` | Single-use via `accepted_at`; expire at `expires_at`. |
| `project_invites` | Single-use via `accepted_at`; expire at `expires_at`. |
| `project_transactions` | Hard-delete by recorder (with project owner override) — same rules as `transactions`. |
| `notifications` | User dismisses (`dismissed_at`) or actions (`actioned_at`); rows kept for inbox history; periodic cleanup may purge old dismissed rows post-launch. |

### 6. Owner-cascade only (no independent delete)

Settings / preference rows that exist as 1:1 with their owner. Deleted only when the owner is deleted (which, per Category 1 for `users`, never happens).

| Table | Cascade source |
|---|---|
| `user_preferences` | `users` |
| `notification_preferences` | `users` |
| `user_notification_settings` | `users` |

(Since `users` is never hard-deleted, these rows live forever too — but their content is anonymized as part of the user-archive flow.)

---

## API filter convention

Endpoints that return lists exclude phase-out statuses by default. Pass `status=archived` (or `status=cancelled`, `status=completed`, etc., per resource) to include them.

---

## Status

- **Last updated** — 2026-04-26
- **Version** — 0.2 (refreshed against schema v0.4: status-enum-driven model, no `is_active`, table names match canonical schema, six behavior categories, `users` never-hard-delete flow)
