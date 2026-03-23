import 'server-only';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yf2 = require('yahoo-finance2');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YFClass = yf2.default as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance: any = new YFClass();

import { CandleData, ChartInterval, ChartRange, ChartMeta } from '@/types/chart';
import { StockQuote, SearchResult } from '@/types/stock';

const INTERVAL_MAP: Record<ChartInterval, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '1d': '1d',
  '1wk': '1wk',
  '1mo': '1mo',
};

// Map range → number of days back for period1
const RANGE_DAYS: Record<ChartRange, number> = {
  '1d': 1,
  '5d': 5,
  '1mo': 30,
  '3mo': 90,
  '6mo': 180,
  '1y': 365,
  '5y': 365 * 5,
};

function getPeriod1(range: ChartRange): Date {
  const d = new Date();
  d.setDate(d.getDate() - RANGE_DAYS[range]);
  return d;
}

export async function getChartData(
  symbol: string,
  interval: ChartInterval = '1d',
  range: ChartRange = '3mo'
): Promise<{ candles: CandleData[]; meta: ChartMeta }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await yahooFinance.chart(symbol, {
    interval: INTERVAL_MAP[interval],
    period1: getPeriod1(range),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes: any[] = result.quotes ?? [];
  const candles: CandleData[] = quotes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((q: any) => q.open != null && q.close != null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((q: any) => ({
      time: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? 0,
    }));

  return {
    candles,
    meta: {
      symbol: result.meta?.symbol ?? symbol,
      currency: result.meta?.currency ?? 'USD',
      exchangeName: result.meta?.exchangeName ?? '',
    },
  };
}

export async function getQuote(symbols: string[]): Promise<Record<string, StockQuote>> {
  const quotes: Record<string, StockQuote> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = await yahooFinance.quote(symbol);
        quotes[symbol] = {
          symbol,
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          volume: q.regularMarketVolume ?? 0,
          marketCap: q.marketCap ?? 0,
          dayHigh: q.regularMarketDayHigh ?? 0,
          dayLow: q.regularMarketDayLow ?? 0,
          open: q.regularMarketOpen ?? 0,
          previousClose: q.regularMarketPreviousClose ?? 0,
        };
      } catch {
        // skip failed symbols
      }
    })
  );
  return quotes;
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await yahooFinance.search(query, { newsCount: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result.quotes ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    .slice(0, 8)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((q: any) => ({
      symbol: q.symbol,
      shortname: q.shortname ?? q.symbol,
      exchDisp: q.exchDisp ?? '',
      typeDisp: q.quoteType ?? '',
    }));
}
