"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const ws_1 = require("ws");
const client_1 = require("@prisma/client");
const walletRoutes_1 = __importDefault(require("./api/walletRoutes"));
const blockchainRoutes_1 = __importDefault(require("./api/blockchainRoutes"));
const marketRoutes_1 = __importDefault(require("./api/marketRoutes"));
const swapRoutes_1 = __importDefault(require("./api/swapRoutes"));
const nexusRoutes_1 = __importDefault(require("./api/nexusRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
const prisma = new client_1.PrismaClient();
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:3001"],
            mediaSrc: ["'self'", "data:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});
// Serve static UI - CoinGecko style (default)
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../coingecko-ui.html'));
});
// Serve demo page
app.get('/demo', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../quick-demo.html'));
});
// Serve alternative UIs
app.get('/modern', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../modern-ui.html'));
});
app.get('/simple', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../self-contained-ui.html'));
});
app.get('/tech', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../tech-ui.html'));
});
// Test page for wallet generation
app.get('/test-wallet', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../test-wallet-generation.html'));
});
// Wallet Center page
app.get('/wallet-center', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../wallet-center.html'));
});
// Admin Panel page
app.get('/admin', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../admin-panel.html'));
});
// API Routes
app.use('/api/v1/wallet', walletRoutes_1.default);
app.use('/api/v1/blockchain', blockchainRoutes_1.default);
app.use('/api/v1/market', marketRoutes_1.default);
app.use('/api/v1/swap', swapRoutes_1.default);
app.use('/api/v1/nexus', nexusRoutes_1.default);
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
// WebSocket handling
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('message', (message) => {
        console.log('Received:', message.toString());
    });
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});
const PORT = process.env.PORT || 3001;
// Start server
async function startServer() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 WebSocket server ready`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await prisma.$disconnect();
    server.close();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map