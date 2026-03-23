import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yf2 = require('yahoo-finance2');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YFClass = yf2.default as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance: any = new YFClass();

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'AAPL';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(symbol, { newsCount: 5, quotesCount: 0 });
    const news: NewsItem[] = (result.news ?? []).map((n: any) => ({
      title: n.title ?? '',
      publisher: n.publisher ?? '',
      link: n.link ?? '',
      providerPublishTime: n.providerPublishTime ?? 0,
    }));
    return NextResponse.json({ news }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('News error:', err);
    return NextResponse.json({ news: [] });
  }
}
