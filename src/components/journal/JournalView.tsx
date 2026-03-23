'use client';
import { useState } from 'react';
import { useTradeStore } from '@/lib/store';
import { Trade } from '@/types/journal';
import { formatPrice } from '@/lib/formatters';

function generateId() { return Math.random().toString(36).slice(2, 10); }

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)/gm, '<li style="margin-left:14px;margin-bottom:3px">$1</li>')
    .replace(/^#{1,3} (.+)/gm, '<div style="font-weight:700;font-size:13px;margin:10px 0 4px;color:var(--text-primary)">$1</div>')
    .replace(/\n/g, '<br/>');
}

export default function JournalView() {
  const { trades, addTrade, removeTrade } = useTradeStore();
  const [form, setForm] = useState({ symbol: '', action: 'buy' as 'buy' | 'sell', quantity: '', price: '', notes: '' });
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function handleAdd() {
    if (!form.symbol || !form.quantity || !form.price) return;
    const trade: Trade = {
      id: generateId(),
      symbol: form.symbol.toUpperCase(),
      action: form.action,
      quantity: parseFloat(form.quantity),
      price: parseFloat(form.price),
      date: new Date().toISOString(),
      notes: form.notes,
    };
    addTrade(trade);
    setForm({ symbol: '', action: 'buy', quantity: '', price: '', notes: '' });
    setShowForm(false);
  }

  async function analyzeJournal() {
    if (!trades.length || analyzing) return;
    setAnalyzing(true);
    setAiAnalysis('');
    const tradesText = trades.map((t) =>
      `${new Date(t.date).toLocaleDateString('fr-FR')} — ${t.action.toUpperCase()} ${t.quantity} ${t.symbol} @ $${t.price}${t.notes ? ` | Note: ${t.notes}` : ''}`
    ).join('\n');

    const totalTrades = trades.length;
    const buys = trades.filter((t) => t.action === 'buy').length;
    const sells = trades.filter((t) => t.action === 'sell').length;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyse mon journal de trading et identifie mes biais, patterns comportementaux et axes d'amélioration :\n\n${tradesText}\n\nStats: ${totalTrades} trades, ${buys} achats, ${sells} ventes.`,
          }],
          context: {
            symbol: 'PORTFOLIO', interval: 'journal',
            currentPrice: 0, priceChange24h: 0, priceChangePercent: 0,
            dayHigh: 0, dayLow: 0, volume: 0,
            recentCandles: [], ma20: null, ma50: null,
          },
        }),
      });
      if (!res.ok || !res.body) throw new Error('Failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiAnalysis(accumulated);
      }
    } catch {
      setAiAnalysis('❌ Erreur lors de l\'analyse.');
    } finally {
      setAnalyzing(false);
    }
  }

  // P&L calculation (simplified)
  const pnlBySymbol: Record<string, number> = {};
  trades.forEach((t) => {
    const val = t.quantity * t.price * (t.action === 'buy' ? -1 : 1);
    pnlBySymbol[t.symbol] = (pnlBySymbol[t.symbol] ?? 0) + val;
  });

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* Left — trade list */}
      <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>📔 Journal de Trading</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{trades.length} trade{trades.length !== 1 ? 's' : ''} enregistré{trades.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '6px 12px', background: 'linear-gradient(135deg, var(--accent), #60a5fa)',
            border: 'none', borderRadius: '6px', color: 'white', fontWeight: '600', fontSize: '11px', cursor: 'pointer',
          }}>
            + Ajouter
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              {[
                { key: 'symbol', placeholder: 'Symbole (AAPL)', span: 1 },
                { key: 'price', placeholder: 'Prix ($)', span: 1 },
                { key: 'quantity', placeholder: 'Quantité', span: 1 },
              ].map(({ key, placeholder }) => (
                <input key={key} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '5px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none' }} />
              ))}
              <select value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as 'buy' | 'sell' }))}
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '5px', padding: '6px 8px', color: form.action === 'buy' ? 'var(--green)' : 'var(--red)', fontSize: '11px' }}>
                <option value="buy">🟢 Achat</option>
                <option value="sell">🔴 Vente</option>
              </select>
            </div>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optionnel)..." style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '5px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handleAdd} style={{ flex: 1, padding: '6px', background: 'var(--accent)', border: 'none', borderRadius: '5px', color: 'white', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}>Enregistrer</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '6px 12px', background: 'var(--bg-hover)', border: 'none', borderRadius: '5px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Trade list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {trades.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '12px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📔</div>
              Aucun trade enregistré.<br/>Ajoutez votre premier trade.
            </div>
          ) : (
            [...trades].reverse().map((trade) => (
              <div key={trade.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: trade.action === 'buy' ? 'rgba(0,212,170,0.15)' : 'rgba(255,77,106,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  {trade.action === 'buy' ? '🟢' : '🔴'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>{trade.symbol}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(trade.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {trade.action === 'buy' ? 'Achat' : 'Vente'} {trade.quantity} × ${formatPrice(trade.price)} = <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${formatPrice(trade.quantity * trade.price)}</span>
                  </div>
                  {trade.notes && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>{trade.notes}</div>}
                </div>
                <button onClick={() => removeTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>×</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right — AI analysis */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px' }}>🤖 Analyse IA de votre trading</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>Identification des biais et patterns comportementaux</div>
          </div>
          <button onClick={analyzeJournal} disabled={!trades.length || analyzing} style={{
            padding: '7px 14px', borderRadius: '6px', border: 'none',
            background: trades.length && !analyzing ? 'linear-gradient(135deg, var(--accent), #60a5fa)' : 'var(--bg-elevated)',
            color: trades.length && !analyzing ? 'white' : 'var(--text-muted)',
            fontWeight: '600', fontSize: '11px', cursor: trades.length && !analyzing ? 'pointer' : 'not-allowed',
          }}>
            {analyzing ? '⏳ Analyse...' : '⚡ Analyser'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {!aiAnalysis && !analyzing && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '60px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧠</div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Analyse comportementale IA</div>
              <div style={{ fontSize: '12px', maxWidth: '300px', margin: '0 auto' }}>Enregistrez vos trades et cliquez sur Analyser pour identifier vos biais, patterns et axes d'amélioration.</div>
            </div>
          )}
          {analyzing && !aiAnalysis && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '60px' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px', borderWidth: '3px' }} />
              <div style={{ fontSize: '12px' }}>Analyse en cours...</div>
            </div>
          )}
          {aiAnalysis && (
            <div className="animate-fade-in" style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '20px', fontSize: '12.5px', lineHeight: '1.7', color: 'var(--text-primary)',
            }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAnalysis) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
