import { Blockchain, Transaction, Block, Balance, TransactionRequest, SignedTransaction } from '@shared/types';
export interface BlockchainService {
    blockchain: Blockchain;
    getBalance(address: string): Promise<Balance>;
    getTransaction(hash: string): Promise<Transaction | null>;
    getBlock(numberOrHash: string | number): Promise<Block | null>;
    getLatestBlock(): Promise<Block>;
    getTransactionHistory(address: string, limit?: number): Promise<Transaction[]>;
    estimateFee(request: TransactionRequest): Promise<string>;
    broadcastTransaction(signedTx: SignedTransaction): Promise<string>;
    validateAddress(address: string): boolean;
    generateAddress(publicKey: string | Buffer): string;
    subscribeToAddress(address: string, callback: (tx: Transaction) => void): void;
    unsubscribeFromAddress(address: string): void;
    subscribeToBlocks(callback: (block: Block) => void): void;
    unsubscribeFromBlocks(): void;
}
export interface BlockchainServiceFactory {
    createService(blockchain: Blockchain): BlockchainService;
}
export interface NodeConnection {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    call<T = any>(method: string, params: any[]): Promise<T>;
}
//# sourceMappingURL=interfaces.d.ts.map