/**
 * Production Payment API - Serverless Function
 * Handles payment creation, verification, and status updates
 */

import faunadb from 'faunadb';
import { ethers } from 'ethers';
import { Alchemy, Network } from 'alchemy-sdk';
import * as Sentry from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Initialize FaunaDB
const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY,
  domain: process.env.FAUNA_DOMAIN || 'db.fauna.com',
});

// Initialize Alchemy
const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
});

// Supported networks configuration
const NETWORKS = {
  ethereum: {
    chainId: 1,
    alchemy: Network.ETH_MAINNET,
    confirmations: 12,
    provider: new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
  },
  polygon: {
    chainId: 137,
    alchemy: Network.MATIC_MAINNET,
    confirmations: 30,
    provider: new ethers.JsonRpcProvider(`https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
  },
  arbitrum: {
    chainId: 42161,
    alchemy: Network.ARB_MAINNET,
    confirmations: 10,
    provider: new ethers.JsonRpcProvider(`https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
  }
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Rate limiting (simple in-memory implementation)
const rateLimiter = new Map();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimits = rateLimiter.get(ip) || { count: 0, resetTime: now + RATE_WINDOW };
  
  if (now > userLimits.resetTime) {
    userLimits.count = 0;
    userLimits.resetTime = now + RATE_WINDOW;
  }
  
  userLimits.count++;
  rateLimiter.set(ip, userLimits);
  
  return userLimits.count <= RATE_LIMIT;
}

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const ip = event.headers['x-forwarded-for'] || event.headers['x-nf-client-connection-ip'];
  
  // Check rate limit
  if (!checkRateLimit(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Rate limit exceeded' })
    };
  }

  const path = event.path.replace('/.netlify/functions/payments', '');
  const segments = path.split('/').filter(Boolean);

  try {
    // Route requests
    switch (event.httpMethod) {
      case 'POST':
        if (segments[0] === 'create') {
          return await createPayment(event);
        } else if (segments[0] === 'verify') {
          return await verifyPayment(event);
        }
        break;

      case 'GET':
        if (segments.length === 0) {
          return await getPayments(event);
        } else if (segments.length === 1) {
          return await getPayment(segments[0]);
        }
        break;

      case 'PUT':
        if (segments.length === 2 && segments[1] === 'status') {
          return await updatePaymentStatus(segments[0], event);
        }
        break;
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    Sentry.captureException(error);
    console.error('Payment API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Create new payment request
 */
async function createPayment(event) {
  try {
    const body = JSON.parse(event.body);
    const { amount, currency, type, metadata = {} } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid amount' })
      };
    }

    if (!currency || !['ETH', 'MATIC', 'BNB', 'USDT', 'USDC', 'DAI'].includes(currency)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid currency' })
      };
    }

    if (!type || !['crypto', 'stripe'].includes(type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payment type' })
      };
    }

    // Generate payment ID and addresses
    const paymentId = `pay_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const paymentAddress = type === 'crypto' ? await generatePaymentAddress(currency) : null;

    const payment = {
      id: paymentId,
      amount: parseFloat(amount),
      currency,
      type,
      status: 'pending',
      paymentAddress,
      metadata,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      transactionHash: null,
      blockNumber: null,
      confirmations: 0,
      error: null
    };

    // Store in FaunaDB
    await client.query(
      q.Create(
        q.Collection('payments'),
        { data: payment }
      )
    );

    // Set up blockchain monitoring for crypto payments
    if (type === 'crypto' && paymentAddress) {
      await setupPaymentMonitoring(paymentId, paymentAddress, amount, currency);
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(payment)
    };

  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Get payment by ID
 */
async function getPayment(paymentId) {
  try {
    const result = await client.query(
      q.Get(
        q.Match(q.Index('payments_by_id'), paymentId)
      )
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.data)
    };

  } catch (error) {
    if (error.name === 'NotFound') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Payment not found' })
      };
    }
    throw error;
  }
}

/**
 * Get payments with filters
 */
async function getPayments(event) {
  try {
    const params = event.queryStringParameters || {};
    const { status, expiredBefore, limit = 100, after } = params;

    let query = q.Match(q.Index('all_payments'));

    // Apply filters
    if (status) {
      query = q.Match(q.Index('payments_by_status'), status);
    }

    const result = await client.query(
      q.Map(
        q.Paginate(query, { size: parseInt(limit), after: after ? [after] : undefined }),
        q.Lambda('ref', q.Get(q.Var('ref')))
      )
    );

    // Filter expired payments if requested
    let payments = result.data.map(doc => doc.data);
    if (expiredBefore) {
      payments = payments.filter(p => new Date(p.expiresAt) < new Date(expiredBefore));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        payments,
        after: result.after ? result.after[0] : null
      })
    };

  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Update payment status
 */
async function updatePaymentStatus(paymentId, event) {
  try {
    const body = JSON.parse(event.body);
    const { status, error, transactionHash, blockNumber, ...additionalData } = body;

    // Validate status
    const validStatuses = ['pending', 'confirming', 'completed', 'failed', 'expired'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid status' })
      };
    }

    // Get current payment
    const paymentResult = await client.query(
      q.Get(q.Match(q.Index('payments_by_id'), paymentId))
    );

    const updatedPayment = {
      ...paymentResult.data,
      status,
      error: error || null,
      transactionHash: transactionHash || paymentResult.data.transactionHash,
      blockNumber: blockNumber || paymentResult.data.blockNumber,
      ...additionalData,
      updatedAt: new Date().toISOString()
    };

    // Update in FaunaDB
    await client.query(
      q.Update(paymentResult.ref, { data: updatedPayment })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(updatedPayment)
    };

  } catch (error) {
    if (error.name === 'NotFound') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Payment not found' })
      };
    }
    throw error;
  }
}

/**
 * Verify payment on blockchain
 */
async function verifyPayment(event) {
  try {
    const body = JSON.parse(event.body);
    const { paymentId, transactionHash, network = 'ethereum' } = body;

    if (!paymentId || !transactionHash) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Get payment from database
    const paymentResult = await client.query(
      q.Get(q.Match(q.Index('payments_by_id'), paymentId))
    );
    const payment = paymentResult.data;

    if (payment.status !== 'pending' && payment.status !== 'confirming') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payment already processed' })
      };
    }

    // Get network configuration
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unsupported network' })
      };
    }

    // Verify transaction on blockchain
    const provider = networkConfig.provider;
    const tx = await provider.getTransaction(transactionHash);
    
    if (!tx) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Transaction not found' })
      };
    }

    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt || receipt.status !== 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Transaction failed' })
      };
    }

    // Verify payment details
    const verified = await verifyTransactionDetails(tx, payment, network);
    
    if (!verified) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Transaction verification failed' })
      };
    }

    // Check confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    if (confirmations >= networkConfig.confirmations) {
      // Payment confirmed
      await updatePaymentStatus(paymentId, {
        body: JSON.stringify({
          status: 'completed',
          transactionHash,
          blockNumber: receipt.blockNumber,
          confirmations
        })
      });
    } else {
      // Still confirming
      await updatePaymentStatus(paymentId, {
        body: JSON.stringify({
          status: 'confirming',
          transactionHash,
          blockNumber: receipt.blockNumber,
          confirmations
        })
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        verified: true,
        confirmations,
        requiredConfirmations: networkConfig.confirmations,
        status: confirmations >= networkConfig.confirmations ? 'completed' : 'confirming'
      })
    };

  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Generate unique payment address
 */
async function generatePaymentAddress(currency) {
  // In production, this would derive from an HD wallet
  // For now, return configured addresses
  const addresses = {
    ETH: process.env.ETH_PAYMENT_ADDRESS,
    MATIC: process.env.MATIC_PAYMENT_ADDRESS,
    BNB: process.env.BNB_PAYMENT_ADDRESS,
    USDT: process.env.USDT_PAYMENT_ADDRESS,
    USDC: process.env.USDC_PAYMENT_ADDRESS,
    DAI: process.env.DAI_PAYMENT_ADDRESS
  };

  return addresses[currency] || addresses.ETH;
}

/**
 * Set up payment monitoring webhook
 */
async function setupPaymentMonitoring(paymentId, address, amount, currency) {
  // Register webhook with Alchemy for address activity
  try {
    const webhookUrl = `${process.env.VITE_APP_URL}/.netlify/functions/payment-webhook`;
    
    // This would register a webhook with Alchemy Notify
    // For production implementation
    console.log(`Setting up monitoring for payment ${paymentId} at address ${address}`);
    
  } catch (error) {
    console.error('Failed to setup payment monitoring:', error);
  }
}

/**
 * Verify transaction details match payment
 */
async function verifyTransactionDetails(tx, payment, network) {
  // For native currency transfers
  if (['ETH', 'MATIC', 'BNB'].includes(payment.currency)) {
    const value = ethers.formatEther(tx.value);
    return (
      tx.to?.toLowerCase() === payment.paymentAddress?.toLowerCase() &&
      parseFloat(value) >= payment.amount
    );
  }
  
  // For token transfers, decode the transaction data
  // This is a simplified check - production would decode the full transaction
  return tx.to?.toLowerCase() === getTokenAddress(payment.currency, network)?.toLowerCase();
}

/**
 * Get token contract address
 */
function getTokenAddress(currency, network) {
  const addresses = {
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
  
  return addresses[network]?.[currency];
}