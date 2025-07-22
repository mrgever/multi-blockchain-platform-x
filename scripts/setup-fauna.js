/**
 * FaunaDB Setup Script
 * Creates necessary collections and indexes
 */

const faunadb = require('faunadb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY,
  domain: process.env.FAUNA_DOMAIN || 'db.fauna.com',
});

async function setupDatabase() {
  console.log('Setting up FaunaDB...');

  try {
    // Create payments collection
    await client.query(
      q.If(
        q.Not(q.Exists(q.Collection('payments'))),
        q.CreateCollection({ name: 'payments' }),
        'Collection already exists'
      )
    );
    console.log('✅ Payments collection created');

    // Create indexes
    const indexes = [
      {
        name: 'payments_by_id',
        source: q.Collection('payments'),
        terms: [{ field: ['data', 'id'] }],
        unique: true
      },
      {
        name: 'payments_by_status',
        source: q.Collection('payments'),
        terms: [{ field: ['data', 'status'] }]
      },
      {
        name: 'payments_by_address',
        source: q.Collection('payments'),
        terms: [{ field: ['data', 'paymentAddress'] }]
      },
      {
        name: 'payments_by_tx_hash',
        source: q.Collection('payments'),
        terms: [{ field: ['data', 'transactionHash'] }]
      },
      {
        name: 'all_payments',
        source: q.Collection('payments')
      }
    ];

    for (const index of indexes) {
      await client.query(
        q.If(
          q.Not(q.Exists(q.Index(index.name))),
          q.CreateIndex(index),
          `Index ${index.name} already exists`
        )
      );
      console.log(`✅ Index ${index.name} created`);
    }

    // Create users collection (optional)
    await client.query(
      q.If(
        q.Not(q.Exists(q.Collection('users'))),
        q.CreateCollection({ name: 'users' }),
        'Users collection already exists'
      )
    );

    // Create user indexes
    await client.query(
      q.If(
        q.Not(q.Exists(q.Index('users_by_email'))),
        q.CreateIndex({
          name: 'users_by_email',
          source: q.Collection('users'),
          terms: [{ field: ['data', 'email'] }],
          unique: true
        }),
        'Index already exists'
      )
    );

    // Create webhook logs collection
    await client.query(
      q.If(
        q.Not(q.Exists(q.Collection('webhook_logs'))),
        q.CreateCollection({ name: 'webhook_logs' }),
        'Webhook logs collection already exists'
      )
    );

    console.log('✅ Database setup complete!');

  } catch (error) {
    console.error('Database setup error:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();