/**
 * Secure Wallet Manager - Production-ready implementation
 * Uses ethers.js for secure cryptographic operations
 * NEVER stores private keys unencrypted
 */

import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { Network, Alchemy } from 'alchemy-sdk';
import * as Sentry from '@sentry/browser';

export class SecureWalletManager {
  constructor() {
    this.providers = new Map();
    this.connectedWallets = new Map();
    this.networks = {
      ethereum: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
      },
      polygon: {
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        explorerUrl: 'https://polygonscan.com',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
      },
      bsc: {
        name: 'BNB Smart Chain',
        chainId: 56,
        rpcUrl: 'https://bsc-dataseed1.binance.org',
        explorerUrl: 'https://bscscan.com',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
      },
      arbitrum: {
        name: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        explorerUrl: 'https://arbiscan.io',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 }
      }
    };

    // Initialize Alchemy SDK for enhanced blockchain interaction
    this.alchemy = new Alchemy({
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY,
      network: Network.ETH_MAINNET,
    });

    this.initializeProviders();
  }

  initializeProviders() {
    for (const [networkId, config] of Object.entries(this.networks)) {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.providers.set(networkId, provider);
      } catch (error) {
        Sentry.captureException(error);
        console.error(`Failed to initialize provider for ${networkId}:`, error);
      }
    }
  }

  /**
   * Generate a new HD wallet with mnemonic
   * @returns {Object} wallet data with mnemonic (NEVER STORE THIS)
   */
  async generateNewWallet() {
    try {
      // Generate cryptographically secure mnemonic
      const mnemonic = bip39.generateMnemonic(256); // 24 words for maximum security
      
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic generated');
      }

      // Create HD wallet from mnemonic
      const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
      
      // Generate addresses for different currencies
      const addresses = {
        ethereum: hdWallet.address,
        polygon: hdWallet.address, // Same as Ethereum
        bsc: hdWallet.address, // Same as Ethereum
        arbitrum: hdWallet.address, // Same as Ethereum
        bitcoin: await this.generateBitcoinAddress(mnemonic),
        dogecoin: await this.generateDogecoinAddress(mnemonic)
      };

      return {
        mnemonic, // User MUST save this securely
        addresses,
        warning: 'SAVE YOUR MNEMONIC SECURELY. It cannot be recovered if lost.'
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Wallet generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Bitcoin address from mnemonic
   */
  async generateBitcoinAddress(mnemonic) {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    const path = "m/84'/0'/0'/0/0"; // BIP84 for native SegWit
    const child = root.derivePath(path);
    const { address } = bitcoin.payments.p2wpkh({ 
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin 
    });
    return address;
  }

  /**
   * Generate Dogecoin address from mnemonic
   */
  async generateDogecoinAddress(mnemonic) {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    const path = "m/44'/3'/0'/0/0"; // BIP44 for Dogecoin
    const child = root.derivePath(path);
    
    // Dogecoin network configuration
    const dogecoinNetwork = {
      messagePrefix: '\x19Dogecoin Signed Message:\n',
      bech32: 'doge',
      bip32: { public: 0x02facafd, private: 0x02fac398 },
      pubKeyHash: 0x1e,
      scriptHash: 0x16,
      wif: 0x9e
    };
    
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: child.publicKey,
      network: dogecoinNetwork 
    });
    return address;
  }

  /**
   * Import wallet from mnemonic (NEVER STORE THE MNEMONIC)
   */
  async importWalletFromMnemonic(mnemonic) {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
      
      // Generate all addresses
      const addresses = {
        ethereum: hdWallet.address,
        polygon: hdWallet.address,
        bsc: hdWallet.address,
        arbitrum: hdWallet.address,
        bitcoin: await this.generateBitcoinAddress(mnemonic),
        dogecoin: await this.generateDogecoinAddress(mnemonic)
      };

      // Get balances for all addresses
      const balances = await this.getAllBalances(addresses);

      return {
        addresses,
        balances,
        warning: 'Never share your mnemonic with anyone'
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Wallet import failed: ${error.message}`);
    }
  }

  /**
   * Get balances for all supported chains
   */
  async getAllBalances(addresses) {
    const balances = {};

    try {
      // EVM chains
      for (const [network, address] of Object.entries(addresses)) {
        if (['ethereum', 'polygon', 'bsc', 'arbitrum'].includes(network)) {
          const provider = this.providers.get(network);
          if (provider) {
            const balance = await provider.getBalance(address);
            balances[network] = ethers.formatEther(balance);
          }
        }
      }

      // Bitcoin balance
      if (addresses.bitcoin) {
        balances.bitcoin = await this.getBitcoinBalance(addresses.bitcoin);
      }

      // Dogecoin balance
      if (addresses.dogecoin) {
        balances.dogecoin = await this.getDogecoinBalance(addresses.dogecoin);
      }

      // Get token balances (USDT, USDC, etc.)
      if (addresses.ethereum) {
        balances.tokens = await this.getTokenBalances(addresses.ethereum);
      }

    } catch (error) {
      Sentry.captureException(error);
      console.error('Error fetching balances:', error);
    }

    return balances;
  }

  /**
   * Get Bitcoin balance using BlockCypher API
   */
  async getBitcoinBalance(address) {
    try {
      const response = await fetch(
        `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`
      );
      const data = await response.json();
      return (data.balance / 100000000).toString(); // Convert satoshis to BTC
    } catch (error) {
      console.error('Error fetching Bitcoin balance:', error);
      return '0';
    }
  }

  /**
   * Get Dogecoin balance
   */
  async getDogecoinBalance(address) {
    try {
      const response = await fetch(
        `https://api.blockcypher.com/v1/doge/main/addrs/${address}/balance`
      );
      const data = await response.json();
      return (data.balance / 100000000).toString(); // Convert to DOGE
    } catch (error) {
      console.error('Error fetching Dogecoin balance:', error);
      return '0';
    }
  }

  /**
   * Get ERC-20 token balances
   */
  async getTokenBalances(address) {
    try {
      // Get token balances using Alchemy
      const balances = await this.alchemy.core.getTokenBalances(address);
      
      const tokens = {};
      const tokenContracts = {
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      };

      for (const [symbol, contractAddress] of Object.entries(tokenContracts)) {
        const tokenBalance = balances.tokenBalances.find(
          token => token.contractAddress.toLowerCase() === contractAddress.toLowerCase()
        );
        
        if (tokenBalance && tokenBalance.tokenBalance !== '0x0') {
          const metadata = await this.alchemy.core.getTokenMetadata(contractAddress);
          const balance = parseInt(tokenBalance.tokenBalance, 16);
          tokens[symbol] = (balance / Math.pow(10, metadata.decimals)).toString();
        } else {
          tokens[symbol] = '0';
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return {};
    }
  }

  /**
   * Create transaction for connected wallet (MetaMask, WalletConnect, etc.)
   * This NEVER handles private keys directly
   */
  async createTransaction(fromAddress, toAddress, amount, currency = 'ETH', network = 'ethereum') {
    try {
      const provider = this.providers.get(network);
      if (!provider) {
        throw new Error(`Unsupported network: ${network}`);
      }

      const txRequest = {
        from: fromAddress,
        to: toAddress,
        value: ethers.parseEther(amount.toString()),
        // Gas estimation will be done by the wallet
      };

      // Get current gas prices
      const feeData = await provider.getFeeData();
      txRequest.maxFeePerGas = feeData.maxFeePerGas;
      txRequest.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

      // For tokens, we need different transaction data
      if (currency !== 'ETH' && currency !== 'MATIC' && currency !== 'BNB') {
        const tokenContract = this.getTokenContract(currency, network);
        const decimals = await tokenContract.decimals();
        const amountWei = ethers.parseUnits(amount.toString(), decimals);
        
        txRequest.to = tokenContract.target;
        txRequest.data = tokenContract.interface.encodeFunctionData('transfer', [toAddress, amountWei]);
        txRequest.value = 0n;
      }

      return txRequest;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Transaction creation failed: ${error.message}`);
    }
  }

  /**
   * Get token contract instance
   */
  getTokenContract(symbol, network = 'ethereum') {
    const tokenAddresses = {
      ethereum: {
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      },
      polygon: {
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
      }
    };

    const address = tokenAddresses[network]?.[symbol];
    if (!address) {
      throw new Error(`Token ${symbol} not supported on ${network}`);
    }

    const provider = this.providers.get(network);
    const abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];

    return new ethers.Contract(address, abi, provider);
  }

  /**
   * Monitor transaction status
   */
  async monitorTransaction(txHash, network = 'ethereum') {
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error(`Unsupported network: ${network}`);
    }

    return new Promise((resolve, reject) => {
      provider.once(txHash, (transaction) => {
        resolve({
          hash: transaction.hash,
          blockNumber: transaction.blockNumber,
          confirmations: transaction.confirmations,
          status: 'confirmed'
        });
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        reject(new Error('Transaction timeout'));
      }, 600000);
    });
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(txRequest, network = 'ethereum') {
    try {
      const provider = this.providers.get(network);
      const gasEstimate = await provider.estimateGas(txRequest);
      const feeData = await provider.getFeeData();
      
      const estimatedCost = gasEstimate * feeData.maxFeePerGas;
      
      return {
        gasLimit: gasEstimate.toString(),
        maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas, 'gwei'),
        estimatedCost: ethers.formatEther(estimatedCost)
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Watch for incoming payments
   */
  async watchForPayment(address, expectedAmount, currency = 'ETH', network = 'ethereum') {
    return new Promise((resolve, reject) => {
      const provider = this.providers.get(network);
      if (!provider) {
        reject(new Error(`Unsupported network: ${network}`));
        return;
      }

      let filter;
      if (currency === 'ETH' || currency === 'MATIC' || currency === 'BNB') {
        // Watch for native currency transfers
        filter = {
          to: address
        };
      } else {
        // Watch for token transfers
        const tokenContract = this.getTokenContract(currency, network);
        filter = {
          address: tokenContract.target,
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            null,
            ethers.zeroPadValue(address, 32)
          ]
        };
      }

      const timeoutId = setTimeout(() => {
        provider.off(filter);
        reject(new Error('Payment timeout'));
      }, 1800000); // 30 minutes timeout

      provider.on(filter, async (log) => {
        clearTimeout(timeoutId);
        provider.off(filter);
        
        const receipt = await provider.getTransactionReceipt(log.transactionHash);
        resolve({
          transactionHash: log.transactionHash,
          blockNumber: receipt.blockNumber,
          from: receipt.from,
          confirmations: await provider.getBlockNumber() - receipt.blockNumber
        });
      });
    });
  }

  /**
   * Get transaction history for address
   */
  async getTransactionHistory(address, network = 'ethereum') {
    try {
      // Use Alchemy's enhanced APIs
      const alchemyNetwork = {
        ethereum: Network.ETH_MAINNET,
        polygon: Network.MATIC_MAINNET,
        arbitrum: Network.ARB_MAINNET
      }[network];

      if (!alchemyNetwork) {
        throw new Error(`Unsupported network for history: ${network}`);
      }

      const alchemy = new Alchemy({
        apiKey: import.meta.env.VITE_ALCHEMY_API_KEY,
        network: alchemyNetwork
      });

      const transfers = await alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: ['external', 'erc20', 'erc721', 'erc1155']
      });

      return transfers.transfers.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        asset: tx.asset,
        blockNumber: tx.blockNum,
        category: tx.category
      }));
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }
  }
}

export default SecureWalletManager;