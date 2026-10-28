# Database Schema — All Tables

Single consolidated reference for every table in the system. Ordered by owning spec module (matches numbering in [`../spec/`](../modules/)).

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
- **name / description / note** (owner standard 2026-10-10, migration 051). *Things* (accounts, categories, tags, contacts, budgets, saving_goals, projects, scheduled_transactions — now `recurring_rules`, migration 057) carry `name` + `description` + `note`; *records* (transactions, project_transactions, personal_debts, pending drafts) carry `description` — the title, what it was for (ค่าอะไร) — + `note`. Same column names everywhere. `description` / `note` are `TEXT` NULLABLE; the API caps them at 200 / 500 characters (name 100, tags 50), trims, and stores blank as NULL. Updates: key absent = unchanged, `null` or `""` = clear. Copies between records map description → description, note → note. Exempt: users, project_members, account identifiers, notifications, import_logs, payment_providers.
- **`icon_code` JSONB shape** — used on all customizable entities (users, accounts, categories, tags, contacts, projects, project_members, saving_goals, budgets, recurring_rules, event_tags). The column is NULLABLE — `NULL` means the entity uses its module default (e.g., initials for users, first base-pack icon for accounts).
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
  - All entities use a circle container. Shape is fixed — not stored.
  - `background` — texture/art ID rendered inside the circle. Think of it as a function: `background(bgColors) → visual`. `null` = no background (transparent). Base pack includes `"solid"` (1 color), `"gradient_linear"` (2 colors), etc.
  - `bgColors` — ordered color inputs the selected background art requires. Empty array when `background` is null. The art definition declares exactly how many colors it needs (0–3).
  - `border` — optional border art ID (circle border style/thickness). `null` = no border. `borderColors` are its color inputs, same pattern as background.
  - Art IDs are resolved by the frontend IconMaker registry and are never stored as file paths.

---

## Table of contents

| Module                                                                      | Tables                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [01 — Auth](#01--auth)                                                      | `users`, `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_identities` |
| [02 — Users](#02--users)                                                    | `users` (additions), `user_preferences`, `notification_preferences`, `user_pack_permissions`        |
| [03 — Accounts](#03--accounts)                                              | `accounts`                                                                                          |
| [04 — Transactions](#04--transactions)                                      | `transactions`, `pending_transactions`                                                              |
| [05 — Categories & Tags](#05--categories--tags)                             | `categories`, `tags`, `transaction_tags`                                                            |
| [06 — (Removed: shared_expense_splits)](#06--removed-shared_expense_splits) | _merged into §12_                                                                                   |
| [07 — Contacts](#07--contacts)                                              | `contacts`                                                                                          |
| [08 — Budgets](#08--budgets)                                                | `budgets`, `budget_categories`, `budget_wallets`, `budget_periods` (v2, migration 059)              |
| [09 — Saving Goals](#09--saving-goals)                                      | `saving_goals`, `saving_entries` (v2, migration 060; `saving_auto` dropped in 077)                  |
| [10 — Projects](#10--projects)                                              | `projects`, `project_members`, `project_transactions`, `project_transaction_payers` (105), `event_settle_bookings` (103), `shared_bill_opt_outs` (093), `event_tags`, `project_transaction_tags`, `project_my_tags` |
| [11 — Recurring](#11--recurring) _(replaces Scheduled Transactions, migration 057)_ | `recurring_rules`, `recurring_items`, `recurring_due_checks` (`scheduled_transactions` dropped) |
| [12 — Personal Debts](#12--personal-debts-bidirectional)                    | `personal_debts`, `personal_debt_bills` (100)                                                       |
| [13 — Notifications](#13--notifications)                                    | `notifications`, `user_notification_settings`                                                       |
| [14 — Shared Wallets](#14--shared-wallets)                                  | `account_members` (wallet rows live in ordinary `transactions`; migrated in 039)                    |
| [15 — Slip Import](#15--slip-import)                                        | `payment_providers`, `import_logs`                                                                  |

---

## 01 — Auth

Owned by [`../spec/01-auth.md`](../modules/01-auth.md).

### `users`

Stores identity. Profile and preference columns are also here but documented in [`../spec/02-users.md`](../modules/02-users.md) — they're listed below for completeness since this is the table of record.

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

Owned by [`../spec/02-users.md`](../modules/02-users.md).

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

Migration 110 (0.4.1-2 P2) removed the never-sent `theme` / `language` keys from every existing row (`preferences - 'theme' - 'language'`); `theme` is replaced by `theme_mode`, a missing `language` is filled by the app from the device after login. Registration no longer writes them (fixed 2026-10-28, `auth/store.go` `InsertPreferencesTx`). Current keys: the table below.

**Known JSONB keys** (typed at app layer):

| Key        | Type   | Phase | Allowed values                      |
| ---------- | ------ | ----- | ----------------------------------- |
| `timezone` | string | 1     | IANA tz identifier. The API saves only names Postgres knows; queries use the stored value as is (no per-query `pg_timezone_names` check). Migration 074 reset any unknown / empty value to `Asia/Bangkok` once |
| `theme_mode` | string | 0.4.1-2 | `"light"` \| `"dark"` \| `"system"` (replaces `theme`, removed by migration 110) |
| `theme_id` | string | 0.4.1-2 | the app's theme id (e.g. `mint`), 1–50 chars |
| `language` | string | 0.4.1-2 | `"th"` \| `"en"` (checked since 0.4.1-2) |
| `font_th` / `font_en` | string | 0.4.1-2 | the font id per language, 1–50 chars |
| `page_prefs` | object | 0.4.1-2 | last sort / filter per page: keys `wallets`, `budgets`, `goals`, `recurring`, `events`, `categories`, `tags`, `contacts`, `debts`, `pending`; each an app-owned object ≤ 2 KB; merged per page |
| `money_style` | string | 0.3.1 | `plus_minus` \| `plus_minus_plain` \| `parentheses` \| `parentheses_plain` \| `color_only` |
| `money_decimals` | string | 0.3.1 | `always` \| `never` \| `auto` |
| `fee_category_id` | string or null | 0.3.1 | UUID of one of the user's **expense** categories — fee drafts from bank slips get it (the "ใช้เป็นหมวดค่าธรรมเนียม" switch). `null` clears. Validated on write; a deleted category is ignored on read. [spec 15 §7](../modules/15-slip-import.md) |

Registration writes `{"timezone": "Asia/Bangkok", "money_style": "color_only"}` (0.4.1-2 P2: no `theme` / `language`; the app sends the device's values once after login). Unknown keys are ignored on read, rejected on write (400).

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

Owned by [`../spec/03-accounts.md`](../modules/03-accounts.md).

### `accounts`

One row per account owned by a user. Credit-type accounts (credit card, pay-later) carry additional billing columns.

| Column               | Type            | Constraints                                  | Description                                                                                   |
| -------------------- | --------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `id`                 | `UUID`          | PK (v7)                                      |                                                                                               |
| `user_id`            | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                                                                         |
| `name`               | `VARCHAR(100)`  | NOT NULL                                     | Display name (e.g., "KBank Savings")                                                          |
| `type`               | `VARCHAR(20)`   | NOT NULL, CHECK                              | `'cash'` \| `'bank'` \| `'e_wallet'` \| `'credit_card'` \| `'pay_later'`                      |
| `balance`            | `DECIMAL(15,2)` | NOT NULL, DEFAULT `0`                        | **Cached** sum of transactions; never written except by transaction service. Includes future-dated rows; the API shows balance − Σ the wallet's future rows (0.4.0-2, C1) |
| `currency`           | `VARCHAR(3)`    | NOT NULL                                     | ISO 4217; defaults to user's currency at creation                                             |
| `icon_code`          | `JSONB`         | NULLABLE                                     | Icon Maker code (icon + colors + background + border)                                         |
| `logo_url`           | `TEXT`          | NULLABLE                                     | User-uploaded logo URL; shown instead of `icon_code` when set; falls back to `icon_code`     |
| `description`        | `TEXT`          | NULLABLE                                     | Optional one-line guidance ("Daily-spend account"). User-editable; never seeded for accounts. |
| `note`               | `TEXT`          | NULLABLE                                     | Free-form user scratch notes ("Old emergency fund — don't touch"). Never seeded.              |
| `status`             | `VARCHAR(20)`   | NOT NULL, DEFAULT `'active'`, CHECK          | `'active'` \| `'archived'` (migration 061 merged `'closed'` into `'archived'`; a real delete is `DELETE`, spec 03 §2.6) |
| `track_balance`      | `BOOLEAN`       | NOT NULL, DEFAULT `TRUE`                     | Migration 058 ("ติดตามยอดเงิน"). FALSE = a wallet without a balance: no balance shown, left out of every total; `balance` keeps the running sum |
| `credit_limit`       | `DECIMAL(15,2)` | NULLABLE                                     | Credit accounts only                                                                          |
| `statement_date`     | `SMALLINT`      | NULLABLE, CHECK (1–31)                       | Day of month statement is generated                                                           |
| `payment_due_date`   | `SMALLINT`      | NULLABLE, CHECK (1–31)                       | Day of month payment is due                                                                   |
| `minimum_payment`    | `DECIMAL(15,2)` | NULLABLE                                     | Minimum payment amount                                                                        |
| `sort_order`         | `INTEGER`       | NOT NULL, DEFAULT `0`                        | No longer read since migration 044 — each member's order is `account_members.sort_order` (§14) |
| `identifiers`        | `JSONB`         | NOT NULL, DEFAULT `'[]'::jsonb`               | 0.3.1 (migration 48) — numbers the wallet is known by on bank slips: `[{kind, value, bank_code?}]`, kind `bank_account` · `promptpay` · `card` · `other`, value digits with `x` for hidden ones. See [spec 15 §5](../modules/15-slip-import.md) |
| `created_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                    |                                                                                               |
| `created_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE                    | NULL = system                                                                                 |
| `updated_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                                                               |
| `updated_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE                    | NULL = system                                                                                 |

**Check constraints:**

- `type IN ('cash', 'bank', 'e_wallet', 'credit_card', 'pay_later')`
- `status IN ('active', 'archived')` (migration 061)
- `statement_date IS NULL OR statement_date BETWEEN 1 AND 31`
- `payment_due_date IS NULL OR payment_due_date BETWEEN 1 AND 31`

**API-layer rule:** if `type IN ('credit_card', 'pay_later')` → `credit_limit` required, others optional. Else → `credit_limit`, `statement_date`, `payment_due_date`, `minimum_payment` must all be NULL.

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_accounts_user ON accounts(user_id, status)` — list queries
- `INDEX idx_accounts_user_sort ON accounts(user_id, sort_order)` — Phase 2 ordering

---

## 04 — Transactions

Owned by [`../spec/04-transactions.md`](../modules/04-transactions.md).

### `transactions`

| Column                          | Type            | Constraints                                | Description                                                                                                                                                                                                                              |
| ------------------------------- | --------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `UUID`          | PK (v7)                                    |                                                                                                                                                                                                                                          |
| `user_id`                       | `UUID`          | FK → `users.id`, NOT NULL                  | Owner (immutable after create)                                                                                                                                                                                                           |
| `account_id`                    | `UUID`          | FK → `accounts.id`, NULLABLE (migration 042) | The account debited or credited. NULL = a wallet-less row (e.g. its wallet was deleted — spec 03 §2.6; the twin leg of a transfer keeps its wallet) |
| `type`                          | `VARCHAR(10)`   | NOT NULL, CHECK                            | `'expense'` \| `'income'` \| `'transfer'`                                                                                                                                                                                                |
| `amount`                        | `DECIMAL(15,2)` | NOT NULL, CHECK > 0                        | Always positive; direction determined by `type` (and category for transfers)                                                                                                                                                             |
| `category_id`                   | `UUID`          | FK → `categories.id`, NULLABLE             | Required if `type = 'transfer'` (must be system Transfer IN/OUT); optional otherwise                                                                                                                                                     |
| `date`                          | `DATE`          | NOT NULL                                   | Transaction calendar date in user's tz. May be after today (0.4.0-2, C1): a future-dated row is a plain transaction; balances, month figures and budget `used` count it from its day |
| `description`                   | `TEXT`          | NULLABLE                                   | What it was for — the title (ค่าอะไร). ≤ 200 chars (API). Migration 051 |
| `note`                          | `TEXT`          | NULLABLE                                   | Free-text note (≤ 500 chars, API-enforced) |
| `project_id`                    | `UUID`          | FK → `projects.id`, NULLABLE               | **Auto-set only on rows that mirror a project**: a claim (`source_project_transaction_id` set) or a debt-settle (`source_personal_debt_id` set, where the debt is project-context). Never settable directly via `POST /v1/transactions`. |
| `transfer_group_id`             | `UUID`          | NULLABLE                                   | Required when `type = 'transfer'`; pairs the two rows of a transfer                                                                                                                                                                      |
| `source_personal_debt_id`       | `UUID`          | FK → `personal_debts.id`, NULLABLE         | The transaction of a person-book row, debt or repayment (paid → expense, received → income; category LOAN_* for a debt, DEBT_* for a repayment). Connected + synced with the row (amount, date, description, note; 0.4.1-1 D1); made from the row, or an existing one connected later (`debt_connected`). It does NOT count in the person's balance (spec 12 §0a) |
| `source_project_transaction_id` | `UUID`          | FK → `project_transactions.id`, NULLABLE   | Set when this transaction was created via the actor's claim of a project_transaction                                                                                                                                                     |
| `debt_connected`                | `BOOLEAN`       | NOT NULL, DEFAULT FALSE                    | Migration 083 (0.4.1-1 D2). TRUE = an EXISTING transaction connected to a person-book row later (`source_personal_debt_id`): it can be disconnected (`POST /personal-debts/:id/unlink`); FALSE = made from the row (can't be disconnected) |
| `debt_prev_category_id`         | `UUID`          | FK → `categories.id` ON DELETE SET NULL, NULLABLE | Migration 083. A connected transaction's category from before it took the kind category; restored on a disconnect. (069's `repay_contact_id` / `repay_person_name` were dropped in 081: repayments are `personal_debts` rows.) |
| `paid_by_amount`                | `DECIMAL(15,2)` | NULLABLE                                   | Migration 070 (0.4.0-3). The part of this EXPENSE someone else paid for me. `amount` stays the bill (reports / budgets / my_share); the wallet moves only `amount − paid_by_amount` (the balance delta, `shared.SignedTxSQL`, wallet month flow). Its debt is the `personal_debts` row with `paid_for_transaction_id` = this row (spec 04 §2.8, spec 12 §1.5a). Migration 080 (0.4.1-0, "รับแทน"): also on an INCOME — someone received part of my income for me; the income counts its whole `amount`, the wallet moves `amount − paid_by_amount`, and the debt is "they owe me" (a `paid` entry) |
| `unlinked_project_transaction_id` | `UUID`        | FK → `project_transactions.id` ON DELETE SET NULL, NULLABLE | Migration 073 (0.4.0-3). Set while "ลงบัญชีของฉัน" is off on an event bill: the row lost its `source_project_transaction_id` / `project_id` but stays in my books, and this remembers the bill so turning it on again links the same row back |
| `private_note`                  | `TEXT`          | NULLABLE                                   | Migration 093 (0.4.1-2 S11). My private note on a copy of a shared bill (event or split); never synced, never notified. API: ≤ 500 chars, only on shared rows (400 `PRIVATE_NOTE_NOT_SHARED`) |
| `created_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                  |                                                                                                                                                                                                                                          |
| `created_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                  | NULL = system                                                                                                                                                                                                                            |
| `updated_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                  | Trigger-updated                                                                                                                                                                                                                          |
| `updated_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                  | NULL = system                                                                                                                                                                                                                            |

**Check constraints:**

- `type IN ('expense', 'income', 'transfer')`
- `amount >= 0` (migration 084, 0.4.1-1 B1: 0 only on rows the system writes — a sync, a recurring auto-create; the API keeps typed amounts > 0)
- At most one of `source_personal_debt_id` / `source_project_transaction_id` is set
- (`transactions_repay_person_check` of migration 069 was dropped in 081)
- `transactions_paid_by_check` (migration 080; 070 allowed only `expense`): `paid_by_amount IS NULL` OR (`paid_by_amount > 0` AND `paid_by_amount <= amount` AND `type IN ('expense', 'income')`)
- `project_id IS NOT NULL` ⇒ at least one source is set (one-way implication: project_id can never appear without a source, but a source CAN exist with `project_id = NULL` — the personal-context debt settle case where the debt has no project)

**API-layer cross-field rules:**

- `type = 'transfer'` → `transfer_group_id IS NOT NULL` AND `category_id IS NOT NULL` (must be system `Transfer IN` or `Transfer OUT`)
- `type IN ('expense', 'income')` → `transfer_group_id IS NULL`
- If `source_personal_debt_id` set → `type` follows the debt's direction: `expense` for `paid`, `income` for `received`; category = the system Debt Paid / Debt Received
- If `source_personal_debt_id` set → category = the kind's system category: `LOAN_GIVEN` / `LOAN_TAKEN` (a debt's transaction, expense / income) or `DEBT_PAID` / `DEBT_RECEIVED` (a repayment's); the category can't be edited; amount, date, description, note are one value with the row (0.4.1-1 D1)
- If `source_project_transaction_id` set → caller must be the actor (linked user behind the project_transaction's `transaction_member_id`); `type` matches source's `type`; `project_id` auto-set from source's `project_id`

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_transactions_user_date ON transactions(user_id, date DESC, created_at DESC)`
- `INDEX idx_transactions_account_date ON transactions(account_id, date DESC, created_at DESC)`
- `INDEX idx_transactions_category ON transactions(category_id, date DESC) WHERE category_id IS NOT NULL`
- `INDEX idx_transactions_project ON transactions(project_id, date DESC) WHERE project_id IS NOT NULL`
- `INDEX idx_transactions_transfer_group ON transactions(transfer_group_id) WHERE transfer_group_id IS NOT NULL`
- `UNIQUE INDEX idx_transactions_source_personal_debt ON transactions(source_personal_debt_id) WHERE source_personal_debt_id IS NOT NULL` — one wallet transaction per debt entry (unique since migration 054)
- `INDEX idx_transactions_source_pt ON transactions(source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL` — claim lookup
- `INDEX idx_transactions_unlinked_pt ON transactions(unlinked_project_transaction_id) WHERE unlinked_project_transaction_id IS NOT NULL` — relink lookup (migration 073)
- `INDEX idx_transactions_user_updated ON transactions(user_id, updated_at)`, `INDEX idx_transactions_account_updated ON transactions(account_id, updated_at)` — sync fingerprints (`POST /sync`, `X-Sync-Versions`: max(updated_at) + count per user), migration 066

**Dropped:** `scheduled_transaction_id` (+ `idx_transactions_scheduled`) in migration 057 — the recurring link lives on `recurring_items.transaction_id` (§11).

**Intentionally absent:** `currency` (inherited from `account.currency`), `photo_url` (Phase 2 OCR without storage), `saving_goal_id` (savings are a notebook of `saving_entries`, §09), `is_split` boolean (inferable from existence of splits).

### `pending_transactions`

Migration 046 (owner design 2026-10-08), kind `saving` added in 060. Drafts waiting to be confirmed — not transactions yet: they never touch balances or reports. Every draft field may be empty; the full transaction rules apply only on submit. Contract: [`ux-overhaul-contract.md`](../archive/design/api/ux-overhaul-contract.md) §14 (archived; current shapes in `openapi.yaml`). No `*_by_user_id` audit columns.

| Column                  | Type          | Constraints                                         | Description |
| ----------------------- | ------------- | --------------------------------------------------- | ----------- |
| `id`                    | `UUID`        | PK (v7)                                             | |
| `user_id`               | `UUID`        | FK → `users.id`, NOT NULL, ON DELETE CASCADE        | Owner |
| `source`                | `VARCHAR(32)` | NOT NULL, DEFAULT `'manual'`                        | Where the draft came from — free text so new sources need no migration: `manual`, `split_paid`, `project_copy`, `project_update`, `ocr`, `chat`. `auto_save` (goal auto-saves) is legacy: `saving_auto` was dropped in 077, the drafts it had made stay. `recurring` / `upcoming` are legacy: since migration 068 recurring makes no drafts |
| `kind`                  | `VARCHAR(16)` | NOT NULL, DEFAULT `'create'`, CHECK                 | What submitting does: `create` (a new transaction) \| `settle_debt` (a new debt entry for `target_debt_id`'s person) \| `update_tx` (edits `target_transaction_id`) \| `saving` (a saving entry, migration 060) |
| `draft`                 | `JSONB`       | NOT NULL, DEFAULT `'{}'`                            | The `POST /transactions` body (plus `tag_ids`), every key optional |
| `target_debt_id`        | `UUID`        | FK → `personal_debts.id`, NULLABLE, ON DELETE CASCADE | `settle_debt` only |
| `target_transaction_id` | `UUID`        | FK → `transactions.id`, NULLABLE, ON DELETE CASCADE | `update_tx` only |
| `source_ref`            | `JSONB`       | NULLABLE                                            | What the draft is based on, for display (e.g. "Aom paid back ฿300", `auto_save_id`). Never read by submit |
| `last_error`            | `JSONB`       | NULLABLE                                            | Why the last submit failed (code + message); cleared on edit |
| `created_at`            | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                           | |
| `updated_at`            | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                           | Trigger-updated |

**Check constraints:**

- `kind IN ('create', 'settle_debt', 'update_tx', 'saving')`
- `pending_kind_target`: `create` / `saving` → both targets NULL; `settle_debt` → `target_debt_id` set; `update_tx` → `target_transaction_id` set

**Indexes:** `INDEX idx_pending_transactions_user ON pending_transactions(user_id, created_at DESC)`.

---

## 05 — Categories & Tags

Owned by [`../spec/05-categories-tags.md`](../modules/05-categories-tags.md).

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
| `system_kind`        | `VARCHAR(30)`  | NULLABLE, CHECK paired with `is_system`      | Stable identifier for the reserved system categories. NULL for user categories. Values: `OPENING_IN`, `OPENING_OUT`, `ADJUST_IN`, `ADJUST_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `DEBT_PAID`, `DEBT_RECEIVED` (026), `LOAN_GIVEN`, `LOAN_TAKEN` (082). Since 0.4.1-1 (D6) a system category's name and `include_in_report` can't change (API); the app words the name from this. |
| `icon_code`          | `JSONB`        | NULLABLE                                     | Icon Maker code                                                                                                                                                                                                                            |
| `sort_order`         | `INT`          | NOT NULL, DEFAULT `0`                        | Sibling order under `(user_id, type, parent_id)`; lower = earlier. Bulk-rewritten by `PATCH /v1/categories/reorder`.                                                                                                                       |
| `include_in_report`  | `BOOLEAN`      | NOT NULL, DEFAULT `TRUE`                     | Per-row toggle for spending reports. Seeded `FALSE` for _Adjustment_, _Transfer In/Out_, and the _Lending_ / _Reimbursement_ starters.                                                                                                     |
| `description`        | `TEXT`         | NULLABLE                                     | Optional one-line guidance ("Restaurants and groceries"). User-editable; seeded for default starter categories.                                                                                                                            |
| `note`               | `TEXT`         | NULLABLE                                     | Free-form user scratch notes. Never seeded.                                                                                                                                                                                                |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    |                                                                                                                                                                                                                                            |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system                                                                                                                                                                                                                              |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                                                                                                                                                                                                            |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system                                                                                                                                                                                                                              |

**Check constraints:**

- `type IN ('income', 'expense')`
- `id != parent_id` — no self-parenting
- `(is_system = TRUE AND system_kind IS NOT NULL) OR (is_system = FALSE AND system_kind IS NULL)` — system identity is the kind, not the name
- System categories (`is_system = true`) cannot have a parent (API-enforced)

**API-layer 3-layer depth limit:** backend walks up from candidate `parent_id` counting hops; reject if > 3 with `400 MAX_DEPTH_EXCEEDED`.

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_categories_user ON categories(user_id)` — list queries
- `INDEX idx_categories_parent ON categories(parent_id)` — tree traversal
- `UNIQUE INDEX idx_categories_name ON categories(user_id, type, parent_id, LOWER(name)) NULLS NOT DISTINCT` — case-insensitive uniqueness per (user, type, parent_id)
- `UNIQUE INDEX idx_categories_system_kind ON categories(user_id, system_kind) WHERE system_kind IS NOT NULL` — guards against duplicate system seeding
- `INDEX idx_categories_user_updated ON categories(user_id, updated_at)` — sync fingerprints (migration 066)

**No `status`** (dropped in migration 061): delete is always a real delete since migration 043 — children move up to the nearest ancestor, transactions drop to "no category" (`ON DELETE SET NULL`), budget category scopes cascade. Migration 043 purged the rows archived under the old rule.

### `tags`

Flat, no hierarchy.

| Column               | Type          | Constraints                                  | Description                                                      |
| -------------------- | ------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `id`                 | `UUID`        | PK (v7)                                      |                                                                  |
| `user_id`            | `UUID`        | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                                            |
| `name`               | `VARCHAR(50)` | NOT NULL                                     | Label text                                                       |
| `description`        | `TEXT`        | NULLABLE                                     | ≤ 200 chars (API). Migration 051 |
| `note`               | `TEXT`        | NULLABLE                                     | ≤ 500 chars (API). Migration 051 |
| `icon_code`          | `JSONB`       | NULLABLE                                     | Icon Maker code                                                  |
| `created_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                    |                                                                  |
| `created_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE                    | NULL = system                                                    |
| `updated_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                                  |
| `updated_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE                    | NULL = system                                                    |

**Indexes:**

- `PRIMARY KEY (id)`
- `UNIQUE INDEX idx_tags_name ON tags(user_id, LOWER(name))` — case-insensitive uniqueness
- `INDEX idx_tags_user ON tags(user_id)`
- `INDEX idx_tags_user_updated ON tags(user_id, updated_at)` — sync fingerprints (migration 066)

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

Primary key: `(transaction_id, tag_id)`. Junction rows are typically immutable (insert/delete only); `updated_at` / `updated_by_user_id` are present for uniformity but rarely change. `INDEX idx_transaction_tags_tag_updated ON transaction_tags(tag_id, updated_at)` — sync fingerprints (migration 066).

---

## 06 — (Removed: shared_expense_splits)

**Removed in migration 24** (Phase 1b refactor).

The `shared_expense_splits` table is gone. Splits and personal_debts are
unified into a single bidirectional `personal_debts` table — see §12.
Every "X owes Y" relationship lives there now, regardless of how it
originated (transaction split, manual cash loan, broken-item compensation).

`transactions.source_split_id` was renamed to `source_personal_debt_id`
(migration 25).

The original spec [`../spec/06-shared-expenses.md`](../modules/06-shared-expenses.md)
is kept as historical record but the model it describes is no longer in
use; see [`../spec/12-personal-debts.md`](../modules/12-personal-debts.md) for
the current model.

---

## 07 — Contacts

Owned by [`../spec/07-contacts.md`](../modules/07-contacts.md).

### `contacts`

One row per contact owned by a user. May or may not be linked to another app user via `linked_user_id`.

| Column               | Type           | Constraints                                  | Description                                |
| -------------------- | -------------- | -------------------------------------------- | ------------------------------------------ |
| `id`                 | `UUID`         | PK (v7)                                      |                                            |
| `user_id`            | `UUID`         | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                                      |
| `display_name`       | `VARCHAR(100)` | NOT NULL                                     | Primary label                              |
| `nickname`           | `VARCHAR(100)` | NULLABLE                                     | My own label for the contact (migration 053; back after migration 29 had merged it into `display_name`) |
| `show_nickname`      | `BOOLEAN`      | NOT NULL, DEFAULT `TRUE`                     | Migration 053. Off: the nickname is kept but the contact shows as its linked user's profile name (or its `display_name`) |
| `email`              | `VARCHAR(255)` | NULLABLE                                     | Optional; not used for linking in Phase 1b |
| `phone`              | `VARCHAR(50)`  | NULLABLE                                     | Optional; informational                    |
| `description`        | `TEXT`         | NULLABLE                                     | ≤ 200 chars (API). Migration 051 |
| `note`               | `TEXT`         | NULLABLE                                     | User free-form note (was `notes`, renamed in migration 051) |
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

Owned by [`../spec/08-budgets.md`](../modules/08-budgets.md).

### `budgets`

| Column               | Type            | Constraints                         | Description                             |
| -------------------- | --------------- | ----------------------------------- | --------------------------------------- |
| `id`                 | `UUID`          | PK (v7)                             |                                         |
| `user_id`            | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE | Owner                          |
| `name`               | `VARCHAR(100)`  | NOT NULL                            | Title                                   |
| `description`        | `TEXT`          | NULLABLE                            | ≤ 200 chars (API)                       |
| `note`               | `TEXT`          | NULLABLE                            | ≤ 500 chars (API)                       |
| `icon_code`          | `JSONB`         | NULLABLE                            | Icon Maker code (back in v2; migration 059 copied the old category's icon) |
| `amount`             | `NUMERIC(15,2)` | NOT NULL, CHECK > 0                 | Base amount per period (a stored period may override it) |
| `warn_pct`           | `SMALLINT`      | NULLABLE, CHECK 1–100               | Warn at this % of the amount; NULL = ไม่เตือน (API default 80) |
| `scope_all`          | `BOOLEAN`       | NOT NULL, DEFAULT `FALSE`           | TRUE = every expense counts (no category / tag / wallet scope) |
| `tag_names`          | `TEXT[]`        | NOT NULL, DEFAULT `'{}'`            | Tag-NAME scope (matches personal tags and event tags by name) |
| `recurring`          | `BOOLEAN`       | NOT NULL, DEFAULT `FALSE`           | TRUE = recurring periods ("งบระยะยาว"); FALSE = one range |
| `freq`               | `VARCHAR(10)`   | NULLABLE, CHECK                     | `'daily'` \| `'weekly'` \| `'monthly'` \| `'yearly'`; set iff `recurring` |
| `interval_n`         | `INT`           | NOT NULL, DEFAULT `1`, CHECK ≥ 1    | Every n periods                         |
| `start_date`         | `DATE`          | NOT NULL                            | First day (a month period starts on the start's day, clamped) |
| `anchor_date`        | `DATE`          | NOT NULL                            | Periods are generated from here: `start_date`, or the period a "this and following" rule change took effect at (earlier periods stay) |
| `end_kind`           | `VARCHAR(10)`   | NOT NULL, DEFAULT `'none'`, CHECK   | `'none'` \| `'date'` \| `'count'`       |
| `end_date`           | `DATE`          | NULLABLE                            | `end_kind = 'date'`; for a one range, its last day |
| `end_count`          | `INT`           | NULLABLE, CHECK ≥ 1                 | `end_kind = 'count'`                    |
| `closed_on`          | `DATE`          | NULLABLE                            | Set by ปิดงบ (the budget is then `ended`) |
| `status`             | `VARCHAR(10)`   | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'archived'` (the shown state upcoming / active / ended is derived) |
| `created_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           |                                         |
| `updated_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           | Trigger-updated                         |

**Budgets v2 (migration 059, 2026-10-13)** replaced the v1 table (one `category_id`, `scope` user / project, `project_id`, fixed `period`, `currency`). Personal v1 budgets became recurring budgets on their category (with sub-categories); event-scope budgets were dropped. No `currency` column (the user's currency) and no `*_by_user_id` audit columns.

**Check constraints:**

- `amount > 0`, `warn_pct BETWEEN 1 AND 100`, `interval_n >= 1`, `end_count >= 1`
- `freq IN ('daily', 'weekly', 'monthly', 'yearly')`, `end_kind IN ('none', 'date', 'count')`, `status IN ('active', 'archived')`
- `recurring = (freq IS NOT NULL)`

**Indexes:** `PRIMARY KEY (id)`, `INDEX idx_budgets_v2_user ON budgets(user_id, status)`.

### `budget_categories`

Category scope of a budget (migration 059).

| Column             | Type      | Constraints                                       | Description |
| ------------------ | --------- | ------------------------------------------------- | ----------- |
| `budget_id`        | `UUID`    | FK → `budgets.id`, NOT NULL, ON DELETE CASCADE    | |
| `category_id`      | `UUID`    | FK → `categories.id`, NOT NULL, ON DELETE CASCADE | Deleting the category removes it from the scope |
| `include_children` | `BOOLEAN` | NOT NULL, DEFAULT `TRUE`                          | Sub-categories count too |

Primary key: `(budget_id, category_id)`.

### `budget_wallets`

Wallet scope of a budget (migration 059).

| Column       | Type   | Constraints                                     | Description |
| ------------ | ------ | ----------------------------------------------- | ----------- |
| `budget_id`  | `UUID` | FK → `budgets.id`, NOT NULL, ON DELETE CASCADE  | |
| `account_id` | `UUID` | FK → `accounts.id`, NOT NULL, ON DELETE CASCADE | Deleting the wallet removes it from the scope |

Primary key: `(budget_id, account_id)`.

### `budget_periods`

Periods that have started, each with its own amount and note (migration 059). A new one is stored on read when it begins; later periods follow the budget.

| Column       | Type            | Constraints                                    | Description |
| ------------ | --------------- | ---------------------------------------------- | ----------- |
| `id`         | `UUID`          | PK (v7)                                        | |
| `budget_id`  | `UUID`          | FK → `budgets.id`, NOT NULL, ON DELETE CASCADE | |
| `seq`        | `INT`           | NOT NULL                                       | Period number |
| `start_date` | `DATE`          | NOT NULL                                       | |
| `end_date`   | `DATE`          | NULLABLE                                       | NULL = open (one range until ปิดงบ) |
| `amount`     | `NUMERIC(15,2)` | NOT NULL, CHECK > 0                            | This period's amount |
| `base_amount` | `NUMERIC(15,2)` | NOT NULL, CHECK > 0 (`budget_periods_base_amount_check`) | Migration 078 (0.4.0-4, "แก้เฉพาะรอบนี้"). What the period would be without its own amount: the budget's amount for that period. "ใช้งบปกติ" puts `amount` back to it, so a past period never takes today's budget amount. Backfill: `budgets.amount` for overridden periods, else the period's `amount` |
| `overridden` | `BOOLEAN`       | NOT NULL, DEFAULT `FALSE`                      | TRUE = set for this period only ("เฉพาะรอบนี้"); kept when the budget's amount changes |
| `note`       | `TEXT`          | NULLABLE                                       | |
| `created_at` | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                      | |

**Unique:** `(budget_id, start_date)`.

**No usage snapshot.** `used` / expected are computed at read time (expected includes computed recurring occurrences since migration 068, §11).

---

## 09 — Saving Goals

Owned by [`../spec/09-saving-goals.md`](../modules/09-saving-goals.md).

### `saving_goals`

| Column               | Type            | Constraints                         | Description                                             |
| -------------------- | --------------- | ----------------------------------- | ------------------------------------------------------- |
| `id`                 | `UUID`          | PK (v7)                             |                                                         |
| `user_id`            | `UUID`          | FK → `users.id`, NOT NULL           | Owner                                                   |
| `name`               | `VARCHAR(100)`  | NOT NULL                            | Goal name                                               |
| `target_amount`      | `DECIMAL(15,2)` | NULLABLE, CHECK > 0                 | NULL = no target, open-ended saving (migration 065): no %, ETA, pace or `month_short` |
| `deadline`           | `DATE`          | NULLABLE                            | Optional target date                                    |
| `milestones`         | `INT[]`         | NOT NULL, DEFAULT `'{25,50,75,100}'` | Progress milestones in % (migration 060)               |
| `icon_code`          | `JSONB`         | NULLABLE                            | Icon Maker code                                         |
| `status`             | `VARCHAR(20)`   | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'completed'` (ปิดเป้าหมาย) \| `'archived'` (migration 060 added `completed`) |
| `closed_at`          | `TIMESTAMPTZ`   | NULLABLE                            | When the goal was closed (ปิดเป้าหมาย, migration 060)    |
| `period_amount`      | `NUMERIC(15,2)` | NULLABLE, CHECK > 0                 | Migration 079 (0.4.0-5, "เป้าต่อรอบ"). The target per period; NULL = no period target. A period's target never goes past what the goal still needs; a short period is not carried into the next one |
| `period_freq`        | `TEXT`          | NULLABLE, CHECK                     | Migration 079. `'daily'` \| `'weekly'` \| `'monthly'` \| `'yearly'` |
| `period_interval`    | `INT`           | NOT NULL, DEFAULT `1`, CHECK 1–99   | Migration 079. Every n `period_freq` |
| `period_anchor`      | `DATE`          | NULLABLE                            | Migration 079. The first period starts here; the rest follow every `period_interval` `period_freq` (API default: the 1st of this month, monthly) |
| `description`        | `TEXT`          | NULLABLE                            | ≤ 200 chars (API). Migration 051 |
| `note`               | `TEXT`          | NULLABLE                            |                                                         |
| `created_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           |                                                         |
| `created_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                                           |
| `updated_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`           | Trigger-updated                                         |
| `updated_by_user_id` | `UUID`          | FK → `users.id`, NULLABLE           | NULL = system                                           |

**Saving goals v2 (migration 060, 2026-10-13):** savings are a NOTEBOOK (`saving_entries` below), never transactions. `linked_account_id`, `allocation_pct`, their CHECK and `idx_saving_goals_account` were dropped; old goals kept their texts / target / deadline with 0 saved.

**Check constraints:**

- `target_amount > 0` (NULL passes)
- `status IN ('active', 'completed', 'archived')`
- `period_amount > 0`, `period_freq IN ('daily', 'weekly', 'monthly', 'yearly')`, `period_interval BETWEEN 1 AND 99` (migration 079; NULLs pass)

**No stored progress.** Saved = the sum of the goal's `saving_entries`; progress, pace, ETA and the month numbers are computed at read time.

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_saving_goals_user ON saving_goals(user_id, status)` — list queries

### `saving_entries`

Migration 060. One row moves an amount of ONE wallet between buckets: the wallet's available money, the spare bucket ("ยังไม่จัดสรร") or a goal. Never touches transactions or wallet balances. A (bucket, wallet) balance is the sum of its entries and never goes below 0 (API). No `*_by_user_id` audit columns.

| Column         | Type            | Constraints                                     | Description |
| -------------- | --------------- | ----------------------------------------------- | ----------- |
| `id`           | `UUID`          | PK (v7)                                         | |
| `user_id`      | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE    | Owner |
| `group_id`     | `UUID`          | NOT NULL                                        | One user action: a multi-wallet withdraw / move writes one row per wallet under one group |
| `kind`         | `VARCHAR(10)`   | NOT NULL, CHECK                                 | `'save'` \| `'withdraw'` \| `'move'` |
| `account_id`   | `UUID`          | FK → `accounts.id`, NULLABLE, ON DELETE SET NULL | The wallet the money is in. NULL = **unallocated** (migration 061): counts for its goal, never for a wallet (a deleted wallet's goal money is kept this way) |
| `from_bucket`  | `VARCHAR(10)`   | NOT NULL, CHECK                                 | `'available'` \| `'spare'` \| `'goal'` |
| `from_goal_id` | `UUID`          | FK → `saving_goals.id`, NULLABLE, ON DELETE SET NULL | When `from_bucket = 'goal'` |
| `to_bucket`    | `VARCHAR(10)`   | NOT NULL, CHECK                                 | `'available'` \| `'spare'` \| `'goal'` |
| `to_goal_id`   | `UUID`          | FK → `saving_goals.id`, NULLABLE, ON DELETE SET NULL | When `to_bucket = 'goal'` |
| `amount`       | `NUMERIC(15,2)` | NOT NULL, CHECK > 0                             | |
| `date`         | `DATE`          | NOT NULL                                        | |
| `note`         | `TEXT`          | NULLABLE                                        | |
| `source`       | `VARCHAR(10)`   | NOT NULL, DEFAULT `'manual'`, CHECK             | `'manual'` \| `'recurring'` (a confirmed occurrence of a recurring saving setting — again since migration 077; before that, legacy drafts of the pre-062 ออม settings) \| `'pending'` (any other pending saving draft, e.g. a legacy auto-save draft) |
| `created_at`   | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                       | |
| `updated_at`   | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                       | Trigger-updated |

**Check constraints:**

- `save`: `from_bucket = 'available'` AND `to_bucket <> 'available'`
- `withdraw`: `from_bucket <> 'available'` AND `to_bucket = 'available'`
- `move`: neither side is `'available'`

**Indexes:** `(user_id, date DESC, created_at DESC)`, `(account_id)`, `(from_goal_id) WHERE from_goal_id IS NOT NULL`, `(to_goal_id) WHERE to_goal_id IS NOT NULL`, `idx_saving_entries_user_updated (user_id, updated_at)` (sync fingerprints, migration 066).

### Removed: `saving_auto`

**Dropped in migration 077 (0.4.0-4).** Goal auto-saves (062, many per goal since 067) are recurring saving settings again: `recurring_rules` with `type = kind = 'saving'` and `goal_id` (NULL = the unallocated pot), §11. Data: every `saving_auto` row with a known `rule.freq` became a rule with the same `id` (name `ออม <goal>` or `ออมเงิน`, its amount / wallet / rule / start / end, `tracked_from = last_produced + 1` else `start_date`, paused when the goal was not active); the table, its trigger and `idx_saving_auto_goal` are gone. Pending saving drafts it had already made (`source = 'auto_save'`) stay. Down rebuilds `saving_auto` (067 shape) from the saving rules with an amount and deletes those rules.

---

## 10 — Projects

Owned by [`../spec/10-projects.md`](../modules/10-projects.md).

### `projects`

Thin container for a project.

| Column               | Type           | Constraints                         | Description                                                                         |
| -------------------- | -------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                             |                                                                                     |
| `owner_user_id`      | `UUID`         | FK → `users.id`, NOT NULL           | Current owner (mutable via ownership transfer)                                      |
| `name`               | `VARCHAR(100)` | NOT NULL                            | Display name (e.g., "Japan Trip 2026")                                              |
| `description`        | `TEXT`         | NULLABLE                            |                                                                                     |
| `note`               | `TEXT`         | NULLABLE                            | ≤ 500 chars (API). Migration 051 |
| `start_date`         | `DATE`         | NULLABLE                            |                                                                                     |
| `end_date`           | `DATE`         | NULLABLE                            |                                                                                     |
| `status`             | `VARCHAR(20)`  | NOT NULL, DEFAULT `'active'`, CHECK | `'active'` \| `'completed'` \| `'cancelled'` \| `'archived'`                        |
| `icon_code`          | `JSONB`        | NULLABLE                            | Icon Maker code                                                                     |
| `planned_amount`     | `DECIMAL(15,2)`| NULLABLE, CHECK (`planned_amount > 0`) (migration 040) | Planned total spend for the project (UI: "ตั้งงบไว้"). NULL = not set (plan UI hidden). Freely editable via project update. See `10-projects` §4.23 |
| `kind`               | `VARCHAR(10)`  | NOT NULL, DEFAULT `'event'`, CHECK (`projects_kind_check`: `event`, `split`) | Migration 093 (0.4.1-2 S1). `split` = the hidden one-bill "event" of a split bill (a bill with no event): never shown as an event (lists, numbers, settle, pickers filter `kind = 'event'`); its people are its members (linked users active at once, no invite) |
| `completed_at`       | `TIMESTAMPTZ`  | NULLABLE                            | Migration 101 (0.4.1-2 V2). Set by `POST /projects/{id}/complete` = locked for good (never back to active / cancelled, no delete; archive keeps it, restore returns it to `completed`). Backfill: completed events got `updated_at`. Trigger `project_transactions_locked` (BEFORE INSERT / UPDATE OF the bill's own values) refuses bill writes on such an event (`EVENT_COMPLETED`) |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`           |                                                                                     |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE           | NULL = system                                                                       |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`           | Trigger-updated                                                                     |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE           | NULL = system                                                                       |

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_projects_owner ON projects(owner_user_id, kind, status)` — owner's projects list (migration 093 added `kind`; was `(owner_user_id, status)`)
- `INDEX idx_projects_status ON projects(status, updated_at DESC)` — member queries

**`planned_amount` is one nullable number** — no separate table, no period. Named `planned_amount` (not "budget") to stay unambiguous vs the `budgets` table. Spent is computed from `project_transactions` parents (expenses − income); never cached. Decided 2026-09-11, resolving the former "budget_goal" open question.

**Dropped:** `type` (`'trip'` / `'sales'` / `'freelance'` / `'other'`) in migration 055 — an event carries each member's personal tags instead (`project_my_tags`).

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
| `removed_at`         | `TIMESTAMPTZ`  | NULLABLE                                        | Migration 101 (0.4.1-2 V15). Set when the OWNER removed them (left_at alone = they left). Their spots on bills stay = empty persons "( ) ____" to assign; the event can't be completed while one is left |
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
| `type`                          | `VARCHAR(20)`   | NOT NULL, CHECK                                             | `'expense'` \| `'income'` \| `'payback'` (migration 072, 0.4.0-3: "A paid B" back is a row of its own — parent `transaction_member_id` = who paid back, ONE child = who got it, same amount). Transfers excluded — no accounts on either end. |
| `amount`                        | `NUMERIC(18,4)` | NOT NULL, CHECK > 0                                         | On a child, this is the share amount (not the parent total)                                                                                                            |
| `currency`                      | `VARCHAR(3)`    | NOT NULL                                                    | ISO 4217                                                                                                                                                               |
| `date`                          | `DATE`          | NOT NULL                                                    |                                                                                                                                                                        |
| `note`                          | `TEXT`          | NULLABLE                                                    |                                                                                                                                                                        |
| `marks`                         | `UUID[]`        | NOT NULL, DEFAULT `'{}'`                                    | Set of `project_member.id` values that have marked this row "resolved on the board". Independent of personal-book actions — toggling does NOT create personal entries. |
| `description`                   | `TEXT`          | NULLABLE                                                    | Optional user-supplied label for the transaction; editable                                                                                                             |
| `linked_transaction_id`         | `UUID`          | FK → `transactions.id`, NULLABLE, ON DELETE SET NULL, UNIQUE (partial) | Migration 056. The personal transaction a bill was made FROM (explicit link; amounts may differ, the money is linked by prompt). A deleted transaction just breaks it |
| `unlinked_transaction_id`       | `UUID`          | FK → `transactions.id`, NULLABLE, ON DELETE SET NULL        | Migration 073 (0.4.0-3). The bill's `linked_transaction_id` while "ลงบัญชีของฉัน" is off (the tx is unlinked but kept); turning it on again puts it back. Pairs with `transactions.unlinked_project_transaction_id` / `personal_debts.unlinked_project_transaction_id` |
| `paid_back_for_id`              | `UUID`          | FK → `project_transactions.id`, NULLABLE, ON DELETE SET NULL; partial index `idx_project_transactions_paid_back_for` | Migration 091 (0.4.1-1 E8). On a payback row made for a bill member ticked "คืนแล้ว": that bill. Un-ticking it on a bill edit removes the row (and the editor's repayment of it); the board shows the tick (`BoardSplit.paid_back`). NULL on paybacks entered on their own; deleting the bill leaves them as plain paybacks (0.4.1-2 V13: deleting an event bill deletes them) |
| `payback_kind`                  | `VARCHAR(10)`   | NULLABLE, CHECK (`payback`, `loan`)                         | Migration 102 (0.4.1-2 V11). On a payback parent: `payback` (NULL reads the same) or `loan` (lending during the event). Same settle math; a claim books a payback as a repayment row, a loan as a debt row |
| `created_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                   |                                                                                                                                                                        |
| `created_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                   | NULL = system                                                                                                                                                          |
| `updated_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                   | Trigger-updated                                                                                                                                                        |
| `updated_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                   | NULL = system                                                                                                                                                          |

**Constraints:**

- `type IN ('expense', 'income', 'payback')` (`payback` added in migration 072)
- `amount > 0`
- `transaction_member_id` must belong to the same `project_id` (API-validated; cross-project mismatch rejected)
- A parent row's `parent_project_transaction_id` must be NULL (max 1 level deep — service-layer enforced)
- Self-split forbidden: a child's `transaction_member_id` must differ from its parent's `transaction_member_id` (service-layer enforced)
- Sum of children's `amount` ≤ parent's `amount` (service-layer enforced)
- Trigger `project_transactions_locked` (migration 101, function `project_transactions_locked_check`): BEFORE INSERT, or UPDATE OF `project_id`, `parent_project_transaction_id`, `transaction_member_id`, `type`, `amount`, `date`, `description`, `note`, `marks` — raises `EVENT_COMPLETED` (P0001) when the event's `completed_at` is set (reads the event row FOR SHARE, so it waits for a complete in flight). Link columns (`linked_transaction_id` …) still change. A race backstop: the API checks first (409 `EVENT_COMPLETED`)

**No `account_id`** — project_transactions never hit a personal account. Personal entries are created client-side via the regular `POST /transactions` (with `source_project_transaction_id` set for traceback) or `POST /personal-debts`.

**No categories** — categories are user-scoped resources and ambiguous on a shared row. Categories are picked fresh by each user at resolve time, on the personal-book entry (a personal copy matches the user's category by tag name). `category_id` dropped in migration 27; the `category_name` / `category_icon_code` snapshots (migrations 31 / 33) were replaced by `tags` in migration 47 — the old name became the row's first tag, the icon was dropped. Migration 055 turned those free-text `tags` into event tags (`event_tags` + `project_transaction_tags`, one tag per name per event, first spelling wins) and dropped the column.

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_project_tx_project ON project_transactions(project_id, date DESC)` — board queries
- `INDEX idx_project_tx_member ON project_transactions(transaction_member_id)` — "this member's project_transactions"
- `INDEX idx_project_tx_recorder ON project_transactions(record_user_id)` — audit / "what did Alice record"
- `INDEX project_transactions_parent_idx ON project_transactions(parent_project_transaction_id) WHERE parent_project_transaction_id IS NOT NULL` — child lookup by parent
- `UNIQUE INDEX idx_project_transactions_linked_tx ON project_transactions(linked_transaction_id) WHERE linked_transaction_id IS NOT NULL` — one bill per personal transaction (migration 056)
- `INDEX idx_project_transactions_project_updated ON project_transactions(project_id, updated_at)` — sync fingerprints (migration 066)

### `project_transaction_payers`

Migration 105 (0.4.1-2 multi-payer, owner 2026-10-28). A bill's payers ("คนจ่าย") with what each paid, ONLY when there are 2+; none = the bill's `transaction_member_id` paid it all. `transaction_member_id` is always the main (biggest) payer, so the shares stay "child rows + the main payer's rest". PK `(project_transaction_id, member_id)` (FK CASCADE both), `amount > 0`; Σ = the bill (API). Trigger `project_transaction_payers_locked` refuses changes on a completed event.

| Column                   | Type            | Constraints                                                 | Description |
| ------------------------ | --------------- | ----------------------------------------------------------- | ----------- |
| `project_transaction_id` | `UUID`          | PK, FK → `project_transactions.id`, NOT NULL, ON DELETE CASCADE | The bill (parent row) |
| `member_id`              | `UUID`          | PK, FK → `project_members.id`, NOT NULL, ON DELETE CASCADE  | One payer |
| `amount`                 | `DECIMAL(15,2)` | NOT NULL, CHECK `> 0`                                       | What this payer paid |

No audit columns. **Indexes:** `PRIMARY KEY (project_transaction_id, member_id)`, `INDEX idx_project_transaction_payers_member ON project_transaction_payers(member_id)`. **Trigger:** `project_transaction_payers_locked` (function `project_transaction_payers_locked_check`, BEFORE INSERT OR UPDATE) raises `EVENT_COMPLETED` (P0001) when the bill's event has `completed_at` set (locks the event row FOR SHARE). DELETE is not covered by the trigger (the API checks).

**View `project_bill_pairs(pt_id, project_id, type, debtor, creditor, amount)`** — every bill's real pairs: each share is split over the payers by what they paid (member m owes payer p = share_m × paid_p / bill, 2 dp); income flipped (the one who received owes); a payback = the receiver owes the giver. Settle, claims, `Event.my_net` read it.

### `event_settle_bookings`

Migration 103 (0.4.1-2 V12). One row per member who booked a completed event's fewest-transfers settle into their book ("ลงในสมุดฉัน", once). PK `(project_id, user_id)`, both FK CASCADE; `lines` JSONB `[{member_id, amount, pay, transaction_id}]`; `booked_at`. Once booked, that member's real pairs count as claimed.

| Column       | Type          | Constraints                                     | Description |
| ------------ | ------------- | ----------------------------------------------- | ----------- |
| `project_id` | `UUID`        | PK, FK → `projects.id`, NOT NULL, ON DELETE CASCADE | The event |
| `user_id`    | `UUID`        | PK, FK → `users.id`, NOT NULL, ON DELETE CASCADE    | The member who booked |
| `lines`      | `JSONB`       | NOT NULL, DEFAULT `'[]'::jsonb`                 | The simplified lines booked: `[{member_id, amount, pay, transaction_id}]` (a plain transaction per line with me) |
| `booked_at`  | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                       | |

No audit columns, no extra index.

### `shared_bill_opt_outs`

Migration 093 (0.4.1-2 rule a / f). "I disconnected my copy of this bill" (tx-detail disconnect, `POST /event-bills/{pt_id}/disconnect`, or deleting my copy). The bill no longer reaches that user (no copy, no notices) until they connect again (row deleted).

| Column                   | Type          | Constraints                                                     | Description |
| ------------------------ | ------------- | --------------------------------------------------------------- | ----------- |
| `project_transaction_id` | `UUID`        | PK, FK → `project_transactions.id`, NOT NULL, ON DELETE CASCADE | The bill |
| `user_id`                | `UUID`        | PK, FK → `users.id`, NOT NULL, ON DELETE CASCADE                | The member who disconnected |
| `created_at`             | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                       | |

No audit columns. **Indexes:** `PRIMARY KEY (project_transaction_id, user_id)`.

### `event_tags`

Migration 055. Event-scoped tags: owned by the event, shared by its members, with an icon / colour. Bills carry them through `project_transaction_tags`.

| Column               | Type          | Constraints                                     | Description |
| -------------------- | ------------- | ----------------------------------------------- | ----------- |
| `id`                 | `UUID`        | PK (v7)                                         | |
| `project_id`         | `UUID`        | FK → `projects.id`, NOT NULL, ON DELETE CASCADE | The event |
| `name`               | `VARCHAR(50)` | NOT NULL                                        | Unique per event, case-insensitive |
| `icon_code`          | `JSONB`       | NULLABLE                                        | Icon Maker code |
| `created_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                       | |
| `created_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE, ON DELETE SET NULL   | |
| `updated_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                       | Trigger-updated |
| `updated_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE, ON DELETE SET NULL   | |

**Indexes:** `UNIQUE INDEX idx_event_tags_name ON event_tags(project_id, LOWER(name))`.

### `project_transaction_tags`

Migration 055. Junction: a bill's event tags.

| Column                   | Type   | Constraints                                                 |
| ------------------------ | ------ | ----------------------------------------------------------- |
| `project_transaction_id` | `UUID` | FK → `project_transactions.id`, NOT NULL, ON DELETE CASCADE |
| `event_tag_id`           | `UUID` | FK → `event_tags.id`, NOT NULL, ON DELETE CASCADE           |

Primary key: `(project_transaction_id, event_tag_id)`. `INDEX idx_project_transaction_tags_tag ON project_transaction_tags(event_tag_id)`. No audit columns.

### `project_my_tags`

Migration 055. Each member's own PERSONAL tags on an event (private to that member; the event list filters by them).

| Column       | Type          | Constraints                                     | Description |
| ------------ | ------------- | ----------------------------------------------- | ----------- |
| `project_id` | `UUID`        | FK → `projects.id`, NOT NULL, ON DELETE CASCADE | The event |
| `user_id`    | `UUID`        | FK → `users.id`, NOT NULL, ON DELETE CASCADE    | The member |
| `tag_id`     | `UUID`        | FK → `tags.id`, NOT NULL, ON DELETE CASCADE     | One of that member's personal tags |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                       | |

Primary key: `(project_id, tag_id)`. `INDEX idx_project_my_tags_user ON project_my_tags(user_id, tag_id)`.

---

<a id="11--scheduled-transactions"></a>

## 11 — Recurring

Owned by [`../spec/11-scheduled-transactions.md`](../modules/11-scheduled-transactions.md) (the file keeps its old name).

**The "หนี้" kind (migrations 111–112, 0.4.1-2 K).** `recurring_rules`: `type` / `kind` CHECKs add `debt`; `pause_reason` adds `no_balance`; new `contact_id` (FK contacts, SET NULL), `person_name` VARCHAR(100), `debt_kind` (debt | repayment), `debt_direction` (paid | received), `zero_rounds` INT 0–3; `recurring_rules_debt_fields_check`: type debt ⇔ person_name + debt_kind + debt_direction set, contact_id only on debt. `recurring_items.debt_entry_id` (FK personal_debts, SET NULL, UNIQUE): the entry that fills the slot. Trigger `personal_debts_recurring_skip` (112, BEFORE DELETE on personal_debts): the slot of a deleted entry is skipped with its amount.

**Removed: `scheduled_transactions`.** Migration 057 (0.3.1-10, 2026-10-13) dropped the table (its rows were not migrated; the installment / loan extras went with it) and `transactions.scheduled_transaction_id`, and created `recurring_rules` (the setting) + `recurring_items`.

**The computed-occurrences model (migration 068, 2026-10-20, 0.4.0-2 C1 + C3 + C8).** A rule's occurrences are NOT stored: the BE computes them from the rule whenever they are asked for. A `recurring_items` row exists only for an occurrence that is recorded (a transaction), cleared (paid without a transaction), skipped or edited — plus manual extra occurrences and legacy rows that still hold a pending draft. A computed occurrence is addressed by `rule_id + slot` (its original date); a stored row keeps that slot. Recurring no longer produces pending drafts: "due" is a state (date ≤ today and not recorded). One-off upcoming items are gone: a future-dated transaction is a plain transaction (§04).

Before 068 (057–067): the due check generated items ahead of time up to `generated_until` and produced a pending draft for each due one; a future-dated `POST /transactions` made a one-off item (`rule_id` NULL); status was transaction → done, pending draft → pending, archived, `produced_at` NULL → upcoming, else not_created.

### `recurring_rules`

The setting: a Google-Calendar-style rule plus the values its occurrences record (type, amount, wallet / to-wallet, category, tags, note) and a name + icon. No `*_by_user_id` audit columns.

| Column               | Type            | Constraints                                       | Description |
| -------------------- | --------------- | ------------------------------------------------- | ----------- |
| `id`                 | `UUID`          | PK (v7)                                           | |
| `user_id`            | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE      | Owner |
| `name`               | `VARCHAR(100)`  | NOT NULL                                          | Setting name. Each occurrence's name is built from it and the slot ("Netflix ประจำเดือน ต.ค. 2026", "งวด 5/12" for installments) at read / record time — not stored, so a rename reaches every unstored occurrence |
| `description`        | `TEXT`          | NULLABLE                                          | |
| `note`               | `TEXT`          | NULLABLE                                          | Copied to the transactions it records |
| `icon_code`          | `JSONB`         | NULLABLE                                          | Icon Maker code |
| `kind`               | `VARCHAR(12)`   | NOT NULL, DEFAULT `'subscription'`, CHECK         | Migration 064. What the user picks: `'subscription'` \| `'installment'` (a count of payments) \| `'income'` \| `'reminder'` (เตือนจ่าย: the amount may be unknown) \| `'saving'` (ออมเงิน, migration 077) \| `'debt'` (หนี้, migration 111: books person-book entries) |
| `type`               | `VARCHAR(10)`   | NOT NULL, CHECK                                   | Money direction: `'expense'` \| `'income'` \| `'transfer'` \| `'saving'` (060 added `'saving'`, 064 removed it, 077 brought it back: money from a wallet into a goal / the unallocated pot; a confirmed occurrence writes a `saving_entries` row, never a transaction) \| `'debt'` (migration 111, with kind `debt` only: a confirmed occurrence writes a `personal_debts` row, + its transaction when the setting has a wallet) |
| `amount`             | `NUMERIC(15,2)` | NOT NULL, CHECK ≥ 0 (migration 064; was > 0)      | Per occurrence. 0 = unknown (a reminder) |
| `account_id`         | `UUID`          | FK → `accounts.id`, NULLABLE, ON DELETE SET NULL  | Wallet. NULL = none (a deleted wallet leaves the setting running wallet-less) |
| `to_account_id`      | `UUID`          | FK → `accounts.id`, NULLABLE, ON DELETE SET NULL  | Transfer target |
| `category_id`        | `UUID`          | FK → `categories.id`, NULLABLE, ON DELETE SET NULL | |
| `tag_ids`            | `UUID[]`        | NOT NULL, DEFAULT `'{}'`                          | Personal tag ids (no FK) |
| `goal_id`            | `UUID`          | FK → `saving_goals.id` (`recurring_rules_goal_id_fkey`), NULLABLE, ON DELETE CASCADE (migration 077; was SET NULL) | Type `saving`: the target goal; NULL = the unallocated pot ("ยังไม่จัดสรร"). Deleting the goal deletes its saving settings (the service does it too) |
| `freq`               | `VARCHAR(10)`   | NOT NULL, CHECK                                   | `'daily'` \| `'weekly'` \| `'monthly'` \| `'yearly'` \| `'dates'` (an explicit list) |
| `interval_n`         | `INT`           | NOT NULL, DEFAULT `1`, CHECK ≥ 1                  | Every n days / weeks / months / years |
| `weekdays`           | `INT[]`         | NOT NULL, DEFAULT `'{}'`                          | Weekly: ISO weekdays (Monday = 1 … Sunday = 7); empty = the start's weekday |
| `monthly_mode`       | `VARCHAR(10)`   | NULLABLE, CHECK                                   | `'day'` \| `'weekday'` |
| `month_day`          | `INT`           | NULLABLE                                          | Mode `day`: day of month, clamped to the month's last day (NULL = the start's day) |
| `month_nth`          | `INT`           | NULLABLE                                          | Mode `weekday`: the n-th weekday of the month (−1 = last) |
| `month_weekday`      | `INT`           | NULLABLE                                          | Mode `weekday`: ISO weekday |
| `dates`              | `DATE[]`        | NOT NULL, DEFAULT `'{}'`                          | `freq = 'dates'` |
| `start_date`         | `DATE`          | NOT NULL                                          | First possible occurrence |
| `end_kind`           | `VARCHAR(5)`    | NOT NULL, DEFAULT `'none'`, CHECK                 | `'none'` \| `'date'` \| `'count'` |
| `end_date`           | `DATE`          | NULLABLE                                          | `end_kind = 'date'` |
| `end_count`          | `INT`           | NULLABLE                                          | `end_kind = 'count'` |
| `total_count`        | `INT`           | NULLABLE                                          | Worked out by the BE: how many occurrences a rule with an end (or `freq = 'dates'`) has. NULL = no end |
| `generated_until`    | `DATE`          | NULLABLE                                          | Worked out by the BE: with an end, the date of the last occurrence; without an end, a look-ahead horizon left over from the 057 model |
| `trial_until`        | `DATE`          | NULLABLE                                          | Migration 064. Subscription: the free trial runs until this day |
| `status`             | `VARCHAR(10)`   | NOT NULL, DEFAULT `'active'`, CHECK               | `'active'` \| `'paused'` \| `'archived'` |
| `ending_notified`    | `BOOLEAN`       | NOT NULL, DEFAULT `FALSE`                         | The `recurring_ending` notice has been sent (rules with an end) |
| `tracked_from`       | `DATE`          | NOT NULL, DEFAULT `CURRENT_DATE`                  | Migration 068. The day the rule started being tracked (the BE sets the creation day, user's timezone). Occurrences before it are history: they count as **paid** (implicitly) and are never overdue. Resume does not move it |
| `due_notified_until` | `DATE`          | NULLABLE                                          | Migration 068. The `recurring_due` notice has counted the occurrences up to this day; the next notice counts only the ones that came due after it |
| `auto_create`        | `BOOLEAN`       | NOT NULL, DEFAULT `FALSE`                         | Migration 068 (C8, "บันทึกอัตโนมัติเมื่อถึงวัน"). Record the transaction by itself when an occurrence comes due — on the first due check of the day (app open), no clock job. 0.4.1-1 R12: any amount (0 is recorded as 0) and any wallet; a wallet / category that is gone or archived is left off the transaction (before: needed a fixed amount and a wallet, API 400 `AUTO_CREATE_NEEDS_AMOUNT` / `AUTO_CREATE_NEEDS_WALLET`, gone)) |
| `auto_created_until` | `DATE`          | NULLABLE                                          | Migration 068. Auto-create has handled the occurrences up to this day. Switching auto-create on sets it to yesterday (today's due occurrence counts, older due ones stay due); off / on again and resume reset it |
| `paused_from`        | `DATE`          | NULLABLE                                          | Migration 068. The day the rule was paused (or archived while active; for `overdue_limit` the date of the 4th due occurrence). 0.4.1-1: on resume the span [paused_from, the current period's occurrence) becomes a `gaps` entry (nothing stored); what was due before the pause stays due. An archived wallet no longer pauses a rule |
| `pause_reason`       | `TEXT`          | NULLABLE, CHECK `IN ('manual', 'overdue_limit', 'goal_inactive', 'no_balance')` (`no_balance` migration 111) | Migration 090 (0.4.1-1 R7). Why it is paused: the user, "ค้าง 3 งวด" (a 4th occurrence came due while 3 waited; the 3 are stored and stay due), a saving setting whose goal closed, or (111, 0.4.1-2 K5) a จ่ายหนี้ setting whose person owed nothing for 3 rounds in a row (resumes by itself on a new debt). Cleared on resume. 090 set `manual` (or `goal_inactive`) on the rules paused before it and emptied `recurring_due_checks` so every rule over the limit pauses at its first check |
| `gaps`               | `JSONB`         | NOT NULL, DEFAULT `'[]'`                          | Migration 090 (0.4.1-1 R8 / R9). `[{from, to}]` (YYYY-MM-DD): occurrences with from <= slot < to are never made (a resume after a pause). A count end counts past them (installments shift); a date end keeps its date |
| `contact_id`         | `UUID`          | FK → `contacts.id`, NULLABLE, ON DELETE SET NULL  | Migration 111 (0.4.1-2 K). Kind `debt`: the person as a contact; NULL on other kinds (CHECK) |
| `person_name`        | `VARCHAR(100)`  | NULLABLE                                          | Migration 111. Kind `debt`: the person's name (always set on a debt setting; stays when the contact goes) |
| `debt_kind`          | `VARCHAR(20)`   | NULLABLE, CHECK (`debt`, `repayment`)             | Migration 111. Kind `debt`: `debt` = จดหนี้, `repayment` = จ่ายหนี้; each occurrence books a `personal_debts` row of this kind |
| `debt_direction`     | `VARCHAR(20)`   | NULLABLE, CHECK (`paid`, `received`)              | Migration 111. Kind `debt`: the entry direction (as the debts API) |
| `zero_rounds`        | `INT`           | NOT NULL, DEFAULT `0`, CHECK `BETWEEN 0 AND 3`    | Migration 111 (K5). จ่ายหนี้: rounds in a row with nothing owed; at 3 the setting pauses with `no_balance` |
| `created_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                         | |
| `updated_at`         | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                         | Trigger-updated |

**Check constraints:** `recurring_rules_kind_check`: `kind IN ('subscription', 'installment', 'income', 'reminder', 'saving', 'debt')`, `recurring_rules_type_check`: `type IN ('expense', 'income', 'transfer', 'saving', 'debt')` (both gained `saving` in migration 077, `debt` in 111), `recurring_rules_pause_reason_check` (090; `no_balance` in 111), `recurring_rules_debt_fields_check` (111): `(type = 'debt') = (person_name IS NOT NULL AND debt_kind IS NOT NULL AND debt_direction IS NOT NULL) AND (type = 'debt' OR contact_id IS NULL)`, `debt_kind IN ('debt', 'repayment')`, `debt_direction IN ('paid', 'received')`, `zero_rounds BETWEEN 0 AND 3`, `amount >= 0`, `freq IN ('daily', 'weekly', 'monthly', 'yearly', 'dates')`, `interval_n >= 1`, `monthly_mode IS NULL OR monthly_mode IN ('day', 'weekday')`, `end_kind IN ('none', 'date', 'count')`, `status IN ('active', 'paused', 'archived')`.

**Indexes:** `PRIMARY KEY (id)`, `INDEX idx_recurring_rules_user ON recurring_rules(user_id, status)`, `INDEX idx_recurring_rules_goal ON recurring_rules(goal_id) WHERE goal_id IS NOT NULL` (migration 077), `INDEX idx_recurring_rules_contact ON recurring_rules(contact_id) WHERE contact_id IS NOT NULL` (migration 111).

**Migration 077 (0.4.0-4):** every `saving_auto` row became a `type = kind = 'saving'` rule (see §09 "Removed: `saving_auto`").

**Migration 068 backfill:** `tracked_from` = the earlier of `created_at::date` and the rule's oldest stored `slot` (counting only the rows that survived the delete below); `due_notified_until` = the migration day (nothing already due is notified again); `paused_from` = `updated_at::date` for paused / archived rules; `auto_create` FALSE.

### `recurring_items`

The stored occurrences (068: only recorded / cleared / skipped / edited ones, manual ones and legacy pending ones). Each row is LINKED to a real transaction the same way an event bill links its transaction: the link lives on the item, `ON DELETE SET NULL` breaks it. No `*_by_user_id` audit columns.

| Column            | Type          | Constraints                                         | Description |
| ----------------- | ------------- | --------------------------------------------------- | ----------- |
| `id`              | `UUID`        | PK (v7)                                             | |
| `user_id`         | `UUID`        | FK → `users.id`, NOT NULL, ON DELETE CASCADE        | Owner |
| `rule_id`         | `UUID`        | FK → `recurring_rules.id`, **NOT NULL** (migration 068; NULL was a one-off item), ON DELETE CASCADE | The setting |
| `seq`             | `INT`         | NULLABLE                                            | n of N when the row was stored (rules with an end) |
| `slot`            | `DATE`        | NULLABLE                                            | The rule date this occurrence belongs to (its original date: an edit may move `date`, never `slot`). With `rule_id` it is the occurrence's key. NULL only for a manual row |
| `date`            | `DATE`        | NOT NULL                                            | The occurrence date (an edit may move it) |
| `draft`           | `JSONB`       | NOT NULL                                            | The occurrence's own values (pending-draft shape: amount, wallet, category, tags, description, note …). A description stays only when the user typed one |
| `edited`          | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`                           | The user edited this occurrence: it keeps its values when the rule changes and replaces the computed occurrence of the same period |
| `manual`          | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`                           | An extra occurrence added by hand (`POST /recurring-items`, `recurring_id` required); `slot` NULL, it answers to its `date` |
| `archived`        | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`                           | **Skipped** (status `skipped`; `archived` is the old API name) |
| `produced_at`     | `TIMESTAMPTZ` | NULLABLE                                            | 057: when the item's pending draft was made. Since 068: set when a transaction is recorded or linked |
| `pending_id`      | `UUID`        | FK → `pending_transactions.id`, NULLABLE, ON DELETE SET NULL | Legacy (pre-068): the pending draft made for it. The draft is deleted when the occurrence is confirmed, or skipped without `delete_tx` |
| `transaction_id`  | `UUID`        | FK → `transactions.id`, NULLABLE, ON DELETE SET NULL | The transaction that records it (status `done`). Deleting that transaction releases the occurrence: back to due / upcoming (paid if it was cleared first), or skipped with `?skip_occurrence=true` |
| `saving_entry_id` | `UUID`        | FK → `saving_entries.id`, NULLABLE, ON DELETE SET NULL | Migration 060. The saving entry that records a `saving` rule's occurrence (status `done`; in use again since 077) |
| `cleared_at`      | `TIMESTAMPTZ` | NULLABLE                                            | Migration 068. Paid WITHOUT a transaction ("จ่ายแล้ว", e.g. "แม่จ่ายให้"): status `paid` |
| `auto_created_at` | `TIMESTAMPTZ` | NULLABLE                                            | Migration 068. The transaction was recorded by auto-create (item `auto_created: true`). If that transaction is deleted, the occurrence goes back to due and is not re-created |
| `debt_entry_id`   | `UUID`        | FK → `personal_debts.id`, NULLABLE, ON DELETE SET NULL | Migration 111 (0.4.1-2 K). The person-book entry that fills a kind `debt` occurrence (status `done`). Deleting the entry SKIPS the slot with its last amount (trigger `personal_debts_recurring_skip`, migration 112: `archived`, `edited` TRUE, `draft.amount` = the entry's amount, `produced_at` / `auto_created_at` / `cleared_at` NULL) instead of making it due again |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                           | |
| `updated_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                           | Trigger-updated |

**Status is derived, never stored** (068):

- Stored row, first match wins: `done` (`transaction_id`, `saving_entry_id` or, since 111, `debt_entry_id` set) → `skipped` (`archived`) → `paid` (`cleared_at` set) → `pending` (`pending_id` set, legacy) → `due` (`date` ≤ today, user's timezone) → `upcoming`.
- Computed occurrence (no row): `paid` if `slot` < the rule's `tracked_from`; `due` if `slot` ≤ today; else `upcoming`.

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_recurring_items_user_date ON recurring_items(user_id, date)`
- `INDEX idx_recurring_items_rule ON recurring_items(rule_id, date)`
- `UNIQUE INDEX idx_recurring_items_rule_slot ON recurring_items(rule_id, slot) WHERE slot IS NOT NULL` — 057: generation was idempotent; since 068 it is the key that matches a stored row to its computed occurrence (at most one stored row per occurrence)
- `UNIQUE INDEX idx_recurring_items_pending ON recurring_items(pending_id) WHERE pending_id IS NOT NULL`
- `UNIQUE INDEX idx_recurring_items_tx ON recurring_items(transaction_id) WHERE transaction_id IS NOT NULL` — a transaction records at most one occurrence
- `UNIQUE INDEX idx_recurring_items_saving ON recurring_items(saving_entry_id) WHERE saving_entry_id IS NOT NULL` (migration 060)
- `UNIQUE INDEX idx_recurring_items_debt_entry ON recurring_items(debt_entry_id) WHERE debt_entry_id IS NOT NULL` (migration 111) — an entry fills at most one occurrence
- `INDEX idx_recurring_items_user_updated ON recurring_items(user_id, updated_at)` — sync fingerprints (migration 066)

Migration 068 adds no index.

### `recurring_due_checks`

Migration 075 (0.4.0-4). The due check (auto-create, the due / ending notices, pausing settings whose wallet was archived) no longer runs on every read: it runs once per user-local day from `POST /sync`, and after a recurring write. This row remembers the last run. No `*_by_user_id` audit columns.

| Column       | Type          | Constraints                                   | Description |
| ------------ | ------------- | --------------------------------------------- | ----------- |
| `user_id`    | `UUID`        | PK, FK → `users.id`, ON DELETE CASCADE        | One row per user (upserted) |
| `checked_on` | `DATE`        | NOT NULL                                      | The user-local day the last check ran for; `POST /sync` skips the check while it is ≥ today (unless an active rule points at an archived wallet) |
| `checked_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                     | When it ran |

### Migration 068 — data steps (2026-10-20)

1. **One-off items** (`rule_id` NULL) are deleted together with their pending drafts. A one-off that had already become a transaction keeps the transaction.
2. `recurring_items.rule_id` becomes NOT NULL.
3. **Unrecorded, untouched rows become computed:** rows with no `transaction_id`, `saving_entry_id` or `pending_id` that are not `edited`, `manual` or `archived` (skipped) are deleted. A due one comes back as a computed `due` occurrence. Legacy rows with a live pending draft or a transaction stay. This runs BEFORE `tracked_from` is worked out, so only the surviving rows count.
4. The five rule columns are added and backfilled (above).
5. `recurring_items.cleared_at` and `auto_created_at` are added.
6. `notifications_type_check` gains `recurring_auto_created`; old `recurring_due` notices are pointed at `/recurring?focus=due` (they used to open `/pending`). See §13.

Dates use the DB's time zone while the app's "today" is the user's, so a backfilled day can be off by one near midnight. **Down** is schema only: it drops the new columns, makes `rule_id` nullable, deletes `recurring_auto_created` notices, restores the old CHECK and the `/pending` deep links; the deleted one-off and unrecorded rows are not recreated.

---

## 12 — Personal Debts (bidirectional)

Owned by [`../spec/12-personal-debts.md`](../modules/12-personal-debts.md).

### `personal_debts`

The single, bidirectional ledger of obligations between the row owner and
another party. Replaces the old `shared_expense_splits` table (removed in
migration 24). Every "X owes Y" lives here regardless of origin: split bills,
manual cash loans, IOU agreements, broken-item compensation.

Each row is owned by one user (`user_id`). When a user splits a bill with a
linked contact, the BE creates one row on each side independently — both
books are mutable in isolation.

**The person ledger (migration 054, 0.3.1-10)** — a row is an **entry**:
`{person, direction paid | received, amount > 0, date, description, note,
paid label, optional wallet transaction, optional split source}`. Net per
person = Σ paid − Σ received (> 0 = they owe me, < 0 = I owe them). The
`paid` label never changes a number; there is no cancel, no
`settled_amount`, no `status`: stop counting = delete. The wallet side of an
entry is ONE transaction (`transactions.source_personal_debt_id`, unique);
entry and transaction are one record (spec 12 §1.3).

**One person book (migrations 081–084, 0.4.1-1)** — overrides the 069 paragraph below: every row is
a person-book row, `kind` debt | repayment; balance = Σ signed rows (paid +, received −); a row's
transaction (`transactions.source_personal_debt_id`) is optional, connected and synced (amount,
date, description, note), and never counts. Repayment transactions (069) became rows (081).

**Debts vs repayments (migration 069, 0.4.0-3)** — a row here is a DEBT;
its linked transaction does NOT count in the balance. A REPAYMENT is a
transaction tied to the person (`transactions.repay_contact_id` /
`repay_person_name`). Balance per person = Σ signed debts (paid +,
received −) + Σ signed repayments (expense +, income −), computed over both
tables (`shared.DebtLedgerSQL`). Old repayment-like rows here (054's
converted repayments, or opposite-direction entries recorded before 069) are
not converted and keep counting as debts.

| Column                          | Type            | Constraints                                                  | Description                                                                                                                                   |
| ------------------------------- | --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `UUID`          | PK (v7)                                                      |                                                                                                                                               |
| `user_id`                       | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE                 | Row owner                                                                                                                                     |
| `direction`                     | `VARCHAR(20)`   | NOT NULL, CHECK                                              | `'paid'` (I paid them / for them: net +amount) \| `'received'` (they paid me / for me: net −amount). Migration 054 mapped `owed_to_me` → `paid`, `i_owe` → `received` |
| `counterparty_contact_id`       | `UUID`          | FK → `contacts.id`, NULLABLE, ON DELETE SET NULL             | Optional structured link to a contact in the row owner's book (person key `c:<contact_id>`)                                                   |
| `counterparty_person_name`      | `VARCHAR(100)`  | NOT NULL                                                     | Always set — durable display label, free-text fallback when contact_id is NULL (person key `n:<name>`, case-insensitive)                     |
| `source_transaction_id`         | `UUID`          | FK → `transactions.id`, NULLABLE, ON DELETE SET NULL         | The bill a split entry came from (in the row owner's book). NULL for manual entries and partner-side mirror rows                             |
| `source_project_transaction_id` | `UUID`          | FK → `project_transactions.id`, NULLABLE, ON DELETE SET NULL | 1b.2: project-context origin                                                                                                                  |
| `project_id`                    | `UUID`          | FK → `projects.id`, NULLABLE, ON DELETE SET NULL             | 1b.2: contextual project                                                                                                                      |
| `source_kind`                   | `VARCHAR(20)`   | NULLABLE, CHECK                                              | Migration 054. Where a split-made entry came from: `'transaction'` (a split on my bill) \| `'partner'` (another user's split on me, the mirror; wiped in 094, no longer written) \| `'event'` (an event debt; 0.4.0-4's per-settle-line `{event_id}` debts were retired in 104) \| `'paid_by'` (070). NULL = manual entry |
| `counterpart_debt_id`           | `UUID`          | FK → `personal_debts.id`, NULLABLE, ON DELETE SET NULL       | Migration 045. The mirror entry in the other user's book (a split pair), so a change on one side can notify the other                        |
| `unlinked_project_transaction_id` | `UUID`        | FK → `project_transactions.id`, NULLABLE, ON DELETE SET NULL | Migration 073 (0.4.0-3). Set while "ลงบัญชีของฉัน" is off on the event bill this debt was made from: the debt lost its bill link but stays in my books; turning it on again links the same row back |
| `kind`                          | `VARCHAR(20)`   | NOT NULL, DEFAULT 'debt', CHECK (`debt`, `repayment`) | Migration 081 (0.4.1-1 D3). A DEBT (ให้ยืม / ยืม, a split, a paid-by, an event debt) or a REPAYMENT (จ่ายคืน = `paid`, รับคืน = `received`). Both count in the balance; a repayment has no paid label / due date. (076's `linked_transaction_id` was folded into `transactions.source_personal_debt_id` + `debt_connected` and dropped in 083.) |
| `disconnected_at`               | `TIMESTAMPTZ`   | NULLABLE                                                     | Migration 084 (0.4.1-1 D9). When the cross-user pair was disconnected (either side); `counterpart_debt_id` is then NULL on both |
| `paid_for_transaction_id`       | `UUID`          | FK → `transactions.id`, NULLABLE, UNIQUE, ON DELETE CASCADE  | Migration 070 (0.4.0-3). The EXPENSE (or, since migration 080, the INCOME someone received for me — "รับแทน", a `paid` entry: they owe me) this debt is the "someone paid for me" part of: my own paid_by (`source_kind paid_by`, one record with the expense: deleting the expense deletes it) or a partner's split mirrored into my book (`source_kind partner`, my expense of my share; deleting the expense first unlinks it). Not `source_transaction_id`, so it never lowers my_share (spec 12 §1.5a) |
| `amount`                        | `DECIMAL(15,2)` | NOT NULL, CHECK > 0 (migration 054)                          | The entry amount                                                                                                                              |
| `currency`                      | `VARCHAR(3)`    | NOT NULL                                                     |                                                                                                                                               |
| `date`                          | `DATE`          | NOT NULL (migration 054)                                     | Entry date (backfill: the source transaction's date, else `created_at` in Asia/Bangkok)                                                      |
| `due_date`                      | `DATE`          | NULLABLE                                                     | Migration 071 (0.4.0-3, "กำหนดจ่าย"). Optional due date of a DEBT entry (never on a repayment); never before `date` (API). Feeds the person's `next_due_date` |
| `paid`                          | `BOOLEAN`       | NOT NULL, DEFAULT `FALSE` (migration 054)                    | The "paid" label (was `status = 'settled'`); never changes a number                                                                           |
| `description`                   | `TEXT`          | NULLABLE                                                     | What it was for (≤ 200 chars, API). Split entries take the bill's description. Migration 051 |
| `note`                          | `TEXT`          | NULLABLE                                                     |                                                                                                                                               |
| `private_note`                  | `TEXT`          | NULLABLE                                                     | Migration 093 (0.4.1-2 S11). My private note on a debt of a shared bill; never synced, never notified. API: ≤ 500 chars, only on shared rows (400 `PRIVATE_NOTE_NOT_SHARED`) |
| `created_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                    |                                                                                                                                               |
| `created_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                    | NULL = system                                                                                                                                 |
| `updated_at`                    | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`                                    | Trigger-updated                                                                                                                               |
| `updated_by_user_id`            | `UUID`          | FK → `users.id`, NULLABLE                                    | NULL = system                                                                                                                                 |

**Wiped in migration 094 (0.4.1-2 S15, the one-way split mirror retired in S16):** the splitter rows of mirrored pairs (`source_kind` transaction / paid_by with a `counterpart_debt_id`), every `partner` mirror and its wallet-less expense (`paid_for_transaction_id`), and the `split_created` / `split_changed` notices. Plain splits / paid-by debts with typed names or unlinked contacts and already-disconnected pairs stay. `source_kind` `partner` and `counterpart_debt_id` are no longer written (a split with a linked contact is a shared bill, BE-1).

**Retired in migration 104 (0.4.1-2 V8, Q-E4 wipe):** the 0.4.0-4 per-settle-line `{event_id}` debts (`kind = 'debt'`, `source_kind = 'event'`, `project_id` set, no `source_project_transaction_id`, no `personal_debt_bills` part). Deleted when they have no transaction of their own; with their own wallet transaction they stay as plain debts (`source_kind`, `project_id` → NULL; no wallet moves). Claims (`personal_debt_bills`) and the settle booking (`event_settle_bookings`) replace them.

**Trigger `personal_debts_recurring_skip`** (migration 112, BEFORE DELETE, function `recurring_skip_on_debt_delete`): a deleted row that fills a "หนี้" recurring occurrence (`recurring_items.debt_entry_id`) skips that occurrence with its last amount (§11), on every delete path.

**Dropped in migration 054:** `settled_amount`, `status` (`open` / `settled` / `cancelled`) and their CHECKs. Data: each repayment transaction became its own entry (same person, the transaction as its wallet side); cancelled rows and amount-0 rows (migration 052's overpaid leftovers) were deleted. Migration 052 had briefly allowed `amount >= 0` and `settled_amount > amount` (editable splits); 054 restored `amount > 0`.

**Check constraints:**

- `direction IN ('paid', 'received')`
- `source_kind IS NULL OR source_kind IN ('transaction', 'event', 'partner', 'paid_by')` (`paid_by` added in migration 070)
- `kind IN ('debt', 'repayment')` (migration 081)
- `amount >= 0` (migration 084; 054–083: > 0). 0 only on a row the system synced

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_personal_debts_user ON personal_debts(user_id, date DESC, created_at DESC)` — primary list query (migration 054)
- `INDEX idx_personal_debts_counterparty_contact ON personal_debts(user_id, counterparty_contact_id) WHERE counterparty_contact_id IS NOT NULL` — people view
- `INDEX idx_personal_debts_source_tx ON personal_debts(source_transaction_id) WHERE source_transaction_id IS NOT NULL` — "what debts came from this transaction"
- `INDEX idx_personal_debts_source_pt ON personal_debts(source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL`
- `INDEX idx_personal_debts_project ON personal_debts(project_id) WHERE project_id IS NOT NULL`
- `INDEX idx_personal_debts_user_updated ON personal_debts(user_id, updated_at)` — sync fingerprints (migration 066)
- `UNIQUE INDEX idx_personal_debts_paid_for_tx ON personal_debts(paid_for_transaction_id) WHERE paid_for_transaction_id IS NOT NULL` — one paid-by debt per expense (migration 070)
- `INDEX idx_personal_debts_unlinked_pt ON personal_debts(unlinked_project_transaction_id) WHERE unlinked_project_transaction_id IS NOT NULL` — relink lookup (migration 073)

**Reports — "my share" computation:**
For a transaction whose splits live in `personal_debts`
(`source_transaction_id = T`), spending reports subtract the sum of those
entries' `amount` from the transaction's amount — giving the user's
effective share. This keeps the account ledger cash-basis (full ฿4000 out)
and the spending report share-basis (฿2000 = my share of dinner).

### `personal_debt_bills`

Migration 100 (0.4.1-2 V5 / S10). The copy ⇄ debt link: which shared bills (event or split) a debt books. A debt covering one bill = a per-bill debt ("a lump of one"); several = a lump ("claim ก้อน", one direction only). `personal_debts.amount` = Σ its parts (kept by the writer, `personal_debts/bill_parts.go`); the last part removed leaves the debt as a plain debt. Only `kind = 'debt'` rows: paybacks are claimed as repayment rows and keep `personal_debts.source_project_transaction_id` (091). During 0.4.1-2 per-bill debts keep `source_project_transaction_id` set as well (dropped for debts once nothing reads it).

| Column           | Type            | Constraints                                                 | Description |
| ---------------- | --------------- | ----------------------------------------------------------- | ----------- |
| `id`             | `UUID`          | PK                                                          | |
| `debt_id`        | `UUID`          | FK → `personal_debts.id`, NOT NULL, ON DELETE CASCADE       | The debt (kind debt) |
| `user_id`        | `UUID`          | FK → `users.id`, NOT NULL, ON DELETE CASCADE                | Book owner (= the debt's) |
| `pt_id`          | `UUID`          | FK → `project_transactions.id`, NOT NULL, ON DELETE CASCADE | The bill (parent row) |
| `member_id`      | `UUID`          | FK → `project_members.id`, NOT NULL, ON DELETE CASCADE      | The other person of the pair on that bill |
| `transaction_id` | `UUID`          | FK → `transactions.id`, NULLABLE, ON DELETE SET NULL        | My transaction of that bill: the "จ่ายโดย X" copy, or my origin when I paid |
| `amount`         | `DECIMAL(15,2)` | NOT NULL, CHECK `>= 0`                                      | This bill's part, as my book holds it (≠ the bill's pair amount = "ไม่ตรง") |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` (trigger)              | |

**Indexes:** `UNIQUE (user_id, pt_id, member_id)` (a bill + person is booked once per user: X7) · `(debt_id)` · `(pt_id)` · `(transaction_id) WHERE NOT NULL`.

**Backfill (100):** every per-bill debt (`source_project_transaction_id` → a non-payback bill or one of its split rows) became one part; the member = the bill's member who is the debt's person (linked contact → user, else the name); the tx = my origin / copy of that bill. Unmatched debts and a second debt on the same bill + person were left out.

---

## 13 — Notifications

Owned by [`../spec/13-notifications.md`](../modules/13-notifications.md).

### `notifications`

In-app notification rows. One row per recipient per event.

| Column               | Type           | Constraints                                  | Description                                                                                    |
| -------------------- | -------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                 | `UUID`         | PK (v7)                                      |                                                                                                |
| `recipient_user_id`  | `UUID`         | FK → `users.id`, NOT NULL, ON DELETE CASCADE |                                                                                                |
| `type`               | `VARCHAR(50)`  | NOT NULL, CHECK                              | See trigger registry in spec §2                                                                |
| `actor_user_id`      | `UUID`         | FK → `users.id`, NULLABLE                    | The user whose action caused this notification. NULL for system events.                        |
| `payload`            | `JSONB`        | NOT NULL                                     | Event-specific context (`split_id`, `project_id`, `amount`, etc.) — per-type shapes in spec §2 |
| `deep_link`          | `VARCHAR(500)` | NULLABLE                                     | Client routing hint. Migration 063: event links go to the event page (`/projects/<id>/transactions/<bill>` → `/projects/<id>`). Migration 068: `recurring_due` opens `/recurring?focus=due` (was `/pending`) |
| `read_at`            | `TIMESTAMPTZ`  | NULLABLE                                     | Set when the user opens the inbox and sees it                                                  |
| `actioned_at`        | `TIMESTAMPTZ`  | NULLABLE                                     | Set when the user taps through and takes the suggested action                                  |
| `dismissed_at`       | `TIMESTAMPTZ`  | NULLABLE                                     | Set when the user explicitly dismisses without acting                                          |
| `created_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    |                                                                                                |
| `created_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system event; usually equals `actor_user_id` for user-triggered events                  |
| `updated_at`         | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated (bumps when `read_at` / `actioned_at` / `dismissed_at` set)                    |
| `updated_by_user_id` | `UUID`         | FK → `users.id`, NULLABLE                    | NULL = system; usually = `recipient_user_id` after read/action/dismiss                         |

**Check constraints:**

- `notifications_type_check` (as of migration 095): `type IN ('split_created', 'split_paid', 'split_received', 'split_changed', 'project_tx_recorded_for_you', 'project_tx_changed', 'project_invite', 'contact_link_request', 'account_invite', 'project_added', 'recurring_due', 'recurring_ending', 'recurring_auto_created', 'debt_disconnected', 'shared_bill_created', 'shared_bill_deleted', 'shared_bill_disconnected', 'event_completed', 'event_member_removed', 'event_deleted')` — trigger registry in spec §2. Added over time: `account_invite` (039), `project_added` (041), `split_changed` (052), `recurring_due` + `recurring_ending` (057), `recurring_auto_created` (068), `debt_disconnected` (084), `shared_bill_created` / `shared_bill_deleted` / `shared_bill_disconnected` / `event_completed` / `event_member_removed` (092, 0.4.1-2), `event_deleted` (095: an event deleted, its bills kept as split bills). `split_paid` is retired (054 deleted its rows; the value stays in the CHECK). `project_tx_recorded_for_you` is no longer sent (replaced by `shared_bill_created`; old rows stay). Migration 094 deleted every `split_created` / `split_changed` row (the split mirror is gone; values stay in the CHECK)
- At most one of `actioned_at` / `dismissed_at` is set (mutually exclusive terminal states)

**Recurring notices (migration 068):** `recurring_due` is ONE grouped notice that counts the occurrences that came due since the rule's `due_notified_until` (§11). `recurring_auto_created` is ONE grouped notice per user per day (upserted by user + type + date, so its payload `{count, date}` accumulates), deep link `/recurring`.

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
| `muted_types`                                     | `TEXT[]`      | NOT NULL, DEFAULT `'{}'`               | Migration 045. Notification types the RECIPIENT does not receive (then nothing auto-runs either) |
| `auto_sync_events`                                | `BOOLEAN`     | NOT NULL, DEFAULT `TRUE`               | Migration 110 (0.4.1-2 S4). Auto sync for event bills: another member's save reaches my copy at once (off = a notice asks). Independent of `muted_types` |
| `auto_sync_debts`                                 | `BOOLEAN`     | NOT NULL, DEFAULT `TRUE`               | Migration 110. Auto sync for split bills and debts with a connected contact |
| `auto_accept_events`                              | `BOOLEAN`     | NOT NULL, DEFAULT `TRUE`               | Migration 113 (owner 2026-10-28). A NEW event bill with my share lands in my book at once (off = a notice with "เพิ่มในสมุด") |
| `auto_accept_debts`                               | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`              | Migration 113. The same for a new split bill / debt from a connected contact |
| `default_account_id`                              | `UUID`        | FK → `accounts.id`, NULLABLE           | Account to use when an action runs automatically; NULL when that wallet is deleted |
| `created_at`                                      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              |                                                                     |
| `created_by_user_id`                              | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system                                                       |
| `updated_at`                                      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`              | Trigger-updated                                                     |
| `updated_by_user_id`                              | `UUID`        | FK → `users.id`, NULLABLE              | NULL = system                                                       |

A row is auto-created on user registration with all defaults.

**Dropped in migration 110 (0.4.1-2):** `auto_types` (045, auto per type) and `auto_resolve_own_in_projects` (my own event bills into my book), both replaced by the two switches. `default_account_id` is the main wallet (กระเป๋าหลัก): the quick-create default (X10). The same migration removed the never-sent `theme` / `language` registration defaults from `user_preferences.preferences` (keys now: `timezone`, `theme_mode`, `theme_id`, `language`, `font_th`, `font_en`, `page_prefs`, `fee_category_id`, `money_style`, `money_decimals`).

**Dropped in migration 045:** `auto_notify_linked_split_contacts`, `auto_add_to_personal_debt_on_split_notification`, `auto_record_received_payment` (carried into `auto_types`; the sender has no switch any more). Migration 054 removed `split_paid` from both arrays.

---

## 14 — Shared Wallets

Owned by [`../spec/14-shared-wallets.md`](../modules/14-shared-wallets.md). A shared wallet is an `accounts` row with more than one active member. **No new ledger table and no new `transactions` columns** — wallet rows are ordinary `transactions` (`user_id` = author, category from the author's own set; ledger view = filter by `account_id`). Contribution = plain `type='transfer'` paired by `transfer_group_id`. Migrated in 039 (`account_members`, `account_invite` notification type); 044 added the per-member `sort_order`.

### `account_members`

Membership of every account. Backfill creates one `owner` row per existing account with `report_scope='all'` (preserves current behavior). Append-only history: leaving sets `left_at`; rows are never deleted. A user may hold multiple join/leave cycles. Active membership = `joined_at IS NOT NULL AND left_at IS NULL`; a pending invite is a row with `joined_at IS NULL` (no `account_invites` table — invites ride notifications). An account cannot be deleted/archived while other active members exist; owner exit requires ownership transfer first.

| Column               | Type          | Constraints                                  | Description                                                            |
| -------------------- | ------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `id`                 | `UUID`        | PK (v7)                                      |                                                                        |
| `account_id`         | `UUID`        | FK → `accounts.id`, NOT NULL, ON DELETE CASCADE |                                                                     |
| `user_id`            | `UUID`        | FK → `users.id`, NOT NULL                    |                                                                        |
| `role`               | `VARCHAR(10)` | NOT NULL, CHECK                              | `'owner'` \| `'member'`                                                |
| `report_scope`       | `VARCHAR(10)` | NOT NULL, CHECK, DEFAULT `'none'`            | `'none'` \| `'own'` \| `'all'` — this member's personal-report inclusion; auto-reset to `'none'` for everyone on conversion; ex-members capped at `'own'` |
| `joined_at`          | `TIMESTAMPTZ` | NULLABLE                                     | NULL while the invite is pending; stamped on accept (backfill and owner rows set it at once) |
| `left_at`            | `TIMESTAMPTZ` | NULLABLE                                     | Set on leave/remove; never hard-deleted. Also locks the ex-member's own rows on this account to read-only |
| `sort_order`         | `INT`         | NOT NULL, DEFAULT `0`                        | Migration 044. This member's own wallet order (reordering never moves wallets for anyone else); seeded from `accounts.sort_order` |
| `created_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                    |                                                                        |
| `created_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE                    | NULL = system (backfill)                                               |
| `updated_at`         | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                    | Trigger-updated                                                        |
| `updated_by_user_id` | `UUID`        | FK → `users.id`, NULLABLE                    | NULL = system                                                          |

**Indexes:**

- `PRIMARY KEY (id)`
- `INDEX idx_account_members_account ON account_members(account_id) WHERE left_at IS NULL` — authz checks
- `INDEX idx_account_members_user ON account_members(user_id) WHERE left_at IS NULL` — "my shared wallets" list
- `UNIQUE INDEX idx_account_members_live_unique ON account_members(account_id, user_id) WHERE left_at IS NULL` — one live (pending or active) membership per (account, user); re-invite after leaving works

---

## 15 — Slip Import

0.3.1, migrations 049–050. Spec: [`../spec/15-slip-import.md`](../modules/15-slip-import.md). Wallet
identifiers live on `accounts.identifiers` (§03); the fee category on
`user_preferences.preferences.fee_category_id` (§02).

### `payment_providers`

Who a slip's money moved through — banks now, e-wallets / card issuers
later. Read-only over the API (`GET /v1/payment-providers`); rows come from
migrations as unknown codes show up in `import_logs`.

| Column       | Type          | Constraints                                             | Description |
| ------------ | ------------- | ------------------------------------------------------- | ----------- |
| `id`         | `UUID`        | PK, DEFAULT `gen_random_uuid()`                         | |
| `kind`       | `VARCHAR(20)` | NOT NULL, CHECK (`bank` · `e_wallet` · `card_issuer` · `other`) | |
| `scheme`     | `VARCHAR(20)` | NOT NULL                                                | Whose code: `bot` = Bank of Thailand 3-digit bank code (a slip QR's) |
| `code`       | `VARCHAR(20)` | NOT NULL                                                | e.g. `004` |
| `name_th`    | `TEXT`        | NOT NULL                                                | |
| `name_en`    | `TEXT`        | NOT NULL                                                | |
| `short_name` | `VARCHAR(20)` | NULLABLE                                                | `KBANK` |
| `color`      | `VARCHAR(9)`  | NULLABLE                                                | `#rrggbb` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NOT NULL                                  | `updated_at` trigger-updated |

**Unique:** `(scheme, code)`. **Seed:** `bot` 002 BBL · 004 KBANK · 006 KTB · 014 SCB (codes confirmed; others added when met).

### `import_logs`

Written the moment slip import meets something it can't handle yet. No
cron — read by hand (ops-runbook §3). Never holds slip text or images; the
user's email etc. come from a join on `users`.

| Column       | Type          | Constraints                                   | Description |
| ------------ | ------------- | --------------------------------------------- | ----------- |
| `id`         | `UUID`        | PK, DEFAULT `gen_random_uuid()`               | |
| `user_id`    | `UUID`        | NOT NULL, FK → `users.id` ON DELETE CASCADE   | |
| `kind`       | `VARCHAR(32)` | NOT NULL                                      | `unknown_provider` · `unsupported_bank` · `incomplete` (free text) |
| `scheme`     | `VARCHAR(20)` | NULLABLE                                      | `bot` |
| `code`       | `VARCHAR(20)` | NULLABLE                                      | The QR's bank code |
| `trans_ref`  | `VARCHAR(64)` | NULLABLE                                      | The slip's ref (from its QR) |
| `details`    | `JSONB`       | NOT NULL, DEFAULT `'{}'`                      | e.g. `{"missing": ["amount"]}` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                     | |

**Indexes:** `(kind, created_at DESC)`.

---

## Status

- **Last updated** — 2026-10-26 (migration head: **080**)
- **Version** — 0.17 (2026-10-27 — 0.4.1-1 BE-1, migrations 081–084. **084** `transactions.amount` / `personal_debts.amount` `>= 0` (system-written 0, B1), `personal_debts.disconnected_at`, notification type `debt_disconnected`. **083** one debt link: `transactions.debt_connected` + `debt_prev_category_id`, 076's `personal_debts.linked_transaction_id` folded in and dropped. **082** system categories `LOAN_GIVEN` / `LOAN_TAKEN` seeded, debt transactions moved to them. **081** `personal_debts.kind` (debt | repayment); 069's repayment transactions became rows, wallet-less ones lost their transaction; `transactions.repay_contact_id` / `repay_person_name` + check + indexes dropped. BE-2: **091** `project_transactions.paid_back_for_id` (a "คืนแล้ว" payback row knows its bill; un-ticking removes it). **090** `recurring_rules.pause_reason` (manual / overdue_limit / goal_inactive) + `gaps` (resume / installment shift); `recurring_due_checks` emptied so rules over the limit pause at their first check. 085–089 unused.)
- **Version** — 0.16 (2026-10-26 — synced against migrations 071–080. **080** `transactions_paid_by_check` allows `income` ("รับแทน"). **079** `saving_goals.period_amount` / `period_freq` / `period_interval` / `period_anchor`. **078** `budget_periods.base_amount`. **077** recurring `type` / `kind` gain `saving`, `recurring_rules.goal_id` FK → ON DELETE CASCADE + `idx_recurring_rules_goal`, `saving_auto` migrated into recurring and dropped. **076** `personal_debts.linked_transaction_id` + unique index. **075** `recurring_due_checks`. **074** `user_preferences.timezone` cleanup. **073** `transactions` / `personal_debts.unlinked_project_transaction_id`, `project_transactions.unlinked_transaction_id`. **072** `project_transactions.type` gains `payback`. **071** `personal_debts.due_date`.)
- **Version** — 0.15 (2026-10-21 — **070** paid by someone else: `transactions.paid_by_amount` + `transactions_paid_by_check`, `personal_debts.paid_for_transaction_id` + unique index, `source_kind` gains `paid_by`. **069** repayment transactions: `transactions.repay_contact_id` / `repay_person_name`.)
- **Version** — 0.14 (2026-10-20 — synced against migrations 039–068; the file had stopped at 051 (plus 043 / 047 / 048 / 052 notes). **068** recurring on computed occurrences: one-off items + their drafts deleted, `recurring_items.rule_id` NOT NULL, unrecorded untouched rows deleted, `recurring_rules.tracked_from` / `due_notified_until` / `auto_create` / `auto_created_until` / `paused_from`, `recurring_items.cleared_at` / `auto_created_at`, `recurring_auto_created` notification type, `recurring_due` → `/recurring?focus=due`. **067** many auto-saves per goal: `saving_auto` `rule` / `start_date` / `end_rule` / `last_produced`, `day` / `last_month` / the unique index dropped. Backfilled: 039 `account_members` as built (nullable `joined_at`, live-unique index; §14 no longer "planned"), 040 `projects.planned_amount` (no longer planned), 041 / 052 / 057 notification types, 042 nullable `transactions.account_id`, 044 `account_members.sort_order`, 045 `muted_types` / `auto_types` + `personal_debts.counterpart_debt_id`, 046 + 060 `pending_transactions` (new section), 053 contact `nickname` / `show_nickname`, 054 person ledger (`personal_debts` direction paid / received, `date`, `paid`, `source_kind`; `settled_amount` / `status` gone), 055 `event_tags` / `project_transaction_tags` / `project_my_tags` (`projects.type`, `project_transactions.tags` gone), 056 `project_transactions.linked_transaction_id`, 057 `recurring_rules` / `recurring_items` (§11 rewritten, `scheduled_transactions` + `transactions.scheduled_transaction_id` gone), 058 `accounts.track_balance`, 059 budgets v2 (+ `budget_categories` / `budget_wallets` / `budget_periods`), 060 goals v2 (+ `saving_entries`), 061 `categories.status` gone, `accounts` closed → archived, nullable `saving_entries.account_id`, 062 `saving_auto`, 063 event deep links, 064 recurring `kind` / `trial_until` / amount ≥ 0, 065 nullable `saving_goals.target_amount`, 066 sync-fingerprint indexes. TOC gains §15.)
- **Version** — 0.13 (Migration 051: name / description / note standard — `description` on transactions, tags, contacts, personal_debts, saving_goals, scheduled_transactions; `note` on tags, projects; `contacts.notes` → `note`; `budgets.name` added, old `budgets.description` labels moved into it.)
- **Version** — 0.12 (§14 reworked: dropped planned `shared_transactions` + `transactions.source_shared_transaction_id` — wallet rows are ordinary `transactions`; `account_members` gains `report_scope`.)
- **Version** — 0.11 (§08 synced against migrations 037/038: dropped `icon_code`, added `description` + `note` — was 2 migrations stale.)
- **Version** — 0.10 (Added planned `projects.planned_amount` column — plan-vs-actual single nullable total, resolves the §10 budget_goal open question.)
- **Version** — 0.9 (Added §14 Shared Wallets plan — `account_members`, `shared_transactions`, `transactions.source_shared_transaction_id`; not yet migrated, targets migration 039+.)
- **Version** — 0.8 (Removed `bgShape` from `icon_code` JSONB — all entities use circle container; shape is fixed and not stored.)
- **Version** — 0.7 (Applied migration 033 plan: `projects.icon_id` + `projects.color_id` → `projects.icon_code JSONB`; `project_transactions.category_icon_id` + `project_transactions.category_color_id` → `project_transactions.category_icon_code JSONB`.)
- **Version** — 0.6 (Synced against all 32 migrations: removed `contacts.nickname` (dropped migration 29); added `contacts.last_used_at` + `idx_contacts_last_used` (migration 28); removed `contact_invites` table (never migrated — invite flow replaced by notifications); removed `project_invites` table (never migrated — invite flow replaced by notifications); added `project_transactions.description` (migration 30); corrected category snapshot columns on `project_transactions` from `category_icon_code JSONB` to `category_icon_id TEXT` + `category_color_id TEXT` (migration 31); corrected `projects` icon columns from `icon_code JSONB` to `icon_id TEXT` + `color_id TEXT` (migration 32).)
- **Version** — 0.4 (locked in FK naming rule: every FK ends in `<target_table>_id`, role-prefixed when not the row's primary owner. Renamed `created_by` → `created_by_user_id` and `updated_by` → `updated_by_user_id` everywhere. Added compound-table-name carve-out so descriptive names like `shared_expense_splits` survive — FKs may use unambiguous abbreviations like `source_split_id`.)
- **Version** — 0.3 (added `archived` user status + anonymize-on-delete flow; users are never hard-deleted so audit-column references survive forever)
- **Version** — 0.2 (added uniform audit-column standard on every table, nullable, NULL = system)
