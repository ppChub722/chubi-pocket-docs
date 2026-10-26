// Flow: edit a debt (amount / description / note / person), validation vs repaid amount, undo, cancel.
// node flows/debt-edit.mjs
import { launch } from '../lib/browser.mjs';
import { ensureLoggedIn } from '../lib/auth.mjs';
import { readScreen, tapText, tapAt, waitGone } from '../lib/screen.mjs';
import { check, note, report, has, uniq } from '../lib/check.mjs';
import { L, DETAIL, createDebt, repay, openEditMode } from '../pages/debts.mjs';

const { browser, ctx, page, consoleErrors } = await launch();
await ensureLoggedIn(page, ctx, '/personal-debts');

const p = uniq('QA Edit');
const id = await createDebt(page, { amount: 500, person: p, description: 'before' });
await repay(page, { amount: 250 });
await waitGone(page, 'บันทึกการคืนเงินแล้ว');   // the toast can cover the edit bar's save button

// edit mode shows the edit action bar + delete
await openEditMode(page);
let s = await readScreen(page);
check('edit/edit-mode-bar', has(s, L.cancel) && has(s, L.save), 'edit mode: expected ยกเลิก + บันทึก bar');
check('edit/delete-available', has(s, DETAIL.deleteInEdit), 'edit mode: expected "ลบหนี้นี้"');
check('edit/repaid-readonly', has(s, 'คืนแล้ว'), 'repaid row missing in edit mode');

// amount below the repaid amount is rejected
await tapAt(page, ...DETAIL.editAmount); await page.keyboard.press('Control+A'); await page.keyboard.type('200');
await tapText(page, L.save); await page.waitForTimeout(1200);
s = await readScreen(page);
check('edit/below-repaid-rejected', has(s, /ต้องไม่น้อยกว่ายอดที่คืนแล้ว/), 'amount 200 < repaid 250 must show "ต้องไม่น้อยกว่ายอดที่คืนแล้ว (฿250.00)"');

// valid change: amount 600 → saved, outstanding = 350
await tapAt(page, ...DETAIL.editAmount); await page.keyboard.press('Control+A'); await page.keyboard.type('600');
await tapText(page, L.save); await page.waitForTimeout(1800);
s = await readScreen(page);
check('edit/amount-saved', has(s, 'คืนแล้ว ฿250.00 จาก ฿600.00') && has(s, '+฿350.00'), `after edit: ${s.find((l) => l.includes('คงค้าง'))}`);
check('edit/left-edit-mode', !has(s, L.save), 'still in edit mode after save');

// cancel an edit discards it
await openEditMode(page);
await tapAt(page, ...DETAIL.editAmount); await page.keyboard.press('Control+A'); await page.keyboard.type('999');
await tapText(page, L.cancel); await page.waitForTimeout(1200);
s = await readScreen(page);
check('edit/cancel-discards', has(s, '฿600.00') && !has(s, '฿999.00'), `after cancel: ${s.find((l) => l.includes('ยอดเต็ม'))}`);
if (has(s, 'ยกเลิกแก้ไข') || has(s, 'ละทิ้ง')) note('edit/cancel-confirm-dialog', 'a discard dialog appeared');

check('edit/no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
console.log('ID', id);
await browser.close();
const { fail } = report();
process.exit(fail ? 1 : 0);
