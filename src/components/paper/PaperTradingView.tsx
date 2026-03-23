'use client';
import { useEffect, useState, useCallback } from 'react';
import { PaperPortfolio, PaperOrder } from '@/types/paper';
import { userKey } from '@/lib/auth';

const INITIAL_PORTFOLIO: PaperPortfolio = {
  cash: 100000, equity: 0, totalValue: 100000,
  dayPL: 0, totalPL: 0, initialCash: 100000,
  positions: {}, orders: [],
};

function loadPortfolio(): PaperPortfolio {
  if (typeof window === 'undefined') return INITIAL_PORTFOLIO;
  try { const v = localStorage.getItem(userKey('paper_portfolio')); return v ? JSON.parse(v) : INITIAL_PORTFOLIO; } catch { return INITIAL_PORTFOLIO; }
}
function savePortfolio(p: PaperPortfolio) {
  if (typeof window !== 'undefined') localStorage.setItem(userKey('paper_portfolio'), JSON.stringify(p));
}

function formatMoney(n: number) { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }

export default function PaperTradingView() {
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(INITIAL_PORTFOLIO);
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quotes, setQuotes] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'positions' | 'orders'>('positions');

  useEffect(() => { setPortfolio(loadPortfolio()); }, []);

  // Poll quotes for positions
  const updateQuotes = useCallback(async (positions: string[]) => {
    if (positions.length === 0) return;
    try {
      const res = await fetch(`/api/stock/quote?symbols=${positions.join(',')}`);
      const data = await res.json();
      const newQuotes: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(data.quotes ?? {}).forEach(([sym, q]: [string, any]) => { newQuotes[sym] = q.price ?? 0; });
      setQuotes(newQuotes);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const syms = Object.keys(portfolio.positions);
    updateQuotes(syms);
    const interval = setInterval(() => updateQuotes(syms), 5000);
    return () => clearInterval(interval);
  }, [portfolio.positions, updateQuotes]);

  // Compute live portfolio value
  const livePortfolio = { ...portfolio };
  let liveEquity = 0;
  const livePositions = { ...portfolio.positions };
  for (const [sym, pos] of Object.entries(livePositions)) {
    const currentPrice = quotes[sym] ?? pos.avgPrice;
    const marketValue = pos.qty * currentPrice;
    const unrealizedPL = (currentPrice - pos.avgPrice) * pos.qty;
    const unrealizedPLPct = ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
    livePositions[sym] = { ...pos, currentPrice, marketValue, unrealizedPL, unrealizedPLPct };
    liveEquity += marketValue;
  }
  livePortfolio.equity = liveEquity;
  livePortfolio.totalValue = portfolio.cash + liveEquity;
  livePortfolio.totalPL = livePortfolio.totalValue - portfolio.initialCash;

  const plColor = livePortfolio.totalPL >= 0 ? 'var(--green)' : 'var(--red)';

  const handleOrder = async () => {
    setError(''); setSuccess('');
    const q = parseInt(qty);
    if (!symbol || isNaN(q) || q <= 0) { setError('Entrez un symbole et une quantité valides'); return; }

    // Fetch current price
    try {
      const res = await fetch(`/api/stock/quote?symbols=${symbol.toUpperCase()}`);
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const price: number = (data.quotes?.[symbol.toUpperCase()] as any)?.price ?? 0;
      if (!price) { setError('Impossible de récupérer le prix pour ' + symbol.toUpperCase()); return; }

      const total = price * q;
      const sym = symbol.toUpperCase();
      let newPortfolio = { ...portfolio };

      if (side === 'buy') {
        if (total > newPortfolio.cash) { setError(`Liquidités insuffisantes (besoin de ${formatMoney(total)}, disponible : ${formatMoney(newPortfolio.cash)})`); return; }
        newPortfolio.cash -= total;
        const existing = newPortfolio.positions[sym];
        if (existing) {
          const newQty = existing.qty + q;
          const newAvg = (existing.avgPrice * existing.qty + price * q) / newQty;
          newPortfolio.positions = { ...newPortfolio.positions, [sym]: { ...existing, qty: newQty, avgPrice: newAvg, currentPrice: price, marketValue: newQty * price, unrealizedPL: (price - newAvg) * newQty, unrealizedPLPct: ((price - newAvg) / newAvg) * 100 } };
        } else {
          newPortfolio.positions = { ...newPortfolio.positions, [sym]: { symbol: sym, qty: q, avgPrice: price, currentPrice: price, marketValue: total, unrealizedPL: 0, unrealizedPLPct: 0 } };
        }
      } else {
        const pos = newPortfolio.positions[sym];
        if (!pos || pos.qty < q) { setError(`Pas assez d'actions (vous en avez ${pos?.qty ?? 0})`); return; }
        newPortfolio.cash += total;
        const newQty = pos.qty - q;
        if (newQty === 0) {
          const { [sym]: _, ...rest } = newPortfolio.positions;
          newPortfolio.positions = rest;
        } else {
          newPortfolio.positions = { ...newPortfolio.positions, [sym]: { ...pos, qty: newQty, marketValue: newQty * price } };
        }
      }

      const order: PaperOrder = { id: Date.now().toString(), symbol: sym, side, qty: q, price, total, timestamp: Date.now(), status: 'filled' };
      newPortfolio.orders = [order, ...newPortfolio.orders].slice(0, 50);
      savePortfolio(newPortfolio);
      setPortfolio(newPortfolio);
      setSuccess(`${side === 'buy' ? 'ACHAT' : 'VENTE'} ${q} ${sym} @ ${formatMoney(price)}`);
      setSymbol(''); setQty('');
    } catch { setError('Ordre échoué'); }
  };

  const resetPortfolio = () => {
    if (!confirm('Réinitialiser le portfolio à 100 000 $ ? Toutes les positions et l\'historique seront perdus.')) return;
    savePortfolio(INITIAL_PORTFOLIO);
    setPortfolio(INITIAL_PORTFOLIO);
    setQuotes({});
  };

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header stats */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>📊 Paper Trading</div>
          <button onClick={resetPortfolio} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>Réinitialiser</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'Valeur totale', value: formatMoney(livePortfolio.totalValue), color: 'var(--text-primary)' },
            { label: 'Liquidités', value: formatMoney(portfolio.cash), color: 'var(--text-primary)' },
            { label: 'Actions', value: formatMoney(liveEquity), color: 'var(--text-primary)' },
            { label: 'P&L Total', value: formatMoney(livePortfolio.totalPL), color: plColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Order form */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passer un Ordre</div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          {(['buy', 'sell'] as const).map((s) => (
            <button key={s} onClick={() => setSide(s)} style={{
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: side === s ? (s === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--bg-elevated)',
              color: side === s ? '#000' : 'var(--text-muted)',
            }}>{s === 'buy' ? '▲ Achat' : '▼ Vente'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbole (AAPL)" style={{ ...inputStyle, flex: 1 }} />
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qté" style={{ ...inputStyle, width: '80px', flex: 'none' }} type="number" min="1" />
        </div>
        <button onClick={handleOrder} style={{
          width: '100%', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
          background: side === 'buy' ? 'var(--green)' : 'var(--red)',
          color: '#000', fontWeight: 700, fontSize: '12px',
        }}>
          {side === 'buy' ? '▲ ACHAT' : '▼ VENTE'} — Ordre au Marché
        </button>
        {error && <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>{error}</div>}
        {success && <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '4px' }}>✓ {success}</div>}
      </div>

      {/* Tabs + content */}
      <div style={{ display: 'flex', gap: '2px', padding: '8px 16px 0', flexShrink: 0 }}>
        {(['positions', 'orders'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '4px 12px', fontSize: '11px', borderRadius: '4px 4px 0 0',
            background: tab === t ? 'var(--bg-surface)' : 'transparent',
            border: 'none', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: tab === t ? 600 : 400,
          }}>
            {t === 'positions' ? `Positions (${Object.keys(livePositions).length})` : `Ordres (${portfolio.orders.length})`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {tab === 'positions' && (
          Object.keys(livePositions).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Aucune position ouverte</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  {['Symbole', 'Qté', 'Moy.', 'Dernier', 'Valeur', 'P&L'].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Symbol' ? 'left' : 'right', padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(livePositions).map((pos) => (
                  <tr key={pos.symbol}>
                    <td style={{ padding: '7px 4px', color: 'var(--accent)', fontWeight: 600 }}>{pos.symbol}</td>
                    <td style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--text-primary)' }}>{pos.qty}</td>
                    <td style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--text-muted)' }}>${pos.avgPrice.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--text-primary)' }}>${pos.currentPrice.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--text-primary)' }}>{formatMoney(pos.marketValue)}</td>
                    <td style={{ textAlign: 'right', padding: '7px 4px', color: pos.unrealizedPL >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {formatMoney(pos.unrealizedPL)}<br />
                      <span style={{ fontSize: '10px' }}>{formatPct(pos.unrealizedPLPct)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'orders' && (
          portfolio.orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Aucun ordre passé</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px' }}>
              {portfolio.orders.map((order) => (
                <div key={order.id} style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: order.side === 'buy' ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: '11px', marginRight: '6px' }}>{order.side.toUpperCase()}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '11px' }}>{order.symbol}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> × {order.qty}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>@ ${order.price.toFixed(2)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(order.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
