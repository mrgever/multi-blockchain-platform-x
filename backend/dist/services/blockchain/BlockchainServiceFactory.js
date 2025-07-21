"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainServiceFactory = void 0;
const types_1 = require("@shared/types");
const EthereumService_1 = require("./ethereum/EthereumService");
const BitcoinService_1 = require("./bitcoin/BitcoinService");
const TonService_1 = require("./ton/TonService");
const DogecoinService_1 = require("./dogecoin/DogecoinService");
class BlockchainServiceFactory {
    services = new Map();
    rpcUrls;
    constructor(rpcUrls) {
        this.rpcUrls = rpcUrls || {};
    }
    createService(blockchain) {
        if (this.services.has(blockchain)) {
            return this.services.get(blockchain);
        }
        let service;
        switch (blockchain) {
            case types_1.Blockchain.ETHEREUM:
                service = new EthereumService_1.EthereumService(this.rpcUrls[types_1.Blockchain.ETHEREUM]);
                break;
            case types_1.Blockchain.BITCOIN:
                service = new BitcoinService_1.BitcoinService(this.rpcUrls[types_1.Blockchain.BITCOIN]);
                break;
            case types_1.Blockchain.TON:
                service = new TonService_1.TonService(this.rpcUrls[types_1.Blockchain.TON]);
                break;
            case types_1.Blockchain.DOGECOIN:
                service = new DogecoinService_1.DogecoinService();
                break;
            default:
                throw new Error(`Unsupported blockchain: ${blockchain}`);
        }
        this.services.set(blockchain, service);
        return service;
    }
    getService(blockchain) {
        return this.createService(blockchain);
    }
    getAllServices() {
        return Object.values(types_1.Blockchain).map(blockchain => this.createService(blockchain));
    }
}
exports.BlockchainServiceFactory = BlockchainServiceFactory;
//# sourceMappingURL=BlockchainServiceFactory.js.map