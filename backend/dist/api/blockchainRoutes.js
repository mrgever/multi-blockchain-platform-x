"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BlockchainServiceFactory_1 = require("../services/blockchain/BlockchainServiceFactory");
const router = (0, express_1.Router)();
const blockchainFactory = new BlockchainServiceFactory_1.BlockchainServiceFactory();
// Get balance for an address
router.get('/balance/:blockchain/:address', async (req, res) => {
    try {
        const { blockchain, address } = req.params;
        const service = blockchainFactory.getService(blockchain);
        if (!service.validateAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address format'
            });
        }
        const balance = await service.getBalance(address);
        res.json({
            success: true,
            data: balance
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get transaction history
router.get('/transactions/:blockchain/:address', async (req, res) => {
    try {
        const { blockchain, address } = req.params;
        const { limit = 50 } = req.query;
        const service = blockchainFactory.getService(blockchain);
        if (!service.validateAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid address format'
            });
        }
        const transactions = await service.getTransactionHistory(address, parseInt(limit));
        res.json({
            success: true,
            data: { transactions }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Get latest block
router.get('/block/latest/:blockchain', async (req, res) => {
    try {
        const { blockchain } = req.params;
        const service = blockchainFactory.getService(blockchain);
        const block = await service.getLatestBlock();
        res.json({
            success: true,
            data: block
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Estimate transaction fee
router.post('/estimate-fee', async (req, res) => {
    try {
        const { blockchain, from, to, value } = req.body;
        const service = blockchainFactory.getService(blockchain);
        const fee = await service.estimateFee({
            blockchain,
            from,
            to,
            value,
        });
        res.json({
            success: true,
            data: { fee }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=blockchainRoutes.js.map