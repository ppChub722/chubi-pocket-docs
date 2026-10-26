# ChubiPocket — Product Overview

What the app is, who it is for, and the user flows mapped to the module specs in this folder. The map of every doc is the root [`README.md`](../README.md).

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

## Release plan

The plan runs to 1.0 only: [`roadmap-1.0.md`](../now/roadmap-1.0.md) (owner 2026-10-15, re-planned 2026-10-26). Phases 0 and 1 shipped; the old Phase 2 / Phase 3 plan is cancelled (history in [`../archive/product/phases.md`](../archive/product/phases.md)). Out of scope until 1.0: Play Store, monetization, the Next.js web / admin app, receipt photos, multi-currency conversion.

iOS is **not planned** (no dev device).

---

## Stack

Product-level stake-in-the-ground choices. Engineering rationale + per-frontend specifics in [`../build/stack.md`](../build/stack.md).

- **Backend** — Go + Gin, `pgx/v5`, argon2id, JWT, `slog`, `golang-migrate`
- **Frontend (app)** — Flutter (Android), Bloc (`flutter_bloc`, Cubit-by-default), Repository pattern. Flutter web builds remain a **dev/testing tool only** — not a shipped surface (decided 2026-09-16).
- **Web (Phase 3)** — **one Next.js app** (`chubi-pocket-web`, scaffold already exists): full-data power editing (bulk management, import/export, free editing) **plus role-gated admin pages** in the same app. Replaces the old two-app plan (Next.js admin + Nuxt 3 power-web) — one codebase, one auth, one deploy; the UIs would have been near-identical anyway (decided 2026-09-16).
- **Database** — PostgreSQL 15+, UUID v7 primary keys
- **Containerization** — Docker (everything dev + prod via `docker-compose`; identical containers deploy to VPS in Phase 3)
- **Base URL** — `/api` (paths versioned `/v1/...` from day 1; full path `/api/v1/...`)

---

## Flow index

Cross-cutting user journeys. Each flow may touch multiple modules. Mechanics live in the spec sections linked.

| # | Flow | Phase | Spec sections |
|---|---|---|---|
| 1 | Sign up and get started | 0 | [`01-auth`](01-auth.md), [`03-accounts`](03-accounts.md) |
| 2 | Log a daily transaction | 1a | [`04-transactions`](04-transactions.md) |
| 3 | Split a personal expense with friends | 1b | [`06-shared-expenses`](06-shared-expenses.md), [`13-notifications`](13-notifications.md) |
| 4 | Pay back / record receipt (no two-sided handshake) | 1b | [`06-shared-expenses` §2.4](06-shared-expenses.md), [`12-personal-debts`](12-personal-debts.md) |
| 5 | I-owe / owed-to-me dashboard | 1b | [`12-personal-debts` §3.7](12-personal-debts.md) |
| 6 | Add a debt I'm tracking manually | 1b | [`12-personal-debts`](12-personal-debts.md) |
| 7 | Notifications inbox | 1b | [`13-notifications`](13-notifications.md) |
| 8 | Plan a trip as a shared project (multi-user) | 1b | [`10-projects`](10-projects.md) |
| 9 | Use a project solo (only-me trip tracking) | 1b | [`10-projects`](10-projects.md) |
| 10 | Record a transaction on someone else's behalf | 1b | [`10-projects` §3.6a](10-projects.md) |
| 11 | Claim a project_transaction onto personal book | 1b | [`10-projects` §3.7 claim](10-projects.md), [`06-shared-expenses` §2.2](06-shared-expenses.md) |
| 12 | Consolidate free-text names into a contact | 1b | [`07-contacts` §3 absorb](07-contacts.md) |
| 13 | Promote a project member to a contact | 1b | [`07-contacts`](07-contacts.md) |
| 14 | Invite someone to link as contact / project member | 1b | [`07-contacts`](07-contacts.md), [`10-projects` §3.3 invites](10-projects.md) |
| 15 | Set up a recurring payment | 1c | [`11-scheduled-transactions`](11-scheduled-transactions.md) |
| 16 | Track an installment plan or loan | 1c | [`11-scheduled-transactions`](11-scheduled-transactions.md) |
| 17 | See how much I can save this month | 1a + 1c | [`04-transactions §3.6 summary`](04-transactions.md) |
| 18 | Tag transactions for personal grouping | 1a | [`05-categories-tags`](05-categories-tags.md) |

**Tags vs projects:** tags are personal-only grouping ("how much did I spend on the trip?"). Projects are for IOU coordination with other people, even if those people aren't on the app. Use tags when no IOU coordination is needed; projects when it is. Orthogonal — a single transaction can carry both.

---
## Status

- **Where we are** — Phase 1 shipped; releases now follow [`roadmap-1.0.md`](../now/roadmap-1.0.md). Current round: [`STATUS.md`](../now/STATUS.md).
- **Last updated** — 2026-10-26 (was `product/overview.md`; the document map moved to the root README)
- **Audience** — the team building and maintaining the app; also consumed by AI assistants for context
