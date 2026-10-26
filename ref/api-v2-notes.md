# API v2 (0.3.1-9) — behaviour notes

**Source of truth: `chubi-pocket-be/internal/apidoc/openapi.yaml`** (served at `GET /api/v1/openapi.json`; public locally, any logged-in user in production). The code conforms to it: handler tests call `apidoc.Response(operationId, status, body)` and fail on any difference, and `TestSpecRoutesAreRegistered` fails when the spec documents a route `main.go` does not register. This file keeps only what the yaml cannot say (rules, choices). Older contract documents (`ux-overhaul-contract.md`, the per-module specs) describe the previous shapes where they disagree.

Owner rules (2026-10-12): the update is forced (`MIN_APP_BUILD` = the 0.3.1-9 build), so shapes are clean and breaking changes are fine; the FE only displays (one page open = one page-ready call, one button = one call, writes return the final state); the BE computes aggregates, statuses and display flags.

## Conventions
- A single resource is the bare object; a list is `{data, pagination}` (or the shape its schema names); no `{success, message, data}` envelope on success. Errors are `{success:false, error:{code, message, details}}`.
- Every key of a schema is always present: "none" is `null`, arrays are `[]`.
- Writes return the final state. A write that moves money returns `account_balances` (`[{account_id, balance}]` for every wallet it touched, a transfer touches two); notification actions return the item plus fresh `badges`.
- Embedded refs (`AccountRef`, `CategoryRef`, `EventRef`, `TagRef`, `PersonRef`, `MemberRef`) replace bare ids on rows; the FE never loads a whole list to look a name / icon / colour / flag up. Code: `internal/shared/refs.go` (batch loaders, one query per kind per page).

## Person display name (one rule, one SQL fragment: `shared.PersonNameSQL`)
1. the contact's `nickname`, when set AND `show_nickname` is on → 2. else, when the contact is linked, the linked user's live profile name → 3. else the contact's `display_name` → 4. the stored snapshot `person_name`, only when the row has no contact (or its contact is gone).
- Applies to splits, debts, pending drafts, the contacts module (`Contact.name`), the debt people rows. A sent `person_name` on a row that has a contact is ignored; the stored snapshot only matters as a fallback. `contacts.nickname` / `show_nickname` (migration 053): nickname > 100 → 400, "" / null clears, `show_nickname` absent on update = unchanged. `Contact.email` / `icon_code` are resolved the same way (linked user's first).
- Split edit (`PUT /transactions/:id/splits`): a contact split keeps the contact's name (same contact → the name is ignored; a changed contact → that contact's resolved name); a free-name split renames in place; changing the contact of a split linked to an app user is remove + add (old partner `split_changed`, new partner `split_created`).

## Currency
User-level (`users.currency`): set at registration (default THB) and then LOCKED — `PUT /users/me` ignores a sent currency. Wallets take the user's currency (create / update take none). Other currency columns are unchanged (see the inventory in `team/inbox/be.md`).

## Transactions
- `split_count` counts the author's debts but `splits` lists only the caller's: a co-member of a shared wallet sees `splits: []` with `split_count > 0`. `splits` is `null` on list rows.
- `is_locked` = the row has a wallet and the caller is not an active member of it; `can_edit_category` = author, not locked, expense / income, not a repayment or system row.
- Create: a transfer's `tag_ids` go on the OUT row; update / `PUT …/tags` tag the addressed row; only the caller's own tags are replaced (a co-member's tags survive). A tag id that is not the caller's → 400 `TAG_NOT_FOUND`.
- Form options (`GET /transactions/form-options`): `default_account_id` = the wallet of the caller's most recent expense / income, else the first by order; categories are active, non-system, flat in tree order with `depth` / `parent_name`; events = active, the caller a non-viewer member; `fee_category_id` from the user's preferences.
- Validations added: list `sort` / `from` / `to` and summary `group_by` / dates (400); a transfer edit cannot clear a wallet or use the same wallet on both sides; summary `currency` is the user's.
- An `update_tx` draft now really applies `account_id` / `category_id` (the Go-built update request counts a non-nil value as present).

## Wallets, categories, tags, contacts
- Wallet totals: `liabilities` and `credit_used` are positive numbers owed (a negative balance on a credit wallet is a debt), `net = assets − liabilities`; every tracked wallet is summed as-is (currency is a label; `other_currency_count` removed 2026-10-16). `sort_order` is the caller's own order (`account_members.sort_order`). `getAccount?include=summary,members` replaces the old summary / members routes.
- Inviting a member is owner-only (403 `NOT_OWNER`); `OWNER_MUST_TRANSFER` is 400; `SCOPE_NOT_ALLOWED` is 403; leaving yourself returns `{account: null, members: []}`; restore = `POST /accounts/:id/restore`.
- Category `depth` / `path` are computed per response from one tree query; deleting shifts the children up to the grandparent first and `reparented` shows them after the shift; `is_fee_category` reads the user's `fee_category_id` preference.
- Contacts: `acceptContactLinkRequest` returns `contact: null` (the linked contact belongs to the sender); link-request errors 409 `REQUEST_REJECTED` / `NOT_ACCEPTED`. Tags: the old attach / detach routes and `GET /tags/:id` are gone.

## Notifications, me, pending, dashboard
- A notification carries `actor`, `state` (actioned > dismissed > read > unread) and `awaits_answer` (not actioned / dismissed, and a type that asks something: link request, invite, split_created / split_changed unless superseded, project_tx_recorded_for_you, project_tx_changed only with `personal_transaction_id` + `suggested`). `dismiss` / `actioned` return 409 `NOTIFICATION_STATE_CONFLICT` when the other terminal state is set. The API reports the user status `deactivated` (stored as `inactive`).
- Home to-do card: `Dashboard.pending` = all drafts (`total`) with the 5 newest; `Dashboard.attention` rows = `dismissed_at IS NULL AND (read_at IS NULL OR awaits_answer)`, newest first, 10 items, `total = max(unread badge, matching rows)`. `upcoming` is the dashboard's own block.
- Pending drafts carry `resolved` (account, wallets, category, tags, event, split persons; a dangling id → `null` + listed in `missing`; a split whose contact is gone falls back to the typed name). Submit returns `rows` (final shape, transfer OUT first), `account_balances` for every wallet any submitted draft touched, `badges`; a failed draft comes back with `last_error`.
- Slip import (`scan-slip`, `parse-text`, `slip-imports/*`, `payment-providers`) answers bare bodies; scan results carry `resolved`.

## Touch-points (pages not reached yet)
Goals (`linked_account` = AccountRef + `linked_account_balance`), budgets (`category` = CategoryRef), scheduled (`account` / `category` = shared refs, both keys always present), and `generate-now` gains `account_balances`.

## 0.3.1-10: debts and events
- **Debts** are a person ledger (spec 12 §0): entries paid | received with a paid label, `net` per person, an entry with a wallet owns exactly one transaction (`counterparty` on it; edits / deletes on either side reach both). `DebtTotals` is the one rule for the debts header, `Dashboard.debts` and `/me/counts.debts_summary`. `split_paid` is retired.
- **Events** (spec 10 §0): page-ready `Event` / `EventDetail` / `BoardRow`, `EventPatch` from every write, event-scoped tags + my tags on an event, a pulled bill's money linked with its transaction (`event_bill` on the transaction, `linked` / `source_tx` on the bill).
