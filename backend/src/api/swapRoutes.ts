import { Router } from 'express';
import { SwapService } from '../services/swap/SwapService';

const router = Router();
const swapService = new SwapService();

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
  } catch (error: any) {
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
    const { 
      fromToken, 
      toToken, 
      amount, 
      platform, 
      slippage = 0.005,
      userAddress 
    } = req.body;
    
    if (!fromToken || !toToken || !amount || !platform || !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    const result = await swapService.executeSwap(
      fromToken, 
      toToken, 
      amount, 
      platform, 
      slippage, 
      userAddress
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error('Revenue stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;