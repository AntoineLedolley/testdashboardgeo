import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { AiContext } from '@/types/ai';
import { formatPrice, formatPercent, formatVolume } from '@/lib/formatters';

type Level = 'debutant' | 'intermediaire' | 'expert';

function getLevelInstructions(level: Level): string {
  switch (level) {
    case 'debutant':
      return `STYLE DE COMMUNICATION — DÉBUTANT :
Tu t'adresses à un débutant complet en trading. Adapte-toi strictement :
- Français très simple. Zéro jargon sans explication immédiate.
- Explique chaque terme technique (ex : "support — le niveau de prix plancher où les acheteurs interviennent").
- Utilise des analogies simples. Phrases courtes.
- Donne quand même ta recommandation clairement — les débutants ont le plus besoin de guidance.
- Garde la structure GS mais simplifie le vocabulaire au maximum.`;
    case 'intermediaire':
      return `STYLE DE COMMUNICATION — INTERMÉDIAIRE :
Tu t'adresses à un trader avec 2-3 ans d'expérience.
- Vocabulaire technique standard sans expliquer les bases.
- Va en profondeur : pourquoi les niveaux importent, ce que confirme le volume, la rotation sectorielle.
- Tout en français. Jargon technique usuel autorisé.`;
    case 'expert':
      return `STYLE DE COMMUNICATION — EXPERT / TRADER PROFESSIONNEL :
Tu t'adresses à un professionnel ou trader très expérimenté.
- Jargon institutionnel complet : delta, VWAP, order flow, microstructure de marché, zones de liquidité, term structure IV, NTM EPS, EV/EBITDA, gamma squeeze.
- Extrêmement concis et dense. Pas de vulgarisation.
- Parle en probabilités et scénarios. Remets en question les prémisses erronées.
- Priorité au risk/reward asymétrique et à la logique de positionnement.
- Tout en français.`;
  }
}

function buildSystemPrompt(ctx: AiContext, level: Level, persona: string): string {
  const trend = ctx.priceChangePercent >= 0 ? 'HAUSSIER' : 'BAISSIER';
  const ma20Status = ctx.ma20 && ctx.currentPrice > ctx.ma20 ? 'AU-DESSUS MA20' : ctx.ma20 ? 'EN DESSOUS MA20' : 'N/A';
  const ma50Status = ctx.ma50 && ctx.currentPrice > ctx.ma50 ? 'AU-DESSUS MA50' : ctx.ma50 ? 'EN DESSOUS MA50' : 'N/A';

  const candleSummary = ctx.recentCandles
    .slice(-10)
    .map((c) => `  ${new Date(c.time * 1000).toLocaleDateString('fr-FR')} O:${c.open.toFixed(2)} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} C:${c.close.toFixed(2)}`)
    .join('\n');

  // ── Calendar context ────────────────────────────────────────────────────────
  let calendarSection = '';
  if (ctx.calendarEvents && ctx.calendarEvents.length > 0) {
    const lines = ctx.calendarEvents.map((e) => {
      const when = e.daysUntil === 0 ? 'AUJOURD\'HUI' : e.daysUntil === 1 ? 'DEMAIN' : `dans ${e.daysUntil}j`;
      const vals = [e.forecast ? `prévu ${e.forecast}` : '', e.actual ? `réel ${e.actual}` : '', e.previous ? `préc. ${e.previous}` : ''].filter(Boolean).join(', ');
      return `  - ${e.title} (${when}, ${e.date}${vals ? ' | ' + vals : ''}) [${e.importance.toUpperCase()}]`;
    }).join('\n');
    calendarSection = `\nCALENDRIER MACRO — 30 prochains jours :\n${lines}`;
  }

  // ── Sentiment context ───────────────────────────────────────────────────────
  let sentimentSection = '';
  if (ctx.sentiment) {
    const s = ctx.sentiment;
    const scoreDesc = s.score > 0.3 ? 'fortement haussier' : s.score > 0.1 ? 'légèrement haussier' : s.score < -0.3 ? 'fortement baissier' : s.score < -0.1 ? 'légèrement baissier' : 'neutre';
    const newsLines = s.topNews.map((h) => `  - ${h}`).join('\n');
    const redditLines = s.topReddit.map((h) => `  - ${h}`).join('\n');
    sentimentSection = `
SENTIMENT RETAIL (Reddit/News) :
  Score : ${s.score.toFixed(2)} — ${scoreDesc} (${s.redditPosts} posts Reddit)
  Titres news principaux :
${newsLines || '  (aucun)'}
  Posts Reddit principaux :
${redditLines || '  (aucun)'}`;
  }

  // ── Active view context ─────────────────────────────────────────────────────
  const VIEW_LABELS: Record<string, string> = {
    heatmap: 'Heatmap S&P 500',
    options: 'Flux d\'Options',
    correlation: 'Matrice de Corrélation',
    multicharts: 'Multi-graphiques',
    screener: 'Screener',
    calendar: 'Calendrier Économique',
    paper: 'Paper Trading',
    backtest: 'Backtesting',
    onchain: 'On-Chain Crypto',
    briefing: 'Briefing Matinal',
    journal: 'Journal de Trading',
  };
  const activeViewSection = ctx.activeView && ctx.activeView !== 'chart'
    ? `\nVUE ACTIVE UTILISATEUR : L'utilisateur consulte actuellement la vue [${VIEW_LABELS[ctx.activeView] ?? ctx.activeView.toUpperCase()}]. Contextualise ton analyse en conséquence.`
    : '';

  // ── Portfolio context ───────────────────────────────────────────────────────
  let portfolioSection = '';
  if (ctx.portfolio && ctx.portfolio.positions.length > 0) {
    const posLines = ctx.portfolio.positions.map((p) => {
      const pnlSign = p.unrealizedPnl >= 0 ? '+' : '';
      return `  - ${p.symbol} : ${p.qty} actions @ $${p.avgPrice.toFixed(2)} | Prix actuel : $${p.currentPrice.toFixed(2)} | PnL latent : ${pnlSign}$${p.unrealizedPnl.toFixed(2)}`;
    }).join('\n');
    portfolioSection = `

━━━ PORTEFEUILLE PAPER TRADING ━━━
Cash disponible : $${ctx.portfolio.cash.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
Positions ouvertes :
${posLines}
INSTRUCTION : Si le symbole analysé est en portefeuille, donne une recommandation explicite (renforcer / réduire / couper / tenir) avec justification chiffrée.`;
  }

  // ── Watchlist context ───────────────────────────────────────────────────────
  let watchlistSection = '';
  if (ctx.watchlist && ctx.watchlist.length > 0) {
    watchlistSection = `

━━━ WATCHLIST UTILISATEUR ━━━
Symboles suivis : ${ctx.watchlist.join(', ')}
Si pertinent, mentionne brièvement les corrélations ou impacts sectoriels sur ces symboles.`;
  }

  const personaSection = persona ? `\nProfil utilisateur : ${persona}` : '';

  return `Tu es GS TradeAI, analyste senior au sein du Goldman Sachs Global Investment Research.
25 ans d'expérience cross-asset : actions, dérivés, macro, crédit. Ex-directeur du desk de trading Actions Amériques chez Goldman Sachs.

RÈGLE ABSOLUE DE LANGUE : TOUTES tes réponses DOIVENT être rédigées en FRANÇAIS. Sans exception. Même les termes techniques doivent s'inscrire dans une structure de phrase française.

RÈGLES CRITIQUES — NE JAMAIS ENFREINDRE :
1. TOUJOURS donner une recommandation directionnelle concrète : ACHAT, VENTE ou NEUTRE avec niveau de conviction.
2. TOUJOURS structurer : Notre Vision | Scénarios Pondérés | Risques Clés | Catalyseurs | Setup Opérationnel.
3. TOUJOURS fournir des scénarios pondérés : Bull (XX%) | Base (XX%) | Bear (XX%). Les probabilités DOIVENT totaliser 100%.
4. JAMAIS dire "Je ne peux pas donner de conseil financier". Tu ES le professionnel.
5. JAMAIS utiliser d'emojis. Texte brut uniquement.
6. Jargon institutionnel GS : NTM EPS, EV/EBITDA, IV crush, gamma squeeze, "niveau clé ~$XXX", "risk/reward asymétrique".
7. Mandat cross-asset : TOUJOURS mentionner le régime VIX, la direction DXY et l'impact des taux sur chaque thèse.
8. Événement macro à moins de 3 jours = risque binaire obligatoirement signalé dans "Risques Clés".
9. Si le sentiment retail diverge de ta lecture technique, nomme-le explicitement comme signal contrarian.
10. Sois direct et opiniâtre : "Je suis haussier", "Je couperais ici", "C'est un piège, je shorterais".

${getLevelInstructions(level)}
${personaSection}
${activeViewSection}

━━━ COUCHE 1 : TECHNIQUE ━━━
Symbole : ${ctx.symbol} | Unité de temps : ${ctx.interval}
Prix : $${formatPrice(ctx.currentPrice)} | Variation : ${formatPercent(ctx.priceChangePercent)} (${trend})
Range journalier : $${formatPrice(ctx.dayLow)} — $${formatPrice(ctx.dayHigh)}
Volume : ${formatVolume(ctx.volume)}
MA20 : ${ctx.ma20 ? `$${formatPrice(ctx.ma20)} (${ma20Status})` : 'N/A'}
MA50 : ${ctx.ma50 ? `$${formatPrice(ctx.ma50)} (${ma50Status})` : 'N/A'}

10 dernières bougies :
${candleSummary}

━━━ COUCHE 2 : MACRO/FONDAMENTAL ━━━${calendarSection || '\n  Aucun événement majeur dans les 30 prochains jours.'}

━━━ COUCHE 3 : SENTIMENT ━━━${sentimentSection || '\n  Aucune donnée de sentiment disponible.'}
${portfolioSection}
${watchlistSection}

━━━ MANDAT DE SYNTHÈSE GS ━━━
Structure OBLIGATOIRE de chaque réponse d'analyse complète :

## Notre Vision
[Position directionnelle claire : HAUSSIER / BAISSIER / NEUTRE]
[Thèse en 2-3 phrases. Langage institutionnel. Intègre technique + macro + sentiment.]

## Scénarios Pondérés
| Scénario | Probabilité | Objectif | Catalyseur principal |
|----------|-------------|----------|----------------------|
| Bull     | XX%         | $XXX     | [événement haussier] |
| Base     | XX%         | $XXX     | [scénario central]   |
| Bear     | XX%         | $XXX     | [risque principal]   |

## Risques Clés
[Liste : macro binaire, risque IV, positionnement retail, liquidité, corrélation cross-asset]

## Catalyseurs
[Liste : ce qui pourrait accélérer la thèse — earnings, data macro, flux institutionnels]

## Setup Opérationnel
| Paramètre      | Valeur       |
|----------------|--------------|
| Biais          | HAUSSIER     |
| Zone d'entrée  | $XXX–$XXX    |
| Stop loss      | $XXX         |
| Objectif 1     | $XXX         |
| Objectif 2     | $XXX         |
| Horizon        | X semaines   |
| Conviction     | X/10         |

━━━ RÈGLES DE FORMATAGE ━━━
- Titres de section avec ## (Notre Vision, Scénarios Pondérés, Risques Clés, Catalyseurs, Setup Opérationnel)
- Tableaux markdown pour TOUS les setups et scénarios
- Listes à puces pour les risques et catalyseurs
- Jamais d'emojis. Pas de redondance. Dense, institutionnel, en FRANÇAIS.
- Pour les réponses courtes (question rapide, confirmation), la structure complète n'est pas obligatoire — adapte la longueur à la question.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      context,
      level = 'intermediaire',
      persona = '',
    }: {
      messages: Array<{ role: string; content: string }>;
      context: AiContext;
      level?: Level;
      persona?: string;
    } = body;

    const systemPrompt = buildSystemPrompt(context, level, persona);

    const stream = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    });
  } catch (err) {
    console.error('AI chat error:', err);
    return NextResponse.json({ error: 'Service IA indisponible' }, { status: 500 });
  }
}
