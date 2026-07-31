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
 * Screenshots land in .visual/ (git-ignored). Exit code = number of pages that
 * differ beyond the threshold.
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

const PAGES = [
  '/', '/about/', '/work/', '/contact/', '/services/',
  '/services/web-design-riyadh/', '/services/seo-riyadh/', '/services/digital-advertising/',
  '/services/brand-identity/', '/services/social-media-management/', '/services/ecommerce-development/',
  '/ar/', '/ar/about/', '/ar/work/', '/ar/contact/', '/ar/services/',
  '/ar/services/web-design-riyadh/', '/ar/services/seo-riyadh/', '/ar/services/digital-advertising/',
  '/ar/services/brand-identity/', '/ar/services/social-media-management/', '/ar/services/ecommerce-development/',
];
const VIEWPORTS = [
  { name: 'mobile', width: 412, height: 915, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900 },
];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.otf': 'font/otf', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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
  await page.evaluate(() => {
    if (window.gsap) {
      // a fixed point on the global timeline -> the same frame every run
      window.gsap.globalTimeline.pause();
      window.gsap.globalTimeline.time(8);
    }
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
    return { ratio: 1, note: `size ${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}` };
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
  return { ratio: diff / px, note: '' };
}

(async () => {
  fs.mkdirSync(path.join(DIR, MODE), { recursive: true });
  const { srv, port } = await serve();
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  let failed = 0, checked = 0;

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1,
    });
    for (const route of PAGES) {
      const page = await ctx.newPage();
      // The contact pages embed a Google Maps iframe. It is third-party, it
      // loads over the network, and it reflows when it arrives — which made
      // those two pages report a ~3% diff at random, in every build including
      // the unmodified one. Block it: the harness is here to catch OUR
      // regressions, not to measure Google's CDN.
      await page.route('**://*.google.com/**', r => r.abort());
      await page.route('**://*.gstatic.com/**', r => r.abort());
      try {
        await page.goto(origin + route, { waitUntil: 'load', timeout: 60000 });
      } catch (e) {
        console.log(`  !!    ${route} (${vp.name}) failed to load: ${e.message.split('\n')[0]}`);
        await page.close();
        failed++;
        continue;
      }
      // let the intro finish and everything settle
      await page.waitForTimeout(4000);
      await freeze(page);
      await page.waitForTimeout(250);
      const name = slug(route, vp.name) + '.png';
      const shot = path.join(DIR, MODE, name);
      // Two regions are legitimately non-deterministic and would otherwise
      // report a diff on every run: the hero wordmark is an infinite GSAP
      // marquee whose phase depends on when the tween happened to start, and
      // the contact map is a third-party iframe. Mask them rather than chase
      // them — a change to either is visible in the surrounding layout anyway.
      await stableShot(page, shot);
      await page.close();

      if (MODE === 'current') {
        const base = path.join(DIR, 'baseline', name);
        if (!fs.existsSync(base)) { console.log(`  ?  no baseline for ${route} (${vp.name})`); continue; }
        const { ratio, note } = await compare(base, shot);
        checked++;
        const pct = (ratio * 100).toFixed(2) + '%';
        if (ratio > FAIL_RATIO) {
          failed++;
          console.log(`  DIFF  ${route} (${vp.name})  ${pct} of pixels ${note}`);
        } else {
          console.log(`  ok    ${route} (${vp.name})  ${pct}`);
        }
      }
    }
    await ctx.close();
  }
  await browser.close();
  srv.close();

  if (MODE === 'baseline') {
    console.log(`\n  baseline captured: ${PAGES.length * VIEWPORTS.length} screenshots in .visual/baseline/`);
    process.exit(0);
  }
  console.log(`\n  ${checked - failed} unchanged / ${checked} compared`);
  if (failed) console.log(`  ${failed} page(s) differ — inspect .visual/current/ against .visual/baseline/`);
  process.exit(failed);
})();
