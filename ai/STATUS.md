# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-13 late night by Lead (handoff before the team restart)._

## Live (prod)
- **0.3.1-9** (2026-10-13 night): app `e8305e3` (build 55, Firebase 2055) · be `5b7722e` · docs `9c328bd` · migration **053** · `LATEST_APP_BUILD=55` · `MIN_APP_BUILD=55` (forced update) · tags v0.3.1-9. Pre-deploy backup `chubi_pocket-20261012-1408.dump.gz`.
- Details per release: `ai/releases/<version>.md`.
- The VPS lost network ~20:38–21:03 (Happy-Host node problem; their notice asks Node 4/6/12 customers to move machines). Recovered after the owner rebooted it. A verified prod dump from 20:55 is kept locally at `chubi-pocket/backups/prod/` (outside the repos).

## How the team works
- The owner talks ONLY to **Lead**. Team sessions load their role skill (`ai/skills/chubi-*`), read this file, then wait for Lead's brief.
- Reports go to `ai/inbox/<role>.md` with a one-line `DONE … → ai/inbox/<file>.md` ping to Lead. Questions go to Lead directly.
- Rules and owner decisions: `ai/decisions.md`. Discussed but not started: `ai/backlog.md`.
- Releases are tag-based: Lead commits, bumps, tags `v<version>` in be / app / docs and pushes; DevOps runs `chubi-pocket-be/scripts/release.sh <brief-dir>` from the tags (brief template: `ai/templates/release-brief/`). Local env: `scripts/local-deploy.sh --web` (only when the owner orders).

## In progress (2026-10-13 ~04:40) — 0.3.1-10 IS LIVE on the OLD VPS (owner ordered it directly in the DevOps window, "last deploy on the old VPS"); a UI review round comes next (owner: "UI แปลกมาก")
- Prod: be f503d9c · app 4d838f1 build 58 (Firebase 2058) · docs 4edeba2 · migration 060 · LATEST=MIN=58 · pre-deploy backup chubi_pocket-20261012-2133.dump.gz · details ai/releases/0.3.1-10.md
- Tags v0.3.1-10: be f503d9c · app 4d838f1 (build 58, pubspec 0.3.1-10+10) · docs = this commit. Brief: chubi-pocket/release-briefs/0.3.1-10/ (EXPECT_MIGRATIONS 54–60, MIN_APP_BUILD 58).
- Deploy target = the NEW VPS (engineering/new-vps-runbook.md; scripts read VPS_HOST). Happy-Host is retired but still serves 0.3.1-9 (health 200 on 2026-10-13 04:20).
- Lead full run before tagging: flutter analyze 0 · flutter test all pass · go vet clean · go test 23 pkgs ok.
- DevOps: local backup + migrations 054–060 + local build in progress (owner to smoke-test at :5181).
- Small open item: tapping a pending 🐷 saving draft confirms directly (no edit sheet).
- Later (backlog): module dashboards, dashboard "แผนเดือนนี้", events E1 / E2 / E5, budget rollover + quick-create budget chip.

## Earlier handoff (2026-10-13 — team restarted)
- **Committed + pushed as app `3a82aeb` (0.3.1-10 wip, on top of the v0.3.1-9 tag `e8305e3`); ships with 0.3.1-10:**
  - FE-A: counted shell chrome (bottom bar after a fast back) + TopScrim
  - FE-D: change password back to a page (entry under the username row)
  - FE-E: ListToolbar chips 28
  - FE-B: fail-fast loads + contact page tests + OFFLINE MODE (ConnectionBanner / ConnectionScope)
  The tree is GREEN at handoff (analyze 0 issues · 579 tests pass). FE-B left these offline-mode items (see `ai/inbox/fe-b.md` "## Handoff 2026-10-13"):
  - page-specific submit buttons (quick create, auth, pages with their own AppButtons) are not yet disabled while offline
  - the shell wiring is untested
  - it never ran against a stopped BE
  - BE should spec `GET /health` (it is in the api_flows baseline now)
- Every role wrote "## Handoff 2026-10-13" (state + gotchas) in its `ai/inbox/<role>.md`. Role skills are updated.
- Local env: BE :8080 + web :5181 (build 55), with the DB restored from prod (users 4 / accounts 6 / tx 12). The QA users are gone; recreate them locally when QA is needed.
- Old VPS (Happy-Host) RETIRED, full backup in `chubi-pocket/backups/vps-happyhost-2026-10-13/` (secrets). New server: `engineering/new-vps-runbook.md`; scripts read `VPS_HOST`.
- The owner is "น้อง": call them น้อง, speak as a caring พี่ (see the chubi-lead skill).

## Waiting on the owner
- Feature-widget audit (`ai/inbox/fe-a.md`): A≈18 · B≈111 · C≈25, ~29 dev-days. Lead proposed a ratchet test now + the moves in 0.3.1-10 (with the page reworks); waiting for the owner.
- Short text values (email, phone, name) in detail boxes: one row (label left, value right) vs stacked when filled — Lead recommended one row; waiting for the owner.
- 0.3.1-10 questions: events (8), budgets / scheduled / goals (5); debts answered (fe-debts.md rev 2).

## Next releases
- **No more deploys to the Happy-Host VPS** (owner 2026-10-13 night). Work is local-only until 0.3.1-10, which deploys on the NEW VPS. Tonight's fixes (bottom bar after a fast back, change password page, fail-fast loads, toolbar chips 28) ship with 0.3.1-10.
- 0.3.1-10: debts + events + budgets + scheduled + goals in parallel (1 FE per page group, FE-A/FE-B as supporters).

## Team (session names change; check ListAgents)
- From 2026-10-12 (restart): Lead `chubi-pocket-57` · **fe-core** (kit / hub / shell / router / templates, plus auth, tx / quick create, settings, wallets / categories / tags / contacts; working on the 0.3.1-9 leftovers) · **fe-debt** · **fe-event** · **fe-budget** · **fe-recurrent** (scheduled) · **fe-saving** (goals). The 5 feature FEs are onboarding read-only; they build only from hub templates + kit, and fe-core handles missing pieces. Inboxes: fe-core.md / fe-debts.md / fe-events.md / fe-budget.md / fe-recurrent.md / fe-saving.md. No BE / QA / DevOps session yet.
- Before the restart: FE-A (kit / shell) + FE-B (templates) → now fe-core; FE-C / FE-D / FE-E handoffs are in their inbox files.
- Local env: docker BE `localhost:8080` + DB `:5433` (restored from prod 2026-10-13; the old QA users are gone).

## Old log
- `CURRENT-WORK.md` (docs root) is frozen history up to 2026-10-11. Infra how-to: `engineering/ops-runbook.md`.
