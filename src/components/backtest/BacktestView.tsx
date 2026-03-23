'use client';
import { useState } from 'react';
import { BacktestResult } from '@/types/backtest';

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function EquityCurve({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const w = 600; const h = 120; const pad = 10;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((d.value - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1].value >= 100000;
  const lineColor = isPositive ? '#00d4aa' : '#ff4d6a';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '120px', display: 'block' }}>
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Baseline $100k */}
      <line x1={pad} y1={h - pad - ((100000 - min) / range) * (h - 2 * pad)} x2={w - pad} y2={h - pad - ((100000 - min) / range) * (h - 2 * pad)} stroke="rgba(136,136,168,0.3)" strokeWidth="1" strokeDasharray="4,4" />
      {/* Fill */}
      <polygon points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} fill="url(#eq-grad)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2" />
    </svg>
  );
}

export default function BacktestView() {
  const [symbol, setSymbol] = useState('AAPL');
  const [fastMA, setFastMA] = useState('20');
  const [slowMA, setSlowMA] = useState('50');
  const [range, setRange] = useState('2y');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState('');

  const runBacktest = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), fastMA, slowMA, range }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data); }
    } catch { setError('Backtest échoué'); }
    setLoading(false);
  };

  const inputStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header + config */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>🔬 Backtesting — Croisement MA</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: '6px', marginBottom: '8px' }}>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol" style={inputStyle} />
          <input value={fastMA} onChange={(e) => setFastMA(e.target.value)} placeholder="Fast" style={inputStyle} type="number" />
          <input value={slowMA} onChange={(e) => setSlowMA(e.target.value)} placeholder="Slow" style={inputStyle} type="number" />
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{ ...inputStyle }}>
            {['1y', '2y', '3y', '5y'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button
          onClick={runBacktest}
          disabled={loading}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? '⟳ Calcul…' : '▶ Lancer le backtest'}
        </button>
        {error && <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>{error}</div>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📈</div>
            Configurez votre stratégie et lancez le backtest
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <div style={{ fontSize: '30px', marginBottom: '12px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <div>Récupération des données historiques et calcul des signaux…</div>
          </div>
        )}

        {result && (
          <>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {result.symbol} · {result.strategy} · {result.period}
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
              <StatCard label="Rendement total" value={`${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(1)}%`} color={result.totalReturn >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatCard label="Taux de réussite" value={`${result.winRate.toFixed(0)}%`} color={result.winRate >= 50 ? 'var(--green)' : 'var(--red)'} />
              <StatCard label="Rend. moyen" value={`${result.avgReturn >= 0 ? '+' : ''}${result.avgReturn.toFixed(1)}%`} color={result.avgReturn >= 0 ? 'var(--green)' : 'var(--red)'} />
              <StatCard label="Drawdown max" value={`-${result.maxDrawdown.toFixed(1)}%`} color="var(--red)" />
              <StatCard label="Ratio Sharpe" value={result.sharpeRatio.toFixed(2)} color={result.sharpeRatio >= 1 ? 'var(--green)' : result.sharpeRatio >= 0 ? 'var(--text-primary)' : 'var(--red)'} />
              <StatCard label="Trades" value={String(result.totalTrades)} />
            </div>

            {/* Equity curve */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Courbe de capital (départ 100 000 $)</div>
              <EquityCurve data={result.equityCurve} />
            </div>

            {/* Trades table */}
            {result.trades.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{result.trades.length} derniers trades</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr>
                      {['Entrée', 'Sortie', 'Achat', 'Vente', 'Rend.', 'Jours'].map((h) => (
                        <th key={h} style={{ textAlign: 'right', padding: '4px 6px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...result.trades].reverse().map((trade, i) => (
                      <tr key={i}>
                        <td style={{ padding: '5px 6px', color: 'var(--text-muted)', textAlign: 'right' }}>{trade.entryDate.slice(5)}</td>
                        <td style={{ padding: '5px 6px', color: 'var(--text-muted)', textAlign: 'right' }}>{trade.exitDate.slice(5)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--text-primary)' }}>${trade.entryPrice.toFixed(2)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--text-primary)' }}>${trade.exitPrice.toFixed(2)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: trade.returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {trade.returnPct >= 0 ? '+' : ''}{trade.returnPct.toFixed(1)}%
                        </td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--text-muted)' }}>{trade.holdingDays}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
