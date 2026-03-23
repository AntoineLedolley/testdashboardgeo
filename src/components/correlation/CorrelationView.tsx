'use client';
import { useState } from 'react';

interface CorrData { symbols: string[]; matrix: { sym1: string; sym2: string; corr: number }[]; }

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'BTC-USD', 'GLD'];

function corrColor(c: number): string {
  if (c >= 0.9) return 'rgba(0,212,170,0.85)';
  if (c >= 0.7) return 'rgba(0,212,170,0.55)';
  if (c >= 0.4) return 'rgba(0,212,170,0.25)';
  if (c >= -0.4) return 'rgba(136,136,168,0.2)';
  if (c >= -0.7) return 'rgba(255,77,106,0.25)';
  if (c >= -0.9) return 'rgba(255,77,106,0.55)';
  return 'rgba(255,77,106,0.85)';
}

function corrTextColor(c: number): string {
  return Math.abs(c) > 0.6 ? '#000' : 'var(--text-primary)';
}

export default function CorrelationView() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [range, setRange] = useState('3mo');
  const [data, setData] = useState<CorrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [newSym, setNewSym] = useState('');

  const runCorrelation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/correlation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, range }),
      });
      const d = await res.json();
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const addSymbol = () => {
    const s = newSym.toUpperCase().trim();
    if (s && !symbols.includes(s)) { setSymbols([...symbols, s]); }
    setNewSym('');
  };
  const removeSymbol = (s: string) => setSymbols(symbols.filter((x) => x !== s));

  const getCorr = (sym1: string, sym2: string) =>
    data?.matrix.find((m) => m.sym1 === sym1 && m.sym2 === sym2)?.corr ?? 0;

  const cellSize = Math.max(44, Math.min(64, 400 / (data?.symbols.length ?? 8)));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>🔗 Matrice de Corrélation</div>

        {/* Symbol chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {symbols.map((s) => (
            <span key={s} style={{ background: 'var(--bg-elevated)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {s}
              <button onClick={() => removeSymbol(s)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>

        {/* Add symbol + range + run */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input value={newSym} onChange={(e) => setNewSym(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && addSymbol()} placeholder="Ajouter un symbole…" style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}>
            {['1mo', '3mo', '6mo', '1y'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={runCorrelation} disabled={loading} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {loading ? '⟳' : 'Calculer'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '16px' }}>
        {!data && !loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔗</div>
            Sélectionnez des actifs et cliquez sur Calculer
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Calcul des corrélations…</div>}

        {data && !loading && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: cellSize, minWidth: cellSize }} />
                    {data.symbols.map((s) => (
                      <th key={s} style={{ width: cellSize, minWidth: cellSize, fontSize: '9px', color: 'var(--text-muted)', padding: '4px', textAlign: 'center', fontWeight: 600 }}>{s.replace('-USD', '')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.symbols.map((sym1) => (
                    <tr key={sym1}>
                      <td style={{ fontSize: '9px', color: 'var(--text-muted)', paddingRight: '8px', whiteSpace: 'nowrap', fontWeight: 600 }}>{sym1.replace('-USD', '')}</td>
                      {data.symbols.map((sym2) => {
                        const c = getCorr(sym1, sym2);
                        return (
                          <td key={sym2} style={{
                            width: cellSize, height: cellSize, textAlign: 'center',
                            background: corrColor(c), fontSize: '10px', fontWeight: 700,
                            color: corrTextColor(c), cursor: 'default',
                          }} title={`${sym1} vs ${sym2}: ${c.toFixed(2)}`}>
                            {c.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Corrélation :</span>
              {[[-1, 'Forte neg'], [-0.5, 'Neg'], [0, 'Nulle'], [0.5, 'Pos'], [1, 'Forte pos']].map(([c, label]) => (
                <div key={String(c)} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: corrColor(c as number) }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
