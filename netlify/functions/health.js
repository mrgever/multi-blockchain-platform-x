/**
 * Health Check Endpoint
 * Monitors system status and dependencies
 */

import { ethers } from 'ethers';
import faunadb from 'faunadb';
import Stripe from 'stripe';
import axios from 'axios';

const q = faunadb.query;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const startTime = Date.now();
  const checks = {};

  try {
    // Check database connectivity
    checks.database = await checkDatabase();
    
    // Check Stripe connectivity
    checks.stripe = await checkStripe();
    
    // Check blockchain providers
    checks.ethereum = await checkEthereum();
    checks.polygon = await checkPolygon();
    
    // Check external APIs
    checks.coingecko = await checkCoinGecko();
    
    // Check Alchemy
    checks.alchemy = await checkAlchemy();

    const endTime = Date.now();
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');

    return {
      statusCode: allHealthy ? 200 : 503,
      headers: {
        ...headers,
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: endTime - startTime,
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks
      })
    };
  }
};

/**
 * Check FaunaDB connectivity
 */
async function checkDatabase() {
  try {
    const client = new faunadb.Client({
      secret: process.env.FAUNA_SECRET_KEY,
      timeout: 5000
    });

    await client.query(q.Now());
    
    return {
      status: 'healthy',
      responseTime: Date.now(),
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Database connection failed'
    };
  }
}

/**
 * Check Stripe connectivity
 */
async function checkStripe() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      timeout: 5000
    });

    await stripe.balance.retrieve();
    
    return {
      status: 'healthy',
      message: 'Stripe connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Stripe connection failed'
    };
  }
}

/**
 * Check Ethereum provider
 */
async function checkEthereum() {
  try {
    const provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      'mainnet',
      { timeout: 5000 }
    );

    const blockNumber = await provider.getBlockNumber();
    
    return {
      status: 'healthy',
      blockNumber,
      message: 'Ethereum provider healthy'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Ethereum provider failed'
    };
  }
}

/**
 * Check Polygon provider
 */
async function checkPolygon() {
  try {
    const provider = new ethers.JsonRpcProvider(
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      'matic',
      { timeout: 5000 }
    );

    const blockNumber = await provider.getBlockNumber();
    
    return {
      status: 'healthy',
      blockNumber,
      message: 'Polygon provider healthy'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Polygon provider failed'
    };
  }
}

/**
 * Check CoinGecko API
 */
async function checkCoinGecko() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/ping', {
      timeout: 5000
    });
    
    return {
      status: 'healthy',
      message: 'CoinGecko API healthy'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'CoinGecko API failed'
    };
  }
}

/**
 * Check Alchemy API
 */
async function checkAlchemy() {
  try {
    const response = await axios.post(
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      },
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (response.data.result) {
      return {
        status: 'healthy',
        blockNumber: parseInt(response.data.result, 16),
        message: 'Alchemy API healthy'
      };
    } else {
      throw new Error('No block number returned');
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Alchemy API failed'
    };
  }
}