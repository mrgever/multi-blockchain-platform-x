import { Blockchain } from '@shared/types';
import { BlockchainService, BlockchainServiceFactory as IBlockchainServiceFactory } from './interfaces';
export declare class BlockchainServiceFactory implements IBlockchainServiceFactory {
    private services;
    private rpcUrls;
    constructor(rpcUrls?: Partial<Record<Blockchain, string>>);
    createService(blockchain: Blockchain): BlockchainService;
    getService(blockchain: Blockchain): BlockchainService;
    getAllServices(): BlockchainService[];
}
//# sourceMappingURL=BlockchainServiceFactory.d.ts.map