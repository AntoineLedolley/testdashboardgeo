'use client';
import { useEffect, useState } from 'react';
import { useTradeStore } from '@/lib/store';
import { OptionsFlow } from '@/types/options';

export default function OptionsFlowView() {
  const { activeSymbol } = useTradeStore();
  const [flows, setFlows] = useState<OptionsFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expirations, setExpirations] = useState<string[]>([]);

  const fetch_ = async (sym: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/options-flow?symbol=${sym}`);
      const data = await res.json();
      setFlows(data.unusualFlows ?? []);
      setExpirations(data.expirations ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch_(activeSymbol); }, [activeSymbol]);

  const calls = flows.filter((f) => f.type === 'call');
  const puts = flows.filter((f) => f.type === 'put');
  const callVolume = calls.reduce((s, f) => s + f.volume, 0);
  const putVolume = puts.reduce((s, f) => s + f.volume, 0);
  const total = callVolume + putVolume || 1;
  const callPct = (callVolume / total) * 100;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>⚡ Flux d&apos;Options — {activeSymbol}</div>
          <button onClick={() => fetch_(activeSymbol)} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>↻</button>
        </div>

        {/* Call/Put ratio bar */}
        {flows.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--green)' }}>Calls {callPct.toFixed(0)}%</span>
              <span style={{ color: 'var(--red)' }}>Puts {(100 - callPct).toFixed(0)}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--red)', overflow: 'hidden' }}>
              <div style={{ width: `${callPct}%`, height: '100%', background: 'var(--green)', transition: 'width 0.5s' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Chargement du flux d&apos;options…</div>
        ) : flows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>⚡</div>
            Aucune activité d&apos;options inhabituelle détectée pour {activeSymbol}
            {expirations.length === 0 && <div style={{ marginTop: '8px', fontSize: '11px' }}>Les données d&apos;options peuvent ne pas être disponibles pour ce symbole</div>}
          </div>
        ) : (
          <>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', marginTop: '8px' }}>
              {flows.length} flux inhabituels · Expirations : {expirations.slice(0, 4).join(', ')}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', minWidth: '400px' }}>
                <thead>
                  <tr>
                    {['Type', 'Strike', 'Expiry', 'Vol', 'OI', 'V/OI', 'VI', 'Dernier'].map((h) => (
                      <th key={h} style={{ textAlign: 'right', padding: '5px 6px', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flows.map((flow, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        <span style={{
                          background: flow.type === 'call' ? 'rgba(0,212,170,0.15)' : 'rgba(255,77,106,0.15)',
                          color: flow.type === 'call' ? 'var(--green)' : 'var(--red)',
                          borderRadius: '3px', padding: '1px 5px', fontWeight: 700, fontSize: '10px',
                        }}>{flow.type.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-primary)' }}>${flow.strike}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-muted)' }}>{flow.expiry.slice(5)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-primary)' }}>{flow.volume.toLocaleString()}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-muted)' }}>{flow.openInterest.toLocaleString()}</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{flow.volumeOiRatio.toFixed(1)}x</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-muted)' }}>{flow.impliedVolatility.toFixed(0)}%</td>
                      <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-primary)' }}>${flow.lastPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
