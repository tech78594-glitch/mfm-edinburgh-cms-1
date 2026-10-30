// Shared helpers for building pages from the data files.
// Dates in the data are UK wall-clock strings ("2026-11-07T09:00" or "2026-11-01"); they are
// formatted from their parts so they read the same wherever the site is built or viewed.

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parts(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : null, mi: m[5] ? +m[5] : null, key: m[0].replace(' ', 'T') };
}

const asUTC = (p) => new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h || 0, p.mi || 0));
export const fmt = (p, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(asUTC(p));
export const longDate = (p) => fmt(p, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const hm = (p) => (p && p.h != null ? `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}` : '');

/** "07557 644650" -> "tel:+447557644650" */
export function tel(n) {
  let d = String(n).replace(/[^\d+]/g, '');
  if (d.startsWith('0')) d = '+44' + d.slice(1);
  return 'tel:' + d;
}

export function youtubeId(v) {
  v = String(v || '').trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : '';
}

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Allow http(s), mailto, tel and relative links from data; drop anything else (javascript:, data:, //host). */
export function safeUrl(u) {
  u = String(u || '').replace(/[\u0000-\u001F\u007F\s]+/g, '');
  if (!u) return '';
  const scheme = u.match(/^([a-z][a-z0-9+.\-]*):/i);
  if (!scheme) return u.startsWith('//') ? '' : u;
  return /^(https?|mailto|tel)$/i.test(scheme[1]) ? u : '';
}

export const mapsLink = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
export const mapsEmbed = (q) => 'https://www.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed';

/** News posts from src/data/news/*.md, newest first */
export function getNews() {
  const mods = import.meta.glob('../data/news/*.md', { eager: true });
  return Object.entries(mods)
    .map(([path, mod]) => ({
      slug: path.split('/').pop().replace(/\.md$/, ''),
      ...mod.frontmatter,
      // YAML turns 2026-11-01 into a Date; keep it as a plain YYYY-MM-DD string
      date: mod.frontmatter.date instanceof Date
        ? mod.frontmatter.date.toISOString().slice(0, 10)
        : String(mod.frontmatter.date || '').slice(0, 10),
      Content: mod.Content,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
