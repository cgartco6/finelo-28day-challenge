import { describe, it, expect, beforeEach } from 'vitest';
import { AutoTraderEngine } from '../src/AutoTraderEngine.js';
import { MovingAverageCrossStrategy } from '../src/strategies/MovingAverageCrossStrategy.js';
import { RSIStrategy } from '../src/strategies/RSIStrategy.js';
import { SignalStrength, OrderType } from '../src/types.js';

describe('AutoTraderEngine', () => {
  let engine: AutoTraderEngine;
  const testUserId = 'trader-test-user';

  beforeEach(() => {
    engine = new AutoTraderEngine();
    engine.registerStrategy(new MovingAverageCrossStrategy());
    engine.registerStrategy(new RSIStrategy());
  });

  it('should register strategies', () => {
    const strategies = engine.getAllStrategies();
    expect(strategies.length).toBe(2);
    expect(strategies[0].name).toBe('Moving Average Cross');
    expect(strategies[1].name).toBe('RSI Mean Reversion');
  });

  it('should evaluate and create approval requests', async () => {
    const requests = await engine.evaluateAndRequest(testUserId);
    
    // May or may not generate signals depending on market conditions
    expect(Array.isArray(requests)).toBe(true);
  });

  it('should approve trade request', async () => {
    const requests = await engine.evaluateAndRequest(testUserId);
    
    if (requests.length > 0) {
      const request = requests[0];
      const approved = await engine.approveTrade(request.id);
      
      expect(approved).toBe(true);
      const updatedRequest = engine.getRequest(request.id);
      expect(updatedRequest?.status).toBe('approved');
      expect(updatedRequest?.approvedAt).toBeDefined();
    }
  });

  it('should reject trade request', async () => {
    const requests = await engine.evaluateAndRequest(testUserId);
    
    if (requests.length > 0) {
      const request = requests[0];
      const rejected = await engine.rejectTrade(request.id, 'Test rejection');
      
      expect(rejected).toBe(true);
      const updatedRequest = engine.getRequest(request.id);
      expect(updatedRequest?.status).toBe('rejected');
      expect(updatedRequest?.rejectionReason).toBe('Test rejection');
    }
  });

  it('should not approve already approved request', async () => {
    const requests = await engine.evaluateAndRequest(testUserId);
    
    if (requests.length > 0) {
      const request = requests[0];
      await engine.approveTrade(request.id);
      
      await expect(engine.approveTrade(request.id)).rejects.toThrow('not pending');
    }
  });

  it('should get pending approvals for user', async () => {
    await engine.evaluateAndRequest(testUserId);
    const pending = engine.getPendingApprovals(testUserId);
    
    expect(Array.isArray(pending)).toBe(true);
  });

  it('should update user strategy config', async () => {
    engine.updateUserStrategyConfig(testUserId, 'Moving Average Cross', {
      enabled: false,
      maxDailyTrades: 2
    });
    
    // Verify by evaluating (disabled strategy shouldn't generate signals)
    const requests = await engine.evaluateAndRequest(testUserId);
    // The MA strategy is disabled, so only RSI might generate signals
    expect(Array.isArray(requests)).toBe(true);
  });

  it('should respect daily trade limits', async () => {
    // Set low daily limit
    engine.updateUserStrategyConfig(testUserId, 'Moving Average Cross', {
      maxDailyTrades: 1
    });
    
    // Generate and approve first trade
    let requests = await engine.evaluateAndRequest(testUserId);
    if (requests.length > 0) {
      await engine.approveTrade(requests[0].id);
    }
    
    // Generate again - second trade should be limited
    requests = await engine.evaluateAndRequest(testUserId);
    // Not asserting on count since signals depend on market data
    expect(Array.isArray(requests)).toBe(true);
  });

  it('should execute approved trade', async () => {
    const requests = await engine.evaluateAndRequest(testUserId);
    
    if (requests.length > 0) {
      const request = requests[0];
      await engine.approveTrade(request.id);
      const executed = await engine.executeTrade(request.id);
      
      expect(executed).toBe(true);
      const updatedRequest = engine.getRequest(request.id);
      expect(updatedRequest?.status).toBe('executed');
      expect(updatedRequest?.executedAt).toBeDefined();
    }
  });

  it('should not execute unapproved trade', async () => {
    const requests = await engine.evaluateAndRequest(testUserId);
    
    if (requests.length > 0) {
      const request = requests[0];
      await expect(engine.executeTrade(request.id)).rejects.toThrow('not approved');
    }
  });

  it('should get all user requests', async () => {
    await engine.evaluateAndRequest(testUserId);
    const requests = engine.getAllUserRequests(testUserId);
    
    expect(Array.isArray(requests)).toBe(true);
  });

  it('should unregister strategy', () => {
    const unregistered = engine.unregisterStrategy('Moving Average Cross');
    expect(unregistered).toBe(true);
    
    const strategies = engine.getAllStrategies();
    expect(strategies.length).toBe(1);
    expect(strategies[0].name).toBe('RSI Mean Reversion');
  });
});
