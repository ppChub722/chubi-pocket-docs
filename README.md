# ChubiPocket Docs

Single source of truth for ChubiPocket — product context, technical design, engineering how-tos, and the AI team's shared notes. The other repos (`-app`, `-be`) hold code; **this repo holds the *why* and the contracts they must agree on**.

> **If you're starting work on any other ChubiPocket repo: read this README and [`ai/STATUS.md`](ai/STATUS.md), then open the relevant doc(s) listed below before touching code.** This is the canonical context — don't infer from code alone.

---

## Multi-repo layout

```
chubi-pocket/
├── chubi-pocket-docs/   ← you are here
├── chubi-pocket-app/    Flutter mobile app (Bloc, go_router, dio)
├── chubi-pocket-be/     Backend (Go; Docker: postgres + backend)
└── chubi-pocket-web/    Web client (out of scope until 1.0, see the roadmap)
```

All repos live side-by-side in the same parent folder so cross-repo references work via relative paths during local dev.

| Repo | GitHub |
|---|---|
| docs | https://github.com/ppChub722/chubi-pocket-docs |
| app | https://github.com/ppChub722/chubi-pocket-app |
| be | https://github.com/ppChub722/chubi-pocket-be |
| web | https://github.com/ppChub722/chubi-pocket-web |

---

## What's in this repo

| Folder | Purpose | Audience |
|---|---|---|
| [`ai/`](ai/STATUS.md) | The team's live record: status, owner decisions, backlog, briefs, inbox reports, releases, role skills | Every AI session, the owner |
| [`product/`](product/overview.md) | What we're building, for whom, and the roadmap to 1.0 | Everyone |
| [`design/`](design/overview.md) | How it's built — API contracts, DB schema, frontend implementation, per-module specs | BE + FE devs, AI |
| [`engineering/`](engineering/) | How-tos: the UI hub, APK testing, ops runbook, logging | Devs |
| [`archive/`](archive/README.md) | Finished plans, old phase docs, old mocks, closed inboxes. History only — not current | Look up only |

### Key entry points
- **Where we are now:** [`ai/STATUS.md`](ai/STATUS.md) — current round, who does what
- **Owner rules:** [`ai/decisions.md`](ai/decisions.md) · **not done yet:** [`ai/backlog.md`](ai/backlog.md)
- **Roadmap:** [`product/roadmap-1.0.md`](product/roadmap-1.0.md) — **canonical** plan up to 1.0
- **Every screen, sheet, picker:** [`ai/app-map.md`](ai/app-map.md)
- **Product overview:** [`product/overview.md`](product/overview.md) — what & who
- **Design overview:** [`design/overview.md`](design/overview.md) — map of the technical docs

---

## Working on each repo — what to read first

### Working on `chubi-pocket-be`
1. `chubi-pocket-be/internal/apidoc/openapi.yaml` — the API contract the code is tested against; [`design/api/api-v2-notes.md`](design/api/api-v2-notes.md) — the rules the yaml can't say
2. [`design/database/schema.md`](design/database/schema.md) — DB schema
3. [`design/spec/`](design/spec/overview.md) — module behavior, business rules
4. Release scope: [`product/roadmap-1.0.md`](product/roadmap-1.0.md)

### Working on `chubi-pocket-app`
1. [`design/frontend/app/overview.md`](design/frontend/app/overview.md) — architecture (Bloc / go_router / dio / Repository pattern)
2. [`engineering/app-hub.md`](engineering/app-hub.md) — the UI kit and hub: every UI piece lives there first
3. [`design/api/api-document.md`](design/api/api-document.md) — what the BE exposes
4. [`design/spec/`](design/spec/overview.md) — feature mechanics
5. [`engineering/android-apk-testing.md`](engineering/android-apk-testing.md) — local dev + sideload to phone

### Doing anything cross-repo
- API change → update `openapi.yaml` (and [`design/api/api-document.md`](design/api/api-document.md)) **before** changing BE or clients. Treat it as the contract.
- DB change → update [`design/database/schema.md`](design/database/schema.md) at the same time as the migration.
- New feature → check it is in [`product/roadmap-1.0.md`](product/roadmap-1.0.md) scope.

---

## Conventions for this docs repo

### Editing
- All docs are markdown. Use relative links between files.
- Specs (`design/spec/NN-*.md`) are numbered for reading order; keep numbering stable.
- When a doc says it's "canonical" for something (e.g., `roadmap-1.0.md`), changes there are the authoritative source — sync derived references when you change it.
- `ai/` notes follow their own rules: `STATUS.md` is rewritten, `decisions.md` is edited in place, `inbox/*.md` is append-only (see [`ai/inbox/README.md`](ai/inbox/README.md)).

### Archive
- A doc that is finished or replaced moves to `archive/` **at the same relative path** (`product/phases.md` → `archive/product/phases.md`), so an old path in a log still finds it.
- Add a line to [`archive/README.md`](archive/README.md) saying why, and fix the live links that pointed at it.
- Never edit archived docs; their own relative links may be broken.

### Git
- **Personal identity:** commits in this multi-repo use `ppChub722 <poompich.e@gmail.com>` (matches the GitHub account). The global git config on this machine uses a different (work) email — set local config explicitly:
  ```bash
  git config user.name "ppChub722"
  git config user.email "poompich.e@gmail.com"
  ```
- **Commit style:** `<type>: <short summary>` — types: `chore`, `docs`, `feat`, `fix`, `refactor`. Body when the why isn't obvious from the diff.

---

## Status

Solo dev, AI-assisted. The plan runs to 1.0 only (owner 2026-10-15): see [`product/roadmap-1.0.md`](product/roadmap-1.0.md). Day-to-day state: [`ai/STATUS.md`](ai/STATUS.md).
