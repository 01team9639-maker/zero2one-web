/**
 * ZERO 2 ONE — page-head synchronisation test
 * ===========================================
 *
 * barba swaps the page body and leaves <head> alone, so after a client-side
 * navigation the canonical, hreflang, description, Open Graph, Twitter and
 * JSON-LD of the PREVIOUS page can stay behind. This test walks real links
 * between real pages and, after every transition, compares the managed head
 * set with the one the same URL has when loaded directly. Direct load is the
 * source of truth.
 *
 * Managed set (must match the direct load exactly, with no duplicates):
 *   <title> · meta description · meta keywords · meta robots · link canonical
 *   link alternate[hreflang] · meta og:* · meta twitter:* · application/ld+json
 *   and <html lang/dir>.
 *
 * Analytics: the tag libraries are allowed to load so the page behaves as in
 * production, and every measurement request they make is aborted and recorded
 * (tools/test_support.js). Nothing reaches Google. The recorded page_view
 * sequence is written out so a before/after comparison can show tracking is
 * unchanged.
 *
 * Usage:  node tools/test_head_sync.js [--out results.json]
 * Exit code = number of failed transitions.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const { serve, isolate, settled, classifyError } = require('./test_support');

const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;

const managed = () => {
  const h = document.head;
  const all = sel => [...h.querySelectorAll(sel)];
  const norm = s => { try { return JSON.stringify(JSON.parse(s)); } catch (e) { return 'INVALID:' + s.slice(0, 40); } };
  return {
    title: [document.title],
    description: all('meta[name="description"]').map(e => e.getAttribute('content')),
    keywords: all('meta[name="keywords"]').map(e => e.getAttribute('content')),
    robots: all('meta[name="robots"]').map(e => e.getAttribute('content')),
    canonical: all('link[rel="canonical"]').map(e => e.getAttribute('href')),
    hreflang: all('link[rel="alternate"][hreflang]').map(e => `${e.getAttribute('hreflang')}=${e.getAttribute('href')}`).sort(),
    og: all('meta[property^="og:"]').map(e => `${e.getAttribute('property')}=${e.getAttribute('content')}`).sort(),
    twitter: all('meta[name^="twitter:"]').map(e => `${e.getAttribute('name')}=${e.getAttribute('content')}`).sort(),
    jsonld: all('script[type="application/ld+json"]').map(e => norm(e.textContent)).sort(),
    html: [`${document.documentElement.lang}|${document.documentElement.dir}`],
  };
};

function diff(a, b) {
  const out = {};
  for (const k of Object.keys(b)) {
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) out[k] = { afterNav: (a[k] || []).map(v => String(v).slice(0, 90)), direct: (b[k] || []).map(v => String(v).slice(0, 90)) };
  }
  return out;
}

function duplicates(m) {
  const d = [];
  for (const k of ['description', 'keywords', 'robots', 'canonical']) if (m[k].length > 1) d.push(`${k}×${m[k].length}`);
  for (const k of ['hreflang', 'og', 'twitter', 'jsonld']) if (new Set(m[k]).size !== m[k].length) d.push(`${k} repeated`);
  return d;
}

const PLAN = {
  en: ['/', '/services/seo-riyadh/', '/services/web-design-riyadh/', '/work/', '/work/alostaz-seo/'],
  ar: ['/ar/', '/ar/services/seo-riyadh/', '/ar/services/web-design-riyadh/', '/ar/work/', '/ar/work/habba/'],
};

(async () => {
  const { srv, origin } = await serve();
  const browser = await chromium.launch();
  const direct = {};
  const steps = [];
  const pageErrors = [];

  // direct-load reference for every URL the walk will reach
  const refCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await isolate(refCtx, origin);
  const urls = [...PLAN.en, ...PLAN.ar, '/work/habba/'];
  for (const u of urls) {
    const p = await refCtx.newPage();
    await p.goto(origin + u, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    direct[u] = await p.evaluate(managed);
    await p.close();
  }
  await refCtx.close();

  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const log = await isolate(ctx, origin, { allowTagLibraries: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => pageErrors.push(`${classifyError(e) || 'NEW'} · ${p.url()}: ${String(e).slice(0, 160)}`));
    const plan = PLAN[lang];
    await p.goto(origin + plan[0], { waitUntil: 'load' });
    await p.waitForTimeout(6000);
    await p.mouse.move(300, 300);   // a real visitor's first interaction also loads the deferred tags

    const record = async (label, how, path) => {
      const m = await p.evaluate(managed);
      const d = diff(m, direct[path]);
      const dup = duplicates(m);
      const pv = log.measurement.filter(x => x.en === 'page_view' || x.body_events.includes('page_view'))
        .map(x => `${x.dl}|${x.dt}`);
      steps.push({ lang, label, how, path, pass: Object.keys(d).length === 0 && dup.length === 0,
                   mismatches: d, duplicates: dup, pageViewsSoFar: pv });
      const s = steps[steps.length - 1];
      console.log(`  ${s.pass ? 'ok  ' : 'FAIL'}  ${lang}  ${label.padEnd(34)} ${path}` +
                  (s.pass ? '' : `  → ${Object.keys(d).join(', ')}${dup.length ? ' · dup: ' + dup.join(',') : ''}`));
    };

    await record('direct load', 'goto', plan[0]);
    for (let i = 1; i < plan.length; i++) {
      const dest = plan[i];
      const clicked = await p.evaluate(d => {
        const cs = [...document.querySelectorAll('[data-barba="container"]')];
        const a = cs[cs.length - 1].querySelector(`a[href="${d}"]`);
        if (!a) return false; a.click(); return true;
      }, dest);
      await settled(p, dest);
      await record(`${plan[i - 1]} → ${dest}`, clicked ? 'link click' : 'NO LINK', dest);
    }
    await p.goBack(); await settled(p, plan[plan.length - 2]);
    await record('back', 'history', plan[plan.length - 2]);
    await p.goBack(); await settled(p, plan[plan.length - 3]);
    await record('back', 'history', plan[plan.length - 3]);
    await p.goForward(); await settled(p, plan[plan.length - 2]);
    await record('forward', 'history', plan[plan.length - 2]);

    if (lang === 'ar') {
      // the existing language switch is a full page load (data-barba-prevent)
      await p.evaluate(() => { const a = document.querySelector('a[href="/ar/work/habba/"]'); a && a.click(); });
      await settled(p, '/ar/work/habba/');
      const href = await p.evaluate(() => {
        const a = document.querySelector('[data-barba="container"]:last-of-type .nav-bar .btn-lang a');
        const h = a && a.getAttribute('href'); a && a.click(); return h;
      });
      await p.waitForLoadState('load'); await p.waitForTimeout(3000);
      await record(`language switch (${href})`, 'full load', '/work/habba/');
    }
    steps.push({ lang, measurementAborted: log.measurement.length, tagLibraryDownloads: log.tagLibraries.length, blockedOther: log.blocked.length,
                 pageViews: log.measurement.filter(x => x.en === 'page_view' || x.body_events.includes('page_view')).map(x => `${x.dl}|${x.dt}`) });
    await ctx.close();
  }

  await browser.close(); srv.close();
  const failed = steps.filter(s => s.pass === false).length;
  console.log(`\n  ${steps.filter(s => s.pass === true).length} passed · ${failed} failed · page errors ${pageErrors.length}`);
  for (const s of steps.filter(x => x.pageViews)) {
    console.log(`  ${s.lang} tag library downloads (code only, allowed): ${s.tagLibraryDownloads} · measurement requests answered locally, never forwarded: ${s.measurementAborted} · other external requests aborted: ${s.blockedOther}`);
    console.log(`  ${s.lang} page_view (answered locally): ${s.pageViews.join('  ·  ')}`);
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), steps, direct, pageErrors }, null, 1));
  process.exit(failed + pageErrors.length);
})().catch(e => { console.error(e); process.exit(99); });
