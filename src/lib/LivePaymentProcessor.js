/**
 * Live Payment Processor
 * Handles real cryptocurrency payments on live networks
 */

import { ethers } from 'ethers';

class LivePaymentProcessor {
  constructor(web3Manager) {
    this.web3Manager = web3Manager;
    
    // ERC-20 Token Contract ABI (minimal for transfers)
    this.erc20ABI = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];

    // Common token addresses on different networks
    this.tokenAddresses = {
      // Ethereum Mainnet
      1: {
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        USDC: '0xA0b86a33E6b642c2fb8de35E6F0d2ed6e3C9d8C9',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
      },
      // Polygon Mainnet
      137: {
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
      },
      // BSC Mainnet  
      56: {
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
        WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
      }
    };
  }

  /**
   * Create a new payment request
   */
  async createPayment(amount, currency, recipientAddress) {
    try {
      if (!this.web3Manager.isConnected) {
        throw new Error('Wallet not connected');
      }

      const paymentId = this.generatePaymentId();
      const network = this.web3Manager.getCurrentNetwork();
      
      if (!network) {
        throw new Error('Unsupported network');
      }

      // Create payment object
      const payment = {
        id: paymentId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        recipientAddress,
        senderAddress: this.web3Manager.address,
        chainId: this.web3Manager.chainId,
        network: network.name,
        status: 'pending',
        createdAt: new Date().toISOString(),
        transactionHash: null,
        blockNumber: null
      };

      // Save payment to backend
      await this.savePayment(payment);

      return payment;

    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Process native currency payment (ETH, MATIC, BNB, etc.)
   */
  async processNativePayment(paymentId, recipientAddress, amount) {
    try {
      const transaction = await this.web3Manager.sendTransaction(
        recipientAddress,
        amount
      );

      // Update payment with transaction hash
      await this.updatePayment(paymentId, {
        status: 'confirming',
        transactionHash: transaction.hash,
        confirmedAt: new Date().toISOString()
      });

      // Wait for confirmation
      const receipt = await transaction.wait();

      // Update payment as completed
      await this.updatePayment(paymentId, {
        status: 'completed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        completedAt: new Date().toISOString()
      });

      return {
        success: true,
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      // Mark payment as failed
      await this.updatePayment(paymentId, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Process ERC-20 token payment
   */
  async processTokenPayment(paymentId, tokenSymbol, recipientAddress, amount) {
    try {
      const tokenAddress = this.getTokenAddress(tokenSymbol);
      
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported on this network`);
      }

      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenAddress,
        this.erc20ABI,
        this.web3Manager.signer
      );

      // Get token decimals
      const decimals = await tokenContract.decimals();
      const tokenAmount = ethers.parseUnits(amount.toString(), decimals);

      // Check balance
      const balance = await tokenContract.balanceOf(this.web3Manager.address);
      if (balance < tokenAmount) {
        throw new Error(`Insufficient ${tokenSymbol} balance`);
      }

      // Send token transfer transaction
      const transaction = await tokenContract.transfer(recipientAddress, tokenAmount);

      // Update payment status
      await this.updatePayment(paymentId, {
        status: 'confirming',
        transactionHash: transaction.hash,
        tokenAddress,
        confirmedAt: new Date().toISOString()
      });

      // Wait for confirmation
      const receipt = await transaction.wait();

      // Update payment as completed
      await this.updatePayment(paymentId, {
        status: 'completed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        completedAt: new Date().toISOString()
      });

      return {
        success: true,
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      // Mark payment as failed
      await this.updatePayment(paymentId, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenSymbol) {
    try {
      if (tokenSymbol === 'ETH' || tokenSymbol === 'MATIC' || tokenSymbol === 'BNB' || tokenSymbol === 'AVAX') {
        // Native currency balance
        return await this.web3Manager.getBalance();
      }

      const tokenAddress = this.getTokenAddress(tokenSymbol);
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported`);
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        this.erc20ABI,
        this.web3Manager.provider
      );

      const balance = await tokenContract.balanceOf(this.web3Manager.address);
      const decimals = await tokenContract.decimals();
      
      return ethers.formatUnits(balance, decimals);

    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(to, amount, tokenSymbol = null) {
    try {
      let gasEstimate;

      if (!tokenSymbol || tokenSymbol === 'ETH') {
        // Native currency transfer
        gasEstimate = await this.web3Manager.provider.estimateGas({
          to,
          value: ethers.parseEther(amount.toString())
        });
      } else {
        // Token transfer
        const tokenAddress = this.getTokenAddress(tokenSymbol);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          this.erc20ABI,
          this.web3Manager.provider
        );

        const decimals = await tokenContract.decimals();
        const tokenAmount = ethers.parseUnits(amount.toString(), decimals);
        
        gasEstimate = await tokenContract.transfer.estimateGas(to, tokenAmount);
      }

      // Get current gas price
      const gasPrice = await this.web3Manager.provider.getFeeData();
      const gasCost = gasEstimate * gasPrice.gasPrice;

      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: gasPrice.gasPrice.toString(),
        gasCost: ethers.formatEther(gasCost)
      };

    } catch (error) {
      console.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Monitor transaction status
   */
  async monitorTransaction(transactionHash) {
    try {
      const transaction = await this.web3Manager.provider.getTransaction(transactionHash);
      
      if (!transaction) {
        return { status: 'not_found' };
      }

      if (transaction.blockNumber) {
        const currentBlock = await this.web3Manager.provider.getBlockNumber();
        const confirmations = currentBlock - transaction.blockNumber;
        
        return {
          status: confirmations >= 12 ? 'confirmed' : 'confirming',
          confirmations,
          blockNumber: transaction.blockNumber
        };
      }

      return { status: 'pending' };

    } catch (error) {
      console.error('Error monitoring transaction:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Helper methods
   */
  generatePaymentId() {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTokenAddress(tokenSymbol) {
    const chainId = this.web3Manager.chainId;
    return this.tokenAddresses[chainId]?.[tokenSymbol.toUpperCase()];
  }

  async savePayment(payment) {
    try {
      const response = await fetch('/.netlify/functions/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payment)
      });

      if (!response.ok) {
        throw new Error('Failed to save payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving payment:', error);
      // Continue without saving if backend is not available
    }
  }

  async updatePayment(paymentId, updates) {
    try {
      const response = await fetch(`/.netlify/functions/payments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: paymentId, ...updates })
      });

      if (!response.ok) {
        throw new Error('Failed to update payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating payment:', error);
      // Continue without updating if backend is not available
    }
  }

  /**
   * Get supported tokens for current network
   */
  getSupportedTokens() {
    const chainId = this.web3Manager.chainId;
    const network = this.web3Manager.getCurrentNetwork();
    
    if (!network || !this.tokenAddresses[chainId]) {
      return [];
    }

    const tokens = [
      {
        symbol: network.symbol,
        name: network.name,
        decimals: network.decimals,
        address: 'native',
        isNative: true
      }
    ];

    // Add supported tokens for this network
    Object.keys(this.tokenAddresses[chainId]).forEach(symbol => {
      tokens.push({
        symbol,
        name: symbol, // You can expand this with full names
        address: this.tokenAddresses[chainId][symbol],
        isNative: false
      });
    });

    return tokens;
  }
}

export default LivePaymentProcessor;