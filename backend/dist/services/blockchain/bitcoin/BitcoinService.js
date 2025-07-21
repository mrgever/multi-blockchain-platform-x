"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinService = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const axios_1 = __importDefault(require("axios"));
const types_1 = require("@shared/types");
const constants_1 = require("@shared/constants");
class BitcoinService {
    blockchain = types_1.Blockchain.BITCOIN;
    config = constants_1.BLOCKCHAIN_CONFIGS[types_1.Blockchain.BITCOIN];
    apiUrl;
    network = bitcoin.networks.bitcoin;
    constructor(apiUrl) {
        this.apiUrl = apiUrl || this.config.rpcUrls[1];
    }
    async getBalance(address) {
        const response = await axios_1.default.get(`${this.apiUrl}/address/${address}`);
        const data = response.data;
        const satoshis = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        return {
            blockchain: this.blockchain,
            address,
            balance: satoshis.toString(),
            formattedBalance: (satoshis / 100000000).toFixed(8),
        };
    }
    async getTransaction(hash) {
        try {
            const response = await axios_1.default.get(`${this.apiUrl}/tx/${hash}`);
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
                    ? types_1.TransactionStatus.CONFIRMED
                    : types_1.TransactionStatus.PENDING,
                rawData: tx,
            };
        }
        catch (error) {
            return null;
        }
    }
    async getBlock(numberOrHash) {
        try {
            const endpoint = typeof numberOrHash === 'number'
                ? `${this.apiUrl}/block-height/${numberOrHash}`
                : `${this.apiUrl}/block/${numberOrHash}`;
            const response = await axios_1.default.get(endpoint);
            const blockHash = typeof numberOrHash === 'number' ? response.data : numberOrHash;
            const blockResponse = await axios_1.default.get(`${this.apiUrl}/block/${blockHash}`);
            const block = blockResponse.data;
            return {
                blockchain: this.blockchain,
                number: block.height,
                hash: block.id,
                parentHash: block.previousblockhash,
                timestamp: block.timestamp,
                transactionCount: block.tx_count,
            };
        }
        catch (error) {
            return null;
        }
    }
    async getLatestBlock() {
        const response = await axios_1.default.get(`${this.apiUrl}/blocks/tip/height`);
        const height = response.data;
        const block = await this.getBlock(height);
        if (!block)
            throw new Error('Failed to fetch latest block');
        return block;
    }
    async getTransactionHistory(address, limit = 100) {
        const response = await axios_1.default.get(`${this.apiUrl}/address/${address}/txs`);
        const txids = response.data.slice(0, limit);
        const transactions = [];
        for (const txid of txids) {
            const tx = await this.getTransaction(txid.txid);
            if (tx)
                transactions.push(tx);
        }
        return transactions;
    }
    async estimateFee(request) {
        const response = await axios_1.default.get(`${this.apiUrl}/fee-estimates`);
        const feeRate = response.data['6'];
        const estimatedSize = 250;
        const fee = Math.ceil(feeRate * estimatedSize);
        return fee.toString();
    }
    async broadcastTransaction(signedTx) {
        const response = await axios_1.default.post(`${this.apiUrl}/tx`, signedTx.rawTransaction, {
            headers: { 'Content-Type': 'text/plain' },
        });
        return response.data;
    }
    validateAddress(address) {
        try {
            bitcoin.address.toOutputScript(address, this.network);
            return true;
        }
        catch {
            return false;
        }
    }
    generateAddress(publicKey) {
        const pubKey = typeof publicKey === 'string'
            ? Buffer.from(publicKey, 'hex')
            : publicKey;
        const { address } = bitcoin.payments.p2wpkh({
            pubkey: pubKey,
            network: this.network,
        });
        if (!address)
            throw new Error('Failed to generate address');
        return address;
    }
    subscribeToAddress(address, callback) {
        console.warn('Bitcoin address subscription not implemented in this version');
    }
    unsubscribeFromAddress(address) {
        console.warn('Bitcoin address unsubscription not implemented in this version');
    }
    subscribeToBlocks(callback) {
        console.warn('Bitcoin block subscription not implemented in this version');
    }
    unsubscribeFromBlocks() {
        console.warn('Bitcoin block unsubscription not implemented in this version');
    }
}
exports.BitcoinService = BitcoinService;
//# sourceMappingURL=BitcoinService.js.map