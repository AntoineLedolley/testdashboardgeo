export interface DeFiProtocol {
  name: string;
  symbol: string;
  tvl: number;
  tvlChange24h: number;
  chain: string;
  category: string;
  url: string;
}

export interface WhaleAlert {
  id: string;
  type: string;
  amount: number;
  symbol: string;
  from: string;
  to: string;
  timestamp: number;
  usdValue: number;
}

export interface OnchainData {
  protocols: DeFiProtocol[];
  whaleAlerts: WhaleAlert[];
  totalDeFiTVL: number;
  totalDeFiChange24h: number;
  btcDominance: number;
}
