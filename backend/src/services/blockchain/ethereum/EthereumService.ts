import { ethers } from 'ethers';
import {
  Blockchain,
  Transaction,
  Block,
  Balance,
  TransactionRequest,
  SignedTransaction,
  TransactionStatus,
  TokenBalance,
  Token,
} from '@shared/types';
import { BLOCKCHAIN_CONFIGS, USDT_TOKENS } from '@shared/constants';
import { BlockchainService } from '../interfaces';

export class EthereumService implements BlockchainService {
  public blockchain = Blockchain.ETHEREUM;
  private provider: ethers.JsonRpcProvider;
  private config = BLOCKCHAIN_CONFIGS[Blockchain.ETHEREUM];
  private addressSubscriptions = new Map<string, ethers.Listener>();
  private blockSubscription?: ethers.Listener;

  constructor(rpcUrl?: string) {
    this.provider = new ethers.JsonRpcProvider(
      rpcUrl || this.config.rpcUrls[0]
    );
  }

  async getBalance(address: string): Promise<Balance> {
    const balance = await this.provider.getBalance(address);
    const tokenBalances = await this.getTokenBalances(address);

    return {
      blockchain: this.blockchain,
      address,
      balance: balance.toString(),
      formattedBalance: ethers.formatEther(balance),
      tokens: tokenBalances,
    };
  }

  private async getTokenBalances(address: string): Promise<TokenBalance[]> {
    const tokenBalances: TokenBalance[] = [];
    
    const usdtToken = USDT_TOKENS.ERC20;
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
    ];
    
    try {
      const contract = new ethers.Contract(
        usdtToken.address!,
        erc20Abi,
        this.provider
      );
      
      const balance = await contract.balanceOf(address);
      
      tokenBalances.push({
        token: usdtToken,
        balance: balance.toString(),
        formattedBalance: ethers.formatUnits(balance, usdtToken.decimals),
      });
    } catch (error) {
      console.error('Error fetching USDT balance:', error);
    }

    return tokenBalances;
  }

  async getTransaction(hash: string): Promise<Transaction | null> {
    const tx = await this.provider.getTransaction(hash);
    if (!tx) return null;

    const receipt = await this.provider.getTransactionReceipt(hash);
    const block = tx.blockNumber ? await this.provider.getBlock(tx.blockNumber) : null;

    return {
      id: hash,
      blockchain: this.blockchain,
      hash,
      from: tx.from,
      to: tx.to || '',
      value: tx.value.toString(),
      formattedValue: ethers.formatEther(tx.value),
      fee: tx.gasPrice ? (tx.gasPrice * tx.gasLimit).toString() : '0',
      formattedFee: tx.gasPrice ? ethers.formatEther(tx.gasPrice * tx.gasLimit) : '0',
      timestamp: block ? block.timestamp : Date.now() / 1000,
      blockNumber: tx.blockNumber || undefined,
      blockHash: tx.blockHash || undefined,
      confirmations: tx.confirmations || 0,
      status: receipt
        ? receipt.status === 1
          ? TransactionStatus.CONFIRMED
          : TransactionStatus.FAILED
        : TransactionStatus.PENDING,
      rawData: tx,
    };
  }

  async getBlock(numberOrHash: string | number): Promise<Block | null> {
    const block = await this.provider.getBlock(numberOrHash);
    if (!block) return null;

    return {
      blockchain: this.blockchain,
      number: block.number,
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: block.timestamp,
      miner: block.miner,
      transactionCount: block.transactions.length,
    };
  }

  async getLatestBlock(): Promise<Block> {
    const blockNumber = await this.provider.getBlockNumber();
    const block = await this.getBlock(blockNumber);
    if (!block) throw new Error('Failed to fetch latest block');
    return block;
  }

  async getTransactionHistory(address: string, limit = 100): Promise<Transaction[]> {
    const currentBlock = await this.provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - 10000);
    
    const filter = {
      fromBlock: startBlock,
      toBlock: 'latest',
      address: null,
      topics: [null, ethers.zeroPadValue(address, 32)],
    };

    const logs = await this.provider.getLogs(filter);
    const transactions: Transaction[] = [];

    for (const log of logs.slice(0, limit)) {
      const tx = await this.getTransaction(log.transactionHash);
      if (tx) transactions.push(tx);
    }

    return transactions;
  }

  async estimateFee(request: TransactionRequest): Promise<string> {
    const txRequest: ethers.TransactionRequest = {
      from: request.from,
      to: request.to,
      value: ethers.parseEther(request.value),
      data: request.data,
    };

    const gasEstimate = await this.provider.estimateGas(txRequest);
    const feeData = await this.provider.getFeeData();
    
    if (feeData.maxFeePerGas) {
      const fee = gasEstimate * feeData.maxFeePerGas;
      return fee.toString();
    } else if (feeData.gasPrice) {
      const fee = gasEstimate * feeData.gasPrice;
      return fee.toString();
    }

    throw new Error('Unable to estimate fee');
  }

  async broadcastTransaction(signedTx: SignedTransaction): Promise<string> {
    const response = await this.provider.broadcastTransaction(signedTx.rawTransaction);
    return response.hash;
  }

  validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  generateAddress(publicKey: string | Buffer): string {
    const pubKey = typeof publicKey === 'string' ? publicKey : '0x' + publicKey.toString('hex');
    return ethers.computeAddress(pubKey);
  }

  subscribeToAddress(address: string, callback: (tx: Transaction) => void): void {
    const filter = {
      address,
    };

    const listener = async (log: ethers.Log) => {
      const tx = await this.getTransaction(log.transactionHash);
      if (tx) callback(tx);
    };

    this.provider.on(filter, listener);
    this.addressSubscriptions.set(address, listener);
  }

  unsubscribeFromAddress(address: string): void {
    const listener = this.addressSubscriptions.get(address);
    if (listener) {
      this.provider.off({ address }, listener);
      this.addressSubscriptions.delete(address);
    }
  }

  subscribeToBlocks(callback: (block: Block) => void): void {
    const listener = async (blockNumber: number) => {
      const block = await this.getBlock(blockNumber);
      if (block) callback(block);
    };

    this.provider.on('block', listener);
    this.blockSubscription = listener;
  }

  unsubscribeFromBlocks(): void {
    if (this.blockSubscription) {
      this.provider.off('block', this.blockSubscription);
      this.blockSubscription = undefined;
    }
  }
}