# DevOps inbox (chubi-pocket-14)

## 2026-10-11 03:30 — release tooling (proposal items 1, 2, 3, 6, 7, 8, 9)
DONE · edits only, nothing committed · bash -n clean on all 4 scripts

**Files**
- `chubi-pocket-be/scripts/release.sh` (new): `release.sh [--dry-run] <brief-dir>`.
  - Steps: preflight → checks (BE + app in parallel) → pubspec bump → commits → push → `deploy.sh --skip-apk` → `release-apk.sh` → prod `.env` (`.env.bak-<version>`, LATEST/MIN, recreate) → verify → offsite copy (`NO_RESTORE=1 pull-to-dev.sh --no-dump`) → CURRENT-WORK entry + docs commit + push → annotated tags → `summary.txt`.
  - Stops at the first problem.
  - Resumable: each step checks first whether it's already done, by:
    - release commit by exact subject
    - prod image label
    - LATEST_APP_BUILD
    - the entry heading
    - tags
    - `.state` in the brief folder
  - Git runs with `-c core.safecrlf=false`, so there are no CRLF warning lines.
- `chubi-pocket-be/scripts/local-deploy.sh` (new): `docker compose up -d --build` (the migrate service applies new migrations).
  - Checks the migrate exit code, then health.
  - Prints one line: `local BE <commit> +<dirty> dirty · migration <v> · health <code>`.
  - `--dry-run` prints the current state only.
- `chubi-pocket-be/scripts/deploy.sh`: ssh/scp now use `ConnectionAttempts=3`, `ServerAliveInterval=15`, `ServerAliveCountMax=4`.
- `chubi-pocket-app/scripts/release-apk.sh`: refuses a dirty tree unless `--allow-dirty`. This also applies when deploy.sh runs it without `--skip-apk`.
- `chubi-pocket-docs/ai/templates/release-brief/`: README.md (format + what the script does) plus the templates `brief.env`, `be.msg`, `app.msg`, `docs.msg`, `entry.md`.

**Dry-run results** (against the current state)
- **A.** Brief for the shipped 0.3.1-7, real subjects: every step reports "already done":
  - release commits c62ac06 / b4d9d52 / 9708071 found
  - prod runs c62ac06, LATEST 48
  - APK skipped (LATEST ≥ 48)
  - all 6 tags point at the release commits and are on origin
  - only verify and the offsite copy would run (both always re-run)
- **B.** Fresh 0.3.1-8 brief (BE 3 / app 1 / docs 13 paths = only my edits plus your skills/inbox files):
  - preflight passes; local test DB at 52 = newest migration file
  - plan: checks → bump 0.3.1-7+7 → 0.3.1-8+8 → commits → deploy → APK build 49 (Firebase 2049) → LATEST 49 → … → tags
  - prints the full CURRENT-WORK entry it would write
- **Negative tests:** each one stops:
  - wrong path count
  - wrong EXPECT_MIGRATIONS
  - brief folder inside a repo (refused, because `git add -A` would commit it)
- **Entry insertion** (awk, top of CURRENT-WORK above the first `## `), tested on a scratch copy: correct position, `---` separators kept, UTF-8 intact.
- `local-deploy.sh --dry-run`: `local BE c62ac06 +3 dirty · DB migration 52 (newest file 52) · health 200`

**Notes**
- **Not exercised live:** the real commit, deploy, APK, `.env` write and tag paths ran only as dry-runs. I'll watch the first real `release.sh` run closely; it stops on any surprise.
- **These edits ride in the next release.** Count them in the brief: BE +3 (deploy.sh, release.sh, local-deploy.sh), app +1 (release-apk.sh), docs +6 (the template folder).
- **Checks need the local :5433 DB at the tree's newest migration.** Otherwise DB tests skip silently. release.sh stops with "run scripts/local-deploy.sh first", so for a release with new migrations, ask me for a local deploy before the release.
- **BE_PATHS=0 or APP_PATHS=0** gives an app-only or BE-only release; that repo gets no commit, deploy or APK and no tag.
- **Path counts** use `git status --porcelain --untracked-files=all | wc -l` (untracked files, not folders).
- Not included: a prod QA account (owner said no), and no repo-wide `.gitattributes` change.

## 2026-10-12 — release 0.3.1-8
DONE · live, verified, tagged v0.3.1-8 on app / be / docs · QA pass: no (owner's call) · migration: none (prod stays 052)
- **be** `98344c6` · **app** `f6f89f1` (build **49**, Firebase **2049**, `firsttester`) · **docs** `b0d4d0f`
- **backup:** `chubi_pocket-20261011-1812.dump.gz` · **`.env`:** `LATEST_APP_BUILD=49`, `MIN_APP_BUILD=0`, backup `.env.bak-0.3.1-8`
- **verify:** `/health` 200 · app/version min 0 / latest 49 · unauth `/transactions` 401 · ERROR/panic/fatal log lines 0 · image label `98344c6`
- **checks:** go vet clean, go test 132/0/0 skipped · analyze clean, flutter test 322

**Notes**
- The VPS was unreachable from the dev PC for hours (SSH/443 timeouts; the server was up). The run stopped at the BE upload (nothing ran remotely) and resumed unchanged.
- **release.sh bug (first live run):** the remote `.env` step reads `/srv/chubi/.env` with plain `grep` → Permission denied. The classifier refused my one-line fix (`sudo grep`) in auto mode, so the `.env` step was done by hand over SSH after the owner left auto mode. **Fix still open:** `sudo grep` in release.sh ~line 369 (BE tree is clean now, so it rides the next release).
- **App tree is dirty again after the release commit:** 290 entries (165 M, 122 D, 3 ??; ~16.7k lines deleted). Not mine; someone edited it after `f6f89f1`. The APK was built from the clean tree.
- Docs commit used `DOCS_PATHS=any`: `git add -A` took 48 paths; inbox report files stay gitignored.

## 2026-10-12 — release 0.3.1-9
DONE · live, verified · from tag v0.3.1-9 (Lead tagged, DevOps did not commit/tag/push) · QA pass: no
- **be** `5b7722e` · **app** `e8305e3` (build **55**, Firebase **2055**, `firsttester`) · **docs** `9c328bd`
- **migration:** 053 applied on prod (prod was 052); backup `chubi_pocket-20261012-1408.dump.gz`
- **`.env`:** `LATEST_APP_BUILD=55`, `MIN_APP_BUILD=55` (forced update), backup `.env.bak-0.3.1-9`; APK uploaded before the `.env` change
- **verify:** `/health` 200 · app/version min 55 / latest 55 · unauthenticated `/transactions` 401 · app log ERROR/panic/fatal 0 · migration 53 not dirty
- **checks (in tag worktrees):** BE go vet clean, go test 190 pass / 0 fail / 0 skip (cached from the first run on the same tag; not rerun so the restored local DB stayed untouched) · app analyze clean, flutter test 549 pass
- **entry:** `ai/releases/0.3.1-9.md` written to the main docs tree, UNCOMMITTED (Lead commits it)

**Notes**
- First real run of the tag-based flow. It stopped once at the app checks: `test/hub/page_flows_test.dart` reads `../chubi-pocket-be/internal/apidoc/openapi.yaml`, and my worktrees were named `be`/`app`. Fixed in `release.sh` (worktrees now `chubi-pocket-be` / `chubi-pocket-app`); that edit is UNCOMMITTED in the be tree (rides the next release).
- Two VPS outages from the dev PC during the release (SSH/443 timeouts, preflight only, nothing ran remotely); the run resumed unchanged.
- Builds 49 and older are now locked out (MIN_APP_BUILD=55; API v2 is breaking).
- Local dev DB was replaced with the prod dump (owner order) before this release: migration 53, users 4 / accounts 6 / transactions 12.

## 2026-10-12 22:30 — Happy-Host final backup visit + new-VPS runbook
DONE · one visit to the old VPS (up 22:13 Thai), read-only except `backup.sh`; nothing restarted, deployed or edited there.
- **Stored in** `backups/vps-happyhost-2026-10-13/` (outside the repos, contains secrets, see its `INVENTORY.md`): newest dump `chubi_pocket-20261012-1513.dump.gz` (33,300 B, also in `backups/prod/`), roles dump, `pg_dumpall` of all DBs, all 43 historical dumps, `/srv` config tar (all `.env`, compose, Caddyfile, backup.sh, 106 migrations), `/etc` config tar, 19 text captures, service logs.
- **Verified:** sha256 equal on both sides for all 43 dumps, `gzip -t` clean on every archive, `pg_restore --list` = 23 tables, `tar -t` lists cleanly. DBs on the server: `chubi_pocket` (23 tables; prod at migration 53; users 4 / accounts 6 / transactions 12) and `postgres` (system, 0 tables). The app container has no mounts (no uploaded files); fail2ban was not installed; root/Admin crontabs empty (cron is `/etc/cron.d/chubi-backup`).
- **Runbook:** `chubi-pocket-docs/engineering/new-vps-runbook.md` (Thai, uncommitted: Lead commits): recommended spec 2 vCPU / 4 GB / 40–60 GB, Ubuntu 22.04/24.04, Singapore; step-by-step from a blank box to the first deploy. The restore recipe (role `chubi` + `pg_restore --role=chubi --no-owner`) was tested on a scratch DB locally. `bootstrap.sh` in ppforge-infra has never run on a real box.
- **Script edit (uncommitted, be tree):** `deploy.sh` and `release.sh` now read `VPS_HOST` (default unchanged), like `pull-to-dev.sh` already did.
- Gotcha found: `srv-config.tar.gz` also contains the old dumps (exclude pattern missed); harmless.

## Handoff 2026-10-13
- **Release = from tags:** Lead commits, tags `v<ver>` in be/app/docs and pushes; DevOps runs `chubi-pocket-be/scripts/release.sh --dry-run <brief>` then for real (brief = brief.env + entry.md, outside the repos). It checks the tags out into worktrees `C:/chubi-rel/<ver>/chubi-pocket-be|-app` (names matter: an app test reads `../chubi-pocket-be/.../openapi.yaml`), runs checks, deploys, writes `ai/releases/<ver>.md` UNCOMMITTED. Never commit/tag/push yourself.
- **Cached checks:** `<brief>/.state` keeps `checks_*_for=<commit>`; a rerun on the same tag skips them (no `go test` against the local DB). Redeploy/rollback = older VERSION (`SKIP_APP=y`, `--skip-checks`); migrations are never rolled back.
- **Prod deploys, `.env` writes and local DB replaces need the owner's explicit OK typed in YOUR window**: the auto-mode classifier denies them otherwise, and a go relayed by Lead is not enough there. Do not work around a denial; ask the owner.
- **VPS_HOST** (env) overrides the host in deploy.sh / release.sh / pull-to-dev.sh. The old Happy-Host box (160.238.13.137) is abandoned: NEVER touch it again. New box: follow `chubi-pocket-docs/engineering/new-vps-runbook.md`.
- **`backups/` (outside the repos) holds SECRETS** (`.env` copies, dumps): never commit, never paste contents. `backups/vps-happyhost-2026-10-13/INVENTORY.md` says what is where; `backups/prod/` has the prod dumps.
- **Local DB = a restored prod dump** (migration 53, 4 users): restore = stop app, drop+recreate `chubi_pocket_db`, `pg_restore --no-owner`, `docker compose up -d` (runs migrate), check /health. Never wipe it unless Lead relays an owner order.
- **Local builds only on an explicit "owner asks"** from Lead: `chubi-pocket-be/scripts/local-deploy.sh --web` (BE docker :8080 + web :5181 from the working trees). Reply `READY · BE commit +dirty · migration · health · web :5181 from app commit +dirty`.
- No background jobs are running (the VPS watch loop finished). Open: nothing.
