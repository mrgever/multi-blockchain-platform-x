#!/bin/bash

echo "🚀 Starting Multi-Blockchain Platform..."
echo "======================================"

# Check if backend is running
if pgrep -f "tsx.*src/index.ts" > /dev/null; then
    echo "✅ Backend is already running"
else
    echo "🔄 Starting backend server..."
    cd backend
    npm run dev > backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    echo "✅ Backend started (PID: $BACKEND_PID)"
fi

echo
echo "⏳ Waiting for services to start..."
sleep 5

echo
echo "🌐 Testing connectivity..."

# Test backend
if wget -qO- --timeout=3 http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend API: http://localhost:3001 (READY)"
    echo "✅ Frontend UI: http://localhost:3001 (READY)"
else
    echo "❌ Backend not responding"
    exit 1
fi

echo
echo "📊 Platform Status:"
echo "=================="
echo "🔗 Main UI:       http://localhost:3001"
echo "🔗 API Health:    http://localhost:3001/health"
echo "🔗 Blockchains:   http://localhost:3001/api/v1/blockchains"

echo
echo "🎯 Supported Features:"
echo "• TON, Ethereum, Bitcoin, Dogecoin support"
echo "• USDT (ERC-20) integration"
echo "• HD Wallet generation"
echo "• Transaction management"
echo "• Real-time API connectivity"

echo
echo "🎉 Multi-Blockchain Platform is running!"
echo "Open http://localhost:3001 in your browser"