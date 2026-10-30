# split_transactions — one bill model for split bills AND events (plan, NOT started)

Owner 2026-10-28: a split bill is NOT an event. Today every split bill creates a hidden one-bill event (`projects.kind = 'split'`), and it leaks into the UI (fixes item 32). Decision: one bill table for every shared bill; an event is just a group of bills (`event_id`); a bill's people link to the event's members (`event_member_id`). Events move onto it too ("ให้ project มาใช้อันใหม่นี้เลย"). Prod data is REAL: every row converts, nothing is lost. Lead: the 0.4.1-2 Lead session. No code until the owner says go; coordinate the timing with the 0.4.2 Lead (b5).

## 1. Target schema

### `split_transactions` — one row per bill
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | **reuses the old `project_transactions.id`** of the bill (parent row), so notification payloads, links and app caches keep working |
| `event_id` | UUID NULL, FK `projects.id` ON DELETE SET NULL | NULL = a plain split bill; set = the bill is in that event |
| `type` | text CHECK `expense` \| `income` \| `payback` | `payback` = a debt-type bill (event) / a "คืนแล้ว" row |
| `payback_kind` | text NULL CHECK `payback` \| `loan` | only on `payback` |
| `amount` | numeric(15,2) CHECK ≥ 0 | |
| `currency` | varchar(3) | |
| `date` | date | |
| `description`, `note` | text NULL | shared by every member |
| `origin_transaction_id` | UUID NULL, FK `transactions.id` ON DELETE SET NULL | the tx the bill was made from (old `linked_transaction_id`); `unlinked_origin_transaction_id` keeps old `unlinked_transaction_id` |
| `paid_back_for_id` | UUID NULL, FK `split_transactions.id` ON DELETE SET NULL | a "คืนแล้ว" payback made for that bill (old 091) |
| `record_user_id` | UUID FK users | who recorded it |
| audit | `created_at/by`, `updated_at/by` | `updated_at` = the edit-conflict check (409) |

### `split_transaction_people` — one row per person in a bill
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `split_transaction_id` | UUID FK CASCADE | |
| `user_id` | UUID NULL FK users | a connected user (gets a copy); NULL = name only |
| `event_member_id` | UUID NULL FK `project_members.id` | set on every person of an event bill (the event's member); NULL on a plain split bill |
| `name` | varchar(100) | display name (kept in sync with the member for event bills) |
| `share` | numeric(15,2) ≥ 0 | what this person's part is ("คนหาร") |
| `paid` | numeric(15,2) ≥ 0 | what this person paid ("คนจ่าย"); multi-payer = several rows with `paid > 0` |
| `paid_back` | bool DEFAULT false | "คืนแล้ว" tick (the payback bill keeps the money side) |
| `marked_at` | timestamptz NULL | "เคลียร์แล้ว" on the event board (old `marks[]`) |
| `disconnected_at` | timestamptz NULL | this person disconnected their copy (old `shared_bill_opt_outs`) |
| `sort` | int | row order in the form |

Rules: Σ `share` = `amount`; Σ `paid` = `amount`; UNIQUE (`split_transaction_id`, `user_id`) WHERE user_id NOT NULL; UNIQUE (`split_transaction_id`, `event_member_id`) WHERE NOT NULL. A completed event locks its bills (trigger on both tables, as 101 / 105 do today).

### Tags — three layers, all kept (owner 2026-10-28, after discussion)
1. **Event tags on a bill** (shared by the event's members, for the event report by tag): `event_tags` unchanged (it lives only in an event); the bill link is `event_bill_tags` (`split_transaction_id`, `event_tag_id`) = today's `project_transaction_tags` re-pointed — same ids, no data copied. Only bills with `event_id`.
2. **My tags on an event** (`project_my_tags`, private): unchanged.
3. **My tags on my copy** (personal `transaction_tags`, private, like `private_note`): unchanged.

### Changes to existing tables
- `transactions`: + `split_transaction_id` (FK SET NULL) + `split_person_id` (FK SET NULL) = "this row is that person's part of that bill" (the origin and every copy). Later dropped: `project_id`, `source_project_transaction_id`, `unlinked_project_transaction_id` (+ their CHECK / indexes); `unlinked_split_transaction_id` replaces the last one.
- `personal_debt_bills`: `pt_id` → `split_transaction_id`, `member_id` → `split_person_id` (the other person of the pair). Lumps keep working.
- `personal_debts`: later dropped: `source_project_transaction_id`, `project_id`, `unlinked_project_transaction_id`, and the retired `counterpart_debt_id` / `source_kind partner`.
- `projects`: drop `kind` (no hidden events). `project_members`, `event_tags`, `project_my_tags`, `event_settle_bookings`: unchanged.
- View `bill_pairs` (replaces `project_bill_pairs`): member m owes payer p = share_m × paid_p / amount (2 dp); income flipped; payback = receiver owes giver; read straight from `split_transaction_people`.

### Retired after the move
`project_transactions`, `project_transaction_payers`, `shared_bill_opt_outs`, `project_transaction_tags` (renamed to `event_bill_tags`), `projects.kind`. Dropped one release AFTER the move (keep for rollback reading), then removed.

## 2. Data move (one migration, one DB transaction; prod snapshot rehearsal first)
1. Create the new tables / columns.
2. **Bills:** every `project_transactions` parent → `split_transactions` (same id). `event_id` = `project_id` when that project is `kind = 'event'`, else NULL. `origin_transaction_id` = `linked_transaction_id`, etc.
3. **People:** per bill, one person per involved member:
   - share: each child row's `amount` for its member; the main payer's share = amount − Σ children;
   - paid: `project_transaction_payers.amount` when the bill has payers, else the whole amount on `transaction_member_id`;
   - `user_id` / `name` from `project_members`; `event_member_id` = the member id on event bills only;
   - `paid_back` from payback rows with `paid_back_for_id`; `disconnected_at` from `shared_bill_opt_outs`; `marked_at` from `marks`.
   A mapping table (old pt_id or child id + member_id → new person id) lives only inside the migration.
4. **transactions:** `split_transaction_id` = the bill of `source_project_transaction_id` (child → its parent) or of `linked_transaction_id` / `unlinked_*`; `split_person_id` = the person of the row's user on that bill.
5. **personal_debt_bills / personal_debts:** re-point via the mapping.
6. **Tags:** `project_transaction_tags` → `event_bill_tags` (same rows; the bill ids are kept). `event_tags`, `project_my_tags`, personal tx tags untouched.
7. **Hidden split projects:** after 2–6, delete `projects` rows with `kind = 'split'` (their members go by cascade; nothing points at them any more).
8. **Proof (must equal before vs after, per user):** wallet balances, month totals, budget used, report "my share" per category, person balances, event settle pairs, number of copies / debts / lumps. A test runs the migration on a restored prod snapshot and compares; the release script's checks run it too.

## 3. Work (rough; one BE + one app pair, or Lead alone)
- **BE (L++):** store / service for bills on the new tables (create / edit / delete / move between event and split = just change `event_id` + people links, no conversion), copies + auto-accept / auto-update, apply / disconnect, settle + claims + lumps + settle booking, complete / delete event (delete = `event_id` NULL, bills stay), reports / budgets share SQL, sync fingerprints, notifications payloads, openapi (`/split-transactions/...`; `/event-bills/...` kept as aliases one release), tests incl. the migration proof.
- **App (L):** models + repository for the new API, bill form, event board / settle / claim sheets, tx detail links, notification routes; remove every `kind == split` special case.
- **Docs:** schema, api-document, spec 10 / 12, decisions.
- Release: forced update (`MIN_APP_BUILD`), backup, the migration proof green before deploy.

## 4. Owner decisions (2026-10-28)
- **Netting within one bill:** when a bill resolves into the person books, each pair nets to ONE debt row (ลี 700 + ปอนด์ 500, 4 × 300 → "ปอนด์ owes ลี 50"), not two opposite rows. Across bills nothing nets (each bill = its own rows; the person balance sums them).
- **Ids:** the bill keeps the old `project_transactions.id` — it is a rename.
- **Two phases:** **A** = keep today's table names, change the structure only: `project_transactions.project_id` NULL-able (NULL = a split bill), ONE new people table replacing child rows + `project_transaction_payers` + `shared_bill_opt_outs` + `marks`, move the hidden split projects' bills to `project_id = NULL` and delete those projects, re-point the tx / debt / lump links from child rows to bill + person. **B** (later) = renames only: `project_transactions` → `split_transactions`, `project_id` → `event_id`, `*_project_transaction_id` columns, the people table, `project_transaction_tags` → `event_bill_tags`.
- **Delete an event:** `project_id` (→ `event_id`) and the people's `event_member_id` are `ON DELETE SET NULL`: the bills stay as split bills.

- **Naming:** a table CREATED in phase A takes its final name at once (owner): `split_transaction_people`. Phase B renames the existing ones, and "project" → "event" everywhere it is left: `projects` → `events`, `project_members` → `event_members`, `project_my_tags` → `event_my_tags`, `project_transactions` → `split_transactions`, `project_transaction_tags` → `event_bill_tags`, `project_id` → `event_id`, `*_project_transaction_id` → `*_split_transaction_id`, index / FK / trigger / view names.

## 5. Open (owner)
- Phase B depth: everything incl. API paths (`/projects` → `/events`, `/event-bills` → `/split-transactions`), notification types (`project_*` → `event_*`, converting `notifications.type` and users' `muted_types`) and code (BE module, app feature folder, routes, arb keys) with a forced update (Lead), or DB + code only.
- Version: its own round (e.g. 0.4.3-0) after b5's 0.4.2 work, or between 0.4.2 steps — agree with b5.
- Before this ships: fix the leak (fixes item 32) so users never see a hidden split event.

## 6. Progress (Lead, branches `feat/split-transactions` in `chubi-pocket-be-split` / `chubi-pocket-app-split`, both from origin/main c1dcba0 / 1760019)
**Piece 1 — migration 124 + proof: written, rehearsed on a prod snapshot, NOT committed.**
- Snapshot: `chubi_pocket-20261030-1130.dump.gz` (prod, 0.4.2-2 backup) restored into the local scratch DB `chubi_snap` (migrations 121–123 applied by hand); the rehearsal runs on `chubi_snap_try` (a template copy). Prod is small: 3 users, 5 events + 1 hidden split project, 22 bills (+47 child rows), 8 bill tags, 4 lump lines, 3 tx / 4 debt links.
- File: `migrations/000124_split_people_phase_a.up.sql` (+ a `.down` that refuses: one-way, restore the backup). Does: `split_transaction_people` (final name, bill FK → `project_transactions` for now); `project_id` + `transaction_member_id` NULL-able; people from child rows / payers / opt-outs / marks / paid-back ticks; `split_transaction_id` / `split_person_id` on `transactions`, `personal_debts`, `personal_debt_bills` (+ `unlinked_split_transaction_id`); children deleted, hidden split projects deleted, all inside one transaction with asserts that abort it.
- **Proof found a real bug on its first run:** the 4 lump lines (`personal_debt_bills`) became 2 because `member_id` → `project_members` is `ON DELETE CASCADE` and deleting the hidden project's members took 2 lines with it. Fixed: `member_id` is now a plain nullable column (FK dropped, `split_person_id` replaces it); the in-migration counts (bills, lump lines, bill tags, tx links, debt links) now run AFTER the deletes. After the fix: 22 bills, 69 people, 4/4 lump lines with a person, hash of event people (bill, member, share, paid) identical before/after, `transactions` and `personal_debts` amounts hash identical, tags 8/8, children 0, projects 6 → 5.
- Not in piece 1 (next pieces): the completed-event lock trigger on the people table, `bill_pairs` view, every Go query (old code reads child rows and will not work on a migrated DB — so no full suite on this branch until pieces 2–5 are done), the app.
- Decisions (owner 2026-10-31): link table `event_transaction_tags`; plain split bills have no shared tags; phase B skipped for now; **phase A ships in 0.4.2-3**. Migration numbers: main took 124 (`idempotency_keys`), so this branch renumbers 124 / 125 / contract to follow main's last number on rebase.

### 6.1 Approach change (2026-10-30): expand / contract, so every step stays green
Reading the code showed phase A touches ~35 write sites and child rows in 27 Go files (13 test files). A one-shot rewrite is blind, so the migration is split in two and the code moves in between:
- **124 EXPAND (written, rehearsed):** adds `split_transaction_people`, the links on `transactions` / `personal_debts` / `personal_debt_bills`, `project_id` / `transaction_member_id` NULL-able, and **triggers + `sync_split_people(bill)`** that keep the people rows equal to the old child rows / payers / opt-outs / marks / paid-back ticks while the code still writes the old tables. It deletes nothing. Rehearsed on the prod snapshot: 22 bills / 69 people, hash identical to the child-row formula; 4/4 lump lines linked; the in-migration asserts pass. The full BE suite on a DB built with 124: only the projects package was affected (4 tests) — two real bugs of the sync function found and fixed (unique-index clash when a bill's member is swapped for another of the same user: delete stale people BEFORE the upsert); projects package green.
- **Then, in order, readers switch to the people table** (each step keeps the suite green): the bill pairs view → `bill_pairs` over people; `views.go` / `numbers.go` / `claim.go` / `settle*.go`; copies / `shared_bill.go` / `personal_copy.go`; budgets + reports (`budgets/count.go`, `shared/share.go`, `shared/members.go`); `transactions/*` and `personal_debts/store.go` links. Then the **writers** (`pt_store.go`, `payers.go`, `bill_move.go`, `bill_delete.go`, `member_assign.go`, `book_bill.go`, …) write people directly.
- **126 CONTRACT (to write last; 125 = the `bill_pairs` view, done):** drop the triggers / sync function, delete the child rows, move the hidden `kind='split'` projects' bills to `project_id = NULL` and delete those projects (the first draft of this step is in git history of the migration; its proof caught that `personal_debt_bills.member_id` cascades — the lump lines went 4 → 2 — fixed by dropping that FK), drop the old pointers one release later. Same release as 124.
- Dev scratch DBs on this machine: `chubi_snap` (prod 0.4.2-2 backup + migrations 121–123), `chubi_snap_try` (rehearsal copy), `chubi_split_dev` (full migrations, for `go test`). Not committed: 124 up/down in `chubi-pocket-be-split`.
- **Step done (be-split `feat/split-transactions`):** `4317e4a` migration 124 (expand); next commit: migration 125 `bill_pairs` view over the people table + claim / settle / event list / bill pairs switched to it (snapshot: 47 pairs, same sum, empty diff both ways; projects + budgets + personal_debts + transactions green). Next readers: `views.go` (32 child-row refs), `numbers.go`, `shared_bill.go`, `personal_copy.go`, `member_assign.go`, `my_books.go`, `detach.go`, `event_link.go`, `shared/share.go`, `shared/members.go`, `budgets/count.go`, `transactions/{shared_copy,store,event_link,detail}.go`, `personal_debts/store.go`.

### 6.2 Owner decisions (2026-10-30) — the four open points are CLOSED
1. Bill ↔ event tag link table = `event_bill_tags`.
2. A plain split bill (no event) has no shared tags, only personal tags on each person's tx.
3. Phase B (renames) = its own round **0.4.2-4**, after phase A. (Scope of B — DB + code names only vs API paths + notification types — still to be asked when B starts; Lead default: DB + code first.)
4. **Phase A ships in 0.4.2-3** (with section A merge, B findings, F). So 0.4.2-3 now also carries the data move + forced update; plan the release order accordingly.
- **Step done:** be-split `feat(be): event positions and by-tag totals read the people table` (views.go summary: paid / share / sent / received / income-net and by-tag share). Still to move in `views.go`: the event list's removed-member count (line ~48), the board filter "mine" (`loadBoard`), and `loadBoard`'s child rows + paid-back + payers JSON (it builds the board from bill rows + child rows; downstream `buildRows` uses child ROW IDS — copies of my share point at a child row via `transactions.source_project_transaction_id`; after migration 126 they point at bill + person, so this is where the child-id question is settled: the board's splits will be built from people and carry the person id).
- **Checked (2026-10-30): the app reads a split's `id` only as an opaque identity** (de-duplicating a loaded page, removing a bill with its splits, equality) — `ProjectTransaction.flatten` / `ProjectTxTree` in `features/projects/domain/project.dart`; every action it sends carries the BILL id or a member id, never a split id. So the board keeps its wire shape (`children: []BoardSplit`, one per person with `share > 0` who is not the main payer, `id` = the person id) and the app needs no change for this part. Still unchecked: places where the app may send a split id back (none found in `features/projects`; grep `features/transactions` when the copies are moved).
- **Check before the board step (2026-10-30):** (1) app: no request sends a split id back — notification payloads, claims, lump lines and every `/event-bills/{pt_id}` call carry the BILL id; the app never sends `source_project_transaction_id`. (2) the summary rewrite: no existing test pinned per-member numbers for income / payback / multi-payer, and the prod snapshot has expenses only, so `121d2ef` adds `TestSplitPeopleFollowTheOldRows` — one event with every kind of bill, people rows and event positions vs numbers worked out by hand (net +30 / +80 / −110), plus edits through the old tables; a deliberately wrong number makes it fail. Old vs new position queries also compared on the snapshot: 6 events, 19 members, 0 differing rows.

### 6.3 Reader block — DONE (be-split `feat/split-transactions`, 2026-10-30)
Migration 124 now also carries link triggers (`transactions` / `personal_debts` / `personal_debt_bills` `split_transaction_id` + `split_person_id` follow the old pointers; lump line `split_person_id` is `ON DELETE SET NULL` so the sync can rewrite a person without losing the line). Every READER moved to the people table / new links: bill pairs (`bill_pairs` view, migration 125), event summary + positions + by-tag, event list numbers + removed-member count, the board (splits, payers, marks, paid-back, "mine" filter), personal copies, my_books / detach / event_link, claims, settle booking, paid-back + disconnect checks, change recipients, completion, reports / budgets (`ShareAmountExpr`, budget count), `LoadEventBillPeople`, lump line split amount, tx detail bill id, shared-copy guard. Whole BE suite: 29 packages ok, 0 failed, 0 skipped. New tests: `TestSplitPeopleFollowTheOldRows` (people + positions + board for every kind of bill), `TestSplitLinksFollowTheOldPointers`.
**Left = the WRITERS** (they still write the child rows / payers / opt-outs / marks and the triggers keep the people equal): `pt_store.go` (insert / replace splits / update / toggle mark), `payers.go` (`SetBillPayersTx`), `bill_move.go`, `bill_delete.go`, `member_assign.go`, `member_leave.go`, `book_bill.go` (booking, paybacks, mySplitRow), `shared_bill.go` (opt-out insert / delete), `my_books.go` (relink to my split row), `quick.go`, `claim.go` writes. They switch to writing the people table directly TOGETHER with migration 126 (drop triggers + sync function, delete the child rows, hidden `kind='split'` projects' bills → `project_id = NULL`, delete those projects, `bill_pairs` / board keep working because they read people). Known gaps to settle there: "main payer" of a bill with no event (`transaction_member_id` is NULL then — use the payer person), the legacy `/project-transactions/{id}` split-id endpoints (delete a split = zero a person's share), a copy that points at a split row (re-point to bill + person).
