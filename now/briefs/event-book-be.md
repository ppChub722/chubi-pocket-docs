# Event book: paybacks, "booked" flags, settle (BE spec)

**Status 2026-10-23: built by chubi-pocket-ad (Lead assigned it).** §1–§5 done, and one more: `POST /projects/:id/people` turns BillPerson[] into member ids, adding non-members. Tests are not run. A BE rebuild is needed (migration 072). §6 is not built.

Owner-approved 2026-10-23 (session chubi-pocket-ad, events). Mock: https://claude.ai/artifact/4TN8TnL66353GddKgjZduz

An event is a shared book. Any member records bills AND paybacks ("A paid B ฿300") for anyone. "Resolve" means copying my part into MY books (a tx and/or a debt). It can happen at any time, and it is linked so nothing is counted twice. FE (chubi-pocket-ad) builds against this contract now.

## 1. Payback rows (migration 072)
- `project_transactions.type` also allows `'payback'`. Change the CHECK on the type column.
- A payback has the same shape as a bill with one split:
  - **parent:** `type='payback'`, `transaction_member_id = from` (the one who paid back), `amount`, `date`, `note`, `description` (optional)
  - **one child:** `transaction_member_id = to`, `amount = parent.amount`
- **Create:** the existing `POST /projects/:id/project-transactions` with `type: "payback"` and `splits: [{member_id: <to>, amount}]`.
  - Validate: exactly 1 split, split amount == amount, to != from.
  - `tag_ids` are ignored.
  - No auto-copy (`AutoResolveOwnInProjects`) for paybacks.
  - The "recorded for you" notification is fine.
- **Update** (`PUT .../:pt_id`):
  - Changing `amount` without `splits` moves the child with it.
  - For paybacks only, allow changing `transaction_member_id` (from) and `splits[0].member_id` (to). The FE has a swap button.
- **Copy:** `POST .../:pt_id/copy` on a payback is refused with 422 `PAYBACK_NOT_COPYABLE`.

## 2. Numbers
- **Unchanged (still expense only):** `total_expense`, `by_tag`, budgets, `my_paid`, `my_share`, `ShareAmountExpr`.
- **`summary.transaction_count`:** don't count paybacks.
- **Positions** (`loadSummary`, views.go ~214):
  - `net = paid - share + sent - received`
  - `sent` = Σ payback parents by from; `received` = Σ payback children by to
  - Add `sent` and `received` to `EventPosition` (json `sent`, `received`).
  - `receivable` / `payable` follow the new net.
- **`my_net`** (`loadEvents`, views.go ~44): count `type IN ('expense','payback')`. The child-based formula is already right for paybacks.

## 3. "Booked" flag (replaces marks as the ✓)
- `BoardRow.my_booked` (bool) is true when my part of this row is already in my books. That means any of:
  - the row is linked to my tx (`linked_transaction_id` is mine)
  - one of my txs has `source_project_transaction_id` = the row or one of its children
  - one of my debts has `source_project_transaction_id` = the row
  - (payback) one of my repayment txs has `source_project_transaction_id` = the row
- One batched query per board page.
- Marks stay in the API. The FE stops using them.

## 4. Repayment linked to a payback
- `POST /personal-debts/people/:key/repayments` gets an optional `bill_id` (a payback row in an event where I'm an active member).
- With `bill_id`, the repayment tx also gets `transactions.source_project_transaction_id = bill_id` and `project_id`.
- If the tx code keeps `source_project_transaction_id` and `repay_*` exclusive, relax that for repayments.

## 5. Settle: `GET /projects/:id/settle`
```
{ "pairs":      [{ "from": MemberRef, "to": MemberRef, "amount": 200 }],
  "simplified": [{ "from": MemberRef, "to": MemberRef, "amount": 300 }] }
```
- `from` owes `to`.
- **pairs:** over `expense` + `payback` parents. Each child where child.m != parent.m means child.m owes parent.m `child.amount`. Net each unordered pair and keep amounts > 0.005.
- **simplified:** greedy over the member nets (largest debtor pays largest creditor), so there are the fewest transfers.
- Archived events: read only.

## 6. Later (not in this round)
- A per-member event setting "แก้บิลที่ลงบัญชีแล้ว": ask (default) / always / never.

## Docs
openapi.yaml (projects schemas, the repayments request), spec 10, api-document.md.
