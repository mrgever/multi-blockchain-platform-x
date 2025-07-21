// NEXUS Wallet Extension - Popup Script
class NexusWallet {
    constructor() {
        this.isUnlocked = false;
        this.currentNetwork = 'ethereum';
        this.wallets = {};
        this.cryptoKeys = {};
        this.balance = 0;
        
        this.init();
    }

    async init() {
        await this.loadWalletState();
        this.setupEventListeners();
        this.setupTabs();
        
        if (this.isUnlocked) {
            this.showWalletScreen();
            await this.loadAssets();
        } else {
            this.showUnlockScreen();
        }
    }

    async loadWalletState() {
        try {
            const result = await chrome.storage.local.get([
                'isUnlocked', 
                'wallets', 
                'currentNetwork', 
                'cryptoKeys',
                'encryptedSeed'
            ]);
            
            this.isUnlocked = result.isUnlocked || false;
            this.wallets = result.wallets || {};
            this.currentNetwork = result.currentNetwork || 'ethereum';
            this.cryptoKeys = result.cryptoKeys || {};
            
            // Update network selector
            document.getElementById('network-select').value = this.currentNetwork;
        } catch (error) {
            console.error('Failed to load wallet state:', error);
        }
    }

    async saveWalletState() {
        try {
            await chrome.storage.local.set({
                isUnlocked: this.isUnlocked,
                wallets: this.wallets,
                currentNetwork: this.currentNetwork,
                cryptoKeys: this.cryptoKeys
            });
        } catch (error) {
            console.error('Failed to save wallet state:', error);
        }
    }

    setupEventListeners() {
        // Unlock form
        document.getElementById('unlock-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUnlock();
        });

        // Wallet creation buttons
        document.getElementById('create-wallet-btn').addEventListener('click', () => {
            this.createNewWallet();
        });

        document.getElementById('import-wallet-btn').addEventListener('click', () => {
            this.showImportWallet();
        });

        // Network selector
        document.getElementById('network-select').addEventListener('change', (e) => {
            this.switchNetwork(e.target.value);
        });

        // Action buttons
        document.getElementById('send-btn').addEventListener('click', () => {
            this.showSendModal();
        });

        document.getElementById('receive-btn').addEventListener('click', () => {
            this.showReceiveModal();
        });

        document.getElementById('swap-btn').addEventListener('click', () => {
            this.showSwapModal();
        });

        document.getElementById('refresh-balance').addEventListener('click', () => {
            this.loadAssets();
        });

        // Crypto tools
        document.getElementById('encrypt-btn').addEventListener('click', () => {
            this.encryptMessage();
        });

        document.getElementById('decrypt-btn').addEventListener('click', () => {
            this.decryptMessage();
        });

        document.getElementById('generate-key-btn').addEventListener('click', () => {
            this.generateCryptoKeys();
        });

        document.getElementById('export-keys-btn').addEventListener('click', () => {
            this.exportKeys();
        });

        document.getElementById('sign-btn').addEventListener('click', () => {
            this.signMessage();
        });

        document.getElementById('verify-btn').addEventListener('click', () => {
            this.verifySignature();
        });

        document.getElementById('toggle-private-key').addEventListener('click', () => {
            this.togglePrivateKeyVisibility();
        });

        // Settings
        document.getElementById('lock-wallet-btn').addEventListener('click', () => {
            this.lockWallet();
        });
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update button states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update content visibility
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                });
                document.getElementById(`${targetTab}-tab`).classList.remove('hidden');
            });
        });
    }

    async handleUnlock() {
        const password = document.getElementById('password-input').value;
        
        if (!password) {
            this.showError('Please enter your password');
            return;
        }

        try {
            // In a real implementation, verify password against encrypted seed
            const isValid = await this.verifyPassword(password);
            
            if (isValid) {
                this.isUnlocked = true;
                await this.saveWalletState();
                this.showWalletScreen();
                await this.loadAssets();
                this.updateConnectionStatus(true);
            } else {
                this.showError('Invalid password');
                document.getElementById('password-input').value = '';
            }
        } catch (error) {
            this.showError('Failed to unlock wallet');
            console.error('Unlock error:', error);
        }
    }

    async verifyPassword(password) {
        // Mock password verification - in real app, decrypt stored seed
        return password.length >= 8; // Simple validation for demo
    }

    async createNewWallet() {
        try {
            const password = prompt('Enter a password for your new wallet (min 8 characters):');
            if (!password || password.length < 8) {
                this.showError('Password must be at least 8 characters long');
                return;
            }

            // Generate mnemonic and derive keys for all networks
            const mnemonic = this.generateMnemonic();
            const wallets = await this.deriveWalletsFromMnemonic(mnemonic);
            
            // Encrypt and store
            const encryptedSeed = await this.encryptSeed(mnemonic, password);
            await chrome.storage.local.set({ 
                encryptedSeed, 
                wallets,
                hasWallet: true 
            });
            
            this.wallets = wallets;
            this.isUnlocked = true;
            await this.saveWalletState();
            
            this.showWalletScreen();
            await this.loadAssets();
            this.showSuccess('Wallet created successfully! 🎉');
            
        } catch (error) {
            this.showError('Failed to create wallet');
            console.error('Wallet creation error:', error);
        }
    }

    generateMnemonic() {
        // Mock mnemonic generation - in real app, use proper BIP39 library
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
        ];
        
        const mnemonic = [];
        for (let i = 0; i < 12; i++) {
            mnemonic.push(words[Math.floor(Math.random() * words.length)]);
        }
        
        return mnemonic.join(' ');
    }

    async deriveWalletsFromMnemonic(mnemonic) {
        const networks = ['ethereum', 'bitcoin', 'ton', 'dogecoin'];
        const wallets = {};
        
        for (const network of networks) {
            wallets[network] = await this.deriveNetworkWallet(mnemonic, network);
        }
        
        return wallets;
    }

    async deriveNetworkWallet(mnemonic, network) {
        // Network-specific derivation rules
        const networkConfig = {
            ethereum: { path: "m/44'/60'/0'/0/0", addressFormat: 'hex' },
            bitcoin: { path: "m/44'/0'/0'/0/0", addressFormat: 'base58' },
            ton: { path: "m/44'/607'/0'/0/0", addressFormat: 'base64' },
            dogecoin: { path: "m/44'/3'/0'/0/0", addressFormat: 'base58' }
        };

        const config = networkConfig[network];
        if (!config) {
            throw new Error(`Unsupported network: ${network}`);
        }

        // Mock key derivation - in real app, use proper crypto libraries
        const seed = this.mnemonicToSeed(mnemonic);
        const privateKey = this.derivePrivateKey(seed, config.path);
        const publicKey = this.derivePublicKey(privateKey);
        const address = this.deriveAddress(publicKey, config.addressFormat, network);

        return {
            address,
            publicKey,
            privateKey, // Should be encrypted in storage
            path: config.path,
            network
        };
    }

    mnemonicToSeed(mnemonic) {
        // Mock implementation - use PBKDF2 in real app
        return this.hashString(mnemonic);
    }

    derivePrivateKey(seed, path) {
        // Mock implementation - use BIP32 in real app
        return this.hashString(seed + path).substring(0, 64);
    }

    derivePublicKey(privateKey) {
        // Mock implementation - use secp256k1 in real app
        return this.hashString(privateKey + 'public').substring(0, 66);
    }

    deriveAddress(publicKey, format, network) {
        // Mock address generation with network-specific formats
        const hash = this.hashString(publicKey + network);
        
        switch (format) {
            case 'hex':
                return '0x' + hash.substring(0, 40);
            case 'base58':
                return this.encodeBase58(hash.substring(0, 25));
            case 'base64':
                return btoa(hash.substring(0, 32)).replace(/[+/]/g, '').substring(0, 48);
            default:
                return hash.substring(0, 40);
        }
    }

    hashString(input) {
        // Mock hash function - use proper crypto in real app
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    encodeBase58(hex) {
        // Mock Base58 encoding
        const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < hex.length; i += 2) {
            const byte = parseInt(hex.substr(i, 2), 16);
            result += alphabet[byte % 58];
        }
        return result;
    }

    async encryptSeed(seed, password) {
        // Mock encryption - use AES in real app
        return btoa(seed + '|' + password);
    }

    showImportWallet() {
        const mnemonic = prompt('Enter your 12 or 24 word recovery phrase:');
        if (!mnemonic) return;
        
        const password = prompt('Enter a password for this wallet:');
        if (!password || password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return;
        }
        
        // Validate mnemonic and import wallet
        this.importWalletFromMnemonic(mnemonic, password);
    }

    async importWalletFromMnemonic(mnemonic, password) {
        try {
            const wallets = await this.deriveWalletsFromMnemonic(mnemonic);
            const encryptedSeed = await this.encryptSeed(mnemonic, password);
            
            await chrome.storage.local.set({ 
                encryptedSeed, 
                wallets,
                hasWallet: true 
            });
            
            this.wallets = wallets;
            this.isUnlocked = true;
            await this.saveWalletState();
            
            this.showWalletScreen();
            await this.loadAssets();
            this.showSuccess('Wallet imported successfully! 🎉');
            
        } catch (error) {
            this.showError('Failed to import wallet');
            console.error('Import error:', error);
        }
    }

    switchNetwork(network) {
        this.currentNetwork = network;
        this.saveWalletState();
        this.loadAssets();
        this.updateConnectionStatus(true);
    }

    async loadAssets() {
        const assetsList = document.getElementById('assets-list');
        const currentWallet = this.wallets[this.currentNetwork];
        
        if (!currentWallet) {
            assetsList.innerHTML = '<div class="asset-item">No wallet for this network</div>';
            return;
        }

        // Mock asset loading
        const mockAssets = [
            {
                name: this.getNetworkName(this.currentNetwork),
                symbol: this.getNetworkSymbol(this.currentNetwork),
                balance: (Math.random() * 10).toFixed(4),
                value: (Math.random() * 1000).toFixed(2),
                icon: this.getNetworkIcon(this.currentNetwork)
            }
        ];

        let totalValue = 0;
        assetsList.innerHTML = mockAssets.map(asset => {
            totalValue += parseFloat(asset.value);
            return `
                <div class="asset-item">
                    <div class="asset-info">
                        <div class="asset-icon" style="background: ${asset.icon}">${asset.symbol[0]}</div>
                        <div class="asset-details">
                            <div class="asset-name">${asset.name}</div>
                            <div class="asset-symbol">${asset.symbol}</div>
                        </div>
                    </div>
                    <div class="asset-balance">
                        <div class="balance-amount">${asset.balance} ${asset.symbol}</div>
                        <div class="balance-value">$${asset.value}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Update total balance
        document.getElementById('total-balance').textContent = `$${totalValue.toFixed(2)}`;
        
        const change = (Math.random() - 0.5) * 10;
        const changeElement = document.getElementById('balance-change');
        changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeElement.className = `balance-change ${change >= 0 ? '' : 'negative'}`;
    }

    getNetworkName(network) {
        const names = {
            ethereum: 'Ethereum',
            bitcoin: 'Bitcoin',
            ton: 'TON',
            dogecoin: 'Dogecoin'
        };
        return names[network] || network;
    }

    getNetworkSymbol(network) {
        const symbols = {
            ethereum: 'ETH',
            bitcoin: 'BTC',
            ton: 'TON',
            dogecoin: 'DOGE'
        };
        return symbols[network] || network.toUpperCase();
    }

    getNetworkIcon(network) {
        const colors = {
            ethereum: '#627eea',
            bitcoin: '#f7931a',
            ton: '#0088cc',
            dogecoin: '#c2a633'
        };
        return colors[network] || '#6c757d';
    }

    // Crypto Tools
    async generateCryptoKeys() {
        try {
            // Generate RSA key pair (mock implementation)
            const keyPair = await this.generateRSAKeyPair();
            
            this.cryptoKeys = keyPair;
            await this.saveWalletState();
            
            document.getElementById('public-key').value = keyPair.publicKey;
            document.getElementById('private-key').value = keyPair.privateKey;
            
            this.showSuccess('Crypto keys generated successfully! 🔑');
        } catch (error) {
            this.showError('Failed to generate keys');
            console.error('Key generation error:', error);
        }
    }

    async generateRSAKeyPair() {
        // Mock RSA key generation - use Web Crypto API in real app
        const publicKey = 'RSA_PUBLIC_' + this.hashString(Date.now().toString()).substring(0, 32);
        const privateKey = 'RSA_PRIVATE_' + this.hashString((Date.now() + 1000).toString()).substring(0, 32);
        
        return { publicKey, privateKey };
    }

    async encryptMessage() {
        const message = document.getElementById('encrypt-input').value;
        const output = document.getElementById('encrypt-output');
        
        if (!message.trim()) {
            this.showError('Please enter a message to encrypt');
            return;
        }
        
        if (!this.cryptoKeys.publicKey) {
            this.showError('Please generate keys first');
            return;
        }
        
        try {
            // Mock encryption - use Web Crypto API in real app
            const encrypted = btoa(message + '|' + this.cryptoKeys.publicKey.substring(0, 16));
            output.value = encrypted;
            this.showSuccess('Message encrypted successfully! 🔐');
        } catch (error) {
            this.showError('Encryption failed');
            console.error('Encryption error:', error);
        }
    }

    async decryptMessage() {
        const encrypted = document.getElementById('encrypt-input').value;
        const output = document.getElementById('encrypt-output');
        
        if (!encrypted.trim()) {
            this.showError('Please enter an encrypted message');
            return;
        }
        
        if (!this.cryptoKeys.privateKey) {
            this.showError('Please generate keys first');
            return;
        }
        
        try {
            // Mock decryption
            const decoded = atob(encrypted);
            const [message] = decoded.split('|');
            output.value = message;
            this.showSuccess('Message decrypted successfully! 🔓');
        } catch (error) {
            this.showError('Decryption failed');
            console.error('Decryption error:', error);
        }
    }

    async signMessage() {
        const message = document.getElementById('sign-input').value;
        const output = document.getElementById('signature-output');
        
        if (!message.trim()) {
            this.showError('Please enter a message to sign');
            return;
        }
        
        if (!this.cryptoKeys.privateKey) {
            this.showError('Please generate keys first');
            return;
        }
        
        try {
            // Mock signing
            const signature = btoa(this.hashString(message + this.cryptoKeys.privateKey));
            output.value = signature;
            this.showSuccess('Message signed successfully! ✍️');
        } catch (error) {
            this.showError('Signing failed');
            console.error('Signing error:', error);
        }
    }

    async verifySignature() {
        const message = document.getElementById('sign-input').value;
        const signature = document.getElementById('signature-output').value;
        
        if (!message.trim() || !signature.trim()) {
            this.showError('Please enter both message and signature');
            return;
        }
        
        if (!this.cryptoKeys.publicKey) {
            this.showError('Please generate keys first');
            return;
        }
        
        try {
            // Mock verification
            const expectedSignature = btoa(this.hashString(message + this.cryptoKeys.privateKey));
            const isValid = signature === expectedSignature;
            
            if (isValid) {
                this.showSuccess('Signature is valid! ✅');
            } else {
                this.showError('Signature is invalid! ❌');
            }
        } catch (error) {
            this.showError('Verification failed');
            console.error('Verification error:', error);
        }
    }

    togglePrivateKeyVisibility() {
        const input = document.getElementById('private-key');
        const button = document.getElementById('toggle-private-key');
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    exportKeys() {
        if (!this.cryptoKeys.publicKey || !this.cryptoKeys.privateKey) {
            this.showError('No keys to export. Generate keys first.');
            return;
        }
        
        const keyData = {
            publicKey: this.cryptoKeys.publicKey,
            privateKey: this.cryptoKeys.privateKey,
            generated: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(keyData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nexus-keys.json';
        a.click();
        
        URL.revokeObjectURL(url);
        this.showSuccess('Keys exported successfully! 📤');
    }

    // Modal functions (simplified for demo)
    showSendModal() {
        alert(`Send ${this.getNetworkSymbol(this.currentNetwork)} - Feature coming soon!`);
    }

    showReceiveModal() {
        const address = this.wallets[this.currentNetwork]?.address || 'No address';
        alert(`Your ${this.getNetworkName(this.currentNetwork)} address:\n${address}`);
    }

    showSwapModal() {
        alert('Swap feature coming soon!');
    }

    lockWallet() {
        this.isUnlocked = false;
        this.saveWalletState();
        this.showUnlockScreen();
        this.updateConnectionStatus(false);
    }

    showUnlockScreen() {
        document.getElementById('unlock-screen').classList.remove('hidden');
        document.getElementById('wallet-screen').classList.add('hidden');
    }

    showWalletScreen() {
        document.getElementById('unlock-screen').classList.add('hidden');
        document.getElementById('wallet-screen').classList.remove('hidden');
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-status');
        const text = document.getElementById('status-text');
        
        if (connected) {
            indicator.classList.add('connected');
            text.textContent = `Connected to ${this.getNetworkName(this.currentNetwork)}`;
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    showSuccess(message) {
        console.log('✅', message);
        // In a real app, show proper notification
    }

    showError(message) {
        console.error('❌', message);
        alert(message); // Simple alert for demo
    }
}

// Initialize wallet when popup opens
document.addEventListener('DOMContentLoaded', () => {
    new NexusWallet();
});