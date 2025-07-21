import { Router } from 'express';
import { MarketDataService } from '../services/market/MarketDataService';

const router = Router();
const marketService = new MarketDataService();

// Get market overview data
router.get('/overview', async (req, res) => {
  try {
    const [prices, globalStats, trending] = await Promise.all([
      marketService.getCoinPrices(),
      marketService.getGlobalStats(),
      marketService.getTrendingCoins()
    ]);

    res.json({
      success: true,
      data: {
        prices,
        globalStats,
        trending
      }
    });
  } catch (error: any) {
    console.error('Market overview error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get coin prices
router.get('/prices', async (req, res) => {
  try {
    const prices = await marketService.getCoinPrices();
    res.json({
      success: true,
      data: prices
    });
  } catch (error: any) {
    console.error('Coin prices error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific coin details
router.get('/coin/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const details = await marketService.getCoinDetails(coinId);
    
    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Coin not found'
      });
    }

    res.json({
      success: true,
      data: details
    });
  } catch (error: any) {
    console.error('Coin details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get historical chart data
router.get('/chart/:coinId/:days', async (req, res) => {
  try {
    const { coinId, days } = req.params;
    const daysInt = parseInt(days, 10);
    
    if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    const chartData = await marketService.getHistoricalData(coinId, daysInt);
    
    if (!chartData) {
      return res.status(404).json({
        success: false,
        error: 'Chart data not found'
      });
    }

    res.json({
      success: true,
      data: chartData
    });
  } catch (error: any) {
    console.error('Chart data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get global market statistics
router.get('/global', async (req, res) => {
  try {
    const globalStats = await marketService.getGlobalStats();
    res.json({
      success: true,
      data: globalStats
    });
  } catch (error: any) {
    console.error('Global stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trending coins
router.get('/trending', async (req, res) => {
  try {
    const trending = await marketService.getTrendingCoins();
    res.json({
      success: true,
      data: trending
    });
  } catch (error: any) {
    console.error('Trending coins error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get coin by blockchain symbol
router.get('/coin-by-symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const coinId = marketService.getCoinIdBySymbol(symbol);
    
    if (!coinId) {
      return res.status(404).json({
        success: false,
        error: 'Coin not supported'
      });
    }

    const details = await marketService.getCoinDetails(coinId);
    res.json({
      success: true,
      data: details
    });
  } catch (error: any) {
    console.error('Coin by symbol error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API health check endpoint
router.get('/api-health', async (req, res) => {
  try {
    // Access the private apiAggregator through a public method we'll add
    const health = await marketService.checkAPIHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error: any) {
    console.error('API health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;