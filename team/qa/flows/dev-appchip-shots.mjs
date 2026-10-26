// Screenshots of the AppChip tab: the 3-size (mini 20 / chip 28 / control 32) x trailing matrix.
// Usage: node flows/dev-appchip-shots.mjs [YYYY-MM-DD]   -> shots/<date>/appchip-sizes-<n>.png
import { mkdirSync } from 'node:fs';
import { launch } from '../lib/browser.mjs';
import { openGalleryTab, scrollBody } from '../pages/dev-widgets.mjs';

const date = process.argv[2] || new Date().toISOString().slice(0, 10);
const dir = new URL(`../shots/${date}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(dir, { recursive: true });
const { browser, page } = await launch();
await openGalleryTab(page, 'AppChip');
const stops = [2350]; // one shot: heading + unselected + selected matrix (~2.3k px down)
for (let i = 0; i < stops.length; i++) {
  await scrollBody(page, stops[i]);
  await page.screenshot({ path: `${dir}appchip-sizes-${i + 1}.png` });
}
await browser.close();
console.log('saved', dir);
