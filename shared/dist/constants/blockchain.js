"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAS_LIMITS = exports.TRANSACTION_CONFIRMATIONS = exports.DEFAULT_ADDRESS_COUNT = exports.DERIVATION_PATHS = exports.USDT_TOKENS = exports.TESTNET_CONFIGS = exports.BLOCKCHAIN_CONFIGS = void 0;
const types_1 = require("../types");
exports.BLOCKCHAIN_CONFIGS = {
    [types_1.Blockchain.TON]: {
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
    [types_1.Blockchain.ETHEREUM]: {
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
    [types_1.Blockchain.BITCOIN]: {
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
    [types_1.Blockchain.DOGECOIN]: {
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
exports.TESTNET_CONFIGS = {
    [types_1.Blockchain.TON]: {
        name: 'TON Testnet',
        symbol: 'TON',
        decimals: 9,
        rpcUrls: [
            'https://testnet.toncenter.com/api/v2/jsonRPC',
        ],
        explorerUrl: 'https://testnet.tonscan.org',
        isTestnet: true,
    },
    [types_1.Blockchain.ETHEREUM]: {
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
    [types_1.Blockchain.BITCOIN]: {
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
exports.USDT_TOKENS = {
    ERC20: {
        blockchain: types_1.Blockchain.ETHEREUM,
        type: types_1.TokenType.ERC20,
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
    },
};
exports.DERIVATION_PATHS = {
    [types_1.Blockchain.BITCOIN]: "m/84'/0'/0'/0",
    [types_1.Blockchain.ETHEREUM]: "m/44'/60'/0'/0",
    [types_1.Blockchain.TON]: "m/44'/607'/0'/0",
    [types_1.Blockchain.DOGECOIN]: "m/44'/3'/0'/0",
};
exports.DEFAULT_ADDRESS_COUNT = 5;
exports.TRANSACTION_CONFIRMATIONS = {
    [types_1.Blockchain.BITCOIN]: 6,
    [types_1.Blockchain.ETHEREUM]: 12,
    [types_1.Blockchain.TON]: 1,
    [types_1.Blockchain.DOGECOIN]: 6,
};
exports.GAS_LIMITS = {
    ETH_TRANSFER: '21000',
    ERC20_TRANSFER: '65000',
    CONTRACT_INTERACTION: '100000',
};
//# sourceMappingURL=blockchain.js.map