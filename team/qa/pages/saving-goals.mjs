// Saving goals list → goal detail. Goal-specific selectors live here.
import { goTo } from '../lib/nav.mjs';
import { tapText, readScreen, waitForText } from '../lib/screen.mjs';

export const ROUTE = '/saving-goals';
export const EMPTY = 'ยังไม่มีเป้าหมาย';
export const ANY_GOAL = /^(?!เพิ่มเป้าหมาย|รอยืนยัน|การแจ้งเตือน|โปรไฟล์)[\s\S]*฿/;

export async function openGoals(page) {
  await goTo(page, ROUTE);
  await page.waitForTimeout(2000);
}
/** Open a goal's detail from the list; `match` = row text (string/RegExp). Default: first goal. */
export async function openGoalDetail(page, match = ANY_GOAL) {
  await openGoals(page);
  await tapText(page, match);
  await page.waitForTimeout(1500);
}
export const readGoal = (page) => readScreen(page);
