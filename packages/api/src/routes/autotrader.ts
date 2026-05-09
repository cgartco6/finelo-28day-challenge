import { Router } from 'express';
import { AutoTraderEngine } from '@finelo/autotrader';
import { MovingAverageCrossStrategy, RSIStrategy } from '@finelo/autotrader';

export const autotraderRouter = Router();
const autoTraderEngine = new AutoTraderEngine();

// Register strategies
autoTraderEngine.registerStrategy(new MovingAverageCrossStrategy());
autoTraderEngine.registerStrategy(new RSIStrategy());

// Get all strategies
autotraderRouter.get('/strategies', async (req, res) => {
  try {
    const strategies = autoTraderEngine.getAllStrategies();
    res.json(strategies.map(s => ({ name: s.name, version: s.version })));
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Evaluate and request approvals
autotraderRouter.post('/evaluate', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const requests = await autoTraderEngine.evaluateAndRequest(userId);
    res.json({ requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Approve a trade
autotraderRouter.post('/approve/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const success = await autoTraderEngine.approveTrade(requestId);
    
    if (success) {
      res.json({ success: true, message: `Trade ${requestId} approved` });
    } else {
      res.status(400).json({ error: `Failed to approve trade ${requestId}` });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Reject a trade
autotraderRouter.post('/reject/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    const success = await autoTraderEngine.rejectTrade(requestId, reason || 'Rejected by user');
    
    if (success) {
      res.json({ success: true, message: `Trade ${requestId} rejected` });
    } else {
      res.status(400).json({ error: `Failed to reject trade ${requestId}` });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get pending approvals for user
autotraderRouter.get('/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pending = autoTraderEngine.getPendingApprovals(userId);
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get all user requests
autotraderRouter.get('/requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = autoTraderEngine.getAllUserRequests(userId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get specific request
autotraderRouter.get('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = autoTraderEngine.getRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ error: `Request ${requestId} not found` });
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Execute approved trade
autotraderRouter.post('/execute/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const success = await autoTraderEngine.executeTrade(requestId);
    
    if (success) {
      res.json({ success: true, message: `Trade ${requestId} executed` });
    } else {
      res.status(400).json({ error: `Failed to execute trade ${requestId}` });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Update user strategy config
autotraderRouter.post('/config/:userId/:strategyName', async (req, res) => {
  try {
    const { userId, strategyName } = req.params;
    const config = req.body;
    
    autoTraderEngine.updateUserStrategyConfig(userId, strategyName, config);
    res.json({ success: true, message: `Config updated for ${userId}/${strategyName}` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
