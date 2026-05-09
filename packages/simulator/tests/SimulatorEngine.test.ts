import { describe, it, expect, beforeEach } from 'vitest';
import { SimulatorEngine } from '../src/SimulatorEngine.js';
import { OrderType } from '../src/types.js';

describe('SimulatorEngine', () => {
  let engine: SimulatorEngine;
  const testUserId = 'sim-test-user';

  beforeEach(() => {
    engine = new SimulatorEngine();
  });

  it('should initialize with default portfolio', async () => {
    const portfolio = await engine.getPortfolio(testUserId);
    expect(portfolio).toBeDefined();
    expect(portfolio?.cashBalance).toBe(100000);
    expect(portfolio?.initialBalance).toBe(100000);
    expect(portfolio?.positions.size).toBe(0);
  });

  it('should get asset information', async () => {
    const asset = await engine.getAsset('AAPL');
    expect(asset).toBeDefined();
    expect(asset?.symbol).toBe('AAPL');
    expect(asset?.name).toBe('Apple Inc.');
  });

  it('should execute a buy order', async () => {
    const order = await engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.BUY,
      quantity: 10,
      price: 175.50
    });

    expect(order.status).toBe('executed');
    expect(order.id).toBeDefined();

    const portfolio = await engine.getPortfolio(testUserId);
    expect(portfolio?.cashBalance).toBeLessThan(100000);
    expect(portfolio?.positions.has('AAPL')).toBe(true);
  });

  it('should execute a sell order', async () => {
    // First buy
    await engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.BUY,
      quantity: 10,
      price: 175.50
    });

    // Then sell
    const sellOrder = await engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.SELL,
      quantity: 5,
      price: 180.00
    });

    expect(sellOrder.status).toBe('executed');
    
    const portfolio = await engine.getPortfolio(testUserId);
    const position = portfolio?.positions.get('AAPL');
    expect(position?.quantity).toBe(5);
  });

  it('should reject order with insufficient funds', async () => {
    await expect(engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.BUY,
      quantity: 10000,
      price: 175.50
    })).rejects.toThrow('Insufficient funds');
  });

  it('should reject sell without holdings', async () => {
    await expect(engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.SELL,
      quantity: 10,
      price: 180.00
    })).rejects.toThrow('Insufficient shares');
  });

  it('should update portfolio value correctly', async () => {
    await engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.BUY,
      quantity: 10,
      price: 175.50
    });

    const portfolio = await engine.getPortfolio(testUserId);
    expect(portfolio?.totalValue).toBeDefined();
    expect(portfolio?.totalProfitLoss).toBeDefined();
  });

  it('should get user orders', async () => {
    await engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.BUY,
      quantity: 10,
      price: 175.50
    });

    const orders = await engine.getUserOrders(testUserId);
    expect(orders.length).toBe(1);
    expect(orders[0].assetSymbol).toBe('AAPL');
  });

  it('should reset portfolio', async () => {
    await engine.executeOrder({
      userId: testUserId,
      assetSymbol: 'AAPL',
      type: OrderType.BUY,
      quantity: 10,
      price: 175.50
    });

    await engine.resetPortfolio(testUserId);
    
    const portfolio = await engine.getPortfolio(testUserId);
    expect(portfolio?.cashBalance).toBe(100000);
    expect(portfolio?.positions.size).toBe(0);
  });

  it('should update market data', async () => {
    await engine.updateMarketData('AAPL', { price: 200.00 });
    const asset = await engine.getAsset('AAPL');
    expect(asset?.currentPrice).toBe(200.00);
  });

  it('should return all assets', () => {
    const assets = engine.getAllAssets();
    expect(assets.length).toBeGreaterThan(0);
    expect(assets.some(a => a.symbol === 'AAPL')).toBe(true);
  });
});
