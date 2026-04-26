# Database Schema — All Tables

Single consolidated reference for every table in the system. Ordered by owning spec module (matches numbering in [`../spec/`](../spec/)).

For module behavior, API endpoints, design rationale, and cross-table invariants (split context gating, splits-migrate-on-claim, etc.) see the spec file linked at each section header.

**Conventions:**
- All `id` columns are `UUID` v7 unless noted.
- All `*_at` columns are `TIMESTAMPTZ`.
- All money columns are `DECIMAL(15,2)` unless noted; `currency` is `VARCHAR(3)` ISO 4217.
- "Trigger-updated" `updated_at` columns are maintained by a generic `set_timestamp` trigger.
- **FK naming rule** (applies to every table in this project):
  - **Primary key:** always `id` (never `<table>_id` on its own table).
  - **FK to owner / primary parent:** `<target_table>_id` — `user_id`, `account_id`, `project_id`.
  - **FK with role:** `<role>_<target_table>_id` — `owner_user_id`, `accepted_by_user_id`, `created_by_user_id`, `linked_account_id`.
  - **Self-FK exception:** when the FK targets the same table, omit the table suffix — `parent_id`, `replaced_by_id`.
  - **Multiple FKs to the same target on one table:** role-prefix **all** of them (e.g., `notifications.recipient_user_id` + `actor_user_id` — neither is plain `user_id`).
  - **Compound-table-name exception:** when the target table's name is compound (≥3 words or ≥20 chars), the FK column may use an unambiguous abbreviation of the table name. Example: FKs to `shared_expense_splits` use `source_split_id` (not `source_shared_expense_split_id`). Rationale: descriptive table names (which document the table's purpose at a glance) matter more than mechanical FK-name expansion. The abbreviation must be unambiguous within the schema — i.e., no other table could reasonably share the short form.
  - **No polymorphic columns** (no `*_type` discriminator). Use one nullable FK per possible target + CHECK that exactly one is set (see `shared_expense_splits`).
- **Audit columns (standard on every table):** `created_at`, `created_by_user_id`, `updated_at`, `updated_by_user_id`.
  - `created_by_user_id` / `updated_by_user_id` are nullable `UUID` FKs to `users.id`. `NULL` = system-generated (e.g., scheduler-fired transactions, auto-created preferences at registration, system token issuance).
  - App layer sets these on INSERT / UPDATE; DB does not auto-fill them.
  - For tables where the row's natural lifecycle is fully system-driven (token tables, junction tables, notifications), the columns are still present for uniformity — `created_by_user_id` / `updated_by_user_id` will simply be `NULL` in normal operation.
- API-layer enforced rules (vs DB CHECK) are explicitly noted.

---

## Table of contents

| Module | Tables |
|---|---|
| [01 — Auth](#01--auth) | `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_identities` |
| [02 — Users](#02--users) | `users` (additions), `user_preferences`, `notification_preferences` |
| [03 — Accounts](#03--accounts) | `accounts` |
| [04 — Transactions](#04--transactions) | `transactions` |
| [05 — Categories & Tags](#05--categories--tags) | `categories`, `tags`, `transaction_tags` |
| [06 — Shared Expenses (Splits)](#06--shared-expenses-splits) | `shared_expense_splits` |
| [07 — Contacts](#07--contacts) | `contacts`, `contact_invites` |
| [08 — Budgets](#08--budgets) | `budgets` |
| [09 — Saving Goals](#09--saving-goals) | `saving_goals` |
| [10 — Projects](#10--projects) | `projects`, `project_members`, `project_invites`, `project_transactions` |
| [11 — Scheduled Transactions](#11--scheduled-transactions) | `scheduled_transactions` |
| [12 — Personal Debts](#12--personal-debts) | `personal_debts` |
| [13 — Notifications](#13--notifications) | `notifications`, `user_notification_settings` |

---

## 01 — Auth

Owned by [`../spec/01-auth.md`](../spec/01-auth.md).

### `users`

Stores identity. Profile and preference columns are also here but documented in [`../spec/02-users.md`](../spec/02-users.md) — they're listed below for completeness since this is the table of record.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | Unique user identifier |
| `username` | `VARCHAR(50)` | UNIQUE, NOT NULL | Login handle; lowercase, `[a-z0-9_-]`, 3–50 chars |
| `email` | `VARCHAR(255)` | UNIQUE, NULLABLE *(Phase 1)* / NOT NULL *(Phase 2+)* | Optional in Phase 1; required when email verification ships |
| `email_verified_at` | `TIMESTAMPTZ` | NULLABLE | Set when user completes verification flow *(Phase 2+)* |
| `display_name` | `VARCHAR(100)` | NOT NULL | Shown in UI; free text, any Unicode |
| `password_hash` | `VARCHAR(255)` | NOT NULL | argon2id encoded hash (includes salt + params) |
| `currency` | `VARCHAR(3)` | NOT NULL, DEFAULT `'THB'` | ISO 4217 default currency (preference) |
| `avatar_url` | `TEXT` | NULLABLE | Profile image URL (preference) |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'active'`, CHECK | See `02-users` §1.1 — phase-gated CHECK list |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_users_username ON users(username)`
- `UNIQUE INDEX idx_users_email ON users(email)` — PostgreSQL allows multiple NULLs in UNIQUE, so this works while email is optional

**Trigger:** `set_timestamp` — updates `updated_at` before row update.

### `refresh_tokens` *(Phase 2+)*

Server-side refresh-token store. Introduced when token strategy shifts from a single 30-day JWT to 15-min access + 7-day refresh.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner |
| `token_hash` | `VARCHAR(255)` | NOT NULL, UNIQUE | SHA-256 of the refresh token (never store plaintext) |
| `issued_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Issued + 7 days |
| `revoked_at` | `TIMESTAMPTZ` | NULLABLE | Set on logout, rotation, or revoke-all |
| `replaced_by_id` | `UUID` | FK → `refresh_tokens.id`, NULLABLE | Set when rotated; points to the successor token |
| `user_agent` | `TEXT` | NULLABLE | For audit / "signed-in devices" UI |
| `ip` | `VARCHAR(45)` | NULLABLE | IPv4 or IPv6 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Mirrors `issued_at`; included for uniform audit standard |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system (auth handler issues tokens server-side) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated (bumps on revoke / rotation) |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; set when revoke triggered by user action (logout/revoke-all) |

### `email_verification_tokens` *(Phase 2+)*

Short-lived tokens for email verification and email-change verification.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | |
| `token_hash` | `VARCHAR(255)` | NOT NULL, UNIQUE | SHA-256 of the token |
| `purpose` | `VARCHAR(30)` | NOT NULL | `'verify'` \| `'change_email'` |
| `new_email` | `VARCHAR(255)` | NULLABLE | Populated only for `change_email` |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Issued + 1 hour |
| `used_at` | `TIMESTAMPTZ` | NULLABLE | Set on successful consumption |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system (issued by verification flow) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated (bumps when `used_at` set) |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = `user_id` on consumption |

### `password_reset_tokens` *(Phase 2+)*

Short-lived tokens for password reset.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | |
| `token_hash` | `VARCHAR(255)` | NOT NULL, UNIQUE | SHA-256 of the token |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Issued + 30 minutes |
| `used_at` | `TIMESTAMPTZ` | NULLABLE | Set on successful use |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system (issued by reset flow) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated (bumps when `used_at` set) |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = `user_id` on consumption |

### `oauth_identities` *(Phase 3+)*

Links a user to an external OAuth provider (Google, etc.).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | |
| `provider` | `VARCHAR(30)` | NOT NULL | `'google'` (extensible) |
| `provider_user_id` | `VARCHAR(255)` | NOT NULL | ID from the provider |
| `email` | `VARCHAR(255)` | NOT NULL | Email reported by the provider at link time |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system (OAuth callback runs server-side) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

- `UNIQUE (provider, provider_user_id)` — same external account can only link to one app user

---

## 02 — Users

Owned by [`../spec/02-users.md`](../spec/02-users.md).

### `users` — additions owned by this module

The base `users` table is in [01 — Auth](#users) above. This module owns the editable profile/preference columns: `display_name`, `avatar_url`, `currency`, `status`.

#### `status` column

| Column | Type | Constraints | Description |
|---|---|---|---|
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'active'`, CHECK | Account status |

CHECK constraint grows by phase:

```sql
-- Phase 1
CHECK (status IN ('active', 'inactive'))

-- Phase 2 (extend)
CHECK (status IN ('active', 'inactive', 'pending_verification'))

-- Phase 3 (extend)
CHECK (status IN ('active', 'inactive', 'pending_verification', 'banned', 'pending_deletion', 'archived'))
```

Values: `active` (Phase 1, normal), `inactive` (Phase 1, user-deactivated, reversible), `pending_verification` (Phase 2, registered but not verified), `banned` (Phase 3, admin), `pending_deletion` (Phase 3, user requested deletion — 30-day grace, reversible), `archived` (Phase 3, terminal — PII anonymized, row kept forever to preserve historical `created_by_user_id` / `updated_by_user_id` references and other users' linked data).

**Account-deletion flow (Phase 3+):**
1. User requests deletion → `status = 'pending_deletion'` (30-day grace, can recover by signing in)
2. After 30 days → anonymize PII (`email = NULL`, `display_name = '[deleted]'`, `avatar_url = NULL`, `password_hash = ''`) and set `status = 'archived'`
3. The row stays forever. The `id` remains valid so all `created_by_user_id` / `updated_by_user_id` / FK references continue to resolve.

**No hard delete.** `users` rows are never physically deleted — only anonymized + archived. This preserves historical attribution (audit trail) and avoids breaking other users' data (project members, contact links, splits, etc.).

### `user_preferences`

One row per user, 1:1 with `users`. Preferences are stored as a JSONB blob so new keys can be added without DB migrations. Auto-created at registration with defaults.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `UUID` | PK, FK → `users.id`, ON DELETE CASCADE | |
| `preferences` | `JSONB` | NOT NULL, DEFAULT `'{}'::jsonb` | User-editable preferences |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system (auto-created at registration) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = `user_id` |

**Default at registration:**
```json
{ "timezone": "Asia/Bangkok", "theme": "system", "language": "th" }
```

**Known JSONB keys** (typed at app layer):

| Key | Type | Phase | Allowed values |
|---|---|---|---|
| `timezone` | string | 1 | IANA tz identifier |
| `theme` | string | 2 | `"light"` \| `"dark"` \| `"system"` |
| `language` | string | 2 | IETF tag |

Unknown keys are ignored on read, rejected on write.

**Indexes:** `PRIMARY KEY (user_id)`.

### `notification_preferences` *(Phase 2+)*

Per-event-type notification channel toggles. One row per (user, event_type) pair. Distinct from `user_notification_settings` (in 13) — this table is per-event channel control; the other is global behavior toggles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `UUID` | PK, FK → `users.id`, ON DELETE CASCADE | |
| `event_type` | `VARCHAR(50)` | PK, NOT NULL | e.g., `'split_assigned'`, `'settlement_received'`, `'budget_exceeded'` |
| `push_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Mobile push |
| `email_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Email (default off) |
| `in_app_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `true` | In-app inbox |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = `user_id` (lazy-created on first override) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = `user_id` |

Primary key: `(user_id, event_type)`. Lazy creation — initial reads return defaults; rows only exist after override.

---

## 03 — Accounts

Owned by [`../spec/03-accounts.md`](../spec/03-accounts.md).

### `accounts`

One row per account owned by a user. Credit-type accounts (credit card, pay-later) carry additional billing columns.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner |
| `name` | `VARCHAR(100)` | NOT NULL | Display name (e.g., "KBank Savings") |
| `type` | `VARCHAR(20)` | NOT NULL, CHECK | `'cash'` \| `'bank'` \| `'e_wallet'` \| `'credit_card'` \| `'pay_later'` |
| `balance` | `DECIMAL(15,2)` | NOT NULL, DEFAULT `0` | **Cached** sum of transactions; never written except by transaction service |
| `currency` | `VARCHAR(3)` | NOT NULL | ISO 4217; defaults to user's currency at creation |
| `icon` | `VARCHAR(50)` | NULLABLE | UI icon identifier |
| `color` | `VARCHAR(7)` | NULLABLE | Hex color (`#RRGGBB`) |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'` \| `'closed'` |
| `credit_limit` | `DECIMAL(15,2)` | NULLABLE | Credit accounts only |
| `statement_date` | `SMALLINT` | NULLABLE, CHECK (1–31) | Day of month statement is generated |
| `payment_due_date` | `SMALLINT` | NULLABLE, CHECK (1–31) | Day of month payment is due |
| `minimum_payment` | `DECIMAL(15,2)` | NULLABLE | Minimum payment amount |
| `sort_order` | `INTEGER` | NOT NULL, DEFAULT `0` | Phase 2 — user-defined ordering |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `type IN ('cash', 'bank', 'e_wallet', 'credit_card', 'pay_later')`
- `status IN ('active', 'archived', 'closed')`
- `statement_date IS NULL OR statement_date BETWEEN 1 AND 31`
- `payment_due_date IS NULL OR payment_due_date BETWEEN 1 AND 31`

**API-layer rule:** if `type IN ('credit_card', 'pay_later')` → `credit_limit` required, others optional. Else → `credit_limit`, `statement_date`, `payment_due_date`, `minimum_payment` must all be NULL.

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_accounts_user ON accounts(user_id, status)` — list queries
- `INDEX idx_accounts_user_sort ON accounts(user_id, sort_order)` — Phase 2 ordering

---

## 04 — Transactions

Owned by [`../spec/04-transactions.md`](../spec/04-transactions.md).

### `transactions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | Owner (immutable after create) |
| `account_id` | `UUID` | FK → `accounts.id`, NOT NULL | The account debited or credited |
| `type` | `VARCHAR(10)` | NOT NULL, CHECK | `'expense'` \| `'income'` \| `'transfer'` |
| `amount` | `DECIMAL(15,2)` | NOT NULL, CHECK > 0 | Always positive; direction determined by `type` (and category for transfers) |
| `category_id` | `UUID` | FK → `categories.id`, NULLABLE | Required if `type = 'transfer'` (must be system Transfer IN/OUT); optional otherwise |
| `date` | `DATE` | NOT NULL | Transaction calendar date in user's tz |
| `note` | `TEXT` | NULLABLE | Free-text note (~500 chars advisory; no DB limit) |
| `project_id` | `UUID` | FK → `projects.id`, NULLABLE | **Auto-set only on rows that mirror a project**: a claim (`source_project_transaction_id` set) or a split-resolve (`source_split_id` set, where the split's parent is a `project_transactions` row). Never settable directly via `POST /v1/transactions`. |
| `scheduled_transaction_id` | `UUID` | FK → `scheduled_transactions.id`, NULLABLE | Set when auto-generated by scheduler |
| `transfer_group_id` | `UUID` | NULLABLE | Required when `type = 'transfer'`; pairs the two rows of a transfer |
| `source_split_id` | `UUID` | FK → `shared_expense_splits.id`, NULLABLE | Set when this transaction was created via a split-rooted resolve action (`pay` or `receive`) |
| `source_project_transaction_id` | `UUID` | FK → `project_transactions.id`, NULLABLE | Set when this transaction was created via the actor's claim of a project_transaction |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `type IN ('expense', 'income', 'transfer')`
- `amount > 0`
- At most one of `source_split_id` / `source_project_transaction_id` is set
- `project_id IS NOT NULL` ⇔ at least one of `source_split_id` / `source_project_transaction_id` is set

**API-layer cross-field rules:**
- `type = 'transfer'` → `transfer_group_id IS NOT NULL` AND `category_id IS NOT NULL` (must be system `Transfer IN` or `Transfer OUT`)
- `type IN ('expense', 'income')` → `transfer_group_id IS NULL`
- If `source_split_id` set → `type` must match caller's role on the split (`expense` for debtor / `income` for creditor); `project_id` auto-set from split's parent's `project_id` (or NULL if parent is non-project personal transaction)
- If `source_project_transaction_id` set → caller must be the actor (linked user behind the project_transaction's `transaction_member_id`); `type` matches source's `type`; `project_id` auto-set from source's `project_id`

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_transactions_user_date ON transactions(user_id, date DESC, created_at DESC)`
- `INDEX idx_transactions_account_date ON transactions(account_id, date DESC, created_at DESC)`
- `INDEX idx_transactions_category ON transactions(category_id, date DESC) WHERE category_id IS NOT NULL`
- `INDEX idx_transactions_project ON transactions(project_id, date DESC) WHERE project_id IS NOT NULL`
- `INDEX idx_transactions_scheduled ON transactions(scheduled_transaction_id) WHERE scheduled_transaction_id IS NOT NULL`
- `INDEX idx_transactions_transfer_group ON transactions(transfer_group_id) WHERE transfer_group_id IS NOT NULL`
- `INDEX idx_transactions_source_split ON transactions(source_split_id) WHERE source_split_id IS NOT NULL` — settlement state computation
- `INDEX idx_transactions_source_pt ON transactions(source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL` — claim lookup

**Intentionally absent:** `currency` (inherited from `account.currency`), `photo_url` (Phase 2 OCR without storage), `saving_goal_id` (computed from balance × allocation), `is_split` boolean (inferable from existence of splits).

---

## 05 — Categories & Tags

Owned by [`../spec/05-categories-tags.md`](../spec/05-categories-tags.md).

### `categories`

Hierarchical, up to 3 levels deep.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner |
| `name` | `VARCHAR(100)` | NOT NULL | Display name |
| `type` | `VARCHAR(10)` | NOT NULL, CHECK | `'income'` \| `'expense'` |
| `parent_id` | `UUID` | FK → `categories.id`, NULLABLE | NULL = root |
| `is_system` | `BOOLEAN` | NOT NULL, DEFAULT `false` | System categories cannot be deleted |
| `icon` | `VARCHAR(50)` | NULLABLE | Icon identifier |
| `color` | `VARCHAR(7)` | NULLABLE | Hex color |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `type IN ('income', 'expense')`
- `status IN ('active', 'archived')`
- `id != parent_id` — no self-parenting
- System categories (`is_system = true`) cannot have a parent (API-enforced)

**API-layer 3-layer depth limit:** backend walks up from candidate `parent_id` counting hops; reject if > 3 with `400 MAX_DEPTH_EXCEEDED`.

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_categories_user ON categories(user_id, status)` — list queries
- `INDEX idx_categories_parent ON categories(parent_id)` — tree traversal
- `UNIQUE INDEX idx_categories_name ON categories(user_id, type, parent_id, LOWER(name)) WHERE status = 'active'` — case-insensitive uniqueness per (user, type, parent_id); archived rows excluded for name reuse

### `tags`

Flat, no hierarchy.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner |
| `name` | `VARCHAR(50)` | NOT NULL | Label text |
| `color` | `VARCHAR(7)` | NULLABLE | Hex color |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_tags_name ON tags(user_id, LOWER(name))` — case-insensitive uniqueness
- `INDEX idx_tags_user ON tags(user_id)`

### `transaction_tags`

Many-to-many junction.

| Column | Type | Constraints |
|---|---|---|
| `transaction_id` | `UUID` | FK → `transactions.id`, ON DELETE CASCADE |
| `tag_id` | `UUID` | FK → `tags.id`, ON DELETE CASCADE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE — NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` — Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE — NULL = system |

Primary key: `(transaction_id, tag_id)`. Junction rows are typically immutable (insert/delete only); `updated_at` / `updated_by_user_id` are present for uniformity but rarely change.

---

## 06 — Shared Expenses (Splits)

Owned by [`../spec/06-shared-expenses.md`](../spec/06-shared-expenses.md).

### `shared_expense_splits`

One row per debtor on a transaction. The parent is polymorphic — either a personal `transactions` row or a `project_transactions` row.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | The stable split identifier — referenced by `transactions.source_split_id` and `personal_debts.source_split_id` |
| `source_transaction_id` | `UUID` | FK → `transactions.id`, NULLABLE, ON DELETE CASCADE | Set when parent is a personal transaction |
| `source_project_transaction_id` | `UUID` | FK → `project_transactions.id`, NULLABLE, ON DELETE CASCADE | Set when parent is a project_transaction |
| `person_name` | `VARCHAR(100)` | NULLABLE | Free-text ad-hoc debtor. Allowed when parent is a personal `transactions` row. |
| `contact_id` | `UUID` | FK → `contacts.id`, NULLABLE | From parent owner's contact book. Allowed when parent is a personal `transactions` row. |
| `project_member_id` | `UUID` | FK → `project_members.id`, NULLABLE | From the parent project's member list. **Allowed only when parent is a `project_transactions` row** (or a personal mirror of one — splits migrate at claim). |
| `split_type` | `VARCHAR(20)` | NOT NULL, DEFAULT `'fixed'`, CHECK | `'fixed'` \| `'percent'` (display metadata; tracking uses `owed_amount`) |
| `split_ratio` | `DECIMAL(5,2)` | NULLABLE | Populated if `split_type='percent'` |
| `owed_amount` | `DECIMAL(15,2)` | NOT NULL, CHECK > 0 | Amount this person owes |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- Exactly one of `source_transaction_id` / `source_project_transaction_id` is set:
  ```sql
  (source_transaction_id IS NOT NULL)::int + (source_project_transaction_id IS NOT NULL)::int = 1
  ```
- Exactly one of `person_name` / `contact_id` / `project_member_id` is set:
  ```sql
  (person_name IS NOT NULL)::int + (contact_id IS NOT NULL)::int + (project_member_id IS NOT NULL)::int = 1
  ```
- `split_type IN ('fixed', 'percent')`
- `owed_amount > 0`

**API-layer debtor-context gating** (parent ledger determines allowed debtor identifier):
- `source_project_transaction_id IS NOT NULL` → debtor MUST be `project_member_id`
- `source_transaction_id IS NOT NULL` AND parent's `project_id IS NULL` → debtor MUST be `contact_id` or `person_name`
- `source_transaction_id IS NOT NULL` AND parent's `project_id IS NOT NULL` → debtor MUST be `project_member_id` (post-claim case; splits migrated from project_transaction)

**Notably absent:** `paid_amount`, `is_settled` — settlement is per-caller computed from personal `transactions.source_split_id`. The `split_settlements` table from earlier drafts was also dropped.

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_splits_source_tx ON shared_expense_splits(source_transaction_id) WHERE source_transaction_id IS NOT NULL`
- `INDEX idx_splits_source_pt ON shared_expense_splits(source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL`
- `INDEX idx_splits_contact ON shared_expense_splits(contact_id) WHERE contact_id IS NOT NULL`
- `INDEX idx_splits_project_member ON shared_expense_splits(project_member_id) WHERE project_member_id IS NOT NULL`

---

## 07 — Contacts

Owned by [`../spec/07-contacts.md`](../spec/07-contacts.md).

### `contacts`

One row per contact owned by a user. May or may not be linked to another app user via `app_user_id`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner |
| `display_name` | `VARCHAR(100)` | NOT NULL | Primary label |
| `nickname` | `VARCHAR(100)` | NULLABLE | Informal label preferred in UI when set |
| `email` | `VARCHAR(255)` | NULLABLE | Optional; not used for linking in Phase 1b |
| `phone` | `VARCHAR(50)` | NULLABLE | Optional; informational |
| `notes` | `TEXT` | NULLABLE | User free-form notes |
| `icon` | `VARCHAR(50)` | NULLABLE | Preset icon identifier |
| `app_user_id` | `UUID` | FK → `users.id`, NULLABLE | Set when contact is linked to an app user |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `status IN ('active', 'archived')`
- `user_id != app_user_id` — cannot link a contact to yourself

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_contacts_user ON contacts(user_id, status)` — list queries
- `INDEX idx_contacts_name ON contacts(user_id, LOWER(display_name))` — autocomplete / search
- `UNIQUE INDEX idx_contacts_app_user ON contacts(user_id, app_user_id) WHERE app_user_id IS NOT NULL` — one contact per (user, linked app user); allows multiple `app_user_id IS NULL`
- `INDEX idx_contacts_linked_user ON contacts(app_user_id) WHERE app_user_id IS NOT NULL` — reverse query for "find all contacts that link to me"

### `contact_invites`

Short-lived invite codes for linking a contact to an app user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `contact_id` | `UUID` | FK → `contacts.id`, NOT NULL, ON DELETE CASCADE | The contact being linked |
| `invite_code` | `VARCHAR(16)` | NOT NULL, UNIQUE | Random 8-char code |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Issued + 7 days |
| `accepted_at` | `TIMESTAMPTZ` | NULLABLE | Set when consumed |
| `accepted_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | Populated on acceptance for audit |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = contact's owner |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_contact_invites_code ON contact_invites(invite_code)` — fast acceptance lookup
- `INDEX idx_contact_invites_contact ON contact_invites(contact_id)`

Codes are single-use. At most one live invite per contact at a time (API-layer check).

---

## 08 — Budgets

Owned by [`../spec/08-budgets.md`](../spec/08-budgets.md).

### `budgets`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | Owner |
| `category_id` | `UUID` | FK → `categories.id`, NOT NULL | Target category |
| `scope` | `VARCHAR(20)` | NOT NULL, CHECK | `'user'` \| `'project'` |
| `project_id` | `UUID` | FK → `projects.id`, NULLABLE | Set when `scope='project'` |
| `amount` | `DECIMAL(15,2)` | NOT NULL, CHECK > 0 | Spending limit |
| `period` | `VARCHAR(20)` | NOT NULL, CHECK | `'weekly'` \| `'monthly'` \| `'yearly'` |
| `currency` | `VARCHAR(3)` | NOT NULL | ISO 4217; defaults to user's currency |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `scope IN ('user', 'project')`
- `period IN ('weekly', 'monthly', 'yearly')`
- `status IN ('active', 'archived')`
- `(scope = 'project') = (project_id IS NOT NULL)` — project_id set iff scope is project
- `amount > 0`

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_budgets_user_category_period ON budgets(user_id, category_id, period, COALESCE(project_id, '00000000-0000-0000-0000-000000000000')) WHERE status = 'active'` — one active budget per (user, category, period, project-scope)
- `INDEX idx_budgets_user ON budgets(user_id, status)` — list queries
- `INDEX idx_budgets_project ON budgets(project_id) WHERE project_id IS NOT NULL` — project-scope queries

**No historical snapshot table.** Period usage is computed at read time. Phase 3+ may add `budget_usage` materialized snapshots if read performance degrades.

---

## 09 — Saving Goals

Owned by [`../spec/09-saving-goals.md`](../spec/09-saving-goals.md).

### `saving_goals`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | Owner |
| `name` | `VARCHAR(100)` | NOT NULL | Goal name |
| `target_amount` | `DECIMAL(15,2)` | NOT NULL, CHECK > 0 | |
| `linked_account_id` | `UUID` | FK → `accounts.id`, NOT NULL | The account holding the money |
| `allocation_pct` | `DECIMAL(5,2)` | NOT NULL, CHECK > 0 AND ≤ 100 | % of linked account's balance counting toward this goal |
| `deadline` | `DATE` | NULLABLE | Optional target date |
| `icon` | `VARCHAR(50)` | NULLABLE | |
| `color` | `VARCHAR(7)` | NULLABLE | |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'` |
| `note` | `TEXT` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `target_amount > 0`
- `allocation_pct > 0 AND allocation_pct <= 100`
- `status IN ('active', 'archived')`

**API-layer allocation sum constraint:** for any `linked_account_id`, the sum of `allocation_pct` across `status='active'` goals must be ≤ 100. Enforced on create / update / restore.

**No stored progress.** `current_amount` is computed from `linked_account.balance × allocation_pct / 100`; `is_completed` from `current_amount >= target_amount`; `currency` inherits from `linked_account.currency`.

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_saving_goals_user ON saving_goals(user_id, status)` — list queries
- `INDEX idx_saving_goals_account ON saving_goals(linked_account_id, status)` — account allocation queries

---

## 10 — Projects

Owned by [`../spec/10-projects.md`](../spec/10-projects.md).

### `projects`

Thin container for a project.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `owner_user_id` | `UUID` | FK → `users.id`, NOT NULL | Current owner (mutable via ownership transfer) |
| `name` | `VARCHAR(100)` | NOT NULL | Display name (e.g., "Japan Trip 2026") |
| `type` | `VARCHAR(30)` | NULLABLE | `'trip'` \| `'sales'` \| `'freelance'` \| `'other'` (free-form enum, API-validated) |
| `description` | `TEXT` | NULLABLE | |
| `start_date` | `DATE` | NULLABLE | |
| `end_date` | `DATE` | NULLABLE | |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'completed'` \| `'cancelled'` \| `'archived'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_projects_owner ON projects(owner_user_id, status)` — owner's projects list
- `INDEX idx_projects_status ON projects(status, updated_at DESC)` — member queries

**No `budget_goal` column** — per-project budget tracking is a Phase 2+ feature.

### `project_members`

Member identity within a project. Three kinds of member share this table: linked (`user_id IS NOT NULL`), contact (`contact_id IS NOT NULL`, `user_id IS NULL`), ad-hoc (both NULL).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | The stable `member_id` within the project |
| `project_id` | `UUID` | FK → `projects.id`, NOT NULL, ON DELETE CASCADE | |
| `user_id` | `UUID` | FK → `users.id`, NULLABLE | Set after invite accepted |
| `contact_id` | `UUID` | FK → `contacts.id`, NULLABLE | Set if added from contact book |
| `display_name` | `VARCHAR(100)` | NOT NULL | Shown in project UI; always available |
| `role` | `VARCHAR(20)` | NOT NULL, DEFAULT `'contributor'`, CHECK | `'owner'` \| `'contributor'` \| `'viewer'` |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'pending'`, CHECK | `'pending'` \| `'active'` \| `'left'` |
| `invited_at` | `TIMESTAMPTZ` | NULLABLE | Set when invite was generated |
| `joined_at` | `TIMESTAMPTZ` | NULLABLE | Set when user_id populated via invite accept |
| `left_at` | `TIMESTAMPTZ` | NULLABLE | Set on leave (soft-remove) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Constraints:**
- `role IN ('owner', 'contributor', 'viewer')`
- `status IN ('pending', 'active', 'left')`
- At most one role-`owner` per project (unique partial index)
- `UNIQUE (project_id, user_id) WHERE user_id IS NOT NULL` — a user can be at most one member per project

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_project_members_user ON project_members(project_id, user_id) WHERE user_id IS NOT NULL`
- `INDEX idx_project_members_project ON project_members(project_id, status)` — active-member queries
- `INDEX idx_project_members_user_reverse ON project_members(user_id, status) WHERE user_id IS NOT NULL` — user's project list
- `UNIQUE INDEX idx_project_members_owner ON project_members(project_id) WHERE role = 'owner'` — one owner enforced

### `project_invites`

Short-lived codes for inviting someone to join a project as a linked member.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `project_member_id` | `UUID` | FK → `project_members.id`, NOT NULL, ON DELETE CASCADE | The member row this invite populates on accept |
| `invite_code` | `VARCHAR(16)` | NOT NULL, UNIQUE | 8-char alphanumeric, unambiguous set (no `0/O/1/I`) |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Issued + 7 days |
| `accepted_at` | `TIMESTAMPTZ` | NULLABLE | |
| `accepted_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | Populated on accept |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = project owner who issued the invite |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

At most one live invite per member row at a time (API-layer check).

### `project_transactions`

The canonical project ledger. Every transaction recorded in a project context goes here, regardless of the actor's member type. No personal account is touched at insert time. Field names mirror the personal `transactions` table where parallel.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `project_id` | `UUID` | FK → `projects.id`, NOT NULL, ON DELETE CASCADE | |
| `transaction_member_id` | `UUID` | FK → `project_members.id`, NOT NULL | Whose transaction this is — the member whose money moved (parallel to `transactions.user_id`). May be ad-hoc, contact, or linked. |
| `record_user_id` | `UUID` | FK → `users.id`, NOT NULL | The linked user who recorded this row. Owns edit/delete rights (with owner override). |
| `type` | `VARCHAR(20)` | NOT NULL, CHECK | `'expense'` \| `'income'`. Transfers excluded — no accounts on either end. |
| `amount` | `NUMERIC(18,4)` | NOT NULL, CHECK > 0 | |
| `currency` | `VARCHAR(3)` | NOT NULL | ISO 4217 |
| `date` | `DATE` | NOT NULL | |
| `category_id` | `UUID` | FK → `categories.id`, NULLABLE | Phase 1b: nullable, typically left null. Project-scoped categories deferred. |
| `note` | `TEXT` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Constraints:**
- `type IN ('expense', 'income')`
- `amount > 0`
- `transaction_member_id` must belong to the same `project_id` (API-validated; cross-project mismatch rejected)

**No `account_id`** — project_transactions never hit a personal account. Real money movement happens via claim (the actor mirrors onto their personal book) or via split-resolve (debtors/creditors create personal entries).

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_project_tx_project ON project_transactions(project_id, date DESC)` — shared-book queries
- `INDEX idx_project_tx_member ON project_transactions(transaction_member_id)` — "this member's project_transactions"
- `INDEX idx_project_tx_recorder ON project_transactions(record_user_id)` — audit / "what did Alice record"

---

## 11 — Scheduled Transactions

Owned by [`../spec/11-scheduled-transactions.md`](../spec/11-scheduled-transactions.md).

### `scheduled_transactions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | Owner |
| `account_id` | `UUID` | FK → `accounts.id`, NOT NULL | Account to debit/credit when generating |
| `name` | `VARCHAR(100)` | NOT NULL | Display name ("Netflix", "Car loan") |
| `type` | `VARCHAR(10)` | NOT NULL, CHECK | `'expense'` \| `'income'` — direction of generated transactions |
| `entry_type` | `VARCHAR(20)` | NOT NULL, CHECK | `'recurring'` \| `'installment'` |
| `amount` | `DECIMAL(15,2)` | NOT NULL, CHECK > 0 | Amount per generated cycle |
| `category_id` | `UUID` | FK → `categories.id`, NULLABLE | Category applied to generated transactions |
| `billing_cycle` | `VARCHAR(20)` | NOT NULL, CHECK | `'daily'` \| `'weekly'` \| `'monthly'` \| `'yearly'` |
| `next_billing_date` | `DATE` | NOT NULL | Next date the scheduler should fire |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'paused'` \| `'cancelled'` \| `'completed'` |
| `note` | `TEXT` | NULLABLE | |
| **Installment-only fields** | | | NULL when `entry_type = 'recurring'` |
| `total_amount` | `DECIMAL(15,2)` | NULLABLE | Total to be paid over all installments (principal + interest) |
| `down_payment` | `DECIMAL(15,2)` | NULLABLE | Initial lump sum (separate from cyclic payments) |
| `total_installments` | `INTEGER` | NULLABLE, CHECK > 0 | Total number of cyclic payments |
| `remaining_installments` | `INTEGER` | NULLABLE, CHECK ≥ 0 | Countdown; auto-completes when hits 0 |
| `interest_rate` | `DECIMAL(5,2)` | NULLABLE | Annual % for loans (display-only in Phase 1c) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `type IN ('expense', 'income')`
- `entry_type IN ('recurring', 'installment')`
- `billing_cycle IN ('daily', 'weekly', 'monthly', 'yearly')`
- `status IN ('active', 'paused', 'cancelled', 'completed')`
- `amount > 0`

**API-layer rules:**
- `entry_type = 'recurring'` → `total_amount`, `down_payment`, `total_installments`, `remaining_installments`, `interest_rate` all NULL
- `entry_type = 'installment'` → `total_amount IS NOT NULL` AND `total_installments IS NOT NULL` AND `remaining_installments IS NOT NULL`

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_scheduled_transactions_user ON scheduled_transactions(user_id, status)` — user's active schedules
- `INDEX idx_scheduled_transactions_next_billing ON scheduled_transactions(next_billing_date, status) WHERE status = 'active'` — scheduler's "due today" query
- `INDEX idx_scheduled_transactions_account ON scheduled_transactions(account_id, status)`

---

## 12 — Personal Debts

Owned by [`../spec/12-personal-debts.md`](../spec/12-personal-debts.md).

### `personal_debts`

User-side debt records. Independent of splits — can be created manually OR automatically from a split via `add-as-debt`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL, ON DELETE CASCADE | The debtor (always the row owner) |
| `creditor_contact_id` | `UUID` | FK → `contacts.id`, NULLABLE | If creditor is in the debtor's contact book (linked or unlinked) |
| `creditor_person_name` | `VARCHAR(100)` | NOT NULL | Display name; always set. When `creditor_contact_id` is NULL, this IS the creditor identifier (free text) |
| `source_split_id` | `UUID` | FK → `shared_expense_splits.id`, NULLABLE, ON DELETE SET NULL | Link back to the originating split (if from `add-as-debt`) |
| `project_id` | `UUID` | FK → `projects.id`, NULLABLE | Contextual project |
| `amount` | `DECIMAL(15,2)` | NOT NULL, CHECK > 0 | Original amount owed |
| `paid_amount` | `DECIMAL(15,2)` | NOT NULL, DEFAULT `0` | Sum of payments — auto-bumped when caller's personal `transactions` with matching `source_split_id` land |
| `currency` | `VARCHAR(3)` | NOT NULL | Inherited from source split's parent's currency, or specified manually |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'open'`, CHECK | `'open'` \| `'paid'` \| `'cancelled'` |
| `note` | `TEXT` | NULLABLE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

**Check constraints:**
- `status IN ('open', 'paid', 'cancelled')`
- `paid_amount <= amount`
- `status = 'paid'` ⇔ `paid_amount >= amount` (enforced at app layer atomically with `paid_amount` updates)

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_personal_debts_source ON personal_debts(user_id, source_split_id) WHERE source_split_id IS NOT NULL` — prevent double-tracking the same split
- `INDEX idx_personal_debts_user ON personal_debts(user_id, status)` — "my debts" report
- `INDEX idx_personal_debts_creditor_contact ON personal_debts(creditor_contact_id) WHERE creditor_contact_id IS NOT NULL`
- `INDEX idx_personal_debts_project ON personal_debts(project_id) WHERE project_id IS NOT NULL`

**Notably absent:** `creditor_member_id` — dropped under the unified model. Creditor is always identified by `creditor_contact_id` + `creditor_person_name`.

---

## 13 — Notifications

Owned by [`../spec/13-notifications.md`](../spec/13-notifications.md).

### `notifications`

In-app notification rows. One row per recipient per event.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK (v7) | |
| `recipient_user_id` | `UUID` | FK → `users.id`, NOT NULL, ON DELETE CASCADE | |
| `type` | `VARCHAR(50)` | NOT NULL, CHECK | See trigger registry in spec §2 |
| `actor_user_id` | `UUID` | FK → `users.id`, NULLABLE | The user whose action caused this notification. NULL for system events. |
| `payload` | `JSONB` | NOT NULL | Event-specific context (`split_id`, `project_id`, `amount`, etc.) — per-type shapes in spec §2 |
| `deep_link` | `VARCHAR(500)` | NULLABLE | Client routing hint |
| `read_at` | `TIMESTAMPTZ` | NULLABLE | Set when the user opens the inbox and sees it |
| `actioned_at` | `TIMESTAMPTZ` | NULLABLE | Set when the user taps through and takes the suggested action |
| `dismissed_at` | `TIMESTAMPTZ` | NULLABLE | Set when the user explicitly dismisses without acting |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system event; usually equals `actor_user_id` for user-triggered events |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated (bumps when `read_at` / `actioned_at` / `dismissed_at` set) |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system; usually = `recipient_user_id` after read/action/dismiss |

**Check constraints:**
- `type IN (...)` — see trigger registry in spec §2
- At most one of `actioned_at` / `dismissed_at` is set (mutually exclusive terminal states)

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX idx_notifications_recipient_unread ON notifications(recipient_user_id, created_at DESC) WHERE read_at IS NULL` — inbox unread query
- `INDEX idx_notifications_recipient_all ON notifications(recipient_user_id, created_at DESC)` — full inbox query
- `INDEX idx_notifications_actor ON notifications(actor_user_id) WHERE actor_user_id IS NOT NULL` — debug / audit

### `user_notification_settings`

Per-user notification preferences. (May be physically merged into a broader `user_settings` table in 02 — see spec note.)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `UUID` | PK, FK → `users.id`, ON DELETE CASCADE | |
| `auto_notify_linked_split_contacts` | `BOOLEAN` | NOT NULL, DEFAULT `true` | When I split with a linked contact, send notification automatically |
| `auto_add_to_personal_debt_on_split_notification` | `BOOLEAN` | NOT NULL, DEFAULT `false` | When someone splits with me, auto-create a `personal_debts` row |
| `auto_record_received_payment` | `BOOLEAN` | NOT NULL, DEFAULT `false` | When someone notifies me they paid, auto-create my receipt |
| `auto_resolve_own_in_projects` | `BOOLEAN` | NOT NULL, DEFAULT `false` | When I save a project_transaction I'm involved in, skip the modal |
| `default_account_id` | `UUID` | FK → `accounts.id`, NULLABLE | Account to use when any of the above fire automatically |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `created_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Trigger-updated |
| `updated_by_user_id` | `UUID` | FK → `users.id`, NULLABLE | NULL = system |

A row is auto-created on user registration with all defaults.

---

## Status

- **Last updated** — 2026-04-26
- **Version** — 0.4 (locked in FK naming rule: every FK ends in `<target_table>_id`, role-prefixed when not the row's primary owner. Renamed `created_by` → `created_by_user_id` and `updated_by` → `updated_by_user_id` everywhere. Added compound-table-name carve-out so descriptive names like `shared_expense_splits` survive — FKs may use unambiguous abbreviations like `source_split_id`.)
- **Version** — 0.3 (added `archived` user status + anonymize-on-delete flow; users are never hard-deleted so audit-column references survive forever)
- **Version** — 0.2 (added uniform audit-column standard on every table, nullable, NULL = system)
