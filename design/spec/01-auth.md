# 01 — Authentication

Identity and session management — registration, login, logout, password, and (from later phases) email verification, token refresh, OAuth, and identity changes. Owns the `users` table and the `refresh_tokens` table.

Profile and preferences endpoints (`/users/me`, theme, language, avatar, etc.) live in [`02-users.md`](02-users.md).

Global conventions (base URL, error envelope, data types, HTTP verbs) are defined in [`overview.md`](overview.md). This file only documents what is specific to auth.

---

## Phase summary

| Concern | Phase 0/1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Register / login / logout | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ |
| Email **required** at registration | — (optional) | ✅ | ✅ |
| Email verification | — | ✅ | ✅ |
| Password reset via email | — | ✅ | ✅ |
| Refresh tokens (15-min access + 7-day refresh) | — | ✅ | ✅ |
| Change email (with re-verification) | — | ✅ | ✅ |
| Google OAuth sign-in | — | — | ✅ |
| Change username | — | — | ✅ |
| Rate limiting | — | — | ✅ |
| Account lockout | — | — | ✅ |
| Access-token blocklist (instant revoke) | — | — | ✅ |
| Audit log | — | — | ✅ |
| 2FA (TOTP) | — | — | optional |

---

## 1. Schema

Tables owned by this module: `users`, `refresh_tokens` *(Phase 2+)*, `email_verification_tokens` *(Phase 2+)*, `password_reset_tokens` *(Phase 2+)*, `oauth_identities` *(Phase 3+)*.

Full column definitions, constraints, and indexes: see [`../database/schema.md#01--auth`](../database/schema.md#01--auth).

---

## 2. API

Paths are rooted at `/api`. All endpoints are `POST` unless otherwise noted. Auth required for logout, change password, change email, and link-oauth; all others are public.

### 2.1 Phase 0/1 endpoints

#### `POST /v1/auth/register`

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

| Field | Type | Required (Phase 1) | Required (Phase 2+) | Rules |
|---|---|---|---|---|
| `username` | string | ✅ | ✅ | 3–50 chars; `[a-z0-9_-]` only; unique |
| `password` | string | ✅ | ✅ | min 8, max 128 chars |
| `display_name` | string | ✅ | ✅ | 1–100 chars; any Unicode |
| `email` | string | — | ✅ | valid RFC 5322; unique |
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

- `expires_in` — `2592000` (30 days) in Phase 0/1; `900` (15 min) in Phase 2+
- Phase 2+ response also includes `"refresh_token": "rt_..."` alongside `access_token`
- Phase 2+ also triggers a verification email on register (see `/auth/verify-email/request`)

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field failed validation |
| 409 | `USERNAME_EXISTS` | Username already registered |
| 409 | `EMAIL_EXISTS` | Email already registered *(only if email provided)* |

#### `POST /v1/auth/login`

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
| `identifier` | string | ✅ | Username, or email. Server detects email by presence of `@`. If the user never set an email, only username works. |
| `password` | string | ✅ | — |

**Success — `200 OK`:** same shape as register.

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing fields |
| 401 | `INVALID_CREDENTIALS` | User not found, or password mismatch — response intentionally does not distinguish |

#### `POST /v1/auth/logout`

*Requires auth.*

Invalidate the current session.

- **Phase 0/1:** best-effort — client discards token. The token remains technically valid until its `exp` (30 days). Acceptable during dev.
- **Phase 2+:** revokes the refresh token associated with the session (sets `revoked_at`). Access token still valid until its 15-min expiry.
- **Phase 3+:** additionally adds the access token's `jti` to the blocklist for immediate revocation.

**Success — `200 OK`:**

```json
{ "message": "Logged out successfully" }
```

#### `PUT /v1/auth/password`

*Requires auth.*

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

**Side effects from Phase 2+:**

- All existing refresh tokens for this user are revoked (forces re-login on other devices)
- Phase 3+: current access token is added to the blocklist

**Errors:**

| HTTP | Code | Cause |
|---|---|---|
| 400 | `VALIDATION_ERROR` | New password fails rules, or matches current |
| 401 | `WRONG_PASSWORD` | Current password doesn't match |

---

### 2.2 Phase 2+ endpoints

#### `POST /v1/auth/refresh`

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

**Token-reuse detection:** if a refresh token is presented that was already rotated (`replaced_by_id IS NOT NULL`), the server revokes the entire token chain for that user. Likely theft — user is forced to re-login on all devices.

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_REFRESH_TOKEN`.

#### `POST /v1/auth/verify-email/request`

*Requires auth.*

Send a verification email to the user's current email. No body.

**Success — `200 OK`:** `{ "message": "Verification email sent" }`

Idempotent — spamming this endpoint does not spam the user. Server rate-limits sends to max 1 per minute per user.

#### `POST /v1/auth/verify-email/confirm`

Public endpoint. Consume a verification token from the email link.

**Request body:** `{ "token": "<token>" }`

Sets `users.email_verified_at = NOW()`. Marks the token used.

#### `POST /v1/auth/password-reset/request`

Public endpoint. Request a password-reset email.

**Request body:**

```json
{ "identifier": "alice" }
```

- `identifier` — username or email
- Response is always `200 OK` with `{ "message": "If an account exists, a reset email has been sent" }` — never reveals whether the identifier matched a user (enumeration defense)
- If a user has no email set, the request silently no-ops

#### `POST /v1/auth/password-reset/confirm`

Public endpoint. Consume reset token and set new password.

**Request body:**

```json
{
  "token": "<token>",
  "new_password": "newpassword"
}
```

Consumes the token (one-time use), updates `password_hash`, revokes all refresh tokens for the user.

#### `PUT /v1/auth/email`

*Requires auth.*

Change email. Requires current password + new email. Creates a `change_email` verification token sent to the **new** email address; email isn't updated until the link is clicked.

**Request body:**

```json
{
  "current_password": "...",
  "new_email": "alice@new.example.com"
}
```

Completion via `POST /v1/auth/verify-email/confirm` (same endpoint, different `purpose` on the token).

---

### 2.3 Phase 3+ endpoints

#### `POST /v1/auth/google`

Sign in with Google. Accepts a Google-issued ID token on the client; server verifies against Google's JWKs.

**Request body:**

```json
{ "id_token": "eyJ..." }
```

Flow:

1. Decode + verify `id_token` against Google's public keys
2. Look up `oauth_identities` by `(provider='google', provider_user_id=<sub>)`
3. If found → log in that user
4. If not found but Google email matches an existing `users.email` → prompt for password to link (or auto-link if configured)
5. If no match at all → auto-register a new user with a generated username and the Google email/display_name; require password setup on first login

**Success — `200 OK`:** same shape as `/auth/login`.

#### `PUT /v1/auth/username`

*Requires auth.*

Change username. Ceremonial — rate-limited to once per 30 days per user.

**Request body:** `{ "new_username": "new_alice", "current_password": "..." }`

---

### 2.4 Token shape (JWT claims)

All access tokens are JWTs signed with HS256 using `JWT_SECRET` from env.

```json
{
  "sub": "0190e3f8-e1b4-7c5d-8e7a-9f1b8c3e6d5f",
  "iat": 1714132800,
  "exp": 1716724800,
  "jti": "0190e3f8-e1b5-7a2c-9d4f-1b8c3e6d5f2a",
  "type": "access"
}
```

| Claim | Meaning |
|---|---|
| `sub` | User ID |
| `iat` | Issued at (Unix seconds) |
| `exp` | Expiry — 30-day in Phase 0/1; 15-min in Phase 2+ |
| `jti` | Token UUID — used by Phase 3 blocklist |
| `type` | `"access"` (refresh tokens are opaque, not JWT) |

**No sensitive claims.** Never put email, username, or role into the JWT — fetch from DB on each request (cheap; indexed lookup by `sub`).

### 2.5 Auth middleware

On every protected route:

1. Extract `Authorization: Bearer <token>` header
2. Parse + verify JWT signature against `JWT_SECRET`
3. Check `exp` against current time
4. *(Phase 3+)* Check `jti` against blocklist
5. Load user by `sub` from DB — fail with `401` if user missing
6. Inject `user_id` and `user` into request context

Errors return the standard envelope:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

---

## 3. Design decisions

### 3.1 Three identity fields: username + email + display_name

- **`username`** — stable login handle; lives in URLs and `@mentions`; lowercase ASCII only so it's safe everywhere
- **`email`** — communication channel; used for verification, password reset, contact-linking lookup
- **`display_name`** — human-readable; free text; mutable; non-unique

Single-field identity (email-only) conflates these. Three fields are cheap and pay off in UX.

### 3.2 Email is optional in Phase 1, required from Phase 2

- Phase 1 is dogfooding — no password reset, no email infrastructure. Requiring email gates registration on a field that has no phase-1 use.
- Phase 2 introduces email verification + password reset, which requires email.
- Migration: when Phase 2 lands, users without email are prompted to add one on next login. Not a hard block immediately; becomes a block when accessing features that need email (contact linking by email, password reset, notifications).

### 3.3 Login identifier accepts username or email

Reduces friction. Server detects by `@`. Collision impossible (separate UNIQUE constraints). Users without email simply can't use email as identifier.

### 3.4 argon2id for password hashing

Modern default; GPU-crack resistant. Cost parameters in env so they can be bumped without code changes. Target ~250ms hash time on production hardware.

### 3.5 JWT over session cookies

Three reasons for Bearer header instead of cookies:

- Flutter-first architecture — mobile + Flutter web + Next.js admin all consume the same API; Bearer is natural across all three
- No CSRF surface — Bearer tokens aren't auto-sent by browsers
- No session store to scale until Phase 3 blocklist

Trade-off: can't instantly revoke an access token until Phase 3. Acceptable because access tokens are short-lived from Phase 2 onward.

### 3.6 Phased token strategy

- **Phase 0/1** — single 30-day JWT. Dev-friendly; log in once a month.
- **Phase 2** — 15-min access + 7-day refresh. Refresh tokens stored server-side (hashed) so they're revocable. Rotation on every use; token-reuse detection revokes chain.
- **Phase 3** — adds access-token blocklist for immediate revocation.

Migration: rotating `JWT_SECRET` on the Phase 2 deploy invalidates all existing Phase-1 JWTs. Dogfooders re-login once.

### 3.7 Password change behavior by phase

- **Phase 0/1** — updates hash; existing JWTs remain valid until their `exp` (30 days). Not ideal; tolerable in dev.
- **Phase 2+** — additionally revokes all refresh tokens, forcing re-login on other devices.
- **Phase 3+** — additionally adds current access token to blocklist.

### 3.8 Intentionally vague errors

- `INVALID_CREDENTIALS` for both "user not found" and "wrong password" — prevents login enumeration
- Password reset request always returns success — prevents identifier enumeration
- Token-related errors use `INVALID_REFRESH_TOKEN` / `UNAUTHORIZED` rather than distinguishing expiry vs. revoke vs. malformed

### 3.9 Refresh tokens: hashed, rotated, single-use

- Store SHA-256 hash of the plaintext token (same principle as password hashing)
- Every refresh rotates the token — the old one is revoked, a new one issued
- Reuse of a rotated token triggers whole-chain revocation (theft defense)

### 3.10 OAuth deferred to Phase 3

Google sign-in is user-visible UX so it feels like a Phase 2 feature, but it brings:

- Account-merging logic (user has both password and Google — which canonical? how to merge?)
- Handling of email conflicts (Google email matches existing user's email)
- Consent and verification coordination with the external provider
- Additional infrastructure (Google OAuth client, JWK caching)

That's production-grade work. Phase 3 is the right home — when going public, where Google sign-in dramatically helps conversion, that's also when the complexity is worth paying for.

### 3.11 Username changes are ceremonial

Username lives in URLs and may be referenced externally. Changing it breaks links and mentions. Allow but rate-limit (once per 30 days) to discourage churn. Phase 3+.

---

## 4. Open questions

- **Password complexity rules.** Currently just "min 8, max 128." Consider NIST SP 800-63B guidance (check against common-passwords list) in Phase 3.
- **2FA (TOTP).** Useful for Phase 3 or post-launch. Would add `user_2fa` table with encrypted secret + backup codes.
- **Passkeys / WebAuthn.** Post-launch if user demand warrants.
- **`jti` blocklist backend.** Redis vs. Postgres row-with-TTL. Decide during Phase 3.
- **argon2id cost parameters.** Benchmark on chosen VPS during Phase 3; target ~250ms.
- **"Signed-in devices" UI.** `refresh_tokens.user_agent` + `ip` columns support this — Phase 3 or later.
- **Provider extensibility.** `oauth_identities.provider` is a string, extensible to Apple / GitHub / Facebook if demand appears.

---

## 5. Status

- **Phase** — spec; Phase 0/1 implementation pending
- **Last updated** — 2026-04-24
- **Version** — 0.2 (email optional in Phase 1; `/auth/password` owned here; OAuth + phase-2/3 endpoints stubbed)
