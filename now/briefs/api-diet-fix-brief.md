# Brief: API diet FIX, 0.4.0-4, Lead = chubi-pocket-d8

The owner's rules (2026-10-24):
- Opening a page = ONE API call.
- Go prepares everything the page needs.
- As few SQL queries as possible.
- **SQL first:** let Postgres do set-based work in one statement (CTEs, GROUP BY, window functions, `= ANY($ids)`), never one query per row / budget / rule.
- **Go only where SQL can't do it cleanly:** load ONE result set, then compute in memory. Never query in a loop.
- **No summary tables or materialized views for now:** measure first, then decide.
- The three root causes in the survey (F1, F2, F3) MUST be fixed.

Survey (read it first): `chubi-pocket-docs/team/reports/api-diet-survey-2026-10-24.md`

## Where
- Repos: `chubi-pocket-be`, branch `wip/0.4.0-4`. The FE package is `chubi-pocket-app`, same branch.
- Every request logs `db_queries` / `db_ms` (`internal/platform/database/querystats.go`). Measure before and after with it.
- How to measure locally: see `now/briefs/api-diet-survey-brief.md` (ppond token, docker logs).
- **No local BE rebuild or restart without asking Lead:** other work may be running on it. Lead deploys to the VPS; you never do.

## Work packages (file ownership, so they can run in parallel)

| WP | What | Owns |
|---|---|---|
| **WP1** | **F1 + F2**: DueCheck off every read; tz / language once per request | `internal/modules/recurring/**` (service.go today(), occ.go lang(), DueCheck), the DueCheck call sites in `notifications`, `me`, `dashboard`, `sync`, and a new per-request user-context helper in `internal/shared` |
| **WP2** | **F3**: budgets in one pass (list, detail, the totals used by `/me/counts` and `/dashboard`) | `internal/modules/budgets/**` (it may CALL recurring's expected-occurrences API, but not change it: ask WP1) |
| **WP3** | Smaller BE items in the survey ranking | unread-count as a plain count (1–2 q); `auth/middleware.go` reads only what it needs (no `password_hash`); debt person timeline built once (`personal_debts`); event detail in one pass (`projects`); wallet detail loaded once + no `include=summary` waste (`accounts`); saving-goals CTE once (`saving_goals`). Also the broken `GET /accounts/:id/summary` (404): add the route, or point the FE at what exists. Agree which with Lead first |
| **WP4** (Lead) | FE: **as few calls per page as possible** (owner 2026-10-24) | every page: ONE call on open; re-activation (tab switch / pop back / resume / reconnect) re-calls only when the page's data is older than **5 min** (owner 2026-10-25) (pull-to-refresh always reloads; own writes already patch + sync); recurring home: ONE call; event members / debt-linked tx detail: one call; budgets list: no reload on return; unread badge: no double start, polls only while the app is visible; `/app/version`: cold start only; fix the `/accounts/:id/summary` caller to match WP3 |

### WP1 details
- **DueCheck:** no reads may write. It runs at most once per user per LOCAL day, plus after recurring writes. The trigger is `POST /sync` (recurring set) or a cheap "last checked on <date>" guard. A GET only computes `due` from the stored state.
  - List every caller you change in your report.
  - Keep the behaviour of auto-create and notifications, just not on GETs.
- **tz / language:** resolve them ONCE per request, e.g. a middleware or the first use cached in the context, and pass them down. `recurring/service.go:39` today() and `recurring/occ.go:40` lang() must stop querying `user_preferences` per call.

### WP2 details
- One statement for all budgets' current periods.
- ONE expected-occurrences call for the widest window: everything it needs in a single call, not one call per budget.
- One grouped used-sum (`GROUP BY budget_id, period`, including event bills and the scope's category / wallet / tag rules).
- Category scope expansion: one recursive CTE for all budgets.
- `/me/counts` and `/dashboard` reuse the same one-pass result.

## Definition of done (every WP)
1. **Same JSON out:** compare responses before and after for ppond (`diff` the JSON). Any difference must be explained and agreed with Lead.
2. **Query count before → after** for each endpoint you touched, plus local ms. Target: a page endpoint at **≤ 10 queries**.
3. **A query-budget test per endpoint you touched:** a Go test that runs the handler on testdb with a few rows and asserts `db_queries <= N`, using the tracer through `database.WithQueryStats`. It is a ratchet: it fails if someone adds N+1 back.
4. `go vet ./...` clean, plus `go test` for your packages with `TEST_DATABASE_URL` set (see team/inbox/be.md). Say whether the DB tests actually ran.
5. **Don't commit:** report to Lead with the list of files you changed. Lead reviews, commits, deploys, and measures on the VPS.

## Rules
- Comments only when truly needed (1–2 lines, no history).
- Move code before rewriting it; the money results must not change.
- Stay inside your WP's files. If you need one outside them, ask Lead.
