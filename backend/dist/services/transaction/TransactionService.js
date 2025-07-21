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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const ethers_1 = require("ethers");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const core_1 = require("@ton/core");
const ton_1 = require("@ton/ton");
const types_1 = require("@shared/types");
const constants_1 = require("@shared/constants");
class TransactionService {
    blockchainFactory;
    walletService;
    constructor(blockchainFactory, walletService) {
        this.blockchainFactory = blockchainFactory;
        this.walletService = walletService;
    }
    async createTransaction(request, privateKey) {
        switch (request.blockchain) {
            case types_1.Blockchain.ETHEREUM:
                return this.createEthereumTransaction(request, privateKey);
            case types_1.Blockchain.BITCOIN:
                return this.createBitcoinTransaction(request, privateKey);
            case types_1.Blockchain.TON:
                return this.createTonTransaction(request, privateKey);
            case types_1.Blockchain.DOGECOIN:
                return this.createDogecoinTransaction(request, privateKey);
            default:
                throw new Error(`Unsupported blockchain: ${request.blockchain}`);
        }
    }
    async createEthereumTransaction(request, privateKey) {
        const wallet = new ethers_1.ethers.Wallet(privateKey);
        const service = this.blockchainFactory.getService(types_1.Blockchain.ETHEREUM);
        let txRequest;
        if (request.token && request.token.type === 'ERC20') {
            const erc20Interface = new ethers_1.ethers.Interface([
                'function transfer(address to, uint256 amount) returns (bool)',
            ]);
            const data = erc20Interface.encodeFunctionData('transfer', [
                request.to,
                ethers_1.ethers.parseUnits(request.value, request.token.decimals),
            ]);
            txRequest = {
                to: request.token.address,
                data,
                gasLimit: request.gasLimit || constants_1.GAS_LIMITS.ERC20_TRANSFER,
            };
        }
        else {
            txRequest = {
                to: request.to,
                value: ethers_1.ethers.parseEther(request.value),
                data: request.data,
                gasLimit: request.gasLimit || constants_1.GAS_LIMITS.ETH_TRANSFER,
            };
        }
        if (request.nonce !== undefined) {
            txRequest.nonce = request.nonce;
        }
        if (request.maxFeePerGas && request.maxPriorityFeePerGas) {
            txRequest.type = 2;
            txRequest.maxFeePerGas = ethers_1.ethers.parseUnits(request.maxFeePerGas, 'gwei');
            txRequest.maxPriorityFeePerGas = ethers_1.ethers.parseUnits(request.maxPriorityFeePerGas, 'gwei');
        }
        else if (request.gasPrice) {
            txRequest.gasPrice = ethers_1.ethers.parseUnits(request.gasPrice, 'gwei');
        }
        const signedTx = await wallet.signTransaction(txRequest);
        const parsedTx = ethers_1.ethers.Transaction.from(signedTx);
        return {
            blockchain: types_1.Blockchain.ETHEREUM,
            rawTransaction: signedTx,
            hash: parsedTx.hash,
        };
    }
    async createBitcoinTransaction(request, privateKey) {
        const service = this.blockchainFactory.getService(types_1.Blockchain.BITCOIN);
        const network = bitcoin.networks.bitcoin;
        const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network });
        const psbt = new bitcoin.Psbt({ network });
        const utxos = await this.fetchBitcoinUTXOs(request.from);
        let totalInput = 0;
        const amountSatoshis = Math.floor(parseFloat(request.value) * 100000000);
        const fee = parseInt(await service.estimateFee(request));
        for (const utxo of utxos) {
            if (totalInput >= amountSatoshis + fee)
                break;
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
            blockchain: types_1.Blockchain.BITCOIN,
            rawTransaction: rawTx,
            hash: tx.getId(),
        };
    }
    async createTonTransaction(request, privateKey) {
        const keyPair = {
            publicKey: Buffer.alloc(32),
            secretKey: Buffer.from(privateKey, 'hex'),
        };
        const wallet = ton_1.WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });
        const seqno = 0;
        const transfer = wallet.createTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            messages: [
                (0, core_1.internal)({
                    to: request.to,
                    value: request.value,
                    bounce: false,
                }),
            ],
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
        });
        const cell = (0, core_1.beginCell)()
            .storeSlice(transfer.beginParse())
            .endCell();
        return {
            blockchain: types_1.Blockchain.TON,
            rawTransaction: cell.toBoc().toString('base64'),
            hash: cell.hash().toString('hex'),
        };
    }
    async createDogecoinTransaction(request, privateKey) {
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
        const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network: dogecoinNetwork });
        const psbt = new bitcoin.Psbt({ network: dogecoinNetwork });
        const utxos = await this.fetchDogecoinUTXOs(request.from);
        let totalInput = 0;
        const amountSatoshis = Math.floor(parseFloat(request.value) * 100000000);
        const fee = 100000;
        for (const utxo of utxos) {
            if (totalInput >= amountSatoshis + fee)
                break;
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
            blockchain: types_1.Blockchain.DOGECOIN,
            rawTransaction: rawTx,
            hash: tx.getId(),
        };
    }
    async fetchBitcoinUTXOs(address) {
        return [];
    }
    async fetchDogecoinUTXOs(address) {
        return [];
    }
    async signTransactionWithMnemonic(request, mnemonic, addressIndex) {
        const derivedKey = await this.walletService.derivePrivateKey(mnemonic, request.blockchain, addressIndex);
        return this.createTransaction(request, derivedKey.privateKey);
    }
    validateTransaction(request) {
        const errors = [];
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
    async estimateTransactionFee(request) {
        const service = this.blockchainFactory.getService(request.blockchain);
        return service.estimateFee(request);
    }
    async broadcastTransaction(signedTx) {
        const service = this.blockchainFactory.getService(signedTx.blockchain);
        return service.broadcastTransaction(signedTx);
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=TransactionService.js.map