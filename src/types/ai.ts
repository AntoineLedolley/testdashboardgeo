export type AiRole = 'user' | 'assistant';

export interface AiMessage {
  id: string;
  role: AiRole;
  content: string;
  timestamp: number;
}

export interface AiCalendarEvent {
  title: string;
  date: string;
  daysUntil: number;
  type: string;
  importance: string;
  forecast?: string;
  actual?: string;
  previous?: string;
}

export interface AiSentiment {
  score: number;
  label: string;
  redditPosts: number;
  topNews: string[];
  topReddit: string[];
}

export interface AiPortfolioPosition {
  symbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

export interface AiPortfolio {
  cash: number;
  positions: AiPortfolioPosition[];
}

export interface AiContext {
  symbol: string;
  interval: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  recentCandles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  ma20: number | null;
  ma50: number | null;
  calendarEvents?: AiCalendarEvent[];
  sentiment?: AiSentiment;
  activeView?: string;
  portfolio?: AiPortfolio;
  watchlist?: string[];
}
