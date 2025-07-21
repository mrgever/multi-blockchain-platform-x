import { TonClient, Address as TonAddress, fromNano, toNano } from '@ton/ton';
import { Cell } from '@ton/core';
import {
  Blockchain,
  Transaction,
  Block,
  Balance,
  TransactionRequest,
  SignedTransaction,
  TransactionStatus,
} from '@shared/types';
import { BLOCKCHAIN_CONFIGS } from '@shared/constants';
import { BlockchainService } from '../interfaces';

export class TonService implements BlockchainService {
  public blockchain = Blockchain.TON;
  private client: TonClient;
  private config = BLOCKCHAIN_CONFIGS[Blockchain.TON];

  constructor(rpcUrl?: string) {
    this.client = new TonClient({
      endpoint: rpcUrl || this.config.rpcUrls[0],
    });
  }

  async getBalance(address: string): Promise<Balance> {
    const addr = TonAddress.parse(address);
    const balance = await this.client.getBalance(addr);

    return {
      blockchain: this.blockchain,
      address,
      balance: balance.toString(),
      formattedBalance: fromNano(balance),
    };
  }

  async getTransaction(hash: string): Promise<Transaction | null> {
    try {
      const transactions = await this.client.getTransactions(
        TonAddress.parse(hash),
        { limit: 100 }
      );

      const tx = transactions.find(t => t.hash().toString('hex') === hash);
      if (!tx) return null;

      const inMsg = tx.inMessage;
      const outMsgs = tx.outMessages;

      const from = inMsg?.info.src?.toString() || '';
      const to = inMsg?.info.dest?.toString() || '';
      const value = inMsg?.info.value?.coins || 0n;

      return {
        id: hash,
        blockchain: this.blockchain,
        hash,
        from,
        to,
        value: value.toString(),
        formattedValue: fromNano(value),
        fee: tx.totalFees.coins.toString(),
        formattedFee: fromNano(tx.totalFees.coins),
        timestamp: tx.now,
        blockNumber: tx.lt,
        confirmations: 1,
        status: TransactionStatus.CONFIRMED,
        rawData: tx,
      };
    } catch (error) {
      return null;
    }
  }

  async getBlock(numberOrHash: string | number): Promise<Block | null> {
    try {
      const masterInfo = await this.client.getMasterchainInfo();
      
      return {
        blockchain: this.blockchain,
        number: masterInfo.last.seqno,
        hash: masterInfo.last.rootHash.toString('hex'),
        parentHash: '',
        timestamp: masterInfo.lastUtime,
        transactionCount: 0,
      };
    } catch (error) {
      return null;
    }
  }

  async getLatestBlock(): Promise<Block> {
    const masterInfo = await this.client.getMasterchainInfo();
    
    return {
      blockchain: this.blockchain,
      number: masterInfo.last.seqno,
      hash: masterInfo.last.rootHash.toString('hex'),
      parentHash: '',
      timestamp: masterInfo.lastUtime,
      transactionCount: 0,
    };
  }

  async getTransactionHistory(address: string, limit = 100): Promise<Transaction[]> {
    const addr = TonAddress.parse(address);
    const transactions = await this.client.getTransactions(addr, { limit });

    return Promise.all(
      transactions.map(async (tx) => {
        const hash = tx.hash().toString('hex');
        const transaction = await this.getTransaction(hash);
        return transaction!;
      })
    ).then(txs => txs.filter(tx => tx !== null));
  }

  async estimateFee(request: TransactionRequest): Promise<string> {
    const fee = toNano('0.05');
    return fee.toString();
  }

  async broadcastTransaction(signedTx: SignedTransaction): Promise<string> {
    const cell = Cell.fromBase64(signedTx.rawTransaction);
    await this.client.sendFile(cell.toBoc());
    
    return signedTx.hash;
  }

  validateAddress(address: string): boolean {
    try {
      TonAddress.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  generateAddress(publicKey: string | Buffer): string {
    throw new Error('TON address generation requires wallet contract deployment');
  }

  subscribeToAddress(address: string, callback: (tx: Transaction) => void): void {
    console.warn('TON address subscription not implemented in this version');
  }

  unsubscribeFromAddress(address: string): void {
    console.warn('TON address unsubscription not implemented in this version');
  }

  subscribeToBlocks(callback: (block: Block) => void): void {
    console.warn('TON block subscription not implemented in this version');
  }

  unsubscribeFromBlocks(): void {
    console.warn('TON block unsubscription not implemented in this version');
  }
}