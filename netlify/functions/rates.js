/**
 * Crypto Rates API - Production Serverless Function
 * Fetches real-time cryptocurrency rates with caching
 */

const axios = require('axios');
const Sentry = require('@sentry/node');

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// In-memory cache for rates
let ratesCache = {
  data: null,
  timestamp: 0,
  ttl: 60000 // 1 minute cache
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60', // Browser cache for 1 minute
};

// Supported cryptocurrencies
const SUPPORTED_CRYPTOS = {
  'ethereum': 'ETH',
  'bitcoin': 'BTC',
  'binancecoin': 'BNB',
  'matic-network': 'MATIC',
  'tether': 'USDT',
  'usd-coin': 'USDC',
  'dai': 'DAI',
  'dogecoin': 'DOGE',
  'avalanche-2': 'AVAX',
  'chainlink': 'LINK'
};

// Fallback rates (in case all APIs fail)
const FALLBACK_RATES = {
  ETH: { usd: 2000, eur: 1850, gbp: 1600 },
  BTC: { usd: 40000, eur: 37000, gbp: 32000 },
  BNB: { usd: 300, eur: 280, gbp: 240 },
  MATIC: { usd: 0.8, eur: 0.74, gbp: 0.64 },
  USDT: { usd: 1.0, eur: 0.93, gbp: 0.8 },
  USDC: { usd: 1.0, eur: 0.93, gbp: 0.8 },
  DAI: { usd: 1.0, eur: 0.93, gbp: 0.8 },
  DOGE: { usd: 0.08, eur: 0.074, gbp: 0.064 },
  AVAX: { usd: 20, eur: 18.5, gbp: 16 },
  LINK: { usd: 15, eur: 14, gbp: 12 }
};

exports.handler = async (event, context) => {
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

  try {
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const currencies = params.currencies?.split(',') || ['usd', 'eur', 'gbp'];
    const forceRefresh = params.refresh === 'true';

    // Check cache
    const now = Date.now();
    if (!forceRefresh && ratesCache.data && (now - ratesCache.timestamp) < ratesCache.ttl) {
      console.log('Returning cached rates');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          rates: ratesCache.data,
          source: 'cache',
          timestamp: ratesCache.timestamp
        })
      };
    }

    // Fetch fresh rates
    const rates = await fetchCryptoRates(currencies);
    
    // Update cache
    ratesCache = {
      data: rates,
      timestamp: now,
      ttl: 60000
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rates,
        source: 'live',
        timestamp: now,
        currencies: currencies
      })
    };

  } catch (error) {
    Sentry.captureException(error);
    console.error('Rates API error:', error);

    // Return fallback rates on error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rates: FALLBACK_RATES,
        source: 'fallback',
        timestamp: Date.now(),
        warning: 'Using fallback rates due to API error'
      })
    };
  }
};

/**
 * Fetch rates from CoinGecko API
 */
async function fetchCryptoRates(currencies) {
  try {
    const cryptoIds = Object.keys(SUPPORTED_CRYPTOS).join(',');
    const vsCurrencies = currencies.join(',');

    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: cryptoIds,
        vs_currencies: vsCurrencies,
        include_24hr_change: true,
        include_market_cap: true,
        include_last_updated_at: true
      },
      headers: {
        'Accept': 'application/json',
        'X-Cg-Pro-Api-Key': process.env.COINGECKO_API_KEY || ''
      },
      timeout: 5000
    });

    // Transform response to our format
    const rates = {};
    
    for (const [geckoId, symbol] of Object.entries(SUPPORTED_CRYPTOS)) {
      if (response.data[geckoId]) {
        rates[symbol] = {
          ...response.data[geckoId],
          name: getFullName(symbol),
          symbol: symbol,
          change24h: response.data[geckoId][`${currencies[0]}_24h_change`] || 0,
          marketCap: response.data[geckoId][`${currencies[0]}_market_cap`] || 0,
          lastUpdated: response.data[geckoId].last_updated_at || Date.now() / 1000
        };
      }
    }

    return rates;

  } catch (error) {
    // Try alternative API (CryptoCompare)
    console.log('CoinGecko failed, trying CryptoCompare...');
    return await fetchFromCryptoCompare(currencies);
  }
}

/**
 * Fallback to CryptoCompare API
 */
async function fetchFromCryptoCompare(currencies) {
  try {
    const symbols = Object.values(SUPPORTED_CRYPTOS).join(',');
    const toCurrencies = currencies.map(c => c.toUpperCase()).join(',');

    const response = await axios.get('https://min-api.cryptocompare.com/data/pricemultifull', {
      params: {
        fsyms: symbols,
        tsyms: toCurrencies
      },
      headers: {
        'Authorization': `Apikey ${process.env.CRYPTOCOMPARE_API_KEY || ''}`
      },
      timeout: 5000
    });

    // Transform response
    const rates = {};
    const data = response.data.RAW;

    for (const symbol of Object.values(SUPPORTED_CRYPTOS)) {
      if (data[symbol]) {
        rates[symbol] = {
          name: getFullName(symbol),
          symbol: symbol
        };
        
        for (const currency of currencies) {
          const currencyUpper = currency.toUpperCase();
          if (data[symbol][currencyUpper]) {
            rates[symbol][currency.toLowerCase()] = data[symbol][currencyUpper].PRICE;
            rates[symbol][`${currency.toLowerCase()}_24h_change`] = data[symbol][currencyUpper].CHANGEPCT24HOUR;
            rates[symbol][`${currency.toLowerCase()}_market_cap`] = data[symbol][currencyUpper].MKTCAP;
          }
        }
        
        rates[symbol].lastUpdated = Date.now() / 1000;
      }
    }

    return rates;

  } catch (error) {
    console.error('CryptoCompare also failed:', error);
    throw error;
  }
}

/**
 * Get full name for cryptocurrency
 */
function getFullName(symbol) {
  const names = {
    ETH: 'Ethereum',
    BTC: 'Bitcoin',
    BNB: 'BNB',
    MATIC: 'Polygon',
    USDT: 'Tether',
    USDC: 'USD Coin',
    DAI: 'Dai',
    DOGE: 'Dogecoin',
    AVAX: 'Avalanche',
    LINK: 'Chainlink'
  };
  return names[symbol] || symbol;
}