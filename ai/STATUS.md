# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-12 night by Lead._

## Live (prod)
- **0.3.1-8** (2026-10-12): app `f6f89f1` (build 49, Firebase 2049) · be `98344c6` · docs `b0d4d0f` · migration **052** · `LATEST_APP_BUILD=49` · `MIN_APP_BUILD=0` · tags v0.3.1-8.
- Details per release: `ai/releases/<version>.md`.

## How the team works
- The owner talks ONLY to **Lead**. Team sessions load their role skill (`ai/skills/chubi-*`), read this file, then wait for Lead's brief.
- Reports go to `ai/inbox/<role>.md` with a one-line `DONE … → ai/inbox/<file>.md` ping to Lead. Questions go to Lead directly.
- Rules and owner decisions: `ai/decisions.md`. Discussed but not started: `ai/backlog.md`.
- Releases: DevOps runs `chubi-pocket-be/scripts/release.sh <version> <brief-dir>` (brief template: `ai/templates/release-brief/`). Before QA runs: `scripts/local-deploy.sh`.

## In progress (night of 2026-10-12 → 13; owner asleep, Lead relays)
- **0.3.1-9 = App hub + dev portal + API v2 (forced update):**
  - BE (`-bc`) implements spec v2 (93 ops; A/B/D/E/F/G + nickname migration 053 + the contact-name rule); currency unchanged
  - FE-C (`-1a`) adopts API v2 on tx + home (+ minimal debts adaptation)
  - FE-D (`-02`) on pending / notifications / settings / More / me (+ minimal events adaptation)
  - FE-E (`-61`) on wallets / categories / tags / contacts + the nickname setting (+ minimal budgets / scheduled / goals adaptation)
  - FE-A (`-81`) + FE-B (`-a0`): hub-only proposals (AppInput rule, SelectCard gradient, AppMessage, grouped sections), a hub self-audit, the HubPlayground; NOT used in the app until the owner reviews
  - When everyone's DONE: DevOps (`-e3`) COMMITS ONLY (wip subjects; no push / deploy / APK / tags), then plans how the real release deploys pre-made commits
- release.sh `sudo grep` fix: waiting for the owner's approval in the DevOps session.

## Waiting on the owner (tomorrow)
- Review in the hub: AppInput, SelectCard gradient, AppMessage, grouped sections + row icons, the rest of the hub (after the self-audit). Then say which to adopt app-wide.
- 0.3.1-10 questions: events (8), budgets / scheduled / goals (5); debts is answered (`ai/inbox/fe-debts.md` rev 2).
- Single currency: parked; the DB/spec stay as-is.
- Local builds only when the owner asks.

## Next releases
- 0.3.1-9: the above, released with `MIN_APP_BUILD` = the new build.
- 0.3.1-10: debts + events + budgets + scheduled + goals in parallel (1 FE per page group, FE-A/FE-B as supporters).

## Team (session names change; check ListAgents)
- Open now: Lead `chubi-pocket-99` · FE-A `-81` (kit owner) · FE-B `-a0` · FE-C `-1a` (debts) · FE-D `-02` (events) · FE-E `-61` (budgets / scheduled / goals) · BE `-bc` · QA `-59` (qa-lead) · DevOps `-e3`.
- Local env: docker BE `localhost:8080` + DB `:5433`; QA users qaa4858675 (+ linked qab/qac/qae), qlead657724, password qapass1234.

## Old log
- `CURRENT-WORK.md` (docs root) is frozen history up to 2026-10-11. Infra how-to: `engineering/ops-runbook.md`.
