import { Blockchain } from '@shared/types';
import { BlockchainService, BlockchainServiceFactory as IBlockchainServiceFactory } from './interfaces';
import { EthereumService } from './ethereum/EthereumService';
import { BitcoinService } from './bitcoin/BitcoinService';
import { TonService } from './ton/TonService';
import { DogecoinService } from './dogecoin/DogecoinService';

export class BlockchainServiceFactory implements IBlockchainServiceFactory {
  private services = new Map<Blockchain, BlockchainService>();
  private rpcUrls: Partial<Record<Blockchain, string>>;

  constructor(rpcUrls?: Partial<Record<Blockchain, string>>) {
    this.rpcUrls = rpcUrls || {};
  }

  createService(blockchain: Blockchain): BlockchainService {
    if (this.services.has(blockchain)) {
      return this.services.get(blockchain)!;
    }

    let service: BlockchainService;

    switch (blockchain) {
      case Blockchain.ETHEREUM:
        service = new EthereumService(this.rpcUrls[Blockchain.ETHEREUM]);
        break;
      case Blockchain.BITCOIN:
        service = new BitcoinService(this.rpcUrls[Blockchain.BITCOIN]);
        break;
      case Blockchain.TON:
        service = new TonService(this.rpcUrls[Blockchain.TON]);
        break;
      case Blockchain.DOGECOIN:
        service = new DogecoinService();
        break;
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }

    this.services.set(blockchain, service);
    return service;
  }

  getService(blockchain: Blockchain): BlockchainService {
    return this.createService(blockchain);
  }

  getAllServices(): BlockchainService[] {
    return Object.values(Blockchain).map(blockchain => 
      this.createService(blockchain as Blockchain)
    );
  }
}