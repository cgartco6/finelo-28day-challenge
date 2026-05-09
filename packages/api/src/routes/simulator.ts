import { Router } from 'express';
import { SimulatorEngine } from '@finelo/simulator';
import { OrderType } from '@finelo/simulator';

export const simulatorRouter = Router();
const simulatorEngine = new SimulatorEngine();

// Get all assets
simulatorRouter.get('/assets', async (req, res) => {
  try {
    const assets = simulatorEngine.getAllAssets();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get specific asset
simulatorRouter.get('/asset/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const asset = await simulatorEngine.getAsset(symbol);
    
    if (!asset) {
      return res.status(404).json({ error: `Asset ${symbol} not found` });
    }
    
    const marketData = await simulatorEngine.getMarketData(symbol);
    res.json({ asset, marketData });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Execute trade
simulatorRouter.post('/order', async (req, res) => {
  try {
    const { userId, assetSymbol, type, quantity, price } = req.body;
    
    if (!userId || !assetSymbol || !type || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: userId, assetSymbol, type, quantity' });
    }
    
    if (!Object.values(OrderType).includes(type)) {
      return res.status(400).json({ error: `Invalid order type. Must be one of: ${Object.values(OrderType).join(', ')}` });
    }
    
    const order = await simulatorEngine.executeOrder({
      userId,
      assetSymbol,
      type,
      quantity,
      price: price || 0
    });
    
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Get portfolio
simulatorRouter.get('/portfolio/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const portfolio = await simulatorEngine.getPortfolio(userId);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get user orders
simulatorRouter.get('/orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await simulatorEngine.getUserOrders(userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get specific order
simulatorRouter.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await simulatorEngine.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: `Order ${orderId} not found` });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Reset portfolio
simulatorRouter.post('/reset/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await simulatorEngine.resetPortfolio(userId);
    res.json({ success: true, message: `Portfolio reset for user ${userId}` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Update market data (admin only in production)
simulatorRouter.post('/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { price, volume } = req.body;
    
    await simulatorEngine.updateMarketData(symbol, { price, volume });
    res.json({ success: true, message: `Market data updated for ${symbol}` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
