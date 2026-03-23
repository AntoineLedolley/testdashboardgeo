import { NextRequest, NextResponse } from 'next/server';
import { searchStocks } from '@/lib/yahoo-finance';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? '';

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchStocks(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ results: [] });
  }
}
