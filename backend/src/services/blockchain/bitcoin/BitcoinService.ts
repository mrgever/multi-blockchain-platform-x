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

interface BlockstreamTransaction {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  fee: number;
  vin: Array<{
    prevout: {
      scriptpubkey_address: string;
      value: number;
    };
  }>;
  vout: Array<{
    scriptpubkey_address: string;
    value: number;
  }>;
}

export class BitcoinService implements BlockchainService {
  public blockchain = Blockchain.BITCOIN;
  private config = BLOCKCHAIN_CONFIGS[Blockchain.BITCOIN];
  private apiUrl: string;
  private network = bitcoin.networks.bitcoin;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || this.config.rpcUrls[1];
  }

  async getBalance(address: string): Promise<Balance> {
    const response = await axios.get(`${this.apiUrl}/address/${address}`);
    const data = response.data;
    
    const satoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
    
    return {
      blockchain: this.blockchain,
      address,
      balance: satoshis.toString(),
      formattedBalance: (satoshis / 100000000).toFixed(8),
    };
  }

  async getTransaction(hash: string): Promise<Transaction | null> {
    try {
      const response = await axios.get<BlockstreamTransaction>(
        `${this.apiUrl}/tx/${hash}`
      );
      const tx = response.data;

      const from = tx.vin[0]?.prevout?.scriptpubkey_address || '';
      const to = tx.vout[0]?.scriptpubkey_address || '';
      const value = tx.vout.reduce((sum, out) => sum + out.value, 0);

      return {
        id: tx.txid,
        blockchain: this.blockchain,
        hash: tx.txid,
        from,
        to,
        value: value.toString(),
        formattedValue: (value / 100000000).toFixed(8),
        fee: tx.fee.toString(),
        formattedFee: (tx.fee / 100000000).toFixed(8),
        timestamp: tx.status.block_time || Date.now() / 1000,
        blockNumber: tx.status.block_height,
        blockHash: tx.status.block_hash,
        confirmations: tx.status.confirmed ? 6 : 0,
        status: tx.status.confirmed
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
        ? `${this.apiUrl}/block-height/${numberOrHash}`
        : `${this.apiUrl}/block/${numberOrHash}`;
      
      const response = await axios.get(endpoint);
      const blockHash = typeof numberOrHash === 'number' ? response.data : numberOrHash;
      
      const blockResponse = await axios.get(`${this.apiUrl}/block/${blockHash}`);
      const block = blockResponse.data;

      return {
        blockchain: this.blockchain,
        number: block.height,
        hash: block.id,
        parentHash: block.previousblockhash,
        timestamp: block.timestamp,
        transactionCount: block.tx_count,
      };
    } catch (error) {
      return null;
    }
  }

  async getLatestBlock(): Promise<Block> {
    const response = await axios.get(`${this.apiUrl}/blocks/tip/height`);
    const height = response.data;
    
    const block = await this.getBlock(height);
    if (!block) throw new Error('Failed to fetch latest block');
    
    return block;
  }

  async getTransactionHistory(address: string, limit = 100): Promise<Transaction[]> {
    const response = await axios.get(
      `${this.apiUrl}/address/${address}/txs`
    );
    
    const txids = response.data.slice(0, limit);
    const transactions: Transaction[] = [];

    for (const txid of txids) {
      const tx = await this.getTransaction(txid.txid);
      if (tx) transactions.push(tx);
    }

    return transactions;
  }

  async estimateFee(request: TransactionRequest): Promise<string> {
    const response = await axios.get(`${this.apiUrl}/fee-estimates`);
    const feeRate = response.data['6'];
    
    const estimatedSize = 250;
    const fee = Math.ceil(feeRate * estimatedSize);
    
    return fee.toString();
  }

  async broadcastTransaction(signedTx: SignedTransaction): Promise<string> {
    const response = await axios.post(
      `${this.apiUrl}/tx`,
      signedTx.rawTransaction,
      {
        headers: { 'Content-Type': 'text/plain' },
      }
    );
    
    return response.data;
  }

  validateAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch {
      return false;
    }
  }

  generateAddress(publicKey: string | Buffer): string {
    const pubKey = typeof publicKey === 'string' 
      ? Buffer.from(publicKey, 'hex') 
      : publicKey;
    
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: pubKey,
      network: this.network,
    });
    
    if (!address) throw new Error('Failed to generate address');
    return address;
  }

  subscribeToAddress(address: string, callback: (tx: Transaction) => void): void {
    console.warn('Bitcoin address subscription not implemented in this version');
  }

  unsubscribeFromAddress(address: string): void {
    console.warn('Bitcoin address unsubscription not implemented in this version');
  }

  subscribeToBlocks(callback: (block: Block) => void): void {
    console.warn('Bitcoin block subscription not implemented in this version');
  }

  unsubscribeFromBlocks(): void {
    console.warn('Bitcoin block unsubscription not implemented in this version');
  }
}