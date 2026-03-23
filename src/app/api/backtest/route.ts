import { NextRequest, NextResponse } from 'next/server';
import { getChartData } from '@/lib/yahoo-finance';
import { BacktestResult, BacktestTrade } from '@/types/backtest';

function calcSMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

export async function POST(req: NextRequest) {
  try {
    const { symbol, fastMA, slowMA, range } = await req.json();
    const fast = parseInt(fastMA) || 20;
    const slow = parseInt(slowMA) || 50;

    const chartData = await getChartData(symbol, '1d', range || '2y');
    const candles = chartData.candles;

    if (!candles || candles.length < slow + 5) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 400 });
    }

    const closes = candles.map((c) => c.close);
    const dates = candles.map((c) => new Date(c.time * 1000).toISOString().split('T')[0]);
    const fastMA_arr = calcSMA(closes, fast);
    const slowMA_arr = calcSMA(closes, slow);

    const trades: BacktestTrade[] = [];
    let inTrade = false;
    let entryPrice = 0;
    let entryDate = '';
    let cash = 100000;
    const equityCurve: { date: string; value: number }[] = [];
    let shares = 0;

    for (let i = 1; i < candles.length; i++) {
      const prevFast = fastMA_arr[i - 1];
      const prevSlow = slowMA_arr[i - 1];
      const currFast = fastMA_arr[i];
      const currSlow = slowMA_arr[i];

      if (!prevFast || !prevSlow || !currFast || !currSlow) {
        equityCurve.push({ date: dates[i], value: cash });
        continue;
      }

      // Golden cross → buy
      if (!inTrade && prevFast <= prevSlow && currFast > currSlow) {
        inTrade = true;
        entryPrice = closes[i];
        entryDate = dates[i];
        shares = Math.floor(cash / entryPrice);
        cash -= shares * entryPrice;
      }
      // Death cross → sell
      else if (inTrade && prevFast >= prevSlow && currFast < currSlow) {
        const exitPrice = closes[i];
        const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
        const entry = new Date(entryDate);
        const exit = new Date(dates[i]);
        const holdingDays = Math.round((exit.getTime() - entry.getTime()) / 86400000);
        trades.push({ entryDate, exitDate: dates[i], entryPrice, exitPrice, side: 'long', returnPct, holdingDays });
        cash += shares * exitPrice;
        shares = 0;
        inTrade = false;
      }

      const portfolioValue = cash + shares * closes[i];
      equityCurve.push({ date: dates[i], value: portfolioValue });
    }

    // Close open position
    if (inTrade && shares > 0) {
      const lastClose = closes[closes.length - 1];
      cash += shares * lastClose;
      equityCurve[equityCurve.length - 1] = { date: dates[dates.length - 1], value: cash };
    }

    const totalReturn = ((cash - 100000) / 100000) * 100;
    const winTrades = trades.filter((t) => t.returnPct > 0);
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const avgReturn = trades.length > 0 ? trades.reduce((a, t) => a + t.returnPct, 0) / trades.length : 0;

    // Max drawdown
    let peak = 100000;
    let maxDrawdown = 0;
    for (const point of equityCurve) {
      if (point.value > peak) peak = point.value;
      const dd = ((peak - point.value) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Sharpe (simplified, annualized)
    const returns = equityCurve.slice(1).map((p, i) => (p.value - equityCurve[i].value) / equityCurve[i].value);
    const avgDailyReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((a, r) => a + Math.pow(r - avgDailyReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;

    const result: BacktestResult = {
      symbol,
      strategy: `MA${fast}/${slow} Crossover`,
      period: range || '2y',
      totalTrades: trades.length,
      winRate,
      avgReturn,
      maxDrawdown,
      totalReturn,
      sharpeRatio,
      trades: trades.slice(-20), // last 20 trades
      equityCurve,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Backtest error:', err);
    return NextResponse.json({ error: 'Backtest failed' }, { status: 500 });
  }
}
