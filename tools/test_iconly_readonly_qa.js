/* Local browser smoke tests. External traffic is blocked; forms are never submitted. */
const { chromium } = require('playwright');
const { isolate, settled } = require('./test_support');
const assert = require('assert').strict;

const origin = process.env.ICONLY_QA_ORIGIN || 'http://127.0.0.1:8766';

async function main() {
  const browser = await chromium.launch();
  try {
    for (const mobile of [false, true]) for (const lang of ['en', 'ar']) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
      const traffic = await isolate(context, origin, { mapProduction: true });
      let mockPosts = 0;
      await context.route('**/send.php', route => {
        assert.equal(route.request().method(), 'POST');
        mockPosts++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"message":"Local QA only"}' });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.dismiss());
      const prefix = lang === 'ar' ? '/ar' : '';
      async function go(route) {
        await page.goto(origin + route);
        await page.waitForFunction(() => getComputedStyle(document.documentElement).cursor !== 'wait' && (!document.querySelector('.loading-screen') || document.querySelector('.loading-screen').getBoundingClientRect().bottom <= 1));
        await page.waitForTimeout(700);
      }
      async function scrollTo(selector) {
        await page.evaluate(s => {
          const element = document.querySelector(s);
          if (typeof scroll === 'object' && scroll.scrollTo) scroll.scrollTo(element, { duration: 0, disableLerp: true, offset: -140 });
          else element.scrollIntoView({ block: 'center' });
        }, selector);
        await page.waitForTimeout(600);
      }
      const mask = (selector, pseudo = null) => page.locator(selector).first().evaluate((element, pseudo) => getComputedStyle(element, pseudo).maskImage, pseudo);
      async function chrome() {
        assert.ok((await mask('.btn-bars', '::before')).includes('/iconly/category.svg'));
        await page.locator('.btn-hamburger .btn-click').first().evaluate(element => element.click());
        await page.waitForTimeout(600);
        assert.equal(await page.locator('.btn-hamburger .btn-click').first().getAttribute('aria-expanded'), 'true');
        assert.ok((await mask('.btn-bars', '::before')).includes('/iconly/close-square.svg'));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
        assert.equal(await page.locator('.btn-hamburger .btn-click').first().getAttribute('aria-expanded'), 'false');
        for (const [type, name] of [['location', 'location'], ['phone', 'call'], ['email', 'message']]) {
          assert.ok((await mask('.footer-contact-icon-' + type)).includes('/iconly/' + name + '.svg'));
        }
        assert.ok((await mask('.footer-contact-icon-whatsapp')).includes('/social-whatsapp.svg'));
      }

      await go(prefix + '/');
      await chrome();
      // Navigate using a real site link and confirm the Barba lifecycle.
      await page.locator('.nav-bar a[href="' + prefix + '/about/"]').first().evaluate(element => element.click());
      await settled(page, prefix + '/about/');
      await chrome();
      await scrollTo('[data-logo-marquee]');
      const marquee = page.locator('[data-logo-marquee]').first();
      const toggle = marquee.locator('.logo-marquee-toggle');
      assert.equal(await toggle.isVisible(), true);
      assert.equal(await marquee.locator('.logo-marquee-icon').evaluate(element => getComputedStyle(element).display), 'none');
      const pause = marquee.locator('.logo-marquee-label-pause');
      const play = marquee.locator('.logo-marquee-label-play');
      assert.equal(await pause.isVisible(), true);
      assert.equal(await play.isVisible(), false);
      const beforeLabel = (await toggle.innerText()).trim();
      await toggle.click();
      assert.equal(await marquee.getAttribute('data-manual'), 'paused');
      assert.equal(await pause.isVisible(), false);
      assert.equal(await play.isVisible(), true);
      assert.notEqual((await toggle.innerText()).trim(), beforeLabel);
      await toggle.click();
      assert.equal(await marquee.getAttribute('data-running'), 'true');

      await go(prefix + '/work/');
      await scrollTo('[data-z2o-filters]');
      const all = page.locator('[data-z2o-filter="all"]');
      const seo = page.locator('[data-z2o-filter="seo"]');
      assert.ok((await mask('[data-z2o-filter="all"]', '::before')).includes('/iconly/tick-square.svg'));
      await seo.click();
      assert.equal(await seo.getAttribute('aria-pressed'), 'true');
      assert.equal(await all.getAttribute('aria-pressed'), 'false');
      assert.ok((await mask('[data-z2o-filter="seo"]', '::before')).includes('/iconly/tick-square.svg'));
      assert.ok((await page.locator('[data-z2o-filter-status]').textContent()).trim().length > 0);
      await all.click();
      assert.equal(await all.getAttribute('aria-pressed'), 'true');
      await scrollTo('[data-z2o-viewer]');
      await page.locator('[data-z2o-viewer]').first().click();
      await page.waitForFunction(() => document.querySelector('.z2o-viewer').open);
      assert.equal(await page.locator('.iconly-viewer-close').isVisible(), true);
      assert.ok((await mask('.iconly-viewer-close')).includes('/iconly/close-square.svg'));
      assert.ok((await page.locator('.z2o-viewer [data-close]').getAttribute('aria-label')).length > 0);
      await page.locator('.z2o-viewer [data-close]').click();
      assert.equal(await page.locator('.z2o-viewer').evaluate(element => element.open), false);

      await go(prefix + '/contact/');
      assert.equal(await page.locator('input[type="checkbox"]').count(), 0, 'Current contact form has no checkbox');
      await scrollTo('#contact-form');
      await page.locator('#cf-name').fill('Local Iconly QA');
      await page.locator('#cf-phone').fill('+966500000001');
      assert.equal(await page.locator('#contact-form').getAttribute('data-bound'), '1');
      assert.equal(mockPosts, 0, 'No form request was submitted');
      // The preview intentionally blocks submits. Inspect only the success CSS state.
      await page.locator('.contact-submit .btn-text-inner').evaluate(element => element.classList.add('iconly-status-success'));
      assert.ok((await mask('.iconly-status-success', '::after')).includes('/iconly/tick-square.svg'));
      await page.locator('.iconly-status-success').evaluate(element => element.classList.remove('iconly-status-success'));

      // Check the unused legacy checkbox selector through a temporary DOM fixture.
      await page.evaluate(() => {
        const fixture = document.createElement('div');
        fixture.id = 'iconly-qa-checkbox';
        fixture.className = 'form';
        fixture.innerHTML = '<label class="checkbox-button"><input type="checkbox"><span class="custom-check"></span></label>';
        document.body.append(fixture);
      });
      const checkbox = page.locator('#iconly-qa-checkbox input');
      assert.equal(await page.locator('#iconly-qa-checkbox .custom-check').evaluate(element => getComputedStyle(element, '::after').visibility), 'hidden');
      await checkbox.evaluate(element => { element.checked = true; });
      assert.equal(await page.locator('#iconly-qa-checkbox .custom-check').evaluate(element => getComputedStyle(element, '::after').visibility), 'visible');
      assert.ok((await mask('#iconly-qa-checkbox .custom-check', '::after')).includes('/iconly/tick-square.svg'));
      await page.locator('#iconly-qa-checkbox').evaluate(element => element.remove());

      await go(lang === 'ar' ? '/blog/ar/' : '/blog/');
      await chrome();
      assert.equal(errors.length, 0, errors.join('\n'));
      console.log(JSON.stringify({ pass: true, lang, mobile, mockPosts, mappedBlogAssets: traffic.mapped, blockedExternal: traffic.blocked.length, blockedMeasurement: traffic.measurement.length }));
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
