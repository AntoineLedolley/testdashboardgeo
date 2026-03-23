export type ChartInterval = '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo';
export type ChartType = 'candlestick' | 'line';
export type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';

export interface CandleData {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LinePoint {
  time: number;
  value: number;
}

export interface ChartMeta {
  symbol: string;
  currency: string;
  exchangeName: string;
}

export interface ChartResponse {
  candles: CandleData[];
  meta: ChartMeta;
}
