'use client';

import { useState, useEffect } from 'react';
import { ApprovalQueue } from '../../components/ApprovalQueue';

export default function ApprovalsPage() {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [stats, setStats] = useState(null);
  const userId = 'demo-user-123';

  useEffect(() => {
    fetchPendingApprovals();
    fetchStats();
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetchPendingApprovals();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPendingApprovals = async () => {
    const res = await fetch(`/api/autotrader/pending/${userId}`);
    const data = await res.json();
    setPendingApprovals(data);
  };

  const fetchStats = async () => {
    const res = await fetch(`/api/approval/stats/${userId}`);
    const data = await res.json();
    setStats(data);
  };

  const handleApprove = async (requestId: string) => {
    const res = await fetch(`/api/autotrader/approve/${requestId}`, { method: 'POST' });
    if (res.ok) {
      await fetchPendingApprovals();
      await fetchStats();
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    const res = await fetch(`/api/autotrader/reject/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (res.ok) {
      await fetchPendingApprovals();
      await fetchStats();
    }
  };

  const handleBulkApprove = async () => {
    const requestIds = pendingApprovals.map(r => r.id);
    const res = await fetch('/api/approval/bulk-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestIds, reviewerId: userId })
    });
    if (res.ok) {
      await fetchPendingApprovals();
      await fetchStats();
    }
  };

  const handleBulkReject = async () => {
    const reason = prompt('Reason for rejecting all pending approvals:');
    if (!reason) return;
    
    const requestIds = pendingApprovals.map(r => r.id);
    const res = await fetch('/api/approval/bulk-reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestIds, reviewerId: userId, reason })
    });
    if (res.ok) {
      await fetchPendingApprovals();
      await fetchStats();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Trade Approvals</h1>
      
      {/* Stats Overview */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-2xl font-bold text-blue-600">{stats.pending || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="card">
            <div className="text-2xl font-bold text-purple-600">{stats.approvalRate?.toFixed(1) || 0}%</div>
            <div className="text-sm text-gray-600">Approval Rate</div>
          </div>
        </div>
      )}
      
      {/* Bulk Actions */}
      {pendingApprovals.length > 1 && (
        <div className="flex gap-4 mb-6">
          <button onClick={handleBulkApprove} className="btn-primary">
            Approve All ({pendingApprovals.length})
          </button>
          <button onClick={handleBulkReject} className="btn-danger">
            Reject All
          </button>
        </div>
      )}
      
      {/* Approval Queue */}
      <ApprovalQueue
        approvals={pendingApprovals}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      
      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">ℹ️ About Auto-Trading Approvals</h3>
        <p className="text-sm text-gray-700">
          Auto-trading strategies analyze market conditions and request your approval before executing trades.
          You can approve, reject, or set auto-approval rules for each strategy in settings.
          Pending requests expire after 30 minutes if not acted upon.
        </p>
      </div>
    </div>
  );
}
