import { Router } from 'express';
import { WalletService } from '../services/wallet/WalletService';
import { Blockchain } from '@shared/types';

const router = Router();
const walletService = new WalletService();

// Generate new mnemonic
router.post('/generate-mnemonic', (req, res) => {
  try {
    const mnemonic = walletService.generateMnemonic();
    res.json({ 
      success: true, 
      data: { mnemonic } 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Derive addresses from mnemonic
router.post('/derive-addresses', async (req, res) => {
  try {
    const { mnemonic, blockchain, count = 5 } = req.body;
    
    if (!walletService.validateMnemonic(mnemonic)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mnemonic phrase' 
      });
    }

    const addresses = await walletService.deriveAddresses(
      mnemonic,
      blockchain as Blockchain,
      count
    );

    res.json({ 
      success: true, 
      data: { addresses } 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all addresses for all blockchains
router.post('/derive-all-addresses', async (req, res) => {
  try {
    console.log('Derive all addresses request:', req.body);
    const { mnemonic, count = 1 } = req.body;
    
    if (!mnemonic) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mnemonic is required' 
      });
    }

    if (!walletService.validateMnemonic(mnemonic)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mnemonic phrase' 
      });
    }

    const allAddresses: any = {};
    
    for (const blockchain of Object.values(Blockchain)) {
      console.log(`Deriving addresses for ${blockchain}...`);
      try {
        allAddresses[blockchain] = await walletService.deriveAddresses(
          mnemonic,
          blockchain,
          count
        );
        console.log(`✅ ${blockchain} addresses derived successfully`);
      } catch (blockchainError: any) {
        console.error(`❌ Error deriving ${blockchain} addresses:`, blockchainError.message);
        // Continue with other blockchains
        allAddresses[blockchain] = [];
      }
    }

    console.log('All addresses derived:', Object.keys(allAddresses));
    res.json({ 
      success: true, 
      data: { addresses: allAddresses } 
    });
  } catch (error: any) {
    console.error('Derive all addresses error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get private key for specific address
router.post('/get-private-key', async (req, res) => {
  try {
    const { mnemonic, blockchain, index = 0 } = req.body;
    
    if (!mnemonic || !blockchain) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mnemonic and blockchain are required' 
      });
    }

    if (!walletService.validateMnemonic(mnemonic)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mnemonic phrase' 
      });
    }

    const keyPair = await walletService.derivePrivateKey(
      mnemonic,
      blockchain as Blockchain,
      index
    );

    res.json({ 
      success: true, 
      data: keyPair
    });
  } catch (error: any) {
    console.error('Get private key error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Import wallet from private key
router.post('/import-private-key', async (req, res) => {
  try {
    const { privateKey, blockchain } = req.body;
    
    if (!privateKey || !blockchain) {
      return res.status(400).json({ 
        success: false, 
        error: 'Private key and blockchain are required' 
      });
    }

    // This is a placeholder - implement actual private key import
    // For security, this should validate the key format and derive the address
    res.json({ 
      success: true, 
      data: { 
        message: 'Private key import functionality will be implemented',
        blockchain,
        keyProvided: !!privateKey
      }
    });
  } catch (error: any) {
    console.error('Import private key error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Validate mnemonic
router.post('/validate-mnemonic', (req, res) => {
  try {
    const { mnemonic } = req.body;
    
    if (!mnemonic) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mnemonic is required' 
      });
    }

    const isValid = walletService.validateMnemonic(mnemonic);
    
    res.json({ 
      success: true, 
      data: { 
        isValid,
        wordCount: mnemonic.split(' ').length
      } 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get wallet info (addresses + balances summary)
router.post('/wallet-info', async (req, res) => {
  try {
    const { mnemonic } = req.body;
    
    if (!mnemonic) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mnemonic is required' 
      });
    }

    if (!walletService.validateMnemonic(mnemonic)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mnemonic phrase' 
      });
    }

    const walletInfo = {
      isValid: true,
      networks: Object.values(Blockchain),
      totalNetworks: Object.values(Blockchain).length,
      securityLevel: 'High (BIP39 Compliant)',
      generatedAt: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      data: walletInfo
    });
  } catch (error: any) {
    console.error('Wallet info error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;