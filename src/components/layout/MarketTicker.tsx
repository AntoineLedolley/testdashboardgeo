'use client';
import { useMultiQuote } from '@/hooks/useStockQuote';
import { formatPrice, formatPercent } from '@/lib/formatters';

const INDICES = [
  { symbol: '^GSPC',   label: 'S&P 500' },
  { symbol: '^NDX',    label: 'Nasdaq' },
  { symbol: '^DJI',    label: 'Dow' },
  { symbol: '^VIX',    label: 'VIX' },
  { symbol: 'GC=F',   label: 'Gold' },
  { symbol: 'BTC-USD', label: 'BTC' },
  { symbol: 'CL=F',   label: 'Oil' },
];

export default function MarketTicker() {
  const symbols = INDICES.map((i) => i.symbol);
  const { quotes } = useMultiQuote(symbols, 15000);

  return (
    <div style={{
      height: '28px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '0',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      flexShrink: 0,
    }}>
      {INDICES.map((idx, i) => {
        const q = quotes[idx.symbol];
        const isUp = (q?.changePercent ?? 0) >= 0;
        return (
          <div key={idx.symbol} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {i > 0 && <div style={{ width: '1px', height: '12px', background: 'var(--border)', margin: '0 14px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                {idx.label}
              </span>
              {q ? (
                <>
                  <span style={{
                    fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                  }}>
                    {idx.symbol === 'BTC-USD' ? `$${Math.round(q.price).toLocaleString()}` : formatPrice(q.price)}
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: '500',
                    color: isUp ? 'var(--green)' : 'var(--red)',
                  }}>
                    {isUp ? '+' : ''}{formatPercent(q.changePercent)}
                  </span>
                </>
              ) : (
                <div style={{ width: '60px', height: '10px', borderRadius: '3px' }} className="skeleton" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
