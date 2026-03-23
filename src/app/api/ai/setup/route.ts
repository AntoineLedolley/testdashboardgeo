import { NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { getQuote, getChartData } from '@/lib/yahoo-finance';
import { formatPercent, formatPrice } from '@/lib/formatters';
import { calcMA, calcRSI } from '@/lib/indicators';

const SCAN_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'INTC', 'AVGO',
  'JPM', 'GS', 'BAC', 'V', 'MA',
  'XOM', 'CVX', 'COP',
  'JNJ', 'PFE', 'ABBV', 'UNH',
  'NFLX', 'DIS', 'SPOT',
  'SPY', 'QQQ', 'IWM',
  'BTC-USD', 'ETH-USD',
];

export async function GET() {
  try {
    const quotes = await getQuote(SCAN_SYMBOLS);

    // Find top movers (abs change > 2%)
    const movers = Object.entries(quotes)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([sym, q]: [string, any]) => ({ sym, chg: q.changePercent ?? 0, price: q.price ?? 0, volume: q.volume ?? 0 }))
      .filter((m) => Math.abs(m.chg) > 1)
      .sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))
      .slice(0, 8);

    // Fetch chart data for top 5 movers
    const chartDetails: string[] = [];
    for (const mover of movers.slice(0, 5)) {
      try {
        const chartData = await getChartData(mover.sym, '1d', '3mo');
        const candles = chartData.candles;
        const ma20 = calcMA(candles, 20);
        const ma50 = calcMA(candles, 50);
        const rsi = calcRSI(candles, 14);
        const lastMA20 = ma20[ma20.length - 1]?.value;
        const lastMA50 = ma50[ma50.length - 1]?.value;
        const lastRSI = rsi[rsi.length - 1]?.value;
        const lastCandle = candles[candles.length - 1];

        chartDetails.push(
          `${mover.sym}: $${formatPrice(mover.price)} (${formatPercent(mover.chg)}) | ` +
          `MA20: $${lastMA20?.toFixed(2) ?? 'N/A'} | MA50: $${lastMA50?.toFixed(2) ?? 'N/A'} | ` +
          `RSI: ${lastRSI?.toFixed(1) ?? 'N/A'} | ` +
          `Range: $${lastCandle?.low?.toFixed(2)}-$${lastCandle?.high?.toFixed(2)}`
        );
      } catch {
        chartDetails.push(`${mover.sym}: $${formatPrice(mover.price)} (${formatPercent(mover.chg)})`);
      }
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const prompt = `Today is ${today}. Here are the top moving stocks with technical data:

${chartDetails.join('\n')}

All market snapshot:
${Object.entries(quotes).slice(0, 20).map(([sym, q]: [string, any]) => `${sym}: $${formatPrice(q.price)} ${formatPercent(q.changePercent)}`).join('\n')}

Generate exactly 3 high-conviction trade setups. For each setup use this format:

## Setup 1: [SYMBOL] — [Long/Short] — [Setup Name]
**Entry:** $[price range]
**Stop Loss:** $[price] ([%] risk)
**Target:** $[price] ([%] reward)
**Risk/Reward:** [ratio]
**Thesis:** [2-3 sentence technical + momentum rationale]
**Timeframe:** [intraday/swing/position]

Be specific with price levels. Only include setups with R/R > 2:1.`;

    const stream = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 800,
      system: 'You are a professional trading desk quant analyst. You identify high-probability trade setups with specific entry, stop, and target levels based on technical analysis.',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (err) {
    console.error('AI Setup error:', err);
    return NextResponse.json({ error: 'AI Setup failed' }, { status: 500 });
  }
}
