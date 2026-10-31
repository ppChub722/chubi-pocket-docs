# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-31. 0.4.2-3 RELEASED (tag v0.4.2-3, build 220, migration 130, MIN = LATEST = 220); see the first section._

## Now: 0.4.2-3 — RELEASED 2026-10-31 (tag v0.4.2-3: be 9f8f3ee · app f58f669 · docs b48c939; release note team/releases/0.4.2-3.md). Owner tests it on build 220 and reviews the hub (A0 + the Thai error texts)
Plan + progress table: `now/briefs/0.4.2-3-plan.md`. Split design: `now/briefs/split-transactions-plan.md`.
- **Live in prod:** BE `9f8f3ee` (migrations 124–130, backup `chubi_pocket-20261031-1517.dump.gz`; 129 and 130 are irreversible, restore from that dump if ever needed) and APK 220 (Firebase 2220). Gate MIN = LATEST = 220 (`.env.bak-0.4.2-3`). Prod rehearsal on the 2026-10-31 snapshot (123 → 130): bill pairs, transactions, debts and lump lines identical before and after.
- **What shipped:** split bills are no longer hidden events (one bill model: `split_transaction_people`, bill scope = `scope_id`; API shape unchanged); notification model F1–F3 (แจ้ง and อัตโนมัติ independent, three request rows with auto-accept, event invites as plain members, member ↔ contact per viewer); safe saves (Idempotency-Key on every edit page + quick create + event bill sheet); errors (one Thai text per API code, offline / slow / server-down told apart, field errors under the field); loading (kit pieces with their own tap fade and lock while a save runs); B 30–33; currency locked; tab-reset + page-prefs merged. Docs: `ref/schema.md`, `ref/api-document.md`, `rules/decisions.md` have a "0.4.2-3" block.
- **Fixed on release day (BE `9f8f3ee`):** a card's next due date and a saving goal's ETA rolled into the month after on the 29th–31st (`AddDate` on 31 Oct + 1 month = 1 Dec); they now clamp to the month's last day, with plain tests. Found because 2 BE tests failed on 31 Oct.
- **Housekeeping done:** merged branches and `wip/*` deleted (local + remote), worktrees removed. Left: app `refactor/pp-forge-decouple` (not merged), BE `origin/feat/split-transactions` (old pre-rebase history, content is in main). The prod dump copy on the dev PC (`chubi_snap` DB, scratchpad `prod/`) is KEPT as a backup (owner 2026-10-31).
- **Next (owner 2026-10-31): 0.4.2-4 = the Telegram chatbot (text → JSON, `now/briefs/0.4.2-chatbot.md`, BE only). Split phase B (renames) is DROPPED: names stay (project = event, `project_transactions` = bills, `project_members` = event members or a split bill's people, `scope_id` = event id or bill id)**; also open: B2 for forms outside `EditModeMixin`; loading for route sheets / pickers outside a page `BusyScope`; offsite backup script default fixed to ppForge (ppforge-infra `33bd11f`, not pushed). Older open items: the 5 bot texts BE wrote itself (team/inbox/be.md "1b-2"), upload UI + endpoint, real LINE / Google linking (0.4.3 backlog), app-permissions page.
- **Next steps of 0.4.2:** 1c = the Telegram chatbot, own plan `now/briefs/0.4.2-chatbot.md` (owner 2026-10-30: simple, no memory, ✓ / ✗ only, edit by Reply, Haiku 5.5; draft, not briefed); 1d = every module; phase 2 = Q&A (read-only tools); phase 3 = OCR slips.
- Team: Lead = this role (lead + test + DevOps). Prod: VPS ppForge, `ssh ppforge` (Admin@143.14.147.249). A release = `chubi-pocket-be/scripts/release.sh <brief>` after tags `v<version>` in be / app / docs are pushed (brief template `team/templates/release-brief/`).

## Before: 0.4.2-2 — RELEASED 2026-10-30 (tag v0.4.2-2: be 8c46d8a · app 35fd85a · docs c13e39c; team/releases/0.4.2-2.md)
Connections (Telegram), avatars, Telegram login / sign-up, migrations 121–123, build 185. Plan: `now/briefs/0.4.2-plan.md`.

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

## Now: 0.4.1-2 — RELEASED 2026-10-28 (with 0.4.1-1), tag `v0.4.1-2` (be `7b1f6bc`, app `809585b` = 0.4.1-2+175, docs `c9e02ca`)
- **Prod:** BE `7b1f6bc` live on ppForge, migration **113**, backup `chubi_pocket-20261028-1157.dump.gz` (offsite copy on the dev PC); **APK 175** on Firebase (2175, firsttester); gate **MIN = LATEST = 175** (`.env.bak-0.4.1-2`); verify: /health 200, unauth 401, log errors 0. Release note: `team/releases/0.4.1-2.md`. Run by Lead with `release.sh --skip-checks` (the local DB is at 070; Lead's full run on the same trees is in the note).
- **This dev PC's deploy key** (`~/.ssh/ppforge_vps`, `SHA256:HBZBsM4…`) was added to Admin's authorized_keys on 2026-10-28 via the VPS console; the VPS host key (ED25519 `SHA256:cLAvswtTiO65W6T+s2anB2Fnmxip0f4ODstU1MKIBKA`) is in known_hosts.
- Next: the owner installs build 175 and tests (list in the release note).
- All six sessions DONE (work items, owner additions of 2026-10-28: auto-accept switches, multi-payer bills, delete completed events / event delete keeps bills, plus a test + cleanup round). Rules: `rules/decisions.md` → "Shared bills, events, settings (0.4.1-2)".
- **Full run (Lead, 2026-10-28):** flutter analyze clean · flutter test **437 passed** · go vet clean · go test ./... **349 passed, 0 fail, 0 skip** on a fresh `chubi_test_0412` (every `migrations/*.up.sql`, head **113**).
- Migrations 092–095, 100–105, 110–113 are breaking for old app builds (and 094 / 104 wipe retired data): the release needs a forced update (`MIN_APP_BUILD` = the new build).
- Owner order 2026-10-28: commit, push, tag v0.4.1-2, deploy BE to the VPS, APK to Firebase testers (Lead runs release.sh; all dev sessions closed). MIN = LATEST = 175 (forced update).
- 0.4.1-1 is done and committed locally (be `15f028a`, app `b049fd3`), NOT pushed / tagged / released; it ships with 0.4.1-2.
- Plan, owner answers, briefs: `now/briefs/0.4.1-2-plan.md`. Settings page mock (approved): https://claude.ai/artifact/VNo1XWdR82uCkFBwJkuxi7
- Team: Lead = "lead 0.4.1-2" · BE-1 = chubi-pocket-d9 (shared bills) · BE-2 = chubi-pocket-75 (events) · BE-3 = chubi-pocket-28 ("หนี้" kind + settings + switches) · App-1 = chubi-pocket-e5 (bill form) · App-2 = chubi-pocket-9b (events app + notifications) · App-3 = chubi-pocket-9d (settings page + "หนี้" kind app). Migrations: BE-1 092–099, BE-2 100–109, BE-3 110–119.

## Earlier next steps (kept for history)
1. Install build 172 from Firebase (firsttester) and try it against prod: the test list in `team/releases/0.4.1-0.md`.
2. **0.4.1-1 "linked = synced" — DONE + committed locally 2026-10-27, not tagged / pushed / built** (be `15f028a`, app `b049fd3`; full run: flutter analyze clean, flutter test 385 pass; go vet clean, go test 25 packages ok, 0 skip, on a fresh `chubi_test_0411` at 091). Next on the owner's order: local build, then the release flow (version bump, tags, deploy). Plan + briefs: `now/briefs/0.4.1-1-plan.md` (wins over the concept `now/briefs/0.4.1-1-concept.md`). Scope: base (0 amounts written by the system only, one call = one DB tx + effects), person book (repayment rows, 4 debt categories), recurring (slot reads its tx, 3-overdue limit, installments shift, auto-create never fails), event bugs + one "book bill" call. Shared bills (split + event copies, auto-sync switches, `private_note`), the events revamp and the "หนี้" recurring kind → 0.4.1-2.

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
- 0.4.1-1 (2026-10-27): Lead = chubi-pocket-b9 · BE-1 = chubi-pocket-b3 (base + person book) · BE-2 = chubi-pocket-21 (recurring + events BE) · App-1 = chubi-pocket-ca (debts + quick create + bill sheet) · App-2 = chubi-pocket-9c (recurring + shared pieces). Lead commits; devs don't.
- Questions for the owner go to Lead. Reports → `team/inbox/<role>.md` + a one-line ping to Lead.
- Shared files, tell the others before editing: app_th/en.arb (append keys, then gen-l10n), hub_registry.dart, ui.dart, app_router.dart, BE internal/apidoc/openapi.yaml, cmd/api/main.go.
- Rules: `rules/decisions.md` · not started / discussed: `now/backlog.md` · history: `archive/` (see archive/README.md).
