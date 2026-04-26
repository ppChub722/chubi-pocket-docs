# 07 — Contacts

People you split bills with — your contact book. A contact is a placeholder for a real person: it may or may not be linked to an actual app user. When linked, splits referencing the contact become visible to that user (they see "I owe Alice"). When unlinked, the contact is just a named record in your book.

This module owns `contacts` and `contact_invites`. Splits (which reference contacts) live in [`06-shared-expenses.md`](06-shared-expenses.md); the split lifecycle as it relates to contacts is documented here (§3, §4.2).

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 0/1 | Phase 2 | Phase 3 |
|---|---|---|---|
| CRUD on contacts | ✅ | ✅ | ✅ |
| Absorb `person_name` strings into a contact | ✅ | ✅ | ✅ |
| Archive / restore contacts | ✅ | ✅ | ✅ |
| Invite-based linking to app user | ✅ | ✅ | ✅ |
| Unlink (keep contact, clear app_user_id) | ✅ | ✅ | ✅ |
| Delete (hard; restore `person_name` on splits) | ✅ | ✅ | ✅ |
| Fuzzy match for absorb / autocomplete | — | ✅ | ✅ |
| Merge two contacts | — | ✅ | ✅ |
| Consent hardening + audit log on linking | — | — | ✅ |
| Invite rate limiting / abuse prevention | — | — | ✅ |

---

## 1. Schema

Tables owned by this module: `contacts`, `contact_invites`.

Full column definitions, constraints, and indexes: see [`../database/schema.md#07--contacts`](../database/schema.md#07--contacts).

Codes are single-use. An invite is "live" when `accepted_at IS NULL AND expires_at > NOW()`. At most one live invite per contact at a time (API-layer check).

---

## 2. `person_name` lifecycle — how contacts interact with splits

`shared_expense_splits` has two columns that together identify who owes:

- `person_name` — free-text note ("mom", "MoM", "bf")
- `contact_id` — FK to a contact row

**Invariant:** exactly one is set at any moment. Never both, never neither.

- `person_name` set, `contact_id = NULL` — unnamed note; a free-text placeholder
- `person_name = NULL`, `contact_id` set — structured contact reference

Enforced at DB level via CHECK constraint on `shared_expense_splits` (spec in [`06-shared-expenses.md`](06-shared-expenses.md)).

### 2.1 Lifecycle

```
[Start] User types "mom" directly on a split
  → split: person_name = "mom", contact_id = NULL

[Consolidate — absorb] User creates contact "Mom", absorbs the "mom" strings
  → split: person_name = NULL, contact_id = Mom.id
  → display: "Mom" (or contact.nickname if set)

[Link — invite accepted] Actual Mom joins the app and accepts the invite
  → contact.app_user_id = mom_user.id
  → Mom's app now shows "I owe Alice ฿X" for those splits
  → split row unchanged (still contact_id = Mom.id)

[Unlink — soft] Alice unlinks the contact
  → contact.app_user_id = NULL
  → Mom's view disappears
  → split row unchanged; contact still exists as an unlinked contact
  → Alice can re-invite later to re-link

[Delete — hard] Alice deletes the contact
  → For each split where contact_id = this contact:
      SET person_name = COALESCE(contact.nickname, contact.display_name)
      SET contact_id = NULL
  → DELETE the contact row
  → Display on splits: back to a free-text note using the last-known contact name
```

Restoring: if user wants the contact back, they create a new contact and re-absorb. Original typos ("MoM", "mOMMO") aren't restored — splits display the contact-name snapshot from delete time.

---

## 3. API

All endpoints require authentication. Paths rooted at `/api`.

### 3.1 `POST /v1/contacts`

Create a contact. Optionally absorb existing `person_name` strings in the same request.

**Request body:**

```json
{
  "display_name": "Mom",
  "nickname": "Mommy",
  "email": "mom@example.com",
  "phone": "+66-123-456789",
  "notes": "Always calls on Sundays",
  "icon": "person-heart",
  "absorb_names": ["mom", "MoM", "Mommy"]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `display_name` | string | ✅ | 1–100 chars |
| `nickname` | string | — | 1–100 chars; if set, preferred in UI |
| `email` | string | — | Valid RFC 5322 |
| `phone` | string | — | Free-form |
| `notes` | string | — | — |
| `icon` | string | — | Preset identifier |
| `absorb_names` | array | — | Optional list of `person_name` strings to wire to this contact at create time (case-insensitive match on existing splits) |

**Backend flow:**

1. Begin DB transaction
2. Insert the contact row
3. If `absorb_names` present:
   ```sql
   UPDATE shared_expense_splits
     SET contact_id = :new_contact_id, person_name = NULL
     WHERE user_id = :user_id
       AND contact_id IS NULL
       AND LOWER(person_name) IN (:absorbed_names_lowercased);
   ```
4. Return the contact with a count of absorbed splits

**Success — `201 Created`:**

```json
{
  "contact": {
    "id": "0190e5...",
    "display_name": "Mom",
    "nickname": "Mommy",
    ...
  },
  "absorbed_count": 10
}
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid field |
| 401 | `UNAUTHORIZED` | |

### 3.2 `GET /v1/contacts`

List contacts owned by the user.

**Query parameters:**

| Name | Description |
|---|---|
| `status` | `active` (default) \| `archived` \| `all` |
| `linked` | `true` \| `false` — filter by whether `app_user_id` is set |
| `search` | Case-insensitive substring match on `display_name` / `nickname` |

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "0190e5...",
      "display_name": "Mom",
      "nickname": "Mommy",
      "email": "mom@example.com",
      "phone": "+66-...",
      "notes": "...",
      "icon": "person-heart",
      "app_user_id": "0190e5-user...",
      "linked_user": {
        "display_name": "Somying Smith",
        "avatar_url": "https://..."
      },
      "status": "active",
      "split_count": 12,
      "outstanding_amount": 450.00,
      "created_at": "..."
    }
  ]
}
```

`linked_user` is included only when linked. Exposes only `display_name` + `avatar_url` — never email, username, or phone from the linked user (privacy boundary; see §4.3).

### 3.3 `GET /v1/contacts/:id`

Get a single contact with computed fields (`split_count`, `outstanding_amount`, invite status if present).

### 3.4 `PUT /v1/contacts/:id`

Update contact fields. Partial.

Editable: `display_name`, `nickname`, `email`, `phone`, `notes`, `icon`.
Not editable: `app_user_id` (use link / unlink endpoints), `status` (use archive / restore), `user_id`.

**Errors:** `400 VALIDATION_ERROR`, `401`, `403`, `404`.

### 3.5 `GET /v1/contacts/unlinked-names`

List distinct `person_name` values across the user's splits where `contact_id IS NULL`, with usage counts. Used by the "absorb" wizard on the contact creation screen.

**Response — `200 OK`:**

```json
{
  "data": [
    { "name": "mom", "count": 5 },
    { "name": "MoM", "count": 3 },
    { "name": "Mommy", "count": 2 }
  ]
}
```

Order: by count descending. Case-preserving (the exact strings as typed).

### 3.6 `POST /v1/contacts/:id/absorb`

Absorb additional `person_name` strings into an existing contact.

**Request body:**

```json
{ "names": ["Mom", "mom", "mommy", "mama"] }
```

**Backend flow:** same UPDATE as in §3.1 step 3.

**Response — `200 OK`:**

```json
{ "absorbed_count": 8 }
```

Match is case-insensitive exact in Phase 1b. Phase 2+ may add fuzzy matching.

### 3.7 `POST /v1/contacts/:id/invite`

Generate a live invite code for linking this contact. Invalidates any previously live invite for the same contact.

**Request body:** none.

**Response — `200 OK`:**

```json
{
  "invite_code": "K3F8R4M7",
  "expires_at": "2026-05-02T10:00:00Z",
  "shareable_url": "https://chubipocket.com/invite/K3F8R4M7"
}
```

Code is 8 chars, alphanumeric (unambiguous set — no `0`, `O`, `1`, `I`).

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `ALREADY_LINKED` | Contact already has `app_user_id` set |
| 401 / 403 / 404 | | |

### 3.8 `POST /v1/contacts/accept-invite`

Called by the **potential linked user** (not the contact owner). Accepts an invite code.

**Request body:**

```json
{ "invite_code": "K3F8R4M7" }
```

**Backend flow:**

1. Look up invite; check not expired, not already accepted
2. Fetch the contact row
3. Check that contact.user_id != caller.user_id (can't accept your own invite)
4. Check uniqueness: does caller already have a contact linked to the owner, or does the owner already have a contact linked to this user?
   - Failure → `409 ALREADY_LINKED` with details
5. Set `contact.app_user_id = caller.user_id`
6. Set `invite.accepted_at = NOW()`, `invite.accepted_by_user_id = caller.user_id`
7. Return the contact (owner's view) and a confirmation

**Success — `200 OK`:**

```json
{
  "message": "Link accepted",
  "linked_to": {
    "owner_display_name": "Alice",
    "contact_display_name": "Mom"
  }
}
```

**Errors:** `400 INVALID_INVITE`, `400 INVITE_EXPIRED`, `400 INVITE_ALREADY_USED`, `400 CANNOT_INVITE_SELF`, `409 ALREADY_LINKED`.

### 3.9 `DELETE /v1/contacts/:id/invite`

Cancel a pending invite (contact owner only).

**Response — `200 OK`:** `{ "message": "Invite cancelled" }`.

### 3.10 `POST /v1/contacts/:id/unlink`

Clear `app_user_id`. Contact stays in the book with all history. The linked user's view of splits referencing this contact disappears.

**Request body:** none.

**Response — `200 OK`:** the contact with `app_user_id = null`.

**Errors:** `400 NOT_LINKED` (contact wasn't linked), `401`, `403`, `404`.

### 3.11 `POST /v1/contacts/:id/archive`

Soft-hide the contact. Sets `status = 'archived'`. Splits still reference it; contact doesn't appear in pickers / autocomplete.

**Response — `200 OK`:** the contact with `status = archived`.

### 3.12 `POST /v1/contacts/:id/restore`

Reactivate an archived contact.

**Response — `200 OK`:** the contact with `status = active`.

**Errors:** `400 NOT_ARCHIVED`.

### 3.13 `DELETE /v1/contacts/:id`

Hard-delete the contact. Restores `person_name` on all referencing splits.

**Backend flow:**

1. If `app_user_id` set, effectively unlinks (the linked user's view disappears)
2. `UPDATE shared_expense_splits SET person_name = COALESCE(contact.nickname, contact.display_name), contact_id = NULL WHERE contact_id = :id`
3. Delete `contact_invites` rows for this contact (cascade)
4. Delete the contact row

**Response — `200 OK`:**

```json
{
  "message": "Contact deleted",
  "splits_restored": 12
}
```

**Errors:** `401`, `403`, `404`.

---

## 4. Design decisions

### 4.1 Contact is a placeholder for a real person — with or without app account

Contacts exist to let users split bills with people who may never join the app. If the contact eventually joins, a link connects Alice's contact to the new user — Alice doesn't have to re-enter anything; the split history automatically becomes visible to both parties.

Three states along this journey:

1. **Ad-hoc note** (`person_name` set, no contact) — user hasn't bothered to create a contact; the split just has a typed name
2. **Contact, not linked** (contact exists, `app_user_id = NULL`) — structured but private to the owner
3. **Contact, linked** (both set) — cross-user visibility; both sides see the shared debt

Users move freely between states. Downgrading (unlink, then delete) is always available.

### 4.2 `person_name` is the free-text note; `contact_id` is the structured reference

On every `shared_expense_splits` row, exactly one of the two is set:

- `person_name = "mom"`, `contact_id = NULL` — free-text note
- `person_name = NULL`, `contact_id = <uuid>` — structured

CHECK constraint enforces this at the DB level (defined in [`06-shared-expenses.md`](06-shared-expenses.md)).

**Pattern B:** absorb clears `person_name` and sets `contact_id`. Delete reverses: restores `person_name` from the contact's `nickname || display_name`, clears `contact_id`. Trade-off: original typo variants lost on absorb; user sees a clean single label afterward. Industry-standard choice (Splitwise does effectively this when a guest is promoted).

### 4.3 Privacy boundary on linked users

When a linked user (Mom) queries her debts to Alice, she sees only what's necessary:

- Split details (amount, date, description, settlement status)
- Alice's `display_name` + `avatar_url` — from `users` table, projected at API layer

Mom does **not** see:

- Alice's email, phone, username
- Alice's other accounts, transactions, categories
- Other contacts in Alice's book
- Other users Alice is linked to

Enforced at the API response-projection layer. Mom can only see splits where `contact.app_user_id = her.id`.

### 4.4 Icon + avatar fallback

Display precedence for rendering a contact:

1. Linked user's `avatar_url` (if `app_user_id` set and user has one)
2. Linked user's `user_icon` *(Phase 2; preset icon on user profile — new `users` column)*
3. Contact's `icon`
4. Generic default icon (client-side)

Allows users to: set a real photo on their profile for friends who link, or fall back to a playful preset icon picker. Contact owners who don't know the linked person's style pick an icon they like.

### 4.5 Uniqueness: one contact per (user, app_user_id)

A given user cannot have two contacts both linked to the same app user. Prevents duplicate debt streams flowing to the linked user (Mom seeing "I owe Alice ฿100" twice from two different contacts).

Enforced via partial UNIQUE index; attempting to link a second contact returns `409 CONTACT_ALREADY_LINKED`.

Phase 2+ will add a **merge contacts** tool to consolidate two unlinked contacts into one. For now: user must unlink one of the two before linking.

### 4.6 Invite-only linking, no username/email search

The link flow requires the contact owner to generate a code and share it out-of-band (copy, QR, chat). The linked user enters the code to accept. This is more private than username/email search:

- No enumeration of app users
- No "who's on the app?" directory
- No accidental linking; both parties actively participated

Codes are 8 chars, alphanumeric with unambiguous set (no `0/O/1/I`), 7-day TTL. At most one live invite per contact at a time (generating a new one invalidates the old).

**Phase 3 hardening:** additional consent confirmation screen for the accepting user; rate limiting on invite generation; audit log for link/unlink events.

### 4.7 Unlink keeps the contact; delete destroys it

Three levels of "removing" a contact:

| Action | Effect on contact | Effect on `app_user_id` | Effect on splits |
|---|---|---|---|
| **Unlink** | stays; remains in book | cleared → NULL | unchanged (still reference the contact); linked user loses view |
| **Archive** | stays; `status = archived` | unchanged | unchanged; contact hidden from pickers; linked user loses view while archived |
| **Delete** | hard-deleted | — | `contact_id = NULL`, `person_name` restored from contact name |

Rationale: different user intents deserve different actions. "Stop sharing" shouldn't destroy the contact. "Hide for now" shouldn't destroy history. "Clean up for real" does.

### 4.8 Block self-link

`user_id != app_user_id` enforced at DB level. Alice cannot create a contact that links to herself. Would cause pathological queries (you'd see splits you owe yourself).

If Alice really wants to split with "me" (rare — e.g., tracking reimbursements between personal and business accounts for tax purposes), use a plain person_name or create a separate contact without linking.

### 4.9 Absorb on create vs. standalone endpoint

Two paths, both supported:

- `POST /v1/contacts` with `absorb_names` — single-request flow for the wizard UX. User creates the contact and wires existing notes in one action.
- `POST /v1/contacts/:id/absorb` — later-addition flow. User realizes they have more typos to fold in; wires them without creating a new contact.

Both funnel to the same UPDATE query internally.

### 4.10 `GET /v1/contacts/unlinked-names` powers the wizard

When the user taps "New contact," client calls this endpoint first to populate the "which names should this contact absorb?" checklist. Returns distinct `person_name` values (case-preserving) with usage counts, ordered by count descending. Phase 2+ adds fuzzy grouping suggestions.

---

## 5. Open questions

- **Phase 2 fuzzy matching.** Levenshtein distance, phonetic (Soundex / Metaphone), or just case-insensitive + trimmed? Matters for the "we found similar names" suggestion UI.
- **Contact-to-contact merge (Phase 2+).** When a user has two unlinked contacts that turn out to be the same person, a merge action consolidates them. Backend: pick target, move splits, delete source. Needs UX design.
- **Invite code sharing format.** URL (`https://chubipocket.com/invite/K3F8R4M7`) is more phone-friendly than raw codes. Both returned in §3.7 response so clients can choose.
- **Expiring unaccepted invites.** Phase 3 could clean up old `contact_invites` rows with a scheduled job (retain for audit, or hard-delete after 90 days).
- **Import from device address book.** Phase 2 could add "import from phone" UX — surface contacts with email/phone that happen to match an app user for one-tap linking. Privacy-sensitive; would require explicit user consent.
- **Bulk contact creation.** When onboarding a new user, allow them to bulk-import a list of contact names. Phase 2+ nice-to-have.
- **Linked-user side UX.** When Mom accepts Alice's invite, she sees debts immediately. Does she also get a "you're now linked to Alice" notification? Phase 2 notifications decision.

---

## 6. Status

- **Phase** — spec; Phase 1b implementation pending
- **Last updated** — 2026-04-25
- **Version** — 0.1 (initial draft; Pattern B for person_name, separate unlink/archive/delete, invite-only linking, block duplicate links)
