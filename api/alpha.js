// /api/alpha — X (Twitter) threads from @monad and @keoneHD.
//
// Honesty note: X/Twitter has no public, unauthenticated API, so this endpoint cannot be
// truly "live" like the others. It serves the most recent synced snapshot (captured via
// browser automation) with a `syncedAt` timestamp so the UI can be upfront about staleness.
// To refresh, re-run the sync (see README) and redeploy, or wire this endpoint up to your
// own X API credentials if you have paid API access.

const SYNCED_AT = '2026-08-16T08:38:00Z';

const ALPHA = [
  { author: '@keoneHD', authorName: 'Keone Hon · cofounder Monad', when: 'Aug 12', hot: true, text: 'Monad testnet hardfork complete. MIP-8 (page-aware storage & pricing) is now live on testnet.', views: '26K', url: 'https://x.com/keoneHD/status/2087548185103183918' },
  { author: '@monad', authorName: 'Monad Foundation', when: 'Aug 14', hot: true, text: 'Money moves on Monad with @joinCero — QT Cero launching Spending with upside, Cero Score, rewards.', views: '50K', url: 'https://x.com/monad/status/2088268256322756766' },
  { author: '@monad', authorName: 'Monad Foundation', when: 'Aug 15', hot: false, text: 'Encrypted mempools will save you from sandwich attacks.', views: '37K', url: 'https://x.com/monad/status/2088338143250395565' },
  { author: '@monad', authorName: 'Monad Foundation', when: 'Aug 13', hot: false, text: 'Perps on @perpltrade looking good here.', views: '42K', url: 'https://x.com/monad/status/2087927493495841194' },
  { author: '@monad', authorName: 'Monad Foundation', when: 'Aug 13', hot: false, text: 'The first DeltaV Demo Day is at Open on October 6th — 7 teams will pitch to 50+ VCs in Singapore. Any startup can apply.', views: '40K', url: 'https://x.com/monad/status/2087614487968854114' },
  { author: '@keoneHD', authorName: 'Keone Hon · cofounder Monad', when: 'Aug 13', hot: false, text: 'The Last General-Purpose L1 — QT of Four Pillars report on Monad, 4.5 years of building bet on the "high performance L1" thesis.', views: '27K', url: 'https://x.com/keoneHD/status/2087818318749020241' },
  { author: '@keoneHD', authorName: 'Keone Hon · cofounder Monad', when: 'Aug 14', hot: false, text: 'My toxic trait is that I believe you can just build your way out of any problem. Since January 2026...', views: '13K', url: 'https://x.com/keoneHD/status/2088032126792822798' },
  { author: '@keoneHD', authorName: 'Keone Hon · cofounder Monad', when: 'Aug 14', hot: false, text: "Crypto is finance that is legible to AI. If you've spent any time with AI crawling data, you'll know what I mean...", views: '8.5K', url: 'https://x.com/keoneHD/status/2088074539896856641' },
  { author: '@keoneHD', authorName: 'Keone Hon · cofounder Monad', when: 'Aug 14', hot: false, text: 'Cero Mode — quote-tweeting the Cero founding story from Nitro.', views: '8.7K', url: 'https://x.com/keoneHD/status/2088110977908613166' },
  ];

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json({ asOf: new Date().toISOString(), syncedAt: SYNCED_AT, live: false, alpha: ALPHA });
}
