# Release brief (Lead → DevOps)

A release brief is a folder of 5 files. DevOps runs
`chubi-pocket-be/scripts/release.sh <folder>`, which reads them as they are,
so they need no back-and-forth.

**Copy this folder OUTSIDE the repos** (for example to your scratchpad) and
fill it in. The script writes `.state`, `logs/` and `summary.txt` into the
folder. It refuses a folder inside chubi-pocket-be, -app or -docs, because
`git add -A` would commit them.

| File | What |
|---|---|
| `brief.env` | the facts: version, expected migrations, MIN build, path counts, QA |
| `be.msg` | BE commit message: subject line, blank line, body. Leave it out when `BE_PATHS=0`. |
| `app.msg` | app commit message, same format. Leave it out when `APP_PATHS=0`. |
| `docs.msg` | docs commit message, same format |
| `entry.md` | your part of the release entry (`ai/releases/<version>.md`): release note + what the owner should test |

## brief.env

```
VERSION=0.3.1-8          # tag v0.3.1-8; pubspec becomes 0.3.1-8+8
EXPECT_MIGRATIONS=none   # or the new migration numbers, e.g. "53 54"
MIN_APP_BUILD=unchanged  # or a number: forced update, set after the APK is out
BE_PATHS=13              # changed paths per repo, counted with
APP_PATHS=112            #   git status --porcelain --untracked-files=all | wc -l
DOCS_PATHS=5             # "any" skips the check; 0 = no changes in that repo
QA=n                     # y = a QA pass ran on this tree
```

- **Path counts** guard against an unfrozen or wrong tree: a mismatch stops the release.
- `BE_PATHS=0` gives an app-only release: no BE commit, deploy or tag. The script checks that prod already runs BE HEAD.
- `APP_PATHS=0` gives a BE-only release: no app commit, APK or LATEST change, and no app tag.

## Commit messages

- Subject: `feat: … (0.3.1-8)`. The subject must be unique, because the script finds an existing release commit by its exact subject when it resumes.
- No AI attribution or Co-Authored-By lines.
- English only. Wrap the body at about 72 columns.

## entry.md

Free text in English, added under the facts the script writes itself:
hashes, checks, backup, build, env, verify and tags. For example:

```
- **Release note:** dashboard numbers now use the share basis (intended).
- **Owner to test:** update banner on build 47 → install 48; …
```

## What release.sh does

1. preflight: on main, not behind origin, path counts, new migrations vs the brief, prod reachable and healthy
2. checks:
   - BE `go vet` + `go test -count=1 -v`, which needs the :5433 DB at the tree's newest migration and 0 skipped tests
   - app `flutter analyze` + `flutter test`
   - both run in parallel; any failure stops the release
3. pubspec bump, one commit per repo, push
4. `deploy.sh --skip-apk`, then `release-apk.sh`
5. prod `.env`: `.env.bak-<version>`, LATEST (and MIN), recreate the app
6. verify:
   - `/health`
   - `app/version`
   - unauthenticated route → 401
   - app log errors 0
   - prod label = BE release
7. offsite copy: `NO_RESTORE=1 pull-to-dev.sh --no-dump`
8. release entry `ai/releases/<version>.md`, docs commit, push; annotated tags `v<version>` on the released repos
9. summary in `summary.txt`

`--dry-run` runs the preflight and prints the plan, including the entry it would write, and changes nothing. A failed run can be re-run: steps already done are skipped.
