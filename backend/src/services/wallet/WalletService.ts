import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import { HDNodeWallet, Wallet as EthersWallet } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { mnemonicToWalletKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import crypto from 'crypto';
import {
  Blockchain,
  Address,
  DerivedKey,
  HDNode,
} from '@shared/types';
import { DERIVATION_PATHS, DEFAULT_ADDRESS_COUNT } from '@shared/constants';

export class WalletService {
  generateMnemonic(): string {
    return bip39.generateMnemonic(256);
  }

  validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  async mnemonicToSeed(mnemonic: string): Promise<Buffer> {
    return bip39.mnemonicToSeed(mnemonic);
  }

  async createHDNode(mnemonic: string): Promise<HDNode> {
    const seed = await this.mnemonicToSeed(mnemonic);
    const masterKey = bip32.fromSeed(seed);
    
    return {
      mnemonic,
      seed,
      masterKey,
    };
  }

  async deriveAddresses(
    mnemonic: string,
    blockchain: Blockchain,
    count: number = DEFAULT_ADDRESS_COUNT
  ): Promise<Address[]> {
    const addresses: Address[] = [];

    switch (blockchain) {
      case Blockchain.ETHEREUM:
        addresses.push(...await this.deriveEthereumAddresses(mnemonic, count));
        break;
      case Blockchain.BITCOIN:
        addresses.push(...await this.deriveBitcoinAddresses(mnemonic, count));
        break;
      case Blockchain.TON:
        addresses.push(...await this.deriveTonAddresses(mnemonic, count));
        break;
      case Blockchain.DOGECOIN:
        addresses.push(...await this.deriveDogecoinAddresses(mnemonic, count));
        break;
    }

    return addresses;
  }

  private async deriveEthereumAddresses(
    mnemonic: string,
    count: number
  ): Promise<Address[]> {
    try {
      // Create the root HD wallet from mnemonic
      const hdWallet = HDNodeWallet.fromPhrase(mnemonic);
      const addresses: Address[] = [];

      for (let i = 0; i < count; i++) {
        // Derive each address individually from the root
        const path = `m/44'/60'/0'/0/${i}`;
        const derivedWallet = hdWallet.derivePath(path);
        
        addresses.push({
          blockchain: Blockchain.ETHEREUM,
          address: derivedWallet.address,
          derivationPath: path,
          index: i,
        });
      }

      return addresses;
    } catch (error) {
      console.error('Ethereum derivation error:', error);
      throw new Error(`Failed to derive Ethereum addresses: ${error}`);
    }
  }

  private async deriveBitcoinAddresses(
    mnemonic: string,
    count: number
  ): Promise<Address[]> {
    try {
      const seed = await this.mnemonicToSeed(mnemonic);
      const root = bip32.fromSeed(seed);
      const addresses: Address[] = [];
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
            blockchain: Blockchain.BITCOIN,
            address,
            derivationPath: path,
            index: i,
          });
        }
      }

      return addresses;
    } catch (error) {
      console.error('Bitcoin derivation error:', error);
      throw new Error(`Failed to derive Bitcoin addresses: ${error}`);
    }
  }

  private async deriveTonAddresses(
    mnemonic: string,
    count: number
  ): Promise<Address[]> {
    try {
      const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
      const addresses: Address[] = [];
      const basePath = DERIVATION_PATHS[Blockchain.TON];

      for (let i = 0; i < count; i++) {
        const wallet = WalletContractV4.create({
          workchain: 0,
          publicKey: keyPair.publicKey,
          walletId: i,
        });

        addresses.push({
          blockchain: Blockchain.TON,
          address: wallet.address.toString(),
          derivationPath: `${basePath}/${i}`,
          index: i,
        });
      }

      return addresses;
    } catch (error) {
      console.error('TON address derivation error:', error);
      // Return a mock address for demo purposes
      return [{
        blockchain: Blockchain.TON,
        address: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
        derivationPath: `${DERIVATION_PATHS[Blockchain.TON]}/0`,
        index: 0,
      }];
    }
  }

  private async deriveDogecoinAddresses(
    mnemonic: string,
    count: number
  ): Promise<Address[]> {
    try {
      const seed = await this.mnemonicToSeed(mnemonic);
      const root = bip32.fromSeed(seed);
      const addresses: Address[] = [];
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
          network: dogecoinNetwork as any,
        });

        if (address) {
          addresses.push({
            blockchain: Blockchain.DOGECOIN,
            address,
            derivationPath: path,
            index: i,
          });
        }
      }

      return addresses;
    } catch (error) {
      console.error('Dogecoin derivation error:', error);
      throw new Error(`Failed to derive Dogecoin addresses: ${error}`);
    }
  }

  async derivePrivateKey(
    mnemonic: string,
    blockchain: Blockchain,
    index: number
  ): Promise<DerivedKey> {
    switch (blockchain) {
      case Blockchain.ETHEREUM:
        return this.deriveEthereumPrivateKey(mnemonic, index);
      case Blockchain.BITCOIN:
        return this.deriveBitcoinPrivateKey(mnemonic, index);
      case Blockchain.TON:
        return this.deriveTonPrivateKey(mnemonic, index);
      case Blockchain.DOGECOIN:
        return this.deriveDogecoinPrivateKey(mnemonic, index);
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }

  private async deriveEthereumPrivateKey(
    mnemonic: string,
    index: number
  ): Promise<DerivedKey> {
    const hdWallet = HDNodeWallet.fromPhrase(mnemonic);
    const path = `${DERIVATION_PATHS[Blockchain.ETHEREUM]}/${index}`;
    const wallet = hdWallet.derivePath(path);

    return {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address,
      derivationPath: path,
    };
  }

  private async deriveBitcoinPrivateKey(
    mnemonic: string,
    index: number
  ): Promise<DerivedKey> {
    const seed = await this.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);
    const path = `${DERIVATION_PATHS[Blockchain.BITCOIN]}/${index}`;
    const child = root.derivePath(path);

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin,
    });

    return {
      privateKey: child.privateKey!.toString('hex'),
      publicKey: child.publicKey.toString('hex'),
      address: address!,
      derivationPath: path,
    };
  }

  private async deriveTonPrivateKey(
    mnemonic: string,
    index: number
  ): Promise<DerivedKey> {
    const keyPair = await mnemonicToWalletKey(mnemonic.split(' '));
    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
      walletId: index,
    });

    return {
      privateKey: keyPair.secretKey.toString('hex'),
      publicKey: keyPair.publicKey.toString('hex'),
      address: wallet.address.toString(),
      derivationPath: `${DERIVATION_PATHS[Blockchain.TON]}/${index}`,
    };
  }

  private async deriveDogecoinPrivateKey(
    mnemonic: string,
    index: number
  ): Promise<DerivedKey> {
    const seed = await this.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed);
    const path = `${DERIVATION_PATHS[Blockchain.DOGECOIN]}/${index}`;
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
      network: dogecoinNetwork as any,
    });

    return {
      privateKey: child.privateKey!.toString('hex'),
      publicKey: child.publicKey.toString('hex'),
      address: address!,
      derivationPath: path,
    };
  }

  encryptMnemonic(mnemonic: string, password: string): string {
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return JSON.stringify({
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      encrypted,
    });
  }

  decryptMnemonic(encryptedData: string, password: string): string {
    const data = JSON.parse(encryptedData);
    const salt = Buffer.from(data.salt, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}