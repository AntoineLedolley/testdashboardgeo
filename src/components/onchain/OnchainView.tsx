'use client';
import { useEffect, useState } from 'react';
import { OnchainData, DeFiProtocol, WhaleAlert } from '@/types/onchain';

function formatTVL(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

const WHALE_ICONS: Record<string, string> = {
  transfer: '➡️', exchange_deposit: '📥', exchange_withdrawal: '📤', mint: '🪙', burn: '🔥',
};

export default function OnchainView() {
  const [data, setData] = useState<OnchainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'protocols' | 'whales'>('protocols');

  const refresh = () => {
    setLoading(true);
    fetch('/api/crypto/onchain').then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>⛓️ On-Chain Crypto</div>
          <button onClick={refresh} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>↻</button>
        </div>

        {/* Stats row */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>TVL DeFi</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatTVL(data.totalDeFiTVL)}</div>
              <div style={{ fontSize: '10px', color: data.totalDeFiChange24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {data.totalDeFiChange24h >= 0 ? '+' : ''}{data.totalDeFiChange24h.toFixed(1)}%
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Dominance BTC</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f7931a' }}>{data.btcDominance.toFixed(1)}%</div>
            </div>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Protocoles</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.protocols.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', padding: '8px 16px 0', flexShrink: 0 }}>
        {(['protocols', 'whales'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '4px 12px', fontSize: '11px', borderRadius: '4px 4px 0 0',
            background: tab === t ? 'var(--bg-surface)' : 'transparent',
            border: 'none', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: tab === t ? 600 : 400,
          }}>
            {t === 'protocols' ? '🏛️ Protocoles DeFi' : '🐋 Alertes Baleines'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Chargement des données on-chain…</div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Échec du chargement des données</div>
        ) : tab === 'protocols' ? (
          <div style={{ paddingTop: '8px' }}>
            {data.protocols.map((p: DeFiProtocol) => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: '4px', background: 'var(--bg-surface)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.chain} · {p.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatTVL(p.tvl)}</div>
                    <div style={{ fontSize: '10px', color: p.tvlChange24h >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {p.tvlChange24h >= 0 ? '+' : ''}{p.tvlChange24h.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ paddingTop: '8px' }}>
            {data.whaleAlerts.map((alert: WhaleAlert) => (
              <div key={alert.id} style={{ padding: '10px', marginBottom: '6px', background: 'var(--bg-surface)', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '14px', marginRight: '6px' }}>{WHALE_ICONS[alert.type] ?? '📊'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {alert.amount.toLocaleString()} {alert.symbol}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      (~{formatTVL(alert.usdValue)})
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    il y a {Math.round((Date.now() / 1000 - alert.timestamp) / 60)}min
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {alert.from} → {alert.to}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
