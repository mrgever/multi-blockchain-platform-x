import { TransactionRequest, SignedTransaction } from '@shared/types';
import { BlockchainServiceFactory } from '../blockchain';
import { WalletService } from '../wallet';
export declare class TransactionService {
    private blockchainFactory;
    private walletService;
    constructor(blockchainFactory: BlockchainServiceFactory, walletService: WalletService);
    createTransaction(request: TransactionRequest, privateKey: string): Promise<SignedTransaction>;
    private createEthereumTransaction;
    private createBitcoinTransaction;
    private createTonTransaction;
    private createDogecoinTransaction;
    private fetchBitcoinUTXOs;
    private fetchDogecoinUTXOs;
    signTransactionWithMnemonic(request: TransactionRequest, mnemonic: string, addressIndex: number): Promise<SignedTransaction>;
    validateTransaction(request: TransactionRequest): string[];
    estimateTransactionFee(request: TransactionRequest): Promise<string>;
    broadcastTransaction(signedTx: SignedTransaction): Promise<string>;
}
//# sourceMappingURL=TransactionService.d.ts.map