import { Blockchain, BlockchainConfig, Token } from '../types';
export declare const BLOCKCHAIN_CONFIGS: Record<Blockchain, BlockchainConfig>;
export declare const TESTNET_CONFIGS: Partial<Record<Blockchain, BlockchainConfig>>;
export declare const USDT_TOKENS: Record<string, Token>;
export declare const DERIVATION_PATHS: {
    BITCOIN: string;
    ETHEREUM: string;
    TON: string;
    DOGECOIN: string;
};
export declare const DEFAULT_ADDRESS_COUNT = 5;
export declare const TRANSACTION_CONFIRMATIONS: {
    BITCOIN: number;
    ETHEREUM: number;
    TON: number;
    DOGECOIN: number;
};
export declare const GAS_LIMITS: {
    ETH_TRANSFER: string;
    ERC20_TRANSFER: string;
    CONTRACT_INTERACTION: string;
};
//# sourceMappingURL=blockchain.d.ts.map