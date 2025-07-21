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
exports.DogecoinService = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const axios_1 = __importDefault(require("axios"));
const types_1 = require("@shared/types");
const constants_1 = require("@shared/constants");
class DogecoinService {
    blockchain = types_1.Blockchain.DOGECOIN;
    config = constants_1.BLOCKCHAIN_CONFIGS[types_1.Blockchain.DOGECOIN];
    apiUrl = 'https://dogechain.info/api/v1';
    network = {
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
    async getBalance(address) {
        const response = await axios_1.default.get(`${this.apiUrl}/address/balance/${address}`);
        const data = response.data;
        const balance = parseFloat(data.balance) * 100000000;
        return {
            blockchain: this.blockchain,
            address,
            balance: Math.floor(balance).toString(),
            formattedBalance: data.balance,
        };
    }
    async getTransaction(hash) {
        try {
            const response = await axios_1.default.get(`${this.apiUrl}/transaction/${hash}`);
            const tx = response.data.transaction;
            const from = tx.inputs[0]?.address || '';
            const to = tx.outputs[0]?.address || '';
            const value = tx.outputs.reduce((sum, out) => sum + parseFloat(out.value), 0);
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
                ? `${this.apiUrl}/block/${numberOrHash}`
                : `${this.apiUrl}/block/${numberOrHash}`;
            const response = await axios_1.default.get(endpoint);
            const block = response.data.block;
            return {
                blockchain: this.blockchain,
                number: block.height,
                hash: block.hash,
                parentHash: block.previousblockhash,
                timestamp: block.time,
                transactionCount: block.tx.length,
            };
        }
        catch (error) {
            return null;
        }
    }
    async getLatestBlock() {
        const response = await axios_1.default.get(`${this.apiUrl}/chain`);
        const height = response.data.blocks;
        const block = await this.getBlock(height);
        if (!block)
            throw new Error('Failed to fetch latest block');
        return block;
    }
    async getTransactionHistory(address, limit = 100) {
        const response = await axios_1.default.get(`${this.apiUrl}/address/transactions/${address}`, { params: { limit } });
        const transactions = [];
        for (const tx of response.data.transactions || []) {
            const transaction = await this.getTransaction(tx);
            if (transaction)
                transactions.push(transaction);
        }
        return transactions;
    }
    async estimateFee(request) {
        const feePerKb = 100000;
        const estimatedSize = 250;
        const fee = Math.ceil((feePerKb * estimatedSize) / 1000);
        return fee.toString();
    }
    async broadcastTransaction(signedTx) {
        const response = await axios_1.default.post(`${this.apiUrl}/pushtx`, { tx: signedTx.rawTransaction });
        return response.data.tx_hash;
    }
    validateAddress(address) {
        try {
            const decoded = bitcoin.address.fromBase58Check(address);
            return decoded.version === this.network.pubKeyHash ||
                decoded.version === this.network.scriptHash;
        }
        catch {
            return false;
        }
    }
    generateAddress(publicKey) {
        const pubKey = typeof publicKey === 'string'
            ? Buffer.from(publicKey, 'hex')
            : publicKey;
        const { address } = bitcoin.payments.p2pkh({
            pubkey: pubKey,
            network: this.network,
        });
        if (!address)
            throw new Error('Failed to generate address');
        return address;
    }
    subscribeToAddress(address, callback) {
        console.warn('Dogecoin address subscription not implemented in this version');
    }
    unsubscribeFromAddress(address) {
        console.warn('Dogecoin address unsubscription not implemented in this version');
    }
    subscribeToBlocks(callback) {
        console.warn('Dogecoin block subscription not implemented in this version');
    }
    unsubscribeFromBlocks() {
        console.warn('Dogecoin block unsubscription not implemented in this version');
    }
}
exports.DogecoinService = DogecoinService;
//# sourceMappingURL=DogecoinService.js.map