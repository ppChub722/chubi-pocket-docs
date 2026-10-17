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
| [14 — Shared Wallets](#14--shared-wallets) | Members, ownership transfer, report scope *(planned — not implemented)* |

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

### App version check (owner 2026-10-10, release 0.3.1-3)

- The app sends its build number on every call: `X-App-Build: <int>` (CORS allows it).
- `GET /v1/app/version` — public, never blocked → `200 {success, data: {min_build, latest_build, download_url, message_th?, message_en?}}`. `min_build` 0 = check off · `latest_build` 0 = not set · `download_url` "" when not set · `message_*` keys absent when not set.
- Every other `/v1/*` route (public or protected): header present, an integer, and `< min_build` (with `min_build > 0`) → **`426 Upgrade Required`** `{success: false, error: {code: "APP_OUTDATED", message, details: {…same fields as /app/version…}}}`; the handler never runs. Header missing / empty / not an integer → passes (web, Postman, scripts). `/health` is outside `/v1` and never checked.
- Server env (read at start): `MIN_APP_BUILD` (0), `LATEST_APP_BUILD` (0), `APP_DOWNLOAD_URL`, `APP_UPDATE_MESSAGE_TH` / `_EN`.

### name / description / note (owner standard 2026-10-10, migration 051)

Every user-facing record carries the same text keys:

| Kind | Resources | Keys |
|---|---|---|
| Things | wallets, categories, tags, contacts (`display_name` is the name), budgets, saving goals, projects, scheduled transactions | `name` + `description` + `note` |
| Records | transactions, pending drafts (`draft` JSON), project transactions, personal debts | `description` (the title — what it was for, ค่าอะไร) + `note` |

Exempt: users, project members, wallet identifiers, notifications, import logs, payment providers.

- **Limits** (characters, so Thai counts per letter): `name` 100 (tags 50), `description` 200, `note` 500. Over → `400 VALIDATION_ERROR`, on create and update.
- **Create:** absent / `null` / `""` → stored as NULL. Values are trimmed; whitespace-only → NULL.
- **Update (partial):** key absent → unchanged · `null` → clear · `""` → clear. No `clear_*` flags. `name` on things can't be cleared — except a budget's, which goes back to its category's name.
- **Budgets:** `name` is optional on create (absent / blank → the category's name) and always present in responses. Migration 051 moved the old `description` labels into `name`; `description` is a real description now.
- **Contacts:** `notes` was renamed to `note` (responses, create / update, and both link-request bodies).
- **Action bodies:** settle debt `{account_id, amount, date, description, note}` — `description` absent → the debt's own description. Adjust balance `{new_balance, date, description, note}` — stored as sent; nothing typed → empty. Server-made rows (opening balance, adjustment) never get canned text — the app labels them by their system category (owner 2026-10-10).
- **Copies map description → description, note → note:** a project row's personal copy and its "update to match" suggestion (`personal_update: {amount, date, description, note}`); scheduled pay-now / generated transactions (`description` = the schedule's `name`, `note` = its note); split debts (both sides take the bill's description); slip drafts (`description` = payee — fee draft "ค่าธรรมเนียม · payee" —, `note` = the slip's memo).
- **Notification payloads** carry `description` beside `note`: `split_created`, `project_tx_recorded_for_you`; `project_tx_changed` diffs may include a `description` key.
- **Search:** `GET /v1/transactions?q=` matches `description` too.

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

Recent additions (2026-10-13, 0.3.1-10, migration 058): `Account.track_balance` (create / `PUT` take it; `PUT {track_balance: true, current_balance}` turns it back on in one call), `AccountList.totals.untracked_count`, 409 `BALANCE_NOT_TRACKED` on adjust-balance; untracked wallets are left out of every total and the dashboard net worth — [`../spec/03-accounts.md`](../spec/03-accounts.md) (0.3.1-10 note). **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 04 — Transactions

*Pending — see [`../spec/04-transactions.md`](../spec/04-transactions.md).*

Recent additions (2026-10-10): `GET /v1/transactions` `totals` · detail `split_count` / `splits` / `project` · `PUT /v1/transactions/:id/splits` (edit splits; change a saved split's person in place — rename, switch / link a contact, `"contact_id": null` back to a free name — a linked person is swapped by remove + add, new `debt_id`, 2026-10-12) · `POST /v1/transactions` 201 for expense / income = the full detail incl. `splits` · `my_share` + `can_split` / `can_edit_splits` / `can_join_event` on every row, reports on share basis (spec 04 §3.3, spec 12 §4.5) · repayment rows deletable (debt follows) — spec 04 §3.2–3.4b. Overpaid debts + `POST /v1/personal-debts/split-changes/:id/apply` — spec 12 §3.9–3.10. `split_changed` — spec 13 §2.8.

Recent additions (2026-10-13, 0.3.1-10): rows carry `counterparty` (a debt entry's wallet side, one record with the entry: edits / deletes reach the entry, writes return `person_balance`; replaces `is_repayment` / `source_personal_debt_id`) and `event_bill` (the event bill the row is in; `linked` = money shared with the bill); `Split` drops `settled_amount` / `status`, gains `key` / `paid`, direction paid | received; list filters `can_join_event`, `counterparty_key` — spec 12 §0, spec 10 §0.4. Also (recurring, migration 057): a future-dated create / an edit to a future date makes / moves an upcoming recurring item (`rows: []` + `upcoming`; 400 `FUTURE_DATE_NOT_ALLOWED`), rows carry `recurring_item`, `PUT` takes `also_update_link` (event bill + recurring item), `DELETE ?also_delete_link=true` (result `recurring_item_id`, `bill_id`); `scheduled_transaction_id` removed — spec 04 §2.6, spec 11 §7. **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-11): pending drafts get `draft.project_id` (an event; checked on submit, confirm = the add-a-new-bill-to-an-event path; new submit error codes `PROJECT_*`, `TX_NOT_BILLABLE`, `INVALID_SPLIT`, `SPLITS_EXCEED_AMOUNT`) — [`ux-overhaul-contract.md` §14](ux-overhaul-contract.md), spec 10 §4.25.
**API v2 (0.3.1-9, 2026-10-12): the source of truth is `chubi-pocket-be/internal/apidoc/openapi.yaml` (served at `GET /api/v1/openapi.json`); behaviour notes in [`api-v2-notes.md`](api-v2-notes.md).** Reached pages' endpoints are in their target shapes (embedded refs, live person names, bare bodies, `account_balances` on every money-moving write, `GET /transactions/form-options`, `GET /me/counts`, `GET /notifications/unread-count`, bulk `POST /pending-transactions/discard`, `PUT /transactions/:id/tags`, `POST /accounts/:id/restore`); where this document or the per-module specs disagree, the yaml wins. Currency is user-level (see the 2026-10-16 note below).

## 05 — Categories & Tags

*Pending — see [`../spec/05-categories-tags.md`](../spec/05-categories-tags.md).*

## 06 — Shared Expenses

*Pending — see [`../spec/06-shared-expenses.md`](../spec/06-shared-expenses.md).*

## 07 — Contacts

*Pending — see [`../spec/07-contacts.md`](../spec/07-contacts.md).*

## 08 — Budgets

Recent additions (2026-10-13, 0.3.1-10, migration 059): Budgets v2 — named trackers with a free scope (all / categories / tag names / wallets), recurring periods or one range, period instances, used vs expected by source. `GET|POST /v1/budgets`, `GET|PUT|DELETE /v1/budgets/:id`, `GET /v1/budgets/:id/periods`, `PUT /v1/budgets/:id/periods/:period_id`, `GET /v1/budgets/:id/items`, `POST /v1/budgets/:id/{close,archive,restore}`; `/v1/budgets/overview`, scope user / project and `currency` removed — [`../spec/08-budgets.md`](../spec/08-budgets.md) §0. **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-17, 0.4.0 M4): recurring kinds (`subscription` / `installment` / `income` / `reminder`, `trial_until`, `yearly_cost`, nullable amounts, saving type removed — migration 064), list summary `due_30d_total` / `awaiting_amount_count` / `by_kind`, `current_occurrence`, `?for_type` picker, `POST /recurring-items/:id/link`, `POST /recurring/:id/duplicate`, calendar `GET /recurring-items?month=` — spec 11. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-17, 0.4.0 M3 + ground rule 6 "few endpoints, page-ready, one call per page"): pending `needs_input` / `can_confirm`, list `summary`, `POST /pending-transactions/submit-ready` and `/:id/submit` (actions) — spec 04 pending notes; notifications list `summary`, `awaits_answer` for `project_invite` / `recurring_ending`, event deep links `/projects/:id` — spec 13; `/users/me` `default_account` + `auto_copy_own_event_bills` — spec 02; `GET /me/archived` + `counts.archived`; wallets `cash_split` / `card_remaining`, `?include=delete_preview` (replaces the delete-preview route); debts person page carries `summary_message` and defaults to the current cycle (the summary-message route is gone); categories `path` icons + 422 `CATEGORY_NAME_DUPLICATE`. Folded: `GET /accounts/:id/delete-preview` and `GET /personal-debts/people/:key/summary-message` were removed in the same branch before any release. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-17, 0.4.0 M2): budget detail (`forecast.available` / `projected_end` / `days_left` / `pace_pct`, item `reason`) — spec 08; events (`my_paid` / `my_share` / `my_receivable` / `my_payable` / `remaining`, positions `receivable` / `payable`, list `summary`) — spec 10; transactions list (`avg_daily_spend`, `daily`) — spec 04. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-17, 0.4.0 M1): wallet page numbers (`month_in`, `month_out`, `due_date_next`, `days_until_due`, list totals `total` / `cash_total` / `card_debt` / `card_used_pct` / `saved_total` / `available_total`) — spec 03 §2.5b; debt cycles (`cleared_at`, `days_outstanding`, `cycle` filter, `in_current_cycle`, `counts.current/earlier`, totals `*_people`, `GET /personal-debts/people/:key/summary-message`) — spec 12 §0; goals (month numbers, `status`, auto-saving `PUT|DELETE /saving-goals/:id/auto-save` + `/spare/auto-save`, table `saving_auto`, migration 062) — spec 09 §0.7; categories `month_spent` / `month_count` — spec 05 §3.2. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-16, 0.3.3 BE, branch `feat/0.3.3-delete-archive`, migration 061): `categories.status` removed (list takes no `status`, rows carry none); notifications: dismissed rows hidden by default, `?dismissed=true|all`, `POST /v1/notifications/:id/restore`; transfer legs without a wallet (per-leg re-file, `transfer_peer.account` nullable); wallet archive: `POST /v1/accounts/:id/archive` (and `DELETE /v1/accounts/:id` is now a REAL delete, `GET /v1/accounts/:id/delete-preview`; saving entries may have no wallet, `wallet` nullable; a save with no `wallet_id` = no wallet), `GET /v1/transactions?include_archived`, 409 `ACCOUNT_ARCHIVED`, wallet status `closed` merged into `archived`. Details: `spec/03`, `04`, `05`, `07`, `13`; shapes: the OpenAPI yaml.

Recent additions (2026-10-16, 0.3.1-11): Currency is a label, not a rule. `PUT /v1/users/me` accepts `currency` (3 letters, upper-cased) at any time: relabel only, no conversion; the user, wallet, debt and event rows follow in one tx. The server fills every record's currency from the user setting (no client currency anywhere). Calculations ignore it: `other_currency_count` removed from the wallet totals (every tracked wallet is summed as-is), `TRANSFER_CURRENCY_MISMATCH` removed (transfers between any two wallets), dashboard `currency` = the user setting. A split / debt mirror row takes the receiver's own currency; amounts pass as-is. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 09 — Saving Goals

Recent additions (2026-10-13, 0.3.1-10, migration 060): Saving goals v2 — a savings NOTEBOOK. `POST /v1/saving-entries` (save / withdraw / move, one row per wallet, largest-first splits), `GET /v1/saving-entries`, `PUT|DELETE /v1/saving-entries/:id`, `GET /v1/saving-goals/spare`, `POST /v1/saving-goals/:id/close`; goals lose `linked_account_id` / `allocation_pct` (and `/v1/accounts/:id/saving-allocations`, ALLOCATION_EXCEEDED); `Account.savings`; pending kind `saving`; recurring type `saving`; Home / More savings = SavingTotals — [`../spec/09-saving-goals.md`](../spec/09-saving-goals.md) §0. **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 10 — Projects

Recent additions (2026-10-13, 0.3.1-10): page-ready `Event` rows (no `type`, my tags, totals, flags), `GET /v1/projects/:id/detail` (one call), the board with nested splits / event tags / `linked` / `source_tx`, event tags CRUD + `POST /v1/projects/:id/tags/import`, my tags via `PUT /v1/projects/:id {tag_ids}`, every write returns `EventPatch`, a pulled bill's money is linked BY PROMPT (`also_update_link`; another member's edit notifies the tx owner, `409 BILL_MONEY_LINKED` dropped), `DELETE /v1/projects/:id?delete_linked_txs=true` → `EventDeleteResult`, `Event.linked_tx_count` — spec 10 §0. **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.** The sections below describe the pre-0.3.1-10 shapes.

Post-migration 27 endpoint surface (project as a separate book — see [`../plans/project-as-separate-book.md`](../plans/project-as-separate-book.md)).

### Projects CRUD

- `POST   /v1/projects` — create
- `GET    /v1/projects` — list (`?status=active|completed|cancelled|archived|all`, `?type=`, `?page=`, `?per_page=`)
- `GET    /v1/projects/:id`
- `PUT    /v1/projects/:id` (owner only — name/type/description/start_date/end_date/status/planned_amount; `planned_amount` nullable — set a number to enable the plan-vs-actual display, null to hide) *(planned_amount: planned)*
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
- `DELETE /v1/projects/:id/project-transactions/:pt_id` — deleting a parent FK-cascades children. Deleting a child removes that one split. Personal rows linked to the deleted row(s) (the author's bill, members' copies) are unlinked first and stay as loose transactions (2026-10-10; this used to fail with 500 on CHECK `transactions_project_id_implies_source`).
- `PUT    /v1/projects/:id/project-transactions/:pt_id/mark` — body `{"marked": bool}`. Toggles caller's `project_member_id` in the row's `marks` array. Idempotent. Independent of personal-book actions.

There is **no `/claim` endpoint** — the resolve flow is client-side. The FE creates personal entries via the regular `POST /v1/transactions` (with `source_project_transaction_id` set for traceback) or `POST /v1/personal-debts`. The transactions module auto-derives `project_id` from `source_project_transaction_id` and validates caller is a project member.

### Quick create / add / remove bills *(spec §4.24–4.25)*

`POST /v1/projects/quick` — atomic: create project + auto-add members +
board rows for every included bill, born auto-claimed. Settled debt state
is never modified.

Request:

```json
{
  "name": "แฟน, บี · 15 ก.ย. 2026",
  "new_transaction": { "…same body as POST /v1/transactions, splits[] allowed…": true },
  "transaction_ids": ["uuid", "uuid"],
  "move": false
}
```

- `name` — required (FE composes the members+date default, editable)
- `new_transaction` — optional (2026-10-10); processed through the normal
  personal transaction create path (account balance moves, splits create
  debts). At least one of `new_transaction` / non-empty `transaction_ids`.
- `transaction_ids` — optional; each must be the caller's own expense /
  income, not a debt repayment, and have `project_id IS NULL` (or
  `move`), else the whole call fails (atomic). Wallet-less bills are fine:
  the board row's currency is the bill's wallet currency, else the
  caller's user currency (a project has no currency of its own).
- `move` — optional, default false: a listed bill already in **another**
  project leaves it first (same rules as DELETE below), in the same DB
  transaction. A bill already in the target project is always 409.

`POST /v1/projects/:id/bills` — the same pull into an existing project:
body `{new_transaction?, transaction_ids?, move?}` (no `name`). Caller must
be an active non-viewer member; project must accept new rows.

`DELETE /v1/projects/:id/bills/:transaction_id` → `204` — take the
caller's own transaction out of the project; the transaction stays as a
loose one. Only the transaction's author; no project lock / membership
check (removal is always allowed).
- The transaction is its board row's origin (caller recorded the row and is
  its actor) → the board row + its split children are deleted and every
  personal row linked to them (members' copies too) is unlinked;
  `project_tx_changed` (`deleted`) goes to the row's linked stakeholders.
- Otherwise (caller's copy of someone else's row) → only the caller's row
  is unlinked; the board row stays.
- The transaction's own splits stay; they only lose `project_id`. Members
  auto-added to the project stay.

Errors (`DELETE`): `404 TX_NOT_FOUND` (missing or not the caller's);
`404 TX_NOT_IN_PROJECT`.

Behavior: caller becomes `owner`; members = union of split counterparties
across all included bills (linked contact → active linked member +
`project_added` notification, free-text → ad-hoc member) plus active
members of any shared wallet a bill lives on. Every included bill (new +
listed) gets a `project_transactions` parent (+ split children from its
debts) and the personal row is linked back (`project_id` +
`source_project_transaction_id`) — auto-claimed. The bills' splits move
onto the board (see below).

Response `201` (quick + bills): the project (same shape as `POST
/v1/projects`) plus `"linked_count": n` (board rows created) and
`"transaction_id"` — the new bill's id, **absent** when no
`new_transaction` was sent.

Errors (quick + bills): `400 VALIDATION_ERROR` (incl. nothing to add, a
transfer); `404 TX_NOT_FOUND` (missing or not the caller's); `409
TX_ALREADY_IN_PROJECT`; `422 TX_NOT_BILLABLE` (a debt repayment, or an
opening balance / balance adjustment row); `422 TX_SPLIT_HAS_REPAYMENT` (a
split on the bill was already repaid); `422 TX_SPLIT_CANCELLED` (a split
was forgiven); `400 CONTACT_NOT_FOUND` (a new bill's split contact).

Splits **move** onto the board (spec 10 §4.25): a listed bill's personal
splits become the board row's member splits and leave the bill; a new
bill's splits go straight onto the board. `DELETE …/bills/:transaction_id`
(and the author deleting the board row) moves them back as personal
splits; `move` carries them to the new board row.

### Summary

- `GET    /v1/projects/:id/summary` — totals (parents only, children excluded), member count. *(planned)* when `projects.planned_amount` is set, also returns `planned_amount`, `spent_net` (Σ expense − Σ income parents), `remaining` (may be negative — FE renders "เกินงบ X" instead of a raw negative); all three omitted when planned_amount is NULL.

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

## 11 — Recurring (replaces Scheduled Transactions)

Recent additions (2026-10-13, 0.3.1-10, migration 057): `/v1/scheduled-transactions/*` removed. New: `GET|POST /v1/recurring`, `GET|PUT|DELETE /v1/recurring/:id` (`?delete_linked_txs`), `GET /v1/recurring/:id/items?tab=produced|upcoming`, `POST /v1/recurring/:id/{pause,resume,archive,restore,extend}`, `GET|POST /v1/recurring-items`, `POST /v1/recurring-items/batch`, `GET|PUT|DELETE /v1/recurring-items/:id` (`?delete_linked_tx`), `POST /v1/recurring-items/:id/{create,archive,restore}`. The due check runs inside the boot reads and makes pending drafts (`source` recurring | upcoming) + notifications `recurring_due` / `recurring_ending`; `GET /v1/me/counts` → `counts.recurring` — [`../spec/11-scheduled-transactions.md`](../spec/11-scheduled-transactions.md). **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 12 — Personal Debts

Recent additions (2026-10-13, 0.3.1-10): the person ledger — `GET /v1/personal-debts/people`, `GET /v1/personal-debts/people/:key`, `GET|POST /v1/personal-debts/people/:key/entries`, `GET|PUT|DELETE /v1/personal-debts/:id`; entries paid | received, a paid label, an optional wallet transaction (one record); `GET|POST /v1/personal-debts`, `/cancel`, `/settle` and `split_paid` retired — [`../spec/12-personal-debts.md`](../spec/12-personal-debts.md) §0. **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 13 — Notifications

Recent additions (2026-10-13, 0.3.1-10): types `recurring_due` (grouped, `{count}`, `/pending`) and `recurring_ending` (`{recurring_id, name, left}`, `/recurring/{id}`); `GET /v1/notifications` and `/unread-count` run the recurring due check first — [`../spec/13-notifications.md`](../spec/13-notifications.md) §2.9–2.10.

## 14 — Shared Wallets

*Planned — not implemented. Spec: [`../spec/14-shared-wallets.md`](../spec/14-shared-wallets.md). Contracts will be formalized here when implementation starts.*

Planned surface (no new ledger endpoints — wallet rows are ordinary transactions):

- `GET    /v1/accounts` — response gains `members[]` per account (active members only)
- `POST   /v1/accounts/:id/members` — invite a linked contact or an email (project-invite pattern; pending until accepted; converting invite is warning-gated client-side)
- `DELETE /v1/accounts/:id/members/:member_id` — leave / remove (sets `left_at`; rows untouched, ex-member's rows lock read-only for them)
- `POST   /v1/accounts/:id/transfer-ownership` — `{new_owner_user_id}`; required before an owner leaves a shared wallet
- `PUT    /v1/accounts/:id/report-scope` — `{report_scope: none|own|all}` for the caller's own membership (ex-members capped at `own`)

Changed behavior on existing endpoints:

- `POST/PUT/DELETE /v1/transactions` — writes to an account require active membership; editing another member's row excludes `category_id` (author-only)
- `GET /v1/transactions?account_id=X` — members see all rows on the wallet regardless of author
- `DELETE /v1/accounts/:id` — rejected with `409` while other active members exist
- Contribution = plain `type='transfer'` between own account and the wallet (existing transfer machinery; no dedicated endpoint)

Pinned contracts (implementation targets — both FE and BE code to these):

`GET /v1/accounts` — each account gains:

```json
{
  "members": [
    {
      "id": "member-row-uuid",
      "user_id": "uuid",
      "display_name": "แฟน",
      "icon_code": { },
      "role": "owner",
      "joined_at": "2026-09-11T04:00:00Z"
    }
  ],
  "my_report_scope": "none",
  "is_shared": true
}
```

`members` contains **active** members only, always including the caller.
`is_shared` = active member count > 1. Rows on shared wallets returned by
transaction endpoints gain denormalized author + category rendering:

```json
{
  "created_by": { "user_id": "uuid", "display_name": "แฟน", "icon_code": { } },
  "category_render": { "name": "ค่ากิน", "icon_code": { } },
  "is_locked": false,
  "can_edit_category": false
}
```

Member management:

- `POST /v1/accounts/:id/members` body `{"contact_id": "..."}` (one of my contacts with `linked_user_id`; 2026-10-11) **or** `{"email": "..."}` — exactly one → `201` pending member (notification-pattern invite, same as projects; the invitee gets `account_invite`). Errors: `400 VALIDATION_ERROR` (neither / both), `404 CONTACT_NOT_FOUND` (not my contact), `409 CONTACT_ARCHIVED`, `422 CONTACT_NOT_LINKED` (no app account), `404 USER_NOT_FOUND` (email), `409 USER_ALREADY_MEMBER` (member, pending invite, or myself), `403 NOT_MEMBER`
- `DELETE /v1/accounts/:id/members/:member_id` → `200`; sets `left_at`. v1 rule: a member may remove **themselves** (leave); the `owner` may remove anyone. Owner leaving with other members present → `409 OWNER_MUST_TRANSFER`
- `POST /v1/accounts/:id/transfer-ownership` body `{"new_owner_user_id": "..."}` (owner only, target must be active member) → `200`
- `PUT /v1/accounts/:id/report-scope` body `{"report_scope": "none|own|all"}` → `200`; ex-members may call with `none|own` only (`400 SCOPE_NOT_ALLOWED`)

Error codes specific to shared wallets:

- `NOT_MEMBER` (403) — caller isn't an active member of the account
- `OWNER_MUST_TRANSFER` (409) — owner tried to leave/delete while other active members exist
- `ACCOUNT_HAS_MEMBERS` (409) — delete/archive attempted on a still-shared wallet
- `CATEGORY_AUTHOR_ONLY` (403) — category edit attempted on another member's row
- `ROW_LOCKED` (403) — ex-member tried to edit/delete their old row
- `SCOPE_NOT_ALLOWED` (400) — ex-member requested `report_scope=all`

---

## Status

- **Last updated** — 2026-10-10
- **Version** — 0.7 (Pointers: editable splits, overpaid debts, deletable repayment rows, split_changed — 2026-10-10)
- **Version** — 0.6 (Conventions: app version check — `X-App-Build`, `GET /v1/app/version`, 426 `APP_OUTDATED`)
- **Version** — 0.5 (Conventions: name / description / note standard — migration 051)
- **Version** — 0.4 (§14 reworked to single-table model: dropped shared-transactions + contribute endpoints; added transfer-ownership + report-scope; documented authz changes on transactions endpoints)
- **Version** — 0.3 (§10: planned `planned_amount` on project update + plan-vs-actual fields on summary)
- **Version** — 0.2 (added §14 Shared Wallets planned surface)
- **Version** — 0.1 (initial extraction; Conventions section + 01-auth migrated as proof of concept; 02–13 pending)

## Delete / archive / restore matrix (0.4.0 M5, verified against the routes)

| Entity | Archive | Restore | Delete | Notes |
|---|---|---|---|---|
| Wallet | `POST /accounts/:id/archive` | `POST /accounts/:id/restore` | `DELETE /accounts/:id` (hard) | confirm text: `GET /accounts/:id?include=delete_preview`; owner, no other active member |
| Budget | `POST /budgets/:id/archive` | `POST /budgets/:id/restore` | `DELETE /budgets/:id` | |
| Saving goal | `POST /saving-goals/:id/archive` (only with 0 saved: 409 GOAL_HAS_SAVINGS) | `POST /saving-goals/:id/restore` | `DELETE /saving-goals/:id` (only empty) | closing a goal (ปิดเป้าหมาย) moves the money first |
| Event | `POST /projects/:id/archive` | `POST /projects/:id/restore` | `DELETE /projects/:id` (`?delete_linked_txs`) | owner only; restore = active |
| Contact | `POST /contacts/:id/archive` | `POST /contacts/:id/restore` | `DELETE /contacts/:id` | archive only hides; delete drops records to typed names |
| Recurring | `POST /recurring/:id/archive` | `POST /recurring/:id/restore` | `DELETE /recurring/:id` (`?delete_linked_txs`) | an occurrence: archive = skip, `DELETE /recurring-items/:id` |
| Notification | `POST /notifications/:id/dismiss` | `POST /notifications/:id/restore` | `DELETE /notifications/:id` | |
| Category, tag, transaction, debt entry, pending draft | — | — | `DELETE …` / `POST /pending-transactions/discard` | delete only (no archive) by design |

`GET /me/archived` lists the archived ones of the first seven rows in one call (`GET /me/counts` has the total). All archive / restore / delete answers carry the final state the page needs.
