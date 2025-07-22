# Netlify Deployment Guide

This guide explains how to deploy the Multi-Blockchain Platform to Netlify.

## Prerequisites

- Node.js 18+ installed
- Netlify CLI installed (`npm install -g netlify-cli`)
- Netlify account
- Database (PostgreSQL) and Redis instances set up

## Project Structure for Netlify

```
multi-blockchain-platform/
├── netlify.toml          # Main Netlify configuration
├── _redirects           # Redirect rules
├── dist/                # Build output (created during build)
├── netlify/
│   └── functions/       # Serverless functions
│       └── api.js      # Main API handler
├── backend/             # Express backend (adapted for serverless)
├── frontend/            # Next.js frontend (optional)
└── *.html              # Static HTML files
```

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

In your Netlify dashboard, add these environment variables:

```env
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=your_redis_connection_string
JWT_SECRET=your_jwt_secret

# API Keys
COINGECKO_API_KEY=your_coingecko_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
CRYPTOCOMPARE_API_KEY=your_cryptocompare_api_key

# Blockchain Addresses
USDT_ADDRESS=TPw6NEgZRxEoX8s64zfCKfPjwRCHHPTjQN
TON_ADDRESS=UQA7SUW4pslVSudC0Cfi8NTQyZI1nHHi-frcp20EvQZSfn__

# CORS
CORS_ORIGIN=https://your-site.netlify.app
```

### 3. Build the Project

Run the Netlify build script:

```bash
npm run build:netlify
```

This script will:
- Build the shared package
- Build the backend TypeScript code
- Copy static files to the dist directory
- Create serverless function adapters
- Set up Prisma for serverless

### 4. Deploy to Netlify

#### Using Netlify CLI:

```bash
# Login to Netlify
netlify login

# Initialize new site or link existing
netlify init

# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

#### Using Git Integration:

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository in Netlify dashboard
3. Set build command: `npm run build:netlify`
4. Set publish directory: `dist`
5. Deploy automatically on push

## Configuration Details

### netlify.toml

The `netlify.toml` file configures:
- Build settings and commands
- Function directory and bundling
- Headers for security and CORS
- Redirects for API routes
- Environment variables

### _redirects

Simple redirect rules for:
- API routes to serverless functions
- Static page routes
- Clean URLs

### Serverless Functions

The Express backend is adapted to run as Netlify Functions using:
- `serverless-http` package
- Function handler at `/.netlify/functions/api`
- All API routes accessible under `/api/*`

## Features Supported

✅ Static HTML serving
✅ API routes via serverless functions
✅ CORS configuration
✅ Environment variables
✅ Database connections (PostgreSQL)
✅ Redis caching
✅ Security headers
✅ File uploads (with limitations)

## Limitations

⚠️ WebSocket connections not supported (use polling or external service)
⚠️ Function timeout: 10 seconds (26 seconds on Pro)
⚠️ Function memory: 1024 MB
⚠️ Request body size: 6 MB
⚠️ No persistent file storage (use external storage)

## Troubleshooting

### Function Timeouts
- Optimize database queries
- Implement caching
- Use background functions for long tasks

### CORS Issues
- Check CORS_ORIGIN environment variable
- Verify headers in netlify.toml

### Database Connection
- Ensure DATABASE_URL is correct
- Use connection pooling
- Handle cold starts

### Build Failures
- Check Node version (should be 18+)
- Verify all dependencies are listed
- Check build logs in Netlify dashboard

## Alternative: Edge Functions

For better performance, consider using Netlify Edge Functions:
- Lower latency
- No cold starts
- Deno runtime
- Global deployment

## Monitoring

Use Netlify's built-in monitoring:
- Function logs
- Analytics
- Error tracking
- Performance metrics

## Cost Considerations

- Free tier: 125k function requests/month
- Pro tier: 2M function requests/month
- Additional usage charged per request

## Support

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Support Forum](https://answers.netlify.com/)
- [Project Issues](https://github.com/your-repo/issues)