'use client';
import { StockQuote, WatchlistEntry } from '@/types/stock';
import { formatPrice, formatPercent } from '@/lib/formatters';
import { useTradeStore } from '@/lib/store';

interface Props { entry: WatchlistEntry; quote: StockQuote | undefined; isActive: boolean; }

export default function WatchlistItem({ entry, quote, isActive }: Props) {
  const { setActiveSymbol, removeFromWatchlist } = useTradeStore();
  const isUp = (quote?.changePercent ?? 0) >= 0;

  return (
    <div
      onClick={() => setActiveSymbol(entry.symbol)}
      style={{
        display: 'flex', alignItems: 'center', padding: '8px 12px',
        cursor: 'pointer',
        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'background 0.1s', gap: '8px',
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '500', fontSize: '12px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {entry.symbol}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.name}
        </div>
      </div>

      {quote ? (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            ${formatPrice(quote.price)}
          </div>
          <div style={{ fontSize: '10px', fontWeight: '500', color: isUp ? 'var(--green)' : 'var(--red)' }}>
            {formatPercent(quote.changePercent)}
          </div>
        </div>
      ) : (
        <div style={{ width: '60px', height: '32px' }} className="skeleton" />
      )}

      <button
        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(entry.symbol); }}
        style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', padding: '2px', fontSize: '14px', lineHeight: 1,
          opacity: 0, transition: 'opacity 0.1s', flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
      >
        ×
      </button>
    </div>
  );
}
