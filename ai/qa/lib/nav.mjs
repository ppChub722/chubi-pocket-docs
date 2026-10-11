import { BASE } from './browser.mjs';
import { enableSemantics } from './screen.mjs';

/**
 * FULL page load of a route (clean app state; login survives via localStorage).
 * The app uses HASH routing: BASE/#/route. A plain page.goto to the same document would only change the hash
 * (no reload, cubit state such as list filters/search would persist) - hence the about:blank hop.
 */
export async function goTo(page, route) {
  await page.goto('about:blank');
  await page.goto(`${BASE}/#${route}`, { waitUntil: 'load' });
  await page.waitForSelector('flutter-view', { timeout: 20000 });
  await page.waitForTimeout(2500);
  await enableSemantics(page);
}

/** In-app navigation without a reload (keeps state): change the hash. */
export async function hashTo(page, route) {
  await page.evaluate((r) => { location.hash = r; }, route);
  await page.waitForTimeout(1200);
}
