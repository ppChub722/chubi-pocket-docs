// Shared browser helpers: launch system Chrome headless at 412x915.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

export const BASE = process.env.QA_WEB || 'http://localhost:5181';
export const API = process.env.QA_API || 'http://localhost:8080/api/v1';
export const USER = process.env.QA_USER || 'qlead657724';
export const PASS = process.env.QA_PASS || 'qapass1234';
const CHROME = process.env.QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const STATE = new URL('../.auth/state.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** opts.fresh = ignore the saved login state (use for login tests). */
export async function launch({ fresh = false } = {}) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    ...(!fresh && existsSync(STATE) ? { storageState: STATE } : {}),
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  return { browser, ctx, page, consoleErrors };
}
