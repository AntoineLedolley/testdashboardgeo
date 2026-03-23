'use client';
import { useState, useRef, useEffect } from 'react';

const PRESET_QUERIES = [
  'Actions avec le plus fort momentum haussier aujourd\'hui',
  'Titres oversold (fort potentiel de rebond)',
  'Blue chips avec volume anormalement élevé',
  'Actions tech sous-valorisées',
  'Meilleures opportunités crypto du moment',
  'Valeurs défensives pour protéger mon portefeuille',
];

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(59,130,246,0.15);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>')
    .replace(/^- (.+)/gm, '<li style="margin-left:14px;margin-bottom:3px">$1</li>')
    .replace(/^#{1,3} (.+)/gm, '<div style="font-weight:700;font-size:13px;margin:12px 0 6px;color:var(--text-primary)">$1</div>')
    .replace(/\n/g, '<br/>');
}

export default function ScreenerView() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultRef.current) resultRef.current.scrollTop = resultRef.current.scrollHeight;
  }, [result]);

  async function runScreener(q: string) {
    if (loading) return;
    setQuery(q);
    setResult('');
    setLoading(true);

    try {
      const res = await fetch('/api/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok || !res.body) throw new Error('Failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResult(accumulated);
      }
    } catch {
      setResult('❌ Erreur lors du screening. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>🔍 Screener IA</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          Décrivez en langage naturel les actions que vous cherchez. L'IA analyse {'>'}50 titres en temps réel.
        </div>

        {/* Query input */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && query.trim() && runScreener(query)}
            placeholder="Ex: actions tech avec fort volume et momentum haussier..."
            style={{
              flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
              borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
            }}
          />
          <button
            onClick={() => query.trim() && runScreener(query)}
            disabled={loading || !query.trim()}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, var(--accent), #60a5fa)',
              color: 'white', fontWeight: '600', fontSize: '12px',
              opacity: loading || !query.trim() ? 0.5 : 1,
            }}
          >
            {loading ? '...' : 'Scanner'}
          </button>
        </div>

        {/* Presets */}
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESET_QUERIES.map((p) => (
            <button
              key={p}
              onClick={() => runScreener(p)}
              disabled={loading}
              style={{
                padding: '3px 8px', fontSize: '10px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {p.length > 40 ? p.slice(0, 40) + '…' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      <div ref={resultRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {!result && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Screener IA prêt</div>
            <div style={{ fontSize: '12px' }}>Choisissez un preset ou tapez votre critère</div>
          </div>
        )}
        {loading && !result && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '60px' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px', borderWidth: '3px' }} />
            <div style={{ fontSize: '12px' }}>Analyse de {'>'}50 titres en cours...</div>
          </div>
        )}
        {result && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '20px', fontSize: '12.5px', lineHeight: '1.7', color: 'var(--text-primary)',
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
          />
        )}
      </div>
    </div>
  );
}
