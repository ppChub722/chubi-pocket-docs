// Transactions list → transaction detail. Transaction-specific selectors live here.
import { goTo } from '../lib/nav.mjs';
import { tapText, readScreen, waitForText } from '../lib/screen.mjs';

export const ROUTE = '/transactions';
// A row = a node with an amount that is not the period summary ("รายรับ …") or a day header ("วันนี้ …").
export const ANY_ROW = /^(?!รายรับ|วันนี้|เมื่อวาน)[\s\S]*฿/;

export async function openTransactions(page) {
  await goTo(page, ROUTE);
  await waitForText(page, /^รายรับ/, 8000);
  await page.waitForTimeout(1000);
}

/** Open a transaction's detail from the list; `match` = row text (string/RegExp). Default: the first row. */
export async function openTransactionDetail(page, match = ANY_ROW) {
  await openTransactions(page);
  await tapText(page, match);
  await page.waitForTimeout(1500);
}
export const readTransaction = (page) => readScreen(page);
