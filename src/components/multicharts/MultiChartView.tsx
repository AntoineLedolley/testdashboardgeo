'use client';
import { useTradeStore } from '@/lib/store';
import MiniChartContainer from './MiniChartContainer';

export default function MultiChartView() {
  const { multiChartSymbols } = useTradeStore();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '8px',
      padding: '10px',
      height: '100%',
      background: 'var(--bg-base)',
      overflow: 'hidden',
    }}>
      {multiChartSymbols.map((symbol, i) => (
        <MiniChartContainer key={i} symbol={symbol} index={i} />
      ))}
    </div>
  );
}
