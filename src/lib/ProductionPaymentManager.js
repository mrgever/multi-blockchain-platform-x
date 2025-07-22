/**
 * Production Payment Manager
 * Handles both crypto and Stripe payments with enterprise-grade security
 */

import { loadStripe } from '@stripe/stripe-js';
import { ethers } from 'ethers';
import * as Sentry from '@sentry/browser';
import axios from 'axios';
import { SecureWalletManager } from './SecureWalletManager';

export class ProductionPaymentManager {
  constructor() {
    this.stripe = null;
    this.walletManager = new SecureWalletManager();
    this.paymentTimeouts = new Map();
    this.webhookHandlers = new Map();
    
    // Payment configuration
    this.config = {
      confirmationBlocks: {
        ethereum: parseInt(import.meta.env.VITE_PAYMENT_CONFIRMATION_BLOCKS_ETH) || 12,
        polygon: 30,
        bsc: 15,
        arbitrum: 10
      },
      paymentTimeout: parseInt(import.meta.env.VITE_PAYMENT_TIMEOUT_MINUTES) || 30,
      supportedCurrencies: ['ETH', 'MATIC', 'BNB', 'USDT', 'USDC', 'DAI'],
      supportedNetworks: ['ethereum', 'polygon', 'bsc', 'arbitrum']
    };

    this.initializeServices();
  }

  async initializeServices() {
    try {
      // Initialize Stripe
      this.stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
      
      // Initialize payment monitoring
      this.startPaymentMonitoring();
      
    } catch (error) {
      Sentry.captureException(error);
      console.error('Payment manager initialization failed:', error);
    }
  }

  /**
   * Create a unified payment request
   */
  async createPaymentRequest({ amount, currency, type, metadata = {} }) {
    try {
      const paymentId = this.generatePaymentId();
      
      const paymentRequest = {
        id: paymentId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        type, // 'crypto' or 'stripe'
        status: 'pending',
        metadata,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.paymentTimeout * 60 * 1000).toISOString()
      };

      // Create payment in database via API
      const response = await axios.post('/api/payments/create', paymentRequest);
      
      if (type === 'crypto') {
        // Generate unique payment address for crypto payments
        const paymentAddress = await this.generatePaymentAddress(currency);
        paymentRequest.paymentAddress = paymentAddress;
        
        // Start monitoring for incoming payment
        this.monitorCryptoPayment(paymentId, paymentAddress, amount, currency);
      } else if (type === 'stripe') {
        // Create Stripe payment intent
        const paymentIntent = await this.createStripePaymentIntent(amount, currency, metadata);
        paymentRequest.stripeClientSecret = paymentIntent.clientSecret;
        paymentRequest.stripePaymentIntentId = paymentIntent.id;
      }

      return paymentRequest;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Payment request creation failed: ${error.message}`);
    }
  }

  /**
   * Process crypto payment
   */
  async processCryptoPayment({ paymentId, walletType, network }) {
    try {
      const payment = await this.getPaymentDetails(paymentId);
      
      if (!payment || payment.type !== 'crypto') {
        throw new Error('Invalid payment request');
      }

      if (payment.status !== 'pending') {
        throw new Error(`Payment ${paymentId} is not in pending status`);
      }

      // Check if payment has expired
      if (new Date(payment.expiresAt) < new Date()) {
        throw new Error('Payment request has expired');
      }

      // Return payment details for wallet to process
      return {
        paymentId: payment.id,
        toAddress: payment.paymentAddress,
        amount: payment.amount,
        currency: payment.currency,
        network: network || this.getDefaultNetwork(payment.currency),
        memo: payment.id // Include payment ID as memo for tracking
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Crypto payment processing failed: ${error.message}`);
    }
  }

  /**
   * Monitor incoming crypto payment
   */
  async monitorCryptoPayment(paymentId, address, expectedAmount, currency) {
    try {
      const network = this.getDefaultNetwork(currency);
      
      // Set up timeout
      const timeoutId = setTimeout(async () => {
        await this.updatePaymentStatus(paymentId, 'expired');
        this.paymentTimeouts.delete(paymentId);
      }, this.config.paymentTimeout * 60 * 1000);
      
      this.paymentTimeouts.set(paymentId, timeoutId);

      // Watch for payment
      const paymentResult = await this.walletManager.watchForPayment(
        address,
        expectedAmount,
        currency,
        network
      );

      // Clear timeout
      clearTimeout(timeoutId);
      this.paymentTimeouts.delete(paymentId);

      // Verify payment amount
      if (paymentResult) {
        await this.verifyAndConfirmPayment(paymentId, paymentResult, network);
      }
    } catch (error) {
      Sentry.captureException(error);
      await this.updatePaymentStatus(paymentId, 'failed', error.message);
    }
  }

  /**
   * Verify and confirm crypto payment
   */
  async verifyAndConfirmPayment(paymentId, txData, network) {
    try {
      const payment = await this.getPaymentDetails(paymentId);
      
      // Update payment with transaction hash
      await this.updatePaymentStatus(paymentId, 'confirming', null, {
        transactionHash: txData.transactionHash,
        blockNumber: txData.blockNumber
      });

      // Wait for required confirmations
      const requiredConfirmations = this.config.confirmationBlocks[network];
      const provider = this.walletManager.providers.get(network);
      
      let confirmations = txData.confirmations;
      while (confirmations < requiredConfirmations) {
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
        const currentBlock = await provider.getBlockNumber();
        confirmations = currentBlock - txData.blockNumber;
      }

      // Final verification via backend
      const verificationResult = await axios.post('/api/payments/verify', {
        paymentId,
        transactionHash: txData.transactionHash,
        network
      });

      if (verificationResult.data.verified) {
        await this.updatePaymentStatus(paymentId, 'completed');
        this.emitPaymentEvent('payment.completed', { paymentId, payment });
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      Sentry.captureException(error);
      await this.updatePaymentStatus(paymentId, 'failed', error.message);
    }
  }

  /**
   * Process Stripe payment
   */
  async processStripePayment({ paymentId, paymentMethodId }) {
    try {
      const payment = await this.getPaymentDetails(paymentId);
      
      if (!payment || payment.type !== 'stripe') {
        throw new Error('Invalid payment request');
      }

      const result = await this.stripe.confirmCardPayment(payment.stripeClientSecret, {
        payment_method: paymentMethodId
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Update payment status
      await this.updatePaymentStatus(paymentId, 'completed', null, {
        stripePaymentIntentId: result.paymentIntent.id
      });

      return {
        success: true,
        paymentId,
        paymentIntentId: result.paymentIntent.id
      };
    } catch (error) {
      Sentry.captureException(error);
      await this.updatePaymentStatus(paymentId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(amount, currency, metadata) {
    try {
      const response = await axios.post('/api/stripe/payment-intent', {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata
      });

      return response.data;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Generate unique payment address
   */
  async generatePaymentAddress(currency) {
    try {
      // In production, this would derive a new address from an xPub
      // For now, return configured receiving addresses
      const addresses = {
        ETH: import.meta.env.VITE_ETH_PAYMENT_ADDRESS,
        MATIC: import.meta.env.VITE_MATIC_PAYMENT_ADDRESS,
        BNB: import.meta.env.VITE_BNB_PAYMENT_ADDRESS,
        USDT: import.meta.env.VITE_USDT_PAYMENT_ADDRESS,
        USDC: import.meta.env.VITE_USDC_PAYMENT_ADDRESS,
        DAI: import.meta.env.VITE_DAI_PAYMENT_ADDRESS
      };

      return addresses[currency] || addresses.ETH;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Failed to generate payment address');
    }
  }

  /**
   * Get payment details from API
   */
  async getPaymentDetails(paymentId) {
    try {
      const response = await axios.get(`/api/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId, status, error = null, additionalData = {}) {
    try {
      await axios.put(`/api/payments/${paymentId}/status`, {
        status,
        error,
        ...additionalData,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      Sentry.captureException(err);
      console.error('Failed to update payment status:', err);
    }
  }

  /**
   * Get real-time crypto rates
   */
  async getCryptoRates() {
    try {
      const response = await axios.get('/api/rates');
      return response.data;
    } catch (error) {
      // Fallback to direct API call
      try {
        const coingeckoResponse = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price',
          {
            params: {
              ids: 'ethereum,bitcoin,binancecoin,matic-network,tether,usd-coin,dai',
              vs_currencies: 'usd'
            }
          }
        );
        
        return {
          ETH: { usd: coingeckoResponse.data.ethereum.usd },
          BTC: { usd: coingeckoResponse.data.bitcoin.usd },
          BNB: { usd: coingeckoResponse.data.binancecoin.usd },
          MATIC: { usd: coingeckoResponse.data['matic-network'].usd },
          USDT: { usd: coingeckoResponse.data.tether.usd },
          USDC: { usd: coingeckoResponse.data['usd-coin'].usd },
          DAI: { usd: coingeckoResponse.data.dai.usd }
        };
      } catch (fallbackError) {
        Sentry.captureException(fallbackError);
        throw new Error('Failed to fetch crypto rates');
      }
    }
  }

  /**
   * Calculate payment amount in different currencies
   */
  async calculatePaymentAmounts(amountUSD) {
    try {
      const rates = await this.getCryptoRates();
      const amounts = {};

      for (const [currency, data] of Object.entries(rates)) {
        amounts[currency] = (amountUSD / data.usd).toFixed(8);
      }

      return amounts;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Failed to calculate payment amounts');
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(filters = {}) {
    try {
      const response = await axios.get('/api/payments', { params: filters });
      return response.data;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Register webhook handler
   */
  registerWebhookHandler(event, handler) {
    if (!this.webhookHandlers.has(event)) {
      this.webhookHandlers.set(event, []);
    }
    this.webhookHandlers.get(event).push(handler);
  }

  /**
   * Emit payment event
   */
  emitPaymentEvent(event, data) {
    const handlers = this.webhookHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in payment event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Start payment monitoring service
   */
  startPaymentMonitoring() {
    // Check for expired payments every minute
    setInterval(async () => {
      try {
        const expiredPayments = await axios.get('/api/payments', {
          params: {
            status: 'pending',
            expiredBefore: new Date().toISOString()
          }
        });

        for (const payment of expiredPayments.data) {
          await this.updatePaymentStatus(payment.id, 'expired');
        }
      } catch (error) {
        console.error('Payment monitoring error:', error);
      }
    }, 60000);
  }

  /**
   * Utility functions
   */
  generatePaymentId() {
    return 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getDefaultNetwork(currency) {
    const networkMap = {
      ETH: 'ethereum',
      MATIC: 'polygon',
      BNB: 'bsc',
      USDT: 'ethereum',
      USDC: 'ethereum',
      DAI: 'ethereum'
    };
    return networkMap[currency] || 'ethereum';
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear all payment timeouts
    for (const [paymentId, timeoutId] of this.paymentTimeouts) {
      clearTimeout(timeoutId);
    }
    this.paymentTimeouts.clear();
  }
}

export default ProductionPaymentManager;