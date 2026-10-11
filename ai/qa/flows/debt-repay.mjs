// Flow: record repayments (partial, half, overpay blocked, full) on owedToMe + iOwe debts; check status,
// progress, list/person state and the resulting transactions.
// node flows/debt-repay.mjs
import { launch } from '../lib/browser.mjs';
import { ensureLoggedIn } from '../lib/auth.mjs';
import { readScreen, tapText, tapAt } from '../lib/screen.mjs';
import { goTo } from '../lib/nav.mjs';
import { check, note, report, has, uniq } from '../lib/check.mjs';
import { L, REPAY, DETAIL, createDebt, repay, openList, openPerson } from '../pages/debts.mjs';

const { browser, ctx, page, consoleErrors } = await launch();
await ensureLoggedIn(page, ctx, '/personal-debts');

// ---------- owedToMe 400 ----------
const p = uniq('QA Repay');
await createDebt(page, { amount: 400, person: p, description: 'repay flow' });
let s = await readScreen(page);
check('repay/initial-open', has(s, 'ค้างอยู่') && has(s, '+฿400.00'), 'new debt should be ค้างอยู่ +฿400.00');

await repay(page, { amount: 100 });
s = await readScreen(page);
check('repay/partial-100', has(s, '+฿300.00') && has(s, 'คืนแล้ว ฿100.00 จาก ฿400.00'), `after 100: ${s.find((l) => l.includes('คงค้าง'))}`);
check('repay/partial-toast', has(s, 'บันทึกการคืนเงินแล้ว'), 'no "บันทึกการคืนเงินแล้ว" toast');
check('repay/partial-still-open', has(s, 'ค้างอยู่'), 'status should stay ค้างอยู่');

await repay(page, { mode: 'half' });
s = await readScreen(page);
check('repay/half-of-outstanding', has(s, '+฿150.00') && has(s, 'คืนแล้ว ฿250.00 จาก ฿400.00'), `after half: ${s.find((l) => l.includes('คงค้าง'))}`);

// overpay is blocked inside the sheet
await tapText(page, DETAIL.repayBtn); await page.waitForTimeout(1000);
await tapAt(page, ...REPAY.amount); await page.keyboard.press('Control+A'); await page.keyboard.type('500');
await tapText(page, REPAY.confirm); await page.waitForTimeout(1200);
s = await readScreen(page);
check('repay/overpay-blocked', has(s, /^เกินยอดคงค้าง/), 'amount > outstanding must show "เกินยอดคงค้าง (฿…)"');
await tapText(page, REPAY.full); await tapText(page, REPAY.confirm); await page.waitForTimeout(1800);
s = await readScreen(page);
check('repay/full-closes', has(s, 'คืนครบแล้ว') && has(s, 'คงค้าง') && has(s, '฿0.00'), `after full: ${s.find((l) => l.includes('คงค้าง'))}`);
check('repay/no-repay-button-when-paid', !has(s, DETAIL.repayBtn), 'repay button still shown on a settled debt');

// list + person
await openList(page); await page.waitForTimeout(900);
s = await readScreen(page);
check('repay/list-person-cleared-hidden-by-default', !has(s, p), 'cleared person should be hidden under the default "ค้างอยู่" filter');
await openPerson(page, p);
s = await readScreen(page);
check('repay/person-cleared', has(s, 'เคลียร์แล้ว'), `person page: ${s.slice(4, 9).join(' | ')}`);

// ---------- iOwe 200 ----------
const q = uniq('QA Iowe');
await createDebt(page, { direction: 'iOwe', amount: 200, person: q });
await repay(page, { amount: 50 });
s = await readScreen(page);
check('repay/iOwe-partial', has(s, '−฿150.00') && has(s, 'คืนแล้ว ฿50.00 จาก ฿200.00'), `iOwe after 50: ${s.find((l) => l.includes('คงค้าง'))}`);

// transactions created
await goTo(page, '/transactions'); await page.waitForTimeout(1200);
s = await readScreen(page);
check('repay/tx-income-row', has(s, /Debt Received.*\+฿100\.00|Debt Received/), 'no "Debt Received" tx row');
if (has(s, 'Debt Received') || has(s, 'Debt Paid') || has(s, 'Debt Repaid')) {
  note('tx/english-system-category-name', 'repayment txs show the system category in English ("Debt Received"/…) in a Thai UI');
}
check('repay/no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
await browser.close();
const { fail } = report();
process.exit(fail ? 1 : 0);
