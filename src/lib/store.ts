'use client';
import { create } from 'zustand';
import { ChartInterval, ChartRange, ChartType } from '@/types/chart';
import { WatchlistEntry } from '@/types/stock';
import { Trade } from '@/types/journal';
import { PriceAlert } from '@/types/alerts';
import { userKey } from './auth';

export type AppView = 'chart' | 'screener' | 'journal' | 'multicharts' | 'calendar' | 'heatmap' | 'briefing' | 'paper' | 'backtest' | 'options' | 'correlation' | 'onchain';

export type PanelTab = 'chat' | 'sentiment' | 'alerts' | 'setup' | 'perso';

interface TradeStore {
  activeView: AppView;
  setActiveView: (view: AppView) => void;

  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;

  interval: ChartInterval;
  setInterval: (interval: ChartInterval) => void;
  range: ChartRange;
  setRange: (range: ChartRange) => void;
  chartType: ChartType;
  setChartType: (type: ChartType) => void;

  showMA20: boolean;
  showMA50: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showBollinger: boolean;
  toggleMA20: () => void;
  toggleMA50: () => void;
  toggleRSI: () => void;
  toggleMACD: () => void;
  toggleBollinger: () => void;

  watchlist: WatchlistEntry[];
  addToWatchlist: (entry: WatchlistEntry) => void;
  removeFromWatchlist: (symbol: string) => void;

  multiChartSymbols: [string, string, string, string];
  setMultiChartSymbol: (index: number, symbol: string) => void;

  trades: Trade[];
  addTrade: (trade: Trade) => void;
  removeTrade: (id: string) => void;

  alerts: PriceAlert[];
  addAlert: (alert: PriceAlert) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;

  // AI panel global state
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  aiPanelTab: PanelTab;
  setAiPanelTab: (tab: PanelTab) => void;
}

const DEFAULT_WATCHLIST: WatchlistEntry[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', addedAt: Date.now() },
  { symbol: 'MSFT', name: 'Microsoft Corp.', addedAt: Date.now() },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', addedAt: Date.now() },
  { symbol: 'TSLA', name: 'Tesla Inc.', addedAt: Date.now() },
  { symbol: 'SPY', name: 'S&P 500 ETF', addedAt: Date.now() },
];

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const storageKey = userKey(key);
  try { const v = localStorage.getItem(storageKey); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function save(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  const storageKey = userKey(key);
  localStorage.setItem(storageKey, JSON.stringify(value));
}

export const useTradeStore = create<TradeStore>((set, get) => ({
  activeView: 'chart',
  setActiveView: (activeView) => set({ activeView }),

  activeSymbol: 'AAPL',
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol.toUpperCase() }),

  interval: '1d',
  setInterval: (interval) => set({ interval }),
  range: '3mo',
  setRange: (range) => set({ range }),
  chartType: 'candlestick',
  setChartType: (chartType) => set({ chartType }),

  showMA20: true,
  showMA50: true,
  showRSI: false,
  showMACD: false,
  showBollinger: false,
  toggleMA20: () => set((s) => ({ showMA20: !s.showMA20 })),
  toggleMA50: () => set((s) => ({ showMA50: !s.showMA50 })),
  toggleRSI: () => set((s) => ({ showRSI: !s.showRSI })),
  toggleMACD: () => set((s) => ({ showMACD: !s.showMACD })),
  toggleBollinger: () => set((s) => ({ showBollinger: !s.showBollinger })),

  watchlist: DEFAULT_WATCHLIST,
  addToWatchlist: (entry) => {
    const current = get().watchlist;
    if (current.find((w) => w.symbol === entry.symbol)) return;
    const updated = [...current, entry];
    save('watchlist', updated);
    set({ watchlist: updated });
  },
  removeFromWatchlist: (symbol) => {
    const updated = get().watchlist.filter((w) => w.symbol !== symbol);
    save('watchlist', updated);
    set({ watchlist: updated });
  },

  multiChartSymbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA'],
  setMultiChartSymbol: (index, symbol) => {
    const current = [...get().multiChartSymbols] as [string, string, string, string];
    current[index] = symbol.toUpperCase();
    set({ multiChartSymbols: current });
  },

  trades: [],
  addTrade: (trade) => {
    const updated = [...get().trades, trade];
    save('trades', updated);
    set({ trades: updated });
  },
  removeTrade: (id) => {
    const updated = get().trades.filter((t) => t.id !== id);
    save('trades', updated);
    set({ trades: updated });
  },

  alerts: [],
  addAlert: (alert) => {
    const updated = [...get().alerts, alert];
    save('alerts', updated);
    set({ alerts: updated });
  },
  removeAlert: (id) => {
    const updated = get().alerts.filter((a) => a.id !== id);
    save('alerts', updated);
    set({ alerts: updated });
  },
  triggerAlert: (id) => {
    const updated = get().alerts.map((a) =>
      a.id === id ? { ...a, triggered: true, triggeredAt: Date.now(), active: false } : a
    );
    save('alerts', updated);
    set({ alerts: updated });
  },

  // AI panel
  aiPanelOpen: false,
  setAiPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),
  aiPanelTab: 'chat',
  setAiPanelTab: (aiPanelTab) => set({ aiPanelTab }),
}));

if (typeof window !== 'undefined') {
  useTradeStore.setState({
    watchlist: load('watchlist', DEFAULT_WATCHLIST),
    trades: load('trades', []),
    alerts: load('alerts', []),
  });
}

/** Call after login or logout to reload data for the current user */
export function reinitializeStore() {
  useTradeStore.setState({
    watchlist: load('watchlist', DEFAULT_WATCHLIST),
    trades: load('trades', []),
    alerts: load('alerts', []),
    aiPanelOpen: false,
    aiPanelTab: 'chat',
  });
}
