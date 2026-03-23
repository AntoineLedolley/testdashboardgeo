'use client';
import dynamic from 'next/dynamic';
import { useTradeStore } from '@/lib/store';
import { useStockData } from '@/hooks/useStockData';
import { useStockQuote } from '@/hooks/useStockQuote';
import { formatPrice, formatVolume, formatMarketCap } from '@/lib/formatters';
import ChartToolbar from './ChartToolbar';

const CandlestickChart = dynamic(() => import('./CandlestickChart'), { ssr: false });

function StatsBar({ symbol, exchangeName }: { symbol: string; exchangeName?: string }) {
  const { quote, flashClass } = useStockQuote(symbol);
  if (!quote) return <div style={{ height: '36px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }} />;

  const isUp = quote.changePercent >= 0;

  return (
    <div style={{
      height: '38px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: '0', flexShrink: 0,
    }}>
      {/* Big price */}
      <div className={flashClass} style={{
        fontSize: '20px', fontWeight: '600', letterSpacing: '-0.8px',
        color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
        borderRadius: '3px', marginRight: '10px',
      }}>
        ${formatPrice(quote.price)}
      </div>

      {/* Change */}
      <div style={{
        fontSize: '12px', fontWeight: '500',
        color: isUp ? 'var(--green)' : 'var(--red)', marginRight: '20px',
      }}>
        {isUp ? '+' : ''}{formatPrice(quote.change)} ({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border)', marginRight: '20px' }} />

      {/* OHLCV */}
      {[
        { label: 'Ouv.',        value: `$${formatPrice(quote.open)}` },
        { label: 'Haut',        value: `$${formatPrice(quote.dayHigh)}`,   color: 'var(--green)' },
        { label: 'Bas',         value: `$${formatPrice(quote.dayLow)}`,    color: 'var(--red)' },
        { label: 'Vol',         value: formatVolume(quote.volume) },
        { label: 'Cap. bours.', value: formatMarketCap(quote.marketCap) },
        ...(exchangeName ? [{ label: 'Bourse', value: exchangeName }] : []),
      ].map(({ label, value, color }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
          {i > 0 && false}
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginRight: '4px' }}>{label}</span>
          <span style={{
            fontSize: '11px', fontWeight: '500', fontVariantNumeric: 'tabular-nums',
            color: color ?? 'var(--text-secondary)',
          }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartContainer() {
  const { activeSymbol, interval, range, chartType, showMA20, showMA50, showRSI, showMACD, showBollinger } = useTradeStore();
  const { data, loading, error } = useStockData(activeSymbol, interval, range);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <ChartToolbar />
      <StatsBar symbol={activeSymbol} exchangeName={data?.meta.exchangeName} />

      {/* Chart area — takes all remaining space */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {!loading && data && (
          <CandlestickChart
            candles={data.candles}
            chartType={chartType}
            showMA20={showMA20}
            showMA50={showMA50}
            showRSI={showRSI}
            showMACD={showMACD}
            showBollinger={showBollinger}
          />
        )}

        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', gap: '10px',
          }}>
            <div className="spinner" style={{ width: '28px', height: '28px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Chargement des données...</span>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', gap: '8px',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Échec du chargement</span>
            <span style={{ color: 'var(--red)', fontSize: '11px' }}>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
