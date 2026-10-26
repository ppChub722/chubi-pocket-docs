// Flow: debts list page - hero totals, direction cards (filter toggle), status filter, search, row → person,
// and the same totals on the "เพิ่มเติม" page tile.
// node flows/debt-list.mjs   (needs at least one open debt of each direction: run debt-create first on a clean user)
import { launch } from '../lib/browser.mjs';
import { ensureLoggedIn } from '../lib/auth.mjs';
import { readScreen, tapText, tapAt, waitForText } from '../lib/screen.mjs';
import { goTo } from '../lib/nav.mjs';
import { check, note, report, has, uniq } from '../lib/check.mjs';
import { L, LIST, money, createDebt, repay, openList, deleteDebtById } from '../pages/debts.mjs';

const { browser, ctx, page, consoleErrors } = await launch();
await ensureLoggedIn(page, ctx, '/personal-debts');

// own fixtures (huge amounts so they sort to the top: rows are ordered by size and only on-screen rows are readable)
const a = uniq('QA ListOwed'), b = uniq('QA ListIowe'), c = uniq('QA ListPaid');
const idA = await createDebt(page, { amount: 9990001, person: a });
const idB = await createDebt(page, { direction: 'iOwe', amount: 9980002, person: b });
const idC = await createDebt(page, { amount: 10, person: c });
await repay(page, { mode: 'full' });          // c = a settled (cleared) person
await openList(page);
let s = await readScreen(page);
const hero = (re) => money((s.find((l) => re.test(l)) || '').split('|').pop());
const net = hero(/^สุทธิ/), owedToMe = hero(/^ติดคุณ/), iOwe = hero(/^คุณติด/);
check('list/hero-net-consistent', Math.abs(net - (owedToMe - iOwe)) < 0.005, `net ${net} ≠ ติดคุณ ${owedToMe} − คุณติด ${iOwe}`);
check('list/rows-show-fixtures', has(s, a) && has(s, b), `rows: ${s.filter((l) => l.includes('QA List')).join(' / ')}`);
check('list/default-status-open', has(s, 'สถานะ: ค้างอยู่') && !has(s, c), 'default status filter should be "ค้างอยู่" and hide the settled person');

// direction card = filter
await tapText(page, LIST.cardOwedToMe); await page.waitForTimeout(800);
s = await readScreen(page);
check('list/card-owed-filters', has(s, a) && !has(s, b), 'ติดคุณ card should keep only people who owe me');
await tapText(page, LIST.cardOwedToMe); await page.waitForTimeout(800);          // toggle off
await tapText(page, LIST.cardIOwe); await page.waitForTimeout(800);
s = await readScreen(page);
check('list/card-iowe-filters', has(s, b) && !has(s, a), 'คุณติด card should keep only people I owe');
await tapText(page, LIST.cardIOwe); await page.waitForTimeout(800);
s = await readScreen(page);
check('list/card-toggle-off', has(s, a) && has(s, b), 'tapping the active card again should clear the filter');

// search
await tapAt(page, ...LIST.search); await page.keyboard.type(a, { delay: 15 }); await page.waitForTimeout(900);
s = await readScreen(page);
check('list/search-match', has(s, a) && !has(s, b), 'search by name should keep only the match');
await page.keyboard.press('Control+A'); await page.keyboard.type('zzzz-nomatch', { delay: 15 }); await page.waitForTimeout(900);
s = await readScreen(page);
check('list/search-no-match', has(s, LIST.noMatch), 'no-result search should say "ไม่พบคนที่ค้นหา"');

// status filter ทั้งหมด includes cleared people
await openList(page);
await tapText(page, LIST.statusChip); await page.waitForTimeout(600);
await tapAt(page, ...LIST.statusAll); await page.waitForTimeout(900);
s = await readScreen(page);
await tapAt(page, ...LIST.search); await page.keyboard.type(c, { delay: 15 }); await page.waitForTimeout(900);
s = await readScreen(page);
check('list/status-all', has(s, 'สถานะ: ทั้งหมด') && has(s, c) && has(s, /เคลียร์แล้ว/), `status ทั้งหมด should list the settled person ${c} as เคลียร์แล้ว: ${s.slice(4, 12).join(' / ')}`);

// row → person page
await openList(page);
await tapText(page, a);
await page.waitForTimeout(1500);
s = await readScreen(page);
check('list/row-opens-person', has(s, `${a} ติดคุณ`), `after row tap: ${s.slice(4, 9).join(' | ')}`);

// More-page tile mirrors the totals
await goTo(page, '/more'); await page.waitForTimeout(1200);
s = await readScreen(page);
const tile = s.find((l) => l.startsWith('หนี้สิน |')) || '';
check('list/more-tile-matches-hero', money(tile.match(/เขาติด\s*(฿[\d,.]+)/)?.[1]) === owedToMe && money(tile.match(/คุณติด\s*(฿[\d,.]+)/)?.[1]) === iOwe,
  `more tile "${tile}" vs hero ติดคุณ ${owedToMe} / คุณติด ${iOwe}`);
note('list/more-tile-wording', `More tile says "เขาติด …" while the list card says "ติดคุณ" (same thing, different words): ${tile}`);

// cleanup: the huge fixtures would distort every later hero
for (const id of [idA, idB, idC]) await deleteDebtById(page, id);
check('list/no-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '));
await browser.close();
const { fail } = report();
process.exit(fail ? 1 : 0);
