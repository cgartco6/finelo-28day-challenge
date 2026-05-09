import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { challengeRouter } from './routes/challenge.js';
import { simulatorRouter } from './routes/simulator.js';
import { autotraderRouter } from './routes/autotrader.js';
import { approvalRouter } from './routes/approval.js';
import { WebSocketManager } from './websocket/manager.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsManager = new WebSocketManager(wss);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Routes
app.use('/api/challenge', challengeRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/autotrader', autotraderRouter);
app.use('/api/approval', approvalRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API docs
app.get('/api-docs', (req, res) => {
  res.json({
    name: 'Finelo API',
    version: '1.0.0',
    endpoints: {
      challenge: {
        'GET /api/challenge/today/:userId': 'Get today\'s lesson',
        'GET /api/challenge/lesson/:day': 'Get specific lesson',
        'POST /api/challenge/quiz': 'Submit quiz answers',
        'GET /api/challenge/progress/:userId': 'Get user progress',
        'GET /api/challenge/stats': 'Get challenge statistics'
      },
      simulator: {
        'GET /api/simulator/assets': 'List all assets',
        'GET /api/simulator/asset/:symbol': 'Get asset details',
        'POST /api/simulator/order': 'Execute trade',
        'GET /api/simulator/portfolio/:userId': 'Get portfolio',
        'GET /api/simulator/orders/:userId': 'Get user orders',
        'POST /api/simulator/reset/:userId': 'Reset portfolio'
      },
      autotrader: {
        'GET /api/autotrader/strategies': 'List strategies',
        'POST /api/autotrader/evaluate': 'Evaluate and request approvals',
        'POST /api/autotrader/approve/:requestId': 'Approve trade',
        'POST /api/autotrader/reject/:requestId': 'Reject trade',
        'GET /api/autotrader/pending/:userId': 'Get pending approvals'
      },
      approval: {
        'GET /api/approval/requests/:userId': 'Get user requests',
        'GET /api/approval/request/:requestId': 'Get specific request',
        'POST /api/approval/approve/:requestId': 'Approve request',
        'POST /api/approval/reject/:requestId': 'Reject request',
        'GET /api/approval/stats/:userId': 'Get approval statistics'
      }
    },
    websocket: {
      url: 'ws://localhost:4000/ws',
      events: ['trade_update', 'approval_update', 'price_update']
    }
  });
});

// WebSocket connection handling
wsManager.start();

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500,
    timestamp: new Date()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 4000;
const WS_PORT = process.env.WS_PORT || 4001;

server.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}/ws`);
  console.log(`📚 API docs available at http://localhost:${PORT}/api-docs`);
});

export { app, wsManager };
