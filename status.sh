#!/bin/bash

echo "🚀 Multi-Blockchain Platform Status"
echo "==================================="
echo

echo "📊 Services Status:"
echo

# Check backend
echo -n "Backend (Port 3001): "
if wget -qO- --timeout=2 http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

# Check frontend
echo -n "Frontend (Port 3000): "
if wget -qO- --timeout=2 http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

echo
echo "🌐 Access URLs:"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:3001"
echo "Health Check: http://localhost:3001/health"
echo "Blockchains: http://localhost:3001/api/v1/blockchains"

echo
echo "📊 Running Processes:"
pgrep -f "tsx.*src/index.ts" > /dev/null && echo "✅ Backend server (tsx)" || echo "❌ Backend server"
pgrep -f "next.*dev" > /dev/null && echo "✅ Frontend server (Next.js)" || echo "❌ Frontend server"

echo
echo "💾 Database:"
if [ -f "/home/x/claude_project/multi-blockchain-platform/backend/dev.db" ]; then
    echo "✅ SQLite database exists"
else
    echo "❌ Database not found"
fi