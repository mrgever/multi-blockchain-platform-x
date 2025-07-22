const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API endpoints
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// Initialize services based on environment
let walletRoutes, blockchainRoutes, marketRoutes, swapRoutes, nexusRoutes;

try {
  // Try to load compiled routes
  walletRoutes = require('../../backend/dist/api/walletRoutes').default;
  blockchainRoutes = require('../../backend/dist/api/blockchainRoutes').default;
  marketRoutes = require('../../backend/dist/api/marketRoutes').default;
  swapRoutes = require('../../backend/dist/api/swapRoutes').default;
  nexusRoutes = require('../../backend/dist/api/nexusRoutes').default;
} catch (error) {
  console.warn('Could not load compiled routes, using mock routes');
  
  // Fallback mock routes for initial deployment
  const mockRouter = express.Router();
  
  mockRouter.get('/', (req, res) => {
    res.json({ message: 'API endpoint available', path: req.baseUrl });
  });
  
  mockRouter.post('/', (req, res) => {
    res.json({ message: 'POST endpoint', data: req.body });
  });
  
  walletRoutes = blockchainRoutes = marketRoutes = swapRoutes = nexusRoutes = mockRouter;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    runtime: 'netlify-function'
  });
});

// API Routes with /api prefix
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

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested API endpoint does not exist',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  
  // Handle different error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      message: err.message,
      details: err.details || {}
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({ 
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred processing your request' 
      : err.message
  });
});

// Export the serverless function
module.exports.handler = serverless(app, {
  // Options for serverless-http
  binary: ['image/*', 'application/pdf'],
  request: (request, event, context) => {
    // Add context to request for use in routes
    request.netlifyContext = context;
    request.netlifyEvent = event;
  }
});