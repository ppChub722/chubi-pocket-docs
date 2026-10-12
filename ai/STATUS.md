# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-13 evening by Lead._

## Live (prod)
- **0.3.1-8** (2026-10-12): app `f6f89f1` (build 49, Firebase 2049) · be `98344c6` · docs `b0d4d0f` · migration **052** · `LATEST_APP_BUILD=49` · `MIN_APP_BUILD=0` · tags v0.3.1-8.
- Details per release: `ai/releases/<version>.md`.

## How the team works
- The owner talks ONLY to **Lead**. Team sessions load their role skill (`ai/skills/chubi-*`), read this file, then wait for Lead's brief.
- Reports go to `ai/inbox/<role>.md` with a one-line `DONE … → ai/inbox/<file>.md` ping to Lead. Questions go to Lead directly.
- Rules and owner decisions: `ai/decisions.md`. Discussed but not started: `ai/backlog.md`.
- Releases are tag-based: Lead commits, bumps, tags `v<version>` in be / app / docs and pushes; DevOps runs `chubi-pocket-be/scripts/release.sh <brief-dir>` from the tags (brief template: `ai/templates/release-brief/`). Local env: `scripts/local-deploy.sh --web` (only when the owner orders).

## In progress
- **0.3.1-9: PREPARED, not deployed** (2026-10-13 evening). Tags `v0.3.1-9` pushed in be / app / docs.
  - be `5b7722e` · app `f981eb9` (build **54**, pubspec `0.3.1-9+9`) · docs = the tag (tags moved after each round of the owner's local review fixes)
  - scope: hub kit adopted app-wide (raw-widget ratchet 0), API v2 thin FE, detail / list standards, pull-to-refresh everywhere, layout-true skeletons, sheets as kit organisms + one popover organism, entity chips, compact hero = hero card, wallet hero balance + ActionBar + adjust sheet, dev portal `/#/dev`
  - review fixes: token-fixed AppInput sizes (hero fields line up), compact split section in quick forms + event chip, full-width row labels, profile settings page (contact template, email), auth pages on the kit (AuthPageBody), framed input affixes, change password on the edit template, one DetailTextField
  - gates: app analyze 0 issues · 547 tests pass · BE vet clean · 190 pass, 0 skip
  - local env rebuilt from this tree for the owner (BE migration 53, web :5181)
  - brief ready, NOT sent: `chubi-pocket/release-briefs/0.3.1-9/` (EXPECT_MIGRATIONS=53, MIN_APP_BUILD=54)
- **Next:** the owner checks local :5181. On "สั่ง release" Lead sends DevOps the brief folder. A bug found first → fix, re-commit, move the tags (nothing deployed yet).

## Waiting on the owner
- Review of local :5181, then "สั่ง release".
- Feature-widget audit (`ai/inbox/fe-a.md`): A≈18 · B≈111 · C≈25, ~29 dev-days. Lead proposed a ratchet test now + the moves in 0.3.1-10 (with the page reworks); waiting for the owner.
- 0.3.1-10 questions: events (8), budgets / scheduled / goals (5); debts answered (fe-debts.md rev 2).

## Next releases
- 0.3.1-9: the above, released with `MIN_APP_BUILD` = the new build.
- 0.3.1-10: debts + events + budgets + scheduled + goals in parallel (1 FE per page group, FE-A/FE-B as supporters).

## Team (session names change; check ListAgents)
- Open now: Lead `chubi-pocket-99` · FE-A `-81` (kit owner) · FE-B `-a0` · FE-C `-1a` (debts) · FE-D `-02` (events) · FE-E `-61` (budgets / scheduled / goals) · BE `-bc` · QA `-59` (qa-lead) · DevOps `-e3`.
- Local env: docker BE `localhost:8080` + DB `:5433`; QA users qaa4858675 (+ linked qab/qac/qae), qlead657724, password qapass1234.

## Old log
- `CURRENT-WORK.md` (docs root) is frozen history up to 2026-10-11. Infra how-to: `engineering/ops-runbook.md`.
