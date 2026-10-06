# API contract — Phase 2 UX overhaul additions

Status: **contract agreed, BE not implemented** (2026-10-06) — except §0, already shipped in code.
The app is pre-release (single user), so the FE is written against this contract **before** the BE lands;
until then the affected UI hides itself or shows a placeholder.

Companion docs: [`api-document.md`](api-document.md) (canonical existing endpoints) ·
[`../../product/phase2/ux-overhaul-plan.md`](../../product/phase2/ux-overhaul-plan.md) (§14 BE backlog, §15 bugs).

Conventions are the same as `api-document.md`: `/api/v1` prefix, bearer auth, `{error: {code, message}}`
envelope, money as JSON numbers, dates `YYYY-MM-DD`. "Additive" = existing clients keep working.

| § | Area | Change | Kind | FE consumer |
|---|---|---|---|---|
| 0 | Personal debts / splits | contact ownership checks | ✅ **done** | — |
| 1 | Transactions | `q` search + `tag_id` filter | additive | tx list search bar |
| 2 | Transactions | summary groups split income/expense | additive | dashboard "by category" |
| 3 | Accounts | bulk reorder | new | accounts reorder mode |
| 4 | Dashboard | one aggregated endpoint | new | dashboard |
| 5 | Notifications | per-type mute + automation flags honoured + split notifications sent | additive + behaviour | notification settings |
| 6 | Projects | summary per-member / per-category, role fixes | additive + behaviour | project dashboard, members |
| 7 | Personal debts | `people.icon_code`, direct settle w/o account, 400 not 500 | additive + fix | debts |
| 8 | Contacts | search matches email / phone | behaviour | contacts list |
| 9 | Categories | delete when referenced by a budget | fix | category delete |
| 10 | IconCode | `shape` field | additive | icon maker / every icon |
| 11 | Notifications | dismiss vs actioned conflict → 409 | fix | inbox |

---

## 0. Contact ownership (✅ implemented 2026-10-06)

`counterparty_contact_id` / split `contact_id` must be one of the caller's own contacts.

- `POST /personal-debts`, `PUT /personal-debts/:id` → `400 CONTACT_NOT_FOUND` when the contact is missing or
  owned by someone else.
- `POST /transactions` (and update) with `splits[].contact_id` not owned → `400 CONTACT_NOT_FOUND`, whole
  request rejected. Previously a foreign contact id mirrored an `i_owe` debt into a stranger's account.
- `GET /personal-debts/people` only resolves names from the caller's own contacts.

---

## 1. Transactions — search + tag filter

`GET /transactions` — new optional query params (existing ones unchanged):

| Param | Type | Behaviour |
|---|---|---|
| `q` | string, 1–100 chars | Case-insensitive substring over `note`, category name and account name. Trimmed; empty = ignored. |
| `tag_id` | uuid, repeatable | Rows having **any** of the tags (`?tag_id=a&tag_id=b`). |

Pagination/sort unchanged. FE debounces `q` by 300 ms.

## 2. Transactions summary — typed groups

`GET /transactions/summary?group_by=…` — each `groups[]` item gains:

```json
{ "key": "…", "name": "Food", "total": 1240.0, "count": 9, "income": 0.0, "expense": 1240.0 }
```

`total` keeps its current meaning for compatibility. New optional `type=expense|income` filters rows before
grouping (dashboard "top spending categories" uses `group_by=category&type=expense`).

## 3. Accounts — bulk reorder

`PATCH /accounts/reorder`

```json
{ "items": [ { "id": "uuid", "sort_order": 0 }, { "id": "uuid", "sort_order": 1 } ] }
```

- Applies all in one DB transaction. Only accounts the caller **owns**; any other id → `403 FORBIDDEN`,
  nothing applied. Ids not listed keep their order.
- `200` → `{ "data": [Account…] }` in the new order (same shape as `GET /accounts`).

## 4. Dashboard — aggregated

`GET /dashboard?period=week|month|year|all` (default `month`; timezone from `X-Timezone`)

```json
{
  "period": { "key": "month", "from": "2026-10-01", "to": "2026-10-31" },
  "net_worth": { "total": 1996618.0, "assets": 1999818.0, "liabilities": 3200.0, "accounts_count": 3 },
  "summary": { "income": 3000.0, "expense": 12400.0, "net": -9400.0, "transaction_count": 41 },
  "budgets": [ { "id": "uuid", "category_name": "Food", "amount": 6000.0, "spent": 4200.0,
                 "utilization_pct": 70.0, "over_limit": false } ],
  "upcoming": [ { "id": "uuid", "name": "Netflix", "type": "expense", "amount": 419.0,
                  "next_billing_date": "2026-10-09", "days_until": 3 } ],
  "debts": { "owed_to_me": 2000.0, "i_owe": 800.0, "net": 1200.0, "open_count": 4 },
  "saving_goals": [ { "id": "uuid", "name": "Japan trip", "target_amount": 60000.0,
                      "current_amount": 42000.0, "progress_pct": 70.0, "deadline": "2027-03-01" } ],
  "top_categories": [ { "category_id": "uuid", "name": "Food", "icon_code": { }, "expense": 6200.0 } ],
  "recent": [ Transaction… ],
  "currency": "THB"
}
```

Limits: `budgets` top 3 active by utilisation · `upcoming` next 7 days, max 3 · `saving_goals` active, max 2,
closest to completion · `top_categories` max 5 · `recent` max 5 (same shape as `GET /transactions` rows).
Empty sections are `[]` / zeroed objects, never omitted. Until this ships the FE calls the individual endpoints.

## 5. Notifications — preferences

`GET /notifications/settings` / `PUT /notifications/settings` — new field:

```json
{ "muted_types": ["project_tx_changed"] }
```

- Allowed values = notification `type` values. Unknown value → `400 VALIDATION_ERROR`.
- PUT replaces the whole array when present (send `[]` to unmute all); absent = unchanged.
- Dispatcher skips creating a notification whose type is in the recipient's `muted_types`.
- `account_invite`, `project_invite`, `contact_link_request` **cannot** be muted (they need an action) →
  `400 TYPE_NOT_MUTABLE`.

Behaviour (no API change):
- The four automation flags (`auto_notify_linked_split_contacts`, `auto_add_to_personal_debt_on_split_notification`,
  `auto_record_received_payment` + `default_account_id`, `auto_resolve_own_in_projects`) must actually drive
  the split / payment / project flows. Today nothing reads them.
- `split_created`, `split_paid`, `split_received` must be dispatched (types + payloads exist, no caller).
- `PUT` must allow clearing `default_account_id` with explicit `null`.

## 6. Projects

**6a. Summary breakdowns** — `GET /projects/:id/summary` adds:

```json
{
  "my_position": { "member_id": "uuid", "paid": 8000.0, "share": 4133.33, "net": 3866.67 },
  "members": [ { "member_id": "uuid", "display_name": "Aom", "paid": 3400.0, "share": 4133.33, "net": -733.33 } ],
  "by_category": [ { "name": "Food", "total": 6200.0, "count": 12 } ]
}
```

`paid` = parent rows recorded with that member as actor · `share` = sum of that member's split rows ·
`net = paid − share`. Parent rows only for `by_category`. `my_position` omitted when the caller isn't a member.

**6b. Role / membership fixes** (behaviour):
- `PUT /projects/:id/members/:member_id` on the **owner's** row → `409 CANNOT_CHANGE_OWNER` (use transfer-ownership).
- `POST /projects/link-requests/:notification_id/reject` also soft-removes the pending member row
  (`status='left'`), so it stops showing as "pending".
- `viewer` role becomes read-only: project-transaction create/update/delete and mark → `403 FORBIDDEN_ROLE`.

## 7. Personal debts

- `GET /personal-debts/people` rows add `icon_code` (the contact's, `null` for free-text names).
- `POST /personal-debts/:id/settle?direct=true` → `account_id` **optional** (ignored). Still required when
  `direct` is false/absent (`400 VALIDATION_ERROR`).
- `PUT /personal-debts/:id` with `settled_amount > amount` (resulting) → `400 INVALID_SETTLED_AMOUNT`
  (today the DB CHECK raises a 500).
- `PUT` allows clearing `note` and `counterparty_contact_id` with explicit `null`.

## 8. Contacts — search

`GET /contacts?search=` matches `display_name`, `email` **or** `phone` (case-insensitive substring;
phone compares digits only). No new params.

## 9. Categories — delete referenced by a budget

`DELETE /categories/:id` when the category has 0 transactions but is referenced by a budget
(`budgets.category_id … ON DELETE RESTRICT`): **archive instead of hard delete** and return
`{ "status": "archived", "reason": "in_use_by_budget" }`. Today it fails with a generic 500.
`reason` is also returned for the existing case: `"has_transactions"`.

## 10. IconCode — shape

`icon_code` (JSONB on every icon-bearing entity) gains an optional field:

```json
{ "icon": "…", "iconColors": [], "background": "…", "bgColors": [], "border": null, "borderColors": [],
  "shape": "squircle" }
```

- Allowed: `circle` · `squircle` · `rounded` · `square` · `leaf` · `drop`. `null`/absent = `circle`
  (all existing rows unchanged — **no migration**, JSONB).
- BE: add `Shape *string \`json:"shape"\`` to `internal/shared/iconcode.go` so it round-trips (today unknown
  fields are dropped on save); reject other values with `400 VALIDATION_ERROR`; update the
  "Shape is always a circle" comment.
- FE renders background clip + border along the shape.

## 11. Notifications — dismiss vs actioned

`POST /notifications/:id/dismiss` on an actioned row (or `actioned` on a dismissed row) →
`409 NOTIFICATION_STATE_CONFLICT` instead of a 500 from the DB CHECK.

---

### Out of scope here (noted)

- `currency` is hard-coded `"THB"` in transaction summary and debt `people` totals — revisit with multi-currency.
- `is_recurring` on transactions is never set.
