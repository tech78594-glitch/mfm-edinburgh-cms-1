/* MFM Edinburgh — home page hero slideshow
   Accessible carousel (WAI-ARIA APG pattern):
   - Autoplays, with a visible Pause/Play button (WCAG 2.2.2)
   - Pauses while the pointer is over it or keyboard focus is inside it, and when the tab is hidden
   - No autoplay for visitors who ask for reduced motion
   - Previous / Next buttons, one dot per slide, ← → keys, swipe on touch screens
   Slides come from content/hero.json (Admin › Home page slideshow). js/content.js
   re-renders them and calls MFMHero.init() again; init() is safe to call repeatedly. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ICONS = {
    prev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
  };

  function init(root) {
    if (!root) return;
    if (root._hero) root._hero.destroy();

    var track = root.querySelector(".hero-slider__track");
    var slides = Array.prototype.slice.call(track.querySelectorAll(".hero-slide"));
    var controls = root.querySelector(".hero-slider__controls");
    if (!slides.length || !controls) return;

    var seconds = Math.max(3, parseFloat(root.getAttribute("data-interval")) || 7);
    root.style.setProperty("--slide-ms", seconds * 1000 + "ms");

    var index = Math.max(0, slides.findIndex(function (s) { return s.classList.contains("is-active"); }));
    var timer = null;
    // The Pause button (or reduced motion) wins over everything, and survives a re-render
    var userPaused = root._heroUserPaused != null ? root._heroUserPaused : reduceMotion;
    var hoverPaused = root.matches(":hover");
    var focusPaused = root.contains(document.activeElement) && document.activeElement !== document.body;
    var listeners = [];

    function on(el, type, fn, opts) { el.addEventListener(type, fn, opts); listeners.push([el, type, fn, opts]); }

    // ---- build controls ----
    if (slides.length < 2) { controls.innerHTML = ""; slides[0].classList.add("is-active"); return; }

    var titleOf = function (s) { var h = s.querySelector(".hero-slide__title"); return h ? h.textContent.trim() : ""; };
    controls.innerHTML =
      '<button class="hero-ctrl hero-ctrl--prev" type="button" aria-label="Previous slide">' + ICONS.prev + "</button>" +
      '<div class="hero-dots">' + slides.map(function (s, i) {
        return '<button class="hero-dot" type="button" aria-label="Slide ' + (i + 1) + " of " + slides.length + ": " +
          titleOf(s).replace(/"/g, "&quot;") + '"><span class="hero-dot__fill"></span></button>';
      }).join("") + "</div>" +
      '<button class="hero-ctrl hero-ctrl--next" type="button" aria-label="Next slide">' + ICONS.next + "</button>" +
      '<button class="hero-ctrl hero-ctrl--pause" type="button"></button>';

    var dots = Array.prototype.slice.call(controls.querySelectorAll(".hero-dot"));
    var pauseBtn = controls.querySelector(".hero-ctrl--pause");

    slides.forEach(function (s, i) {
      s.setAttribute("role", "group");
      s.setAttribute("aria-roledescription", "slide");
      s.setAttribute("aria-label", (i + 1) + " of " + slides.length);
    });

    // ---- state ----
    function paused() { return userPaused || hoverPaused || focusPaused || document.hidden; }

    function render() {
      slides.forEach(function (s, i) {
        var active = i === index;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-hidden", active ? "false" : "true");
        // keep links in hidden slides out of the tab order
        s.querySelectorAll("a, button").forEach(function (el) { el.tabIndex = active ? 0 : -1; });
      });
      dots.forEach(function (d, i) {
        if (i === index) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
    }

    function renderPauseState() {
      // Only touch the icon when it actually changes: replacing it mid-click swallows the click
      var want = userPaused ? "play" : "pause";
      if (pauseBtn.getAttribute("data-icon") !== want) {
        pauseBtn.innerHTML = ICONS[want];
        pauseBtn.setAttribute("data-icon", want);
        pauseBtn.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
      }
      root.classList.toggle("is-paused", paused());
      // Announce slide changes only when the visitor is driving
      track.setAttribute("aria-live", userPaused || focusPaused ? "polite" : "off");
    }

    function schedule() {
      clearTimeout(timer);
      renderPauseState();
      dots.forEach(function (d) { d.classList.remove("is-running"); });
      if (paused()) return;
      void dots[index].offsetWidth;
      dots[index].classList.add("is-running");
      timer = setTimeout(function () { go(index + 1); }, seconds * 1000);
    }

    function go(i) {
      index = (i + slides.length) % slides.length;
      render();
      schedule();
    }

    // ---- events ----
    on(controls.querySelector(".hero-ctrl--prev"), "click", function () { go(index - 1); });
    on(controls.querySelector(".hero-ctrl--next"), "click", function () { go(index + 1); });
    dots.forEach(function (d, i) { on(d, "click", function () { go(i); }); });
    on(pauseBtn, "click", function () { userPaused = !userPaused; root._heroUserPaused = userPaused; schedule(); });

    on(root, "mouseenter", function () { hoverPaused = true; schedule(); });
    on(root, "mouseleave", function () { hoverPaused = false; schedule(); });
    on(root, "focusin", function () { focusPaused = true; schedule(); });
    on(root, "focusout", function (e) { if (!root.contains(e.relatedTarget)) { focusPaused = false; schedule(); } });
    on(document, "visibilitychange", schedule);

    on(root, "keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    });

    // Swipe (touch and pen only, so mouse users can still select text)
    var startX = null, startY = null;
    on(track, "pointerdown", function (e) { if (e.pointerType !== "mouse") { startX = e.clientX; startY = e.clientY; } });
    on(track, "pointerup", function (e) {
      if (startX == null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
    });
    on(track, "pointercancel", function () { startX = null; });

    root.classList.add("is-ready");
    render();
    schedule();

    root._hero = {
      destroy: function () {
        clearTimeout(timer);
        listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
        listeners = [];
      },
      go: go
    };
  }

  window.MFMHero = { init: init };

  var start = function () { document.querySelectorAll("[data-hero-slider]").forEach(init); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
