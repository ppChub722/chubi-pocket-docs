# ChubiPocket Docs

Single source of truth for ChubiPocket — product context, technical design, engineering how-tos. The other repos (`-app`, `-be`, `-web`) hold code; **this repo holds the *why* and the contracts they must agree on**.

> **If you're starting work on any other ChubiPocket repo: read this README, then open the relevant doc(s) listed below before touching code.** This is the canonical context — don't infer from code alone.

---

## Multi-repo layout

```
chubi-pocket/
├── chubi-pocket-docs/   ← you are here
├── chubi-pocket-app/    Flutter mobile app (Bloc, go_router, dio)
├── chubi-pocket-be/     Backend (Docker: postgres + backend)
└── chubi-pocket-web/    Web client
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
| [`product/`](product/overview.md) | What we're building, for whom, in which phase. Start here. | Everyone |
| [`design/`](design/overview.md) | How it's built — API contracts, DB schema, frontend implementation, per-module specs | BE + FE devs, AI |
| [`engineering/`](engineering/) | Dev how-tos (e.g., APK testing on phone) | Devs |

### Key entry points
- **Product overview:** [`product/overview.md`](product/overview.md) — what & who
- **Phase plan:** [`product/phases.md`](product/phases.md) — **canonical** for what ships in each phase
- **Current phase detail:** [`product/phase0/overview.md`](product/phase0/overview.md)
- **Design overview:** [`design/overview.md`](design/overview.md) — map of the technical docs

---

## Working on each repo — what to read first

### Working on `chubi-pocket-be`
1. [`design/api/api-document.md`](design/api/api-document.md) — endpoint contracts
2. [`design/database/schema.md`](design/database/schema.md) — DB schema
3. [`design/spec/`](design/spec/overview.md) — module behavior, business rules
4. Current phase scope: [`product/phases.md`](product/phases.md)

### Working on `chubi-pocket-app`
1. [`design/frontend/app/overview.md`](design/frontend/app/overview.md) — architecture (Bloc / go_router / dio / Repository pattern)
2. [`design/api/api-document.md`](design/api/api-document.md) — what the BE exposes
3. [`product/ui-design/app/`](product/ui-design/app/overview.md) — screens, flows
4. [`design/spec/`](design/spec/overview.md) — feature mechanics
5. [`engineering/android-apk-testing.md`](engineering/android-apk-testing.md) — local dev + sideload to phone

### Working on `chubi-pocket-web`
1. [`design/frontend/overview.md`](design/frontend/overview.md) — frontend conventions
2. [`design/api/api-document.md`](design/api/api-document.md)
3. [`product/ui-design/`](product/ui-design/) — design references

### Doing anything cross-repo
- API change → update [`design/api/api-document.md`](design/api/api-document.md) **before** changing BE or clients. Treat it as the contract.
- DB change → update [`design/database/schema.md`](design/database/schema.md) at the same time as the migration.
- New feature → check [`product/phases.md`](product/phases.md) is in current phase scope.

---

## Conventions for this docs repo

### Editing
- All docs are markdown. Use relative links between files.
- Specs (`design/spec/NN-*.md`) are numbered for reading order; keep numbering stable.
- When a doc says it's "canonical" for something (e.g., `phases.md`), changes there are the authoritative source — sync derived references when you change it.

### Git
- **Personal identity:** commits in this multi-repo use `ppChub722 <poompich.e@gmail.com>` (matches the GitHub account). The global git config on this machine uses a different (work) email — set local config explicitly:
  ```bash
  git config user.name "ppChub722"
  git config user.email "poompich.e@gmail.com"
  ```
- **Commit style:** `<type>: <short summary>` — types: `chore`, `docs`, `feat`, `fix`, `refactor`. Body when the why isn't obvious from the diff.

---

## Status

Phase 0 in progress. Solo dev, AI-assisted. See [`product/phases.md`](product/phases.md) for what's in scope and what's deferred.
