export type AlertType =
  | 'price_above'
  | 'price_below'
  | 'change_above'
  | 'change_below';

export interface PriceAlert {
  id: string;
  symbol: string;
  type: AlertType;
  threshold: number;
  active: boolean;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
}
