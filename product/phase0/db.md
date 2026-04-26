# Phase 0 — Database setup

**Goal:** Postgres running locally via Docker; one migration applied creating Phase 0 tables (`users` + `user_preferences`); migration tooling and conventions established for Phase 1+.

**Stack** (locked): PostgreSQL 15+, UUID v7 primary keys, `golang-migrate` for migrations, Docker for dev environment.

For the canonical schema definitions, see [`../../design/database/schema.md`](../../design/database/schema.md). For migration conventions, see [`../../design/overview.md §Migration conventions`](../../design/overview.md).

---

## Tasks

### Docker setup

- [ ] **`docker-compose.yml`** — `postgres` service with:
  - Image: `postgres:15-alpine`
  - Named volume for data persistence (`pgdata:/var/lib/postgresql/data`)
  - Healthcheck (`pg_isready -U postgres`)
  - Env vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (defaults from `.env.example`)
  - Port mapping: `5432:5432` (so engineer can connect with a GUI client)
- [ ] **`.env.example`** — checked-in template; engineer copies to `.env` (gitignored)
- [ ] **Backend service** depends on `postgres` healthcheck (waits for DB before starting)
- [ ] **Volume cleanup** — document `docker-compose down -v` to wipe and restart fresh during dev

### `golang-migrate` setup

- [ ] **Install tool** — `golang-migrate` binary in dev env (or use the Go API embedded in the backend; see decision below)
- [ ] **Decide:** run migrations via standalone CLI tool vs embed in backend startup
  - **Standalone:** explicit `migrate up` step before `backend` starts; cleaner for prod
  - **Embedded:** backend runs migrations on startup; simpler for dev
  - **Recommendation:** embed for Phase 0 dev; switch to standalone in Phase 3 prod (separates concerns; allows rollback without restarting backend)
- [ ] **`migrations/` folder** in `be/` repo with naming convention `NNNNNN_description.up.sql` + `.down.sql`
- [ ] **Idempotency** — use `IF NOT EXISTS` on `up.sql` where the operation supports it; `down.sql` mandatory for every migration

### Phase 0 migrations

Per the schema doc, Phase 0 needs 2 tables. Single migration is fine:

- [ ] **`000001_create_users_table.up.sql`** — creates `users` table per [`../../design/database/schema.md#01--auth`](../../design/database/schema.md):
  - `id UUID PRIMARY KEY` (v7)
  - `username VARCHAR(50) UNIQUE NOT NULL`
  - `email VARCHAR(255) UNIQUE NULL` (Phase 1 nullable; required from Phase 2)
  - `display_name VARCHAR(100) NOT NULL`
  - `password_hash VARCHAR(255) NOT NULL`
  - `currency VARCHAR(3) NOT NULL DEFAULT 'THB'`
  - `avatar_url TEXT NULL`
  - `status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Indexes: PK, `idx_users_username` UNIQUE, `idx_users_email` UNIQUE
  - Trigger: `set_timestamp` to update `updated_at` on row update
- [ ] **`000001_create_users_table.down.sql`** — `DROP TABLE users;` (and trigger function if defined)
- [ ] **`000002_create_user_preferences_table.up.sql`** — creates `user_preferences`:
  - `user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
  - `preferences JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Trigger: `set_timestamp`
- [ ] **`000002_create_user_preferences_table.down.sql`** — `DROP TABLE user_preferences;`

### UUID v7 generation

Postgres 15 doesn't have built-in UUID v7. Two options:

- [ ] **Generate in app code** (Go) — use a UUID v7 library (e.g., `github.com/google/uuid` once it adds v7, or a third-party). Insert with `id = generated_uuid_v7()`.
- [ ] **Or use Postgres extension** — `pg_uuidv7` extension if you prefer DB-side defaults

**Recommendation:** generate in app code (Go). One less DB extension dependency.

### Verification

- [ ] `docker-compose up postgres` brings up Postgres healthily
- [ ] `migrate up` applies both migrations without error
- [ ] Connect via psql / GUI client (TablePlus, DBeaver) and verify tables exist with expected columns
- [ ] `migrate down 1` rolls back the last migration; `migrate up 1` reapplies — both work

---

## Conventions for Phase 1+ migrations

When a Phase 1+ module needs new tables, follow this pattern:

1. **Update [`../../design/database/schema.md`](../../design/database/schema.md)** with the new table definition (columns, constraints, indexes)
2. **Write a new migration** with the next sequential number: `000003_create_accounts_table.up.sql` + `.down.sql`
3. **Test up + down locally** (`migrate up`; verify; `migrate down 1`; verify clean rollback; `migrate up 1` again)
4. **Idempotent up** — use `IF NOT EXISTS` clauses
5. **Never edit a merged migration** — schema changes always = new migration file

The schema doc is the **target state**; migrations describe the steps to reach it. Engineer creates migrations from `schema.md` per phase.

---

## What you read

- [`../../design/database/schema.md`](../../design/database/schema.md) — full schema; Phase 0 needs only `#01--auth` and `#02--users` sections
- [`../../design/overview.md §Migration conventions`](../../design/overview.md) — naming, idempotency, never-edit policy
- [`../../design/spec/01-auth.md`](../../design/spec/01-auth.md) — auth module's own schema notes (links to `schema.md`)
- [`../../design/spec/02-users.md`](../../design/spec/02-users.md) — users module's schema notes

---

## Done when

- [ ] `docker-compose up postgres` works on a fresh clone
- [ ] Both Phase 0 migrations apply cleanly (`migrate up`)
- [ ] Both migrations roll back cleanly (`migrate down`)
- [ ] Migration tooling is the same workflow Phase 1+ will use (no special-case Phase 0 setup)
- [ ] UUID v7 generation works (insert a row, verify the UUID format)
