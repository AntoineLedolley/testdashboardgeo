import { NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { getQuote } from '@/lib/yahoo-finance';
import { formatPercent, formatPrice } from '@/lib/formatters';

const BRIEFING_SYMBOLS = [
  'SPY', 'QQQ', 'IWM', 'DIA',
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD',
  'BTC-USD', 'ETH-USD',
  'GC=F', 'CL=F', '^VIX',
];

export async function GET() {
  try {
    const quotes = await getQuote(BRIEFING_SYMBOLS);

    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const marketSnapshot = Object.entries(quotes)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([sym, q]: [string, any]) => `${sym}: $${formatPrice(q.price)} (${formatPercent(q.changePercent)})`)
      .join('\n');

    // Find top movers
    const entries = Object.entries(quotes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([sym, q]: [string, any]) => ({ sym, chg: q.changePercent ?? 0 }));
    const topGainers = [...entries].sort((a, b) => b.chg - a.chg).slice(0, 3);
    const topLosers = [...entries].sort((a, b) => a.chg - b.chg).slice(0, 3);

    const prompt = `Nous sommes le ${today}.

Données de marché en temps réel :
${marketSnapshot}

Meilleures hausses : ${topGainers.map((e) => `${e.sym} +${e.chg.toFixed(2)}%`).join(', ')}
Principales baisses : ${topLosers.map((e) => `${e.sym} ${e.chg.toFixed(2)}%`).join(', ')}

Génère un briefing matinal IA concis pour un trader. Structure :
1. **Vue d'ensemble du marché** — tonalité globale (risk-on/risk-off), performance des indices
2. **Mouvements notables** — explique pourquoi ces titres bougent (rotation sectorielle, catalyseur news, macro)
3. **Niveaux clés** — supports & résistances critiques SPY/QQQ pour aujourd'hui
4. **Setups de trading** — 2-3 setups concrets avec entrée/stop/objectif
5. **Facteurs de risque** — ce qu'il faut surveiller aujourd'hui (événements, résultats, macro)

Sois précis, factuel et actionnable. Maximum 400 mots. Réponds exclusivement en français.`;

    const stream = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      system: 'Tu es un analyste d\'élite d\'un desk de trading buy-side. Tes briefings matinaux sont concis, factuels et actionnables. Tu réponds toujours en français.',
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
    console.error('Briefing error:', err);
    return NextResponse.json({ error: 'Briefing failed' }, { status: 500 });
  }
}
