export declare enum Blockchain {
    TON = "TON",
    ETHEREUM = "ETHEREUM",
    BITCOIN = "BITCOIN",
    DOGECOIN = "DOGECOIN"
}
export declare enum TokenType {
    NATIVE = "NATIVE",
    ERC20 = "ERC20",
    TRC20 = "TRC20"
}
export interface BlockchainConfig {
    name: string;
    symbol: string;
    decimals: number;
    chainId?: number;
    rpcUrls: string[];
    explorerUrl: string;
    isTestnet: boolean;
}
export interface Token {
    blockchain: Blockchain;
    type: TokenType;
    address?: string;
    symbol: string;
    name: string;
    decimals: number;
}
export interface Address {
    blockchain: Blockchain;
    address: string;
    derivationPath: string;
    index: number;
}
export interface Balance {
    blockchain: Blockchain;
    address: string;
    balance: string;
    formattedBalance: string;
    tokens?: TokenBalance[];
}
export interface TokenBalance {
    token: Token;
    balance: string;
    formattedBalance: string;
}
export interface Transaction {
    id: string;
    blockchain: Blockchain;
    hash: string;
    from: string;
    to: string;
    value: string;
    formattedValue: string;
    fee: string;
    formattedFee: string;
    timestamp: number;
    blockNumber?: number;
    blockHash?: string;
    confirmations: number;
    status: TransactionStatus;
    tokenTransfers?: TokenTransfer[];
    rawData?: any;
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    FAILED = "FAILED"
}
export interface TokenTransfer {
    token: Token;
    from: string;
    to: string;
    value: string;
    formattedValue: string;
}
export interface Block {
    blockchain: Blockchain;
    number: number;
    hash: string;
    parentHash: string;
    timestamp: number;
    miner?: string;
    transactionCount: number;
    transactions?: Transaction[];
}
export interface TransactionRequest {
    blockchain: Blockchain;
    from: string;
    to: string;
    value: string;
    token?: Token;
    data?: string;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    nonce?: number;
}
export interface SignedTransaction {
    blockchain: Blockchain;
    rawTransaction: string;
    hash: string;
}
//# sourceMappingURL=blockchain.d.ts.map