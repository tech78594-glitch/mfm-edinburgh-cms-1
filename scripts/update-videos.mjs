// Refreshes src/data/videos.json with the latest uploads from both YouTube channels.
// Usage: npm run videos   (needs internet access; leaves the file unchanged if YouTube can't be reached)
import fs from 'node:fs';

const FILE = new URL('../src/data/videos.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const KEEP = 12;
// Worldwide channel posts the same service in several languages; keep the English uploads.
const FOREIGN = /YORUBA|IGBO|HAUSA|HEURE|SERVICE (SPECIAL )?DE|DIMANCHE|\bDU \d|FRENCH|PORTUG|ESPA/i;

const clean = (t) => t.replace(/\|/g, ' | ').replace(/\s+/g, ' ').replace(/ \| \| /g, ' | ').trim();

function collect(node, out) {
  if (Array.isArray(node)) { node.forEach((n) => collect(n, out)); return; }
  if (!node || typeof node !== 'object') return;
  const v = node.lockupViewModel;
  if (v && String(v.contentType || '').endsWith('VIDEO')) {
    const md = v.metadata?.lockupMetadataViewModel || {};
    const meta = JSON.stringify(md.metadata || {});
    out.push({ id: v.contentId, title: clean(md.title?.content || ''), scheduled: meta.includes('Scheduled') });
    return;
  }
  Object.values(node).forEach((n) => collect(n, out));
}

async function latest(channelId, filter) {
  const list = 'UU' + channelId.slice(2); // a channel's "uploads" playlist
  const res = await fetch(`https://www.youtube.com/playlist?list=${list}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-GB' },
  });
  if (!res.ok) throw new Error(`${channelId}: HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new Error(`${channelId}: page format changed`);
  const out = [];
  collect(JSON.parse(m[1]), out);
  return out.filter((v) => v.id && v.title && !v.scheduled && (!filter || !filter.test(v.title)))
    .slice(0, KEEP).map(({ id, title }) => ({ id, title }));
}

try {
  const ed = data.channels.edinburgh, ww = data.channels.worldwide;
  const [a, b] = await Promise.all([latest(ed.channel_id), latest(ww.channel_id, FOREIGN)]);
  if (!a.length && !b.length) throw new Error('no videos found');
  if (a.length) ed.items = a;
  if (b.length) ww.items = b;
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`videos.json updated: ${a.length} MFM Edinburgh, ${b.length} MFM Ministries`);
} catch (err) {
  console.warn(`videos.json not changed (${err.message})`);
}
