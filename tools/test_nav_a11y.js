/**
 * ZERO 2 ONE — navigation accessibility test
 * ==========================================
 *
 * Drives the real pages in Chromium, keyboard first, and checks what a
 * keyboard or screen-reader user actually meets:
 *
 *   skip link        first Tab stop, visible when focused, moves focus to the
 *                    page's main heading
 *   closed menu      none of its links in the Tab order; inert
 *   menu toggle      reachable, a button with a name, aria-expanded and
 *                    aria-controls that tell the truth
 *   open menu        focus moves in; Tab stays in the menu (it is modal);
 *                    Escape closes and returns focus to the toggle
 *   pointer          click to open, click the dimmed backdrop to close
 *   focus ring       visible on navigation links
 *   lifecycle        barba navigation, back/forward, language switch, resize,
 *                    an in-page (#section) link inside the menu — and one
 *                    press still means one toggle after several navigations
 *                    (a duplicated handler would toggle twice)
 *   zoom 200%        SIMULATED as half the CSS viewport at device scale 2
 *                    (actual browser zoom: tools/test_menu_viewports.js)
 *   RTL              the active-page dot does not sit on top of Arabic text
 *   blog             the site's JS on the blog's (older) markup
 *
 * Every request leaving 127.0.0.1 is stopped (tools/test_support.js), so no
 * page view reaches Google. Each section is isolated: if one throws, that is
 * recorded as a failure and the rest still run.
 *
 * Usage:  node tools/test_nav_a11y.js [--out results.json]
 * Exit code = number of failed checks.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const { serve, isolate, settled, CURRENT, classifyError } = require('./test_support');

const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
const results = [];
const pageErrors = [];

function check(id, scope, name, pass, detail) {
  results.push({ id, scope, name, pass: !!pass, detail: detail === undefined ? '' : detail });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${id.padEnd(4)} ${scope.padEnd(18)} ${name}${pass ? '' : '  → ' + JSON.stringify(detail).slice(0, 170)}`);
}
function info(id, scope, name, detail) {
  results.push({ id, scope, name, pass: true, info: true, detail });
  console.log(`  info  ${id.padEnd(4)} ${scope.padEnd(18)} ${name}: ${JSON.stringify(detail)}`);
}
async function section(scope, fn) {
  try { await fn(); } catch (e) { check('ERR', scope, 'section threw — remaining checks in it not run', false, String(e).split('\n')[0]); }
}

// ---------------------------------------------------------------- in-page probes
const describe = () => {
  const cs = [...document.querySelectorAll('[data-barba="container"]')];
  const root = cs[cs.length - 1];
  const el = document.activeElement;
  if (!el || el === document.body) return { tag: 'body' };
  const r = el.getBoundingClientRect();
  const st = getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
    id: el.id, href: el.getAttribute('href') || '', role: el.getAttribute('role') || '',
    text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30),
    inMenu: !!el.closest('.fixed-nav'), inCurrent: root ? root.contains(el) : false,
    isToggle: !!el.closest('.btn-hamburger'), isSkip: el.classList.contains('skip-link'),
    visible: r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth &&
             parseFloat(st.opacity) > 0.5,
    outline: st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2 ? `${st.outlineWidth} ${st.outlineStyle}` : '',
  };
};

const state = () => {
  const cs = [...document.querySelectorAll('[data-barba="container"]')];
  const root = cs[cs.length - 1];
  const toggle = root.querySelector('.btn-hamburger .btn-click');
  const menu = root.querySelector('.fixed-nav');
  const wrap = root.querySelector('.main-wrap');
  const controls = toggle && toggle.getAttribute('aria-controls');
  return {
    open: root.classList.contains('nav-active'),
    expanded: toggle ? toggle.getAttribute('aria-expanded') : null,
    role: toggle ? toggle.getAttribute('role') : null,
    tabindex: toggle ? toggle.getAttribute('tabindex') : null,
    controlsOk: !!(controls && menu && menu.id === controls),
    menuInert: menu ? (menu.inert === true || menu.hasAttribute('inert')) : null,
    wrapInert: wrap ? (wrap.inert === true || wrap.hasAttribute('inert')) : null,
  };
};

const dotOverlap = () => {
  const cs = [...document.querySelectorAll('[data-barba="container"]')];
  const root = cs[cs.length - 1];
  const a = root.querySelector('.fixed-nav .nav-row .btn-link.active .btn-click');
  if (!a) return { error: 'no active link' };
  const ps = getComputedStyle(a, '::after');
  let cb = a; while (cb && getComputedStyle(cb).position === 'static') cb = cb.parentElement;
  const R = cb.getBoundingClientRect();
  const w = parseFloat(ps.width), h = parseFloat(ps.height);
  let left = ps.left !== 'auto' ? R.left + parseFloat(ps.left) : R.right - parseFloat(ps.right) - w;
  let top = ps.top !== 'auto' ? R.top + parseFloat(ps.top) : R.bottom - parseFloat(ps.bottom) - h;
  const m = ps.transform.match(/matrix\(([^)]+)\)/);
  if (m) { const v = m[1].split(',').map(Number); left += v[4]; top += v[5]; }
  const range = document.createRange();
  range.selectNodeContents(a.querySelector('.btn-text-inner'));
  const t = range.getBoundingClientRect();
  const overlap = left < t.right && left + w > t.left && top < t.bottom && top + h > t.top;
  const gap = left + w <= t.left ? t.left - (left + w) : left >= t.right ? left - t.right : 0;
  return { overlap, gap: Math.round(gap), dot: [Math.round(left), Math.round(top), Math.round(w)],
           text: [Math.round(t.left), Math.round(t.right)], dir: document.documentElement.dir };
};

const clickToggle = () => { const t = document.querySelector('[data-barba="container"]:last-of-type .btn-hamburger .btn-click'); t && t.click(); return !!t; };

async function tabStops(page, n) {
  const stops = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(40);
    stops.push(await page.evaluate(describe));
  }
  return stops;
}

/**
 * Wait until the side menu has stopped moving and is on screen. A fixed delay
 * is not enough: in headless Chromium the slide-in can stall for ~1.2 s before
 * its first frame — measured on the unmodified site as well — so a reading
 * taken at a fixed time can catch the closed position. Never throws: where the
 * menu does not open (the unmodified site, keyboard) it just returns false.
 */
async function menuSettled(page, timeout = 4000) {
  try {
    await page.waitForFunction(() => {
      const n = document.querySelector('[data-barba="container"]:last-of-type .fixed-nav');
      if (!n) return true;
      const x = Math.round(n.getBoundingClientRect().left);
      const ok = window.__menuX === x && x < innerWidth;
      window.__menuX = x;
      return ok;
    }, null, { timeout, polling: 150 });
    return true;
  } catch (e) { return false; }
}

/** Reach the toggle the way a keyboard user does. */
async function focusToggle(page) {
  // At desktop top the complete navbar replaces the floating toggle. Reach
  // it after scrolling the navbar away, rather than expecting two menus.
  const hidden = await page.evaluate(() => {
    const t = document.querySelector('[data-barba="container"]:last-of-type .btn-hamburger');
    return t && getComputedStyle(t).visibility === 'hidden';
  });
  if (hidden) {
    await page.evaluate(() => scroll.scrollTo(600, { duration: 0, disableLerp: true }));
    await page.waitForTimeout(800);
  }
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(describe);
    if (d.isToggle && d.inCurrent) return true;
  }
  return false;
}

async function load(ctx, url) {
  const p = await ctx.newPage();
  p.on('pageerror', e => pageErrors.push({ session: url, at: p.url(), error: String(e).slice(0, 160), known: classifyError(e),
                                          stack: (e.stack || '').split('\n').slice(1, 11).map(s => s.trim().replace(/\?v=\w+/, '')) }));
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(/\/(ar\/)?$/.test(new URL(url).pathname) ? 5500 : 3500);   // home runs the longer intro
  return p;
}

(async () => {
  const { srv, origin } = await serve();
  const browser = await chromium.launch();
  let measurement = 0;

  for (const [lang, start, next3] of [
    ['en', '/services/seo-riyadh/', ['/about/', '/services/', '/work/']],
    ['ar', '/ar/services/seo-riyadh/', ['/ar/about/', '/ar/services/', '/ar/work/']],
  ]) {
    const home = lang === 'ar' ? '/ar/' : '/';
    const shotName = (p, name) => OUT ? p.screenshot({ path: OUT.replace(/\.json$/, `_${name}_${lang}.png`) }) : null;

    // ========================================================== desktop
    const S = `desktop ${lang}`;
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const log = await isolate(ctx, origin);
    const p = await load(ctx, origin + start);

    await section(S, async () => {
      await p.keyboard.press('Tab');
      const first = await p.evaluate(describe);
      await shotName(p, 'skip_focused_desktop');
      check('K1', S, 'first Tab stop is a visible skip link', first.isSkip && first.visible, first);
      await p.keyboard.press('Enter'); await p.waitForTimeout(400);
      const afterSkip = await p.evaluate(describe);
      check('K2', S, 'skip link moves focus to #main-content (the h1)',
        afterSkip.id === 'main-content' && afterSkip.tag === 'h1' && afterSkip.inCurrent, afterSkip);
    });

    await section(S, async () => {
      await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500);
      const stops = await tabStops(p, 45);
      const inMenu = stops.filter(s => s.inMenu);
      check('K3', S, 'closed menu: no Tab stop inside it', inMenu.length === 0, inMenu.slice(0, 3));
      const st = await p.evaluate(state);
      check('K3b', S, 'closed menu is inert', st.menuInert === true, st);
      // visibility is measured once the toggle's reveal transition has run —
      // tabStops() samples 40 ms after each Tab, mid-animation
      let tog;
      if (await focusToggle(p)) { await p.waitForTimeout(900); tog = await p.evaluate(describe); }
      check('K4', S, 'menu toggle is reachable and visible after desktop navbar leaves', !!tog && tog.isToggle && tog.visible, tog || 'not reached in 60 stops');
      const navLink = stops.find(s => s.href && !s.inMenu && !s.isSkip && !s.isToggle && (s.cls || '').includes('btn-click'));
      check('K12', S, 'navigation link shows a focus ring', !!navLink && !!navLink.outline, navLink || 'no nav link reached');
      if (navLink) {
        await p.evaluate(() => document.activeElement.blur());
        for (let i = 0; i < 45; i++) {
          await p.keyboard.press('Tab');
          const d = await p.evaluate(describe);
          if (d.href === navLink.href && !d.inMenu) break;
        }
        await p.waitForTimeout(300);
        await shotName(p, 'navlink_focused_desktop');
      }
      const named = await p.locator(CURRENT).getByRole('button', { name: lang === 'ar' ? 'القائمة' : 'Menu', exact: true }).count();
      check('K5', S, 'toggle is a button named Menu/القائمة, collapsed, controls the menu',
        named === 1 && st.expanded === 'false' && st.controlsOk, { named, ...st });
    });

    await section(S, async () => {
      if (!(await focusToggle(p))) await p.evaluate(() => { const t = document.querySelector('[data-barba="container"]:last-of-type .btn-hamburger .btn-click'); t && t.focus(); });
      await p.keyboard.press('Enter'); await p.waitForTimeout(300); await menuSettled(p);
      let st = await p.evaluate(state);
      const inside = await p.evaluate(describe);
      check('K6', S, 'Enter opens: expanded, menu live, page behind inert, focus inside menu',
        st.open && st.expanded === 'true' && st.menuInert === false && st.wrapInert === true && inside.inMenu, { ...st, focus: inside });
      await shotName(p, 'menu_open_focus_desktop');
      const openStops = await tabStops(p, 20);
      // 'body' = Tab went past the last control into the browser's own UI,
      // which is where focus goes after any page's last element — not the
      // page behind the menu
      const escaped = openStops.filter(s => !(s.tag === 'body' || s.inMenu || s.isToggle || (s.cls || '').includes('wa-float')));
      check('K7', S, 'open menu: Tab stays in menu/toggle', escaped.length === 0, escaped.slice(0, 3));
      const menuLinkRing = openStops.find(s => s.inMenu && s.href);
      check('K12b', S, 'menu link shows a focus ring', !!menuLinkRing && !!menuLinkRing.outline, menuLinkRing || 'none');
      await p.keyboard.press('Escape'); await p.waitForTimeout(900);
      st = await p.evaluate(state);
      const back = await p.evaluate(describe);
      check('K8', S, 'Escape closes and returns focus to the toggle',
        !st.open && st.expanded === 'false' && st.menuInert === true && st.wrapInert === false && back.isToggle, { ...st, focus: back });
    });

    await section(S, async () => {
      let consistent = true; const seq = [];
      for (let i = 0; i < 3; i++) {
        await p.keyboard.press(i === 1 ? ' ' : 'Enter'); await p.waitForTimeout(700);
        const a = await p.evaluate(state);
        await p.keyboard.press('Escape'); await p.waitForTimeout(700);
        const b = await p.evaluate(state);
        seq.push([a.expanded, b.expanded]);
        if (!(a.open && a.expanded === 'true' && !b.open && b.expanded === 'false')) consistent = false;
      }
      check('K9', S, 'Enter/Space/Escape ×3 stay consistent', consistent, seq);
    });

    await section(S, async () => {
      // pointer: at ≤1024px the toggle is always shown by design, so a real
      // mouse can reach it without depending on scroll position
      await p.setViewportSize({ width: 1024, height: 800 }); await p.waitForTimeout(700);
      const box = await p.locator(`${CURRENT} .btn-hamburger .btn-click`).boundingBox();
      // a mouse-only open: the earlier checks left keyboard focus on the
      // toggle, and Chrome hands that keyboard state to whatever script focuses
      // next (a keyboard user who then clicks does get the ring — by design)
      await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(1000);
      const pOpen = await p.evaluate(state);
      const pFocus = await p.evaluate(describe);
      await p.mouse.click(60, 400); await p.waitForTimeout(1000);   // the dimmed backdrop, left of the panel
      const pClosed = await p.evaluate(state);
      await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(700);
      check('K11', S, 'mouse: click opens, backdrop click closes, state in sync',
        pOpen.open && pOpen.expanded === 'true' && !pClosed.open && pClosed.expanded === 'false' && pClosed.menuInert === true,
        { pOpen, pClosed });
      // the ring is for keyboard users: a mouse open moves focus into the
      // menu but must not draw it (:focus-visible), so the look is unchanged
      check('K11b', S, 'mouse open: focus moves into the menu with no focus ring drawn',
        pFocus.inMenu && !pFocus.outline, pFocus);
    });

    await section(S, async () => {
      if (!(await focusToggle(p))) await p.evaluate(clickToggle); else { await p.keyboard.press('Enter'); }
      await p.waitForTimeout(900);
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(900);
      const rOpen = await p.evaluate(state);
      await p.keyboard.press('Escape'); await p.waitForTimeout(900);
      const rClosed = await p.evaluate(state);
      await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(900);
      const rBack = await p.evaluate(state);
      check('K16', S, 'resize while open and while closed keeps state coherent',
        rOpen.open && rOpen.expanded === 'true' && !rClosed.open && rClosed.menuInert === true && !rBack.open && rBack.menuInert === true,
        { rOpen, rClosed, rBack });
    });

    await section(S, async () => {
      const perNav = [];
      for (const dest of next3) {
        if (!(await focusToggle(p))) await p.evaluate(clickToggle); else await p.keyboard.press('Enter');
        await p.waitForTimeout(900);
        const linkFocused = await p.evaluate(d => {
          const cs = [...document.querySelectorAll('[data-barba="container"]')];
          const a = cs[cs.length - 1].querySelector(`.fixed-nav a[href="${d}"]`);
          if (!a) return false; a.focus(); return document.activeElement === a;
        }, dest);
        await p.keyboard.press('Enter');
        try { await settled(p, dest); } catch (e) { perNav.push({ dest, error: 'did not settle' }); continue; }
        const s = await p.evaluate(state);
        const f = await p.evaluate(describe);
        if (!(await focusToggle(p))) throw new Error('menu toggle not reachable after navigation and scroll');
        await p.keyboard.press('Enter'); await p.waitForTimeout(800);
        const once = await p.evaluate(state);
        await p.keyboard.press('Escape'); await p.waitForTimeout(800);
        const shut = await p.evaluate(state);
        perNav.push({ dest, linkFocused, closedOnArrival: !s.open && s.expanded === 'false' && s.menuInert === true,
                      focus: f.id || f.tag, openedOnce: once.open && once.expanded === 'true', closedAgain: !shut.open });
      }
      check('K13', S, 'after barba nav: menu closed+inert, focus on #main-content',
        perNav.length === 3 && perNav.every(n => n.closedOnArrival && n.focus === 'main-content'), perNav);
      check('K14', S, 'one press = one toggle after 3 navigations (no stacked handlers)',
        perNav.length === 3 && perNav.every(n => n.openedOnce && n.closedAgain), perNav.map(n => [n.dest, n.openedOnce, n.closedAgain]));
    });

    await section(S, async () => {
      await p.goBack(); await p.waitForTimeout(3500);
      const hb = await p.evaluate(state);
      await p.goForward(); await p.waitForTimeout(3500);
      const hf = await p.evaluate(state);
      check('K15', S, 'back/forward land with the menu closed and inert',
        !hb.open && hb.menuInert === true && hb.expanded === 'false' && !hf.open && hf.menuInert === true, { hb, hf });
    });

    await section(S, async () => {
      const switched = await p.evaluate(() => {
        const a = document.querySelector('[data-barba="container"]:last-of-type .nav-bar .btn-lang a');
        if (!a) return null; const h = a.getAttribute('href'); a.click(); return h;
      });
      await p.waitForLoadState('load'); await p.waitForTimeout(4000);
      const ls = await p.evaluate(state);
      const skipThere = await p.evaluate(() => !!document.querySelector('[data-barba="container"]:last-of-type a.skip-link[href="#main-content"]'));
      check('K17', S, 'language switch lands in the initial accessible state',
        !!switched && !ls.open && ls.menuInert === true && ls.expanded === 'false' && skipThere, { switched, ...ls, skipThere });
    });
    await ctx.close();
    measurement += log.measurement.length;

    // ========================================================== zoom 200%
    const Z = `zoom200 ${lang}`;
    await section(Z, async () => {
      const zctx = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
      const zlog = await isolate(zctx, origin);
      const z = await load(zctx, origin + start);
      await z.keyboard.press('Tab');
      const zSkip = await z.evaluate(describe);
      const zReach = await focusToggle(z);
      const zTog = await z.evaluate(describe);
      await z.keyboard.press('Enter'); await z.waitForTimeout(300); await menuSettled(z);
      const zOpen = await z.evaluate(state);
      const zFocus = await z.evaluate(describe);
      if (OUT) await z.screenshot({ path: OUT.replace(/\.json$/, `_zoom200_menu_${lang}.png`) });
      await z.keyboard.press('Escape'); await z.waitForTimeout(800);
      const overflow = await z.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check('K18', Z, 'at simulated 200% zoom (half-size CSS viewport, DPR 2): skip link visible, toggle reachable+visible, menu opens with focus inside, no sideways scroll',
        zSkip.isSkip && zSkip.visible && zReach && zTog.visible && zOpen.open && zFocus.inMenu && overflow <= 1,
        { zSkip, zTog, zOpen, zFocus, overflow });
      measurement += zlog.measurement.length;
      await zctx.close();
    });

    // ========================================================== mobile
    const M = `mobile ${lang}`;
    await section(M, async () => {
      const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const mlog = await isolate(mctx, origin);
      const m = await load(mctx, origin + home);
      await m.keyboard.press('Tab');
      const mSkip = await m.evaluate(describe);
      check('K1m', M, 'first Tab stop is a visible skip link', mSkip.isSkip && mSkip.visible, mSkip);
      const mStops = await tabStops(m, 25);
      check('K3m', M, 'closed menu: no Tab stop inside it', mStops.filter(s => s.inMenu).length === 0, mStops.filter(s => s.inMenu).slice(0, 3));
      const box = await m.locator(`${CURRENT} .btn-hamburger .btn-click`).boundingBox();
      await m.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await m.waitForTimeout(300); await menuSettled(m);
      const mOpen = await m.evaluate(state);
      check('K6m', M, 'tap opens: expanded, menu live', mOpen.open && mOpen.expanded === 'true' && mOpen.menuInert === false, mOpen);
      const dot = await m.evaluate(dotOverlap);
      check('K19', M, 'active-page dot clears the link text', !dot.error && !dot.overlap && dot.gap >= 4, dot);
      if (OUT) await m.screenshot({ path: OUT.replace(/\.json$/, `_menu_mobile_${lang}.png`) });
      await m.keyboard.press('Escape'); await m.waitForTimeout(900);
      const mEsc = await m.evaluate(state);
      check('K8m', M, 'Escape closes the menu', !mEsc.open && mEsc.expanded === 'false' && mEsc.menuInert === true, mEsc);
      measurement += mlog.measurement.length;
      await mctx.close();
    });

    // ========================================================== desktop dot
    await section(S, async () => {
      const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await isolate(dctx, origin);
      const d = await load(dctx, origin + home);
      await d.evaluate(clickToggle); await d.waitForTimeout(300); await menuSettled(d);
      const ddot = await d.evaluate(dotOverlap);
      check('K19d', S, 'active-page dot clears the link text (desktop)', !ddot.error && !ddot.overlap, ddot);
      if (OUT) await d.screenshot({ path: OUT.replace(/\.json$/, `_menu_desktop_${lang}.png`) });
      // an in-page link inside the open menu (home: #testimonials) closes the
      // menu without a navigation and hands focus to the section it goes to
      const hashLink = await d.evaluate(() => {
        const a = document.querySelector('[data-barba="container"]:last-of-type .fixed-nav a[href^="#"]');
        if (!a) return null; a.focus(); return document.activeElement === a ? a.getAttribute('href') : 'not focusable';
      });
      const pathBefore = await d.evaluate(() => location.pathname);
      await d.keyboard.press('Enter'); await d.waitForTimeout(1500);
      const hs = await d.evaluate(state);
      const hf = await d.evaluate(h => {
        const t = h && h.startsWith('#') ? document.querySelector(h) : null;
        const a = document.activeElement;
        return { focus: a === document.body ? 'body' : `${a.tagName.toLowerCase()}#${a.id}`, onTarget: !!(t && (a === t || t.contains(a))), path: location.pathname };
      }, hashLink);
      check('K22', S, 'in-page menu link: menu closes (inert, collapsed), focus lands on the target section, no page change',
        !!hashLink && hashLink.startsWith('#') && !hs.open && hs.expanded === 'false' && hs.menuInert === true && hf.onTarget && hf.path === pathBefore,
        { hashLink, ...hs, ...hf });
      await dctx.close();
    });
  }

  // ========================================================== blog sample
  // The blog is generated by a separate project: it copies the site's header
  // markup only when its chrome is re-synced, and it loads the site's JS by
  // absolute URL. So on the blog the new JS meets the OLD markup and has to
  // cope — set the menu semantics itself and keep the menu usable.
  const B = 'blog ar (desktop)';
  await section(B, async () => {
    const bctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const blog = await isolate(bctx, origin, { mapProduction: true });
    const before = pageErrors.length;
    const b = await load(bctx, origin + '/blog/ar/');
    const sb = await b.evaluate(state);
    const skipInMarkup = await b.evaluate(() => !!document.querySelector('a.skip-link'));
    const reachedB = await focusToggle(b);
    await b.keyboard.press('Enter'); await b.waitForTimeout(1000);
    const bo = await b.evaluate(state); const bf = await b.evaluate(describe);
    await b.keyboard.press('Escape'); await b.waitForTimeout(900);
    const bc = await b.evaluate(state); const bb = await b.evaluate(describe);
    // strict: any uncaught error on the blog page fails, PE-1 included
    check('B1', B, 'site JS runs on the blog without page errors',
      pageErrors.slice(before).length === 0 && blog.mapped > 0,
      { mapped: blog.mapped, errors: pageErrors.slice(before).map(e => `${e.known || 'unclassified'}: ${e.error}`) });
    check('B2', B, 'blog menu: closed+inert, keyboard opens with focus inside, Escape returns focus',
      sb.menuInert === true && reachedB && bo.open && bo.expanded === 'true' && bf.inMenu && !bc.open && bb.isToggle,
      { closed: sb, reachedB, open: bo, focus: bf, closedAgain: bc, back: bb });
    info('B3', B, 'skip link in blog markup (arrives only with the blog chrome re-sync)', { skipInMarkup });
    measurement += blog.measurement.length;
    await bctx.close();
  });

  const brief = e => `${e.known || 'NEW'} · ${e.at}: ${e.error}`;
  check('K20', 'all', 'no uncaught page errors (strict, known ones included)', pageErrors.length === 0, pageErrors.slice(0, 5).map(brief));
  const unknown = pageErrors.filter(e => !e.known);
  // K20n is diagnostic only: it says whether any error is of an unclassified
  // kind. K20 above is the verdict and fails on every error, PE-1 included.
  check('K20n', 'all', 'no page errors of an unclassified kind (diagnostic companion to K20)', unknown.length === 0, unknown.slice(0, 5).map(brief));
  info('K21', 'all', 'measurement requests answered locally (never forwarded)', measurement);

  await browser.close(); srv.close();
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n  ${results.filter(r => r.pass && !r.info).length} passed · ${failed} failed · ${results.filter(r => r.info).length} info`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), results, pageErrors, measurementAnsweredLocally: measurement }, null, 1));
  process.exit(failed);
})().catch(e => { console.error(e); process.exit(99); });
