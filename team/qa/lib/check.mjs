// Tiny PASS/FAIL collector. Flows call check('ID', cond, 'repro/expected/actual') and end with report().
const results = [];
export function check(id, ok, detail = '') {
  results.push({ id, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${ok ? '' : ' · ' + detail}`);
  return !!ok;
}
export function note(id, detail) {               // odd / worth a look, not a hard FAIL
  results.push({ id, ok: true, note: true, detail });
  console.log(`NOTE ${id} · ${detail}`);
}
export function report() {
  const fails = results.filter((r) => !r.ok);
  const pass = results.filter((r) => r.ok && !r.note).length;
  console.log(`\nSUMMARY PASS ${pass} · FAIL ${fails.length} · NOTE ${results.filter((r) => r.note).length}`);
  for (const f of fails) console.log(`  FAIL ${f.id} · ${f.detail}`);
  return { pass, fail: fails.length };
}
export const has = (lines, re) => lines.some((l) => (re instanceof RegExp ? re.test(l) : l.includes(re)));
export const uniq = (p = 'QA') => `${p} ${Date.now().toString(36).slice(-5)}`;
