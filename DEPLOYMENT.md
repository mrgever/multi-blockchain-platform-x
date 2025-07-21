# NEXUS Platform Deployment Guide

## 🚀 Live Deployment Options

### Option 1: Deploy to Vercel (Recommended)

#### Quick Deploy with GitHub
1. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/your-username/nexus-blockchain-platform.git
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the configuration

#### Manual Deploy with Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Deploy to Netlify
1. **Drag & Drop Deployment**:
   - Visit [netlify.com](https://netlify.com)
   - Drag the project folder to deploy

2. **GitHub Integration**:
   - Connect your GitHub repository
   - Netlify will auto-deploy on commits

### Option 3: Deploy to GitHub Pages
1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Select source: Deploy from a branch → main
   - Your site will be available at: `https://username.github.io/nexus-blockchain-platform`

## 📁 Project Structure
```
nexus-blockchain-platform/
├── coingecko-ui.html          # Main UI (entry point)
├── index.html                 # Redirect page  
├── vercel.json               # Vercel configuration
├── nexus-extension/          # Browser extension
├── backend/                  # API server
└── package.json             # Project configuration
```

## 🌐 Environment Variables
For production deployment, set these environment variables:

```bash
# API Configuration
NEXUS_API_URL=https://your-domain.com/api
NODE_ENV=production

# Database (if using backend)
DATABASE_URL=your-production-database-url

# External APIs
COINGECKO_API_KEY=your-coingecko-api-key
COINMARKETCAP_API_KEY=your-coinmarketcap-api-key
```

## 🔧 Build Configuration

The project is configured for static deployment with the main UI at `coingecko-ui.html`. The backend can be deployed separately or as serverless functions.

### Frontend Features
- ✅ Multi-blockchain wallet management
- ✅ Real-time market data
- ✅ Trading interface
- ✅ Credit system & subscriptions  
- ✅ Developer API documentation
- ✅ Browser extension

### Backend API (Optional)
- 🔧 Wallet generation & management
- 🔧 Transaction services
- 🔧 Market data aggregation
- 🔧 User authentication

## 🚀 Quick Start
1. Clone the repository
2. Configure environment variables
3. Deploy using your preferred method
4. Access the live platform!

## 📞 Support
For deployment issues, contact: support@nexus.dev