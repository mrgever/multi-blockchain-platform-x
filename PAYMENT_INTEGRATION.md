# NEXUS Payment Integration Guide

## Overview

The NEXUS Multi-Blockchain Platform now supports both cryptocurrency wallet payments and traditional Stripe credit card payments across all payment points in the application.

## Features Implemented

### 🎯 Payment Methods Supported
- **Cryptocurrency Wallets**:
  - MetaMask (Ethereum, USDT, MATIC)
  - WalletConnect (Multi-chain support)
  - Phantom Wallet (Solana)
  - Coinbase Wallet
  - Trust Wallet
  - Generated internal wallets

- **Traditional Payments**:
  - Credit/Debit cards via Stripe
  - Support for all major card networks

### 💰 Payment Integration Points

#### 1. Credit Purchase System
- **Location**: Credit store modal (all pricing tiers)
- **Payment Options**: Both wallet and Stripe payments
- **Amounts**: $4.99, $9.99, $19.99, $39.99
- **Features**: Real-time payment processing, transaction logging

#### 2. Premium Features Purchase  
- **Location**: Premium features section
- **Payment Options**: 
  - NUSD (platform token)
  - External wallet payments
  - Stripe credit card payments
- **Features**: AI Assistant, Premium Analytics, Price Alerts, Pro Charts

#### 3. NUSD Token Swapping
- **Location**: NUSD trading interface
- **Payment Options**:
  - Real cryptocurrency wallet transactions
  - Demo mode for testing
- **Supported Tokens**: BTC, ETH, USDT, DOGE, TON

## Technical Implementation

### Core Components

#### 1. PaymentManager (`js/payment-manager.js`)
```javascript
// Initialize payment processing
const paymentManager = new PaymentManager();

// Process payment
const result = await paymentManager.processPayment({
    method: 'wallet', // or 'stripe'
    amount: 19.99,
    currency: 'USD', // or 'ETH', 'BTC', etc.
    metadata: { /* additional data */ }
});
```

#### 2. WalletConnector (`js/wallet-connector.js`)
```javascript
// Connect external wallet
const connector = new WalletConnector();
await connector.connectWallet('metamask');

// Get available wallets for payment
const availableWallets = connector.getAvailableWalletsForPayment('ETH');
```

#### 3. Payment Interfaces
- Unified payment UI with wallet and card options
- Real-time wallet detection
- Payment method selection modals
- Transaction status tracking

### Backend Functions

#### 1. Stripe Payment Handler (`netlify/functions/stripe-payment.js`)
- Creates payment intents
- Processes card payments
- Handles webhooks
- CORS-enabled

#### 2. Crypto Payment Handler (`netlify/functions/crypto-payment.js`)
- Payment request creation
- Transaction verification
- Status tracking
- Crypto rate fetching

## Setup Instructions

### 1. Environment Configuration

Create `.env` file in root directory:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key

# Crypto Payment Addresses (Replace with your addresses)
CRYPTO_PAYMENT_ADDRESS_ETH=0x8ba1f109551bD432803012645Hac136c54c74c1a
CRYPTO_PAYMENT_ADDRESS_USDT=0x8ba1f109551bD432803012645Hac136c54c74c1a
CRYPTO_PAYMENT_ADDRESS_BTC=bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq
CRYPTO_PAYMENT_ADDRESS_DOGE=DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L

# API Configuration
WEBHOOK_SECRET=your_webhook_secret_here
```

### 2. Dependencies Installation

```bash
cd multi-blockchain-platform
npm install
```

### 3. Stripe Configuration

1. **Get Stripe Keys**:
   - Sign up at [Stripe Dashboard](https://dashboard.stripe.com/)
   - Get publishable and secret keys
   - Add to environment variables

2. **Configure Webhooks**:
   - Add webhook endpoint: `https://your-domain.netlify.app/.netlify/functions/stripe-webhook`
   - Listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`

### 4. Crypto Address Setup

1. **Generate Receiving Addresses**:
   - **Bitcoin**: Use a secure Bitcoin wallet to generate bc1 (Bech32) addresses
   - **Ethereum**: Use MetaMask or hardware wallet for 0x addresses  
   - **Dogecoin**: Generate Dogecoin addresses starting with 'D'
   - **USDT**: Use same Ethereum address for ERC-20 USDT

2. **Security Best Practices**:
   - Use hardware wallets for production
   - Never store private keys in code
   - Implement proper key management
   - Use multi-signature wallets for large amounts

## Payment Flow Examples

### Credit Card Payment Flow
```javascript
// 1. User clicks "Purchase Credits"
buyCredits(120, 9.99);

// 2. Payment interface appears with options
// 3. User selects "Pay with Credit Card"
// 4. Stripe Elements form loads
// 5. User enters card details
// 6. Payment processed via Stripe
// 7. Success notification and credit update
```

### Cryptocurrency Payment Flow
```javascript
// 1. User selects "Pay with Wallet"
// 2. Available wallets detected
// 3. User connects MetaMask/other wallet
// 4. Transaction details prepared
// 5. User confirms transaction in wallet
// 6. Transaction broadcast to blockchain
// 7. Payment confirmed and logged
```

## Security Features

### 1. Client-Side Security
- Input validation and sanitization
- Secure local storage encryption
- Transaction amount verification
- Wallet connection security

### 2. Server-Side Security
- Stripe webhook signature verification
- Payment amount validation
- Rate limiting
- CORS protection

### 3. Crypto Security
- Address validation
- Transaction confirmation requirements
- Real-time blockchain verification
- Secure key handling

## Testing

### 1. Stripe Testing
```javascript
// Use Stripe test cards
const testCards = {
    success: '4242424242424242',
    declined: '4000000000000002',
    requiresAuth: '4000002500003155'
};
```

### 2. Crypto Testing
- Test on testnets (Goerli, Sepolia)
- Use small amounts for initial testing
- Verify address generation
- Test wallet connections

### 3. Integration Testing
- Test all payment flows
- Verify error handling
- Check transaction logging
- Validate UI interactions

## Monitoring and Analytics

### Transaction Logging
- All payments logged to localStorage
- Transaction IDs tracked
- Payment method analytics
- Error tracking and reporting

### Stripe Dashboard
- Real-time payment monitoring
- Dispute management
- Revenue analytics
- Customer insights

### Crypto Monitoring
- Blockchain explorer integration
- Address monitoring
- Transaction confirmation tracking
- Balance updates

## Troubleshooting

### Common Issues

#### 1. Stripe Errors
```javascript
// Card declined
error.code === 'card_declined'

// Insufficient funds
error.code === 'insufficient_funds' 

// Authentication required
error.code === 'authentication_required'
```

#### 2. Wallet Connection Issues
```javascript
// MetaMask not installed
if (!window.ethereum) {
    throw new Error('MetaMask not detected');
}

// User rejected connection
if (error.code === 4001) {
    throw new Error('User rejected connection');
}
```

#### 3. Crypto Payment Issues
- **Gas fees too low**: Increase gas price
- **Network congestion**: Wait and retry
- **Insufficient balance**: Check wallet balance
- **Wrong network**: Switch to correct blockchain

## Production Deployment

### Checklist
- [ ] Update payment addresses to production addresses
- [ ] Configure production Stripe keys
- [ ] Set up webhook endpoints
- [ ] Enable SSL/HTTPS
- [ ] Configure environment variables
- [ ] Test all payment flows
- [ ] Monitor initial transactions

### Security Audit
- Code review for vulnerabilities
- Test payment integrations thoroughly  
- Verify key management practices
- Check access controls
- Validate input sanitization

## Support and Maintenance

### Regular Tasks
- Monitor transaction success rates
- Update crypto addresses if needed
- Maintain Stripe integration
- Update wallet connector libraries
- Security patches and updates

### Emergency Procedures
- Disable payments if issues detected
- Contact Stripe support for card issues
- Monitor blockchain networks for issues
- Have backup payment addresses ready

## Future Enhancements

### Planned Features
- Multi-signature wallet support
- Hardware wallet integration
- Lightning Network (Bitcoin)
- Layer 2 solutions (Polygon, Arbitrum)
- Additional cryptocurrencies
- Recurring payment subscriptions

### Integration Ideas
- Payment request QR codes
- Mobile wallet deep linking
- Cross-chain swaps
- DeFi protocol integration
- NFT payments
- Stablecoin auto-conversion

---

For technical support or questions about the payment integration, please refer to the code comments or create an issue in the project repository.