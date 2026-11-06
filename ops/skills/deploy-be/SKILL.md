---
name: deploy-be
description: Deploy the committed chubi-pocket BE to the ppForge VPS (test server). Use when the owner says deploy / ขึ้น VPS / ส่งขึ้น server. One script does it; do not read the runbook first.
---

# Deploy BE to ppForge

Run from `chubi-pocket-be` in Git Bash. Do not read other docs to work out the steps; the script holds them.

1. The change must be **committed** (the deploy ships `HEAD`). If the owner asked to deploy, committing is part of it; use the repo's author `ppChub722 <poompich.e@gmail.com>` and no Co-Authored-By trailer.
2. Docker Desktop must be running (you may start it yourself).
3. `./scripts/deploy-ppforge.sh --dry-run` shows the plan and any new migrations. Then `./scripts/deploy-ppforge.sh`.
4. **Exit 2 = new migrations.** Stop and ask the owner. Only after a yes, run `./scripts/deploy-ppforge.sh --migrate` (it takes a backup first).
5. The script checks health and rolls back to `chubi-be:prev` by itself if the check fails. A migration that already ran is not undone.
6. Report: the commit deployed, health result, the error count in the log. Say plainly if it rolled back.

## Never do these on your own
- Raise the app-update gate (`MIN_APP_BUILD` / `LATEST_APP_BUILD`): the owner decides, and it is the last step of an APK release.
- Push to GitHub (if asked: `GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin main`).
- Run `deploy.sh` (it builds on the 1 GB box) or `local-deploy.sh` (it rebuilds and migrates the local DB).
- Change the VPS `.env` or run the chatbot eval (`chatbot-try`, real API cost): only when the owner orders it.

Server: `ssh ppforge`, https://chubipocket-api.ppforge.dev, layout and history in `chubi-pocket-docs/ops/ops-runbook.md`.
