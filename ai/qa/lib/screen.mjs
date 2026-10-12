// Reading + tapping a Flutter web screen.
// Reading: semantics tree (flt-semantics nodes) -> text. Tapping: mouse coordinates on the canvas
// with the semantics overlay set to pointer-events:none (taps misroute when the overlay is live).

const HOST_CSS = 'flt-semantics-host, flt-semantics-host * { pointer-events: none !important; }';

/** Turn semantics on (once per page load) and make the overlay click-through. */
export async function enableSemantics(page) {
  const on = await page.evaluate(() => !!document.querySelector('flt-semantics-host flt-semantics'));
  if (!on) {
    await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.click());
    await page.waitForSelector('flt-semantics-host flt-semantics', { state: 'attached', timeout: 8000 }).catch(() => {});
  }
  await page.addStyleTag({ content: HOST_CSS }).catch(() => {});
}

/** All semantics nodes with a label/value: [{text, role, x, y, w, h, flags}] in reading order (top→bottom). */
export async function nodes(page) {
  await enableSemantics(page);
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('flt-semantics-host flt-semantics')) {
      const label = el.getAttribute('aria-label') || '';
      // own text = direct text nodes + text of non-semantics children (span/h2/...); nested flt-semantics are their own nodes
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && n.tagName !== 'FLT-SEMANTICS' && n.tagName !== 'FORM'))
        .map((n) => n.textContent).join(' ').trim();
      const text = (label || own).trim();
      const r = el.getBoundingClientRect();
      if (!text && !el.getAttribute('role')) continue;
      if (r.width === 0 || r.height === 0) continue;
      out.push({
        text,
        role: el.getAttribute('role') || '',
        checked: el.getAttribute('aria-checked'),
        selected: el.getAttribute('aria-selected'),
        disabled: el.getAttribute('aria-disabled'),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      });
    }
    return out;
  });
}

/** Visible screen as plain text lines (labelled nodes only, on-screen only). */
export async function readScreen(page, { all = false } = {}) {
  const ns = await nodes(page);
  const vp = page.viewportSize();
  return ns
    .filter((n) => n.text && (all || (n.y + n.h > 0 && n.y < vp.height && n.x < vp.width)))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((n) => n.text.replace(/\s*\n\s*/g, ' | '));
}

export async function screenText(page) {
  return (await readScreen(page)).join('\n');
}

/** Find the first on-screen node whose text matches (string = substring, RegExp = test). */
export async function find(page, match, { nth = 0 } = {}) {
  const ns = await nodes(page);
  const hit = ns.filter((n) => n.text && (match instanceof RegExp ? match.test(n.text) : n.text.includes(match)));
  return hit[nth] || null;
}

export async function tapAt(page, x, y) {
  await page.mouse.click(x, y);
  await page.waitForTimeout(600);
}

/** Tap the centre of the node matching `match`. Throws if not found. */
export async function tapText(page, match, opts = {}) {
  const n = await find(page, match, opts);
  if (!n) throw new Error(`tapText: no node matching ${match}`);
  await tapAt(page, n.x + n.w / 2, n.y + n.h / 2);
  return n;
}

/** Focus a text field by the node whose text/label matches, then type. */
export async function typeInto(page, match, value, { clear = true } = {}) {
  await tapText(page, match);
  if (clear) { await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); }
  await page.keyboard.type(value, { delay: 15 });
  await page.waitForTimeout(250);
}

export async function settle(page, ms = 1200) {
  await page.waitForTimeout(ms);
}

/** Wait until some on-screen line matches (string = substring, RegExp = test). Returns true/false. */
export async function waitForText(page, match, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const lines = await readScreen(page);
    if (lines.some((l) => (match instanceof RegExp ? match.test(l) : l.includes(match)))) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

/** Scroll the page body (wheel) until a node matching `match` is on screen. Returns the node or null. */
export async function scrollTo(page, match, { dy = 600, tries = 15 } = {}) {
  for (let i = 0; i < tries; i++) {
    const n = await find(page, match);
    const vp = page.viewportSize();
    if (n && n.y + n.h <= vp.height - 90) return n;      // clear of the bottom nav
    await page.mouse.move(200, 500);
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(450);
  }
  return null;
}

/** Wait until NO on-screen line matches (e.g. a toast/snackbar that can cover the bottom action bar). */
export async function waitGone(page, match, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const lines = await readScreen(page);
    if (!lines.some((l) => (match instanceof RegExp ? match.test(l) : l.includes(match)))) return true;
    await page.waitForTimeout(300);
  }
  return false;
}

/** Full-page shot of the current screen: grow the viewport so the whole scroll content fits, crop to the content
 *  (above the bottom nav), shoot, restore. */
export async function fullPageShot(page, path, height = 2400) {
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width, height });
  await page.waitForTimeout(1000);
  const ns = await nodes(page);
  const bottom = Math.max(...ns.filter((n) => n.y + n.h < height - 120 && n.h < height - 200).map((n) => n.y + n.h), 0);
  await page.screenshot({ path, clip: { x: 0, y: 0, width: vp.width, height: Math.min(height, bottom + 24) } });
  await page.setViewportSize(vp);
  await page.waitForTimeout(500);
}
