# AI-1 inbox (BE + docs, session chubi-pocket-85)

## 2026-10-26 — docs: archive + restructure
DONE · docs `e890033` (archive/), `2af558a` + `1f353ee` (restructure), merged as `31ca96b` · links: a script walks every live .md, 0 broken
- `archive/` keeps finished docs at their old path, with a reason per row in `archive/README.md`.
- The tree is grouped by question: now / rules / modules / ref / build / ops / team. The root README is the one map, with the old → new table at its bottom. `modules/README.md` lists, per module: its spec, the owner rules (search names in rules/decisions.md) and the team inbox.
- Inbox logs, reports and release notes keep their old paths in the text (history). Live docs, skills and memory were updated.
- BE `277f21b`: release.sh writes `team/releases/`; deploy.sh / .env.example / README / IMPLEMENTING.md point at the new paths.

## 2026-10-26 — 0.4.1-0 AI-1: C1, H1, A6, H3, H8, A7, D2
DONE · be `c17a3aa` on wip/0.4.1-0 · go vet clean · go test ./... with TEST_DATABASE_URL (chubi_pocket_test at 080): all ok, 0 skip · AI-3's full run: green
- C1 `POST /recurring/occurrences/bulk` (`recurring/bulk.go`, settleRecurringOccurrences):
  - body `{action confirm|skip|mark_paid, items[{rule_id, slot, amount?}]}`, 1–100 items; amount is confirm-only and must be > 0
  - one DB tx, a savepoint per item
  - `left_out` reasons: needs_amount / refused / not_found / already_recorded
  - `settings` = every rule touched
- H1 paid_by on an income ("รับแทน", migration 080):
  - debt direction paid ("they owe me")
  - an income's wallet effect uses the cash part everywhere (SignedTxSQL, wallet month flow, wallet summary)
  - PAID_BY_EXPENSE_ONLY is now only for transfers
- A6 `GET /api/v1/health`: before the build check. App: page_flows `getHealth`, baseline line dropped.
- H3 counterparty_key also lists split bills, paid_by bills and debt-linked tx.
- H8 share text: "{name} เป็นลูกหนี้ / เป็นเจ้าหนี้".
- A7 recurring `itemRow.RuleID` is a plain uuid (NOT NULL since 068): nil branches gone, stale comments fixed.
- D2 `projects/my_books_test.go`:
  - unlink / relink tx, debt, repay
  - bill origin round-trip
  - a viewer's copy back to their split
  - nothing remembered → []
  - same kind in link + unlink
  - split row / other event → 404
- Tests added: TestSettleOccurrences, TestPaidByIncome, TestSetMyBooks; TestTransactionFilters extended.

## 2026-10-26 15:36 — 0.4.1-0 prod deploy + app gate (owner's go)
DONE · prod BE image `a24bc82` (from `c17a3aa`), built on the dev PC, `docker save | ssh ppforge docker load` · backup `chubi_pocket-20261026-1532.dump.gz` · migrations 079 + 080 · /health + /api/v1/health 200 · logs clean
- Gate: `.env` backed up (`.env.bak-20261026-1536-before-gate-170`); MIN = LATEST = 170; messages say 0.4.1-0; app force-recreated; /app/version = 170 / 170; build 165 / 169 → 426, 170 → passes.
- Found: `--split-per-abi` makes real phones send 2170 / 2167, so the gate forces nobody (now/backlog.md, top item).
- Found: deploy.sh still builds on the VPS and defaults to the old box; the ppForge steps are in ops/ops-runbook.md.

## 2026-10-26 — I docs (0.4.1-0)
DONE · now/STATUS.md rewritten · rules/decisions.md (0.4.0-4 saving kind, paid = linked or marked, 0.4.1-0 owner answers, the stale "no ออม type" and "future tx proposed" lines fixed, H8 done) · team/releases/0.4.0-4.md (after the fact) · ref/schema.md + ref/api-document.md (071–080, bulk, รับแทน, health, wording) · modules/04, 12, 13

## 2026-10-26 16:19 — gate fix + deploy.sh on ppForge (owner's go)
DONE · be `21fe2b2` on wip/0.4.1-0 (after the v0.4.1-0 tag) · appversion tests ok (165 / 2167 / 1169 → 426; 170 / 2170 / 1170 / 4171 → pass) · prod: deployed with the new deploy.sh (backup chubi_pocket-20261026-1555.dump.gz, no new migrations, healthy)
- `appversion.PubspecBuild`: a build ≥ 1000 counts as build % 1000 (the split-per-ABI versionCode). The app side (send the pubspec build, `hasUpdateFor`) is AI-4's `2848aeb`.
- deploy.sh builds on the dev PC and docker-loads onto ppForge (checks /health + /api/v1/health; keeps prev); deploy.sh and release.sh default to 143.14.147.249.
- Gate: `.env.bak-20261026-1619-before-gate-172`, MIN = LATEST = 172 (APK 172 on Firebase): 170 / 2170 → 426, 172 / 2172 → pass.
