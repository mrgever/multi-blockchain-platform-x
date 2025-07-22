# NEXUS Production Deployment Guide

## Infrastructure Overview

This is a production-ready cryptocurrency payment platform built with:

- **Frontend**: Vite + Modern JavaScript/TypeScript
- **Backend**: Netlify Functions (Node.js)
- **Database**: FaunaDB (serverless)
- **Payment Processing**: Stripe + Multi-blockchain support
- **Security**: Sentry monitoring, CSP headers, rate limiting
- **Blockchain Integration**: Alchemy, Ethers.js, Web3Modal

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub Repository**: Push this code to GitHub
3. **Required API Keys**:
   - Stripe (test/live keys)
   - Alchemy API key: `UckD71aWHI5luV-VEtJsl7`
   - FaunaDB secret key
   - Sentry DSN (optional but recommended)
   - WalletConnect Project ID

## Environment Variables

Configure these in Netlify's environment settings:

```bash
# Stripe Configuration
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Blockchain & Web3
ALCHEMY_API_KEY=UckD71aWHI5luV-VEtJsl7
ALCHEMY_WEBHOOK_TOKEN=your_webhook_token
WALLETCONNECT_PROJECT_ID=your_project_id

# Database
FAUNA_SECRET_KEY=your_fauna_secret_key

# External APIs
COINGECKO_API_KEY=your_coingecko_api_key
BLOCKCYPHER_TOKEN=your_blockcypher_token

# Monitoring
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_token

# App Configuration
NODE_ENV=production
VITE_APP_URL=https://your-domain.netlify.app
```

## Deployment Steps

### 1. Database Setup

Create a FaunaDB database:

1. Sign up at [fauna.com](https://fauna.com)
2. Create a new database
3. Get your secret key
4. Run the setup script:

```bash
npm install
node scripts/setup-fauna.js
```

### 2. Stripe Configuration

1. Create a Stripe account
2. Get your API keys from the Stripe dashboard
3. Set up webhooks pointing to `https://your-domain.netlify.app/.netlify/functions/stripe-payment-intent`

### 3. Alchemy Setup

1. Your API key is already configured: `UckD71aWHI5luV-VEtJsl7`
2. Set up webhooks in Alchemy Notify for payment monitoring
3. Configure webhook endpoint: `https://your-domain.netlify.app/.netlify/functions/payment-webhook`

### 4. Netlify Deployment

#### Method 1: GitHub Integration (Recommended)

1. Push code to GitHub repository
2. Connect repository in Netlify dashboard
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in site settings
5. Deploy

#### Method 2: CLI Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
npm run deploy
```

### 5. Domain Configuration

1. Add your custom domain in Netlify settings
2. Configure DNS records
3. SSL certificate will be automatically generated

### 6. Security Configuration

1. **CSP Headers**: Already configured in `netlify.toml`
2. **Rate Limiting**: Built into serverless functions
3. **Sentry Monitoring**: Configure DSN in environment variables

## Post-Deployment Checklist

- [ ] Health check endpoint responding: `/.netlify/functions/health`
- [ ] Stripe webhook receiving events
- [ ] Alchemy webhook configured and receiving events
- [ ] Database collections and indexes created
- [ ] All environment variables set
- [ ] SSL certificate active
- [ ] Custom domain configured (if applicable)

## API Endpoints

- **Health Check**: `/.netlify/functions/health`
- **Payment API**: `/.netlify/functions/payments/*`
- **Stripe Integration**: `/.netlify/functions/stripe-payment-intent`
- **Crypto Rates**: `/.netlify/functions/rates`
- **Payment Webhook**: `/.netlify/functions/payment-webhook`

## Testing

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Production Testing

1. Test health endpoint
2. Create test payments with Stripe test cards
3. Test crypto payment flow with testnet
4. Verify webhook deliveries
5. Check monitoring in Sentry

## Monitoring & Alerts

- **Health Monitoring**: Built-in health check endpoint
- **Error Tracking**: Sentry integration
- **Payment Monitoring**: Webhook-based payment tracking
- **Performance**: Netlify analytics and function logs

## Security Features

- **CSP Headers**: Prevent XSS attacks
- **Rate Limiting**: Prevent abuse
- **Input Validation**: All inputs validated
- **Webhook Verification**: Stripe and Alchemy webhooks verified
- **CORS**: Properly configured for security

## Support

For deployment issues:
1. Check Netlify function logs
2. Verify environment variables
3. Test health endpoint
4. Check webhook configurations

## Scaling Considerations

- **Function Limits**: Netlify functions have execution limits
- **Database**: FaunaDB scales automatically
- **CDN**: Netlify provides global CDN
- **Monitoring**: Set up alerts for high error rates

This platform is production-ready and can handle enterprise-level traffic with proper configuration.