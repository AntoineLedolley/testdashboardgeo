import { NextRequest, NextResponse } from 'next/server';
import { OptionsFlow } from '@/types/options';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const yf2 = require('yahoo-finance2');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YFClass = yf2.default as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance: any = new YFClass();

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'AAPL';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = await yahooFinance.options(symbol);
    const unusualFlows: OptionsFlow[] = [];

    const expirations = chain?.expirationDates ?? [];

    // Process first 3 expirations to find unusual activity
    const toProcess = expirations.slice(0, 3);
    for (const expDate of toProcess) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expChain: any = await yahooFinance.options(symbol, { date: expDate });
        const calls = expChain?.options?.[0]?.calls ?? [];
        const puts = expChain?.options?.[0]?.puts ?? [];

        const expStr = new Date(expDate).toISOString().split('T')[0];

        for (const opt of [...calls, ...puts]) {
          const vol = opt.volume ?? 0;
          const oi = opt.openInterest ?? 1;
          const ratio = vol / oi;
          if (vol > 500 && ratio > 1.5) {
            const isCall = calls.includes(opt);
            unusualFlows.push({
              symbol,
              expiry: expStr,
              strike: opt.strike ?? 0,
              type: isCall ? 'call' : 'put',
              volume: vol,
              openInterest: oi,
              impliedVolatility: (opt.impliedVolatility ?? 0) * 100,
              lastPrice: opt.lastPrice ?? 0,
              volumeOiRatio: ratio,
              sentiment: isCall ? 'bullish' : 'bearish',
            });
          }
        }
      } catch {
        // skip expiration
      }
    }

    unusualFlows.sort((a, b) => b.volumeOiRatio - a.volumeOiRatio);

    return NextResponse.json({
      symbol,
      expirations: expirations.slice(0, 6).map((d: Date) => new Date(d).toISOString().split('T')[0]),
      unusualFlows: unusualFlows.slice(0, 20),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('Options flow error:', err);
    return NextResponse.json({ symbol, expirations: [], unusualFlows: [] });
  }
}
