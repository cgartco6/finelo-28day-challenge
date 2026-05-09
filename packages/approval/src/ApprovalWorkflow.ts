import { 
  ApprovalRequest, 
  ApprovalStatus, 
  ApprovalPriority, 
  ApprovalFilters, 
  ApprovalStats,
  ApprovalAction 
} from './types.js';
import { TradeSignal } from '@finelo/autotrader';
import { randomUUID } from 'crypto';

export class ApprovalWorkflow {
  private requests: Map<string, ApprovalRequest> = new Map();
  private actions: Map<string, ApprovalAction[]> = new Map();
  private webhooks: Map<string, any> = new Map();
  private notificationQueue: any[] = [];

  async createRequest(userId: string, signal: TradeSignal, priority?: ApprovalPriority): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: randomUUID(),
      userId,
      signal,
      status: ApprovalStatus.PENDING,
      priority: priority || this.calculatePriority(signal),
      requestedAt: new Date(),
      expirationTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes default
      retryCount: 0,
      metadata: {}
    };

    this.requests.set(request.id, request);
    
    // Queue notification
    await this.queueNotification(request, 'pending');
    
    // Trigger webhooks
    await this.triggerWebhooks(request);
    
    // Schedule expiration check
    this.scheduleExpirationCheck(request);
    
    return request;
  }

  private calculatePriority(signal: TradeSignal): ApprovalPriority {
    // Higher confidence = higher priority
    if (signal.confidence >= 90) return ApprovalPriority.CRITICAL;
    if (signal.confidence >= 80) return ApprovalPriority.HIGH;
    if (signal.confidence >= 70) return ApprovalPriority.MEDIUM;
    return ApprovalPriority.LOW;
  }

  private scheduleExpirationCheck(request: ApprovalRequest): void {
    const timeUntilExpiry = request.expirationTime.getTime() - Date.now();
    if (timeUntilExpiry > 0) {
      setTimeout(async () => {
        const current = this.requests.get(request.id);
        if (current && current.status === ApprovalStatus.PENDING) {
          await this.expireRequest(request.id);
        }
      }, timeUntilExpiry);
    }
  }

  async approveRequest(requestId: string, reviewerId: string, notes?: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING && request.status !== ApprovalStatus.REVIEWING) {
      throw new Error(`Cannot approve request in status: ${request.status}`);
    }

    request.status = ApprovalStatus.APPROVED;
    request.approvedAt = new Date();
    request.reviewedAt = new Date();
    request.reviewedBy = reviewerId;
    request.approvalNotes = notes;
    
    this.requests.set(requestId, request);
    
    // Log action
    this.logAction(requestId, {
      requestId,
      action: 'approve',
      reason: notes,
      actor: reviewerId,
      timestamp: new Date()
    });
    
    // Queue notification
    await this.queueNotification(request, 'approved');
    
    // Trigger webhooks
    await this.triggerWebhooks(request);
    
    return request;
  }

  async rejectRequest(requestId: string, reviewerId: string, reason: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING && request.status !== ApprovalStatus.REVIEWING) {
      throw new Error(`Cannot reject request in status: ${request.status}`);
    }

    request.status = ApprovalStatus.REJECTED;
    request.rejectedAt = new Date();
    request.reviewedAt = new Date();
    request.reviewedBy = reviewerId;
    request.rejectionReason = reason;
    
    this.requests.set(requestId, request);
    
    // Log action
    this.logAction(requestId, {
      requestId,
      action: 'reject',
      reason,
      actor: reviewerId,
      timestamp: new Date()
    });
    
    // Queue notification
    await this.queueNotification(request, 'rejected');
    
    // Trigger webhooks
    await this.triggerWebhooks(request);
    
    return request;
  }

  async cancelRequest(requestId: string, userId: string, reason?: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.userId !== userId) {
      throw new Error(`User ${userId} does not own request ${requestId}`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Cannot cancel request in status: ${request.status}`);
    }

    request.status = ApprovalStatus.CANCELLED;
    request.rejectionReason = reason || 'Cancelled by user';
    
    this.requests.set(requestId, request);
    
    // Log action
    this.logAction(requestId, {
      requestId,
      action: 'cancel',
      reason,
      actor: userId,
      timestamp: new Date()
    });
    
    return request;
  }

  async expireRequest(requestId: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status === ApprovalStatus.PENDING || request.status === ApprovalStatus.REVIEWING) {
      request.status = ApprovalStatus.EXPIRED;
      this.requests.set(requestId, request);
      
      // Log action
      this.logAction(requestId, {
        requestId,
        action: 'cancel',
        reason: 'Request expired',
        actor: 'system',
        timestamp: new Date()
      });
    }
    
    return request;
  }

  async markExecuted(requestId: string, executionResult?: any): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.APPROVED) {
      throw new Error(`Cannot execute request in status: ${request.status}`);
    }

    request.status = ApprovalStatus.EXECUTED;
    request.executedAt = new Date();
    request.metadata.executionResult = executionResult;
    
    this.requests.set(requestId, request);
    
    // Queue notification
    await this.queueNotification(request, 'executed');
    
    // Trigger webhooks
    await this.triggerWebhooks(request);
    
    return request;
  }

  async markFailed(requestId: string, error: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    request.status = ApprovalStatus.FAILED;
    request.metadata.error = error;
    request.retryCount++;
    
    this.requests.set(requestId, request);
    
    // Queue notification
    await this.queueNotification(request, 'failed');
    
    return request;
  }

  async getRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.requests.get(requestId) || null;
  }

  async getUserRequests(userId: string, filters?: ApprovalFilters): Promise<ApprovalRequest[]> {
    let requests: ApprovalRequest[] = [];
    
    for (const request of this.requests.values()) {
      if (request.userId === userId) {
        requests.push(request);
      }
    }
    
    // Apply filters
    if (filters) {
      if (filters.status) {
        requests = requests.filter(r => filters.status!.includes(r.status));
      }
      if (filters.priority) {
        requests = requests.filter(r => filters.priority!.includes(r.priority));
      }
      if (filters.fromDate) {
        requests = requests.filter(r => r.requestedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        requests = requests.filter(r => r.requestedAt <= filters.toDate!);
      }
      if (filters.asset) {
        requests = requests.filter(r => r.signal.asset === filters.asset);
      }
      if (filters.strategy) {
        requests = requests.filter(r => r.signal.strategyName === filters.strategy);
      }
      
      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      requests = requests.slice(offset, offset + limit);
    }
    
    // Sort by most recent first
    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  async getAllRequests(filters?: ApprovalFilters): Promise<ApprovalRequest[]> {
    let requests = Array.from(this.requests.values());
    
    if (filters) {
      if (filters.userId) {
        requests = requests.filter(r => r.userId === filters.userId);
      }
      if (filters.status) {
        requests = requests.filter(r => filters.status!.includes(r.status));
      }
      if (filters.priority) {
        requests = requests.filter(r => filters.priority!.includes(r.priority));
      }
      if (filters.fromDate) {
        requests = requests.filter(r => r.requestedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        requests = requests.filter(r => r.requestedAt <= filters.toDate!);
      }
      
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      requests = requests.slice(offset, offset + limit);
    }
    
    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  async getStats(filters?: ApprovalFilters): Promise<ApprovalStats> {
    let requests = Array.from(this.requests.values());
    
    if (filters) {
      if (filters.userId) {
        requests = requests.filter(r => r.userId === filters.userId);
      }
      if (filters.fromDate) {
        requests = requests.filter(r => r.requestedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        requests = requests.filter(r => r.requestedAt <= filters.toDate!);
      }
    }
    
    const stats: ApprovalStats = {
      total: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      executed: 0,
      failed: 0,
      averageApprovalTimeMs: 0,
      approvalRate: 0,
      byPriority: {
        [ApprovalPriority.LOW]: 0,
        [ApprovalPriority.MEDIUM]: 0,
        [ApprovalPriority.HIGH]: 0,
        [ApprovalPriority.CRITICAL]: 0
      },
      byStrategy: {},
      byAsset: {}
    };
    
    let totalApprovalTime = 0;
    let approvedCount = 0;
    
    for (const request of requests) {
      // Count by status
      stats[request.status]++;
      
      // Count by priority
      stats.byPriority[request.priority]++;
      
      // Count by strategy
      const strategy = request.signal.strategyName;
      stats.byStrategy[strategy] = (stats.byStrategy[strategy] || 0) + 1;
      
      // Count by asset
      const asset = request.signal.asset;
      stats.byAsset[asset] = (stats.byAsset[asset] || 0) + 1;
      
      // Calculate approval time
      if (request.approvedAt && request.requestedAt) {
        const approvalTime = request.approvedAt.getTime() - request.requestedAt.getTime();
        totalApprovalTime += approvalTime;
        approvedCount++;
      }
    }
    
    stats.averageApprovalTimeMs = approvedCount > 0 ? totalApprovalTime / approvedCount : 0;
    stats.approvalRate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
    
    return stats;
  }

  private logAction(requestId: string, action: ApprovalAction): void {
    if (!this.actions.has(requestId)) {
      this.actions.set(requestId, []);
    }
    this.actions.get(requestId)!.push(action);
  }

  async getRequestActions(requestId: string): Promise<ApprovalAction[]> {
    return this.actions.get(requestId) || [];
  }

  private async queueNotification(request: ApprovalRequest, event: string): Promise<void> {
    const notification = {
      requestId: request.id,
      userId: request.userId,
      type: 'push' as const,
      event,
      data: {
        signal: request.signal,
        status: request.status,
        timestamp: new Date()
      },
      sentAt: new Date(),
      status: 'pending' as const
    };
    
    this.notificationQueue.push(notification);
    
    // Process queue asynchronously (simplified)
    setImmediate(() => this.processNotificationQueue());
  }

  private async processNotificationQueue(): Promise<void> {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        try {
          // In production, send actual notification via FCM, APNS, etc.
          console.log(`Sending ${notification.type} notification to ${notification.userId}: ${notification.event}`);
          notification.status = 'sent';
        } catch (error) {
          notification.status = 'failed';
          notification.error = String(error);
        }
      }
    }
  }

  private async triggerWebhooks(request: ApprovalRequest): Promise<void> {
    for (const webhook of this.webhooks.values()) {
      if (webhook.events.includes(request.status)) {
        try {
          // In production, make HTTP POST request to webhook URL
          console.log(`Triggering webhook ${webhook.id} for request ${request.id}`);
        } catch (error) {
          console.error(`Webhook ${webhook.id} failed:`, error);
        }
      }
    }
  }

  registerWebhook(webhook: any): void {
    this.webhooks.set(webhook.id, webhook);
  }

  unregisterWebhook(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  async bulkApprove(requestIds: string[], reviewerId: string, notes?: string): Promise<ApprovalRequest[]> {
    const results: ApprovalRequest[] = [];
    for (const requestId of requestIds) {
      try {
        const request = await this.approveRequest(requestId, reviewerId, notes);
        results.push(request);
      } catch (error) {
        console.error(`Failed to approve ${requestId}:`, error);
      }
    }
    return results;
  }

  async bulkReject(requestIds: string[], reviewerId: string, reason: string): Promise<ApprovalRequest[]> {
    const results: ApprovalRequest[] = [];
    for (const requestId of requestIds) {
      try {
        const request = await this.rejectRequest(requestId, reviewerId, reason);
        results.push(request);
      } catch (error) {
        console.error(`Failed to reject ${requestId}:`, error);
      }
    }
    return results;
  }

  async escalateRequest(requestId: string, userId: string, reason: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    // Change priority to critical for escalation
    request.priority = ApprovalPriority.CRITICAL;
    request.status = ApprovalStatus.REVIEWING;
    request.metadata.escalatedAt = new Date();
    request.metadata.escalationReason = reason;
    request.metadata.escalatedBy = userId;
    
    this.requests.set(requestId, request);
    
    // Log action
    this.logAction(requestId, {
      requestId,
      action: 'escalate',
      reason,
      actor: userId,
      timestamp: new Date()
    });
    
    return request;
  }
}
