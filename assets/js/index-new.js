gsap.registerPlugin(ScrollTrigger);

let scroll;

const body = document.body;
const select = (e) => document.querySelector(e);
const selectAll = (e) => document.querySelectorAll(e);
//const container = select('.site-main');

initPageTransitions();

// Animation - First Page Load
function initLoaderHome() {

  var tl = gsap.timeline();

  // On phones, play the whole intro ~3x faster so the content (LCP)
  // is revealed quickly on slow connections; desktop keeps the full intro.
  var loaderSpeed = window.innerWidth <= 540 ? 3 : 1;
  tl.timeScale(loaderSpeed);

  tl.set(".loading-screen", {
    yPercent: 0,
  });

  if ($(window).width() > 540) {
    tl.set("main .once-in", {
      y: "50vh"
    });
  } else {
    tl.set("main .once-in", {
      y: "10vh"
    });
  }

  tl.set(".loading-words", {
    opacity: 0,
    y: -50
  });

  tl.set(".loading-words .active", {
    display: "none",
  });

  tl.set(".loading-words .home-active, .loading-words .home-active-last", {
    display: "block",
    opacity: 0
  });

  tl.set(".loading-words .home-active-first", {
    opacity: 1,
  });

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh",
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh",
    });
  }

  tl.set("html", {
    cursor: "wait"
  });

  tl.call(function () {
    scroll.stop();
  });

  tl.to(".loading-words", {
    duration: .8,
    opacity: 1,
    y: -50,
    ease: "Power4.easeOut",
    delay: .5
  });

  tl.to(".loading-words .home-active", {
    duration: .01,
    opacity: 1,
    stagger: .35,
    ease: "none",
    onStart: homeActive
  }, "=-.4");

  function homeActive() {
    // this tween lives outside the timeline, so scale it manually
    gsap.to(".loading-words .home-active", {
      duration: .01,
      opacity: 0,
      stagger: .35 / loaderSpeed,
      ease: "none",
      delay: .35 / loaderSpeed
    });
  }

  tl.to(".loading-words .home-active-last", {
    duration: .01,
    opacity: 1,
    delay: .35
  });

  tl.to(".loading-screen", {
    duration: .8,
    yPercent: -100,
    ease: "Power4.easeInOut",
    delay: .2
  });

  tl.to(".loading-screen .rounded-div-wrap.bottom", {
    duration: 1,
    height: "0vh",
    ease: "Power4.easeInOut"
  }, "=-.8");

  tl.to(".loading-words", {
    duration: .3,
    opacity: 0,
    ease: "linear"
  }, "=-.8");

  tl.set(".loading-screen", {
    yPercent: -100
  });

  tl.set(".loading-screen .rounded-div-wrap.bottom", {
    height: "0vh"
  });

  tl.to("main .once-in", {
    duration: 1.5,
    y: "0vh",
    stagger: .07,
    ease: "Expo.easeOut",
    clearProps: true
  }, "=-.8");

  tl.set("html", {
    cursor: "auto"
  }, "=-1.2");

  tl.call(function () {
    scroll.start();
    initScrollRefresh();
  });

}

// Animation - First Page Load
function initLoader() {

  var tl = gsap.timeline();

  // Phones: slightly faster intro on service pages too (still readable)
  tl.timeScale($(window).width() <= 540 ? 1.75 : 1);

  tl.set(".loading-screen", {
    yPercent: 0,
  });

  if ($(window).width() > 540) {
    tl.set("main .once-in", {
      y: "50vh"
    });
  } else {
    tl.set("main .once-in", {
      y: "10vh"
    });
  }

  tl.set(".loading-words", {
    opacity: 1,
    y: -50
  });

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh",
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh",
    });
  }

  tl.set("html", {
    cursor: "wait"
  });

  tl.to(".loading-screen", {
    duration: .8,
    yPercent: -100,
    ease: "Power4.easeInOut",
    delay: .5
  });

  tl.to(".loading-screen .rounded-div-wrap.bottom", {
    duration: 1,
    height: "0vh",
    ease: "Power4.easeInOut"
  }, "=-.8");

  tl.to(".loading-words", {
    duration: .3,
    opacity: 0,
    ease: "linear",
  }, "=-.8");

  tl.set(".loading-screen", {
    yPercent: -100
  });

  tl.set(".loading-screen .rounded-div-wrap.bottom", {
    height: "0vh"
  });

  tl.to("main .once-in", {
    duration: 1,
    y: "0vh",
    stagger: .05,
    ease: "Expo.easeOut",
    clearProps: "true"
  }, "=-.8");

  tl.set("html", {
    cursor: "auto",
  }, "=-.8");

}


// Animation - Page transition In
function pageTransitionIn() {
  var tl = gsap.timeline();

  tl.call(function () {
    scroll.stop();
  });

  tl.set(".loading-screen", {
    yPercent: 100
  });

  tl.set(".loading-words", {
    opacity: 0,
    y: 0
  });

  tl.set("html", {
    cursor: "wait"
  });

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh",
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh",
    });
  }

  tl.to(".loading-screen", {
    duration: .5,
    yPercent: 0,
    ease: "Power4.easeIn"
  });

  if ($(window).width() > 540) {
    tl.to(".loading-screen .rounded-div-wrap.top", {
      duration: .4,
      height: "10vh",
      ease: "Power4.easeIn"
    }, "=-.5");
  } else {
    tl.to(".loading-screen .rounded-div-wrap.top", {
      duration: .4,
      height: "10vh",
      ease: "Power4.easeIn"
    }, "=-.5");
  }

  tl.to(".loading-words", {
    duration: .8,
    opacity: 1,
    y: -50,
    ease: "Power4.easeOut",
    delay: .05
  });

  tl.set(".loading-screen .rounded-div-wrap.top", {
    height: "0vh"
  });

  tl.to(".loading-screen", {
    duration: .8,
    yPercent: -100,
    ease: "Power3.easeInOut"
  }, "=-.2");

  tl.to(".loading-words", {
    duration: .6,
    opacity: 0,
    ease: "linear"
  }, "=-.8");

  tl.to(".loading-screen .rounded-div-wrap.bottom", {
    duration: .85,
    height: "0",
    ease: "Power3.easeInOut"
  }, "=-.6");

  tl.set("html", {
    cursor: "auto"
  }, "=-0.6");

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh"
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh"
    });
  }

  tl.set(".loading-screen", {
    yPercent: 100
  });

  tl.set(".loading-words", {
    opacity: 0,
  });

}


// Animation - Page transition Out
function pageTransitionOut() {
  var tl = gsap.timeline();

  if ($(window).width() > 540) {
    tl.set("main .once-in", {
      y: "50vh",
    });
  } else {
    tl.set("main .once-in", {
      y: "20vh"
    });
  }

  tl.call(function () {
    scroll.start();
  });

  tl.to("main .once-in", {
    duration: 1,
    y: "0vh",
    stagger: .05,
    ease: "Expo.easeOut",
    delay: .8,
    clearProps: "true"
  });

}

function initPageTransitions() {

  //let scroll;

  // do something before the transition starts
  barba.hooks.before(() => {
    select('html').classList.add('is-transitioning');
  });

  // do something after the transition finishes
  // المرساة تُلتقط من الرابط المضغوط، لا من العنوان ولا من barba.
    //
    // قِسنا الاثنين: بعد الضغط على /ar/#testimonials صار location.hash
    // فارغًا، و data.next.url يحوي {href, path, port, query} **بلا hash**.
    // ‏barba 2.10 يُسقطها عند تفكيك الرابط، فلا يبقى مصدر إلا الرابط نفسه.
    //
    // capture:true ليسبق معالج barba، و i > 0 ليستثني المراسي داخل الصفحة
    // نفسها — تلك يتكفّل بها معالج التمرير السلس أدناه.
    var pendingHash = '';
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.nodeType === 1 ? e.target : null;
      var a = el && el.closest ? el.closest('a[href*="#"]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var i = href.indexOf('#');
      if (i > 0) pendingHash = href.slice(i);
    }, true);

    barba.hooks.after((data) => {
    select('html').classList.remove('is-transitioning');
    // reinit locomotive scroll
    scroll.init();
    scroll.stop();

    // Honour a hash in the destination URL after a barba transition.
    //
    // The smooth-scroll handler further down only binds a[href^="#"] —
    // same-page anchors. A cross-page link such as /ar/#testimonials never
    // matches it, so barba navigated and the hash was silently dropped:
    // measured landing 5381px above the section, with no # in the address.
    //
    // afterEnter() forces scrollTo(0,0), so this must run after it and after
    // locomotive has measured the new page — hence the delay.
    // barba يُسقط المرساة من العنوان عند الانتقال — قِسناه: بعد الضغط على
    // /ar/#testimonials صار location.hash فارغًا تمامًا. فالمصدر الموثوق هو
    // الوجهة التي طلبها barba نفسه، لا شريط العنوان.
    var hash = pendingHash || window.location.hash;
    pendingHash = '';
    if (hash && hash.length > 1) {
      setTimeout(function () {
        var target = document.querySelector(hash);
        if (target) {
          scroll.start();
          scroll.scrollTo(target, { offset: 0, duration: 900, easing: [0.7, 0, 0.35, 1] });
        }
      }, 700);
    }
  });

  // scroll to the top of the page
  barba.hooks.enter(() => {
    scroll.destroy();
  });

  // scroll to the top of the page
  barba.hooks.afterEnter(() => {
    window.scrollTo(0, 0);
    initCookieViews();
  });

  if ($(window).width() > 540) {
    barba.hooks.leave(() => {
      $(".btn-hamburger, .btn-menu").removeClass('active');
      $("main").removeClass('nav-active');
    });
  }


  barba.init({
    sync: true,
    debug: false,
    timeout: 7000,
    transitions: [{
      name: 'default',
      once(data) {
        // do something once on the initial page load
        initSmoothScroll(data.next.container);
        initScript();
        initCookieViews();
        initLoader();
      },
      async leave(data) {
        // animate loading screen in
        pageTransitionIn(data.current);
        await delay(495);
        data.current.container.remove();
      },
      async enter(data) {
        // animate loading screen away
        pageTransitionOut(data.next);
        initNextWord(data);
      },
      async beforeEnter(data) {
        ScrollTrigger.getAll().forEach(t => t.kill());
        scroll.destroy();
        initSmoothScroll(data.next.container);
        initScript();
      },
    },
    {
      name: 'to-home',
      from: {
      },
      to: {
        namespace: ['home']
      },
      once(data) {
        // do something once on the initial page load
        initSmoothScroll(data.next.container);
        initScript();
        initCookieViews();
        initLoaderHome();
      },
    }]
  });

  function initSmoothScroll(container) {

    scroll = new LocomotiveScroll({
      el: container.querySelector('[data-scroll-container]'),
      smooth: !window.matchMedia('(pointer: coarse)').matches,
      tablet: { smooth: false, breakpoint: 1024 },
      smartphone: { smooth: false },
    });

    window.onresize = () => {
      scroll.update();
    }

    scroll.on("scroll", () => ScrollTrigger.update());

    ScrollTrigger.scrollerProxy('[data-scroll-container]', {
      scrollTop(value) {
        return arguments.length ? scroll.scrollTo(value, 0, 0) : scroll.scroll.instance.scroll.y;
      }, // we don't have to define a scrollLeft because we're only scrolling vertically.
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
      // LocomotiveScroll handles things completely differently on mobile devices - it doesn't even transform the container at all! So to get the correct behavior and avoid jitters, we should pin things with position: fixed on mobile. We sense it by checking to see if there's a transform applied to the container (the LocomotiveScroll-controlled element).
      pinType: container.querySelector('[data-scroll-container]').style.transform ? "transform" : "fixed"
    });

    ScrollTrigger.defaults({
      scroller: document.querySelector('[data-scroll-container]'),
    });

    /**
     * Remove Old Locomotive Scrollbar
     */

    const scrollbar = selectAll('.c-scrollbar');

    if (scrollbar.length > 1) {
      scrollbar[0].remove();
    }

    // each time the window updates, we should refresh ScrollTrigger and then update LocomotiveScroll. 
    ScrollTrigger.addEventListener('refresh', () => scroll.update());

    // after everything is set up, refresh() ScrollTrigger and update LocomotiveScroll because padding may have been added for pinning, etc.
    ScrollTrigger.refresh();
  }
}

function initNextWord(data) {
  // update Text Loading https://github.com/barbajs/barba/issues/507
  let parser = new DOMParser();
  let dom = parser.parseFromString(data.next.html, 'text/html');
  let nextProjects = dom.querySelector('.loading-words');
  document.querySelector('.loading-words').innerHTML = nextProjects.innerHTML;
}

function delay(n) {
  n = n || 2000;
  return new Promise((done) => {
    setTimeout(() => {
      done();
    }, n);
  });
}


/**
 * Fire all scripts on page load
 */
function initScript() {
  select('body').classList.remove('is-loading');
  initWindowInnerheight();
  initCheckTouchDevice();
  initHamburgerNav();
  initMagneticButtons();
  initCardTilt();
  initStickyCursorWithDelay();
  initVisualFilter();
  initScrolltriggerNav();
  initHamburgerTheme();
  initScrollLetters();
  initTricksWords();
  initContactForm();
  initLeadTracking();
  initTimeZone();
  initPlayVideoInview();
  initScrolltriggerAnimations();
  initEmailLinks();
  setTimeout(initScrollRefresh, 500);
}

/**
* Window Inner Height Check
*/
function initWindowInnerheight() {

  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  $(document).ready(function () {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    $('.btn-hamburger').click(function () {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
  });

}

/**
* Check touch device
*/
function initCheckTouchDevice() {

  function isTouchScreendevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints;
  };

  if (isTouchScreendevice()) {
    $('main').addClass('touch');
    $('main').removeClass('no-touch');
  } else {
    $('main').removeClass('touch');
    $('main').addClass('no-touch');
  }
  $(window).resize(function () {
    if (isTouchScreendevice()) {
      $('main').addClass('touch');
      $('main').removeClass('no-touch');
    } else {
      $('main').removeClass('touch');
      $('main').addClass('no-touch');
    }
  });

}

/**
* Hamburger Nav Open/Close
*/
function initHamburgerNav() {

  // Open/close navigation when clicked .btn-hamburger

  $(document).ready(function () {
    $(".btn-hamburger, .btn-menu").click(function () {
      if ($(".btn-hamburger, .btn-menu").hasClass('active')) {
        $(".btn-hamburger, .btn-menu").removeClass('active');
        $("main").removeClass('nav-active');
        scroll.start();
      } else {
        $(".btn-hamburger, .btn-menu").addClass('active');
        $("main").addClass('nav-active');
        scroll.stop();
      }
    });
    $('.fixed-nav-back').click(function () {
      $(".btn-hamburger, .btn-menu").removeClass('active');
      $("main").removeClass('nav-active');
      scroll.start();
    });
  });
  $(document).keydown(function (e) {
    if (e.keyCode == 27) {
      if ($('main').hasClass('nav-active')) {
        $(".btn-hamburger, .btn-menu").removeClass('active');
        $("main").removeClass('nav-active');
        scroll.start();
      }
    }
  });

  // Smooth-scroll nav + side-menu links to the page sections
  $('.nav-bar .links-wrap a[href^="#"], .fixed-nav .links-wrap a[href^="#"]').on('click', function (e) {
    e.preventDefault();
    var hash = $(this).attr('href');
    // move the visual "active" state onto the tapped link in both menus
    // (needed on touch, where there is no :hover to signal the current item)
    var $lists = $('.nav-bar .links-wrap, .fixed-nav .links-wrap');
    $lists.find('.btn-link').removeClass('active');
    $lists.find('.btn-link > a[href="' + hash + '"]').parent().addClass('active');
    // close the side menu if it is open
    $(".btn-hamburger, .btn-menu").removeClass('active');
    $("main").removeClass('nav-active');
    scroll.start();
    setTimeout(function () {
      var opts = { offset: 0, duration: 900, easing: [0.7, 0, 0.35, 1] };
      if (hash === '#home') {
        scroll.scrollTo('top', opts);
      } else {
        var target = document.querySelector(hash);
        if (target) scroll.scrollTo(target, opts);
      }
    }, 100);
  });

  // مراسي صفحة SEO — محصورة بها وحدها.
  //
  // القفز الافتراضي لا يعمل هنا: locomotive يزيح المحتوى بـtransform
  // بينما النافذة نفسها لا تُمرَّر، فـhref="#..." لا يحرّك شيئًا. ولهذا
  // يمرّ كل رابط داخلي عبر scroll.scrollTo مثل روابط القائمة أعلاه.
  //
  // ومن أطفأ الحركة في نظامه ينتقل فورًا بلا انزلاق.
  $('.seo-service-page a[href^="#"]').on('click', function (e) {
    var hash = $(this).attr('href');
    if (!hash || hash.length < 2) return;
    var target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroll.start();
    scroll.scrollTo(target, still
      ? { offset: 0, duration: 0 }
      : { offset: 0, duration: 900, easing: [0.7, 0, 0.35, 1] });
  });

}

/**
* Magnetic Buttons
*/
function initMagneticButtons() {

  // Magnetic Buttons
  // Found via: https://codepen.io/tdesero/pen/RmoxQg
  var magnets = document.querySelectorAll('.magnetic');
  var strength = 100;

  // START : If screen is bigger as 540 px do magnetic
  if (window.innerWidth > 540) {
    // Mouse Reset
    magnets.forEach((magnet) => {
      magnet.addEventListener('mousemove', moveMagnet);
      $(this.parentNode).removeClass('not-active');
      magnet.addEventListener('mouseleave', function (event) {
        gsap.to(event.currentTarget, 1.5, {
          x: 0,
          y: 0,
          ease: Elastic.easeOut
        });
        gsap.to($(this).find(".btn-text"), 1.5, {
          x: 0,
          y: 0,
          ease: Elastic.easeOut
        });
      });
    });

    // Mouse move
    function moveMagnet(event) {
      var magnetButton = event.currentTarget;
      var bounding = magnetButton.getBoundingClientRect();
      var magnetsStrength = magnetButton.getAttribute("data-strength");
      var magnetsStrengthText = magnetButton.getAttribute("data-strength-text");

      gsap.to(magnetButton, 1.5, {
        x: (((event.clientX - bounding.left) / magnetButton.offsetWidth) - 0.5) * magnetsStrength,
        y: (((event.clientY - bounding.top) / magnetButton.offsetHeight) - 0.5) * magnetsStrength,
        rotate: "0.001deg",
        ease: Power4.easeOut
      });
      gsap.to($(this).find(".btn-text"), 1.5, {
        x: (((event.clientX - bounding.left) / magnetButton.offsetWidth) - 0.5) * magnetsStrengthText,
        y: (((event.clientY - bounding.top) / magnetButton.offsetHeight) - 0.5) * magnetsStrengthText,
        rotate: "0.001deg",
        ease: Power4.easeOut
      });
    }

  }; // END : If screen is bigger as 540 px do magnetic

  // Mouse Enter
  $('.btn-click.magnetic').on('mouseenter', function () {
    if ($(this).find(".btn-fill").length) {
      gsap.to($(this).find(".btn-fill"), .6, {
        startAt: { y: "76%" },
        y: "0%",
        ease: Power2.easeInOut
      });
    }
    if ($(this).find(".btn-text-inner.change").length) {
      gsap.to($(this).find(".btn-text-inner.change"), .3, {
        startAt: { color: "#1C1D20" },
        color: "#FFFFFF",
        ease: Power3.easeIn,
      });
    }
    $(this.parentNode).removeClass('not-active');
  });

  // Mouse Leave
  $('.btn-click.magnetic').on('mouseleave', function () {
    if ($(this).find(".btn-fill").length) {
      gsap.to($(this).find(".btn-fill"), .6, {
        y: "-76%",
        ease: Power2.easeInOut
      });
    }
    if ($(this).find(".btn-text-inner.change").length) {
      gsap.to($(this).find(".btn-text-inner.change"), .3, {
        color: "#1C1D20",
        ease: Power3.easeOut,
        delay: .3
      });
    }
    $(this.parentNode).removeClass('not-active');
  });
}

/*
* 3D Tilt Cards (react to cursor position)
*/
function initCardTilt() {
  if (window.innerWidth <= 768) return;
  var cards = document.querySelectorAll('.service-card, .testi-card');
  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      var max = 9;
      gsap.to(card, {
        duration: .5,
        rotationY: px * max,
        rotationX: -py * max,
        transformPerspective: 900,
        transformOrigin: 'center',
        ease: 'power2.out'
      });
    });
    card.addEventListener('mouseleave', function () {
      gsap.to(card, {
        duration: 1,
        rotationY: 0,
        rotationX: 0,
        ease: 'elastic.out(1, 0.5)'
      });
    });
  });
}


/**
* Sticky Cursor with Delay
*/
function initStickyCursorWithDelay() {

  // Sticky Cursor with delay
  // https://greensock.com/forums/topic/21161-animated-mouse-cursor/
  var cursorImage = $(".mouse-pos-list-image")
  var cursorBtn = $(".mouse-pos-list-btn");
  var cursorSpan = $(".mouse-pos-list-span");

  var posXImage = 0
  var posYImage = 0
  var posXBtn = 0
  var posYBtn = 0
  var posXSpan = 0
  var posYSpan = 0
  var mouseX = 0
  var mouseY = 0

  if (document.querySelector(".mouse-pos-list-image, .mouse-pos-list-btn, .mouse-post-list-span")) {
    gsap.to({}, 0.0083333333, {
      repeat: -1,
      onRepeat: function () {

        if (document.querySelector(".mouse-pos-list-image")) {
          posXImage += (mouseX - posXImage) / 12;
          posYImage += (mouseY - posYImage) / 12;
          gsap.set(cursorImage, {
            css: {
              left: posXImage,
              top: posYImage
            }
          });
        }
        if (document.querySelector(".mouse-pos-list-btn")) {
          posXBtn += (mouseX - posXBtn) / 7;
          posYBtn += (mouseY - posYBtn) / 7;
          gsap.set(cursorBtn, {
            css: {
              left: posXBtn,
              top: posYBtn
            }
          });
        }
        if (document.querySelector(".mouse-pos-list-span")) {
          posXSpan += (mouseX - posXSpan) / 6;
          posYSpan += (mouseY - posYSpan) / 6;
          gsap.set(cursorSpan, {
            css: {
              left: posXSpan,
              top: posYSpan
            }
          });
        }
      }
    });
  }

  $(document).on("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Animated Section Assortiment Single Floating Image
  // Source: http://jsfiddle.net/639Jj/1/ 

  $('.mouse-pos-list-image-wrap a').on('mouseenter', function () {
    $('.mouse-pos-list-image, .mouse-pos-list-btn, .mouse-pos-list-span, .mouse-pos-list-span-big').addClass('active');
  });
  $('.mouse-pos-list-image-wrap a').on('mouseleave', function () {
    $('.mouse-pos-list-image, .mouse-pos-list-btn, .mouse-pos-list-span, .mouse-pos-list-span-big').removeClass('active');
  });
  $('.single-tile-wrap a, .mouse-pos-list-archive a, .next-case-btn').on('mouseenter', function () {
    $('.mouse-pos-list-btn, .mouse-pos-list-span').addClass('active-big');
  });
  $('.single-tile-wrap a, .mouse-pos-list-archive a, .next-case-btn').on('mouseleave', function () {
    $('.mouse-pos-list-btn, .mouse-pos-list-span').removeClass('active-big');
  });
  $('main').on('mousedown', function () {
    $(".mouse-pos-list-btn, .mouse-pos-list-span").addClass('pressed');
  });
  $('main').on('mouseup', function () {
    $(".mouse-pos-list-btn, .mouse-pos-list-span").removeClass('pressed');
  });

  $('.mouse-pos-list-image-wrap li.visible').on('mouseenter', function () {

    var $elements = $(".mouse-pos-list-image-wrap li.visible");
    var index = $elements.index($(this));
    var count = $(".mouse-pos-list-image li.visible").length;
    // var index =  $(this).index();
    if ($(".float-image-wrap")) {
      gsap.to($(".float-image-wrap"), {
        y: (index * 100) / (count * -1) + "%",
        duration: .6,
        ease: Power2.easeInOut
      });
    }
    $(".mouse-pos-list-image.active .mouse-pos-list-image-bounce").addClass("active").delay(400).queue(function (next) {
      $(this).removeClass("active");
      next();
    });

  });

  $('.archive-work-grid li').on('mouseenter', function () {
    $(".mouse-pos-list-btn").addClass("hover").delay(100).queue(function (next) {
      $(this).removeClass("hover");
      next();
    });
  });

}

/**
* Visual Filter
*/
function initVisualFilter() {

  // Visual Filter
  $(document).ready(function () {

    $('.toggle-row .btn').click(function () {
      if ($(this).hasClass('active')) {
      } else {
        $('.work-tiles li, .work-items li').addClass('tile-fade-out');
        scroll.stop();
        setTimeout(function () {
          $('.work-tiles li, .work-items li').removeClass('tile-fade-out');
          $('.work-tiles li, .work-items li').addClass('tile-fade-in');
          scroll.scrollTo('top', { 'offset': 0, 'duration': 700, 'easing': [0.7, 0.00, 0.35, 1.00], 'disableLerp': true });
        }, 300);
        setTimeout(function () {
          $('.work-tiles li, .work-items li').removeClass('tile-fade-in');
          scroll.update();
          ScrollTrigger.refresh();
          scroll.start();
        }, 700);
        setTimeout(function () {
          scroll.update();
          console.log('scroll- updated');
        }, 1000);
      }
    });
    $('.all-btn').click(function () {
      if ($(this).hasClass('active')) {
      } else {
        $('.toggle-row .btn-normal').removeClass('active');
        $('.toggle-row .btn-normal').addClass('not-active');
        $(this).addClass('active');
        $(this).removeClass('not-active');
        // Cookies.set("filter", "all", { expires: 1 });
        setTimeout(function () {
          $('.mouse-pos-list-image li, .mouse-pos-list-image-wrap li, .work-tiles li').addClass('visible');
        }, 300);
      }
    });
    $('.design-btn').click(function () {
      if ($(this).hasClass('active')) {
      } else {
        $('.toggle-row .btn-normal').removeClass('active');
        $('.toggle-row .btn-normal').addClass('not-active');
        $(this).addClass('active');
        $(this).removeClass('not-active');
        // Cookies.set("filter", "design", { expires: 1 });
        setTimeout(function () {
          $('.mouse-pos-list-image li, .mouse-pos-list-image-wrap li, .work-tiles li').removeClass('visible');
          $('.mouse-pos-list-image li.design, .mouse-pos-list-image-wrap li.design, .work-tiles li.design').addClass('visible');
        }, 300);
      }
    });
    $('.development-btn').click(function () {
      if ($(this).hasClass('active')) {
      } else {
        $('.toggle-row .btn-normal').removeClass('active');
        $('.toggle-row .btn-normal').addClass('not-active');
        $(this).addClass('active');
        $(this).removeClass('not-active');
        // Cookies.set("filter", "development", { expires: 1 });
        setTimeout(function () {
          $('.mouse-pos-list-image li, .mouse-pos-list-image-wrap li, .work-tiles li').removeClass('visible');
          $('.mouse-pos-list-image li.development, .mouse-pos-list-image-wrap li.development, .work-tiles li.development').addClass('visible');
        }, 300);
      }
    });

    $('.grid-row .btn').click(function () {
      if ($(this).hasClass('active')) {
      } else {
        $('.grid-fade').addClass('grid-fade-out');
        scroll.stop();
        scroll.scrollTo('top', { 'offset': 0, 'duration': 700, 'easing': [0.7, 0.00, 0.35, 1.00], 'disableLerp': true });
        setTimeout(function () {
          $('.grid-fade').removeClass('grid-fade-out');
          $('.grid-fade').addClass('grid-fade-in');
        }, 300);
        setTimeout(function () {
          $('.grid-fade').removeClass('grid-fade-in');
          scroll.update();
          ScrollTrigger.refresh();
          scroll.start();
        }, 700);
      }
    });
    $('.grid-row .rows-btn').click(function () {
      if ($(this).hasClass('active')) {
      } else {
        $('.grid-row .btn-normal').removeClass('active');
        $('.grid-row .btn-normal').addClass('not-active');
        Cookies.set("view", "rows", { expires: 14 });
        $(this).addClass('active');
        $(this).removeClass('not-active');
        setTimeout(function () {
          $('.grid-columns-part').removeClass('visible');
          $('.grid-rows-part').addClass('visible');
        }, 300);
      }
    });
    $('.grid-row .columns-btn').click(function () {
      if ($(this).hasClass('active')) {
      } else {
        $('.grid-row .btn-normal').removeClass('active');
        $('.grid-row .btn-normal').addClass('not-active');
        Cookies.set("view", "columns", { expires: 14 });
        $(this).addClass('active');
        $(this).removeClass('not-active');
        setTimeout(function () {
          $('.grid-rows-part').removeClass('visible');
          $('.grid-columns-part').addClass('visible');
        }, 300);
      }
    });

  });

}


/**
* Cookie Views
*/
function initCookieViews() {
  // Set cookie for columns/rows view
  // https://www.youtube.com/watch?v=rfwiyBoVwdQ&ab_channel=TimothyRicks
  if (Cookies.get("view") == "columns") {
    $('.grid-row .rows-btn').removeClass('active');
    $('.grid-row .columns-btn').addClass('active');
    $('#work .grid-rows-part').removeClass('visible');
    $('#work .grid-columns-part').addClass('visible');
    scroll.update();
    ScrollTrigger.refresh();
  }
}


/**
* Scrolltrigger Scroll Check
*/
function initScrolltriggerNav() {

  ScrollTrigger.create({
    start: 'top -30%',
    onUpdate: self => {
      $("main").addClass('scrolled');
    },
    onLeaveBack: () => {
      $("main").removeClass('scrolled');
    },
  });

}

/**
* Hamburger button colour adapts to the section behind it
* (orange sections -> cream hover, light sections -> orange hover)
*/
function initHamburgerTheme() {
  var burger = document.querySelector('.btn-hamburger');
  if (!burger) return;

  ['.our-services', '.footer-wrap'].forEach(function (sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 7%',
      end: 'bottom 7%',
      onToggle: function (self) {
        burger.classList.toggle('on-orange', self.isActive);
      }
    });
  });
}


/**
* Scrolltrigger Scroll Letters Home
*/
function initScrollLetters() {
  // Scrolling Letters Both Direction
  // https://codepen.io/GreenSock/pen/rNjvgjo
  // Fixed example with resizing
  // https://codepen.io/GreenSock/pen/QWqoKBv?editors=0010

  let direction = 1; // 1 = forward, -1 = backward scroll

  const roll1 = roll(".big-name .name-wrap", { duration: 18 }),
    roll2 = roll(".rollingText02", { duration: 10 }, true),
    scroll = ScrollTrigger.create({
      trigger: document.querySelector('[data-scroll-container]'),
      onUpdate(self) {
        if (self.direction !== direction) {
          direction *= -1;
          gsap.to([roll1, roll2], { timeScale: direction, overwrite: true });
        }
      }
    });

  // helper function that clones the targets, places them next to the original, then animates the xPercent in a loop to make it appear to roll across the screen in a seamless loop.
  function roll(targets, vars, reverse) {
    vars = vars || {};
    vars.ease || (vars.ease = "none");
    const tl = gsap.timeline({
      repeat: -1,
      onReverseComplete() {
        this.totalTime(this.rawTime() + this.duration() * 10); // otherwise when the playhead gets back to the beginning, it'd stop. So push the playhead forward 10 iterations (it could be any number)
      }
    }),
      elements = gsap.utils.toArray(targets),
      clones = elements.map(el => {
        let clone = el.cloneNode(true);
        el.parentNode.appendChild(clone);
        return clone;
      }),
      positionClones = () => elements.forEach((el, i) => gsap.set(clones[i], { position: "absolute", overwrite: false, top: el.offsetTop, left: el.offsetLeft + (reverse ? -el.offsetWidth : el.offsetWidth) }));
    positionClones();
    elements.forEach((el, i) => tl.to([el, clones[i]], { xPercent: reverse ? 100 : -100, ...vars }, 0));
    window.addEventListener("resize", () => {
      let time = tl.totalTime(); // record the current time
      tl.totalTime(0); // rewind and clear out the timeline
      positionClones(); // reposition
      tl.totalTime(time); // jump back to the proper time
    });
    return tl;
  }

}



/**
* Scrolltrigger Nav
*/
function initTricksWords() {

  // Copyright start
  // © Code by T.RICKS, https://www.tricksdesign.com/
  // You have the license to use this code in your projects but not redistribute it to others
  // Tutorial: https://www.youtube.com/watch?v=xiAqTu4l3-g&ab_channel=TimothyRicks

  // Find all text with .tricks class and break each letter into a span
  var spanWord = document.getElementsByClassName("span-lines");
  for (var i = 0; i < spanWord.length; i++) {

    var wordWrap = spanWord.item(i);
    wordWrap.innerHTML = wordWrap.innerHTML.replace(/(^|<\/?[^>]+>|\s+)([^\s<]+)/g, '$1<span class="span-line"><span class="span-line-inner">$2</span></span>');

  }

}

/**
* Contact Form
*/
function initContactForm() {

  $('.field').on('input', function () {
    $(this).parent().toggleClass('not-empty', this.value.trim().length > 0);
  });

  $(function () {
    $('.field').focusout(function () {
      var text_val = $(this).val();
      $(this).parent().toggleClass('not-empty', text_val !== "");
    }).focusout();
  });

  const contactForm = document.getElementById('contact-form');
  if (contactForm && !contactForm.dataset.bound) {
    contactForm.dataset.bound = '1';

    // Copy for both language trees (/ = English, /ar/ = Arabic)
    const ar = (document.documentElement.getAttribute('lang') || 'en').indexOf('ar') === 0;
    const COPY = ar ? {
      sending: 'جارٍ الإرسال…',
      sent: 'تم الإرسال ✓',
      opened: 'افتح واتساب ✓',
      error: 'خطأ!',
      head: 'طلب جديد من الموقع',
      ok: 'شكراً لتواصلك مع ZERO 2 ONE. وصلتنا رسالتك وسنعاود الاتصال بك في نفس يوم العمل.',
      fail: 'تعذّر إرسال الرسالة. جرّب مرة أخرى أو راسلنا على واتساب.',
      labels: {
        name: 'الاسم', company: 'الشركة', email: 'البريد الإلكتروني',
        phone: 'الجوال', service: 'الخدمة', message: 'التفاصيل'
      }
    } : {
      sending: 'Sending…',
      sent: 'Sent ✓',
      opened: 'Opening WhatsApp ✓',
      error: 'Error!',
      head: 'New enquiry from the website',
      ok: 'Thanks for reaching out to ZERO 2 ONE. We have your message and will get back to you the same business day.',
      fail: 'We could not send your message. Please try again, or reach us on WhatsApp.',
      labels: {
        name: 'Name', company: 'Company', email: 'Email',
        phone: 'Phone', service: 'Service', message: 'Details'
      }
    };

    // Read the agency's WhatsApp number off the page rather than hard-coding it
    // a second time — the footer and contact panel already carry it.
    function whatsappNumber() {
      var link = document.querySelector('a[href*="wa.me/"]');
      var m = link && (link.getAttribute('href') || '').match(/wa\.me\/(\d+)/);
      return m ? m[1] : '';
    }

    function asMessage(data) {
      var lines = [COPY.head, ''];
      Object.keys(COPY.labels).forEach(function (k) {
        if (data[k]) lines.push(COPY.labels[k] + ': ' + data[k]);
      });
      return lines.join('\n');
    }

    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('.contact-submit');
      // The submit control is the site's standard round-pill button, so the
      // visible label lives in .btn-text-inner rather than on the element.
      const label = submitBtn.querySelector('.btn-text-inner') || submitBtn;
      const originalLabel = label.textContent;

      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData.entries());

      // Where the enquiry goes: the form's own action, which is /send.php —
      // plain PHP mail() on Hostinger, no third-party service. The same
      // attribute is the native no-JS target, so there is one place to change.
      // Clearing the action falls back to composing a WhatsApp message, which
      // needs no backend at all.
      const endpoint = (contactForm.getAttribute('action') || '').trim();

      if (!endpoint) {
        const number = whatsappNumber();
        if (!number) return;
        // Synchronous: opening the window straight out of the submit gesture
        // keeps it clear of popup blockers.
        window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(asMessage(data)),
          '_blank', 'noopener');
        label.textContent = COPY.opened;
        label.style.color = '#4CAF50';
        contactForm.reset();
        $('.field').parent().removeClass('not-empty');
        trackLead('form', { service: data.service || '' });
        setTimeout(function () {
          label.textContent = originalLabel;
          label.style.color = '';
        }, 4000);
        return;
      }

      // Visual Feedback
      label.textContent = COPY.sending;
      submitBtn.style.opacity = '0.5';
      submitBtn.disabled = true;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        // send.php always answers {success, message}. Its message is the useful
        // one — it names the field that failed validation, or the seconds left
        // on the rate limit — so show that rather than a generic string.
        const payload = await response.json().catch(() => null);
        const detail = payload && typeof payload.message === 'string' ? payload.message : '';

        if (response.ok && payload && payload.success) {
          label.textContent = COPY.sent;
          label.style.color = '#4CAF50';
          contactForm.reset();
          $('.field').parent().removeClass('not-empty');
          trackLead('form', { service: data.service || '' });

          setTimeout(() => {
            alert(detail || COPY.ok);
          }, 500);

        } else {
          label.textContent = COPY.error;
          label.style.color = '#f44336';
          alert(detail || COPY.fail);
        }
      } catch (error) {
        // Network failure or PHP unavailable — the WhatsApp link in .form-note
        // right beside the button is still there, so say so.
        label.textContent = COPY.error;
        label.style.color = '#f44336';
        alert(COPY.fail);
      } finally {
        setTimeout(() => {
          label.textContent = originalLabel;
          label.style.color = '';
          submitBtn.style.opacity = '1';
          submitBtn.disabled = false;
        }, 4000);
      }
    });
  }

}

/**
* Lead tracking
* -------------
* Every contact action on the site is a conversion: WhatsApp, phone, email and
* the contact form. Each one sends a GA4 `generate_lead` event carrying the
* channel in `method`, so GA4 → Admin → Events can mark it as a key event and
* Google Ads can optimise against it. Bound once on `document`, because
* initScript() re-runs after every barba page transition.
*/
function trackLead(method, extra) {
  if (typeof gtag !== 'function') return;
  gtag('event', method === 'directions' ? 'view_directions' : 'generate_lead', Object.assign({
    method: method,
    page_path: window.location.pathname,
    page_language: document.documentElement.getAttribute('lang') || 'en'
  }, extra || {}));
}

function initLeadTracking() {
  if (document.documentElement.dataset.leadTracking) return;
  document.documentElement.dataset.leadTracking = '1';

  document.addEventListener('click', function (e) {
    const link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    const href = link.getAttribute('href') || '';
    let method = null;

    if (/^https?:\/\/(api\.|web\.)?wa(\.me|tsapp)/i.test(href)) method = 'whatsapp';
    else if (/^tel:/i.test(href)) method = 'phone';
    // initEmailLinks() rewrites mailto: to the Gmail compose URL on desktop,
    // so both shapes have to count as the same channel.
    else if (/^mailto:/i.test(href) || /mail\.google\.com\/mail\/\?view=cm/i.test(href)) method = 'email';
    else if (/(maps\.google\.|google\.[a-z.]+\/maps)/i.test(href)) method = 'directions';

    if (method) trackLead(method);
  }, true);
}

/**
* Footer Time Zone
*/
function initTimeZone() {

  if (document.querySelector("#timeSpan")) {
    // Time zone
    // https://stackoverflow.com/questions/39418405/making-a-live-clock-in-javascript/67149791#67149791
    // https://stackoverflow.com/questions/8207655/get-time-of-specific-timezone
    // https://stackoverflow.com/questions/63572780/how-to-update-intl-datetimeformat-with-new-date

    const timeSpan = document.querySelector("#timeSpan");

    const optionsTime = {
      timeZone: 'Asia/Riyadh',
      timeZoneName: 'short',
      // year: 'numeric',
      // month: 'numeric',
      // day: 'numeric',
      hour: '2-digit',
      hour12: 'true',
      minute: 'numeric',
      // second: 'numeric',
    };

    // Keep the clock in Western digits / English format in both languages;
    // the RTL footer forces it left-to-right via CSS (#timeSpan).
    const formatter = new Intl.DateTimeFormat([], optionsTime);
    updateTime();
    setInterval(updateTime, 1000);

    function updateTime() {
      timeSpan.innerText = formatter.format(new Date());
    }
  }

}

/**
* Scroll Refresh
*/
function initScrollRefresh() {
  if (scroll) {
    scroll.update();
    ScrollTrigger.refresh();
  }
}

/**
* Email Links Browser/Mobile
*/
function initEmailLinks() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const emailLinks = document.querySelectorAll('a[href^="mailto:info@zero2one.sa"]');

  emailLinks.forEach(link => {
    if (!isMobile) {
      link.setAttribute('href', 'https://mail.google.com/mail/?view=cm&fs=1&to=info@zero2one.sa');
      link.setAttribute('target', '_blank');
    }
  });
}

/**
* Play Video Inview
*/
function initPlayVideoInview() {

  let allVideoDivs = gsap.utils.toArray('.playpauze');

  allVideoDivs.forEach((videoDiv, i) => {

    let videoElem = videoDiv.querySelector('video')

    ScrollTrigger.create({
      scroller: document.querySelector('[data-scroll-container]'),
      trigger: videoElem,
      start: '0% 120%',
      end: '100% -20%',
      onEnter: () => videoElem.play(),
      onEnterBack: () => videoElem.play(),
      onLeave: () => videoElem.pause(),
      onLeaveBack: () => videoElem.pause(),
    });

  });
}

/**
* Scrolltrigger Animations Desktop + Mobile
*/
function initScrolltriggerAnimations() {

  // Scrolltrigger Animation : Case detail image (zoom-out parallax)
  if (document.querySelector(".case-image-photo")) {
    $(".case-image-photo").each(function () {
      gsap.fromTo($(this),
        { scale: 1.2 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: $(this).closest(".single-image"),
            start: "0% 100%",
            end: "100% 0%",
            scrub: 0.6
          }
        });
    });
  }

  // Scrolltrigger Animation : Hero image (صفحة SEO)
  //
  // نمطان معًا: دخولٌ ينحسر فيه التكبير مرّة واحدة عند الوصول، وانزياح
  // خفيف مربوط بالتمرير. الأوّل وحده لا يُحسّ في هيرو ظاهر أصلًا عند
  // التحميل، والثاني وحده يبدأ من منتصف تقدّمه لأن الهيرو أعلى الصفحة.
  //
  // ولا نُعيد استعمال .case-image-photo رغم تطابق الفكرة: صنفه مرتبط
  // بـ.single-image التي تفرض padding-top:125% (نسبة 4:5)، ونسبتنا 4:3.
  if (document.querySelector(".seo-hero-figure img")) {
    var stillHero = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $(".seo-hero-figure img").each(function () {
      var img = this;
      var figure = $(this).closest(".seo-hero-figure");
      if (stillHero) return;

      gsap.fromTo(img, { scale: 1.16 }, {
        scale: 1,
        duration: 1.8,
        ease: "expo.out",
        delay: 0.35
      });

      gsap.to(img, {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: figure,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6
        }
      });
    });
  }

  // Animation : Hero counters (صفحة SEO)
  //
  // نفس تقنية عدّاد .stat-number: نُحرّك كائنًا وسيطًا لا النصّ، فالرقم
  // يبقى مقروءًا لقارئ الشاشة بعد انتهاء الحركة. ومعالجة RTL نفسها —
  // عزل من اليسار إلى اليمين حتى يُقرأ الرقم كما في الإنجليزية.
  //
  // وبلا ScrollTrigger عمدًا، خلافًا لعدّاد .stat-number: هذا في الهيرو
  // فوق الطيّة، ويُبنى المُشغِّل بينما `main .once-in` مزاح 50vh فيسجّل
  // العنصر «قبل نقطة البداية» ولا يُطلق أبدًا. قِسناه: الرقمان تجمّدا
  // عند 1 و0 من الثانية الأولى وبقيا هناك سبع ثوانٍ. والتأخير 1.2s
  // يوافق انحسار ستارة المقدّمة.
  if (document.querySelector(".seo-bento-number")) {
    $(".seo-bento-number").each(function () {
      var el = this;
      var target = parseInt((el.textContent || '').trim(), 10);
      if (!target) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var counter = { val: 0 };
      el.textContent = '0';

      gsap.to(counter, {
        val: target,
        duration: 1.6,
        ease: "power2.out",
        delay: 1.2,
        onUpdate: function () {
          var text = String(Math.round(counter.val));
          el.textContent = document.body.classList.contains('lang-ar')
            ? '\u2066' + text + '\u2069'
            : text;
        }
      });
    });
  }

  if (document.querySelector(".footer-wrap")) {
    // Scrolltrigger Animation : Footer + hamburger
    $(".footer-wrap").each(function (index) {
      let triggerElement = $(this);
      let targetElementHamburger = $(".btn-hamburger .btn-click");

      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: "50% 100%",
          end: "100% 120%",
          scrub: 0
        }
      });
      tl.from(targetElementHamburger, {
        boxShadow: "0px 0px 0px 0px rgb(0, 0, 0)",
        ease: "none"
      });
    });
  }

  // Scrolltrigger Animation : Span Lines Intro Home
  if (document.querySelector(".span-lines.animate")) {
    $(".span-lines.animate").each(function (index) {
      let triggerElement = $(this);
      let targetElement = $(".span-lines.animate .span-line-inner");

      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          toggleActions: 'play none none reset',
          start: "0% 100%",
          end: "100% 0%"
        }
      });
      if (targetElement) {
        tl.from(targetElement, {
          y: "100%",
          stagger: .01,
          ease: "power3.out",
          duration: 1,
          delay: 0
        });
      }
    });
  }

  if (document.querySelector(".fade-in.animate")) {
    // Scrolltrigger Animation : Fade in
    $(".fade-in.animate").each(function (index) {
      let triggerElement = $(this);
      let targetElement = $(this);

      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          toggleActions: 'play none none reset',
          start: "0% 110%",
          end: "100% 0%",
        }
      });
      if (targetElement) {
        tl.from(targetElement, {
          y: "2em",
          opacity: 0,
          ease: "expo.out",
          duration: 1.75,
          delay: 0
        });
      }
    });
  }

  // Scrolltrigger Animation : Stats count-up + reveal
  if (document.querySelector(".stats.animate")) {
    $(".stats.animate").each(function (index) {
      let triggerElement = $(this);
      let statItems = $(this).find(".stat");

      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          toggleActions: 'play none none reset',
          start: "0% 100%",
          end: "100% 0%"
        }
      });

      // reveal each stat with a stagger
      tl.from(statItems, {
        y: "1.5em",
        opacity: 0,
        stagger: .12,
        ease: "power3.out",
        duration: 1
      });

      // count each number up from zero (keeps any + / prefix or suffix)
      $(this).find(".stat-number").each(function () {
        let el = this;
        let match = el.textContent.match(/(\D*)(\d+)(\D*)/);
        if (!match) return;
        let prefix = match[1];
        let target = parseInt(match[2], 10);
        let suffix = match[3];
        let counter = { val: 0 };

        tl.to(counter, {
          val: target,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: function () {
            let text = prefix + Math.round(counter.val) + suffix;
            // keep Western digits; in RTL wrap in a left-to-right isolate so the
            // sign/number reads the same way as in English
            el.textContent = document.body.classList.contains('lang-ar') ? '⁦' + text + '⁩' : text;
          }
        }, 0);
      });
    });
  }

  if (document.querySelector(".awwwards-badge")) {
    // Scrolltrigger Animation : Awwwards
    $(".awwwards-badge").each(function (index) {
      let triggerElement = $(this);
      let targetElement = $(".awwwards-badge svg:nth-child(1)");

      let tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: "0% 100%",
          end: "100% 0%",
          scrub: 0
        }
      });
      tl.to(targetElement, {
        rotate: -90,
        ease: "none"
      });
    });
  }

  // Disable GSAP on Mobile
  // Source: https://greensock.com/forums/topic/26325-disabling-scrolltrigger-on-mobile-with-mediamatch/
  ScrollTrigger.matchMedia({

    // Desktop Only Scrolltrigger 
    "(min-width: 721px)": function () {

      if (document.querySelector(".home-header .arrow")) {
        // Scrolltrigger Animation : Header Arrow
        $(".home-header").each(function (index) {
          let triggerElement = $(this);
          let targetElement = $(".home-header .arrow");

          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "100% 100%",
              end: "100% 0%",
              scrub: 0
            }
          });
          tl.to(targetElement, {
            rotate: 90,
            ease: "none"
          }, 0);
        });
      }

      if (document.querySelector(".footer-footer-wrap")) {
        // Scrolltrigger Animation : Footer General Footer
        $(".footer-footer-wrap").each(function (index) {
          let triggerElement = $(this);
          let targetElementRound = $(".footer-rounded-div .rounded-div-wrap");
          let targetElementArrow = $("footer .arrow");

          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "0% 100%",
              end: "100% 100%",
              scrub: 0
            }
          });
          tl.to(targetElementRound, {
            height: 0,
            ease: "none"
          }, 0)
            .from(targetElementArrow, {
              rotate: 15,
              ease: "none"
            }, 0);
        });
      }

      if (document.querySelector(".footer-case-wrap")) {
        // Scrolltrigger Animation : Footer Case
        $(".footer-case-wrap").each(function (index) {
          let triggerElement = $(this);
          let targetElementRound = $(".footer-rounded-div .rounded-div-wrap");

          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "0% 100%",
              end: "100% 100%",
              scrub: 0
            }
          });
          tl.to(targetElementRound, {
            height: 0,
            ease: "none"
          }, 0);
        });
      }

      if (document.querySelector(".about-image .single-about-image")) {
        // Scrolltrigger Animation : About 
        $(".about-image .single-about-image").each(function (index) {
          let triggerElement = $(this);
          let targetElement = $(".about-image .arrow");

          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "15% 100%",
              end: "100% 0%",
              scrub: 0,
            }
          });
          tl.to(targetElement, {
            rotate: 60,
            ease: "none"
          }, 0);
        });
      }



      if (document.querySelector(".digital-ball .globe")) {
        // Scrolltrigger Animation : Globe
        $("main").each(function (index) {
          let triggerElement = $(this);
          let targetElement = $(".digital-ball .globe");

          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "100% 100%",
              end: "100% 0%",
              scrub: 0,
            }
          });

          tl.to(targetElement, {
            ease: "none",
            rotate: 90
          });
        });
      }

    }, // End Desktop Only Scrolltrigger

    // Mobile Only Scrolltrigger
    "(max-width: 720px)": function () {

      if (document.querySelector(".footer-wrap")) {
        // Scrolltrigger Animation : Footer
        $(".footer-wrap").each(function (index) {
          let triggerElement = $(this);
          let targetElementRound = $(".footer-rounded-div .rounded-div-wrap");

          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "0% 100%",
              end: "100% 100%",
              scrub: 0
            }
          });
          tl.to(targetElementRound, {
            height: 0,
            ease: "none"
          }, 0);
        });
      }

    } // End Mobile Only Scrolltrigger

  }); // End GSAP Matchmedia

}
