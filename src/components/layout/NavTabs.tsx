'use client';
import { useTradeStore, AppView } from '@/lib/store';

const TABS: { view: AppView; label: string }[] = [
  { view: 'chart',       label: 'Graphique' },
  { view: 'multicharts', label: 'Multi-graphiques' },
  { view: 'screener',    label: 'Screener' },
  { view: 'journal',     label: 'Journal' },
  { view: 'briefing',    label: 'Briefing' },
  { view: 'calendar',    label: 'Calendrier' },
  { view: 'heatmap',     label: 'Heatmap' },
  { view: 'options',     label: 'Options' },
  { view: 'correlation', label: 'Corrélation' },
  { view: 'paper',       label: 'Paper Trading' },
  { view: 'backtest',    label: 'Backtest' },
  { view: 'onchain',     label: 'On-Chain' },
];

const DIVIDERS_BEFORE = new Set([4, 9, 11]);

export default function NavTabs() {
  const { activeView, setActiveView } = useTradeStore();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 12px',
      background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      height: '36px', flexShrink: 0, overflowX: 'auto', overflowY: 'hidden',
      scrollbarWidth: 'none', gap: '1px',
    }}>
      {TABS.map((tab, i) => {
        const isActive = activeView === tab.view;
        return (
          <div key={tab.view} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {DIVIDERS_BEFORE.has(i) && (
              <div style={{ width: '1px', height: '14px', background: 'var(--border)', margin: '0 6px', flexShrink: 0 }} />
            )}
            <button
              onClick={() => setActiveView(tab.view)}
              style={{
                padding: '0 10px', height: '36px', background: 'transparent', border: 'none',
                borderBottom: isActive ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                cursor: 'pointer', fontSize: '12px', fontWeight: isActive ? '500' : '400',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color 0.15s', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            >
              {tab.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
