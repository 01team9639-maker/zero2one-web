/* SEO-only owner review. No listeners or mutations are installed outside the
   captured .rf-seo-owner Barba container. The legacy site stays independent. */
(function () {
  'use strict';
  var activeCleanup = null;
  var revealedSteps = new Set();
  function cleanup() {
    if (activeCleanup) activeCleanup();
    activeCleanup = null;
  }
  function init(root) {
    cleanup();
    if (!root || !root.isConnected || !root.matches('main.rf-seo-owner')) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var compact = window.matchMedia('(max-width:760px), (max-width:1100px) and (orientation:portrait)');
    var animations = new Set(), undo = [], observer = null, stepObserver = null;
    var updateFrame = null, alive = true;
    function on(el, event, handler, options) {
      if (!el) return;
      el.addEventListener(event, handler, options);
      undo.push(function () { el.removeEventListener(event, handler, options); });
    }
    function refreshHeight() {
      if (updateFrame !== null) cancelAnimationFrame(updateFrame);
      updateFrame = requestAnimationFrame(function () {
        updateFrame = null;
        if (!alive || !root.isConnected) return;
        if (typeof scroll !== 'undefined' && scroll && scroll.update) scroll.update();
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      });
    }
    function rememberAnimation(anim) {
      animations.add(anim);
      anim.onfinish = function () { animations.delete(anim); };
    }
    // Underlying content is always visible. WAAPI effects never leave hidden
    // inline state behind after resize, upward scrolling or navigation.
    if (!reduced.matches && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          if (!alive || reduced.matches || !entry.target.animate) return;
          var siblings = entry.target.parentElement.children;
          var index = Array.prototype.indexOf.call(siblings, entry.target);
          rememberAnimation(entry.target.animate([
            { opacity: .3, transform: 'translateY(32px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 780, delay: Math.min(index % 3, 2) * 75, easing: 'cubic-bezier(.2,.7,.2,1)' }));
        });
      }, { threshold: .07 });
      root.querySelectorAll('.seo-tile,.seo-shot,.seo-card,.seo-know-list li,.seo-plan').forEach(function (el) { observer.observe(el); });
    }
    on(reduced, 'change', function () {
      if (reduced.matches) { animations.forEach(function (a) { a.cancel(); }); animations.clear(); }
    });
    var steps = Array.from(root.querySelectorAll('[data-reveal-scope="seo"]'));
    var lastStart = -Infinity;
    function revealStep(card, animate) {
      var index = steps.indexOf(card);
      var key = document.documentElement.lang + ':' + index;
      if (revealedSteps.has(key)) { card.dataset.aboutRevealed = 'true'; return; }
      revealedSteps.add(key);
      card.dataset.aboutRevealed = 'true';
      if (!animate || reduced.matches || !card.animate) return;
      var now = performance.now(), start = Math.max(now, lastStart + 200);
      lastStart = start;
      rememberAnimation(card.animate([
        {opacity:0,transform:'translate('+(index % 2 ? '-20px' : '20px')+',24px) scale(.98)'},
        {opacity:1,transform:'translateY(0) scale(1)'}
      ], {duration:760,delay:start-now,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
      card.dataset.aboutRevealCount = '1';
    }
    if (steps.length) {
      if (!reduced.matches && typeof IntersectionObserver !== 'undefined') {
        stepObserver = new IntersectionObserver(function (entries) {
          entries.filter(function (entry) { return entry.isIntersecting; })
            .sort(function (a,b) { return steps.indexOf(a.target)-steps.indexOf(b.target); })
            .forEach(function (entry) {
              stepObserver.unobserve(entry.target);
              if (alive) revealStep(entry.target,true);
            });
        }, {threshold:.12,rootMargin:'0px 0px -8% 0px'});
        steps.forEach(function (card) { stepObserver.observe(card); });
      } else { steps.forEach(function (card) { revealStep(card,false); }); }
      on(reduced,'change',function () {
        if (reduced.matches) {
          if (stepObserver) stepObserver.disconnect();
          steps.forEach(function (card) { revealStep(card,false); });
        }
      });
    }
    root.querySelectorAll('.rf-nav-services details').forEach(function (details) {
      on(document, 'click', function (event) { if (!details.contains(event.target)) details.open = false; });
      on(details, 'keydown', function (event) {
        if (event.key === 'Escape' && details.open) {
          details.open = false;
          details.querySelector('summary').focus();
          event.stopPropagation();
        }
      });
    });
    root.querySelectorAll('[data-seo-accordion]').forEach(function (group) {
      var cards = Array.from(group.querySelectorAll('.seo-owner-accordion'));
      var chosen = cards[0];
      var includes = Array.from(group.querySelectorAll('.seo-plan-more'));
      var includeState = new Map(), wasCompact = null;
      function syncCards() {
        if (wasCompact !== compact.matches) {
          includes.forEach(function (more) {
            if (compact.matches) {
              if (more.dataset.seoDesktopIncludes === undefined) more.dataset.seoDesktopIncludes = String(more.open);
              includeState.set(more, more.dataset.seoDesktopIncludes === 'true');
              more.open = true;
              more.dataset.seoCompactIncludes = '';
            } else if (includeState.has(more)) {
              more.open = includeState.get(more);
              delete more.dataset.seoDesktopIncludes;
              delete more.dataset.seoCompactIncludes;
            }
            more.querySelector('summary').tabIndex = compact.matches ? -1 : 0;
          });
          wasCompact = compact.matches;
        }
        cards.forEach(function (card) {
          card.open = !compact.matches || card === chosen;
          card.querySelector('summary').tabIndex = compact.matches ? 0 : -1;
        });
        refreshHeight();
      }
      cards.forEach(function (card) {
        on(card.querySelector('summary'), 'click', function (event) {
          event.preventDefault();
          if (!compact.matches) return;
          chosen = card.open ? null : card;
          syncCards();
          var answer = card.querySelector('.seo-owner-answer');
          if (card.open && answer && !reduced.matches && answer.animate) {
            rememberAnimation(answer.animate([
              {opacity:.4, transform:'translateY(8px)'},
              {opacity:1, transform:'translateY(0)'}
            ], {duration:280, easing:'cubic-bezier(.2,.7,.2,1)'}));
          }
        });
        on(card, 'toggle', refreshHeight);
      });
      includes.forEach(function (more) {
        on(more.querySelector('summary'), 'click', function (event) { if (compact.matches) event.preventDefault(); });
      });
      syncCards();
      on(compact, 'change', syncCards);
    });
    root.querySelectorAll('.seo-owner-scroll[data-home-scroll]').forEach(function (slider) {
      var track = slider.querySelector('[data-home-scroll-track]');
      var controls = slider.querySelector('.rf-home-scroll-controls');
      if (!track || !controls) return;
      var prev = controls.querySelector('[data-home-scroll-prev]');
      var next = controls.querySelector('[data-home-scroll-next]');
      var sign = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
      function state() {
        var max = Math.max(0, track.scrollWidth - track.clientWidth);
        var pos = Math.abs(track.scrollLeft);
        controls.hidden = !compact.matches || max < 4;
        track.tabIndex = compact.matches && max >= 4 ? 0 : -1;
        prev.disabled = pos < 4;
        next.disabled = pos >= max - 4;
      }
      function move(forward) {
        if (!track.children.length) return;
        var max = track.scrollWidth - track.clientWidth;
        var distance = track.children[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
        track.scrollTo({left: sign * Math.max(0, Math.min(max, Math.abs(track.scrollLeft) + (forward ? distance : -distance))), behavior: reduced.matches ? 'auto' : 'smooth'});
      }
      on(prev, 'click', function () { move(false); });
      on(next, 'click', function () { move(true); });
      on(track, 'scroll', state, {passive:true});
      on(track, 'keydown', function (event) {
        if (!compact.matches || event.target !== track) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === (sign < 0 ? 'ArrowLeft' : 'ArrowRight'));
        }
      });
      on(compact, 'change', state);
      if (typeof ResizeObserver !== 'undefined') {
        var resize = new ResizeObserver(state);
        resize.observe(track);
        undo.push(function () { resize.disconnect(); });
      } else { on(window, 'resize', state); }
      state();
    });
    activeCleanup = function () {
      alive = false;
      if (observer) observer.disconnect();
      if (stepObserver) stepObserver.disconnect();
      if (updateFrame !== null) cancelAnimationFrame(updateFrame);
      animations.forEach(function (a) { a.cancel(); });
      animations.clear();
      undo.forEach(function (fn) { fn(); });
    };
  }
  window.z2oSeoOwnerReview = {init:init, cleanup:cleanup};
}());
