'use client';
import { useTradeStore } from '@/lib/store';
import { useMultiQuote } from '@/hooks/useStockQuote';
import StockSearch from './StockSearch';
import WatchlistItem from './WatchlistItem';

export default function Sidebar() {
  const { watchlist, activeSymbol } = useTradeStore();
  const symbols = watchlist.map((w) => w.symbol);
  const { quotes } = useMultiQuote(symbols, 5000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border)' }}>
        <span style={{
          fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.8px',
        }}>Watchlist</span>
      </div>

      <StockSearch />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {watchlist.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
            Recherchez un titre à ajouter
          </div>
        ) : (
          watchlist.map((entry) => (
            <WatchlistItem
              key={entry.symbol}
              entry={entry}
              quote={quotes[entry.symbol]}
              isActive={entry.symbol === activeSymbol}
            />
          ))
        )}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quasi-temps réel · ~15s de délai</span>
      </div>
    </div>
  );
}
