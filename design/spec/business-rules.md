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
| 13 | Recurring occurrences are computed from the setting, never written ahead; a `recurring_items` row is stored only when an occurrence is edited, recorded (a transaction), marked paid or skipped | Recurring module; [`11-scheduled-transactions.md §1`](11-scheduled-transactions.md#1-two-parts) |
| 14 | Recurring never creates pending drafts; due occurrences are settled on the recurring page (ต้องจัดการ) | Recurring due check; [`11-scheduled-transactions.md §4`](11-scheduled-transactions.md#4-the-due-check-no-job-runner) |
| 15 | One occurrence has at most one transaction, and one transaction records at most one occurrence; moving a link to another side needs an explicit swap (`replace`) | Unique `(rule_id, slot)` and `transaction_id` on `recurring_items`; `POST /v1/recurring/:id/occurrences/:slot/link` |
| 16 | Linking a transaction to an occurrence never changes the transaction's date or amount | Recurring link |
| 17 | A transaction made from an occurrence (ยืนยัน, all at once, auto-create) is dated the occurrence date, unless the user sets another date | Recurring confirm / confirm-ready / due check |
| 18 | Deleting a transaction that records an occurrence releases it (back to due / upcoming, or paid if it was marked paid first); `skip_occurrence=true` also skips it in the same DB transaction | `DELETE /v1/transactions/:id` |
| 19 | A setting edit never changes the date or amount of recorded transactions; their name / category / wallet / tags / note change only with `also_update_tx` | `PUT /v1/recurring/:id` |
| 20 | Occurrences before a setting's creation day count as paid (never due); on resume, the occurrences inside the paused gap count as skipped while earlier due ones stay due | Recurring module; `POST /v1/recurring/:id/resume` |
| 21 | Auto-create needs a fixed amount and a wallet, records only occurrences that come due after it was switched on, and never re-creates a deleted transaction | `POST` / `PUT /v1/recurring` validation; recurring due check |

---

## Status

- **Last updated** — 2026-04-26
- **Version** — 0.2 (extracted from old spec/overview.md; updated rule wording to match schema v0.4 — `percent` not `percentage`, audit-column rules added, anonymize-on-archive added)
- **Updated 2026-10-20 (0.4.0-2)** — rules 13–21: recurring on computed occurrences (migration 068; spec 11)
