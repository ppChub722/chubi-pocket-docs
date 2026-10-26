# Phase 1b — Backend

**Goal:** 5 new modules under `internal/modules/` (`contacts`, `notifications`, `projects`, `splits`, `personal_debts`); existing `transactions` module extended to handle `source_split_id` / `source_project_transaction_id` and call cross-module hooks; registration extended with one more hook (notification settings); all 7 Phase 1b notification triggers wired across the producing modules — including **link-request flows** for both contacts and projects (no invite-code tables; see [`overview.md §Spec deviation`](overview.md#spec-deviation-invites-via-notifications-no-invite-code-tables)).

**Stack** (locked from Phase 0 / 1a): Go + Gin, `pgx/v5`, `slog`, JWT-bearer middleware. New modules copy the `handler.go` / `service.go` / `store.go` / `model.go` layout used by the 1a modules.

For DB migrations + per-caller settlement query patterns + atomicity SQL, see [`db.md`](db.md). For endpoint contracts, see the spec modules linked per section.

---

## Module dependency graph

```
auth ────────┐
              ▼
notifications ◄──── (consumed by every producer module below)
              │
contacts ◄────┼──── projects
              │      │
              │      ▼
              │   project_members (sub of projects)
              │      │
              │      ▼
              │   project_transactions (sub of projects)
              │      ▲
              ▼      │
          splits ◄───┘
              ▲
              │ (auto-bump on tx with source_split_id)
              │
   transactions ──► personal_debts
                      ▲
                      │ (pay/cancel)
                      │
              ┌───────┘
              │
            (debtor's manual pay also touches transactions)
```

Direction summary (no cycles after func-injection wiring):

- `notifications` is the only module imported by everyone; it doesn't import any producer (one-way fan-in). Used by `contacts.RequestLink`, `projects.AddMember` variant (b), splits / project_tx triggers.
- `transactions` imports nothing new structurally, but receives 3 injected callbacks: `splits.Validator`, `personal_debts.AutoBumper`, `notifications.Dispatcher`
- `splits` imports `transactions` (for `CreateInTx`), `notifications` (for `split_created` etc.), and `contacts` (for absorb support)
- `personal_debts` imports `transactions` (for `personal-debts/:id/pay`) and `notifications`
- `projects` imports `contacts` (for member-from-contact variant), `transactions` (for claim flow), and `notifications` (for `project_invite` link-requests)
- `contacts` imports `notifications` (for `contact_link_request`); receives an injected callback into `splits` for absorb / delete (so contacts doesn't hard-import splits)

`auth.Service` registration hooks now seed both categories AND notification settings.

---

## Sub-milestones (mirrors `overview.md`)

Each slice is a PR-sized commit cluster. Migrations + module + tests in the same slice.

### 1b.1 — Contacts

Folder: `internal/modules/contacts/`. Files: `model.go`, `store.go`, `service.go`, `handler.go`.

Endpoints per [`07-contacts.md §3`](../../design/spec/07-contacts.md), with the link-request flow replacing the spec's invite-code endpoints:

- [ ] `POST   /v1/contacts` (with optional `absorb_names`)
- [ ] `GET    /v1/contacts` (filter: `status`, `linked`, `search`)
- [ ] `GET    /v1/contacts/unlinked-names` (powers absorb wizard) — registered before `/:id`
- [ ] `GET    /v1/contacts/:id`
- [ ] `PUT    /v1/contacts/:id` (partial; `display_name`, `nickname`, `email`, `phone`, `notes`, `icon`)
- [ ] `POST   /v1/contacts/:id/absorb` (1b.1: stub returning `501` until 1b.5 wires it; or no-op early — pick one and document)
- [ ] **`POST   /v1/contacts/:id/request-link`** — looks up `users.email` / `users.username` against `contact.email`; fires `contact_link_request` notification iff match. Same 200 response either way (privacy preservation).
- [ ] **`POST   /v1/contacts/link-requests/:notification_id/accept`** — recipient (the matched user) accepts. Sets `contacts.linked_user_id = caller`, marks notification `actioned_at`. Idempotent (re-accept is no-op).
- [ ] **`POST   /v1/contacts/link-requests/:notification_id/reject`** — recipient rejects. Marks notification `dismissed_at`. No link change.
- [ ] `POST   /v1/contacts/:id/unlink` (`linked_user_id = NULL`; spec §3.10)
- [ ] `POST   /v1/contacts/:id/archive`
- [ ] `POST   /v1/contacts/:id/restore`
- [ ] `DELETE /v1/contacts/:id` (hard delete; restores `person_name` on referencing splits)

Public exports for other modules:

- [ ] `contacts.Service.GetByID(ctx, userID, contactID)` — used by `projects.AddMember` variant (a)
- [ ] `contacts.SplitsRestorer` func type — injected from `splits` package via `WithSplitsRestorer(...)`. On `DELETE /v1/contacts/:id`, called inside the contact-delete tx to run `UPDATE shared_expense_splits SET person_name = COALESCE(c.nickname, c.display_name), contact_id = NULL WHERE contact_id = $1`. In 1b.1 this is `nil` (table doesn't exist) → contact delete does no restoration; 1b.5 wires the real impl.

Errors mapped: `VALIDATION_ERROR`, `NOT_FOUND`, `ALREADY_LINKED` (409 — contact already has `linked_user_id` when accept fires), `NOT_LINKED`, `NOT_ARCHIVED`, `ALREADY_ARCHIVED`, `LINK_REQUEST_NOT_FOR_YOU` (notification not addressed to caller — defensive 403).

### 1b.2 — Notifications

Folder: `internal/modules/notifications/`. Files: `model.go`, `store.go`, `service.go`, `handler.go`, `dispatcher.go` (write-side helpers).

Endpoints per [`13-notifications.md §3`](../../design/spec/13-notifications.md):

- [ ] `GET    /v1/notifications` (filter: `read`, `actioned`, `type`, `from`, `to`, pagination)
- [ ] `POST   /v1/notifications/read-all` (registered before `/:id/...`)
- [ ] `POST   /v1/notifications/:id/read`
- [ ] `POST   /v1/notifications/:id/actioned`
- [ ] `POST   /v1/notifications/:id/dismiss`
- [ ] `DELETE /v1/notifications/:id`
- [ ] `GET    /v1/notifications/settings`
- [ ] `PUT    /v1/notifications/settings`

Public exports for other modules:

- [ ] `notifications.Service.SeedSettings(ctx, tx, userID)` — registration hook (extends 1a's category seeder via `auth.RegistrationHook` slice)
- [ ] `notifications.Service.DispatchTx(ctx, tx, type, recipient, actor, payload, deepLink)` — the in-tx insert. Each producer calls this inside its action's tx.
- [ ] `notifications.Service.GetSettings(ctx, userID)` — used by `splits.Service` to honor `auto_notify_linked_split_contacts`
- [ ] `notifications.Service.LookupUserByEmail(ctx, email)` and `LookupUserByUsername(ctx, username)` — small helpers used by `contacts.RequestLink` and `projects.AddMember` (variant b). Always-execute (constant-time intent — the caller decides whether to dispatch).

Schema typing: `payload` is JSONB. `dispatcher.go` exposes one typed Go func per trigger:

```go
func (s *Service) DispatchSplitCreated(ctx, tx, recipient, actor, p SplitCreatedPayload) error
func (s *Service) DispatchSplitPaid(ctx, tx, recipient, actor, p SplitPaidPayload) error
func (s *Service) DispatchSplitReceived(ctx, tx, recipient, actor, p SplitReceivedPayload) error
func (s *Service) DispatchProjectTxRecordedForYou(ctx, tx, recipient, actor, p ProjectTxRecordedPayload) error
func (s *Service) DispatchProjectTxChanged(ctx, tx, recipient, actor, p ProjectTxChangedPayload) error
func (s *Service) DispatchProjectInvite(ctx, tx, recipient, actor, p ProjectInvitePayload) error  // link-request
func (s *Service) DispatchContactLinkRequest(ctx, tx, recipient, actor, p ContactLinkRequestPayload) error
```

Each helper marshals the typed struct → JSONB and inserts.

**Solo project / self-target guard** — every dispatch path checks "is the recipient the same user as the actor? skip silently". One line in `DispatchTx`; all callers benefit.

Payload shapes for the link-request triggers (new in 1b):

```go
type ContactLinkRequestPayload struct {
    ContactID         uuid.UUID `json:"contact_id"`
    SenderDisplayName string    `json:"sender_display_name"`
    // No back-channel: recipient just sees "Alice wants to link as a contact"
}

type ProjectInvitePayload struct {
    ProjectMemberID  uuid.UUID `json:"project_member_id"`
    ProjectID        uuid.UUID `json:"project_id"`
    ProjectName      string    `json:"project_name"`
    InviterDisplayName string  `json:"inviter_display_name"`
    Role             string    `json:"role"`
}
```

Errors mapped: `VALIDATION_ERROR`, `NOT_FOUND`, `NOT_FOR_YOU` (403 if caller != recipient on accept/reject/etc).

### 1b.3 — Projects (CRUD + members + ownership)

Folder: `internal/modules/projects/`. Files: `model.go`, `store.go`, `service.go`, `handler.go`, `members.go` (sub-store + sub-service for member management; lives in same package).

Endpoints per [`10-projects.md §3.1, §3.2, §3.4, §3.5`](../../design/spec/10-projects.md), with the link-request flow replacing invite codes:

- [ ] `POST   /v1/projects` (creator becomes owner)
- [ ] `GET    /v1/projects` (filter: `status`, `type`)
- [ ] `GET    /v1/projects/:id` (with members, summary)
- [ ] `PUT    /v1/projects/:id` (owner only; status transitions enforced per §3.1 lifecycle table)
- [ ] `DELETE /v1/projects/:id` (owner only; blocked if any transactions reference)
- [ ] `GET    /v1/projects/:id/members`
- [ ] `POST   /v1/projects/:id/members` (3 variants):
  - **(a) From contact** — `{ contact_id, role }`. If contact is linked (`linked_user_id` set), creates member row with `user_id` populated, `status = 'active'` immediately, AND fires informational `project_invite` notification to the user. If contact is unlinked but its email matches a user, falls through to variant (b) flow.
  - **(b) Direct invite by email** — `{ display_name, email, role }`. Creates `project_members` row with `user_id = NULL`, `contact_id = NULL`, `display_name`, `status = 'pending'`. Fires `project_invite` notification iff email matches a registered user; voids silently otherwise. Same 200 response either way.
  - **(c) Ad-hoc** — `{ display_name, role, ad_hoc: true }`. Creates row with both `user_id` and `contact_id` NULL, `status = 'active'`. No notification.
- [ ] `PUT    /v1/projects/:id/members/:member_id` (role change)
- [ ] `DELETE /v1/projects/:id/members/:member_id` (soft remove → status='left')
- [ ] **`POST   /v1/projects/:id/members/:member_id/request-link`** — re-fire link request for an existing pending member (e.g., owner forgot to invite, or wants to retry after correcting the email). Looks up; fires notification on hit; voids silently on miss.
- [ ] **`POST   /v1/projects/link-requests/:notification_id/accept`** — recipient accepts. Sets `project_members.user_id = caller`, `joined_at = NOW()`, `status = 'active'`. Marks notification `actioned`.
- [ ] **`POST   /v1/projects/link-requests/:notification_id/reject`** — marks notification `dismissed`. Member row stays `pending` (owner can re-send via `request-link` or remove via DELETE).
- [ ] `POST   /v1/projects/:id/transfer-ownership` (atomic role swap)
- [ ] `POST   /v1/projects/:id/leave`

Public exports:

- [ ] `projects.Service.IsMember(ctx, userID, projectID) (member, ok)` — used by splits/notifications to validate access
- [ ] `projects.Service.GetMember(ctx, projectID, memberID) (*Member, error)` — used by splits to validate `project_member_id` debtors
- [ ] `projects.Service.OwnerUserID(ctx, projectID) (uuid, error)` — for `project_tx_changed` recipient lists

Lifecycle gating: `service.go` exposes `assertWritable(ctx, projectID)` which checks status against the lifecycle table per [`10-projects.md §3.1`](../../design/spec/10-projects.md). Returns `PROJECT_NOT_ACTIVE` / `PROJECT_LOCKED`. Called by every write path that touches project_transactions in 1b.4.

Errors mapped: `VALIDATION_ERROR`, `NOT_OWNER` (403), `PROJECT_HAS_TRANSACTIONS`, `PROJECT_LOCKED`, `PROJECT_NOT_ACTIVE`, `OWNER_CANNOT_LEAVE`, `CANNOT_REMOVE_OWNER`, `NOT_LINKED_MEMBER` (for transfer), `ALREADY_MEMBER` (409 on accept), `USER_ALREADY_MEMBER`, `LINK_REQUEST_NOT_FOR_YOU`.

### 1b.4 — Project transactions + claim flow + shared book

Extends `internal/modules/projects/` with a `project_transactions.go` sub-file. Also extends `transactions/` to support the `source_project_transaction_id` column and the claim flow.

Endpoints per [`10-projects.md §3.6, §3.6a, §3.7, §3.8`](../../design/spec/10-projects.md):

- [ ] `GET    /v1/projects/:id/transactions` (shared-book read; UNION view)
- [ ] `POST   /v1/projects/:id/project-transactions` (with optional `splits` array)
- [ ] `PUT    /v1/projects/:id/project-transactions/:pt_id` (recorder or owner)
- [ ] `DELETE /v1/projects/:id/project-transactions/:pt_id` (recorder or owner; cascades to splits)
- [ ] `POST   /v1/projects/:id/project-transactions/:pt_id/claim` (linked actor; migrates splits)
- [ ] `POST   /v1/projects/:id/resolve-all` (batch convenience)
- [ ] `GET    /v1/projects/:id/summary` (member balances, debt matrix, my position)

Claim flow (atomic, see [`db.md §splits-migrate-on-claim atomicity`](db.md#splits-migrate-on-claim-atomicity)):

```go
func (s *Service) Claim(ctx, userID, projectID, ptID uuid.UUID, req ClaimRequest) (*transactions.Transaction, error) {
    tx, _ := db.Begin(ctx); defer tx.Rollback(ctx)

    // Lock the project_transaction row to serialize concurrent claims
    if _, err := tx.Exec(ctx, "SELECT 1 FROM project_transactions WHERE id=$1 FOR UPDATE", ptID); err != nil { ... }

    // Validate: caller is the linked actor; not already claimed
    pt := s.store.GetPT(ctx, tx, ptID)
    if pt.Member.UserID == nil || *pt.Member.UserID != userID { return ErrNotActor }
    if existing := s.txs.HasMirror(ctx, tx, userID, ptID); existing { return ErrAlreadyClaimed }

    // Build personal-mirror request, set source_project_transaction_id + project_id
    mirror, err := s.txs.CreateInTxWithSourcePT(ctx, tx, userID, transactionsRequest{
        AccountID: req.AccountID,
        Type: pt.Type, Amount: pt.Amount,
        CategoryID: req.CategoryID, // caller's category, may be nil
        Date: pt.Date, Note: req.NoteOr(pt.Note),
        ProjectID: pt.ProjectID,
        SourceProjectTransactionID: &ptID,
    })

    // Migrate splits: rewrite source_project_transaction_id → source_transaction_id
    if _, err := tx.Exec(ctx, `
        UPDATE shared_expense_splits
        SET source_transaction_id = $1, source_project_transaction_id = NULL,
            updated_by_user_id = $2
        WHERE source_project_transaction_id = $3
    `, mirror.ID, userID, ptID); err != nil { ... }

    return mirror, tx.Commit(ctx)
}
```

Public extensions on `transactions/`:

- [ ] `CreateInTxWithSourcePT(ctx, tx, userID, req)` — extends 1a's `CreateInTx` with `source_project_transaction_id` + auto-set `project_id`
- [ ] `HasMirror(ctx, tx, userID, ptID) bool` — claim deduplication

Shared-book read (`GET /v1/projects/:id/transactions`) is the UNION view from [`10-projects.md §2.1`](../../design/spec/10-projects.md). Implement as a single SQL query, paginate at the SQL level.

`my_resolution_status` per row computed inline (CASE expression in the SELECT) — not stored. See [`db.md §per-caller settlement`](db.md#per-caller-settlement-state--query-patterns).

### 1b.5 — Splits + personal_debts + wire contacts.absorb

Two new modules ship together because they're conceptually inseparable: every `pay` action needs to potentially auto-bump a `personal_debts` row.

Folders: `internal/modules/splits/`, `internal/modules/personal_debts/`.

#### Splits — endpoints per [`06-shared-expenses.md §3`](../../design/spec/06-shared-expenses.md):

- [ ] `GET    /v1/shared-expenses/splits` (filter: `direction`, `resolved`, `project_id`, `from`, `to`, pagination)
- [ ] `GET    /v1/shared-expenses/splits/:id` (with caller's personal entries + personal_debts)
- [ ] `POST   /v1/shared-expenses/splits/:id/pay` (debtor; creates personal expense + auto-bump + `split_paid` notification)
- [ ] `POST   /v1/shared-expenses/splits/:id/receive` (creditor; creates personal income + `split_received` notification)
- [ ] `POST   /v1/shared-expenses/splits/:id/add-as-debt` (debtor; creates `personal_debts` row)

Splits are NOT created via this module's POST endpoint — they're created as part of `POST /v1/transactions` or `POST /v1/projects/:id/project-transactions` (sub-array `splits`). This module owns the read + resolve endpoints.

Public exports:

- [ ] `splits.Service.Validator(ctx, userID, splitID) (*Split, error)` — injected into `transactions.Service` via `WithSplitValidator(...)` so transactions can validate `source_split_id` references caller's split (debtor or creditor) and resolve the parent's `project_id` for auto-derivation
- [ ] `splits.Service.AbsorbForContact(ctx, userID, contactID, names []string) (count int, err error)` — injected into `contacts.Service` via `WithSplitsAbsorber(...)`
- [ ] `splits.Service.RestoreOnContactDelete(ctx, tx, contactID) error` — injected via `WithSplitsRestorer(...)`; runs the `UPDATE shared_expense_splits SET person_name = COALESCE(...)` before contact row drops
- [ ] `splits.Service.CreateForTransactionTx(ctx, tx, parentID, splits []SplitInput, parentContext SplitContext) error` — called by `transactions.Service` and `project_transactions` Service when a parent is created with a `splits` array. Runs the parent-context gating (personal vs project; see overview risks).

Splits-migrate-on-claim is invoked by `projects.Service.Claim` (1b.4) — splits module just exposes the migrate helper:

- [ ] `splits.Service.MigrateOnClaimTx(ctx, tx, ptID, mirrorID, callerID) error` — single UPDATE; called from claim flow

Errors mapped: `NOT_DEBTOR`, `NOT_CREDITOR`, `INVALID_DEBTOR_FOR_CONTEXT`, `SPLITS_MISMATCH`, `SPLITS_ON_TRANSFER`, `OVERPAYMENT_PROTECTION` (Phase 2 only — 1b doesn't enforce on splits), `ALREADY_TRACKED` (already-have-personal-debt-for-this-split).

#### Personal_debts — endpoints per [`12-personal-debts.md §3`](../../design/spec/12-personal-debts.md):

- [ ] `GET    /v1/personal-debts/dashboard` — registered before `/:id`
- [ ] `GET    /v1/personal-debts` (filter: `status`, `creditor_contact_id`, `project_id`, `from`, `to`, pagination)
- [ ] `POST   /v1/personal-debts` (manual create; no source split)
- [ ] `GET    /v1/personal-debts/:id`
- [ ] `PUT    /v1/personal-debts/:id` (debt owner only)
- [ ] `DELETE /v1/personal-debts/:id`
- [ ] `POST   /v1/personal-debts/:id/cancel` (status='cancelled')
- [ ] `POST   /v1/personal-debts/:id/pay` (records personal expense + bumps paid_amount; rejects overpayment with `400 OVERPAYMENT`)

Public exports:

- [ ] `personal_debts.Service.AutoBumpInTx(ctx, tx, userID, sourceSplitID, deltaAmount) error` — injected into `transactions.Service` via `WithDebtAutoBumper(...)`. Runs the `UPDATE personal_debts SET paid_amount = LEAST(amount, paid_amount + delta) WHERE user_id=? AND source_split_id=?`. No-op if no matching row exists.
- [ ] `personal_debts.Service.CreateFromSplitTx(ctx, tx, userID, splitID) (*PersonalDebt, error)` — used by `splits.Service.AddAsDebt`; loads split, derives creditor from parent, inserts row.

The dashboard joins:

```sql
-- "I owe": open personal_debts
SELECT 'i_owe' AS direction, ... FROM personal_debts WHERE user_id=? AND status='open'

UNION ALL

-- "Owed to me": open splits where caller is creditor
SELECT 'owed_to_me' AS direction, ... FROM shared_expense_splits s
JOIN /* parent */ ON ...
WHERE /* caller is creditor of s */
  AND (s.owed_amount - COALESCE(/* sum caller's incomes with source_split_id */, 0)) > 0
```

Wire `contacts.absorb`: 1b.5 finishes implementing `contacts.Service.Absorb` by calling the injected `splits.Absorber` func. Same wiring pattern as 1a's `categories.WithTransactionCounter`.

### 1b.6 — Notification triggers wired

No new tables / modules; this is pure cross-module wiring. Each producer calls `notifications.Service.DispatchTx*` inside its action's tx.

| Trigger | Producer | When fired | Recipient | Notes |
|---|---|---|---|---|
| `split_created` | `splits.CreateForTransactionTx` (called from `transactions.Create` and `project_transactions.Create`) | After splits insert | Each linked debtor (resolved via `contact.linked_user_id` or `project_member.user_id`) | Suppress if creator's `auto_notify_linked_split_contacts = false` and no manual override |
| `split_paid` | `splits.Pay` (also `personal_debts.Pay` when `source_split_id` set) | After personal expense lands + auto-bump | Creditor (if linked) | |
| `split_received` | `splits.Receive` | After personal income lands | Debtor (if linked) | Closure signal |
| `project_tx_recorded_for_you` | `projects.CreateProjectTransaction` | After insert | The actor (if `transaction_member.user_id` is linked AND `≠ record_user_id`) | |
| `project_tx_changed` | `projects.UpdateProjectTransaction` / `DeleteProjectTransaction` | After update/delete | Every linked user with a personal entry referencing this PT (claim or split-resolve) or a `personal_debts` referencing one of its splits, MINUS the editor | One row per recipient (per-recipient model from spec §4.2) |
| `project_invite` | `projects.AddMember` (variants a + b) and `projects.RequestLink` | After member row creation OR re-fire | The linked-user-by-email (if found); silent void if not | Variant (a) with linked contact: informational ("you've been added"); variant (b) and re-fires: link-request semantics |
| `contact_link_request` | `contacts.RequestLink` | After endpoint call | The user matching `contact.email` (if found); silent void if not | New trigger for Phase 1b's notification-based contact linking |

Solo-project / self-target guard: every dispatch path checks "is the recipient the same user as the actor? skip silently". Implemented in `notifications.Service.DispatchTx` once.

Settings honored:
- `auto_notify_linked_split_contacts` — suppresses `split_created`
- `auto_resolve_own_in_projects` — purely client-side per spec §4.20; backend doesn't read it for notifications

---

## Cross-module wiring (main.go)

Pattern: each consumer module exposes a method matching a func type defined by the producer. main.go wires post-construction. Same as 1a's `categories.WithTransactionCounter`.

```go
// in main.go after stores constructed
contactsStore := contacts.NewStore(dbPool)
contactsService := contacts.NewService(contactsStore)
contactsHandler := contacts.NewHandler(contactsService)

notificationsStore := notifications.NewStore(dbPool)
notificationsService := notifications.NewService(notificationsStore)
notificationsHandler := notifications.NewHandler(notificationsService)

projectsStore := projects.NewStore(dbPool)
projectsService := projects.NewService(projectsStore, contactsService, transactionsService, notificationsService)
projectsHandler := projects.NewHandler(projectsService)

personalDebtsStore := personal_debts.NewStore(dbPool)
personalDebtsService := personal_debts.NewService(personalDebtsStore, transactionsService, notificationsService)
personalDebtsHandler := personal_debts.NewHandler(personalDebtsService)

splitsStore := splits.NewStore(dbPool)
splitsService := splits.NewService(splitsStore, transactionsService, contactsService, projectsService, notificationsService, personalDebtsService)
splitsHandler := splits.NewHandler(splitsService)

// post-construction wiring (breaks cycles)
transactionsService.WithSplitValidator(splitsService.Validator)
transactionsService.WithDebtAutoBumper(personalDebtsService.AutoBumpInTx)
transactionsService.WithNotificationDispatcher(notificationsService.DispatchTx)

contactsService.WithSplitsAbsorber(splitsService.AbsorbForContact)
contactsService.WithSplitsRestorer(splitsService.RestoreOnContactDelete)
contactsService.WithNotificationDispatcher(notificationsService.DispatchContactLinkRequest)

// extend the auth registration hook list
authService := auth.NewService(authStore, cfg,
    categoriesService.SeedForUser,
    notificationsService.SeedSettings, // new in 1b
)
```

Construction order:
1. Stores (parallel)
2. Standalone services (auth, users, categories, tags, accounts, contacts, notifications)
3. transactions service (already constructed in 1a)
4. projects service (needs contacts + transactions + notifications)
5. personal_debts service (needs transactions + notifications)
6. splits service (needs everything)
7. Wire callbacks
8. Construct auth service with extended hook list

If a service is constructed before all its dependencies are ready, it accepts `nil` for the post-wired callbacks and behaves as no-op (e.g., transactions before splits exists → `source_split_id` rejected with explicit error). Document this gracefully.

---

## Router wiring

New routes added under `/api/v1` protected group. Inside `cmd/api/main.go`:

```go
// Contacts (1b.1)
protected.POST   "/contacts"
protected.GET    "/contacts"
protected.GET    "/contacts/unlinked-names"   // before /:id to avoid collision
protected.GET    "/contacts/:id"
protected.PUT    "/contacts/:id"
protected.DELETE "/contacts/:id"
protected.POST   "/contacts/:id/absorb"
protected.POST   "/contacts/:id/request-link"
protected.POST   "/contacts/:id/unlink"
protected.POST   "/contacts/:id/archive"
protected.POST   "/contacts/:id/restore"
protected.POST   "/contacts/link-requests/:notification_id/accept"
protected.POST   "/contacts/link-requests/:notification_id/reject"

// Notifications (1b.2)
protected.GET    "/notifications"
protected.POST   "/notifications/read-all"     // before /:id/...
protected.POST   "/notifications/:id/read"
protected.POST   "/notifications/:id/actioned"
protected.POST   "/notifications/:id/dismiss"
protected.DELETE "/notifications/:id"
protected.GET    "/notifications/settings"
protected.PUT    "/notifications/settings"

// Projects (1b.3 + 1b.4)
protected.POST   "/projects"
protected.GET    "/projects"
protected.POST   "/projects/link-requests/:notification_id/accept"   // before /:id
protected.POST   "/projects/link-requests/:notification_id/reject"
protected.GET    "/projects/:id"
protected.PUT    "/projects/:id"
protected.DELETE "/projects/:id"
protected.GET    "/projects/:id/members"
protected.POST   "/projects/:id/members"
protected.PUT    "/projects/:id/members/:member_id"
protected.DELETE "/projects/:id/members/:member_id"
protected.POST   "/projects/:id/members/:member_id/request-link"
protected.POST   "/projects/:id/transfer-ownership"
protected.POST   "/projects/:id/leave"
protected.GET    "/projects/:id/transactions"
protected.POST   "/projects/:id/project-transactions"
protected.PUT    "/projects/:id/project-transactions/:pt_id"
protected.DELETE "/projects/:id/project-transactions/:pt_id"
protected.POST   "/projects/:id/project-transactions/:pt_id/claim"
protected.POST   "/projects/:id/resolve-all"
protected.GET    "/projects/:id/summary"

// Splits (1b.5)
protected.GET    "/shared-expenses/splits"
protected.GET    "/shared-expenses/splits/:id"
protected.POST   "/shared-expenses/splits/:id/pay"
protected.POST   "/shared-expenses/splits/:id/receive"
protected.POST   "/shared-expenses/splits/:id/add-as-debt"

// Personal debts (1b.5)
protected.GET    "/personal-debts/dashboard"   // before /:id
protected.GET    "/personal-debts"
protected.POST   "/personal-debts"
protected.GET    "/personal-debts/:id"
protected.PUT    "/personal-debts/:id"
protected.DELETE "/personal-debts/:id"
protected.POST   "/personal-debts/:id/cancel"
protected.POST   "/personal-debts/:id/pay"
```

Static-path-before-param-path is the same rule from 1a (`/transactions/summary` before `/transactions/:id`).

---

## transactions module extensions (1b.4 + 1b.5)

The 1a transactions module needs three additions in 1b. None of them break existing behavior:

1. **Stop rejecting `splits` array on `POST /v1/transactions`.** Replace `400 SPLITS_NOT_SUPPORTED_YET` with: validate gate (parent-context says "personal" → debtors must be `contact_id` / `person_name`; reject `project_member_id`). Then call `splits.Service.CreateForTransactionTx` inside the transaction creation tx.

2. **Stop rejecting `source_split_id` on resolve flows.** When the caller hits `POST /v1/shared-expenses/splits/:id/pay` (which lives in the splits package), the splits service calls `transactions.Service.CreateInTxWithSourceSplit(ctx, tx, userID, req)` — a new variant that accepts `source_split_id`, derives `project_id` from the split's parent's project, and additionally calls the injected `personal_debts.AutoBumpInTx`.

3. **Stop rejecting `project_id` derivation.** `project_id` is still NOT settable in the `POST /v1/transactions` request body — but `CreateInTxWithSourceSplit` and `CreateInTxWithSourcePT` (claim) both auto-derive and set it. Update the validator to allow `project_id` if and only if `source_split_id` or `source_project_transaction_id` is set internally (not from request).

The 1a CHECK constraint (`project_id IS NOT NULL ⇔ source set`) enforces this at the DB level; the new variants must set both consistently.

---

## Registration hooks

Phase 1a wired one hook (`categoriesService.SeedForUser`). Phase 1b adds a second:

```go
authService := auth.NewService(authStore, cfg,
    categoriesService.SeedForUser,        // 1a — 6 system + 28 starter cats
    notificationsService.SeedSettings,    // 1b — user_notification_settings row
)
```

The `auth.RegistrationHook` slice runs each in order inside the same tx. If any fails, the whole registration rolls back — same atomicity contract as 1a.

For pre-1b users (just one in dev), migration 000010 backfills the `user_notification_settings` row via `INSERT … ON CONFLICT DO NOTHING`.

---

## Tests

Match Phase 1a's depth — happy path + key edge cases + the critical correctness pieces.

- [ ] **Unit tests** — service-level validation rules per module
- [ ] **Integration: contacts hard-delete restores person_name.** Insert a split with `contact_id=X`, delete contact X, verify split's `person_name = nickname || display_name` and `contact_id IS NULL`.
- [ ] **Integration: claim atomicity (50 goroutines × concurrent claims on one PT).** Only 1 succeeds; other 49 hit `ALREADY_CLAIMED`. No duplicated splits, no duplicated mirrors.
- [ ] **Integration: auto-bump.** Create a split, add-as-debt, then pay (single tx). Verify `personal_debts.paid_amount` bumped, status flipped to `paid` if covered, no double-bump on idempotent retries.
- [ ] **Integration: per-caller settlement.** Two users: Bob debtor pays 500 toward 1000 split. Bob's view shows `outstanding=500`. Alice's view shows `outstanding=1000` until Alice records receipt of 500. Both correct, both consistent with their own books.
- [ ] **Integration: parent-context gating.**
   - Personal-context split request with `project_member_id` debtor → `400 INVALID_DEBTOR_FOR_CONTEXT`
   - Project-context split request with `contact_id` debtor → `400 INVALID_DEBTOR_FOR_CONTEXT`
   - Post-claim (on personal mirror) split request with `contact_id` debtor → same error
- [ ] **Integration: notification dispatched in-tx.** Force a downstream failure after dispatch insert; verify the notification row didn't land (rolled back).
- [ ] **Integration: link-request privacy (contacts).**
   - Run `POST /v1/contacts/:id/request-link` 100x with hit emails + 100x with miss emails
   - Response shape and status code identical
   - Average response time delta < 10ms (timing-attack mitigation: lookup runs in both branches)
   - DB inspection: 100 notification rows from hit branch, 0 from miss branch
- [ ] **Integration: link-request privacy (projects).** Same as above for `POST /v1/projects/:id/members` variant (b).
- [ ] **Integration: link-request accept flow.** Two users; A sends request to B's email; B's `GET /v1/notifications` shows the row; B's `POST /contacts/link-requests/:id/accept` populates `linked_user_id`; A's contact list refresh shows linked.
- [ ] **Integration: link-request reject flow.** B rejects; notification dismissed; A's contact stays unlinked; A can `request-link` again (new notification fires).
- [ ] **Integration: solo project — no notifications fire.** Create project with one linked member only; perform every action; verify zero notifications.
- [ ] **Smoke**: register → create accounts (1a) → A request-link to B's contact (B accepts) → B sees Alice's splits → A creates project → adds B (linked) and Grandma (ad-hoc) → B accepts project_invite → recorder ≠ actor flow → claim → pay/receive → dashboard joins both directions.

---

## Manual verification

- [ ] Migrations 8–16 apply cleanly via `docker compose run --rm migrate up`
- [ ] Fresh registration creates 34 categories + 1 user_notification_settings row
- [ ] Two users (A and B):
  - A creates contact "B" with email matching B's user
  - A's UI shows "Link request sent" on `request-link`
  - B's `/v1/notifications` lists the `contact_link_request` row
  - B accepts → A's contact "B" now shows `linked_user_id` populated
- [ ] Two users with non-existent email: A's UI still shows "Link request sent" (privacy preservation); B doesn't exist so no notification
- [ ] A creates a personal expense splitting with B; B sees the split in `/v1/shared-expenses/splits` with `direction=i_owe`
- [ ] B taps pay; A receives `split_paid` notification; A's `/v1/notifications` shows the row
- [ ] Project creation: A creates project, adds B (linked) — auto-active + informational `project_invite` — and Grandma (ad-hoc) — no notification; A records a project_transaction with B as actor + splits with Grandma; B receives `project_tx_recorded_for_you` notification; B claims; splits migrate (verify by querying splits' `source_*` columns)
- [ ] Project lifecycle: A sets project to `cancelled`; A tries to insert another project_transaction → `400 PROJECT_LOCKED`; A can still pay/receive open splits
- [ ] `GET /v1/personal-debts/dashboard` shows correct join across both directions
- [ ] All 1a smoke flows still pass (no regression on accounts, transactions, categories, tags)

---

## What you read

- [`../../design/spec/06-shared-expenses.md`](../../design/spec/06-shared-expenses.md) — splits, polymorphic FKs, per-caller settlement, splits-migrate-on-claim, resolve actions
- [`../../design/spec/07-contacts.md`](../../design/spec/07-contacts.md) — contacts CRUD, person_name lifecycle, **§3.7–3.8 invite flow superseded by notification-based link request — see [`overview.md`](overview.md)**
- [`../../design/spec/10-projects.md`](../../design/spec/10-projects.md) — 4 tables, 3 ledgers, claim flow, lifecycle rules, summary; **§3.3 invite flow superseded by notification-based link request**
- [`../../design/spec/12-personal-debts.md`](../../design/spec/12-personal-debts.md) — auto-close, manual edits, dashboard
- [`../../design/spec/13-notifications.md`](../../design/spec/13-notifications.md) — 6 spec triggers; **+ `contact_link_request` added in this plan**
- [`../phase1a/be.md`](../phase1a/be.md) — patterns (cross-module func injection, registration hooks, lock ordering)
- [`db.md`](db.md) — migration order + atomicity SQL

## What you don't need to read

- Spec module 11 (`scheduled_transactions` — Phase 1c)
- Spec modules 08–09 (`budgets`, `saving_goals` — Phase 1c)

---

## Done when

- [ ] All 5 modules built; 9 migrations applied; route table wired; `go test ./...` green
- [ ] All critical integration tests pass (contacts restore, claim atomicity, auto-bump, per-caller, gating, dispatch in-tx, link-request privacy, link-request accept/reject)
- [ ] Solo project test passes (no notifications)
- [ ] Registration produces 34 categories + 1 notification settings row
- [ ] All 7 notification triggers verified manually firing the right recipients (incl. `contact_link_request` and `project_invite` link-requests)
- [ ] No regression on 1a balance-cache concurrency test
- [ ] Cross-module wiring follows the 1a precedent (func injection in main.go after construction)
