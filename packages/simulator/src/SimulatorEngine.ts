import { 
  Asset, Order, Portfolio, Position, MarketData, 
  SimulationConfig, OrderType, OrderStatus, AssetClass 
} from './types.js';
import { randomUUID } from 'crypto';

export class SimulatorEngine {
  private portfolios: Map<string, Portfolio> = new Map();
  private orders: Map<string, Order> = new Map();
  private assets: Map<string, Asset> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private config: SimulationConfig;

  constructor(config?: Partial<SimulationConfig>) {
    this.config = {
      initialBalance: 100000,
      maxLeverage: 1,
      allowedAssetClasses: [AssetClass.STOCK, AssetClass.CRYPTO],
      commissionRate: 0.001,
      slippageModel: 'none',
      slippageValue: 0,
      ...config
    };
    this.initializeAssets();
  }

  private initializeAssets(): void {
    // Stocks
    this.assets.set('AAPL', {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetClass: AssetClass.STOCK,
      currentPrice: 175.50,
      previousClose: 174.20,
      volume: 55000000,
      change24h: 1.30,
      changePercent24h: 0.75,
      marketCap: 2750000000000
    });

    this.assets.set('GOOGL', {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      assetClass: AssetClass.STOCK,
      currentPrice: 140.25,
      previousClose: 139.80,
      volume: 25000000,
      change24h: 0.45,
      changePercent24h: 0.32,
      marketCap: 1750000000000
    });

    this.assets.set('TSLA', {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      assetClass: AssetClass.STOCK,
      currentPrice: 240.75,
      previousClose: 238.50,
      volume: 90000000,
      change24h: 2.25,
      changePercent24h: 0.94,
      marketCap: 765000000000
    });

    // Crypto
    this.assets.set('BTC-USD', {
      symbol: 'BTC-USD',
      name: 'Bitcoin',
      assetClass: AssetClass.CRYPTO,
      currentPrice: 45000,
      previousClose: 44500,
      volume: 250000,
      change24h: 500,
      changePercent24h: 1.12,
      marketCap: 880000000000
    });

    this.assets.set('ETH-USD', {
      symbol: 'ETH-USD',
      name: 'Ethereum',
      assetClass: AssetClass.CRYPTO,
      currentPrice: 2800,
      previousClose: 2750,
      volume: 180000,
      change24h: 50,
      changePercent24h: 1.82,
      marketCap: 336000000000
    });

    // Initialize market data
    for (const [symbol, asset] of this.assets) {
      this.marketData.set(symbol, {
        symbol,
        price: asset.currentPrice,
        timestamp: new Date(),
        bid: asset.currentPrice * 0.999,
        ask: asset.currentPrice * 1.001,
        spread: asset.currentPrice * 0.002,
        volume24h: asset.volume
      });
    }
  }

  async getOrCreatePortfolio(userId: string): Promise<Portfolio> {
    if (!this.portfolios.has(userId)) {
      const portfolio: Portfolio = {
        userId,
        cashBalance: this.config.initialBalance,
        initialBalance: this.config.initialBalance,
        positions: new Map(),
        totalValue: this.config.initialBalance,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
        lastUpdated: new Date()
      };
      this.portfolios.set(userId, portfolio);
    }
    return this.portfolios.get(userId)!;
  }

  async getAsset(symbol: string): Promise<Asset | null> {
    return this.assets.get(symbol) || null;
  }

  async getMarketData(symbol: string): Promise<MarketData | null> {
    return this.marketData.get(symbol) || null;
  }

  async updateMarketData(symbol: string, data: Partial<MarketData>): Promise<void> {
    const existing = this.marketData.get(symbol);
    if (existing) {
      const updated = { ...existing, ...data, timestamp: new Date() };
      this.marketData.set(symbol, updated);
      
      // Update asset price
      const asset = this.assets.get(symbol);
      if (asset && data.price) {
        asset.currentPrice = data.price;
        this.assets.set(symbol, asset);
      }
    }
  }

  async executeOrder(order: Omit<Order, 'id' | 'status' | 'timestamp'>): Promise<Order> {
    const asset = await this.getAsset(order.assetSymbol);
    if (!asset) {
      throw new Error(`Asset ${order.assetSymbol} not found`);
    }

    if (!this.config.allowedAssetClasses.includes(asset.assetClass)) {
      throw new Error(`Asset class ${asset.assetClass} not allowed in simulation`);
    }

    const portfolio = await this.getOrCreatePortfolio(order.userId);
    const marketData = await this.getMarketData(order.assetSymbol);
    const executionPrice = this.calculateExecutionPrice(asset.currentPrice, marketData!);

    const newOrder: Order = {
      id: randomUUID(),
      ...order,
      status: OrderStatus.PENDING,
      timestamp: new Date(),
      price: executionPrice
    };

    // Validate and execute
    const validation = await this.validateOrder(newOrder, portfolio);
    if (!validation.valid) {
      newOrder.status = OrderStatus.REJECTED;
      newOrder.notes = validation.message;
      this.orders.set(newOrder.id, newOrder);
      throw new Error(validation.message);
    }

    // Execute the order
    await this.applyOrderToPortfolio(newOrder, portfolio);
    newOrder.status = OrderStatus.EXECUTED;
    newOrder.executedAt = new Date();
    newOrder.executedPrice = executionPrice;

    this.orders.set(newOrder.id, newOrder);
    await this.updatePortfolioValue(portfolio.userId);

    return newOrder;
  }

  private calculateExecutionPrice(marketPrice: number, marketData: MarketData): number {
    switch (this.config.slippageModel) {
      case 'fixed':
        return marketPrice + this.config.slippageValue;
      case 'percentage':
        return marketPrice * (1 + this.config.slippageValue / 100);
      default:
        return marketPrice;
    }
  }

  private async validateOrder(order: Order, portfolio: Portfolio): Promise<{ valid: boolean; message: string }> {
    const asset = await this.getAsset(order.assetSymbol);
    if (!asset) {
      return { valid: false, message: 'Asset not found' };
    }

    const totalCost = order.price * order.quantity;
    const commission = totalCost * this.config.commissionRate;
    const totalRequired = totalCost + commission;

    if (order.type === OrderType.BUY) {
      if (portfolio.cashBalance < totalRequired) {
        return { valid: false, message: `Insufficient funds. Need $${totalRequired.toFixed(2)}, have $${portfolio.cashBalance.toFixed(2)}` };
      }
    } else if (order.type === OrderType.SELL) {
      const position = portfolio.positions.get(order.assetSymbol);
      if (!position || position.quantity < order.quantity) {
        return { valid: false, message: `Insufficient shares to sell. Have ${position?.quantity || 0}, want ${order.quantity}` };
      }
    }

    return { valid: true, message: 'Order validated' };
  }

  private async applyOrderToPortfolio(order: Order, portfolio: Portfolio): Promise<void> {
    const totalCost = order.price * order.quantity;
    const commission = totalCost * this.config.commissionRate;
    const netCost = totalCost + commission;

    if (order.type === OrderType.BUY) {
      portfolio.cashBalance -= netCost;
      
      const existingPosition = portfolio.positions.get(order.assetSymbol);
      if (existingPosition) {
        const newQuantity = existingPosition.quantity + order.quantity;
        const newAveragePrice = (
          (existingPosition.averagePrice * existingPosition.quantity) +
          (order.price * order.quantity)
        ) / newQuantity;
        existingPosition.quantity = newQuantity;
        existingPosition.averagePrice = newAveragePrice;
        portfolio.positions.set(order.assetSymbol, existingPosition);
      } else {
        portfolio.positions.set(order.assetSymbol, {
          assetSymbol: order.assetSymbol,
          quantity: order.quantity,
          averagePrice: order.price,
          currentValue: 0,
          profitLoss: 0,
          profitLossPercent: 0
        });
      }
    } else if (order.type === OrderType.SELL) {
      portfolio.cashBalance += totalCost - commission;
      
      const position = portfolio.positions.get(order.assetSymbol);
      if (position) {
        position.quantity -= order.quantity;
        if (position.quantity <= 0) {
          portfolio.positions.delete(order.assetSymbol);
        } else {
          portfolio.positions.set(order.assetSymbol, position);
        }
      }
    }

    portfolio.lastUpdated = new Date();
    this.portfolios.set(portfolio.userId, portfolio);
  }

  private async updatePortfolioValue(userId: string): Promise<void> {
    const portfolio = await this.getOrCreatePortfolio(userId);
    let totalPositionValue = 0;

    for (const [symbol, position] of portfolio.positions) {
      const asset = await this.getAsset(symbol);
      if (asset) {
        const currentValue = asset.currentPrice * position.quantity;
        position.currentValue = currentValue;
        position.profitLoss = currentValue - (position.averagePrice * position.quantity);
        position.profitLossPercent = (position.profitLoss / (position.averagePrice * position.quantity)) * 100;
        totalPositionValue += currentValue;
      }
    }

    portfolio.totalValue = portfolio.cashBalance + totalPositionValue;
    portfolio.totalProfitLoss = portfolio.totalValue - portfolio.initialBalance;
    portfolio.totalProfitLossPercent = (portfolio.totalProfitLoss / portfolio.initialBalance) * 100;
    portfolio.lastUpdated = new Date();

    this.portfolios.set(userId, portfolio);
  }

  async getPortfolio(userId: string): Promise<Portfolio | null> {
    const portfolio = await this.getOrCreatePortfolio(userId);
    await this.updatePortfolioValue(userId);
    return this.portfolios.get(userId) || null;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    const userOrders: Order[] = [];
    for (const order of this.orders.values()) {
      if (order.userId === userId) {
        userOrders.push(order);
      }
    }
    return userOrders.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async resetPortfolio(userId: string): Promise<void> {
    this.portfolios.delete(userId);
    // Also delete orders? Optional
    const ordersToDelete: string[] = [];
    for (const [id, order] of this.orders) {
      if (order.userId === userId) {
        ordersToDelete.push(id);
      }
    }
    ordersToDelete.forEach(id => this.orders.delete(id));
  }

  getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }
}
