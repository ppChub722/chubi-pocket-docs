# Global Business Rules

Cross-cutting business rules — invariants that span multiple modules. Module-specific rules live in each module's spec file.

---

## Rules

| # | Rule | Enforced at |
|---|---|---|
| 1 | A user can only read or modify their own data | API middleware (authorization layer) |
| 2 | Account balance updates and transaction writes are atomic | DB transaction around `POST /v1/transactions` |
| 3 | Transfer transactions must not have a `category_id` other than the system Transfer IN/OUT categories | `POST /v1/transactions` validation |
| 4 | Transfer source and destination accounts must differ | `POST /v1/transactions` validation |
| 5 | `amount` is always stored positive; `type` determines debit/credit | Application layer |
| 6 | When `split_type = 'percent'`, splits must sum to 100% | `POST /v1/transactions` validation |
| 7 | When `split_type = 'fixed'`, splits must sum to the transaction amount | `POST /v1/transactions` validation |
| 8 | Cannot reduce a split's `owed_amount` below the sum of associated settlement payments | `PUT /v1/splits/:id` validation |
| 9 | Cannot delete a transaction linked to an unsettled split | `DELETE /v1/transactions/:id` |
| 10 | `current_amount` on a saving goal is computed from `linked_account.balance × allocation_pct / 100` (not stored) | Application layer |
| 11 | `users` rows are **never hard-deleted** — `pending_deletion` after grace becomes `archived` with PII anonymized | [`02-users.md §3.11`](02-users.md#311-account-deletion-anonymizes-after-a-30-day-grace-period-no-hard-delete) |
| 12 | Audit columns `created_by_user_id` / `updated_by_user_id` are app-set on INSERT/UPDATE; `NULL` = system-generated | App layer; see [`../database/schema.md`](../database/schema.md) Conventions |

---

## Status

- **Last updated** — 2026-04-26
- **Version** — 0.2 (extracted from old spec/overview.md; updated rule wording to match schema v0.4 — `percent` not `percentage`, audit-column rules added, anonymize-on-archive added)
