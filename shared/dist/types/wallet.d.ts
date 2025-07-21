import { Address, Balance } from './blockchain';
export interface Wallet {
    id: string;
    userId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    addresses: Address[];
    encryptedSeed?: string;
}
export interface WalletCreationRequest {
    name: string;
    password: string;
}
export interface WalletImportRequest {
    name: string;
    mnemonic: string;
    password: string;
}
export interface WalletResponse {
    wallet: Wallet;
    mnemonic?: string;
}
export interface HDNode {
    mnemonic: string;
    seed: Buffer;
    masterKey: any;
}
export interface DerivedKey {
    privateKey: string;
    publicKey: string;
    address: string;
    derivationPath: string;
}
export interface WalletBalance {
    walletId: string;
    totalUsdValue: number;
    balances: Balance[];
    lastUpdated: Date;
}
//# sourceMappingURL=wallet.d.ts.map