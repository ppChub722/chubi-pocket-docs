// One shot of Part 1 "หน้าตัวอย่าง" (sample detail page, view mode) of the /dev/widgets "รายละเอียด" tab.
// A tall viewport (412x2000) makes the whole sample fit; the image is cropped from its heading to just above "1b".
// Usage: node flows/dev-detail-sample-shot.mjs [YYYY-MM-DD]  -> shots/<date>/detail-sample.png
import { mkdirSync } from 'node:fs';
import { launch } from '../lib/browser.mjs';
import { openGalleryTab } from '../pages/dev-widgets.mjs';
import { nodes, tapText } from '../lib/screen.mjs';

const date = process.argv[2] || new Date().toISOString().slice(0, 10);
const dir = new URL(`../shots/${date}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(dir, { recursive: true });
const { browser, page } = await launch();
await page.setViewportSize({ width: 412, height: 2000 });
await openGalleryTab(page, 'รายละเอียด');
await tapText(page, /^ดู$/);                         // view mode (also the default)
await page.waitForTimeout(600);
const ns = await nodes(page);
const top = ns.find((n) => /^1 · หน้าตัวอย่าง/.test(n.text));
const next = ns.find((n) => /^1b ·/.test(n.text));
await page.screenshot({
  path: `${dir}detail-sample.png`,
  clip: { x: 0, y: Math.max(0, top.y - 8), width: 412, height: next.y - top.y + 8 },
});
await browser.close();
console.log(`${dir}detail-sample.png`);
