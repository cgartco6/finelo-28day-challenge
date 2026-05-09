export interface TradeSignal {
  asset: string;
  action: "buy" | "sell";
  quantity: number;
  price: number;
  reason: string;
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  signal: TradeSignal;
  status: "pending" | "approved" | "rejected" | "executed";
  requestedAt: Date;
  approvedAt?: Date;
}

export interface TradingStrategy {
  evaluate(userId: string): Promise<TradeSignal | null>;
}
