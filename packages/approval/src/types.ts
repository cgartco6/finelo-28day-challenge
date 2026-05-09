import { TradeSignal } from "@finelo/autotrader";

export interface ApprovalRequest {
  id: string;
  userId: string;
  signal: TradeSignal;
  status: "pending" | "approved" | "rejected" | "executed";
  requestedAt: Date;
  approvedAt?: Date;
}
