import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface WebSocketClient extends WebSocket {
  userId?: string;
  isAlive: boolean;
  subscriptions: Set<string>;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.pingInterval = setInterval(() => this.pingClients(), 30000);
  }

  start(): void {
    this.wss.on('connection', (ws: WebSocketClient, req: IncomingMessage) => {
      ws.isAlive = true;
      ws.subscriptions = new Set();
      
      // Extract user ID from query string or headers
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      ws.userId = url.searchParams.get('userId') || undefined;
      
      if (ws.userId) {
        this.clients.set(ws.userId, ws);
        console.log(`WebSocket connected for user: ${ws.userId}`);
      }
      
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });
      
      ws.on('close', () => {
        if (ws.userId) {
          this.clients.delete(ws.userId);
          console.log(`WebSocket disconnected for user: ${ws.userId}`);
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        userId: ws.userId,
        timestamp: new Date()
      }));
    });
  }
  
  private handleMessage(ws: WebSocketClient, message: any): void {
    switch (message.type) {
      case 'subscribe':
        if (message.channels && Array.isArray(message.channels)) {
          message.channels.forEach((channel: string) => {
            ws.subscriptions.add(channel);
          });
          ws.send(JSON.stringify({
            type: 'subscribed',
            channels: Array.from(ws.subscriptions),
            timestamp: new Date()
          }));
        }
        break;
        
      case 'unsubscribe':
        if (message.channels && Array.isArray(message.channels)) {
          message.channels.forEach((channel: string) => {
            ws.subscriptions.delete(channel);
          });
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            channels: Array.from(ws.subscriptions),
            timestamp: new Date()
          }));
        }
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          error: `Unknown message type: ${message.type}`,
          timestamp: new Date()
        }));
    }
  }
  
  private pingClients(): void {
    for (const [userId, client] of this.clients) {
      if (client.isAlive === false) {
        console.log(`Terminating inactive connection for user: ${userId}`);
        client.terminate();
        this.clients.delete(userId);
        continue;
      }
      
      client.isAlive = false;
      client.ping();
    }
  }
  
  broadcast(channel: string, data: any, excludeUserId?: string): void {
    const message = JSON.stringify({
      type: 'broadcast',
      channel,
      data,
      timestamp: new Date()
    });
    
    for (const [userId, client] of this.clients) {
      if (excludeUserId && userId === excludeUserId) continue;
      if (client.subscriptions.has(channel) || channel === 'global') {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  }
  
  sendToUser(userId: string, type: string, data: any): boolean {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, data, timestamp: new Date() }));
      return true;
    }
    return false;
  }
  
  sendTradeUpdate(userId: string, trade: any): void {
    this.sendToUser(userId, 'trade_update', trade);
    this.broadcast('trades', { userId, trade }, userId);
  }
  
  sendApprovalUpdate(userId: string, approval: any): void {
    this.sendToUser(userId, 'approval_update', approval);
  }
  
  sendPriceUpdate(symbol: string, price: number): void {
    this.broadcast('prices', { symbol, price });
  }
  
  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }
  
  getConnectionCount(): number {
    return this.clients.size;
  }
  
  shutdown(): void {
    clearInterval(this.pingInterval);
    
    for (const [userId, client] of this.clients) {
      client.close();
      this.clients.delete(userId);
    }
    
    this.wss.close();
  }
}
