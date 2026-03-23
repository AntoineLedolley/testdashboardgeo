export type PaperOrderSide = 'buy' | 'sell';

export interface PaperPosition {
  symbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPct: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: PaperOrderSide;
  qty: number;
  price: number;
  total: number;
  timestamp: number;
  status: 'filled' | 'cancelled';
}

export interface PaperPortfolio {
  cash: number;
  equity: number;
  totalValue: number;
  dayPL: number;
  totalPL: number;
  initialCash: number;
  positions: Record<string, PaperPosition>;
  orders: PaperOrder[];
}
