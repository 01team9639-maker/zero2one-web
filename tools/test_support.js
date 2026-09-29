/**
 * ZERO 2 ONE — shared helpers for the browser tests
 * =================================================
 *
 * Two things every browser test here needs, and must get right the same way:
 *
 *   serve()    a static server for the working tree, bound to 127.0.0.1 on a
 *              free port. Directory URLs resolve to index.html, the way
 *              Hostinger serves them. No .htaccess, no PHP.
 *
 *   isolate()  routes every request of a browser context. Only the local
 *              server is reachable. Everything else is aborted and recorded —
 *              above all Google's measurement endpoints, which are answered
 *              locally with an empty 204 and never forwarded: a test that loads a
 *              page with the live GA4 / Google Ads tags and lets them fire
 *              sends page_views from 127.0.0.1 into the production property.
 *              The contact destinations (wa.me, WhatsApp, Gmail compose) are
 *              aborted too, so a test can click them without starting a chat.
 *
 *              { mapProduction: true } serves https://zero2one.sa/assets/* from
 *              the working tree (blog pages reference the site's bundles by
 *              absolute URL).
 *
 *              { allowTagLibraries: true } lets gtm.js and gtag/js download
 *              (so the tags run and their requests can be observed) while
 *              still aborting every measurement request they then make.
 *
 * Used by tools/test_nav_a11y.js and tools/test_head_sync.js.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.otf': 'font/otf',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain',
};

function serve(root = ROOT) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(root, p);
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, origin: `http://127.0.0.1:${srv.address().port}` }));
  });
}

const TAG_LIBRARY = /^https:\/\/www\.googletagmanager\.com\/(gtm\.js|gtag\/js)\b/;
const MEASUREMENT = /(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|googleadservices\.com|doubleclick\.net|google\.[a-z.]+\/(pagead|ccm|ads))/;

/**
 * @returns {{blocked: Array, measurement: Array}} live arrays, filled as the
 *          context runs — read them after the test to prove what was stopped.
 */
async function isolate(context, origin, { allowTagLibraries = false, mapProduction = false } = {}) {
  const log = { blocked: [], measurement: [], tagLibraries: [], mapped: 0 };
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    // Blog pages load the site's CSS/JS by absolute URL. { mapProduction }
    // serves those from the working tree instead, so a blog page runs the
    // code under test — without touching the generated blog output.
    if (mapProduction && url.startsWith('https://zero2one.sa/assets/')) {
      const local = path.join(ROOT, new URL(url).pathname);
      if (local.startsWith(ROOT) && fs.existsSync(local)) { log.mapped++; return route.fulfill({ path: local }); }
    }
    // tag LIBRARY downloads (code, not measurement) — recorded separately
    if (allowTagLibraries && TAG_LIBRARY.test(url)) { log.tagLibraries.push(url.split('?')[0]); return route.continue(); }
    const entry = { url: url.split('?')[0], type: route.request().resourceType() };
    if (MEASUREMENT.test(url)) {
      const q = new URL(url).searchParams;
      entry.en = q.get('en') || '';
      entry.tid = q.get('tid') || '';
      entry.dl = q.get('dl') ? new URL(q.get('dl')).pathname : '';
      entry.dt = q.get('dt') || '';
      const body = route.request().postData() || '';
      entry.body_events = body.split('\n').map(l => (l.match(/(?:^|&)en=([^&]+)/) || [])[1]).filter(Boolean);
      log.measurement.push(entry);
      // Answered locally, never forwarded. Aborting instead makes gtag retry
      // the failed request (one page_view showed up five times) and hold back
      // the requests queued behind it, which falsifies any event count.
      return route.fulfill({ status: 204, body: '' });
    }
    log.blocked.push(entry);
    return route.abort();
  });
  return log;
}

/**
 * Names for uncaught errors that have been seen before, so a test's output can
 * say what an error is. Classification is diagnostic only: no suite treats a
 * classified error as acceptable — every uncaught page error fails. Each
 * entry must be matched on its stack, not just its message.
 *
 *   PE-1  initScrollLetters()/roll() in assets/js/index-new.js: a page without
 *         roll targets got a zero-duration repeat:-1 timeline whose
 *         onReverseComplete set the playhead to where it already was, which
 *         fired onReverseComplete again → "Maximum call stack size exceeded".
 *         Fixed in the 2026-09-28 update (no targets, no timeline); if it
 *         ever appears again it is a regression and fails the suites.
 */
const KNOWN_ERRORS = [
  { id: 'PE-1', test: e => /Maximum call stack size exceeded/.test(e.message) && /onReverseComplete/.test(e.stack || '') },
];
function classifyError(e) {
  const k = KNOWN_ERRORS.find(x => x.test(e));
  return k ? k.id : null;
}

/** The barba container that is (or is becoming) the current page. */
const CURRENT = '[data-barba="container"]:last-of-type';

/** Wait until a barba transition to `pathname` has fully settled. */
async function settled(page, pathname, timeout = 15000) {
  await page.waitForFunction(p =>
    location.pathname === p &&
    !document.documentElement.classList.contains('is-transitioning') &&
    document.querySelectorAll('[data-barba="container"]').length === 1,
    pathname, { timeout });
  await page.waitForTimeout(700);
}

module.exports = { ROOT, serve, isolate, settled, CURRENT, classifyError };
