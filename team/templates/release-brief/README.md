# Release brief (Lead → DevOps)

**Lead** commits, bumps the app `pubspec.yaml` version, tags `v<version>` in
be / app / docs and pushes commits and tags. **DevOps** only deploys what the
tags contain: it never commits, tags or pushes.

A brief is a folder of 2 files. DevOps runs
`chubi-pocket-be/scripts/release.sh <folder>`.

**Copy this folder OUTSIDE the repos** (for example to your scratchpad) and
fill it in. The script writes `.state`, `logs/` and `summary.txt` into the
folder, and refuses a folder inside chubi-pocket-be, -app or -docs.

| File | What |
|---|---|
| `brief.env` | the facts: version, expected migrations, MIN build, QA flag |
| `entry.md` | your part of the release entry (`team/releases/<version>.md`): release note + what the owner should test |

## brief.env

```
VERSION=0.3.1-9          # the tag is v0.3.1-9; app pubspec must say 0.3.1-9+…
EXPECT_MIGRATIONS=none   # or the new migration numbers, e.g. "53 54"
MIN_APP_BUILD=unchanged  # or a number: forced update, set after the APK is out
QA=n                     # y = a QA pass ran on this tree
SKIP_BE=n                # optional: y = app-only release (no BE deploy)
SKIP_APP=n               # optional: y = BE-only release (no APK, LATEST unchanged)
```

## Before you ask DevOps to release

1. Everything is committed and pushed, and the app `pubspec.yaml` has
   `version: <VERSION>+<n>`.
2. Annotated tags exist and are pushed in all three repos:
   `git tag -a v<VERSION> -m <VERSION> && git push origin v<VERSION>`.
   The app build number is the commit count at the tag, so the tag must be on
   the last app commit of the release.
3. The local DB (:5433) is at the be tag's newest migration. The BE checks run
   against it and need 0 skipped tests (ask DevOps for a local deploy first
   when the release has a new migration).

## What release.sh does

1. preflight: resolves the tags (must exist on origin), app pubspec matches,
   new migrations in the be tag vs prod vs `EXPECT_MIGRATIONS`, prod
   reachable and healthy
2. checks out the be and app tags into clean worktrees (`C:\chubi-rel\<version>`)
   so the team's main trees stay free
3. checks, in the worktrees: BE `go vet` + `go test` (0 failed, 0 skipped),
   app `flutter analyze` + `flutter test`; red stops the release
4. BE: backup, migrate, swap, health (`deploy.sh --dir <be worktree>`)
5. APK from the app tag (`release-apk.sh --dir <app worktree>`), sent to
   `firsttester`
6. prod `.env`: `.env.bak-<version>`, `LATEST_APP_BUILD` (never lowered),
   `MIN_APP_BUILD`; the app is recreated
7. verify: `/health`, `app/version`, an unauthenticated route → 401, app log
   errors 0, prod image label = be tag
8. offsite backup copy
9. writes `team/releases/<version>.md` into the MAIN docs tree, **uncommitted**
   (Lead commits it), then removes the worktrees and writes `summary.txt`

`--dry-run` resolves the tags and prints the plan, including the entry, and
changes nothing. A failed run can be re-run: finished steps are skipped.

## Redeploy / rollback

Same command with an older `VERSION` (its tags already exist). Notes:
- Migrations are **never rolled back**. If prod's migration is newer than the
  tag's newest, the script refuses; restore from the pre-deploy dump instead.
- `LATEST_APP_BUILD` is never lowered, and an APK whose build is not newer
  than LATEST is not uploaded again.
- `--skip-checks` skips the checks for a tag that already passed them.
- BE checks (2026-10-28) run on a throwaway DB `chubi_rel_<version>` that the
  script builds from the tag's `migrations/*.up.sql` in the local postgres
  container (:5433) and drops afterwards (kept when a test fails). The dev DB
  `chubi_pocket_db` is never used, so it may lag behind; Docker must be up.
- `SKIP_APP=y` is the usual rollback: BE only.
