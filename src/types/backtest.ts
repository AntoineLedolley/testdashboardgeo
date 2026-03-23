export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  side: 'long';
  returnPct: number;
  holdingDays: number;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  period: string;
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  totalReturn: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; value: number }[];
}
