## 2026-10-11 — qa debts explore (+ AppChip shots)
DONE · scripts: 16 in `ai/qa/` (lib ×5, pages ×3, flows ×7, run-debts.mjs; map in `ai/qa/README.md`) · last full run `node run-debts.mjs`: PASS 65 · FAIL 3, of which 1 was an intermittent that passed 3/3 in isolated reruns after a toast-wait was added (expected steady state PASS 66 · FAIL 2) · shots: `ai/qa/shots/2026-10-11/appchip-sizes-1.png` (AppChip, asked for; none for debts)
Env: BE :8080 + web :5181 (hash routes `/#/...`), user qlead657724. Debts walked: list · person page · debt detail · create · repay · edit · cancel · delete · link-to-contact.

### FAIL
- **debts/save-as-contact-noop** · /personal-debts/new → amount 12 → กับใคร → type a name → tap "บันทึกเป็นผู้ติดต่อ" → sheet closes and the name is applied → บันทึก → open /contacts. Expected: a contact is created (and the debt is linked to it). Actual: contacts list stays without that name (reproduced 4×; creating a contact via /contacts/new works and then shows).
- **debts/deleted-debt-generic-error** · open `/#/personal-debts/<id of a deleted debt>`. Expected: a "not found" message. Actual: "ข้อผิดพลาดที่ไม่คาดคิด / เกิดสิ่งที่ไม่คาดคิด กรุณาลองใหม่ / ลองอีกครั้ง" (retry cannot help) + a 404 in the console.

### NOTE (odd, not a hard FAIL — decide in the rework)
- **cancelled debt still shows คงค้าง ฿100.00** in its hero (status chip "ยกเลิก", grey); list row for that person says "ไม่มีค้าง · เคลียร์แล้ว". Expected 0 / hidden outstanding.
- **delete leaves the repayment txs**: delete a debt that had a repayment (฿31.37) → the "Debt Received +฿31.37" tx stays in /transactions (income unchanged). The delete dialog says only "ลบถาวร ย้อนกลับไม่ได้".
- **English system category** on repayment txs in the (Thai) transactions list: "Debt Received" / "Debt Paid" (BE seed names), plain "+" icon.
- **Wording**: More-page tile says "เขาติด ฿… · คุณติด ฿…" while the list cards say "ติดคุณ / คุณติด" (same numbers, different words).
- Person page "ประวัติ (n)" lists settled DEBTS (not repayments); the debt detail has no repayment list (both are in the rework scope).
- URL does not follow pushed pages: on the person page and the new-debt form the hash stays `/#/personal-debts`, so a browser refresh lands on the list.
- New-debt form: Cancel with typed data leaves at once, no discard confirmation.
- Edit mode: "ลบหนี้นี้" sits below the fold at 412x915 (half under the action bar until scrolled).
- Debt detail: คำอธิบาย / โน้ต show only their labels in the semantics tree (values not exposed; visible on screen) — a screen-reader gap.
- Intermittent (1 of ~6 runs): right after a repayment, opening edit mode and entering amount 200 (< repaid 250) → save showed no "ต้องไม่น้อยกว่ายอดที่คืนแล้ว" error. Not reproduced after waiting for the toast to clear; cause unknown.

### PASS 66 (steady state)
create 10 (form opens, amount/person required, cancel→list, owedToMe + iOwe saved with right hero, list shows both) · repay 13 (partial / half / overpay blocked "เกินยอดคงค้าง" / full → คืนครบแล้ว, repay button gone when paid, list hides cleared, person เคลียร์แล้ว, iOwe repay, income/expense txs created) · edit 8 (bar, repaid read-only, below-repaid rejected, amount saved, cancel discards) · cancel/delete 12 (dialogs, dismiss keeps, cancel → ยกเลิก + toast, no repay button, hidden from open list, delete removes from list) · person 11 (net hero, both debts, prefill from "บันทึกหนี้กับคนนี้", link sheet, link toast "ผูก 2 รายการ…", link row disappears) · list 12 (hero net = ติดคุณ − คุณติด, direction cards filter + toggle, status ทั้งหมด shows cleared, search match / no match, row → person, More tile numbers = hero).

### NOT VERIFIED
- Split debts from transactions and the "อัปเดตตาม" URL bug (no split data for this user).
- Multi-currency debts (currency tile), wallet-linked repayment (QA user has no wallets), repay/cancel on contact-linked debts, cancel of a debt that already has repayments (dialog says "ไม่มีเงินเคลื่อนไหว").
- Editing person / description / note in edit mode; quick-create (centre +) debt mode; dashboard หนี้สิน tile; notifications.
- Device-only: keyboard insets, system back, haptics.

## Handoff 2026-10-13
The local DB was replaced with a restore of PROD data: the QA users (qaa4858675 + linked qab/qac/qae, qlead657724) are GONE, so `ai/qa/` scripts that log in with them need a new local user first (register it on LOCAL via the app's register screen; never prod, never a real/owner account from the restore). Also delete `ai/qa/.auth/state.json`; set `QA_USER` / `QA_PASS` (defaults in `lib/browser.mjs`).
Gotchas:
- Start with `ai/qa/README.md` (page/flow → script map); `npm install` once; run `node run-debts.mjs` or one `flows/*.mjs`. Nothing was re-run after the restore.
- App uses HASH routes (`/#/route`); `goTo` = full reload, `hashTo` = in-app. Read the screen via semantics (`readScreen`), tap by coordinates; use exact RegExp for taps like `/^บันทึก$/` (substring matches hit titles).
- Only on-screen list rows are in the semantics tree: use search/`scrollTo`. Selectors that need fixing first after a UI change: `pages/debts.mjs` (debts), the other `pages/*.mjs` (contacts, categories, transactions, accounts, saving-goals, dev-widgets).
- Screenshots go to `ai/qa/shots/<date>/` (git-ignored); `fullPageShot` (lib/screen.mjs) = whole detail page cropped to content. Last-known open FAILs (debts): save-as-contact creates no contact; deleted-debt URL shows a generic error.

## 0.4.0-3 debt seed for ppond (sub-agent, 2026-10-21)

All PASS, no API errors. LOCAL only (localhost:8080). Backup: `chubi-pocket/backups/local-before-debt-seed-2026-10-21.dump` (160,605 B, pg_dump -Fc).
- User: ppond `01a0a9a9-35bf-75a3-b6b9-dbaf1bfbc49a` (only match). Auth: self-minted HS256 JWT (sub, jti, iat, exp, type=access; local secret), script in scratchpad only.
- Wallet: `test2` (type cash, `01a126da-be86-73e5-bb0c-00a6319c7d27`): 300 → 172 (−128 = +500 −400 −328 +100) PASS.
- A ลี ทดสอบ `c:01a15d77-444b-734d-b6fd-41e639113538`: net −230 (exp −230), days 23 (oldest open = 09-28, the 60 labelled paid), cleared null, open 2 / entries 4. Statement interleaved: rep +400, debt −70, debt −500 (tx 01a15d77-44c4…), debt −60 paid. PASS
- B มิ้นท์ ทดสอบ `c:01a15d77-45be-7211-bb85-3412f502dfb9`: net +64 (exp +64), days 9, cleared null. Split tx `01a15d77-45d6-7c4e-ac49-58e4b7329f87` (expense 328) → debt +164 source {transaction, Food Delivery}; rep −100. PASS
- C บอส ทดสอบ `c:01a15d77-4640-7506-9089-c48638f31a0a`: net +45, cleared_at 2026-08-20, days 3; current = 1 item (+45), earlier = 2 items (debt +150, rep −150 no wallet). PASS. Note: open_count 2 (the earlier-cycle 150 debt is not labelled paid; matches the open_count rule).
- D แบงค์ ทดสอบ `n:แบงค์ ทดสอบ` (typed name): net +300, days 50, cleared null. PASS
- Totals before → after: owed_to_me 1959.34 → 2368.34 (+409 = 64+45+300), i_owe 0 → 230, open_count 4 → 8, over_30_days_people 1 → 2 (แบงค์). PASS
- repayment_person on GET /transactions/{id}: set on all 3 repayments (ลี 400 expense, มิ้นท์ 100 income, บอส 150 income no wallet); null on the 500 debt-linked tx. PASS
- Observations (not bugs per spec): GET /transactions?counterparty_key=<มิ้นท์> lists only the 100 repayment, not the split bill (spec: debts' wallet txs + repayments; a split debt has no own tx). The POST /transactions response did not expose the id at top level or `.transaction.id` (id taken from DB).

## 0.4.0-3 debt seed #2 for ppond, NEW machine (Lead, 2026-10-23)
LOCAL only (localhost:8080, BE wip/0.4.0-3 3a7439b, migration 070). Made through the API as ppond (self-minted JWT, the secret is the docker-compose.yml JWT_SECRET; script in Lead's scratchpad). Backup first: `chubi-pocket/backups/local-before-debt-seed-2026-10-23.dump`.
- This machine's ppond is `019df2bb-3eb1-7b22-95d0-7d634888779d` (not the old machine's id). Wallets: เงินในธนาคาร (bank), เงินเงินเงิน (cash). The 2026-10-21 seed (ลี / มิ้นท์ / บอส / แบงค์) is NOT on this DB.
- Cases (net > 0 = ลูกหนี้, they owe me):
  - ต้น ทดสอบ +1,500: lent 2,000 from the bank (tx), got 500 back in cash.
  - ฝน ทดสอบ −1,700: borrowed 800 into cash (tx), plus a paid_by tx (ฝน paid my 900 movie ticket).
  - ป้าแดง +350: typed name, no wallet, 48 days old.
  - เบียร์ ทดสอบ +200: 600 lent and 600 back on 08-20 (labelled paid), then a new 200, so an earlier cycle.
  - โอ๊ต ทดสอบ +200: side flip; I owed 300 and paid 500.
  - มายด์ ทดสอบ 0: 6 rows both ways, cleared 10-12.
  - แจน ทดสอบ +400 and เอ็ม +400 (typed): a split dinner 1,200 from the bank.
  - บริษัท ทดสอบ +125,000.50: 100 days old, with a tx.
  - สมชายผู้มีชื่อยาวมาก…: −99, a long name.
  - Existing rows kept: Chalee (linked contact) +1,232 and test1 +20.
- Totals after: owed_to_me 129,302.50, i_owe 1,799, 9 receivable / 2 payable people, over_30_days_people 3.

## 0.4.0-3 recurring seed for ppond, NEW machine (Lead, 2026-10-23)
LOCAL only, through the API as ppond (script in Lead's scratchpad), then ONE direct SQL tweak: tracked_from = start_date on the 14 seeded rules, so past slots count as if the rules were set up months ago. Without it the BE tracks from the creation day and nothing before today is due. Same backup as the debt seed. A new wallet was added: บัตรเครดิต KTC (credit card, limit 50,000).
- Subscriptions:
  - Netflix 419/day 3 on the card: May–Sep recorded, Oct 3 DUE (ยืนยัน).
  - Spotify 129/day 21: auto-create, Jun–Oct recorded.
  - YouTube Premium 179/day 5: trial until Nov 5, starts Nov 5.
  - iCloud+ yearly 1,190 on Jan 15: Jan recorded.
  - ฟิตเนส 990/day 1 cash: Jul–Oct recorded, then PAUSED.
  - Disney+ 289/day 12: Mar–Jun recorded, then ARCHIVED.
- Installments:
  - ผ่อน iPhone 17 1,750/day 25, 12 installments: 4 recorded, next 5/12 on Oct 25.
  - ผ่อนโซฟา 2,500/day 10, 6 installments: all 6 recorded (finished).
- Reminders:
  - ค่าไฟ, no amount, day 23 cash: Jun–Sep 1,480 / 1,230 / 1,198 / 1,312; Oct 23 (today) รอใส่ยอด.
  - ค่าน้ำ, no amount, day 15: Aug 210, Sep SKIPPED, Oct 15 overdue without an amount.
  - ค่าเน็ตบ้าน 599/day 28: Jul marked PAID with no tx, Aug–Sep recorded.
  - อาหารแมว 350 every Saturday, auto: Oct 3/10/17 recorded.
  - โอนเข้าเงินเก็บ 5,000/day 1, TRANSFER bank → cash, auto: Sep–Oct recorded.
- Income:
  - เงินเดือน 35,000/day 30, auto: Jun–Sep recorded.
  - ค่าเช่าห้อง 6,500/day 5: Aug–Sep recorded, Oct 5 DUE (income overdue).
- Summary after: month_pay 4,707.01, month_receive 41,500, due_count 4, awaiting_amount_count 3, 15 current + 1 archived.
- BE note (not a bug?): occurrences before a rule's tracked_from never show as due, and GET /recurring/{id}/occurrences lists nothing before tracked_from. Past slots can still be written by slot (confirm / skip / mark-paid / PUT).

## 0.4.0-3 budgets / saving goals / events seed for ppond, NEW machine (Lead, 2026-10-23)
LOCAL only, through the API as ppond (scripts in Lead's scratchpad). Same backup as the debt seed. The owner's own rows were kept, so a few numbers include them, e.g. their 'กินหมูทะ' 23,123 in Groceries on 10-17.
- New wallet: บัญชีออมทรัพย์ (bank, track_balance on, opening 150,000) funds the goals. เงินในธนาคาร does not track its balance, so the BE refuses saving entries from it (WALLET_NOT_TRACKED).
- October spending added: 21 expense tx across dining / delivery / groceries / apparel / gadgets / transit / taxi / parking / dental / meds, plus 4 tx tagged ทริปเชียงใหม่ (10-10 → 10-13).
- Budgets (monthly unless noted):
  - อาหารและเครื่องดื่ม 6,000 (dining + delivery): ok, 3,210 used
  - เดินทาง 2,000: ok, 600
  - บิลและค่าสมาชิก 3,500: ok, 129 used + 1,018 expected from recurring
  - สุขภาพ 1,500 (warn at 70%): WARN, 1,300
  - ช้อปปิ้ง 3,000: OVER, 6,840
  - ของใช้ในบ้าน 3,000: OVER, 26,313
  - กาแฟรายสัปดาห์ 300, WEEKLY: over, 520
  - เงินสดในกระเป๋า 2,500, WALLET scope = cash: over
  - ใช้จ่ายทั้งเดือน 30,000, scope ALL: over
  - ทริปเชียงใหม่ 8,000, ONE-OFF 10-10 → 10-14, TAG scope: ended, 5,740
  - งบปีใหม่ (เก่า): ARCHIVED
  - Note: all=true ignores wallet_ids; a wallet-only scope needs all=false.
- Saving goals:
  - เที่ยวญี่ปุ่น 60,000 by 2027-04-30: behind, saved 23,000, auto 5,000 on day 1, got a 1,000 move-in
  - เปลี่ยนมือถือ 20,000 by 2027-08-31: ON TRACK, 12,000
  - ซื้อ MacBook 55,000 by 2026-12-31: behind, 17,000, after a 1,000 move OUT to ญี่ปุ่น
  - กองทุนฉุกเฉิน 100,000, no deadline: 48,500, after a 2,500 WITHDRAW; TWO auto-saves (monthly 3,000 savings + weekly Mon 500 cash)
  - เงินเก็บลูก: NO TARGET, 8,000, auto 2,000 on day 25
  - ของขวัญวันเกิดแม่ 3,000: REACHED
  - ดาวน์รถ: ARCHIVED holding 8,000
  - Note: a withdraw takes no wallet_id; the money stays in its wallet, unallocated.
- Events:
  - ทริปเชียงใหม่: 10-10 → 10-14, planned 20,000; members ต้น, ฝน (ad hoc) + Chalee (email, linked user); 5 bills by different payers, 2 marked; I'm owed 3,740
  - ปาร์ตี้วันเกิดบอส: upcoming 11-08, 1 bill
  - ค่าห้องแชร์ (ต.ค.): open-ended, both of us paid
  - ข้าวเที่ยงทีม: others paid, so I OWE 555
  - ทริปหัวหิน: Aug, COMPLETED, all bills marked
  - งานเลี้ยงรุ่น 2025: ARCHIVED
  - Note: bill splits must leave out the payer (SELF_SPLIT); an email member needs display_name too.

## 0.4.0-3 recurring seed #2: many due / awaiting / skipped (Lead, 2026-10-23)
9 more rules for ppond, all with auto_create off and tracked_from = start_date (SQL), so unrecorded past slots are DUE:
- Has an amount (รอยืนยัน):
  - ค่าส่วนกลางคอนโด 1,200/day 5: Jul / Sep / Oct due, Aug skipped
  - Apple Music 109/day 12 on the card: Aug / Sep / Oct due
  - ผ่อนประกันรถ 2,150 x10, day 18: Jun done, Jul skipped, Aug / Sep / Oct due
  - คอร์สภาษาอังกฤษ 3,500/day 2: Sep / Oct due
  - ค่าจ้างฟรีแลนซ์ +8,500/day 28: Aug done, Sep due (income)
- No amount (รอใส่ยอด):
  - ค่าโทรศัพท์ day 8: Jul 459, Aug due, Sep skipped, Oct due
  - จ่ายบัตรเครดิต KTC day 10: Aug / Sep / Oct due
  - ค่าแก๊ส day 20: Sep skipped, Oct due
  - เติมน้ำมันรถ every Sunday: 10-04 = 1,000, 10-11 skipped, 9-27 and 10-18 due
- Upcoming slots skipped in advance: Spotify 11-21, ค่าเน็ตบ้าน 10-28.
- Summary after: due_count 23, awaiting_amount_count 19, due_total 17,377.
- Note: an income rule needs amount > 0 (amount 0 → 400), so there is no amount-less income reminder.
- Cleanup on the owner's word (chubi-pocket-4c, 2026-10-23, SQL): Netflix back to a subscription with no end (it was installment ×12, which showed "งวด n/12"; its items' seq cleared). The owner's junk rule "กฟดหกดฟหกด" (฿10) and its legacy pending draft were already gone. ppond now has 24 recurring rules and no pending drafts. Full dump from before: in chubi-pocket-4c's scratchpad (full-before-cleanup.dump).

## Event seed #2: ปาร์ตี้วันเกิดบอส (Lead, 2026-10-23)
Through the API as ppond:
- Chalee (a linked app user, by email) added as a member.
- 4 event tags: อาหาร / ของขวัญ / ตกแต่ง / สถานที่.
- 8 more bills, payers แจน / เอ็ม / me / Chalee, split among everyone except บอส (the birthday person):
  - some split among only 2–3 people
  - 2 marked settled
  - 1 INCOME (a deposit refund 300)
  - notes on 2
- After: expense 9,110 vs planned 5,000 (OVER by 3,810), 9 bills, my paid 4,260 / share 2,530.
