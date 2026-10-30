/* MFM Edinburgh — site behaviour
   1. Mobile menu   2. Click-to-load videos   3. Form validation & sending   4. Footer year
   No dependencies. Everything works without JS except the menu toggle and inline form messages. */
(function () {
  "use strict";

  /* ---------- 1. Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("mobile-menu");

  if (toggle && menu) {
    var closeBtn = menu.querySelector(".mobile-menu__close");
    var focusables = function () {
      return Array.prototype.slice.call(
        menu.querySelectorAll('a[href], button:not([disabled])')
      );
    };

    var openMenu = function () {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
      var first = menu.querySelector("nav a");
      if (first) first.focus();
    };

    var closeMenu = function (returnFocus) {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
      if (returnFocus !== false) toggle.focus();
    };

    toggle.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", function () { closeMenu(); });

    // Close when a link is chosen (same-page anchors included)
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu(false);
    });

    // Escape closes; Tab stays inside the open menu
    document.addEventListener("keydown", function (e) {
      if (menu.hidden) return;
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key !== "Tab") return;
      var items = focusables();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // If the window grows past the mobile breakpoint, tidy up
    var mq = window.matchMedia("(min-width: 961px)");
    var onChange = function () { if (mq.matches && !menu.hidden) closeMenu(false); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---------- 2. Click-to-load YouTube (no tracking until the visitor presses play) ----------
     Uses event delegation so it also works for videos added later from /content. */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".video-play[data-youtube]") : null;
    if (!btn) return;
    var id = btn.getAttribute("data-youtube");
    var frame = document.createElement("iframe");
    frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
    frame.title = btn.getAttribute("data-title") || "Video";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    frame.allowFullscreen = true;
    // Swap the button for a plain card so the iframe is not nested inside a button
    var card = document.createElement("div");
    card.className = "video-card";
    while (btn.firstChild) card.appendChild(btn.firstChild);
    var hidden = card.querySelector(".visually-hidden");
    if (hidden) hidden.remove();
    var holder = card.querySelector(".video-frame");
    holder.innerHTML = "";
    holder.appendChild(frame);
    btn.replaceWith(card);
    frame.focus();
  });

  /* ---------- 3. Forms ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var messages = {
    required: function (label) { return "Enter your " + label.toLowerCase(); },
    email: "Enter a full email address, like name@example.com"
  };

  function setError(input, text) {
    var err = document.getElementById(input.id + "-error");
    input.setAttribute("aria-invalid", text ? "true" : "false");
    if (!err) return;
    err.querySelector("span").textContent = text || "";
    err.classList.toggle("is-visible", Boolean(text));
  }

  function check(input) {
    var value = input.value.trim();
    var label = input.getAttribute("data-label") || "details";
    if (input.required && !value) return messages.required(label);
    if (input.type === "email" && value && !EMAIL.test(value)) return messages.email;
    return "";
  }

  document.querySelectorAll("form[data-validate]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var fields = Array.prototype.slice.call(form.querySelectorAll("input, textarea, select"))
      .filter(function (el) { return el.required || el.type === "email"; });

    // Re-check a field once the visitor leaves it, and clear errors as they fix it
    fields.forEach(function (input) {
      input.addEventListener("blur", function () { if (input.value) setError(input, check(input)); });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") setError(input, check(input));
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (input) {
        var msg = check(input);
        setError(input, msg);
        if (msg && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      var action = form.getAttribute("action") || "";
      var button = form.querySelector('[type="submit"]');
      var showStatus = function (ok, text) {
        if (!status) return;
        status.hidden = false;
        status.className = "form-status " + (ok ? "form-status--ok" : "form-status--err");
        status.textContent = text;
      };

      var original = button ? button.textContent : "";
      if (button) { button.disabled = true; button.textContent = "Sending…"; }

      // Netlify Forms: post URL-encoded to the site root. Other services: post FormData to the action.
      var isNetlify = form.hasAttribute("data-netlify");
      var data = new FormData(form);
      var request = isNetlify
        ? fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(data).toString()
          })
        : fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } });

      request.then(function (res) {
        if (!res.ok) throw new Error("Bad response");
        form.reset();
        showStatus(true, form.getAttribute("data-success") || "Thank you — we've received your message.");
      }).catch(function () {
        showStatus(false, "Your message didn't send. Check your connection and try again, or email info@mfmedinburgh.org.");
      }).then(function () {
        if (button) { button.disabled = false; button.textContent = original; }
      });
    });
  });

  /* ---------- 4. Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
