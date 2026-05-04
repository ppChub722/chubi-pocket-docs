# 05 — Categories & Tags

Two lightweight classification systems for transactions: **categories** (hierarchical, one per transaction, required) and **tags** (flat, many per transaction, optional).

This module owns `categories`, `tags`, and the `transaction_tags` junction table. Attach/detach endpoints for tags are physically registered on the transaction router but the junction logic lives here.

**Tags vs projects:** tags are for purely personal grouping ("how much did I spend on the trip?") — lightweight, infinite, per-user. Projects are for collaboration and IOU tracking with other people, even if those people aren't on the app (ad-hoc members). If you need to record that Bob fronted dinner or that Carol owes you ฿1,000, use a project (see [`10-projects.md`](10-projects.md)). If you just want a label for filter/report on your own transactions, use a tag. They're orthogonal — a single transaction can carry both a `project_id` and any number of tags.

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 0/1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Categories CRUD (hierarchical, 3-layer max) | ✅ | ✅ | ✅ |
| System categories (auto-assigned on transfer/adjust/opening) | ✅ | ✅ | ✅ |
| Default starter category seed at registration | ✅ | ✅ | ✅ |
| Tags CRUD + attach/detach on transactions | ✅ | ✅ | ✅ |
| Category archive / restore / permanent delete | ✅ | ✅ | ✅ |
| Localized default seed names (i18n) | English only | ✅ | ✅ |
| Template category sets at registration | — | — | Phase 4+ |
| Bulk recategorize tool | — | ✅ | ✅ |
| Auto-purge archived categories (scheduled job) | — | — | optional |
| Category-set import / export | — | — | Phase 4+ |

---

## 1. Schema

Tables owned by this module: `categories`, `tags`, `transaction_tags`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#05--categories--tags`](../database/schema.md#05--categories--tags).

API-layer rule: 3-layer depth limit on `categories` is enforced on create and parent-change. Backend walks up from candidate `parent_id` counting hops; reject if > 3 with `400 MAX_DEPTH_EXCEEDED`.

### 1.1 Phase 1a fields

The following columns are added to support the Phase 1a Manage Categories and Manage Tags screens. They have safe defaults and are backfillable.

**`categories`:**

| Column | Type | Default | Purpose |
|---|---|---|---|
| `sort_order` | `INT` | `0` | Drag-reorder. Sibling order under the same `(user_id, type, parent_id)`. Lower = earlier. Server rewrites this in bulk via §3.13. |
| `include_in_report` | `BOOLEAN` | `TRUE` | Per-row toggle for "show this in spending reports". `FALSE` for default-seeded *Adjustment* / *Lending* / *Reimbursement* categories so they don't pollute reports. |
| `description` | `TEXT` | `NULL` | Optional one-line guidance ("Restaurants & dining out"). Seeded for default categories; user-editable. |
| `note` | `TEXT` | `NULL` | Free-form user scratch notes per category. Never seeded. |

**`tags`:**

| Column | Type | Default | Purpose |
|---|---|---|---|
| `icon` | `VARCHAR(50)` | `NULL` | Free-form icon identifier (matches `categories.icon` convention). Phase 1a app supports a fixed preset set; backend stores the string. |

These fields land via migration `000008_add_p1a_fields_to_categories_and_tags.up.sql`. Existing rows backfill: `sort_order = row_number() over (partition by user_id, type, parent_id order by id)`, `include_in_report = TRUE`, `tags.icon = NULL`.

---

## 2. Registration seed

At user registration, the backend inserts **6 system categories** and **~28 starter user categories**. All categories are marked `is_system` appropriately; starter categories are fully editable.

### 2.1 System categories (6)

| Name | Type | `is_system` | Used by |
|---|---|---|---|
| Opening Balance | income | true | `POST /v1/accounts` with positive balance |
| Opening Balance | expense | true | `POST /v1/accounts` with negative balance |
| Adjustment | income | true | `POST /v1/accounts/:id/adjust-balance` (delta > 0) |
| Adjustment | expense | true | `POST /v1/accounts/:id/adjust-balance` (delta < 0) |
| Transfer In | income | true | Every `type = 'transfer_in'` transaction |
| Transfer Out | expense | true | Every `type = 'transfer_out'` transaction |

Rules:

- Hidden from user category pickers
- Visible in Manage Categories with a "System" badge
- User can rename display `name` (for personalization / i18n) but not change `type`, `parent_id`, or `is_system`
- Cannot be deleted

### 2.2 Starter user categories

English-language Phase 1 seed. User can freely rename, move, change icons, or delete (subject to normal delete rules in §3.x).

**Expense (root + children):**

```
Food
├── Restaurants
├── Groceries
└── Coffee & Drinks
Transport
├── Taxi / Grab
├── Public Transit
└── Fuel
Bills & Utilities
├── Electricity
├── Water
├── Internet
└── Phone
Shopping
├── Clothing
└── Electronics
Health
├── Medical
└── Pharmacy
Entertainment
├── Movies
└── Subscriptions
Personal Care
Education
Gifts & Donations
Travel
Others
```

**Income:**

```
Salary
Freelance
Interest
Refund
Gift
Others
```

~28 categories (13 parents + 15 children). Phase 2 localizes names; Phase 4+ adds template picker so users can start from different seeds.

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `POST /v1/categories`

Create a category.

**Request body:**

```json
{
  "name": "Subscriptions",
  "type": "expense",
  "parent_id": "0190e4...",
  "icon": "subscriptions",
  "color": "#FF5722",
  "include_in_report": true,
  "description": "Recurring subscription services",
  "note": null
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | 1–100 chars |
| `type` | string | ✅ | `'income'` \| `'expense'` |
| `parent_id` | string | — | NULL = root; must reference existing non-system category of same `type` |
| `icon` | string | — | Free-form identifier |
| `color` | string | — | Hex color |
| `include_in_report` | boolean | — | Default `true` |
| `description` | string | — | Up to 280 chars; `null` clears |
| `note` | string | — | Up to 280 chars; `null` clears |

`sort_order` is **not** set by `POST` — new categories append to the end of their sibling group (server assigns `MAX(sort_order)+1` for that `(user, type, parent_id)`).

**Validation:**

- Parent must belong to same user + same `type` + be `status = 'active'` + not `is_system`
- Resulting depth ≤ 3
- No duplicate `(user_id, type, parent_id, LOWER(name))` among active categories

**Success — `201 Created`:** the created category.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid name, type, etc. |
| 400 | `MAX_DEPTH_EXCEEDED` | Would exceed 3 levels |
| 400 | `DUPLICATE_NAME` | Sibling with same name (case-insensitive) |
| 400 | `INVALID_PARENT` | Parent is system, archived, wrong type, or not owned |
| 401 | `UNAUTHORIZED` | |

### 3.2 `GET /v1/categories`

List categories owned by the user. Returns a flat list by default; client builds the tree using `parent_id`.

**Query parameters:**

| Name | Description |
|---|---|
| `type` | Filter by `income` \| `expense` |
| `status` | `active` (default) \| `archived` \| `all` |
| `include_system` | `true` \| `false` (default `false` — system cats hidden from pickers) |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "0190e4...",
      "name": "Food",
      "type": "expense",
      "parent_id": null,
      "is_system": false,
      "icon": "restaurant",
      "color": "#FF5722",
      "status": "active",
      "sort_order": 0,
      "include_in_report": true,
      "description": "Restaurants and groceries",
      "note": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

Clients reconstruct the tree by grouping on `parent_id` and sorting siblings by `sort_order` ASC, then `created_at` ASC for stable ordering when ties occur.

### 3.3 `GET /v1/categories/:id`

Get a single category. Includes computed `depth` (1 = root, 2 = child, 3 = grandchild).

**Response:**

```json
{
  "id": "0190e4...",
  "name": "Restaurants",
  "type": "expense",
  "parent_id": "0190e4-food",
  "parent_name": "Food",
  "depth": 2,
  "is_system": false,
  "icon": "restaurant",
  "color": "#FF5722",
  "status": "active",
  "child_count": 0,
  "transaction_count": 42
}
```

### 3.4 `PUT /v1/categories/:id`

Update a category. Partial.

**Request body:**

```json
{
  "name": "Dining Out",
  "parent_id": "0190e4-food",
  "icon": "dining",
  "color": "#FF9800",
  "include_in_report": false,
  "description": "Restaurants only",
  "note": "Move groceries out before tax season"
}
```

| Field | Type | Editable when | Rules |
|---|---|---|---|
| `name` | string | always | unique per (user, type, parent) |
| `parent_id` | string | always for non-system | null or active category of same type; depth check; no cycle |
| `icon` | string | always | |
| `color` | string | always | |
| `include_in_report` | boolean | always | |
| `description` | string | always | up to 280 chars; `null` clears |
| `note` | string | always | up to 280 chars; `null` clears |
| `type` | — | **immutable** | Delete + recreate if wrong |
| `is_system` | — | **immutable** | |
| `sort_order` | — | via §3.13 only | |
| `status` | — | via dedicated endpoints (§3.5, §3.6) | |

**Parent change rules:**

- New parent's subtree depth must not exceed 3
- New parent must be same `type`, not archived, not system, owned by user
- Cannot set `parent_id` to self or any of own descendants (cycle check)

**Errors:** `400 VALIDATION_ERROR`, `400 MAX_DEPTH_EXCEEDED`, `400 DUPLICATE_NAME`, `400 CYCLE_DETECTED`, `400 SYSTEM_CATEGORY_IMMUTABLE`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### 3.5 `DELETE /v1/categories/:id`

Delete or archive a category.

**Backend flow:**

1. Fetch the category
2. If `is_system = true` → `400 SYSTEM_CATEGORY` (cannot delete)
3. Reparent children: for all `categories WHERE parent_id = :id`, set their `parent_id` to this category's `parent_id` (shifts to grandparent; NULL if this is a root)
4. Count transactions where `category_id = :id`:
   - **If 0** → hard delete the category
   - **If > 0** → soft delete: `status = 'archived'`

**Response — `200 OK`:**

```json
{
  "message": "Category archived",
  "status": "archived",
  "transaction_count": 42,
  "notice": "42 transactions still use this category. Reassign them before permanent deletion."
}
```

Or, if hard-deleted:

```json
{ "message": "Category deleted", "status": "deleted" }
```

**Errors:** `400 SYSTEM_CATEGORY`, `401`, `403`, `404`.

### 3.6 `POST /v1/categories/:id/restore`

Reactivate an archived category.

**Backend flow:**

1. Set `status = 'active'`
2. If `parent_id` points to an archived category → silent auto-reparent to nearest active ancestor (or root if none)
3. Return the restored category

**Success — `200 OK`:** the restored category.

**Errors:** `400 NOT_ARCHIVED`, `401`, `403`, `404`.

### 3.7 `DELETE /v1/categories/:id/permanent`

Hard-delete an archived category. Only works from the archived state and only if no transactions reference it.

**Backend flow:**

1. Must be `status = 'archived'` → else `400 NOT_ARCHIVED`
2. Count transactions → if > 0 → `400 HAS_TRANSACTIONS` with count
3. Reparent any children still pointing at this category (same grandparent-shift rule as §3.5)
4. Hard delete the row

**Success — `200 OK`:**

```json
{ "message": "Category permanently deleted" }
```

**Errors:** `400 NOT_ARCHIVED`, `400 HAS_TRANSACTIONS`, `400 SYSTEM_CATEGORY`, `401`, `403`, `404`.

### 3.8 `POST /v1/tags`

Create a tag.

**Request body:**

```json
{ "name": "reimbursable", "color": "#4CAF50", "icon": "receipt" }
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | ✅ | 1–50 chars; unique per user case-insensitive |
| `color` | string | — | Hex color |
| `icon` | string | — | Free-form identifier (matches category convention) |

**Errors:** `400 VALIDATION_ERROR`, `409 TAG_EXISTS`, `401`.

### 3.9 `GET /v1/tags`

List user's tags. No pagination — tag counts are small.

**Response:**

```json
{
  "data": [
    {
      "id": "0190e4...",
      "name": "reimbursable",
      "color": "#4CAF50",
      "icon": "receipt",
      "usage_count": 12,
      "created_at": "..."
    }
  ]
}
```

`usage_count` is computed (count of rows in `transaction_tags`). The list is server-sorted by `usage_count DESC, LOWER(name) ASC` so the most-used tags surface first.

### 3.10 `GET /v1/tags/:id` / `PUT /v1/tags/:id` / `DELETE /v1/tags/:id`

- `GET` — single tag with `usage_count`
- `PUT` — update `name` or `color`
- `DELETE` — hard delete; junction rows cascade (tag removed from all transactions)

### 3.11 `POST /v1/transactions/:id/tags`

Attach tags to a transaction. Idempotent — attaching an already-attached tag is a no-op.

**Request body:**

```json
{ "tag_ids": ["0190e4-tag1", "0190e4-tag2"] }
```

**Success — `200 OK`:** the transaction with its full tag list.

**Errors:** `400 VALIDATION_ERROR`, `401`, `403` (transaction or tag not owned), `404`.

### 3.12 `DELETE /v1/transactions/:id/tags/:tag_id`

Detach a single tag from a transaction.

**Success — `200 OK`:** `{ "message": "Tag removed from transaction" }`.

### 3.13 `PATCH /v1/categories/reorder`

Bulk-rewrite `(parent_id, sort_order)` for the user's category tree atomically. Used by the Manage Categories drag-and-drop reorder mode.

**Why one atomic call instead of per-row PUTs.** A reorder touches many rows simultaneously (e.g. promoting a sub-category to root, then sliding everything else down). Per-row PUTs leak partial states on network failure and would briefly violate the sibling-sort invariant. One PATCH = one transaction.

**Request body:**

```json
{
  "categories": [
    { "id": "0190e4-food", "parent_id": null, "sort_order": 0 },
    { "id": "0190e4-restaurants", "parent_id": "0190e4-food", "sort_order": 0 },
    { "id": "0190e4-groceries", "parent_id": "0190e4-food", "sort_order": 1 },
    { "id": "0190e4-transport", "parent_id": null, "sort_order": 1 }
  ]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `categories` | array | ✅ | Every entry references a category owned by the user; entries can't be omitted (must be a complete restatement of the affected tree — see below) |
| `categories[].id` | string | ✅ | Must exist, belong to user |
| `categories[].parent_id` | string \| null | ✅ | Same-type rule applies; depth ≤ 3; no cycles across the entire batch |
| `categories[].sort_order` | int | ✅ | ≥ 0 |

**Server contract:**

- The payload **must include every `(user_id, type)` row that's being touched**. The server treats the batch as the authoritative new layout for any `(type)` that appears in the payload — rows of that type missing from the payload retain their existing `(parent_id, sort_order)` only if no row in the payload claims their slot. Simplest client behavior: send the whole tree for whichever `type` the user reordered.
- System categories (`is_system = true`) **may** appear in the payload but their `parent_id` must remain `null`. `sort_order` is editable.
- Archived categories may not be reordered (filter them out client-side).
- Validation runs entirely before any writes. On failure, no row changes.
- Cycle detection runs against the post-batch parent map (so dragging A under B and B under A in the same batch is rejected).

**Success — `200 OK`:**

```json
{ "data": [ /* updated full list of the user's active categories */ ] }
```

Returning the full list lets the client replace its local cache without a follow-up `GET`.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Malformed payload |
| 400 | `MAX_DEPTH_EXCEEDED` | Some path exceeds 3 levels post-batch |
| 400 | `CYCLE_DETECTED` | Batch defines a cycle |
| 400 | `INVALID_PARENT` | A `parent_id` references a system, archived, or wrong-type category |
| 400 | `DUPLICATE_NAME` | Reparenting collides with an existing sibling name |
| 401 | `UNAUTHORIZED` | |
| 403 | `FORBIDDEN` | A referenced id doesn't belong to the user |
| 404 | `NOT_FOUND` | A referenced id doesn't exist |

---

## 4. Design decisions

### 4.1 Categories required on every transaction (`category_id NOT NULL`)

Earlier drafts had categories optional for transfers (NULL). Current design: every transaction has a category. Transfers use the `Transfer In` / `Transfer Out` system categories. Benefits:

- Single schema mode (never NULL); simpler queries
- Every transaction renders a category label in the UI
- "Show me all my transfers" is a simple category filter
- Reports filter `WHERE NOT is_system` once; no special-case NULL handling

### 4.2 System categories are auto-assigned

Backend ignores any `category_id` sent in create requests for:

- `POST /v1/accounts` (opening balance) — auto-sets Opening Balance system category
- `POST /v1/accounts/:id/adjust-balance` — auto-sets Adjustment system category
- `POST /v1/transactions` with `type IN ('transfer_in', 'transfer_out')` — auto-sets Transfer In/Out

Prevents misuse and keeps the flag-based filtering clean.

### 4.3 6 system categories, not 3

Each system concept (Opening, Adjustment, Transfer) needs both income and expense variants since categories match transaction direction. 6 rows per user at registration is negligible.

### 4.4 Three-layer depth limit

Rejected: unlimited nesting (complex queries, UI), single-level (too restrictive). Three layers covers 99% of real category hierarchies. Enforced at the API layer via parent-chain traversal.

### 4.5 Soft-delete with display-skip

Categories with transactions can't hard-delete without losing references. Soft-delete preserves integrity. The UI display-skip behavior keeps the visual tree clean:

- `A → B (archived) → C` displays as `A → C`
- `C.parent_id` unchanged (still points to archived B)
- Restoring B puts it back in the tree automatically

Reference consistency: soft-deleted categories still resolve when transactions join on `category_id` — name still renders, with optional "(archived)" suffix in UI.

### 4.6 Hard-delete children shift to grandparent

When a category is hard-deleted (either direct delete with no transactions, or permanent delete from archived), its children re-parent to its former parent. This keeps the visual tree close to what the user was seeing in the display-skip state.

If the deleted category was a root, children become roots.

### 4.7 Archive stays until user acts

Phase 1: archived categories are never auto-purged. They sit in Archived until user either restores or permanently deletes.

Rationale: archive is a useful state (undo by reactivating). Silent auto-purge when last transaction moves could surprise users.

Phase 3+ could add a scheduled cleanup job if archive clutter becomes a complaint.

### 4.8 Auto-reparent on restore when parent is archived

If the immediate parent of a restoring category is still archived, silently set the restored category's `parent_id` to the nearest active ancestor (or NULL if none exist).

Avoids the weird state of an active category parented to an archived one. User can always re-reparent manually afterward.

### 4.9 User can change `parent_id` freely

No restrictions beyond the normal rules: target must be same type, active, not system, not create a cycle, not exceed depth. Users reorganize their categories over time — let them.

### 4.10 Uniqueness per (user, type, parent_id)

Allows the same name under different parents ("Travel > Food" and "Home > Food" both OK) but not among siblings ("Food" can't appear twice under the same parent at the same type). Case-insensitive. Archived rows excluded from the uniqueness check — so users can archive a category and reuse its name.

### 4.11 Tags flat, case-insensitive, hard-delete only

- No hierarchy — tags are labels, not taxonomy
- Unique per user, case-insensitive — "Work" = "work" (stored as-entered, compared lowercased)
- Hard delete always — `transaction_tags` rows cascade; tag removed from all transactions at once
- Usage_count in responses helps users identify rarely-used tags for cleanup

### 4.12 Free-form icon strings

Phase 1 stores icons as plain strings. Client interprets them against its own icon library (likely Material Icons identifier). Backend doesn't validate. Phase 2+ may introduce a curated enum if drift becomes a problem.

### 4.13 Starter seed at registration, template picker later

~28 starter user categories are seeded at registration in English. Users can freely rename, move, or delete any of them. This removes day-one friction vs. an empty category list.

Localization (Thai names) comes in Phase 2 when i18n ships.

Phase 4+ adds a template picker at onboarding — choose "Default," "Student," "Family," "Business," etc. Each template is a named set of starter categories.

### 4.14a Drag-to-reorder, single atomic save

The Manage Categories screen has a long-press-to-reorder mode (§6). Reordering can move a row up/down among siblings **and** change its depth (e.g. promote a sub-category to a root). To keep the sibling-sort invariant intact during what's effectively a multi-row mutation, the client stages all changes locally then sends them as one `PATCH /v1/categories/reorder` (§3.13).

Why not per-row PUTs:
- A single drag-drop can shift `parent_id` *and* `sort_order` on multiple rows. Per-row PUTs would briefly produce a state where two siblings share a `sort_order`, or where a row's `parent_id` points at the previous-batch tree.
- Network failure mid-batch is recoverable (transaction rolls back) only with the atomic endpoint.

`sort_order` is intentionally not exposed on `POST` / `PUT` — those endpoints are for create / metadata edits. All sibling reordering goes through §3.13.

### 4.14b Color inheritance from L1 (client convention)

The data model stores `color` per row, but the UI **displays** every row in a subtree using its L1 ancestor's color. Why: the user picks a single color for "Food" and expects "Food → Restaurants" and "Food → Restaurants → Tipping" to inherit it. Storing the L1 color on every descendant would scatter the source of truth and break when L1's color changes.

Backend stores whatever the client sends. The client either:
- Sends the L1 color when creating L2/L3 rows (current Phase 1a app behavior), so the data is self-consistent if displayed standalone, **or**
- Sends `null` and resolves the L1 color at render time.

Both are valid; backend doesn't enforce.

### 4.14c `include_in_report` defaults for seed categories

Most seeded categories ship with `include_in_report = TRUE`. Exceptions (seeded `FALSE`) are conceptually "money movement, not spending":
- *Adjustment* (system, both directions)
- *Transfer In/Out* (system)
- *Lending* / *Repayment* / *Reimbursement* (when present in the starter seed)

Rationale: a transfer between user-owned wallets isn't an expense; lumping it into "monthly spending" misleads the user. The flag is per-row so users can override.

### 4.14 System category names can be renamed

System categories have `is_system = true` but `name` is editable. Users might want to localize ("Transfer Out" → "เงินโอนออก") or personalize. The system identity is the row (referenced by FK and `is_system` flag), not the string.

---

## 5. Open questions

- **Bulk recategorize tool.** When a user archives a category with 42 transactions, they currently re-categorize one-by-one. Phase 2+ `POST /v1/transactions/bulk-recategorize` with `{ from_category_id, to_category_id }` would speed this up.
- **Template library.** Phase 4+. Schema: templates themselves could be JSONB blobs or a separate `category_templates` table. Deferred until the feature is scoped.
- **Export / import user's category set.** Related to templates. Export as JSON; import applies to a new user or overlays an existing user (conflict handling TBD).
- **Icon enum vs free-form.** Keep free-form unless client-side drift becomes a problem.
- **Per-category budgets reference.** Budgets module references categories; when a category is archived, its budget behavior — freeze at last state? archive too? — decide in budgets spec.

---

## 6. Status

- **Phase** — spec; Phase 1a backend partially landed (CRUD + system seed + starter seed). Reorder endpoint + new fields land with migration `000008`.
- **Last updated** — 2026-04-29
- **Version** — 0.2
- **Changelog**
  - **0.2 (2026-04-29)** — Added `sort_order`, `include_in_report`, `description`, `note` to `categories`; added `icon` to `tags`. Added `PATCH /v1/categories/reorder` (§3.13). Added §4.14a–c notes covering single-atomic-save, color inheritance, and `include_in_report` defaults.
  - **0.1 (2026-04-24)** — Initial draft (3-layer tree, system categories + seed, soft-delete with display-skip).
