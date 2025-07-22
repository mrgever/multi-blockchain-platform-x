const Web3 = require('web3');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for demo purposes
// In production, use a proper database
const payments = new Map();

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const path = event.path.split('/').slice(-1)[0];

    try {
        switch (event.httpMethod) {
            case 'POST':
                if (path === 'create') {
                    return await createPaymentRequest(event, headers);
                } else if (path === 'verify') {
                    return await verifyPayment(event, headers);
                }
                break;
            
            case 'GET':
                if (path === 'status') {
                    return await getPaymentStatus(event, headers);
                } else if (path === 'rates') {
                    return await getCryptoRates(event, headers);
                }
                break;
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('Crypto payment API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};

async function createPaymentRequest(event, headers) {
    const { amount, currency, toAddress, metadata } = JSON.parse(event.body);

    if (!amount || !currency || !toAddress) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing required parameters' })
        };
    }

    const paymentId = uuidv4();
    const paymentRequest = {
        id: paymentId,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        toAddress,
        status: 'pending',
        createdAt: new Date().toISOString(),
        metadata: metadata || {},
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };

    payments.set(paymentId, paymentRequest);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            paymentId,
            paymentRequest: {
                id: paymentId,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency,
                toAddress: paymentRequest.toAddress,
                expiresAt: paymentRequest.expiresAt
            }
        })
    };
}

async function verifyPayment(event, headers) {
    const { paymentId, transactionHash, fromAddress } = JSON.parse(event.body);

    if (!paymentId || !transactionHash) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing payment ID or transaction hash' })
        };
    }

    const payment = payments.get(paymentId);
    if (!payment) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' })
        };
    }

    // In a real implementation, verify the transaction on the blockchain
    const isValid = await mockVerifyTransaction(transactionHash, payment);

    if (isValid) {
        payment.status = 'completed';
        payment.transactionHash = transactionHash;
        payment.fromAddress = fromAddress;
        payment.completedAt = new Date().toISOString();
        payments.set(paymentId, payment);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                payment: {
                    id: payment.id,
                    status: payment.status,
                    transactionHash,
                    completedAt: payment.completedAt
                }
            })
        };
    } else {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Transaction verification failed' })
        };
    }
}

async function getPaymentStatus(event, headers) {
    const paymentId = new URLSearchParams(event.queryStringParameters).get('id');
    
    if (!paymentId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Payment ID required' })
        };
    }

    const payment = payments.get(paymentId);
    if (!payment) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            createdAt: payment.createdAt,
            completedAt: payment.completedAt,
            transactionHash: payment.transactionHash
        })
    };
}

async function getCryptoRates(event, headers) {
    // Mock crypto rates - in production, fetch from a real API like CoinGecko
    const rates = {
        BTC: { usd: 45000, name: 'Bitcoin' },
        ETH: { usd: 3000, name: 'Ethereum' },
        USDT: { usd: 1.0, name: 'Tether' },
        DOGE: { usd: 0.08, name: 'Dogecoin' },
        TON: { usd: 2.5, name: 'The Open Network' }
    };

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(rates)
    };
}

async function mockVerifyTransaction(transactionHash, payment) {
    // Mock verification - in production, connect to actual blockchain networks
    // For Ethereum: use Web3 or Ethers to check transaction
    // For Bitcoin: use BlockCypher API or similar
    
    if (!transactionHash || transactionHash.length < 10) {
        return false;
    }

    // Simulate async verification
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, always return true for properly formatted hashes
    return transactionHash.startsWith('0x') || transactionHash.length >= 40;
}