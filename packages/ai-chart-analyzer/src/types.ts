export enum PatternType {
  HEAD_AND_SHOULDERS = 'head_and_shoulders',
  INVERSE_HEAD_AND_SHOULDERS = 'inverse_head_and_shoulders',
  DOUBLE_TOP = 'double_top',
  DOUBLE_BOTTOM = 'double_bottom',
  TRIPLE_TOP = 'triple_top',
  TRIPLE_BOTTOM = 'triple_bottom',
  ASCENDING_TRIANGLE = 'ascending_triangle',
  DESCENDING_TRIANGLE = 'descending_triangle',
  SYMMETRICAL_TRIANGLE = 'symmetrical_triangle',
  BULLISH_FLAG = 'bullish_flag',
  BEARISH_FLAG = 'bearish_flag',
  WEDGE = 'wedge',
  CUP_AND_HANDLE = 'cup_and_handle'
}

export enum TrendDirection {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  SIDEWAYS = 'sideways',
  VOLATILE = 'volatile'
}

export enum PatternConfidence {
  VERY_HIGH = 'very_high',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  SPECULATIVE = 'speculative'
}

export enum TimeFrame {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1M'
}

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 0-100
  touches: number;
  timeframe: TimeFrame;
}

export interface ChartPattern {
  type: PatternType;
  confidence: PatternConfidence;
  breakoutPrice?: number;
  targetPrice?: number;
  stopLossPrice?: number;
  description: string;
}

export interface AnalysisResult {
  symbol: string;
  timeframe: TimeFrame;
  currentPrice: number;
  trend: TrendDirection;
  trendStrength: number; // 0-100
  supportLevels: SupportResistanceLevel[];
  resistanceLevels: SupportResistanceLevel[];
  patterns: ChartPattern[];
  indicators: {
    rsi: number;
    macd: {
      value: number;
      signal: number;
      histogram: number;
    };
    movingAverages: {
      ma20: number;
      ma50: number;
      ma200: number;
    };
    volume: {
      current: number;
      average: number;
      ratio: number;
    };
    volatility: number;
  };
  summary: string;
  recommendation: 'buy' | 'sell' | 'hold' | 'wait';
  confidence: number;
  timestamp: Date;
  expiresAt: Date;
}

export interface AnalysisCacheEntry {
  result: AnalysisResult;
  cachedAt: Date;
  expiresAt: Date;
}

export interface ChartImageData {
  buffer: Buffer;
  format: 'png' | 'jpg' | 'webp';
  width: number;
  height: number;
}
