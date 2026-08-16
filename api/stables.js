// /api/stables — live stablecoin market caps on Monad, from DefiLlama's stablecoins API.

function pct(from, to) {
    if (!from) return null;
    return ((to - from) / from) * 100;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    try {
          const r = await fetch('https://stablecoins.llama.fi/stablecoins?includePrices=true', {
                  headers: { accept: 'application/json' },
          });
          if (!r.ok) throw new Error(`stablecoins.llama.fi -> ${r.status}`);
          const data = await r.json();

      const stables = (data.peggedAssets || [])
            .filter((a) => a.chainCirculating && a.chainCirculating.Monad)
            .map((a) => {
                      const cc = a.chainCirculating.Monad;
                      const current = cc.current?.peggedUSD ?? 0;
                      const prevDay = cc.circulatingPrevDay?.peggedUSD ?? null;
                      const prevWeek = cc.circulatingPrevWeek?.peggedUSD ?? null;
                      const prevMonth = cc.circulatingPrevMonth?.peggedUSD ?? null;
                      return {
                                  name: a.name,
                                  ticker: a.symbol,
                                  mcap: current,
                                  d1: pct(prevDay, current),
                                  d7: pct(prevWeek, current),
                                  d30: pct(prevMonth, current),
                                  price: a.price ?? null,
                                  offPeg: a.price != null ? (a.price - 1) * 100 : null,
                      };
            })
            .filter((s) => s.mcap > 0)
            .sort((a, b) => b.mcap - a.mcap);

      res.status(200).json({ asOf: new Date().toISOString(), stables });
    } catch (e) {
          res.status(200).json({ asOf: new Date().toISOString(), stables: [], error: String(e) });
    }
}
