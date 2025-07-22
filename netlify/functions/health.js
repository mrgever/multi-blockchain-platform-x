// Health check endpoint as a separate function for better performance

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      function: 'netlify-function',
      region: process.env.AWS_REGION || 'unknown'
    }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  };
};