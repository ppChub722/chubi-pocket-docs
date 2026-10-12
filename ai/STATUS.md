# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-13 night by Lead._

## Live (prod)
- **0.3.1-9** (2026-10-13 night): app `e8305e3` (build 55, Firebase 2055) · be `5b7722e` · docs `9c328bd` · migration **053** · `LATEST_APP_BUILD=55` · `MIN_APP_BUILD=55` (forced update) · tags v0.3.1-9. Pre-deploy backup `chubi_pocket-20261012-1408.dump.gz`.
- Details per release: `ai/releases/<version>.md`.
- The VPS lost network ~20:38–21:03 (Happy-Host node problem; their notice asks Node 4/6/12 customers to move machines). Recovered after the owner rebooted it. A verified prod dump from 20:55 is kept locally at `chubi-pocket/backups/prod/` (outside the repos).

## How the team works
- The owner talks ONLY to **Lead**. Team sessions load their role skill (`ai/skills/chubi-*`), read this file, then wait for Lead's brief.
- Reports go to `ai/inbox/<role>.md` with a one-line `DONE … → ai/inbox/<file>.md` ping to Lead. Questions go to Lead directly.
- Rules and owner decisions: `ai/decisions.md`. Discussed but not started: `ai/backlog.md`.
- Releases are tag-based: Lead commits, bumps, tags `v<version>` in be / app / docs and pushes; DevOps runs `chubi-pocket-be/scripts/release.sh <brief-dir>` from the tags (brief template: `ai/templates/release-brief/`). Local env: `scripts/local-deploy.sh --web` (only when the owner orders).

## In progress
- Nothing in flight. Local env: BE :8080 + web :5181 (build 55) on a DB restored from the prod dump (QA users are gone; recreate locally when QA is needed).

## Waiting on the owner
- Feature-widget audit (`ai/inbox/fe-a.md`): A≈18 · B≈111 · C≈25, ~29 dev-days. Lead proposed a ratchet test now + the moves in 0.3.1-10 (with the page reworks); waiting for the owner.
- Short text values (email, phone, name) in detail boxes: one row (label left, value right) vs stacked when filled — Lead recommended one row; waiting for the owner.
- 0.3.1-10 questions: events (8), budgets / scheduled / goals (5); debts answered (fe-debts.md rev 2).

## Next releases
- **No more deploys to the Happy-Host VPS** (owner 2026-10-13 night). Work is local-only until 0.3.1-10, which deploys on the NEW VPS. Tonight's fixes (bottom bar after a fast back, change password page, fail-fast loads, toolbar chips 28) ship with 0.3.1-10.
- 0.3.1-10: debts + events + budgets + scheduled + goals in parallel (1 FE per page group, FE-A/FE-B as supporters).

## Team (session names change; check ListAgents)
- Open now: Lead `chubi-pocket-99` · FE-A `-81` (kit owner) · FE-B `-a0` · FE-C `-1a` (debts) · FE-D `-02` (events) · FE-E `-61` (budgets / scheduled / goals) · BE `-bc` · QA `-59` (qa-lead) · DevOps `-e3`.
- Local env: docker BE `localhost:8080` + DB `:5433` (restored from prod 2026-10-13; the old QA users are gone).

## Old log
- `CURRENT-WORK.md` (docs root) is frozen history up to 2026-10-11. Infra how-to: `engineering/ops-runbook.md`.
