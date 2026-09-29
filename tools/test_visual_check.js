/**
 * ZERO 2 ONE — tests for the visual runner's failure handling
 * ============================================================
 *
 * tools/visual_check.js must never report success for a visual state it could
 * not establish. These tests drive it on small fixture pages written to a
 * temporary directory (never the site's own pages), with no network access:
 *
 *   F1  openMenu succeeds on a working menu, left-to-right and right-to-left
 *   F2  missing toggle / missing panel → StateError naming what is missing
 *   F3  a menu that never opens, and one that "opens" but stays parked off
 *       screen (stable coordinates, wrong place) → StateError, no success
 *   F4  run() on a mixed set: the working case compares, the broken action,
 *       the never-ready page, the thrown error and the missing baseline are
 *       each FAILED with route, viewport, state and reason; a diagnostic
 *       screenshot is kept for the failed action; failed count > 0
 *   F5  the command line: the same failures give a non-zero exit status
 *   F6  the command line: a clean fixture set gives exit status 0
 *
 * Usage:  node tools/test_visual_check.js
 * Exit code = number of failed checks.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const vc = require('./visual_check');

const results = [];
function check(id, name, pass, detail) {
  results.push({ id, name, pass: !!pass });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${id.padEnd(3)} ${name}${pass ? '' : '  → ' + JSON.stringify(detail).slice(0, 300)}`);
}

// ------------------------------------------------------------------ fixtures
const page = ({ dir = 'ltr', toggle = true, menu = true, opens = true, parked = false, curtain = false }) => `<!doctype html>
<html lang="en" dir="${dir}"><head><meta charset="utf-8"><title>fixture</title><style>
  body { margin: 0; font: 16px sans-serif; background: #fffded; }
  .fixed-nav { position: fixed; top: 0; right: 0; width: 280px; height: 100vh; background: #1c1d20;
               transform: translateX(110%); transition: transform .3s; }
  .nav-active .fixed-nav { transform: ${parked ? 'translateX(110%)' : 'none'}; }
  .btn-hamburger { position: fixed; top: 10px; right: 10px; z-index: 5; }
  .btn-click { width: 48px; height: 48px; background: #f9460e; }
  .loading-screen { position: fixed; inset: 0; background: #f9460e; }
</style></head><body>
<main data-barba="container">
  ${toggle ? '<div class="btn btn-hamburger"><div class="btn-click" role="button" tabindex="0">Menu</div></div>' : ''}
  ${menu ? '<div class="fixed-nav"><a href="#">Home</a></div>' : ''}
  <h1>Fixture</h1>
</main>
${curtain ? '<div class="loading-screen"></div>' : ''}
<script>
  var t = document.querySelector('.btn-hamburger .btn-click');
  if (t && ${opens}) t.addEventListener('click', function () { document.querySelector('main').classList.toggle('nav-active'); });
</script></body></html>`;

const FIX = {
  'ok': {}, 'rtl': { dir: 'rtl' }, 'no-toggle': { toggle: false }, 'no-menu': { menu: false },
  'never-opens': { opens: false }, 'parked': { parked: true }, 'never-ready': { curtain: true },
};

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'z2o-visual-fixtures-'));
  for (const [name, o] of Object.entries(FIX)) {
    fs.mkdirSync(path.join(root, name), { recursive: true });
    fs.writeFileSync(path.join(root, name, 'index.html'), page(o));
  }
  const { srv, port } = await new Promise(res => {
    const http = require('http');
    const s = http.createServer((q, r) => {
      let p = q.url.split('?')[0]; if (p.endsWith('/')) p += 'index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': 'text/html' }); fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res({ srv: s, port: s.address().port }));
  });
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const attempt = async (fixture, timeout = 1500) => {
    const p = await ctx.newPage();
    try { await p.goto(`${origin}/${fixture}/`); await vc.openMenu(p, { timeout }); return { ok: true }; }
    catch (e) { return { ok: false, stateError: e instanceof vc.StateError, message: e.message }; }
    finally { await p.close(); }
  };

  // F1
  const ltr = await attempt('ok', 4000), rtl = await attempt('rtl', 4000);
  check('F1', 'openMenu establishes a stable open menu (LTR and RTL)', ltr.ok && rtl.ok, { ltr, rtl });
  // F2
  const nt = await attempt('no-toggle'), nm = await attempt('no-menu');
  check('F2', 'missing toggle / missing panel → StateError naming it',
    !nt.ok && nt.stateError && /toggle/.test(nt.message) && !nm.ok && nm.stateError && /panel/.test(nm.message), { nt, nm });
  // F3
  const no = await attempt('never-opens'), pk = await attempt('parked');
  check('F3', 'never opens / parked off screen (stable but wrong place) → StateError, not success',
    !no.ok && no.stateError && /"open":false/.test(no.message) && !pk.ok && pk.stateError && /"onScreen":false/.test(pk.message), { no, pk });
  await browser.close(); srv.close();

  // F4: run() on a mixed set, current mode, baseline only for part of it
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'z2o-visual-out-'));
  const vps = [{ name: 'desk', width: 800, height: 600 }];
  const base = await vc.run({ root, dir, mode: 'baseline', viewports: vps, readyTimeout: 3000, actionTimeout: 2000, log: () => {},
    targets: [{ route: '/ok/', name: 'nav-open', action: vc.openMenu }] });
  const thrower = async () => { throw new Error('injected fault'); };
  const logs = [];
  const cur = await vc.run({ root, dir, mode: 'current', viewports: vps, readyTimeout: 3000, actionTimeout: 2000, log: l => logs.push(l),
    targets: [
      { route: '/ok/', name: 'nav-open', action: vc.openMenu },       // compares with its baseline
      { route: '/no-menu/', name: 'nav-open', action: vc.openMenu },  // action fails
      { route: '/never-ready/' },                                     // readiness fails
      { route: '/ok/', name: 'fault', action: thrower },              // action throws
      { route: '/rtl/' },                                             // no baseline
    ] });
  const by = k => cur.results.find(r => r.label === k);
  const failedFields = ['/no-menu/ [nav-open]', '/never-ready/', '/ok/ [fault]', '/rtl/'].map(by);
  check('F4', 'run(): each unestablished state / missing baseline is FAILED with route, viewport, state, reason; failed > 0',
    base.failed === 0 && by('/ok/ [nav-open]').status === 'identical' &&
    failedFields.every(r => r && r.status === 'FAILED' && r.route && r.viewport === 'desk' && r.reason) &&
    /not found/.test(by('/no-menu/ [nav-open]').reason) && /NOT READY/.test(by('/never-ready/').reason) &&
    /injected fault/.test(by('/ok/ [fault]').reason) && /no baseline/.test(by('/rtl/').reason) &&
    !!by('/no-menu/ [nav-open]').diagnostic && fs.existsSync(by('/no-menu/ [nav-open]').diagnostic) &&
    cur.failed === 4 && logs.some(l => /coverage INCOMPLETE/.test(l)),
    { baseFailed: base.failed, failed: cur.failed, results: cur.results.map(r => [r.label, r.status, (r.reason || '').slice(0, 60)]) });

  // F5 / F6: the command line's exit status
  const cli = (cfg, mode) => {
    const f = path.join(dir, `config-${mode}-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(f, JSON.stringify({ root, dir, viewports: vps, readyTimeout: 3000, actionTimeout: 2000, ...cfg }));
    return spawnSync(process.execPath, [path.join(__dirname, 'visual_check.js'), ...(mode === 'baseline' ? ['--baseline'] : [])],
      { env: { ...process.env, VISUAL_CHECK_CONFIG: f }, encoding: 'utf8', timeout: 120000 });
  };
  const bad = cli({ targets: [{ route: '/never-opens/', name: 'nav-open', action: 'openMenu' }] }, 'current');
  check('F5', 'command line: a state that cannot be established → non-zero exit, reason printed',
    bad.status !== 0 && /FAILED/.test(bad.stdout) && /never-opens/.test(bad.stdout) && /not established/.test(bad.stdout),
    { status: bad.status, out: (bad.stdout || '').slice(-400), err: (bad.stderr || '').slice(-200) });
  const cleanTargets = { targets: [{ route: '/ok/', name: 'nav-open', action: 'openMenu' }, { route: '/rtl/', name: 'nav-open', action: 'openMenu' }] };
  const b1 = cli(cleanTargets, 'baseline'), c1 = cli(cleanTargets, 'current');
  check('F6', 'command line: a clean fixture set → exit 0 in both modes (positive control)',
    b1.status === 0 && c1.status === 0 && /2 identical/.test(c1.stdout), { b: b1.status, c: c1.status, out: (c1.stdout || '').slice(-300) });

  fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(dir, { recursive: true, force: true });
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n  ${results.length - failed} passed · ${failed} failed`);
  process.exit(failed);
})().catch(e => { console.error(e); process.exit(99); });
