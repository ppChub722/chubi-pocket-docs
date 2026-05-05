# Logging Plan

How ChubiPocket logs across closed beta → wider beta → production. Solo dev + AI-assisted, so the plan favors **simple, env-driven dials** over heavy infrastructure.

> **Scope:** BE (`chubi-pocket-be`, Go + Gin + slog) is the primary target. FE clients (`-app`, `-web`) hook into the same correlation IDs and ship errors to Sentry. Audit log is a separate stream and gets its own section.

---

## Goals

- **Closed beta:** maximum debugging signal. We have <10 users; volume is tiny, bug reports are precious.
- **Wider beta:** dial down volume, keep errors + audit. No code changes — flip env vars.
- **Production:** errors, warnings, audit only. Searchable. Alerted on.
- **Always:** no secrets/PII in logs, ever. Every request traceable end-to-end via a request ID.

---

## Phase strategy

| Phase | `LOG_LEVEL` | `LOG_BODIES` | App log storage | Error tracking | Audit log |
|---|---|---|---|---|---|
| Closed beta (now) | `debug` | `true` | stdout → rotating file on BE host | Sentry (free tier) | DB table |
| Wider beta | `info` | `false` | Axiom or Better Stack (ingest from stdout) | Sentry | DB table |
| Production | `warn` | `false` | Same + retention policy + alerts | Sentry + alerting | DB table + cold backup |

Switching phase = edit `.env` + restart. No code changes.

---

## Two streams, kept separate

### 1. Application log
Debug noise, HTTP traces, errors. Short retention (7–30 days). Disposable.
- Format: JSON in prod, pretty in dev (already done — see `internal/platform/logger/logger.go`).
- Sink: stdout. Container/host runtime forwards it.

### 2. Audit log
"User X did Y at time Z to record W." Long retention. Source of truth for finance data lineage. **Never** mixed with app log.
- Stored in Postgres table `audit_log` (separate concern from `app.*` tables — see schema below).
- Written from service layer, not middleware (only successful state changes).

---

## What to log / what NOT to log

### Always log
- HTTP request: method, path, status, latency, IP, request ID, user ID (if authed).
- Errors: full error chain + stack (handled by slog + `AddSource: true`).
- Auth events: login success/failure, token refresh, logout.
- Audit events (separate stream): every state change to user data.

### Log in beta only (`LOG_BODIES=true`)
- Request body (redacted, capped at 4KB).
- Response body (redacted, capped at 4KB).

### Never log
- Passwords, tokens (JWT, refresh, API keys), OTP/PIN.
- Authorization headers.
- Full account/card numbers, CVV.
- Any field whose name matches the redaction list (see component 3).

If unsure → redact. Adding fields to the allowlist later is easy; un-leaking a token is not.

---

## Components to build

All live under `internal/platform/logger/` in `chubi-pocket-be`.

### 1. Env-driven log level
Update `logger.New(env)` to read `LOG_LEVEL` env var; fall back to `debug` in dev, `info` in prod.

### 2. Request ID middleware (`request_id.go`)
- Reads `X-Request-ID` header from clients; generates UUID if absent.
- Stores on `gin.Context`; echoes back in response header.
- Helper `FromCtx(c, base)` returns a logger pre-bound with `request_id`.
- **FE clients (`-app`, `-web`) must send `X-Request-ID`** so logs correlate across stacks.

### 3. Redaction utility (`redact.go`)
- `RedactJSON([]byte) []byte` — walks JSON, replaces values for keys matching the redact list with `"[REDACTED]"`.
- Redact list (case-insensitive substring): `password`, `passwd`, `secret`, `token`, `authorization`, `apikey`, `api_key`, `pin`, `otp`, `ssn`, `card`, `cvv`.
- Non-JSON bodies: skip (or drop entirely — decide per route).

### 4. Enhanced Gin middleware (`gin_logger.go`)
Replaces current implementation. Adds:
- `request_id` on every line (from context).
- Body capture (req + res) gated by `LOG_BODIES=true`, redacted, truncated at 4KB.
- Status-based level: 5xx → Error, 4xx → Warn, else Info.
- Always includes: status, method, path, query, latency_ms, ip, user_id (if present).

### 5. Service-layer logging
In handlers/services, get the bound logger via `logger.FromCtx(c, h.log)`. Use `Debug` for "what I'm doing now", `Info` for milestones, `Warn` for recoverable oddities, `Error` for failures.

### 6. Audit log (separate from app log)
New table + a thin service. **Not middleware** — the service layer calls `audit.Record(...)` after a successful write.

```sql
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id    UUID,                -- user who did it (nullable for system actions)
    action      TEXT NOT NULL,       -- e.g. "transaction.created"
    entity      TEXT NOT NULL,       -- e.g. "transaction"
    entity_id   TEXT NOT NULL,       -- pk of the affected row
    request_id  TEXT,                -- correlate with app logs
    metadata    JSONB,               -- before/after diff, contextual data (redacted)
    ip          TEXT
);
CREATE INDEX idx_audit_actor ON audit_log (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id);
```

Examples of audit events to record:
- `user.signup`, `user.login`, `user.password_changed`
- `transaction.created`, `transaction.updated`, `transaction.deleted`
- `account.created`, `category.created`
- Anything that changes user-owned financial state.

Retention: keep forever in Phase 0–1; revisit before scale-up.

---

## Frontend hookup

### `chubi-pocket-app` (Flutter)
- Generate a UUID per outbound request in the dio interceptor; send as `X-Request-ID`.
- On error response, log the request_id locally and show it (small) on error screens — testers can copy it into bug reports.
- Wire Sentry Flutter SDK; tag events with `request_id` and `user_id`.

### `chubi-pocket-web`
- Same pattern in the web HTTP client.
- Sentry Browser SDK.

When a tester reports "it broke", they paste the request ID; we grep app log + audit log for the full trace.

---

## Storage choices

### Closed beta
**Stdout → rotating file on the BE container host.** Cheap, zero setup beyond Docker log rotation. SSH in to tail. Sentry catches errors automatically.

Docker compose log rotation:
```yaml
services:
  backend:
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
```

### Wider beta onward
**Axiom** (preferred) or **Better Stack** for searchable log ingest. Both have generous free tiers and ingest from stdout via a lightweight forwarder. Pick one when closed beta ends.

Skip CloudWatch/Datadog at this stage — overkill for the project size.

### Sentry (all phases)
Wire BE + FE from day one. Free tier is enough for a small beta. It's the difference between "user said something broke" and "here's the stack trace + breadcrumb trail."

---

## Implementation checklist

Closed-beta readiness — do these in `chubi-pocket-be`:

- [ ] Add `LOG_LEVEL` parsing to `logger.New`
- [ ] Add `LOG_BODIES` flag, default `false`
- [ ] Create `internal/platform/logger/request_id.go`
- [ ] Create `internal/platform/logger/redact.go` + tests for the redact list
- [ ] Rewrite `gin_logger.go` to include request_id, body capture (gated), status-based level
- [ ] Wire middlewares in router: `RequestIDMiddleware()` BEFORE `GinLoggerMiddleware(log)`
- [ ] Create `audit_log` migration + `internal/platform/audit/` service
- [ ] Call `audit.Record(...)` from each state-changing service method
- [ ] Add Docker log rotation to `docker-compose.yml`
- [ ] Wire Sentry SDK (BE)
- [ ] Document the `.env` flags (closed beta vs prod) in `chubi-pocket-be/README.md`

In `chubi-pocket-app`:

- [ ] Dio interceptor: generate + send `X-Request-ID`
- [ ] Sentry Flutter SDK
- [ ] Error screens display request_id (copy-to-clipboard)

In `chubi-pocket-web`:

- [ ] HTTP client: generate + send `X-Request-ID`
- [ ] Sentry Browser SDK

---

## Operational playbook

**Tester reports a bug:**
1. Get request_id from the error screen (or approximate timestamp + user_id).
2. Sentry first — usually has the stack trace.
3. App log: filter by `request_id` → full trace of that request.
4. Audit log: filter by `actor_id` + time window → what state changed.

**Phase transition (beta → wider beta):**
1. Edit `.env`: `LOG_LEVEL=info`, `LOG_BODIES=false`.
2. Restart BE container.
3. Verify logs no longer contain bodies.
4. Set up Axiom/Better Stack ingestion.

**Phase transition (wider beta → prod):**
1. `LOG_LEVEL=warn`.
2. Add retention policy in log store (30d app log, forever audit).
3. Wire Sentry alert rules (slack/email on first occurrence + spike detection).

---

## Open questions (decide when relevant)

- Audit log diffing: store full before/after, or just changed fields? (Lean: changed fields only — saves space, easier to read.)
- Retention for app log in prod: 30d default, longer for security events?
- When to migrate audit log out of Postgres? (Likely never — it's small relative to financial data and queries are simple.)
