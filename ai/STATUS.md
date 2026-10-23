# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-24 by Lead (chubi-pocket-99), joint commit of the one-session-per-page round._

## Where we are: 0.4.0-3 — BUILT, NOT RELEASED
- Live tag: **v0.4.0-2** (app a77d3ba, build 133 · be feed165 · docs 7d2a9bc). Prod is still off; everything is local.
- ALL 0.4.0-3 work is committed on branch **`wip/0.4.0-3`** in app / be / docs and pushed. It is NOT merged into main, NOT tagged, and the version is still `0.4.0-2+133`.
- Lead full run (2026-10-22): flutter analyze clean · flutter test 1274 pass + 1 red (feature_visuals ratchet), which FE fixed (147/0 on re-run) · go vet clean · go test all packages pass, 0 skip.
- Local BE was rebuilt from the wip tree on 2026-10-24: migration **073**, health 200; backup `chubi-pocket/backups/local-before-rebuild-073-2026-10-24.dump`. Test DB `chubi_test_043` is still at 070 (migrate it before go tests).
- 2026-10-24 joint commit: all sessions' work on wip/0.4.0-3, with NO analyze or tests run since the 2026-10-22 full run (owner's word). Run both before closing the round.
- Mocks (owner-approved): artifact https://claude.ai/artifact/Xi3uisai5ZGpT4jHmfCdsb ("Chubi 0.4.0-3 Mocks"). Local copies for sessions without the Artifact tool: `design/mocks/0.4.0-3/*.dc.html`.

## How 0.4.0-3 was run (owner 2026-10-21)
- Page by page: the owner and Lead settle one page, Lead briefs at once (ai/decisions.md → "Page-by-page rounds").
- Every rule from this round is in ai/decisions.md (search 2026-10-21).

## Done in 0.4.0-3 (details: ai/inbox/fe-a.md "0.4.0-3 …", ai/inbox/be.md "0.4.0-3 …")
- **UI kit:**
  - list hero head in one row + page colour
  - LiveSetting (settings save in view mode)
  - section heads flush right
  - ONE pill tab style app-wide (icons, swipe on bar AND content)
  - HeroChipRow: all chips 28
- **Saving goals:** no month stepper; the ring = long-term progress (BE target_* totals, capped per goal).
- **Debt model** (decisions "Debt model"):
  - debts = ledger records; repayments = transactions tied to the PERSON (migration 069)
  - balance = debts ± repayments; "จ่ายแล้ว" = an optional manual label
  - wording (2026-10-23): ลูกหนี้ / เจ้าหนี้, settled = เคลียร์แล้ว, never "ติด" (decisions → Wording)
- **Quick create ผูกกับ** (decisions "Paid by someone else", "My book vs the event book"):
  - tabs [ส่วนตัว | แบ่ง | จ่ายแทน | อีเวนต์]: one shared data set, the active tab is saved
  - paid_by (migration 070) = the expense counts the bill, the wallet moves only my cash part, and the debt is created in the same call
  - event bill: any payer / members; any member can auto-add
  - tx edit uses the same form everywhere, with a preview + one confirm
  - a linked tx ↔ event bill never auto-changes: every edit asks; resolve later works
- **Debt quick create** (2026-10-23 rework): chips [จดหนี้ | จ่ายหนี้] + cards [กับใคร] ⇄ [ฉัน]; read-only "ที่มา" description; one summary line outside the card; "บันทึกเป็นรายการด้วย".
- **2026-10-23/24 round (one session per page):** contact detail (business-card hero, link row), profile hero, wallet edit, top-bar avatar, kit hero alignment, pointer bubbles; events book (BE 072 paybacks + /settle, 073 my-books unlink/relink) and the event "เพิ่มบิล" capsule; due dates (071); recurring and debt pages. Details in ai/inbox/*.md.
- **Debt pages** (mocks row 2):
  - list: hero with facts + chips, one list with the last activity
  - person page: hero, [จ่ายคืน / รับคืน] + [สรุปยอด / ทวง] sheet, day-grouped list, earlier-cycle divider
  - entry detail: tx-hero layout, cards กับใคร / มาจาก, no wallet on a debt
  - entry edit page
  - bugs B1–B3 fixed
- **Create capsule:** colour per mode + icon + word inside; + in list heads; empty-state CTA.
- **Seed data:** user ppond has 4 test people (ลี / มิ้นท์ / บอส / แบงค์ ทดสอบ); see ai/inbox/qa.md.

## Next (owner decides)
1. Owner tries the build on the web (`./run-web.sh local`, BE at :8080).
2. Not discussed yet, in the 0.4.0-3 scope: the **event pages**, and **income + ผูกกับ tabs** (option A: [ส่วนตัว | แบ่ง | อีเวนต์] / B: keep as is). Both are in backlog.md.
3. Close the round on the owner's word:
   - merge wip/0.4.0-3 → main in all repos
   - bump the app to `0.4.0-3+N` (N = the app commit count incl. the bump)
   - tag `v0.4.0-3` in app / be / docs, push
   - a short release note in ai/releases/0.4.0-3.md

## New machine checklist (owner moving machines, 2026-10-22)
- Clone / pull app, be, docs, then `git switch wip/0.4.0-3` in each.
- Flutter via fvm 3.47.3 (`.fvm/flutter_sdk`); the PATH flutter fails pub resolution.
- Docker Desktop, then `chubi-pocket-be/scripts/local-deploy.sh` (migrates to 070). The local DB data does NOT move with git: either start empty, or copy `chubi-pocket/backups/` (secrets + dumps, never committed) and restore.
- A test DB at 070 for go tests: create `chubi_test_043` (or any name) and migrate; TEST_DATABASE_URL as in ai/inbox/be.md.
- Role skills: `ai/skills/chubi-*` junctioned into `.claude/skills`.

## App map
`ai/app-map.md` lists every route, page, sheet and picker, with its owner. Use it as the checklist for any "scan the whole app" job, and add a row with any new screen.

## Team (session names change on restart; check ListAgents + roll call)
- **2026-10-23, owner: ONE session per page.** Lead supports: test data, coordination, BE rebuilds on the owner's word, plus quick create.
  - Lead = chubi-pocket-99 (was c5): quick create (debt_entry_form, quick_create_sheet); the debt wording rollout (decisions → Wording); test data for ppond (ai/inbox/qa.md).
  - นายE = chubi-pocket-3d (was 65): debt entry detail + debts list; the due-date feature end to end (BE migration 071, personal_debts, openapi).
  - chubi-pocket-4c (was 01): recurring pages.
  - chubi-pocket-dc (was ad): events LIST page + the BE projects list summary (ai/inbox/fe-events.md).
- Shared files, so tell the others before editing: app_th/en.arb (add keys, then gen-l10n), hub_registry.dart, ui.dart, transaction_hero_card.dart, flow_cards.dart, hero_colors.dart, app_router.dart, BE internal/apidoc/openapi.yaml.
- 2026-10-24: sessions still open are chubi-pocket-7d and event (ad); 28, 4c and 41 have closed. Migration 073 changes the personal_debts table (`unlinked_project_transaction_id`); tell the next debt-page session.
- Earlier (2026-10-22): Lead = chubi-pocket-48 · FE = chubi-pocket-55 · BE = chubi-pocket-39.
- Reports → ai/inbox/<role>.md + ONE-line ping; devs may talk directly. Lead runs the full suite once at the end.
- Rules: ai/decisions.md · not started / discussed: ai/backlog.md · old log: CURRENT-WORK.md (frozen 2026-10-11).
