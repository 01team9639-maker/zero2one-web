/* ==========================================================================
   Language routing — English at /, Arabic at /ar/
   --------------------------------------------------------------------------
   Both languages are real static pages now: each has its own URL, <title>,
   meta description and JSON-LD, and the two are paired through
   <link rel="alternate" hreflang>. Nothing is translated in the browser any
   more — the Arabic pages are generated at build time by tools/build_ar.py,
   which is what makes them crawlable and indexable.

   All this file does is land a visitor on the right tree:

     ?lang=ar / ?lang=en ....... explicit override, either direction, remembered
     Arabic-preferring device ... English page -> its /ar/ counterpart, once
     the nav switcher ........... a normal link (data-barba-prevent), always wins

   An Arabic page is never auto-redirected to English: /ar/ URLs are indexed and
   shared, so bouncing them would break both search results and shared links.

   The redirect target is read from the page's own hreflang tag, so there is no
   path arithmetic here and new pages need no changes to this file.
   ========================================================================== */
(function () {
  var pageLang = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);

  var override = null;
  var saved = null;
  try {
    var ov = new URLSearchParams(location.search).get('lang');
    if (ov === 'ar' || ov === 'en') {
      override = ov;
      localStorage.setItem('site-lang', ov);
    }
    saved = override || localStorage.getItem('site-lang');
  } catch (e) { /* private mode / storage disabled — fall through to detection */ }

  // Using the switcher is an explicit choice — remember it so the visitor is not
  // bounced back on the next page they open.
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.btn-lang a[hreflang]') : null;
    if (!link) return;
    try { localStorage.setItem('site-lang', link.getAttribute('hreflang')); } catch (err) { /* ignore */ }
  }, true);

  function counterpart(lang) {
    var link = document.querySelector('link[rel="alternate"][hreflang="' + lang + '"]');
    var href = link && link.getAttribute('href');
    if (!href) return null;
    var target = new URL(href, location.href);
    // never redirect to the page we are already on
    if (target.pathname === location.pathname) return null;
    return target.pathname + location.search + location.hash;
  }

  function go(lang) {
    var url = counterpart(lang);
    if (url) location.replace(url);
  }

  // 1) an explicit ?lang= wins in either direction
  if (override && override !== pageLang) return go(override);

  // 2) Arabic pages are never auto-redirected away
  if (pageLang !== 'en') return;

  // 3) a remembered choice
  if (saved === 'en') return;
  if (saved === 'ar') return go('ar');

  // 4) otherwise follow the device language — every signal we can read, because
  //    the browser's own language list often stays English while the OS locale
  //    (exposed through Intl) follows the device language and region.
  var list = [];
  if (navigator.languages && navigator.languages.length) list = list.concat(navigator.languages);
  if (navigator.language) list.push(navigator.language);
  if (navigator.userLanguage) list.push(navigator.userLanguage);
  try { list.push(Intl.DateTimeFormat().resolvedOptions().locale); } catch (e) { /* ignore */ }
  try { list.push(Intl.NumberFormat().resolvedOptions().locale); } catch (e) { /* ignore */ }

  if (list.some(function (l) { return /^ar\b|^ar[-_]/i.test(l || ''); })) go('ar');
})();
