# NEXUS Multi-Blockchain Platform - Vercel Deployment Guide

## Overview
This document provides comprehensive instructions for deploying the NEXUS Multi-Blockchain Platform on Vercel, including all the new features implemented.

## Features Deployed
- ✅ Multi-blockchain wallet generation (ETH, BTC, DOGE, TON, USDT)
- ✅ NUSD (Nexus USD) swap functionality
- ✅ Admin panel with user insights and monitoring
- ✅ Dark/Light mode toggle
- ✅ External wallet connections (MetaMask, WalletConnect, TON Wallet, Trust Wallet)
- ✅ Real-time market data integration
- ✅ Professional trading interface

## Prerequisites
1. Vercel account
2. GitHub repository connected to Vercel
3. Environment variables configured

## Environment Variables
Configure these in your Vercel dashboard under Settings > Environment Variables:

### Required API Keys
- `COINGECKO_API_KEY`: Your CoinGecko API key for market data
- `COINMARKETCAP_API_KEY`: Your CoinMarketCap API key (optional backup)
- `CRYPTOCOMPARE_API_KEY`: Your CryptoCompare API key (optional backup)

### Database
- `DATABASE_URL`: PostgreSQL connection string for production
- `REDIS_URL`: Redis connection string for caching (optional)

### Blockchain Addresses
- `USDT_ADDRESS`: Your USDT receiving address (TPw6NEgZRxEoX8s64zfCKfPjwRCHHPTjQN)
- `TON_ADDRESS`: Your TON receiving address (UQA7SUW4pslVSudC0Cfi8NTQyZI1nHHi-frcp20EvQZSfn__)

### Configuration
- `NODE_ENV`: Set to "production"
- `CORS_ORIGIN`: Your Vercel app URL (e.g., https://nexus-multi-blockchain-platform.vercel.app)

## Deployment Steps

### 1. Repository Setup
```bash
git clone <your-repo>
cd multi-blockchain-platform
```

### 2. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 3. Login to Vercel
```bash
vercel login
```

### 4. Deploy to Vercel
```bash
vercel --prod
```

### 5. Configure Domain (Optional)
In Vercel dashboard:
1. Go to your project settings
2. Navigate to Domains
3. Add your custom domain if desired

## Routes Available

### Main Application Routes
- `/` - Main trading interface (CoinGecko-style UI)
- `/admin` - Admin panel with user insights and monitoring
- `/wallet-center` - Dedicated wallet management interface
- `/modern` - Modern UI variant
- `/demo` - Quick demo interface
- `/tech` - Technical interface
- `/simple` - Self-contained UI
- `/test-wallet` - Wallet generation testing

### API Routes
- `/api/v1/wallet/*` - Wallet management endpoints
- `/api/v1/swap/*` - NUSD swap and trading endpoints
- `/api/v1/market/*` - Market data endpoints
- `/api/v1/blockchain/*` - Blockchain interaction endpoints
- `/api/v1/nexus/*` - NEXUS Bucks and rewards endpoints
- `/health` - Health check endpoint

## Features Overview

### 🔐 Wallet Generation
- Supports ETH, BTC, DOGE, TON, and USDT
- BIP39 mnemonic generation
- HD wallet derivation
- Network-specific wallet creation
- Multi-network wallet generation

### 🪙 NUSD Swap System
- Convert ETH/BTC/DOGE/TON/USDT to NUSD
- Real-time exchange rates
- Deposit instructions with addresses
- Transaction history tracking
- 1 NUSD = $1 USD guaranteed

### 👤 Admin Panel
- User activity monitoring
- IP address tracking
- Geographic distribution analytics
- Real-time session tracking
- Transaction volume metrics
- Live activity feed

### 🔗 External Wallet Support
- MetaMask integration
- WalletConnect protocol
- TON Wallet support
- Trust Wallet compatibility
- Connection status tracking
- Wallet disconnection

### 🌓 Dark/Light Mode
- System preference detection
- Manual toggle option
- Persistent user preference
- Smooth transitions

## Performance Optimizations

### Caching
- Static assets cached for 1 year
- API responses cached appropriately
- CDN optimization via Vercel

### Security Headers
- Content Security Policy
- X-Frame-Options
- XSS Protection
- Content-Type-Options

### Function Configuration
- 30-second timeout for API functions
- 512MB memory allocation
- Lambda optimization

## Monitoring and Analytics

### Health Checks
- `/health` endpoint for monitoring
- Database connectivity checks
- API service status

### Logs
- Structured logging with timestamps
- Error tracking and reporting
- Performance metrics

## Troubleshooting

### Common Issues

1. **API Routes Not Working**
   - Check vercel.json configuration
   - Verify environment variables
   - Check function logs in Vercel dashboard

2. **Database Connection Errors**
   - Verify DATABASE_URL is set correctly
   - Check database server accessibility
   - Review connection pool settings

3. **Static Files Not Loading**
   - Check build output directory
   - Verify file paths in HTML
   - Review static file routing

### Debug Commands
```bash
# Check deployment status
vercel --prod --debug

# View function logs
vercel logs

# Check environment variables
vercel env ls
```

## Post-Deployment Checklist

- [ ] Verify all routes are accessible
- [ ] Test wallet generation functionality
- [ ] Test NUSD swap operations
- [ ] Check admin panel accessibility
- [ ] Verify external wallet connections
- [ ] Test dark/light mode toggle
- [ ] Confirm API endpoints are working
- [ ] Check database connectivity
- [ ] Verify environment variables are set
- [ ] Test responsive design on mobile

## Support

For deployment issues:
1. Check Vercel dashboard logs
2. Review environment variable configuration
3. Verify database connectivity
4. Check API endpoint functionality

## Security Considerations

- Environment variables are secure in Vercel
- No private keys stored on server
- CORS configured for security
- Rate limiting implemented
- Secure headers configured

## Scaling

The application is configured to handle:
- Multiple concurrent users
- High API request volumes
- Real-time data updates
- Large transaction volumes

For higher loads, consider:
- Database connection pooling
- Redis caching implementation
- CDN optimization
- Function timeout adjustments