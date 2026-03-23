'use client';
import { useStockQuote } from '@/hooks/useStockQuote';
import { formatPrice, formatPercent, formatVolume, formatMarketCap } from '@/lib/formatters';

interface Props { symbol: string; exchangeName?: string; }

export default function ChartOverlay({ symbol, exchangeName }: Props) {
  const { quote, flashClass } = useStockQuote(symbol);
  const isUp = (quote?.changePercent ?? 0) >= 0;
  if (!quote) return null;

  return (
    <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', letterSpacing: '0.2px' }}>
        {symbol}{exchangeName ? ` · ${exchangeName}` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <div
          className={flashClass}
          style={{
            fontSize: '30px', fontWeight: '600', letterSpacing: '-1.5px',
            color: 'var(--text-primary)', lineHeight: 1, borderRadius: '4px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${formatPrice(quote.price)}
        </div>
        <span style={{ fontSize: '13px', fontWeight: '500', color: isUp ? 'var(--green)' : 'var(--red)' }}>
          {isUp ? '+' : ''}{formatPrice(quote.change)} ({formatPercent(quote.changePercent)})
        </span>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
        {[
          { label: 'O',       value: formatPrice(quote.open) },
          { label: 'H',       value: formatPrice(quote.dayHigh),  color: 'var(--green)' },
          { label: 'L',       value: formatPrice(quote.dayLow),   color: 'var(--red)' },
          { label: 'Vol',     value: formatVolume(quote.volume) },
          { label: 'Mkt Cap', value: formatMarketCap(quote.marketCap) },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{label} </span>
            <span style={{ color: color ?? 'var(--text-secondary)', fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
