/**
 * Create Stripe Payment Intent
 * Handles credit card payment processing
 */

const Stripe = require('stripe');
const Sentry = require('@sentry/node');

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key not configured');
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Parse request body
    const { amount, currency = 'usd' } = JSON.parse(event.body || '{}');

    // Validate input
    if (!amount || amount < 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid amount. Minimum $0.50 required.' 
        })
      };
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        integration_check: 'accept_a_payment',
        created_via: 'nexus_payment_platform'
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      })
    };

  } catch (error) {
    Sentry.captureException(error);
    console.error('Payment intent creation error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Card was declined',
          message: error.message
        })
      };
    }

    if (error.type === 'StripeRateLimitError') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Too many requests made to the API too quickly'
        })
      };
    }

    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid parameters were supplied to Stripe\'s API'
        })
      };
    }

    if (error.type === 'StripeAPIError') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'An error occurred internally with Stripe\'s API'
        })
      };
    }

    if (error.type === 'StripeConnectionError') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Some kind of error occurred during the HTTPS communication'
        })
      };
    }

    if (error.type === 'StripeAuthenticationError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'You probably used an incorrect API key'
        })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Payment processing failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    };
  }
};