// /api/chain — live Monad chain metrics + protocol rankings, sourced from DefiLlama's
// public API (api.llama.fi) and CoinGecko. Runs server-side on every request, so it never
// hits browser CORS restrictions. Response is cached at the edge for 5 minutes.

const CATEGORY_MAP = {
    'Risk Curators': 'Risk Curator',
    'Dexs': 'DEX / LP',
    'Derivatives': 'Perps',
    'Onchain Capital Allocator': 'Capital Allocator',
};

function normalizeCategory(cat) {
    return CATEGORY_MAP[cat] || cat || 'Other';
}

async function fetchJson(url, timeoutMs = 6000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
          const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
          if (!res.ok) throw new Error(`${url} -> ${res.status}`);
          return await res.json();
    } finally {
          clearTimeout(t);
    }
}

// Given a daily series of {date (unix seconds), totalLiquidityUSD}, find % change
// from `daysAgo` back to the most recent point.
function pctChangeAt(series, daysAgo) {
    if (!Array.isArray(series) || series.length < 2) return null;
    const latest = series[series.length - 1];
    const targetDate = latest.date - daysAgo * 86400;
    let closest = null;
    let minDiff = Infinity;
    for (const pt of series) {
          const diff = Math.abs(pt.date - targetDate);
          if (diff < minDiff) {
                  minDiff = diff;
                  closest = pt;
          }
    }
    if (!closest || minDiff > daysAgo * 86400 * 0.6 + 172800) return null;
    const from = closest.totalLiquidityUSD;
    const to = latest.totalLiquidityUSD;
    if (!from) return null;
    return ((to - from) / from) * 100;
}

async function getProtocolDetail(slug) {
    try {
          const d = await fetchJson(`https://api.llama.fi/protocol/${slug}`, 6000);
          const series = d?.chainTvls?.Monad?.tvl;
          if (!Array.isArray(series) || series.length === 0) return null;
          return {
                  d1: pctChangeAt(series, 1),
                  d7: pctChangeAt(series, 7),
                  d30: pctChangeAt(series, 30),
          };
    } catch {
          return null;
    }
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const errors = [];

  const [tvlHistoryRes, protocolsRes, feesRes, dexRes, perpsRes, priceRes] = await Promise.allSettled([
        fetchJson('https://api.llama.fi/v2/historicalChainTvl/Monad'),
        fetchJson('https://api.llama.fi/protocols'),
        fetchJson('https://api.llama.fi/overview/fees/Monad?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees'),
        fetchJson('https://api.llama.fi/overview/dexs/Monad?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true'),
        fetchJson('https://api.llama.fi/overview/derivatives/Monad?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true'),
        fetchJson('https://api.coingecko.com/api/v3/coins/monad?localization=false&tickers=false&community_data=false&developer_data=false'),
      ]);

  // --- TVL + history ---
  let tvl = null, tvlChange24h = null, tvlHistory = [];
    if (tvlHistoryRes.status === 'fulfilled') {
          const series = tvlHistoryRes.value;
          const last31 = series.slice(-31);
          tvlHistory = last31.map((p) => p.tvl);
          tvl = last31[last31.length - 1]?.tvl ?? null;
          const prev = last31[last31.length - 2]?.tvl;
          if (tvl != null && prev) tvlChange24h = ((tvl - prev) / prev) * 100;
    } else {
          errors.push('tvlHistory');
    }

  // --- Fees (chain total + per-protocol) ---
  let chainFees24h = null;
    const feesByName = {};
    if (feesRes.status === 'fulfilled') {
          chainFees24h = feesRes.value.total24h ?? null;
          for (const p of feesRes.value.protocols || []) feesByName[p.name] = p.total24h;
    } else {
          errors.push('fees');
    }

  // --- DEX volume ---
  let dexVol24h = null, dexVol7d = null, dexVol7dChange = null;
    if (dexRes.status === 'fulfilled') {
          dexVol24h = dexRes.value.total24h ?? null;
          dexVol7d = dexRes.value.total7d ?? null;
          dexVol7dChange = dexRes.value.change_7dover7d ?? null;
    } else {
          errors.push('dexVolume');
    }

  // --- Perps volume ---
  let perpsVol24h = null, perpsVol7d = null, perpsVol7dChange = null;
    if (perpsRes.status === 'fulfilled') {
          perpsVol24h = perpsRes.value.total24h ?? null;
          perpsVol7d = perpsRes.value.total7d ?? null;
          perpsVol7dChange = perpsRes.value.change_7dover7d ?? null;
    } else {
          errors.push('perpsVolume');
    }

  // --- MON token price/mcap/fdv ---
  let monPrice = null, monMcap = null, monFDV = null;
    if (priceRes.status === 'fulfilled') {
          const md = priceRes.value.market_data;
          monPrice = md?.current_price?.usd ?? null;
          monMcap = md?.market_cap?.usd ?? null;
          monFDV = md?.fully_diluted_valuation?.usd ?? null;
    } else {
          errors.push('monPrice');
    }

  // --- Protocols: top ~25 by current Monad TVL, with live per-chain d1/d7/d30 ---
  let protocols = [];
    if (protocolsRes.status === 'fulfilled') {
          const monadProtocols = protocolsRes.value
            .filter((p) => Array.isArray(p.chains) && p.chains.includes('Monad'))
            .map((p) => ({
                      name: p.name,
                      slug: p.slug,
                      category: normalizeCategory(p.category),
                      tvl: p.chainTvls?.Monad ?? 0,
            }))
            .filter((p) => p.tvl > 0)
            .sort((a, b) => b.tvl - a.tvl)
            .slice(0, 25);

      const details = await Promise.allSettled(monadProtocols.map((p) => getProtocolDetail(p.slug)));

      protocols = monadProtocols.map((p, i) => {
              const detail = details[i].status === 'fulfilled' ? details[i].value : null;
              return {
                        name: p.name,
                        category: p.category,
                        tvl: p.tvl,
                        d1: detail?.d1 ?? null,
                        d7: detail?.d7 ?? null,
                        d30: detail?.d30 ?? null,
                        fees24h: feesByName[p.name] ?? null,
              };
      });
    } else {
          errors.push('protocols');
    }

  res.status(200).json({
        asOf: new Date().toISOString(),
        chain: {
                tvl,
                tvlChange24h,
                dexVol24h,
                dexVol7d,
                dexVol7dChange,
                perpsVol24h,
                perpsVol7d,
                perpsVol7dChange,
                chainFees24h,
                monPrice,
                monMcap,
                monFDV,
        },
        tvlHistory,
        protocols,
        errors,
  });
}
