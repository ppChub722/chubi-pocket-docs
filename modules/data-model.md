# Data Model

Cross-table view of the schema: how tables relate, which patterns are shared, and which invariants span modules. For column-level details (types, constraints, indexes) go to [`../database/schema.md`](../ref/schema.md).

The schema has **31 migrated tables** (as of migration 068, 2026-10-20) plus 5 planned Phase 2+ tables (`refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_identities`, `notification_preferences`), organized into 15 modules. Each module is owned by a per-module spec (`NN-*.md`); the table inventory is in [`../database/schema.md`](../ref/schema.md#table-of-contents).

---

## Module groupings

| Group | Module(s) | Tables |
|---|---|---|
| **Identity & sessions** | 01 — Auth | `users`; planned: `refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `oauth_identities` |
| **User profile** | 02 — Users | `user_preferences`, `user_pack_permissions`; planned: `notification_preferences` (extensions of `users`) |
| **Money primitives** | 03 — Accounts, 04 — Transactions, 05 — Categories & Tags | `accounts`, `transactions`, `pending_transactions`, `categories`, `tags`, `transaction_tags` |
| **Sharing** | 07 — Contacts, 14 — Shared Wallets | `contacts`, `account_members` (06 `shared_expense_splits` was removed in migration 024 — splits live in `personal_debts`) |
| **Goals** | 08 — Budgets, 09 — Saving Goals | `budgets`, `budget_categories`, `budget_wallets`, `budget_periods`, `saving_goals`, `saving_entries`, `saving_auto` |
| **Collaboration** | 10 — Projects (events) | `projects`, `project_members`, `project_transactions`, `event_tags`, `project_transaction_tags`, `project_my_tags` |
| **Automation** | 11 — Recurring | `recurring_rules`, `recurring_items` (`scheduled_transactions` dropped in migration 057) |
| **Personal debts** | 12 — Personal Debts | `personal_debts` |
| **Notifications** | 13 — Notifications | `notifications`, `user_notification_settings` |
| **Slip import** | 15 — Slip Import | `payment_providers`, `import_logs` |

---

## ERD — core money flow

The most-touched part of the schema:

```
users ─┬─< accounts ──< transactions (account_id; nullable = wallet-less row) ─┬─> categories
       │      └─< account_members ─> users                                      ├─> projects (nullable; auto-set on claim / debt settle)
       │                                                                        ├─> personal_debts (source_personal_debt_id; nullable, unique)
       │                                                                        └─> project_transactions (source_project_transaction_id; nullable)
       ├─< categories (self-FK: parent_id, ≤3 levels)
       ├─< tags
       ├─< pending_transactions ─┬─> personal_debts (target_debt_id; kind settle_debt)
       │                         └─> transactions (target_transaction_id; kind update_tx)
       └─< transactions

transactions ─< transaction_tags >─ tags
```

**Legend:** `─<` one-to-many, `>─` many-to-one, `──>` reference (FK).

- A transaction's date may be after today (0.4.0-2): it is a plain transaction, counted in balances / month figures / budgets from its day. `accounts.balance` is a cached sum that includes it.
- `pending_transactions` are drafts, not transactions: they never touch balances or reports until submitted.
- `transactions.scheduled_transaction_id` and `source_split_id` are gone (migrations 057 / 025). The recurring link lives on `recurring_items.transaction_id` (see *ERD — recurring*).

---

## ERD — projects & collaboration

```
users ─< projects (owner_user_id) ─┬─< project_members ─> users (user_id; nullable)
                                   ├─< event_tags
                                   ├─< project_my_tags >─ tags (each member's personal tags on the event)
                                   └─< project_transactions ─┬─> project_members (transaction_member_id)
                                                             ├─> users (record_user_id)
                                                             ├─> project_transactions (parent_project_transaction_id; split children)
                                                             ├─> transactions (linked_transaction_id; nullable, unique)
                                                             └─< project_transaction_tags >─ event_tags
```

`project_transactions` is the **canonical project ledger** — separate from personal `transactions`. Project rows never touch a personal account at insert time. Real money movement happens via:
- **Claim** — actor mirrors a `project_transactions` row onto their personal `transactions` book (sets `transactions.source_project_transaction_id`)
- **Bill from a transaction** (migration 056) — a bill made FROM a personal transaction keeps an explicit link (`project_transactions.linked_transaction_id`); the money is linked by prompt
- **Split-resolve** — on hold (spec 10 §0.5); `transactions.source_split_id` was renamed `source_personal_debt_id` (migration 025)

Event tags (migration 055) are owned by the event and shared by its members; `project_my_tags` are each member's private personal tags on it. `projects.type` and the free-text `project_transactions.tags` are gone. `project_invites` / the member→contact link were never kept (invites ride notifications; contact link dropped in migration 027).

See [10-projects.md](10-projects.md) for the full claim/resolve flow.

---

## ERD — contacts, debts, notifications

```
users ─┬─< contacts ──> users (linked_user_id; nullable, set on link-accept)
       ├─< personal_debts ─┬─> contacts (counterparty_contact_id; nullable)
       │                   ├─> transactions (source_transaction_id; the split's bill; nullable)
       │                   ├─> project_transactions (source_project_transaction_id; nullable)
       │                   ├─> projects (project_id; nullable)
       │                   └─> personal_debts (counterpart_debt_id; the partner's mirror; nullable)
       ├─< notifications (recipient_user_id) ──> users (actor_user_id; nullable)
       └─── user_notification_settings (1:1; muted_types / auto_types per notification type)
```

`personal_debts` is a **person ledger** (migration 054): one row = one entry `{person, direction paid | received, amount, date, paid label}`; net per person = Σ paid − Σ received. Entries are made by hand or from a split (`source_kind` transaction / partner). An entry's wallet side is ONE transaction pointing back at it (`transactions.source_personal_debt_id`, unique). `shared_expense_splits` (removed in migration 024) and `contact_invites` (never migrated) are gone.

---

## ERD — budgets & savings

```
users ─┬─< budgets ─┬─< budget_categories >─ categories (include_children)
       │            ├─< budget_wallets >─ accounts
       │            └─< budget_periods (one per started period)
       ├─< saving_goals
       ├─< saving_entries ─┬─> accounts (account_id; nullable = unallocated)
       │                   ├─> saving_goals (from_goal_id; nullable)
       │                   └─> saving_goals (to_goal_id; nullable)
       └─< saving_auto ─┬─> saving_goals (goal_id; nullable = the spare bucket)
                        └─> accounts (account_id; nullable = no wallet)
```

- **Budgets v2** (migration 059): a named tracker with a free scope (everything, or categories / tag names / wallets) and its own time (recurring periods or one range). `used` is computed at read time; only periods that have started are stored, each with its own amount / note.
- **Savings are a notebook** (migration 060): a `saving_entries` row moves an amount of ONE wallet between buckets (the wallet's available money, the spare bucket, a goal). Never a transaction. A goal's saved amount = the sum of its entries.
- **Auto-saving** lives on the goal / the spare bucket (`saving_auto`, migration 062). **Since migration 067 (2026-10-20) a goal or the spare bucket has MANY auto-saves**, each with its own wallet, amount and full recurrence rule (`rule` / `end_rule` JSONB in the `/recurring` API shape, `start_date`; `last_produced` = the latest occurrence a draft was made for). Each occurrence makes one pending saving draft (`pending_transactions`, kind `saving`, source `auto_save`); confirming it writes a saving entry. The old one-per-goal monthly setting (`day`, `last_month`, unique per goal) is gone.

---

## ERD — recurring (computed occurrences)

```
users ─< recurring_rules ─┬─> accounts (account_id, to_account_id; nullable)
                          ├─> categories (category_id; nullable)
                          └─< recurring_items (rule_id NOT NULL; stored occurrences only) ─┬─> transactions (transaction_id; nullable, unique)
                                                                                          ├─> pending_transactions (pending_id; legacy)
                                                                                          └─> saving_entries (saving_entry_id; legacy)
```

Since migration 068 (2026-10-20, 0.4.0-2):

- **A rule + stored occurrence rows.** `recurring_rules` is the setting: the schedule (freq / interval / weekdays / monthly / dates, start, end) and the values its occurrences record. Its occurrences are **computed** from the rule whenever they are asked for — never generated ahead.
- **A row only for what the user did.** A `recurring_items` row exists only for an occurrence that is recorded (a transaction), cleared ("จ่ายแล้ว" without a transaction, `cleared_at`), skipped (`archived`) or edited — plus manual extra occurrences and legacy rows that still hold a pending draft. An occurrence = the computed one, unless a stored row has its `(rule_id, slot)` (unique); an edited row replaces the computed occurrence of the same period.
- **State is derived, never stored:** `upcoming` (after today) · `due` (today or earlier, not recorded) · `done` · `paid` · `skipped` · `pending` (legacy). Occurrences before the rule's `tracked_from` (its creation day) count as `paid` and are never overdue.
- **Rule-side markers** replace stored rows: `tracked_from`, `due_notified_until` (what the grouped `recurring_due` notice has counted), `auto_create` + `auto_created_until` (record the transaction by itself when an occurrence comes due), `paused_from` (resume stores the paused gap as skipped rows).
- **The link lives on the item**, like an event bill's: the transaction does not point at the occurrence. Deleting the transaction releases the occurrence (back to due / upcoming, or skipped on request).
- **No pending drafts from recurring, no one-off items.** A future-dated transaction is a plain transaction. Migration 068 deleted the one-off items (with their drafts) and every unrecorded, untouched stored row — they come back as computed occurrences.

---

## Cross-cutting patterns

### Audit columns on every table

Every table carries:
- `created_at`, `created_by_user_id` (nullable; `NULL` = system)
- `updated_at`, `updated_by_user_id` (nullable; `NULL` = system)

`created_by_user_id` / `updated_by_user_id` are FKs to `users.id`. App layer sets them; DB does not auto-fill. See [`../database/schema.md`](../ref/schema.md) Conventions.

### Polymorphic-FK avoidance via dual nullable FKs

`transactions` can come from either of two sources:
- `source_personal_debt_id` → `personal_debts.id` (the wallet side of a debt entry)
- `source_project_transaction_id` → `project_transactions.id` (a claim)

Both columns nullable; CHECK enforces at most one is set. The pattern was first used on `shared_expense_splits` (removed in migration 024): `source_transaction_id` XOR `source_project_transaction_id`, and one of `contact_id` / `project_member_id` / `person_name` for the debtor.

This avoids the Rails-style `*_id` + `*_type` polymorphic discriminator (which the project explicitly rejects per the FK naming rule).

### Self-FKs use `parent_id` style (no table suffix)

- `categories.parent_id` → `categories.id` (3-level hierarchy)
- `refresh_tokens.replaced_by_id` → `refresh_tokens.id` (token rotation chain)

### Splits migrate at claim

_Historical — written for `shared_expense_splits` (removed in migration 024); for today's split entries see [12-personal-debts.md](12-personal-debts.md) §0 and [10-projects.md](10-projects.md) §0._ When a project actor claims a `project_transaction`, any existing splits linked to it migrate from `source_project_transaction_id` to `source_transaction_id` (now pointing to the actor's personal mirror). Debtor identity also migrates from `project_member_id` to `contact_id` if a corresponding contact link exists. See [06-shared-expenses.md](06-shared-expenses.md).

### Store what the user did, compute the rest

Rows exist for user actions and records; schedules and figures are computed at read time:

- **Recurring occurrences** (migration 068): computed from `recurring_rules`; a `recurring_items` row only once an occurrence is recorded, cleared, skipped or edited.
- **Budget usage**: computed from transactions (+ expected: pending drafts and computed recurring occurrences); `budget_periods` rows only for periods that have started.
- **Saving progress**: the sum of `saving_entries`; no stored progress on `saving_goals`.
- **Auto-saves** (`saving_auto`, migration 067): the rule is stored; each occurrence becomes a pending draft only on its day (`last_produced` marks how far it got).

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
| `refresh_tokens` | 01-auth | Phase 2+ (not migrated yet); rotation chain via `replaced_by_id` |
| `email_verification_tokens` | 01-auth | Phase 2+ (not migrated yet); short-lived, single-use |
| `password_reset_tokens` | 01-auth | Phase 2+ (not migrated yet); short-lived, single-use |
| `oauth_identities` | 01-auth | Phase 3+ (not migrated yet); one row per (user, provider) |
| `user_pack_permissions` | 02-users | IconMaker pack grants |
| `transaction_tags` | 05 | M:N junction |
| `budget_categories`, `budget_wallets` | 08-budgets | Budget scope junctions |
| `project_transaction_tags`, `project_my_tags` | 10-projects | Event-tag / personal-tag junctions |
| `notifications` | 13 | One row per (recipient, event) |
| `user_notification_settings` | 13 | One row per user; lazy-created |
| `payment_providers`, `import_logs` | 15-slip-import | Bank code list; unhandled-slip log |

`contact_invites` and `project_invites` were never migrated (invites ride notifications).

---

## Status

- **Last updated** — 2026-10-20
- **Version** — 0.3 (refreshed against migrations up to 068: table count 31 + 5 planned; groupings now include pending drafts, budgets v2, savings notebook + auto-saves, events tags, recurring, slip import; core / projects / debts ERDs drop `shared_expense_splits`, `scheduled_transactions`, `contact_invites`, `project_invites`; new ERDs for budgets & savings (067: many auto-saves per goal) and recurring (068: a rule + stored occurrence rows only for recorded / cleared / skipped / edited ones, occurrences computed); new pattern "store what the user did, compute the rest")
- **Version** — 0.2 (refreshed against schema v0.4: 25 tables, current ERD by group, polymorphic-FK pattern, audit columns, anonymize-on-archive, splits-migrate-at-claim)
