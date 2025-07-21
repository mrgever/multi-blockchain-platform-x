import { Router } from 'express';
import { BlockchainServiceFactory } from '../services/blockchain/BlockchainServiceFactory';
import { Blockchain } from '@shared/types';

const router = Router();
const blockchainFactory = new BlockchainServiceFactory();

// Get balance for an address
router.get('/balance/:blockchain/:address', async (req, res) => {
  try {
    const { blockchain, address } = req.params;
    const service = blockchainFactory.getService(blockchain as Blockchain);
    
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
  } catch (error: any) {
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
    
    const service = blockchainFactory.getService(blockchain as Blockchain);
    
    if (!service.validateAddress(address)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid address format' 
      });
    }

    const transactions = await service.getTransactionHistory(
      address, 
      parseInt(limit as string)
    );
    
    res.json({ 
      success: true, 
      data: { transactions } 
    });
  } catch (error: any) {
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
    const service = blockchainFactory.getService(blockchain as Blockchain);
    
    const block = await service.getLatestBlock();
    
    res.json({ 
      success: true, 
      data: block 
    });
  } catch (error: any) {
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
    const service = blockchainFactory.getService(blockchain as Blockchain);
    
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
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;