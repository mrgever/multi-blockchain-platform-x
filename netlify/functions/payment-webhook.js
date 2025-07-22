/**
 * Payment Webhook Handler - Alchemy Notify Integration
 * Receives blockchain events and updates payment status
 */

import { ethers } from 'ethers';
import faunadb from 'faunadb';
import * as Sentry from '@sentry/node';
import crypto from 'crypto';

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

// Headers
const headers = {
  'Content-Type': 'application/json',
};

export const handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify webhook signature from Alchemy
    const signature = event.headers['x-alchemy-signature'];
    if (!verifyAlchemySignature(event.body, signature)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    const webhook = JSON.parse(event.body);
    console.log('Received Alchemy webhook:', webhook.type);

    // Handle different webhook types
    switch (webhook.type) {
      case 'ADDRESS_ACTIVITY':
        await handleAddressActivity(webhook);
        break;
        
      case 'MINED_TRANSACTION':
        await handleMinedTransaction(webhook);
        break;
        
      case 'DROPPED_TRANSACTION':
        await handleDroppedTransaction(webhook);
        break;
        
      default:
        console.log(`Unhandled webhook type: ${webhook.type}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    Sentry.captureException(error);
    console.error('Webhook processing error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Verify Alchemy webhook signature
 */
function verifyAlchemySignature(payload, signature) {
  if (!signature || !process.env.ALCHEMY_WEBHOOK_TOKEN) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', process.env.ALCHEMY_WEBHOOK_TOKEN);
  hmac.update(payload, 'utf8');
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}

/**
 * Handle address activity webhook
 */
async function handleAddressActivity(webhook) {
  const { event } = webhook;
  
  for (const activity of event.activity) {
    try {
      // Get transaction details
      const { hash, from, to, value, asset, category } = activity;
      
      console.log(`Processing ${category} activity: ${hash}`);
      
      // Find payment by receiving address
      const paymentResult = await client.query(
        q.Get(
          q.Match(q.Index('payments_by_address'), to.toLowerCase())
        )
      ).catch(() => null);
      
      if (!paymentResult) {
        console.log(`No payment found for address: ${to}`);
        continue;
      }
      
      const payment = paymentResult.data;
      
      // Skip if payment is already completed
      if (payment.status === 'completed') {
        continue;
      }
      
      // Verify payment amount
      let receivedAmount = 0;
      
      if (category === 'external') {
        // Native currency transfer
        receivedAmount = parseFloat(value);
      } else if (category === 'erc20') {
        // Token transfer
        receivedAmount = parseFloat(value);
      }
      
      if (receivedAmount < payment.amount) {
        console.log(`Insufficient payment amount: ${receivedAmount} < ${payment.amount}`);
        await updatePaymentStatus(payment.id, 'failed', 'Insufficient payment amount');
        continue;
      }
      
      // Update payment status to confirming
      await updatePaymentStatus(payment.id, 'confirming', null, {
        transactionHash: hash,
        fromAddress: from,
        receivedAmount,
        blockNumber: activity.blockNum
      });
      
      // Check confirmations
      await checkPaymentConfirmations(payment.id, hash, event.network);
      
    } catch (error) {
      console.error(`Error processing activity ${activity.hash}:`, error);
      Sentry.captureException(error);
    }
  }
}

/**
 * Handle mined transaction webhook
 */
async function handleMinedTransaction(webhook) {
  const { transaction, network } = webhook.event;
  
  try {
    // Find payment by transaction hash
    const paymentResult = await client.query(
      q.Get(
        q.Match(q.Index('payments_by_tx_hash'), transaction.hash)
      )
    ).catch(() => null);
    
    if (!paymentResult) {
      console.log(`No payment found for tx: ${transaction.hash}`);
      return;
    }
    
    const payment = paymentResult.data;
    
    // Update with block number
    await updatePaymentStatus(payment.id, 'confirming', null, {
      blockNumber: parseInt(transaction.blockNumber, 16),
      gasUsed: parseInt(transaction.gasUsed, 16),
      effectiveGasPrice: parseInt(transaction.effectiveGasPrice, 16)
    });
    
    // Check confirmations
    await checkPaymentConfirmations(payment.id, transaction.hash, network);
    
  } catch (error) {
    console.error('Error handling mined transaction:', error);
    Sentry.captureException(error);
  }
}

/**
 * Handle dropped transaction webhook
 */
async function handleDroppedTransaction(webhook) {
  const { transaction } = webhook.event;
  
  try {
    // Find payment by transaction hash
    const paymentResult = await client.query(
      q.Get(
        q.Match(q.Index('payments_by_tx_hash'), transaction.hash)
      )
    ).catch(() => null);
    
    if (!paymentResult) {
      return;
    }
    
    // Mark payment as failed
    await updatePaymentStatus(paymentResult.data.id, 'failed', 'Transaction dropped from mempool');
    
  } catch (error) {
    console.error('Error handling dropped transaction:', error);
    Sentry.captureException(error);
  }
}

/**
 * Check payment confirmations
 */
async function checkPaymentConfirmations(paymentId, txHash, network) {
  try {
    // Get required confirmations for network
    const requiredConfirmations = {
      'ETH_MAINNET': 12,
      'MATIC_MAINNET': 30,
      'ARB_MAINNET': 10
    }[network] || 12;
    
    // Get current block number
    const provider = getProvider(network);
    const tx = await provider.getTransaction(txHash);
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - tx.blockNumber;
    
    console.log(`Payment ${paymentId}: ${confirmations}/${requiredConfirmations} confirmations`);
    
    if (confirmations >= requiredConfirmations) {
      // Payment confirmed!
      await updatePaymentStatus(paymentId, 'completed', null, {
        confirmations,
        completedAt: new Date().toISOString()
      });
      
      // Trigger any post-payment actions
      await triggerPaymentCompleted(paymentId);
    } else {
      // Update confirmation count
      await updatePaymentStatus(paymentId, 'confirming', null, {
        confirmations
      });
    }
    
  } catch (error) {
    console.error('Error checking confirmations:', error);
    Sentry.captureException(error);
  }
}

/**
 * Update payment status in database
 */
async function updatePaymentStatus(paymentId, status, error = null, additionalData = {}) {
  try {
    const paymentRef = await client.query(
      q.Get(q.Match(q.Index('payments_by_id'), paymentId))
    );
    
    await client.query(
      q.Update(paymentRef.ref, {
        data: {
          status,
          error,
          ...additionalData,
          updatedAt: new Date().toISOString()
        }
      })
    );
    
    console.log(`Updated payment ${paymentId} status to ${status}`);
    
  } catch (error) {
    console.error('Failed to update payment status:', error);
    Sentry.captureException(error);
  }
}

/**
 * Trigger actions when payment is completed
 */
async function triggerPaymentCompleted(paymentId) {
  try {
    // Here you would trigger any post-payment actions:
    // - Send confirmation email
    // - Update user balance
    // - Fulfill order
    // - Send webhook to your application
    
    console.log(`Payment ${paymentId} completed - triggering post-payment actions`);
    
    // Example: Send webhook to application
    if (process.env.PAYMENT_WEBHOOK_URL) {
      await fetch(process.env.PAYMENT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment.completed',
          paymentId,
          timestamp: new Date().toISOString()
        })
      });
    }
    
  } catch (error) {
    console.error('Error triggering payment completed actions:', error);
    Sentry.captureException(error);
  }
}

/**
 * Get provider for network
 */
function getProvider(network) {
  const rpcUrls = {
    'ETH_MAINNET': `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    'MATIC_MAINNET': `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    'ARB_MAINNET': `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  };
  
  return new ethers.JsonRpcProvider(rpcUrls[network] || rpcUrls['ETH_MAINNET']);
}