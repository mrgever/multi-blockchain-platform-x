/**
 * Web3Modal Connector - Production implementation
 * Unified wallet connection for all major wallets
 */

import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
import * as Sentry from '@sentry/browser';

export class Web3ModalConnector {
  constructor() {
    this.web3Modal = null;
    this.provider = null;
    this.signer = null;
    this.connected = false;
    this.account = null;
    this.chainId = null;
    this.listeners = new Map();
    
    // Supported chains configuration
    this.supportedChains = {
      1: { name: 'Ethereum Mainnet', currency: 'ETH', rpc: `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}` },
      137: { name: 'Polygon', currency: 'MATIC', rpc: `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}` },
      56: { name: 'BNB Smart Chain', currency: 'BNB', rpc: 'https://bsc-dataseed1.binance.org' },
      42161: { name: 'Arbitrum One', currency: 'ETH', rpc: `https://arb-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}` },
      10: { name: 'Optimism', currency: 'ETH', rpc: `https://opt-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}` },
      43114: { name: 'Avalanche', currency: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc' }
    };

    // Test networks (if enabled)
    if (import.meta.env.VITE_ENABLE_TESTNETS === 'true') {
      this.supportedChains[11155111] = { name: 'Sepolia', currency: 'ETH', rpc: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}` };
      this.supportedChains[80001] = { name: 'Mumbai', currency: 'MATIC', rpc: `https://polygon-mumbai.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}` };
      this.supportedChains[97] = { name: 'BSC Testnet', currency: 'BNB', rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545' };
    }

    this.initializeWeb3Modal();
  }

  initializeWeb3Modal() {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
          chains: Object.keys(this.supportedChains).map(id => parseInt(id)),
          optionalChains: Object.keys(this.supportedChains).map(id => parseInt(id)),
          rpc: Object.entries(this.supportedChains).reduce((acc, [chainId, config]) => {
            acc[chainId] = config.rpc;
            return acc;
          }, {}),
          methods: [
            'eth_sendTransaction',
            'eth_signTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
            'eth_signTypedData_v4'
          ],
          events: ['chainChanged', 'accountsChanged', 'disconnect'],
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'light',
            themeVariables: {
              '--wcm-z-index': '9999'
            }
          }
        }
      }
    };

    this.web3Modal = new Web3Modal({
      network: 'mainnet',
      cacheProvider: true,
      providerOptions,
      theme: {
        background: 'rgb(255, 255, 255)',
        main: 'rgb(17, 24, 39)',
        secondary: 'rgb(156, 163, 175)',
        border: 'rgb(229, 231, 235)',
        hover: 'rgb(243, 244, 246)'
      }
    });

    // Auto-connect if previously connected
    if (this.web3Modal.cachedProvider) {
      this.connect();
    }
  }

  /**
   * Connect wallet
   */
  async connect() {
    try {
      const instance = await this.web3Modal.connect();
      await this.setupProvider(instance);
      
      // Emit connection event
      this.emit('connect', {
        account: this.account,
        chainId: this.chainId,
        provider: this.provider
      });

      return {
        account: this.account,
        chainId: this.chainId,
        connected: true
      };
    } catch (error) {
      Sentry.captureException(error);
      this.emit('error', error);
      throw new Error(`Wallet connection failed: ${error.message}`);
    }
  }

  /**
   * Setup provider and event listeners
   */
  async setupProvider(instance) {
    this.provider = new ethers.BrowserProvider(instance);
    this.signer = await this.provider.getSigner();
    
    // Get account and chain info
    const accounts = await this.provider.listAccounts();
    this.account = accounts[0]?.address;
    
    const network = await this.provider.getNetwork();
    this.chainId = Number(network.chainId);
    
    this.connected = true;

    // Subscribe to provider events
    if (instance.on) {
      instance.on('accountsChanged', this.handleAccountsChanged.bind(this));
      instance.on('chainChanged', this.handleChainChanged.bind(this));
      instance.on('disconnect', this.handleDisconnect.bind(this));
    }

    // For WalletConnect, handle session events
    if (instance.wc) {
      instance.wc.on('session_update', this.handleSessionUpdate.bind(this));
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect() {
    try {
      if (this.provider && this.provider.provider.disconnect) {
        await this.provider.provider.disconnect();
      }
      
      await this.web3Modal.clearCachedProvider();
      
      this.provider = null;
      this.signer = null;
      this.account = null;
      this.chainId = null;
      this.connected = false;
      
      this.emit('disconnect');
    } catch (error) {
      Sentry.captureException(error);
      console.error('Disconnect error:', error);
    }
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(chainId) {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;
    
    try {
      await this.provider.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Add a new network to the wallet
   */
  async addNetwork(chainId) {
    const chainConfig = this.supportedChains[chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const params = {
      chainId: `0x${chainId.toString(16)}`,
      chainName: chainConfig.name,
      nativeCurrency: {
        name: chainConfig.currency,
        symbol: chainConfig.currency,
        decimals: 18
      },
      rpcUrls: [chainConfig.rpc],
      blockExplorerUrls: this.getExplorerUrl(chainId) ? [this.getExplorerUrl(chainId)] : []
    };

    await this.provider.provider.request({
      method: 'wallet_addEthereumChain',
      params: [params]
    });
  }

  /**
   * Sign a message
   */
  async signMessage(message) {
    if (!this.connected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Message signing failed: ${error.message}`);
    }
  }

  /**
   * Sign typed data (EIP-712)
   */
  async signTypedData(domain, types, value) {
    if (!this.connected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.signer.signTypedData(domain, types, value);
      return signature;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Typed data signing failed: ${error.message}`);
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(transaction) {
    if (!this.connected || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      // Ensure proper transaction format
      const tx = {
        from: this.account,
        to: transaction.to,
        value: transaction.value ? ethers.toBigInt(transaction.value) : 0n,
        data: transaction.data || '0x',
        gasLimit: transaction.gasLimit,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
      };

      // Send transaction
      const txResponse = await this.signer.sendTransaction(tx);
      
      // Emit transaction sent event
      this.emit('transactionSent', {
        hash: txResponse.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString()
      });

      return txResponse;
    } catch (error) {
      Sentry.captureException(error);
      this.emit('error', error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Get current account balance
   */
  async getBalance() {
    if (!this.connected || !this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.provider.getBalance(this.account);
      return ethers.formatEther(balance);
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress, decimals = 18) {
    if (!this.connected || !this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      
      const balance = await tokenContract.balanceOf(this.account);
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Event handlers
   */
  handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      this.account = accounts[0];
      this.emit('accountsChanged', accounts);
    }
  }

  handleChainChanged(chainId) {
    // Reload the page as recommended by MetaMask
    window.location.reload();
  }

  handleDisconnect() {
    this.disconnect();
  }

  handleSessionUpdate(error, payload) {
    if (error) {
      Sentry.captureException(error);
      this.emit('error', error);
      return;
    }

    const { accounts, chainId } = payload.params[0];
    this.account = accounts[0];
    this.chainId = chainId;
    
    this.emit('sessionUpdate', { accounts, chainId });
  }

  /**
   * Event emitter functionality
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Utility functions
   */
  getExplorerUrl(chainId) {
    const explorers = {
      1: 'https://etherscan.io',
      137: 'https://polygonscan.com',
      56: 'https://bscscan.com',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      43114: 'https://snowtrace.io',
      11155111: 'https://sepolia.etherscan.io',
      80001: 'https://mumbai.polygonscan.com',
      97: 'https://testnet.bscscan.com'
    };
    return explorers[chainId];
  }

  isConnected() {
    return this.connected;
  }

  getAccount() {
    return this.account;
  }

  getChainId() {
    return this.chainId;
  }

  getSigner() {
    return this.signer;
  }

  getProvider() {
    return this.provider;
  }

  getSupportedChains() {
    return this.supportedChains;
  }
}

export default Web3ModalConnector;