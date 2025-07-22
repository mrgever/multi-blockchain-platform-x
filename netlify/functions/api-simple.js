// Simple API handler for Netlify Functions that bypasses TypeScript compilation
exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api-simple', '');
  
  // Debug logging
  console.log('Request path:', event.path);
  console.log('Cleaned path:', path);
  console.log('HTTP method:', event.httpMethod);
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Route handling
    if (path === '/health' || path === '/api/health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          message: 'NEXUS Multi-Blockchain Platform API'
        })
      };
    }

    // Wallet generation endpoints
    if ((path === '/api/v1/wallet/generate' || path === '/api/v1/wallet/generate-mnemonic') && event.httpMethod === 'POST') {
      const mnemonic = generateMnemonic();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            mnemonic,
            addresses: {
              ethereum: '0x' + Math.random().toString(36).substring(2, 42),
              bitcoin: '1' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              dogecoin: 'D' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              ton: 'UQ' + Math.random().toString(36).substring(2, 40) + '__'
            }
          }
        })
      };
    }

    // Import wallet endpoint
    if (path === '/api/v1/wallet/import' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { mnemonic } = body;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            mnemonic,
            addresses: {
              ethereum: '0x' + Math.random().toString(36).substring(2, 42),
              bitcoin: '1' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              dogecoin: 'D' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              ton: 'UQ' + Math.random().toString(36).substring(2, 40) + '__'
            }
          }
        })
      };
    }

    // Derive all addresses endpoint
    if (path === '/api/v1/wallet/derive-all-addresses' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { mnemonic } = body;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            addresses: {
              ethereum: '0x' + Math.random().toString(36).substring(2, 42),
              bitcoin: '1' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              dogecoin: 'D' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              ton: 'UQ' + Math.random().toString(36).substring(2, 40) + '__',
              usdt: '0x' + Math.random().toString(36).substring(2, 42)
            }
          }
        })
      };
    }

    // Generate network wallet endpoint
    if (path === '/api/v1/wallet/generate-network-wallet' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { blockchain } = body;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            blockchain,
            mnemonic: generateMnemonic(),
            address: '0x' + Math.random().toString(36).substring(2, 42),
            networkInfo: {
              name: blockchain + ' Network',
              symbol: blockchain.substring(0, 3).toUpperCase()
            }
          }
        })
      };
    }

    // Get private key endpoint
    if (path === '/api/v1/wallet/get-private-key' && event.httpMethod === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            privateKey: '0x' + Math.random().toString(36).substring(2, 64)
          }
        })
      };
    }

    // Features purchase endpoint
    if (path === '/api/v1/features/purchase' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { featureId, price, userBalance } = body;
      
      console.log('Feature purchase request:', { featureId, price, userBalance });
      
      if (userBalance < price) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Insufficient NUSD balance',
            required: price,
            available: userBalance
          })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            featureId,
            price,
            transactionId: 'feat_' + Math.random().toString(36).substr(2, 9),
            purchaseDate: new Date().toISOString(),
            newBalance: userBalance - price
          }
        })
      };
    }

    // NUSD swap endpoint
    if (path === '/api/v1/swap/to-nusd' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { fromToken, amount, userAddress } = body;
      
      const rates = {
        ETH: 2650,
        BTC: 43250,
        USDT: 1.0,
        DOGE: 0.087,
        TON: 3.45
      };
      
      const rate = rates[fromToken?.toUpperCase()] || 1;
      const nusdAmount = (parseFloat(amount || 0) * rate).toFixed(2);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            fromToken,
            toToken: 'NUSD',
            fromAmount: amount,
            nusdAmount,
            exchangeRate: rate,
            depositAddresses: {
              ETH: '0x742d35Cc6634C0532925a3b8D4B7ed8ecDbC2C2c',
              BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
              DOGE: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
              USDT: process.env.USDT_ADDRESS || 'TPw6NEgZRxEoX8s64zfCKfPjwRCHHPTjQN',
              TON: process.env.TON_ADDRESS || 'UQA7SUW4pslVSudC0Cfi8NTQyZI1nHHi-frcp20EvQZSfn__'
            },
            transactionId: 'nusd_' + Math.random().toString(36).substr(2, 9)
          }
        })
      };
    }

    // Market data endpoints
    if (path === '/api/v1/market/overview' || path.startsWith('/api/v1/market')) {
      const mockPrices = [
        { 
          id: 'bitcoin', 
          symbol: 'btc', 
          name: 'Bitcoin', 
          current_price: 43250, 
          price_change_percentage_24h: 2.5,
          market_cap: 847000000000,
          total_volume: 15000000000
        },
        { 
          id: 'ethereum', 
          symbol: 'eth', 
          name: 'Ethereum', 
          current_price: 2650, 
          price_change_percentage_24h: 3.2,
          market_cap: 318000000000,
          total_volume: 8000000000
        },
        { 
          id: 'dogecoin', 
          symbol: 'doge', 
          name: 'Dogecoin', 
          current_price: 0.087, 
          price_change_percentage_24h: -1.1,
          market_cap: 12000000000,
          total_volume: 400000000
        },
        { 
          id: 'toncoin', 
          symbol: 'ton', 
          name: 'TON', 
          current_price: 3.45, 
          price_change_percentage_24h: 5.7,
          market_cap: 12000000000,
          total_volume: 200000000
        }
      ];

      const globalStats = {
        total_market_cap: { usd: 1189000000000 },
        total_volume: { usd: 23600000000 },
        market_cap_percentage: { btc: 71.2, eth: 26.7 }
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            prices: mockPrices,
            globalStats
          }
        })
      };
    }

    // Catch-all for wallet endpoints
    if (path.includes('/wallet/') && event.httpMethod === 'POST') {
      console.log('Catch-all wallet endpoint hit:', path);
      const mnemonic = generateMnemonic();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            mnemonic,
            addresses: {
              ethereum: '0x' + Math.random().toString(36).substring(2, 42),
              bitcoin: '1' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              dogecoin: 'D' + Math.random().toString(36).substring(2, 35).toUpperCase(),
              ton: 'UQ' + Math.random().toString(36).substring(2, 40) + '__'
            }
          }
        })
      };
    }

    // Default 404
    console.log('No route matched for path:', path);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Endpoint not found',
        path,
        availableEndpoints: [
          '/api/v1/wallet/generate-mnemonic',
          '/api/v1/wallet/derive-all-addresses',
          '/api/v1/market/overview',
          '/api/v1/swap/to-nusd',
          '/api/v1/features/purchase',
          '/health'
        ]
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

// Simple mnemonic generator
function generateMnemonic() {
  const words = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 
                 'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'];
  const mnemonic = [];
  for (let i = 0; i < 12; i++) {
    mnemonic.push(words[Math.floor(Math.random() * words.length)]);
  }
  return mnemonic.join(' ');
}