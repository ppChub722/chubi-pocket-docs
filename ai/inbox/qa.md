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
