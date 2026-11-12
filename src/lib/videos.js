// Display helpers for YouTube titles (the raw titles stay unchanged in src/data/videos.json).

const KEEP_UPPER = new Set(['MFM', 'PMCH', 'DR', 'D.K.', 'D.', 'K.', 'K', 'UK', 'II', 'III', 'IV']);
const SMALL = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'by', 'with']);

/** "THE MOST POWERFUL STRONGHOLD" → "The Most Powerful Stronghold" (leaves mixed-case titles alone). */
export function tidyCase(text) {
  if (/[a-z]/.test(text)) return text;
  return text.split(/\s+/).map((w, i) => {
    if (KEEP_UPPER.has(w)) return w === 'DR' ? 'Dr' : w;
    if (/\d/.test(w)) return w;
    const lw = w.toLowerCase();
    if (i > 0 && SMALL.has(lw)) return lw;
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(' ');
}

/** A title that is only a date ("8th Nov, 2026") becomes "Sunday Service | 8th Nov, 2026". */
export function prettyTitle(title) {
  const t = tidyCase(title.trim());
  if (/^\d{1,2}(st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}$/.test(t)) return `Sunday Service | ${t}`;
  return t;
}

/**
 * Splits a worldwide upload title into the message and the programme, e.g.
 * "THE MOST POWERFUL STRONGHOLD - MFM MANNA WATER 11-11-2026 DR D.K. OLUKOYA"
 * → { message: "The Most Powerful Stronghold", programme: "MFM Manna Water · 11-11-2026", speaker: "Dr D.K. Olukoya" }
 */
export function splitMessage(title) {
  const raw = title.replace(/\s+/g, ' ').trim();
  const speakerMatch = raw.match(/(?:MINISTERING:\s*)?(DR\.?\s*D\.?\s*K\.?\s*OLUKOYA)\s*$/i);
  const speaker = speakerMatch ? 'Dr D. K. Olukoya' : '';
  const body = speakerMatch ? raw.slice(0, speakerMatch.index).replace(/[-–|:\s]+$/, '') : raw;
  const parts = body.split(/\s[-–|]\s/);
  const first = parts[0] || body;
  const isProgramme = /^MFM\b/i.test(first) || parts.length === 1;
  const message = isProgramme ? '' : tidyCase(first);
  const programme = tidyCase((isProgramme ? parts : parts.slice(1)).join(' · '))
    .replace(/\s(\d{2}-\d{2}-\d{4})/, ' · $1').replace(/·\s·/g, '·').replace(/· ([a-z])/g, (m, c) => `· ${c.toUpperCase()}`).trim();
  return { message: message || programme, programme: message ? programme : '', speaker };
}

/** Picks the latest worldwide upload that is a named message (not just a programme recording). */
export function latestMessage(items) {
  return items.map((v) => ({ ...v, ...splitMessage(v.title) })).find((v) => v.programme) ?? null;
}
