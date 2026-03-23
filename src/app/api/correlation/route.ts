import { NextRequest, NextResponse } from 'next/server';
import { getChartData } from '@/lib/yahoo-finance';
import { ChartRange } from '@/types/chart';

function pearsonCorr(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const xa = x.slice(-n);
  const ya = y.slice(-n);
  const mx = xa.reduce((a, b) => a + b, 0) / n;
  const my = ya.reduce((a, b) => a + b, 0) / n;
  const num = xa.reduce((s, xi, i) => s + (xi - mx) * (ya[i] - my), 0);
  const den = Math.sqrt(
    xa.reduce((s, xi) => s + Math.pow(xi - mx, 2), 0) *
    ya.reduce((s, yi) => s + Math.pow(yi - my, 2), 0)
  );
  return den === 0 ? 0 : num / den;
}

export async function POST(req: NextRequest) {
  try {
    const { symbols, range }: { symbols: string[]; range: string } = await req.json();

    const closesBySymbol: Record<string, number[]> = {};

    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const data = await getChartData(sym, '1d', (range || '3mo') as ChartRange);
          closesBySymbol[sym] = data.candles.map((c) => c.close);
        } catch {
          // skip
        }
      })
    );

    const validSymbols = Object.keys(closesBySymbol);
    const matrix: { sym1: string; sym2: string; corr: number }[] = [];

    for (let i = 0; i < validSymbols.length; i++) {
      for (let j = 0; j < validSymbols.length; j++) {
        const sym1 = validSymbols[i];
        const sym2 = validSymbols[j];
        const corr = i === j ? 1 : pearsonCorr(closesBySymbol[sym1], closesBySymbol[sym2]);
        matrix.push({ sym1, sym2, corr: Math.round(corr * 100) / 100 });
      }
    }

    return NextResponse.json({ symbols: validSymbols, matrix });
  } catch (err) {
    console.error('Correlation error:', err);
    return NextResponse.json({ error: 'Correlation failed' }, { status: 500 });
  }
}
