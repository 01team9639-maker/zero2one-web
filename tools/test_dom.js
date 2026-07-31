/**
 * ZERO 2 ONE — tests for the jQuery replacement in assets/js/dom.js
 *
 * The shim has to match jQuery closely enough that 157 untouched call sites in
 * index-new.js keep working. The subtle ones are covered here: `.each` passes
 * (index, element) with `this` bound to the element, event shorthands bind
 * `this` too and fire the event when called with no handler, and the
 * collection is a real Array so gsap.utils.toArray() accepts it.
 *
 * Usage:  node tools/test_dom.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const shim = fs.readFileSync(require('path').join(__dirname, '..', 'assets/js/dom.js'), 'utf8');

const FIXTURE = `<!DOCTYPE html><html><body>
  <main id="m"><div class="a x" data-k="v"><span class="child">one</span><span class="child">two</span></div>
  <div class="a"><span class="child">three</span></div>
  <input class="f" value="hello">
  <ul><li>0</li><li id="li1">1</li><li>2</li></ul>
  <button class="btn-hamburger">h</button><button class="btn-menu">m</button>
  </main></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(FIXTURE);
  await p.addScriptTag({ content: shim });
  const r = await p.evaluate(() => {
    const out = [];
    const t = (name, got, want) => out.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want });

    t('$(sel).length', $('.a').length, 2);
    t('$(".a, .f") multi-selector', $('.a, .f').length, 3);
    $('.a').addClass('added two');
    t('addClass (multiple)', [...document.querySelectorAll('.a.added.two')].length, 2);
    $('.a').removeClass('added');
    t('removeClass', document.querySelectorAll('.added').length, 0);
    t('hasClass true', $('.a').hasClass('x'), true);
    t('hasClass false', $('.a').hasClass('nope'), false);
    $('.a').toggleClass('t', true);  t('toggleClass(true)', document.querySelectorAll('.t').length, 2);
    $('.a').toggleClass('t', false); t('toggleClass(false)', document.querySelectorAll('.t').length, 0);

    t('find', $('#m').find('.child').length, 3);
    t('parent (deduped)', $('.child').parent().length, 2);
    t('closest', $('.child').closest('#m').length, 1);
    t('attr getter', $('.a').attr('data-k'), 'v');
    t('val getter', $('.f').val(), 'hello');
    t('index', $('#li1').index(), 1);
    t('width(window)', typeof $(window).width(), 'number');

    // .each must be (index, element) with `this` = element, like jQuery
    const seen = [];
    $('.a').each(function (i, el) { seen.push([i, this === el, this.tagName]); });
    t('each(index, el) + this', seen, [[0, true, 'DIV'], [1, true, 'DIV']]);

    // events: `this` must be the element
    let clickThis = null;
    $('.btn-hamburger, .btn-menu').click(function () { clickThis = this.className; });
    document.querySelector('.btn-menu').dispatchEvent(new Event('click', { bubbles: true }));
    t('click handler binds this', clickThis, 'btn-menu');

    let onCount = 0;
    $('.child').on('input', function () { onCount++; });
    document.querySelectorAll('.child').forEach(e => e.dispatchEvent(new Event('input', { bubbles: true })));
    t('.on across collection', onCount, 3);

    // no-arg shorthand should FIRE the event (jQuery behaviour)
    let fired = 0;
    $('.f').on('focusout', () => fired++);
    $('.f').focusout();
    t('.focusout() with no args fires', fired, 1);

    // $(this.parentNode) and $(element)
    t('$(element)', $(document.querySelector('.f')).length, 1);
    // GSAP compatibility: must be a real Array
    t('is a real Array (for gsap.toArray)', Array.isArray($('.a')), true);
    t('chaining returns collection', $('.a').addClass('z').removeClass('z').length, 2);
    return out;
  });
  const bad = r.filter(x => !x.ok);
  r.forEach(x => console.log(`  ${x.ok ? 'ok  ' : 'FAIL'}  ${x.name}${x.ok ? '' : `  got ${JSON.stringify(x.got)} want ${JSON.stringify(x.want)}`}`));
  console.log(`\n  ${r.length - bad.length}/${r.length} passed`);
  await b.close();
  process.exit(bad.length);
})();
