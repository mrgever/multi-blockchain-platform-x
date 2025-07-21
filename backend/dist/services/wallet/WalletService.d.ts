import { Blockchain, Address, DerivedKey, HDNode } from '@shared/types';
export declare class WalletService {
    generateMnemonic(): string;
    validateMnemonic(mnemonic: string): boolean;
    mnemonicToSeed(mnemonic: string): Promise<Buffer>;
    createHDNode(mnemonic: string): Promise<HDNode>;
    deriveAddresses(mnemonic: string, blockchain: Blockchain, count?: number): Promise<Address[]>;
    private deriveEthereumAddresses;
    private deriveBitcoinAddresses;
    private deriveTonAddresses;
    private deriveDogecoinAddresses;
    derivePrivateKey(mnemonic: string, blockchain: Blockchain, index: number): Promise<DerivedKey>;
    private deriveEthereumPrivateKey;
    private deriveBitcoinPrivateKey;
    private deriveTonPrivateKey;
    private deriveDogecoinPrivateKey;
    encryptMnemonic(mnemonic: string, password: string): string;
    decryptMnemonic(encryptedData: string, password: string): string;
}
//# sourceMappingURL=WalletService.d.ts.map