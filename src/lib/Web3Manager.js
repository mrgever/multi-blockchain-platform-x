/**
 * Real Web3 Wallet Manager
 * Handles actual wallet connections to live networks
 */

import { ethers } from 'ethers';
import WalletConnect from '@walletconnect/web3-provider';
import Web3Modal from 'web3modal';

class Web3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.web3Modal = null;
    this.isConnected = false;
    this.networkConfig = this.getNetworkConfig();
    
    this.initWeb3Modal();
  }

  /**
   * Network configuration for live networks
   */
  getNetworkConfig() {
    return {
      1: { // Ethereum Mainnet
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        blockExplorer: 'https://etherscan.io',
        icon: '⟠'
      },
      137: { // Polygon Mainnet
        name: 'Polygon',
        symbol: 'MATIC',
        decimals: 18,
        rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        blockExplorer: 'https://polygonscan.com',
        icon: '◊'
      },
      56: { // BSC Mainnet
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        decimals: 18,
        rpcUrl: 'https://bsc-dataseed1.binance.org/',
        blockExplorer: 'https://bscscan.com',
        icon: '◈'
      },
      42161: { // Arbitrum One
        name: 'Arbitrum One',
        symbol: 'ETH',
        decimals: 18,
        rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        blockExplorer: 'https://arbiscan.io',
        icon: '🔷'
      },
      10: { // Optimism
        name: 'Optimism',
        symbol: 'ETH',
        decimals: 18,
        rpcUrl: `https://opt-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
        blockExplorer: 'https://optimistic.etherscan.io',
        icon: '🔴'
      },
      43114: { // Avalanche
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        blockExplorer: 'https://snowtrace.io',
        icon: '🔺'
      }
    };
  }

  /**
   * Initialize Web3Modal with real providers
   */
  initWeb3Modal() {
    const providerOptions = {
      walletconnect: {
        package: WalletConnect,
        options: {
          infuraId: import.meta.env.VITE_INFURA_PROJECT_ID,
          rpc: {
            1: this.networkConfig[1].rpcUrl,
            137: this.networkConfig[137].rpcUrl,
            56: this.networkConfig[56].rpcUrl,
            42161: this.networkConfig[42161].rpcUrl,
            10: this.networkConfig[10].rpcUrl,
            43114: this.networkConfig[43114].rpcUrl,
          },
          chainId: 1,
          bridge: 'https://bridge.walletconnect.org',
          qrcodeModal: {
            open: (uri, cb, opts) => {
              console.log('QR Code URI: ', uri);
              // You can integrate a custom QR modal here
            },
            close: () => {
              console.log('QR Code Modal closed');
            }
          }
        }
      }
    };

    this.web3Modal = new Web3Modal({
      network: 'mainnet',
      cacheProvider: true,
      providerOptions,
      theme: 'light'
    });
  }

  /**
   * Connect to MetaMask wallet
   */
  async connectMetaMask() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask extension.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.address = await this.signer.getAddress();
      
      // Get chain ID
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
      
      this.isConnected = true;

      // Set up event listeners
      this.setupEventListeners();

      return {
        address: this.address,
        chainId: this.chainId,
        network: this.networkConfig[this.chainId]?.name || 'Unknown Network'
      };

    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  }

  /**
   * Connect via WalletConnect
   */
  async connectWalletConnect() {
    try {
      const provider = await this.web3Modal.connect();
      
      this.provider = new ethers.BrowserProvider(provider);
      this.signer = await this.provider.getSigner();
      this.address = await this.signer.getAddress();
      
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
      
      this.isConnected = true;

      // Set up event listeners for WalletConnect
      provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.address = accounts[0];
          this.onAccountChanged(accounts[0]);
        }
      });

      provider.on('chainChanged', (chainId) => {
        this.chainId = parseInt(chainId, 16);
        this.onChainChanged(this.chainId);
      });

      provider.on('disconnect', () => {
        this.disconnect();
      });

      return {
        address: this.address,
        chainId: this.chainId,
        network: this.networkConfig[this.chainId]?.name || 'Unknown Network'
      };

    } catch (error) {
      console.error('WalletConnect connection error:', error);
      throw error;
    }
  }

  /**
   * Connect to Coinbase Wallet
   */
  async connectCoinbase() {
    try {
      if (!window.ethereum || !window.ethereum.isCoinbaseWallet) {
        // Redirect to Coinbase Wallet if not detected
        window.open('https://www.coinbase.com/wallet', '_blank');
        throw new Error('Please install Coinbase Wallet extension or use Coinbase Wallet mobile app.');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.address = await this.signer.getAddress();
      
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
      
      this.isConnected = true;
      this.setupEventListeners();

      return {
        address: this.address,
        chainId: this.chainId,
        network: this.networkConfig[this.chainId]?.name || 'Unknown Network'
      };

    } catch (error) {
      console.error('Coinbase Wallet connection error:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for wallet events
   */
  setupEventListeners() {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.address = accounts[0];
          this.onAccountChanged(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        this.chainId = parseInt(chainId, 16);
        this.onChainChanged(this.chainId);
        // Reload page to ensure proper network handling
        window.location.reload();
      });

      window.ethereum.on('disconnect', () => {
        this.disconnect();
      });
    }
  }

  /**
   * Switch to a specific network
   */
  async switchNetwork(chainId) {
    try {
      const network = this.networkConfig[chainId];
      if (!network) {
        throw new Error(`Unsupported network: ${chainId}`);
      }

      // Try to switch network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });

    } catch (error) {
      // Network doesn't exist, add it
      if (error.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw error;
      }
    }
  }

  /**
   * Add a new network to wallet
   */
  async addNetwork(chainId) {
    const network = this.networkConfig[chainId];
    
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${chainId.toString(16)}`,
        chainName: network.name,
        nativeCurrency: {
          name: network.symbol,
          symbol: network.symbol,
          decimals: network.decimals
        },
        rpcUrls: [network.rpcUrl],
        blockExplorerUrls: [network.blockExplorer]
      }]
    });
  }

  /**
   * Get wallet balance
   */
  async getBalance() {
    if (!this.provider || !this.address) {
      throw new Error('Wallet not connected');
    }

    const balance = await this.provider.getBalance(this.address);
    return ethers.formatEther(balance);
  }

  /**
   * Send transaction
   */
  async sendTransaction(to, value, data = '0x') {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = {
      to,
      value: ethers.parseEther(value.toString()),
      data
    };

    // Estimate gas
    const gasEstimate = await this.provider.estimateGas(tx);
    tx.gasLimit = gasEstimate;

    // Send transaction
    const txResponse = await this.signer.sendTransaction(tx);
    
    return {
      hash: txResponse.hash,
      wait: () => txResponse.wait()
    };
  }

  /**
   * Sign message
   */
  async signMessage(message) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    return await this.signer.signMessage(message);
  }

  /**
   * Disconnect wallet
   */
  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.isConnected = false;

    // Clear Web3Modal cache
    if (this.web3Modal) {
      await this.web3Modal.clearCachedProvider();
    }

    // Trigger disconnect event
    this.onDisconnected();
  }

  /**
   * Event handlers (override these in your app)
   */
  onAccountChanged(address) {
    console.log('Account changed:', address);
    // Override this method to handle account changes
  }

  onChainChanged(chainId) {
    console.log('Chain changed:', chainId);
    // Override this method to handle chain changes
  }

  onDisconnected() {
    console.log('Wallet disconnected');
    // Override this method to handle disconnection
  }

  /**
   * Get current network info
   */
  getCurrentNetwork() {
    return this.networkConfig[this.chainId] || null;
  }

  /**
   * Check if connected to supported network
   */
  isSupportedNetwork() {
    return this.chainId && this.networkConfig[this.chainId] !== undefined;
  }
}

export default Web3Manager;