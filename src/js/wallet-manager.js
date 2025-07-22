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
   * Get supported tokens for current network
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

    // Network-specific token support
    if (this.chainId === 1) { // Ethereum
      tokens.push(
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', isNative: false },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6b642c2fb8de35E6F0d2ed6e3C9d8C9', isNative: false },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', isNative: false },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', isNative: false },
        { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', isNative: false },
        { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', isNative: false }
      );
    } else if (this.chainId === 137) { // Polygon
      tokens.push(
        { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', isNative: false },
        { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', isNative: false },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', isNative: false },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', isNative: false }
      );
    } else if (this.chainId === 56) { // BSC
      tokens.push(
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', isNative: false },
        { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', isNative: false },
        { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', isNative: false },
        { symbol: 'BTCB', name: 'Bitcoin BEP20', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', isNative: false }
      );
    } else if (this.chainId === 42161) { // Arbitrum
      tokens.push(
        { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', isNative: false },
        { symbol: 'USDC', name: 'USD Coin', address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', isNative: false },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', isNative: false }
      );
    } else if (this.chainId === 10) { // Optimism
      tokens.push(
        { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', isNative: false },
        { symbol: 'USDC', name: 'USD Coin', address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', isNative: false },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', isNative: false }
      );
    } else if (this.chainId === 43114) { // Avalanche
      tokens.push(
        { symbol: 'USDT', name: 'Tether USD', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', isNative: false },
        { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', isNative: false },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x50b7545627a5162F82A992c33b87aDc75187B218', isNative: false }
      );
    }

    return tokens;
  }

  /**
   * Get conversion rate for cryptocurrency to USD
   */
  async getCryptoRate(symbol) {
    try {
      // Simplified rates - in production you'd fetch from API
      const rates = {
        'BTC': 43000, 'WBTC': 43000, 'BTCB': 43000,
        'ETH': 2600,
        'BNB': 310,
        'MATIC': 0.89,
        'AVAX': 37,
        'USDT': 1.00, 'USDC': 1.00, 'DAI': 1.00, 'BUSD': 1.00,
        'LINK': 15.2,
        'SHIB': 0.00001,
        'XRP': 0.52,
        'ADA': 0.38,
        'DOT': 7.2,
        'SOL': 102
      };
      
      return rates[symbol.toUpperCase()] || 1;
    } catch (error) {
      console.error('Error fetching crypto rate:', error);
      return 1;
    }
  }
}

// Make it globally available
window.BrowserWeb3Manager = BrowserWeb3Manager;