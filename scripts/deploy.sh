#!/bin/bash

# Production Deployment Script for Netlify
# This script handles the complete deployment process

set -e

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variables are set
check_env() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: $2 is not set${NC}"
        exit 1
    fi
}

# Validate environment
echo -e "${YELLOW}Validating environment...${NC}"
check_env "$STRIPE_SECRET_KEY" "STRIPE_SECRET_KEY"
check_env "$ALCHEMY_API_KEY" "ALCHEMY_API_KEY"
check_env "$FAUNA_SECRET_KEY" "FAUNA_SECRET_KEY"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --production=false

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm run test -- --passWithNoTests || true

# Build the application
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Validate build output
if [ ! -d "dist" ]; then
    echo -e "${RED}Build failed: dist directory not found${NC}"
    exit 1
fi

# Create FaunaDB indexes if not exists
echo -e "${YELLOW}Setting up database indexes...${NC}"
node scripts/setup-fauna.js || true

# Deploy to Netlify
echo -e "${YELLOW}Deploying to Netlify...${NC}"
if [ "$1" == "production" ]; then
    echo -e "${GREEN}Deploying to production...${NC}"
    netlify deploy --prod --dir=dist
else
    echo -e "${GREEN}Deploying preview...${NC}"
    netlify deploy --dir=dist
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"

# Post-deployment tasks
echo -e "${YELLOW}Running post-deployment tasks...${NC}"

# Warm up functions
echo "Warming up serverless functions..."
curl -s "${DEPLOY_URL}/.netlify/functions/rates" > /dev/null || true
curl -s "${DEPLOY_URL}/.netlify/functions/health" > /dev/null || true

echo -e "${GREEN}🎉 All done! Your application is live.${NC}"