// Runs every debt flow in order and prints a combined PASS/FAIL tally.  node run-debts.mjs
import { spawnSync } from 'node:child_process';
const flows = ['debt-create', 'debt-repay', 'debt-edit', 'debt-cancel-delete', 'debt-person', 'debt-list'];
let pass = 0, fail = 0; const fails = [];
for (const f of flows) {
  const r = spawnSync(process.execPath, [`flows/${f}.mjs`], { encoding: 'utf8', cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/SUMMARY PASS (\d+) · FAIL (\d+)/);
  if (!m) { console.log(`${f}: CRASH\n${out.split('\n').slice(-8).join('\n')}`); fail++; fails.push(`${f} crashed`); continue; }
  pass += +m[1]; fail += +m[2];
  console.log(`${f}: PASS ${m[1]} FAIL ${m[2]}`);
  for (const l of out.split('\n')) if (/^(FAIL|NOTE) /.test(l)) { console.log('  ' + l); if (l.startsWith('FAIL')) fails.push(l); }
}
console.log(`\nTOTAL PASS ${pass} · FAIL ${fail}`);
process.exit(fail ? 1 : 0);
