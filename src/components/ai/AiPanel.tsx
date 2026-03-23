'use client';
import { useRef, useEffect, KeyboardEvent, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTradeStore, PanelTab } from '@/lib/store';
import { useStockQuote } from '@/hooks/useStockQuote';
import { useStockData } from '@/hooks/useStockData';
import { useAiChat, TraderLevel } from '@/hooks/useAiChat';
import { useSentiment } from '@/hooks/useSentiment';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { getLastMA } from '@/lib/indicators';
import { formatPrice } from '@/lib/formatters';
import { AiContext, AiSentiment, AiPortfolio } from '@/types/ai';
import { userKey } from '@/lib/auth';
import AiMessage from './AiMessage';
import AlertManager from '@/components/alerts/AlertManager';
import SentimentPanel from '@/components/sentiment/SentimentPanel';

// Dynamic imports
const CandlestickChart = dynamic(() => import('@/components/chart/CandlestickChart'), { ssr: false });

// ─── Persona storage ──────────────────────────────────────────────────────────
function loadPersona(): { level: TraderLevel; persona: string } {
  if (typeof window === 'undefined') return { level: 'intermediaire', persona: '' };
  try { const v = localStorage.getItem(userKey('ai_persona')); return v ? JSON.parse(v) : { level: 'intermediaire', persona: '' }; } catch { return { level: 'intermediaire', persona: '' }; }
}
function savePersona(p: { level: TraderLevel; persona: string }) {
  if (typeof window !== 'undefined') localStorage.setItem(userKey('ai_persona'), JSON.stringify(p));
}

// ─── Portfolio loader from paper trading localStorage ─────────────────────────
function loadPaperPortfolio(): AiPortfolio | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const v = localStorage.getItem(userKey('paper_portfolio'));
    if (!v) return undefined;
    const p = JSON.parse(v);
    const positions = Object.values(p.positions ?? {}).map((pos: unknown) => {
      const position = pos as { symbol: string; qty: number; avgPrice: number; currentPrice?: number; unrealizedPL?: number };
      return {
        symbol: position.symbol,
        qty: position.qty,
        avgPrice: position.avgPrice,
        currentPrice: position.currentPrice ?? position.avgPrice,
        unrealizedPnl: position.unrealizedPL ?? 0,
      };
    });
    return { cash: p.cash ?? 0, positions };
  } catch {
    return undefined;
  }
}

// ─── Icon components (monochrome SVG) ─────────────────────────────────────────
function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
    </svg>
  );
}
function IconCompress() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 1v4H1M13 5H9V1M9 13v-4h4M1 9h4v4" />
    </svg>
  );
}

// ─── SetupPanel ───────────────────────────────────────────────────────────────
function SetupPanel() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setContent(''); setLoading(true);
    try {
      const res = await fetch('/api/ai/setup', { signal: abortRef.current.signal });
      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setContent((p) => p + dec.decode(value, { stream: true }));
      }
    } catch (e: unknown) { if ((e as Error)?.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { generate(); return () => abortRef.current?.abort(); }, [generate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top 3 configurations — {new Date().toLocaleDateString('fr-FR')}</div>
        <button onClick={generate} disabled={loading} style={{ fontSize: '10px', color: 'var(--accent)', background: 'transparent', border: '1px solid var(--border-bright)', borderRadius: '4px', padding: '2px 7px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : 'Actualiser'}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', fontSize: '11.5px', lineHeight: 1.6 }}>
        {loading && !content && <div style={{ color: 'var(--text-muted)' }}>Analyse du marché en cours...</div>}
        {content && (
          <div className="md-body" style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^## (.+)/gm, '<div class="md-h2">$1</div>')
            .replace(/^### (.+)/gm, '<div class="md-h3">$1</div>')
            .replace(/^[-*] (.+)/gm, '<div class="md-li">$1</div>')
            .replace(/\n/g, '')
          }} />
        )}
      </div>
    </div>
  );
}

// ─── PersonaPanel ─────────────────────────────────────────────────────────────
const LEVELS: { key: TraderLevel; label: string; desc: string }[] = [
  { key: 'debutant',      label: 'Débutant',       desc: 'Langage simple, chaque terme expliqué' },
  { key: 'intermediaire', label: 'Intermédiaire',   desc: 'Jargon standard, analyse approfondie' },
  { key: 'expert',        label: 'Expert',          desc: 'Jargon pro complet, dense, sans compromis' },
];

function PersonaPanel({ level, persona, onSave }: { level: TraderLevel; persona: string; onSave: (l: TraderLevel, p: string) => void }) {
  const [lvl, setLvl] = useState<TraderLevel>(level);
  const [per, setPer] = useState(persona);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Niveau d&apos;analyste</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' }}>
        {LEVELS.map((l) => {
          const isActive = lvl === l.key;
          return (
            <button key={l.key} onClick={() => setLvl(l.key)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '6px',
              border: `1px solid ${isActive ? 'var(--border-bright)' : 'var(--border)'}`,
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: isActive ? 'var(--accent)' : 'var(--bg-elevated)', border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border-bright)'}` }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{l.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{l.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Votre profil (optionnel)</div>
      <textarea
        value={per}
        onChange={(e) => setPer(e.target.value)}
        placeholder={`Ex : "Swing trader, actions US, compte 50k$, horizon 1-2 semaines"`}
        rows={3}
        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '12px' }}
      />

      <button onClick={() => onSave(lvl, per)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-bright)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
        Appliquer
      </button>
    </div>
  );
}

// ─── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'Analyse complète + setup',
  'Supports & résistances clés',
  'Détecter les patterns',
  'Signal haussier ou baissier ?',
  'Impact news & sentiment',
  'Objectif de prix & stop',
];

// PanelTab is exported from @/lib/store — no local definition needed

// ─── AiPanel ──────────────────────────────────────────────────────────────────
interface AiPanelProps {
  onClose?: () => void;
  activeView?: string;
}

export default function AiPanel({ onClose, activeView }: AiPanelProps) {
  const { activeSymbol, interval, showMA20, showMA50, showBollinger, watchlist, aiPanelTab: tab, setAiPanelTab: setTab } = useTradeStore();
  const { quote } = useStockQuote(activeSymbol);
  const { data } = useStockData(activeSymbol, interval, '3mo');
  const { data: sentimentData } = useSentiment(activeSymbol);
  const { upcoming: calendarEvents } = useCalendarEvents();
  const { messages, isStreaming, inputText, setInputText, sendMessage, clearMessages } = useAiChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [traderLevel, setTraderLevel] = useState<TraderLevel>('intermediaire');
  const [persona, setPersona] = useState('');
  const [personaSaved, setPersonaSaved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const saved = loadPersona();
    setTraderLevel(saved.level);
    setPersona(saved.persona);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close fullscreen on Escape
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.stopPropagation();
          setIsFullscreen(false);
        }
      }
    }
    if (isFullscreen) window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isFullscreen]);

  function buildContext(): AiContext {
    const candles = data?.candles ?? [];
    let sentiment: AiSentiment | undefined;
    if (sentimentData) {
      const score = sentimentData.sentimentScore;
      sentiment = {
        score,
        label: score > 0.2 ? 'Bullish' : score < -0.2 ? 'Bearish' : 'Neutral',
        redditPosts: sentimentData.reddit.length,
        topNews: sentimentData.news.slice(0, 3).map((n) => `${n.title} (${n.publisher})`),
        topReddit: sentimentData.reddit.slice(0, 3).map((p) => `[${p.score}pts] ${p.title}`),
      };
    }

    const portfolio = loadPaperPortfolio();
    const watchlistSymbols = watchlist.map((w) => w.symbol).filter((s) => s !== activeSymbol);

    return {
      symbol: activeSymbol, interval,
      currentPrice: quote?.price ?? 0,
      priceChange24h: quote?.change ?? 0,
      priceChangePercent: quote?.changePercent ?? 0,
      dayHigh: quote?.dayHigh ?? 0, dayLow: quote?.dayLow ?? 0,
      volume: quote?.volume ?? 0,
      recentCandles: candles.slice(-20),
      ma20: getLastMA(candles, 20), ma50: getLastMA(candles, 50),
      calendarEvents: calendarEvents.length > 0 ? calendarEvents : undefined,
      sentiment,
      activeView,
      portfolio: portfolio && portfolio.positions.length > 0 ? portfolio : undefined,
      watchlist: watchlistSymbols.length > 0 ? watchlistSymbols : undefined,
    };
  }

  function handleSend() {
    if (!inputText.trim() || isStreaming) return;
    sendMessage(inputText, buildContext(), traderLevel, persona);
  }
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }
  function handleQuickPrompt(prompt: string) {
    const ctx = buildContext();
    if (prompt === 'Détecter les patterns') {
      sendMessage('Détecte tous les patterns techniques sur les 30 dernières bougies. Donne une recommandation directionnelle claire avec entrée, stop, objectif.', ctx, traderLevel, persona);
      return;
    }
    if (prompt === 'Impact news & sentiment') {
      sendMessage(`Analyse l'impact combiné des dernières news + sentiment Reddit + calendrier macro sur ${activeSymbol}. Donne une position directionnelle unifiée.`, ctx, traderLevel, persona);
      return;
    }
    sendMessage(prompt, ctx, traderLevel, persona);
  }
  function handleSavePersona(l: TraderLevel, p: string) {
    setTraderLevel(l); setPersona(p);
    savePersona({ level: l, persona: p });
    setPersonaSaved(true);
    setTimeout(() => setPersonaSaved(false), 2000);
    setTab('chat');
  }

  const levelLabels: Record<TraderLevel, string> = { debutant: 'Débutant', intermediaire: 'Interméd.', expert: 'Expert' };
  const levelColors: Record<TraderLevel, string> = { debutant: '#4ade80', intermediaire: '#fbbf24', expert: '#f472b6' };

  const TABS: { key: PanelTab; label: string }[] = [
    { key: 'chat', label: 'Chat' },
    { key: 'setup', label: 'Setups' },
    { key: 'sentiment', label: 'Sentiment' },
    { key: 'alerts', label: 'Alertes' },
    { key: 'perso', label: 'Profil' },
  ];

  // ── Chat panel content (reused in both normal + fullscreen) ─────────────────
  const chatContent = (
    <>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg, idx) => (
          <AiMessage key={msg.id} message={msg} isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {!isStreaming && (
        <div style={{ padding: '6px 10px', display: 'flex', gap: '4px', flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
          {QUICK_PROMPTS.map((prompt) => (
            <button key={prompt} onClick={() => handleQuickPrompt(prompt)}
              style={{ padding: '3px 8px', fontSize: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '20px', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            >{prompt}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {sentimentData && (
          <div style={{ marginBottom: '6px', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Sentiment</span>
            <span style={{ color: sentimentData.sentimentScore > 0.2 ? 'var(--green)' : sentimentData.sentimentScore < -0.2 ? 'var(--red)' : 'var(--text-muted)', fontWeight: '600' }}>
              {sentimentData.sentimentScore > 0.2 ? 'Haussier' : sentimentData.sentimentScore < -0.2 ? 'Baissier' : 'Neutre'}
            </span>
            <span>· {sentimentData.news.length} news · {sentimentData.reddit.length} posts</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: '8px', padding: '8px 10px' }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Analyse ${activeSymbol}...`}
            disabled={isStreaming}
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '12px', resize: 'none', lineHeight: '1.5', minHeight: '20px', maxHeight: '80px', overflowY: 'auto' }}
          />
          <button onClick={handleSend} disabled={!inputText.trim() || isStreaming}
            style={{ width: '26px', height: '26px', borderRadius: '5px', background: inputText.trim() && !isStreaming ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', cursor: inputText.trim() && !isStreaming ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, color: '#fff' }}>
            {isStreaming ? <div className="spinner" style={{ width: '12px', height: '12px' }} /> : '↑'}
          </button>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</div>
      </div>
    </>
  );

  // ── Header (reused) ──────────────────────────────────────────────────────────
  const header = (
    <div style={{ padding: '10px 12px 0', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', background: 'var(--bg-hover)', border: '1px solid var(--border-bright)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: 'var(--accent)' }}>GS</div>
          <span style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-primary)' }}>GS TradeAI</span>
          <span style={{ fontSize: '9px', fontWeight: 600, color: levelColors[traderLevel], background: `${levelColors[traderLevel]}18`, borderRadius: '3px', padding: '1px 5px', border: `1px solid ${levelColors[traderLevel]}30` }}>
            {levelLabels[traderLevel]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {quote && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{activeSymbol} · ${formatPrice(quote.price)}</span>}
          {tab === 'chat' && <button onClick={clearMessages} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}>Effacer</button>}
          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 5px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            {isFullscreen ? <IconCompress /> : <IconExpand />}
          </button>
          {/* Close panel button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Fermer le panneau"
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, transition: 'all 0.12s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            >×</button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '5px 2px', background: 'transparent', border: 'none',
            borderBottom: tab === t.key ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            fontSize: '10px', fontWeight: tab === t.key ? '500' : '400',
            color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap', position: 'relative',
          }}>
            {t.label}
            {t.key === 'perso' && personaSaved && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--green)' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Tab body ─────────────────────────────────────────────────────────────────
  function tabBody() {
    if (tab === 'alerts')    return <AlertManager />;
    if (tab === 'sentiment') return <SentimentPanel symbol={activeSymbol} />;
    if (tab === 'setup')     return <SetupPanel />;
    if (tab === 'perso')     return <PersonaPanel level={traderLevel} persona={persona} onSave={handleSavePersona} />;
    return chatContent;
  }

  // ── Fullscreen layout ────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'row',
        background: 'var(--bg-base)',
      }}>
        {/* Left — live chart */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'baseline', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{activeSymbol}</span>
            {quote && (
              <>
                <span style={{ fontSize: '26px', fontWeight: '600', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>${formatPrice(quote.price)}</span>
                <span style={{ fontSize: '13px', color: (quote.changePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: '500' }}>
                  {(quote.changePercent ?? 0) >= 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%
                </span>
              </>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {data?.candles && (
              <CandlestickChart
                candles={data.candles}
                chartType="line"
                showMA20={showMA20}
                showMA50={showMA50}
                showRSI={false}
                showMACD={false}
                showBollinger={showBollinger}
              />
            )}
            {!data?.candles && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '12px' }}>
                Chargement du graphique...
              </div>
            )}
          </div>
        </div>

        {/* Right — chat panel (wider in fullscreen) */}
        <div style={{ width: '520px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', overflow: 'hidden' }}>
          {header}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {tabBody()}
          </div>
        </div>
      </div>
    );
  }

  // ── Normal layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)' }}>
      {header}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tabBody()}
      </div>
    </div>
  );
}
