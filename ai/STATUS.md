# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-12 by Lead._

## Live (prod)
- **0.3.1-7**: app `b4d9d52` (build 48, Firebase 2048) · be `c62ac06` · docs `9708071` · migration **052** · `LATEST_APP_BUILD=48` · `MIN_APP_BUILD=0`.
- Details per release: `ai/releases/<version>.md`.

## How the team works
- The owner talks ONLY to **Lead**. Team sessions load their role skill (`ai/skills/chubi-*`), read this file, then wait for Lead's brief.
- Reports go to `ai/inbox/<role>.md` with a one-line `DONE … → ai/inbox/<file>.md` ping to Lead. Questions go to Lead directly.
- Rules and owner decisions: `ai/decisions.md`. Discussed but not started: `ai/backlog.md`.
- Releases: DevOps runs `chubi-pocket-be/scripts/release.sh <version> <brief-dir>` (brief template: `ai/templates/release-brief/`). Before QA runs: `scripts/local-deploy.sh`.

## In progress
- **0.3.1-8: code DONE, uncommitted, nobody editing:**
  - the UI round: 15 items of the owner's 18-item note
  - pending add page + "แก้ร่าง" sheet (items 11/13) + BE `draft.project_id` (event on drafts, submit-time split checks)
  - the detail standard on 7 detail pages (tx + debt excluded) + a collapsing empty hero top row
  - AppChip system-wide (3 sizes; old chips deleted)
  - DevOps tooling (release.sh, local-deploy.sh --web, serve-web.js, release-apk.sh)
  - QA scripts `ai/qa/`
  - docs `ai/`
- Item 10 (category icon/colour) was already done. Item 9 is done via the detail standard.

## Waiting on the owner
- 0.3.1-8: a QA check of the changes first, or GO.
- QA's debts notes in the backlog: keep for the debts round, or drop.

## Next releases
- 0.3.1-8 = the round above.
- Next: the App hub (design system) plan, phases 0–4 in `ai/backlog.md` (includes the open detail-standard leftovers).
- Later: debts rework, the remaining pages (events, budgets, scheduled, saving goals), the "อัปเดตตาม" URL bug.

## Team (session names change; check ListAgents)
- Open now: Lead `chubi-pocket-99` · FE-A `chubi-pocket-81` · FE-B `chubi-pocket-a0` (kit owner) · BE `chubi-pocket-bc` · QA `chubi-pocket-59` (qa-lead) · DevOps `chubi-pocket-e3`. Open sessions with `/chubi-<role>` (QA: `/chubi-qa QA-fix` or `/chubi-qa qa-lead`).
- Local env: docker BE `localhost:8080` + DB `:5433`; QA users qaa4858675 (+ linked qab/qac/qae), qlead657724, password qapass1234.

## Old log
- `CURRENT-WORK.md` (docs root) is frozen history up to 2026-10-11. Infra how-to: `engineering/ops-runbook.md`.
