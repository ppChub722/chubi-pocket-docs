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
