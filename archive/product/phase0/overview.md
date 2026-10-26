# Phase 0 — Kickoff (overview)

**Reality:** solo project, AI-assisted. Designer is a separate role you fill externally or yourself. No team-coordination layer.

**Goal:** scaffolding ready for feature work. App authenticates against backend on Android + Flutter web, settings flow works, reusable UX state patterns exist. **Phase 0 is base + structure — Phase 1+ adds modules without restructuring.**

**Canonical scope + exit criteria:** [`../phases.md §Phase 0`](../phases.md). The files in this folder are the operational handoff plan.

---

## Files in this folder

| File | For | What it covers |
|---|---|---|
| [`overview.md`](overview.md) | Everyone | You are here. Locked decisions, exit criteria, timeline, which file to open. |
| [`be.md`](be.md) | Backend engineer | Backend tasks: repo skeleton, Docker, middleware, auth + users endpoints, structured logging |
| [`fe.md`](fe.md) | Frontend engineer | Flutter app tasks: project scaffold, theme, state mgmt, screens, state-pattern widgets |
| [`designer.md`](designer.md) | Designer (or you, refining) | Refinement opportunities — all visual decisions are placeholdered, nothing blocks Phase 0 |
| [`db.md`](db.md) | Backend engineer | Database setup: Docker Postgres, migration tool, Phase 0 schema (`users` + `user_preferences`), conventions for adding new migrations |
| [`ci-cd.md`](ci-cd.md) | Backend / Frontend | CI/CD: deferred from Phase 0 (per decision); skeleton ready for when local works and we want to automate |

---

## Locked pre-work decisions

All Tier 1 decisions are committed:

| Decision | Lock |
|---|---|
| **Repo structure** | Split repos — `web/`, `app/`, `be/` already on GitHub |
| **App identifier / namespace** | `chubipocket` (e.g., `com.chubipocket.app` for Android package) |
| **Backend dev environment** | Docker everywhere — Postgres + backend run via `docker-compose` for dev; production deploys identical containers to VPS |
| **Designer tool** | Figma |
| **Brand color** | `#00A389` |
| **Logo** | Placeholder = text wordmark "ChubiPocket" + "C" mark in `#00A389` (see [`../ui-design/app/design-sheet.md §2`](../ui-design/app/design-sheet.md)); replace when real designer commissioned |
| **Typography** | `google_fonts` + per-language registry (1 font per locale in Phase 0; picker UI scaffolded for Phase 2 expansion) |
| **Theme** | Multi-theme registry — Phase 0 ships **`mint` (default, seed `#00A389`)** + **`sweet` (alternative)**; both produce light + dark via `ColorScheme.fromSeed`. Theme switcher in Settings is functional in Phase 0 |
| **Type scale + spacing + color tokens + iconography + component states** | Material 3 standards locked across the board |
| **State mgmt (FE)** | Bloc (`flutter_bloc`, Cubit-by-default, Repository pattern) |
| **Folder structure (FE)** | Feature-first with `data/domain/presentation` layers per feature |
| **Folder structure (BE)** | Handlers / services / data layers per module |
| **Linter** | `flutter_lints` (FE), `golangci-lint` (BE) |
| **CI** | Deferred (see [`ci-cd.md`](ci-cd.md)) |

**All Designer items: placeholdered with concrete defaults** in [`../ui-design/app/design-sheet.md §12`](../ui-design/app/design-sheet.md). Phase 0 build proceeds without a designer in the critical path.

---

## Solo workflow — milestones

| When | Milestone |
|---|---|
| Day 1 | Repo + Docker scaffold ready |
| Week 1 | BE auth endpoints respond locally via `docker-compose up` |
| Week 1 | FE project scaffold + Material 3 theme using placeholder tokens |
| Week 2 | FE consumes BE auth flow end-to-end on Android + web |
| Week 2 | Settings + state-pattern widgets done |
| Week 3 | Phase 0 exit criteria check; ship |

Designer refinement work happens out-of-band, post-Phase-0.

---

## Phase 0 exit criteria

- [ ] User can register, log in, log out on Android
- [ ] Same flows work on Flutter web
- [ ] Auth token persists across app restarts on both platforms
- [ ] Settings screen shows profile + supports change-password + logout
- [ ] Backend error envelope renders uniformly (LoadingView / ErrorView / EmptyView demoed correctly)
- [ ] Offline banner appears when network is cut
- [ ] Backend runs via `docker-compose up`; `/health` and auth endpoints respond
- [ ] Theme renders correctly using placeholdered design-sheet values
- [ ] Avatar picker works in Phase 0 mode (letter initials default + URL input + remove); upload+crop affordances visible but disabled
- [ ] CI deferred — tracked in [`ci-cd.md`](ci-cd.md); not blocking Phase 0 exit
- [ ] Figma mockups for 7 screens — not blocking; FE builds from text specs

---

## NOT in Phase 0 (scope guard)

If anyone proposes adding any of these, push back to Phase 1 or later:

- Any feature beyond auth + users (accounts, transactions, etc.) → Phase 1a
- Visual polish, animations, micro-interactions → Phase 2
- Production infrastructure (VPS, monitoring, backups) → Phase 3
- iOS build target (not planned through Phase 3)
- Dashboard, charts, notifications, exports
- Multi-currency UI work (single THB in 0/1)
- Push notification delivery (Phase 2; in-app inbox in Phase 1b)

---

## Status

- **Created** — 2026-04-26
- **Last updated** — 2026-04-26
- **Maintained** — this folder is a kickoff plan; updates to scope go in [`../phases.md`](../phases.md), not here
