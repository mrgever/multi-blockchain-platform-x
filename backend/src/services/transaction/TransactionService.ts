import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Cell, beginCell, internal, SendMode } from '@ton/core';
import { sign } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import {
  Blockchain,
  TransactionRequest,
  SignedTransaction,
  DerivedKey,
} from '@shared/types';
import { GAS_LIMITS, USDT_TOKENS } from '@shared/constants';
import { BlockchainServiceFactory } from '../blockchain';
import { WalletService } from '../wallet';

export class TransactionService {
  constructor(
    private blockchainFactory: BlockchainServiceFactory,
    private walletService: WalletService
  ) {}

  async createTransaction(
    request: TransactionRequest,
    privateKey: string
  ): Promise<SignedTransaction> {
    switch (request.blockchain) {
      case Blockchain.ETHEREUM:
        return this.createEthereumTransaction(request, privateKey);
      case Blockchain.BITCOIN:
        return this.createBitcoinTransaction(request, privateKey);
      case Blockchain.TON:
        return this.createTonTransaction(request, privateKey);
      case Blockchain.DOGECOIN:
        return this.createDogecoinTransaction(request, privateKey);
      default:
        throw new Error(`Unsupported blockchain: ${request.blockchain}`);
    }
  }

  private async createEthereumTransaction(
    request: TransactionRequest,
    privateKey: string
  ): Promise<SignedTransaction> {
    const wallet = new ethers.Wallet(privateKey);
    const service = this.blockchainFactory.getService(Blockchain.ETHEREUM);
    
    let txRequest: ethers.TransactionRequest;

    if (request.token && request.token.type === 'ERC20') {
      const erc20Interface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ]);

      const data = erc20Interface.encodeFunctionData('transfer', [
        request.to,
        ethers.parseUnits(request.value, request.token.decimals),
      ]);

      txRequest = {
        to: request.token.address,
        data,
        gasLimit: request.gasLimit || GAS_LIMITS.ERC20_TRANSFER,
      };
    } else {
      txRequest = {
        to: request.to,
        value: ethers.parseEther(request.value),
        data: request.data,
        gasLimit: request.gasLimit || GAS_LIMITS.ETH_TRANSFER,
      };
    }

    if (request.nonce !== undefined) {
      txRequest.nonce = request.nonce;
    }

    if (request.maxFeePerGas && request.maxPriorityFeePerGas) {
      txRequest.type = 2;
      txRequest.maxFeePerGas = ethers.parseUnits(request.maxFeePerGas, 'gwei');
      txRequest.maxPriorityFeePerGas = ethers.parseUnits(request.maxPriorityFeePerGas, 'gwei');
    } else if (request.gasPrice) {
      txRequest.gasPrice = ethers.parseUnits(request.gasPrice, 'gwei');
    }

    const signedTx = await wallet.signTransaction(txRequest);
    const parsedTx = ethers.Transaction.from(signedTx);

    return {
      blockchain: Blockchain.ETHEREUM,
      rawTransaction: signedTx,
      hash: parsedTx.hash!,
    };
  }

  private async createBitcoinTransaction(
    request: TransactionRequest,
    privateKey: string
  ): Promise<SignedTransaction> {
    const service = this.blockchainFactory.getService(Blockchain.BITCOIN);
    const network = bitcoin.networks.bitcoin;
    
    const keyPair = bitcoin.ECPair.fromPrivateKey(
      Buffer.from(privateKey, 'hex'),
      { network }
    );

    const psbt = new bitcoin.Psbt({ network });

    const utxos = await this.fetchBitcoinUTXOs(request.from);
    
    let totalInput = 0;
    const amountSatoshis = Math.floor(parseFloat(request.value) * 100000000);
    const fee = parseInt(await service.estimateFee(request));

    for (const utxo of utxos) {
      if (totalInput >= amountSatoshis + fee) break;
      
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: utxo.value,
        },
      });
      
      totalInput += utxo.value;
    }

    psbt.addOutput({
      address: request.to,
      value: amountSatoshis,
    });

    const change = totalInput - amountSatoshis - fee;
    if (change > 0) {
      psbt.addOutput({
        address: request.from,
        value: change,
      });
    }

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const rawTx = tx.toHex();

    return {
      blockchain: Blockchain.BITCOIN,
      rawTransaction: rawTx,
      hash: tx.getId(),
    };
  }

  private async createTonTransaction(
    request: TransactionRequest,
    privateKey: string
  ): Promise<SignedTransaction> {
    const keyPair = {
      publicKey: Buffer.alloc(32),
      secretKey: Buffer.from(privateKey, 'hex'),
    };

    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
    });

    const seqno = 0;

    const transfer = wallet.createTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: request.to,
          value: request.value,
          bounce: false,
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY,
    });

    const cell = beginCell()
      .storeSlice(transfer.beginParse())
      .endCell();

    return {
      blockchain: Blockchain.TON,
      rawTransaction: cell.toBoc().toString('base64'),
      hash: cell.hash().toString('hex'),
    };
  }

  private async createDogecoinTransaction(
    request: TransactionRequest,
    privateKey: string
  ): Promise<SignedTransaction> {
    const dogecoinNetwork = {
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

    const keyPair = bitcoin.ECPair.fromPrivateKey(
      Buffer.from(privateKey, 'hex'),
      { network: dogecoinNetwork as any }
    );

    const psbt = new bitcoin.Psbt({ network: dogecoinNetwork as any });

    const utxos = await this.fetchDogecoinUTXOs(request.from);
    
    let totalInput = 0;
    const amountSatoshis = Math.floor(parseFloat(request.value) * 100000000);
    const fee = 100000;

    for (const utxo of utxos) {
      if (totalInput >= amountSatoshis + fee) break;
      
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(utxo.hex, 'hex'),
      });
      
      totalInput += utxo.value;
    }

    psbt.addOutput({
      address: request.to,
      value: amountSatoshis,
    });

    const change = totalInput - amountSatoshis - fee;
    if (change > 0) {
      psbt.addOutput({
        address: request.from,
        value: change,
      });
    }

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const rawTx = tx.toHex();

    return {
      blockchain: Blockchain.DOGECOIN,
      rawTransaction: rawTx,
      hash: tx.getId(),
    };
  }

  private async fetchBitcoinUTXOs(address: string): Promise<any[]> {
    return [];
  }

  private async fetchDogecoinUTXOs(address: string): Promise<any[]> {
    return [];
  }

  async signTransactionWithMnemonic(
    request: TransactionRequest,
    mnemonic: string,
    addressIndex: number
  ): Promise<SignedTransaction> {
    const derivedKey = await this.walletService.derivePrivateKey(
      mnemonic,
      request.blockchain,
      addressIndex
    );

    return this.createTransaction(request, derivedKey.privateKey);
  }

  validateTransaction(request: TransactionRequest): string[] {
    const errors: string[] = [];

    const service = this.blockchainFactory.getService(request.blockchain);
    
    if (!service.validateAddress(request.from)) {
      errors.push('Invalid from address');
    }

    if (!service.validateAddress(request.to)) {
      errors.push('Invalid to address');
    }

    const value = parseFloat(request.value);
    if (isNaN(value) || value <= 0) {
      errors.push('Invalid transaction value');
    }

    if (request.token && request.token.blockchain !== request.blockchain) {
      errors.push('Token blockchain mismatch');
    }

    return errors;
  }

  async estimateTransactionFee(request: TransactionRequest): Promise<string> {
    const service = this.blockchainFactory.getService(request.blockchain);
    return service.estimateFee(request);
  }

  async broadcastTransaction(signedTx: SignedTransaction): Promise<string> {
    const service = this.blockchainFactory.getService(signedTx.blockchain);
    return service.broadcastTransaction(signedTx);
  }
}