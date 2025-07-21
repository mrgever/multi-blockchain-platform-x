# Multi-Blockchain Platform

A comprehensive platform for managing cryptocurrencies across TON, Ethereum, Bitcoin, Dogecoin, and USDT (ERC-20).

## Features

### 1. Wallet Management
- HD wallet generation with BIP32/BIP39/BIP44 standards
- Secure mnemonic phrase generation and encryption
- Multi-currency wallet support
- Client-side transaction signing
- Address derivation for all supported blockchains

### 2. Transaction Management
- Send and receive transactions across all chains
- Real-time fee estimation
- Transaction history tracking
- Support for ERC-20 USDT transfers
- Transaction status monitoring

### 3. Blockchain Explorer
- Universal search across all blockchains
- Real-time block monitoring
- Transaction details view
- Address balance and history
- Block explorer functionality

### 4. Security Features
- Client-side key management
- Encrypted storage for sensitive data
- Multi-factor authentication support
- Comprehensive audit logging
- Rate limiting and API security

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js for API
- Prisma ORM with PostgreSQL
- Redis for caching
- WebSocket for real-time updates

### Frontend
- Next.js 14 with TypeScript
- React Query for data fetching
- Tailwind CSS for styling
- Ethers.js and bitcoinjs-lib for blockchain interactions

### Blockchain Integration
- Ethereum: ethers.js
- Bitcoin: bitcoinjs-lib + Blockstream API
- TON: @ton/ton SDK
- Dogecoin: bitcoinjs-lib + Dogechain API
- USDT: ERC-20 integration via ethers.js

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

4. Start PostgreSQL and Redis:
   ```bash
   docker-compose up -d
   ```

5. Run database migrations:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

6. Start development servers:
   ```bash
   npm run dev
   ```

## Project Structure

```
multi-blockchain-platform/
├── backend/              # Backend API service
│   ├── src/
│   │   ├── api/         # API routes
│   │   ├── services/    # Business logic
│   │   ├── models/      # Data models
│   │   └── utils/       # Utilities
│   └── prisma/          # Database schema
├── frontend/            # Next.js frontend
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Next.js pages
│       └── services/    # API clients
└── shared/              # Shared types and constants
    └── src/
        ├── types/       # TypeScript types
        └── constants/   # Shared constants
```

## Security Considerations

- Private keys are never stored on the server
- All sensitive data is encrypted at rest
- HTTPS/TLS for all communications
- Client-side transaction signing
- Regular security audits recommended

## License

This project is proprietary software. All rights reserved.