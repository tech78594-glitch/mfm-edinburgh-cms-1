// UK-time helpers shared by the build and the browser.
// Church data uses London wall-clock times ("2026-11-07T09:00"); these helpers compare and
// convert them correctly whatever time zone the visitor (or the build machine) is in.

export const TZ = 'Europe/London';
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Current London time as { key: "YYYY-MM-DDTHH:mm", day: 0-6, mins: minutes since midnight } */
export function londonNow(date = new Date()) {
  const o = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'long', hourCycle: 'h23',
  }).formatToParts(date).forEach((x) => { o[x.type] = x.value; });
  return { key: `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}`, day: DAYS.indexOf(o.weekday), mins: +o.hour * 60 + +o.minute };
}

/** "2026-11-07T09:00" (London) -> real Date (handles GMT/BST) */
export function londonToDate(key) {
  const m = String(key).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const asUTC = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  // How far London is ahead of UTC at that moment (0 in winter, 60 in summer)
  const probe = londonNow(new Date(asUTC));
  const pm = probe.key.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  const shown = Date.UTC(+pm[1], +pm[2] - 1, +pm[3], +pm[4], +pm[5]);
  return new Date(asUTC - (shown - asUTC));
}

const toMins = (t) => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };

/** The next (or current) weekly service, with a friendly label */
export function nextService(weekly, date = new Date()) {
  const now = londonNow(date);
  let best = null;
  for (const x of weekly || []) {
    const day = DAYS.indexOf(x.day), start = toMins(x.start);
    if (day < 0 || start == null) continue;
    let end = toMins(x.end); if (end == null || end <= start) end = start + 60;
    const days = (day - now.day + 7) % 7;
    const live = days === 0 && now.mins >= start && now.mins < end;
    let diff = days * 1440 + start - now.mins;
    if (diff < 0) diff += 7 * 1440;
    const score = live ? -1 : diff;
    // calendar days ahead (0 = today, 1 = tomorrow, 7 = same day next week)
    if (!best || score < best.score) best = { item: x, live, score, days: Math.floor((now.mins + diff) / 1440), diff };
  }
  if (!best) return null;
  const { item, live, diff } = best;
  let when;
  if (live) when = 'Happening now';
  else if (diff <= 60) when = `Starts in ${diff} min`;
  else if (best.days === 0) when = `Today at ${item.start}`;
  else if (best.days === 1) when = `Tomorrow at ${item.start}`;
  else if (best.days === 7) when = `Next ${item.day} at ${item.start}`;
  else when = `${item.day} at ${item.start}`;
  return { ...best, when, minutesUntil: live ? 0 : diff };
}

/** Split a remaining number of minutes into days/hours/minutes */
export function splitMinutes(total) {
  return { days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), mins: total % 60 };
}
