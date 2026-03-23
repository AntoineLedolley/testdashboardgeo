import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { CandleData } from '@/types/chart';
import { formatPrice } from '@/lib/formatters';

export async function POST(req: NextRequest) {
  try {
    const { symbol, candles, ma20, ma50 }: {
      symbol: string;
      candles: CandleData[];
      ma20: number | null;
      ma50: number | null;
    } = await req.json();

    const last30 = candles.slice(-30);
    const candleText = last30
      .map((c) => `${new Date(c.time * 1000).toLocaleDateString('fr-FR')} O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)} V:${(c.volume / 1e6).toFixed(1)}M`)
      .join('\n');

    const currentPrice = last30[last30.length - 1]?.close ?? 0;

    const prompt = `Analyse les 30 derniers chandeliers de ${symbol} ($${formatPrice(currentPrice)}) et identifie TOUS les patterns techniques présents.

Données OHLCV :
${candleText}

MA20: ${ma20 ? `$${formatPrice(ma20)}` : 'N/A'} | MA50: ${ma50 ? `$${formatPrice(ma50)}` : 'N/A'}

Détecte et explique :
1. **Patterns de chandeliers** (marteau, étoile filante, doji, englobant, etc.)
2. **Patterns chartistes** (double top/bottom, tête-épaules, wedge, triangle, canal)
3. **Signaux de momentum** (divergences, épuisement de tendance)
4. **Zones clés** (supports, résistances, niveaux psychologiques)
5. **Biais directionnel** (haussier / baissier / neutre) avec probabilité

Sois précis et cite les prix exacts.`;

    const stream = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: 'Tu es un expert en analyse technique chartiste avec 20 ans d\'expérience. Tu identifies les patterns avec précision chirurgicale.',
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

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('Patterns error:', err);
    return NextResponse.json({ error: 'Pattern detection failed' }, { status: 500 });
  }
}
