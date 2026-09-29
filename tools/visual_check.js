/**
 * ZERO 2 ONE — visual regression check
 * ====================================
 *
 * Screenshots every page at mobile and desktop and compares them against a
 * stored baseline, pixel by pixel.
 *
 * This exists because this codebase breaks *silently*. Moving two lines inside
 * barba's once() left the intro curtain stuck over the page forever, with no
 * console error, nothing in any audit, and every page still returning 200. The
 * only thing that catches that class of failure is looking at the pixels.
 *
 * Known limitation: /contact/ and /ar/contact/ on mobile still report ~3% of
 * changed pixels on roughly one run in two, at a repeatable value. It is
 * bistable rather than random, it happens with the *unmodified* build too, and
 * their computed layout, fonts and classes are byte-identical between runs — so
 * treat a diff confined to those two pages, at that magnitude, as noise. A real
 * regression showed up at 4-18% and across every page that shared the broken
 * component.
 *
 * Usage:
 *   node tools/visual_check.js --baseline   # capture the reference set
 *   node tools/visual_check.js              # compare against it
 *
 * Besides every page as loaded, STATES below adds the side menu open (EN and
 * AR) and two blog pages. Blog pages load the site's CSS/JS by absolute
 * https://zero2one.sa/ URL; every such request is answered from the working
 * tree (or aborted if the file is not there), so a screenshot always shows the
 * code under test and nothing is fetched from production.
 *
 * Readiness: a page is captured only once ready() confirms the intro curtain
 * is gone, fonts are loaded and no transition is running — not after a fixed
 * delay — and a page that never gets there is reported as NOT READY.
 *
 * A case never passes unless the requested state was actually established:
 * a page that does not load, never becomes ready, whose action (e.g. opening
 * the menu) fails, whose frames never settle, or that has no baseline to be
 * compared with, is a FAILED case with its route, viewport, state and reason,
 * and a diagnostic screenshot in .visual/failures/ where one could be taken.
 * The other cases still run.
 *
 * Results are reported in four kinds, never merged:
 *   identical        0 changed pixels
 *   below threshold  some pixels changed, ratio ≤ FAIL_RATIO (not identical)
 *   DIFF             ratio > FAIL_RATIO
 *   FAILED           the case could not be completed (see above)
 *
 * Screenshots land in .visual/ (git-ignored). Exit code = number of DIFF +
 * FAILED cases; in --baseline mode, the number of FAILED captures.
 *
 * Tests: tools/test_visual_check.js drives run() on isolated fixture pages and
 * uses VISUAL_CHECK_CONFIG (a JSON file: root, dir, targets, viewports,
 * timeouts) to check the command's exit status. Production runs never set it.
 *
 * Needs playwright + sharp:  npm install
 */
const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.dirname(__dirname);
const DIR = path.join(ROOT, '.visual');
const MODE = process.argv.includes('--baseline') ? 'baseline' : 'current';
// a pixel counts as changed above this per-channel delta; anti-aliasing noise
// sits well below it
const PIXEL_TOLERANCE = 12;
// fraction of differing pixels that trips a failure
const FAIL_RATIO = 0.002;
// regions that animate forever or come from a third party
const MASK = ['.big-name', '.contact-map', '#timeSpan',
  // native form controls are drawn by the platform and are not pixel-stable
  // in headless Chromium between runs
  '#contact-form select', '#contact-form textarea', '#contact-form input'];

// صفحات المشاريع مُدرجة صراحةً: الأداة تلتقط ما في هذه القائمة فقط، ومشروع
// جديد لا يُضاف هنا يخرج من الرقابة البصرية بلا أن يشتكي أحد.
// المصدر الواحد لقائمتها: tools/portfolio_data.py
const CASES = [
  '/work/habba/',
  '/work/alostaz-seo/',
  '/work/cosmetic-surgery-egypt-seo/',
  '/work/orthopedic-clinic-egypt-seo/',
  '/work/alhokail-seo/',
  '/work/google-ads-conversion-value/',
  '/work/alrahwanji-paints/',
  '/work/kuwait-tutoring-instagram-ads/',
];
const CASES_AR = [
  '/ar/work/habba/',
  '/ar/work/alostaz-seo/',
  '/ar/work/cosmetic-surgery-egypt-seo/',
  '/ar/work/orthopedic-clinic-egypt-seo/',
  '/ar/work/alhokail-seo/',
  '/ar/work/google-ads-conversion-value/',
  '/ar/work/alrahwanji-paints/',
  '/ar/work/kuwait-tutoring-instagram-ads/',
];

const PAGES = [
  '/', '/about/', '/work/', '/contact/', '/services/',
  '/services/web-design-riyadh/', '/services/seo-riyadh/', '/services/digital-advertising/',
  '/services/brand-identity/', '/services/social-media-management/', '/services/ecommerce-development/',
  '/ar/', '/ar/about/', '/ar/work/', '/ar/contact/', '/ar/services/',
  '/ar/services/web-design-riyadh/', '/ar/services/seo-riyadh/', '/ar/services/digital-advertising/',
  '/ar/services/brand-identity/', '/ar/services/social-media-management/', '/ar/services/ecommerce-development/',
  ...CASES, ...CASES_AR,
];
// Extra captures. `action` runs after the intro has settled and before
// freeze(); the menu is opened by a script click and focus is then dropped, so
// the shot compares layout — focus rings are covered by tools/test_nav_a11y.js.
// An action that cannot establish its state throws StateError; run() records
// the case as FAILED with the reason.
class StateError extends Error {}

const openMenu = async (page, { timeout = 8000 } = {}) => {
  const found = await page.evaluate(() => {
    const cs = document.querySelectorAll('[data-barba="container"]');
    const root = cs.length ? cs[cs.length - 1] : document;
    const t = root.querySelector('.btn-hamburger .btn-click');
    const m = root.querySelector('.fixed-nav');
    if (t && m) t.click();
    return { toggle: !!t, menu: !!m };
  });
  if (!found.toggle) throw new StateError('menu toggle (.btn-hamburger .btn-click) not found');
  if (!found.menu) throw new StateError('menu panel (.fixed-nav) not found');
  // Open = the page says so (main.nav-active), the panel is visible, entirely
  // inside the viewport horizontally, sitting against the edge its CSS anchors
  // it to (right in both directions here; left if a layout anchors it left),
  // and in the same place on two polls in a row. Coordinates that merely stop
  // changing are not enough: a panel parked off-screen is stable too. The
  // slide-in can stall ~1.2 s in headless Chromium, hence polling, not a delay.
  try {
    await page.waitForFunction(() => {
      const cs = document.querySelectorAll('[data-barba="container"]');
      const root = cs.length ? cs[cs.length - 1] : document.body;
      const m = root.querySelector('.fixed-nav');
      if (!m) { window.__menuState = { reason: 'panel gone' }; return false; }
      const r = m.getBoundingClientRect(), st = getComputedStyle(m);
      const open = root.classList.contains('nav-active');
      const visible = st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.99 && r.width > 0 && r.height > 0;
      const onScreen = r.left >= -1 && r.right <= innerWidth + 1 && r.top <= 1 && r.bottom > 0;
      let anchored = true;
      if (st.right !== 'auto') anchored = Math.abs(innerWidth - r.right - parseFloat(st.right)) <= 1;
      else if (st.left !== 'auto') anchored = Math.abs(r.left - parseFloat(st.left)) <= 1;
      const key = [r.left, r.top, r.width].map(Math.round).join(',');
      const stable = window.__menuKey === key;
      window.__menuKey = key;
      window.__menuState = { open, visible, onScreen, anchored, stable, left: Math.round(r.left), right: Math.round(r.right), viewport: innerWidth };
      return open && visible && onScreen && anchored && stable;
    }, null, { timeout, polling: 150 });
  } catch (e) {
    const last = await page.evaluate(() => window.__menuState || null).catch(() => null);
    throw new StateError(`menu did not reach a stable open position within ${timeout} ms — last state ${JSON.stringify(last)}`);
  }
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
};
const STATES = [
  { route: '/', name: 'nav-open', action: openMenu },
  { route: '/ar/', name: 'nav-open', action: openMenu },
  { route: '/blog/' },
  { route: '/blog/ar/' },
];
const TARGETS = [...PAGES.map(route => ({ route })), ...STATES];

const VIEWPORTS = [
  { name: 'mobile', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900 },
];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.otf': 'font/otf', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain' };

function serve(root = ROOT) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(root, p);
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); return res.end();
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

/**
 * Pin everything that would otherwise render differently on each run:
 * the infinite hero marquee, the live footer clock, and any CSS transition
 * still in flight. Without this the two home pages alone produce 1-8% of
 * changed pixels between identical builds, which buries a real regression.
 */
/**
 * Wait until the page has really finished arriving: webfonts loaded, the
 * intro curtain (.loading-screen) gone off the top, no barba transition in
 * progress, the "wait" cursor the intro sets removed, and no finite
 * animation still running or scheduled. A fixed delay was
 * used before; one run captured /ar/ with the curtain still over the page.
 * Returns false if the page never gets there — the caller reports it.
 */
async function ready(page, timeout = 20000) {
  try {
    await page.waitForFunction(() => {
      if (document.fonts && document.fonts.status !== 'loaded') return false;
      const ls = document.querySelector('.loading-screen');
      if (ls && ls.getBoundingClientRect().bottom > 1 && getComputedStyle(ls).display !== 'none') return false;
      const html = document.documentElement;
      if (html.classList.contains('is-transitioning')) return false;
      if (getComputedStyle(html).cursor === 'wait') return false;
      // no finite gsap animation still running or still waiting for its
      // delay (the SEO hero reveal and its counters start 0.35-1.2 s after
      // the intro and ran into the shot: 0.2-1.5% noise on the unmodified
      // site). Endless loops and scroll-scrubbed (paused) tweens are
      // excluded — they never "finish".
      if (window.gsap) {
        const g = window.gsap.globalTimeline, now = g.time();
        const pending = g.getChildren(false, true, true).some(t =>
          !t.paused() && t.totalDuration() < 600 && t.endTime() > now + 0.02);
        if (pending) return false;
      }
      return true;
    }, null, { timeout, polling: 200 });
    return true;
  } catch (e) { return false; }
}

async function freeze(page) {
  // Wait for everything whose arrival time changes what is painted: webfonts
  // (text falls back to a system face until they land) and images. Without
  // this, different pages come out "changed" on every run and the harness is
  // noise rather than signal.
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    const imgs = Array.from(document.images);
    await Promise.all(imgs.map(i => i.complete ? null :
      new Promise(r => { i.addEventListener('load', r, { once: true });
                         i.addEventListener('error', r, { once: true }); })));
    await Promise.all(imgs.map(i => i.decode().catch(() => {})));
  });
  const globalTime = await page.evaluate(() => {
    // Stop every animation where it is. This used to also set the global
    // timeline to 8 s "for the same frame every run", but that timeline's time
    // is not seconds-since-load here: measured 2e11–3e12 on most loads and
    // ~1 s on some, in the unmodified site too — so time(8) moved every
    // animation to an arbitrary point, backwards or forwards. The page is now
    // captured only once ready() says the intro is over.
    let t = null;
    if (window.gsap) {
      t = window.gsap.globalTimeline.time();
      window.gsap.globalTimeline.pause();
    }
    return t;
  });
  await page.evaluate(() => {
    const clock = document.querySelector('#timeSpan');
    if (clock) clock.textContent = '12:00 PM GMT+3';
    // Scroll-reveal elements start hidden and are animated in by ScrollTrigger.
    // Whether a given one has been revealed by screenshot time depends on how
    // fast the bundle loaded, so force them all to their settled state. Without
    // this, a build that merely loads *faster* reports phantom diffs: layout,
    // fonts and classes are identical, only the reveal progress differs.
    document.querySelectorAll('.fade-in, .once-in, .stats, .span-line-inner, [data-scroll]')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });

    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{animation:none !important;transition:none !important;' +
                        'caret-color:transparent !important}';
    document.head.appendChild(style);
    window.scrollTo(0, 0);
  });
  return globalTime;
}

/**
 * Screenshot only once the page has stopped changing.
 *
 * A single timed screenshot is not reproducible here: identical builds produced
 * 1-3 "changed" pages per run, at 1-4% of pixels, which overlaps the 4-18% a
 * real regression produces. Shooting repeatedly until two consecutive frames
 * are byte-identical removes the timing entirely.
 */
async function stableShot(page, dest, attempts = 6) {
  const opts = { mask: MASK.map(sel => page.locator(sel)), maskColor: '#FF00FF' };
  let prev = await page.screenshot(opts);
  for (let i = 0; i < attempts; i++) {
    await page.waitForTimeout(400);
    const next = await page.screenshot(opts);
    if (next.equals(prev)) { fs.writeFileSync(dest, next); return true; }
    prev = next;
  }
  fs.writeFileSync(dest, prev);
  return false;   // never settled; the comparison will surface it
}

const slug = (p, v) => (p.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'home') + '__' + v;

async function compare(a, b) {
  const [A, B] = await Promise.all([
    sharp(a).raw().toBuffer({ resolveWithObject: true }),
    sharp(b).raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
    return { ratio: 1, changed: null, note: `size ${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}` };
  }
  const ch = A.info.channels;
  let diff = 0;
  const px = A.info.width * A.info.height;
  for (let i = 0; i < px; i++) {
    const o = i * ch;
    if (Math.abs(A.data[o] - B.data[o]) > PIXEL_TOLERANCE ||
        Math.abs(A.data[o + 1] - B.data[o + 1]) > PIXEL_TOLERANCE ||
        Math.abs(A.data[o + 2] - B.data[o + 2]) > PIXEL_TOLERANCE) diff++;
  }
  return { ratio: diff / px, changed: diff, note: '' };
}

/**
 * Capture (and in 'current' mode compare) every target at every viewport.
 * Returns { results, failed } — failed = DIFF + FAILED cases (baseline mode:
 * FAILED captures). Every page is closed and the browser shut down whatever
 * happens; one failing case does not stop the others.
 */
async function run({ root = ROOT, dir = DIR, mode = 'current', targets = TARGETS, viewports = VIEWPORTS,
                     readyTimeout = 20000, actionTimeout = 8000, log = console.log } = {}) {
  fs.mkdirSync(path.join(dir, mode), { recursive: true });
  const { srv, port } = await serve(root);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const results = [];
  const fail = (r, reason) => { r.status = 'FAILED'; r.reason = reason; log(`  FAILED  ${r.label} (${r.viewport}) — ${reason}`); };
  try {
    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1,
      });
      try {
        for (const { route, name: state, action } of targets) {
          const label = state ? `${route} [${state}]` : route;
          const name = slug(route + (state ? '_' + state : ''), vp.name) + '.png';
          const r = { route, state: state || null, label, viewport: vp.name, file: name, status: null };
          results.push(r);
          const page = await ctx.newPage();
          try {
            // The contact pages embed a Google Maps iframe. It is third-party, it
            // loads over the network, and it reflows when it arrives — which made
            // those two pages report a ~3% diff at random, in every build including
            // the unmodified one. Block it: the harness is here to catch OUR
            // regressions, not to measure Google's CDN.
            await page.route('**://*.google.com/**', q => q.abort());
            await page.route('**://*.gstatic.com/**', q => q.abort());
            // The pages carry the live GA4 / GTM / Google Ads tags. Loaded from
            // 127.0.0.1 they would still report to the production property — every
            // screenshot a page_view in the owner's analytics. The tags draw
            // nothing, so blocking them changes no pixel.
            await page.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googleadservices\.com|doubleclick\.net/,
              q => q.abort());
            // absolute production URLs (the blog's links to the site bundles) are
            // served from the working tree, never fetched from the live site
            await page.route('https://zero2one.sa/**', q => {
              const local = path.join(root, decodeURIComponent(new URL(q.request().url()).pathname));
              return local.startsWith(root) && fs.existsSync(local) && fs.statSync(local).isFile()
                ? q.fulfill({ path: local }) : q.abort();
            });
            try {
              await page.goto(origin + route, { waitUntil: 'load', timeout: 60000 });
            } catch (e) {
              fail(r, `failed to load: ${e.message.split('\n')[0]}`);
              continue;
            }
            // let the intro finish and everything settle
            const isReady = await ready(page, readyTimeout);
            await page.waitForTimeout(500);
            if (action) {
              try {
                await action(page, { timeout: actionTimeout });
              } catch (e) {
                fail(r, `requested state "${state || 'action'}" not established: ${e.message}`);
                const diag = path.join(dir, 'failures'); fs.mkdirSync(diag, { recursive: true });
                await page.screenshot({ path: path.join(diag, name) }).then(() => { r.diagnostic = path.join(diag, name); }).catch(() => {});
                continue;
              }
            }
            await freeze(page);
            await page.waitForTimeout(250);
            const shot = path.join(dir, mode, name);
            // Two regions are legitimately non-deterministic and would otherwise
            // report a diff on every run: the hero wordmark is an infinite GSAP
            // marquee whose phase depends on when the tween happened to start, and
            // the contact map is a third-party iframe. Mask them rather than chase
            // them — a change to either is visible in the surrounding layout anyway.
            const settled = await stableShot(page, shot);
            if (!isReady) { fail(r, `NOT READY after ${readyTimeout / 1000} s (intro/fonts/transition/animations) — shot kept for inspection`); continue; }
            if (!settled) { fail(r, 'frames never settled (two identical screenshots in a row) — shot kept for inspection'); continue; }
            if (mode === 'baseline') { r.status = 'captured'; continue; }
            const base = path.join(dir, 'baseline', name);
            if (!fs.existsSync(base)) { fail(r, `no baseline image (${name}) — comparison incomplete`); continue; }
            const { ratio, changed, note } = await compare(base, shot);
            Object.assign(r, { ratio, changed });
            const pct = (ratio * 100).toFixed(3) + '%';
            if (ratio > FAIL_RATIO) { r.status = 'DIFF'; log(`  DIFF    ${label} (${vp.name})  ${changed === null ? note : changed + ' px'} = ${pct}`); }
            else if (changed === 0) { r.status = 'identical'; log(`  same    ${label} (${vp.name})  0 px`); }
            else { r.status = 'below threshold'; log(`  below   ${label} (${vp.name})  ${changed} px = ${pct} (not identical)`); }
          } catch (e) {
            if (!r.status) fail(r, `unexpected error: ${e.message.split('\n')[0]}`);
          } finally {
            await page.close().catch(() => {});
          }
        }
      } finally {
        await ctx.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
    srv.close();
  }
  const count = k => results.filter(r => r.status === k).length;
  const failedCases = results.filter(r => r.status === 'FAILED');
  if (mode === 'baseline') {
    log(`\n  baseline: ${count('captured')} of ${results.length} captured in ${path.join(dir, 'baseline')}`);
  } else {
    log(`\n  compared ${count('identical') + count('below threshold') + count('DIFF')} of ${results.length} required: ` +
        `${count('identical')} identical · ${count('below threshold')} below threshold (not identical) · ${count('DIFF')} DIFF · ${count('FAILED')} FAILED`);
    if (count('DIFF')) log('  inspect .visual/current/ against .visual/baseline/');
  }
  if (failedCases.length) {
    log(`  coverage INCOMPLETE — ${failedCases.length} case(s) failed:`);
    for (const r of failedCases) log(`    ${r.label} (${r.viewport}): ${r.reason}`);
  }
  return { results, failed: count('DIFF') + failedCases.length };
}

// Command line. VISUAL_CHECK_CONFIG (tests only) points at a JSON file that
// replaces root / dir / targets / viewports / timeouts; a target's "action"
// is looked up by name.
if (require.main === module) {
  (async () => {
    let opts = { mode: MODE };
    if (process.env.VISUAL_CHECK_CONFIG) {
      const c = JSON.parse(fs.readFileSync(process.env.VISUAL_CHECK_CONFIG, 'utf8'));
      const ACTIONS = { openMenu };
      opts = { ...opts, ...c, targets: c.targets.map(t => ({ ...t, action: t.action ? ACTIONS[t.action] : undefined })) };
      console.log(`  (test configuration from ${process.env.VISUAL_CHECK_CONFIG})`);
    }
    const { failed } = await run(opts);
    process.exit(Math.min(failed, 255));
  })().catch(e => { console.error(e); process.exit(99); });
}

module.exports = { run, openMenu, ready, freeze, compare, stableShot, slug, StateError, TARGETS, VIEWPORTS, FAIL_RATIO, PIXEL_TOLERANCE };
