/**
 * ZERO 2 ONE — minimal jQuery replacement
 * =======================================
 *
 * `index-new.js` uses jQuery in 157 places, but only ever reaches for 18
 * methods, and every one of them is a thin wrapper over something the DOM has
 * had natively for years:
 *
 *     .addClass/.removeClass/.hasClass  ->  classList
 *     .on/.click/.resize/.keydown       ->  addEventListener
 *     .find/.closest/.parent            ->  querySelectorAll/closest/parentElement
 *     .each/.width/.attr/.val/.index    ->  forEach/innerWidth/getAttribute/value
 *
 * There is no .animate(), no .ajax(), no plugin — nothing jQuery-specific.
 * That was 87 KB (about a third of the whole vendor bundle) to avoid typing
 * `classList.add`.
 *
 * This file provides exactly that subset, so the 157 call sites stay untouched.
 * Rewriting them by hand would have meant 157 chances to introduce a silent
 * bug in a codebase that has already proven it breaks without throwing.
 *
 * Behaviour deliberately matches jQuery where the call sites depend on it:
 *   - `.each(fn)` calls `fn.call(element, index, element)` — index first
 *   - handlers get `this` bound to the element
 *   - getters (.attr/.val/.width/.index) read the first element
 *   - setters/iterators return the collection so calls can chain
 */
(function (global) {
  'use strict';

  // Extending Array means GSAP and ScrollTrigger accept these objects directly:
  // gsap.utils.toArray() already handles a real array, which is how the
  // existing `gsap.to($(this).find('.btn-text'), …)` call sites keep working.
  class Q extends Array {
    // -- classes ------------------------------------------------------------
    addClass(names) {
      const list = String(names).split(/\s+/).filter(Boolean);
      this.forEach(el => el.classList && el.classList.add(...list));
      return this;
    }
    removeClass(names) {
      const list = String(names).split(/\s+/).filter(Boolean);
      this.forEach(el => el.classList && el.classList.remove(...list));
      return this;
    }
    toggleClass(name, state) {
      this.forEach(el => {
        if (!el.classList) return;
        if (state === undefined) el.classList.toggle(name);
        else el.classList.toggle(name, !!state);
      });
      return this;
    }
    hasClass(name) {
      return this.some(el => el.classList && el.classList.contains(name));
    }

    // -- events -------------------------------------------------------------
    on(types, handler) {
      String(types).split(/\s+/).filter(Boolean).forEach(type => {
        this.forEach(el => el.addEventListener(type, handler));
      });
      return this;
    }
    off(types, handler) {
      String(types).split(/\s+/).filter(Boolean).forEach(type => {
        this.forEach(el => el.removeEventListener(type, handler));
      });
      return this;
    }
    // jQuery's shorthands: with a handler they bind, without one they fire.
    _shorthand(type, handler) {
      if (typeof handler === 'function') return this.on(type, handler);
      this.forEach(el => {
        if (typeof el[type] === 'function') el[type]();
        else el.dispatchEvent(new Event(type, { bubbles: true }));
      });
      return this;
    }
    click(handler) { return this._shorthand('click', handler); }
    resize(handler) { return this._shorthand('resize', handler); }
    keydown(handler) { return this._shorthand('keydown', handler); }
    focusout(handler) {
      if (typeof handler === 'function') return this.on('focusout', handler);
      this.forEach(el => el.dispatchEvent(new Event('focusout', { bubbles: true })));
      return this;
    }
    ready(handler) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handler, { once: true });
      } else {
        handler();
      }
      return this;
    }

    // -- traversal ----------------------------------------------------------
    find(selector) {
      const out = new Q();
      this.forEach(el => {
        if (el.querySelectorAll) out.push(...el.querySelectorAll(selector));
      });
      return out;
    }
    closest(selector) {
      const out = new Q();
      this.forEach(el => {
        const hit = el.closest && el.closest(selector);
        if (hit && out.indexOf(hit) === -1) out.push(hit);
      });
      return out;
    }
    parent() {
      const out = new Q();
      this.forEach(el => {
        const p = el.parentElement;
        if (p && out.indexOf(p) === -1) out.push(p);
      });
      return out;
    }
    // jQuery signature: fn.call(element, index, element)
    each(fn) {
      this.forEach((el, i) => fn.call(el, i, el));
      return this;
    }

    // -- getters ------------------------------------------------------------
    attr(name, value) {
      if (value === undefined) return this[0] ? this[0].getAttribute(name) : undefined;
      this.forEach(el => el.setAttribute(name, value));
      return this;
    }
    val(value) {
      if (value === undefined) return this[0] ? this[0].value : undefined;
      this.forEach(el => { el.value = value; });
      return this;
    }
    // jQuery's $(window).width() is documentElement.clientWidth — the viewport
    // WITHOUT the scrollbar — not window.innerWidth, which includes it. The
    // call sites branch on `> 540`, so getting this wrong shifts the breakpoint
    // by the scrollbar width.
    width() {
      const el = this[0];
      if (!el) return 0;
      if (el === global || el === document) return document.documentElement.clientWidth;
      return el.getBoundingClientRect().width;
    }
    height() {
      const el = this[0];
      if (!el) return 0;
      if (el === global || el === document) return document.documentElement.clientHeight;
      return el.getBoundingClientRect().height;
    }
    index() {
      const el = this[0];
      if (!el || !el.parentElement) return -1;
      return Array.prototype.indexOf.call(el.parentElement.children, el);
    }
  }

  function $(input, context) {
    const out = new Q();
    if (!input) return out;

    if (typeof input === 'function') {          // $(fn) — run on DOM ready
      return out.ready(input);
    }
    if (typeof input === 'string') {
      const root = context ? (context.nodeType ? context : $(context)[0]) : document;
      if (root && root.querySelectorAll) out.push(...root.querySelectorAll(input));
      return out;
    }
    if (input instanceof Q) {
      out.push(...input);
      return out;
    }
    if (input.nodeType || input === global || input === document) {
      out.push(input);
      return out;
    }
    if (typeof input.length === 'number') {     // NodeList / array
      out.push(...input);
      return out;
    }
    out.push(input);
    return out;
  }

  $.fn = Q.prototype;
  global.$ = global.jQuery = $;
})(window);
