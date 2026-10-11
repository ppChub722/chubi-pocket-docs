# Owner decisions (rules everyone follows)

Add a line whenever the owner decides something. Newest decisions overwrite older ones; edit the line in place rather than duplicating it.

## Process
- The owner talks only to Lead. Lead discusses and sends briefs only on an explicit order ("จัด" / "ทำเลย" / "แก้เลย"). Bugs too: propose, then wait.
- The owner controls pacing: commits, deploys and builds happen only on a go. A go relayed by Lead counts for DevOps.
- Team language is English. Lead ↔ owner is Thai. No AI attribution in commits or PRs.
- Minimal cross-session messages: message a session only when it must act. Reports go to `ai/inbox/`, questions go to Lead.
- Devs may talk to each other directly (owner 2026-10-11): shared files, kit/API needs, blockers, handoffs. DONE pings and owner-level questions still go to Lead.
- Only the owner runs the app (`./run-web.sh`), except QA, which may run it locally (never prod).
- QA runs only on the owner's order; checklists list the changed items only; no screenshots by default; FAILs + a PASS count.
- QA may create any data it needs in the LOCAL DB without asking (owner 2026-10-11). Never prod.
- QA runs NO servers: DevOps brings up the local BE + web (:5181). QA scripts persist in `ai/qa/` and get reused (explore only new pages); screenshots go to `ai/qa/shots/<date>/` (gitignored). (owner 2026-10-11)
- DevOps runs the pre-release checks (analyze/test, vet/test) and one final report.
- Versioning `0.3.1-N`; build = app commit count. `MIN_APP_BUILD` moves only for breaking BE changes.
- Data is disposable (DB wipe OK); migration squash is planned.

## Product
- **Ledger, not sync:** never auto-change another user's book. Notifications are prompts with one-tap actions.
- Notify on debt creation (`split_created`) and split edits (`split_changed` / "อัปเดตตาม"). Nothing on pay/receive.
- **Delete vs archive:** ลบ = hard delete; เก็บถาวร = soft (hidden, not counted, restorable). Categories, tags, transactions and debts are delete-only. Plan: `engineering/v0.3.3-delete-archive-plan.md`.
- Reports, dashboard, budgets and list totals count `my_share`; wallet balances stay cash.
- **Splits:**
  - a "ฉัน" row (create/edit) with an "อัตโนมัติ" chip (default on; typing turns it off)
  - save only when balanced; equal split includes me (remainder on ฉัน)
  - share line "คนอื่นติดคุณ" (expense) / "คุณติดคนอื่น" (income)
  - identity lock only for app-linked contacts
  - split row (2026-10-11): bigger profile icon; tap it → contact picker (no "create from search"; a "สร้างผู้ติดต่อใหม่" button opens contact create); name is a text input for typed names (contact rows read-only, same size); "อัตโนมัติ" = icon only in the ฉัน row's X slot; ฿ stuck to the number
- **Person look (PersonMark):** typed name = 👤, the same colour for all; contact = its icon; linked = its icon + 🔗 inline right after the avatar; names aligned (reserved slot).
- **Pending drafts (2026-10-11):** layout close to quick create; splits AND event in a collapsible section (tap to open / close); event = `draft.project_id`. A draft may hold incomplete splits; confirm needs them balanced.
- **Events:** a separate book; personal entries via resolve (my share). Pulling a tx into an event MOVES its splits to the board; removing moves them back; a tx can be attached / moved / removed later. Wallet-less bills are OK.
- Categories: sub-categories show their own icon; new categories append to the end; max 3 levels.
- Wallet types colour by group: asset (cash / bank / e-wallet) vs liability (credit / pay-later), via tokens. Every member may adjust balance. Members tab only when there's more than 1 member.
- statement/due day 31 = last day of month.
- name / description / note on every record (labels ชื่อ / คำอธิบาย / โน้ต); TextLimits 100 / 200 / 500.

## UI
- Picker selection = highlight, never ✓ (SelectCardGroup too). One picker shell with an optional compact search.
- **Chips:** AppChip with 3 sizes, mini 20 / chip 28 / control 32 (approved 2026-10-11). Mini = tags + the wallet in tx / pending list rows, the pending source chip. Every chip moves to AppChip, no wrappers, old chip widgets deleted (2026-10-11).
  - mini 20 = dense list rows only, display
  - chip 28 = display chips in cards / sections / member rows
  - control 32 = anything tappable + every chip in a hero top row
  - status badges (เร็วๆ นี้ / ยอมรับแล้ว / สำเร็จ) become chips; % and counters stay badges
  - filter "(n)" → count badge
  - no raised / shadow chips
  - quiet labels are outlined (owner re-checks on real screens)
- **Hero spacing:** 16 / 12 / 8, top-row controls 32. Detail pages use sections. The note is always shown ("แตะค้างเพื่อแก้ไข"). Long-press enters edit.
- **Titles never change** (on scroll or in edit mode). A compact hero bar appears once the hero scrolls away (detail pages only).
- ✏️ on a list = enter edit/reorder mode. ⠿ = the drag handle. Archive (amber) + delete (red) buttons in edit mode only.
- **Design system (owner 2026-10-12):**
  - Atomic Design terms, English only in the hub / dev: Tokens · Atoms · Molecules · Organisms · Templates (+ Domain, Debug)
  - the app hub is the single source of truth: every UI change goes to the hub first, the owner reviews, then pages
  - features never build one-off widgets
  - layered: a future core library (ppForge) → the app gate (`ui.dart`) → features
  - app UI strings stay Thai
- **App hub defaults (2026-10-12; the owner said go on Phases 1–4, Lead's recommendations stand unless overridden):**
  - seven typography roles: display / title / section / label / body / caption / money
  - one AppInput, one AppCard
  - Phase 1 moves files without renames; renames happen in Phase 3
  - generic widgets take strings; the app layer supplies the Thai
  - a half-day freeze for the bulk move
  - the hub is reachable in prod via the secret tap
  - PickerTile and WalletSummaryTitle are deleted
- **Terms (owner 2026-10-12):** "หัวข้อ section" = the big green section heading; "หัวข้อ" = a row's field label. A section's description sits right under its heading (attached).
- **Detail-page standard (2026-10-11; gallery approved, pages migrating; tx detail / create are exempt, debt detail is rebuilt in the debts round):**
  - hero: ✏️ top row right (a top row with no chips collapses: the title moves up, ✏️ sits level with it); status = chips in the top row; one hero style (the tx one) for every entity incl. contact + category, border in the entity colour, everything else in rows below
  - kit chips only
  - archive amber + delete red (edit mode)
  - DetailMeta at the bottom of every page
  - note always shown
  - pickers = DetailRow ›; an empty value shows "ไม่ได้เลือก"
  - locked = 🔒 icon
- New or one-off detail patterns go into the gallery "รายละเอียด" (Detail patterns) tab first. Every shared widget goes into ui.dart + `/dev/widgets`.
- Quick create: the title "รายการใหม่" swaps to the amount · category summary once the amount scrolls away (owner 2026-10-11, restores the old behaviour; the one exception to "titles never change"); no navigation after save; the centre + presets the current wallet (debt mode is planned).
- Tx and pending lists share one row: line 1 = icon + title + wallet mini chip, amount right; line 2 = [source] · category · tags. Pending groups by day like the tx list.
- Bulk delete in select toolbars = a red trash icon only, right-aligned (no "ลบ" text buttons).
- Saving: a dim overlay + spinner while a save / delete / reorder call runs. Skeletons only on the first page load.
- Errors: a load failure with no data → full-page error + retry; a failed save / action → stay on the page with a snackbar or banner + retry (never lose edits).
- Top-right shell icons highlight the current page, like the bottom bar tabs.
- Wallet identifiers: plain digits, no formatting; the section says it exists only to match slips.
- Mobile portrait first; tablet deferred.
