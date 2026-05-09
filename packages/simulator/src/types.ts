export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
  SHORT = 'short',
  COVER = 'cover'
}

export enum OrderStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export enum AssetClass {
  STOCK = 'stock',
  CRYPTO = 'crypto',
  FOREX = 'forex',
  COMMODITY = 'commodity'
}

export interface Asset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currentPrice: number;
  previousClose: number;
  volume: number;
  change24h: number;
  changePercent24h: number;
  marketCap?: number;
}

export interface Order {
  id: string;
  userId: string;
  assetSymbol: string;
  type: OrderType;
  quantity: number;
  price: number;
  status: OrderStatus;
  timestamp: Date;
  executedAt?: Date;
  executedPrice?: number;
  notes?: string;
}

export interface Position {
  assetSymbol: string;
  quantity: number;
  averagePrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface Portfolio {
  userId: string;
  cashBalance: number;
  initialBalance: number;
  positions: Map<string, Position>;
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  lastUpdated: Date;
}

export interface MarketData {
  symbol: string;
  price: number;
  timestamp: Date;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
}

export interface SimulationConfig {
  initialBalance: number;
  maxLeverage: number;
  allowedAssetClasses: AssetClass[];
  commissionRate: number;
  slippageModel: 'none' | 'fixed' | 'percentage';
  slippageValue: number;
}
