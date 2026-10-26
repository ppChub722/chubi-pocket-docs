# Brief: API diet survey, 0.4.0-4 (owner 2026-10-24), from Lead chubi-pocket-d8

0.4.0-4 = optimize FE + BE. The owner's rule:
- **Opening a page = ONE API call.**
- **Go prepares everything** the page needs.
- **As few SQL queries as possible.**

Your job is a **survey only**: measure every page, then write a ranked report. **Change no code.**

## Background (already done)
- The BE logs every request with `db_queries` and `db_ms` (a pgx tracer, commit `092e62e` on be `wip/0.4.0-4`).
- The prod VPS runs it. The local BE runs the same code.
- Home is "Coming Soon" now, with no call; skip it.
- Fixed: the `pg_timezone_names` scan in every query.
- Known so far (local, user ppond):

  | endpoint | queries |
  |---|---|
  | `/dashboard` | 136 |
  | `/me/counts` | 119 |
  | `/budgets` | 92 |
  | `/notifications/unread-count` | 11 |
  | `/transactions` | 10 |
  | `/personal-debts/people` | 4 |

- The cause in budgets is N+1. Each budget runs about 8 queries: recurring "expected", event bills, category / wallet scope expansion, the used sum.

## How to measure

### 1. FE: what a page calls on open
- Read the page and its cubit / repository code. List the endpoints fired on open; actions don't count.
- Cross-check with `chubi-pocket-app/lib/hub/api/page_flows.dart`. It is the TARGET, so note where the code differs from it.
- Also note app-wide calls that run when the app starts or a tab switches, and are not from the page:
  - the shell
  - the More page counts
  - the unread badge
  - sync
  - the version check

### 2. BE: queries per endpoint, LOCAL
- The BE is at `http://localhost:8080/api/v1`. Docker Desktop must be running; the containers are `chubi_pocket_app` and `chubi_pocket_db`. **Do not rebuild or restart the BE.**
- Token for user ppond, from Python:
  ```
  import sys
  sys.path.insert(0, r"C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Documents-chubi-pocket\22a174c3-a624-4044-a960-630c26110f25\scratchpad")
  import seed_api
  print(seed_api.TOKEN)
  ```
  It is a self-minted JWT and lasts 1 h.
- Send the headers `Authorization: Bearer <token>` and `X-Timezone: Asia/Bangkok`.
- Read the counts from `docker logs chubi_pocket_app --since 1m 2>&1 | grep "HTTP Request"`. Each line has `path=… latency_ms=… db_queries=… db_ms=…`.
- To see WHICH statements repeat, turn statement logging on for ONE call, then reset it:
  ```
  docker exec chubi_pocket_db psql -U chubadmin -d chubi_pocket_db -qc "ALTER SYSTEM SET log_statement='all'" -c "SELECT pg_reload_conf()"
  ```
  Afterwards run `ALTER SYSTEM RESET log_statement` and reload again.
- Group what `docker logs chubi_pocket_db --since 15s` shows.

### 3. Timing on the real box (VPS)
- Base URL: `https://chubipocket-api.ppforge.dev/api/v1`.
- Use the token in `...\scratchpad\seed_prod\state.json` (key `token`). This is the prod test user `tester`.
- **GET only. Never write to prod.**
- Use the `-w "%{time_total}"` of curl. Lead can read the VPS meter lines for you if you need them.

## Pages (from `chubi-pocket-docs/ref/app-map.md`), in this order
1. transactions list + transaction detail
2. wallets (accounts) list + wallet detail
3. More (เพิ่มเติม)
4. debts list + person page + entry detail
5. budgets list + budget detail
6. saving goals list + goal detail + spare
7. recurring (ต้องจัดการ / calendar) + recurring detail
8. events list + event detail
9. contacts, categories, tags, notifications, pending, settings / profile

## Report
Write `chubi-pocket-docs/team/reports/api-diet-survey-2026-10-24.md`, in English:
- **A table per page:** the endpoints called on open, and for each one: queries (local), local ms, VPS ms, and the statement shapes that repeat (N+1).
- **A ranked list of the worst endpoints,** with a one-line fix idea for each, e.g. "compute all budgets in one pass: one query grouped by budget".
- **The app-wide startup calls,** and whether each one is needed.
- **Pages that break the one-call-on-open rule.**

Send Lead (chubi-pocket-d8) a SHORT message after each page, or after every 2–3 pages: the page and its worst number. The full detail goes in the report.

## Rules
- No code changes and no commits.
- No BE rebuild or restart, local or VPS.
- No writes to prod.
- If a step needs something you don't have, ask Lead.
