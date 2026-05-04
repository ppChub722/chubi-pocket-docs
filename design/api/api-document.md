# API Document

Single source of truth for every HTTP endpoint exposed by the Chubi Pocket backend.

**Audience:** backend developers (implementation contract), frontend developers (consumption contract), AI tools (codegen / type generation).

**Companion docs:**
- Behavior, flows, business rules → [`../spec/`](../spec/) (per-module)
- Database schema → [`../database/schema.md`](../database/schema.md)
- Frontend integration → [`../frontend/app/`](../frontend/app/)

This document is the **canonical API contract**. Postman / OpenAPI exports are derived from it (generated on demand, not committed).

---

## Table of contents

| Section | Covers |
|---|---|
| [Conventions](#conventions) | Base URL, auth, errors, pagination, data formats |
| [01 — Auth](#01--auth) | Register, login, logout, password, refresh, email verification, OAuth, username change |
| [02 — Users](#02--users) | Profile, preferences, sessions, account deletion, data export *(pending)* |
| [03 — Accounts](#03--accounts) | Account CRUD, archive *(pending)* |
| [04 — Transactions](#04--transactions) | Transaction CRUD, transfers, splits *(pending)* |
| [05 — Categories & Tags](#05--categories--tags) | Category tree, tag list *(pending)* |
| [06 — Shared Expenses](#06--shared-expenses) | Split create / settle / debt-report *(pending)* |
| [07 — Contacts](#07--contacts) | Contact book, invites, linking *(pending)* |
| [08 — Budgets](#08--budgets) | Budget CRUD, overview *(pending)* |
| [09 — Saving Goals](#09--saving-goals) | Goal CRUD, progress *(pending)* |
| [10 — Projects](#10--projects) | Projects, members, invites, project transactions (with splits), per-row marks |
| [11 — Scheduled Transactions](#11--scheduled-transactions) | Recurring + installments *(pending)* |
| [12 — Personal Debts](#12--personal-debts) | Debt tracking *(pending)* |
| [13 — Notifications](#13--notifications) | Inbox, settings *(pending)* |

---

## Conventions

### Base URL

```
https://api.chubipocket.com/api
```

- Every path below is relative to this base.
- **Versioned from day 1.** All paths carry a `/v1/` prefix (e.g., `/v1/auth/login`). When a breaking change later requires a new version, `/v2/*` is added alongside `/v1/*` and both serve concurrently during the deprecation window. Adopting `/v1` from launch eliminates the awkward "what is the unversioned API?" moment that happens when versioning is bolted on later.

### Authentication

All endpoints require a Bearer token in the `Authorization` header **except** the public endpoints listed below.

```
Authorization: Bearer <access_token>
```

**Public endpoints (no auth required):**
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh` *(Phase 2+)*
- `POST /v1/auth/verify-email/confirm` *(Phase 2+)*
- `POST /v1/auth/password-reset/request` *(Phase 2+)*
- `POST /v1/auth/password-reset/confirm` *(Phase 2+)*
- `POST /v1/auth/google` *(Phase 3+)*
- `POST /v1/projects/accept-invite` *(invite codes are URL-shareable)*
- Contact-invite acceptance endpoints (TBD per [07](#07--contacts))

**Token strategy by phase:** Phase 0/1 uses a single 30-day JWT; Phase 2+ uses 15-min access + 7-day refresh; Phase 3+ adds an access-token blocklist for instant revocation. See [01-auth.md §3.6](../spec/01-auth.md#36-phased-token-strategy).

**Errors:**
- Missing or invalid token → `401 UNAUTHORIZED`
- Authenticated but not authorized for the resource → `403 FORBIDDEN`

### Request / response format

- `Content-Type: application/json` for both requests and responses.
- UTF-8 encoding.
- HTTP methods follow REST:
  - `GET` — read, no side effects
  - `POST` — create, or action endpoint (e.g., `/leave`, `/claim`, `/resolve-all`)
  - `PUT` — update; partial bodies allowed (only provided fields change)
  - `DELETE` — remove or soft-archive

### Status codes

| Code | When |
|---|---|
| `200 OK` | Successful read, update, or action |
| `201 Created` | Successful create — body returns the new resource |
| `204 No Content` | Successful pure delete with no meaningful body |

Most endpoints return `200` even on update/action for client simplicity. `204` is reserved for plain deletes.

### Error envelope

Every error response uses this shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

- `code` — stable, uppercase, snake-case identifier. **Clients key on this.**
- `message` — human-readable. May be localized in future. Clients should **not** parse it.

### Common error codes

These appear across many endpoints. Module-specific codes (e.g., `SPLITS_NOT_100`) are listed under their endpoints.

| Code | HTTP | When |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid token |
| `FORBIDDEN` | 403 | Authenticated but not allowed to access this resource |
| `NOT_FOUND` | 404 | Resource does not exist (or belongs to someone else — same response, no info leak) |
| `VALIDATION_ERROR` | 400 | Request body or params failed validation |
| `CONFLICT` | 409 | State conflict (e.g., duplicate email, already exists) |
| `RATE_LIMITED` | 429 | Too many requests *(Phase 3+)* |
| `INTERNAL_ERROR` | 500 | Server fault |

### Pagination

List endpoints that may return many rows support pagination via query parameters:

| Parameter | Default | Max | Description |
|---|---|---|---|
| `page` | 1 | — | 1-based page number |
| `per_page` | 20 | 100 | Items per page |

**Paginated response shape:**

```json
{
  "data": [ /* array of resources */ ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 142,
    "total_pages": 8
  }
}
```

Endpoints that always return a small bounded set (e.g., `/users/me`, `/budgets/overview`) return the resource directly without `data` / `pagination` wrappers.

### Sorting

List endpoints accept a `sort` query parameter with values like `field_asc` or `field_desc`:

```
GET /v1/transactions?sort=date_desc
```

Valid sort values are listed per endpoint. Default sort is documented per endpoint.

### Common filters

| Parameter | Type | Description |
|---|---|---|
| `from` | `YYYY-MM-DD` | Start date (inclusive) |
| `to` | `YYYY-MM-DD` | End date (inclusive) |
| `status` | enum | Filter by status value (depends on resource — typically `active` / `archived`) |
| `type` | enum | Filter by record type (values per resource) |

All filters optional unless marked required in the endpoint's parameter table.

### Data types

| Type | JSON format | Example |
|---|---|---|
| **ID** | UUID v7 string | `"0190e3f8-e1b4-7c5d-8e7a-9f1b8c3e6d5f"` (time-ordered) |
| **Timestamp** | ISO 8601 UTC string | `"2026-04-24T10:00:00Z"` |
| **Date** | `YYYY-MM-DD` string | `"2026-04-24"` |
| **Money** | number, 2-decimal | `1234.56` (always positive; direction from `type` field) |
| **Currency** | ISO 4217 string | `"THB"`, `"USD"` |
| **Hex color** | `#RRGGBB` string | `"#2196F3"` |
| **Boolean** | native JSON bool | `true`, `false` |
| **Enum** | lowercase snake_case string | `"expense"`, `"credit_card"` |

### Field naming

JSON field names are **snake_case**, matching DB column names directly (e.g., `created_at`, `created_by_user_id`, `display_name`). No automatic camelCase transform at the API layer.

### Phase markers

Endpoints carry a phase marker indicating the earliest phase they ship in:

- **Phase 0/1+** — available from initial dogfood release
- **Phase 2+** — added when email verification + refresh tokens land
- **Phase 3+** — added at public launch (OAuth, advanced features)

Each endpoint header lists its phase. See [`../../product/`](../../product/) phase docs for milestone definitions.

---

## 01 — Auth

Identity and session management. Owns: registration, login, logout, password change, token refresh, email verification, password reset, email change, OAuth, username change.

**Behavior context:** [`../spec/01-auth.md`](../spec/01-auth.md)

### `POST /v1/auth/register`

**Phase:** 0/1+
**Auth required:** No

Register a new user.

**Request body:**

```json
{
  "username": "alice",
  "password": "correcthorsebatterystaple",
  "display_name": "Alice Smith",
  "email": "alice@example.com",
  "currency": "THB"
}
```

| Field | Type | Required (P1) | Required (P2+) | Rules |
|---|---|---|---|---|
| `username` | string | ✅ | ✅ | 3–50 chars; `[a-z0-9_-]` only; unique |
| `password` | string | ✅ | ✅ | min 8, max 128 chars |
| `display_name` | string | ✅ | ✅ | 1–100 chars; any Unicode |
| `email` | string | — | ✅ | RFC 5322; unique |
| `currency` | string | — | — | ISO 4217; default `"THB"` |

**Success — `201 Created`:**

```json
{
  "user": {
    "id": "0190e3f8-e1b4-7c5d-8e7a-9f1b8c3e6d5f",
    "username": "alice",
    "email": "alice@example.com",
    "email_verified_at": null,
    "display_name": "Alice Smith",
    "currency": "THB",
    "avatar_url": null,
    "created_at": "2026-04-24T10:00:00Z"
  },
  "token": {
    "access_token": "eyJhbGciOi...",
    "expires_in": 2592000
  }
}
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field failed validation |
| 409 | `USERNAME_EXISTS` | Username already registered |
| 409 | `EMAIL_EXISTS` | Email already registered *(only if `email` provided)* |

**Phase notes:**
- `expires_in` — `2592000` (30 days) in Phase 0/1; `900` (15 min) in Phase 2+
- Phase 2+ response also includes `"refresh_token": "rt_..."` alongside `access_token`
- Phase 2+ triggers a verification email on register (see [`POST /v1/auth/verify-email/request`](#post-v1authverify-emailrequest))

---

### `POST /v1/auth/login`

**Phase:** 0/1+
**Auth required:** No

Authenticate with username (or email, if set) + password.

**Request body:**

```json
{
  "identifier": "alice",
  "password": "correcthorsebatterystaple"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `identifier` | string | ✅ | Username, or email. Server detects email by presence of `@`. If user has no email set, only username works. |
| `password` | string | ✅ | — |

**Success — `200 OK`:** same shape as [`POST /v1/auth/register`](#post-v1authregister).

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing fields |
| 401 | `INVALID_CREDENTIALS` | User not found OR password mismatch — response intentionally does not distinguish (login enumeration defense) |

---

### `POST /v1/auth/logout`

**Phase:** 0/1+
**Auth required:** Yes

Invalidate the current session.

**Request body:** none.

**Success — `200 OK`:**

```json
{ "message": "Logged out successfully" }
```

**Phase behavior:**
- **Phase 0/1** — best-effort; client discards token. The token remains technically valid until its `exp` (30 days). Acceptable during dev.
- **Phase 2+** — revokes the refresh token associated with the session (sets `revoked_at`). Access token still valid until its 15-min expiry.
- **Phase 3+** — additionally adds the access token's `jti` to the blocklist for immediate revocation.

---

### `PUT /v1/auth/password`

**Phase:** 0/1+
**Auth required:** Yes

Change own password. User must supply current password.

**Request body:**

```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `current_password` | string | ✅ | Must match the stored hash |
| `new_password` | string | ✅ | min 8, max 128; must differ from current |

**Success — `200 OK`:**

```json
{ "message": "Password updated successfully" }
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | New password fails rules, or matches current |
| 401 | `WRONG_PASSWORD` | Current password doesn't match |

**Phase side-effects:**
- **Phase 2+** — all existing refresh tokens for this user are revoked (forces re-login on other devices)
- **Phase 3+** — current access token added to blocklist

---

### `POST /v1/auth/refresh`

**Phase:** 2+
**Auth required:** No (refresh token in body provides identity)

Exchange a valid refresh token for a new access token. Rotates the refresh token.

**Request body:**

```json
{ "refresh_token": "rt_01HPQX4N..." }
```

**Success — `200 OK`:**

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "rt_01HPQX5M...",
  "expires_in": 900
}
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or malformed token |
| 401 | `INVALID_REFRESH_TOKEN` | Token unknown, expired, or revoked |

**Token-reuse detection:** if a refresh token is presented that was already rotated (`replaced_by_id IS NOT NULL`), the server **revokes the entire token chain** for that user. Likely theft — user is forced to re-login on all devices.

---

### `POST /v1/auth/verify-email/request`

**Phase:** 2+
**Auth required:** Yes

Send a verification email to the user's current email address.

**Request body:** none.

**Success — `200 OK`:**

```json
{ "message": "Verification email sent" }
```

Idempotent — spamming this endpoint does not spam the user. Server rate-limits sends to **max 1 per minute per user**.

---

### `POST /v1/auth/verify-email/confirm`

**Phase:** 2+
**Auth required:** No (token in body)

Consume a verification token from the email link. Used for both initial verification and email-change verification (server detects which from token's `purpose`).

**Request body:**

```json
{ "token": "<token>" }
```

**Success — `200 OK`:**

```json
{ "message": "Email verified" }
```

For initial verification: sets `users.email_verified_at = NOW()` and marks the token used.
For email change: updates `users.email` to the pending new email (recorded on the token), sets `email_verified_at`, and marks the token used.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing token |
| 400 | `INVALID_TOKEN` | Token unknown, expired, or already used |

---

### `POST /v1/auth/password-reset/request`

**Phase:** 2+
**Auth required:** No

Request a password-reset email.

**Request body:**

```json
{ "identifier": "alice" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `identifier` | string | ✅ | Username or email |

**Success — `200 OK`:**

```json
{ "message": "If an account exists, a reset email has been sent" }
```

Response is **always** `200 OK` regardless of whether the identifier matched a user (identifier-enumeration defense). If a user has no email set, the request silently no-ops.

---

### `POST /v1/auth/password-reset/confirm`

**Phase:** 2+
**Auth required:** No (token in body)

Consume a reset token and set new password.

**Request body:**

```json
{
  "token": "<token>",
  "new_password": "newpassword"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `token` | string | ✅ | Valid, unused reset token |
| `new_password` | string | ✅ | min 8, max 128 chars |

**Success — `200 OK`:**

```json
{ "message": "Password updated" }
```

**Side effects:** consumes the token (one-time use), updates `password_hash`, **revokes all refresh tokens** for the user.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | New password fails rules |
| 400 | `INVALID_TOKEN` | Token unknown, expired, or already used |

---

### `PUT /v1/auth/email`

**Phase:** 2+
**Auth required:** Yes

Change email. Creates a `change_email` verification token sent to the **new** email address; the email isn't actually updated until the user clicks the link (and calls `POST /v1/auth/verify-email/confirm`).

**Request body:**

```json
{
  "current_password": "...",
  "new_email": "alice@new.example.com"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `current_password` | string | ✅ | Must match stored hash |
| `new_email` | string | ✅ | RFC 5322; not the same as current; not already used by another user |

**Success — `200 OK`:**

```json
{ "message": "Verification email sent to new address" }
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | New email invalid or same as current |
| 401 | `WRONG_PASSWORD` | Current password doesn't match |
| 409 | `EMAIL_EXISTS` | New email already used |

Completion happens via [`POST /v1/auth/verify-email/confirm`](#post-v1authverify-emailconfirm).

---

### `POST /v1/auth/google`

**Phase:** 3+
**Auth required:** No

Sign in with Google. Accepts a Google-issued ID token from the client; server verifies it against Google's JWKs.

**Request body:**

```json
{ "id_token": "eyJ..." }
```

**Success — `200 OK`:** same shape as [`POST /v1/auth/login`](#post-v1authlogin).

**Server flow:**
1. Decode + verify `id_token` against Google's public keys
2. Look up `oauth_identities` by `(provider='google', provider_user_id=<sub>)`
3. If found → log in that user
4. If not found but Google email matches an existing `users.email` → prompt for password to link (or auto-link if configured)
5. If no match at all → auto-register a new user with a generated username and the Google email/display_name; require password setup on first login

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or malformed token |
| 401 | `INVALID_GOOGLE_TOKEN` | Token failed Google JWK verification |

---

### `PUT /v1/auth/username`

**Phase:** 3+
**Auth required:** Yes

Change username. **Rate-limited to once per 30 days per user** — username lives in URLs and external mentions, so changes are ceremonial.

**Request body:**

```json
{
  "new_username": "new_alice",
  "current_password": "..."
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `new_username` | string | ✅ | 3–50 chars; `[a-z0-9_-]`; unique; differs from current |
| `current_password` | string | ✅ | Must match stored hash |

**Success — `200 OK`:**

```json
{ "message": "Username changed", "username": "new_alice" }
```

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | New username invalid or same as current |
| 401 | `WRONG_PASSWORD` | Current password doesn't match |
| 409 | `USERNAME_EXISTS` | New username already used |
| 429 | `RATE_LIMITED` | Last change was less than 30 days ago |

---

## 02 — Users

*Pending — see [`../spec/02-users.md`](../spec/02-users.md) for current endpoint definitions until migration completes.*

## 03 — Accounts

*Pending — see [`../spec/03-accounts.md`](../spec/03-accounts.md).*

## 04 — Transactions

*Pending — see [`../spec/04-transactions.md`](../spec/04-transactions.md).*

## 05 — Categories & Tags

*Pending — see [`../spec/05-categories-tags.md`](../spec/05-categories-tags.md).*

## 06 — Shared Expenses

*Pending — see [`../spec/06-shared-expenses.md`](../spec/06-shared-expenses.md).*

## 07 — Contacts

*Pending — see [`../spec/07-contacts.md`](../spec/07-contacts.md).*

## 08 — Budgets

*Pending — see [`../spec/08-budgets.md`](../spec/08-budgets.md).*

## 09 — Saving Goals

*Pending — see [`../spec/09-saving-goals.md`](../spec/09-saving-goals.md).*

## 10 — Projects

Post-migration 27 endpoint surface (project as a separate book — see [`../plans/project-as-separate-book.md`](../plans/project-as-separate-book.md)).

### Projects CRUD

- `POST   /v1/projects` — create
- `GET    /v1/projects` — list (`?status=active|completed|cancelled|archived|all`, `?type=`, `?page=`, `?per_page=`)
- `GET    /v1/projects/:id`
- `PUT    /v1/projects/:id` (owner only — name/type/description/start_date/end_date/status)
- `DELETE /v1/projects/:id` (owner only; rejected with `409 PROJECT_HAS_TRANSACTIONS` if any rows exist)
- `POST   /v1/projects/:id/leave`
- `POST   /v1/projects/:id/transfer-ownership` `{new_owner_user_id}`

### Members

Two variants on `POST /v1/projects/:id/members` (the from-contact variant was dropped in migration 27 — contacts are user-scoped; for "add my contact", look up `contacts.linked_user_id` client-side and use the by-email or ad-hoc variant):

- by-email: `{email, display_name, role?}` — pending until accepted via project_invite notification
- ad-hoc: `{display_name, ad_hoc: true, role?}` — active immediately, no user link

Endpoints:

- `GET    /v1/projects/:id/members`
- `POST   /v1/projects/:id/members`
- `PUT    /v1/projects/:id/members/:member_id` (owner only — `{role}`)
- `DELETE /v1/projects/:id/members/:member_id` (owner only; cannot remove the owner)
- `POST   /v1/projects/:id/members/:member_id/request-link` (re-issue invite — owner only)
- `POST   /v1/projects/link-requests/:notification_id/accept`
- `POST   /v1/projects/link-requests/:notification_id/reject`

### Project transactions

The project ledger is decoupled from personal books. Splits are represented as child rows of the parent (linked via `parent_project_transaction_id`).

- `GET    /v1/projects/:id/transactions` — flat list of parents + their children. Pagination applies to **parent rows only**; children of returned parents are appended without counting against `per_page`. Client groups into a tree via `parent_project_transaction_id`.
- `POST   /v1/projects/:id/project-transactions` — body:
  ```json
  {
    "transaction_member_id": "uuid",
    "type": "expense | income",
    "amount": 1000.00,
    "currency": "THB",
    "date": "YYYY-MM-DD",
    "note": "optional",
    "splits": [
      {"member_id": "uuid", "amount": 500.00}
    ]
  }
  ```
  Children inherit `type/currency/date/note` from the parent — do not send them per child. Server validates: each split's member belongs to the project, no self-split (split member ≠ parent actor), Σ split amounts ≤ parent amount.
- `PUT    /v1/projects/:id/project-transactions/:pt_id` — body fields all optional: `amount`, `date`, `note`, `splits`. When `splits` is non-null, all existing children are deleted and the new list is inserted (full replacement). Children cannot be edited directly; rejected with `400 PT_IS_CHILD` if `:pt_id` is a child.
- `DELETE /v1/projects/:id/project-transactions/:pt_id` — deleting a parent FK-cascades children. Deleting a child removes that one split.
- `PUT    /v1/projects/:id/project-transactions/:pt_id/mark` — body `{"marked": bool}`. Toggles caller's `project_member_id` in the row's `marks` array. Idempotent. Independent of personal-book actions.

There is **no `/claim` endpoint** — the resolve flow is client-side. The FE creates personal entries via the regular `POST /v1/transactions` (with `source_project_transaction_id` set for traceback) or `POST /v1/personal-debts`. The transactions module auto-derives `project_id` from `source_project_transaction_id` and validates caller is a project member.

### Summary

- `GET    /v1/projects/:id/summary` — totals (parents only, children excluded), member count.

### Error codes specific to projects

- `NOT_OWNER` — owner-only action attempted by non-owner
- `NOT_MEMBER` — caller isn't an active project member
- `PROJECT_LOCKED` — write attempted on cancelled/archived project
- `PROJECT_NOT_ACTIVE` — `create_pt` attempted on non-active project
- `PROJECT_HAS_TRANSACTIONS` — delete attempted with rows present (409)
- `USER_ALREADY_MEMBER` — duplicate user→project membership (409)
- `MEMBER_NOT_IN_PROJECT` — referenced member belongs to a different project
- `PT_IS_CHILD` — direct edit attempted on a split-child row
- `SELF_SPLIT` — split member equals parent actor
- `SPLITS_EXCEED_PARENT` — Σ splits > parent amount

## 11 — Scheduled Transactions

*Pending — see [`../spec/11-scheduled-transactions.md`](../spec/11-scheduled-transactions.md).*

## 12 — Personal Debts

*Pending — see [`../spec/12-personal-debts.md`](../spec/12-personal-debts.md).*

## 13 — Notifications

*Pending — see [`../spec/13-notifications.md`](../spec/13-notifications.md).*

---

## Status

- **Last updated** — 2026-04-26
- **Version** — 0.1 (initial extraction; Conventions section + 01-auth migrated as proof of concept; 02–13 pending)
