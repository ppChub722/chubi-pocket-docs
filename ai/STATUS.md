# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-15 by Lead._

## Plan
- **The plan ends at 1.0** (owner 2026-10-15): [`product/roadmap-1.0.md`](../product/roadmap-1.0.md). 0.3.1-11 UI round → 0.3.2 LLM drafts → 0.3.3 delete / archive → 0.4 dashboard, push, export, onboarding, dark mode → 0.5 hardening → 1.0 stable for the owner's circle, then frozen.
- The old phase plan (`product/phases.md`) is cancelled. No Play Store, no monetization, no web / admin app.
- Currency: one per user, auto-filled, changeable as a relabel, ignored in all calculations (`ai/decisions.md` → Currency).
- **UI library first:** another AI extracts this app's UI into a ready-made Flutter library (brief `ai/briefs/ppforge-ui-library.md`, reports `ai/inbox/ui-lib.md`). Order: extract (no visual change) → chubi switches onto it → the 0.3.1-11 UI round happens in the library. **`lib/ui/` is frozen in chubi until the switch.**

## Live (prod)
- **0.3.1-10** (2026-10-13): be `f503d9c` · app `4d838f1` (build 58, Firebase 2058) · migration 060 · `LATEST_APP_BUILD=MIN_APP_BUILD=58` · tags v0.3.1-10. QA pass: no. Details: `ai/releases/0.3.1-10.md`.
- Prod is still the old Happy-Host box (the owner ordered this last deploy there). The new server runbook: `engineering/new-vps-runbook.md`.

## Next: 0.3.1-11
- **UI review round** (owner: "UI แปลกมาก"): after the library switch; owner sends screenshots per page → Lead discusses → fixes in the library → release. Not started.
- **Currency auto** from the user setting (`ai/backlog.md`).
- Leftovers: page bugs (events / budgets / recurring / goals, `ai/backlog.md` → Remaining pages), offline-mode leftovers, pending 🐷 draft should open an edit sheet.

## Waiting on the owner
- UI library: package name / repo location (the library AI asks the owner).
- Feature-widget audit (`ai/inbox/fe-a.md`): A≈18 · B≈111 · C≈25, ~29 dev-days. Lead proposed a ratchet test + moving widgets during the page reworks.
- Short text values in detail boxes: one row (Lead's pick) vs stacked.

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
