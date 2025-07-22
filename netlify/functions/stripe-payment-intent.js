/**
 * Stripe Payment Intent - Production Serverless Function
 * Creates payment intents and handles Stripe webhooks
 */

const Stripe = require('stripe');
const Sentry = require('@sentry/node');

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Handle webhook events
  if (event.headers['stripe-signature']) {
    return handleWebhook(event);
  }

  // Only accept POST for payment intent creation
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { amount, currency = 'usd', metadata = {} } = JSON.parse(event.body);

    // Validate amount
    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid amount' })
      };
    }

    // Validate currency
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];
    if (!supportedCurrencies.includes(currency.toLowerCase())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unsupported currency' })
      };
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      },
      // Additional security settings
      setup_future_usage: metadata.savePaymentMethod ? 'off_session' : null,
      description: metadata.description || 'Payment via Nexus Platform',
      statement_descriptor: 'NEXUS PAY',
      // 3D Secure settings
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
          network_preferences: {
            preferred_networks: ['visa', 'mastercard']
          }
        }
      }
    });

    // Log payment intent creation
    console.log(`Payment intent created: ${paymentIntent.id} for ${amount} ${currency}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      })
    };

  } catch (error) {
    Sentry.captureException(error);
    console.error('Stripe payment intent error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: error.message,
          code: error.code
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Payment processing failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Handle Stripe webhooks
 */
async function handleWebhook(event) {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook configuration error' })
    };
  }

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  try {
    // Handle different event types
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(stripeEvent.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(stripeEvent.data.object);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(stripeEvent.data.object);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
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
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`);
  
  // Update payment status in database
  const paymentId = paymentIntent.metadata.paymentId;
  if (paymentId) {
    try {
      await fetch(`${process.env.URL}/.netlify/functions/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          stripePaymentIntentId: paymentIntent.id,
          stripeChargeId: paymentIntent.latest_charge
        })
      });
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  }

  // Send confirmation email (implement based on your email service)
  if (paymentIntent.receipt_email) {
    // await sendPaymentConfirmationEmail(paymentIntent);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(paymentIntent) {
  console.log(`Payment failed: ${paymentIntent.id}`);
  
  const paymentId = paymentIntent.metadata.paymentId;
  if (paymentId) {
    try {
      await fetch(`${process.env.URL}/.netlify/functions/payments/${paymentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'failed',
          error: paymentIntent.last_payment_error?.message || 'Payment failed',
          stripePaymentIntentId: paymentIntent.id
        })
      });
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  }
}

/**
 * Handle dispute creation
 */
async function handleDisputeCreated(dispute) {
  console.error(`Dispute created: ${dispute.id} for charge ${dispute.charge}`);
  
  // Log to Sentry as this requires immediate attention
  Sentry.captureMessage(`Payment dispute created: ${dispute.id}`, 'error');
  
  // Notify administrators (implement based on your notification service)
  // await notifyAdminsOfDispute(dispute);
}

/**
 * Handle payment method attachment
 */
async function handlePaymentMethodAttached(paymentMethod) {
  console.log(`Payment method attached: ${paymentMethod.id}`);
  
  // Could be used to update customer records or send notifications
  // about saved payment methods
}