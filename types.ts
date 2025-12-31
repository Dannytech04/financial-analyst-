
export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum TradeStatus {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAK_EVEN = 'BE',
  PENDING = 'PENDING'
}

export enum TradingSession {
  LONDON = 'LONDON',
  NEW_YORK = 'NEW_YORK',
  ASIAN = 'ASIAN',
  OVERLAP = 'OVERLAP'
}

export type DashboardWidgetId = 'goals' | 'equity' | 'distribution' | 'sessions' | 'market';

export interface WidgetConfig {
  id: DashboardWidgetId;
  visible: boolean;
  label: string;
}

export interface Trade {
  id: string;
  pair: string;
  type: TradeType;
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  pnl: number;
  status: TradeStatus;
  session: TradingSession;
  timestamp: number;
  notes?: string;
  strategy?: string;
  riskPercent?: number;
  aiFeedback?: string;
  isAnalyzing?: boolean;
}

export interface User {
  username: string;
  balance: number;
}

export interface UserGoals {
  monthlyProfitTarget: number;
  winRateTarget: number;
  tradesPerMonthTarget: number;
}

export interface MarketAnalysis {
  summary: string;
  sources: { title: string; uri: string }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
