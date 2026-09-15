# Cross-Cutting Design Decisions

Schema-wide and architecture-wide decisions that apply across multiple modules. Module-level decisions are in each module's spec file.

---

## Decisions

### UUID v7 for primary keys

Used over auto-increment integers across every table.

- Prevents ID enumeration attacks (`/users/1` → `/users/2` is impossible).
- Time-ordered, so primary-key indexes behave like `BIGSERIAL` for write performance.
- No central sequence bottleneck if the DB is ever sharded.
- Trade-off: ~16 bytes vs 8 bytes. Acceptable for a personal-finance app's data volumes.

### argon2id for password hashing

Modern default; GPU-crack resistant.

- Tune cost parameters (memory, iterations) via env so they can be raised over time without code changes.
- Target ~250ms hash time on production hardware.

### Bearer JWT over session cookies

Three reasons:
- Flutter mobile + Flutter web + future Next.js admin all consume the same API.
- No CSRF surface — Bearer tokens aren't auto-sent by browsers.
- No session store to scale until Phase 3 blocklist.

Trade-off: can't instantly revoke an access token until Phase 3. Acceptable because access tokens are short-lived from Phase 2 onward.

### Money as `DECIMAL(15,2)`

Never floats. Float arithmetic rounding errors accumulate and cause disputes in financial software. Always positive in storage; the `type` field on a transaction determines debit/credit.

### Dates in UTC, displayed in user local time

Storage is unambiguous; the client handles display conversion. `transactions.date` is a calendar `DATE` in the user's timezone (no time-of-day component); `*_at` columns are `TIMESTAMPTZ`.

### Soft delete with archive status

Records with downstream references are archived (`status = 'archived'`) rather than hard-deleted. Personal financial data is high-stakes; an accidental hard delete is hard to recover from. See [`soft-delete-policy.md`](soft-delete-policy.md) for per-table rules.

### Users are never hard-deleted

After the 30-day `pending_deletion` grace, `users` rows are anonymized (PII wiped) and set to `status = 'archived'`. The row itself is preserved forever so that `created_by_user_id` / `updated_by_user_id` references and other users' linked data (project memberships, contacts, splits) remain intact. See [`02-users.md §3.11`](02-users.md#311-account-deletion-anonymizes-after-a-30-day-grace-period-no-hard-delete).

### Audit columns on every table

Every table carries `created_at`, `created_by_user_id`, `updated_at`, `updated_by_user_id`. The `_user_id` columns are nullable; `NULL` = system-generated row. App layer sets these on INSERT / UPDATE. See [`../database/schema.md`](../database/schema.md) Conventions.

### FK naming rule

Every FK column ends in `<target_table>_id`. Role-prefixed when not the row's primary owner (`owner_user_id`, `created_by_user_id`). Self-FKs use `parent_id` / `replaced_by_id` (no table suffix). Multiple FKs to the same target on one table → role-prefix all. See [`../database/schema.md`](../database/schema.md) Conventions.

### Shared-expense consolidation

The original 3-table shared-expense model (`shared_expenses` + `shared_expense_splits` + `split_settlements`) was collapsed in v0.2 to a single `shared_expense_splits` table with parent FKs to either `transactions` or `project_transactions`. The split-settlements log was replaced by app-level computation from settlement transactions linked via `source_split_id`. Trade-off: drops per-payment audit history in exchange for a simpler model. Acceptable for a personal-finance app (not accounting software). Full rationale in [06-shared-expenses.md](06-shared-expenses.md).

### Display term "wallet", code term "account"

Every user-facing surface (app UI strings, marketing) says **wallet /
กระเป๋า**; code, DB, and API keep `account`/`accounts`. Two reasons:

- The word "account" is already taken in the UI by the *user account*
  ("Create account" on register vs "Add account" on the accounts tab) —
  renaming the money entity to "wallet" removes the collision.
- Renaming code/DB/API (`accounts` table, `account_id` FKs across 8+
  migrations, `/v1/accounts` routes, Flutter repositories) is 1–2 days of
  breaking mechanical churn with zero user-visible value. Display term ≠
  domain term is normal practice.

The rename is an ARB-only change (`app_en.arb` / `app_th.arb`). If a
breaking API v2 ever happens, bundle the code rename then. Shared wallets
(module 14) follow the same rule: the membership table says
`account_members` and wallet rows live in the ordinary `transactions`
table; the UI says "shared wallet / กระเป๋าร่วม".

### Umbrella label "Projects & Events", one word per inner context

The projects feature serves two vibes with one engine: work-shaped
containers (sales, freelance → "โปรเจกต์") and life-shaped ones (trips,
day outings, group bills → "อีเวนต์"). Decided 2026-09-15:

- **Entry points** (more-menu item, list page title) use the umbrella
  label **"โปรเจกต์ & อีเวนต์" / "Projects & Events"** — whichever word
  matches the user's intent, they find it while scanning.
- **Inner screens never say both.** Each context picks one word: neutral
  verbs where possible ("สร้างใหม่"), the casual word where the context
  is clearly casual (quick create: "สร้างอีเวนต์จากบิล"), and
  `projects.type` may drive per-item wording later.
- Code/API/DB stay `projects` everywhere — same display-term ≠
  domain-term rule as wallet/account.

### Project ledger separated from personal transactions

`project_transactions` is its own table, distinct from personal `transactions`. Project rows never touch a personal account at insert time. Real money movement happens via **claim** (the actor mirrors a project_transaction onto their personal book) or **split-resolve** (debtors/creditors create personal entries). See [10-projects.md](10-projects.md).

---

## Status

- **Last updated** — 2026-09-11
- **Version** — 0.3 (added display-term-wallet naming rule for module 14)
- **Version 0.2** — extracted from old spec/overview.md; added v0.4 schema decisions — audit columns, FK naming rule, anonymize-on-archive, project ledger separation
