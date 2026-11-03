# Paper plan — split bills and event bills as one shared paper

_Owner talk 2026-11-02 (session chubi-pocket-34). Flow charts: https://claude.ai/artifact/WEaHcLtacGYdeekiajXvSz. This brief wins over the artifact where they differ._

Scope of round 1: **DB + BE only** (app after the owner reviews the BE). The VPS data is disposable: when this lands, all migrations are squashed into one baseline, the VPS DB is wiped, and it ships as the PRD version.

## 1. Model

- **Paper** = one row of `project_transactions`. It holds only: type, amount, date, description, note, who paid what, who owes what, the paid-back marks. No category, no wallet. `project_id` NULL = a **split bill**; set = an **event bill**. Same table, same core, two API contracts.
- **People** on a paper = rows of `split_transaction_people` (name, optional user, share, paid, paid-back mark). On an event bill each person also points at an event member (`project_member_id`).
- **Books** = each user's own `transactions` row and `personal_debts` rows, made by **claim**. Sync is one way, paper → books. Editing my books never touches the paper.
- **Owner** of a paper = `owner_user_id` (the first recorder). Ownership moves when the owner leaves.
- A **payback** paper (events only) is "A pays B back": A paid = amount, B share = amount. `bill_pairs` treats it like any bill (B owes A), so the summary nets it out.

## 2. Rules (owner decisions)

### Paper
1. Everyone who joined sees the same paper and may edit every field, including adding people. Only the owner removes people.
2. Save needs Σ paid = amount and Σ share = amount (2 dp).
3. `split_mode` = `equal` | `custom`. Equal re-splits on add / remove / merge; the cent left over goes to the owner's row.
4. Concurrent edits: the PUT sends `version`; a stale one gets `409 BILL_CHANGED`.
5. "คืนแล้ว" (`paid_back`) is a shared mark only: anyone may tick it, the paper shows who ticked; it writes no repayment and is never set by the debts.

### Invites and access (split bills)
6. On save, every person who is a contact linked to a user (and not yet invited) gets an invite. A contact linked later gets nothing until the owner removes and re-adds them.
7. A person must accept (or auto-accept) before they see the paper (`status`: `invited` → `joined`; `declined`; `left`). Declined / left people stay on the paper as a name; the owner still uses them as before; nothing touches their books.

### Claim and books
8. Claim makes my books from the paper: a transaction (always) and debts (split bills only). Re-claim makes only the pieces that are missing (unlink one piece, claim again → only that piece).
9. Money of my transaction:
   - I paid ≥ my share: amount = what I paid, from my wallet, `my_share` = my share; the others owe me (split bills: one debt per person, by `bill_pairs`).
   - I paid less than my share: choose **wallet** (I already settled: amount = paid + what I owed, from the wallet) or **debt** (amount = paid from the wallet, or my share with no wallet when I paid nothing; debts "I owe X" by `bill_pairs`, proportional to what each payer paid).
   - Event bills: no debt per bill (see §4). Paid nothing → a "จ่ายโดย X" transaction with no wallet.
10. **Auto claim** always takes the debt branch. Category: split bill → none (picked later in the form); event bill → my event defaults (`project_my_defaults`).
11. Category, wallet, tags, private note are mine and never synced. Synced fields: amount, `my_share`, date, description. `in_sync` is computed on read (books vs. what the paper says now).
12. Auto sync on (`auto_sync_debts` for split bills, `auto_sync_events` for event bills) → a paper edit rewrites my synced fields. Off → a notice, and my book shows "ไม่ตรง [อัปเดต]". Editing my book also makes it "ไม่ตรง"; "อัปเดต" copies the paper over it.
13. Unlink a transaction or a debt on its own; it becomes a plain record.

### Leaving
14. The owner removes a person: their row goes (equal → re-split; custom → the share moves to the owner's row); they no longer see the paper; their books are unlinked at once, then `on_split_removed` decides: `ask` (a notice: keep / delete) | `keep` | `delete`.
15. Anyone leaves (same keep / delete question). Their row stays as a name. The owner leaving passes ownership to the user who joined first; the last user leaving deletes the paper.

### Paid back between books (new, debts module)
16. Debts made from the same paper for the same pair are **partners** (`counterpart_debt_id` both ways). When B records a repayment on a partnered debt, B is asked "แจ้ง A ไหม"; yes → A gets a `debt_repaid` notice: accept (A picks the wallet; writes A's repayment) / ignore and handle it by hand / auto-accept (`auto_accept_repayments`, to the debt's own wallet or A's default wallet).

## 3. Events

17. Event bills follow every paper rule. Differences: rights come from event membership (no per-bill invite); people map to members; event tags.
18. Adding a person to an event bill, or moving a paper in, matches people to members automatically:
    - same user → same member; my contact ↔ a member bound to that contact → same member;
    - name-only ↔ name-only with the exact same text (trim, Unicode NFC, case-sensitive) → same member;
    - anything else → a new member (a linked user gets the usual event invite).
19. **Merge members** (event members page, any member who is a user, confirm, no undo): name → name / contact / user; never two different users. The survivor is the better identified one (user > contact > name). On a bill holding both: share + share, paid + paid; an `equal` bill re-splits instead.
20. **Move** (paper owner only; not for a completed event): split → event, event → split (`move-out`), event X → Y directly. Nobody's books change. Debts claimed while it was a split bill stay linked.
21. **Settle as a lump** (agreed in 0.4.1-2): the summary nets every paper of the event by real pairs; "ลงหนี้" books ONE debt per person, linked to its bills (`personal_debt_bills`), any time, before or after completion. A lump counts only bills that are in no debt yet (a split-era per-bill debt is a lump of one bill). The lump syncs like any book.
22. "จ่ายน้อยครั้งสุด" only after completion, booked once per member (`event_settle_bookings`); booked simplified → real pairs locked; real pairs first → simplified subtracts them.
23. **Complete** (event owner, confirm, for good): no bill create / edit / delete / move, no member add / remove / merge, no event field edits. Still allowed: claim (a one-time copy, no sync), lump, my tags on the event, archive / restore, leave, unlink. Every book stops syncing at once.
24. Per event, each member may set default category + wallet (`project_my_defaults`) used by auto claim.

## 4. API (two contracts, one core)

`paper` service = the core (write paper, claim, sync, unlink, mark, remove, leave, transfer). Handlers check rights and call it. No `split: true` flag, no `move` hidden in a PUT, no fake event for a split bill.

| Split bills | Event bills |
| --- | --- |
| `POST /split-bills` (paper + my_books) | `POST /projects/:id/bills` |
| `GET /split-bills` (mine: joined / invited) | `GET /projects/:id/bills` (board) |
| `GET /split-bills/:id` | `GET /projects/:id/bills/:bid` |
| `PUT /split-bills/:id` (version) | `PUT /projects/:id/bills/:bid` |
| `POST /split-bills/:id/join` · `/decline` | — (event invite) |
| `POST /split-bills/:id/claim` | `POST /projects/:id/bills/:bid/claim` |
| `POST /split-bills/:id/leave` | `POST /projects/:id/bills/:bid/leave` |
| `DELETE /split-bills/:id/people/:pid` (owner) | `DELETE /projects/:id/bills/:bid/people/:pid` |
| `PATCH /split-bills/:id/people/:pid` (paid_back) | `PATCH /projects/:id/bills/:bid/people/:pid` |
| `POST /split-bills/:id/move-to-event` {project_id} | `POST /projects/:id/bills/:bid/move` {project_id \| null} |

Events also: `POST /projects/:id/members/:mid/merge` {into}, `PUT /projects/:id/my-defaults`, `GET /projects/:id/settle`, `POST /projects/:id/settle/book` (lump or simplified), the existing member / tag / complete / archive routes.

Books: a transaction answers `split_bill: {id, in_sync, ...}` or `event_bill: {id, project, in_sync, ...}` (never both); `project` on a transaction is a real event only. `POST /transactions/:id/paper-sync` ("อัปเดต"), `POST /transactions/:id/unlink-paper`, `POST /personal-debts/:id/paper-sync`, `POST /personal-debts/:id/unlink-paper`.

## 5. DB (new baseline)

Kept as is: events (`projects`), members (`project_members`, now `project_id` NOT NULL), `project_member_contacts`, `event_tags`, `project_transaction_tags`, `project_my_tags`, `event_settle_bookings`, `personal_debt_bills` (trimmed), `idempotency_keys`, notifications, everything outside events.

| Table | Change |
| --- | --- |
| `projects` | drop `kind` |
| `project_members` | drop `split_transaction_id`, `scope_id`, `name_match`; `project_id` NOT NULL |
| `project_transactions` | keep id, project_id (NULL = split bill), type, payback_kind, amount, date, description, note, created/updated; `record_user_id` → `owner_user_id`; add `version`, `split_mode`; drop scope_id, parent_project_transaction_id, transaction_member_id, linked/unlinked_transaction_id, paid_back_for_id, currency |
| `split_transaction_people` | `event_member_id` → `project_member_id`; add status, paid_back_by_user_id, paid_back_at; drop marked_at, disconnected_at (built: no invited_user_id, `user_id` + status is enough) |
| `split_person_contacts` | new: which of MY contacts a paper person is (person_id, user_id, contact_id) |
| `project_my_defaults` | new: (project_id, user_id, category_id, account_id) |
| `transactions` | add `my_share`; drop project_id, source_project_transaction_id, unlinked_project_transaction_id, unlinked_split_transaction_id, paid_by_amount |
| `personal_debts` | keep project_id (= lump of that event); drop source_project_transaction_id, unlinked_project_transaction_id, split_transaction_id, unlinked_split_transaction_id; `counterpart_debt_id` gets written (§2.16) (built: no split_person_id, the parts carry the person) |
| `personal_debt_bills` | (debt_id, split_transaction_id, split_person_id, transaction_id, amount); drop pt_id, member_id |
| `user_notification_settings` | add `on_split_removed`, `auto_accept_repayments` |
| views / functions | `bill_pairs` rewritten on people; completed-event lock kept; drop `scopes`, `event_or_null`, `split_bill_of`, the `links_*` triggers, `project_transaction_payers_locked_check` (built: `sync_split_people_member` kept, it keeps a person's user / name in step with the member) |

Every link from a debt to papers goes through `personal_debt_bills` (a split-bill debt = one row; a lump = many).

## 6. Removed

- `/event-bills/*`, `/transactions/:id/apply-event`, `PUT /transactions/:id/splits`, `splits` / `paid_by` / `link_mode` / `my_share` on transaction create and update, `QuickCreate`, the routes the app never called (`/projects/:id/summary`, `/projects/:id/project-transactions*`, member `request-link`), `/projects/:id/claimable` + `/claim` (folded into settle/book), the board mark.
- Notification types `split_created`, `split_changed`, `split_received`, `project_added`, `shared_bill_*`, `project_tx_*`; added `bill_invite`, `bill_new`, `bill_changed`, `bill_removed`, `bill_owner_changed`, `bill_moved`, `debt_repaid`. The app must also learn `event_deleted` (sent today, unknown to the app).
- Pending drafts lose `splits` / `project_id`; a draft carries a paper instead (`draft.paper`, owner 2026-11-02, see §8).

## 7. Order

1. Baseline migration (one file) from the 130 schema with §5 applied; drop migrations 1–130 from the tree (git keeps them).
2. `paper` core + split-bill API + books (claim / sync / unlink) + leaving.
3. Event bills on the core, matching, merge, move, lump, completion.
4. Debt partners + repayment notice.
5. Transactions / debts / budgets / sync / dashboard / pending / chatbot read paths moved off the dropped columns.
6. Tests: go vet, go test ./... on a fresh DB from the baseline; the API document + schema doc.

Then: report to the owner, app round.

## 8. Round 1 status — BE + DB done (2026-11-02)

Branch `feat/paper` in chubi-pocket-be (13 commits, f971d56 … 94b4e5a). Not pushed, not deployed, the local BE not restarted.

- **DB:** one file `migrations/000001_baseline.up.sql` (+ down). A fresh DB from it = 43 tables. Schema record: [`../../ref/schema.md`](../../ref/schema.md) §10 "Paper baseline".
- **API:** `internal/apidoc/openapi.yaml` updated (19 retired ops gone, 21 new ops, schemas follow the Go types); map in [`../../ref/api-document.md`](../../ref/api-document.md) §10.
- **Tests:** `go vet ./...` clean; `go test ./...` on a fresh baseline DB (`chubi_paper_test`): 31 packages ok, 0 fail, 0 skipped (the DB tests ran). New paper suite: split bill life, wallet claim → debt_repaid, remove + leave + last-leaver delete, decline + mark, event bills + lump + complete lock, move in / out with member matching, merge, repayment notice + disconnect, completed-event claim + simplified settle.

Built differently from §1–6, or decided while building:
1. JSON key of the paper id on debts / notices = `split_transaction_id` (owner 2026-11-02).
2. `personal_debt_bills.split_person_id` is NULLABLE: when a person is taken off a paper, the other users' parts with them stay (out of sync) until "อัปเดต" drops them; a debt left with no part is then deleted (its amount would be 0).
3. B claims a split bill with `pay: wallet` → every payer who already holds "B owes me" gets `debt_repaid` (the owner's "B กดจ่ายแล้ว → แจ้ง A"). The same notice comes from a repayment saved with `notify: true`. Auto-accepted = a repayment in A's main wallet (`default_account_id`), ledger-only when there is none or it can't take it.
4. Notices that still ask: `bill_invite`; `bill_new` / `bill_changed` / `bill_removed` with `applied` false; `debt_repaid` with no `repayment_id` (inbox + dashboard).
5. Budgets / reports count my books only (`COALESCE(my_share, amount)`). Tags (owner 2026-11-02): a budget sees my tags on the transaction + my tags of the bill's event (as before); event tags are for the event page's reports only and never count (94b4e5a, 2nd commit after it).
6b. Event bills (owner 2026-11-03, be c984f7b): `my_books.book_debts` books my debts of that bill now (a lump of one bill; the settle lump skips booked pairs); `skip_my_books` makes the paper only. An event claim with `pay: wallet` takes the wallet (was: never).
6a. `POST /split-bills` takes `new_event {name, icon_code?}` (owner 2026-11-03, be bf14baf): the event and its first bill in one transaction; the bill's people become members. Refused (400) on `/projects/:id/bills`.
6. A pending draft can be a paper (owner 2026-11-02, commit 94b4e5a): `draft.paper {project_id?, split_mode, people[], event_tag_ids, pay}`; confirm = create the paper + my claim from the draft's wallet / category / tags; `needs_input` gains `people` (hard); summary and budgets count my share (all of it while nobody is on it). Paper errors land in `last_error` (VALIDATION_ERROR, EVENT_COMPLETED, MEMBER_NOT_IN_PROJECT, FORBIDDEN_ROLE now allowed there). An old draft's `splits` / `project_id` are ignored.
7. Removed while building because nothing used them: 40 error codes (SPLITS_*, PAID_BY_*, LINK_MODE_*, PT_IS_CHILD, …, ENTRY_MANAGED_BY_SOURCE), `also_delete_link` / `also_update_link` / delete `bill_id` on transactions, the notification `Auto` switch map. New codes: NOTHING_TO_CLAIM, ALREADY_CLAIMED, NOT_BILL_OWNER, MERGE_TWO_USERS, SETTLE_NOTHING, NOT_PAPER_BOOK.
8. Bugs found and fixed on the way: event board list 500 (an unused SQL parameter), effects of a claim missing rows not yet committed, `my_share` null on plain rows, dashboard attention list on the old notice names, add-member bad request 500.

Owner review 2026-11-02: 1–2 no change asked; 3 drafts → papers and 4 event tags out of budgets done (94b4e5a); 5 removals kept; 6 `bill_*` names OK.

Next: app round (forms, my books, notices) → VPS wipe + baseline + deploy as PRD.
