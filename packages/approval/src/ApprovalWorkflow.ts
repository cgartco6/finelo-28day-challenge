// packages/approval/src/ApprovalWorkflow.ts
export class ApprovalWorkflow {
  async createRequest(userId: string, signal: TradeSignal): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      userId,
      signal,
      status: "pending",
      requestedAt: new Date(),
    };
    await this.store.save(request);
    return request;
  }

  async approve(requestId: string, approved: boolean): Promise<void> {
    const request = await this.store.get(requestId);
    if (!request) throw new Error("Request not found");
    request.status = approved ? "approved" : "rejected";
    request.approvedAt = new Date();
    await this.store.save(request);
  }
}
