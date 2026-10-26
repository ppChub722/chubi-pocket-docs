// /dev/widgets gallery (no login needed). Any tab is one call: await openGalleryTab(page, 'AppChip').
import { goTo } from '../lib/nav.mjs';
import { nodes, readScreen, tapAt } from '../lib/screen.mjs';

export const ROUTE = '/dev/widgets';
const TAB_Y = 80;          // centre of the tab strip
const TAB_RIGHT = 370;     // strip is clipped at ~372 (the theme toggle sits right of it)

export async function openGallery(page) {
  await goTo(page, ROUTE);
}

/** Tab labels in the strip (some are off-screen until scrolled). */
export async function listTabs(page) {
  const ns = await nodes(page);
  return ns.filter((n) => n.role === 'button' && n.y >= 50 && n.y <= 60 && n.h >= 44 && n.text).map((n) => n.text);
}

/** Select a gallery tab by its label, scrolling the strip sideways as needed. */
export async function selectTab(page, label) {
  for (let i = 0; i < 12; i++) {
    const t = (await nodes(page)).find((n) => n.role === 'button' && n.text === label && n.y < 70 && n.h >= 44);
    if (!t) throw new Error(`gallery tab not found: ${label}`);
    const cx = t.x + t.w / 2;
    if (cx > 8 && cx < TAB_RIGHT && t.x + t.w <= TAB_RIGHT + 4 && t.x >= 0) {
      await tapAt(page, cx, TAB_Y);
      await page.waitForTimeout(800);
      return;
    }
    // scroll the strip toward the tab
    await page.mouse.move(200, TAB_Y);
    await page.mouse.wheel(cx > TAB_RIGHT ? 220 : -220, 0);
    await page.waitForTimeout(500);
  }
  throw new Error(`could not scroll to tab: ${label}`);
}

/** goTo + select in one call. */
export async function openGalleryTab(page, label) {
  await openGallery(page);
  await selectTab(page, label);
}

export const readTab = (page) => readScreen(page);

/** Scroll the gallery body by dy px (wheel over the content area). */
export async function scrollBody(page, dy) {
  await page.mouse.move(200, 500);
  await page.mouse.wheel(0, dy);
  await page.waitForTimeout(500);
}
