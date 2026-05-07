# ChubiPocket — Product Overview

Entry point for the product documentation. Read this first; everything else is linked from here.

---

## What it is

A personal finance application for tracking expenses, splitting bills, automating recurring payments, and seeing how much money is left to save. It replaces the scattered tools people use today — spreadsheets, notes apps, memory — with a single place to manage money alone or with others.

## Who it's for

- Individuals tracking personal income and expenses
- Couples, roommates, or friends who share costs and need to settle up fairly
- Freelancers tracking project-based income and expenses (e.g., trips, gigs)
- Anyone managing subscriptions, rent, loans, or installment plans
- People who want simple visibility into savings potential without strict budgeting

## Core value

- **Split bills fairly** — support unequal splits, track who fronted the money, net balances at any time
- **Automate the boring stuff** — set up recurring payments and installments once; the system generates each cycle's transaction automatically
- **Know your runway** — clear "money in minus money out" so saving decisions are grounded in real numbers

---

## Phase summary

| Phase | Goal | Highlights | Currency | Platforms |
|---|---|---|---|---|
| **0** — Foundation | Scaffolding ready for feature work | Repo + CI, backend/frontend skeletons, auth, settings, UX state patterns, multiplatform verification | THB | Android, Web |
| **1** — Feature completeness | Every feature works end-to-end | All modules in 3 sub-milestones (1a single-user core, 1b multi-user + dashboard + notifications, 1c planning) | THB | Android, Web |
| **2** — UX polish | Pleasant to use | Dashboard + charts, multi-currency, push delivery, onboarding, receipt photos, export, performance | Multi-currency | Android, Web |
| **3** — Production | Ready to sell / deploy | VPS + CI/CD, monitoring, backups, security, Next.js admin + Nuxt 3 power-user web, monetization, legal | Multi-currency, global | Android, Web, Admin, Power-Web |

iOS is **not planned** through Phase 3 (no dev device). Revisit post-launch.

Per-phase scope, exit criteria, risks, and dependencies in [`phases.md`](phases.md).

---

## Stack

Product-level stake-in-the-ground choices. Engineering rationale + per-frontend specifics in [`../design/overview.md`](../design/overview.md).

- **Backend** — Go + Gin, `pgx/v5`, argon2id, JWT, `slog`, `golang-migrate`
- **Frontend (app)** — Flutter (Android + Flutter web shell), Bloc (`flutter_bloc`, Cubit-by-default), Repository pattern
- **Admin (Phase 3)** — Next.js
- **Power-user web (Phase 3)** — Nuxt 3 (paid tier; bulk management, import/export, free editing)
- **Database** — PostgreSQL 15+, UUID v7 primary keys
- **Containerization** — Docker (everything dev + prod via `docker-compose`; identical containers deploy to VPS in Phase 3)
- **Base URL** — `/api` (paths versioned `/v1/...` from day 1; full path `/api/v1/...`)

---

## Flow index

Cross-cutting user journeys. Each flow may touch multiple modules. Mechanics live in the spec sections linked.

| # | Flow | Phase | Spec sections |
|---|---|---|---|
| 1 | Sign up and get started | 0 | [`01-auth`](../design/spec/01-auth.md), [`03-accounts`](../design/spec/03-accounts.md) |
| 2 | Log a daily transaction | 1a | [`04-transactions`](../design/spec/04-transactions.md) |
| 3 | Split a personal expense with friends | 1b | [`06-shared-expenses`](../design/spec/06-shared-expenses.md), [`13-notifications`](../design/spec/13-notifications.md) |
| 4 | Pay back / record receipt (no two-sided handshake) | 1b | [`06-shared-expenses` §2.4](../design/spec/06-shared-expenses.md), [`12-personal-debts`](../design/spec/12-personal-debts.md) |
| 5 | I-owe / owed-to-me dashboard | 1b | [`12-personal-debts` §3.7](../design/spec/12-personal-debts.md) |
| 6 | Add a debt I'm tracking manually | 1b | [`12-personal-debts`](../design/spec/12-personal-debts.md) |
| 7 | Notifications inbox | 1b | [`13-notifications`](../design/spec/13-notifications.md) |
| 8 | Plan a trip as a shared project (multi-user) | 1b | [`10-projects`](../design/spec/10-projects.md) |
| 9 | Use a project solo (only-me trip tracking) | 1b | [`10-projects`](../design/spec/10-projects.md) |
| 10 | Record a transaction on someone else's behalf | 1b | [`10-projects` §3.6a](../design/spec/10-projects.md) |
| 11 | Claim a project_transaction onto personal book | 1b | [`10-projects` §3.7 claim](../design/spec/10-projects.md), [`06-shared-expenses` §2.2](../design/spec/06-shared-expenses.md) |
| 12 | Consolidate free-text names into a contact | 1b | [`07-contacts` §3 absorb](../design/spec/07-contacts.md) |
| 13 | Promote a project member to a contact | 1b | [`07-contacts`](../design/spec/07-contacts.md) |
| 14 | Invite someone to link as contact / project member | 1b | [`07-contacts`](../design/spec/07-contacts.md), [`10-projects` §3.3 invites](../design/spec/10-projects.md) |
| 15 | Set up a recurring payment | 1c | [`11-scheduled-transactions`](../design/spec/11-scheduled-transactions.md) |
| 16 | Track an installment plan or loan | 1c | [`11-scheduled-transactions`](../design/spec/11-scheduled-transactions.md) |
| 17 | See how much I can save this month | 1a + 1c | [`04-transactions §3.6 summary`](../design/spec/04-transactions.md) |
| 18 | Tag transactions for personal grouping | 1a | [`05-categories-tags`](../design/spec/05-categories-tags.md) |

**Tags vs projects:** tags are personal-only grouping ("how much did I spend on the trip?"). Projects are for IOU coordination with other people, even if those people aren't on the app. Use tags when no IOU coordination is needed; projects when it is. Orthogonal — a single transaction can carry both.

---

## Document map

```
docs/
├── product/                          ← what / when / who (this folder)
│   ├── overview.md                    ← you are here
│   ├── phases.md                      ← canonical development plan per phase
│   ├── phase0/                        ← Phase 0 operational handoff plan (split per role + concern)
│   │   ├── overview.md                 ← index, locked decisions, exit criteria
│   │   ├── be.md                       ← Backend engineer checklist
│   │   ├── fe.md                       ← Frontend engineer checklist
│   │   ├── designer.md                 ← Designer refinement opportunities (placeholders ready)
│   │   ├── db.md                       ← Database setup (Docker, migrations)
│   │   └── ci-cd.md                    ← CI/CD (deferred from Phase 0)
│   └── ui-design/                     ← designer + FE-dev shared screens (per client)
│       └── app/                        ← Flutter app screens (Phase 0–3)
│           ├── overview.md
│           ├── design-sheet.md         ← brand + tokens + components (placeholders ready)
│           ├── flows.md                ← user journeys
│           └── screens/                ← per-screen specs
│
└── design/                           ← how it's built
    ├── overview.md                    ← design entry point + tech stack rationale + migration conventions
    ├── spec/                          ← Backend: API + flows + design decisions per module
    │   ├── overview.md                 ← global conventions (base URL, /v1/ versioning, error envelope, pagination)
    │   ├── soft-delete-policy.md       ← cross-cutting policy
    │   └── 01–13 numbered modules
    ├── frontend/                      ← Frontend engineering (per-client subfolders)
    │   ├── overview.md                 ← cross-frontend conventions (auth, errors, pagination, dates)
    │   └── app/                        ← Flutter implementation: state, routing, widgets
    ├── database/                      ← single consolidated schema reference
    │   └── schema.md
    └── api/                           ← canonical API surface document
        └── api-document.md
```

### Where to find what

| Question | Where |
|---|---|
| Why are we building this? | This file (vision, users, value) |
| What ships in Phase X? | [`phases.md`](phases.md) |
| What does this screen look like? | [`ui-design/app/screens/`](ui-design/app/screens/) |
| What's the data model? | [`../design/database/schema.md`](../design/database/schema.md) |
| How does feature X work end-to-end? | [`../design/spec/NN-*.md`](../design/spec/) per module |
| What's the API for X? | Same module spec + [`../design/api/api-document.md`](../design/api/api-document.md) |
| How is the Flutter client implemented? | [`../design/frontend/app/`](../design/frontend/app/) |
| What's a global convention (auth header, error envelope, pagination)? | [`../design/spec/overview.md`](../design/spec/overview.md) |

---

## Status

- **Phase** — **Phase 1 complete** (1a + 1b + 1c shipped end-to-end). Phase 2 (UX polish) up next. See [`phases.md`](phases.md).
- **Last updated** — 2026-05-07
- **Version** — 0.6 (restructure: combined per-phase docs into single `phases.md`; moved `ui-design/` from design/ to product/; renamed design folders dropping numeric prefixes; reorganized `frontend/` to anticipate per-client subfolders for Phase 3 admin + power-user web)
- **Version 0.5** — link rot fix; documented `/v1/` versioning
- **Version 0.4** — unified shared-expenses model; project_transactions ledger
- **Audience** — the team building and maintaining the app; also consumed by AI assistants for context
