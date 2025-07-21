import { Router } from 'express';
import { NexusBucksService } from '../services/nexus/NexusBucksService';

const router = Router();
const nexusService = new NexusBucksService();

// Create new user account
router.post('/user/create', (req, res) => {
  try {
    const { identifier, type = 'wallet' } = req.body;
    
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'Identifier (email or wallet) is required'
      });
    }

    // Check if user already exists
    let existingUser = null;
    if (type === 'wallet') {
      existingUser = nexusService.getUserByWallet(identifier);
    }

    if (existingUser) {
      return res.json({
        success: true,
        data: {
          user: existingUser,
          message: 'Welcome back!',
          isExisting: true
        }
      });
    }

    const user = nexusService.createUser(identifier, type);
    
    res.json({
      success: true,
      data: {
        user,
        message: '🎉 Welcome to NEXUS! You received 200 free N-Bucks!',
        isExisting: false
      }
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user info
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const stats = nexusService.getUserStats(userId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user by wallet
router.get('/user/wallet/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = nexusService.getUserByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const stats = nexusService.getUserStats(user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get user by wallet error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available packages
router.get('/packages', (req, res) => {
  try {
    const packages = nexusService.getPackages();
    
    res.json({
      success: true,
      data: packages
    });
  } catch (error: any) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Purchase package
router.post('/purchase/package', (req, res) => {
  try {
    const { userId, packageId, paymentMethod } = req.body;
    
    if (!userId || !packageId) {
      return res.status(400).json({
        success: false,
        error: 'userId and packageId are required'
      });
    }

    const result = nexusService.purchasePackage(userId, packageId, paymentMethod);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Purchase package error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Purchase custom amount
router.post('/purchase/custom', (req, res) => {
  try {
    const { userId, amount, paymentMethod } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'userId and amount are required'
      });
    }

    const result = nexusService.purchaseCustomAmount(userId, amount, paymentMethod);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Purchase custom error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Spend N-Bucks
router.post('/spend', (req, res) => {
  try {
    const { userId, amount, description, category } = req.body;
    
    if (!userId || !amount || !description) {
      return res.status(400).json({
        success: false,
        error: 'userId, amount, and description are required'
      });
    }

    const result = nexusService.spendNBucks(userId, amount, description, category);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Spend N-Bucks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Earn N-Bucks
router.post('/earn', (req, res) => {
  try {
    const { userId, amount, description, source } = req.body;
    
    if (!userId || !amount || !description) {
      return res.status(400).json({
        success: false,
        error: 'userId, amount, and description are required'
      });
    }

    const result = nexusService.earnNBucks(userId, amount, description, source);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Earn N-Bucks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get spending categories
router.get('/spending-categories', (req, res) => {
  try {
    const categories = nexusService.getSpendingCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Get spending categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user transactions
router.get('/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const transactions = nexusService.getUserTransactions(userId, limit);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;