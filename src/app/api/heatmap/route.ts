import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/yahoo-finance';

// Market cap weights in $B (hardcoded for tile sizing — live price fetched separately)
const SECTORS = [
  {
    name: 'Technology',
    stocks: [
      { symbol: 'AAPL',  name: 'Apple',        mcap: 3100 },
      { symbol: 'MSFT',  name: 'Microsoft',     mcap: 2900 },
      { symbol: 'NVDA',  name: 'NVIDIA',        mcap: 2200 },
      { symbol: 'AVGO',  name: 'Broadcom',      mcap: 780 },
      { symbol: 'AMD',   name: 'AMD',           mcap: 230 },
      { symbol: 'ORCL',  name: 'Oracle',        mcap: 320 },
      { symbol: 'INTC',  name: 'Intel',         mcap: 140 },
    ],
  },
  {
    name: 'Communication',
    stocks: [
      { symbol: 'META',   name: 'Meta',         mcap: 1400 },
      { symbol: 'GOOGL',  name: 'Alphabet',     mcap: 2000 },
      { symbol: 'NFLX',   name: 'Netflix',      mcap: 310 },
      { symbol: 'DIS',    name: 'Disney',       mcap: 190 },
      { symbol: 'CMCSA',  name: 'Comcast',      mcap: 140 },
    ],
  },
  {
    name: 'Consumer Discret.',
    stocks: [
      { symbol: 'AMZN',  name: 'Amazon',        mcap: 2100 },
      { symbol: 'TSLA',  name: 'Tesla',         mcap: 700 },
      { symbol: 'HD',    name: 'Home Depot',    mcap: 360 },
      { symbol: 'MCD',   name: "McDonald's",    mcap: 210 },
      { symbol: 'NKE',   name: 'Nike',          mcap: 90 },
    ],
  },
  {
    name: 'Financials',
    stocks: [
      { symbol: 'BRK-B', name: 'Berkshire',     mcap: 960 },
      { symbol: 'JPM',   name: 'JPMorgan',      mcap: 580 },
      { symbol: 'V',     name: 'Visa',          mcap: 510 },
      { symbol: 'MA',    name: 'Mastercard',    mcap: 420 },
      { symbol: 'GS',    name: 'Goldman',       mcap: 170 },
      { symbol: 'BAC',   name: 'BofA',          mcap: 310 },
    ],
  },
  {
    name: 'Health Care',
    stocks: [
      { symbol: 'LLY',   name: 'Eli Lilly',     mcap: 750 },
      { symbol: 'UNH',   name: 'UnitedHealth',  mcap: 490 },
      { symbol: 'JNJ',   name: 'J&J',           mcap: 380 },
      { symbol: 'ABBV',  name: 'AbbVie',        mcap: 310 },
      { symbol: 'PFE',   name: 'Pfizer',        mcap: 150 },
    ],
  },
  {
    name: 'Consumer Staples',
    stocks: [
      { symbol: 'WMT',   name: 'Walmart',       mcap: 680 },
      { symbol: 'COST',  name: 'Costco',        mcap: 390 },
      { symbol: 'PG',    name: 'P&G',           mcap: 360 },
      { symbol: 'KO',    name: 'Coca-Cola',     mcap: 260 },
      { symbol: 'PEP',   name: 'PepsiCo',       mcap: 210 },
    ],
  },
  {
    name: 'Industrials',
    stocks: [
      { symbol: 'CAT',   name: 'Caterpillar',   mcap: 190 },
      { symbol: 'GE',    name: 'GE',            mcap: 180 },
      { symbol: 'RTX',   name: 'RTX Corp',      mcap: 160 },
      { symbol: 'LMT',   name: 'Lockheed',      mcap: 130 },
      { symbol: 'UPS',   name: 'UPS',           mcap: 110 },
    ],
  },
  {
    name: 'Energy',
    stocks: [
      { symbol: 'XOM',   name: 'ExxonMobil',    mcap: 470 },
      { symbol: 'CVX',   name: 'Chevron',       mcap: 260 },
      { symbol: 'COP',   name: 'ConocoPhillips',mcap: 140 },
      { symbol: 'SLB',   name: 'Schlumberger',  mcap: 60 },
    ],
  },
];

export interface HeatmapStock {
  symbol: string;
  name: string;
  mcap: number;
  price: number;
  changePercent: number;
}

export interface HeatmapSector {
  name: string;
  totalMcap: number;
  changePercent: number;
  stocks: HeatmapStock[];
}

export async function GET() {
  try {
    const allSymbols = SECTORS.flatMap((s) => s.stocks.map((st) => st.symbol));
    const quotes = await getQuote(allSymbols);

    const sectors: HeatmapSector[] = SECTORS.map((sector) => {
      const stocks: HeatmapStock[] = sector.stocks.map((st) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = quotes[st.symbol] as any;
        return {
          symbol: st.symbol,
          name: st.name,
          mcap: st.mcap,
          price: q?.price ?? 0,
          changePercent: q?.changePercent ?? 0,
        };
      });

      const totalMcap = stocks.reduce((s, st) => s + st.mcap, 0);
      // Weighted average % change by market cap
      const changePercent = totalMcap > 0
        ? stocks.reduce((s, st) => s + st.changePercent * st.mcap, 0) / totalMcap
        : 0;

      return { name: sector.name, totalMcap, changePercent, stocks };
    });

    return NextResponse.json({ sectors }, {
      headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('Heatmap error:', err);
    return NextResponse.json({ error: 'Heatmap failed' }, { status: 500 });
  }
}
