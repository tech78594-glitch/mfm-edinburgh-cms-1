/* MFM Edinburgh — dynamic content
   Reads the JSON files in /content (edited by staff at /admin) and fills any element
   marked data-render="…". Static HTML inside those elements is the fallback that shows
   if the content can't load or JavaScript is off.

   All text from content files is escaped. News articles (markdown) are converted with
   `marked` and cleaned with DOMPurify before display. */
(function () {
  "use strict";

  var TZ = "Europe/London";
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var cache = {};

  /* ---------- helpers ---------- */
  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch("content/" + name + ".json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(name + ": " + r.status);
        return r.json();
      });
    }
    return cache[name];
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Links from content: allow http(s), mailto, tel and any relative link (page.html#section,
  // /path, ?query, #anchor). Anything with another scheme (javascript:, data:, …) is dropped.
  function safeUrl(u) {
    u = String(u || "").replace(/[\u0000-\u001F\u007F\s]+/g, "");
    if (!u) return "";
    var scheme = u.match(/^([a-z][a-z0-9+.\-]*):/i);
    if (!scheme) return u.indexOf("//") === 0 ? "" : u;   // relative; refuse protocol-relative //host
    return /^(https?|mailto|tel)$/i.test(scheme[1]) ? u : "";
  }

  function tel(n) {
    var digits = String(n).replace(/[^\d+]/g, "");
    if (digits.charAt(0) === "0") digits = "+44" + digits.slice(1);
    return "tel:" + digits;
  }

  var ICON = {
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    play: '<span class="play-badge"><svg width="26" height="26" viewBox="0 0 24 24" fill="#212121" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>',
    pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  };

  /* Dates in content are London wall-clock strings: "2026-11-07T09:00" or "2026-11-01".
     They are formatted from their parts, so they show the same wherever the visitor is. */
  function parts(s) {
    var m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : null, key: m[0].replace(" ", "T") };
  }
  function asUTC(p) { return new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h || 0, p.mi || 0)); }
  function fmt(p, opts) { return new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: "UTC" }, opts)).format(asUTC(p)); }
  function longDate(p) { return fmt(p, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function hm(p) { return p && p.h != null ? String(p.h).padStart(2, "0") + ":" + String(p.mi).padStart(2, "0") : ""; }

  function londonNow() {
    var f = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "long", hourCycle: "h23"
    }).formatToParts(new Date());
    var o = {};
    f.forEach(function (x) { o[x.type] = x.value; });
    return {
      key: o.year + "-" + o.month + "-" + o.day + "T" + o.hour + ":" + o.minute,
      day: DAYS.indexOf(o.weekday),
      mins: (+o.hour) * 60 + (+o.minute)
    };
  }
  function toMins(t) { var m = String(t || "").match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; }

  function youtubeId(v) {
    v = String(v || "").trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    var m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : "";
  }

  function slugify(s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function fail(el, msg) {
    // Keep fallback HTML if there is any; otherwise say what to do instead
    if (el.getAttribute("data-fallback-kept") === "true") return;
    el.innerHTML = '<p class="empty-state">' + esc(msg || "This section couldn't load. Please refresh the page, or call 07557 644650.") + "</p>";
  }

  /* ---------- renderers ---------- */
  var R = {};

  // Announcement bar (settings.announcement)
  R.announcement = function (el) {
    return load("settings").then(function (s) {
      var a = s.announcement || {};
      if (!a.show || !a.text) { el.hidden = true; return; }
      var link = safeUrl(a.link_url);
      el.innerHTML = '<div class="container"><p>' + esc(a.text) +
        (link && a.link_text ? ' <a href="' + esc(link) + '">' + esc(a.link_text) + "</a>" : "") + "</p></div>";
      el.hidden = false;
    });
  };

  // Home page hero slideshow (content/hero.json). The static slides in index.html are the fallback.
  R["hero-slides"] = function (el) {
    return load("hero").then(function (d) {
      var slides = (d.slides || []).filter(function (s) { return s.title && safeUrl(s.image); });
      if (!slides.length) return;
      var root = el.closest("[data-hero-slider]");
      var interval = String(d.seconds_per_slide || "");
      var sig = function (list) { return list.map(function (s) { return [s.title, s.image, s.eyebrow, s.text, s.alt, s.button_text, s.button_link, s.button2_text, s.button2_link].join("|"); }).join("\n"); };
      // What is on the page now (the built-in slides, or an earlier render)
      var current = Array.prototype.slice.call(el.querySelectorAll(".hero-slide")).map(function (n) {
        var q = function (sel) { var x = n.querySelector(sel); return x ? x.textContent.trim() : ""; };
        var a = n.querySelectorAll(".btn"), media = n.querySelector(".hero-slide__media img");
        return {
          title: q(".hero-slide__title"), image: media ? media.getAttribute("src") : "", eyebrow: q(".eyebrow"), text: q(".lead"),
          alt: media ? media.getAttribute("alt") : "",
          button_text: a[0] ? a[0].textContent.trim() : "", button_link: a[0] ? a[0].getAttribute("href") : "",
          button2_text: a[1] ? a[1].textContent.trim() : "", button2_link: a[1] ? a[1].getAttribute("href") : ""
        };
      });
      var clean = slides.map(function (s) {
        var out = {};
        ["title", "eyebrow", "text", "alt", "button_text", "button2_text"].forEach(function (k) { out[k] = String(s[k] || "").trim(); });
        out.image = safeUrl(s.image);
        out.button_link = out.button_text ? safeUrl(s.button_link) : "";
        out.button2_link = out.button2_text ? safeUrl(s.button2_link) : "";
        if (!out.button_link) out.button_text = "";
        if (!out.button2_link) out.button2_text = "";
        if (!out.alt) out.alt = out.title;
        return out;
      });
      var sameInterval = !interval || (root && root.getAttribute("data-interval") === interval);
      // Nothing changed: leave the running slideshow alone
      if (sig(current) === sig(clean) && sameInterval) return;

      var keep = Math.max(0, Array.prototype.slice.call(el.querySelectorAll(".hero-slide")).findIndex(function (n) { return n.classList.contains("is-active"); }));
      if (keep >= slides.length) keep = 0;
      if (root && interval) root.setAttribute("data-interval", interval);
      el.innerHTML = slides.map(function (s, i) {
        var img = esc(safeUrl(s.image));
        var btn = function (text, link, cls) {
          var u = safeUrl(link);
          return text && u ? '<a class="btn ' + cls + ' btn--lg" href="' + esc(u) + '">' + esc(text) + "</a>" : "";
        };
        return '<div class="hero-slide' + (i === keep ? " is-active" : "") + '">' +
          '<img class="hero-slide__bg" src="' + img + '" alt="" aria-hidden="true"' + (i ? ' loading="lazy"' : "") + ">" +
          '<div class="container hero-slide__inner">' +
            '<div class="hero-slide__copy">' +
              (s.eyebrow ? '<span class="eyebrow">' + esc(s.eyebrow) + "</span>" : "") +
              '<h2 class="h1 hero-slide__title">' + esc(s.title) + "</h2>" +
              (s.text ? '<p class="lead">' + esc(s.text) + "</p>" : "") +
              '<div class="btn-row">' + btn(s.button_text, s.button_link, "btn--accent") + btn(s.button2_text, s.button2_link, "btn--ghost") + "</div>" +
            "</div>" +
            '<figure class="hero-slide__media"><img src="' + img + '" alt="' + esc(s.alt || s.title) + '"' + (i ? ' loading="lazy"' : "") + "></figure>" +
          "</div></div>";
      }).join("");
      if (window.MFMHero && root) window.MFMHero.init(root);
    });
  };

  // Top bar contact
  R["topbar-contact"] = function (el) {
    return load("settings").then(function (s) {
      var p = (s.phones || [])[0], e = (s.emails || [])[0];
      el.innerHTML = (p ? '<a href="' + tel(p.number) + '">' + esc(p.number) + "</a>" : "") +
        (e ? '<a href="mailto:' + esc(e.address) + '">' + esc(e.address) + "</a>" : "");
    });
  };

  R.address = function (el) {
    return load("settings").then(function (s) {
      var a = s.address || {};
      var sep = el.getAttribute("data-sep") === "comma" ? ", " : "<br>";
      el.innerHTML = (el.hasAttribute("data-venue") ? "<strong>" + esc(a.venue) + "</strong><br>" : "") +
        [a.line1, a.line2 + " " + (a.postcode || "")].map(esc).join(sep);
    });
  };

  R["footer-contact"] = function (el) {
    return load("settings").then(function (s) {
      var h = "<h2>Contact</h2>";
      (s.phones || []).forEach(function (p) { h += '<a href="' + tel(p.number) + '">' + esc(p.number) + "</a>"; });
      (s.emails || []).slice(0, 1).forEach(function (e) { h += '<a href="mailto:' + esc(e.address) + '">' + esc(e.address) + "</a>"; });
      var soc = s.social || {};
      [["facebook", "Facebook"], ["youtube", "YouTube"], ["instagram", "Instagram"]].forEach(function (x) {
        var u = safeUrl(soc[x[0]]);
        if (u) h += '<a href="' + esc(u) + '" rel="noopener">' + x[1] + "</a>";
      });
      el.innerHTML = h;
    });
  };

  R["contact-details"] = function (el) {
    return load("settings").then(function (s) {
      var phones = (s.phones || []).map(function (p) { return '<a href="' + tel(p.number) + '">' + esc(p.number) + "</a>"; }).join("<br>");
      var emails = (s.emails || []).map(function (e) { return '<a href="mailto:' + esc(e.address) + '">' + esc(e.address) + "</a>"; }).join("<br>");
      el.querySelector("[data-slot=phones]").innerHTML = phones;
      el.querySelector("[data-slot=emails]").innerHTML = emails;
      var mins = el.querySelector("[data-slot=ministers]");
      if (mins) mins.innerHTML = (s.minister_phones || []).map(function (p) {
        return '<li><a href="' + tel(p.number) + '">' + esc(p.number) + "</a></li>";
      }).join("");
    });
  };

  // Hero card: services marked "show on home", grouped as a times list
  R["hero-times"] = function (el) {
    return load("services").then(function (d) {
      var rows = (d.weekly || []).filter(function (x) { return x.show_on_home; }).slice(0, 3);
      if (!rows.length) return;
      el.innerHTML = rows.map(function (x) {
        var label = x.day === "Sunday" ? x.name.replace(/ Service$/, "") : x.day + " " + x.name.replace(/^Spiritual Clinic, /, "");
        return '<div class="times__row"><dt>' + esc(label) + "</dt><dd>" + esc(x.start) + " – " + esc(x.end) + "</dd></div>";
      }).join("");
    });
  };

  // Live "next service" line, recalculated every minute
  R["next-service"] = function (el) {
    return load("services").then(function (d) {
      var list = (d.weekly || []).filter(function (x) { return DAYS.indexOf(x.day) > -1 && toMins(x.start) != null; });
      if (!list.length) { el.hidden = true; return; }
      var paint = function () {
        var now = londonNow(), best = null;
        list.forEach(function (x) {
          var day = DAYS.indexOf(x.day), start = toMins(x.start), end = toMins(x.end);
          if (end == null || end <= start) end = start + 60;
          var live = day === now.day && now.mins >= start && now.mins < end;
          var diff = ((day - now.day + 7) % 7) * 1440 + start - now.mins;
          if (diff < 0) diff += 7 * 1440;
          var score = live ? -1 : diff;
          if (!best || score < best.score) best = { x: x, score: score, live: live, days: (day - now.day + 7) % 7 };
        });
        var b = best, when;
        if (b.live) when = "Happening now";
        else if (b.days === 0 && b.score < 1440) when = b.score <= 60 ? "Starts in " + b.score + " min" : "Today at " + b.x.start;
        else if (b.days === 1 || (b.days === 0 && b.score >= 1440)) when = (b.days === 1 ? "Tomorrow at " : "Next " + b.x.day + " at ") + b.x.start;
        else when = b.x.day + " at " + b.x.start;
        el.innerHTML = '<span class="next-service__dot' + (b.live ? " is-live" : "") + '" aria-hidden="true"></span>' +
          '<span><span class="next-service__label">' + (b.live ? "" : "Next: ") + "</span><strong>" + esc(b.x.name) + "</strong> · " + esc(when) + "</span>";
        el.hidden = false;
      };
      paint();
      setInterval(paint, 60000);
    });
  };

  // Week cards on the home page
  R["week-cards"] = function (el) {
    return load("services").then(function (d) {
      var rows = (d.weekly || []).filter(function (x) { return x.show_on_home; });
      if (!rows.length) return;
      var tone = { Tuesday: " week-card--orange", Wednesday: " week-card--orange", Friday: " week-card--slate", Saturday: " week-card--slate" };
      el.innerHTML = rows.map(function (x) {
        return '<li class="week-card' + (tone[x.day] || "") + '"><span class="day">' + esc(x.day) + '</span><h3 class="h3">' +
          esc(x.name.replace(/ Session$| Service$/, "")) + '</h3><span class="muted">' + esc(x.start) + " – " + esc(x.end) + "</span></li>";
      }).join("");
    });
  };

  R["monthly-band"] = function (el) {
    return load("services").then(function (d) {
      var rows = (d.monthly || []).filter(function (x) { return x.show_on_home; });
      if (!rows.length) { el.hidden = true; return; }
      el.innerHTML = "<strong>Every month</strong>" + rows.map(function (x) {
        return "<span>" + esc(x.when.replace(/, monthly$/, "")) + " · " + esc(x.name) + ", " + esc(x.time) + "</span>";
      }).join("") + '<a href="services.html#monthly">All monthly programmes</a>';
    });
  };

  R["weekly-table"] = function (el) {
    return load("services").then(function (d) {
      var rows = d.weekly || [];
      if (!rows.length) return;
      el.innerHTML = rows.map(function (x) {
        return '<tr><th scope="row">' + esc(x.day) + "</th><td>" + esc(x.name) + '</td><td class="time">' + esc(x.start) + " – " + esc(x.end) + "</td></tr>";
      }).join("");
    });
  };

  R["monthly-cards"] = function (el) {
    return load("services").then(function (d) {
      var rows = d.monthly || [];
      if (!rows.length) return;
      el.innerHTML = rows.map(function (x) {
        var dark = /vigil/i.test(x.name) ? " prog-card--slate" : "";
        return '<li class="prog-card' + dark + '"><span class="day">' + esc(x.when) + '</span><h3 class="h3">' + esc(x.name) +
          '</h3><span class="muted">' + esc(x.time) + "</span></li>";
      }).join("");
    });
  };

  // Events: data-scope="upcoming" | "past", data-limit="3", data-style="compact"
  function eventCard(e, compact) {
    var s = parts(e.start), en = parts(e.end);
    if (!s) return "";
    var time = hm(s) ? hm(s) + (en && hm(en) ? " – " + hm(en) : "") : "";
    var multi = en && en.key.slice(0, 10) !== s.key.slice(0, 10);
    var img = safeUrl(e.image);
    var link = safeUrl(e.link);
    return '<li class="event-card' + (compact ? " event-card--compact" : "") + '">' +
      '<div class="event-card__date" aria-hidden="true"><span>' + fmt(s, { month: "short" }) + "</span><strong>" + s.d + "</strong><span>" + fmt(s, { weekday: "short" }) + "</span></div>" +
      '<div class="event-card__body">' +
        (img && !compact ? '<img class="event-card__img" src="' + esc(img) + '" alt="" loading="lazy">' : "") +
        '<h3 class="h3">' + esc(e.title) + "</h3>" +
        '<p class="event-card__meta"><span class="visually-hidden">' + esc(longDate(s)) + ". </span>" + ICON.clock + "<span>" +
          esc(fmt(s, { weekday: "long", day: "numeric", month: "long" })) + (time ? ", " + esc(time) : "") +
          (multi && en ? " (ends " + esc(fmt(en, { weekday: "long" })) + ")" : "") + "</span></p>" +
        (e.location ? '<p class="event-card__meta">' + ICON.pin + "<span>" + esc(e.location) + "</span></p>" : "") +
        (e.summary && !compact ? "<p>" + esc(e.summary) + "</p>" : "") +
        (link ? '<a class="link-arrow" href="' + esc(link) + '">Find out more' + ICON.arrow + "</a>" : "") +
      "</div></li>";
  }

  R.events = function (el) {
    return load("events").then(function (d) {
      var now = londonNow().key;
      var scope = el.getAttribute("data-scope") || "upcoming";
      var limit = +el.getAttribute("data-limit") || 0;
      var compact = el.getAttribute("data-style") === "compact";
      var items = (d.items || []).filter(function (e) { return parts(e.start); });
      items = items.filter(function (e) {
        var endKey = (parts(e.end) || parts(e.start)).key;
        if (endKey.length === 10) endKey += "T23:59";
        return scope === "past" ? endKey < now : endKey >= now;
      }).sort(function (a, b) {
        return scope === "past" ? (a.start < b.start ? 1 : -1) : (a.start > b.start ? 1 : -1);
      });
      if (limit) items = items.slice(0, limit);
      if (!items.length) {
        el.innerHTML = '<li class="empty-state">' + esc(el.getAttribute("data-empty") ||
          "No events are listed right now. Check back soon, or join our newsletter to hear first.") + "</li>";
        return;
      }
      el.innerHTML = items.map(function (e) { return eventCard(e, compact); }).join("");
    });
  };

  // Videos: data-limit
  R.videos = function (el) {
    return load("videos").then(function (d) {
      var limit = +el.getAttribute("data-limit") || 0;
      var items = (d.items || []).filter(function (v) { return v.title && (youtubeId(v.youtube) || safeUrl(v.link)); });
      if (limit) items = items.slice(0, limit);
      if (!items.length) { el.innerHTML = '<li class="empty-state">New videos are on their way. Check back soon.</li>'; return; }
      el.innerHTML = items.map(function (v) {
        var id = youtubeId(v.youtube);
        var thumb = safeUrl(v.thumbnail) || (id ? "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" : "");
        var frame = '<span class="video-frame">' + (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy">' : "") + ICON.play + "</span>";
        var text = "<strong>" + esc(v.title) + "</strong>" + (v.subtitle ? '<span class="meta">' + esc(v.subtitle) + "</span>" : "");
        if (id) {
          return '<li><button class="video-card video-play" type="button" data-youtube="' + esc(id) + '" data-title="' + esc(v.title) + '">' +
            frame + text + '<span class="visually-hidden">Play video</span></button></li>';
        }
        return '<li><a class="video-card" href="' + esc(safeUrl(v.link)) + '">' + frame + text + "</a></li>";
      }).join("");
    });
  };

  // Testimonies: shows those marked "show"
  R.testimonies = function (el) {
    return load("testimonies").then(function (d) {
      var limit = +el.getAttribute("data-limit") || 0;
      var items = (d.items || []).filter(function (t) { return t.show !== false && t.text; });
      if (limit) items = items.slice(0, limit);
      if (!items.length) { el.hidden = true; return; }
      el.innerHTML = items.map(function (t) {
        return '<li class="testimony"><blockquote><p>' + esc(t.text) + "</p></blockquote>" +
          (t.name ? '<p class="testimony__name">— ' + esc(t.name) + "</p>" : "") + "</li>";
      }).join("");
      el.hidden = false;
    });
  };

  // News list: data-limit
  function newsSlug(n) { return n.slug ? slugify(n.slug) : slugify(n.title); }

  R["news-list"] = function (el) {
    return load("news").then(function (d) {
      var limit = +el.getAttribute("data-limit") || 0;
      var items = (d.items || []).filter(function (n) { return n.title; });
      if (limit) items = items.slice(0, limit);
      if (!items.length) { el.innerHTML = '<li class="empty-state">No news yet. Check back soon.</li>'; return; }
      el.innerHTML = items.map(function (n) {
        var p = parts(n.date), img = safeUrl(n.image);
        return '<li class="news-card">' +
          (img ? '<img class="news-card__img" src="' + esc(img) + '" alt="" loading="lazy">' : "") +
          '<div class="news-card__body">' +
          (p ? '<time class="news-card__date" datetime="' + esc(p.key) + '">' + esc(fmt(p, { day: "numeric", month: "long", year: "numeric" })) + "</time>" : "") +
          '<h3 class="h3"><a href="news.html?post=' + encodeURIComponent(newsSlug(n)) + '">' + esc(n.title) + "</a></h3>" +
          (n.summary ? "<p>" + esc(n.summary) + "</p>" : "") + "</div></li>";
      }).join("");
    });
  };

  // Single article, chosen by ?post=slug. Hides the list view when shown.
  R["news-article"] = function (el) {
    var slug = new URLSearchParams(location.search).get("post");
    if (!slug) { el.hidden = true; return Promise.resolve(); }
    var listView = document.querySelector("[data-news-index]");
    return load("news").then(function (d) {
      var n = (d.items || []).filter(function (x) { return newsSlug(x) === slugify(slug); })[0];
      if (listView) listView.hidden = true;
      el.hidden = false;
      if (!n) {
        el.innerHTML = '<div class="container article"><h1 class="h2">We couldn’t find that article</h1><p>It may have been moved or removed.</p><p><a class="btn btn--primary" href="news.html">See all news</a></p></div>';
        document.title = "Article not found | MFM Edinburgh";
        return;
      }
      var p = parts(n.date), img = safeUrl(n.image);
      var body = window.marked && window.DOMPurify
        ? window.DOMPurify.sanitize(window.marked.parse(String(n.body || "")))
        : "<p>" + esc(n.body || "").replace(/\n\n+/g, "</p><p>") + "</p>";
      el.innerHTML = '<div class="container article">' +
        '<nav class="breadcrumb breadcrumb--light" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><a href="news.html">News</a></li><li aria-current="page">' + esc(n.title) + "</li></ol></nav>" +
        '<h1 class="h2">' + esc(n.title) + "</h1>" +
        (p ? '<time class="news-card__date" datetime="' + esc(p.key) + '">' + esc(longDate(p)) + "</time>" : "") +
        (img ? '<img class="article__img" src="' + esc(img) + '" alt="">' : "") +
        '<div class="article__body">' + body + "</div>" +
        '<p><a class="link-arrow" href="news.html">All news' + ICON.arrow + "</a></p></div>";
      document.title = n.title + " | MFM Edinburgh";
      var h = el.querySelector("h1");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    });
  };

  /* ---------- run ---------- */
  function run() {
    document.querySelectorAll("[data-render]").forEach(function (el) {
      var fn = R[el.getAttribute("data-render")];
      if (!fn) return;
      if (el.children.length && !el.querySelector(".skeleton")) el.setAttribute("data-fallback-kept", "true");
      el.setAttribute("aria-busy", "true");
      Promise.resolve().then(function () { return fn(el); })
        .catch(function (err) {
          if (window.console) console.warn("[content]", err);
          fail(el);
        })
        .then(function () { el.removeAttribute("aria-busy"); el.querySelectorAll(".skeleton").forEach(function (s) { s.remove(); }); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
