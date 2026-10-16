# 11 — Recurring (replaces Scheduled Transactions)

> **0.3.1-10 (migration 057, owner 2026-10-13 FINAL).** The scheduled-transactions module, its table, its routes and `transactions.scheduled_transaction_id` are gone (no migration of the old rows; installment / loan extras dropped). Shapes: `chubi-pocket-be/internal/apidoc/openapi.yaml`, tag **Recurring**. The file keeps its name so links still work.

## 1. Two parts

1. **The setting** (`recurring_rules`) — the generator. A Google-Calendar-style rule plus the values of what it produces (type, amount, wallet / to-wallet, category, tags, description, note) and a name + icon.
2. **The items** (`recurring_items`) — the module's own records, one per date of the setting. Also: **one-off upcoming items** (a future-dated `POST /transactions`) and **manual items** (added by hand, optionally under a setting). An item holds a draft of its values and is LINKED to a pending draft or a real transaction — the same mechanism as an event bill (the item holds the link; `ON DELETE SET NULL`).

## 2. The rule

| `freq` | Meaning |
|---|---|
| `daily` | every `interval` days |
| `weekly` | every `interval` weeks on `weekdays` (ISO 1 = Mon … 7 = Sun; default the start's weekday) |
| `monthly` | every `interval` months, `monthly.mode` `day` (1–31; a short month clamps to its last day) or `weekday` (`nth` 1–5 or -1 = last, + `weekday`) |
| `yearly` | every `interval` years on the start's month / day (Feb 29 clamps) |
| `dates` | hand-picked `dates` (no end; the last date ends it) |

- Starts at `start_date`. **End**: `none` | `date` | `count`. A set end is at most **2 years after the start** (400 `END_TOO_FAR`).
- **No end = a horizon**: items are written ahead to daily / weekly **3 months**, monthly / yearly **1 year** from today. "ต่ออีก" (`POST /recurring/:id/extend`) writes one more block, or sets a new end (required when the setting has an end).
- Each generated item has `seq` (its place in the rule, "3/12") and an internal `slot` (the rule date it was made for). Generation is idempotent per slot, so an item may move to another date without a duplicate appearing.

## 3. Item status (derived from the link)

| Status | When | Thai label |
|---|---|---|
| `upcoming` | not produced yet (date after today, or a paused setting's item before the due check) | ล่วงหน้า |
| `pending` | linked to a pending draft | รอยืนยัน |
| `done` | linked to a real transaction | บันทึกแล้ว |
| `not_created` | produced, but the draft was discarded / the transaction deleted (no link) | ยังไม่สร้าง |
| `archived` | a user flag (เก็บถาวร — "don't want it"): never produced, hidden from upcoming / not created | เก็บถาวร |

A real delete removes the item record.

## 4. The due check (no job runner)

Runs inside `GET /me/counts` (the boot call), `GET /dashboard`, `GET /notifications`, `GET /notifications/unread-count` and every recurring read (pull-to-refresh = recheck). "Today" = the user's timezone (`X-Timezone` header → `preferences.timezone` → Asia/Bangkok).

1. Settings on an archived wallet are paused.
2. Every item dated today or earlier, of an **ACTIVE** setting (or a one-off / manual item), not produced, not archived → **one pending draft** (`source` `recurring` | `upcoming`, `source_ref {item_id, recurring {id, name, icon_code} | null, seq, total}`) — exactly once (row locks + `produced_at`).
3. **One grouped `recurring_due`** notification while unread (`payload {count}`, deep link `/pending`; new drafts add to the count).
4. `recurring_ending` once per setting when it has **2 or fewer** upcoming items left (`payload {recurring_id, name, left}`, deep link `/recurring/{id}`); extend re-arms it.

**Paused** settings produce nothing: pausing deletes their not-produced items; resuming rebuilds from today (dates that passed while paused produce nothing).

Submitting a produced draft links the new transaction to the item (`pending.SubmitHook`): status `done`. Discarding it leaves the item `not_created`.

## 5. Settings API

- `GET /recurring?status=current|archived|all` — page-ready settings (refs, rule, end, `next_date`, `days_until`, `progress {done, total}`, `ending_soon`, `counts` per status, `edited_any`, `actions`) + chip counts. Sorted by next date, then name.
  - **`summary` (0.3.1-11)** for the list's summary card, the same whatever `status` / `q` / page: `{ month_pay, month_receive, next: {id, name, date, amount, type} | null }`. `month_*` = the per-month equivalent of the ACTIVE settings (paused, archived, ended and settings on an archived wallet excluded; transfers and savings are not money in / out): daily = amount × 30.4375 / interval; weekly = amount × number of weekdays (none = 1) × 4.3481 / interval; monthly = amount / interval; yearly = amount / (12 × interval); custom dates = amount × the dates falling in the CURRENT month; summed per type (expense → pay, income → receive), 2 decimals. `next` = the nearest upcoming occurrence (today or later) of an active setting of any type, ties by name, null when none. Optional `q` = case-insensitive name substring (narrows `data` and `pagination`, not `summary` or `counts`).
- `POST /recurring` → 201 `RecurringDetail` (the setting + its produced items + balances). Items dated today or earlier are produced at once.
- `GET /recurring/:id` — the page in one call (setting + the first page of produced items, newest first). `GET /recurring/:id/items?tab=produced|upcoming`.
- `PUT /recurring/:id` — partial. Value fields go to the setting and by `scope` to its items: `upcoming` (default; the not-produced ones) | `all` (also produced ones; with `also_update_link` their drafts / transactions too). A rename carries over to items still showing the old name. A rule / start / end change rebuilds the not-produced items.
- `DELETE /recurring/:id?delete_linked_txs=true` — hard delete of the setting and its items; with the flag its drafts and transactions go too (`deleted_transaction_count`, balances).
- `POST /recurring/:id/pause` (active → paused) · `/resume` (paused → active; 400 `ACCOUNT_NOT_FOUND` on an archived wallet) · `/archive` (→ archived, items dropped) · `/restore` (archived → paused) · `/extend`. Wrong state → 409 `INVALID_TRANSITION`.

## 6. Items API

- `GET /recurring-items?status=upcoming|not_created|pending|done|archived|all&kind=all|recurring|one_off` — upcoming oldest first (only active settings' items and one-offs), others newest first.
- `POST /recurring-items` → 201 — a manual item (`recurring_id` optional); dated after today → upcoming, else not_created.
- `GET /recurring-items/:id`.
- `PUT /recurring-items/:id` — partial values + `scope` `this` (default; the date may change only here) | `following` | `past` | `upcoming` | `all`; marks the items `edited`. `also_update_link` gives the linked draft / transaction the same change (no notification; balances move). A date after today on a linked item with `also_update_link` removes its draft / transaction (the item is upcoming again).
- `DELETE /recurring-items/:id?delete_linked_tx=true` — the record goes; with the flag its draft / transaction too ("ลบรายการจริงด้วยไหม").
- `POST /recurring-items/:id/create` ("สร้างใหม่") — `target` `pending` | `transaction`, `fields` override any value incl. the date (a date after today makes it upcoming instead). 409 `ITEM_ALREADY_LINKED` when it already has a draft / transaction. A failed submit leaves the draft with its error (status pending).
- `POST /recurring-items/:id/archive` · `/restore`.
- `POST /recurring-items/batch` — `edit` | `create` | `archive` | `restore` | `delete` on up to 100 items; 409 `ITEM_ALREADY_LINKED` with `details.ids` for items that can't be created.

Errors: 400 `VALIDATION_ERROR` / `INVALID_RULE` / `END_TOO_FAR` / `ACCOUNT_NOT_FOUND` / `INVALID_CATEGORY` / `TAG_NOT_FOUND`, 404 `NOT_FOUND`, 409 `INVALID_TRANSITION` / `ITEM_ALREADY_LINKED`.

## 7. Transactions side

- A **future-dated `POST /transactions`** makes a one-off upcoming item instead of a row: `rows: []`, `upcoming: RecurringItem`, no balance change.
- **A real transaction edited to a future date moves** to the upcoming table (its money comes back; its item, if any, becomes upcoming again; else a one-off). Not allowed for transfers, debt entries' transactions, event bills' transactions or someone else's row → 400 `FUTURE_DATE_NOT_ALLOWED`.
- A transaction linked to an item shows `recurring_item {item_id, recurring, seq, total}` (its author only). Edits with `also_update_link: true` give the item the new values.
- `DELETE /transactions/:id?also_delete_link=true` deletes its item too (`recurring_item_id` in the result).
- Cross-link edits never notify (it's all my own book).

## 8. Counts

`GET /me/counts` → `counts.recurring {active_count, upcoming_count}` (active settings; upcoming items within the Home window of 14 days). The dashboard `upcoming` list reads the same items.

## 9. Recurring ออม (saving goals v2)

`type: saving` (wallet = `account_id`, `goal_id` null = the spare bucket; no category / tags). Its items become pending drafts of kind `saving` (🐷, `draft.type` saving, `draft.goal_id`). Confirming one makes a saving entry (spec 09 §0), linked to the item as `saving_entry_id` (status done); `also_update_link` edits the entry's amount / date / note; `delete_linked_tx` deletes it. Errors: 400 WALLET_NOT_TRACKED, 404 NOT_FOUND (goal), 409 GOAL_NOT_ACTIVE.

## 10. Not in this release

Shared settings, installment / loan maths (interest, principal split), a background job runner (the due check covers it).
