// /api/mips — live MIP (Monad Improvement Proposal) governance thread list, from the
// Discourse forum's built-in JSON API (append .json to any forum.monad.xyz page).

function shortDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractMipId(title) {
    const m = title.match(/MIP[-\s]?(\d+)/i);
    return m ? `MIP-${m[1]}` : null;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    try {
          const r = await fetch('https://forum.monad.xyz/c/mips/8.json', { headers: { accept: 'application/json' } });
          if (!r.ok) throw new Error(`forum.monad.xyz -> ${r.status}`);
          const data = await r.json();

      const topics = (data.topic_list?.topics || [])
            .filter((t) => t.slug !== 'about-the-mips-category')
            .slice(0, 12)
            .map((t) => ({
                      id: extractMipId(t.title) || `#${t.id}`,
                      name: t.title.replace(/^MIP[-\s]?\d+[:\s-]*/i, '').trim() || t.title,
                      replies: Math.max(0, (t.posts_count || 1) - 1),
                      lastActivity: shortDate(t.last_posted_at || t.bumped_at),
                      url: `https://forum.monad.xyz/t/${t.slug}/${t.id}`,
            }));

      res.status(200).json({ asOf: new Date().toISOString(), mips: topics });
    } catch (e) {
          res.status(200).json({ asOf: new Date().toISOString(), mips: [], error: String(e) });
    }
}
