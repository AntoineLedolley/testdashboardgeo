export interface OptionsFlow {
  symbol: string;
  expiry: string;
  strike: number;
  type: 'call' | 'put';
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  lastPrice: number;
  volumeOiRatio: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface OptionsChain {
  symbol: string;
  expirations: string[];
  unusualFlows: OptionsFlow[];
}
