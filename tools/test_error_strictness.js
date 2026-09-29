/**
 * ZERO 2 ONE — page errors must fail the browser suites (PE-1 included)
 * =====================================================================
 *
 * PE-1 is fixed, and the suites no longer exempt it. This proves it by fault
 * injection at test level (production code and pages are untouched):
 *
 *   E1  the synthetic error the suites inject is classified as PE-1 — so the
 *       runs below exercise exactly the "known error" path that used to be
 *       exempted
 *   E2  tools/test_scroll_letters.js with a synthetic PE-1 during the
 *       navigation / lifecycle stage: S4 FAILs naming it, exit status ≠ 0
 *   E3  tools/test_menu_viewports.js (one viewport) with a synthetic PE-1 once
 *       the menu is open: the error is reported and exit status ≠ 0
 *
 * Usage:  node tools/test_error_strictness.js
 * Exit code = number of failed checks. Takes ~5 minutes (E2 runs the whole
 * rolling-letters suite).
 */
const path = require('path');
const { spawnSync } = require('child_process');
const { classifyError } = require('./test_support');

const results = [];
function check(id, name, pass, detail) {
  results.push({ id, pass: !!pass });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${id}  ${name}${pass ? '' : '  → ' + JSON.stringify(detail).slice(0, 400)}`);
}
const suite = (file, env) => spawnSync(process.execPath, [path.join(__dirname, file)],
  { env: { ...process.env, ...env }, encoding: 'utf8', timeout: 15 * 60 * 1000 });

// E1 — the same construction the suites use, thrown and caught here
let synthetic;
try { (function onReverseComplete() { throw new RangeError('Maximum call stack size exceeded'); })(); } catch (e) { synthetic = e; }
check('E1', 'the injected error is classified PE-1 (the formerly exempted kind)', classifyError(synthetic) === 'PE-1', String(synthetic.stack).slice(0, 200));

const letters = suite('test_scroll_letters.js', { Z2O_TEST_INJECT_PAGE_ERROR: 'navigation' });
check('E2', 'scroll-letters suite + synthetic PE-1 in navigation/lifecycle → S4 FAIL naming PE-1, exit ≠ 0',
  letters.status !== 0 && /FAULT INJECTION ACTIVE/.test(letters.stdout) &&
  /FAIL\s+S4\b.*PE-1 · navigation \+ lifecycle/s.test(letters.stdout),
  { status: letters.status, tail: (letters.stdout || '').split('\n').filter(l => /S4|S5|passed|INJECTION/.test(l)) });

const menu = suite('test_menu_viewports.js', { Z2O_TEST_INJECT_PAGE_ERROR: 'menu', Z2O_TEST_ONLY_VIEWPORT: 'control 1440x900' });
check('E3', 'menu-viewport suite + synthetic PE-1 with the menu open → page error reported, exit ≠ 0',
  menu.status !== 0 && /FAIL\s+page error · PE-1/.test(menu.stdout) && /uncaught page errors [1-9]/.test(menu.stdout),
  { status: menu.status, tail: (menu.stdout || '').split('\n').slice(-6) });

const failed = results.filter(r => !r.pass).length;
console.log(`\n  ${results.length - failed} passed · ${failed} failed`);
process.exit(failed);
