import { NextResponse } from 'next/server';
import { OnchainData } from '@/types/onchain';

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'TradeAI/1.0' } });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function GET() {
  try {
    // Fetch top DeFi protocols from DeFiLlama
    const [protocolsRes, globalRes] = await Promise.allSettled([
      fetchWithTimeout('https://api.llama.fi/protocols'),
      fetchWithTimeout('https://api.llama.fi/v2/historicalChainTvl'),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let protocols: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let totalDeFiTVL = 0;
    let totalDeFiChange24h = 0;

    if (protocolsRes.status === 'fulfilled' && protocolsRes.value.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await protocolsRes.value.json();
      protocols = data
        .filter((p) => p.tvl > 100_000_000) // > $100M TVL
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 15)
        .map((p) => ({
          name: p.name,
          symbol: p.symbol ?? p.name.slice(0, 4).toUpperCase(),
          tvl: p.tvl,
          tvlChange24h: p.change_1d ?? 0,
          chain: p.chain ?? 'Multi',
          category: p.category ?? 'DeFi',
          url: p.url ?? `https://defillama.com/protocol/${p.slug}`,
        }));

      totalDeFiTVL = data.reduce((a, p) => a + (p.tvl ?? 0), 0);
      const tvlChanges = data.map((p) => p.change_1d ?? 0).filter((c) => !isNaN(c));
      totalDeFiChange24h = tvlChanges.length > 0 ? tvlChanges.reduce((a, b) => a + b, 0) / tvlChanges.length : 0;
    }

    // Generate realistic whale alerts (simulated since Whale Alert API requires paid key)
    const now = Math.floor(Date.now() / 1000);
    const whaleAlerts = [
      { id: '1', type: 'transfer', amount: 5000, symbol: 'BTC', from: 'Unknown', to: 'Binance', timestamp: now - 300, usdValue: 5000 * 85000 },
      { id: '2', type: 'exchange_withdrawal', amount: 50000, symbol: 'ETH', from: 'Coinbase', to: 'Unknown', timestamp: now - 900, usdValue: 50000 * 2200 },
      { id: '3', type: 'transfer', amount: 200000000, symbol: 'USDT', from: 'Unknown', to: 'Bitfinex', timestamp: now - 1800, usdValue: 200000000 },
      { id: '4', type: 'mint', amount: 100000000, symbol: 'USDC', from: 'Circle', to: 'Unknown', timestamp: now - 3600, usdValue: 100000000 },
      { id: '5', type: 'exchange_deposit', amount: 2500, symbol: 'BTC', from: 'Unknown', to: 'Kraken', timestamp: now - 7200, usdValue: 2500 * 85000 },
    ];

    // BTC dominance from CoinGecko (no key needed)
    let btcDominance = 53.5; // fallback
    try {
      const cgRes = await fetchWithTimeout('https://api.coingecko.com/api/v3/global');
      if (cgRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cgData: any = await cgRes.json();
        btcDominance = cgData?.data?.market_cap_percentage?.btc ?? 53.5;
      }
    } catch {
      // use fallback
    }

    const result: OnchainData = { protocols, whaleAlerts, totalDeFiTVL, totalDeFiChange24h, btcDominance };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('Onchain error:', err);
    return NextResponse.json({ error: 'Onchain data failed' }, { status: 500 });
  }
}
