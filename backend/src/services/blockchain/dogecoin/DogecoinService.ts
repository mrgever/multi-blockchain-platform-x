import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
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

export class DogecoinService implements BlockchainService {
  public blockchain = Blockchain.DOGECOIN;
  private config = BLOCKCHAIN_CONFIGS[Blockchain.DOGECOIN];
  private apiUrl = 'https://dogechain.info/api/v1';
  private network = {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bech32: 'doge',
    bip32: {
      public: 0x02facafd,
      private: 0x02fac398,
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
  };

  async getBalance(address: string): Promise<Balance> {
    const response = await axios.get(`${this.apiUrl}/address/balance/${address}`);
    const data = response.data;
    
    const balance = parseFloat(data.balance) * 100000000;
    
    return {
      blockchain: this.blockchain,
      address,
      balance: Math.floor(balance).toString(),
      formattedBalance: data.balance,
    };
  }

  async getTransaction(hash: string): Promise<Transaction | null> {
    try {
      const response = await axios.get(`${this.apiUrl}/transaction/${hash}`);
      const tx = response.data.transaction;

      const from = tx.inputs[0]?.address || '';
      const to = tx.outputs[0]?.address || '';
      const value = tx.outputs.reduce((sum: number, out: any) => sum + parseFloat(out.value), 0);
      
      return {
        id: tx.hash,
        blockchain: this.blockchain,
        hash: tx.hash,
        from,
        to,
        value: Math.floor(value * 100000000).toString(),
        formattedValue: value.toFixed(8),
        fee: Math.floor(parseFloat(tx.fee) * 100000000).toString(),
        formattedFee: tx.fee,
        timestamp: tx.time,
        blockNumber: tx.block_height,
        blockHash: tx.blockhash,
        confirmations: tx.confirmations || 0,
        status: tx.confirmations > 0
          ? TransactionStatus.CONFIRMED
          : TransactionStatus.PENDING,
        rawData: tx,
      };
    } catch (error) {
      return null;
    }
  }

  async getBlock(numberOrHash: string | number): Promise<Block | null> {
    try {
      const endpoint = typeof numberOrHash === 'number'
        ? `${this.apiUrl}/block/${numberOrHash}`
        : `${this.apiUrl}/block/${numberOrHash}`;
      
      const response = await axios.get(endpoint);
      const block = response.data.block;

      return {
        blockchain: this.blockchain,
        number: block.height,
        hash: block.hash,
        parentHash: block.previousblockhash,
        timestamp: block.time,
        transactionCount: block.tx.length,
      };
    } catch (error) {
      return null;
    }
  }

  async getLatestBlock(): Promise<Block> {
    const response = await axios.get(`${this.apiUrl}/chain`);
    const height = response.data.blocks;
    
    const block = await this.getBlock(height);
    if (!block) throw new Error('Failed to fetch latest block');
    
    return block;
  }

  async getTransactionHistory(address: string, limit = 100): Promise<Transaction[]> {
    const response = await axios.get(
      `${this.apiUrl}/address/transactions/${address}`,
      { params: { limit } }
    );
    
    const transactions: Transaction[] = [];
    
    for (const tx of response.data.transactions || []) {
      const transaction = await this.getTransaction(tx);
      if (transaction) transactions.push(transaction);
    }

    return transactions;
  }

  async estimateFee(request: TransactionRequest): Promise<string> {
    const feePerKb = 100000;
    const estimatedSize = 250;
    const fee = Math.ceil((feePerKb * estimatedSize) / 1000);
    
    return fee.toString();
  }

  async broadcastTransaction(signedTx: SignedTransaction): Promise<string> {
    const response = await axios.post(
      `${this.apiUrl}/pushtx`,
      { tx: signedTx.rawTransaction }
    );
    
    return response.data.tx_hash;
  }

  validateAddress(address: string): boolean {
    try {
      const decoded = bitcoin.address.fromBase58Check(address);
      return decoded.version === this.network.pubKeyHash || 
             decoded.version === this.network.scriptHash;
    } catch {
      return false;
    }
  }

  generateAddress(publicKey: string | Buffer): string {
    const pubKey = typeof publicKey === 'string' 
      ? Buffer.from(publicKey, 'hex') 
      : publicKey;
    
    const { address } = bitcoin.payments.p2pkh({
      pubkey: pubKey,
      network: this.network as any,
    });
    
    if (!address) throw new Error('Failed to generate address');
    return address;
  }

  subscribeToAddress(address: string, callback: (tx: Transaction) => void): void {
    console.warn('Dogecoin address subscription not implemented in this version');
  }

  unsubscribeFromAddress(address: string): void {
    console.warn('Dogecoin address unsubscription not implemented in this version');
  }

  subscribeToBlocks(callback: (block: Block) => void): void {
    console.warn('Dogecoin block subscription not implemented in this version');
  }

  unsubscribeFromBlocks(): void {
    console.warn('Dogecoin block unsubscription not implemented in this version');
  }
}