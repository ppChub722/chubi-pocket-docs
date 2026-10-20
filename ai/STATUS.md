# STATUS — read this first (rewritten, not appended)

_Last updated: 2026-10-20 (นายA-fe, 0.4.0-2 polish round)._

## 0.4.0-2: UI polish round (committed 2026-10-20, not pushed, not tagged)
The owner sends screenshots and short asks; sessions fix them on `main` of app / be, uncommitted. The version is not bumped yet (`0.4.0-2+127` only when the owner says). Reports: `ai/inbox/fe-a.md` (นายA) and each session's own inbox file. Mock artifacts: budgets / goals / wallets lists + goal detail https://claude.ai/artifact/R7CXzkzoCGj1j31ucaox3j · budget detail ring hero https://claude.ai/artifact/RyV6Pg9fbAmczFnxABErtT · hero color set https://claude.ai/artifact/BFRZPA8kvEzgLJcu3aPBJU.

### Where it stands (2026-10-20, end of day)
- **Code:** everything is coded, plus the A18 cleanup pass. `flutter analyze` (lib + test) and `go build` / `go vet` are clean.
- **Committed** by นายA on the owner's word ("commit ทั้งหมด"): app `c25af30`, be `feed165`, docs (this commit). Not pushed. The version is still `0.4.0-1+126`.
- **Tests:** run on the owner's go ("สั่งให้แก้เทสได้เลย แบ่งๆ กัน"). Each session ran its folders with the fix loop (max 3). Details are in each inbox file.

  | Area | Who | Result |
  |---|---|---|
  | test/ui + test/hub | นายA | green: 347 + 7 failures → fixed in 2 loops; 1 real kit bug fixed (SavingGoalRow badge overflow) |
  | transactions, recurring, pending, notifications, home, pickers | นายB | green: 275 + 18 failures → fixed in 2 loops; 1 real bug fixed (B1 list page showed an empty month on a failed load) |
  | budgets, accounts, test/app, test/shared | นายE | green: 228 + 11 failures → fixed in 2 loops; the shell / recurring files were re-run after B's fix and pass |
  | saving_goals, auth, debts, projects, settings, tags, categories, contacts, archived, app_version, core | นายD | **233 pass / 13 fail, NOT fixed yet.** The owner said "run", not "fix", in that session. 12 are stale saving_goals_pages_test cases (D1–D3 redesign). 1 is core/data/sync_coordinator_test: the sync code is unchanged this round, so it's likely pre-existing or flaky. |
  | Go, all packages (separate test DB = a clone of the dev DB at 068; the DB tests really ran) | นายC | green: 1 stale apidoc fixture fixed |
- **Local BE:** deployed by นายC on the owner's go. The dev DB went 067 → 068 after a pg_dump backup (recurring_items 17 → 1, pending 3 → 1); the smoke check passed (be.md "local deploy 068").
  - Since then นายC fixed one BE gap: future-dated EVENT bills now count as budget expected (รอจ่าย), not used, with a new test; the budgets tests pass. **The local BE needs a restart to pick it up; that waits for the owner's word.**
- **Docs:** updated this round.
  - api-document.md (นายD)
  - spec 03 / 04 / 08 / 09 / 11 / 13 and business-rules
  - schema.md (it was stuck at 051; now covers up to 068) and data-model.md
  - Follow-ups the doc work found are in `backlog.md` ("Found while documenting").
- **Waiting on the owner:**
  1. "fix" in นายD's session, for his 13 failures.
  2. Restarting the local BE (the event-bill fix).
  3. The on-device check against the local BE.
  4. Push, the version bump to 0.4.0-2+127 + tags, and the VPS (migrations 067 + 068 + a redeploy).

### What this round built
- **Coded:**
  - **Hero color set `HeroColors`:** the card hands its colors to everything inside it.
  - **Hero ring kit:** `HeroRing` / `HeroRingRow` / `HeroFactList` / `HeroInfoBox` / `HeroFilterChips`.
  - **Bars and rows:** `ProgressRow.markerBubble` (pace bubble), and `ListPageBody(rowCards:)` (rows in one SectionCard per day group).
  - **Repeat sheet:** a picker for each frequency (weekday / day of month / day + month).
  - **Budget detail:** ring hero, scope AND, a new period card (นายB).
  - **Lists:**
    - budgets list: ring + filter chips + SectionCard rows + pace bubble (นายE)
    - budget items tab and transactions list: day groups in SectionCards (นายE)
    - saving goals list: no sections, new sort "ต้องออมก่อน" (นายD)
  - **Goal detail:** ring hero and entries tab (นายD).
  - **Wallets list hero:** net + split bar + filter chips with icons, no fold (นายA).
  - **Wallet detail redesign:** นายD built the kit pieces (HeroFlowBox, HeroBar.split amounts); นายE built the page (Part 2, report in `inbox/fe-e.md`).
  - **Saving goals with many auto-saves:** app by นายB, BE by นายC.
  - **Plan round (owner "ลุย" on the plan artifact, tasks A / B / C / D / E):**
    - นายA: kit A1–A4 and A7–A10 (module icons, fact icons, HeroSummaryHead, HeroFlowRow, HeroInsetBox, MemberChip, PointerBubbles, OccurrenceChain, AmountLineChart); A14 wallets hero; A17 midnight / new-day sync.
    - นายA: A13 recurring detail (hero next box + chain / line chart + stats + chips, flat tabs, year paging, auto-create switch, R20 question). Its ต้องจัดการ card waits for นายB's occurrence actions.
    - A15 review of B / D / E is done and fixed.
    - Others: progress in `inbox/fe-b.md`, `fe-d.md`, `fe-e.md`, `be.md`.
    - ALL coded (2026-10-20): app A / B / D / E; BE C1–C5, C7, C8 + review fixes; C6 (openapi by นายB, readers tests by นายE, api-document by นายD). Then the A18 cleanup pass. Analyze is clean; go build / vet are clean; NO tests run.
    - LOCAL BE deployed 2026-10-20 by นายC (owner's go):
      - The dev DB went 067 → 068 after a pg_dump backup: recurring_items 17 → 1, pending 3 → 1.
      - The build is the whole uncommitted tree. The smoke check passed (be.md "local deploy 068").
    - For the tests, the open items and the local BE, see "Where it stands" above.
- **Commits:** all sessions share one working tree, so commit only on the owner's word, as one coordinated pass.

## Plan
- **0.4.0 = the UI round** (owner 2026-10-17), tagged 2026-10-17. **0.4.0-1 = everything on `main` since v0.4.0** (owner 2026-10-18), listed below; tagged 2026-10-18. Versions after that get re-planned; the plan still ends at 1.0 (`product/roadmap-1.0.md`).
- The old phase plan (`product/phases.md`, Phase 2 / 3) is cancelled history. No Play Store, no monetization, no web / admin app.
- Currency: one per user, auto-filled, changeable as a relabel, ignored in all calculations (`ai/decisions.md` → Currency).
- **UI library (owner 2026-10-18):** new kit pieces are built hub-first on chubi-pocket-app `main`; packaging into ppForge comes later. `refactor/pp-forge-decouple` and the `pp-forge` repo are NOT merged, so kit work on `main` (AppHeroCard, ControlSizes, HeroMetrics, …) is not in the package yet. `pp-forge` has 9 uncommitted files from 2026-10-17 (owner: leave them).

## Live (prod)
- **0.3.1-10** (2026-10-13): be `f503d9c` · app `4d838f1` (build 58, Firebase 2058) · migration 060 · `LATEST_APP_BUILD=MIN_APP_BUILD=58` · tags v0.3.1-10. Details: `ai/releases/0.3.1-10.md`.
- Prod is the old Happy-Host box and is probably down (2026-10-16). **No new VPS until 0.3.3** (owner 2026-10-16): everything is local only; releases are tags + local builds, no deploys. New server runbook: `engineering/new-vps-runbook.md`.

## 0.4.0-1 (tagged 2026-10-18)
- **Tags `v0.4.0-1`:** be `34692d8` · app `55d67ad` (`version: 0.4.0-1+126`, build 126 = app commit count) · docs (this commit), pushed by the owner. Not deployed, no local build yet. Local DB at migration 065 (066 comes with the BE rebuild).
- Previous tag: `v0.4.0` (be `2d50b22` · app `28ded39` · docs `55d8622`, 2026-10-17).
- **In 0.4.0-1** (everything on main since v0.4.0):
  - goals: archive a goal holding money, goals with no target (migration 065; spec 09 §0.2 / §0.8)
  - money display preferences: sign style (`money_style`) and decimals (`money_decimals`: always / never / auto, default auto), in Settings
  - the owner's on-device review of 0.4.0-1 (visual aid: artifact "Chubi Review 0.4.0-1" https://claude.ai/artifact/VuNNNfQ68gRbSgRuPwDLWE; the rules are in `ai/decisions.md`): dashed = editable, no 🔒, long-press to edit; quick-create modes as tabs; from → to cards for transfer / debt / saving; debt "สร้างรายการด้วย" switch (BE `create_transaction`) and "ปิดหนี้" picker; saving mode in purple with a goal picker; multi-select tx list filters (BE repeatable filters); picker search behind 🔍
  - **one hero card:** every page builds its hero with `AppHeroCard` (header · content · footer; view / edit / create; foldable). HeroCard / HeaderCard / ListSummaryCard / SummaryCta / HeroRow are deleted; TxHeroCard → `TransactionHeroCard`, CompactHeroBar → `AppCompactHeroCard`. Sizes are theme values: `ControlSizes` (mini 20 / chip 28 / control 36), `HeroMetrics` (inset 12 · row gap 12 · control gap 8). Hub: `/dev/organisms/app-hero-card`
  - contact picker rules (`ai/decisions.md` → Contact picker)
  - BE: tags batch save, amount filters on the tx list, embedded tzdata, CORS `X-Timezone`, comment trim
  - **sync & cache** (plan: artifact https://claude.ai/artifact/LvQtDt6PGydRkQiF3iw7QE): BE `POST /sync`, the `X-Sync-Versions` header and sync fingerprints (migration 066); the app keeps shared datasets on the device. The old-backend fallback (`tablesForWrite`) is gone, so **the app needs a BE with `/sync`**. Built on `feat/sync-cache` and merged into `main` of both repos.
- **Tests:** app full suite green (1,099) at app `9a52a8f` before the sync merge; after the merge a full run and its fixes landed in app `ea1c124` and be `34692d8` (the app tag commit `55d67ad` only bumps the version).

## Next (in order)
1. **BE rebuild** on the owner's order only (`docker compose up -d --build` in chubi-pocket-be): migration 066 + `/sync` (required by the app now), debt `create_transaction`, multi-select and amount filters, money preferences.
2. **Owner on-device check** (one pass for the hero work + sync): every list / detail page on AppHeroCard (detail insets are now 12), the "กับใคร" contact picker, the amount underline, the event member strip, the quick-create loading skeleton; plus the 0.4.0-1 review checks (dashed chips, wallet / category cards in edit mode, quick-create tabs, goal picker, debt "ปิดหนี้", tx detail long-press → edit + picker).
3. A local build of 0.4.0-1 on the owner's order.
4. 0.4.0-1 review leftovers: `ai/backlog.md`.
5. Docs debt: `/sync`, `X-Sync-Versions` and migration 066 are not in `design/api/api-document.md` or `design/database/schema.md` yet.

## Waiting on the owner
- The BE rebuild, the on-device check, the local build order.
- The 0.4.0 decisions Lead collected (`ai/inbox/lead.md` "0.4.0 decisions for the owner"): confirm they were reviewed.

## How the team works
- The owner talks ONLY to **Lead**. Team sessions load their role skill (`ai/skills/chubi-*`), read this file, then wait for Lead's brief.
- Reports go to `ai/inbox/<role>.md` with a one-line `DONE … → ai/inbox/<file>.md` ping to Lead. Questions go to Lead directly.
- Rules and owner decisions: `ai/decisions.md`. Discussed but not started: `ai/backlog.md`.
- Releases are tag-based: Lead commits, bumps, tags `v<version>` in be / app / docs and pushes; DevOps runs `chubi-pocket-be/scripts/release.sh <brief-dir>` from the tags (brief template: `ai/templates/release-brief/`). Local env: `scripts/local-deploy.sh --web` (only when the owner orders).
- Never rebuild or restart the BE on your own (chubi-pocket-be `CLAUDE.md`); say it needs one and wait.

## Team in 0.4.0-2 (2026-10-19/20; session names change, check ListAgents)
- **นายA-fe:** kit / hero / hub owner, budget detail hero, recurrence sheet, wallets list hero; splits the work when the owner asks.
- **นายB-fe:** pickers, budget period card, saving goal edit (many auto-saves).
- **นายC-be:** BE, many auto-saves.
- **นายD** (`chubi-pocket-e2`): saving goals list / detail / entries, wallet detail kit pieces.
- **นายE** (`chubi-pocket-ea`): budgets list, budget items tab, transactions list, wallet detail page.
- The owner talks to several sessions directly this round, with no single Lead. Shared notes live HERE (STATUS / decisions / backlog / inbox), not in a session's private memory.

## Team (session names change; check ListAgents)
- Lead · **fe-core** (kit / hub / shell / router / templates, auth, tx / quick create, settings, wallets / categories / tags / contacts) · **fe-debt** · **fe-event** · **fe-budget** · **fe-recurrent** · **fe-saving**. Inboxes: fe-core.md / fe-debts.md / fe-events.md / fe-budget.md / fe-recurrent.md / fe-saving.md. BE / QA / DevOps sessions are started when needed.
- Local env: docker BE `localhost:8080` + DB `:5433` (`chubi_pocket_db`) + web :5181. The QA users are gone; recreate them locally when QA is needed.

## Old log
- 0.4.0 run: `ai/briefs/0.4.0-plan.md`, `ai/inbox/lead.md`, per-team reports in `ai/inbox/`. 0.4.0-1 + machine move: `ai/briefs/0.4.0-1-plan.md`.
- `CURRENT-WORK.md` (docs root) is frozen history up to 2026-10-11. Infra how-to: `engineering/ops-runbook.md`.
