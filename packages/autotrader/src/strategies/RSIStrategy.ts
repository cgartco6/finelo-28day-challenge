import { TradingStrategy, TradeSignal, StrategyConfig, PerformanceMetrics, SignalStrength, OrderType, TimeInForce } from '../types.js';
import { randomUUID } from 'crypto';

export class RSIStrategy implements TradingStrategy {
  name = 'RSI Mean Reversion';
  version = '1.0.0';
  private config: StrategyConfig;
  private performance: PerformanceMetrics;
  private priceHistory: Map<string, number[]> = new Map();
  private lastRSI: Map<string, number> = new Map();

  constructor(config?: Partial<StrategyConfig>) {
    this.config = {
      enabled: true,
      riskPerTrade: 0.01,
      maxDailyTrades: 4,
      allowedAssets: ['AAPL', 'GOOGL', 'TSLA', 'ETH-USD'],
      parameters: {
        period: 14,
        oversoldThreshold: 30,
        overboughtThreshold: 70,
        minConfidence: 70
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
      
      // Update price history
      if (!this.priceHistory.has(asset)) {
        this.priceHistory.set(asset, []);
      }
      const history = this.priceHistory.get(asset)!;
      history.push(price);
      
      // Keep only needed history
      const maxHistory = this.config.parameters.period * 2;
      if (history.length > maxHistory) history.shift();
      
      if (history.length >= this.config.parameters.period) {
        const rsi = this.calculateRSI(history);
        this.lastRSI.set(asset, rsi);
        
        // Oversold condition (buy signal)
        if (rsi <= this.config.parameters.oversoldThreshold) {
          const signal = this.generateSignal(asset, price, 'buy', `RSI oversold at ${rsi.toFixed(2)}`);
          signals.push(signal);
        }
        // Overbought condition (sell signal)
        else if (rsi >= this.config.parameters.overboughtThreshold) {
          const signal = this.generateSignal(asset, price, 'sell', `RSI overbought at ${rsi.toFixed(2)}`);
          signals.push(signal);
        }
      }
    }
    
    return signals.length > 0 ? signals[0] : null;
  }
  
  private calculateRSI(prices: number[]): number {
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    const avgGain = gains / this.config.parameters.period;
    const avgLoss = losses / this.config.parameters.period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }
  
  private generateSignal(asset: string, price: number, action: 'buy' | 'sell', reason: string): TradeSignal {
    const rsi = this.lastRSI.get(asset) || 50;
    const distanceToExtreme = action === 'buy' ?
      (this.config.parameters.oversoldThreshold - rsi) :
      (rsi - this.config.parameters.overboughtThreshold);
    
    // Stronger signal when further from threshold
    const strength = distanceToExtreme > 10 ?
      (action === 'buy' ? SignalStrength.STRONG_BUY : SignalStrength.STRONG_SELL) :
      (action === 'buy' ? SignalStrength.BUY : SignalStrength.SELL);
    
    const confidence = Math.min(95, 70 + Math.abs(distanceToExtreme));
    
    return {
      id: randomUUID(),
      asset,
      action,
      quantity: this.calculatePositionSize(rsi),
      price,
      orderType: OrderType.LIMIT,
      limitPrice: action === 'buy' ? price * 0.99 : price * 1.01,
      timeInForce: TimeInForce.GTC,
      strength,
      reason,
      strategyName: this.name,
      confidence,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
  }
  
  private calculatePositionSize(rsi: number): number {
    // Scale position size based on RSI extremity
    const extremity = Math.abs(rsi - 50);
    const scale = Math.min(2, extremity /
