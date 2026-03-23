'use client';
import { useTradeStore } from '@/lib/store';
import { ChartInterval, ChartRange } from '@/types/chart';

const INTERVALS: { label: string; value: ChartInterval; range: ChartRange }[] = [
  { label: '15m', value: '15m',  range: '1d' },
  { label: '1H',  value: '1h',   range: '5d' },
  { label: '1D',  value: '1d',   range: '3mo' },
  { label: '1W',  value: '1wk',  range: '1y' },
  { label: '1M',  value: '1mo',  range: '5y' },
];
const RANGES: { label: string; value: ChartRange }[] = [
  { label: '1D',  value: '1d'  },
  { label: '5D',  value: '5d'  },
  { label: '1M',  value: '1mo' },
  { label: '3M',  value: '3mo' },
  { label: '6M',  value: '6mo' },
  { label: '1Y',  value: '1y'  },
  { label: '5Y',  value: '5y'  },
];

const baseBtn: React.CSSProperties = {
  padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '400',
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.12s',
  lineHeight: 1.4,
};
const activeBtn: React.CSSProperties = {
  ...baseBtn, background: 'var(--bg-hover)', color: 'var(--text-primary)',
  border: '1px solid var(--border-bright)', fontWeight: '500',
};
const Div = () => <div style={{ width: '1px', height: '14px', background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />;

export default function ChartToolbar() {
  const {
    interval, setInterval, range, setRange,
    chartType, setChartType,
    showMA20, showMA50, showRSI, showMACD, showBollinger,
    toggleMA20, toggleMA50, toggleRSI, toggleMACD, toggleBollinger,
  } = useTradeStore();

  function Btn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button onClick={onClick} style={active ? activeBtn : baseBtn}
        onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; } }}
        onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; } }}
      >{children}</button>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2px',
      padding: '5px 12px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)', flexShrink: 0, flexWrap: 'wrap',
    }}>
      <Btn active={chartType === 'candlestick'} onClick={() => setChartType('candlestick')}>Bougies</Btn>
      <Btn active={chartType === 'line'}        onClick={() => setChartType('line')}>Ligne</Btn>
      <Div />
      {INTERVALS.map((iv) => (
        <Btn key={iv.value} active={interval === iv.value} onClick={() => { setInterval(iv.value); setRange(iv.range); }}>
          {iv.label}
        </Btn>
      ))}
      <Div />
      {RANGES.map((r) => (
        <Btn key={r.value} active={range === r.value} onClick={() => setRange(r.value)}>
          {r.label}
        </Btn>
      ))}
      <Div />
      <Btn active={showMA20}     onClick={toggleMA20}>     <span style={{ color: showMA20     ? '#fbbf24' : 'inherit' }}>MA20</span></Btn>
      <Btn active={showMA50}     onClick={toggleMA50}>     <span style={{ color: showMA50     ? '#60a5fa' : 'inherit' }}>MA50</span></Btn>
      <Btn active={showBollinger} onClick={toggleBollinger}><span style={{ color: showBollinger ? '#60a5fa' : 'inherit' }}>BB</span></Btn>
      <Div />
      <Btn active={showRSI}  onClick={toggleRSI}> <span style={{ color: showRSI  ? '#a78bfa' : 'inherit' }}>RSI</span></Btn>
      <Btn active={showMACD} onClick={toggleMACD}><span style={{ color: showMACD ? '#60a5fa' : 'inherit' }}>MACD</span></Btn>
    </div>
  );
}
