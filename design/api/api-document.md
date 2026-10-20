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
| [11 — Recurring](#11--recurring-replaces-scheduled-transactions) | Recurring rules, computed occurrences, by-slot writes, auto-create, occurrence names, readers |
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

Recent additions (2026-10-20, 0.4.0-2, C7): a credit-card wallet (`credit_card` / `pay_later`) counts the transfers IN to the card as payments in `month_in` (a transfer is two rows per `transfer_group_id`; the in-row has the card's `account_id` and category `system_kind` `TRANSFER_IN`). Other wallet types are unchanged: a transfer is neither in nor out there. `month_out` is unchanged. The same rule feeds `total_income` of `GET /v1/accounts/:id?include=summary` (the numbers the app reads for other periods), so the card page agrees with the wallet list. Both stop at today (see Transactions below: future rows count nowhere until their day). Wallet `balance` is the effective one: cached balance − Σ the wallet's future-dated rows, so it moves into place on the day by itself. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 04 — Transactions

*Pending — see [`../spec/04-transactions.md`](../spec/04-transactions.md).*

Recent additions (2026-10-20, 0.4.0-2, C1 — migration 068): **a future-dated transaction is a plain transaction.** The one-off "upcoming" item is gone and so is its path.
- `POST /v1/transactions` and `PUT /v1/transactions/:id` with a date after today (in the user's timezone) answer like any write: `rows` holds the row(s), `account_balances` follow. `TransactionWriteResult.upcoming` is removed and so is 400 `FUTURE_DATE_NOT_ALLOWED` (transfers, debt entries and event bills may carry a future date too). Editing a row to a future date keeps it where it is (before: it moved to an upcoming item).
- The row stays in `GET /v1/transactions` (the list shows future rows; the pagination `total` counts them). Everything that COUNTS stops at today until the row's day: the wallet `balance` (also `account_balances` in write results, form-options wallet balances and the saving "available"), `month_in` / `month_out` and the account summary, category month figures, `GET /v1/transactions` `totals` and the `daily` series, `GET /v1/transactions/summary` (dashboard, reports) and the budget `used`. On its day the number moves into place by itself; the accounts and recurring sync datasets hash the user's today, so the app re-syncs.
- Budgets see a future-dated expense inside the current period as expected (see 08 — Budgets, source `future_tx`).
- A wallet's shown balance in a WRITE result uses the owner's timezone (the write has no caller id); on reads it uses the caller's. They differ only around midnight for a wallet shared across timezones.
- Deleting a transaction that records a recurring occurrence now always releases the occurrence: `DELETE /v1/transactions/:id` puts it back to `due` / `upcoming` (to `paid` if it had been cleared first); `DELETE /v1/transactions/:id?skip_occurrence=true` deletes the transaction AND skips the occurrence it recorded, in one DB transaction. For a recurring link `skip_occurrence` replaces `also_delete_link` (which stays for event bills). See 11 — Recurring.
- Supersedes the 2026-10-13 note above (a future date made / moved an upcoming item with `rows: []` + `upcoming`).

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

Recent additions (2026-10-20, 0.4.0-2, migration 067): a saving goal (and the unallocated pot) can have MANY auto-saves, each its own wallet, amount and full recurrence rule. Goal and spare pages gain `auto_saves: [{id, amount, wallet, rule, start_date, end, next_date}]` (always an array, oldest first; `rule` / `start_date` / `end` are the `/recurring` shapes; `next_date` null once ended); `auto_save` stays as the first item in the old shape; `month_plan` = Σ amount × occurrences in the current month. New `PUT /saving-goals/:id/auto-saves` and `PUT /saving-goals/spare/auto-saves` (body `{items:[{id?, amount, account_id, rule, start_date, end}]}` replaces the set, `items` required, max 20, 400 `INVALID_RULE` / `END_TOO_FAR` / `WALLET_NOT_TRACKED`, 409 `GOAL_NOT_ACTIVE`); the old `/auto-save` calls keep working (one monthly item). Source of truth: `openapi.yaml`.

Recent additions (2026-10-17, 0.4.0 M1): wallet page numbers (`month_in`, `month_out`, `due_date_next`, `days_until_due`, list totals `total` / `cash_total` / `card_debt` / `card_used_pct` / `saved_total` / `available_total`) — spec 03 §2.5b; debt cycles (`cleared_at`, `days_outstanding`, `cycle` filter, `in_current_cycle`, `counts.current/earlier`, totals `*_people`, `GET /personal-debts/people/:key/summary-message`) — spec 12 §0; goals (month numbers, `status`, auto-saving `PUT|DELETE /saving-goals/:id/auto-save` + `/spare/auto-save`, table `saving_auto`, migration 062) — spec 09 §0.7; categories `month_spent` / `month_count` — spec 05 §3.2. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-16, 0.3.3 BE, branch `feat/0.3.3-delete-archive`, migration 061): `categories.status` removed (list takes no `status`, rows carry none); notifications: dismissed rows hidden by default, `?dismissed=true|all`, `POST /v1/notifications/:id/restore`; transfer legs without a wallet (per-leg re-file, `transfer_peer.account` nullable); wallet archive: `POST /v1/accounts/:id/archive` (and `DELETE /v1/accounts/:id` is now a REAL delete, `GET /v1/accounts/:id/delete-preview`; saving entries may have no wallet, `wallet` nullable; a save with no `wallet_id` = no wallet), `GET /v1/transactions?include_archived`, 409 `ACCOUNT_ARCHIVED`, wallet status `closed` merged into `archived`. Details: `spec/03`, `04`, `05`, `07`, `13`; shapes: the OpenAPI yaml.

Recent additions (2026-10-16, 0.3.1-11): Currency is a label, not a rule. `PUT /v1/users/me` accepts `currency` (3 letters, upper-cased) at any time: relabel only, no conversion; the user, wallet, debt and event rows follow in one tx. The server fills every record's currency from the user setting (no client currency anywhere). Calculations ignore it: `other_currency_count` removed from the wallet totals (every tracked wallet is summed as-is), `TRANSFER_CURRENCY_MISMATCH` removed (transfers between any two wallets), dashboard `currency` = the user setting. A split / debt mirror row takes the receiver's own currency; amounts pass as-is. **Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-20, 0.4.0-2, C5 + C1 + readers): budget items and sources.
- **`tag_refs` (C5).** Every `BudgetItem` (in `GET /v1/budgets/:id` `items` and `GET /v1/budgets/:id/items`) gets `tag_refs: [{name, icon_code}]`, in the same order as `tags`. `icon_code` is the icon of the user's own tag with that name (case-insensitive) and `null` for a name that is not one of the user's tags (an event or recurring tag). `tags: [string]` is unchanged.
- **Sources.** The item `source` set is `normal | recurring | event | upcoming | pending | future_tx`; `by_source` and `?source=` on the items call take the same values.
  - `future_tx` (C1, new): a future-dated expense inside the current period. `kind: "transaction"`, `counts_as: "expected"`. It becomes `used` (source `normal` / `recurring`) on its day.
  - `upcoming` now means an unproduced recurring OCCURRENCE only (the one-off upcoming item is gone). `kind: "recurring_item"`, `counts_as: "expected"`; the rows come from the computed + edited occurrences of the recurring rules (the recurring service answers `ExpectedBetween`; `used` never counts them).
  - A cleared occurrence (state `paid`) and a skipped one are not expected and not an expense.
- **Recurring link on a row.** Items gain `rule_id` and `slot` (null on rows with no recurring link). `recurring` is a `BudgetItemRecurring`: like the transaction's recurring link, but `item_id` is null while the occurrence is only computed (no stored row yet). A row with no stored item has a stable `id` (a UUIDv5 of rule id + slot). Only expense occurrences with an amount > 0 are counted (an occurrence with an unknown amount never counted). The AND-scope filter (categories AND wallets AND tags) applies to them as before.
- Tests and shapes: **source of truth `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 09 — Saving Goals

Recent additions (2026-10-13, 0.3.1-10, migration 060): Saving goals v2 — a savings NOTEBOOK. `POST /v1/saving-entries` (save / withdraw / move, one row per wallet, largest-first splits), `GET /v1/saving-entries`, `PUT|DELETE /v1/saving-entries/:id`, `GET /v1/saving-goals/spare`, `POST /v1/saving-goals/:id/close`; goals lose `linked_account_id` / `allocation_pct` (and `/v1/accounts/:id/saving-allocations`, ALLOCATION_EXCEEDED); `Account.savings`; pending kind `saving`; recurring type `saving`; Home / More savings = SavingTotals — [`../spec/09-saving-goals.md`](../spec/09-saving-goals.md) §0. **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

Recent additions (2026-10-20, 0.4.0-2, C4): the goals page can show any month's plan. `GET /v1/saving-goals?month=YYYY-MM` and `GET /v1/saving-goals/:id?month=YYYY-MM` (optional; default = this month in the user's timezone; anything that is not `YYYY-MM` → 400 `VALIDATION_ERROR`).
- `month` sets `month_plan`, `month_saved` and `month_short` of every goal, and the `summary` month totals `month_plan_total`, `month_saved_total`, `month_short_total` of the list. `month_saved` = the net saved in THAT month (history is stored per month).
- `month_plan`: for a goal WITH auto-saves = Σ amount × the occurrences of each item that fall in that month (a daily rule counts every day of the month, a monthly one once; a rule that has not started or has ended counts 0 in that month). For a goal WITHOUT auto-saves = `needed_monthly` whatever the month (a rate, not a calendar fact). A closed goal keeps `month_plan: null`.
- Not month-aware: `saved_total`, `unallocated` and every other balance (they are "now"). The spare (`GET /v1/saving-goals/spare`) has no `month_plan`, so it takes no `month`. Writes keep returning this month's numbers.
- Goal and spare pages carry `auto_saves[]` (see the 2026-10-20 note under 08 — Budgets, migration 067).

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

Recent additions (2026-10-20, 0.4.0-2, C3 + C8 + C2 — migration 068): **recurring runs on COMPUTED occurrences.** Recurring is out of pending; the one-off item is gone. Everything below supersedes the 2026-10-13 paragraph above where they differ (the due check no longer makes pending drafts; `POST /recurring-items/batch` and `POST /recurring-items/:id/create` are removed). **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

### Model

- An upcoming occurrence is COMPUTED from the rule (`Spec.Between`, the schedule engine in `internal/shared/recurrence`), never stored. A row of `recurring_items` exists only for an occurrence that is recorded (a transaction), cleared (paid), skipped or edited. A stored row keeps its `slot` (the occurrence's ORIGINAL date); moving the date never changes the slot.
- An occurrence is addressed by `rule_id + slot` (`slot` = `YYYY-MM-DD`). Stored rows also have an `id`; a computed one has `id: null`. An edited (stored) row stays when the rule changes and replaces the computed occurrence of the same period.
- "Due" is a computed state, not a draft: `date <= today` and not recorded / cleared / skipped. A rule never produces pending drafts any more. Old recurring drafts already in pending are left alone and live on until the user clears them (pending `source` `recurring` | `upcoming` is never produced again; submitting an old draft still links its item).
- A rule has an internal lower bound of "overdue", `tracked_from` (= its creation day; not in the API; migration backfill `LEAST(created_at, earliest stored slot)`): slots before it are implicitly `paid` (computed, no row, `stored: false`, never overdue, they count in installment progress; a transaction can still be linked to one, which stores the row).
- Rule life cycle (each answers the rule page, `RecurringDetail`; 409 `INVALID_TRANSITION` when the state does not allow it): `pause` (active → paused: while paused the rule has no occurrences, nothing comes due, is listed or auto-created; stored rows stay), `resume` (paused → active), `archive` (pause + hidden from the current list), `restore` (archived → paused), `extend`, `duplicate` (201, a new active rule starting today).
- Resume (owner decision, landed in 068 / the C3 review fixes): the due occurrences from before the pause stay due; the occurrences inside the paused gap are stored as `skipped` (the rule keeps an internal `paused_from`; `tracked_from` is untouched). The due notice and auto-create restart from the resume day.

### Item states

| `status` | Meaning |
|---|---|
| `upcoming` | computed, date after today |
| `due` | date ≤ today, not recorded / cleared / skipped (overdue or due today) |
| `done` | stored, has a transaction (`transaction_id`) |
| `paid` | stored with `cleared_at` and no transaction: "จ่ายแล้ว" (someone else paid, or paid outside the app). Not due, not expected, not an expense in budgets; counts as paid for installment progress |
| `skipped` | stored, archived |
| `pending` | legacy: an old draft still waiting |

### Item JSON

One shape everywhere: month list, due list, picker, a rule's items, every write result.

```json
{
  "id": null, "rule_id": "uuid", "slot": "2026-10-03", "stored": false,
  "auto_created": false, "needs_amount": false,
  "recurring": { "id": "uuid", "name": "Netflix", "icon_code": {}, "kind": "subscription" },
  "seq": 5, "total": 12, "date": "2026-10-03", "days_until": 2, "status": "upcoming",
  "edited": false, "manual": false, "type": "expense", "amount": 419,
  "account": {}, "to_account": null, "category": {}, "goal": null, "tags": [],
  "description": "Netflix ประจำเดือน ต.ค. 2026", "note": null, "splits": [], "project": null,
  "pending_id": null, "transaction": null, "saving_entry_id": null,
  "created_at": null, "updated_at": null
}
```

- `amount` = the transaction's amount once recorded (read from the join, not copied); `null` = unknown. `transaction` = `{id, description, account, amount, date}` or null. `description` = the occurrence name unless the user typed one. `needs_amount` flags a due / this-month occurrence whose amount is unknown. `auto_created: true` = made by auto-create. `seq` / `total` of a stored row are the numbers at the time it was stored.
- `RecurringRef` (the link a transaction carries) gains `kind`.

### Rule JSON and detail

- `GET /recurring?status=current|archived|all&for_type=expense|income|transfer&kind=&category_id=&amount=&q=` answers `{data, counts {current, archived, all}, summary, pagination}` (`for_type` + `category_id` / `amount` = the picker: only active rules of that money type, `likely: true` first). Rule rows (`Recurring`) add: `counts {upcoming (only for a rule with an end), due, pending, done, paid, skipped, not_created (= due), archived (= skipped)}`, `due_count`, `avg_amount`, `chain [{slot, status}]` (rules with an end, at most 60), `auto_create`, `recorded_tx_count`, `saved_count`, `pending_count` (legacy drafts); `progress.done` = recorded + paid + the implicit ones, `progress.total` null without an end; `ending_soon` only for a rule with an end; `current_occurrence {item_id|null, rule_id, slot, date, days_until, amount, status}` = the oldest due, else the next one in the window. The list is ordered overdue first (oldest), then the next one coming, rules with nothing due last (the picker keeps `likely` first). `summary` gains `due_count`, `due_total`.
- `GET /recurring/:id` (and every rule write: `POST` 201, `PUT`, pause / resume / archive / restore / extend / duplicate) answers `RecurringDetail {recurring, items, upcoming, stats, tx_update, account_balances, delete_preview}`:
  - `recurring` = the rule row above; its `recorded_tx_count` is the N for the "apply to recorded transactions?" question.
  - `items` = the history (recorded / paid / skipped / due, newest first, first page); `upcoming` = the first page of what is coming (a rule without an end = a 12-month window; more with `GET /recurring/:id/items?tab=upcoming`).
  - `stats {paid_count, paid_total, remaining_total|null, last_period, avg_amount, last_amount, max_amount, series[{slot, date, amount}] (newest 24)}`.
  - `tx_update` is null except after an edit that sent `also_update_tx`: `{updated_tx_count, failed[{transaction_id, reason: not_found | account_archived | transfer | refused}]}`.
  - `delete_preview` is null except with `?include=delete_preview`: `{items, linked_transactions, pending_drafts}`; `linked_transactions` is the N of "delete the recorded transactions too?".

### Reads

- `GET /recurring-items?status=upcoming|due|done|paid|skipped|pending|all&month=YYYY-MM&rule_id=&page=&per_page=` → `{data, pagination, window: null}` (`state=` is an alias of `status`; `not_created=due` and `archived=skipped` still work).
  - `status=due` = overdue + due today + this month's upcoming ones with no amount (flagged `needs_amount`).
  - `month=` = stored ∪ computed of that month, every status, oldest first, `per_page` 100.
  - The default (`upcoming`) = the next 120 days. `status=all` needs a month (400 otherwise). `kind` is `all | recurring` (the same thing: every item belongs to a rule; `one_off` is gone, 400). It reads the ACTIVE rules only.
  - One stored occurrence by id: `GET /recurring-items/:id` (a computed one has no id: read it with `?month=&status=all&rule_id=`).
- `GET /recurring/:id/items?tab=produced|upcoming[&from=YYYY-MM-DD&months=12]` (`months` max 24):
  - `produced` = the history (recorded / paid / skipped / due), newest first.
  - `upcoming` for a rule WITHOUT an end = a window of `months` from `from` (default tomorrow) with `window {from, to, next_from}`; for a rule WITH an end = all of it, paged.
- `GET /recurring/:id/occurrences?tx_date=&past=3&upcoming=3` → `{data, suggested_slot}`: the overdue ones (newest 24) + `past` earlier + `upcoming` next. `suggested_slot` = the oldest overdue one, else the open one nearest `tx_date` (ties → the earlier), null when none is free. It windows around today, so it cannot fetch an arbitrary slot (use `GET /recurring-items?month=&status=all&rule_id=`).

### Writes by slot

Every write answers `ItemWriteResult {item, transaction, account_balances, setting}`.

| Call | Body | Notes |
|---|---|---|
| `PUT /recurring/:id/occurrences/:slot` | partial: `type, amount, date, description, note, account_id, to_account_id, category_id, tag_ids, also_update_link` | key present = set, null = clear; makes the row stored + `edited`; `date` moves it (the slot stays); with `also_update_link` a recorded occurrence's transaction gets the same change; 404 when the slot is not an occurrence |
| `POST …/:slot/confirm` | optional `{amount?, date?, …overrides}` | creates the transaction now; its date = the occurrence date unless `date`; the description defaults to the occurrence name; 400 `AMOUNT_REQUIRED`, 409 `ALREADY_RECORDED`, 404 |
| `POST …/:slot/skip` | optional `{delete_tx?}` | skipped; with `delete_tx` the linked transaction is deleted first (balances come back), otherwise it stays and only the link goes |
| `POST …/:slot/restore` | – | a skipped occurrence goes back to due / upcoming by its date |
| `POST …/:slot/mark-paid` | – | "จ่ายแล้ว": settled without a transaction (someone else paid, or outside the app); a transaction can still be linked later |
| `POST …/:slot/unmark-paid` | – | a paid occurrence goes back to due / upcoming by its date |
| `POST …/:slot/link` | `{transaction_id, replace?}` | → `RecurringLinkResult`; see Linking |
| `POST …/:slot/unlink` | – | → `RecurringUnlinkResult {item, setting}`; see Linking |

Bulk, per rule (one DB transaction, idempotent) → `{items, left_out[{slot, reason: "needs_amount"}], account_balances, setting}`: `POST /recurring/:id/occurrences/confirm-ready` (every due occurrence whose amount is known; the transactions are dated the occurrence date), `…/mark-paid-ready` (every due occurrence → `paid`), `…/skip-ready` (every due occurrence → `skipped`).

By-id calls keep working for STORED rows (a computed occurrence has no id):
- `GET /recurring-items/:id` → `RecurringItem`.
- `PUT /recurring-items/:id` = this occurrence only (`scope` other than `this` is ignored; edit the rule for the rest), → `RecurringItemsWriteResult {items, account_balances, setting}`; `also_update_link` as above.
- `DELETE /recurring-items/:id[?delete_linked_tx=true]` deletes the STORED row: the occurrence goes back to computed (a manual extra one is gone); its transaction stays, unlinked, unless `delete_linked_tx` → `{id, transaction_id, account_balances, setting}`.
- `POST /recurring-items/:id/link|unlink` = the same as by slot (same `replace`, same 409 details); `POST /recurring-items/:id/archive` = skip, `…/restore` = un-skip (the link, if any, stays on archive); → `RecurringItemWriteResult`.
- `POST /recurring-items` adds an EXTRA occurrence of a rule (`recurring_id`, `date`, `type`, `amount` required; 400 `VALIDATION_ERROR` without `recurring_id`; dated after today → upcoming, else due), 201 → `RecurringItemWriteResult`.

Removed: `POST /recurring-items/batch`, `POST /recurring-items/:id/create`.

### Linking (one occurrence ↔ one transaction)

- Link rules: same type as the rule; the transaction not already linked; the occurrence not skipped. The transaction KEEPS its own date and amount (early / late payment is fine, no `edited` flag; the row's `date` stays the slot).
- Result `LinkResult {item, transaction, amount_differs, rule_amount, transaction_amount, account_balances, setting}`; the app uses `amount_differs` to ask "update the rule's amount?".
- If the occurrence or the transaction is already linked: 409 `ITEM_ALREADY_LINKED` with `details {transaction {id, amount, date, description}, other {rule_id, slot}}` (the other occurrence when the transaction is the taken side). Send `replace: true` to swap: in ONE DB transaction the previous transaction is unlinked (it stays, only the link goes) and the new one linked; a transaction that was linked to another occurrence moves, and that occurrence goes back to computed.
- Link on a `paid` row sets `transaction_id` (state `done`, `cleared_at` kept).
- Unlink (`RecurringUnlinkResult {item, setting}`; 400 `VALIDATION_ERROR` when the occurrence has no transaction): the transaction stays. A row that was cleared first goes back to `paid` (never due); a row that never was (made by confirm or a direct link) goes back to computed `due` / `upcoming`.
- Link errors: 400 `VALIDATION_ERROR` when the transaction's type differs from the rule's; 404 when the rule / slot / transaction is not yours.

### Transaction delete hook

Any transaction delete releases the occurrence it recorded (before, only with `also_delete_link`): the occurrence goes back to `due` / `upcoming` (to `paid` if it had been cleared first). `DELETE /transactions/:id?skip_occurrence=true` also skips it, atomically. The result of a transaction delete carries `recurring_item_id` (the stored occurrence it released / skipped, null when it had none). Rule delete: `DELETE /recurring/:id[?delete_linked_txs=true]` is a hard delete of the rule and its stored rows; the recorded transactions stay, unlinked, unless `delete_linked_txs=true` (they go too and the balances come back) → `{id, deleted_transaction_count, account_balances}`. The N for the question is `delete_preview.linked_transactions` (`GET /recurring/:id?include=delete_preview`).

### Rule edit

`PUT /recurring/:id` is partial (`RecurringUpdateRequest`: the value fields `type, amount, account_id, to_account_id, category_id, description, note, tag_ids`, plus `name, kind, trial_until, icon_code, rule, start_date, end, scope` (`upcoming` default | `all`), `also_update_link`) and accepts `auto_create` and `also_update_tx`. Every occurrence that is only computed follows a rule / start / end change; a stored (edited) one keeps its values.
- The app asks ONE question, only when `name`, `category_id`, `account_id`, `tag_ids` or `note` change and the rule has recorded transactions (`recorded_tx_count`).
- `also_update_tx: true` pushes name / category / wallet / tags / note to the transactions already recorded, never date or amount, through the normal transaction update (a wallet change moves the balance). A name is rewritten only when the transaction's description still is the OLD auto name for that slot (a description the user edited is left alone). A transaction that cannot be updated (for example a transfer type or an archived wallet) is skipped and listed in `tx_update.failed`; it never fails the rule edit.
- Date / frequency / amount changes never ask and never touch recorded transactions; they act on future (computed) occurrences only; edited (stored) occurrences stay.
- `POST /recurring/:id/extend` body `{end}` (date / count, at most 2 years after the start) only pushes the END of a rule that has one (409 otherwise); nothing is generated, the ending notice re-arms.

### Auto-create (C8, "บันทึกอัตโนมัติเมื่อถึงวัน")

- Rule field `auto_create` (read / write on `POST` / `PUT /recurring`). It needs a fixed amount and a wallet: 400 `AUTO_CREATE_NEEDS_AMOUNT` / `AUTO_CREATE_NEEDS_WALLET`, also on a later edit that clears them (the app turns the switch off first). A transfer also needs `to_account_id`.
- Switching it on sets a marker `auto_created_until` = yesterday, so an occurrence due today counts and older ones stay `due`; off, then on again, and resume reset the marker (the off period is never back-created).
- The due check (it runs on the first read of the day: list, detail, dashboard, me, notifications, sync — no clock job) records, per active rule, the occurrences in (marker, today]: skipped / paid / recorded ones are left; an edited one uses its stored values. The transaction is dated the occurrence date, `description` = the occurrence name, the row is stored `done` with `auto_created_at` (item `auto_created: true`), all in the same DB transaction (a failing slot stays `due`, never retried by auto).
- Deleting an auto-made transaction returns the occurrence to due and it is never re-created.
- Notice: one grouped `recurring_auto_created` per user per day (see 13 — Notifications).

### Occurrence names (C2)

The occurrence name is the transaction `description` and the item `description`. It is computed from the SLOT (moving the date never renames), in the user's language from preferences, with Gregorian years; a stored row keeps a name only if the user typed one, so renaming a rule reaches every unstored occurrence. `OccurrenceName(rule name, freq, interval, weekdays, slot, seq, total, lang)`:

| Rule | Thai | English |
|---|---|---|
| daily | `ประจำวันที่ 20 ต.ค. 2026` | `Lunch – 20 Oct 2026` |
| every 3 days | `ประจำ 20–22 ต.ค. 2026` | |
| weekly | `ประจำสัปดาห์ 20–26 ต.ค. 2026` (across months: `28 ต.ค. – 3 พ.ย. 2026`) | `Swimming – week of 20–26 Oct 2026` |
| every 2 weeks | `ประจำ 20 ต.ค. – 2 พ.ย. 2026` | `Cleaner – 20 Oct – 2 Nov 2026` |
| monthly | `ประจำเดือน ต.ค. 2026` | `Netflix – Oct 2026` |
| every 3 months | `ประจำ ต.ค. – ธ.ค. 2026` | `Insurance – Nov 2026 – Jan 2027` |
| yearly | `ประจำปี 2026` (every 2 years: `2026–2027`) | `Car tax – 2026` |
| installment | `… งวด 5/12 ประจำเดือน ต.ค. 2026` | `iPhone 17 5/12 – Oct 2026` |

`dates` rules and weekly rules with several weekdays are named like daily. The span is sized from the rule's step, never from the next row, so the last occurrence reads like the others. An empty rule name gives the period only; interval 0 counts as 1; any language other than `en` is Thai.

### Readers: budgets, dashboard, me

They read the recurring service through `shared.Expecter.ExpectedBetween(userID, from, to)` (computed + edited occurrences; nil = the old SQL).
- Budgets: see 08 — Budgets (source `upcoming`, `rule_id` / `slot`).
- `GET /dashboard`: `upcoming` items = the next 14 days, never the due ones; every recurring item carries `rule_id` + `slot` (null on a `card_due` row), and its `id` = the stored item, else the rule id.
- `GET /me/counts` `recurring`: `active_count`, `upcoming_count` (next 14 days, not due), NEW `due_count` (due / overdue; `paid` excluded) and `needs_amount_count` (amount unknown, dated this month). `pending.counts.recurring` is dropped.

### Errors

| Status | Code | When |
|---|---|---|
| 400 | `AMOUNT_REQUIRED` | confirm of an occurrence with an unknown amount and no `amount` |
| 400 | `AUTO_CREATE_NEEDS_AMOUNT` / `AUTO_CREATE_NEEDS_WALLET` | auto-create on a rule without a fixed amount / a wallet |
| 400 | `VALIDATION_ERROR` | `POST /recurring-items` without `recurring_id`; `status=all` without a month; `kind=one_off` |
| 409 | `ALREADY_RECORDED` | the occurrence already has a transaction (also a second parallel confirm) |
| 409 | `ITEM_ALREADY_LINKED` | link when either side is taken (`details` as above; send `replace`) |
| 409 | `INVALID_TRANSITION` | pause / resume / archive / restore from a state that does not allow it |
| 409 | – | `extend` on a rule with no end |
| 404 | `NOT_FOUND` | the slot is not an occurrence of the rule (or the rule / item is not yours) |
| 400 | `INVALID_RULE` / `END_TOO_FAR` | the rule is not valid / an end more than 2 years after the start |

## 12 — Personal Debts

Recent additions (2026-10-13, 0.3.1-10): the person ledger — `GET /v1/personal-debts/people`, `GET /v1/personal-debts/people/:key`, `GET|POST /v1/personal-debts/people/:key/entries`, `GET|PUT|DELETE /v1/personal-debts/:id`; entries paid | received, a paid label, an optional wallet transaction (one record); `GET|POST /v1/personal-debts`, `/cancel`, `/settle` and `split_paid` retired — [`../spec/12-personal-debts.md`](../spec/12-personal-debts.md) §0. **Source of truth for shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

## 13 — Notifications

Recent additions (2026-10-13, 0.3.1-10): types `recurring_due` (grouped, `{count}`, `/pending`) and `recurring_ending` (`{recurring_id, name, left}`, `/recurring/{id}`); `GET /v1/notifications` and `/unread-count` run the recurring due check first — [`../spec/13-notifications.md`](../spec/13-notifications.md) §2.9–2.10.

Recent additions (2026-10-20, 0.4.0-2, C3 + C8 — migration 068): recurring left pending, so the notices moved with it.
- `recurring_due`: still ONE grouped notice, counting the occurrences that came due since the last due notice (an internal marker, set to the migration day, so nothing floods on day one); payload `{count}`; the deep link is now `/recurring?focus=due` (it was `/pending`; migration 068 repoints old unread notices; an unread grouped notice bumped again also gets the new link).
- NEW `recurring_auto_created`: ONE grouped notice per user per day, upserted by user + type + date, so the `count` in its payload `{count, date}` accumulates over that day's due checks (a second date makes a second row). It is a quiet notice: deep link `/recurring`, not bumped to the top, not in the attention lists, and it can be muted (`mutableTypes`; `notification_settings.muted_types` has no CHECK). The `notifications_type_check` constraint is widened by migration 068, so inserting the new type fails until 068 is applied.
- `recurring_ending` is unchanged (only for a rule WITH an end, left ≤ 2).
- Shapes (`NotificationType`, payloads): **source of truth `chubi-pocket-be/internal/apidoc/openapi.yaml`.**

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

- **Last updated** — 2026-10-20
- **Version** — 0.8 (0.4.0-2: computed recurring occurrences + by-slot writes + auto-create + occurrence names + due / auto-created notices (§11, §13); future-dated transactions are plain (§04); goals `?month=` (§09); budget `tag_refs` + `future_tx` / `upcoming` sources (§08); card `month_in` (§03); me / dashboard counts (§11) — 2026-10-20)
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
| Saving goal | `POST /saving-goals/:id/archive` (also with money held, 0.4.0-1: it counts in no total until restored) | `POST /saving-goals/:id/restore` | `DELETE /saving-goals/:id` (only empty) | closing a goal (ปิดเป้าหมาย) moves the money first |
| Event | `POST /projects/:id/archive` | `POST /projects/:id/restore` | `DELETE /projects/:id` (`?delete_linked_txs`) | owner only; restore = active |
| Contact | `POST /contacts/:id/archive` | `POST /contacts/:id/restore` | `DELETE /contacts/:id` | archive only hides; delete drops records to typed names |
| Recurring | `POST /recurring/:id/archive` | `POST /recurring/:id/restore` | `DELETE /recurring/:id` (`?delete_linked_txs`) | an occurrence (0.4.0-2): skip / restore by slot (`POST /recurring/:id/occurrences/:slot/skip` / `restore`); `DELETE /recurring-items/:id` for a stored row; an occurrence is never "deleted", it goes back to computed |
| Notification | `POST /notifications/:id/dismiss` | `POST /notifications/:id/restore` | `DELETE /notifications/:id` | |
| Category, tag, transaction, debt entry, pending draft | — | — | `DELETE …` / `POST /pending-transactions/discard` | delete only (no archive) by design |

`GET /me/archived` lists the archived ones of the first seven rows in one call (`GET /me/counts` has the total). All archive / restore / delete answers carry the final state the page needs.
