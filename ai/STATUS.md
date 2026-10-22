# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-22 by Lead (chubi-pocket-48), before the owner's machine move._

## Where we are: 0.4.0-3 — BUILT, NOT RELEASED
- Live tag: **v0.4.0-2** (app a77d3ba, build 133 · be feed165 · docs 7d2a9bc). Prod is still off; everything is local.
- ALL 0.4.0-3 work is committed on branch **`wip/0.4.0-3`** in app / be / docs and pushed. It is NOT merged into main, NOT tagged, and the version is still `0.4.0-2+133`.
- Lead full run (2026-10-22): flutter analyze clean · flutter test 1274 pass + 1 red (feature_visuals ratchet), which FE fixed (147/0 on re-run) · go vet clean · go test all packages pass, 0 skip.
- Local BE was rebuilt from the wip tree: migration **070**, health 200. Test DB `chubi_test_043` is at 070.
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
  - wording รอรับ / รอจ่าย only, never "ติด"
- **Quick create ผูกกับ** (decisions "Paid by someone else", "My book vs the event book"):
  - tabs [ส่วนตัว | แบ่ง | จ่ายแทน | อีเวนต์]: one shared data set, the active tab is saved
  - paid_by (migration 070) = the expense counts the bill, the wallet moves only my cash part, and the debt is created in the same call
  - event bill: any payer / members; any member can auto-add
  - tx edit uses the same form everywhere, with a preview + one confirm
  - a linked tx ↔ event bill never auto-changes: every edit asks; resolve later works
- **Debt quick create:** 2 chips + swap arrow. me→them [รอจ่าย | จ่ายคืน], them→me [รอรับ | รับคืน]. Record asks "ทำรายการเงิน (tx) ด้วย"; settle is always a tx; result box from BE preview.
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

## Team (session names reset 2026-10-22; check ListAgents + roll call)
- Lead = chubi-pocket-48 · FE = chubi-pocket-55 (was fe-A 0.4.0-3) · BE = chubi-pocket-39 (was be-A 0.4.0-1).
- Reports → ai/inbox/<role>.md + ONE-line ping; devs may talk directly. Lead runs the full suite once at the end.
- Rules: ai/decisions.md · not started / discussed: ai/backlog.md · old log: CURRENT-WORK.md (frozen 2026-10-11).
