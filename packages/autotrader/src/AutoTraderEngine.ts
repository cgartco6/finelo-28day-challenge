import { 
  TradeSignal, 
  ApprovalRequest, 
  TradingStrategy, 
  StrategyConfig,
  SignalStrength,
  OrderType,
  TimeInForce
} from './types.js';
import { randomUUID } from 'crypto';

export class AutoTraderEngine {
  private strategies: Map<string, TradingStrategy> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private executedSignals: Map<string, TradeSignal> = new Map();
  private userStrategyConfigs: Map<string, Map<string, StrategyConfig>> = new Map();
  private dailyTradeCount: Map<string, number> = new Map();
  private lastResetDate: Map<string, string> = new Map();

  registerStrategy(strategy: TradingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    console.log(`Registered strategy: ${strategy.name} v${strategy.version}`);
  }

  unregisterStrategy(strategyName: string): boolean {
    return this.strategies.delete(strategyName);
  }

  getStrategy(strategyName: string): TradingStrategy | undefined {
    return this.strategies.get(strategyName);
  }

  getAllStrategies(): TradingStrategy[] {
    return Array.from(this.strategies.values());
  }

  async evaluateAndRequest(userId: string): Promise<ApprovalRequest[]> {
    // Reset daily counters if needed
    this.checkAndResetDailyCounters(userId);
    
    const requests: ApprovalRequest[] = [];
    const userConfigs = this.getUserStrategyConfigs(userId);
    
    for (const [name, strategy] of this.strategies) {
      const config = userConfigs.get(name);
      if (config && !config.enabled) {
        continue;
      }
      
      // Check daily trade limit
      const dailyCount = this.dailyTradeCount.get(userId) || 0;
      if (config && dailyCount >= config.maxDailyTrades) {
        console.log(`Daily trade limit reached for user ${userId}`);
        continue;
      }
      
      try {
        const marketData = await this.getMarketData();
        const signal = await strategy.evaluate(userId, marketData);
        
        if (signal && this.shouldRequestApproval(signal, config)) {
          const request = await this.createApprovalRequest(userId, signal);
          requests.push(request);
        }
      } catch (error) {
        console.error(`Error evaluating strategy ${name} for user ${userId}:`, error);
      }
    }
    
    return requests;
  }
  
  private async createApprovalRequest(userId: string, signal: TradeSignal): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: randomUUID(),
      userId,
      signal: { ...signal, id: randomUUID() },
      status: 'pending',
      requestedAt: new Date()
    };
    
    this.approvalRequests.set(request.id, request);
    return request;
  }
  
  private shouldRequestApproval(signal: TradeSignal, config?: StrategyConfig): boolean {
    if (!config) return true;
    
    // Check confidence threshold
    const minConfidence = config.parameters?.minConfidence || 60;
    if (signal.confidence < minConfidence) {
      return false;
    }
    
    // Check allowed assets
    if (config.allowedAssets && config.allowedAssets.length > 0) {
      if (!config.allowedAssets.includes(signal.asset)) {
        return false;
      }
    }
    
    // Check signal strength
    const minStrength = config.parameters?.minStrength || 'neutral';
    const strengthOrder = ['strong_sell', 'sell', 'neutral', 'buy', 'strong_buy'];
    if (strengthOrder.indexOf(signal.strength) < strengthOrder.indexOf(minStrength)) {
      return false;
    }
    
    return true;
  }
  
  async approveTrade(requestId: string): Promise<boolean> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    if (request.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending (status: ${request.status})`);
    }
    
    // Check if signal expired
    if (request.signal.expiresAt < new Date()) {
      request.status = 'expired';
      request.rejectionReason = 'Signal expired';
      this.approvalRequests.set(requestId, request);
      return false;
    }
    
    request.status = 'approved';
    request.approvedAt = new Date();
    this.approvalRequests.set(requestId, request);
    
    // Increment daily trade counter
    const dailyCount = this.dailyTradeCount.get(request.userId) || 0;
    this.dailyTradeCount.set(request.userId, dailyCount + 1);
    
    return true;
  }
  
  async rejectTrade(requestId: string, reason: string): Promise<boolean> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    if (request.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending`);
    }
    
    request.status = 'rejected';
    request.rejectionReason = reason;
    this.approvalRequests.set(requestId, request);
    
    return true;
  }
  
  async executeTrade(requestId: string): Promise<boolean> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    if (request.status !== 'approved') {
      throw new Error(`Request ${requestId} is not approved`);
    }
    
    // Here you would connect to your exchange/broker API
    const executionSuccess = await this.executeOrder(request.signal);
    
    if (executionSuccess) {
      request.status = 'executed';
      request.executedAt = new Date();
      this.approvalRequests.set(requestId, request);
      this.executedSignals.set(request.signal.id, request.signal);
      
      // Update strategy performance
      const strategy = this.strategies.get(request.signal.strategyName);
      if (strategy) {
        // Performance tracking would happen here
      }
      
      return true;
    }
    
    return false;
  }
  
  private async executeOrder(signal: TradeSignal): Promise<boolean> {
    // Simulate order execution
    console.log(`Executing ${signal.action} order for ${signal.quantity} of ${signal.asset} at ${signal.price}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
  
  private async getMarketData(): Promise<any> {
    // Fetch current market data
    return {
      timestamp: new Date(),
      prices: {
        'AAPL': 175.50,
        'GOOGL': 140.25,
        'TSLA': 240.75,
        'BTC-USD': 45000
      },
      volatility: 0.25
    };
  }
  
  private getUserStrategyConfigs(userId: string): Map<string, StrategyConfig> {
    if (!this.userStrategyConfigs.has(userId)) {
      const defaultConfigs = new Map<string, StrategyConfig>();
      for (const [name] of this.strategies) {
        defaultConfigs.set(name, {
          enabled: true,
          riskPerTrade: 0.02,
          maxDailyTrades: 5,
          allowedAssets: [],
          parameters: {
            minConfidence: 60,
            minStrength: 'neutral'
          }
        });
      }
      this.userStrategyConfigs.set(userId, defaultConfigs);
    }
    return this.userStrategyConfigs.get(userId)!;
  }
  
  updateUserStrategyConfig(userId: string, strategyName: string, config: Partial<StrategyConfig>): void {
    const userConfigs = this.getUserStrategyConfigs(userId);
    const existing = userConfigs.get(strategyName);
    if (existing) {
      userConfigs.set(strategyName, { ...existing, ...config });
    }
  }
  
  private checkAndResetDailyCounters(userId: string): void {
    const today = new Date().toDateString();
    const lastReset = this.lastResetDate.get(userId);
    
    if (lastReset !== today) {
      this.dailyTradeCount.set(userId, 0);
      this.lastResetDate.set(userId, today);
    }
  }
  
  getPendingApprovals(userId: string): ApprovalRequest[] {
    const requests: ApprovalRequest[] = [];
    for (const request of this.approvalRequests.values()) {
      if (request.userId === userId && request.status === 'pending') {
        requests.push(request);
      }
    }
    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
  
  getAllUserRequests(userId: string): ApprovalRequest[] {
    const requests: ApprovalRequest[] = [];
    for (const request of this.approvalRequests.values()) {
      if (request.userId === userId) {
        requests.push(request);
      }
    }
    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
  
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }
  
  getExecutedSignals(userId: string): TradeSignal[] {
    const signals: TradeSignal[] = [];
    for (const signal of this.executedSignals.values()) {
      // Check if signal belongs to user via approval request
      for (const request of this.approvalRequests.values()) {
        if (request.userId === userId && request.signal.id === signal.id && request.status === 'executed') {
          signals.push(signal);
          break;
        }
      }
    }
    return signals;
  }
}
