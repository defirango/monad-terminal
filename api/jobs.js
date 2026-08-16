// /api/jobs — live scrape of the Monad ecosystem job board (eco-jobs.monad.xyz).
// The page is server-rendered with schema.org/JobPosting microdata (itemProp attributes),
// so we parse that directly out of the raw HTML rather than depending on Getro's
// (auth-gated) internal API.

const TAG_KEYWORDS = [
  { tag: 'growth', words: ['growth'] },
  { tag: 'marketing', words: ['marketing', 'cmo', 'brand'] },
  { tag: 'content', words: ['content', 'twitter', 'social media', 'copywriter'] },
  { tag: 'bd', words: ['business development', 'bd ', ' bd,', 'partnerships'] },
  { tag: 'research', words: ['research', 'data scientist', 'data analyst', 'analyst'] },
  { tag: 'finance', words: ['finance', 'financial', 'accounting'] },
  { tag: 'devrel', words: ['developer relations', 'devrel', 'developer advocate'] },
  ];

const SKIP_KEYWORDS = ['engineer', 'developer', 'devops', 'infrastructure', 'sre', 'architect'];
const SKIP_EXCEPTIONS = ['data scientist', 'data analyst', 'research engineer'];


function classify(title) {
    const t = title.toLowerCase();
    for (const { tag, words } of TAG_KEYWORDS) {
          if (words.some((w) => t.includes(w))) return tag;
    }
    return null;
}

function shouldSkip(title) {
    const t = title.toLowerCase();
    if (SKIP_EXCEPTIONS.some((w) => t.includes(w))) return false;
    return SKIP_KEYWORDS.some((w) => t.includes(w));
}

function stripTags(html) {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function daysAgo(isoDate) {
    if (!isoDate) return null;
    const posted = new Date(isoDate + 'T00:00:00Z').getTime();
    return Math.max(0, Math.round((Date.now() - posted) / 86400000));
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    try {
          const r = await fetch('https://eco-jobs.monad.xyz/jobs', { headers: { accept: 'text/html' } });
          if (!r.ok) throw new Error(`eco-jobs.monad.xyz -> ${r.status}`);
          const html = await r.text();

      const cards = html.split('data-testid="job-list-item"').slice(1);
          const jobs = [];

      for (const chunk of cards) {
              const titleMatch = chunk.match(/itemprop="title"[^>]*>([\s\S]*?)<\/div>/i);
              const title = titleMatch ? stripTags(titleMatch[1]) : null;
              if (!title) continue;
              if (shouldSkip(title)) continue;
              const tag = classify(title);
              if (!tag) continue;

            const companyMatch = chunk.match(/data-testid="company-link"[^>]*>([^<]*)</);
              const company = companyMatch ? companyMatch[1].trim() : 'Unknown';

            const locMatch = chunk.match(/itemprop="addresslocality" content="([^"]*)"/i);
              const location = locMatch ? locMatch[1] : 'Remote';

            const dateMatch = chunk.match(/itemprop="dateposted" content="([^"]*)"/i);
              const posted = daysAgo(dateMatch ? dateMatch[1] : null);

            const aTagMatch = chunk.match(/<a[^>]*data-testid="job-title-link"[^>]*>/);
              const hrefMatch = aTagMatch ? aTagMatch[0].match(/href="([^"]*)"/) : null;
              const url = hrefMatch ? `https://eco-jobs.monad.xyz${hrefMatch[1].replace('#content', '')}` : null;

            jobs.push({ title, company, location, posted, url, tag });
              if (jobs.length >= 12) break;
      }

      res.status(200).json({ asOf: new Date().toISOString(), jobs });
    } catch (e) {
          res.status(200).json({ asOf: new Date().toISOString(), jobs: [], error: String(e) });
    }
}
