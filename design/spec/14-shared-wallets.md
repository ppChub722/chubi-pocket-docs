# 14 — Shared Wallets (multi-member accounts)

A shared wallet is **an account with more than one active member**. Same
entity, same page, same balance, same `transactions` rows as a personal
account — the only new dimension is membership. Any wallet can become
shared at any time, and sharing moves **zero data**: it is purely a
permission change.

References: `accounts` (the entity being extended), `transactions`
(unchanged — wallet rows are ordinary transactions), `categories`
(rows always use the author's own categories).

Global conventions in [`overview.md`](overview.md).

> **Naming:** code/API say `account`; every user-facing surface says
> **wallet / กระเป๋า**. See [design-decisions.md](design-decisions.md)
> §Display term "wallet".

---

## 1. The model

### 1.1 One entity, one new dimension

```
account "KBank"        → members: [me]            personal (today's behavior)
account "House wallet" → members: [me, partner]   shared
```

`account_members` exists for **every** account; a personal account simply
has a single `owner` row. Sharing is not a type flag — it's the member
count. Any wallet can be created shared from the start *or* converted
later by inviting someone; both paths are the same operation (insert a
member row).

### 1.2 Wallet rows are ordinary transactions

There is **no separate shared ledger**. A transaction logged against a
shared wallet is a normal `transactions` row:

- `account_id` = the wallet. The wallet's ledger view = all rows on that
  `account_id`, regardless of author (`idx_transactions_account_date`
  already serves this).
- `user_id` = **the author** (whoever logged it). Nobody ever writes into
  someone else's book; authorization on write stays "is this my row +
  am I an active member of this account".
- `category_id` = from **the author's own category set** (normal FK).
  Other members see the category rendered read-only (server denormalizes
  name + icon_code in responses).
- `accounts.balance` stays the cached sum maintained by the transaction
  service (§03 rule), regardless of which member wrote.

**Contribution = a plain transfer.** "ลงขัน ฿2,000" is `type='transfer'`
from the member's personal account to the wallet, paired by
`transfer_group_id` — existing machinery, no new type. Transfers are
already excluded from expense reports, which is exactly the
double-count guard reports need.

**Scheduled transactions may target a shared wallet** like any other
account _(decided 2026-09-11)_ — generated rows are authored by the
schedule's owner, same as manual rows.

### 1.3 The instant-resolve invariant

A transaction is *resolved* when it is attached to a place money lives
(an account). Shared wallets are money containers, so wallet rows are
final the moment they're saved:

| Ledger | Money container | State when logged |
|---|---|---|
| Personal transaction | own account | resolved immediately |
| **Shared-wallet transaction** | **the wallet itself** | **resolved immediately** |
| Project transaction | none (a project is a board, not money) | pending until the user resolves it into their own account |

Projects keep their board + resolve flow and are untouched by this
module. Long-running shared money (couple, household) lives here;
time-bounded coordination (trips) stays in projects.

---

## 2. Rules of co-ownership _(decided 2026-09-11)_

1. **Author owns the row.** `user_id` = who logged it; the category on a
   row always belongs to the row's author (FK-enforced).
2. **Members are co-owners of the ledger.** Any *active* member may
   create rows, and edit or delete **any** member's rows — except
   `category_id`, which only the row's author may change (their
   taxonomy). All edits are audited (`updated_by_user_id`).
3. **Leaving locks your rows.** When a membership ends (`left_at` set),
   the ex-member's rows on that wallet become **read-only for them** —
   they still see their own history in their book, but can no longer
   move the wallet's numbers. Remaining members can still edit those
   rows (except category, frozen with the inactive author).
4. **Membership is append-only history.** Rows are never deleted; a user
   may hold multiple join/leave cycles. Settling money on exit is the
   members' own business via ordinary transactions.
5. **Wallet deletion requires sole membership.** An account with other
   active members cannot be deleted or archived away; the owner must be
   the only active member. An owner leaving a still-shared wallet must
   transfer ownership first (reuse the project transfer-ownership
   pattern).

---

## 3. Schema

**No new columns on `transactions`. No new ledger table.** One new table:

### 3.1 `account_members`

| Column | Notes |
|---|---|
| `id` | UUID v7 PK |
| `account_id` | FK → `accounts`, NOT NULL |
| `user_id` | FK → `users`, NOT NULL |
| `role` | `'owner'` \| `'member'` |
| `report_scope` | `'none'` \| `'own'` \| `'all'` — see §5 |
| `joined_at` | TIMESTAMPTZ NOT NULL |
| `left_at` | TIMESTAMPTZ NULL — set on leave; row never deleted |
| audit columns | per convention |

Backfill: one `owner` row per existing account with
`report_scope='all'` (preserves today's behavior exactly — a personal
wallet fully counts in its owner's reports).

Active membership = `left_at IS NULL`. Full column definitions land in
[`../database/schema.md#14--shared-wallets`](../database/schema.md) §14
(migration 039+).

---

## 4. Sharing a wallet (conversion)

Inviting the first additional member converts a personal wallet into a
shared one. Because wallet rows were ordinary transactions all along,
**the new member sees the wallet's entire history immediately** — no
migration, no special cases. That visibility is significant, so the
invite is gated by an explicit warning:

```
⚠️ เชิญ "แฟน" เข้ากระเป๋านี้?

กระเป๋า KBank จะกลายเป็นกระเป๋าร่วม:
• แฟนจะเห็นรายการทั้งหมดที่ผ่านมาของกระเป๋านี้ (ย้อนหลังทุกรายการ)
• ทั้งสองคนเพิ่ม/แก้/ลบรายการได้
• กระเป๋านี้จะถูกเอาออกจากรายงานส่วนตัวอัตโนมัติ (เปิดกลับได้ในตั้งค่า)

            [ยกเลิก]  [ส่งคำเชิญ]
```

On conversion, `report_scope` is auto-set to `'none'` for **every**
member (including the owner) — the auto tick-out. Each member can turn
it back on for themselves at any time (§5). New members join with
`'none'`.

---

## 5. Reports: per-member `report_scope`

Each member controls whether the wallet's activity appears in their
*personal* report surfaces (summaries, dashboard, budgets):

| Value | Meaning |
|---|---|
| `'none'` | wallet activity hidden from my reports (default once shared) |
| `'own'` | only rows I authored count in my reports |
| `'all'` | every row on this wallet counts in my reports |

- The wallet's own page always shows the full ledger regardless of this
  setting — `report_scope` shapes *personal* aggregates only.
- Transfers (contributions) are excluded from expense totals by existing
  type rules — no double count between "my top-up" and "wallet spending".
- Budgets follow the same predicate: with `'own'`/`'all'`, wallet rows I
  authored roll into my category budgets (they carry my categories);
  other members' rows can't match my categories and only affect totals.
- **Ex-members keep the toggle, capped at `'own'`** — they can show/hide
  their own historical rows in their reports, but `'all'` is no longer
  available (no read access to the wallet).

**Engineering guardrail:** the report-scope filter must be implemented as
**one shared predicate helper** (store-level function or SQL view) that
every aggregate query goes through — list, summary, budgets, export,
dashboard. Inlining the filter per-query is how a forgotten clause
silently corrupts one report and not the others. This is a code-review
blocking rule for this module.

---

## 6. API (sketch — contracts to `../api/api-document.md` at implementation)

```
GET    /v1/accounts                        — gains members[] (active) per account
POST   /v1/accounts/:id/members            — invite (triggers conversion warning client-side)
DELETE /v1/accounts/:id/members/:member_id — leave / remove (sets left_at)
POST   /v1/accounts/:id/transfer-ownership — required before an owner leaves a shared wallet
PUT    /v1/accounts/:id/report-scope       — {report_scope} for the caller's own membership
```

Transactions endpoints are reused as-is; their authorization gains one
clause: writes to an account require active membership, and edits to
another member's row exclude `category_id`. Wallet deletion/archival is
rejected with `409` while other active members exist.

---

## 7. Design decisions

### Why no separate ledger table

An earlier draft (v0.1) put shared rows in a `shared_transactions` table
with snapshot categories. The requirement that **any wallet can convert
to shared with full history visible** killed it: history lives in
`transactions`, so a separate table forces either a destructive
migration (breaks `transfer_group_id` pairs, rewrites the owner's book)
or a permanent two-era union ledger. Single-table makes conversion a
pure permission flip and hands contribution the existing transfer
machinery for free. The costs — author-only category edits and the
report-scope predicate discipline (§5) — are accepted.

### Rejected alternatives (decision log, 2026-09-11)

| Model | Why rejected |
|---|---|
| Separate `shared_transactions` ledger + snapshot categories (v0.1 of this spec) | see above — conversion with full history made it strictly worse |
| Wallet inside projects (fund tab) | households aren't time-bounded coordination |
| Main-owner shared account (members write into owner's book, owner's categories) | asymmetric; large cross-book authz surface; author-owned rows keep books clean instead |
| Sync/fan-out mirror rows into every member's book | fan-out in the money write path + mapping inbox; `report_scope='own'/'all'` gives the report visibility without duplicating rows |
| Per-viewer category overrides on shared rows | two members must see the same book; author's category rendered read-only is the single truth |

### Contribution is not a first-class type

Plain `type='transfer'` + `transfer_group_id`. Transfers already stay
out of expense reports; a dedicated type would just re-implement that.

---

## 8. Open questions

1. ~~Invite mechanics~~ — **resolved 2026-09-11**: notification pattern,
   same as project member invites. No dedicated `account_invites` table.
2. ~~Scheduled transactions targeting a shared wallet~~ — **resolved
   2026-09-11**: always allowed; generated rows authored by the
   schedule's owner (see §1.2).
3. Wallet activity notifications ("แฟนจดค่าไฟ 1,240") — confirmed for the
   Phase 2 notification trigger batch (not a question, a queued task).
4. Currency — wallet has one fixed currency (THB in Phase 1 era);
   revisit with Phase 2 multi-currency.

---

## 9. Status

- **Phase** — designed, not scheduled (candidate: post-VPS deploy /
  alongside Phase 2)
- **Last updated** — 2026-09-11
- **Version** — 0.2 (major rework: dropped the separate
  `shared_transactions` ledger — wallet rows are ordinary `transactions`
  authored per member; added co-ownership rules 1–5, conversion warning
  flow, per-member `report_scope` (`none/own/all`), ex-member row
  locking, sole-member deletion rule)
- **Version 0.1** — initial spec: separate snapshot ledger (superseded)
