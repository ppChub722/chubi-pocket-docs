# 10 — Projects

Shared-visibility containers for time-bounded collaborative financial tracking. Trips, freelance gigs, group events — anywhere multiple people need to see the same set of transactions to coordinate who spent what, who owes whom, and how to settle.

**Design principle — three ledgers, one shared view:**

- **Personal book** — `transactions` table, owned by each user. Reflects real money movement on the user's accounts. In project context, personal entries get `project_id` auto-set when they mirror from a project (via claim or split-resolve); bare personal transactions never carry `project_id`.
- **Project ledger** — `project_transactions` table, scoped to a project. Records spending/receiving by members who can't (or haven't yet) write to a personal book: ad-hoc members, contact members, or linked members who paid in cash and aren't in the app yet. No personal account is touched.
- **Shared book** — a view that UNIONs personal transactions tagged to the project + project_transactions, sorted. This is what every linked member sees.

Linked members write to their personal book by default. The project ledger is the escape hatch for actors without a personal book. A linked member can later **claim** their own project_transaction onto their personal book; when they do, any splits hanging off the project_transaction migrate to the personal mirror (same split IDs — non-destructive). The personal row becomes the canonical entry on the shared book.

**When to use a project vs. a tag:** projects are for collaboration and IOU tracking — even solo, when you need to coordinate with people who aren't on the app (ad-hoc members). If you just want to label your own transactions for reporting ("how much did I spend on the trip?"), use a tag instead — see [`05-categories-tags.md`](05-categories-tags.md). Projects do work solo (one-member project) but tags are lighter when no IOU coordination is needed.

This module owns `projects`, `project_members`, `project_invites`, `project_transactions`. It references `transactions.project_id`, `shared_expense_splits` (defined in [`06-shared-expenses.md`](06-shared-expenses.md), with polymorphic source — personal or project transaction), `personal_debts` (defined in [`12-personal-debts.md`](12-personal-debts.md)), and `notifications` (defined in [`13-notifications.md`](13-notifications.md)).

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 1b | Phase 2 | Phase 3 |
|---|---|---|---|
| Project CRUD | ✅ | ✅ | ✅ |
| Linked / contact / ad-hoc members | ✅ | ✅ | ✅ |
| Invite-based linking to app users | ✅ | ✅ | ✅ |
| Roles: owner / contributor / viewer | ✅ | ✅ | ✅ |
| Shared-visibility transaction view | ✅ | ✅ | ✅ |
| Project ledger for any actor (`project_transactions`) | ✅ | ✅ | ✅ |
| Claim a project_transaction onto personal book (linked actor) | ✅ | ✅ | ✅ |
| Splits migrate from project_transaction to personal mirror on claim | ✅ | ✅ | ✅ |
| Resolve splits via [`/shared-expenses/splits/...`](06-shared-expenses.md) (pay / receive / add-as-debt) | ✅ | ✅ | ✅ |
| Project Resolve-all (batch convenience) | ✅ | ✅ | ✅ |
| Member summary + "who owes whom" matrix | ✅ | ✅ | ✅ |
| Modal-on-save UX + auto-resolve user setting | ✅ | ✅ | ✅ |
| Ownership transfer | ✅ | ✅ | ✅ |
| Leave project | ✅ | ✅ | ✅ |
| Status: active / completed / cancelled / archived (with lifecycle rules) | ✅ | ✅ | ✅ |
| Solo project (single-member; no notifications fire) | ✅ | ✅ | ✅ |
| Export project report (PDF / CSV) | — | ✅ | ✅ |
| Project-level budget goal + alerts | — | ✅ | ✅ |
| Consent hardening on invite accept | — | — | ✅ |
| Admin project management | — | — | ✅ |

---

## 1. Schema

Tables owned by this module: `projects`, `project_members`, `project_invites`, `project_transactions`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#10--projects`](../database/schema.md#10--projects).

Three kinds of member share the `project_members` table:

- **Linked member** (`user_id IS NOT NULL`) — accepted an invite; has app access to the project
- **Contact member** (`contact_id IS NOT NULL`, `user_id IS NULL`) — from the owner's contact book; no app access
- **Ad-hoc member** (`user_id IS NULL AND contact_id IS NULL`) — typed name only; one-off participant

`project_transactions` is the canonical project ledger — every transaction recorded in a project context goes here, regardless of the actor's member type. No personal account is touched at insert; personal-book entries are derived via claim / pay / receive / add-as-debt.

**Polymorphic source on splits and resolutions** (cross-table, see [`06-shared-expenses.md`](06-shared-expenses.md) and [`04-transactions.md`](04-transactions.md) for the detailed rules):

- `shared_expense_splits.source_transaction_id` OR `source_project_transaction_id` — exactly one set
- `transactions.source_split_id` (split-resolve) OR `source_project_transaction_id` (claim) — at most one set; `project_id` auto-derived

---

## 2. Core concepts

### 2.1 Three ledgers, one shared view

**Personal book** — `transactions` table, owned by each user. Edits, deletes, balance impact — all private to that user. In project context, personal entries are derived from project actions (claim by the actor; pay/receive on a split).

**Project ledger** — `project_transactions` table, owned by the project. The canonical record of every transaction in the project. No personal account is touched at insert.

**Shared book** — a SQL view scoped to the project:

```sql
-- Project ledger rows, excluding any project_transaction that has been claimed by its actor
-- (post-claim, the actor's personal mirror is the canonical row; the project_transaction is hidden)
SELECT
  pt.id, pt.type, pt.amount, pt.currency, pt.date, pt.category_id, pt.note,
  pt.transaction_member_id AS member_id,
  pm.display_name,
  'project'                AS source_kind,
  pt.created_at
FROM project_transactions pt
JOIN project_members pm ON pm.id = pt.transaction_member_id
WHERE pt.project_id = :project_id
  AND NOT EXISTS (
    SELECT 1 FROM transactions claim
    WHERE claim.source_project_transaction_id = pt.id
      AND claim.user_id = pm.user_id
  )

UNION ALL

-- Personal mirrors (claims) — show as canonical when they exist
SELECT
  t.id, t.type, t.amount, t.currency, t.date, t.category_id, t.note,
  pm.id                   AS member_id,
  pm.display_name,
  'personal_claim'        AS source_kind,
  t.created_at
FROM transactions t
JOIN project_members pm
  ON pm.project_id = t.project_id AND pm.user_id = t.user_id
WHERE t.project_id = :project_id
  AND t.source_project_transaction_id IS NOT NULL
  -- Excludes per-split resolves (pay/receive); those don't appear as separate shared-book rows,
  -- their settlement context is derived from source_split_id and rendered inline on the parent row

ORDER BY date DESC, created_at DESC;
```

Every project member with app access (linked) can read the shared book. Contacts and ad-hoc members have no app access.

**Per-split resolves don't appear as separate shared-book rows.** When Bob pays his ฿1,000 split, his personal expense has `source_split_id` set (not `source_project_transaction_id`). The shared book renders it inline with the parent project_transaction row's settlement state (per-caller), not as a standalone item.

**Post-claim deduplication:** when a linked actor claims their own project_transaction, the personal mirror becomes the canonical row on the shared book; the project_transaction is hidden by the `NOT EXISTS` clause to avoid double-counting. Splits migrate to the personal mirror at claim time (see §4.19).

### 2.2 Roles

| Role | Create personal tx in project | Record project_tx | Edit own personal tx | Edit project_tx they recorded | View shared book | Add/remove members | Delete project |
|---|---|---|---|---|---|---|---|
| **Owner** | ✅ | ✅ | ✅ | ✅ (own + any) | ✅ | ✅ | ✅ |
| **Contributor** | ✅ | ✅ | ✅ (own only) | ✅ (own only) | ✅ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | n/a | n/a | ✅ | ❌ | ❌ |

- Non-creators can **never edit** someone else's personal transaction (Phase 1 rule).
- Only the personal transaction creator can add/edit/remove splits on their transaction.
- Project_transactions can be edited/deleted by `record_user_id` or the project owner.
- Phase 2+ may add a "suggest edit" proposal workflow.

### 2.3 Resolve actions — the money flow

The shared book shows real-world money events. Each member processes items that affect them by creating personal-book entries. Under the unified model:

- **No global settlement state.** No `paid_amount` / `is_settled` / `split_settlements` table — settlement is per-caller computed (see [`06-shared-expenses.md`](06-shared-expenses.md) §2.3).
- **No two-sided handshake.** Pay and receive are independent personal-book actions; either side can act without the other.
- **Multiple resolves allowed.** A caller can pay/receive a split as many times as they want — each call creates an additional personal entry.

Two kinds of action exist:

**Split-rooted actions** — pay / receive / add-as-debt on a `shared_expense_splits` row. Endpoints live on the splits router (`POST /v1/shared-expenses/splits/:id/pay` etc., documented in [`06-shared-expenses.md`](06-shared-expenses.md) §3). They work uniformly regardless of whether the split's parent is a personal `transactions` row or a `project_transactions` row.

**Claim** — linked actor mirrors their own project_transaction onto their personal book. Lives on the project router (§3.7 below). Splits **migrate** to the personal mirror at claim time — same split IDs, parent FK rewritten. Anything that already references those splits (`personal_debts.source_split_id`, other members' personal entries via `source_split_id`) keeps working transparently.

**Modal-on-save UX:** when a member records a project_transaction in which they're involved (as actor and/or splittee), the client shows a follow-up modal:

- If recorder is the actor → "Add ฿X to your account?" (account picker) → on yes, fires Resolve / claim
- If recorder is a splittee → "Pay now or add as debt?" → on yes, fires the appropriate split-rooted action
- Settings (`auto_resolve_own_in_projects`, `default_account_id` — see [`13-notifications.md`](13-notifications.md) §1.2) skip the modal and act silently

**Solo project edge:** a project with only one linked member never fires notifications (no other linked users to notify). All other mechanics work identically.

### 2.4 Project Resolve-all (batch)

`POST /v1/projects/:id/resolve-all` — single endpoint that processes all of the caller's outstanding items in one request: every split they're involved in (debtor or creditor) where they haven't yet recorded a personal entry, plus the actor-claim if they have an unclaimed project_transaction. Default account used unless specified per-action.

Convenience layer over the per-split endpoints; no new mechanics.

### 2.5 Member types and split referencing

When a project_transaction has splits, each split references a `project_member_id` — the same member structure that supports linked, contact, and ad-hoc members uniformly. After the actor claims, the splits migrate to the actor's personal mirror but keep their `project_member_id` debtors (the migration only rewrites the parent FK, not the split's identity).

Personal transactions in **personal context** (no project) cannot use `project_member_id` debtors — they use `contact_id` or `person_name` only. To split with project members, create a `project_transaction` instead. See [`06-shared-expenses.md`](06-shared-expenses.md) §2.1 and §4.5 for the rule.

When a contact-type member later links (contact becomes an app user), the `project_members.user_id` fills in — the `member_id` stays the same, so no splits need updating. If that newly-linked member has prior project_transactions where they were the `transaction_member_id`, they can now claim those onto their personal book; splits migrate at claim time.

Splits' polymorphic source (`source_transaction_id` OR `source_project_transaction_id`, exactly one set) lets them hang off either ledger uniformly. See [`06-shared-expenses.md`](06-shared-expenses.md) §1.1.

---

## 3. API

All endpoints require authentication unless otherwise stated. Paths rooted at `/api`.

### 3.1 Projects CRUD

#### `POST /v1/projects`

Create a project. Creator becomes the owner (auto-creates an `owner` `project_members` row).

**Request body:**

```json
{
  "name": "Japan Trip 2026",
  "type": "trip",
  "description": "Tokyo + Osaka, 2 weeks",
  "start_date": "2026-05-01",
  "end_date": "2026-05-14"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | 1–100 chars |
| `type` | string | — | `'trip'` / `'sales'` / `'freelance'` / `'other'` / null |
| `description` | string | — | |
| `start_date` | date | — | |
| `end_date` | date | — | Must be ≥ `start_date` if both set |

**Success — `201 Created`:** the project + the creator's member row.

#### `GET /v1/projects`

List projects the caller is a member of.

**Query parameters:**

| Name | Description |
|---|---|
| `status` | Filter (`active` default, `all`, or specific value) |
| `type` | Filter by type |

**Response:**

```json
{
  "data": [
    {
      "id": "0190e5...",
      "name": "Japan Trip 2026",
      "type": "trip",
      "status": "active",
      "start_date": "2026-05-01",
      "end_date": "2026-05-14",
      "my_role": "owner",
      "member_count": 3,
      "transaction_count": 18,
      "my_outstanding_balance": -250.00,
      "updated_at": "..."
    }
  ]
}
```

`my_outstanding_balance` = (what others owe me) − (what I owe others) from the caller's perspective in this project.

#### `GET /v1/projects/:id`

Get a single project with member list and summary.

**Response:**

```json
{
  "id": "0190e5...",
  "name": "Japan Trip 2026",
  "type": "trip",
  "status": "active",
  "start_date": "2026-05-01",
  "end_date": "2026-05-14",
  "description": "...",
  "owner": {
    "member_id": "0190e5-owner...",
    "user_id": "0190e5-alice...",
    "display_name": "Alice"
  },
  "my_role": "owner",
  "member_count": 3,
  "members": [
    {
      "id": "0190e5-m1",
      "user_id": "0190e5-alice",
      "contact_id": null,
      "display_name": "Alice",
      "role": "owner",
      "status": "active",
      "joined_at": "..."
    },
    {
      "id": "0190e5-m2",
      "user_id": "0190e5-bob",
      "contact_id": "0190e5-contact-bob",
      "display_name": "Bob",
      "role": "contributor",
      "status": "active",
      "joined_at": "..."
    },
    {
      "id": "0190e5-m3",
      "user_id": null,
      "contact_id": null,
      "display_name": "Grandma",
      "role": "contributor",
      "status": "active",
      "joined_at": null
    }
  ],
  "summary": {
    "transaction_count": 18,
    "total_spent_by_me": 8500.00,
    "my_outstanding_balance": -250.00
  },
  "created_at": "...",
  "updated_at": "..."
}
```

**Errors:** `401`, `403` (not a member), `404`.

#### `PUT /v1/projects/:id`

Update project metadata. Owner only.

**Editable:** `name`, `type`, `description`, `start_date`, `end_date`, `status`.

**Status transitions:**

- `active → completed` / `active → cancelled` — always allowed
- `completed → active` / `cancelled → active` — allowed (revive)
- `any → archived` — soft-hide; transactions remain visible in members' personal apps
- `archived → active` — restore

**Lifecycle rules — what each status allows:**

| Status | New project_transactions | Edit existing project_transactions | Resolve actions (pay/receive/add-as-debt/claim) | Member CRUD |
|---|---|---|---|---|
| `active` | ✅ | ✅ | ✅ | ✅ |
| `completed` | ❌ `PROJECT_NOT_ACTIVE` | ✅ (corrections still allowed) | ✅ (members may still be settling up after the trip ends) | owner-only edits; no add |
| `cancelled` | ❌ | ❌ `PROJECT_LOCKED` | ✅ (settle outstanding obligations) | owner-only |
| `archived` | ❌ | ❌ `PROJECT_LOCKED` | ❌ `PROJECT_LOCKED` (fully read-only; restore to `active` first) | none |

The personal-book entries members already created (with `project_id` set) remain visible in their personal app regardless of project status — that's their book.

**Errors:** `400 VALIDATION_ERROR`, `401`, `403 NOT_OWNER`, `404`.

#### `DELETE /v1/projects/:id`

Delete a project. Owner only.

**Backend flow:**

1. Check: caller is owner
2. Check: any transactions tagged `project_id = :id`?
   - **Yes** → `400 PROJECT_HAS_TRANSACTIONS`. Suggest setting status to `cancelled` or `archived`.
   - **No** → hard delete (cascades to `project_members`, `project_invites`)

Projects with transaction history are not hard-deletable — preserves audit. Archive instead.

**Errors:** `400 PROJECT_HAS_TRANSACTIONS`, `401`, `403 NOT_OWNER`, `404`.

### 3.2 Members

#### `GET /v1/projects/:id/members`

List members. Same shape as the `members` array in `GET /v1/projects/:id`.

#### `POST /v1/projects/:id/members`

Add a member. Owner only.

**Request body (three variants):**

**(a) From a contact** (linked contact auto-invites):

```json
{ "contact_id": "0190e5-contact-bob", "role": "contributor" }
```

Backend:
1. Resolve contact from owner's contact book
2. If contact has `app_user_id` set → create `project_members` row with `contact_id` + `user_id` (same as contact's app_user_id), auto-generate invite (user must accept to activate)
3. If contact has no `app_user_id` → create `project_members` row with `contact_id` only; `user_id = NULL`; status = `active` immediately (contact member; no app access anyway)

**(b) Direct invite** (no contact):

```json
{ "display_name": "Carol", "role": "contributor" }
```

Creates a `project_members` row with `user_id = NULL`, `contact_id = NULL`, `display_name` = provided. Returns an invite code for the owner to share. On accept, `user_id` is populated.

Contact auto-creation: per your design, adding someone via direct invite does **not** auto-add them to the owner's contact book. Owner can manually add from the member list later.

**(c) Ad-hoc** (no contact, no invite):

```json
{ "display_name": "Grandma", "role": "contributor", "ad_hoc": true }
```

Creates `project_members` row with both `user_id` and `contact_id` NULL. No invite. Status = `active` immediately. Grandma can't log in; her involvement is tracked via splits.

**Success — `201 Created`:**

```json
{
  "member": { ...new row... },
  "invite": {  // only for variants (a)+(linked) and (b)
    "invite_code": "K3F8R4M7",
    "expires_at": "2026-05-02T10:00:00Z",
    "shareable_url": "https://chubipocket.com/invite-project/K3F8R4M7"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `400 USER_ALREADY_MEMBER`, `401`, `403 NOT_OWNER`, `404`.

#### `PUT /v1/projects/:id/members/:member_id`

Update a member's role. Owner only.

```json
{ "role": "viewer" }
```

Cannot change to/from `owner` via this endpoint — use ownership transfer (§3.4). Cannot self-demote below your current level.

#### `DELETE /v1/projects/:id/members/:member_id`

Remove a member. Owner only (or member removes themselves via `POST /v1/projects/:id/leave`).

**Backend flow:**

1. Check permissions
2. Set `status = 'left'`, `left_at = NOW()` — **soft-remove**
3. Row kept for historical reference; splits referencing this `member_id` stay valid

**Soft-remove rationale:** project history preserved. Removed member's past splits remain correctly attributed.

Hard deletion of member rows is not supported in Phase 1 (would break split references).

**Cannot remove owner.** Owner must transfer ownership first.

**Errors:** `400 CANNOT_REMOVE_OWNER`, `401`, `403 NOT_OWNER`, `404`.

### 3.3 Invites

#### `POST /v1/projects/:id/members/:member_id/invite`

Generate a new invite code for an existing pending member row. Invalidates any previously live invite for the same member.

**Success — `200 OK`:**

```json
{
  "invite_code": "K3F8R4M7",
  "expires_at": "2026-05-02T10:00:00Z",
  "shareable_url": "https://chubipocket.com/invite-project/K3F8R4M7"
}
```

**Errors:** `400 ALREADY_LINKED` (member already has `user_id`), `401`, `403`, `404`.

#### `POST /v1/projects/accept-invite`

Called by the invited app user. Accepts a project invite code.

**Request body:**

```json
{ "invite_code": "K3F8R4M7" }
```

**Backend flow:**

1. Look up invite; check not expired, not already accepted
2. Fetch the `project_members` row + the project
3. Check caller is not already a member of the project
4. Check caller is not trying to accept their own invite (safety)
5. Set `project_members.user_id = caller`, `status = 'active'`, `joined_at = NOW()`
6. Set `invite.accepted_at`, `invite.accepted_by_user_id`

**Success — `200 OK`:**

```json
{
  "message": "Joined project",
  "project_id": "0190e5-japan",
  "project_name": "Japan Trip 2026",
  "my_role": "contributor"
}
```

**Errors:** `400 INVALID_INVITE`, `400 INVITE_EXPIRED`, `400 INVITE_ALREADY_USED`, `400 ALREADY_MEMBER`, `400 CANNOT_ACCEPT_OWN_INVITE`.

#### `DELETE /v1/projects/:id/invites/:invite_id`

Cancel a pending invite. Owner only.

### 3.4 Ownership transfer

#### `POST /v1/projects/:id/transfer-ownership`

Transfer ownership to another linked member. Current owner only.

**Request body:**

```json
{ "new_owner_member_id": "0190e5-m2" }
```

**Backend flow:**

1. Check caller = current owner
2. Check `new_owner_member_id` exists, belongs to this project, is `status = active`, has `user_id IS NOT NULL`
3. Previous owner row: `role = 'contributor'`
4. Target row: `role = 'owner'`
5. `projects.owner_user_id = new owner's user_id`

**Constraint:** new owner must be a linked app user (contacts and ad-hoc can't be owners — they can't log in to manage).

**Success — `200 OK`:** the updated project.

**Errors:** `400 NOT_LINKED_MEMBER`, `401`, `403 NOT_OWNER`, `404`.

### 3.5 Leave

#### `POST /v1/projects/:id/leave`

Self-remove. Any active member except the owner.

**Backend flow:**

1. Check caller is an active member
2. If caller is owner → `400 OWNER_CANNOT_LEAVE` (must transfer first)
3. Set `status = 'left'`, `left_at = NOW()` (soft-remove)

**Success — `200 OK`:** `{ "message": "Left project" }`.

### 3.6 Shared book — transactions view

#### `GET /v1/projects/:id/transactions`

List transactions visible in the shared book — the UNION of `project_transactions` for this project + personal mirrors created via claim (`source_project_transaction_id` set). Per-split resolves (`source_split_id` only) don't surface as separate shared-book rows — their settlement context is rendered inline on the parent project_transaction row's per-caller status. Project_transactions that have already been claimed by their actor are filtered out (the personal claim row is canonical).

**Query parameters:**

| Name | Description |
|---|---|
| `type` | Filter by type (`expense`, `income`, `transfer_out`, `transfer_in`) |
| `from`, `to` | Date range |
| `member_id` | Filter by `transaction_member_id` (whose transaction it is, regardless of source ledger) |
| `source_kind` | `personal` \| `project` — filter by ledger of origin |
| `has_splits` | `true` \| `false` — transactions that have splits |
| `page`, `per_page` | Standard pagination |

**Response:**

```json
{
  "data": [
    {
      "id": "0190e5-tx1",
      "source_kind": "personal",
      "type": "expense",
      "amount": 3000.00,
      "currency": "THB",
      "date": "2026-05-05",
      "transaction_member": {
        "member_id": "0190e5-m1",
        "display_name": "Alice"
      },
      "recorded_by": {
        "user_id": "0190e5-alice",
        "display_name": "Alice"
      },
      "account": { "id": "...", "name": "KBank" },
      "category": { "id": "...", "name": "Food > Restaurants" },
      "note": "Dinner",
      "has_splits": true,
      "splits": [
        {
          "id": "0190e5-split1",
          "member": { "id": "0190e5-m1", "display_name": "Alice" },
          "owed_amount": 1000.00,
          "paid_amount": 1000.00,
          "is_settled": true
        },
        {
          "id": "0190e5-split2",
          "member": { "id": "0190e5-m2", "display_name": "Bob" },
          "owed_amount": 1000.00,
          "paid_amount": 0,
          "is_settled": false
        }
      ],
      "my_resolution_status": "unresolved",
      "created_at": "..."
    },
    {
      "id": "0190e5-pt1",
      "source_kind": "project",
      "type": "expense",
      "amount": 3000.00,
      "currency": "THB",
      "date": "2026-05-05",
      "transaction_member": {
        "member_id": "0190e5-m3",
        "display_name": "Grandma"
      },
      "recorded_by": {
        "user_id": "0190e5-alice",
        "display_name": "Alice"
      },
      "account": null,
      "category": null,
      "note": "Grandma fronted dinner",
      "has_splits": true,
      "splits": [ /* same shape; reference source_project_transaction_id internally */ ],
      "my_resolution_status": "unresolved",
      "created_at": "..."
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 18, "total_pages": 1 }
}
```

Field notes:

- `source_kind` — `'personal'` (from `transactions`) or `'project'` (from `project_transactions`). Tells the client which resolve flows are applicable.
- `transaction_member` — whose transaction it is. Replaces the v0.1 `created_by` field; works uniformly for both ledgers (personal: derived from `user_id` → member; project: from `transaction_member_id`).
- `recorded_by` — who typed the row in. For personal rows this equals the actor; for project rows it's the linked recorder (may differ from the actor).
- `account`, `category` — null for project_transactions (no personal-account hit; categorization is Phase 1b-nullable).

`my_resolution_status` per caller:

- `not_applicable` — caller is not involved (not payer, not in splits, not receiver of a settlement, not the actor of a project_transaction).
- `unresolved` — caller has an action to take:
  - on a personal-source row: pay/add-debt (debtor) or receive (creditor)
  - on a project-source row: pay/add-debt (debtor in splits) or **claim** (when caller is the actor and the project_transaction hasn't yet been claimed)
- `resolved` — caller has already resolved (a personal transaction with `source_transaction_id = this.id` OR `source_project_transaction_id = this.id` exists on caller's side).

Viewers and contacts with no app access don't hit this endpoint at all (no app).

### 3.6a Project transactions CRUD

Endpoints for the project ledger directly. The shared-book read in §3.6 already includes project_transactions; these endpoints are for create / edit / delete of the underlying rows.

#### `POST /v1/projects/:id/project-transactions`

Record a project_transaction. Owner or contributor. Project status must be `active`.

**Request body:**

```json
{
  "transaction_member_id": "0190e5-grandma",
  "type": "expense",
  "amount": 3000.00,
  "currency": "THB",
  "date": "2026-05-05",
  "category_id": null,
  "note": "Grandma fronted dinner",
  "splits": [
    { "project_member_id": "0190e5-alice", "owed_amount": 1000.00 },
    { "project_member_id": "0190e5-bob",   "owed_amount": 1000.00 }
  ]
}
```

| Field | Required | Rules |
|---|---|---|
| `transaction_member_id` | ✅ | Must be an active member of this project. May be linked, contact, or ad-hoc. |
| `type` | ✅ | `'expense'` \| `'income'` |
| `amount` | ✅ | > 0 |
| `currency` | ✅ | ISO 4217 |
| `date` | ✅ | |
| `category_id` | — | Nullable (Phase 1b); if set, must belong to the recorder |
| `note` | — | |
| `splits` | — | Optional. Each entry: `{ project_member_id, owed_amount }`. The actor's own share is implicit (not in splits); sum of split `owed_amount` must be ≤ `amount`. |

**Backend:**

1. Check caller is owner or contributor of an `active` project
2. Validate `transaction_member_id` belongs to the project and is `status = 'active'`
3. Insert `project_transactions` row with `record_user_id = caller`
4. If splits provided, insert `shared_expense_splits` rows with `source_project_transaction_id = <new row's id>` (and `source_transaction_id = NULL`)
5. For each split with a debtor whose `project_member.user_id` is set (linked debtor) AND not equal to `caller`, fire `split_created` notification (per recorder's `auto_notify_linked_split_contacts` setting — see [`13-notifications.md`](13-notifications.md))
6. If `transaction_member_id`'s `user_id` is set AND not equal to `caller`, fire `project_tx_recorded_for_you` notification to the actor

**Modal-on-save UX (client side):** after a successful save, the client checks "is the recorder involved in this row?" and may show:

- If recorder is the actor → modal "Add ฿X to your account?" → on yes, calls Resolve / claim (§3.7)
- If recorder is a splittee → modal "You owe ฿X — pay now or add as debt?" → on yes, calls `POST /v1/shared-expenses/splits/:id/{pay,add-as-debt}`

If the recorder's `auto_resolve_own_in_projects` setting is on (with a `default_account_id`), the modal is skipped and the action fires silently.

**Success — `201 Created`:** the created project_transaction with splits.

**Errors:** `400 VALIDATION_ERROR`, `400 SPLITS_EXCEED_AMOUNT`, `400 MEMBER_NOT_IN_PROJECT`, `400 PROJECT_NOT_ACTIVE`, `401`, `403 NOT_CONTRIBUTOR`, `404`.

#### `PUT /v1/projects/:id/project-transactions/:pt_id`

Update fields. `record_user_id` OR project owner only. Project must allow edits per its lifecycle status (active and completed both allow; cancelled/archived do not).

**Editable:** `transaction_member_id`, `type`, `amount`, `currency`, `date`, `category_id`, `note`, `splits`.

**No edit-after-resolve guard.** Under the unified model, settlement state is per-caller computed and personal entries are independent of the project_transaction. Edits cause graceful drift between the project ledger and others' personal mirrors — that's documented behavior, not a data-integrity issue. Affected users get a `project_tx_changed` notification (see [`13-notifications.md`](13-notifications.md)) so they can update their personal book if they want.

**Errors:** `400 VALIDATION_ERROR`, `400 PROJECT_LOCKED` (cancelled/archived), `401`, `403 NOT_RECORDER_OR_OWNER`, `404`.

#### `DELETE /v1/projects/:id/project-transactions/:pt_id`

`record_user_id` OR project owner only. Hard delete cascades to splits. Affected users get `project_tx_changed` (`change_kind=deleted`).

Personal entries that referenced the deleted splits via `source_split_id` keep their data but lose the FK link (cascaded SET NULL on splits' parent → split deleted → personal_debts.source_split_id set to NULL per [`12-personal-debts.md`](12-personal-debts.md) §4.6).

**Errors:** `400 PROJECT_LOCKED` (cancelled/archived), `401`, `403 NOT_RECORDER_OR_OWNER`, `404`.

### 3.7 Resolve actions

Under the unified model, **split-rooted resolve actions** (pay / receive / add-as-debt) live on the splits router and work uniformly regardless of whether the parent is a personal `transactions` row or a `project_transactions` row:

- `POST /v1/shared-expenses/splits/:id/pay` — see [`06-shared-expenses.md`](06-shared-expenses.md) §3.3
- `POST /v1/shared-expenses/splits/:id/receive` — see [`06-shared-expenses.md`](06-shared-expenses.md) §3.4
- `POST /v1/shared-expenses/splits/:id/add-as-debt` — see [`06-shared-expenses.md`](06-shared-expenses.md) §3.5

The project router exposes only the **claim** endpoint (no split involvement) and a **batch resolve-all** convenience.

#### `POST /v1/projects/:id/project-transactions/:pt_id/claim`

The actor of a project_transaction mirrors it onto their personal book. Only the linked user whose `user_id` equals the `transaction_member.user_id` may call.

**Request body:**

```json
{
  "account_id": "0190e5-bob-kbank",
  "category_id": null,
  "date": "2026-05-05",
  "note": "(optional override)"
}
```

| Field | Required | Rules |
|---|---|---|
| `account_id` | ✅ | Must belong to caller |
| `category_id` | — | Caller's category, optional |
| `date` | — | Defaults to source's `date` |
| `note` | — | Defaults to source's `note` |

**Backend (atomic):**

1. Load `project_transaction` (`pt_id`); check `project_id = :id`
2. Resolve `transaction_member_id` → `project_members.user_id`; reject `400 NOT_ACTOR` if it doesn't equal caller, or `400 ACTOR_NOT_LINKED` if `user_id IS NULL`
3. Reject `400 ALREADY_CLAIMED` if a personal `transactions` row with `source_project_transaction_id = pt_id` from caller already exists
4. Insert caller's personal transaction: same `type` / `amount` / `currency`, source's `date` / `note` unless overridden, `project_id` set, caller's `account_id` and `category_id`, `source_project_transaction_id = pt_id`
5. **Migrate splits** — `UPDATE shared_expense_splits SET source_transaction_id = <new tx id>, source_project_transaction_id = NULL WHERE source_project_transaction_id = pt_id`. Same split IDs; references via `source_split_id` from any personal entries or personal_debts continue to work transparently.
6. `accounts.balance −= amount` (for `type = expense`) or `+= amount` (for `type = income`)

**Success — `201 Created`:** the created personal transaction.

**Errors:** `400 NOT_ACTOR`, `400 ACTOR_NOT_LINKED`, `400 ALREADY_CLAIMED`, `400 PROJECT_LOCKED` (cancelled/archived), `401`, `403`, `404`.

#### `POST /v1/projects/:id/resolve-all`

Batch convenience: process all of the caller's outstanding items in one request.

**Request body:**

```json
{
  "default_account_id": "0190e5-kbank",
  "actions": [
    { "type": "pay",          "split_id": "..." },
    { "type": "receive",      "split_id": "..." },
    { "type": "add-as-debt",  "split_id": "..." },
    { "type": "claim",        "project_transaction_id": "..." }
  ]
}
```

If `actions` is omitted, backend auto-processes all unresolved items the caller is involved in (any split where they're debtor or creditor without a matching personal entry, plus any unclaimed project_transaction where they're the actor). Monetary actions use `default_account_id`. Dates default to source dates.

**Backend:** iterates and delegates to per-action endpoints (per-split pay/receive/add-as-debt or claim). All-or-nothing transaction; first failure rolls back.

**Success — `200 OK`:**

```json
{
  "processed_count": 5,
  "created_transaction_ids": [...],
  "created_debt_ids": [...],
  "claimed_pt_ids": [...],
  "skipped": [{ "reason": "already_resolved", "item_id": "..." }]
}
```

**Errors:** `400 VALIDATION_ERROR` (any sub-action failed), `401`, `403`, `404`.

### 3.8 Summary / report

#### `GET /v1/projects/:id/summary`

Aggregate view for the caller. Includes member balances and the "who owes whom" matrix.

**Response:**

```json
{
  "project_id": "...",
  "period": { "from": "2026-05-01", "to": "2026-05-14" },
  "total_transactions": 18,
  "total_spent_currency": "THB",
  
  "my_position": {
    "total_spent": 3000.00,
    "my_share": 1000.00,
    "owed_to_me": 2000.00,
    "i_owe": 0.00,
    "net_balance": 2000.00
  },
  
  "member_balances": [
    {
      "member_id": "0190e5-m1",
      "display_name": "Alice",
      "total_spent": 3000.00,
      "my_share": 1000.00,
      "net_balance": 2000.00
    },
    {
      "member_id": "0190e5-m2",
      "display_name": "Bob",
      "total_spent": 0,
      "my_share": 1000.00,
      "net_balance": -1000.00
    },
    {
      "member_id": "0190e5-m3",
      "display_name": "Grandma",
      "total_spent": 0,
      "my_share": 1000.00,
      "net_balance": -1000.00
    }
  ],
  
  "debt_matrix": [
    { "debtor_member_id": "0190e5-m2", "creditor_member_id": "0190e5-m1", "outstanding": 1000.00 },
    { "debtor_member_id": "0190e5-m3", "creditor_member_id": "0190e5-m1", "outstanding": 1000.00 }
  ],
  
  "my_unresolved_count": 0
}
```

Pure computation from existing tables — no separate storage.

---

## 4. Design decisions

### 4.1 `project_transactions` is the canonical project ledger

Every transaction recorded in a project context goes into `project_transactions` — regardless of whether the actor is linked, contact, or ad-hoc. The project ledger is the source of truth for the project's spending; personal-book entries are derived (claim, pay, receive, add-as-debt).

This was a v0.3 unification. The earlier model (v0.2) treated `project_transactions` as a carve-out only for non-personal-book actors and let linked actors write to their personal `transactions` directly. That created two parallel "in-project" representations and a polymorphic split source spanning both. The unified model keeps splits' polymorphic source FK (because personal-context splits with no project still need a personal-tx parent), but in project context the parent is always a `project_transaction`.

Why unify:

- **Single mental model** — "in a project, the project ledger holds the truth; my personal book is my choice." No more "is this a personal-tx-tagged-with-project or a project_transaction?" ambiguity.
- **Privacy + control** — the actor decides if/when to put a project expense onto their personal book via claim. They might not want every group dinner cluttering their personal expense report.
- **Recorder ≠ actor as a first-class case** — Alice can record on Bob's behalf when Bob is offline (was the v0.2 special case; now it's just normal).
- **Editing decoupled** — the project ledger can be corrected by the recorder/owner without disturbing anyone's personal book; personal-book edits don't touch the project record.

For the actor's own personal-book impact, a **claim** action mirrors the project_transaction onto their personal book at their discretion (with splits migrating — see §4.19).

Rejected alternative: keeping linked actors' project expenses on their personal book by default with auto-tagging by project_id. That makes the personal book the canonical project record, breaking privacy/control and forcing editors to navigate to others' personal books to fix project-level corrections.

### 4.2 Three ledgers, all independent

Three places transactions can live:

- **Personal book** — `transactions`, owned by each user. Free-form edits. No one else can touch it.
- **Project ledger** — `project_transactions`, owned by the project. Recorder + owner edit. Source of truth for the project's spending.
- **Shared book** — a UNION view across both, scoped to a project. The view that members see when they open the project.

Splits live on either parent (polymorphic source FK). Personal_debts live on the debtor's side, optionally referencing a split.

Settlement happens IRL; each user records it on their own book when they see/confirm it. Per-caller computed status surfaces mismatches without forcing reconciliation. See §4.10.

### 4.3 Three member types in one table

`project_members` supports linked, contact, and ad-hoc members uniformly via nullable `user_id` and `contact_id`. Splits reference `project_member_id` (never directly to user or contact) so the member-type question is invisible to splits.

When a contact links to an app user, `user_id` fills in on the existing row — splits require no update.

### 4.4 Invite-only linking

Same philosophy as contacts. No username/email search. Owner generates an 8-char code, shares out-of-band, target accepts. Privacy by design.

Phase 3 hardens this with explicit consent screens, rate limiting, and audit logs.

### 4.5 Owner-only administrative actions

Adding/removing members, ownership transfer, project deletion are all owner-only. Contributors and viewers can only act on their own data (create their own transactions, leave the project, resolve their own items).

Phase 2+ may introduce fine-grained permissions (e.g., "co-owner" or "admin" role).

### 4.6 Ownership transfer in Phase 1

Real groups need handoffs (original organizer leaves, another takes over). Implemented as a single endpoint: demote previous owner to `contributor`, promote target to `owner`. Target must be a linked app user (non-linked members can't manage).

### 4.7 Soft-remove on leave or remove

`project_members.status = 'left'` with `left_at` timestamp. Row kept. Splits referencing this `member_id` remain valid. Project history complete.

Rationale: hard-removing would break split references or force Pattern-B restoration (like contacts). For a shared record, audit integrity matters more than row-level cleanliness.

### 4.8 Project delete blocked when transactions exist

Archive (via status change) instead. Matches the accounts / categories / contacts pattern — destructive cleanup blocked when downstream references exist.

### 4.9 Resolution tracking via FK, not a separate table

Two nullable FKs on `transactions` link a resolved personal transaction back to its source on either ledger:

- `source_transaction_id` → personal transaction (pay/receive between linked members)
- `source_project_transaction_id` → project_transaction (pay/add-debt against project ledger; claim by the actor themselves)

At most one is set per row. Query "my unresolved items" = shared-book items with no corresponding personal transaction by caller pointing at them.

No `project_resolution_tracking` table needed. Phase 2+ could add one if the query becomes hot.

### 4.10 Settlement is per-caller; no two-sided handshake

Bob's "Pay now" creates Bob's personal expense referencing the split. Alice's settlement state for that split is computed from her own personal income entries (with `source_split_id` set), not from Bob's payment. Either side can act independently; neither blocks the other.

When Alice taps "Resolve receive" on a split → her personal income lands. When she doesn't → her view of the split stays "unresolved" even if Bob's payment is recorded. The mismatch is real-world reality, surfaced in the summary ("Bob marked as paid; you haven't confirmed receipt").

This replaces the v0.2 two-sided handshake. See [`06-shared-expenses.md`](06-shared-expenses.md) §2.3 for the per-caller computation.

### 4.11 Project Resolve-all batch is a convenience, not magic

Iterates the caller's unresolved items and creates personal entries for each via the same endpoints used per-item. Default account used for all monetary actions unless specified per-action. No cross-user side effects — it's entirely the caller's personal book mutations.

### 4.12 `my_resolution_status` is per-caller, computed

Every shared-book response includes this flag computed at query time from the caller's perspective. Not stored. Works across personal transactions, project_transactions, and splits.

### 4.13 Contact auto-creation NOT done at invite

Owner inviting someone via direct-invite (not via contact) does **not** auto-add them to the owner's contact book. Contact creation is a separate explicit action — from the project member list, owner can tap "Add to contacts" per-member. Keeps contacts intentional.

### 4.14 `personal_debts` owned by its own module

The `personal_debts` table lives in [`12-personal-debts.md`](12-personal-debts.md) (extracted from earlier drafts of `06-shared-expenses.md`). It has its own dashboard screen and isn't conceptually part of the splits module. The split's `add-as-debt` action creates a row whose schema is defined there.

### 4.15 Field naming parallels personal `transactions`

`project_transactions` mirrors the personal `transactions` table where the role is parallel: same `type` enum (restricted to `expense`/`income`), same `amount`/`currency`/`date`/`note`/`category_id` columns. The non-parallel columns are renamed to make the FK target unambiguous:

- `transactions.user_id` (creator on personal book) ↔ `project_transactions.transaction_member_id` (whose transaction this is on the project ledger; FK to `project_members`, not `users`, because Grandma has no `user_id`)
- No counterpart for `account_id` — project_transactions never touch a personal account.
- `record_user_id` is new (no parallel in personal `transactions`, where the recorder always equals `user_id`); it captures the linked recorder for audit and edit-permission purposes.

The role implied by `type` flips with the value (expense → actor paid; income → actor received), exactly mirroring how personal `transactions.user_id` doesn't bake in payer/receiver.

### 4.16 Linked member as `transaction_member_id` is allowed

`transaction_member_id` may reference any active member, including linked ones. Use case: Bob is a linked member who paid in cash and isn't around to enter it; Alice records it on the project ledger now, and Bob claims it onto his personal book later via `/resolve/claim`.

Risk: Bob disagrees and records his own conflicting personal transaction instead of claiming. Resolution: Bob (as the actor's linked user) and the recorder (Alice) both have edit/delete rights on the project_transaction; the project owner has override. Either party can correct.

Restricting `transaction_member_id` to non-linked members only was rejected — it would fail the "Bob paid cash and is offline right now" use case, which is the primary reason this table exists.

### 4.17 Claim makes the personal row canonical on the shared book

When a linked actor claims their own project_transaction, two rows exist in the database:

- The original `project_transactions` row (kept as the project ledger record; splits no longer hang off it after migration)
- The new `transactions` row with `source_project_transaction_id` set (lives on the actor's personal book; splits now hang off it via `source_transaction_id`)

To avoid double-counting on the shared book, the UNION view filters out project_transactions that have a corresponding claim. The personal row becomes the canonical representation.

**Splits migrate** to the personal mirror at claim time — see §4.19 for the full rationale.

### 4.18 No edit-after-resolve protection on project_transactions

Earlier drafts blocked edits/deletes on a project_transaction once any non-actor member had resolved against it. Removed under the unified model.

Reason: settlement state is per-caller computed from personal entries with `source_split_id` (see [`06-shared-expenses.md`](06-shared-expenses.md) §2.3). Personal entries are independent of the project_transaction — editing the parent doesn't retroactively change personal entries' amounts. So drift between the project ledger and others' personal mirrors is documented behavior, not a corruption risk.

What edits do trigger: a `project_tx_changed` notification to all affected users (see [`13-notifications.md`](13-notifications.md) §2.5), so they can update their personal book if they want. They're never forced to.

Lifecycle status still gates edits per §3.1's table — `cancelled`/`archived` projects reject edits with `PROJECT_LOCKED`.

### 4.19 Splits migrate on claim (not duplicate)

When the actor claims their own project_transaction onto their personal book, the splits' `source_project_transaction_id` is rewritten to `source_transaction_id` (pointing at the personal mirror). Same split IDs.

Why migrate instead of duplicate: a duplicated split set means notifications fire twice, personal_debts get created twice, and edits to one set drift from the other. Migration keeps a single source of truth and keeps anything referencing the splits (personal entries, personal_debts) working transparently.

UX rationale: when the actor opens their personal book and inspects their ฿3,000 claim row, they should see the splits inline — without having to dig into the project view to find out who was split with. Migration puts the splits where the actor expects to find them.

For non-linked actors (no claim possible), splits stay on the project_transaction permanently. Personal_debts referencing those splits are valid (per [`12-personal-debts.md`](12-personal-debts.md) §4.6) — `source_split_id` works regardless of which ledger the split currently lives on.

### 4.20 Modal-on-save UX is client-side; backend is unchanged

The "add to my account?" / "pay or add as debt?" modals after a project_transaction save are a client UX layer. The backend `POST /v1/projects/:id/project-transactions` does NOT auto-create personal entries — it just inserts the project_transaction and splits, fires notifications, and returns. The client decides whether to show the modal (or fire the resolve action silently per user setting) based on `auto_resolve_own_in_projects` and `default_account_id`.

Keeps the backend single-purpose; UX preferences don't affect the data model.

### 4.21 Resolve endpoints consolidated on the splits router

Earlier drafts had `POST /v1/projects/:id/resolve/{pay,receive,add-debt}` — dropped in favor of the universal `POST /v1/shared-expenses/splits/:id/{pay,receive,add-as-debt}` endpoints (see [`06-shared-expenses.md`](06-shared-expenses.md) §3). One set of endpoints, one mental model, regardless of project context.

The project router still owns `POST /v1/projects/:id/project-transactions/:pt_id/claim` (no split involvement) and `POST /v1/projects/:id/resolve-all` (batch convenience).

### 4.22 Lifecycle status gates writes, not reads

`completed` projects allow corrections and resolve actions (settlement happens *after* trips end in real life). `cancelled` allows resolves only — no edits. `archived` is fully read-only.

Reads are never gated by status — members can always see the shared book of any project they're in, regardless of status. (Personal-book entries with `project_id` set remain visible in members' personal apps regardless of project status; that's their own book.)

---

## 5. Open questions

- **Concurrent edit conflict** — Alice edits her transaction while Bob is viewing. Bob's view shows stale data. Acceptable for Phase 1 (last-write-wins per creator-only edit rule). Optimistic locking later if needed.
- **Contact auto-creation from member list.** UI-side feature: tap a member → "Add to my contacts." API uses existing `POST /v1/contacts` endpoint; no new endpoint needed. Phase 1b vs 2 UX polish.
- **Ad-hoc member upgrade to contact/linked** — mid-project, Grandma decides to join the app. Owner currently can't "upgrade" her member row. Workaround: remove ad-hoc, add new with contact/invite. Phase 2+ endpoint: `POST /v1/projects/:id/members/:id/upgrade`. (When Grandma upgrades and the upgrade preserves her `member_id`, prior project_transactions where she was the actor become claim-eligible automatically.)
- **Visibility for left members** — if Bob leaves Japan trip, can he still see shared book? Proposal: no (`status = 'left'` loses access). But he keeps his personal transactions tagged `project_id = Japan`. Phase 2 decision whether "left" members retain read access.
- **Transaction splitting UX across project creators** — Alice creates dinner, splits. If Bob wants to pay for a second round, he creates a NEW transaction with his own splits. No shared "split editing" across owners. Confirmed.
- **Ownership transfer consent** — Phase 3 may require target to accept the transfer before it happens. Phase 1: owner unilaterally transfers.
- **Project-level budget goal** — dropped for Phase 1. Phase 2+ adds it as a separate column with overspend alerts. Should it count project_transactions toward the budget? (Probably yes — they're real spending in the project.) Decide alongside the budget feature.
- **Bulk absorb of ad-hoc names across members' contacts** — e.g., Carol adds Grandma as her own contact, wants to link existing ad-hoc "Grandma" member row. Complex; Phase 2+.
- **Per-member transaction privacy** — currently all linked members see all shared-book transactions. What if Alice wants some transactions tagged to the project but private? Proposal: use `project_id = NULL` for private. Phase 2 UX decision.
- **Claim conflicts and disputes** — what if Bob refuses to claim Alice's recorded project_transaction (says "I didn't pay for that")? Today: Bob/Alice/owner can edit/delete. No formal dispute flow. Phase 2+ may add a dispute marker.
- **Partial claim** — can Bob claim only part of a project_transaction (e.g., recorder logged ฿3,000 but Bob says it was actually ฿2,800)? Today: claim is all-or-nothing; Bob would edit the project_transaction first, then claim. Phase 2+ may allow override-on-claim.
- **Project-scoped categories** — currently `project_transactions.category_id` is nullable and references the recorder's personal categories (semantically odd). Phase 2+ may introduce project-scoped categories so trip-specific spending breakdowns are coherent across members.

---

## 6. Status

- **Phase** — spec; Phase 1b implementation pending
- **Last updated** — 2026-04-26
- **Version** — 0.3 (unified shared-expenses model)
  - Drops `transactions.settles_split_id` references in favor of `transactions.source_split_id` (renamed for naming consistency — see [`04-transactions.md`](04-transactions.md))
  - Resolve endpoints consolidated on the splits router (`POST /v1/shared-expenses/splits/:id/{pay,receive,add-as-debt}`); project-rooted `/resolve/pay`, `/resolve/receive`, `/resolve/add-debt` removed
  - Claim renamed to `POST /v1/projects/:id/project-transactions/:pt_id/claim` (was `/projects/:id/resolve/claim`)
  - Splits **migrate** to the personal mirror at claim time (was: stay on project_transaction; both ledgers had splits)
  - No more edit-after-resolve protection on project_transactions; lifecycle status takes over write-gating
  - Lifecycle rules formalized: `completed` allows resolves + edits, `cancelled` allows resolves only, `archived` is fully read-only
  - Modal-on-save UX + auto-resolve user setting documented
  - Tags-vs-projects guidance added to intro
  - Solo project (single-member, no notifications) explicitly supported
  - **`transactions.project_id` is now auto-managed** — only set on rows that mirror a project (claim or split-resolve). Bare personal transactions never carry `project_id`. Personal-context splits cannot target `project_member_id`; splitting with project members requires creating a `project_transaction`.
- **Version 0.2** — added `project_transactions` ledger for non-personal-book actors; polymorphic split + resolution sources; `/resolve/claim`; revised §4.1
- **Version 0.1** — initial draft; two-books model, shared-visibility tag, three member types, invite-based linking, ownership transfer in Phase 1, two-sided settlement
