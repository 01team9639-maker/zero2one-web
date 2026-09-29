/**
 * ZERO 2 ONE — side menu in short viewports and at 200% zoom
 * ===========================================================
 *
 * Two kinds of 200% zoom, kept apart in the names:
 *   "simulated zoom200 …"  a half-size CSS viewport at device scale 2 — what
 *                          browser zoom does to layout, emulated
 *   "REAL zoom 200% …"     actual Chromium page zoom: the installed full
 *                          Chromium (channel "chromium") started with a profile
 *                          whose default zoom level is 200%
 *                          (partition.default_zoom_level = log 2 / log 1.2);
 *                          the case checks devicePixelRatio 2 and the halved
 *                          CSS width before anything else, and fails if the
 *                          browser did not actually zoom
 * Short windows and phones in landscape land in the same layout rules.
 *
 * For every viewport × language, with the menu open:
 *   V1  keyboard: from the first menu link, Tab reaches each of the 8
 *       navigation links in order, and each one, when focused, is on screen
 *       and actually painted there — its label's text at start, middle and
 *       end (elementFromPoint), so a partly covered label fails
 *   V2  mouse: wheel over the menu brings every link into view at some point
 *   V3  no sideways scrolling inside the menu or the page (in any element
 *       that can actually scroll)
 *   V4  the focus ring of each focused link is not clipped by the menu
 *   V5  the active-page dot is not clipped by the menu
 *
 * The menu is opened with a script click so the same test runs on the
 * unmodified site (whose toggle is not keyboard-operable) and on the fix.
 * Every request leaving 127.0.0.1 is stopped (tools/test_support.js).
 *
 * Page errors: every uncaught page error fails the run, PE-1 included.
 *
 * Usage:  node tools/test_menu_viewports.js [--out results.json]
 * Exit code = number of failed cases + number of uncaught page errors.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { serve, isolate, classifyError } = require('./test_support');

const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
// tests of this test only (tools/test_error_strictness.js): throw a synthetic
// PE-1-shaped error once the menu is open, optionally in one viewport only
const INJECT = process.env.Z2O_TEST_INJECT_PAGE_ERROR === 'menu';
const ONLY = process.env.Z2O_TEST_ONLY_VIEWPORT || '';
if (INJECT) console.log('  !! FAULT INJECTION ACTIVE: synthetic PE-1 error with the menu open — this run is expected to FAIL');

const VIEWPORTS = [
  { name: 'simulated zoom200 of 1440x900', width: 720, height: 450 },
  { name: 'simulated zoom200 of 1280x720', width: 640, height: 360 },
  { name: 'simulated zoom200 of 1920x1080', width: 960, height: 540 },
  { name: 'REAL zoom 200% 1440x900 window', realZoom: 2, window: [1440, 900] },
  { name: 'REAL zoom 200% 1280x720 window', realZoom: 2, window: [1280, 720] },
  { name: 'short 1024x600', width: 1024, height: 600 },
  { name: 'short 1440x600', width: 1440, height: 600 },
  { name: 'laptop 1366x657', width: 1366, height: 657 },
  { name: 'laptop 1280x680', width: 1280, height: 680 },
  { name: 'phone landscape 844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
  { name: 'short phone 390x600', width: 390, height: 600, isMobile: true, hasTouch: true },
  { name: 'control 1440x900', width: 1440, height: 900 },
  { name: 'control phone 390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
];
const PAGES = { en: '/services/seo-riyadh/', ar: '/ar/services/seo-riyadh/' };

// in-page: where things are, and whether they are really visible
const probe = () => {
  const cs = [...document.querySelectorAll('[data-barba="container"]')];
  const root = cs[cs.length - 1];
  const row = root.querySelector('.fixed-nav .nav-row');
  const links = [...root.querySelectorAll('.fixed-nav .nav-row .links-wrap > li > a')];
  // the part of the screen the menu actually shows: the viewport, cut by
  // every ancestor that clips (overflow other than visible) — up to the
  // position:fixed menu itself; what lies above a fixed element does not
  // clip it
  const clipOf = el => {
    let r = { l: 0, t: 0, r: innerWidth, b: innerHeight };
    for (let e = el.parentElement; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const b = e.getBoundingClientRect();
        r = { l: Math.max(r.l, b.left), t: Math.max(r.t, b.top), r: Math.min(r.r, b.right), b: Math.min(r.b, b.bottom) };
      }
      if (e.classList.contains('fixed-nav')) break;
    }
    return r;
  };
  // sideways scrolling is only possible in a scroll container
  const sideways = e => {
    if (!e) return 0;
    const ox = getComputedStyle(e).overflowX;
    return (ox === 'auto' || ox === 'scroll') ? e.scrollWidth - e.clientWidth : 0;
  };
  // visible = the label's text is painted at its start, middle and end (not
  // just the link's centre: a floating button can cover part of a label)
  const shown = a => {
    const label = a.querySelector('.btn-text-inner') || a;
    const range = document.createRange(); range.selectNodeContents(label);
    const b = range.getBoundingClientRect(), c = clipOf(a);
    const y = b.top + b.height / 2;
    return [0.1, 0.5, 0.9].every(f => {
      const x = b.left + b.width * f;
      if (!(x > c.l && x < c.r && y > c.t && y < c.b)) return false;
      const hit = document.elementFromPoint(x, y);
      return !!hit && a.contains(hit);
    });
  };
  const ringInside = a => {
    const s = getComputedStyle(a);
    if (s.outlineStyle === 'none') return null;          // no ring drawn
    const o = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset);
    const b = a.getBoundingClientRect(), c = clipOf(a);
    return b.left - o >= c.l - 0.5 && b.top - o >= c.t - 0.5 && b.right + o <= c.r + 0.5 && b.bottom + o <= c.b + 0.5;
  };
  const active = root.querySelector('.fixed-nav .nav-row .btn-link.active .btn-click');
  let dot = null;
  if (active) {
    const ps = getComputedStyle(active, '::after');
    let cb = active; while (cb && getComputedStyle(cb).position === 'static') cb = cb.parentElement;
    const R = cb.getBoundingClientRect(), w = parseFloat(ps.width), h = parseFloat(ps.height);
    let left = ps.left !== 'auto' ? R.left + parseFloat(ps.left) : R.right - parseFloat(ps.right) - w;
    let top = ps.top !== 'auto' ? R.top + parseFloat(ps.top) : R.bottom - parseFloat(ps.bottom) - h;
    const m = ps.transform.match(/matrix\(([^)]+)\)/); if (m) { const v = m[1].split(',').map(Number); left += v[4]; top += v[5]; }
    const c = clipOf(active);
    dot = { inside: left >= c.l - 0.5 && left + w <= c.r + 0.5, x: Math.round(left), clipL: Math.round(c.l), clipR: Math.round(c.r) };
  }
  return {
    count: links.length,
    shown: links.map(shown),
    rowSideways: row ? Math.max(sideways(row), sideways(row.closest('.fixed-nav-inner')), sideways(row.closest('.fixed-nav'))) : null,
    pageSideways: Math.max(sideways(document.documentElement), sideways(document.body)),
    focusIndex: links.indexOf(document.activeElement),
    focusShown: links.includes(document.activeElement) ? shown(document.activeElement) : false,
    ring: links.includes(document.activeElement) ? ringInside(document.activeElement) : null,
    dot,
    labels: links.map(a => a.textContent.trim()),
  };
};

(async () => {
  const { srv, origin } = await serve();
  const browser = await chromium.launch();
  const results = []; const pageErrors = [];
  for (const vp of VIEWPORTS.filter(v => !ONLY || v.name === ONLY)) for (const lang of ['en', 'ar']) {
    let ctx, profile = null;
    if (vp.realZoom) {
      // actual browser zoom: a throw-away profile with a 200% default zoom
      profile = fs.mkdtempSync(path.join(os.tmpdir(), 'z2o-zoom-profile-'));
      fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
      fs.writeFileSync(path.join(profile, 'Default', 'Preferences'),
        JSON.stringify({ partition: { default_zoom_level: { x: Math.log(vp.realZoom) / Math.log(1.2) } } }));
      ctx = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: null, args: [`--window-size=${vp.window[0]},${vp.window[1]}`] });
    } else {
      ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 2 });
    }
    await isolate(ctx, origin);
    const p = await ctx.newPage();
    p.on('pageerror', e => pageErrors.push({ vp: vp.name, lang, kind: classifyError(e) || 'unclassified', error: String(e).slice(0, 120) }));
    const r = { vp: vp.name, lang, size: vp.realZoom ? null : `${vp.width}x${vp.height}` };
    try {
      await p.goto(origin + PAGES[lang], { waitUntil: 'load' }); await p.waitForTimeout(3500);
      if (vp.realZoom) {
        // the case only counts if the browser really zoomed
        const z = await p.evaluate(() => ({ dpr: devicePixelRatio, w: innerWidth, h: innerHeight }));
        r.size = `${z.w}x${z.h} CSS px at devicePixelRatio ${z.dpr}`;
        if (z.dpr !== vp.realZoom || Math.abs(z.w - vp.window[0] / vp.realZoom) > 2)
          throw new Error(`browser did not zoom: devicePixelRatio ${z.dpr}, CSS width ${z.w} (window ${vp.window[0]})`);
      }
      await p.evaluate(() => document.querySelector('[data-barba="container"]:last-of-type .btn-hamburger .btn-click').click());
      await p.waitForTimeout(2500);
      if (INJECT) await p.evaluate(() => setTimeout(function onReverseComplete() { throw new RangeError('Maximum call stack size exceeded'); }, 0));
      // V1: keyboard walk from the first link
      await p.evaluate(() => { const a = document.querySelector('[data-barba="container"]:last-of-type .fixed-nav .nav-row .links-wrap > li > a'); a && a.focus(); });
      await p.waitForTimeout(300);
      const walk = [];
      for (let i = 0; i < 8; i++) {
        if (i) { await p.keyboard.press('Tab'); await p.waitForTimeout(250); }
        const s = await p.evaluate(probe);
        walk.push({ i, focusIndex: s.focusIndex, shown: s.focusShown, ring: s.ring });
        if (i === 0) Object.assign(r, { count: s.count, labels: s.labels, rowSideways: s.rowSideways, pageSideways: s.pageSideways, dot: s.dot });
      }
      r.V1 = walk.length === 8 && walk.every((w, i) => w.focusIndex === i && w.shown);
      r.V4 = walk.every(w => w.ring !== false);          // null = no ring drawn (unmodified site); false = clipped
      r.walk = walk;
      // V2: mouse wheel over the menu, from the top
      await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); const r = document.querySelector('[data-barba="container"]:last-of-type .fixed-nav .nav-row'); if (r) r.scrollTop = 0; });
      const box = await p.locator('[data-barba="container"]:last-of-type .fixed-nav .nav-row').boundingBox();
      const seen = new Array(8).fill(false);
      for (let step = 0; step < 8; step++) {
        const s = await p.evaluate(probe);
        s.shown.forEach((v, i) => { if (v) seen[i] = true; });
        await p.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height - 5, box.height / 2));
        await p.mouse.wheel(0, 120); await p.waitForTimeout(200);
      }
      r.V2 = seen.every(Boolean); r.seen = seen.filter(Boolean).length;
      r.V3 = r.rowSideways !== null && r.rowSideways <= 1 && r.pageSideways <= 1;
      r.V5 = !r.dot || r.dot.inside;
      if (OUT) await p.screenshot({ path: OUT.replace(/\.json$/, `_${vp.realZoom ? 'realzoom_' + vp.window.join('x') : vp.width + 'x' + vp.height}_${lang}.png`) });
    } catch (e) { r.error = String(e).split('\n')[0]; }
    r.pass = !r.error && r.V1 && r.V2 && r.V3 && r.V4 && r.V5;
    results.push(r);
    console.log(`  ${r.pass ? 'ok  ' : 'FAIL'}  ${vp.name.padEnd(31)} ${lang}  V1 keyboard ${r.V1 ? '✓' : '✗'}  V2 mouse ${r.V2 ? '✓' : '✗'} (${r.seen}/8)  V3 no-sideways ${r.V3 ? '✓' : '✗'} (${r.rowSideways}/${r.pageSideways})  V4 ring ${r.V4 ? '✓' : '✗'}  V5 dot ${r.V5 ? '✓' : '✗'}${r.error ? '  ERR ' + r.error : ''}`);
    await ctx.close();
    if (profile) fs.rmSync(profile, { recursive: true, force: true });
    if (vp.realZoom && r.size) console.log(`        (${r.size})`);
  }
  await browser.close(); srv.close();
  const failed = results.filter(r => !r.pass).length;
  // every uncaught page error fails the run, PE-1 included (the kind is only a label)
  for (const e of pageErrors.slice(0, 5)) console.log(`  FAIL  page error · ${e.kind} · ${e.vp} ${e.lang}: ${e.error}`);
  console.log(`\n  ${results.length - failed} passed · ${failed} failed · uncaught page errors ${pageErrors.length} (each one fails the run)`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), results, pageErrors }, null, 1));
  process.exit(Math.min(failed + pageErrors.length, 255));
})().catch(e => { console.error(e); process.exit(99); });
