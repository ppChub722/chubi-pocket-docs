# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-26 after the 0.4.1-0 close._

## Where we are: 0.4.1-0 — closed (tagged, merged, live)
- Tag **`v0.4.1-0`** in app `2848aeb` (version **0.4.1-0+172**) · be `21fe2b2` · docs `a2512c1`; `origin/main` = the tag in app and be. Release note: `team/releases/0.4.1-0.md`.
- Full run (AI-3, 2026-10-26 15:17): flutter analyze clean · flutter test **371 passed** · go vet clean · go test ./... with TEST_DATABASE_URL all ok, **0 skip**.
- **Prod:** BE `21fe2b2` live on the ppForge VPS (migrations 079 + 080, backup `chubi_pocket-20261026-1532.dump.gz`, previous image kept as `chubi-be:prev`). **APK 172** is on Firebase and the gate is **MIN = LATEST = 172** (`.env.bak-20261026-1619-before-gate-172`): the app sends the pubspec build, the BE also reads a split-per-ABI versionCode (2172 = 172); 170 / 2170 → 426.
- **Local:** BE at 080, health 200. Test DB `chubi_pocket_test` at 080.
- Plan and owner answers: `now/briefs/0.4.1-0-plan.md`.

## Done in 0.4.1-0 (details in team/inbox/ai-2.md, ai-3.md, be.md and the commits)
- **AI-1 (BE + docs):** C1 `POST /recurring/occurrences/bulk` (confirm / skip / mark_paid, a savepoint per occurrence, `left_out` reasons) · H1 paid_by on an income ("รับแทน", migration 080; the debt is "they owe me") · A6 `GET /api/v1/health` · H3 the person tx filter also lists split bills, paid_by bills and debt-linked tx · H8 share text "{name} เป็นลูกหนี้ / เจ้าหนี้" · A7 BE cleanup (recurring RuleID non-null) · D2 my-books tests · I docs (this file, decisions, schema, API, specs 04 / 12 / 13) · the docs restructure (now / rules / modules / ref / build / ops / team).
- **AI-2 (kit + offline):** E1 buttons, E3 detail rows → AppListRow, E4 hub-only kit pieces removed, H4 budgets-list card, H9 hero label spacing, B offline gating.
- **AI-3 (lists + cleanup + close):** E2 list heads, H2 no debt item counts, A5 stuck skeletons, G2 / G3 / G5 cleanup, G6 541 unused l10n keys removed, the full run.
- **AI-4 (entry flows + recurring + goals):** A1 currency leaks, H1 app (income gets every ผูกกับ tab incl. "รับแทน"), H5 wallet wording, A7 app (future-date hint), C2 rows with no amount + C1 wiring, G1, goals bundle A2–A4 / F1.

## Next (owner decides)
1. Install build 172 from Firebase (firsttester) and try it against prod: the test list in `team/releases/0.4.1-0.md`.
2. **0.4.1-1 "linked = synced"** (mostly BE: linked rows keep the same values, DB accepts 0 on synced rows, every user setting on the server; G4 quick create project mode goes here) — see `now/roadmap-1.0.md` and the owner answers in `now/briefs/0.4.1-0-plan.md`. Needs a plan + work split first.

## Where things are
- The map of every doc: the root `README.md` (old `ai/…` paths → new ones at its bottom).
- `ref/app-map.md`: every route, page, sheet and picker with its owner; update it with any new screen.
- Ops: `ops/ops-runbook.md` (prod = `ssh ppforge`, build images on the dev PC, never on the 1 GB box).

## New machine checklist
- Clone / pull app, be, docs (`main`).
- Flutter via fvm 3.47.3 (`.fvm/flutter_sdk`); the PATH flutter fails pub resolution.
- Docker Desktop, then `chubi-pocket-be/scripts/local-deploy.sh` (migrates the local DB). The local DB data does NOT move with git: start empty, or copy `chubi-pocket/backups/` (secrets + dumps, never committed) and restore.
- Go DB tests: a throwaway DB (e.g. `chubi_pocket_test`) migrated to the head, `TEST_DATABASE_URL=postgres://chubadmin:admin1234@localhost:5433/chubi_pocket_test?sslmode=disable`.
- Role skills: `team/skills/chubi-*`.

## Team (session names change on restart; check ListAgents + roll call)
- 0.4.1-0 (owner 2026-10-26): 4 AIs, equal shares. AI-1 = chubi-pocket-85 (BE + docs) · AI-2 = chubi-pocket-ce (kit + offline) · AI-3 = chubi-pocket-02 (lists + cleanup + close) · AI-4 = chubi-pocket-59 (entry flows + recurring + goals; also the app commits). ce and 02 have closed.
- Questions go to the owner directly. Reports → `team/inbox/<role>.md` + a one-line ping.
- Shared files, tell the others before editing: app_th/en.arb (append keys, then gen-l10n), hub_registry.dart, ui.dart, app_router.dart, BE internal/apidoc/openapi.yaml, cmd/api/main.go.
- Rules: `rules/decisions.md` · not started / discussed: `now/backlog.md` · history: `archive/` (see archive/README.md).
