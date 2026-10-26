# API diet survey, 0.4.0-4 (2026-10-24)

Survey only. No code changed, no BE rebuild or restart, no write to prod.
Brief: `ai/briefs/api-diet-survey-brief.md` (owner's rule: opening a page = ONE call; Go prepares everything; as few SQL queries as possible).

## How it was measured

- **FE calls on open:** read from `chubi-pocket-app/lib` (router, shell, cubits, repositories) and cross-checked with `lib/hub/api/page_flows.dart` (the target). Two read-only helper agents did the first pass; the repeat-open and `X-Sync-Versions` points below were re-checked against the BE.
- **Queries (local):** BE `db_queries` / `db_ms` log line, user ppond, `X-Timezone: Asia/Bangkok`, params as the app sends them. Query counts are exact and the same on every run. Local ms = best of 3 (warm).
- **Statement shapes:** `log_statement='all'` switched on for one call at a time, grouped by normalised SQL, then reset (`SHOW log_statement` = none afterwards).
- **VPS:** GET only, prod test user `tester`, curl-style wall time from this PC, best of 3. The `/app/version` baseline (no DB) is **~67 ms**, so about 60 ms of every VPS number is network. The prod user has less data (8 budgets, 15 recurring, 5 events) than ppond (11 budgets, 24 recurring, 7 events), so VPS and local ms are not like for like.
- The pgx `-- ping` is not counted in `db_queries`.

## Fixed per-request cost (every protected endpoint)

- `auth/middleware.go:43` -> `store.GetByID` (`auth/store.go:112`): `SELECT <all user columns incl. password_hash> FROM users WHERE id = $1` on EVERY request. 1 query. It only needs `status` (a short cache or a narrower select would do).
- So the floor is 1 query for a fully cached endpoint. `/app/version` is 0 (public).

## Findings that explain most of the numbers

### F1. `recurring.DueCheck` runs on reads (and writes on a GET)

`recurring/service.go:74`. It opens a transaction and does: `UPDATE recurring_rules SET status='paused'` (auto-pause for archived wallets), `SELECT ... FOR UPDATE SKIP LOCKED` of all active rules, then per rule `autoCreate`, `newlyDue`, `endingOf` (each runs queries), `produceAutoSaves`, and may insert / update a `recurring_due` notification and create transactions (auto-create rules). Its own doc comment says it runs "on every read".

| Caller | Where | HTTP | Writes on a GET? |
|---|---|---|---|
| Dashboard | `dashboard/service.go:89` (`WithDueCheck`, `cmd/api/main.go:181`) | `GET /dashboard` | yes |
| Me counts | `me/me.go:126` (`main.go:180`) | `GET /me/counts` | yes |
| Notifications list | `notifications/handler.go:36` -> `RunDueCheck` (`notifications/recurring.go:24`, `main.go:182`) | `GET /notifications` | yes |
| Notifications badge | `notifications/handler.go:77` | `GET /notifications/unread-count` (polled every 60 s) | yes |
| Recurring list | `recurring/service.go:700` (`list`) | `GET /recurring` | yes |
| Recurring detail | `recurring/service.go:812` (`Get`) | `GET /recurring/:id` | yes |
| Recurring rule items | `recurring/service.go:833` (`RuleItems`) | `GET /recurring/:id/items` | yes |
| Recurring items | `recurring/service.go:853` (`Items`) | `GET /recurring-items` | yes |
| Recurring occurrences | `recurring/service.go:997` (`Occurrences`) | `GET /recurring/:id/occurrences` | yes |
| After a write | `recurring/writes.go:286` (`afterWrite`) | recurring writes | n/a (a write) |
| Sync | the `recurring` dataset loader is marked `readsMutate` (`sync/datasets.go:37`): it loads through the recurring service, so a recurring sync runs the due check | `POST /sync` (recurring) | yes |

Cost: a fixed ~8-9 queries (begin, UPDATE, rules, saving_auto, commit, `today()`, `lang()`, ...) plus about 1 query per active rule. This is why a bare badge poll costs 11 queries and why `/recurring` costs 24.

**Where it should run instead (suggestion):**
- Once per user per local day: keep `last_due_check_on` (date in the user's tz) with the user's preferences, and return at once when it equals today. Run it from `POST /sync` when the `recurring` set is requested (the app already syncs at start, on resume, and at midnight) and from the recurring writes.
- Everything else can be a plain read: the `due` state is already computed in SQL (`recurring/model.go:36`).
- Pause-on-archive can move to the account archive write (one UPDATE where it happens).
- Needs an owner decision: auto-create rules must still produce their transactions on the day. A once-a-day run on sync / app open does that, but a user who never opens the app gets nothing until they do (same as today).

### F2. `user_preferences` read 11-28 times per request

| Fragment | File:line | What it reads |
|---|---|---|
| `Service.today()` | `recurring/service.go:39` `SELECT preferences->>'timezone' ...` | timezone, ~15x in `/me/counts` and `/dashboard`, 12x in `/budgets` |
| `Service.lang()` | `recurring/occ.go:40` `SELECT preferences->>'language' ...` | language, 13x in `/me/counts` and `/dashboard`, 11x in `/budgets` |
| `shared.UserLocation` | `shared/clock.go:26` | timezone, once per `UserToday` |
| `budgets` | `budgets/store.go:363` | timezone |
| `saving_goals` | `saving_goals/store.go:274` | timezone |

Why so many: `ExpectedBetween` (`recurring/occ.go:359`) is called once per budget (`budgets/count.go:192`, `expectedOccurrences`) and starts with `s.today(...)` and `activeRules`; `lang()` is called inside per-rule / per-occurrence loops (`recurring/service.go:578, 914`, `slot.go:426`, ...). Measured per call: `/me/counts` timezone 15 + language 13; `/budgets` 12 + 11; `/notifications/unread-count` 1 + 1.

**Fix idea:** load the user's tz + language once per request (a small middleware, after auth, puts them in the context; or fold them into the `GetByID` query) and make `today()` / `lang()` read the context. That removes 11-28 queries from the top three endpoints with no change in behaviour.

### F3. Budgets are computed one by one (N+1)

`/budgets`, `/me/counts` (budget totals) and `/dashboard` all recompute every budget. Per budget (11 budgets), repeated statements: `budget_periods` list (x11) and `COUNT(*) budget_periods` (x13), the event-bill `WITH ev AS (...)` count CTE (x11), `recurring_items` + `recurring_rules` loads (x11 each, from `ExpectedBetween`), recursive category expansion (x6), plus the timezone / language lookups from F2. ~8 queries per budget.
**Fix idea:** compute all budgets in one pass: one query for periods of all budgets (`budget_id = ANY($1)`), one `ExpectedBetween` for the widest window (expand once, split in Go), one grouped used-sum query across all budgets, one category expansion for all scopes.

## Per-page tables

Legend: q = SQL queries (local), ms = local best of 3, VPS = best of 3 from this PC (about 67 ms is network).

### 1. Transactions

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/transactions` list | `GET /transactions?from&to&page=1&per_page=20&sort=date_desc` (1) | 10 | 81 | 86 | none (batched `= ANY($1)` loads: accounts, categories, tags, debts, splits). 30 KB body |
| `/transactions/:id` detail | `GET /transactions/:id` (1; always, even for a cached row). A debt-linked row not in cache adds `GET /personal-debts/:id` (2 sequential) | 7 | 63 | 87 | none |
| filter sheet (lazy) | 0 normally (reads the sync caches) | | | | |

Notes:
- Matches the target on first open.
- The list repeats its call on every re-open: `PullToRefresh` re-runs `onRefresh` when the tab becomes active, when a covering route is popped, on resume and on reconnect. Detail + back = 2 list loads.
- After a transaction write the list reloads twice: `TransactionsCubit._emitWrite` refreshes (`transactions_cubit.dart:426-433`), then the `transactions` key in `X-Sync-Versions` reloads it again (`:88`).
- `GET /transactions/summary` (2 q, 52 ms) has no real page caller (`PeriodSummaryCard` is hub-only).
- `GET /transactions/form-options` (7 q, 92 ms, 23 KB) is not called on open (the sync caches replace it); only a 404 fallback would.

### 2. Wallets

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/accounts` list | 0 on first open (the `accounts` sync dataset). 1 `POST /sync {want:[accounts]}` per RE-open (usually `unchanged`). Underlying query (GET `/accounts?status=all`, only on a 404 fallback) | 10 | 118 | 62 | none |
| `/accounts/:id` detail | `GET /accounts/:id?include=summary,members` (1) + `POST /sync {providers}` (0 if held, also on `/accounts/new`). Transactions tab (lazy): `GET /transactions?account_id=...` | 15 | 71 | 73 | **the whole wallet load runs twice**: the balance query, members query, balance CTE, saving-moves CTE and `saving_goals = ANY` each appear x2 |
| `/accounts/archived` | 0 (sync dataset) | | | | |

Notes:
- `include=summary` is parsed but never read by the page (`AccountDetail.summary` is unused): dead payload.
- **Broken call:** `GET /accounts/:id/summary` -> BE 404 (no such route; only `/transactions/summary` and `/projects/:id/summary` exist, `cmd/api/main.go:351, 428`). The app calls it from `account_detail_page.dart:683-699` (`_loadFlow` -> `summaryForAccount`, repository `transactions_repository.dart:441`) whenever the viewed period is NOT the current month. The 404 is swallowed and the row shows "-". So it is a broken call, not dead code. It is listed as debt in `test/hub/api_flows_baseline.txt`.

### 3. More (`/more`)

| Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|
| `GET /me/counts` (1). Repeats on every tab re-activation, resume, reconnect | **119** | 628 | 176 | F1 (DueCheck) + F2 (28 pref lookups) + F3 (budget totals) |

Notes: it feeds card subtitles only. `unread` and `pending` duplicate the bell poll and the draft badge. 119 queries for a menu of counts is the worst per-call cost the user sees on a normal tap.

### 4. Debts

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/personal-debts` list | 0 (the `debt_people` sync dataset). 1 `POST /sync` per re-open. Underlying `GET /personal-debts/people?all=true` | 4 | 55 | 87 | none |
| `/personal-debts/people/:key` | `GET .../people/:key?per_page=30&cycle=current` (1). Repeats on re-open | 19 | 96 (warm 23) | 112 | `accounts = ANY($1)` x4, timeline window CTE (`SUM() OVER`) x3, `COUNT(*) FROM (...window...)` x2, entries x2, repayment txs x2: the timeline CTE is built 2-3 times |
| `.../people/:key/entries` (lazy: "ดูรอบก่อน") | action only | 5 | 55 | 124 | |
| `/personal-debts/entries/:id` | `GET /personal-debts/:id` (1) | 11 | 56 | 118 | none |

Extra: `refreshOn(DataTable.debts)` + `setPaid`'s `unawaited(load())` can double-load a person page after one write.

### 5. Budgets

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/budgets` list | `GET /budgets?status=active&sort=risk` (1). Not cached (`load()`, not `loadIfNeeded()`). Reloads again on EVERY return from `/budgets/:id` or `/new`, plus a silent reload on `DataTable.budgets` (so a budget edit = 2 GETs) | **92** | 323 (warm 101) | 174 | F3: see above |
| `/budgets/:id` (+ `/edit`) | `GET /budgets/:id` (1) + cold syncs for categories / tags / accounts (0 normally). A global `TransactionsCubit` change re-fires the GET | 17 | 46 | 93 | pref lookups x3, recursive category CTE x2 |
| items / periods (lazy buttons) | action only | 17 / 13 | 75 / 36 | 110 / 71 | |

### 6. Saving goals

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/saving-goals` list | `GET /saving-goals?status=active&sort=created` (1 first time, 0 on later opens; silent reloads on `DataTable.savingGoals` and on transactions revision) | 14 | 37 | 59 | `accounts = ANY` x3, saving-moves CTE x2 |
| `/saving-goals/:id` | `GET /saving-goals/:id` (1; the first entries page is inside). Duplicate quiet GET when the overview or transactions cubit changes | 16 | 20 | 95 | accounts `= ANY` x3, saving CTE x2, per-day sums x2 |
| `/saving-goals/spare` | `GET /saving-goals/spare` (1) | 11 | 28 | 99 | |
| entries (lazy) | `GET /saving-entries?goal_id=` | 6 | 44 | 61 | |

### 7. Recurring

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/recurring` home | **2 parallel GETs** to `/recurring-items`: `?month=YYYY-MM&status=all&page=1&per_page=100` and `?status=due&page=1&per_page=100` (each loops pages 2.. while `hasMore`) + cold `POST /sync {recurring}`. The due items of the month are in both. The target is one `listRecurring` | 18 + 18 | 16 + 16 (115 cold) | 111 (month) | F1 on both calls; pref lookups x4; `recurring_items` x3 |
| `/recurring/:id` (+ `/settings`) | `GET /recurring/:id` (1; produced + upcoming first pages inside) + cold syncs | 26 | 76 | 111 | pref lookups x6, `recurring_items` x5, `accounts = ANY` x3, `categories = ANY` x3, rules x2 + F1 |
| rule items (lazy tabs) | action only | 16 | 48-96 | 146 | F1 |
| recurring directory (sync dataset `recurring`, 30 q cold) | `POST /sync` | 30 | 46 | n/a (POST not run on prod) | F1 (readsMutate) |

Note: the target's "one listRecurring for both lists and the summary" is not what the code does; `GET /recurring` (24 q) is not called by the page, only through sync.

### 8. Events

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/projects` list | `GET /projects?status=current&sort=updated_desc&page=1&per_page=20` (1; +1 only if page 1 does not fill the screen). `load()` always fetches on first mount | 10 | 102 | 129 | none |
| `/projects/:id` | `GET /projects/:id/detail?per_page=50` (1). Board = 0 calls on open (filtered board: `GET /projects/:id/transactions`). "สรุป" tab: `GET /projects/:id/settle` lazy | 18 | 82 | 108 | members lookup x2; two separate `WITH parents ...` CTEs (kids / mine) both scan `project_transactions` |
| `/projects/:id/members` | `GET /projects/:id` + `GET /projects/:id/members` (2, as the target) | 5 + 3 | 95 + 43 | 63 | |
| board / settle / summary (lazy) | action only | 12 / 4 / 9 | 107 / 49 / 48 | 86 / 90 / 64 | |

### 9. Contacts, categories, tags, notifications, pending, settings

| Page | Calls on open | q | local ms | VPS ms | Repeating shapes |
|---|---|---|---|---|---|
| `/contacts` | 0 (sync dataset). Re-open: `POST /sync` | 2 (sync part: 5) | 14 | 132 | none |
| `/contacts/:id` | `GET /contacts/:id?include=unlinked_names` (1) | 3 | 16 | 109 | none |
| `/categories` | 0 (sync dataset) | 6 (sync part: 9) | 25 | 117 | none (47 KB body) |
| `/categories/:id` | `GET /categories/:id` (1; always, even for a cached row) | 10 | 21 | 84 | `categories` x2 |
| `/tags` | 0 (sync dataset) | 2 | 13 | 119 | none |
| `/notifications` | `GET /notifications?page=1&per_page=20` (1) | 15 | 30 | 170 | F1 (DueCheck: `recurring_items` x2, `saving_auto`, commit) |
| `/notifications/settings` | `GET /notifications/settings` (1) | 2 | 33 | 140 | none |
| `/pending` | `GET /pending-transactions` (1) + cold syncs (accounts / categories / tags for a sheet that is not open) | 2 | 29 | 153 | none |
| `/pending/new` | 0 (cold syncs only) | | | | |
| `/settings`, `/settings/profile`, `/settings/password` | 0 (read `AuthCubit`; `GET /users/me` only on pull to refresh) | 3 | 57 | 62 | none |
| `/archived` | `GET /me/archived` (1) | 7 | 21 | 84 | none |
| `/dashboard` (Home is "Coming Soon", no call) | 0 now. Underlying endpoint: | **136** | 1445 | 312 | F1 + F2 (28 lookups) + F3 + the rest of the dashboard |

## App-wide calls (not from a page)

| Call | When | Needed? |
|---|---|---|
| `GET /app/version` (0 q) | every cold start (splash waits for it, 5 s timeout) AND on every resume, even when signed out | start: only for the soft "update available" banner, because a 426 / `APP_OUTDATED` on any call already gates the app (`api_client.dart:179-193`). Resume: no (cheap on the BE, 29 ms local, but it is a call) |
| `GET /users/me` (3 q) | cold start with a token; also pull-to-refresh on settings | yes (identity, currency) |
| `POST /sync`, all datasets | cold start / sign-in, resume after 5+ min, midnight | yes. Measured: first time 62 q / 461 ms / 126 KB; nothing changed 4 q / 45 ms / 1.4 KB (all 9 `unchanged`). A recurring change makes the sync run F1 (the `recurring` set alone is 30 q) |
| `POST /sync {want:[set]}` after a write | only when the `X-Sync-Versions` header moved a dataset (300 ms debounce). The BE stamps the header only on non-GET 2xx (`sync/middleware.go:29`; checked: GET responses carry none), so opening a page never adds a sync | yes |
| `GET /notifications/unread-count` (11 q) | sign-in, every 60 s while visible, every resume. Likely two back-to-back calls at start / sign-in (cubit created in `_clearPerUserCubits`, `clear()` then `start()` ticks again; read from code, not observed) | the badge is needed, but at 11 q (F1 + F2 + the user row) per minute it is the most frequent query load in the app. A badge count should be 1-2 q |
| `PullToRefresh` re-open | every tab re-activation, pop back to a page, resume, reconnect: re-runs that page's open call | the biggest multiplier. `/me/counts` (119 q) and `/budgets` (92 q) are both re-fired this way |
| Resume, away 5 min or less | `/app/version`, unread-count, current page's refresh | partly (see above) |
| Midnight | quiet full sync | yes |
| `GET /health` | only while offline | yes |

## Ranked worst endpoints (by what the app actually fires)

| # | Endpoint | q | local ms | VPS ms | Why | Fix idea |
|---|---|---|---|---|---|---|
| 1 | `GET /me/counts` | 119 | 628 | 176 | F1 + F2 + F3; fired on every More tap, tab re-activation, resume | drop DueCheck from reads; one-pass tz/lang; budget totals in one grouped query (or cache per request); drop `unread` / `pending` fields the app already has |
| 2 | `GET /budgets` | 92 | 323 | 174 | F2 + F3; reloaded after every return from a detail page, and twice after an edit | compute all budgets in one pass (one periods query, one expected-occurrences call for the widest window, one grouped used-sum); FE: stop the double reload |
| 3 | `GET /dashboard` | 136 | 1445 | 312 | same causes; not opened while Home is "Coming Soon" | fix #1 and #2 first; it reuses them. Do not enable Home before that |
| 4 | `GET /notifications/unread-count` | 11 | 50 | 95 | DueCheck on a badge poll (a transaction with an UPDATE every 60 s) + user row | plain `SELECT count(*)` (1-2 q), no DueCheck; FE: avoid the double start call |
| 5 | `GET /recurring-items` (x2 on open) | 18 + 18 | 16 + 16 | 111 | F1 + F2; two overlapping calls | FE: one call (month list + due flag), as the target's `listRecurring`; BE: no DueCheck on reads |
| 6 | `GET /recurring/:id` | 26 | 76 | 111 | F1 + F2 + per-occurrence loads | no DueCheck; tz/lang once |
| 7 | `GET /personal-debts/people/:key` | 19 | 96 | 112 | the timeline window CTE is built 2-3 times in one call | build the timeline once (one CTE, derive count / page / current-cycle from it) |
| 8 | `GET /budgets/:id` | 17 | 46 | 93 | pref lookups x3, category CTE x2 | tz once per request; one category expansion |
| 9 | `GET /projects/:id/detail` | 18 | 82 | 108 | two CTEs over `project_transactions`, members x2 | one pass of `project_transactions`; resolve members once |
| 10 | `GET /accounts/:id?include=summary,members` | 15 | 71 | 73 | the whole wallet load runs twice; `include=summary` unused | load once; drop `summary` from the include |
| 11 | `GET /notifications` | 15 | 30 | 170 | DueCheck on a list read | no DueCheck on reads |
| 12 | `GET /saving-goals`, `/saving-goals/:id` | 14 / 16 | 37 / 20 | 59 / 95 | accounts and saving CTEs repeated | one saving-moves CTE per request |

Also worth doing, not rank-worthy alone: the full `users` row on every request (auth middleware, `auth/middleware.go:43`).

## Pages that break the one-call-on-open rule

| Page | On open | Over by |
|---|---|---|
| Recurring home | 2 parallel GETs `/recurring-items` (+ cold sync) | 1 (and the target's `listRecurring` is not used) |
| Event members | `GET /projects/:id` + `GET /projects/:id/members` | 1 (the target allows 2; marked "on hold") |
| Transaction detail, debt-linked row not in cache | `GET /transactions/:id` then `GET /personal-debts/:id` | 1 (sequential) |
| Budgets list | 1 on open, but +1 on every return from a detail / new page, and +1 after a budget write | repeat calls |
| Every page with `PullToRefresh` | the open call repeats on tab re-activation, pop back, resume, reconnect | repeat calls (the target only describes "on open") |
| Cold start / sign-in | `/app/version`, `/users/me`, `POST /sync` (all), unread-count (probably x2) | app-wide, not a page |

Pages that are UNDER the target (0 calls on open) because of the sync cache: wallets list, debts list, contacts, categories, tags, settings, profile. `page_flows.dart` still names `listAccounts`, `listDebtPeople`, `listContacts`, `listCategories`, `listTags`, `getMe` for them (stale: those GETs only run if `/sync` answers 404).

## Differences from `page_flows.dart` (for the next update of it)

- Pages that read the sync cache: 0 calls on open, 1 `POST /sync` per re-open.
- `auth` / `app-start` do not list `GET /users/me` at boot, and the resume calls (`/app/version`, unread-count, current-page refresh) are not listed.
- `pending`: the "today: 4 calls" note is stale (the 3 picker calls now come from `/sync`, only when cold).
- Wallet detail: the `include=summary` and the `providers` sync on open are not in the flow; the period call `GET /accounts/:id/summary` is not in the flow either (and is broken, see Wallets).
- `DataChanges.refreshAll` is never called; the comment in `core/data/data_changes.dart` still mentions `tablesForWrite`, which no longer exists.

## Not checked

- Prod query counts (only the VPS timing from here; Lead can read the VPS meter lines).
- `POST /sync` on prod (not a GET).
- `AccountPicker` open-time calls; the "likely twice" unread-count at start (read from code, not observed).
- Whether Dio sends repeated keys for the `account_id` / `type` arrays (Dio default).
