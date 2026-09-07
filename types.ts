
export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum TradeStatus {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAK_EVEN = 'BE'
}

export enum TradingSession {
  LONDON = 'LONDON',
  NEW_YORK = 'NEW_YORK',
  ASIAN = 'ASIAN',
  OVERLAP = 'OVERLAP'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ELITE = 'ELITE'
}

export type DashboardWidgetId = 'goals' | 'equity' | 'distribution' | 'sessions' | 'market';

export interface WidgetConfig {
  id: DashboardWidgetId;
  visible: boolean;
  label: string;
}

export interface Trade {
  id: string;
  userId?: string;
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
  riskPercent?: number;
  aiFeedback?: string;
  isAnalyzing?: boolean;
}

export interface User {
  id: string; // Authoritative Firebase UID
  userId?: string; // Firebase UID
  username: string;
  displayName?: string;
  email?: string;
  balance: number;
  tier: SubscriptionTier;
  subscriptionExpiry?: number;
  createdAt?: string;
  updatedAt?: string;
  usageCount: {
    vision: number;
    audit: number;
  };
}

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: 'ACTIVE' | 'TRIALING' | 'CANCELLED' | 'EXPIRED';
  subscriptionExpiry?: number | null;
  usageCount: {
    vision: number;
    audit: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UserGoals {
  monthlyProfitTarget: number;
  winRateTarget: number;
  tradesPerMonthTarget: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface StrategyParams {
  initialCapital: number;
  riskPerTrade: number;
  winRate: number;
  rewardToRisk: number;
  totalTrades: number;
}

export interface SimulationStep {
  tradeIndex: number;
  equity: number;
  pnl: number;
  isWin: boolean;
}

export interface SimulationResult {
  steps: SimulationStep[];
  finalEquity: number;
  totalPnl: number;
  winRateActual: number;
  maxDrawdown: number;
  expectancy: number;
  profitFactor: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface DistributionMetric {
  name: string;
  value: number;
  color: string;
}

export interface SessionPerformanceMetric {
  name: string;
  total: number;
  pnl: number;
  winRate: string;
}

export interface DashboardStats {
  total: number;
  wins: number;
  totalPnl: number;
  winRate: number;
  distributionData: DistributionMetric[];
  sessionPerformance: SessionPerformanceMetric[];
}

export interface ChartAnalysisResult {
  symbol: string;
  timeframe: string;
  marketStructure: string;
  trend: string;
  supportLevels: string[];
  resistanceLevels: string[];
  keyZones: string[];
  invalidation: string;
  confidence: string;
  observations: string[];
  disclaimer?: string;
}

export interface TradeAuditResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  executionIssues: string[];
  riskIssues: string[];
  recurringPatterns: string[];
  improvementAreas: string[];
  disclaimer?: string;
}
