import { Router } from 'express';
import { ApprovalWorkflow } from '@finelo/approval';

export const approvalRouter = Router();
const approvalWorkflow = new ApprovalWorkflow();

// Get user requests
approvalRouter.get('/requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, priority, limit, offset } = req.query;
    
    const filters = {
      status: status ? (status as string).split(',') as any : undefined,
      priority: priority ? (priority as string).split(',') as any : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    };
    
    const requests = await approvalWorkflow.getUserRequests(userId, filters);
    res.json({ requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get specific request
approvalRouter.get('/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await approvalWorkflow.getRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ error: `Request ${requestId} not found` });
    }
    
    const actions = await approvalWorkflow.getRequestActions(requestId);
    res.json({ request, actions });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Approve request
approvalRouter.post('/approve/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewerId, notes } = req.body;
    
    if (!reviewerId) {
      return res.status(400).json({ error: 'Missing reviewerId' });
    }
    
    const request = await approvalWorkflow.approveRequest(requestId, reviewerId, notes);
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Reject request
approvalRouter.post('/reject/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewerId, reason } = req.body;
    
    if (!reviewerId) {
      return res.status(400).json({ error: 'Missing reviewerId' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Missing rejection reason' });
    }
    
    const request = await approvalWorkflow.rejectRequest(requestId, reviewerId, reason);
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Cancel request
approvalRouter.post('/cancel/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const request = await approvalWorkflow.cancelRequest(requestId, userId, reason);
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get approval statistics
approvalRouter.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await approvalWorkflow.getStats({ userId });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Bulk approve
approvalRouter.post('/bulk-approve', async (req, res) => {
  try {
    const { requestIds, reviewerId, notes } = req.body;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid requestIds array' });
    }
    
    if (!reviewerId) {
      return res.status(400).json({ error: 'Missing reviewerId' });
    }
    
    const results = await approvalWorkflow.bulkApprove(requestIds, reviewerId, notes);
    res.json({ 
      success: true, 
      approved: results.length,
      total: requestIds.length,
      requests: results 
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Bulk reject
approvalRouter.post('/bulk-reject', async (req, res) => {
  try {
    const { requestIds, reviewerId, reason } = req.body;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid requestIds array' });
    }
    
    if (!reviewerId) {
      return res.status(400).json({ error: 'Missing reviewerId' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Missing reason' });
    }
    
    const results = await approvalWorkflow.bulkReject(requestIds, reviewerId, reason);
    res.json({ 
      success: true, 
      rejected: results.length,
      total: requestIds.length,
      requests: results 
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Escalate request
approvalRouter.post('/escalate/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Missing escalation reason' });
    }
    
    const request = await approvalWorkflow.escalateRequest(requestId, userId, reason);
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Mark as executed
approvalRouter.post('/executed/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { executionResult } = req.body;
    
    const request = await approvalWorkflow.markExecuted(requestId, executionResult);
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Mark as failed
approvalRouter.post('/failed/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { error } = req.body;
    
    if (!error) {
      return res.status(400).json({ error: 'Missing error message' });
    }
    
    const request = await approvalWorkflow.markFailed(requestId, error);
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
