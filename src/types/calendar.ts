export type EventType = 'fed' | 'inflation' | 'jobs' | 'earnings' | 'gdp' | 'other';
export type EventImportance = 'high' | 'medium' | 'low';

export interface EconomicEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM ET
  type: EventType;
  forecast?: string;
  previous?: string;
  actual?: string;
  symbol?: string; // for earnings
  importance: EventImportance;
}
