# Phase 1b — Database

**Goal:** 8 new tables added via migrations 8–15 plus one ALTER on `transactions` (migration 16). Polymorphic FK constraints on `shared_expense_splits`. Registration extended to also seed `user_notification_settings`. Per-caller settlement query patterns established. **No invite-code tables** — link requests use notifications (see [`overview.md §Spec deviation`](overview.md#spec-deviation-invites-via-notifications-no-invite-code-tables)).

**Stack** (locked from Phase 0/1a): PostgreSQL 15+, UUID v7 PKs (Go-side), `golang-migrate`, audit columns + `set_timestamp` trigger on every table.

For the canonical schema, see [`../../design/database/schema.md`](../../design/database/schema.md) sections 06 / 07 / 10 / 12 / 13. For the migration tooling and conventions, see [`../phase0/db.md`](../phase0/db.md).

---

## Migration order

FK chain dictates the order — `contacts` and `notifications` are leaf-ish (only `users` upstream); `projects` precedes `project_members` precedes `project_transactions`; `shared_expense_splits` requires both `transactions` (1a) and `project_transactions` to exist before it; `personal_debts` references `shared_expense_splits`; the `transactions` ALTER lands AFTER all FK targets exist.

| # | File | Tables / changes | New FKs to existing |
|---|---|---|---|
| 8  | `000008_init_contacts.up.sql` | `contacts` | `users.id` (owner + audit + `linked_user_id`) |
| 9  | `000009_init_notifications.up.sql` | `notifications` | `users.id` (recipient + actor + audit) |
| 10 | `000010_init_user_notification_settings.up.sql` | `user_notification_settings` (+ backfill row for every existing user) | `users.id` (PK + audit), `accounts.id` (default_account_id) |
| 11 | `000011_init_projects.up.sql` | `projects` | `users.id` (owner + audit) |
| 12 | `000012_init_project_members.up.sql` | `project_members` | `projects.id`, `users.id`, `contacts.id` |
| 13 | `000013_init_project_transactions.up.sql` | `project_transactions` | `projects.id`, `project_members.id`, `users.id` (record_user_id), `categories.id` |
| 14 | `000014_init_shared_expense_splits.up.sql` | `shared_expense_splits` | `transactions.id`, `project_transactions.id`, `contacts.id`, `project_members.id` |
| 15 | `000015_init_personal_debts.up.sql` | `personal_debts` | `users.id`, `contacts.id`, `shared_expense_splits.id`, `projects.id` |
| 16 | `000016_alter_transactions_phase1b.up.sql` | adds `project_id`, `source_split_id`, `source_project_transaction_id` columns + 3 partial indexes + extended CHECK on `transactions` | `projects.id`, `shared_expense_splits.id`, `project_transactions.id` |

**Dropped from earlier draft:** `contact_invites` and `project_invites` migrations (see [overview.md §Spec deviation](overview.md#spec-deviation-invites-via-notifications-no-invite-code-tables)). Link requests are notification rows; no separate invite tables exist.

Each migration: idempotent up (`IF NOT EXISTS`), mandatory down, `set_timestamp` trigger on every table that has `updated_at`.

---

## Tasks

### 000008 — `contacts`

Per [`schema.md#07--contacts`](../../design/database/schema.md#07--contacts).

- [ ] Columns per schema (§ `contacts`); `status CHECK IN ('active','archived')`
- [ ] CHECK `user_id <> linked_user_id` (block self-link)
- [ ] FK `user_id → users(id) ON DELETE CASCADE`
- [ ] FK `linked_user_id → users(id)` — no CASCADE; `linked_user_id` clears via unlink endpoint, contacts module never receives a CASCADE event
- [ ] **Indexes:**
  - `idx_contacts_user (user_id, status)`
  - `idx_contacts_name (user_id, LOWER(display_name))`
  - `idx_contacts_email (user_id, LOWER(email)) WHERE email IS NOT NULL` — supports lookup-by-email when sending link request (constant-cost regardless of match)
  - `idx_contacts_app_user UNIQUE (user_id, linked_user_id) WHERE linked_user_id IS NOT NULL` — one contact per (user, linked app user)
  - `idx_contacts_linked_user (linked_user_id) WHERE linked_user_id IS NOT NULL` — reverse query
- [ ] `set_timestamp` trigger
- [ ] **API-layer rules** (not in DB):
  - `nickname` may be NULL
  - on hard-delete, splits get `person_name = COALESCE(nickname, display_name)` before contact row is dropped
  - `request-link` looks up by `LOWER(contact.email) = LOWER(users.email)`; void on miss

### 000009 — `notifications`

Per [`schema.md#13--notifications`](../../design/database/schema.md#13--notifications).

- [ ] Columns per schema (§ `notifications`); `payload JSONB NOT NULL`; `type VARCHAR(50)` with CHECK list (Phase 1b allows: `split_created`, `split_paid`, `split_received`, `project_tx_recorded_for_you`, `project_tx_changed`, `project_invite`, `contact_link_request`)
- [ ] CHECK at most one of `actioned_at` / `dismissed_at` is set
- [ ] FK `recipient_user_id → users(id) ON DELETE CASCADE`
- [ ] FK `actor_user_id → users(id)` — no CASCADE (preserve audit if actor is anonymized)
- [ ] **Indexes:**
  - `idx_notifications_recipient_unread (recipient_user_id, created_at DESC) WHERE read_at IS NULL`
  - `idx_notifications_recipient_all (recipient_user_id, created_at DESC)`
  - `idx_notifications_actor (actor_user_id) WHERE actor_user_id IS NOT NULL`
  - `idx_notifications_link_payload USING gin (payload) WHERE type IN ('contact_link_request', 'project_invite')` — used by accept/reject endpoints to find the link target by `(notification_id, recipient)` quickly; payload contains `contact_id` or `member_id`. Optional in 1b — only add if the JSONB lookup gets slow.
- [ ] `set_timestamp` trigger
- [ ] **CHECK on type list will need extension in Phase 2** (push triggers, `personal_debt_cancelled`, etc.); plan a follow-up migration then

### 000010 — `user_notification_settings`

- [ ] Columns per schema (§ `user_notification_settings`); PK `user_id`
- [ ] FK `user_id → users(id) ON DELETE CASCADE`
- [ ] FK `default_account_id → accounts(id)` — no CASCADE; clear it explicitly when accounts are archived (Phase 2 worry — for now archived accounts may still be referenced; UI shows "select another")
- [ ] `set_timestamp` trigger
- [ ] **Backfill in the same migration:** `INSERT INTO user_notification_settings (user_id) SELECT id FROM users ON CONFLICT (user_id) DO NOTHING` — handles any users created before 1b
- [ ] **API-layer rule:** registration hook auto-creates the row alongside categories seed (see [`be.md` §Registration hooks](be.md#registration-hooks))

### 000011 — `projects`

Per [`schema.md#10--projects`](../../design/database/schema.md#10--projects).

- [ ] Columns per schema (§ `projects`); `status CHECK IN ('active','completed','cancelled','archived')`
- [ ] FK `owner_user_id → users(id)` — no CASCADE (project ownership transfer is a managed flow, never silent)
- [ ] **Indexes:**
  - `idx_projects_owner (owner_user_id, status)`
  - `idx_projects_status (status, updated_at DESC)`
- [ ] `set_timestamp` trigger
- [ ] **No `budget_goal` column** — Phase 2 decision

### 000012 — `project_members`

- [ ] Columns per schema (§ `project_members`); `role CHECK IN ('owner','contributor','viewer')`; `status CHECK IN ('pending','active','left')`
- [ ] FK `project_id → projects(id) ON DELETE CASCADE`
- [ ] FK `user_id → users(id)` — no CASCADE; member rows survive even if a user account is anonymized (audit preservation)
- [ ] FK `contact_id → contacts(id)` — no CASCADE; if contact is hard-deleted the member row stays (display_name is durable)
- [ ] **Indexes:**
  - `idx_project_members_user UNIQUE (project_id, user_id) WHERE user_id IS NOT NULL` — one user per project
  - `idx_project_members_project (project_id, status)`
  - `idx_project_members_user_reverse (user_id, status) WHERE user_id IS NOT NULL`
  - `idx_project_members_owner UNIQUE (project_id) WHERE role = 'owner'` — one owner per project
- [ ] `set_timestamp` trigger
- [ ] **API-layer rules:**
  - Owner role transitions only via ownership-transfer endpoint; demote previous owner to `contributor` in same tx as promotion
  - Variant (b) "direct invite by email" creates `project_members` row with `status = 'pending'`; `request-link` notification activates it (status flips to `active` + `user_id` populated)
  - Variant (a) "from linked contact" creates `project_members` row with `user_id` and `status = 'active'` immediately (linked contact already consented to link); informational `project_invite` notification sent

### 000013 — `project_transactions`

- [ ] Columns per schema (§ `project_transactions`); `type CHECK IN ('expense','income')` (no `transfer` here)
- [ ] CHECK `amount > 0`
- [ ] FK `project_id → projects(id) ON DELETE CASCADE`
- [ ] FK `transaction_member_id → project_members(id)` — no CASCADE (member row's status='left' must not break ledger)
- [ ] FK `record_user_id → users(id)` — no CASCADE
- [ ] FK `category_id → categories(id) ON DELETE SET NULL` (1b: nullable, typically left null per spec)
- [ ] **Indexes:**
  - `idx_project_tx_project (project_id, date DESC)`
  - `idx_project_tx_member (transaction_member_id)`
  - `idx_project_tx_recorder (record_user_id)`
- [ ] `set_timestamp` trigger
- [ ] **API-layer rule:** `transaction_member_id` must belong to `project_id` (cross-project mismatch rejected); project must be `status = 'active'` for inserts (lifecycle table per spec §3.1)

### 000014 — `shared_expense_splits`

The trickiest table — polymorphic source FKs + 3-way debtor identifier with parent-context gating.

- [ ] Columns per schema (§ `shared_expense_splits`)
- [ ] FK `source_transaction_id → transactions(id) ON DELETE CASCADE`
- [ ] FK `source_project_transaction_id → project_transactions(id) ON DELETE CASCADE`
- [ ] FK `contact_id → contacts(id)` — no CASCADE; contacts module restores `person_name` on hard-delete then nulls FK
- [ ] FK `project_member_id → project_members(id)` — no CASCADE
- [ ] **CHECK** exactly one source set:
  ```sql
  CHECK (
    (source_transaction_id IS NOT NULL)::int +
    (source_project_transaction_id IS NOT NULL)::int = 1
  )
  ```
- [ ] **CHECK** exactly one debtor identifier set:
  ```sql
  CHECK (
    (person_name IS NOT NULL)::int +
    (contact_id IS NOT NULL)::int +
    (project_member_id IS NOT NULL)::int = 1
  )
  ```
- [ ] CHECK `split_type IN ('fixed', 'percent')`
- [ ] CHECK `owed_amount > 0`
- [ ] **Indexes:**
  - `idx_splits_source_tx (source_transaction_id) WHERE source_transaction_id IS NOT NULL`
  - `idx_splits_source_pt (source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL`
  - `idx_splits_contact (contact_id) WHERE contact_id IS NOT NULL`
  - `idx_splits_project_member (project_member_id) WHERE project_member_id IS NOT NULL`
- [ ] `set_timestamp` trigger
- [ ] **API-layer parent-context gating** (not in DB):
  - `source_project_transaction_id IS NOT NULL` → debtor MUST be `project_member_id`
  - `source_transaction_id IS NOT NULL` AND parent's `project_id IS NULL` → debtor MUST be `contact_id` or `person_name`
  - `source_transaction_id IS NOT NULL` AND parent's `project_id IS NOT NULL` (post-claim mirror) → debtor MUST be `project_member_id`

### 000015 — `personal_debts`

- [ ] Columns per schema (§ `personal_debts`); `creditor_person_name NOT NULL` (always set per spec §4.2)
- [ ] CHECK `paid_amount <= amount` (DB-level guard against runaway auto-bumps; auto-bump path uses `LEAST` to clamp)
- [ ] CHECK `status IN ('open','paid','cancelled')`
- [ ] FK `user_id → users(id) ON DELETE CASCADE`
- [ ] FK `creditor_contact_id → contacts(id)` — no CASCADE; if contact deleted the debt stays (debtor's tracking)
- [ ] FK `source_split_id → shared_expense_splits(id) ON DELETE SET NULL` — debt survives split deletion (per spec §4.6)
- [ ] FK `project_id → projects(id)` — no CASCADE
- [ ] **Indexes:**
  - `idx_personal_debts_source UNIQUE (user_id, source_split_id) WHERE source_split_id IS NOT NULL` — prevent double-tracking
  - `idx_personal_debts_user (user_id, status)`
  - `idx_personal_debts_creditor_contact (creditor_contact_id) WHERE creditor_contact_id IS NOT NULL`
  - `idx_personal_debts_project (project_id) WHERE project_id IS NOT NULL`
- [ ] `set_timestamp` trigger
- [ ] **App-layer rule:** auto-bump (in transactions.Service write path) pins `paid_amount` to `LEAST(amount, paid_amount + delta)` to never violate the CHECK. Spec §4.5 allows manual `paid_amount` edits — CHECK still applies. Manual `personal-debts/:id/pay` rejects overpayment with `400 OVERPAYMENT`.

### 000016 — `transactions` ALTER for Phase 1b

The 4 columns deferred from 1a; this migration adds 3 of them (the 4th — `scheduled_transaction_id` — is Phase 1c).

- [ ] `ALTER TABLE transactions ADD COLUMN project_id UUID REFERENCES projects(id)` — no CASCADE; project deletes are blocked when transactions reference (or pass through archive)
- [ ] `ALTER TABLE transactions ADD COLUMN source_split_id UUID REFERENCES shared_expense_splits(id) ON DELETE SET NULL` — debt survives split deletion
- [ ] `ALTER TABLE transactions ADD COLUMN source_project_transaction_id UUID REFERENCES project_transactions(id)` — no CASCADE; project_transactions can't be deleted while a personal mirror references via `source_project_transaction_id` (block on FK error)
- [ ] **Drop** any 1a CHECK that asserted no `source_*` are set, and **add** the new ones from [`schema.md §04`](../../design/database/schema.md#04--transactions):
  ```sql
  -- At most one source set
  ALTER TABLE transactions ADD CONSTRAINT chk_tx_at_most_one_source CHECK (
    (source_split_id IS NOT NULL)::int +
    (source_project_transaction_id IS NOT NULL)::int <= 1
  );
  -- project_id ⇔ at least one source set
  ALTER TABLE transactions ADD CONSTRAINT chk_tx_project_id_iff_source CHECK (
    (project_id IS NOT NULL) =
      ((source_split_id IS NOT NULL) OR (source_project_transaction_id IS NOT NULL))
  );
  ```
  Bare personal transactions (no split, no claim) MUST have `project_id = NULL`. Test the chk-violation case explicitly.
- [ ] **Indexes:**
  - `idx_transactions_project (project_id, date DESC) WHERE project_id IS NOT NULL` — project-scoped lists
  - `idx_transactions_source_split (source_split_id) WHERE source_split_id IS NOT NULL` — settlement state computation; auto-bump lookup
  - `idx_transactions_source_pt (source_project_transaction_id) WHERE source_project_transaction_id IS NOT NULL` — claim deduplication on shared-book view

### Down migration (000016 down)

Drop indexes, drop CHECKs, drop columns. Documented as **destructive** — running `migrate down 1` from 1b state DROPs the 3 columns and any data in them. Don't run in production without backup.

---

## Registration hook extension

The 1a registration hook seeds 6 system + 28 starter categories inside the `auth.Service.Register` tx. Phase 1b adds one more hook — `notifications.SeedSettings` — which inserts the per-user `user_notification_settings` row with defaults.

```go
// be.md §Registration hooks documents the wiring. Pseudocode:
authService := auth.NewService(authStore, cfg,
    categoriesService.SeedForUser,
    notificationsService.SeedSettings, // new in 1b
)
```

Defaults per [spec §4.7](../../design/spec/13-notifications.md):

| Column | Default | Why |
|---|---|---|
| `auto_notify_linked_split_contacts` | `true` | Splitter expects coordination |
| `auto_add_to_personal_debt_on_split_notification` | `false` | Forces conscious decision |
| `auto_record_received_payment` | `false` | Forces creditor to confirm |
| `auto_resolve_own_in_projects` | `false` | Explicit control of personal book |
| `default_account_id` | `NULL` | User picks one as accounts get created |

Migration 000010 backfills the row for any pre-1b users via `INSERT … ON CONFLICT DO NOTHING`, so the registration-hook addition is idempotent.

---

## Per-caller settlement state — query patterns

Spec [§2.3](../../design/spec/06-shared-expenses.md) requires per-caller computed `outstanding_from_my_view`. SQL pattern (used by `GET /v1/shared-expenses/splits` and the project summary):

```sql
-- For each split the caller is involved in, compute outstanding from caller's view
SELECT
  s.id,
  s.owed_amount,
  s.owed_amount - COALESCE(SUM(t.amount), 0) AS outstanding_from_my_view
FROM shared_expense_splits s
LEFT JOIN transactions t
  ON t.source_split_id = s.id
 AND t.user_id = $caller
 AND (
       (t.type = 'expense' AND :caller_role = 'debtor') OR
       (t.type = 'income'  AND :caller_role = 'creditor')
     )
WHERE /* caller is the debtor or creditor of s */
GROUP BY s.id, s.owed_amount;
```

For 1b this runs inline. Phase 2+ may add a `split_settlement_state` materialized view if the query gets hot.

---

## Splits-migrate-on-claim atomicity

When a linked actor claims their own project_transaction, the same DB tx executes:

```sql
-- Step 0: lock the project_transaction row to serialize concurrent claims
SELECT 1 FROM project_transactions WHERE id = $pt_id FOR UPDATE;

-- Step 1: lock the actor's account
SELECT 1 FROM accounts WHERE id = $account_id FOR UPDATE;

-- Step 2: insert personal mirror (uses transactions.Service.CreateInTx)
INSERT INTO transactions (..., source_project_transaction_id, project_id, ...) VALUES (...);

-- Step 3: migrate splits
UPDATE shared_expense_splits
   SET source_transaction_id = $mirror_id,
       source_project_transaction_id = NULL,
       updated_by_user_id = $caller
 WHERE source_project_transaction_id = $pt_id;

-- Step 4: balance delta
UPDATE accounts SET balance = balance + ($delta_signed) WHERE id = $account_id;
```

Test plan: 50 goroutines × concurrent claims on the same project_transaction → only one succeeds with `201 Created`; the rest hit `400 ALREADY_CLAIMED` (no second mirror, no double-migrated splits).

---

## Personal-debt auto-bump

When `transactions.Service.Create*` inserts a row with `source_split_id` set, the same tx runs:

```sql
UPDATE personal_debts
   SET paid_amount = LEAST(amount, paid_amount + $tx_amount),
       status = CASE
                  WHEN LEAST(amount, paid_amount + $tx_amount) >= amount THEN 'paid'
                  ELSE status
                END,
       updated_by_user_id = $caller
 WHERE user_id = $caller AND source_split_id = $tx_source_split_id;
```

`LEAST(amount, paid_amount + delta)` keeps the CHECK satisfied even if the user records overpayments via the auto path (multiple partial pays summing > amount). Spec §3.6 Manual `personal-debts/:id/pay` rejects overpayment with `400 OVERPAYMENT`; the auto path tolerates it by clamping. Tradeoff documented in [`be.md` §personal-debts](be.md#1b5--splits--personal_debts--wire-contactsabsorb).

---

## Link-request lookup pattern

`POST /v1/contacts/:id/request-link` and `POST /v1/projects/:id/members/:member_id/request-link` both follow the same pattern:

```sql
-- Look up by email (or username — same shape)
SELECT id FROM users WHERE LOWER(email) = LOWER($contact.email) LIMIT 1;
```

If found, `INSERT INTO notifications` with the appropriate trigger type. If not found, no DB write at all — the endpoint returns the same 200 response. **Always run the lookup** (even when the answer might be discardable) so the response time is constant — the privacy guarantee depends on no observable difference between branches.

```go
// Sketch — both branches go through the same execution path
func (s *Service) RequestLink(ctx, ...) error {
    var foundID *uuid.UUID
    _ = s.store.LookupUserByEmail(ctx, contact.Email).Scan(&foundID) // always run
    if foundID != nil {
        _ = s.notifications.DispatchTx(ctx, tx, /* contact_link_request payload */)
    }
    return nil  // always 200 to caller
}
```

---

## Verification

- [ ] `migrate up` from a fresh DB applies migrations 1–16 cleanly
- [ ] `migrate down 9` rolls back to Phase 1a state cleanly; `migrate up 9` reapplies
- [ ] After `auth/register`, the new user has the `user_notification_settings` row with defaults (in addition to the 34 categories from 1a)
- [ ] Inserting `transactions` row with `project_id` set but neither `source_split_id` nor `source_project_transaction_id` violates `chk_tx_project_id_iff_source` — verify with a manual psql insert test
- [ ] Concurrent claim test passes
- [ ] Auto-bump test passes (single split → multiple pays sum without violating `paid_amount <= amount`)
- [ ] Link-request privacy test: response time and shape are identical for hit-vs-miss email lookups (timing-attack mitigation)

---

## What you read

- [`../../design/database/schema.md`](../../design/database/schema.md) — full schema; sections 06 / 07 / 10 / 12 / 13 are 1b-owned. **Note:** schema doc still describes `contact_invites` and `project_invites` tables — those are deviated from in this plan; spec/schema text edits queued for post-1b.
- [`../../design/spec/06-shared-expenses.md`](../../design/spec/06-shared-expenses.md) — splits, polymorphic FKs, per-caller settlement, splits-migrate-on-claim
- [`../../design/spec/07-contacts.md`](../../design/spec/07-contacts.md) — contacts; **§3.7–3.8 invite flow superseded by notification-based link request — see [`overview.md`](overview.md)**
- [`../../design/spec/10-projects.md`](../../design/spec/10-projects.md) — projects, members, ledger, claim flow, lifecycle
- [`../../design/spec/12-personal-debts.md`](../../design/spec/12-personal-debts.md) — auto-close, manual edits, dashboard
- [`../../design/spec/13-notifications.md`](../../design/spec/13-notifications.md) — 6 spec triggers; **+ `contact_link_request` added in this plan**
- [`../phase1a/db.md`](../phase1a/db.md) — patterns inherited

## What you don't need to read

- Spec module 11 (`scheduled_transactions` — Phase 1c)
- Spec modules 08–09 (`budgets`, `saving_goals` — Phase 1c)

---

## Done when

- [ ] All 9 migrations apply + roll back cleanly
- [ ] Per-user seed at registration produces 34 categories + 1 user_notification_settings row (35 total side rows)
- [ ] Splits CHECKs reject every illegal combination (validated via psql; see test list in [`be.md`](be.md))
- [ ] Concurrent claim test green
- [ ] Personal-debt auto-bump test green
- [ ] Link-request privacy test green (constant response time + shape)
- [ ] No 1a regression (balance-cache concurrency test still green)
