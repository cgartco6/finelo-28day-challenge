import { TradingStrategy, TradeSignal, StrategyConfig, PerformanceMetrics, SignalStrength, OrderType, TimeInForce } from '../types.js';
import { randomUUID } from 'crypto';

export class MovingAverageCrossStrategy implements TradingStrategy {
  name = 'Moving Average Cross';
  version = '1.0.0';
  private config: StrategyConfig;
  private performance: PerformanceMetrics;
  private lastPrice: Map<string, number> = new Map();
  private shortMA: Map<string, number[]> = new Map();
  private longMA: Map<string, number[]> = new Map();

  constructor(config?: Partial<StrategyConfig>) {
    this.config = {
      enabled: true,
      riskPerTrade: 0.02,
      maxDailyTrades: 3,
      allowedAssets: ['AAPL', 'GOOGL', 'TSLA', 'BTC-USD'],
      parameters: {
        shortPeriod: 9,
        longPeriod: 21,
        minConfidence: 65
      },
      ...config
    };
    
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfitLoss: 0,
      averageReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      lastUpdated: new Date()
    };
  }

  async evaluate(userId: string, marketData: any): Promise<TradeSignal | null> {
    const signals: TradeSignal[] = [];
    
    for (const asset of this.config.allowedAssets) {
      const price = marketData.prices[asset];
      if (!price) continue;
      
      // Update moving averages
      this.updateMovingAverages(asset, price);
      
      const shortMAValue = this.getCurrentMA(asset, this.config.parameters.shortPeriod);
      const longMAValue = this.getCurrentMA(asset, this.config.parameters.longPeriod);
      
      if (!shortMAValue || !longMAValue) continue;
      
      const lastShortMA = this.getPreviousMA(asset, this.config.parameters.shortPeriod);
      const lastLongMA = this.getPreviousMA(asset, this.config.parameters.longPeriod);
      
      // Bullish crossover (short MA crosses above long MA)
      if (lastShortMA <= lastLongMA && shortMAValue > longMAValue) {
        const signal = this.generateSignal(asset, price, 'buy', 'Bullish moving average crossover detected');
        signals.push(signal);
      }
      // Bearish crossover (short MA crosses below long MA)
      else if (lastShortMA >= lastLongMA && shortMAValue < longMAValue) {
        const signal = this.generateSignal(asset, price, 'sell', 'Bearish moving average crossover detected');
        signals.push(signal);
      }
    }
    
    // Return the strongest signal (simplified - returns first)
    return signals.length > 0 ? signals[0] : null;
  }
  
  private generateSignal(asset: string, price: number, action: 'buy' | 'sell', reason: string): TradeSignal {
    const strength = this.calculateSignalStrength(price, action);
    const confidence = this.calculateConfidence();
    
    return {
      id: randomUUID(),
      asset,
      action,
      quantity: this.calculatePositionSize(),
      price,
      orderType: OrderType.MARKET,
      timeInForce: TimeInForce.DAY,
      strength,
      reason,
      strategyName: this.name,
      confidence,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
  }
  
  private updateMovingAverages(asset: string, price: number): void {
    if (!this.shortMA.has(asset)) {
      this.shortMA.set(asset, []);
      this.longMA.set(asset, []);
    }
    
    const short = this.shortMA.get(asset)!;
    const long = this.longMA.get(asset)!;
    
    short.push(price);
    long.push(price);
    
    // Keep only needed periods
    const maxPeriod = Math.max(this.config.parameters.longPeriod, this.config.parameters.shortPeriod);
    if (short.length > maxPeriod) short.shift();
    if (long.length > maxPeriod) long.shift();
    
    this.lastPrice.set(asset, price);
  }
  
  private getCurrentMA(asset: string, period: number): number | null {
    const prices = asset === this.config.parameters.shortPeriod ? 
      this.shortMA.get(asset) : this.longMA.get(asset);
    
    if (!prices || prices.length < period) return null;
    
    const recent = prices.slice(-period);
    const sum = recent.reduce((a, b) => a + b, 0);
    return sum / period;
  }
  
  private getPreviousMA(asset: string, period: number): number | null {
    const prices = period === this.config.parameters.shortPeriod ?
      this.shortMA.get(asset) : this.longMA.get(asset);
    
    if (!prices || prices.length < period + 1) return null;
    
    const previous = prices.slice(-period - 1, -1);
    const sum = previous.reduce((a, b) => a + b, 0);
    return sum / period;
  }
  
  private calculateSignalStrength(price: number, action: 'buy' | 'sell'): SignalStrength {
    // Simplified strength calculation
    const volatility = Math.random() * 0.3;
    return volatility > 0.2 ? 
      (action === 'buy' ? SignalStrength.STRONG_BUY : SignalStrength.STRONG_SELL) :
      (action === 'buy' ? SignalStrength.BUY : SignalStrength.SELL);
  }
  
  private calculateConfidence(): number {
    // Base confidence with some randomness
    return Math.floor(Math.random() * 20) + 70;
  }
  
  private calculatePositionSize(): number {
    // Position sizing logic
    const baseSize = 100;
    const volatilityFactor = 1 + (Math.random() * 0.5);
    return Math.floor(baseSize * volatilityFactor);
  }
  
  getPerformance(): PerformanceMetrics {
    return { ...this.performance };
  }
  
  updateConfig(config: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getConfig(): StrategyConfig {
    return { ...this.config };
  }
}
