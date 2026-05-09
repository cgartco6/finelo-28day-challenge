import { TradeSignal } from '@finelo/autotrader';

export enum ApprovalStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  EXECUTED = 'executed',
  FAILED = 'failed'
}

export enum ApprovalPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  signal: TradeSignal;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  requestedAt: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  executedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  expirationTime: Date;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface ApprovalFilters {
  userId?: string;
  status?: ApprovalStatus[];
  priority?: ApprovalPriority[];
  fromDate?: Date;
  toDate?: Date;
  asset?: string;
  strategy?: string;
  limit?: number;
  offset?: number;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
  failed: number;
  averageApprovalTimeMs: number;
  approvalRate: number;
  byPriority: Record<ApprovalPriority, number>;
  byStrategy: Record<string, number>;
  byAsset: Record<string, number>;
}

export interface ApprovalAction {
  requestId: string;
  action: 'approve' | 'reject' | 'cancel' | 'escalate';
  reason?: string;
  actor: string;
  timestamp: Date;
}

export interface ApprovalWebhook {
  id: string;
  url: string;
  events: ApprovalStatus[];
  secret: string;
  active: boolean;
  createdAt: Date;
}

export interface ApprovalNotification {
  requestId: string;
  userId: string;
  type: 'email' | 'push' | 'sms' | 'webhook';
  sentAt: Date;
  status: 'sent' | 'failed';
  error?: string;
}
