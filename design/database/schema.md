# Database Schema — All Tables

Single consolidated reference for every table in the system. Ordered by owning spec module (matches numbering in [`../spec/`](../spec/)).

For module behavior, API endpoints, design rationale, and cross-table invariants (split context gating, splits-migrate-on-claim, etc.) see thVe spec file linked at each section header.

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
  - **No polymorphic columns** (no `*_type` discriminator) when the FK is structural (the row has exactly one parent / target across distinct tables). Use one nullable FK per possible target + CHECK that exactly one is set. Example: `shared_expense_splits.source_transaction_id` XOR `source_project_transaction_id` (a split has one parent ledger). For _optional decorations_ on a row (the row exists without them and they may coexist), separate nullable FKs without an XOR are correct — see `shared_expense_splits.contact_id` + `project_member_id`.
- **Audit columns (standard on every table):** `created_at`, `created_by_user_id`, `updated_at`, `updated_by_user_id`.
  - `created_by_user_id` / `updated_by_user_id` are nullable `UUID` FKs to `users.id`. `NULL` = system-generated (e.g., scheduler-fired transactions, auto-created preferences at registration, system token issuance).
  - App layer sets these on INSERT / UPDATE; DB does not auto-fill them.
  - For tables where the row's natural lifecycle is fully system-driven (token tables, junction tables, notifications), the columns are still present for uniformity — `created_by_user_id` / `updated_by_user_id` will simply be `NULL` in normal operation.
- API-layer enforced rules (vs DB CHECK) are explicitly noted.
- **`icon_code` JSONB shape** — used on all customizable entities (users, accounts, categories, tags, contacts, projects, project_members, saving_goals, budgets, scheduled_transactions). The column is NULLABLE — `NULL` means the entity uses its module default (e.g., initials for users, first base-pack icon for accounts).
  ```json
  {
    "icon":         "string | null",
    "iconColors":   ["#RRGGBB"],
    "background":   "string | null",
    "bgColors":     ["#RRGGBB"],
    "border":       "string | null",
    "borderColors": ["#RRGGBB"]
  }
  ```
  Art IDs are resolved by the frontend IconMaker registry and are never stored as file paths. `null` on any layer means that layer is not applied. Color arrays contain 0–3 hex strings depending on how many color slots the selected art exposes.

---

## Table of contents

| Module                                                                      | Tables                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [01 — Auth](#01--auth)                                                      | `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_identities` |
| [02 — Users](#02--users)                                                    | `users` (additions), `user_preferences`, `notification_preferences`, `user_pack_permissions`        |
| [03 — Accounts](#03--accounts)                                              | `accounts`                                                                                          |
| [04 — Transactions](#04--transactions)                                      | `transactions`                                                                                      |
| [05 — Categories & Tags](#05--categories--tags)                             | `categories`, `tags`, `transaction_tags`                                                            |
| [06 — (Removed: shared_expense_splits)](#06--removed-shared_expense_splits) | _merged into §12_                                                                                   |
| [07 — Contacts](#07--contacts)                                              | `contacts`                                                                                          |
| [08 — Budgets](#08--budgets)                                                | `budgets`                                                                                           |
| [09 — Saving Goals](#09--saving-goals)                                      | `saving_goals`                                                                                      |
| [10 — Projects](#10--projects)                                              | `projects`, `project_members`, `project_transactions`                                               |
| [11 — Scheduled Transactions](#11--scheduled-transactions)                  | `scheduled_transactions`                                                                            |
| [12 — Personal Debts](#12--personal-debts)                                  | `personal_debts`                                                                                    |
| [13 — Notifications](#13--notifications)                                    | `notifications`, `user_notification_settings`                                                       |

---

## 01 — Auth

Owned by [`../spec/01-auth.md`](../spec/01-auth.md).

### `users`

Stores identity. Profile and preference columns are also here but documented in [`../spec/02-users.md`](../spec/02-users.md) — they're listed below for completeness since this is the table of record.

| Column               | Type           | Constraints                                          | Description                                                 |
| -------------------- | -------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                                              | Unique user identifier                                      |
| `username`           | `VARCHAR(50)`  | UNIQUE, NOT NULL                                     | Login handle; lowercase, `[a-z0-9_-]`, 3–50 chars           |
| `email`              | `VARCHAR(255)` | UNIQUE, NULLABLE _(Phase 1)_ / NOT NULL _(Phase 2+)_ | Optional in Phase 1; required when email verification ships |
| `email_verified_at`  | `TIMESTAMPTZ`  | NULLABLE                                             | Set when user completes verification flow _(Phase 2+)_      |
| `display_name`       | `VARCHAR(100)` | NOT NULL                                             | Shown in UI; free text, any Unicode                         |
| `password_hash`      | `VARCHAR(255)` | NOT NULL                                             | argon2id encoded hash (includes salt + params)              |
| `currency`           | `VARCHAR(3)`   | NOT NULL, DEFAULT `'THB'`                            | ISO 4217 default currency (preference)                      |
| `icon_code`          | `JSONB`        | NULLABLE                                             | Icon Maker code — see _icon_code JSONB shape_ convention above |
| `status`             | `VARCHAR(30)`  | NOT NULL, DEFAULT `'active'`, CHECK                  | See `02-users` §1.1 — phase-gated CHECK list                |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                            |                                                             |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                            | NULL = system                                               |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                            | Trigger-updated                                             |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                            | NULL = system                                               |

**Indexes:**

- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_users_username ON users(username)`
- `UNIQUE INDEX idx_users_email ON users(email)` — PostgreSQL allows multiple NULLs in UNIQUE, so this works while email is optional

**Trigger:** `set_timestamp` — updates `updated_at` before row update.

### `refresh_tokens` _(Phase 2+)_

Server-side refresh-token store. Introduced when token strategy shifts from a single 30-day JWT to 15-min access + 7-day refresh.

| Column               | Type           | Constraints                                  | Description                                                                 |
| -------------------- | -------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                                      |                                                                             |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                                                       |
| `token_hash`         | `VARCHAR(255)` | NOT NULL, UNIQUE                             | SHA-256 of the refresh token (never store plaintext)                        |
| `issued_at`          | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    |                                                                             |
| `expires_at`         | `TIMESTAMPTZ`  | NOT NULL                                     | Issued + 7 days                                                             |
| `revoked_at`         | `TIMESTAMPTZ`  | NULLABLE                                     | Set on logout, rotation, or revoke-all                                      |
| `replaced_by_id`     | `UUID`         | FK → `refresh_tokens.id`, NULLABLE           | Set when rotated; points to the successor token                             |
| `user_agent`         | `TEXT`         | NULLABLE                                     | For audit / "signed-in devices" UI                                          |
| `ip`                 | `VARCHAR(45)`  | NULLABLE                                     | IPv4 or IPv6                                                                |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Mirrors `issued_at`; included for uniform audit standard                    |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system (auth handler issues tokens server-side)                      |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated (bumps on revoke / rotation)                                |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system; set when revoke triggered by user action (logout/revoke-all) |

### `email_verification_tokens` _(Phase 2+)_

Short-lived tokens for email verification and email-change verification.

| Column               | Type           | Constraints               | Description                                       |
| -------------------- | -------------- | ------------------------- | ------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                   |                                                   |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL |                                                   |
| `token_hash`         | `VARCHAR(255)` | NOT NULL, UNIQUE          | SHA-256 of the token                              |
| `purpose`            | `VARCHAR(30)`  | NOT NULL                  | `'verify'` \| `'change_email'`                    |
| `new_email`          | `VARCHAR(255)` | NULLABLE                  | Populated only for `change_email`                 |
| `expires_at`         | `TIMESTAMPTZ`  | NOT NULL                  | Issued + 1 hour                                   |
| `used_at`            | `TIMESTAMPTZ`  | NULLABLE                  | Set on successful consumption                     |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()` |                                                   |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE | NULL = system (issued by verification flow)       |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()` | Trigger-updated (bumps when `used_at` set)        |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE | NULL = system; usually = `user_id` on consumption |

### `password_reset_tokens` _(Phase 2+)_

Short-lived tokens for password reset.

| Column               | Type           | Constraints               | Description                                       |
| -------------------- | -------------- | ------------------------- | ------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                   |                                                   |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL |                                                   |
| `token_hash`         | `VARCHAR(255)` | NOT NULL, UNIQUE          | SHA-256 of the token                              |
| `expires_at`         | `TIMESTAMPTZ`  | NOT NULL                  | Issued + 30 minutes                               |
| `used_at`            | `TIMESTAMPTZ`  | NULLABLE                  | Set on successful use                             |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()` |                                                   |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE | NULL = system (issued by reset flow)              |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()` | Trigger-updated (bumps when `used_at` set)        |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE | NULL = system; usually = `user_id` on consumption |

### `oauth_identities` _(Phase 3+)_

Links a user to an external OAuth provider (Google, etc.).

| Column               | Type           | Constraints               | Description                                     |
| -------------------- | -------------- | ------------------------- | ----------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                   |                                                 |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL |                                                 |
| `provider`           | `VARCHAR(30)`  | NOT NULL                  | `'google'` (extensible)                         |
| `provider_user_id`   | `VARCHAR(255)` | NOT NULL                  | ID from the provider                            |
| `email`              | `VARCHAR(255)` | NOT NULL                  | Email reported by the provider at link time     |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()` |                                                 |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE | NULL = system (OAuth callback runs server-side) |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()` | Trigger-updated                                 |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE | NULL = system                                   |

- `UNIQUE (provider, provider_user_id)` — same external account can only link to one app user

---

## 02 — Users

Owned by [`../spec/02-users.md`](../spec/02-users.md).

### `users` — additions owned by this module

The base `users` table is in [01 — Auth](#users) above. This module owns the editable profile/preference columns: `display_name`, `icon_code`, `currency`, `status`.

#### `status` column

| Column   | Type          | Constraints                         | Description    |
| -------- | ------------- | ----------------------------------- | -------------- |
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
2. After 30 days → anonymize PII (`email = NULL`, `display_name = '[deleted]'`, `icon_code = NULL`, `password_hash = ''`) and set `status = 'archived'`
3. The row stays forever. The `id` remains valid so all `created_by_user_id` / `updated_by_user_id` / FK references continue to resolve.

**No hard delete.** `users` rows are never physically deleted — only anonymized + archived. This preserves historical attribution (audit trail) and avoids breaking other users' data (project members, contact links, splits, etc.).

### `user_preferences`

One row per user, 1:1 with `users`. Preferences are stored as a JSONB blob so new keys can be added without DB migrations. Auto-created at registration with defaults.

| Column               | Type          | Constraints                            | Description                                  |
| -------------------- | ------------- | -------------------------------------- | -------------------------------------------- |
| `user_id`            | `UUID`        | PK, FK → `users.id`, ON DELETE CASCADE |                                              |
| `preferences`        | `JSONB`       | NOT NULL, DEFAULT `'{}'::jsonb`        | User-editable preferences                    |
| `created_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              |                                              |
| `created_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system (auto-created at registration) |
| `updated_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              | Trigger-updated                              |
| `updated_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system; usually = `user_id`           |

**Default at registration:**

```json
{ "timezone": "Asia/Bangkok", "theme": "system", "language": "th" }
```

**Known JSONB keys** (typed at app layer):

| Key        | Type   | Phase | Allowed values                      |
| ---------- | ------ | ----- | ----------------------------------- |
| `timezone` | string | 1     | IANA tz identifier                  |
| `theme`    | string | 2     | `"light"` \| `"dark"` \| `"system"` |
| `language` | string | 2     | IETF tag                            |

Unknown keys are ignored on read, rejected on write.

**Indexes:** `PRIMARY KEY (user_id)`.

### `notification_preferences` _(Phase 2+)_

Per-event-type notification channel toggles. One row per (user, event_type) pair. Distinct from `user_notification_settings` (in 13) — this table is per-event channel control; the other is global behavior toggles.

| Column               | Type          | Constraints                            | Description                                                            |
| -------------------- | ------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `user_id`            | `UUID`        | PK, FK → `users.id`, ON DELETE CASCADE |                                                                        |
| `event_type`         | `VARCHAR(50)` | PK, NOT NULL                           | e.g., `'split_assigned'`, `'settlement_received'`, `'budget_exceeded'` |
| `push_enabled`       | `BOOLEAN`     | NOT NULL, DEFAULT `true`               | Mobile push                                                            |
| `email_enabled`      | `BOOLEAN`     | NOT NULL, DEFAULT `false`              | Email (default off)                                                    |
| `in_app_enabled`     | `BOOLEAN`     | NOT NULL, DEFAULT `true`               | In-app inbox                                                           |
| `created_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              |                                                                        |
| `created_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system; usually = `user_id` (lazy-created on first override)    |
| `updated_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              | Trigger-updated                                                        |
| `updated_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system; usually = `user_id`                                     |

Primary key: `(user_id, event_type)`. Lazy creation — initial reads return defaults; rows only exist after override.

### `user_pack_permissions`

Tracks which IconMaker packs a user has been granted access to. The base pack is always available in the FE regardless of this table — rows only exist for non-base packs.

| Column               | Type           | Constraints                                  | Description                                               |
| -------------------- | -------------- | -------------------------------------------- | --------------------------------------------------------- |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                                     |
| `pack_id`            | `VARCHAR(100)` | NOT NULL                                     | Pack identifier (e.g., `christmas2026packA`)              |
| `granted_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | When access was granted                                   |
| `expires_at`         | `TIMESTAMPTZ`  | NULLABLE                                     | NULL = permanent; set for seasonal or time-limited packs  |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    |                                                           |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system (admin grant)                               |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                           |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system                                             |

**Primary key:** `(user_id, pack_id)`

**Indexes:**

- `PRIMARY KEY (user_id, pack_id)`
- `INDEX idx_user_pack_permissions_user ON user_pack_permissions(user_id)` — fetch all packs for a user
- `INDEX idx_user_pack_permissions_expires ON user_pack_permissions(expires_at) WHERE expires_at IS NOT NULL` — scheduler cleanup of expired packs

---

## 03 — Accounts

Owned by [`../spec/03-accounts.md`](../spec/03-accounts.md).

### `accounts`

One row per account owned by a user. Credit-type accounts (credit card, pay-later) carry additional billing columns.

| Column               | Type            | Constraints                                  | Description                                                                                   |
| -------------------- | --------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `id`                 | `UUID`          | PK (v7)                                      |                                                                                               |
| `user_id`            | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                                                                         |
| `name`               | `VARCHAR(100)`  | NOT NULL                                     | Display name (e.g., "KBank Savings")                                                          |
| `type`               | `VARCHAR(20)`   | NOT NULL, CHECK                              | `'cash'` \| `'bank'` \| `'e_wallet'` \| `'credit_card'` \| `'pay_later'`                      |
| `balance`            | `DECIMAL(15,2)` | NOT NULL, DEFAULT `0`                        | **Cached** sum of transactions; never written except by transaction service                   |
| `currency`           | `VARCHAR(3)`    | NOT NULL                                     | ISO 4217; defaults to user's currency at creation                                             |
| `icon_code`          | `JSONB`         | NULLABLE                                     | Icon Maker code (icon + colors + background + border)                                         |
| `logo_url`           | `TEXT`          | NULLABLE                                     | User-uploaded logo URL; shown instead of `icon_code` when set; falls back to `icon_code`     |
| `description`        | `TEXT`          | NULLABLE                                     | Optional one-line guidance ("Daily-spend account"). User-editable; never seeded for accounts. |
| `note`               | `TEXT`          | NULLABLE                                     | Free-form user scratch notes ("Old emergency fund — don't touch"). Never seeded.              |
| `status`             | `VARCHAR(20)`   | NOT NULL, DEFAULT `'active'`, CHECK          | `'active'` \| `'archived'` \| `'closed'`                                                      |
| `credit_limit`       | `DECIMAL(15,2)` | NULLABLE                                     | Credit accounts only                                                                          |
| `statement_date`     | `SMALLINT`      | NULLABLE, CHECK (1–31)                       | Day of month statement is generated                                                           |
| `payment_due_date`   | `SMALLINT`      | NULLABLE, CHECK (1–31)                       | Day of month payment is due                                                                   |
| `minimum_payment`    | `DECIMAL(15,2)` | NULLABLE                                     | Minimum payment amount                                                                        |
| `sort_order`         | `INTEGER`       | NOT NULL, DEFAULT `0`                        | Phase 2 — user-defined ordering                                                               |
| `created_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                    |                                                                                               |
| `created_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE                    | NULL = system                                                                                 |
| `updated_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                                                               |
| `updated_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE                    | NULL = system                                                                                 |

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

| Column                          | Type            | Constraints                                | Description                                                                                                                                                                                                                              |
| ------------------------------- | --------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `UUID`          | PK (v7)                                    |                                                                                                                                                                                                                                          |
| `user_id`                       | `UUID`          | FK → `users.id`, NOT NULL                  | Owner (immutable after create)                                                                                                                                                                                                           |
| `account_id`                    | `UUID`          | FK → `accounts.id`, NOT NULL               | The account debited or credited                                                                                                                                                                                                          |
| `type`                          | `VARCHAR(10)`   | NOT NULL, CHECK                            | `'expense'` \| `'income'` \| `'transfer'`                                                                                                                                                                                                |
| `amount`                        | `DECIMAL(15,2)` | NOT NULL, CHECK > 0                        | Always positive; direction determined by `type` (and category for transfers)                                                                                                                                                             |
| `category_id`                   | `UUID`          | FK → `categories.id`, NULLABLE             | Required if `type = 'transfer'` (must be system Transfer IN/OUT); optional otherwise                                                                                                                                                     |
| `date`                          | `DATE`          | NOT NULL                                   | Transaction calendar date in user's tz                                                                                                                                                                                                   |
| `note`                          | `TEXT`          | NULLABLE                                   | Free-text note (~500 chars advisory; no DB limit)                                                                                                                                                                                        |
| `project_id`                    | `UUID`          | FK → `projects.id`, NULLABLE               | **Auto-set only on rows that mirror a project**: a claim (`source_project_transaction_id` set) or a debt-settle (`source_personal_debt_id` set, where the debt is project-context). Never settable directly via `POST /v1/transactions`. |
| `scheduled_transaction_id`      | `UUID`          | FK → `scheduled_transactions.id`, NULLABLE | Set when auto-generated by scheduler                                                                                                                                                                                                     |
| `transfer_group_id`             | `UUID`          | NULLABLE                                   | Required when `type = 'transfer'`; pairs the two rows of a transfer                                                                                                                                                                      |
| `source_personal_debt_id`       | `UUID`          | FK → `personal_debts.id`, NULLABLE         | Set when this transaction settles a personal_debt (Pay flow for `i_owe` → expense; Mark-received for `owed_to_me` → income)                                                                                                              |
| `source_project_transaction_id` | `UUID`          | FK → `project_transactions.id`, NULLABLE   | Set when this transaction was created via the actor's claim of a project_transaction                                                                                                                                                     |
| `created_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                  |                                                                                                                                                                                                                                          |
| `created_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                  | NULL = system                                                                                                                                                                                                                            |
| `updated_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                  | Trigger-updated                                                                                                                                                                                                                          |
| `updated_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                  | NULL = system                                                                                                                                                                                                                            |

**Check constraints:**

- `type IN ('expense', 'income', 'transfer')`
- `amount > 0`
- At most one of `source_personal_debt_id` / `source_project_transaction_id` is set
- `project_id IS NOT NULL` ⇒ at least one source is set (one-way implication: project_id can never appear without a source, but a source CAN exist with `project_id = NULL` — the personal-context debt settle case where the debt has no project)

**API-layer cross-field rules:**

- `type = 'transfer'` → `transfer_group_id IS NOT NULL` AND `category_id IS NOT NULL` (must be system `Transfer IN` or `Transfer OUT`)
- `type IN ('expense', 'income')` → `transfer_group_id IS NULL`
- If `source_personal_debt_id` set → `type` must match the debt's direction: `expense` for `i_owe` (paying back), `income` for `owed_to_me` (receiving back); `project_id` auto-set from debt's `project_id` (NULL for non-project personal debts)
- If `source_project_transaction_id` set → caller must be the actor (linked user behind the project_transaction's `transaction_member_id`); `type` matches source's `type`; `project_id` auto-set from source's `project_id`

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_transactions_user_date ON transactions(user_id, date DESC, created_at DESC)`
- `INDEX idx_transactions_account_date ON transactions(account_id, date DESC, created_at DESC)`
- `INDEX idx_transactions_category ON transactions(category_id, date DESC) WHERE category_id IS NOT NULL`
- `INDEX idx_transactions_project ON transactions(project_id, date DESC) WHERE project_id IS NOT NULL`
- `INDEX idx_transactions_scheduled ON transactions(scheduled_transaction_id) WHERE scheduled_transaction_id IS NOT NULL`
- `INDEX idx_transactions_transfer_group ON transactions(transfer_group_id) WHERE transfer_group_id IS NOT NULL`
- `INDEX idx_transactions_source_personal_debt ON transactions(source_personal_debt_id) WHERE source_personal_debt_id IS NOT NULL` — debt settlement lookup
- `INDEX idx_transactions_source_pt ON transactions(source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL` — claim lookup

**Intentionally absent:** `currency` (inherited from `account.currency`), `photo_url` (Phase 2 OCR without storage), `saving_goal_id` (computed from balance × allocation), `is_split` boolean (inferable from existence of splits).

---

## 05 — Categories & Tags

Owned by [`../spec/05-categories-tags.md`](../spec/05-categories-tags.md).

### `categories`

Hierarchical, up to 3 levels deep.

| Column               | Type           | Constraints                                  | Description                                                                                                                                                                                                                                |
| -------------------- | -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | `UUID`         | PK (v7)                                      |                                                                                                                                                                                                                                            |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                                                                                                                                                                                                                      |
| `name`               | `VARCHAR(100)` | NOT NULL                                     | Display name                                                                                                                                                                                                                               |
| `type`               | `VARCHAR(10)`  | NOT NULL, CHECK                              | `'income'` \| `'expense'`                                                                                                                                                                                                                  |
| `parent_id`          | `UUID`         | FK → `categories.id`, NULLABLE               | NULL = root                                                                                                                                                                                                                                |
| `is_system`          | `BOOLEAN`      | NOT NULL, DEFAULT `false`                    | System categories cannot be deleted                                                                                                                                                                                                        |
| `system_kind`        | `VARCHAR(30)`  | NULLABLE, CHECK paired with `is_system`      | Stable identifier for the 6 reserved system categories. NULL for user categories. Values: `OPENING_IN`, `OPENING_OUT`, `ADJUST_IN`, `ADJUST_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`. Used for cross-module lookup since `name` may be renamed. |
| `icon_code`          | `JSONB`        | NULLABLE                                     | Icon Maker code                                                                                                                                                                                                                            |
| `sort_order`         | `INT`          | NOT NULL, DEFAULT `0`                        | Sibling order under `(user_id, type, parent_id)`; lower = earlier. Bulk-rewritten by `PATCH /v1/categories/reorder`.                                                                                                                       |
| `include_in_report`  | `BOOLEAN`      | NOT NULL, DEFAULT `TRUE`                     | Per-row toggle for spending reports. Seeded `FALSE` for _Adjustment_, _Transfer In/Out_, and the _Lending_ / _Reimbursement_ starters.                                                                                                     |
| `description`        | `TEXT`         | NULLABLE                                     | Optional one-line guidance ("Restaurants and groceries"). User-editable; seeded for default starter categories.                                                                                                                            |
| `note`               | `TEXT`         | NULLABLE                                     | Free-form user scratch notes. Never seeded.                                                                                                                                                                                                |
| `status`             | `VARCHAR(20)`  | NOT NULL, DEFAULT `'active'`, CHECK          | `'active'` \| `'archived'`                                                                                                                                                                                                                 |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    |                                                                                                                                                                                                                                            |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system                                                                                                                                                                                                                              |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                                                                                                                                                                                                            |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system                                                                                                                                                                                                                              |

**Check constraints:**

- `type IN ('income', 'expense')`
- `status IN ('active', 'archived')`
- `id != parent_id` — no self-parenting
- `(is_system = TRUE AND system_kind IS NOT NULL) OR (is_system = FALSE AND system_kind IS NULL)` — system identity is the kind, not the name
- System categories (`is_system = true`) cannot have a parent (API-enforced)

**API-layer 3-layer depth limit:** backend walks up from candidate `parent_id` counting hops; reject if > 3 with `400 MAX_DEPTH_EXCEEDED`.

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_categories_user ON categories(user_id, status)` — list queries
- `INDEX idx_categories_parent ON categories(parent_id)` — tree traversal
- `UNIQUE INDEX idx_categories_name ON categories(user_id, type, parent_id, LOWER(name)) WITH NULLS NOT DISTINCT WHERE status = 'active'` — case-insensitive uniqueness per (user, type, parent_id); archived rows excluded for name reuse
- `UNIQUE INDEX idx_categories_system_kind ON categories(user_id, system_kind) WHERE system_kind IS NOT NULL` — guards against duplicate system seeding

### `tags`

Flat, no hierarchy.

| Column               | Type          | Constraints                                  | Description                                                      |
| -------------------- | ------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `id`                 | `UUID`        | PK (v7)                                      |                                                                  |
| `user_id`            | `UUID`        | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                                            |
| `name`               | `VARCHAR(50)` | NOT NULL                                     | Label text                                                       |
| `icon_code`          | `JSONB`       | NULLABLE                                     | Icon Maker code                                                  |
| `created_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                    |                                                                  |
| `created_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE                    | NULL = system                                                    |
| `updated_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                                  |
| `updated_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE                    | NULL = system                                                    |

**Indexes:**

- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_tags_name ON tags(user_id, LOWER(name))` — case-insensitive uniqueness
- `INDEX idx_tags_user ON tags(user_id)`

### `transaction_tags`

Many-to-many junction.

| Column               | Type          | Constraints                                 |
| -------------------- | ------------- | ------------------------------------------- |
| `transaction_id`     | `UUID`        | FK → `transactions.id`, ON DELETE CASCADE   |
| `tag_id`             | `UUID`        | FK → `tags.id`, ON DELETE CASCADE           |
| `created_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                   |
| `created_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE — NULL = system   |
| `updated_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` — Trigger-updated |
| `updated_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE — NULL = system   |

Primary key: `(transaction_id, tag_id)`. Junction rows are typically immutable (insert/delete only); `updated_at` / `updated_by_user_id` are present for uniformity but rarely change.

---

## 06 — (Removed: shared_expense_splits)

**Removed in migration 24** (Phase 1b refactor).

The `shared_expense_splits` table is gone. Splits and personal_debts are
unified into a single bidirectional `personal_debts` table — see §12.
Every "X owes Y" relationship lives there now, regardless of how it
originated (transaction split, manual cash loan, broken-item compensation).

`transactions.source_split_id` was renamed to `source_personal_debt_id`
(migration 25).

The original spec [`../spec/06-shared-expenses.md`](../spec/06-shared-expenses.md)
is kept as historical record but the model it describes is no longer in
use; see [`../spec/12-personal-debts.md`](../spec/12-personal-debts.md) for
the current model.

---

## 07 — Contacts

Owned by [`../spec/07-contacts.md`](../spec/07-contacts.md).

### `contacts`

One row per contact owned by a user. May or may not be linked to another app user via `linked_user_id`.

| Column               | Type           | Constraints                                  | Description                                |
| -------------------- | -------------- | -------------------------------------------- | ------------------------------------------ |
| `id`                 | `UUID`         | PK (v7)                                      |                                            |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                      |
| `display_name`       | `VARCHAR(100)` | NOT NULL                                     | Primary label                              |
| `email`              | `VARCHAR(255)` | NULLABLE                                     | Optional; not used for linking in Phase 1b |
| `phone`              | `VARCHAR(50)`  | NULLABLE                                     | Optional; informational                    |
| `notes`              | `TEXT`         | NULLABLE                                     | User free-form notes                       |
| `icon_code`          | `JSONB`        | NULLABLE                                     | Icon Maker code                            |
| `linked_user_id`     | `UUID`         | FK → `users.id`, NULLABLE                    | Set when contact is linked to an app user  |
| `status`             | `VARCHAR(20)`  | NOT NULL, DEFAULT `'active'`, CHECK          | `'active'` \| `'archived'`                 |
| `last_used_at`       | `TIMESTAMPTZ`  | NULLABLE                                     | Bumped when a debt with this contact is created; used for recency-ranked typeahead |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    |                                            |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system                              |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                            |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system                              |

**Check constraints:**

- `status IN ('active', 'archived')`
- `user_id != linked_user_id` — cannot link a contact to yourself

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_contacts_user ON contacts(user_id, status)` — list queries
- `INDEX idx_contacts_name ON contacts(user_id, LOWER(display_name))` — autocomplete / search
- `UNIQUE INDEX idx_contacts_owner_linked_user ON contacts(user_id, linked_user_id) WHERE linked_user_id IS NOT NULL` — one contact per (user, linked app user); allows multiple `linked_user_id IS NULL`
- `INDEX idx_contacts_linked_user ON contacts(linked_user_id) WHERE linked_user_id IS NOT NULL` — reverse query for "find all contacts that link to me"
- `INDEX idx_contacts_last_used ON contacts(user_id, last_used_at DESC NULLS LAST)` — recency sort for typeahead; NULLS LAST = never-used contacts fall to bottom

---

## 08 — Budgets

Owned by [`../spec/08-budgets.md`](../spec/08-budgets.md).

### `budgets`

| Column               | Type            | Constraints                         | Description                             |
| -------------------- | --------------- | ----------------------------------- | --------------------------------------- |
| `id`                 | `UUID`          | PK (v7)                             |                                         |
| `user_id`            | `UUID`          | FK → `users.id`, NOT NULL           | Owner                                   |
| `category_id`        | `UUID`          | FK → `categories.id`, NOT NULL      | Target category                         |
| `scope`              | `VARCHAR(20)`   | NOT NULL, CHECK                     | `'user'` \| `'project'`                 |
| `project_id`         | `UUID`          | FK → `projects.id`, NULLABLE        | Set when `scope='project'`              |
| `amount`             | `DECIMAL(15,2)` | NOT NULL, CHECK > 0                 | Spending limit                          |
| `period`             | `VARCHAR(20)`   | NOT NULL, CHECK                     | `'weekly'` \| `'monthly'` \| `'yearly'` |
| `currency`           | `VARCHAR(3)`    | NOT NULL                            | ISO 4217; defaults to user's currency   |
| `status`             | `VARCHAR(20)`   | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'`              |
| `icon_code`          | `JSONB`         | NULLABLE                            | Icon Maker code                         |
| `created_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           |                                         |
| `created_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                           |
| `updated_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           | Trigger-updated                         |
| `updated_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                           |

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

| Column               | Type            | Constraints                         | Description                                             |
| -------------------- | --------------- | ----------------------------------- | ------------------------------------------------------- |
| `id`                 | `UUID`          | PK (v7)                             |                                                         |
| `user_id`            | `UUID`          | FK → `users.id`, NOT NULL           | Owner                                                   |
| `name`               | `VARCHAR(100)`  | NOT NULL                            | Goal name                                               |
| `target_amount`      | `DECIMAL(15,2)` | NOT NULL, CHECK > 0                 |                                                         |
| `linked_account_id`  | `UUID`          | FK → `accounts.id`, NOT NULL        | The account holding the money                           |
| `allocation_pct`     | `DECIMAL(5,2)`  | NOT NULL, CHECK > 0 AND ≤ 100       | % of linked account's balance counting toward this goal |
| `deadline`           | `DATE`          | NULLABLE                            | Optional target date                                    |
| `icon_code`          | `JSONB`         | NULLABLE                            | Icon Maker code                                         |
| `status`             | `VARCHAR(20)`   | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'`                              |
| `note`               | `TEXT`          | NULLABLE                            |                                                         |
| `created_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           |                                                         |
| `created_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                                           |
| `updated_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           | Trigger-updated                                         |
| `updated_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                                           |

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

| Column               | Type           | Constraints                         | Description                                                                         |
| -------------------- | -------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                             |                                                                                     |
| `owner_user_id`      | `UUID`         | FK → `users.id`, NOT NULL           | Current owner (mutable via ownership transfer)                                      |
| `name`               | `VARCHAR(100)` | NOT NULL                            | Display name (e.g., "Japan Trip 2026")                                              |
| `type`               | `VARCHAR(30)`  | NULLABLE                            | `'trip'` \| `'sales'` \| `'freelance'` \| `'other'` (free-form enum, API-validated) |
| `description`        | `TEXT`         | NULLABLE                            |                                                                                     |
| `start_date`         | `DATE`         | NULLABLE                            |                                                                                     |
| `end_date`           | `DATE`         | NULLABLE                            |                                                                                     |
| `status`             | `VARCHAR(20)`  | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'completed'` \| `'cancelled'` \| `'archived'`                        |
| `icon_id`            | `TEXT`         | NULLABLE                            | Icon art ID from the IconMaker registry                                             |
| `color_id`           | `TEXT`         | NULLABLE                            | Color palette ID from the IconMaker registry                                        |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`           |                                                                                     |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE           | NULL = system                                                                       |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`           | Trigger-updated                                                                     |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE           | NULL = system                                                                       |

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_projects_owner ON projects(owner_user_id, status)` — owner's projects list
- `INDEX idx_projects_status ON projects(status, updated_at DESC)` — member queries

**No `budget_goal` column** — per-project budget tracking is a Phase 2+ feature.

### `project_members`

Member identity within a project. **Two kinds** of member share this table post-migration 27: linked (`user_id IS NOT NULL`) and ad-hoc (`user_id IS NULL`). The previous "contact" kind was dropped because contacts are user-scoped and ambiguous on a shared project row — to associate a project member with the inviter's contact, look up `contacts.linked_user_id` client-side and invite by email.

| Column               | Type           | Constraints                                     | Description                                  |
| -------------------- | -------------- | ----------------------------------------------- | -------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                                         | The stable `member_id` within the project    |
| `project_id`         | `UUID`         | FK → `projects.id`, NOT NULL, ON DELETE CASCADE |                                              |
| `user_id`            | `UUID`         | FK → `users.id`, NULLABLE                       | Set after invite accepted                    |
| `display_name`       | `VARCHAR(100)` | NOT NULL                                        | Shown in project UI; always available                                                                      |
| `icon_code`          | `JSONB`        | NULLABLE                                        | Icon Maker code; for ad-hoc members; linked members fall back to `users.icon_code` client-side            |
| `role`               | `VARCHAR(20)`  | NOT NULL, DEFAULT `'contributor'`, CHECK        | `'owner'` \| `'contributor'` \| `'viewer'`                                                                 |
| `status`             | `VARCHAR(20)`  | NOT NULL, DEFAULT `'pending'`, CHECK            | `'pending'` \| `'active'` \| `'left'`        |
| `invited_at`         | `TIMESTAMPTZ`  | NULLABLE                                        | Set when invite was generated                |
| `joined_at`          | `TIMESTAMPTZ`  | NULLABLE                                        | Set when user_id populated via invite accept |
| `left_at`            | `TIMESTAMPTZ`  | NULLABLE                                        | Set on leave (soft-remove)                   |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                       |                                              |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                       | NULL = system                                |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                       | Trigger-updated                              |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                       | NULL = system                                |

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

### `project_transactions`

The canonical project ledger. Every transaction recorded in a project context goes here, regardless of the actor's member type. No personal account is touched at insert time. Field names mirror the personal `transactions` table where parallel.

**Splits as multi-tx (post-migration 27):** a parent row plus N child rows linked by `parent_project_transaction_id`. Children represent each debtor's share owed to the parent's actor. Children inherit `type`, `currency`, `date`, `note` from the parent (BE copies at create time). Sum of children's amounts ≤ parent.amount; the remainder is the parent actor's own share. Max one level deep — children of children are forbidden.

| Column                          | Type            | Constraints                                                 | Description                                                                                                                                                            |
| ------------------------------- | --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `UUID`          | PK (v7)                                                     |                                                                                                                                                                        |
| `project_id`                    | `UUID`          | FK → `projects.id`, NOT NULL, ON DELETE CASCADE             |                                                                                                                                                                        |
| `parent_project_transaction_id` | `UUID`          | FK → `project_transactions.id`, NULLABLE, ON DELETE CASCADE | NULL on parent rows; set on split-child rows                                                                                                                           |
| `transaction_member_id`         | `UUID`          | FK → `project_members.id`, NOT NULL                         | On parent: the actor whose money moved. On a child: the debtor (the one who owes the parent's actor for this share).                                                   |
| `record_user_id`                | `UUID`          | FK → `users.id`, NOT NULL                                   | The linked user who recorded this row. All members may edit any row (Phase 2 grants full edit rights project-wide).                                                    |
| `type`                          | `VARCHAR(20)`   | NOT NULL, CHECK                                             | `'expense'` \| `'income'`. Transfers excluded — no accounts on either end.                                                                                             |
| `amount`                        | `NUMERIC(18,4)` | NOT NULL, CHECK > 0                                         | On a child, this is the share amount (not the parent total)                                                                                                            |
| `currency`                      | `VARCHAR(3)`    | NOT NULL                                                    | ISO 4217                                                                                                                                                               |
| `date`                          | `DATE`          | NOT NULL                                                    |                                                                                                                                                                        |
| `note`                          | `TEXT`          | NULLABLE                                                    |                                                                                                                                                                        |
| `marks`                         | `UUID[]`        | NOT NULL, DEFAULT `'{}'`                                    | Set of `project_member.id` values that have marked this row "resolved on the board". Independent of personal-book actions — toggling does NOT create personal entries. |
| `description`                   | `TEXT`          | NULLABLE                                                    | Optional user-supplied label for the transaction; editable                                                                                                             |
| `category_name`                 | `TEXT`          | NULLABLE                                                    | Denormalized snapshot of the category name at record time; read-only                                                                                                   |
| `category_icon_id`              | `TEXT`          | NULLABLE                                                    | Denormalized snapshot of the category icon ID at record time; read-only                                                                                                |
| `category_color_id`             | `TEXT`          | NULLABLE                                                    | Denormalized snapshot of the category color ID at record time; read-only                                                                                               |
| `created_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                   |                                                                                                                                                                        |
| `created_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                   | NULL = system                                                                                                                                                          |
| `updated_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                   | Trigger-updated                                                                                                                                                        |
| `updated_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                   | NULL = system                                                                                                                                                          |

**Constraints:**

- `type IN ('expense', 'income')`
- `amount > 0`
- `transaction_member_id` must belong to the same `project_id` (API-validated; cross-project mismatch rejected)
- A parent row's `parent_project_transaction_id` must be NULL (max 1 level deep — service-layer enforced)
- Self-split forbidden: a child's `transaction_member_id` must differ from its parent's `transaction_member_id` (service-layer enforced)
- Sum of children's `amount` ≤ parent's `amount` (service-layer enforced)

**No `account_id`** — project_transactions never hit a personal account. Personal entries are created client-side via the regular `POST /transactions` (with `source_project_transaction_id` set for traceback) or `POST /personal-debts`.

**No `category_id` FK** — categories are user-scoped resources and ambiguous on a shared row. Categories are picked fresh by each user at resolve time, on the personal-book entry. Dropped in migration 27. `category_name`, `category_icon_id`, and `category_color_id` are denormalized read-only TEXT snapshots set at record time for display on the shared board (added migration 31).

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_project_tx_project ON project_transactions(project_id, date DESC)` — board queries
- `INDEX idx_project_tx_member ON project_transactions(transaction_member_id)` — "this member's project_transactions"
- `INDEX idx_project_tx_recorder ON project_transactions(record_user_id)` — audit / "what did Alice record"
- `INDEX project_transactions_parent_idx ON project_transactions(parent_project_transaction_id) WHERE parent_project_transaction_id IS NOT NULL` — child lookup by parent

---

## 11 — Scheduled Transactions

Owned by [`../spec/11-scheduled-transactions.md`](../spec/11-scheduled-transactions.md).

### `scheduled_transactions`

| Column                      | Type            | Constraints                         | Description                                                     |
| --------------------------- | --------------- | ----------------------------------- | --------------------------------------------------------------- |
| `id`                        | `UUID`          | PK (v7)                             |                                                                 |
| `user_id`                   | `UUID`          | FK → `users.id`, NOT NULL           | Owner                                                           |
| `account_id`                | `UUID`          | FK → `accounts.id`, NOT NULL        | Account to debit/credit when generating                         |
| `name`                      | `VARCHAR(100)`  | NOT NULL                            | Display name ("Netflix", "Car loan")                            |
| `type`                      | `VARCHAR(10)`   | NOT NULL, CHECK                     | `'expense'` \| `'income'` — direction of generated transactions |
| `entry_type`                | `VARCHAR(20)`   | NOT NULL, CHECK                     | `'recurring'` \| `'installment'`                                |
| `amount`                    | `DECIMAL(15,2)` | NOT NULL, CHECK > 0                 | Amount per generated cycle                                      |
| `category_id`               | `UUID`          | FK → `categories.id`, NULLABLE      | Category applied to generated transactions                      |
| `billing_cycle`             | `VARCHAR(20)`   | NOT NULL, CHECK                     | `'daily'` \| `'weekly'` \| `'monthly'` \| `'yearly'`            |
| `next_billing_date`         | `DATE`          | NOT NULL                            | Next date the scheduler should fire                             |
| `status`                    | `VARCHAR(20)`   | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'paused'` \| `'cancelled'` \| `'completed'`      |
| `note`                      | `TEXT`          | NULLABLE                            |                                                                 |
| **Installment-only fields** |                 |                                     | NULL when `entry_type = 'recurring'`                            |
| `total_amount`              | `DECIMAL(15,2)` | NULLABLE                            | Total to be paid over all installments (principal + interest)   |
| `down_payment`              | `DECIMAL(15,2)` | NULLABLE                            | Initial lump sum (separate from cyclic payments)                |
| `total_installments`        | `INTEGER`       | NULLABLE, CHECK > 0                 | Total number of cyclic payments                                 |
| `remaining_installments`    | `INTEGER`       | NULLABLE, CHECK ≥ 0                 | Countdown; auto-completes when hits 0                           |
| `interest_rate`             | `DECIMAL(5,2)`  | NULLABLE                            | Annual % for loans (display-only in Phase 1c)                   |
| `icon_code`                 | `JSONB`         | NULLABLE                            | Icon Maker code                                                 |
| `logo_url`                  | `TEXT`          | NULLABLE                            | User-uploaded service logo URL (e.g., Netflix); shown instead of `icon_code` when set |
| `created_at`                | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           |                                                                 |
| `created_by_user_id`        | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                                                   |
| `updated_at`                | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           | Trigger-updated                                                 |
| `updated_by_user_id`        | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                                                   |

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

## 12 — Personal Debts (bidirectional)

Owned by [`../spec/12-personal-debts.md`](../spec/12-personal-debts.md).

### `personal_debts`

The single, bidirectional ledger of obligations between the row owner and
another party. Replaces the old `shared_expense_splits` table (removed in
migration 24). Every "X owes Y" lives here regardless of origin: split bills,
manual cash loans, IOU agreements, broken-item compensation.

Each row is owned by one user (`user_id`) and describes one obligation
between them and a counterparty. The `direction` column says which side
the row owner is on. When a user splits a bill with a linked contact, the
BE creates one row on each side independently — both books are mutable
in isolation.

| Column                          | Type            | Constraints                                                  | Description                                                                                                                                   |
| ------------------------------- | --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `UUID`          | PK (v7)                                                      |                                                                                                                                               |
| `user_id`                       | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE                 | Row owner                                                                                                                                     |
| `direction`                     | `VARCHAR(20)`   | NOT NULL, CHECK                                              | `'i_owe'` \| `'owed_to_me'` (from row owner's perspective)                                                                                    |
| `counterparty_contact_id`       | `UUID`          | FK → `contacts.id`, NULLABLE, ON DELETE SET NULL             | Optional structured link to a contact in the row owner's book                                                                                 |
| `counterparty_person_name`      | `VARCHAR(100)`  | NOT NULL                                                     | Always set — durable display label, free-text fallback when contact_id is NULL                                                                |
| `source_transaction_id`         | `UUID`          | FK → `transactions.id`, NULLABLE, ON DELETE SET NULL         | Origin transaction in row owner's book. NULL for manual debts and partner-side mirror rows (where the user has no transaction yet)            |
| `source_project_transaction_id` | `UUID`          | FK → `project_transactions.id`, NULLABLE, ON DELETE SET NULL | 1b.2: project-context origin                                                                                                                  |
| `project_id`                    | `UUID`          | FK → `projects.id`, NULLABLE, ON DELETE SET NULL             | 1b.2: contextual project                                                                                                                      |
| `amount`                        | `DECIMAL(15,2)` | NOT NULL, CHECK > 0                                          | Total obligation                                                                                                                              |
| `settled_amount`                | `DECIMAL(15,2)` | NOT NULL, DEFAULT `0`, CHECK 0 ≤ x ≤ amount                  | How much has been settled. Bumped by transactions with matching `source_personal_debt_id` (auto-bump) OR by direct edit (forgiveness, barter) |
| `currency`                      | `VARCHAR(3)`    | NOT NULL                                                     |                                                                                                                                               |
| `status`                        | `VARCHAR(20)`   | NOT NULL, DEFAULT `'open'`, CHECK                            | `'open'` \| `'settled'` \| `'cancelled'`                                                                                                      |
| `note`                          | `TEXT`          | NULLABLE                                                     |                                                                                                                                               |
| `created_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                    |                                                                                                                                               |
| `created_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                    | NULL = system                                                                                                                                 |
| `updated_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                    | Trigger-updated                                                                                                                               |
| `updated_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                    | NULL = system                                                                                                                                 |

**Check constraints:**

- `direction IN ('i_owe', 'owed_to_me')`
- `status IN ('open', 'settled', 'cancelled')`
- `settled_amount >= 0 AND settled_amount <= amount`
- `status='settled'` ⇔ `settled_amount >= amount` (enforced at app layer)

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_personal_debts_user ON personal_debts(user_id, status)` — primary list query
- `INDEX idx_personal_debts_counterparty_contact ON personal_debts(user_id, counterparty_contact_id) WHERE counterparty_contact_id IS NOT NULL` — people view
- `INDEX idx_personal_debts_source_tx ON personal_debts(source_transaction_id) WHERE source_transaction_id IS NOT NULL` — "what debts came from this transaction"
- `INDEX idx_personal_debts_source_pt ON personal_debts(source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL`
- `INDEX idx_personal_debts_project ON personal_debts(project_id) WHERE project_id IS NOT NULL`

**Settlement paths (two ways `settled_amount` can move):**

1. **Through a transaction** (default) — user creates an income/expense
   tx with `source_personal_debt_id` set; auto-bumper hook bumps
   `settled_amount` in the same DB tx.
2. **Direct edit** — `PUT /v1/personal-debts/:id` with `settled_amount`.
   For non-cash adjustments: forgiveness, barter, math fixes.

**Reports — "my share" computation:**
For a transaction whose splits live in `personal_debts`
(`source_transaction_id = T`, `direction='owed_to_me'`), spending reports
subtract the sum of those debts' `amount` from the transaction's amount —
giving the user's effective share. Cancelled debts excluded from the
subtraction. This keeps the account ledger cash-basis (full ฿4000 out)
and the spending report share-basis (฿2000 = my share of dinner).

---

## 13 — Notifications

Owned by [`../spec/13-notifications.md`](../spec/13-notifications.md).

### `notifications`

In-app notification rows. One row per recipient per event.

| Column               | Type           | Constraints                                  | Description                                                                                    |
| -------------------- | -------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                                      |                                                                                                |
| `recipient_user_id`  | `UUID`         | FK → `users.id`, NOT NULL, ON DELETE CASCADE |                                                                                                |
| `type`               | `VARCHAR(50)`  | NOT NULL, CHECK                              | See trigger registry in spec §2                                                                |
| `actor_user_id`      | `UUID`         | FK → `users.id`, NULLABLE                    | The user whose action caused this notification. NULL for system events.                        |
| `payload`            | `JSONB`        | NOT NULL                                     | Event-specific context (`split_id`, `project_id`, `amount`, etc.) — per-type shapes in spec §2 |
| `deep_link`          | `VARCHAR(500)` | NULLABLE                                     | Client routing hint                                                                            |
| `read_at`            | `TIMESTAMPTZ`  | NULLABLE                                     | Set when the user opens the inbox and sees it                                                  |
| `actioned_at`        | `TIMESTAMPTZ`  | NULLABLE                                     | Set when the user taps through and takes the suggested action                                  |
| `dismissed_at`       | `TIMESTAMPTZ`  | NULLABLE                                     | Set when the user explicitly dismisses without acting                                          |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    |                                                                                                |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system event; usually equals `actor_user_id` for user-triggered events                  |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated (bumps when `read_at` / `actioned_at` / `dismissed_at` set)                    |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system; usually = `recipient_user_id` after read/action/dismiss                         |

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

| Column                                            | Type          | Constraints                            | Description                                                         |
| ------------------------------------------------- | ------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `user_id`                                         | `UUID`        | PK, FK → `users.id`, ON DELETE CASCADE |                                                                     |
| `auto_notify_linked_split_contacts`               | `BOOLEAN`     | NOT NULL, DEFAULT `true`               | When I split with a linked contact, send notification automatically |
| `auto_add_to_personal_debt_on_split_notification` | `BOOLEAN`     | NOT NULL, DEFAULT `false`              | When someone splits with me, auto-create a `personal_debts` row     |
| `auto_record_received_payment`                    | `BOOLEAN`     | NOT NULL, DEFAULT `false`              | When someone notifies me they paid, auto-create my receipt          |
| `auto_resolve_own_in_projects`                    | `BOOLEAN`     | NOT NULL, DEFAULT `false`              | When I save a project_transaction I'm involved in, skip the modal   |
| `default_account_id`                              | `UUID`        | FK → `accounts.id`, NULLABLE           | Account to use when any of the above fire automatically             |
| `created_at`                                      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              |                                                                     |
| `created_by_user_id`                              | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system                                                       |
| `updated_at`                                      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              | Trigger-updated                                                     |
| `updated_by_user_id`                              | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system                                                       |

A row is auto-created on user registration with all defaults.

---

## Status

- **Last updated** — 2026-05-05
- **Version** — 0.6 (Synced against all 32 migrations: removed `contacts.nickname` (dropped migration 29); added `contacts.last_used_at` + `idx_contacts_last_used` (migration 28); removed `contact_invites` table (never migrated — invite flow replaced by notifications); removed `project_invites` table (never migrated — invite flow replaced by notifications); added `project_transactions.description` (migration 30); corrected category snapshot columns on `project_transactions` from `category_icon_code JSONB` to `category_icon_id TEXT` + `category_color_id TEXT` (migration 31); corrected `projects` icon columns from `icon_code JSONB` to `icon_id TEXT` + `color_id TEXT` (migration 32).)
- **Version** — 0.4 (locked in FK naming rule: every FK ends in `<target_table>_id`, role-prefixed when not the row's primary owner. Renamed `created_by` → `created_by_user_id` and `updated_by` → `updated_by_user_id` everywhere. Added compound-table-name carve-out so descriptive names like `shared_expense_splits` survive — FKs may use unambiguous abbreviations like `source_split_id`.)
- **Version** — 0.3 (added `archived` user status + anonymize-on-delete flow; users are never hard-deleted so audit-column references survive forever)
- **Version** — 0.2 (added uniform audit-column standard on every table, nullable, NULL = system)
