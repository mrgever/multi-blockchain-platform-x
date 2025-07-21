"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumService = void 0;
const ethers_1 = require("ethers");
const types_1 = require("@shared/types");
const constants_1 = require("@shared/constants");
class EthereumService {
    blockchain = types_1.Blockchain.ETHEREUM;
    provider;
    config = constants_1.BLOCKCHAIN_CONFIGS[types_1.Blockchain.ETHEREUM];
    addressSubscriptions = new Map();
    blockSubscription;
    constructor(rpcUrl) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl || this.config.rpcUrls[0]);
    }
    async getBalance(address) {
        const balance = await this.provider.getBalance(address);
        const tokenBalances = await this.getTokenBalances(address);
        return {
            blockchain: this.blockchain,
            address,
            balance: balance.toString(),
            formattedBalance: ethers_1.ethers.formatEther(balance),
            tokens: tokenBalances,
        };
    }
    async getTokenBalances(address) {
        const tokenBalances = [];
        const usdtToken = constants_1.USDT_TOKENS.ERC20;
        const erc20Abi = [
            'function balanceOf(address owner) view returns (uint256)',
        ];
        try {
            const contract = new ethers_1.ethers.Contract(usdtToken.address, erc20Abi, this.provider);
            const balance = await contract.balanceOf(address);
            tokenBalances.push({
                token: usdtToken,
                balance: balance.toString(),
                formattedBalance: ethers_1.ethers.formatUnits(balance, usdtToken.decimals),
            });
        }
        catch (error) {
            console.error('Error fetching USDT balance:', error);
        }
        return tokenBalances;
    }
    async getTransaction(hash) {
        const tx = await this.provider.getTransaction(hash);
        if (!tx)
            return null;
        const receipt = await this.provider.getTransactionReceipt(hash);
        const block = tx.blockNumber ? await this.provider.getBlock(tx.blockNumber) : null;
        return {
            id: hash,
            blockchain: this.blockchain,
            hash,
            from: tx.from,
            to: tx.to || '',
            value: tx.value.toString(),
            formattedValue: ethers_1.ethers.formatEther(tx.value),
            fee: tx.gasPrice ? (tx.gasPrice * tx.gasLimit).toString() : '0',
            formattedFee: tx.gasPrice ? ethers_1.ethers.formatEther(tx.gasPrice * tx.gasLimit) : '0',
            timestamp: block ? block.timestamp : Date.now() / 1000,
            blockNumber: tx.blockNumber || undefined,
            blockHash: tx.blockHash || undefined,
            confirmations: tx.confirmations || 0,
            status: receipt
                ? receipt.status === 1
                    ? types_1.TransactionStatus.CONFIRMED
                    : types_1.TransactionStatus.FAILED
                : types_1.TransactionStatus.PENDING,
            rawData: tx,
        };
    }
    async getBlock(numberOrHash) {
        const block = await this.provider.getBlock(numberOrHash);
        if (!block)
            return null;
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
    async getLatestBlock() {
        const blockNumber = await this.provider.getBlockNumber();
        const block = await this.getBlock(blockNumber);
        if (!block)
            throw new Error('Failed to fetch latest block');
        return block;
    }
    async getTransactionHistory(address, limit = 100) {
        const currentBlock = await this.provider.getBlockNumber();
        const startBlock = Math.max(0, currentBlock - 10000);
        const filter = {
            fromBlock: startBlock,
            toBlock: 'latest',
            address: null,
            topics: [null, ethers_1.ethers.zeroPadValue(address, 32)],
        };
        const logs = await this.provider.getLogs(filter);
        const transactions = [];
        for (const log of logs.slice(0, limit)) {
            const tx = await this.getTransaction(log.transactionHash);
            if (tx)
                transactions.push(tx);
        }
        return transactions;
    }
    async estimateFee(request) {
        const txRequest = {
            from: request.from,
            to: request.to,
            value: ethers_1.ethers.parseEther(request.value),
            data: request.data,
        };
        const gasEstimate = await this.provider.estimateGas(txRequest);
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas) {
            const fee = gasEstimate * feeData.maxFeePerGas;
            return fee.toString();
        }
        else if (feeData.gasPrice) {
            const fee = gasEstimate * feeData.gasPrice;
            return fee.toString();
        }
        throw new Error('Unable to estimate fee');
    }
    async broadcastTransaction(signedTx) {
        const response = await this.provider.broadcastTransaction(signedTx.rawTransaction);
        return response.hash;
    }
    validateAddress(address) {
        return ethers_1.ethers.isAddress(address);
    }
    generateAddress(publicKey) {
        const pubKey = typeof publicKey === 'string' ? publicKey : '0x' + publicKey.toString('hex');
        return ethers_1.ethers.computeAddress(pubKey);
    }
    subscribeToAddress(address, callback) {
        const filter = {
            address,
        };
        const listener = async (log) => {
            const tx = await this.getTransaction(log.transactionHash);
            if (tx)
                callback(tx);
        };
        this.provider.on(filter, listener);
        this.addressSubscriptions.set(address, listener);
    }
    unsubscribeFromAddress(address) {
        const listener = this.addressSubscriptions.get(address);
        if (listener) {
            this.provider.off({ address }, listener);
            this.addressSubscriptions.delete(address);
        }
    }
    subscribeToBlocks(callback) {
        const listener = async (blockNumber) => {
            const block = await this.getBlock(blockNumber);
            if (block)
                callback(block);
        };
        this.provider.on('block', listener);
        this.blockSubscription = listener;
    }
    unsubscribeFromBlocks() {
        if (this.blockSubscription) {
            this.provider.off('block', this.blockSubscription);
            this.blockSubscription = undefined;
        }
    }
}
exports.EthereumService = EthereumService;
//# sourceMappingURL=EthereumService.js.map