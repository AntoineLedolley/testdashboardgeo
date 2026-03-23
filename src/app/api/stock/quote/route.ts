import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/lib/yahoo-finance';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbolsParam = searchParams.get('symbols') ?? 'AAPL';
  const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase()).slice(0, 10);

  try {
    const quotes = await getQuote(symbols);
    return NextResponse.json(quotes, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=5' },
    });
  } catch (err) {
    console.error('Quote error:', err);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
