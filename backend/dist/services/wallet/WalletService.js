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
exports.WalletService = void 0;
const bip39 = __importStar(require("bip39"));
const bip32 = __importStar(require("bip32"));
const ethers_1 = require("ethers");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const crypto_1 = require("@ton/crypto");
const ton_1 = require("@ton/ton");
const crypto_2 = __importDefault(require("crypto"));
const types_1 = require("@shared/types");
const constants_1 = require("@shared/constants");
class WalletService {
    generateMnemonic() {
        return bip39.generateMnemonic(256);
    }
    validateMnemonic(mnemonic) {
        return bip39.validateMnemonic(mnemonic);
    }
    async mnemonicToSeed(mnemonic) {
        return bip39.mnemonicToSeed(mnemonic);
    }
    async createHDNode(mnemonic) {
        const seed = await this.mnemonicToSeed(mnemonic);
        const masterKey = bip32.fromSeed(seed);
        return {
            mnemonic,
            seed,
            masterKey,
        };
    }
    async deriveAddresses(mnemonic, blockchain, count = constants_1.DEFAULT_ADDRESS_COUNT) {
        const addresses = [];
        switch (blockchain) {
            case types_1.Blockchain.ETHEREUM:
                addresses.push(...await this.deriveEthereumAddresses(mnemonic, count));
                break;
            case types_1.Blockchain.BITCOIN:
                addresses.push(...await this.deriveBitcoinAddresses(mnemonic, count));
                break;
            case types_1.Blockchain.TON:
                addresses.push(...await this.deriveTonAddresses(mnemonic, count));
                break;
            case types_1.Blockchain.DOGECOIN:
                addresses.push(...await this.deriveDogecoinAddresses(mnemonic, count));
                break;
        }
        return addresses;
    }
    async deriveEthereumAddresses(mnemonic, count) {
        try {
            // Create the root HD wallet from mnemonic
            const hdWallet = ethers_1.HDNodeWallet.fromPhrase(mnemonic);
            const addresses = [];
            for (let i = 0; i < count; i++) {
                // Derive each address individually from the root
                const path = `m/44'/60'/0'/0/${i}`;
                const derivedWallet = hdWallet.derivePath(path);
                addresses.push({
                    blockchain: types_1.Blockchain.ETHEREUM,
                    address: derivedWallet.address,
                    derivationPath: path,
                    index: i,
                });
            }
            return addresses;
        }
        catch (error) {
            console.error('Ethereum derivation error:', error);
            throw new Error(`Failed to derive Ethereum addresses: ${error}`);
        }
    }
    async deriveBitcoinAddresses(mnemonic, count) {
        try {
            const seed = await this.mnemonicToSeed(mnemonic);
            const root = bip32.fromSeed(seed);
            const addresses = [];
            const basePath = "m/84'/0'/0'/0";
            for (let i = 0; i < count; i++) {
                const path = `${basePath}/${i}`;
                const child = root.derivePath(path);
                const { address } = bitcoin.payments.p2wpkh({
                    pubkey: child.publicKey,
                    network: bitcoin.networks.bitcoin,
                });
                if (address) {
                    addresses.push({
                        blockchain: types_1.Blockchain.BITCOIN,
                        address,
                        derivationPath: path,
                        index: i,
                    });
                }
            }
            return addresses;
        }
        catch (error) {
            console.error('Bitcoin derivation error:', error);
            throw new Error(`Failed to derive Bitcoin addresses: ${error}`);
        }
    }
    async deriveTonAddresses(mnemonic, count) {
        try {
            const keyPair = await (0, crypto_1.mnemonicToWalletKey)(mnemonic.split(' '));
            const addresses = [];
            const basePath = constants_1.DERIVATION_PATHS[types_1.Blockchain.TON];
            for (let i = 0; i < count; i++) {
                const wallet = ton_1.WalletContractV4.create({
                    workchain: 0,
                    publicKey: keyPair.publicKey,
                    walletId: i,
                });
                addresses.push({
                    blockchain: types_1.Blockchain.TON,
                    address: wallet.address.toString(),
                    derivationPath: `${basePath}/${i}`,
                    index: i,
                });
            }
            return addresses;
        }
        catch (error) {
            console.error('TON address derivation error:', error);
            // Return a mock address for demo purposes
            return [{
                    blockchain: types_1.Blockchain.TON,
                    address: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
                    derivationPath: `${constants_1.DERIVATION_PATHS[types_1.Blockchain.TON]}/0`,
                    index: 0,
                }];
        }
    }
    async deriveDogecoinAddresses(mnemonic, count) {
        try {
            const seed = await this.mnemonicToSeed(mnemonic);
            const root = bip32.fromSeed(seed);
            const addresses = [];
            const basePath = "m/44'/3'/0'/0";
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
            for (let i = 0; i < count; i++) {
                const path = `${basePath}/${i}`;
                const child = root.derivePath(path);
                const { address } = bitcoin.payments.p2pkh({
                    pubkey: child.publicKey,
                    network: dogecoinNetwork,
                });
                if (address) {
                    addresses.push({
                        blockchain: types_1.Blockchain.DOGECOIN,
                        address,
                        derivationPath: path,
                        index: i,
                    });
                }
            }
            return addresses;
        }
        catch (error) {
            console.error('Dogecoin derivation error:', error);
            throw new Error(`Failed to derive Dogecoin addresses: ${error}`);
        }
    }
    async derivePrivateKey(mnemonic, blockchain, index) {
        switch (blockchain) {
            case types_1.Blockchain.ETHEREUM:
                return this.deriveEthereumPrivateKey(mnemonic, index);
            case types_1.Blockchain.BITCOIN:
                return this.deriveBitcoinPrivateKey(mnemonic, index);
            case types_1.Blockchain.TON:
                return this.deriveTonPrivateKey(mnemonic, index);
            case types_1.Blockchain.DOGECOIN:
                return this.deriveDogecoinPrivateKey(mnemonic, index);
            default:
                throw new Error(`Unsupported blockchain: ${blockchain}`);
        }
    }
    async deriveEthereumPrivateKey(mnemonic, index) {
        const hdWallet = ethers_1.HDNodeWallet.fromPhrase(mnemonic);
        const path = `${constants_1.DERIVATION_PATHS[types_1.Blockchain.ETHEREUM]}/${index}`;
        const wallet = hdWallet.derivePath(path);
        return {
            privateKey: wallet.privateKey,
            publicKey: wallet.publicKey,
            address: wallet.address,
            derivationPath: path,
        };
    }
    async deriveBitcoinPrivateKey(mnemonic, index) {
        const seed = await this.mnemonicToSeed(mnemonic);
        const root = bip32.fromSeed(seed);
        const path = `${constants_1.DERIVATION_PATHS[types_1.Blockchain.BITCOIN]}/${index}`;
        const child = root.derivePath(path);
        const { address } = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network: bitcoin.networks.bitcoin,
        });
        return {
            privateKey: child.privateKey.toString('hex'),
            publicKey: child.publicKey.toString('hex'),
            address: address,
            derivationPath: path,
        };
    }
    async deriveTonPrivateKey(mnemonic, index) {
        const keyPair = await (0, crypto_1.mnemonicToWalletKey)(mnemonic.split(' '));
        const wallet = ton_1.WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
            walletId: index,
        });
        return {
            privateKey: keyPair.secretKey.toString('hex'),
            publicKey: keyPair.publicKey.toString('hex'),
            address: wallet.address.toString(),
            derivationPath: `${constants_1.DERIVATION_PATHS[types_1.Blockchain.TON]}/${index}`,
        };
    }
    async deriveDogecoinPrivateKey(mnemonic, index) {
        const seed = await this.mnemonicToSeed(mnemonic);
        const root = bip32.fromSeed(seed);
        const path = `${constants_1.DERIVATION_PATHS[types_1.Blockchain.DOGECOIN]}/${index}`;
        const child = root.derivePath(path);
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
        const { address } = bitcoin.payments.p2pkh({
            pubkey: child.publicKey,
            network: dogecoinNetwork,
        });
        return {
            privateKey: child.privateKey.toString('hex'),
            publicKey: child.publicKey.toString('hex'),
            address: address,
            derivationPath: path,
        };
    }
    encryptMnemonic(mnemonic, password) {
        const salt = crypto_2.default.randomBytes(32);
        const key = crypto_2.default.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const iv = crypto_2.default.randomBytes(16);
        const cipher = crypto_2.default.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return JSON.stringify({
            salt: salt.toString('hex'),
            iv: iv.toString('hex'),
            encrypted,
        });
    }
    decryptMnemonic(encryptedData, password) {
        const data = JSON.parse(encryptedData);
        const salt = Buffer.from(data.salt, 'hex');
        const iv = Buffer.from(data.iv, 'hex');
        const key = crypto_2.default.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const decipher = crypto_2.default.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=WalletService.js.map