/**
 * ZERO 2 ONE — rolling letters: PE-1 (stack overflow) and PE-2 (leaks)
 * =====================================================================
 *
 * PE-1  initScrollLetters()/roll() built an endless (repeat:-1) timeline even
 *       on pages without the rolling elements. It lasted 0 s, and its
 *       onReverseComplete then kept completing the reverse again, until
 *       "Maximum call stack size exceeded" — once the scroll direction had
 *       flipped. Checked two ways:
 *         S1  root cause: no endless timeline of zero duration on any page
 *         S2  the real trigger: the scroll sequence that reproduced it
 *             (down, up, wait until the reversed playhead reaches 0, down),
 *             repeated on several pages, native scrolling; no RangeError
 *         S3  the feature still works where it exists (home): one endless
 *             timeline of 18 s, playing, reversing on scroll-up, no errors
 *
 * PE-2  every page barba showed added window "resize" listeners (and kept the
 *       previous page's timelines alive). This counts the listeners that are
 *       ACTIVE, through the DevTools protocol (DOMDebugger.getEventListeners
 *       on window and document), grouped by type and source file — not how
 *       often addEventListener was called — after a direct load and after
 *       each of 6 barba navigations, plus the live endless timelines:
 *         L1  window "resize" listeners from the site's own script do not grow
 *             with navigation (same page, same count)
 *         L2  endless timelines alive = the ones the current page needs
 *         L3  no window/document listener of ANY type from the site's
 *             script grows (first vs last /about/ visit)
 *         L4  endless tweens (the cursor follower's position loop) do not
 *             grow either
 *
 * Page errors are strict at every stage — direct load, scroll sequence, the
 * home animation, repeated navigation and the lifecycle checks: S4 fails on
 * ANY uncaught error, PE-1 included. PE-1 was fixed in the 2026-09-28 update;
 * classifyError() only names an error in the output, it exempts nothing.
 *
 * Fault injection (tests of this test only — tools/test_error_strictness.js):
 * Z2O_TEST_INJECT_PAGE_ERROR=load|home|navigation throws a synthetic
 * PE-1-shaped RangeError in that stage, to prove the suite then fails.
 *
 * Every request leaving 127.0.0.1 is stopped (tools/test_support.js).
 * Usage:  node tools/test_scroll_letters.js [--out results.json]
 * Exit code = number of failed checks.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const { serve, isolate, settled, classifyError } = require('./test_support');

const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
const INJECT = process.env.Z2O_TEST_INJECT_PAGE_ERROR || '';
// a synthetic error shaped like PE-1: same message, thrown from a function
// named onReverseComplete, so classifyError() labels it PE-1
const injectPE1 = page => page.evaluate(() => setTimeout(function onReverseComplete() {
  throw new RangeError('Maximum call stack size exceeded');
}, 0));
if (INJECT) console.log(`  !! FAULT INJECTION ACTIVE: synthetic PE-1 error in stage "${INJECT}" — this run is expected to FAIL`);
const results = [];
function check(id, name, pass, detail) {
  results.push({ id, name, pass: !!pass, detail });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${id.padEnd(4)} ${name}${pass ? '' : '  → ' + JSON.stringify(detail).slice(0, 220)}`);
}
function info(id, name, detail) {
  results.push({ id, name, pass: true, info: true, detail });
  console.log(`  info  ${id.padEnd(4)} ${name}: ${JSON.stringify(detail).slice(0, 400)}`);
}

const timelines = () => {
  const all = gsap.globalTimeline.getChildren(false, false, true).filter(t => t.repeat && t.repeat() === -1);
  // endless top-level tweens (the cursor follower's position loop is one)
  const tweens = gsap.globalTimeline.getChildren(false, true, false).filter(t => t.repeat && t.repeat() === -1);
  return { endless: all.length, zeroDuration: all.filter(t => t.duration() === 0).length,
           durations: all.map(t => +t.duration().toFixed(1)), timeScales: all.map(t => +t.timeScale().toFixed(2)),
           endlessTweens: tweens.length };
};

(async () => {
  const { srv, origin } = await serve();
  const browser = await chromium.launch();
  const errors = [];

  // ------------------------------------------------------------ S1 + S2
  const PAGES = ['/ar/services/seo-riyadh/', '/ar/', '/services/seo-riyadh/', '/about/', '/', '/ar/about/'];
  const s1 = {}, s2 = {};
  for (const url of PAGES) for (let rep = 1; rep <= 2; rep++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await isolate(ctx, origin);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => { errs.push(classifyError(e) || 'unclassified'); errors.push({ stage: 'direct load + scroll', url, rep, kind: classifyError(e) || 'unclassified', error: String(e).slice(0, 100) }); });
    await p.goto(origin + url, { waitUntil: 'load' }); await p.waitForTimeout(/\/(ar\/)?$/.test(url) ? 5500 : 3500);
    if (INJECT === 'load' && url === PAGES[0] && rep === 1) { await injectPE1(p); await p.waitForTimeout(200); }
    if (rep === 1) s1[url] = await p.evaluate(timelines);
    await p.evaluate(() => window.scrollTo(0, 1500)); await p.waitForTimeout(800);
    await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(800);
    const back = await p.evaluate(() => Math.max(0, ...gsap.globalTimeline.getChildren(false, false, true)
      .filter(t => t.repeat && t.repeat() === -1).map(t => t.rawTime())));
    await p.waitForTimeout(Math.min(back * 1000 + 1500, 12000));
    await p.evaluate(() => window.scrollTo(0, 1800)); await p.waitForTimeout(1500);
    s2[`${url} #${rep}`] = errs.length;           // every error counts, PE-1 or not
    await ctx.close();
  }
  check('S1', 'no endless timeline of zero duration on any page (root cause of PE-1)',
    Object.values(s1).every(t => t.zeroDuration === 0), s1);
  check('S2', 'scroll down/up/wait/down on 6 pages ×2: no page error of any kind',
    Object.values(s2).every(n => n === 0), s2);

  // ------------------------------------------------------------ S3
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await isolate(ctx, origin);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => { errs.push(String(e).slice(0, 100)); errors.push({ stage: 'home animation', url: '/', kind: classifyError(e) || 'unclassified', error: String(e).slice(0, 100) }); });
    await p.goto(origin + '/', { waitUntil: 'load' });
    await p.waitForFunction(() => getComputedStyle(document.documentElement).cursor !== 'wait' &&
      [...document.querySelectorAll('.loading-screen')].every(el => el.getBoundingClientRect().bottom <= 1));
    // The original loader restores the cursor before it calls scroll.start().
    // Wheel input during that interval is intentionally discarded by Locomotive.
    await p.waitForFunction(() => typeof scroll === 'object' && scroll.scroll.stop === false);
    if (INJECT === 'home') { await injectPE1(p); await p.waitForTimeout(200); }
    // Establish the direction under test with actual input. Loader/ScrollTrigger
    // refresh can legitimately leave the timeline reversed after a fresh load;
    // assuming that its initial direction is positive is not a feature test.
    await p.mouse.move(700, 450);
    for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(150); }
    await p.waitForTimeout(1200);
    const down = await p.evaluate(timelines);
    const t0 = await p.evaluate(() => { const t = gsap.globalTimeline.getChildren(false, false, true).find(t => t.repeat && t.repeat() === -1); return t ? { d: t.duration(), time: t.totalTime() } : null; });
    await p.waitForTimeout(1000);
    const t1 = await p.evaluate(() => { const t = gsap.globalTimeline.getChildren(false, false, true).find(t => t.repeat && t.repeat() === -1); return t ? t.totalTime() : null; });
    for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, -400); await p.waitForTimeout(150); }
    await p.waitForTimeout(1200);
    const up = await p.evaluate(timelines);
    check('S3', 'home: the rolling name still runs (18 s loop, playing, reverses on scroll-up), no errors',
      !!t0 && t0.d === 18 && down.timeScales.some(s => s > 0) && t1 > t0.time && up.timeScales.some(s => s < 0) && errs.length === 0,
      { t0, t1, down, up, errs });
    await ctx.close();
  }

  // ------------------------------------------------------------ L1–L3
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await isolate(ctx, origin);
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push({ stage: 'navigation + lifecycle', url: p.url(), kind: classifyError(e) || 'unclassified', error: String(e).slice(0, 100) }));
  const cdp = await ctx.newCDPSession(p);
  const scripts = {};
  cdp.on('Debugger.scriptParsed', e => { scripts[e.scriptId] = (e.url || '').split('/').pop().split('?')[0] || 'inline'; });
  await cdp.send('Debugger.enable');
  const listeners = async expr => {
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    const out = {};
    for (const l of listeners) { const k = `${l.type}@${scripts[l.scriptId] || l.scriptId}`; out[k] = (out[k] || 0) + 1; }
    return out;
  };
  const snapshot = async label => {
    await p.waitForTimeout(2600);                    // old timelines are released 2 s after a navigation
    const w = await listeners('window'), d = await listeners('document');
    return { label, windowResizeSite: w['resize@index-new.min.js'] || 0, window: w, document: d, tl: await p.evaluate(timelines) };
  };
  const steps = [];
  await p.goto(origin + '/about/', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  steps.push(await snapshot('/about/ (direct load)'));
  for (const dest of ['/services/', '/work/', '/', '/about/', '/services/', '/about/']) {
    await p.evaluate(d => { const cs = [...document.querySelectorAll('[data-barba="container"]')]; const a = cs[cs.length - 1].querySelector(`a[href="${d}"]`); a && a.click(); }, dest);
    await settled(p, dest);
    if (INJECT === 'navigation' && steps.length === 3) await injectPE1(p);
    steps.push(await snapshot(dest));
  }
  await ctx.close();
  for (const s of steps) console.log(`        ${s.label.padEnd(22)} window resize (site script) ${s.windowResizeSite} · document mousemove ${s.document['mousemove@index-new.min.js'] || 0} · endless timelines ${s.tl.endless} (zero-duration ${s.tl.zeroDuration}) · endless tweens ${s.tl.endlessTweens}`);
  const aboutCounts = steps.filter(s => s.label.startsWith('/about/')).map(s => s.windowResizeSite);
  check('L1', 'window resize listeners from the site script do not grow with navigation (every /about/ visit: same count)',
    aboutCounts.every(n => n === aboutCounts[0]) && Math.max(...steps.map(s => s.windowResizeSite)) <= aboutCounts[0] + 1,
    steps.map(s => [s.label, s.windowResizeSite]));
  check('L2', 'endless timelines alive = what the page needs (home 1, others 0)',
    steps.every(s => s.tl.endless === (s.label === '/' ? 1 : 0)), steps.map(s => [s.label, s.tl.endless]));
  // L3: every listener key from the site's own scripts, first vs last /about/ visit
  const site = k => /index-new\.min\.js|dom\.min\.js|i18n\.min\.js/.test(k);
  const first = steps[0], last = steps[steps.length - 1];
  const growth = [];
  for (const where of ['window', 'document']) {
    const keys = new Set([...Object.keys(first[where]), ...Object.keys(last[where])]);
    for (const k of keys) if (site(k) && (last[where][k] || 0) !== (first[where][k] || 0)) growth.push(`${where} ${k}: ${first[where][k] || 0} → ${last[where][k] || 0}`);
  }
  check('L3', 'no window/document listener from the site script grows with navigation (first vs last /about/ visit, every type)',
    growth.length === 0, growth);
  const aboutTweens = steps.filter(s => s.label.startsWith('/about/')).map(s => s.tl.endlessTweens);
  check('L4', 'endless tweens (the cursor follower loop) do not grow with navigation',
    aboutTweens.every(n => n === aboutTweens[0]) && Math.max(...steps.map(s => s.tl.endlessTweens)) <= aboutTweens[0] + 1,
    steps.map(s => [s.label, s.tl.endlessTweens]));
  check('S4', 'no uncaught page error of ANY kind (PE-1 included) in any stage: load, scroll, home animation, navigation, lifecycle checks',
    errors.length === 0, errors.slice(0, 5).map(e => `${e.kind} · ${e.stage} · ${e.url}: ${e.error}`));
  const byKind = {}; for (const e of errors) byKind[`${e.kind} in ${e.stage}`] = (byKind[`${e.kind} in ${e.stage}`] || 0) + 1;
  info('S5', 'page errors by kind and stage (diagnostic only — S4 already failed if this is not empty)', Object.keys(byKind).length ? byKind : 'none');

  await browser.close(); srv.close();
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n  ${results.filter(r => r.pass && !r.info).length} passed · ${failed} failed`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), results, steps, errors }, null, 1));
  process.exit(failed);
})().catch(e => { console.error(e); process.exit(99); });
