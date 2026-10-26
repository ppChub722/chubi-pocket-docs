import { mkdirSync, existsSync } from 'node:fs';
import { BASE, USER, PASS } from './browser.mjs';
import { goTo } from './nav.mjs';
import { tapAt, tapText, readScreen, enableSemantics } from './screen.mjs';

export const STATE_FILE = new URL('../.auth/state.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Log in through the UI (login fields have no semantics label, so they are tapped by position). */
export async function login(page, user = USER, pass = PASS) {
  await goTo(page, '/auth/login');
  await tapAt(page, 200, 385);               // user / email field
  await page.keyboard.type(user, { delay: 15 });
  await tapAt(page, 200, 445);               // password field
  await page.keyboard.type(pass, { delay: 15 });
  await tapText(page, 'เข้าสู่ระบบ');
  await page.waitForTimeout(4000);
  await enableSemantics(page);
}

/** True when the app shows the login screen. */
export async function onLogin(page) {
  return (await readScreen(page)).some((l) => l.includes('เข้าสู่ระบบ'));
}

/** Persist the browser storage so later scripts skip the login UI. */
export async function saveAuth(ctx) {
  mkdirSync(new URL('../.auth/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), { recursive: true });
  await ctx.storageState({ path: STATE_FILE });
}

/** Open a route logged in: reuse saved state, else log in once and save it. */
export async function ensureLoggedIn(page, ctx, route = '/') {
  await goTo(page, route);
  if (await onLogin(page)) {
    await login(page);
    await saveAuth(ctx);
    await goTo(page, route);
  }
}
