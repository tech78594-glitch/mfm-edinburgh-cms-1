# MFM Edinburgh website

A fast static website built with [Astro](https://astro.build). There is no admin login, no Netlify and no database. You edit simple data files, build, and upload the `dist/` folder to any static host.

## Quick start

```bash
npm install
npm run dev      # preview at http://localhost:4321 while editing
npm run build    # produce the finished site in dist/
npm run videos   # refresh the video lists from both YouTube channels
```

Requires Node.js 22 or newer.

## Where to edit content

All content lives in `src/data/`:

| File | What it controls |
|---|---|
| `site.json` | Name, address, phones, emails, minister numbers, top announcement bar, testimony form settings |
| `services.json` | Weekly services and monthly programmes. The "Next service" countdown updates itself. |
| `events.json` | Special events. Past events move to "Past events" automatically, with no rebuild needed. |
| `hero.json` | Home page slideshow: the posters, their text and buttons, and seconds per slide |
| `videos.json` | Video lists for MFM Edinburgh and MFM Worldwide. Update with `npm run videos`. |
| `give.json` | **Bank details: currently PLACEHOLDER numbers.** Replace them before going live. |
| `gallery.json` | Photo albums. Each photo needs `src`, `alt`, `w` and `h`. |
| `testimonies.json` | Approved testimonies shown on the Testimonies page |
| `news/*.md` | News stories. Add a new `.md` file with `title`, `date`, `summary` and optionally `image`. |

Images go in `public/images/`. Hero posters go in `public/images/hero/`.

## Before going live

1. **Give Online:** replace every value in `src/data/give.json → bank` with the real account. The "Placeholder details" badge disappears when the word PLACEHOLDER and the number 12345678 are gone.
2. **Plan your visit:** in `src/pages/services.astro`, replace "[Add parking and bus details]".
3. **Testimony form:** by default it opens the visitor's email app, addressed to `testimony_form.send_to`. To receive submissions directly, create a free form endpoint (for example Formspree) and paste its URL into `site.json → testimony_form.endpoint`.

## Deploying

**GitHub Pages (set up):** `.github/workflows/deploy.yml` builds and publishes the site on every push to `main`.
1. One-time step: on GitHub, open the repo's **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Don't choose "Deploy from a branch", because that runs Jekyll, which can't build Astro.
2. Push to `main`. The site appears at `https://<user>.github.io/<repo>/`. The workflow passes the sub-folder in as `BASE_PATH`, so every link still works.
3. Later, add `mfmedinburgh.org` as a custom domain under Settings → Pages. The workflow detects it and builds for the root of the domain.

Or upload the `dist/` folder to any other static host:

- **Cloudflare Pages:** build command `npm run build`, output directory `dist`
- **GitHub Pages**
- **Any web host:** upload the contents of `dist/` by FTP

## Pages

Each page has its own look and shares the header, footer, colours and type of the home page:

- Home: moving hero
- About: heritage
- Services: timetable
- Events: agenda and countdown
- Testimonies: wall of praise and the site's only form
- Gallery: dark exhibition with lightbox
- News Update: newsroom
- Videos: cinema with channel tabs
- Give Online: generosity card with copy buttons
- Contact: map and cards
- 404 page

The design is in Figma: https://www.figma.com/design/kJ72MpGXZ7nWL8021qpU6s. It contains the header, the foundations, the Home page and the About page.
