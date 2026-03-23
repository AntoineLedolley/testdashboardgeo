export type TradeAction = 'buy' | 'sell';

export interface Trade {
  id: string;
  symbol: string;
  action: TradeAction;
  quantity: number;
  price: number;
  date: string; // ISO string
  notes: string;
  marketContext?: {
    ma20: number | null;
    ma50: number | null;
    priceChangePercent: number;
  };
}
