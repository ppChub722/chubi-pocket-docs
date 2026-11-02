# Paper plan — app round (analysis, 2026-11-02)

_Follows [`paper-plan.md`](paper-plan.md) (BE + DB done on `feat/paper`). Analysis only: nothing is coded until the owner says go. Open questions at the end._

## 1. What breaks (the app calls things the BE no longer has)

| Area | Gone in BE | New in BE |
| --- | --- | --- |
| Event bills (`projects_repository`) | `/event-bills` (create / get / put / delete), `/event-bills/:id/apply`, `/event-bills/:id/disconnect`, `/projects/:id/transactions` (board), `/projects/:id/people`, `/projects/:id/claimable`, `/projects/:id/claim`, `members/:id/assign` | `/projects/:id/bills` (+ `/:bid`, `claim`, `leave`, `move`, `people/:pid` DELETE / PATCH), `members/:id/merge`, `my-defaults`, `settle/book {mode}` |
| Split bills | splits on a transaction (`PUT /transactions/:id/splits`, `splits` / `paid_by` / `link_mode` / `my_share` on create + update) | `/split-bills` (list invited / joined, create, get, put, join, decline, claim, leave, move-to-event, people) |
| Transactions | `/transactions/:id/apply-event`, `also_delete_link`, `also_update_link`, delete `bill_id`, read keys `link_mode`, `paid_by`, `splits`, `can_split`, `can_edit_splits`, `edit_in_bill`, `event_bill.bill_id`… | `split_bill` / `event_bill` = `PaperBookRef {id, type, amount, description, date, my_share, in_sync, event, is_owner}`; `/transactions/:id/paper-sync`, `/unlink-paper` |
| Debts | `bills[].bill_id`, source kinds of the old model | `bills[]` parts with `split_transaction_id`; `origin.kind` paper / cash; `/personal-debts/:id/paper-sync`, `/unlink-paper`; repayment `notify`; `partner_linked` |
| Pending | draft `splits`, `project_id`, `paid_by`, `link_mode`, `bill_people` | `draft.paper {project_id?, split_mode, people[], event_tag_ids, pay}`; `needs_input` `people` |
| Notifications | `split_created`, `split_changed`, `project_added`, `project_tx_*`, `shared_bill_*` | `bill_invite`, `bill_new`, `bill_changed`, `bill_removed`, `bill_owner_changed`, `bill_moved`, `debt_repaid`; deep links `/split-bills/:id`, `/projects/:pid/bills/:bid`; settings `auto_sync_events / debts`, `auto_accept_events / debts`, `auto_accept_repayments`, `on_split_removed` (ask / keep / delete), group enum |
| Effects | `bills` of the old shape | `effects.bills[]` = `PaperView`, `removed_bill_ids` |
| Errors | 40 codes (`SPLITS_*`, `PAID_BY_*`, `LINK_MODE_*` …) in `app_error_text` | `NOTHING_TO_CLAIM`, `ALREADY_CLAIMED`, `NOT_BILL_OWNER`, `NOT_IN_BILL`, `BILL_NOT_FOUND`, `MERGE_TWO_USERS`, `SETTLE_NOTHING`, `NOT_PAPER_BOOK` |
| Hub / tests | `api_spec_ratchet`, `page_flows` (also_delete_link / also_update_link), event bill tests on `/event-bills` | ratchets re-baselined on the new spec |

## 2. Screens

1. **Paper form (new, one form for both kinds)**, replaces the quick-create "ผูกกับ" แบ่ง / จ่ายแทน / อีเวนต์ tabs and `event_bill_sheet`.
   - Paper: type, amount, date, description, shared note, people (me / event member / contact / name), paid + share per person, หารเท่ากัน | กำหนดเอง, event tags (event bills).
   - On create: "ลงสมุดของฉัน" card (pay: debt | wallet, wallet, category, my tags, private note).
   - Save checks Σ paid = Σ share = amount; `409 BILL_CHANGED` swaps in the newer paper.
2. **Paper view (new)**: everyone the same; each person's status (invited / joined / declined / left), "คืนแล้ว" marks with who ticked; my books row (claimed / missing / ไม่ตรง).
   - Actions: claim, อัปเดต, join / decline (an invite), leave (keep / delete my books), owner: remove a person, move to an event / out.
3. **My books on a transaction / debt**: one row "บิลแบ่ง" / "บิลอีเวนต์" (from `PaperBookRef`), "ไม่ตรง [อัปเดต]", unlink. Replaces `LinkViewRows`, `link_section`, `event_pick`; tx edit no longer edits people.
4. **Split bills list (new place, see Q1)**: `GET /split-bills` invited + joined.
5. **Event page**:
   - Board from `/projects/:id/bills` (mine filter, tags, sort); add bill → paper form; claim on a row.
   - Settle: real pairs any time + "ลงหนี้" per member (lump); fewest-transfers after complete.
   - My defaults (category + wallet); members page: merge.
   - `event_claim`, `event_assign`, `claim.dart`, `event_book_body` go.
6. **Debts**:
   - A debt shows its paper parts.
   - A repayment on a partnered debt asks "แจ้ง {name} ไหม" (`notify`).
   - `debt_repaid` tile: info when applied; else "บันทึกรับคืน" (prefilled repayment).
7. **Notifications**:
   - The 7 new tiles + actions (join / decline, claim, อัปเดต, keep / delete).
   - Settings: auto sync, auto accept, auto accept repayments, "ถูกเอาออกจากบิล" ask / keep / delete.
8. **Pending**: the draft form gets the same people card as the paper form (`draft.paper`); "ขาดคน" when nobody is on it.
9. **Budgets**: small. Only claimed bills count now; the event source row stays.

## 3. Code to drop

`LinkMode` / `link_draft`, `splits_section` (rows may move into the paper people card), `event_book_body`, `event_pick`, `event_claim`, `event_assign`, `claim.dart`, the old `EventBill` model, transaction `splits` / `paid_by` parsing, old notice types and their settings rows.

## 4. Proposed order

1. Data layer: models (`Paper`, `PaperPerson`, `PaperBookRef`, `MyPaperBooks`, `PaperRights`), repositories, effects, errors, notification types. Drop the old.
2. Hub first: paper people card, paper form, paper view, my-books row (+ hub covers / demos).
3. Quick create + tx detail + debt detail + pending.
4. Event page (board, settle, defaults, merge).
5. Notifications + settings; debts partner repayment.
6. Ratchets / tests; on-device pass.

## 4b. Split flow: today's app → the mockup (2026-11-02)

Mockup: https://claude.ai/artifact/3fjc8r7c2QghEAGuDuq8TC (A = quick create, B = tx → bill → edit, C = other states).

| Mockup | Today | Change |
| --- | --- | --- |
| A2–A4 quick create แบ่ง | `LinkSection`: a "แบ่ง" switch row + `BillPeopleCard` (hub); shares = what each owes ME; one payer chip; my row's "A" toggle; "คืนแล้ว" per row → `_repayNow` repayments; event row on top | People hold share + paid of the WHOLE bill; หารเท่ากัน / กำหนดเอง segment (today a button); multi-payer in quick create (today only in the bill sheet); "จ่าย / ส่วน" columns in custom; status line for Σ paid and Σ share; "ใช้แอป | จะได้คำเชิญ" under a linked contact; no "คืนแล้ว" on create |
| A2–A3 "ลงสมุดของฉัน" | none in quick create (my row's "คืน X แล้ว" = wallet) | New card: wallet / category / tags; when someone else paid, ลงหนี้ไว้ก่อน / จ่ายจากกระเป๋าแล้ว (`pay`); the result lines (my tx, debts) |
| A save | `bookEventBill(split: true)` → `/event-bills`, or `txCubit.add(splits, link)` + `_repayNow` | ONE `POST /split-bills {paper, my_books}`; rows / debts / balances from `effects`; snackbar "ส่งคำเชิญ n | หนี้ใหม่ n" |
| B1 tx rows | `TransactionTile`: `eventBill.event.isSplit`, `splitCount` glyph, out-of-sync from `eventBill.inSync` | Read `split_bill` (`PaperBookRef`); "ไม่ตรง" chip kept; "จ่ายโดยบี" from the paper; invite banner = new (`GET /split-bills?status=invited`) |
| B2–B3 tx detail | `LinkViewRows` (จ่ายโดย / บิลอีเวนต์ rows → read-only card), `applyEvent`, `disconnectEventBill`, splits editable in the detail (`LinkEditSession`, PUT splits) | One "บิลแบ่ง" card → bill detail; "ไม่ตรง" card with before → after (paper values in `PaperBookRef` vs my tx) + อัปเดต (`paper-sync`); "หนี้จากบิลนี้" list (new); เลิกผูก (`unlink-paper`); the detail no longer edits people; แก้ไข = my fields only |
| B4 bill detail | none: tapping a split tx opens the edit sheet (`openEventBill`, 6 callers) | New read page: amount / note / mode, each person's status chip, paid / share, "คืนแล้ว" tick with who ticked (PATCH), my books card, ย้ายเข้าอีเวนต์, ออกจากบิล |
| B5 edit | `event_bill_sheet` in split mode (`isSplit`): multi-payer, 409 swap, move | Load / save on `/split-bills/:id` with `version`; people by `person_id`; × only for the owner; no my-books card, no event tags. Best: ONE paper form shared by A2 and B5 |
| C1 invite | none | New: join / decline |
| C2 claim | `booksOnly` mode of the bill sheet | New claim sheet (`POST …/claim`) |
| C3 conflict | 409 silently swaps in the newer bill | A dialog with what changed, then the newer bill |
| C4 leave / removed | none | Leave sheet keep / delete; `bill_removed` notice with keep / delete |

Hub first: paper people card (BillPeopleCard + paid column + mode segment), my-books card, paper book card (tx detail), person status chip, out-of-sync card. Drop: `LinkMode` / `link_draft`, `SplitDraft` rows, the split part of `LinkEditSession`, `_repayNow`, `txCreateBody` splits / link, `bookEventBill(split)`, `applyEvent`, `disconnectEventBill`, the `splitCount` glyph.

## 5. Open questions (owner)

1. Where do split bills live as a list (invites waiting, bills I'm on)?
2. Quick create: keep "ผูกกับ" tabs ส่วนตัว | แบ่ง (แบ่ง = paper form inside the sheet), or a separate "บิลแบ่ง" entry?
3. My claimed tx: may I edit amount / date / description (it turns ไม่ตรง), or are they locked ("แก้ที่บิล")?
4. One session or split between sessions (via นายA)?
