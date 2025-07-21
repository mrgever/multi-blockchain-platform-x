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

// Generate network-specific wallet
router.post('/generate-network-wallet', async (req, res) => {
  try {
    const { blockchain, networkRules = false } = req.body;
    
    if (!blockchain) {
      return res.status(400).json({ 
        success: false, 
        error: 'Blockchain parameter is required' 
      });
    }

    // Validate blockchain
    if (!Object.values(Blockchain).includes(blockchain)) {
      return res.status(400).json({ 
        success: false, 
        error: `Unsupported blockchain: ${blockchain}. Supported: ${Object.values(Blockchain).join(', ')}` 
      });
    }

    // Generate a new mnemonic
    const mnemonic = walletService.generateMnemonic();
    
    // Derive addresses for the specific blockchain
    const addresses = await walletService.deriveAddresses(
      mnemonic,
      blockchain as Blockchain,
      1 // Generate just one address
    );

    // Get network-specific information
    const networkInfo = getNetworkInfo(blockchain);
    
    const response = {
      success: true,
      blockchain,
      mnemonic,
      address: addresses[0],
      networkInfo,
      securityNote: 'IMPORTANT: Save this mnemonic phrase securely. It cannot be recovered if lost.',
      generatedAt: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      data: response
    });
  } catch (error: any) {
    console.error('Generate network wallet error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper function for network information
function getNetworkInfo(blockchain: string) {
  const networkData = {
    [Blockchain.ETHEREUM]: {
      name: 'Ethereum Mainnet',
      symbol: 'ETH',
      decimals: 18,
      explorer: 'https://etherscan.io',
      rpcUrl: 'https://mainnet.infura.io/v3/',
      features: ['Smart Contracts', 'DeFi', 'NFTs', 'ERC-20 Tokens']
    },
    [Blockchain.BITCOIN]: {
      name: 'Bitcoin Mainnet',
      symbol: 'BTC',
      decimals: 8,
      explorer: 'https://blockstream.info',
      rpcUrl: 'https://blockchain.info/api',
      features: ['Digital Gold', 'Store of Value', 'P2P Transactions']
    },
    [Blockchain.TON]: {
      name: 'The Open Network',
      symbol: 'TON',
      decimals: 9,
      explorer: 'https://tonscan.org',
      rpcUrl: 'https://toncenter.com/api/v2/',
      features: ['High Performance', 'Smart Contracts', 'Telegram Integration']
    },
    [Blockchain.DOGECOIN]: {
      name: 'Dogecoin Mainnet',
      symbol: 'DOGE',
      decimals: 8,
      explorer: 'https://dogechain.info',
      rpcUrl: 'https://api.dogecoin.com',
      features: ['Meme Coin', 'Fast Transactions', 'Low Fees', 'Community Driven']
    }
  };

  return networkData[blockchain as Blockchain] || {
    name: 'Unknown Network',
    symbol: 'UNKNOWN',
    decimals: 18,
    explorer: '',
    rpcUrl: '',
    features: []
  };
}

// Generate wallets for all supported networks
router.post('/generate-multi-network', async (req, res) => {
  try {
    const { count = 1 } = req.body;
    
    // Generate a single mnemonic for all networks
    const mnemonic = walletService.generateMnemonic();
    
    const allWallets: any = {};
    const summary = {
      mnemonic,
      totalNetworks: 0,
      successfulNetworks: 0,
      failedNetworks: 0,
      generatedAt: new Date().toISOString()
    };
    
    for (const blockchain of Object.values(Blockchain)) {
      summary.totalNetworks++;
      try {
        console.log(`Generating wallet for ${blockchain}...`);
        
        const addresses = await walletService.deriveAddresses(
          mnemonic,
          blockchain,
          count
        );
        
        allWallets[blockchain] = {
          blockchain,
          addresses,
          networkInfo: getNetworkInfo(blockchain),
          status: 'success'
        };
        
        summary.successfulNetworks++;
        console.log(`✅ ${blockchain} wallet generated successfully`);
        
      } catch (blockchainError: any) {
        console.error(`❌ Error generating ${blockchain} wallet:`, blockchainError.message);
        
        allWallets[blockchain] = {
          blockchain,
          addresses: [],
          networkInfo: getNetworkInfo(blockchain),
          status: 'failed',
          error: blockchainError.message
        };
        
        summary.failedNetworks++;
      }
    }

    res.json({ 
      success: true, 
      data: {
        summary,
        wallets: allWallets,
        securityNote: 'CRITICAL: Save this mnemonic phrase securely. It controls all your addresses across all networks.'
      }
    });
  } catch (error: any) {
    console.error('Generate multi-network error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;