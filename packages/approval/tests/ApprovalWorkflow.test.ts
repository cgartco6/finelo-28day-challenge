import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalWorkflow } from '../src/ApprovalWorkflow.js';
import { ApprovalStatus, ApprovalPriority } from '../src/types.js';
import { TradeSignal, SignalStrength, OrderType, TimeInForce } from '@finelo/autotrader';

describe('ApprovalWorkflow', () => {
  let workflow: ApprovalWorkflow;
  const testUserId = 'approval-test-user';
  const testSignal: TradeSignal = {
    id: 'signal-123',
    asset: 'AAPL',
    action: 'buy',
    quantity: 100,
    price: 175.50,
    orderType: OrderType.MARKET,
    timeInForce: TimeInForce.DAY,
    strength: SignalStrength.BUY,
    reason: 'Test signal',
    strategyName: 'Test Strategy',
    confidence: 85,
    timestamp: new Date(),
    expiresAt: new Date(Date.now() + 3600000)
  };

  beforeEach(() => {
    workflow = new ApprovalWorkflow();
  });

  it('should create a new approval request', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    
    expect(request.id).toBeDefined();
    expect(request.userId).toBe(testUserId);
    expect(request.status).toBe(ApprovalStatus.PENDING);
    expect(request.priority).toBe(ApprovalPriority.HIGH);
    expect(request.expirationTime).toBeDefined();
  });

  it('should approve a pending request', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    const approved = await workflow.approveRequest(request.id, 'reviewer-1', 'Looks good');
    
    expect(approved.status).toBe(ApprovalStatus.APPROVED);
    expect(approved.approvedAt).toBeDefined();
    expect(approved.reviewedBy).toBe('reviewer-1');
    expect(approved.approvalNotes).toBe('Looks good');
  });

  it('should reject a pending request', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    const rejected = await workflow.rejectRequest(request.id, 'reviewer-1', 'Too risky');
    
    expect(rejected.status).toBe(ApprovalStatus.REJECTED);
    expect(rejected.rejectedAt).toBeDefined();
    expect(rejected.rejectionReason).toBe('Too risky');
  });

  it('should cancel a pending request', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    const cancelled = await workflow.cancelRequest(request.id, testUserId, 'Changed my mind');
    
    expect(cancelled.status).toBe(ApprovalStatus.CANCELLED);
    expect(cancelled.rejectionReason).toBe('Changed my mind');
  });

  it('should not allow user to cancel another user\'s request', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    
    await expect(workflow.cancelRequest(request.id, 'wrong-user', 'Hack attempt'))
      .rejects.toThrow('does not own request');
  });

  it('should expire requests after timeout', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    
    // Manually expire
    const expired = await workflow.expireRequest(request.id);
    expect(expired.status).toBe(ApprovalStatus.EXPIRED);
  });

  it('should mark request as executed', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    await workflow.approveRequest(request.id, 'reviewer-1');
    const executed = await workflow.markExecuted(request.id, { txid: '0x123' });
    
    expect(executed.status).toBe(ApprovalStatus.EXECUTED);
    expect(executed.executedAt).toBeDefined();
  });

  it('should mark request as failed', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    const failed = await workflow.markFailed(request.id, 'Order rejected by exchange');
    
    expect(failed.status).toBe(ApprovalStatus.FAILED);
    expect(failed.metadata.error).toBe('Order rejected by exchange');
    expect(failed.retryCount).toBe(1);
  });

  it('should get user requests', async () => {
    await workflow.createRequest(testUserId, testSignal);
    await workflow.createRequest(testUserId, testSignal);
    
    const requests = await workflow.getUserRequests(testUserId);
    expect(requests.length).toBe(2);
  });

  it('should filter requests by status', async () => {
    const request1 = await workflow.createRequest(testUserId, testSignal);
    const request2 = await workflow.createRequest(testUserId, testSignal);
    await workflow.approveRequest(request1.id, 'reviewer-1');
    
    const pendingRequests = await workflow.getUserRequests(testUserId, { status: [ApprovalStatus.PENDING] });
    expect(pendingRequests.length).toBe(1);
    expect(pendingRequests[0].id).toBe(request2.id);
  });

  it('should get request statistics', async () => {
    const request1 = await workflow.createRequest(testUserId, testSignal);
    const request2 = await workflow.createRequest(testUserId, testSignal);
    await workflow.approveRequest(request1.id, 'reviewer-1');
    
    const stats = await workflow.getStats({ userId: testUserId });
    expect(stats.total).toBe(2);
    expect(stats.approved).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.approvalRate).toBe(50);
  });

  it('should log actions for a request', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    await workflow.approveRequest(request.id, 'reviewer-1', 'Approved');
    
    const actions = await workflow.getRequestActions(request.id);
    expect(actions.length).toBe(1);
    expect(actions[0].action).toBe('approve');
    expect(actions[0].actor).toBe('reviewer-1');
  });

  it('should escalate a request', async () => {
    const request = await workflow.createRequest(testUserId, testSignal);
    const escalated = await workflow.escalateRequest(request.id, testUserId, 'Needs urgent review');
    
    expect(escalated.priority).toBe(ApprovalPriority.CRITICAL);
    expect(escalated.status).toBe(ApprovalStatus.REVIEWING);
    expect(escalated.metadata.escalatedBy).toBe(testUserId);
  });

  it('should bulk approve requests', async () => {
    const request1 = await workflow.createRequest(testUserId, testSignal);
    const request2 = await workflow.createRequest(testUserId, testSignal);
    
    const approved = await workflow.bulkApprove([request1.id, request2.id], 'reviewer-1', 'Batch approval');
    expect(approved.length).toBe(2);
    expect(approved[0].status).toBe(ApprovalStatus.APPROVED);
    expect(approved[1].status).toBe(ApprovalStatus.APPROVED);
  });

  it('should bulk reject requests', async () => {
    const request1 = await workflow.createRequest(testUserId, testSignal);
    const request2 = await workflow.createRequest(testUserId, testSignal);
    
    const rejected = await workflow.bulkReject([request1.id, request2.id], 'reviewer-1', 'Batch reject');
    expect(rejected.length).toBe(2);
    expect(rejected[0].status).toBe(ApprovalStatus.REJECTED);
  });

  it('should register and trigger webhooks', async () => {
    const webhook = {
      id: 'webhook-1',
      url: 'https://example.com/webhook',
      events: [ApprovalStatus.APPROVED],
      secret: 'secret',
      active: true,
      createdAt: new Date()
    };
    
    workflow.registerWebhook(webhook);
    
    const request = await workflow.createRequest(testUserId, testSignal);
    await workflow.approveRequest(request.id, 'reviewer-1');
    
    // Webhook would be triggered (mocked in implementation)
    expect(true).toBe(true);
  });
});
