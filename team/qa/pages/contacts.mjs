// Minimal contacts helpers (only what debt flows need). Contact-specific selectors live here.
import { goTo } from '../lib/nav.mjs';
import { tapText, tapAt, readScreen, waitForText } from '../lib/screen.mjs';

export const NAME_FIELD = [230, 112];   // name field on /contacts/new (no semantics label)

/** Create a contact through /contacts/new; returns when its detail page is shown. */
export async function createContact(page, name) {
  await goTo(page, '/contacts/new');
  await page.waitForTimeout(600);
  await tapAt(page, ...NAME_FIELD);
  await page.keyboard.type(name, { delay: 15 });
  await page.waitForTimeout(300);
  await tapText(page, /^บันทึก$/);
  await waitForText(page, 'แก้ไข', 6000);
  await page.waitForTimeout(500);
}
export async function contactNames(page) {
  await goTo(page, '/contacts');
  await page.waitForTimeout(1500);
  return readScreen(page, { all: true });
}

export async function openContacts(page) {
  await goTo(page, '/contacts');
  await waitForText(page, /สถานะ:/, 8000);
  await page.waitForTimeout(800);
}
/** Open a contact's detail from the list; `match` = row text (string/RegExp). Default: first contact row. */
export async function openContactDetail(page, match = /^QR\b|^QC\b/) {
  await openContacts(page);
  await tapText(page, match);
  await page.waitForTimeout(1500);
}
