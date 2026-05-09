// packages/simulator/src/SimulatorEngine.ts
export interface Asset {
  symbol: string;
  name: string;
  currentPrice: number;
}

export interface Order {
  userId: string;
  assetSymbol: string;
  type: "buy" | "sell";
  quantity: number;
  timestamp: Date;
}

export class SimulatorEngine {
  private balances: Map<string, Map<string, number>> = new Map(); // userId -> asset -> quantity

  async executeOrder(order: Order): Promise<{ success: boolean; message: string }> {
    const asset = await this.marketData.getAsset(order.assetSymbol);
    if (!asset) return { success: false, message: "Asset not found" };

    const cost = asset.currentPrice * order.quantity;
    const userBalance = this.getBalance(order.userId, "USD");

    if (order.type === "buy" && userBalance < cost) {
      return { success: false, message: "Insufficient virtual USD" };
    }

    // Update balances
    if (order.type === "buy") {
      this.addBalance(order.userId, "USD", -cost);
      this.addBalance(order.userId, order.assetSymbol, order.quantity);
    } else {
      this.addBalance(order.userId, "USD", cost);
      this.addBalance(order.userId, order.assetSymbol, -order.quantity);
    }

    return { success: true, message: "Order executed in simulator" };
  }
}
