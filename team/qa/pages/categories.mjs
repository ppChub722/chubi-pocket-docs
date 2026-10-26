// Categories list → category detail. Category-specific selectors live here.
import { goTo } from '../lib/nav.mjs';
import { tapText, readScreen, waitForText } from '../lib/screen.mjs';

export const ROUTE = '/categories';
export const TABS = { expense: 'รายจ่าย', income: 'รายรับ' };   // tabs of the list

export async function openCategories(page, tab = 'expense') {
  await goTo(page, ROUTE);
  await waitForText(page, /รายจ่าย|รายรับ/, 8000);
  if (tab !== 'expense') { await tapText(page, TABS[tab]); await page.waitForTimeout(800); }
}

/** Open a category's detail from the list; `match` = text of the row (string/RegExp). Default: first sub-category row. */
export async function openCategoryDetail(page, match = /^Groceries/, tab = 'expense') {
  await openCategories(page, tab);
  await tapText(page, match);
  await page.waitForTimeout(1500);
}
export const readCategory = (page) => readScreen(page);
