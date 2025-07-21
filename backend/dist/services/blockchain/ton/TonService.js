"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TonService = void 0;
const ton_1 = require("@ton/ton");
const core_1 = require("@ton/core");
const types_1 = require("@shared/types");
const constants_1 = require("@shared/constants");
class TonService {
    blockchain = types_1.Blockchain.TON;
    client;
    config = constants_1.BLOCKCHAIN_CONFIGS[types_1.Blockchain.TON];
    constructor(rpcUrl) {
        this.client = new ton_1.TonClient({
            endpoint: rpcUrl || this.config.rpcUrls[0],
        });
    }
    async getBalance(address) {
        const addr = ton_1.Address.parse(address);
        const balance = await this.client.getBalance(addr);
        return {
            blockchain: this.blockchain,
            address,
            balance: balance.toString(),
            formattedBalance: (0, ton_1.fromNano)(balance),
        };
    }
    async getTransaction(hash) {
        try {
            const transactions = await this.client.getTransactions(ton_1.Address.parse(hash), { limit: 100 });
            const tx = transactions.find(t => t.hash().toString('hex') === hash);
            if (!tx)
                return null;
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
                formattedValue: (0, ton_1.fromNano)(value),
                fee: tx.totalFees.coins.toString(),
                formattedFee: (0, ton_1.fromNano)(tx.totalFees.coins),
                timestamp: tx.now,
                blockNumber: tx.lt,
                confirmations: 1,
                status: types_1.TransactionStatus.CONFIRMED,
                rawData: tx,
            };
        }
        catch (error) {
            return null;
        }
    }
    async getBlock(numberOrHash) {
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
        }
        catch (error) {
            return null;
        }
    }
    async getLatestBlock() {
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
    async getTransactionHistory(address, limit = 100) {
        const addr = ton_1.Address.parse(address);
        const transactions = await this.client.getTransactions(addr, { limit });
        return Promise.all(transactions.map(async (tx) => {
            const hash = tx.hash().toString('hex');
            const transaction = await this.getTransaction(hash);
            return transaction;
        })).then(txs => txs.filter(tx => tx !== null));
    }
    async estimateFee(request) {
        const fee = (0, ton_1.toNano)('0.05');
        return fee.toString();
    }
    async broadcastTransaction(signedTx) {
        const cell = core_1.Cell.fromBase64(signedTx.rawTransaction);
        await this.client.sendFile(cell.toBoc());
        return signedTx.hash;
    }
    validateAddress(address) {
        try {
            ton_1.Address.parse(address);
            return true;
        }
        catch {
            return false;
        }
    }
    generateAddress(publicKey) {
        throw new Error('TON address generation requires wallet contract deployment');
    }
    subscribeToAddress(address, callback) {
        console.warn('TON address subscription not implemented in this version');
    }
    unsubscribeFromAddress(address) {
        console.warn('TON address unsubscription not implemented in this version');
    }
    subscribeToBlocks(callback) {
        console.warn('TON block subscription not implemented in this version');
    }
    unsubscribeFromBlocks() {
        console.warn('TON block unsubscription not implemented in this version');
    }
}
exports.TonService = TonService;
//# sourceMappingURL=TonService.js.map