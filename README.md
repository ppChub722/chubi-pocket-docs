# ChubiPocket Docs

The one place for everything about ChubiPocket that isn't code: where we are, the owner's rules, how each feature works, the exact contracts, and the AI team's notes. Code lives in `chubi-pocket-app` (Flutter) and `chubi-pocket-be` (Go).

> **Starting any work: read [`now/STATUS.md`](now/STATUS.md) and [`rules/decisions.md`](rules/decisions.md) first,** then the docs for what you touch. Don't infer from code alone.

---

## Find it fast

| I want to know… (อยากรู้…) | Open |
|---|---|
| Where are we, who does what? (ตอนนี้ทำอะไรอยู่) | [`now/STATUS.md`](now/STATUS.md) |
| What ships in which release? (แผนถึง 1.0) | [`now/roadmap-1.0.md`](now/roadmap-1.0.md) |
| What's discussed but not done? (ค้างอะไรอยู่) | [`now/backlog.md`](now/backlog.md) |
| What's the brief for the current job? | [`now/briefs/`](now/briefs/) |
| What did the owner decide? (กฎที่ owner สั่ง) | [`rules/decisions.md`](rules/decisions.md) — newest rule wins |
| What is the app, who is it for? | [`modules/product.md`](modules/product.md) |
| How does feature X work? (ฟีเจอร์ทำงานยังไง) | [`modules/`](modules/README.md) — one file per module + its rules and inbox |
| The exact API? | `chubi-pocket-be/internal/apidoc/openapi.yaml` + [`ref/api-v2-notes.md`](ref/api-v2-notes.md) · long form: [`ref/api-document.md`](ref/api-document.md) |
| The DB tables? | [`ref/schema.md`](ref/schema.md) |
| Which screens / sheets / pickers exist? | [`ref/app-map.md`](ref/app-map.md) |
| How is the app built? (stack, architecture) | [`build/stack.md`](build/stack.md) · [`build/app-architecture.md`](build/app-architecture.md) · [`build/client-conventions.md`](build/client-conventions.md) |
| The UI kit / hub? | [`build/app-hub.md`](build/app-hub.md) |
| Logging? | [`build/logging-plan.md`](build/logging-plan.md) |
| Deploy, VPS, backups? | [`ops/ops-runbook.md`](ops/ops-runbook.md) · new box: [`ops/new-vps-runbook.md`](ops/new-vps-runbook.md) |
| Put the APK on a phone? | [`ops/apk-testing.md`](ops/apk-testing.md) |
| What did a session report? | [`team/inbox/`](team/inbox/README.md) |
| Role skills (be / fe / lead / qa / devops) | [`team/skills/`](team/skills/) |
| Release notes, audits | [`team/releases/`](team/releases/) · [`team/reports/`](team/reports/) |
| Something old (phase plans, old mocks, CURRENT-WORK) | [`archive/`](archive/README.md) — history only |

## Folders

```
now/       where we are and what's next   STATUS · roadmap · backlog · briefs/
rules/     the owner's rules              decisions.md
modules/   how each feature works         product.md · 01–15 specs · cross-cutting rules
ref/       exact contracts                api-document · api-v2-notes · schema · app-map
build/     how the code is built          stack · app-architecture · client-conventions · app-hub · logging-plan
ops/       running it                     ops-runbook · new-vps-runbook · apk-testing
team/      the AI team's working files    inbox/ · skills/ · releases/ · reports/ · qa/ · templates/
archive/   finished / replaced docs       never current
```

---

## Rules for this repo

### Which doc wins
- **API:** `openapi.yaml` (the BE tests against it) → `ref/api-v2-notes.md` → `ref/api-document.md` → module specs.
- **Behaviour:** the newest owner rule in `rules/decisions.md` → the `§0` block at the top of a module spec → the rest of the spec.
- API change → update `openapi.yaml` (and `ref/api-document.md`) **before** changing BE or app. DB change → update `ref/schema.md` with the migration. New feature → check it is in `now/roadmap-1.0.md`.

### Writing
- All docs are markdown with relative links. Module specs keep their `NN-` numbers.
- `now/STATUS.md` is rewritten, not appended. `rules/decisions.md` is edited in place (newest wins). `team/inbox/*.md` is append-only, newest at the bottom (format in [`team/inbox/README.md`](team/inbox/README.md)).
- A finished or replaced doc moves to `archive/` at its path (`now/briefs/x.md` → `archive/now/briefs/x.md`), with a line in [`archive/README.md`](archive/README.md); fix the live links that pointed at it. Never edit archived docs.

### Git
- Commits use `ppChub722 <poompich.e@gmail.com>` (set it in the local git config; the machine's global email is a work one).
- Commit style: `<type>: <short summary>` — `chore`, `docs`, `feat`, `fix`, `refactor`.

---

## Old paths (before 2026-10-26)

Logs, inbox entries and memories written earlier use the old layout. Where they went:

| Old | New |
|---|---|
| `ai/STATUS.md`, `ai/backlog.md`, `ai/briefs/` | `now/STATUS.md`, `now/backlog.md`, `now/briefs/` |
| `product/roadmap-1.0.md` | `now/roadmap-1.0.md` |
| `ai/decisions.md` | `rules/decisions.md` |
| `product/overview.md` | `modules/product.md` |
| `design/spec/overview.md`, `design/spec/*` | `modules/README.md`, `modules/*` |
| `design/api/*`, `design/database/schema.md`, `ai/app-map.md` | `ref/*`, `ref/schema.md`, `ref/app-map.md` |
| `design/overview.md` | `build/stack.md` |
| `design/frontend/app/overview.md`, `design/frontend/overview.md` | `build/app-architecture.md`, `build/client-conventions.md` |
| `engineering/app-hub.md`, `engineering/logging-plan.md` | `build/app-hub.md`, `build/logging-plan.md` |
| `engineering/ops-runbook.md`, `engineering/new-vps-runbook.md`, `engineering/android-apk-testing.md` | `ops/ops-runbook.md`, `ops/new-vps-runbook.md`, `ops/apk-testing.md` |
| `ai/inbox/`, `ai/skills/`, `ai/releases/`, `ai/reports/`, `ai/qa/`, `ai/templates/` | `team/inbox/`, `team/skills/`, `team/releases/`, `team/reports/`, `team/qa/`, `team/templates/` |
| anything else (`CURRENT-WORK.md`, `product/phases.md`, `design/mockups/`…) | `archive/<old path>` |
