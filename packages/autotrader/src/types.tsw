// packages/autotrader/src/types.ts
export interface TradeSignal {
  asset: string;
  action: "buy" | "sell";
  quantity: number;
  price: number;
  reason: string; // e.g., "RSI(14) below 30"
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  signal: TradeSignal;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  approvedAt?: Date;
}

export class AutoTraderEngine {
  private strategies: TradingStrategy[] = [];

  registerStrategy(strategy: TradingStrategy) {
    this.strategies.push(strategy);
  }

  async evaluateAndRequest(userId: string): Promise<ApprovalRequest[]> {
    const signals: TradeSignal[] = [];
    for (const strategy of this.strategies) {
      const signal = await strategy.evaluate(userId);
      if (signal) signals.push(signal);
    }

    const requests = await Promise.all(signals.map(s => this.approvalService.createRequest(userId, s)));
    this.notificationService.notifyUser(userId, "new_trade_requests", requests);
    return requests;
  }

  async executeApproved(approvalId: string): Promise<boolean> {
    const request = await this.approvalService.get(approvalId);
    if (request.status !== "approved") return false;

    // Execute trade via live exchange connector (can be swapped for simulation)
    const success = await this.executionService.placeOrder(request.signal);
    if (success) {
      await this.approvalService.updateStatus(approvalId, "executed");
    }
    return success;
  }
}
