
## 2026-10-11 — pending drafts get an event (draft.project_id)
DONE · files: `pending/{model,service,service_test,event_test}.go`, `projects/quick.go`, `cmd/api/main.go` · go vet clean · go test -count=1 ./... all ok (TEST_DATABASE_URL set) · migration: none (draft is JSON) · docs: `design/api/ux-overhaul-contract.md` §14, `design/api/api-document.md` (recent-additions line), `design/spec/10-projects.md` §4.25

**FE contract delta (forward-ready)**
- `draft.project_id`: nullable uuid, same name as on transactions. Returned by `POST` / `PUT` / `GET /pending-transactions` inside `draft`. Omitted from the JSON when empty (like every other draft key), so read it as absent = none. There is no single-draft GET; list returns it.
- Not validated at save: an unknown / closed / foreign event saves fine. `kind: create` only; ignored for `settle_debt` / `update_tx`.
- Confirm (`POST /pending-transactions/submit`) with a `project_id` = the "add a new bill to an event" path (`POST /projects/:id/bills` with `new_transaction`), in the same DB transaction as tags + draft removal. Bill is a normal transaction (balance moves) linked to the event; draft `splits` go onto the board, never into personal debts; members are added as in quick create. Expense / income only.
- Event failures come back as `failed[]` + `last_error` (never a 5xx), nothing is written, draft stays; `PUT` clears `last_error`. New codes: `PROJECT_NOT_FOUND` (gone), `PROJECT_NOT_ACTIVE` (completed), `PROJECT_LOCKED` (cancelled / archived), `PROJECT_NOT_MEMBER`, `PROJECT_READ_ONLY` (viewer), `TX_NOT_BILLABLE` (transfer).
- Split codes on submit (event or not): `INVALID_SPLIT` (blank name / amount ≤ 0), `SPLITS_EXCEED_AMOUNT`, `CONTACT_NOT_FOUND`.
- Compatibility: additive. Safe for the live build (MIN_APP_BUILD=0). `NewService` for pending takes the projects service (wired in main.go).

**Item 4 — incomplete / unbalanced splits (differs from "validates like tx create" today)**
- Save: any splits are accepted (the `required` / `gt=0` binding on `SplitInput` only runs on the HTTP tx body, not on the draft). Unchanged.
- Confirm BEFORE this change: Σ > amount → `SUBMIT_FAILED` with a raw message (non-event path: the debts creator error; event path: board check). A blank `person_name` confirmed successfully (empty-named split created); `owed_amount: 0` failed with a raw DB check-constraint message (`SUBMIT_FAILED`). So it did differ from tx create.
- Now: submit checks split shape first (`INVALID_SPLIT`) and maps Σ > amount to `SPLITS_EXCEED_AMOUNT`. The `SPLITS_EXCEED_SHARE` rule is not part of creating a bill (it's the edit-splits rule), so it isn't applied here.

**Implementation notes**
- `projects.AddBills` split into a tx-taking `addBillsTx`; new `projects.AddNewBillTx(ctx, tx, user, event, CreateRequest)` used by pending submit. `AddBills` behaviour unchanged (full projects tests pass).
- Event checks run in the shared function before any write; membership is checked after the event status (same order as the endpoint, so a non-member of a completed event sees `PROJECT_NOT_ACTIVE`).
- Tests (`pending/event_test.go`, DB; `service_test.go`, unit): save/update/list keep project_id; confirm into an event (balance, link, board rows, no personal debts, draft deleted); no-event confirm unchanged; gone / completed / cancelled / archived / non-member / viewer / transfer → coded failure, no leak; retry after fixing; bad splits.
- `gofmt` on `projects/quick.go` also re-aligned the existing `quickBill` struct (whitespace only).

## 2026-10-12 — split identity unlock (lift SPLIT_IDENTITY_LOCKED for tx split edits)
DONE · evaluation verdict: no blocker · files: `personal_debts/split_edit.go`, `personal_debts/split_edit_test.go`, `transactions/{service,handler}.go` (error var + 422 mapping removed) · go vet clean · go test -count=1 ./... all ok · migration: none · docs: `design/spec/04-transactions.md` §3.4a, `design/api/api-document.md` (recent-additions line), `ai/skills/chubi-be/SKILL.md`

**Evaluation**
- (a) Debts / repayments: the swap uses the same removal the list edit already does (`removeDebtTx`): unpaid row deleted; repaid row stays at amount 0 with its settled amount (shows overpaid, repayment tx untouched) — exactly "remove + re-add" today. The new person is a fresh debt row (new `debt_id`, nothing repaid). No unique index on (source tx, contact) or on contact, so a swap back to a previously removed/zeroed person is fine.
- Event board: the lock only ever existed in the tx split edit (`checkIdentityEditTx`). Board member splits have their own rules and are untouched. A bill inside an event can still have personal splits on my share; the swap works the same there.
- (b) Notifications: old partner — same as removal today: mirror exists → `split_changed` removed (auto-apply if their switch is on); no mirror yet → their pending `split_created` is superseded. New person, if linked to an app user → `split_created` via the normal create path. No-one's book is written (ledger-not-sync holds). Notifications to the old partner are one-shot per swap (verified: exactly one removed).
- Σ validation unchanged (the swap keeps the sent amount; Σ ≤ amount is checked as before).

**Behaviour** (`PUT /v1/transactions/:id/splits`)
- Kept item whose current contact is linked to an app user, and `contact_id` changes (another contact, or `null`) → remove old + add new in the same DB transaction; new amount = the item's `owed_amount`. Name defaults as before (new contact's display_name; kept name when dropping to a free name).
- Rename that keeps the same linked contact → in place, silent, same row (before: 422). This is my reading of "changing the person"; say if you want a rename on a linked split to be a swap too.
- Unlinked / free-name splits: unchanged (in place).

**FE contract delta (forward-ready)**
- `422 SPLIT_IDENTITY_LOCKED` no longer exists. Drop its handling; the picker can change person on any split.
- After a swap of a linked person the item has a **new `debt_id`** and appears after the other rows (created later); the old row, if it had repayments, is still listed at amount 0 under the old person (overpaid), otherwise gone. Re-read splits from the response; don't keep the old `debt_id`.
- Safe for the live build (MIN_APP_BUILD=0): an error code is no longer returned; no field added or removed.

**Tests** (`TestEditSplitsIdentity`, `TestEditSplitsIdentityUnlinkedContact`): linked rename in place + silent; same identity sent back = no change; linked Partner → free name (old row gone, new row 100, Partner hears one split_changed removed); repaid linked Bee → Partner's contact (old row 0 with 50 repaid, Bee hears removed, Partner hears split_created for the new row); linked → free name with a repayment.

## 2026-10-12 — API design review: page-ready data (PROPOSAL, no code written)
Input: `ai/reports/api-audit-2026-10-12.md`. Principle: the BE sends page-ready data; the FE never loads a whole reference list to look up a name / icon / colour / flag by id.

### 0. Audit claims checked against the code
| Claim | Verdict |
|---|---|
| `EmbeddedRef{id,name}` only on tx account / category | TRUE (`transactions/model.go:92`; the list query joins only `a.name`, `c.name`, `store.go:245`). Dashboard `recent` reuses the same struct. |
| Category system flag / kind not available | TRUE and worse: `is_system` is sent but `SystemKind` is `json:"-"` (`categories/model.go:42`), so `system_kind` never reaches the app. The transfer direction is guessed from a name because of this. |
| `SplitRef` bare + snapshot | TRUE (`SplitsFor`, `transactions/store.go:794`: `counterparty_person_name`, `contact_id`, no contact join). |
| `PersonalDebt` snapshot only | TRUE (`debtColumns`; `GetByID` / `List` have no contact join). |
| `/personal-debts/people` is live but unused | TRUE, with 4 gaps: uses `contacts.display_name` (not the linked user's name); icon = the contact's own (not the linked user's); **open debts only** (a person with only settled debts is absent); no paging; free names group by `lower(name)` with no key to ask for "this person's debts". |
| Pending draft is all bare ids | TRUE (`pending/model.go`). |
| No transfer twin ref | TRUE. `transfer_group_id` is on the row, but there's no lookup by group either. |
| No unread-count endpoint | TRUE (`unread_count` only comes back inside `GET /notifications`, `notifications/store.go:150`). |
| "GET /accounts/:id unused", "`counterparty_contact_id` filter unused", GET /transactions/:id, scheduled /:id, contacts/:id | **FE-only**: the BE already has all of them. `GET /accounts/:id` returns any status (archived too). The debts filter only works for contact people, not free names (needs the new person endpoint). |
| Spec says live contact name | TRUE (07 §45, 06 §2.5), not implemented. **The contacts module contradicts it**: `contacts/model.go:19` says linked contacts display `linked_user_display_name` in preference to the stored `display_name` → see Owner Q1. |

Extra BE gaps found: tx create/update have no `tag_ids` (every tag = a separate POST/DELETE); `POST /pending-transactions/submit` returns ids only (no row, no balance); no bulk discard; goals `linked_account` has no icon/type; the fee-category flag exists only in `GET /users/me`; notification settings `default_account_id` is bare; project board rows carry `transaction_member_id` only.

### 1. Response-shape changes (all additive unless stated)
Shared shapes (new Go types, supersets of today's `{id,name}`):
- `AccountRef` = `{id, name, icon_code, logo_url, type, currency, archived}`
- `CategoryRef` = `{id, name, icon_code, type, is_system, system_kind, parent_id}` (sub-categories keep their OWN icon per the standing decision, so no parent icon is needed; `parent_name` only if FE-A wants a breadcrumb)
- `EventRef` = `{id, name, icon_code, status}`
- `PersonRef` = `{name, contact_id, icon_code, linked, linked_user_id}`. **Name rule (server-side, one SQL fragment in `shared`):** contact set → the LIVE contact name (see Q1 for linked contacts); contact missing / deleted → the stored snapshot. Icon = linked user's icon, else the contact's, else null (free name → the FE draws 👤).

| # | Endpoint(s) | Change |
|---|---|---|
| 1 | `GET /transactions`, `GET /transactions/:id`, `POST` / `PUT` responses, `GET /dashboard` (`recent`), scheduled "generated" rows | `account` → `AccountRef`, `category` → `CategoryRef`, `project` → `EventRef` (existing keys keep `id`, `name`). |
| 2 | same rows, transfers only | new `transfer_peer: {id, direction: "out" or "in", account: AccountRef}` (the twin). Kills the "whole day's transfers" lookup and the name-guessing. |
| 3 | `GET /transactions/:id` `splits[]` | each `SplitRef` gets `person: PersonRef`; `person_name` now returns the **resolved** name (same key, live value). |
| 4 | `GET /personal-debts`, `/:id`, create / update / settle / cancel responses | `person: PersonRef`; `counterparty_person_name` returns the resolved name; the raw snapshot stays in the DB only. |
| 5 | `GET /personal-debts/people` | per row: `key` (`c:<contact_id>` or `n:<lower name>`), `person: PersonRef`, `open_count`, `settled_count`; optional `status=all` to include people with only settled debts; optional `page` / `per_page` (no params = everything, as today). Totals header unchanged. |
| 6 | **NEW** `GET /personal-debts/people/:key` | `{person, totals:{owed_to_me_open, i_owe_open, open_count, settled_count}, data:[debt+person], pagination}`; `status` filter (default all), `direction`, page / per_page. One call for the person page, free names included. |
| 7 | `GET /pending-transactions` | each draft gets a read-only `resolved: {account, transfer_to_account, category, tags[], project, splits:[{person: PersonRef}]}`; a dangling id → null + `missing: ["category_id"]`. Write shape unchanged. |
| 8 | `POST /pending-transactions/submit` | each `submitted[]` item also carries `transaction` (full detail) + `account_balance_after`. **NEW** `POST /pending-transactions/discard {ids}` (bulk, 1 call). |
| 9 | **NEW** `GET /notifications/unread-count` → `{unread_count}`; **NEW** `GET /me/counts` → `{unread_notifications, pending_drafts, categories, tags, contacts, active_events, open_debts, budgets, goals:{count, progress_pct}}` | badge + More hub in one cheap call. |
| 10 | `POST /transactions`, `PUT /transactions/:id` | accept `tag_ids` (create: set; update: replace-set, absent = unchanged); **NEW** `PUT /transactions/:id/tags {tag_ids}`. Replaces DELETE×k + POST + GET. |
| 11 | `GET /categories`, `/categories/:id` | expose `system_kind`; detail gets `is_fee_category` (drops the `/users/me` call). |
| 12 | `GET /contacts/:id?include=unlinked_names` | embeds the unlinked-names list (today a separate global call). |
| 13 | goals `linked_account`; `GET /notifications/settings`; project board rows | `AccountRef`; `default_account: AccountRef` next to the id; `transaction_member: {id, display_name, icon_code, user_id}` next to `transaction_member_id`. |
| 14 | `PUT /transactions/:id/splits` (the rule change you asked for) | on a split that has a contact (kept or new), a sent `person_name` is **ignored**: the name follows the contact; free-name rows still rename in place. The "silent rename on the same linked contact" path goes away (200, no error). |

### 2. Calls on open, BEFORE → AFTER (key pages; estimates from the audit)
| Page | Before | After |
|---|---|---|
| Home | 6–8 cold (accounts + categories just for icons, badge ping-pong) | ~3–4 (no lookup lists, 1 counts call) |
| Transactions list | 2 + per-row cache joins | 1 (+ `/tags` only when the filter sheet opens) |
| Transaction detail | cold: list p1 + `/:id` + `/contacts` + day's transfers; warm 0–3 | 1 (`GET /:id`: refs, splits' persons, twin all inside); warm 0–1 |
| Debts list | 1 + ⌈N/100⌉ + `/contacts`, every visit | 1 (`/people`) |
| Debt person page | ⌈N/100⌉ cold | 1 (`/people/:key`, paged on scroll) |
| Debt detail | 0–1 + contacts cache | 0–1 (person embedded) |
| Contact detail | 2 | 1 (`include=unlinked_names`) |
| Pending | 4 (drafts + accounts + categories + tags) | 1; bulk discard N → 1; submit needs no refetch |
| Quick create save | ≈5+ (POST, full `/accounts`, tag POSTs, GET) | 1 (`tag_ids` inline; `account_balance_after` already returned) |
| More hub | 3 (2 full lists) | 1 (`/me/counts`) |
| Category detail | 2 | 1 |
| Notifications badge | polled list call | `/me/counts` (or `/unread-count`) |

FE-only fixes (no BE work; use what exists): scheduled detail must `GET /scheduled-transactions/:id` (the "not found" bug); wallet detail uses `GET /accounts/:id` for archived; quick create uses `account_balance_after` (`patchBalance`); `/contacts` loaded lazily; transaction detail uses `GET /:id` directly; fix `'/personal-debts/split-changes//apply'` (id not interpolated); drill-down category filter without the cache; badge double-start; event picker `GET /projects` cached.

### 3. Breaking vs additive; migrations
- **Additive: #1–#13** (new keys, new endpoints, richer refs). Old builds ignore the new keys.
- **Value change, same shape:** `person_name` / `counterparty_person_name` now return the live name. No key removed or renamed; an old build just starts showing renamed contacts correctly. I recommend this over leaving the snapshot in the same key (that is the trap behind the audit's bug).
- **#14** is behaviour only (no field change). Safe with `MIN_APP_BUILD=0`; **nothing here needs `MIN_APP_BUILD` to move.**
- **Migrations: none required** (everything is a join). Optional: index `personal_debts(user_id, counterparty_contact_id)` for the person endpoint; I'll ask before adding it, and at today's data size it isn't needed.

### 4. Order of work (BE effort, rough) and what the FE changes
| Step | BE | FE must change |
|---|---|---|
| A. `AccountRef` / `CategoryRef` / `EventRef` + `system_kind` + `transfer_peer` (#1, #2, #11) | ~1.5 d | tiles / detail read the embedded refs; delete the categories + accounts cache joins and the Home warm-up; twin + direction from `transfer_peer` / `system_kind` |
| B. `PersonRef` + live names (#3, #4, #14) | ~1.5 d | render `person.*`; drop the contacts-cache lookup in tx detail / debt detail; stop sending `person_name` for contact rows |
| C. people + person endpoint (#5, #6). **Do together with the 0.3.1-8 debts rework**: its "repayments tie to the person, net = debts − repayments" changes the same aggregation, so doing it twice is waste | ~1.5 d | rebuild debts list + person page on the two endpoints (biggest FE item); drop `listAll` |
| D. pending `resolved` + submit embeds + bulk discard (#7, #8) | ~1 d | pending page without the 3 lists; patch from the submit response; one discard call |
| E. `/me/counts` + `/unread-count` (#9) | ~0.5 d | badge + More hub; remove the 30 s list poll |
| F. `tag_ids` on create / update + `PUT …/tags` (#10) | ~0.5 d | quick create / edit send tags inline |
| G. small ones (#12, #13, goals icon, settings ref, board member ref) | ~1 d | drop the leftover lookups |

Total ≈ 7–8 BE days; every step ships alone and additive. A and B give the biggest drop for the least work and unblock the FE cleanup; C is the one that changes a whole page.

### 5. Owner questions
1. **Linked contact, which name?** Spec 07 §45 / 06 §2.5 say `contacts.display_name` (my label for them). The contacts module and the app today show the linked user's profile name instead (the stored `display_name` is only a stale snapshot for a later unlink). My recommendation: linked → the linked user's profile name (live, consistent with the contact list); unlinked contact → `contact.display_name`; no contact → snapshot; and send `person.label` (= `contact.display_name`) so the UI can show both if wanted. Lead's "my label for them" remark points the other way, so this needs the owner.
2. **People with only settled debts:** show them in the debts list (zero totals, greyed) or hide them as today? I'd show them under a "settled" filter.

Assumptions for FE-A to confirm: `parent_name` in `CategoryRef` (breadcrumb) is optional; the debts list needs only people, no flat debt list.

## 2026-10-12 — API spec v1 (OpenAPI 3.1, DRAFT for owner review) — no handlers changed
DONE · files: `chubi-pocket-be/internal/apidoc/{openapi.yaml,apidoc.go,apidoc_test.go}`, `cmd/api/main.go` (one route), `go.mod` (goccy/go-yaml now a direct dep) · go vet clean · `go test ./internal/apidoc/` ok (refs resolve, every op has summary / tags / operationId / x-used-by, path params declared, required keys exist) · migration: none yet (see Q1)

**Where / how**
- Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml` (embedded, converted to JSON once).
- Served at **`GET /api/v1/openapi.json`**, public, read-only, registered on the engine (not the versioned group, so an app build rejected with 426 can still read it). At serve time it injects `x-registered-routes` (what the server really registers under `/api/v1`) and `x-spec-routes` (method + path pairs in the spec) so the hub's coverage counter is exact.
- Format agreed with FE-A (chubi-pocket-81): `tags=[module]`, `components.schemas` with description + example, `x-breaking` (string), `x-used-by: [{page, calls}]`. Page slugs used: home, transactions-list, wallet-detail, category-detail, transaction-detail, quick-create-sheet, edit-transaction-sheet, split-editor, pending, more-hub, notifications-badge, settings-notifications, categories-list, contacts-list, contact-detail (+ touch-point pages: goals-*, budgets-list, scheduled-list, debts-list, debt-detail, event-detail).

**Contents:** 60 schemas, 32 operations. Shared first: `Uuid, Date, DateTime, Money, CurrencyCode, IconCode, Page, Error, AccountRef, CategoryRef, EventRef, TagRef, UserRef, PersonRef, MemberRef, TransferPeer, WalletBalance`. Then Transactions (list, create, get, update, delete, edit splits, **set tags**), Pending (list, create, update, delete, **discard**, submit), `GET /me/counts`, `GET /notifications/unread-count`, notification settings, categories (list, detail), contacts (list, create, detail with `include=unlinked_names`, update), dashboard, and touch-points (goals, budgets, scheduled, debts list / detail / people, event board rows).

**Rules written into the spec header:** clean shapes (no old-key compatibility); thin FE; no lookup lists; one person-name rule (nickname → linked user's profile name → contact display_name → snapshot only when there is no contact); every response key always present (null = none, arrays never null); money = JSON number; **every write returns the post-write balances of all wallets it touched** (`account_balances: [{account_id, balance}]`).

**Breaking changes (all need MIN_APP_BUILD = the 0.3.1-9 build)**
1. Transaction row (list / detail / writes): `account`, `category`, `project` become full refs (`AccountRef` with icon / type / group / archived; `CategoryRef` with `system_kind`; `EventRef`); `is_resolve` → `is_repayment`; `category_render` and `is_recurring` removed (the author's category is just `category`); new `transfer_peer`; `splits[].person` + resolved `person_name`; `account_balance_after` removed from the row.
2. `POST /transactions` / `PUT /transactions/:id`: response = `{rows[], account_balances[]}` (was a bare row / `{transfer_group_id, rows}`); request gains `tag_ids`, loses `project_id`.
3. `DELETE /transactions/:id`: returns `{id, account_balances[]}` (was `{success, message}`).
4. `POST /transactions/:id/tags` and `DELETE /transactions/:id/tags/:tag_id` **removed**; `PUT /transactions/:id/tags` replaces them.
5. `PUT /transactions/:id/splits`: `person_name` is ignored on a split that has a contact (the "rename on the same linked contact" path goes away); response = `Transaction`.
6. Pending: items gain `resolved`; `submit` → `submitted[] = {id, rows}`, `failed[] = {id, error, pending}`, top-level `account_balances` + `badges` (was `transaction_id`); `DELETE /pending-transactions/:id` returns `{discarded, skipped, remaining_count}`; new `POST /pending-transactions/discard`.
7. Contacts: `name` (resolved) + `nickname` added; flat `linked_user_display_name / _email / _icon_code` → `linked_user {id, display_name, email, icon_code}`; `icon_code` = resolved icon; `unlinked_names` on detail with `?include=`.
8. Categories: `system_kind` exposed; detail gets `is_fee_category` (no `/users/me` call).
9. Notification settings: `default_account_id` → `default_account` (`AccountRef`) in responses (request keeps the id).
10. Dashboard: `recent` = new Transaction rows; `top_categories[]` = `{category: CategoryRef|null, expense, count}`; `badges` added.
11. Touch-points: goals `linked_account` → `AccountRef` + `linked_account_balance`; budgets `category` → `CategoryRef`; scheduled `account` / `category` → shared refs; debts: `counterparty_person_name` removed from responses, `person: PersonRef` added (people rows: `display_name` + `icon_code` → `person`); event board rows gain `transaction_member`.
Additive only: `/me/counts`, `/notifications/unread-count`, `badges`, `resolved`, `include=unlinked_names`.

**Coverage note** (`go test -v -run Coverage ./internal/apidoc/` prints it): `main.go` registers 144 routes under `/api/v1`; 28 have a spec entry; **116 are not in the spec yet** and keep their current shape: accounts (all 17: CRUD, members, identifiers, summary, saving-allocations, adjust-balance, reorder …), auth (register / login / logout / password), users/me (+ deactivate / reactivate / packs), tags (CRUD), `GET /transactions/summary`, categories write routes (create / update / delete / reorder), budgets write routes + overview + `/:id`, saving goals write routes, scheduled (create / update / delete / pause / resume / cancel / generate-now / upcoming / history / `/:id`), personal debts writes (create / update / delete / cancel / settle / split-changes / split-requests), contacts actions (archive / restore / absorb / link-request flows / unlink / delete / sender-profile / unlinked-names), notifications (list / read / read-all / actioned / dismiss / delete), projects (everything except the board list: CRUD, members, bills, quick, link-requests, board writes, summary, tags, leave, transfer), slip import (scan-slip, parse-text, check, reset), payment-providers, app/version.
New in the spec, not built yet: `GET /me/counts`, `GET /notifications/unread-count`, `POST /pending-transactions/discard`, `PUT /transactions/{id}/tags`. Removed by the spec: the two tag attach / detach routes (counted in the 116 until they are deleted).
Outside this spec but covered by the balances rule (they move money): debt `settle`, `POST /projects/:id/bills` + `/projects/quick`, scheduled `generate-now`, `adjust-balance` (already returns the account).

**Questions for Lead / owner**
1. **Nickname does not exist.** `contacts.nickname` was dropped in migration 29 (merged into `display_name`). The decided rule needs it back → a migration (new nullable `contacts.nickname`) plus `nickname` on create / update. I wrote it into the spec; confirm the migration (breaking for nothing: data is disposable). If the owner meant "my label = `display_name`", the rule collapses to profile name → display_name → snapshot, and I'd drop `nickname` + `Contact.display_name` stays the label.
2. The two tag attach / detach routes are removed. OK, or keep them next to `PUT …/tags`?
3. Writes that move money but are outside this draft (settle, bills / quick create, generate-now): must they return `account_balances` in 0.3.1-9 too, or with their own pages? I assumed "when implemented / touched".
4. The openapi route is public (no token) and bypasses the version check, so the hub can read it from any build. Fine for prod too?
5. I kept both `GET /me/counts` (badges + More) and `GET /notifications/unread-count` (tiny poll), as in your list.

STOP: no handler code written; waiting for the owner's review in /#/dev.

### 2026-10-12 addendum — Lead's answers applied to the spec (still no handler code)
- Q2: the two old tag routes stay removed in the spec (`PUT /transactions/:id/tags` replaces them).
- Q3: spec now has 4 money-moving touch-points that gain only `account_balances`: `POST /personal-debts/{id}/settle`, `POST /projects/{id}/bills`, `POST /projects/quick`, `POST /scheduled-transactions/{id}/generate-now` (new schema `WriteBalancesTouch`). Spec = 36 operations now (apidoc tests pass).
- Q4: `GET /api/v1/openapi.json` is public locally and requires a logged-in user when `APP_ENV=production` (still outside the 426 version check). Only change in `cmd/api/main.go`.
- Q1 (nickname): waiting for Lead; no migration added.

### 2026-10-12 addendum 2 — nickname is back (owner answer to Q1)
- Migration **053** (`000053_contacts_nickname.up/down.sql`): `contacts.nickname VARCHAR(100)` (nullable) + `contacts.show_nickname BOOLEAN NOT NULL DEFAULT TRUE`. Files only: not applied anywhere, no handler code. Additive for the current schema; ships with 0.3.1-9.
- Spec: `Contact` returns `nickname`, `show_nickname` and the resolved `name`; create / update accept both; the name rule is written as one fragment (nickname if set AND shown → linked user's live profile name → `display_name` → snapshot only without a contact) in the header, `PersonRef` and `Contact`. The FE setting lives on the contact page.

## 2026-10-12 — API spec v2 (every reached page, TARGET shapes) — no handler code
DONE · `internal/apidoc/openapi.yaml` (version `0.3.1-9-draft2`) · 97 operations · go vet clean, `go test ./internal/apidoc/` ok · migration 053 (nickname) files only, not applied.

**Coverage.** `main.go` registers 144 routes under `/api/v1`; **92 have a spec entry**, 52 do not: all of them belong to pages not reached yet (budgets, saving goals, scheduled, debts writes, events / projects) except the two tag routes the spec REMOVES (`POST /transactions/:id/tags`, `DELETE /transactions/:id/tags/:tag_id`). The 5 new routes in the spec that do not exist yet: `GET /me/counts`, `GET /notifications/unread-count`, `POST /pending-transactions/discard`, `PUT /transactions/:id/tags`, `GET /transactions/form-options`.
`x-used-by` is optional now (the hub reads FE-A's page-flow registry); operationIds are stable — FE-A, rename nothing on your side without asking.

**New page-ready endpoints / merges (what the flows should say)**
| Page | On open | Per button |
|---|---|---|
| Home | `getDashboard` (1) — now carries `pending` (the รอยืนยัน block), `attention` (ต้องจัดการ) and `badges`; no accounts / categories / pending / notifications calls | — |
| Transactions list | `listTransactions` (1); rows are self-contained | filter sheet opens → `getTransactionFormOptions` (1, lazy) |
| Transaction detail | `getTransaction` (1): refs, tags, event, transfer twin, splits with persons, flags | `updateTransaction` / `deleteTransaction` / `setTransactionTags` / `editSplits` — each returns the final state (+ `account_balances`) |
| Quick create sheet | **`getTransactionFormOptions` (1, NEW)**: wallets (+ balance, default), categories (flat), tags, active events, fee category. Contacts are NOT in it: `listContacts` (1) only when the user opens the split editor | `createTransaction` (1, tags inline) or `createPending` |
| Pending | `listPending` (1, rows carry `resolved`) | `updatePending`, `deletePending`, **`discardPending`** (bulk), `submitPending` (returns rows + `account_balances` + `badges`); slip import: `checkSlips`, `scanSlip`, `parseText` (stub), `resetSlipHistory`, `listPaymentProviders` |
| Wallets list | `listAccounts` (1; `totals` inside) | `createAccount`, `reorderAccounts` |
| Wallet detail | **`getAccount?include=summary,members` (1)**: wallet + members + this month's totals; the members tab reads `members_history` from the same response | `updateAccount`, `archiveAccount`, `adjustAccountBalance`, `addAccountIdentifier`, `inviteAccountMember`, `removeAccountMember`, `transferAccountOwnership`, `updateAccountReportScope`; the tx list of the wallet = `listTransactions?account_id=` (1) |
| Categories | `listCategories` (1) | `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`; detail = `getCategory` (1, includes the fee flag, no `/users/me`) |
| Tags | `listTags` (1, with `usage_count`) | `createTag`, `updateTag`, `deleteTag` (`getTag` only if a detail page needs it) |
| Contacts | `listContacts` (1) | detail = `getContact?include=unlinked_names` (1); `createContact`, `updateContact` (nickname / show_nickname), `deleteContact`, `archiveContact`, `restoreContact`, `requestContactLink`, `unlinkContact`, `absorbContactNames`; link-request flows return contact + notification + badges |
| Notifications | `listNotifications` (1, items display-ready) | `markNotificationRead`, `markNotificationActioned`, `dismissNotification`, `readAllNotifications`, `deleteNotification` — each returns the item + fresh `badges` |
| Badge / More | `getMyCounts` (1) for More; `getUnreadCount` for the cheap poll (or fold into `getMyCounts`) | — |
| Settings | `getNotificationSettings` (1; `default_account` is a full ref) | `updateNotificationSettings`; the wallet picker uses `listAccounts` |
| Auth / me | `getMe` (1) after login; `getAppVersion` on boot / resume | `login`, `register`, `logout`, `changePassword`, `updateMe`, `deactivateMe`, `reactivateMe` |

**Notes for the owner's review**
- Dashboard (Home) grew two blocks (`pending`, `attention`) so Home really is one call; `attention` = unread / actionable notifications, newest 10 — FE-A to confirm that matches "ต้องจัดการ".
- Account shape is rebuilt (member `display_name` → `name`, `group`, `my_role`, `can_edit`, `is_me`); every wallet write returns the wallet; member actions return `{account, members}`.
- Every notification action returns the notification in its new state + `badges`; so does every link-request / invite action.
- `GET /users/me`: `preferences` is typed (`timezone`, `theme`, `language`, `fee_category_id`).
- Slip endpoints drop the `{success, message, data}` envelope (bare bodies like the rest); `parseText` is still the 0.3.2 stub.

**All operationIds (97)**

**Accounts**

| operationId | route |
|---|---|
| `removeAccountMember` | DELETE `/accounts/{id}/members/{member_id}` |
| `archiveAccount` | DELETE `/accounts/{id}` |
| `listAccountMembers` | GET `/accounts/{id}/members` |
| `getAccountSummary` | GET `/accounts/{id}/summary` |
| `getAccount` | GET `/accounts/{id}` |
| `listAccounts` | GET `/accounts` |
| `reorderAccounts` | PATCH `/accounts/reorder` |
| `acceptAccountInvite` | POST `/accounts/invites/{notification_id}/accept` |
| `rejectAccountInvite` | POST `/accounts/invites/{notification_id}/reject` |
| `adjustAccountBalance` | POST `/accounts/{id}/adjust-balance` |
| `addAccountIdentifier` | POST `/accounts/{id}/identifiers` |
| `inviteAccountMember` | POST `/accounts/{id}/members` |
| `transferAccountOwnership` | POST `/accounts/{id}/transfer-ownership` |
| `createAccount` | POST `/accounts` |
| `updateAccountReportScope` | PUT `/accounts/{id}/report-scope` |
| `updateAccount` | PUT `/accounts/{id}` |

**Auth**

| operationId | route |
|---|---|
| `login` | POST `/auth/login` |
| `logout` | POST `/auth/logout` |
| `register` | POST `/auth/register` |
| `changePassword` | PUT `/auth/password` |

**Categories**

| operationId | route |
|---|---|
| `deleteCategory` | DELETE `/categories/{id}` |
| `getCategory` | GET `/categories/{id}` |
| `listCategories` | GET `/categories` |
| `reorderCategories` | PATCH `/categories/reorder` |
| `createCategory` | POST `/categories` |
| `updateCategory` | PUT `/categories/{id}` |

**Contacts**

| operationId | route |
|---|---|
| `deleteContact` | DELETE `/contacts/{id}` |
| `getLinkRequestSender` | GET `/contacts/link-requests/{notification_id}/sender-profile` |
| `listUnlinkedNames` | GET `/contacts/unlinked-names` |
| `getContact` | GET `/contacts/{id}` |
| `listContacts` | GET `/contacts` |
| `acceptContactLinkRequest` | POST `/contacts/link-requests/{notification_id}/accept` |
| `createLinkedContactFromRequest` | POST `/contacts/link-requests/{notification_id}/create-linked-contact` |
| `linkExistingContactFromRequest` | POST `/contacts/link-requests/{notification_id}/link-existing-contact/{contact_id}` |
| `rejectContactLinkRequest` | POST `/contacts/link-requests/{notification_id}/reject` |
| `absorbContactNames` | POST `/contacts/{id}/absorb` |
| `archiveContact` | POST `/contacts/{id}/archive` |
| `requestContactLink` | POST `/contacts/{id}/request-link` |
| `restoreContact` | POST `/contacts/{id}/restore` |
| `unlinkContact` | POST `/contacts/{id}/unlink` |
| `createContact` | POST `/contacts` |
| `updateContact` | PUT `/contacts/{id}` |

**Dashboard**

| operationId | route |
|---|---|
| `getDashboard` | GET `/dashboard` |

**Me**

| operationId | route |
|---|---|
| `getAppVersion` | GET `/app/version` |
| `getMyCounts` | GET `/me/counts` |
| `listMyPacks` | GET `/users/me/packs` |
| `getMe` | GET `/users/me` |
| `deactivateMe` | POST `/users/me/deactivate` |
| `reactivateMe` | POST `/users/me/reactivate` |
| `changeMyPassword` | PUT `/users/me/password` |
| `updateMe` | PUT `/users/me` |

**Notifications**

| operationId | route |
|---|---|
| `deleteNotification` | DELETE `/notifications/{id}` |
| `getNotificationSettings` | GET `/notifications/settings` |
| `getUnreadCount` | GET `/notifications/unread-count` |
| `listNotifications` | GET `/notifications` |
| `readAllNotifications` | POST `/notifications/read-all` |
| `markNotificationActioned` | POST `/notifications/{id}/actioned` |
| `dismissNotification` | POST `/notifications/{id}/dismiss` |
| `markNotificationRead` | POST `/notifications/{id}/read` |
| `updateNotificationSettings` | PUT `/notifications/settings` |

**Pending**

| operationId | route |
|---|---|
| `deletePending` | DELETE `/pending-transactions/{id}` |
| `resetSlipHistory` | DELETE `/slip-imports` |
| `listPaymentProviders` | GET `/payment-providers` |
| `listPending` | GET `/pending-transactions` |
| `discardPending` | POST `/pending-transactions/discard` |
| `parseText` | POST `/pending-transactions/parse-text` |
| `scanSlip` | POST `/pending-transactions/scan-slip` |
| `submitPending` | POST `/pending-transactions/submit` |
| `createPending` | POST `/pending-transactions` |
| `checkSlips` | POST `/slip-imports/check` |
| `updatePending` | PUT `/pending-transactions/{id}` |

**Tags**

| operationId | route |
|---|---|
| `deleteTag` | DELETE `/tags/{id}` |
| `getTag` | GET `/tags/{id}` |
| `listTags` | GET `/tags` |
| `createTag` | POST `/tags` |
| `updateTag` | PUT `/tags/{id}` |

**Touch-point**

| operationId | route |
|---|---|
| `listBudgets` | GET `/budgets` |
| `listDebtPeople` | GET `/personal-debts/people` |
| `getDebt` | GET `/personal-debts/{id}` |
| `listDebts` | GET `/personal-debts` |
| `listBoardRows` | GET `/projects/{id}/transactions` |
| `getSavingGoal` | GET `/saving-goals/{id}` |
| `listSavingGoals` | GET `/saving-goals` |
| `listScheduled` | GET `/scheduled-transactions` |
| `settleDebt` | POST `/personal-debts/{id}/settle` |
| `quickCreateEvent` | POST `/projects/quick` |
| `addBillsToEvent` | POST `/projects/{id}/bills` |
| `generateScheduledNow` | POST `/scheduled-transactions/{id}/generate-now` |

**Transactions**

| operationId | route |
|---|---|
| `deleteTransaction` | DELETE `/transactions/{id}` |
| `getTransactionFormOptions` | GET `/transactions/form-options` |
| `getTransactionSummary` | GET `/transactions/summary` |
| `getTransaction` | GET `/transactions/{id}` |
| `listTransactions` | GET `/transactions` |
| `createTransaction` | POST `/transactions` |
| `editSplits` | PUT `/transactions/{id}/splits` |
| `setTransactionTags` | PUT `/transactions/{id}/tags` |
| `updateTransaction` | PUT `/transactions/{id}` |

### 2026-10-12 addendum 3 — spec v2 after FE-A's answers (still no handler code)
- Home to-do card rule written into the spec: `Dashboard.pending = {total, items(first 5)}`, `Dashboard.attention = {total, items(first 10)}` where rows = `dismissed_at IS NULL AND (read_at IS NULL OR awaits_answer)`, `total = max(unread badge total, matching rows)`. `Notification.is_actionable` is renamed `awaits_answer` with FE-A's exact rule (link request / invite not actioned; one-tap types; superseded and unsuggested ones excluded). The card's third group is the dashboard's own `upcoming` block.
- Dropped as duplicates / merged: `GET /accounts/{id}/summary` (use `getAccount?include=summary`), `GET /accounts/{id}/members` (use `?include=members`; `POST …/members` stays), `GET /tags/{id}` (the list has everything), `PUT /users/me/password` (the app uses `PUT /auth/password`). `GET /transactions/summary` stays (analytics; no reached page uses it yet).

## 2026-10-12 — API spec v2 IMPLEMENTED (93 ops + nickname + locked currency)
DONE · modules: transactions, accounts, categories, tags, contacts, notifications, users, auth, appversion, **me** (new), pending, imports, dashboard, + touch-points saving_goals, budgets, scheduled_transactions, personal_debts, projects · migration 053 (contacts.nickname / show_nickname; applied on the local DB) · `go vet ./...` clean · `go test -count=1 ./...` (TEST_DATABASE_URL set) all packages ok · deviations from the spec: 0 (the spec was adjusted where the code needed a status / key — see below). No commit, no deploy.

**How the code stays true to the spec**
- `internal/apidoc/conform.go`: `apidoc.Response(operationId, status, body)` / `Request(...)` validate a real body against the yaml (undocumented key, missing required key, null where none allowed, wrong type / enum / uuid / date all fail). Every handler test goes through `internal/apidoc/apitest` (`Engine`, `Do`, `Conform`).
- `TestSpecRoutesAreRegistered`: every operation in the yaml is a route `main.go` registers. 93 operations; `main.go` registers 144 − the removed routes; the routes not in the spec belong to pages not reached yet (budgets / goals / scheduled / events / debts writes).
- Shared building blocks: `internal/shared/{refs,writes,notification_view}.go` (refs + batch loaders, `PersonNameSQL`, wallet balances, badges, the display-ready notification).

**Route changes made in `cmd/api/main.go`**
Added: `GET /me/counts`, `GET /notifications/unread-count`, `GET /transactions/form-options`, `PUT /transactions/:id/tags`, `POST /accounts/:id/restore`, `POST /pending-transactions/discard`, `importsHandler.WithResolver(...)`. Removed: `PUT /users/me/password`, `GET /accounts/:id/summary`, `GET /accounts/:id/members`, `GET /tags/:id`, `POST /transactions/:id/tags`, `DELETE /transactions/:id/tags/:tag_id`. `GET /api/v1/openapi.json` needs a login in production.

**Changes to the spec while implementing** (all recorded in the yaml): 409 / 400 / 401 error responses found by the tests (notification state conflict, settings type not mutable, register conflicts, wrong password, link-request states, discard 400); `restoreAccount`; `AccountList` archived_count + totals breakdown; `MembersResult.account` nullable (leaving); `Category.depth` / `path`, `DeleteCategoryResult.reparented`, `listCategories?status`; `Contact.email` resolved, `SenderProfile.contact_id`; `Notification.awaits_answer` (FE rule); `Dashboard.pending / attention / badges`; `listBoardRows` + `pagination`; `SummaryGroup` account / category required; user-level currency; `settle` / `bills` / `quick` answer 200. Behaviour notes: `chubi-pocket-docs/design/api/api-v2-notes.md` (also linked from api-document.md and spec 04 / 07).

**Fixes found on the way:** notification list filter `from` / `to` returned 500 (ambiguous column); `reactivateMe` dereferenced the context user; an `update_tx` draft ignored `account_id` / `category_id` (presence flags) — now applied; `GET /payment-providers` no longer sends `created_at` / `updated_at`.

**Currency inventory (no change made beyond the owner's rule: user-level, locked, wallets take the user's)**
- Columns: `users.currency` (VARCHAR, default 'THB'), `accounts.currency`, `budgets.currency`, `personal_debts.currency`, `project_transactions.currency` (VARCHAR, no default). **No** currency column on `transactions`, scheduled transactions, saving goals (inherit the linked wallet's), projects, contacts.
- Responses carrying it: Profile / AuthUser / register (`currency`, user-level, locked); Account + AccountRef + `AccountList.totals.currency`; Transaction (`currency` = the wallet's else the user's, derived) and TransactionSummary / Dashboard (`currency` = the user's); budgets, personal debts (+ their notification payloads `split_created` / `split_changed`), saving goals (inherited), event board rows (`project_transactions.currency`). `/personal-debts/people` no longer sends a top-level `currency`.
- Risk to note: wallets created before 0.3.1-9 keep their own currency; `totals` only sums wallets in the user's currency (`other_currency_count` for the rest). Debts / budgets / board rows still copy a currency at creation (from the wallet or the user), unchanged.

**Open points for Lead**
- Spec says 200 for settle / bills / quick; before they were 201 (FE adopts when those pages are redone).
- `settle`'s `account_balances` only covers the caller's wallet (the creditor's auto-receive wallet is the other user's).
- `splits` on a transaction lists only the caller's debts while `split_count` counts the author's (shared wallet co-members).
- Pre-existing, untouched: `gofmt -l` still lists a few files with line-ending noise.

### 2026-10-12 addendum 4 — spec coverage 144/144 (routes documented as they are today)
The remaining 50 routes (events / projects, budgets, saving goals, scheduled, debts writes) are in the spec as they behave today (no behaviour change; legacy `{success, message}` envelopes and odd statuses are described, not fixed). Quirks the documentation recorded: unmapped plain errors answering 500 (project add-member variants, role owner, request-link on a linked member, project link-request accept/reject for a missing notification, budget scope/project consistency checks, debt update status=settled with settled_amount < amount), accept-split and project copy answer 201 even when the row existed, PUT/DELETE on a board row / member do not check the row against the project in the path, saving-allocations answers 400 ACCOUNT_NOT_OWNED. `x-used-by` is not used (FE registry). New operationIds:

- Budgets: archiveBudget (POST /budgets/{id}/archive)
- Budgets: createBudget (POST /budgets)
- Budgets: deleteBudget (DELETE /budgets/{id})
- Budgets: getBudget (GET /budgets/{id})
- Budgets: getBudgetsOverview (GET /budgets/overview)
- Budgets: restoreBudget (POST /budgets/{id}/restore)
- Budgets: updateBudget (PUT /budgets/{id})
- Debts: acceptDebtSplitRequest (POST /personal-debts/split-requests/{notification_id}/accept)
- Debts: applyDebtSplitChange (POST /personal-debts/split-changes/{notification_id}/apply)
- Debts: cancelDebt (POST /personal-debts/{id}/cancel)
- Debts: createDebt (POST /personal-debts)
- Debts: deleteDebt (DELETE /personal-debts/{id})
- Debts: updateDebt (PUT /personal-debts/{id})
- Projects: acceptProjectLinkRequest (POST /projects/link-requests/{notification_id}/accept)
- Projects: addProjectMember (POST /projects/{id}/members)
- Projects: copyProjectTransactionToPersonal (POST /projects/{id}/project-transactions/{pt_id}/copy)
- Projects: createProject (POST /projects)
- Projects: createProjectTransaction (POST /projects/{id}/project-transactions)
- Projects: deleteProject (DELETE /projects/{id})
- Projects: deleteProjectTransaction (DELETE /projects/{id}/project-transactions/{pt_id})
- Projects: getProject (GET /projects/{id})
- Projects: getProjectSummary (GET /projects/{id}/summary)
- Projects: leaveProject (POST /projects/{id}/leave)
- Projects: listProjectMembers (GET /projects/{id}/members)
- Projects: listProjectTags (GET /projects/{id}/tags)
- Projects: listProjects (GET /projects)
- Projects: markProjectTransaction (PUT /projects/{id}/project-transactions/{pt_id}/mark)
- Projects: rejectProjectLinkRequest (POST /projects/link-requests/{notification_id}/reject)
- Projects: removeBillFromProject (DELETE /projects/{id}/bills/{transaction_id})
- Projects: removeProjectMember (DELETE /projects/{id}/members/{member_id})
- Projects: requestProjectMemberLink (POST /projects/{id}/members/{member_id}/request-link)
- Projects: transferProjectOwnership (POST /projects/{id}/transfer-ownership)
- Projects: updateProject (PUT /projects/{id})
- Projects: updateProjectMember (PUT /projects/{id}/members/{member_id})
- Projects: updateProjectTransaction (PUT /projects/{id}/project-transactions/{pt_id})
- Saving goals: archiveSavingGoal (POST /saving-goals/{id}/archive)
- Saving goals: createSavingGoal (POST /saving-goals)
- Saving goals: deleteSavingGoal (DELETE /saving-goals/{id})
- Saving goals: getAccountSavingAllocations (GET /accounts/{id}/saving-allocations)
- Saving goals: restoreSavingGoal (POST /saving-goals/{id}/restore)
- Saving goals: updateSavingGoal (PUT /saving-goals/{id})
- Scheduled: cancelScheduled (POST /scheduled-transactions/{id}/cancel)
- Scheduled: createScheduled (POST /scheduled-transactions)
- Scheduled: deleteScheduled (DELETE /scheduled-transactions/{id})
- Scheduled: getScheduled (GET /scheduled-transactions/{id})
- Scheduled: getScheduledHistory (GET /scheduled-transactions/{id}/history)
- Scheduled: listScheduledUpcoming (GET /scheduled-transactions/upcoming)
- Scheduled: pauseScheduled (POST /scheduled-transactions/{id}/pause)
- Scheduled: resumeScheduled (POST /scheduled-transactions/{id}/resume)
- Scheduled: updateScheduled (PUT /scheduled-transactions/{id})

## Handoff 2026-10-13
**Unfinished / loose ends (none blocking):**
- Design docs: only `design/api/api-v2-notes.md` (+ links, spec 04 / 07 notes) describe API v2; the per-module specs (06 / 10 / 12 / 13) and `ux-overhaul-contract.md` still show the old shapes where they disagree (the yaml wins). Debts rework + people endpoints are 0.3.1-10 (not started).
- The 50 routes documented "as today" in the spec (projects / budgets / goals / scheduled / debts writes) were read from the code, not response-tested; their odd behaviours (500 for plain errors, 201 on re-accept / re-copy, `settle` / `bills` / `quick` now 200, `settle.account_balances` = caller's wallet only) are described, not fixed.
- `gofmt -l` still lists a few files with CRLF noise (not real diffs).

**Does `go test ./...` on :5433 wipe data? No.** There is no TRUNCATE anywhere, and no unscoped DELETE/UPDATE in the tests: every DB test creates its own throwaway users (random uuids, usernames `tdb_*` / `qct_*` / `evt_*`) and its own wallets / categories / debts, and removes them by those user ids in `t.Cleanup` (also when the test fails). It does INSERT rows into the live DB while it runs (briefly) and leaves nothing behind. Caveat: it still writes to the DB you point it at, a crashed run (kill -9) could leave `tdb_*` / `qct_*` / `evt_*` rows, and nothing guarantees every future test stays scoped. To be safe with the prod restore, use a throwaway DB in the same container:
1. `docker exec chubi_pocket_db psql -U chubadmin -d postgres -c "CREATE DATABASE chubi_test"`
2. migrate it (PowerShell): `docker run --rm --network chubi-pocket-be_default -v "<repo>/chubi-pocket-be/migrations:/migrations" migrate/migrate -path=/migrations -database "postgres://chubadmin:admin1234@db:5432/chubi_test?sslmode=disable" up` (check the network name with `docker network ls`; the compose `migrate` service uses the same image)
3. `TEST_DATABASE_URL=postgres://chubadmin:admin1234@localhost:5433/chubi_test?sslmode=disable go test -count=1 ./...` (unset = tests that need the DB SKIP silently; the default DSN IS the :5433 dev DB).

**Gotchas for the next BE:**
1. The OpenAPI yaml (`internal/apidoc/openapi.yaml`, 144 ops) is the source of truth; handler tests call `apitest.Conform(t, "<operationId>", status, body)` and fail on any undocumented / missing key. `TestSpecRoutesAreRegistered` ties spec ↔ `main.go`; `go test -v -run Coverage ./internal/apidoc/` lists routes missing from the spec. Rules: `internal/apidoc/IMPLEMENTING.md`.
2. The yaml mixes hand-written YAML-flow blocks and JSON-style blocks; a text edit that breaks either fails every apidoc test at once. In this shell a heredoc containing apostrophes / backticks breaks: write files with the Write tool, not `cat <<EOF`; `sed`/`node -e` with nested quotes is fragile too.
3. Shared building blocks live in `internal/shared` (`refs.go` batch loaders + `PersonNameSQL`, `writes.go` balances / badges, `notification_view.go`): the person name rule is ONE SQL fragment (nickname if shown → linked user's profile name → display_name → snapshot only without a contact); a contact split ignores a sent `person_name`.
4. Migrations: latest is 053 (contacts.nickname / show_nickname); currency is user-level and locked (`users.currency`, wallets take it, no migration was needed). The local DB must be at 053 or DB tests skip / fail.
5. Every money-moving write returns `account_balances` (`shared.LoadWalletBalances` after commit); keep that when adding writes. Bodies are bare (no `{success,message,data}`), keys always present, arrays `[]`.
6. Run `go vet` / `go test` with `TEST_DATABASE_URL` set (the release gate wants 0 SKIP); the apidoc tests take a few seconds because the 360 KB yaml is parsed per test binary.
