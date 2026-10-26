// Flow: cancel ("ยกเลิกหนี้นี้" = write-off, keeps the record) and delete ("ลบหนี้นี้" = hard delete) a debt.
// node flows/debt-cancel-delete.mjs
import { launch } from '../lib/browser.mjs';
import { ensureLoggedIn } from '../lib/auth.mjs';
import { readScreen, tapText, tapAt } from '../lib/screen.mjs';
import { check, note, report, has, uniq } from '../lib/check.mjs';
import { goTo } from '../lib/nav.mjs';
import { L, DETAIL, createDebt, repay, cancelDebt, deleteFromEdit, openList, openDetail } from '../pages/debts.mjs';

const { browser, ctx, page, consoleErrors } = await launch();
await ensureLoggedIn(page, ctx, '/personal-debts');

// ---------- cancel (no money moved) ----------
const a = uniq('QA Cancel');
const idA = await createDebt(page, { amount: 100, person: a });
await cancelDebt(page, { confirm: false });
let s = await readScreen(page);
check('cancel/dialog', has(s, 'ยกเลิกหนี้นี้?'), `dialog: ${s.slice(0, 6).join(' | ')}`);
await tapText(page, /^ยกเลิก$/); await page.waitForTimeout(700);          // dismiss
s = await readScreen(page);
check('cancel/dialog-dismiss-keeps-open', has(s, 'ค้างอยู่'), 'dismissing the dialog must leave the debt ค้างอยู่');
await cancelDebt(page);
s = await readScreen(page);
check('cancel/status-cancelled', has(s, /^ยกเลิกหนี้แล้ว$/) || has(s, 'ยกเลิก'), `after cancel: ${s.find((l) => l.includes(a))}`);
check('cancel/toast', has(s, 'ยกเลิกหนี้แล้ว'), 'no "ยกเลิกหนี้แล้ว" toast');
check('cancel/no-repay-button', !has(s, DETAIL.repayBtn), 'cancelled debt still offers repay');
const outstanding = s.find((l) => l.startsWith('แก้ไข') || l.includes('คงค้าง')) || '';
if (/คงค้าง.*฿100\.00/.test(outstanding)) {
  note('cancel/outstanding-shown-on-cancelled', `cancelled debt hero still shows "คงค้าง ฿100.00" (expected 0 or hidden): ${outstanding}`);
}

// list: cancelled debt does not count
await openList(page); await page.waitForTimeout(900);
s = await readScreen(page);
check('cancel/hidden-from-open-list', !has(s, a), 'cancelled debt person still listed under "ค้างอยู่"');

// ---------- delete (with a repayment) ----------
const b = uniq('QA Delete');
const idB = await createDebt(page, { amount: 80, person: b });
await repay(page, { amount: 31.37 });
await deleteFromEdit(page, { confirm: false });
s = await readScreen(page);
check('delete/dialog', has(s, 'ลบหนี้นี้?'), `dialog: ${s.slice(0, 6).join(' | ')}`);
await tapText(page, /^ยกเลิก$/); await page.waitForTimeout(700);
s = await readScreen(page);
check('delete/dialog-dismiss-keeps-debt', has(s, b) || has(s, 'ลบหนี้นี้'), 'dismiss should keep the debt');
await tapText(page, DETAIL.deleteInEdit).catch(() => {});
await page.waitForTimeout(700);
await tapText(page, /^ลบ$/); await page.waitForTimeout(2000);
s = await readScreen(page);
check('delete/leaves-detail', has(s, 'ลบหนี้แล้ว') || !has(s, 'ยอดเต็ม'), `still on the debt page: ${s.slice(0, 6).join(' | ')}`);
await openList(page); await page.waitForTimeout(900);
s = await readScreen(page);
check('delete/gone-from-list', !has(s, b), 'deleted debt person still in list');
const errsBefore = consoleErrors.length;               // the 404 below is expected, not counted
await openDetail(page, idB); await page.waitForTimeout(1500);
s = await readScreen(page);
check('delete/detail-after-delete-gone', !has(s, 'ยอดเต็ม'), 'deleted debt detail still opens');
check('delete/detail-not-found-message', has(s, /ไม่พบ/), `opening a deleted debt shows a generic error, not "not found": ${s.slice(4, 8).join(' | ')}`);
consoleErrors.length = errsBefore;
// the repayment tx (unique amount ฿31.37) of the deleted debt
await goTo(page, "/transactions"); await page.waitForTimeout(1500);
s = await readScreen(page);
if (s.some((l) => l.includes("31.37"))) {
  note("delete/repayment-tx-remains", "after deleting a debt that had a ฿31.37 repayment, that repayment tx is still in the transactions list");
}

check('cancel-delete/no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
await browser.close();
const { fail } = report();
process.exit(fail ? 1 : 0);
