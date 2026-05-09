export enum SignalStrength {
  STRONG_BUY = 'strong_buy',
  BUY = 'buy',
  NEUTRAL = 'neutral',
  SELL = 'sell',
  STRONG_SELL = 'strong_sell'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
}

export enum TimeInForce {
  DAY = 'day',
  GTC = 'gtc',
  IOC = 'ioc',
  FOK = 'fok'
}

export interface TradeSignal {
  id: string;
  asset: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  limitPrice?: number;
  stopPrice?: number;
  orderType: OrderType;
  timeInForce: TimeInForce;
  strength: SignalStrength;
  reason: string;
  strategyName: string;
  confidence: number;
  timestamp: Date;
  expiresAt: Date;
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  signal: TradeSignal;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  requestedAt: Date;
  approvedAt?: Date;
  executedAt?: Date;
  rejectionReason?: string;
  notes?: string;
}

export interface TradingStrategy {
  name: string;
  version: string;
  evaluate(userId: string, marketData: any): Promise<TradeSignal | null>;
  getPerformance(): PerformanceMetrics;
  updateConfig(config: StrategyConfig): void;
}

export interface StrategyConfig {
  enabled: boolean;
  riskPerTrade: number;
  maxDailyTrades: number;
  allowedAssets: string[];
  parameters: Record<string, any>;
}

export interface RiskParameters {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStop: boolean;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfitLoss: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  lastUpdated: Date;
}
