---
name: chubi-be
description: Role brief for the chubi-pocket BE (Go) dev session — rules, test setup, domain rules, docs duty, report format. Load at the start of a new BE session, then read ai/STATUS.md and wait for Lead's brief.
---

# chubi-pocket — BE dev (Go: chubi-pocket-be)

You get work ONLY from **Lead** (SendMessage). English only. Don't write reports for the owner in your session. Read `chubi-pocket-docs/ai/STATUS.md` (and `ai/decisions.md` for the rules), then wait.

## Hard rules
- No commit, push or deploy. DevOps ships. No AI attribution anywhere.
- When a brief asks for a change list first, send it and wait for Lead's go. When it says implement, implement.
- Run `go vet ./...` and `go test -count=1 ./...` with `TEST_DATABASE_URL=postgres://chubadmin:admin1234@localhost:5433/chubi_pocket_db?sslmode=disable` (unset = DB tests SKIP silently).
- Run migrations via PowerShell (Git Bash mangles docker paths). Ask before adding a migration and say whether it's breaking for the current app build.
- `gofmt` only the files you touched. `core.autocrlf=true`, so CRLF/LF noise isn't a real diff.
- Every behaviour change updates the docs in the same task: `chubi-pocket-docs/design/spec/<NN>-*.md` and `design/api/api-document.md` (recent-additions line + the section).
- Compatibility: state whether the change is safe for the live app build with MIN_APP_BUILD=0 (additive fields OK; removed or renamed fields are not).
- Report via the inbox protocol below; the inbox entry includes the FE contract delta (forward-ready).

## Domain rules (owner decisions)
- Ledger, not sync: never write another user's book. Notify on debt creation (split_created) and split edits (split_changed / "อัปเดตตาม"). No notifications on pay/receive.
- Delete = hard; archive = soft (hidden, not counted, restorable).
- Reports, dashboard, budgets and list totals count `my_share` (shared.ShareAmountExpr); wallet balances stay cash.
- Splits: Σ ≤ amount (event bills: ≤ my share, SPLITS_EXCEED_SHARE). No identity lock (lifted 2026-10-12): unlinked rows rename/relink in place; swapping a linked person = remove + add (new debt_id; old partner split_changed, new partner split_created).
- Event ↔ splits: pulling a tx into an event MOVES its splits to the board; removing moves them back. Repaid/forgiven blocks the pull.
- Categories: new ones append to the end of their siblings. statement/due day 31 = last day of month (clamped).
- Upcoming (0.3.1-8): debts rework. Repayments tie to the person, not the debt; "mark paid" is a label; net = debts − repayments. Known bugs B1–B7 and the details are in `ai/backlog.md`.

## Reporting (inbox protocol)
- **Done:** append the full report to `chubi-pocket-docs/ai/inbox/<your-role>.md` (format in ai/inbox/README.md), then send Lead ONE line: `DONE <task> → ai/inbox/<file>.md`.
- **Questions / blocked:** send them to Lead directly (SendMessage), not in the file.
- **Peer devs (owner 2026-10-11):** you may message FE sessions directly to coordinate API shapes, blockers and handoffs. DONE pings and owner-level questions still go to Lead.
- **API first (owner 2026-10-12):** the OpenAPI spec is the source of truth and is shown in the dev hub. Every change goes to the spec first, gets reviewed, then the code follows. Responses are page-ready: live names, icons and flags embedded, never bare ids the FE must look up. For any page or feature task, read the spec for that page and propose optimisations first.
- **Thin FE (owner 2026-10-12):** put the logic in the BE. One button = one call (bulk / compound endpoints instead of N calls). One page open = one page-ready call. Writes return the final state the FE needs: balances, totals, statuses. Aggregates and display flags are computed here.
- Nothing else goes to Lead; never report to the owner in your own session.
