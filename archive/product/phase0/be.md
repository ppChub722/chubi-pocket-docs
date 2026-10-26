# Phase 0 — Backend

**Goal:** API serves auth + user endpoints; runs in Docker; structured logs in place; one migration applied; reference module structure that Phase 1+ modules will copy.

**Stack** (locked): Go + Gin, `pgx/v5`, argon2id, JWT, `slog`, `golang-migrate`, Docker.

For database setup specifics, see [`db.md`](db.md). For CI (deferred), see [`ci-cd.md`](ci-cd.md).

---

## Tasks

### Repo & infrastructure

- [ ] **Repo skeleton** — handlers / services / data layer separation; `cmd/`, `internal/`, `migrations/`, `Makefile` or task runner
- [ ] **Docker setup** — see [`db.md`](db.md) for DB; backend `Dockerfile` (multi-stage build → minimal runtime image); `docker-compose.yml` for dev with `postgres` + `backend` services + named volume + healthchecks. Dev workflow = `docker-compose up`. Same image deploys to VPS in Phase 3.
- [ ] **DB connection pool** — `pgx/v5`; connection string from env var (defaults work in `docker-compose`)
- [ ] **Hot reload** — Air (`.air.toml`) for dev iteration

### Middleware & error envelope

- [ ] **Middleware** — auth (JWT bearer), CORS, request logging, panic recovery, error envelope wrapper
- [ ] **Error envelope** — uniform `{ "error": { "code", "message", "details" } }` per [`../../design/spec/overview.md §3`](../../design/spec/overview.md). Build a helper that handlers call.
- [ ] **Validation pattern** — request body → typed struct → validator (using `go-playground/validator` or similar). Return `400 VALIDATION_ERROR` with field-level details.
- [ ] **`GET /health`** — returns `{ "status": "ok" }`; no auth required
- [ ] **Structured logging** (`slog`) — JSON output in non-dev; per-request log with method/path/status/latency

### Auth endpoints

Per [`../../design/spec/01-auth.md`](../../design/spec/01-auth.md):

- [ ] `POST /v1/auth/register` — argon2id password hashing; insert `users`; return user + 30-day JWT
- [ ] `POST /v1/auth/login` — username or email; return token
- [ ] `POST /v1/auth/logout` — best-effort (Phase 0 token is long-lived; client just discards)
- [ ] `PUT /v1/auth/password` — current password required; argon2id rehash

### Users endpoints

Per [`../../design/spec/02-users.md`](../../design/spec/02-users.md):

- [ ] `GET /v1/users/me` — full profile + preferences
- [ ] `PUT /v1/users/me` — partial update of `display_name`, `avatar_url`, `currency`, `preferences` (JSONB merge)
- [ ] `PUT /v1/users/me/password` — alias to auth password change
- [ ] `POST /v1/users/me/deactivate` / `reactivate` — `status` toggle
- [ ] **Auto-create `user_preferences`** on register with defaults: `{"timezone": "Asia/Bangkok", "theme": "system", "language": "th"}`

### Reference patterns (Phase 1+ modules will copy these)

Phase 0 isn't just "ship auth" — it establishes the structure Phase 1+ modules follow. By building auth + users carefully, you create the template:

- [ ] **Module folder layout** (handlers/services/data) documented in code comments or a README; Phase 1 modules copy
- [ ] **Pagination helper** — built once even though no Phase 0 list uses it (Phase 1 needs it for transactions/contacts)
- [ ] **Repository pattern** for DB access (interface + struct implementing it; Cubit-equivalent on backend = service layer that depends on repository interface)
- [ ] **Test fixture pattern** — how to set up a test DB (containerized via `testcontainers-go` or shared dev DB); Phase 1 tests copy

### Tests

- [ ] **Smoke tests** on auth flow (register → login → /users/me → logout); aim for happy paths
- [ ] **Unit tests** on argon2id hashing helper, JWT issuer, validation helpers
- [ ] **Integration test** — full register-login-me cycle against a real Docker Postgres (or `testcontainers-go`)

### Manual verification

- [ ] `docker-compose up` brings up Postgres + backend; `/health` responds
- [ ] `curl` the auth flow end-to-end (register → login → use bearer token on `/v1/users/me`)

---

## What you read

- [`../../design/overview.md`](../../design/overview.md) — stack, Docker conventions, migration policy
- [`../../design/spec/overview.md`](../../design/spec/overview.md) — global API conventions (base URL, `/v1/` versioning, error envelope, pagination)
- [`../../design/spec/01-auth.md`](../../design/spec/01-auth.md) — every endpoint contract for auth
- [`../../design/spec/02-users.md`](../../design/spec/02-users.md) — every endpoint contract for users
- [`../../design/database/schema.md`](../../design/database/schema.md) — see `#01--auth` and `#02--users` sections for column definitions, constraints, indexes
- [`../../design/spec/soft-delete-policy.md`](../../design/spec/soft-delete-policy.md) — cross-cutting policy
- [`db.md`](db.md) — database setup, migration patterns

## What you don't need to read

- `product/` (scope/why); `ui-design/` (designer); `design/frontend/` (FE)

---

## Done when

- [ ] All listed endpoints respond correctly (manual curl test passes)
- [ ] `docker-compose up` works on a fresh clone
- [ ] Smoke tests green
- [ ] Logs are structured JSON in non-dev mode
- [ ] Module structure documented (so FE can review the conventions before they affect them via API contracts)
