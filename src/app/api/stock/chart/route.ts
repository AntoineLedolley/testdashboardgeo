import { NextRequest, NextResponse } from 'next/server';
import { getChartData } from '@/lib/yahoo-finance';
import { ChartInterval, ChartRange } from '@/types/chart';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol')?.toUpperCase() ?? 'AAPL';
  const interval = (searchParams.get('interval') ?? '1d') as ChartInterval;
  const range = (searchParams.get('range') ?? '3mo') as ChartRange;

  try {
    const data = await getChartData(symbol, interval, range);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('Chart error:', err);
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
