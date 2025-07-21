import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import walletRoutes from './api/walletRoutes';
import blockchainRoutes from './api/blockchainRoutes';
import marketRoutes from './api/marketRoutes';
import swapRoutes from './api/swapRoutes';
import nexusRoutes from './api/nexusRoutes';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3001"],
      mediaSrc: ["'self'", "data:"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Serve static UI - CoinGecko style (default)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../coingecko-ui.html'));
});

// Serve demo page
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../../quick-demo.html'));
});

// Serve alternative UIs
app.get('/modern', (req, res) => {
  res.sendFile(path.join(__dirname, '../../modern-ui.html'));
});

app.get('/simple', (req, res) => {
  res.sendFile(path.join(__dirname, '../../self-contained-ui.html'));
});

app.get('/tech', (req, res) => {
  res.sendFile(path.join(__dirname, '../../tech-ui.html'));
});

// Test page for wallet generation
app.get('/test-wallet', (req, res) => {
  res.sendFile(path.join(__dirname, '../../test-wallet-generation.html'));
});

// Wallet Center page
app.get('/wallet-center', (req, res) => {
  res.sendFile(path.join(__dirname, '../../wallet-center.html'));
});

// API Routes
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/blockchain', blockchainRoutes);
app.use('/api/v1/market', marketRoutes);
app.use('/api/v1/swap', swapRoutes);
app.use('/api/v1/nexus', nexusRoutes);

// Basic API endpoints
app.get('/api/v1/blockchains', (req, res) => {
  res.json({
    blockchains: ['TON', 'ETHEREUM', 'BITCOIN', 'DOGECOIN'],
    tokens: {
      USDT: {
        blockchain: 'ETHEREUM',
        type: 'ERC20',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      },
    },
  });
});

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

// Start server
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});

startServer();