#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏗️  Starting Netlify build process...');

// 1. Create necessary directories
const dirs = ['dist', 'netlify/functions'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// 2. Build shared package
console.log('📦 Building shared package...');
execSync('cd shared && npm install && npm run build', { stdio: 'inherit' });

// 3. Build backend
console.log('🔧 Building backend...');
execSync('cd backend && npm install && npm run build', { stdio: 'inherit' });

// 4. Copy static files to dist
console.log('📋 Copying static files...');
const staticFiles = [
  'index.html',
  'coingecko-ui.html',
  'modern-ui.html',
  'self-contained-ui.html',
  'tech-ui.html',
  'quick-demo.html',
  'test-wallet-generation.html',
  'wallet-center.html',
  'admin-panel.html',
  'nexus-compact-ui.html',
  'static-ui.html',
  '_redirects'
];

staticFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('dist', file));
    console.log(`✅ Copied ${file}`);
  }
});

// 5. Create serverless function adapter
console.log('⚡ Creating serverless function adapter...');
const functionAdapter = `
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');

// Import routes
const walletRoutes = require('../../backend/dist/api/walletRoutes').default;
const blockchainRoutes = require('../../backend/dist/api/blockchainRoutes').default;
const marketRoutes = require('../../backend/dist/api/marketRoutes').default;
const swapRoutes = require('../../backend/dist/api/swapRoutes').default;
const nexusRoutes = require('../../backend/dist/api/nexusRoutes').default;

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
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

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Export handler for Netlify Functions
module.exports.handler = serverless(app);
`;

fs.writeFileSync('netlify/functions/api.js', functionAdapter);
console.log('✅ Created serverless function adapter');

// 6. Copy backend dependencies
console.log('📦 Setting up function dependencies...');
const functionPackageJson = {
  name: "netlify-functions",
  version: "1.0.0",
  dependencies: {
    ...require('../backend/package.json').dependencies,
    "serverless-http": "^3.2.0"
  }
};

fs.writeFileSync('netlify/functions/package.json', JSON.stringify(functionPackageJson, null, 2));
console.log('✅ Created function package.json');

// 7. Copy Prisma schema
console.log('🗄️  Copying Prisma configuration...');
if (fs.existsSync('backend/prisma')) {
  const prismaDir = 'netlify/functions/prisma';
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }
  fs.copyFileSync('backend/prisma/schema.prisma', path.join(prismaDir, 'schema.prisma'));
  console.log('✅ Copied Prisma schema');
}

// 8. Create environment template
console.log('🔐 Creating environment template...');
const envTemplate = `# Netlify Environment Variables Template
# Copy this to your Netlify dashboard

NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=your_database_url_here
REDIS_URL=your_redis_url_here

# API Keys
COINGECKO_API_KEY=your_coingecko_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
CRYPTOCOMPARE_API_KEY=your_cryptocompare_api_key

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Blockchain Addresses
USDT_ADDRESS=TPw6NEgZRxEoX8s64zfCKfPjwRCHHPTjQN
TON_ADDRESS=UQA7SUW4pslVSudC0Cfi8NTQyZI1nHHi-frcp20EvQZSfn__

# CORS
CORS_ORIGIN=https://your-site.netlify.app
`;

fs.writeFileSync('.env.netlify.template', envTemplate);
console.log('✅ Created environment template');

console.log('✨ Netlify build complete!');
console.log('');
console.log('📝 Next steps:');
console.log('1. Set up environment variables in Netlify dashboard');
console.log('2. Deploy with: netlify deploy');
console.log('3. For production: netlify deploy --prod');