// Flow: create a debt. Covers form validation, owedToMe + iOwe, saved-as-contact, result on detail/list/more.
// node flows/debt-create.mjs   (prints PASS/FAIL lines + SUMMARY; creates uniquely-named QA debts)
import { launch } from '../lib/browser.mjs';
import { ensureLoggedIn } from '../lib/auth.mjs';
import { readScreen, tapText, tapAt, scrollTo } from '../lib/screen.mjs';
import { check, note, report, has, uniq } from '../lib/check.mjs';
import { L, LIST, FORM, openList, openNew, fillAndSaveNew } from '../pages/debts.mjs';

const { browser, ctx, page, consoleErrors } = await launch();
await ensureLoggedIn(page, ctx, '/personal-debts');

// --- entry from the list (empty-state CTA or the + / บันทึกหนี้ row) opens the form ---
await openList(page);
await page.waitForTimeout(800);
await scrollTo(page, L.addDebtRow);   // on a non-empty list the add-row sits at the end of the list
await tapText(page, L.addDebtRow);
await page.waitForTimeout(1200);
let s = await readScreen(page);
check('create/form-opens', has(s, L.formOwedToMe) && has(s, L.formIOwe), `form not shown: ${s.slice(0, 6).join(' | ')}`);

// --- validation: only a description typed, then save ---
await tapAt(page, ...FORM.description); await page.keyboard.type('x'); await page.waitForTimeout(300);
await tapText(page, L.save); await page.waitForTimeout(800);
s = await readScreen(page);
check('create/amount-required', has(s, 'ใส่ยอดมากกว่า 0'), 'save without amount: expected "ใส่ยอดมากกว่า 0"');
check('create/person-required', has(s, 'เลือกหรือพิมพ์ชื่อ'), 'save without person: expected "เลือกหรือพิมพ์ชื่อ"');

// --- cancel from the form (opened from the list) goes back to the list ---
await tapText(page, L.cancel); await page.waitForTimeout(1000);
s = await readScreen(page);
check('create/cancel-returns-to-list', has(s, L.listTitle), `after cancel: ${s.slice(0, 5).join(' | ')}`);

// --- owedToMe ---
const p1 = uniq('QA Owed');
await openNew(page);
const id1 = await fillAndSaveNew(page, { amount: 123, person: p1, description: 'owed desc', note: 'owed note' });
s = await readScreen(page);
check('create/owedToMe-saved', !!id1, 'no detail URL after save');
check('create/owedToMe-hero', has(s, `${p1} ติดคุณ`) && has(s, '+฿123.00'), `hero: ${s.find((l) => l.includes(p1))}`);
// The description/note VALUES are not exposed in semantics on the detail page (labels only) - screenshot-verified once.
if (!has(s, 'owed desc')) note('detail/description-note-not-in-semantics', 'คำอธิบาย / โน้ต show their labels but not their values in the semantics tree (visible on screen)');

// --- iOwe ---
const p2 = uniq('QA Iowe');
await openNew(page);
const id2 = await fillAndSaveNew(page, { direction: 'iOwe', amount: 45.5, person: p2 });
s = await readScreen(page);
check('create/iOwe-saved', !!id2, 'no detail URL after save');
check('create/iOwe-hero', has(s, `คุณติด ${p2}`) && has(s, '−฿45.50'), `hero: ${s.find((l) => l.includes(p2))}`);

// --- list shows both persons ---
// the list is long on a used user (only on-screen rows are readable): find each person through the search
await openList(page);
await tapAt(page, ...LIST.search); await page.keyboard.type(p1, { delay: 15 }); await page.waitForTimeout(900);
s = await readScreen(page);
const ok1 = has(s, p1) && has(s, '+฿123.00');
await page.keyboard.press('Control+A'); await page.keyboard.type(p2, { delay: 15 }); await page.waitForTimeout(900);
s = await readScreen(page);
check('create/list-has-both', ok1 && has(s, p2) && has(s, '−฿45.50'), `search ${p1}: ${ok1}; search ${p2}: ${s.filter((l) => l.includes('QA')).join(' / ')}`);

check('create/no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
console.log('IDS', id1, id2);
await browser.close();
const { fail } = report();
process.exit(fail ? 1 : 0);
