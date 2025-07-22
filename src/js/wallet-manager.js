/**
 * Browser-compatible Wallet Manager
 * Works without module bundler by using global window objects
 */

class BrowserWeb3Manager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.isConnected = false;
    this.networkConfig = this.getNetworkConfig();
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
        rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/UckD71aWHI5luV-VEtJsl7`,
        blockExplorer: 'https://etherscan.io',
        icon: '⟠'
      },
      137: { // Polygon Mainnet
        name: 'Polygon',
        symbol: 'MATIC',
        decimals: 18,
        rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/UckD71aWHI5luV-VEtJsl7`,
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
        rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/UckD71aWHI5luV-VEtJsl7`,
        blockExplorer: 'https://arbiscan.io',
        icon: '🔷'
      },
      10: { // Optimism
        name: 'Optimism',
        symbol: 'ETH',
        decimals: 18,
        rpcUrl: `https://opt-mainnet.g.alchemy.com/v2/UckD71aWHI5luV-VEtJsl7`,
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

      // Store connection info
      this.address = accounts[0];
      
      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });
      this.chainId = parseInt(chainId, 16);
      
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
   * Connect via WalletConnect - simplified version
   */
  async connectWalletConnect() {
    // For now, show instructions to user
    throw new Error('WalletConnect: Please use the mobile app or scan QR code. Currently use MetaMask for full functionality.');
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

      this.address = accounts[0];
      
      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });
      this.chainId = parseInt(chainId, 16);
      
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
   * Get wallet balance (using window.ethereum)
   */
  async getBalance() {
    if (!window.ethereum || !this.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [this.address, 'latest']
      });

      // Convert from hex wei to ether
      const balanceInWei = parseInt(balance, 16);
      const balanceInEther = balanceInWei / Math.pow(10, 18);
      
      return balanceInEther.toFixed(6);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(to, value) {
    if (!window.ethereum || !this.address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Convert value to hex wei
      const valueInWei = Math.floor(parseFloat(value) * Math.pow(10, 18));
      const valueHex = '0x' + valueInWei.toString(16);

      const transactionHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.address,
          to: to,
          value: valueHex,
        }]
      });

      return {
        hash: transactionHash,
        wait: () => this.waitForTransaction(transactionHash)
      };

    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(hash) {
    return new Promise((resolve) => {
      // Simplified - just return after 2 seconds
      // In real implementation, you'd poll the network
      setTimeout(() => {
        resolve({
          blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
          gasUsed: 21000,
          status: 1
        });
      }, 2000);
    });
  }

  /**
   * Monitor transaction status
   */
  async monitorTransaction(transactionHash) {
    try {
      // Simplified monitoring - in real app you'd use ethers or web3
      // This is just for demo purposes
      return {
        status: 'confirming',
        confirmations: Math.floor(Math.random() * 10) + 1
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
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

    // Trigger disconnect event
    this.onDisconnected();
  }

  /**
   * Event handlers (override these in your app)
   */
  onAccountChanged(address) {
    console.log('Account changed:', address);
  }

  onChainChanged(chainId) {
    console.log('Chain changed:', chainId);
  }

  onDisconnected() {
    console.log('Wallet disconnected');
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

  /**
   * Get supported tokens for current network (simplified)
   */
  getSupportedTokens() {
    const network = this.getCurrentNetwork();
    if (!network) return [];

    const tokens = [{
      symbol: network.symbol,
      name: network.name,
      decimals: network.decimals,
      address: 'native',
      isNative: true
    }];

    // Add common stablecoins for supported networks
    if (this.chainId === 1 || this.chainId === 137 || this.chainId === 56) {
      tokens.push(
        { symbol: 'USDT', name: 'Tether USD', address: 'token', isNative: false },
        { symbol: 'USDC', name: 'USD Coin', address: 'token', isNative: false }
      );
    }

    return tokens;
  }
}

// Make it globally available
window.BrowserWeb3Manager = BrowserWeb3Manager;