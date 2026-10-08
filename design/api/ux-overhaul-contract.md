# API contract — Phase 2 UX overhaul additions

Status: **§0–§11 implemented** (2026-10-08). §12 (Google sign-in) is still planned only.
The app is pre-release (single user), so the FE is written against this contract **before** the BE lands;
until then the affected UI hides itself or shows a placeholder.

Companion docs: [`api-document.md`](api-document.md) (canonical existing endpoints) ·
[`../../product/phase2/ux-overhaul-plan.md`](../../product/phase2/ux-overhaul-plan.md) (§14 BE backlog, §15 bugs).

Conventions are the same as `api-document.md`: `/api/v1` prefix, bearer auth, `{error: {code, message}}`
envelope, money as JSON numbers, dates `YYYY-MM-DD`. "Additive" = existing clients keep working.

| § | Area | Change | Kind | FE consumer |
|---|---|---|---|---|
| 0 | Personal debts / splits | contact ownership checks | ✅ **done** | — |
| 1 | Transactions | `q` search + `tag_id` filter (+ `include_children`, `uncategorized`) | ✅ **done** | tx list search bar, dashboard drill-down |
| 2 | Transactions | summary groups split income/expense + reportable-only fix | ✅ **done** | dashboard |
| 3 | Accounts | bulk reorder (per member) | ✅ **done** | accounts reorder mode |
| 4 | Dashboard | one aggregated endpoint | ✅ **done** | dashboard |
| 5 | Notifications | per-type mute + automation flags honoured + split notifications sent | ✅ **done** | notification settings, inbox |
| 6 | Projects | summary per-member / per-category, role fixes | ✅ **done** | project dashboard, members |
| 7 | Personal debts | `people.icon_code`, direct settle w/o account, 400 not 500 | ✅ **done** | debts |
| 8 | Contacts | search matches email / phone | ✅ **done** | contacts list |
| 9 | Categories | delete always real; budgets cascade (✅ done) | behaviour + fix | category delete |
| 10 | IconCode | `shape` field | ✅ **done** (unknown → dropped) | icon maker / every icon |
| 11 | Notifications | dismiss vs actioned conflict → 409 | ✅ **done** | inbox |

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

## 2. Transactions summary — typed groups (✅ implemented 2026-10-07)

`GET /transactions/summary?group_by=…`: each `groups[]` item gains `income` and `expense`.

```json
{ "key": "…", "name": "Food", "total": 1240.0, "count": 9, "income": 0.0, "expense": 1240.0 }
```

- `total` keeps its current meaning for compatibility.
- New optional `type=expense|income` filters rows before grouping. Any other value returns `400 VALIDATION_ERROR`.
- New `group_by=parent_category` rolls subcategories up into their top-level parent. Categories are two levels
  deep, so this gives one row per parent.
- Uncategorized rows come back with key `""` and name `""` (previously `'(uncategorized)'`). The client
  localises the label.

Behaviour fixes shipped with this section. They apply to every summary and to budget spent:
- **Reportable rows only.** Rows whose category has `include_in_report = false` are excluded: opening balance,
  adjustments, transfers, debt received/paid. This is the same rule the per-account summary already used, now
  shared as `shared.ReportableCategoryPredicate`. Previously a new wallet's opening balance showed up as this
  month's income.
- **Floating rows count.** `shared.ReportScopePredicate` now counts rows with `account_id IS NULL` for their
  author. Previously no-wallet transactions were missing from every report and every budget.

## 3. Accounts — bulk reorder

`PATCH /accounts/reorder`

```json
{ "items": [ { "id": "uuid", "sort_order": 0 }, { "id": "uuid", "sort_order": 1 } ] }
```

**Revised 2026-10-07 (owner decision): every member keeps their own order.**
- The order lives per member, in `account_members.sort_order`, added by a migration that backfills it from
  `accounts.sort_order`.
- `GET /accounts` sorts by the caller's membership order.
- Reordering never changes what other members of a shared wallet see.
- `accounts.sort_order` stays for compatibility but is no longer read.

Rules:
- All changes are applied in one DB transaction.
- `items` may contain any wallet the caller has an **active membership** in, whether owned or shared.
- Any other id, including an unknown id, returns `403 FORBIDDEN` and nothing is applied.
- A duplicate id returns `400 VALIDATION_ERROR`.
- Ids that are not listed keep their order.
- `200` returns `{ "data": [Account…] }` in the new order, in the same shape as `GET /accounts`.
- CORS must allow `PATCH`. Today it doesn't, which also breaks web preflight for `/categories/reorder`.

## 4. Dashboard — aggregated (✅ implemented 2026-10-07)

Revised 2026-10-07 for the "see everything at a glance" dashboard (plan §8). It replaces the earlier
`?period=` draft. There are no "safe to spend" or pace figures: the response is an overview, not alerts.

`GET /dashboard?month=YYYY-MM`
- `month` defaults to the current month.
- Timezone comes from `X-Timezone`, then the user's preference, then `Asia/Bangkok`. This is the same rule
  budgets use.
- A malformed `month` returns `400 VALIDATION_ERROR`.

```json
{
  "month": "2026-10", "from": "2026-10-01", "to": "2026-10-31", "today": "2026-10-07", "currency": "THB",
  "net_worth": { "total": 245000.0, "assets": 260000.0, "liabilities": 15000.0, "accounts_count": 4 },
  "summary":  { "income": 32000.0, "expense": 18580.0, "net": 13420.0, "transaction_count": 41 },
  "previous": { "income": 30000.0, "expense": 24000.0, "net": 6000.0, "transaction_count": 52 },
  "top_categories": [ { "category_id": "uuid", "name": "Food", "icon_code": { }, "expense": 6200.0, "count": 23 } ],
  "other_expense": 6880.0,
  "trend": [ { "month": "2026-05", "income": 30000.0, "expense": 21000.0 } ],
  "upcoming": {
    "days": 14, "total_expense": 4850.0, "total_income": 32000.0,
    "items": [ { "kind": "scheduled", "id": "uuid", "name": "Netflix", "type": "expense", "amount": 419.0,
                 "due_date": "2026-10-05", "days_until": -2, "overdue": true,
                 "icon_code": { }, "logo_url": "https://…" } ]
  },
  "budgets": { "count": 5, "total_budget": 20000.0, "total_spent": 12400.0, "utilization_pct": 62.0,
               "over_limit_count": 1 },
  "debts": { "owed_to_me": 5000.0, "i_owe": 2000.0, "net": 3000.0, "open_count": 4 },
  "saving_goals": { "count": 2, "completed_count": 0, "total_target": 100000.0, "total_current": 48000.0,
                    "progress_pct": 48.0 },
  "recent": [ Transaction… ]
}
```

**These follow `month`:**

| Field | Contents |
|---|---|
| `summary` | Totals for the selected month. |
| `previous` | Totals for the month before it. |
| `top_categories` + `other_expense` | Expense rolled up to parent categories. The top 4 are listed and the rest is summed into `other_expense`. `category_id` is `null` for uncategorized rows. |
| `trend` | 6 points ending at `month`, zero-filled. |

All money in these fields comes from `/transactions/summary`, so the report-scope and reportable-row rules in
§2 apply.

**These are a snapshot of right now:**

`net_worth`
- Covers active wallets whose `my_report_scope` is not `none`.
- Positive balances count as assets. Negative balances (cards, overdrafts) count as liabilities.

`upcoming` uses a 14-day window from `today`, sorted by `due_date`, with at most 10 items.
- `scheduled` items:
  - Active scheduled transactions due on or before `today + 14`.
  - Overdue ones are included with `overdue: true` and a negative `days_until`. Nothing auto-generates
    scheduled rows yet, so a past date means the transaction was never recorded.
- `card_due` items:
  - Credit-card and pay-later wallets that have a `payment_due_date` and an outstanding balance.
  - The date is the next occurrence of that day of the month, clamped to the month's length.
  - `amount` is the outstanding balance and `id` is the account id.
  - A card is never marked overdue.

`budgets`
- Covers every active personal budget, each measured over its own current period (weekly, monthly or yearly).
- Values come from `/budgets/overview`.

`debts`
- Values come from `/personal-debts/people`.
- `open_count` is the sum of each person's `open_count`.

`saving_goals`
- Covers active goals.
- `progress_pct` is the sum of each goal's current amount (capped at its target) divided by the sum of targets.

`recent`
- The 5 newest transactions, in the same shape as rows from `GET /transactions`.

Empty sections are `[]` or zeroed objects, never omitted.

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

**Owner decisions (2026-10-07):**

`auto_add_to_personal_debt_on_split_notification`
- The default becomes **TRUE**. A migration flips the column default and existing rows, so today's
  behaviour, where the partner's mirror debt is always created, stays the same for everyone.
- When the recipient turns it off:
  - No mirror debt is created.
  - Their `split_created` notification becomes actionable: an "add to my debts" action creates the mirror
    debt.

`auto_resolve_own_in_projects`
- When on, recording a project transaction where the caller is the actor also creates the caller's personal
  transaction, in the same DB transaction, with `source_project_transaction_id` set.
- That personal transaction is always a **floating (no-wallet) row**: `account_id = NULL`. The user can move it
  to a wallet later.
- Its category is matched by name against the caller's own categories of the same type. With no match, it has
  no category.

**Debt links:**
- Mirror debts get linked through a new column, `personal_debts.counterpart_debt_id`. A migration adds it and
  backfills it best-effort from the source transaction and the linked users.
- `split_paid`, `split_received` and auto-record follow this link.

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

## 9. Categories — delete is always real (✅ implemented 2026-10-07)

Owner rule: deleting a category is always a hard delete — no archive.

- `DELETE /categories/:id` → reparent children, hard delete, `{ "message": "Category deleted", "status": "deleted" }`.
  Transactions / scheduled transactions → `category_id = NULL` (shown as "no category");
  budgets on the category → deleted (`budgets.category_id` FK now `ON DELETE CASCADE`, migration 000043 — fixes the old 500).
- `GET /categories/:id` adds `budget_count` (alongside `transaction_count`) so the client confirm can say what's affected.
- **Removed:** `POST /categories/:id/restore`, `DELETE /categories/:id/permanent`. Migration 000043 purged rows archived under the old rule (children moved up first).

## 10. IconCode — shape (✅ implemented — unknown shapes dropped, not rejected)

> Owner decision 2026-10-07: an unknown `shape` is **silently dropped** (renders as `circle`) instead of `400`,
> so mismatched app/BE versions never fail a save. Pinned by `TestIconCodeUnknownShapeDropped`. The bullet
> below about `400` is superseded.

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

## 12. Auth — Google sign-in (planned, FE placeholder only)

The login and register pages show a disabled "ดำเนินการต่อด้วย Google · เร็ว ๆ นี้" button (`GoogleSignInButton`, no
`onPressed`). Wiring it needs the following.

`POST /auth/google` (public):

```json
{ "id_token": "<Google ID token from google_sign_in>", "currency": "THB" }
```

- BE verifies `id_token` against Google's JWKS. `aud` must be one of our OAuth client IDs (Android/iOS/web), and
  `email_verified` must be true.
- Lookup is by `google_sub`:
  - **Found** → log that user in.
  - **Not found but the email matches an existing user** → `409 GOOGLE_EMAIL_EXISTS`. Never auto-link: an attacker
    could otherwise take over the account. Linking happens later, logged in, from settings.
  - **Not found** → create the user:
    - `display_name` = Google name.
    - `email` = Google email.
    - `username` = a free slug derived from the email local-part, `[a-z0-9_-]{3,50}`, with a numeric suffix on
      collision.
    - `password_hash` = NULL.
    - `currency` from the body (default `THB`).
- Response: same shape as `POST /auth/login` (`access_token` [+ `refresh_token`], `user`), plus `"is_new": true|false`
  so the FE can route new users to a short "check your username / currency" step.
- Errors:
  - `401 INVALID_GOOGLE_TOKEN`
  - `409 GOOGLE_EMAIL_EXISTS`
  - `403 USER_INACTIVE` (same as login)
- Schema:
  - `users.google_sub TEXT UNIQUE NULL`.
  - `users.password_hash` becomes nullable.
  - For Google-only users (no password), change-password becomes "set password" and must not require the old
    password.
- FE: add `google_sign_in`, `AuthRepository.loginWithGoogle(idToken)`, and `AuthCubit.loginWithGoogle()`, then pass
  `onPressed`/`loading` to `GoogleSignInButton` on both pages.

---

### Out of scope here (noted)

- `currency` is hard-coded `"THB"` in transaction summary and debt `people` totals — revisit with multi-currency.
- `is_recurring` on transactions is never set.
