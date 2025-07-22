#!/bin/bash

echo "🚀 Deploying Multi-Blockchain Platform to Netlify"
echo "================================================"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the build process
echo "🏗️  Building project..."
npm run build:netlify

# Check if .netlify directory exists
if [ ! -d ".netlify" ]; then
    echo "🔗 Initializing Netlify site..."
    netlify init
fi

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
if [ "$1" == "--prod" ]; then
    netlify deploy --prod
else
    netlify deploy
    echo ""
    echo "📝 Note: This is a preview deployment."
    echo "   To deploy to production, run: ./deploy-netlify.sh --prod"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Netlify dashboard"
echo "2. Configure custom domain (optional)"
echo "3. Enable automatic deploys from Git (optional)"