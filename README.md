# MFM Edinburgh website (editable version)

A fast, mobile-friendly church website that staff can update themselves at
**`/admin`**. They log in, edit service times, events, news, videos, testimonies or the
announcement bar, then press **Publish**. The site updates within about a minute.

No coding is needed to update it, and nothing runs on a server to pay for or maintain:
- **Netlify** (free plan) hosts the site and handles the forms and staff logins.
- **GitHub** (free) stores the site files and keeps a history of every change.
- **Decap CMS** (free, open source) is the editing screen at `/admin`.

---

## What's dynamic

| On the website | Comes from | Staff edit it in |
|---|---|---|
| **Home page slideshow** (pictures, headings, buttons, speed) | `content/hero.json` | Home page slideshow |
| Announcement bar on every page | `content/settings.json` | Church info › Contact details & announcement |
| Phone numbers, emails, address, social links | `content/settings.json` | Church info › Contact details & announcement |
| Weekly timetable, home cards, **live “Next service” line** | `content/services.json` | Church info › Service times |
| Monthly programmes | `content/services.json` | Church info › Service times |
| Upcoming and past events (move to “Past” automatically) | `content/events.json` | Events, news & videos › Events |
| News list and articles | `content/news.json` | Events, news & videos › News |
| Videos (YouTube plays on the page) | `content/videos.json` | Events, news & videos › Videos |
| Testimonies on the home page | `content/testimonies.json` | Events, news & videos › Testimonies |

The home page opens with a **moving slideshow**. Slides cross-fade every few seconds, and each
poster sits on a softly drifting, blurred copy of itself. Posters are always shown whole, so
the wording on them is never cut off. Visitors can use the arrows, dots and Pause button, or
swipe on a phone or tablet. It pauses while someone hovers over it or uses the keyboard in
it, and it doesn't move at all for visitors who have turned off animations on their device.

The “Next service” line works out the next service in UK time. It says “Happening now”
during a service and “Starts in 30 min” just before one, and updates every minute.

Each page also contains a built-in copy of its main content. If a content file can't load
(or JavaScript is off), visitors still see service times and contact details.

### Forms (Netlify Forms, no extra service)
- **Contact form** (Services page)
- **Testimony form** (home page), with a “You can share this on the website” tick box
- **Newsletter sign-up** (home page)

Submissions appear in Netlify under **Forms**, and Netlify can email each one to the
church office. The free plan includes 100 submissions a month.

---

## One-time setup (about 30 minutes)

You need a GitHub account and a Netlify account, both free. The church should own these:
create them with a church email address, not a personal one.

1. **Put the site on GitHub.** Create a new private repository (e.g. `mfm-edinburgh-website`)
   and upload everything in this folder, including the hidden `.gitignore`. In GitHub's
   web page, use **Add file › Upload files**.
2. **Connect Netlify.** In Netlify choose **Add new site › Import an existing project ›
   GitHub**, then pick the repository. Leave the build command empty and the publish
   directory as `.`, then click **Deploy**.
3. **Turn on staff logins.** In the Netlify site, go to **Project configuration › Identity ›
   Enable Identity**. Then:
   - Under **Registration**, choose **Invite only**. This stops strangers from signing up.
   - Under **Services › Git Gateway**, click **Enable Git Gateway**.
4. **Invite staff.** Go to **Identity › Invite users**, enter each editor's email, and send.
   They click the link in the email, choose a password, and land in the admin.
5. **Turn on form emails.** Go to **Forms › Form notifications › Add notification › Email**,
   add the church office address, and repeat for each form (`contact`, `testimony`,
   `newsletter`).
6. **Point the domain.** Go to **Domain management › Add a domain** and enter
   `mfmedinburgh.org`, then follow Netlify's DNS instructions at your domain registrar.
   HTTPS is set up automatically.

> **About Git Gateway.** It is the piece that saves staff edits to GitHub. Netlify still
> supports it and it works today, but it is frozen (no new features). If it is ever
> switched off, change the `backend:` section of `admin/config.yml` to use
> **DecapBridge** (a free login service built for Decap) or the GitHub backend. With the
> GitHub backend, each editor needs a GitHub account. The website itself doesn't change.

---

## Guide for church staff

1. Go to **mfmedinburgh.org/admin** and log in with your email and password.
2. Choose what to edit:
   - **Church info & service times:** the announcement bar, phone numbers, and the timetable.
   - **Events, news & videos:** add the newest item **at the top** of each list.
3. Make your change and press **Publish › Publish now**. The site updates in about a minute.

Tips:
- **Slideshow:** go to **Home page slideshow › Slideshow**. Add a slide with a picture, heading
  and button, and drag slides to change the order. Always fill in the picture description,
  typing out any words on the poster, because that's what blind visitors hear.
- **Times** use 24-hour format with a colon: `09:30`, `19:00`.
- **Events** drop off “Coming up” by themselves once they have finished.
- **Videos:** paste the YouTube address (e.g. `https://www.youtube.com/watch?v=…`). The
  thumbnail is fetched automatically.
- **Testimonies:** only publish ones where the person ticked “You can share this on the
  church website”. Copy them from the Netlify Forms inbox.
- **Announcement bar:** tick **Show the announcement** to switch it on, and untick it to
  hide it again.
- **Mistakes** can be undone. Every save is kept in GitHub's history, and the developer can
  restore any earlier version.

---

## Before going live: checklist

- [ ] **Check the seeded events.** I worked out the dates of the next Power Must Change Hands
      and All-Night Vigil from the monthly programme. Confirm them, or delete them.
- [ ] **Slideshow pictures.** Two of the four posters were made for other MFM branches. One
      names Headquarters Youth Church, and the other names MFM Youth Church Region 11, Mowe,
      and its overseer. Swap them for Edinburgh versions if you have them. Images at least
      1200 px wide will look sharper on large screens.
- [ ] **Edit or delete** the sample “Welcome to our new website” news article.
- [ ] **Pastor photo** (`index.html`, “Who we are”). Add `assets/images/senior-pastor.jpg`
      and swap the placeholder for the `<img>` in the comment next to it.
- [ ] **First-visit details** (`services.html`). Fill in the two `[Add …]` placeholders:
      parking/bus and children's church/access.
- [ ] **Social links.** Add them in the admin under Contact details.
- [ ] **Remaining old pages.** Education, Broadcast, Photo gallery and Community still link
      to the current mfmedinburgh.org pages. Before switching the domain to Netlify, either
      build replacements or change those links in the footer.

---

## For developers

```
index.html, about.html, services.html, events.html, videos.html, news.html, thanks.html
css/styles.css        Design tokens at the top; section 19 styles the dynamic content
js/content.js         Loads /content/*.json and fills elements marked data-render="…"
js/hero.js            Home page slideshow (accessible carousel: autoplay with pause, dots, keys, swipe)
js/main.js            Mobile menu, click-to-play YouTube, form validation and sending
content/*.json        The editable content (written by the admin)
admin/index.html      Decap CMS (pinned to 3.16.3)
admin/config.yml      What staff can edit, the field labels and hints
netlify.toml          Netlify settings (no build step; content is never cached stale)
assets/uploads/       Images staff upload through the admin
```

**Preview locally.** Content loads with `fetch`, so use a local server rather than
double-clicking the files:

```
python3 -m http.server 8080        # then open http://localhost:8080
```

**Edit content locally with the real admin.** Run `npx decap-server` in this folder
alongside the server above, then open http://localhost:8080/admin/ and click **Login**.
Edits are written straight to `content/*.json`. Forms only send once the site is on Netlify.

**Adding a dynamic section.** Put an element with `data-render="name"` on the page and
add a matching `R["name"] = function (el) {…}` in `js/content.js`. Any static HTML inside
the element is the fallback.

**Shared header and footer.** These are repeated in each HTML file, so change all seven
together when you edit the navigation. The slideshow's built-in fallback slides in
`index.html` should match `content/hero.json`. If they differ, the page swaps in the
content version once it loads.

**Security.**
- All content text is escaped before display.
- Links from content must be http(s), mailto, tel or site-relative; anything else is dropped.
- News articles are converted from Markdown and cleaned with DOMPurify.
- The forms have a honeypot field to catch spam bots.

**Accessibility.** The site is built to WCAG 2.1 AA:
- Contrast and touch targets meet AA, and every element has a visible focus ring.
- There is a skip link and landmarks, and form fields have labels and spoken errors.
- The menu traps focus and closes with Escape.
- Animations are reduced when the visitor asks for it.

**Privacy.** YouTube loads only when a visitor presses play, from youtube-nocookie.com.
There is no tracking or analytics.
