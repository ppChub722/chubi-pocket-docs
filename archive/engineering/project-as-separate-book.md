# Plan: Project as Separate Book — Splits + Resolve Model

**Status:** approved, ready to implement
**Date:** 2026-05-04
**Replaces:** old project "claim" flow (single-tx mirror), old shared_expense_splits → personal_debts auto-creation on project_tx create

**Also drops user-scoped foreign keys from project tables** (project_members.contact_id, project_transactions.category_id) — see §3 for rationale.

---

## 1. Principle / Mental Model

A project is a **shared board** that members write on freely. The project ledger is a **separate world** from each member's personal book — nothing in a project automatically affects anyone's personal `transactions` or `personal_debts`.

When a member sees information on the board they want to keep, they **resolve** it by manually creating a corresponding entry in their own personal book. The personal-book entry has no enforced link back to the project; the user takes responsibility for cleanup if they edit/delete on either side.

**Key invariants:**
- Project board ↔ personal book are **decoupled**. No automatic sync, no cascade.
- Members have **full edit rights** on the project (CRUD any project_tx, including ones they didn't create). Permissions may tighten later but for now everyone can edit anything.
- Marks are per-(project_tx, project_member). Toggling a mark **does not** create or delete personal-book entries. Creating a personal-book entry **does not** auto-toggle the mark.
- Resolve actions on summary page **do not** call any project endpoint — they call the existing `POST /transactions` or `POST /personal-debts` directly.
- Re-resolve is allowed and creates additional personal-book entries each time. User must clean up duplicates manually.
- **Project tables never reference user-scoped resources** (contacts, categories). The board is shared but those resources belong to one user — referencing them creates ambiguity ("whose contact?", "whose category?"). The personal-book side is where user-scoped picks happen, at resolve time.

---

## 2. Worked Example (canonical test scenario)

Two-member project (Pond, Lee). Project transactions:

| # | Description | Payer | Amount | Splits |
|---|-------------|-------|--------|--------|
| 1 | Gas | Pond | 1000 | Lee owes 500 |
| 2 | Dinner | Lee | 750 | Pond owes 600 |
| 3 | Breakfast (Lee treats Pond) | Lee | 500 | (no split) |

**Pond's resolve summary** (after project closed):
- I spent:
  - Gas — share 500 (parent of #1, post-split)
  - Dinner — share 600 (Pond is the debtor of #2's split child)
- Net debts:
  - Owe Lee 100 (= +500 owed by Lee on #1 − 600 owed to Lee on #2)

**Lee's resolve summary:**
- I spent:
  - Gas — share 500 (Lee is the debtor of #1's split child)
  - Dinner — share 150 (parent of #2, post-split)
  - Breakfast — share 500 (parent of #3, no splits)
- Net debts:
  - Owed by Pond 100

Math sanity:
- Pond consumed 500+600 = 1100; paid cash 1000 → owes 100 ✓
- Lee consumed 500+150+500 = 1150; paid cash 1250 → owed 100 ✓

---

## 3. Data Model

### 3.1 Splits as Multi-Transaction

Splits are represented as **child rows in `project_transactions`** linked to a parent via `parent_project_transaction_id`. No separate splits table.

### 3.2 Drop user-scoped FKs

Two columns must go because they reference user-scoped resources from a shared (multi-user) table:

- **`project_members.contact_id`** — `contacts` are user-scoped (each user has their own contacts list). Storing one `contact_id` at the project_members row is ambiguous: whose contact is it? If the inviter wants to associate a project member with their own contact, that mapping lives in their personal `contacts` table (lookup via `contacts.linked_user_id = project_members.user_id`). Project doesn't need to know.
- **`project_transactions.category_id`** — `categories` are user-scoped. The recorder's category id is meaningless to other members. Categories are picked fresh during resolve (when entering personal book).

After this change, project_members has only **2 kinds**: linked (`user_id` set) / ad-hoc (`user_id` NULL + `display_name`). The "contact" kind disappears as a distinct flavor.

### 3.3 Schema migration (1 file)

```sql
-- 000027_projects_redesign.up.sql

-- Add splits + marks to project_transactions.
ALTER TABLE project_transactions
    ADD COLUMN parent_project_transaction_id UUID
        REFERENCES project_transactions(id) ON DELETE CASCADE,
    ADD COLUMN marks UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX project_transactions_parent_idx
    ON project_transactions(parent_project_transaction_id)
    WHERE parent_project_transaction_id IS NOT NULL;

-- Drop user-scoped FK from project_transactions.
-- (No backfill: category_id is purely informational, not load-bearing.)
ALTER TABLE project_transactions
    DROP COLUMN category_id;

-- Drop user-scoped FK from project_members.
-- (Existing contact-kind members become ad-hoc — display_name is preserved,
-- contact_id reference is dropped. If a contact has linked_user_id, the
-- corresponding project_member is unaffected because that member would
-- already have user_id set.)
ALTER TABLE project_members
    DROP COLUMN contact_id;
```

```sql
-- 000027_projects_redesign.down.sql
ALTER TABLE project_members
    ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE project_transactions
    ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS project_transactions_parent_idx;

ALTER TABLE project_transactions
    DROP COLUMN marks,
    DROP COLUMN parent_project_transaction_id;
```

### 3.4 Field semantics (post-migration)

- `parent_project_transaction_id` — NULL for parent rows, set for split children
- `marks` — array of `project_members.id` values; presence = "this member has marked this row resolved on the tx page"
- Children **inherit** `type`, `currency`, `date`, `note` from parent. BE copies these values at create time; client must not send them for child rows. (No `category_id` to inherit anymore.)
- Children's `transaction_member_id` = the debtor (the one who owes the parent's payer for this share)
- Children's `amount` = the share amount
- **Constraint (enforced in service layer):** parent rows must not themselves have a parent (max 1 level deep)
- ON DELETE CASCADE: deleting a parent deletes its children
- `project_members` after migration: linked (`user_id` set) or ad-hoc (`user_id` NULL). No `contact_id` column.

---

## 4. BE Work

### 4.1 Migration

`chubi-pocket-be/migrations/000027_projects_redesign.up.sql` + matching `.down.sql`. See §3.3 for SQL. One migration covers all four schema changes (parent_id, marks, drop category_id, drop contact_id).

### 4.2 Model (`internal/modules/projects/model.go`)

Update `ProjectTransaction` — drop `CategoryID`, add `ParentProjectTransactionID` + `Marks`:
```go
type ProjectTransaction struct {
    ID                          uuid.UUID   `json:"id"`
    ProjectID                   uuid.UUID   `json:"project_id"`
    ParentProjectTransactionID  *uuid.UUID  `json:"parent_project_transaction_id"`
    TransactionMemberID         uuid.UUID   `json:"transaction_member_id"`
    RecordUserID                uuid.UUID   `json:"record_user_id"`
    Type                        string      `json:"type"`
    Amount                      float64     `json:"amount"`
    Currency                    string      `json:"currency"`
    Date                        string      `json:"date"`
    Note                        *string     `json:"note"`
    Marks                       []uuid.UUID `json:"marks"`
    CreatedAt                   time.Time   `json:"created_at"`
    UpdatedAt                   time.Time   `json:"updated_at"`
}
```

Update `CreateProjectTransactionRequest` — drop `CategoryID`, add `Splits`:
```go
type ProjectSplitInput struct {
    MemberID uuid.UUID `json:"member_id" binding:"required"`
    Amount   float64   `json:"amount"    binding:"required,gt=0"`
}

type CreateProjectTransactionRequest struct {
    TransactionMemberID uuid.UUID           `json:"transaction_member_id" binding:"required"`
    Type                string              `json:"type"                  binding:"required,oneof=expense income"`
    Amount              float64             `json:"amount"                binding:"required,gt=0"`
    Currency            string              `json:"currency"              binding:"required,len=3"`
    Date                string              `json:"date"                  binding:"required,datetime=2006-01-02"`
    Note                *string             `json:"note"`
    Splits              []ProjectSplitInput `json:"splits"                binding:"omitempty,dive"`
}
```

`UpdateProjectTransactionRequest` — also accept `splits` (full replacement: delete existing children, insert new). Drop `CategoryID` from this too. **Recommendation: full replacement on PUT for simplicity.**

Update `ProjectMember` — drop `ContactID`:
```go
type ProjectMember struct {
    ID           uuid.UUID  `json:"id"`
    ProjectID    uuid.UUID  `json:"project_id"`
    UserID       *uuid.UUID `json:"user_id"`        // NULL = ad-hoc
    DisplayName  string     `json:"display_name"`
    Role         string     `json:"role"`
    Status       string     `json:"status"`
    InvitedAt    *time.Time `json:"invited_at"`
    JoinedAt     *time.Time `json:"joined_at"`
    LeftAt       *time.Time `json:"left_at"`
    CreatedAt    time.Time  `json:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at"`
}
```

Update `AddMemberRequest` — drop `ContactID` variant. Two variants now:
- by-email: `Email` + optional `DisplayName`
- ad-hoc: `DisplayName` only, `AdHoc=true`

```go
type AddMemberRequest struct {
    Email       *string `json:"email"        binding:"omitempty,email"`
    DisplayName *string `json:"display_name" binding:"omitempty,min=1,max=100"`
    Role        string  `json:"role"         binding:"omitempty,oneof=owner contributor viewer"`
    AdHoc       bool    `json:"ad_hoc"`
}
```

If FE wants to "invite my contact X", it resolves contact's `linked_user_id` (if any) on the FE side and sends the resulting email/user identification — the project module never sees the contact_id.

### 4.3 Store (`internal/modules/projects/pt_store.go` or wherever PT methods live)

- `InsertPTTx(ctx, tx, projectID, callerUserID, req)` — creates **parent + children atomically**:
  1. Insert parent row
  2. Validate `Σsplits.amount ≤ parent.amount` and each `splits[i].member_id` belongs to project + is not the same as `transaction_member_id` (no self-split)
  3. For each split, insert child row inheriting parent's `type`, `currency`, `date`, `note`; setting `parent_project_transaction_id = parent.id`, `transaction_member_id = split.member_id`, `amount = split.amount`
  4. Return parent (FE refetches via `ListPT` to get children)
- `UpdatePT(...)` — if request includes `splits`, delete existing children where `parent_project_transaction_id = ptID`, re-insert new. Else just update scalar fields.
- `ListPT(ctx, projectID, page, perPage)` — return **flat list** (parents + children); FE assembles tree. Pagination applies to parent rows only — also fetch children of returned parents and append.
  - Implementation: SELECT parents with pagination, then SELECT children where parent_id IN (parent ids), append to result.
- `ToggleMark(ctx, projectTxID, projectMemberID, marked bool)` — `UPDATE project_transactions SET marks = (CASE WHEN $marked THEN array_append(marks, $mid) WHERE NOT $mid = ANY(marks) ELSE array_remove(marks, $mid) END) WHERE id = $1`. Idempotent.
- `GetPT` — include marks + parent_id in projection.

### 4.4 Service (`internal/modules/projects/pt_service.go`)

- `CreateProjectTransaction` — strip the old splits-creator hook (already done). Add validation:
  - parent_project_transaction_id must be NULL (clients can't create grandchildren)
  - each split member must be project member; sum of split amounts ≤ parent amount; no self-split
- `UpdateProjectTransaction` — when splits change, must enforce same validation. **Cannot update child rows directly via this endpoint** (children are managed through their parent). Reject if `ptID` is a child.
- `DeleteProjectTransaction` — if deleting a parent, FK cascade handles children. If deleting a child... allow (just removes that one split).
- `ToggleMark(ctx, callerUserID, projectID, ptID, marked)`:
  - Resolve caller's `project_member_id` from (projectID, callerUserID); error if not a member
  - Call store `ToggleMark`
- **Remove**: `Claim`, `txClaim`, `txHasMirror` hooks, `ClaimRequest`, claim endpoint. Personal-book linkage moves to FE-side.

**Members service** (`internal/modules/projects/members_service.go` or wherever):
- `AddMember` — drop the from-contact branch. Only by-email and ad-hoc remain.
- Any flow that resolved `contact_id → user_id` server-side disappears; FE must do the lookup before calling AddMember.

### 4.5 Handler / Routes (`internal/modules/projects/handler.go` + `cmd/api/main.go`)

Add:
- `PUT /projects/:id/project-transactions/:ptId/mark` → handler reads `{marked: bool}` from body, calls `service.ToggleMark`, returns updated `ProjectTransaction`

Remove:
- `POST /projects/:id/project-transactions/:ptId/claim` route + handler

Update existing routes to honor new fields in request/response.

### 4.6 Notifications

`pt_service.go` already dispatches `project_tx_recorded_for_you` and `project_tx_changed`. Decision: **fire only on parent row events**, not on child creation/edit (children are "metadata" of the parent). Recipients computation may need updating to include split debtors as stakeholders.
- `PTRecipientsForChange(ctx, ptID, exclude)` → return all distinct linked users from `transaction_member_id` of parent + all children where `parent_project_transaction_id = ptID`, minus `exclude`.

---

## 5. FE Work

### 5.1 Domain (`lib/features/projects/domain/project.dart`)

Update `ProjectTransaction` — drop `categoryId`, add `parentProjectTransactionId` + `marks`:
```dart
class ProjectTransaction {
  final String id;
  final String projectId;
  final String? parentProjectTransactionId;
  final String transactionMemberId;
  final String recordUserId;
  final String type;
  final double amount;
  final String currency;
  final String date;
  final String? note;
  final List<String> marks;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isParent => parentProjectTransactionId == null;
  bool get isChild => parentProjectTransactionId != null;
}
```

Update `ProjectMember` — drop `contactId`:
```dart
class ProjectMember {
  final String id;
  final String projectId;
  final String? userId; // null = ad-hoc
  final String displayName;
  final MemberRole role;
  final MemberStatus status;
  // ... timestamps
}
```

Add helper to assemble accordion structure from flat list:
```dart
class ProjectTxTree {
  final ProjectTransaction parent;
  final List<ProjectTransaction> children;
  ProjectTxTree({required this.parent, required this.children});
}

List<ProjectTxTree> buildTree(List<ProjectTransaction> flat) {
  // group children by parent_id, attach to corresponding parent
}
```

### 5.2 Repository (`lib/features/projects/data/projects_repository.dart`)

- `createTransaction` — accept `splits: List<({String memberId, double amount})>` parameter; serialize to backend body. Drop `categoryId` parameter.
- `updateTransaction` — same. Drop `categoryId`.
- `toggleMark(String projectId, String txId, bool marked)` → `PUT /projects/$projectId/project-transactions/$txId/mark`
- `addMember` — drop `contactId` parameter. Two variants: by-email + ad-hoc.
- **Remove**: `claim` method

### 5.3 Cubit / state

- `ProjectDetailCubit` (or wherever project tx list lives) — keep flat list from BE, expose `tree: List<ProjectTxTree>` getter
- Add `toggleMark` action that calls repo and updates local state optimistically

### 5.4 UI

**Project transactions tab:**
- Each row displayed as accordion: parent row at top, children indented underneath
- Per-row: show `marks` indicator (e.g., checkmark if `caller's project_member_id` ∈ `marks`)
- Tap row → bottom sheet with actions: Edit, Delete, Toggle mark, **Resolve**
- Resolve action sheet:
  - For parent row where caller is `transaction_member_id`:
    - Choose amount: full (`amount`) or post-split (`amount − Σchildren.amount`)
    - Mode: "as expense" → calls `POST /transactions` (caller picks account + category in the sheet — no inheritance from project_tx)
  - For child row where caller is `transaction_member_id` (debtor):
    - Mode: "as expense" → `POST /transactions` (expense from chosen account, caller picks category)
    - Mode: "as debt" → `POST /personal-debts` (i_owe, counterparty = parent's payer)
  - For child row where caller = parent's `transaction_member_id` (creditor):
    - Mode: "as income" → `POST /transactions` (income to chosen account, caller picks category)
    - Mode: "as debt" → `POST /personal-debts` (owed_to_me, counterparty = child's actor)

**Resolve summary tab** (only visible when project status ∈ {completed, archived}):
- Pull tx list (already loaded by ProjectDetailCubit)
- Filter: caller's `project_member_id` ∉ `marks` AND caller has involvement
- Aggregate locally:
  - **I spent** section:
    - parent rows where `caller = transaction_member_id` → show as `(label, amount − Σchildren.amount)`
    - child rows where `caller = transaction_member_id` → show as `(label, amount)`
  - **Net debts** section: group children by counterparty user
    - children where `caller = transaction_member_id` (caller is debtor) → contributes `−share` toward counterparty = parent's payer
    - children where `caller = parent.transaction_member_id` AND `child.transaction_member_id ≠ caller` → contributes `+share` toward counterparty = child's actor
    - net per counterparty user: positive = owed_to_me, negative = i_owe
- Each row has its own resolve action sheet (same shape as tx page)
- For net-debt line: action sheet with mode "as transaction" or "as debt"; FE calls `POST /transactions` (expense/income) or `POST /personal-debts` directly with the computed net amount + counterparty's user info
- **Session-local filter**: when user resolves a line on summary, FE remembers it locally for this session so the line disappears (avoids accidental double-resolve while user is still on the page). On next page open, the line reappears unless user has marked the corresponding tx on the tx page.

### 5.5 Categories at resolve time

`project_transactions` no longer carries `category_id` (§3.2). Each resolve action sheet must let the caller pick a category fresh, with sensible defaults:

- For project-tx → expense/income: default to the user's most-recently-used expense/income category (or no default; user picks). Picker is the same one used elsewhere in the app.
- For net-debt → expense (settling debt): use system category `DEBT_PAID` (already exists from migration 26)
- For net-debt → income (receiving owed): use system category `DEBT_RECEIVED` (already exists from migration 26)

---

## 6. Cleanup (delete old code)

### BE
- `internal/modules/projects/pt_service.go`:
  - Remove `Claim` method, all usage of `txClaim`, `txHasMirror`
  - Remove `ClaimRequest` from model.go
- `internal/modules/projects/service.go`:
  - Remove `WithTxClaim`, `WithTxHasMirror` setters and corresponding fields
- `internal/modules/projects/handler.go`:
  - Remove claim handler
- `cmd/api/main.go`:
  - Remove `/projects/:id/project-transactions/:ptId/claim` route
  - Remove the `transactionsService.WithTxClaim(...)` / `WithTxHasMirror(...)` wiring

### FE
- `lib/features/projects/data/projects_repository.dart`:
  - Remove `claim` method
  - Drop `categoryId` from create/update transaction calls
  - Drop `contactId` from `addMember` (and any from-contact wrapper)
- Any UI using `claim` (action sheet on project_tx detail) — replace with the new resolve action sheet
- "Add member from contact" UI flow (if present): convert client-side — look up the contact's `linked_user_id` locally, then call `addMember` with `email` (if linked) or `displayName` + `adHoc=true` (if not linked yet)
- Project transaction form: remove category picker (project_tx no longer has one). Category picking moves into the resolve action sheet.

### Docs
- `chubi-pocket-docs/design/spec/10-projects.md` — full rewrite to match this model
- `chubi-pocket-docs/design/database/schema.md` — update §11 (project_transactions) with new columns
- `chubi-pocket-docs/design/api/projects.md` — update endpoint list (add mark, remove claim, document splits in create/update bodies)

---

## 7. Implementation Order

1. **Migration 27** (schema change) — write up + down, run via docker compose
2. **BE model + store** — update `ProjectTransaction` struct, `CreateProjectTransactionRequest`, store methods (`InsertPTTx`, `UpdatePT`, `ListPT`, `GetPT`, `ToggleMark`)
3. **BE service + handler** — wire up new behavior, add mark endpoint, delete claim flow
4. **BE main.go** — route changes, remove claim wiring
5. **Verify BE compiles + manual smoke test** via curl/Postman
6. **FE domain model** — update `ProjectTransaction`, add `ProjectTxTree`
7. **FE repository** — add splits to create/update, add `toggleMark`, remove `claim`
8. **FE cubit** — expose tree, add mark action
9. **FE UI: project tx page** — accordion + resolve action sheet
10. **FE UI: resolve summary tab** — gated on project status, aggregation + action sheets
11. **End-to-end test** with the canonical Pond/Lee scenario from §2
12. **Docs** — update spec + schema + api docs

---

## 8. Open Questions Already Decided

- **Net-debt resolve calls existing endpoints** (`POST /transactions`, `POST /personal-debts`), not a new project endpoint. Project module doesn't know about personal book.
- **Marks toggle and resolve action are independent.** No auto-mark on resolve. User manages marks separately.
- **Re-resolve creates a new tx each time.** User cleans up duplicates manually.
- **Children inherit parent's currency/date/type/note** (no category — see below). BE copies, doesn't accept from client.
- **Children of children are forbidden.** Max 1 level deep.
- **Self-split forbidden.** A split's `member_id` must differ from parent's `transaction_member_id`.
- **Sum of splits ≤ parent amount.** Enforced server-side. The remainder is the parent payer's own share.
- **Cross-currency** within a project: deferred. Same currency assumed for all rows in a project for now.
- **Project tables drop user-scoped FKs** — `project_members.contact_id` and `project_transactions.category_id` removed. Reason: those resources are user-scoped (each user has own contacts/categories), so storing one id at the shared row is ambiguous. Personal-book resolve flow picks fresh.
- **Project members reduced to 2 kinds**: linked (`user_id` set) / ad-hoc (`user_id` NULL). The "contact" kind is gone. FE must do contact→user_id lookup before calling `addMember`.

---

## 9. Things to Watch Out For

- **`source_project_transaction_id` on `transactions`** already exists from earlier work. FE should populate it when creating expense/income via the resolve flow, so personal-book entries can be traced back to their project source. This is for user reference only — no FK behavior depends on it.
- **Mark toggle authorization**: caller must be a member of the project. Resolving the caller's project_member_id from (projectID, userID) is the gate.
- **Pagination + children**: `ListPT` paginates parents only, not children. If a parent has 5 children, all 5 are returned alongside the parent — they don't count toward `per_page`. Document this in API spec.
- **Notifications** for split children: re-evaluate `PTRecipientsForChange` so it includes split debtors as stakeholders, not just the actor.
- **Project status gating for summary tab**: FE shows "Resolve summary" tab only when `project.status` ∈ `{completed, archived}`. BE doesn't need to gate (read-only aggregation done client-side).
- **Existing data**: any existing `project_transactions` rows get `marks = '{}'` and `parent_project_transaction_id = NULL` automatically via DEFAULT. No backfill needed.
- **Dropping `project_members.contact_id`**: any existing rows that had only `contact_id` set (no `user_id`) become ad-hoc members after migration. `display_name` is preserved, so UI continues to show the right name. If FE wants to re-associate them with a contact later, it does so client-side via the contact's `linked_user_id`.
- **Dropping `project_transactions.category_id`**: any existing project_tx rows simply lose their category. No backfill, no preservation; this column was informational only and the resolve flow picks fresh categories anyway.
- **Notification payloads**: if any existing notification payload includes `category_id` from project_tx, strip it.
