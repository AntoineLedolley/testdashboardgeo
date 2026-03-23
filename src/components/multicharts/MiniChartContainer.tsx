'use client';
import dynamic from 'next/dynamic';
import { useTradeStore } from '@/lib/store';
import { useStockData } from '@/hooks/useStockData';
import { useStockQuote } from '@/hooks/useStockQuote';
import { formatPrice, formatPercent } from '@/lib/formatters';

const CandlestickChart = dynamic(() => import('@/components/chart/CandlestickChart'), { ssr: false });

interface Props {
  symbol: string;
  index: number;
}

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ', 'AMD'];

export default function MiniChartContainer({ symbol, index }: Props) {
  const { setMultiChartSymbol, setActiveSymbol, setActiveView } = useTradeStore();
  const { data, loading } = useStockData(symbol, '1d', '1mo');
  const { quote } = useStockQuote(symbol, 8000);
  const isUp = (quote?.changePercent ?? 0) >= 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)', borderRadius: '8px',
      overflow: 'hidden', background: 'var(--bg-surface)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={symbol}
            onChange={(e) => setMultiChartSymbol(index, e.target.value)}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px', padding: '2px 4px', cursor: 'pointer' }}
          >
            {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {quote && (
            <>
              <span style={{ fontWeight: '700', fontSize: '12px', fontFamily: 'monospace' }}>${formatPrice(quote.price)}</span>
              <span style={{ fontSize: '10px', color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: '600' }}>{formatPercent(quote.changePercent)}</span>
            </>
          )}
        </div>
        <button
          title="Ouvrir en plein écran"
          onClick={() => { setActiveSymbol(symbol); setActiveView('chart'); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}
        >
          ⤢
        </button>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : data ? (
          <CandlestickChart candles={data.candles} chartType="candlestick" showMA20={true} showMA50={false} showRSI={false} showMACD={false} showBollinger={false} />
        ) : null}
      </div>
    </div>
  );
}
