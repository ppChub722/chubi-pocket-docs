# 02 — Users (profile & preferences)

Profile information and user preferences. Reads and writes the `users` table's non-identity columns, the `user_preferences` table, and (from Phase 2) the `notification_preferences` table.

**Identity concerns** (username, email, password, tokens, OAuth, sessions data) live in [`01-auth.md`](01-auth.md). This file owns "how the app serves this user" — their display, currency, language, theme, what they want to be notified about, and their account status (active / inactive / banned).

Global conventions (base URL, error envelope, data types, HTTP verbs) are in [`overview.md`](overview.md).

---

## Phase summary

| Concern | Phase 0/1 | Phase 2 | Phase 3 |
|---|---|---|---|
| `GET`/`PUT /v1/users/me` (display_name, avatar_url, currency) | ✅ | ✅ | ✅ |
| `status`: `active` / `inactive` (self-deactivate + reactivate) | ✅ | ✅ | ✅ |
| `user_preferences` table (JSONB; Phase 1 uses `timezone` only) | ✅ | ✅ | ✅ |
| Theme + language user-facing switchers | — | ✅ | ✅ |
| Notification preferences | — | ✅ | ✅ |
| `status`: `pending_verification` | — | ✅ | ✅ |
| Avatar upload (own storage) | — | — | ✅ |
| Sessions list + revoke | — | — | ✅ |
| `status`: `banned` (admin-triggered) | — | — | ✅ |
| Account deletion (+ 30-day grace, anonymize-on-archive) | — | — | ✅ |
| `status`: `pending_deletion`, `archived` | — | — | ✅ |
| Data export (GDPR / PDPA) | — | — | ✅ |

---

## 1. Schema

Tables owned by this module: `users` (additions), `user_preferences`, `notification_preferences` *(Phase 2+)*.

Full column definitions, constraints, and indexes: see [`../database/schema.md#02--users`](../database/schema.md#02--users).

The base `users` table is defined in [`01-auth.md`](01-auth.md). This module writes the editable profile columns (`display_name`, `avatar_url`, `currency`, `status`).

---

## 2. API

All endpoints require authentication unless stated. Paths rooted at `/api`.

### 2.1 Phase 0/1 endpoints

#### `GET /v1/users/me`

Get the authenticated user's full profile, including preferences.

**Response — `200 OK`:**

```json
{
  "id": "0190e3f8-e1b4-7c5d-8e7a-9f1b8c3e6d5f",
  "username": "alice",
  "email": "alice@example.com",
  "email_verified_at": null,
  "display_name": "Alice Smith",
  "currency": "THB",
  "avatar_url": null,
  "status": "active",
  "preferences": {
    "timezone": "Asia/Bangkok",
    "theme": "system",
    "language": "th"
  },
  "created_at": "2026-04-24T10:00:00Z",
  "updated_at": "2026-04-24T10:00:00Z"
}
```

*Phase 3+ response additionally includes:*

```json
{ "two_factor_enabled": false }
```

**Errors:** `401 UNAUTHORIZED`.

#### `PUT /v1/users/me`

Update profile and preference fields. Partial — only provided fields change. Provided preference keys merge into the existing `preferences` JSONB (doesn't overwrite the whole blob).

**Request body:**

```json
{
  "display_name": "Alice S.",
  "avatar_url": "https://cdn.example.com/avatars/alice.png",
  "currency": "USD",
  "preferences": {
    "timezone": "Europe/London",
    "theme": "dark"
  }
}
```

| Field | Type | Rules |
|---|---|---|
| `display_name` | string | 1–100 chars; any Unicode |
| `avatar_url` | string \| null | Valid URL (Phase 1/2 accepts any URL; Phase 3 only accepts uploads via `POST /v1/users/me/avatar`) |
| `currency` | string | ISO 4217 |
| `preferences` | object | Partial — keys validated against allowed schema (see §1.2); unknown keys → `VALIDATION_ERROR` |

**Response — `200 OK`:** full user object.

**Errors:** `400 VALIDATION_ERROR`, `401`.

**Side effects:**

- Changing `currency` does **not** retroactively convert existing transaction amounts (see §3.4)
- Changing `preferences.timezone` immediately affects period boundaries for budgets, scheduled transactions, and "today" queries (see §3.6)

#### `POST /v1/users/me/deactivate`

Soft-deactivate the account. Sets `status = 'inactive'`. User is logged out (Phase 2+: refresh tokens revoked) but data is preserved. User can reactivate anytime.

**Request body:** none required (optional confirmation password in Phase 2+).

**Response — `200 OK`:**

```json
{ "message": "Account deactivated", "status": "inactive" }
```

#### `POST /v1/users/me/reactivate`

Reverse a deactivation. Available to users whose status is `inactive`. This is one of two endpoints accessible to non-`active` users (the other is `GET /v1/users/me`).

**Response — `200 OK`:**

```json
{ "message": "Account reactivated", "status": "active" }
```

**Errors:** `400 ALREADY_ACTIVE` (status was already `active`), `401`.

---

### 2.2 Phase 2+ endpoints

#### `GET /v1/users/me/notification-preferences`

Get all notification preferences for the user. Server returns the union of: rows in `notification_preferences` + default values for every defined event type that doesn't yet have a row.

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "event_type": "split_assigned",
      "push_enabled": true,
      "email_enabled": false,
      "in_app_enabled": true
    },
    {
      "event_type": "settlement_received",
      "push_enabled": true,
      "email_enabled": false,
      "in_app_enabled": true
    }
  ]
}
```

#### `PUT /v1/users/me/notification-preferences/:event_type`

Upsert preferences for a single event type.

**Request body:**

```json
{
  "push_enabled": false,
  "email_enabled": true,
  "in_app_enabled": true
}
```

**Errors:** `400 VALIDATION_ERROR` (unknown `event_type`), `401`, `404`.

---

### 2.3 Phase 3+ endpoints

#### `POST /v1/users/me/avatar`

Upload an avatar image. Multipart request.

**Request:** `multipart/form-data` with field `file` (image; PNG / JPEG; ≤ 5 MB; max dimension 2048px).

Backend resizes to `512x512`, stores in the same object storage as receipt photos (provisioned in Phase 2), writes the resulting URL into `users.avatar_url`.

**Response — `200 OK`:**

```json
{
  "avatar_url": "https://cdn.chubipocket.com/avatars/0190e3f8.png"
}
```

**Errors:** `400 VALIDATION_ERROR` (wrong format, too big), `401`, `413 PAYLOAD_TOO_LARGE`.

#### `DELETE /v1/users/me/avatar`

Remove the avatar. Clears `avatar_url` (back to null) and deletes the stored file.

#### `GET /v1/users/me/sessions`

List the user's active refresh-token sessions (see [`01-auth.md §1.2`](01-auth.md) for the underlying table).

**Response — `200 OK`:**

```json
{
  "data": [
    {
      "id": "0190e4...",
      "current": true,
      "user_agent": "ChubiPocket-Android/1.0.3",
      "ip": "203.0.113.42",
      "issued_at": "2026-04-20T08:00:00Z",
      "expires_at": "2026-04-27T08:00:00Z"
    }
  ]
}
```

#### `DELETE /v1/users/me/sessions/:id`

Revoke a specific session. Cannot revoke the current session (use `/auth/logout`).

#### `POST /v1/users/me/sessions/revoke-all`

Revoke every session except the current one.

#### `DELETE /v1/users/me`

Delete own account. Sets `status = 'pending_deletion'`. A scheduled job anonymizes and archives the row after 30 days — the `users` row is **never hard-deleted** (see [§3.11](#311-account-deletion-anonymizes-after-a-30-day-grace-period-no-hard-delete)).

During the grace period, the user cannot log in (reactivation requires a support escalation — no self-serve undelete in initial scope).

**Request body:**

```json
{ "current_password": "..." }
```

**Response — `200 OK`:**

```json
{
  "message": "Account scheduled for deletion",
  "status": "pending_deletion",
  "archive_at": "2026-05-24T10:00:00Z"
}
```

#### `GET /v1/users/me/export`

Request a full data export (GDPR / PDPA). Returns a job ID; user receives an email with a download link when ready.

**Response — `202 Accepted`:**

```json
{
  "job_id": "0190e4...",
  "status": "processing",
  "estimated_ready_at": "2026-04-24T10:05:00Z"
}
```

Export format: ZIP containing JSON for each table the user owns + CSV for transactions.

---

## 3. Design decisions

### 3.1 Why separate users module from auth

Both operate on the `users` table but represent different concerns:

- **Auth** is high-stakes — password, tokens, OAuth, sessions. Security review lives there.
- **Users** is low-stakes — profile, preferences, status, settings. UX changes are frequent.

Splitting keeps security review scoped; rest of the app's settings surface grows in `users` without touching auth.

### 3.2 Preferences as 1:1 JSONB

Three shapes were considered: typed columns, key-value rows, JSONB. Chose JSONB:

- **Zero migrations** when adding new preferences — just define a new key in the app layer
- **One row per user** — clean 1:1 with `users`
- **Fast enough** — PostgreSQL JSONB queries (`preferences->>'theme'`) are near-column speed
- **App-layer typing** — the allowed keys + allowed values are defined in Go code; the DB doesn't care
- **Future-friendly** — as preferences grow (dashboard layout, date format, number format, per-category defaults), no schema churn

Indexing individual keys: if a preference becomes query-hot (e.g., filter users by language for a feature rollout), add a GIN index on `preferences` or a generated column.

### 3.3 Status column over boolean `is_active`

`is_active` is fine for two states. Once you add `banned`, `pending_verification`, `pending_deletion`, `archived`, a boolean can't describe them. Starting with a string enum avoids a future migration from boolean to enum.

CHECK constraint grows by phase — adding values is a single-line migration.

### 3.4 Currency change does not retroactively convert

Changing the user's default `currency` affects only new transactions going forward. Historical transactions keep their original currency. Phase 2 adds per-transaction currency + display-time conversion for the dashboard.

### 3.5 Deactivated users can still reactivate themselves

Two endpoints remain accessible to non-`active` users: `GET /v1/users/me` (see status) and `POST /v1/users/me/reactivate` (undo). All other requests get `403 ACCOUNT_INACTIVE`. Client uses this signal to show a "Reactivate your account" screen.

Rationale: forces users to email support for reactivation (alternative design) creates friction and an ops burden we don't need. Self-serve undo is fine — nothing destructive happens while inactive.

Banned users (Phase 3) do **not** get self-serve reactivation. `403 ACCOUNT_BANNED` blocks all endpoints including reactivation.

### 3.6 Timezone design — store calendar dates, use `timezone` for "now"

**Rule:** stored dates are calendar dates (no timezone info). The user's `preferences.timezone` is consulted only when the server interprets "now" to compute periods or ranges.

**Stored data is timezone-agnostic:**

- `transactions.date DATE` — "April 24," unambiguous
- `budgets.period_start`, `period_end` — calendar dates
- `projects.start_date`, `end_date` — calendar dates
- `scheduled_transactions.next_billing_date` — calendar date

**`preferences.timezone` is consulted when:**

| Question | Uses `timezone` |
|---|---|
| "What transactions happened today?" | ✅ (today in user's tz) |
| "This month's budget usage?" | ✅ (current month in user's tz) |
| "When does the next scheduled transaction fire?" | ✅ (midnight-crossing in user's tz) |
| "Show transaction dated 2026-04-20" | ❌ (calendar date is unambiguous) |

**Edge cases handled by this design:**

1. **Budget period crosses midnight.** User in Bangkok (+07); month ends at `2026-04-30 23:59:59+07` = `2026-04-30 17:00 UTC`. The rollover job checks every user's tz-relative midnight, not UTC midnight.

2. **Scheduled entry on day 31 in a 30-day month.** Policy: fire on the last day of the month. Same for day 30 in February. Implemented in [`11-scheduled-transactions.md`](11-scheduled-transactions.md).

3. **User changes timezone mid-month.** Period boundaries use the tz **at period start** (stored on the budget/recurring row as `period_timezone`). Prevents partial-period weirdness when a user moves.

4. **Cross-timezone split (Phase 1b).** Alice in Bangkok splits with Bob in London on April 24 Bangkok time (= April 23 London time). The split's stored `date` is whatever calendar date Alice chose. Bob sees it as April 24 on his app too — because that's the date Alice set, not "today in Bob's tz." No hidden mismatch.

**`created_at` and other `TIMESTAMPTZ` columns are real timestamps.** They're stored UTC, rendered in user's tz at display time. Used for audit, not business logic.

### 3.7 Notification preferences: lazy row creation

Rows in `notification_preferences` exist only when the user overrides a default. Initial reads compute default values in-app — server returns the union of (stored rows) + (defaults for unstored event types). Adding a new event type takes zero migration; user defaults apply automatically.

### 3.8 Sessions endpoint lives in users, not auth

Technically the data is in `refresh_tokens` (auth-owned). Philosophically it's settings — "manage where you're signed in." Users expect to find this under Settings, not in a security page. Placement is a UX choice; implementation reads auth's table.

### 3.9 2FA status reported here, configured in auth

`two_factor_enabled` (Phase 3+) appears in `GET /v1/users/me` so the settings screen can show state. Enable/disable flows live under `/auth/2fa/*` — they alter how login works.

### 3.10 `PUT` acts as `PATCH`

Per global convention ([`overview.md §3`](overview.md)). All `PUT /v1/users/me` fields are optional; only provided fields (including partial `preferences` keys) change. Doubled verbs complicate clients for minimal benefit.

### 3.11 Account deletion anonymizes after a 30-day grace period (no hard delete)

`DELETE /v1/users/me` sets `status = 'pending_deletion'`. After 30 days a scheduled job (Phase 3) **anonymizes** the row and sets `status = 'archived'` — the `users` row itself is never physically deleted.

**Anonymize step (terminal, irreversible):**
- `email` → `NULL`
- `display_name` → `'[deleted]'`
- `avatar_url` → `NULL`
- `password_hash` → `''` (login impossible)
- `status` → `'archived'`

**Why no hard delete:**
- `users.id` is referenced by `created_by_user_id` / `updated_by_user_id` on every table, plus owned tables (`accounts`, `transactions`, `categories`, ...) and shared tables (`project_members`, `contacts.linked_user_id`, splits, ...). Hard-deleting would either cascade-destroy other users' data (e.g., a project Alice was in) or force `SET NULL` on every audit reference, losing the historical record.
- Keeping the row preserves the audit trail and other users' linked data; anonymization satisfies PDPA/GDPR right-to-erasure for PII.

**Owned-data handling at archive time:** owned rows (Alice's `accounts`, `transactions`, `categories`, `tags`, `budgets`, `saving_goals`) are deleted via existing `ON DELETE CASCADE` FKs at archive time by manually deleting them in the same job — Phase 3 design detail. Shared/referenced rows (project memberships, contacts pointing to her, splits where she's a debtor or creditor) remain so other users' data stays intact.

**Pre-delete export:** `GET /v1/users/me/export` is prompted before the request is confirmed so users can keep a copy of their data.

**During grace period:** user cannot log in. Self-serve undelete is out of scope; restoration requires support contact (set `status` back to `active`). After archive, restoration is impossible — PII is gone.

---

## 4. Open questions

- **Profile visibility between linked contacts.** Phase 1b links a `contacts` row to a `users.id`. What fields does the contact owner see about the linked user? Proposed: `display_name` + `avatar_url` only. Design in the contacts spec when linking UX lands.
- **Per-device preferences.** User might want dark mode on phone, light on web. Not planned; add a per-device override JSONB if real demand appears (post-launch).
- **Language enforcement.** `language` is a hint for the client — does the server use it to localize error messages? Phase 2 decision.
- **Self-serve account-deletion undo.** 30-day grace period currently requires support contact to undo. A `POST /v1/users/me/restore` (with password) for the grace window is a reasonable addition — pending demand.
- **Avatar image retention.** When a user replaces their avatar, should the old file be deleted immediately or kept for N days (in case of undo)? Phase 3 decision.

---

## 5. Status

- **Phase** — spec; Phase 0 implementation pending
- **Last updated** — 2026-04-24
- **Version** — 0.2 (user_preferences JSONB table; status column; avatar upload moved to Phase 3; timezone design documented)
