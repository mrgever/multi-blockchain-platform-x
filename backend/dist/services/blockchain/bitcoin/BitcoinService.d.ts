import { Blockchain, Transaction, Block, Balance, TransactionRequest, SignedTransaction } from '@shared/types';
import { BlockchainService } from '../interfaces';
export declare class BitcoinService implements BlockchainService {
    blockchain: Blockchain;
    private config;
    private apiUrl;
    private network;
    constructor(apiUrl?: string);
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
//# sourceMappingURL=BitcoinService.d.ts.map