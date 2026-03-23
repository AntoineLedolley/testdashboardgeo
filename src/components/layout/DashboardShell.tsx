'use client';
import { useEffect } from 'react';
import { useTradeStore } from '@/lib/store';
import { useMultiQuote } from '@/hooks/useStockQuote';
import { useAlerts } from '@/hooks/useAlerts';
import TopBar from './TopBar';
import NavTabs from './NavTabs';
import MarketTicker from './MarketTicker';
import Sidebar from '@/components/sidebar/Sidebar';
import ChartContainer from '@/components/chart/ChartContainer';
import AiPanel from '@/components/ai/AiPanel';
import MultiChartView from '@/components/multicharts/MultiChartView';
import ScreenerView from '@/components/screener/ScreenerView';
import JournalView from '@/components/journal/JournalView';
import CalendarView from '@/components/calendar/CalendarView';
import HeatmapView from '@/components/heatmap/HeatmapView';
import BriefingView from '@/components/briefing/BriefingView';
import PaperTradingView from '@/components/paper/PaperTradingView';
import BacktestView from '@/components/backtest/BacktestView';
import OptionsFlowView from '@/components/options/OptionsFlowView';
import CorrelationView from '@/components/correlation/CorrelationView';
import OnchainView from '@/components/onchain/OnchainView';

function AlertWatcher() {
  const { watchlist, alerts } = useTradeStore();
  const alertSymbols = [...new Set(alerts.map((a) => a.symbol))];
  const watchlistSymbols = watchlist.map((w) => w.symbol);
  const allSymbols = [...new Set([...alertSymbols, ...watchlistSymbols])];
  const { quotes } = useMultiQuote(allSymbols, 5000);
  useAlerts(quotes);
  return null;
}

const SIDEBAR_VIEWS = new Set(['chart', 'multicharts', 'screener', 'heatmap', 'options', 'briefing', 'calendar', 'paper', 'backtest', 'correlation', 'onchain']);

interface DashboardShellProps {
  onLogout?: () => void;
}

export default function DashboardShell({ onLogout }: DashboardShellProps) {
  const { activeView, aiPanelOpen, setAiPanelOpen } = useTradeStore();
  const showSidebar = SIDEBAR_VIEWS.has(activeView);

  // Global Escape key to close panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && aiPanelOpen) {
        setAiPanelOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aiPanelOpen, setAiPanelOpen]);

  function renderMain() {
    switch (activeView) {
      case 'chart':       return <ChartContainer />;
      case 'multicharts': return <MultiChartView />;
      case 'screener':    return <ScreenerView />;
      case 'journal':     return <JournalView />;
      case 'calendar':    return <CalendarView />;
      case 'heatmap':     return <HeatmapView />;
      case 'briefing':    return <BriefingView />;
      case 'paper':       return <PaperTradingView />;
      case 'backtest':    return <BacktestView />;
      case 'options':     return <OptionsFlowView />;
      case 'correlation': return <CorrelationView />;
      case 'onchain':     return <OnchainView />;
      default:            return null;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>
      <AlertWatcher />
      <TopBar onLogout={onLogout} />
      <MarketTicker />
      <NavTabs />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {showSidebar && (
          <div style={{
            width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
          }}>
            <Sidebar />
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
          {renderMain()}
        </div>
      </div>

      {/* ── Floating AI toggle button ───────────────────────────────────────── */}
      <button
        onClick={() => setAiPanelOpen(!aiPanelOpen)}
        title={aiPanelOpen ? 'Fermer GS TradeAI' : 'Ouvrir GS TradeAI'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: aiPanelOpen ? '408px' : '24px',
          zIndex: 1000,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: aiPanelOpen ? 'var(--bg-elevated)' : 'var(--accent)',
          border: `1px solid ${aiPanelOpen ? 'var(--border-bright)' : 'transparent'}`,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'right 0.28s ease, background 0.15s ease',
          fontSize: aiPanelOpen ? '20px' : '11px',
          fontWeight: '700',
          letterSpacing: '-0.3px',
          flexShrink: 0,
        }}
      >
        {aiPanelOpen ? '×' : 'AI'}
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────────── */}
      {aiPanelOpen && (
        <div
          onClick={() => setAiPanelOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 998,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}

      {/* ── Overlay AI panel ────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: aiPanelOpen ? 0 : '-400px',
          width: '380px',
          height: '100vh',
          zIndex: 999,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'right 0.28s ease',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        <AiPanel onClose={() => setAiPanelOpen(false)} activeView={activeView} />
      </div>
    </div>
  );
}
