// Wallets (กระเป๋า) list → wallet detail. Wallet-specific selectors live here.
// Wallet rows are tiles in a grid; the net-worth hero ("ยอดสุทธิ…") also has an amount, so it is excluded.
import { goTo } from '../lib/nav.mjs';
import { tapText, readScreen, waitForText } from '../lib/screen.mjs';

export const ROUTE = '/accounts';
export const EMPTY = 'ยังไม่มีกระเป๋า';
// A wallet row = a button node that has an amount and is not a nav/top-bar/add button.
export const ANY_WALLET = /^(?!ยอดสุทธิ|เพิ่มกระเป๋า|รอยืนยัน|การแจ้งเตือน|โปรไฟล์)[\s\S]*฿/;

export async function openAccounts(page) {
  await goTo(page, ROUTE);
  await page.waitForTimeout(2000);
}

/** Open a wallet's detail from the list; `match` = row text (string/RegExp). Default: the first wallet row. */
export async function openAccountDetail(page, match = ANY_WALLET) {
  await openAccounts(page);
  await tapText(page, match);
  await page.waitForTimeout(1500);
}
export const readAccount = (page) => readScreen(page);
