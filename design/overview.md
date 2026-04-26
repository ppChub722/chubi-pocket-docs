# Design

Technical design documentation for ChubiPocket — how the app is built. Backend behavior, API contracts, database schema, and frontend client implementation.

**Audience:** backend and frontend engineers; AI tools consuming context for codegen and questions.

**Not in this folder:**
- Product context (what we're building, for whom, in which phase) → [`../product/overview.md`](../product/overview.md) and [`../product/phases.md`](../product/phases.md)
- Designer-facing UI specs (brand, screen layouts, flows) → [`../product/ui-design/`](../product/ui-design/)

---

## Folders in this design set

| Folder | Purpose | Entry point | Audience |
|---|---|---|---|
| [spec/](spec/overview.md) | Backend behavior, business rules, design decisions, per-module flows | [spec/overview.md](spec/overview.md) | BE devs, AI |
| [frontend/](frontend/overview.md) | Frontend implementation per client (currently `app/` Flutter; Phase 3 adds `admin/` Next.js + `web/` Nuxt 3) | [frontend/overview.md](frontend/overview.md) | FE devs |
| [database/](database/schema.md) | Single consolidated reference for every DB table | [database/schema.md](database/schema.md) | BE devs, AI |
| [api/](api/api-document.md) | Single source of truth for every HTTP endpoint (contracts) | [api/api-document.md](api/api-document.md) | BE + FE devs, AI |

### Why split into four folders

- **spec — Backend behavior.** What the system does and why. Per-module narratives (flows, business rules, decisions). Cross-cutting docs for ERD, global conventions, soft-delete policy.
- **frontend — Frontend engineering, per client.** Stack choices, state management, routing, widget API, build/deploy. One subfolder per client (`app/` for Flutter today; `admin/` and `web/` for Phase 3). Cross-references designer-facing UI specs in `product/ui-design/` — does not duplicate visual specs.
- **database — Schema source of truth.** Every table, column, constraint, index in one searchable file. Order matches `spec/` numbering.
- **api — API contract source of truth.** Every endpoint, request/response shape, error codes in one file. Postman / OpenAPI exports are derived from it.

Each folder owns one concern. No content duplicated between them — instead, files cross-reference.

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
| **App** (Phase 0–3) | Flutter (Android + web shell), Bloc (`flutter_bloc`, Cubit-by-default), `go_router`, dio, Material 3 | Single codebase → Android + web; Bloc chosen for class-based clarity + natural Repository pattern + `bloc_test` testability; `go_router` for URL-based deep-linking |
| **Admin** (Phase 3) | Next.js | React ecosystem, SSR, mature; admin is desktop-first |
| **Web** (Phase 3) | Nuxt 3 | Power-user paid tier — bulk management, import/export, free editing. Vue ecosystem; deliberate split from admin to keep audiences separate |

### Database

- **PostgreSQL 15+** — strong feature set (JSONB, partial indexes, generated columns, polymorphic CHECK constraints), free, well-supported
- **UUID v7 primary keys** — sortable + globally unique; better than v4 for indexed access patterns

### API

- **Base URL** — `/api`
- **Versioning** — `/v1/...` from day 1; full path `/api/v1/auth/login`
- **Style** — REST; resource-oriented URLs; standard HTTP verbs and status codes
- **Auth** — Bearer JWT in `Authorization` header
- **Error envelope** — uniform `{ "error": { "code", "message", "details" } }` shape; details in [`spec/overview.md`](spec/overview.md)

Not used / explicitly rejected:
- **Provider** (Flutter package) — superseded by Bloc + Repository pattern
- **GetX** — polarizing, harder to test cleanly
- **iOS** — no dev device through Phase 3; revisit post-launch

---

## Migration conventions

Schema migrations are SQL files in the backend repo (`backend/migrations/NNNNNN_description.sql`), authored by engineers from the schema-as-target-state in [`database/schema.md`](database/schema.md). Conventions:

- **Tool** — `golang-migrate` (sequential numbering, separate `up` and `down` files)
- **Naming** — `NNNNNN_action_table.sql` (e.g., `000018_create_contacts_table.up.sql` + `.down.sql`)
- **Idempotency** — use `IF NOT EXISTS` on the up side where the operation supports it; rollback (down) is mandatory
- **Schema doc is target state** — migrations describe the journey to it; the schema doc is what should exist after all migrations have run
- **Per-phase scope** — see [`../product/phases.md`](../product/phases.md) §Schema delta per phase for which modules add tables in which phase
- **Never edit a merged migration** — schema changes always = new migration file; editing a merged migration silently breaks already-deployed databases

The actual list of migrations for a given phase is **derived** from the schema doc + the per-module Phase summary tables in spec files. There is no separately-maintained "list of migrations to write for Phase X" — that drifts the moment scope changes.

---

## Where to start

- **Just looking around** → read this file, then click into the folder that matches your role.
- **Backend dev implementing a feature** → [`spec/overview.md`](spec/overview.md) → relevant `NN-*.md` module → [`api/api-document.md`](api/api-document.md) for endpoint contract → [`database/schema.md`](database/schema.md) for table.
- **Frontend dev building a screen** → [`../product/ui-design/app/screens/`](../product/ui-design/app/screens/) for layout + behavior → [`frontend/app/overview.md`](frontend/app/overview.md) for stack + state patterns → [`api/api-document.md`](api/api-document.md) for endpoints.
- **Designer** → [`../product/ui-design/app/`](../product/ui-design/app/) for brand + tokens + screens; this folder is not for you (engineering implementation).
- **Designing a new table** → [`spec/overview.md`](spec/overview.md) (FK naming, audit columns) → [`database/schema.md`](database/schema.md) → relevant module spec in `spec/`.
- **Calling the API** → [`api/api-document.md`](api/api-document.md). It's self-contained.
- **AI / agent reading for context** → start here, then drill into the specific entry-point file based on the question.

---

## Status

- **Phase** — Planning (pre–Phase 0)
- **Last updated** — 2026-04-26
- **Version** — 0.5 (restructure: dropped numeric prefixes from folder names; `02-flutter` renamed to `frontend/` and reorganized into per-client subfolders for Phase 3 admin + power-user web; `05-ui-design` moved to `../product/ui-design/`; absorbed platforms-stack rationale from former `product/01-platforms-stack.md`; added migration conventions section)
- **Version 0.4** — 4 folders with single entry points; `api/` added
- **Audience** — backend + frontend engineers; AI assistants
