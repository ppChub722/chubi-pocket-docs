# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-17 by Lead._

## Plan
- **Now: 0.4.0 = the UI round** (owner 2026-10-17): every page's UI per the approved design reference https://claude.ai/artifact/EJq2vwbaKkYmMu27ZtZPZ7 ("Chubi Page Reference"). The earlier 0.3.1-11 / 0.3.2 / 0.3.3 / 0.4 split is parked; versions after 0.4.0 get re-planned. The plan still ends at 1.0 (product/roadmap-1.0.md).
- The old phase plan (`product/phases.md`) is cancelled. No Play Store, no monetization, no web / admin app.
- Currency: one per user, auto-filled, changeable as a relabel, ignored in all calculations (`ai/decisions.md` → Currency).
- **UI library:** the library AI works on its own branch (brief `ai/briefs/ppforge-ui-library.md`). The kit freeze is LIFTED (owner 2026-10-17): chubi edits lib/ui freely; the library follows later.

## Live (prod)
- **0.3.1-10** (2026-10-13): be `f503d9c` · app `4d838f1` (build 58, Firebase 2058) · migration 060 · `LATEST_APP_BUILD=MIN_APP_BUILD=58` · tags v0.3.1-10. QA pass: no. Details: `ai/releases/0.3.1-10.md`.
- Prod is the old Happy-Host box and is probably down (2026-10-16). **No new VPS until 0.3.3** (owner 2026-10-16): until then everything is local only; releases are tags + local builds, no deploys. The new server runbook: `engineering/new-vps-runbook.md`.

## In progress (2026-10-17, Lead handoff)
- **0.4.0 TAGGED + PUSHED (2026-10-17)**: tags v0.4.0 in be `2d50b22` (migrations 061–064) · app `28ded39` (version 0.4.0+111, build 111) · docs `55d8622` · Lead final run: analyze clean, go vet clean, flutter test 1077 pass then the 9 reds fixed (re-run of those files: 70/70). Not deployed, no local build yet; local DB not migrated. Next = owner review: decisions + 2 questions in ai/inbox/lead.md, then the owner orders a local build.
- **NEXT: 0.4.0-1 + machine move** → read `ai/briefs/0.4.0-1-plan.md` (scope: archive goals with money, goals without a target; plus the new-computer checklist). Planned, NOT briefed; wait for the owner's go.
- Plan (sent 2026-10-17 by Lead, owner's go): ai/briefs/0.4.0-plan.md · 0.4.0-be.md · 0.4.0-fe-core.md · 0.4.0-fe-pages.md. Run straight through M5 while the owner is away. The team decides non-breaking choices itself ("Decisions taken" in each inbox); Lead confirms / overrides and collects them for the owner. Pending page: UI frozen, logic in scope. No local build / tag / push until the owner orders it.
- Sessions (after the 06:08 crash, 2026-10-17): BE chubi-pocket-98 · FE-pages chubi-pocket-8c · FE-core chubi-pocket-31 · Lead chubi-pocket-2d.
- Lead's collected decisions for the owner: ai/inbox/lead.md "0.4.0 decisions for the owner".
- Design reference artifact (approved): https://claude.ai/artifact/EJq2vwbaKkYmMu27ZtZPZ7 . To change it in a new session, read it with the Artifact tool (action read) and republish to the same url.
- Committed: be 1b5dfe0 · app 4c6ce78 · docs (this commit). BE 0.3.3 branch feat/0.3.3-delete-archive (worktree chubi-pocket-be-033) not merged: BE M1 item 1 merges it.
- Owner decisions today are in ai/decisions.md (note label stays โน้ต, 0.4.0 scope, kit freeze lifted, edit mode, sections, hero anatomy, รอรับ/รอจ่าย, ผูกกับ, เตือนจ่าย, event tags, shell swipe, page indicator).

## Waiting on the owner
- Review the 0.4.0 result + the collected decisions (owner back 2026-10-18). UI library package name: parked.

## How the team works
- The owner talks ONLY to **Lead**. Team sessions load their role skill (`ai/skills/chubi-*`), read this file, then wait for Lead's brief.
- Reports go to `ai/inbox/<role>.md` with a one-line `DONE … → ai/inbox/<file>.md` ping to Lead. Questions go to Lead directly.
- Rules and owner decisions: `ai/decisions.md`. Discussed but not started: `ai/backlog.md`.
- Releases are tag-based: Lead commits, bumps, tags `v<version>` in be / app / docs and pushes; DevOps runs `chubi-pocket-be/scripts/release.sh <brief-dir>` from the tags (brief template: `ai/templates/release-brief/`). Local env: `scripts/local-deploy.sh --web` (only when the owner orders).

## Team (session names change; check ListAgents)
- Lead · **fe-core** (kit / hub / shell / router / templates, auth, tx / quick create, settings, wallets / categories / tags / contacts) · **fe-debt** · **fe-event** · **fe-budget** · **fe-recurrent** · **fe-saving**. Inboxes: fe-core.md / fe-debts.md / fe-events.md / fe-budget.md / fe-recurrent.md / fe-saving.md. BE / QA / DevOps sessions are started when needed.
- Every role wrote "## Handoff 2026-10-13" (state + gotchas) in its inbox file.
- Local env: docker BE `localhost:8080` + DB `:5433` (`chubi_pocket_db`, migration 060) + web :5181. The QA users are gone; recreate them locally when QA is needed.

## Old log
- `CURRENT-WORK.md` (docs root) is frozen history up to 2026-10-11. Infra how-to: `engineering/ops-runbook.md`.
