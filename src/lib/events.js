// Event helpers: sorting, upcoming/past split and "Add to calendar" (.ics) links.
import events from '../data/events.json';
import site from '../data/site.json';
import { parts, fmt, hm, longDate } from './format.js';
import { londonNow } from './time.js';

/** End key used to decide whether an event is over (date-only ends count as end of day) */
export function endKey(e) {
  const k = String(e.end || e.start || '');
  return k.length === 10 ? k + 'T23:59' : k.slice(0, 16);
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

/** Dates (YYYY-MM-DD) of the next `count` occurrences of a recurring rule, from `fromKey` (UK date). */
function occurrences(r, fromKey) {
  const day = DAYS.indexOf(r.day);
  const from = new Date(`${fromKey.slice(0, 10)}T00:00:00Z`);
  const out = [];
  if (r.rule === 'weekly') {
    let d = addDays(from, (day - from.getUTCDay() + 7) % 7);
    while (out.length < (r.count || 4)) { out.push(ymd(d)); d = addDays(d, 7); }
  } else if (r.rule === 'monthly') {
    for (let m = 0; out.length < (r.count || 3) && m < 24; m++) {
      const first = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + m, 1));
      let d;
      if ((r.nth || 1) > 0) d = addDays(first, (day - first.getUTCDay() + 7) % 7 + 7 * ((r.nth || 1) - 1));
      else { const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)); d = addDays(last, -((last.getUTCDay() - day + 7) % 7)); }
      if (d.getUTCMonth() === first.getUTCMonth() && ymd(d) >= ymd(from)) out.push(ymd(d));
    }
  }
  return out;
}

/** One-off events plus the next few occurrences of each recurring event (Sundays, monthly vigil…).
 *  The site rebuilds daily, and the browser hides anything that has finished, so the list stays current. */
export function allEvents(now = londonNow().key) {
  const generated = (events.recurring || []).flatMap((r) => occurrences(r, addDays(new Date(`${now.slice(0, 10)}T00:00:00Z`), -1).toISOString()).map((date) => {
    const endDate = r.end && r.end < r.start ? ymd(addDays(new Date(`${date}T00:00:00Z`), 1)) : date;
    return { ...r, start: `${date}T${r.start}`, end: r.end ? `${endDate}T${r.end}` : '', recurring: true };
  }));
  return [...(events.items || []), ...generated].filter((e) => e.title && parts(e.start)).sort((a, b) => (a.start > b.start ? 1 : -1));
}

/** Split at build time. The browser re-checks with the live clock (see EventFilter). */
export function splitEvents(now = londonNow().key) {
  const all = allEvents();
  return { upcoming: all.filter((e) => endKey(e) >= now), past: all.filter((e) => endKey(e) < now).reverse() };
}

export function describe(e) {
  const s = parts(e.start), en = parts(e.end);
  const time = hm(s) ? hm(s) + (en && hm(en) ? ` – ${hm(en)}` : '') : '';
  return {
    s,
    month: fmt(s, { month: 'short' }).toUpperCase(),
    day: s.d,
    weekday: fmt(s, { weekday: 'short' }).toUpperCase(),
    dateLong: fmt(s, { weekday: 'long', day: 'numeric', month: 'long' }),
    dateFull: longDate(s),
    monthGroup: fmt(s, { month: 'long', year: 'numeric' }),
    time,
    ends: en && en.key.slice(0, 10) !== s.key.slice(0, 10) ? fmt(en, { weekday: 'long' }) : '',
  };
}

const icsDate = (key) => key.replace(/[-:]/g, '').slice(0, 13) + '00';
const esc = (s) => String(s || '').replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');

/** data: URL for a one-event calendar file (UK time) */
export function icsHref(e) {
  const start = parts(e.start);
  const end = parts(e.end) || { key: start.key.slice(0, 11) + String(Math.min(23, (start.h ?? 9) + 2)).padStart(2, '0') + ':' + String(start.mi ?? 0).padStart(2, '0') };
  const loc = e.location || `${site.address.line1}, ${site.address.line2} ${site.address.postcode}`;
  const uid = `${start.key}-${(e.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}@mfmedinburgh.org`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MFM Edinburgh//Website//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${icsDate(new Date().toISOString().slice(0, 16))}Z`,
    `DTSTART;TZID=Europe/London:${icsDate(start.key.length === 10 ? start.key + 'T09:00' : start.key)}`,
    `DTEND;TZID=Europe/London:${icsDate(end.key.length === 10 ? end.key + 'T17:00' : end.key)}`,
    `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(loc)}`, `DESCRIPTION:${esc(e.summary || '')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
}
