// Read-only runtime navigation audit. All traffic, including analytics, is isolated.
const { chromium } = require('playwright');
const { serve, isolate, settled } = require('./test_support');
const assert = require('assert').strict;

function traceModule() {
  window.__releaseDocument = 'same-document';
  window.__seoListenerSet = new Set();
  const ids = new WeakMap();
  let last = 0;
  const identity = value => { if (!ids.has(value)) ids.set(value, ++last); return ids.get(value); };
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (listener && new Error().stack.includes('seo-owner-review.min.js')) {
      window.__seoListenerSet.add(identity(this) + ':' + type + ':' + identity(listener));
    }
    return add.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    if (listener) window.__seoListenerSet.delete(identity(this) + ':' + type + ':' + identity(listener));
    return remove.call(this, type, listener, options);
  };
  window.__seoObserverSet = new Set();
  for (const name of ['IntersectionObserver', 'ResizeObserver']) {
    const Original = window[name];
    window[name] = class extends Original {
      constructor(...args) {
        super(...args);
        if (new Error().stack.includes('seo-owner-review.min.js')) window.__seoObserverSet.add(this);
      }
      disconnect() { window.__seoObserverSet.delete(this); return super.disconnect(); }
    };
  }
  window.__seoReveals = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, options) {
    if (this.matches('[data-reveal-scope="seo"]')) window.__seoReveals.push(this.dataset.aboutStep);
    return animate.call(this, frames, options);
  };
}

function snapshot() {
  const main = document.querySelector('main'), nav = main.querySelector('.nav-bar .btn-text-inner');
  const pick = element => {
    const s = getComputedStyle(element);
    return {
      background: s.backgroundColor, color: s.color, font: s.fontFamily, fontSize: s.fontSize,
      visibility: s.visibility, arrow: s.getPropertyValue('--z2o-action-arrow'), orange: s.getPropertyValue('--rf-orange')
    };
  };
  return { main: pick(main), body: pick(document.body), nav: pick(nav), toggle: pick(main.querySelector('.btn-hamburger')) };
}

async function revealProcess(page) {
  for (let i = 0; i < 7; i++) {
    await page.evaluate(index => scroll.scrollTo(document.querySelectorAll('[data-reveal-scope="seo"]')[index], {
      duration: 0, disableLerp: true, offset: -120
    }), i);
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(1600);
}

async function clean(page) {
  assert.equal(await page.locator('link[data-seo-owner-review]').count(), 0, 'SEO stylesheet leaves the document');
  assert.deepEqual(await page.evaluate(() => ({ listeners: __seoListenerSet.size, observers: __seoObserverSet.size })),
    { listeners: 0, observers: 0 }, 'all module listeners and observers are cleaned');
  assert.equal(await page.evaluate(() => window.__releaseDocument), 'same-document', 'navigation uses Barba, not reload');
}

(async () => {
  const { srv, origin } = await serve(), browser = await chromium.launch();
  try {
    for (const lang of ['ar', 'en']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await isolate(ctx, origin);
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(traceModule);
      const home = lang === 'ar' ? '/ar/' : '/', seo = (lang === 'ar' ? '/ar' : '') + '/services/seo-riyadh/';
      await page.goto(origin + home);
      await page.waitForTimeout(8500);
      await clean(page);
      const initial = await page.evaluate(snapshot);
      const enter = async () => {
        await page.locator('a[href="' + seo + '"]').first().evaluate(link => link.click());
        await settled(page, seo);
        await page.waitForTimeout(700);
        assert.equal(await page.locator('link[data-seo-owner-review]').count(), 1);
        assert.ok(await page.evaluate(() => __seoListenerSet.size > 0 && __seoObserverSet.size > 0), 'SEO listeners installed only here');
      };
      const leave = async () => {
        await page.locator('.nav-bar .btn-logo a').evaluate(link => link.click());
        await settled(page, home);
        await page.waitForTimeout(1700);
        await clean(page);
        assert.deepEqual(await page.evaluate(snapshot), initial, 'legacy home computed styles unchanged');
      };
      await enter();
      await revealProcess(page);
      const reveals = await page.evaluate(() => __seoReveals.slice());
      assert.equal(reveals.length, 7);
      await leave();
      await enter();
      await revealProcess(page);
      assert.deepEqual(await page.evaluate(() => __seoReveals), reveals, 'same-document return never replays process');
      assert.equal(await page.locator('script[data-seo-owner-review]').count(), 1, 'module only loads once');
      await leave();
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log('PASS legacy', lang, 'home → SEO → home → SEO → home; scoped CSS, full cleanup and persistent reveals');
      await ctx.close();
    }

    // The delayed request resolves only after we have left the captured SEO
    // container. Its continuation must not bind to a detached or ordinary page.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await isolate(ctx, origin);
    let releaseModule;
    const gate = new Promise(resolve => { releaseModule = resolve; });
    await ctx.route('**/seo-owner-review.min.js?v=*', async route => { await gate; await route.continue(); });
    const page = await ctx.newPage();
    await page.addInitScript(traceModule);
    await page.goto(origin + '/');
    await page.waitForTimeout(8500);
    await page.locator('a[href="/services/seo-riyadh/"]').first().evaluate(link => link.click());
    await settled(page, '/services/seo-riyadh/');
    assert.equal(await page.evaluate(() => !!window.z2oSeoOwnerReview), false, 'module request is still gated');
    await page.locator('.nav-bar .btn-logo a').evaluate(link => link.click());
    await settled(page, '/');
    releaseModule();
    await page.waitForFunction(() => !!window.z2oSeoOwnerReview);
    await page.waitForTimeout(500);
    await clean(page);
    console.log('PASS delayed module callback never initializes detached SEO or ordinary current container');
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
