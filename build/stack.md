# Stack & conventions

Why the app is built the way it is: the tech choices, their rationale, and the migration rules. For the Flutter architecture see [`app-architecture.md`](app-architecture.md); for client-wide API handling see [`client-conventions.md`](client-conventions.md); for the UI kit see [`app-hub.md`](app-hub.md).

**Audience:** backend and frontend engineers; AI tools consuming context for codegen and questions.

---

## Stack & rationale

### Backend

| Concern | Choice | Why |
|---|---|---|
| **Language** | Go | Static typing, fast compile, strong concurrency primitives, low ops burden, single static binary |
| **Web framework** | Gin | Lightweight, mature, good middleware ecosystem; not opinionated about structure |
| **DB driver** | `pgx/v5` | Native PostgreSQL driver, faster than `database/sql` for our access patterns |
| **Password hashing** | argon2id | Modern best-practice; resistant to GPU + side-channel attacks |
| **Tokens** | JWT (`golang-jwt/v5`); 30-day single token in 0/1, 15-min access + 7-day refresh in 2+ | Stateless, easy rotation; refresh added when production-grade auth needed |
| **Logging** | `slog` (stdlib, structured) | JSON output in prod; no third-party dependency |
| **Migrations** | `golang-migrate` | Sequential numbered SQL files (up + down); see "Migration conventions" below |
| **Hot reload (dev)** | Air | `.air.toml` in repo |
| **Containerization** | Docker (`Dockerfile` + `docker-compose.yml`) | Dev: `docker-compose up` runs `postgres` + `backend`. Prod: same image deploys to VPS in Phase 3. Single source of truth — no "works on my machine" drift between dev and prod. |

### Frontend

| Client | Stack | Rationale |
|---|---|---|
| **App** (Phase 0–3) | Flutter (Android; web build = dev tool only), Bloc (`flutter_bloc`, Cubit-by-default), `go_router`, dio, Material 3 | Bloc chosen for class-based clarity + natural Repository pattern + `bloc_test` testability; `go_router` for URL-based deep-linking |
| **Web** (Phase 3) | **One Next.js app** (`chubi-pocket-web`) | Full-data power editing (bulk management, import/export, free editing) + role-gated admin pages in the same app. Replaces the former Next-admin + Nuxt-power-web pair — one codebase, one auth, one deploy (decided 2026-09-16) |

### Database

- **PostgreSQL 15+** — strong feature set (JSONB, partial indexes, generated columns, polymorphic CHECK constraints), free, well-supported
- **UUID v7 primary keys** — sortable + globally unique; better than v4 for indexed access patterns

### API

- **Base URL** — `/api`
- **Versioning** — `/v1/...` from day 1; full path `/api/v1/auth/login`
- **Style** — REST; resource-oriented URLs; standard HTTP verbs and status codes
- **Auth** — Bearer JWT in `Authorization` header
- **Error envelope** — uniform `{ "error": { "code", "message", "details" } }` shape; details in [`spec/overview.md`](../modules/README.md)

Not used / explicitly rejected:
- **Provider** (Flutter package) — superseded by Bloc + Repository pattern
- **GetX** — polarizing, harder to test cleanly
- **iOS** — no dev device through Phase 3; revisit post-launch

---

## Migration conventions

Schema migrations are SQL files in the backend repo (`backend/migrations/NNNNNN_description.sql`), authored by engineers from the schema-as-target-state in [`database/schema.md`](../ref/schema.md). Conventions:

- **Tool** — `golang-migrate` (sequential numbering, separate `up` and `down` files)
- **Naming** — `NNNNNN_action_table.sql` (e.g., `000018_create_contacts_table.up.sql` + `.down.sql`)
- **Idempotency** — use `IF NOT EXISTS` on the up side where the operation supports it; rollback (down) is mandatory
- **Schema doc is target state** — migrations describe the journey to it; the schema doc is what should exist after all migrations have run
- **Never edit a merged migration** — schema changes always = new migration file; editing a merged migration silently breaks already-deployed databases

The actual list of migrations for a given phase is **derived** from the schema doc + the per-module Phase summary tables in spec files. There is no separately-maintained "list of migrations to write for Phase X" — that drifts the moment scope changes.

---

## Status

- **Last updated** — 2026-10-26 (was `design/overview.md`; the folder map moved to the root README)
