"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SwapService_1 = require("../services/swap/SwapService");
const router = (0, express_1.Router)();
const swapService = new SwapService_1.SwapService();
// Get swap quote
router.post('/quote', async (req, res) => {
    try {
        const { fromToken, toToken, amount, blockchain = 'ETHEREUM' } = req.body;
        if (!fromToken || !toToken || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: fromToken, toToken, amount'
            });
        }
        const quotes = await swapService.getSwapQuote(fromToken, toToken, amount, blockchain);
        res.json({
            success: true,
            data: quotes
        });
    }
    catch (error) {
        console.error('Swap quote error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Execute swap
router.post('/execute', async (req, res) => {
    try {
        const { fromToken, toToken, amount, platform, slippage = 0.005, userAddress } = req.body;
        if (!fromToken || !toToken || !amount || !platform || !userAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }
        const result = await swapService.executeSwap(fromToken, toToken, amount, platform, slippage, userAddress);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Swap execution error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get supported tokens
router.get('/tokens/:blockchain?', async (req, res) => {
    try {
        const { blockchain = 'ETHEREUM' } = req.params;
        const tokens = swapService.getSupportedTokens(blockchain);
        res.json({
            success: true,
            data: tokens
        });
    }
    catch (error) {
        console.error('Get tokens error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get swap history
router.get('/history/:address/:blockchain?', async (req, res) => {
    try {
        const { address, blockchain = 'ETHEREUM' } = req.params;
        const history = await swapService.getSwapHistory(address, blockchain);
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        console.error('Swap history error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get arbitrage opportunities
router.get('/arbitrage/:token/:blockchain?', async (req, res) => {
    try {
        const { token, blockchain = 'ETHEREUM' } = req.params;
        const opportunities = await swapService.getArbitrageOpportunities(token, blockchain);
        res.json({
            success: true,
            data: opportunities
        });
    }
    catch (error) {
        console.error('Arbitrage opportunities error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get token price
router.get('/price/:tokenAddress/:blockchain?', async (req, res) => {
    try {
        const { tokenAddress, blockchain = 'ETHEREUM' } = req.params;
        const price = await swapService.getTokenPrice(tokenAddress, blockchain);
        res.json({
            success: true,
            data: { price }
        });
    }
    catch (error) {
        console.error('Token price error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Revenue and monetization endpoints
router.get('/affiliate-links', async (req, res) => {
    try {
        const links = await swapService.getAffiliateLinks();
        res.json({
            success: true,
            data: links
        });
    }
    catch (error) {
        console.error('Affiliate links error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/revenue-stats', async (req, res) => {
    try {
        const stats = await swapService.getRevenueStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Revenue stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// NUSD (Nexus USD) swap routes
router.post('/to-nusd', async (req, res) => {
    try {
        const { fromToken, amount, blockchain = 'ETHEREUM', userAddress } = req.body;
        if (!fromToken || !amount || !userAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: fromToken, amount, userAddress'
            });
        }
        const result = await swapService.swapToNUSD(fromToken, amount, blockchain, userAddress);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('NUSD swap error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get NUSD balance for user
router.get('/nusd/balance/:userAddress', async (req, res) => {
    try {
        const { userAddress } = req.params;
        const balance = await swapService.getNUSDBalance(userAddress);
        res.json({
            success: true,
            data: { balance }
        });
    }
    catch (error) {
        console.error('NUSD balance error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get NUSD transaction history
router.get('/nusd/history/:userAddress', async (req, res) => {
    try {
        const { userAddress } = req.params;
        const history = await swapService.getNUSDTransactionHistory(userAddress);
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        console.error('NUSD history error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=swapRoutes.js.map