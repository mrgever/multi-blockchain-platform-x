import { Blockchain, BlockchainConfig, Token, TokenType } from '../types';

export const BLOCKCHAIN_CONFIGS: Record<Blockchain, BlockchainConfig> = {
  [Blockchain.TON]: {
    name: 'The Open Network',
    symbol: 'TON',
    decimals: 9,
    rpcUrls: [
      'https://toncenter.com/api/v2/jsonRPC',
      'https://ton-api.tonwhales.com/jsonRPC',
    ],
    explorerUrl: 'https://tonscan.org',
    isTestnet: false,
  },
  [Blockchain.ETHEREUM]: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    chainId: 1,
    rpcUrls: [
      'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
    ],
    explorerUrl: 'https://etherscan.io',
    isTestnet: false,
  },
  [Blockchain.BITCOIN]: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    rpcUrls: [
      'https://bitcoin.publicnode.com',
      'https://blockstream.info/api',
    ],
    explorerUrl: 'https://blockstream.info',
    isTestnet: false,
  },
  [Blockchain.DOGECOIN]: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    decimals: 8,
    rpcUrls: [
      'https://dogecoin.publicnode.com',
    ],
    explorerUrl: 'https://dogechain.info',
    isTestnet: false,
  },
};

export const TESTNET_CONFIGS: Partial<Record<Blockchain, BlockchainConfig>> = {
  [Blockchain.TON]: {
    name: 'TON Testnet',
    symbol: 'TON',
    decimals: 9,
    rpcUrls: [
      'https://testnet.toncenter.com/api/v2/jsonRPC',
    ],
    explorerUrl: 'https://testnet.tonscan.org',
    isTestnet: true,
  },
  [Blockchain.ETHEREUM]: {
    name: 'Sepolia',
    symbol: 'ETH',
    decimals: 18,
    chainId: 11155111,
    rpcUrls: [
      'https://sepolia.publicnode.com',
      'https://rpc.ankr.com/eth_sepolia',
    ],
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
  [Blockchain.BITCOIN]: {
    name: 'Bitcoin Testnet',
    symbol: 'tBTC',
    decimals: 8,
    rpcUrls: [
      'https://testnet.blockstream.info/api',
    ],
    explorerUrl: 'https://testnet.blockstream.info',
    isTestnet: true,
  },
};

export const USDT_TOKENS: Record<string, Token> = {
  ERC20: {
    blockchain: Blockchain.ETHEREUM,
    type: TokenType.ERC20,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
};

export const DERIVATION_PATHS = {
  [Blockchain.BITCOIN]: "m/84'/0'/0'/0",
  [Blockchain.ETHEREUM]: "m/44'/60'/0'/0",
  [Blockchain.TON]: "m/44'/607'/0'/0",
  [Blockchain.DOGECOIN]: "m/44'/3'/0'/0",
};

export const DEFAULT_ADDRESS_COUNT = 5;

export const TRANSACTION_CONFIRMATIONS = {
  [Blockchain.BITCOIN]: 6,
  [Blockchain.ETHEREUM]: 12,
  [Blockchain.TON]: 1,
  [Blockchain.DOGECOIN]: 6,
};

export const GAS_LIMITS = {
  ETH_TRANSFER: '21000',
  ERC20_TRANSFER: '65000',
  CONTRACT_INTERACTION: '100000',
};