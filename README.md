# Monad Terminal

A live, single-page dashboard for the Monad ecosystem — chain TVL, protocol rankings, stablecoins, ecosystem jobs, governance (MIPs), and events. No build step, no framework: a static `index.html` plus a handful of Vercel serverless functions under `/api`.

**Live data, by design:** every `/api/*` route fetches its source fresh on each request (with a short edge cache, 5–30 min depending on the endpoint) — nothing is baked in at deploy time except the X/Twitter "Alpha" section (see below).

## Data sources

| Section | Endpoint | Source | Live? |
|---|---|---|---|
| Chain Pulse + Protocols | `/api/chain` | [DefiLlama API](https://defillama.com/docs/api) + [CoinGecko](https://www.coingecko.com/en/api) | Yes |
| Stablecoins | `/api/stables` | [DefiLlama stablecoins API](https://stablecoins.llama.fi) | Yes |
| Jobs | `/api/jobs` | [eco-jobs.monad.xyz](https://eco-jobs.monad.xyz/jobs) (scraped, schema.org microdata) | Yes |
| Governance (MIPs) | `/api/mips` | [forum.monad.xyz](https://forum.monad.xyz/c/mips/8) (Discourse JSON API) | Yes |
| Events | `/api/events` | [monad.xyz/events](https://www.monad.xyz/events) (scraped) | Yes |
| Alpha (X threads) | `/api/alpha` | Manually/browser-synced snapshot | **No** — see below |

### Why Alpha isn't live

X/Twitter has no free, unauthenticated public API for reading a timeline. `/api/alpha` serves a bundled snapshot with a `syncedAt` timestamp so the UI is honest about staleness, rather than silently going stale. To refresh it:

1. Re-scrape `@monad` and `@keoneHD` (e.g. via browser automation, or the X API if you have a paid tier), and update the `ALPHA` array + `SYNCED_AT` in `api/alpha.js`.
2. Commit and push — Vercel redeploys automatically.
## Local development

```bash
npm i -g vercel
vercel dev
```

## Deploying

This repo has zero build config — Vercel auto-detects the `/api` directory as serverless functions and serves `index.html` as a static file. Push to GitHub, import the repo on [vercel.com/new](https://vercel.com/new), and deploy. No environment variables required.

## Notes / limitations

- Protocol-level `1d/7d/30d` changes are computed live from each protocol's per-chain TVL history (`api.llama.fi/protocol/{slug}`), so they're accurate to Monad specifically — not blended with the protocol's TVL on other chains.
- `/api/chain` makes ~25 parallel calls to DefiLlama to compute those per-protocol deltas; `vercel.json` sets its `maxDuration` to 15s to give it room.
- Job/MIP/event scraping depends on the current markup of third-party sites and may need small regex tweaks if those sites redesign.
