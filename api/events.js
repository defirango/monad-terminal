// /api/events — live upcoming events from monad.xyz/events (server-rendered Next.js page,
// so a plain server-side fetch sees the same event cards a browser would).

const EVENT_RE =
    /<a href="(https:\/\/lu\.ma\/[^"]+)"[^>]*>\s*<div[^>]*>\s*<p[^>]*>([^<]+)<\/p>\s*<\/div>\s*<div[^>]*>\s*<h3[^>]*>([^<]+)<\/h3>\s*<\/div>\s*<div[^>]*>\s*<p[^>]*>([^<]+)<\/p>/g;

function shortenDate(full) {
    // "Aug 20, 2026" -> "Aug 20"
  const m = full.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
    return m ? `${m[1]} ${m[2]}` : full;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    try {
          const r = await fetch('https://www.monad.xyz/events', { headers: { accept: 'text/html' } });
          if (!r.ok) throw new Error(`monad.xyz/events -> ${r.status}`);
          const html = await r.text();

      const idxUpcoming = html.indexOf('Upcoming Events');
          const idxPast = html.indexOf('Past Events');
          const section = idxUpcoming >= 0 ? html.slice(idxUpcoming, idxPast > idxUpcoming ? idxPast : undefined) : html;

      const seen = new Set();
          const events = [];
          let m;
          EVENT_RE.lastIndex = 0;
          while ((m = EVENT_RE.exec(section)) !== null) {
                  const url = m[1];
                  if (seen.has(url)) continue;
                  seen.add(url);
                  events.push({ date: shortenDate(m[2].trim()), name: m[3].trim(), location: m[4].trim(), url });
                  if (events.length >= 6) break;
          }

      res.status(200).json({ asOf: new Date().toISOString(), events });
    } catch (e) {
          res.status(200).json({ asOf: new Date().toISOString(), events: [], error: String(e) });
    }
}
