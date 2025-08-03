/**
 * Health Check Endpoint
 * Simple health check for Netlify functions
 */

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
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

  const startTime = Date.now();

  try {
    const endTime = Date.now();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: endTime - startTime,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        service: 'Bitorzo Platform API',
        uptime: process.uptime(),
        message: 'All systems operational'
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
        service: 'Bitorzo Platform API'
      })
    };
  }
};