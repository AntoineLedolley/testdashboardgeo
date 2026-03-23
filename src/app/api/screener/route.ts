import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { getQuote } from '@/lib/yahoo-finance';
import { formatPrice, formatPercent, formatVolume } from '@/lib/formatters';

const SCREENER_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'INTC', 'AVGO',
  'JPM', 'GS', 'BAC', 'V', 'MA', 'PYPL', 'BRK-B', 'WFC', 'AXP', 'C',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG',
  'JNJ', 'PFE', 'ABBV', 'UNH', 'MRK',
  'WMT', 'HD', 'COST', 'TGT', 'NKE',
  'BA', 'CAT', 'GE', 'LMT', 'RTX',
  'NFLX', 'DIS', 'SPOT', 'RBLX', 'SNAP',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI',
  'BTC-USD', 'ETH-USD',
];

export async function POST(req: NextRequest) {
  try {
    const { query, customSymbols } = await req.json();
    const symbols = customSymbols?.length ? customSymbols : SCREENER_SYMBOLS;

    // Fetch all quotes in parallel (batch of 20 max to avoid rate limits)
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += 20) batches.push(symbols.slice(i, i + 20));
    const allQuotes: Record<string, unknown> = {};
    for (const batch of batches) {
      const batchQuotes = await getQuote(batch);
      Object.assign(allQuotes, batchQuotes);
    }

    // Build market snapshot text
    const snapshot = Object.entries(allQuotes)
      .map(([sym, q]: [string, any]) =>
        `${sym}: $${formatPrice(q.price)} ${formatPercent(q.changePercent)} Vol:${formatVolume(q.volume)} MCap:${q.marketCap > 1e12 ? (q.marketCap / 1e12).toFixed(1) + 'T' : q.marketCap > 1e9 ? (q.marketCap / 1e9).toFixed(1) + 'B' : '-'}`
      )
      .join('\n');

    const systemPrompt = `You are an elite stock screener AI. You analyze real-time market data and identify stocks matching specific criteria.

Today's market data:
${snapshot}

Instructions:
- Analyze the data above carefully
- Identify stocks that match the user's screening criteria
- For each match, explain WHY it matches with specific data points
- Rank results by relevance
- Also highlight any notable anomalies or opportunities you spot
- Be concise but data-driven
- Format as a clean list with bullet points`;

    const stream = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: query || 'Identifie les meilleures opportunités du marché aujourd\'hui' }],
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

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('Screener error:', err);
    return NextResponse.json({ error: 'Screener failed' }, { status: 500 });
  }
}
