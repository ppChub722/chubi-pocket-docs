# Debts redesign — one debt model for people, cards and loans

Status 2026-11-13: DESIGN v2, for the owner to read. Nothing built. Replaces v1 of this file (v1 made a loan a new wallet type: dropped, a loan is not a wallet).

Owner, 2026-11-13: "ต้อง re design หนี้ใหม่ทั้งหมด" · "หนี้รายบุคคลก็ตัดออก แล้วมาใช้แบบนี้ทั้งหมด แต่แค่หนี้รายบุคคลผูกกับ contact" · "อยากให้หน้าตามันเหมือนกัน" · a debt page reachable from both the debts list and the recurring list · "เรื่องดอกเบี้ยใส่แบบเต็มที่".

## The idea

**A debt is the object. Recurring is the tool that schedules its payments.** Every debt (a friend, a card installment, a car loan) has the same shape and the same detail page. The counterparty is what differs.

## Cases it must cover (the owner's own)

| Case | Counterparty | Direction | Amount | Terms |
|---|---|---|---|---|
| Phone on the card | card (KTC wallet) | I owe | 40,000 | 10 × 4,000, 0% or interest |
| Car loan | lender (text, no wallet) | I owe | e.g. 500,000 | monthly 18,000 = principal + interest |
| Lent my girlfriend | contact | owed to me | 10,000 | 5 × 2,000 monthly, 0% |
| Borrowed from a friend | contact | I owe | 500 | 2 installments, the first at month end, custom dates |
| Small running debts with a friend | contact | either | many small | none (open) |
| Card debt itself | card wallet | I owe | the card balance | the statement |

## The model

**Debt**
- `name` (ผ่อนโทรศัพท์, ผ่อนรถ, แฟนยืม), description, note (N/D/N rule).
- Counterparty, one of: a **contact** (or a typed person name), a **card** (credit_card / pay_later wallet), a **lender** (text: ธนาคาร…, ไฟแนนซ์…). Card and lender: "I owe" only.
- Direction: I owe / owed to me.
- Principal and start date.
- Terms: **open** (no schedule: the running debts of today) or **installments**:
  - count + amount, monthly on a day, **or** a custom list of dates and amounts;
  - interest: none · the bank's fixed installment (the split per installment is computed or typed) · flat rate (car loans) · reducing balance (house, later). Every installment's principal / interest can be edited to match the lender's own table.
- Status: active · paid off · closed early.

**Installments** (only for terms = installments): seq, due date, amount, principal, interest, status (upcoming · due · paid · skipped), the payment(s) that settled it.

**Payments** are transactions linked to the debt, each split into principal (reduces the debt) and interest (an expense, category ดอกเบี้ย). From a wallet when I pay, into a wallet when I am paid. A payment can differ from the plan; the remaining installments are recomputed (default: keep the amount, the last one absorbs the difference).

**Card-based debts are paid through the card's statement**, not one by one: buying the phone puts the full 40,000 on the card at once (the credit line drops like the bank's); each installment the card bills reduces what is left of the debt; its interest is an expense on the card; the owner pays the whole statement with "ชำระบัตร". So a card debt has no "pay from wallet" rule.

**Recurring rule (optional)** = the debt's schedule tool: reminds, and books a payment from / into the chosen wallet (the only place a lender-debt touches a wallet). Shown in the recurring list; tapping it opens **the debt page** (one page, two ways in).

## Pages

- **Debts list:** debt blocks (each debt), people grouped (a person row = that person's debts + their net, tap → the person page listing their debts). Totals: ฉันติดหนี้ · เขาติดฉัน · **this month to pay / to receive**.
- **Debt detail** (looks like the recurring detail today): hero = remaining, progress n/N, next installment (date, amount, principal / interest); a chart (remaining over time, principal vs interest paid); the schedule; the payments; the settings (terms, interest, the recurring payment rule); actions: record a payment, pay off early, edit an installment, skip / postpone.
- **Create:** from the debts page ("+ หนี้"), and from quick create when an expense on a card is marked "ผ่อน" (the phone case: the expense + the debt in one call).

## What the current personal debts do that the new model must take over

The `personal_debts` module is entries per person (`kind` debt | repayment, direction, amount, `due_date`, `paid`), with:
1. a running net per person and cycles (`cleared_at`);
2. debts made by split bills and event bills (papers, `personal_debt_bills`, `source_kind = paper`);
3. a linked partner copy in the other user's book (`counterpart_debt_id`, disconnect) — notify, never force (rule "ledger, not sync");
4. repayment transactions (`transactions.source_personal_debt_id`), the chatbot's debt intents, recurring kind `debt`, notifications.

Each must map onto a debt (open terms for today's entries) or be listed as dropped, before the old module goes.

## Phases (each deployable and reversible)

1. **Debt core + installments + the new pages.** Lender debts and card debts (incl. quick create "ผ่อน"), people debts with installments (the girlfriend, the 500 case). The debts list also shows today's people debts, unchanged, until phase 2.
2. **Move people debts in.** Migrate each person's entries to open debts with the contact; repayments to payments; papers, partner links, chatbot intents, recurring kind `debt`, notifications re-pointed. Rehearse on a prod snapshot first (real data since 2026-10-28; 6 users).
3. **Remove the old module** and its endpoints (forced app update, MIN_APP_BUILD).

## Open — the owner decides

1. Card debts paid through the statement (above), no per-debt payment rule. OK?
2. Interest methods in phase 1: none + the bank's fixed installment + flat; reducing balance later?
3. Debts list totals: ฉันติดหนี้ / เขาติดฉัน as one number each over people + cards + lenders, plus this month to pay / receive?
4. A person with several open debts pays back once: which debt gets it? (lead: the oldest first, the owner can pick)
5. A payment different from the plan: the last installment absorbs it (lead's pick) or re-spread over the rest?
6. Is this the main theme of the next version (0.4.3)?

## Not in scope (for now)

Floating rates, amortisation reports for tax, bank statement import, multi-currency debts.

## Related

- `now/briefs/savings-wallet-flag-plan.md` (built, not deployed).
- FirstChoice 2026-11-13: the 15 old plans end with the Nov statement; nothing to migrate.
