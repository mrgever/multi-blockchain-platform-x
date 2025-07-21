// NEXUS Wallet Extension - Background Service Worker
class NexusBackground {
    constructor() {
        this.setupEventListeners();
        this.initializeWallet();
    }

    setupEventListeners() {
        // Extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                console.log('NEXUS Wallet Extension installed');
                this.handleFirstInstall();
            }
        });

        // Web page requests
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleWebPageRequest(request, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Tab updates for DApp detection
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.checkForDApp(tab);
            }
        });

        // Alarm for periodic tasks
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'market-update') {
                this.updateMarketPrices();
            }
        });

        // Set up periodic market updates
        chrome.alarms.create('market-update', { 
            delayInMinutes: 1, 
            periodInMinutes: 5 
        });
    }

    async handleFirstInstall() {
        // Set up default storage
        await chrome.storage.local.set({
            hasWallet: false,
            isUnlocked: false,
            version: '1.0.0',
            settings: {
                autoLock: 30, // minutes
                showNotifications: true,
                defaultNetwork: 'ethereum'
            }
        });

        // Show welcome notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon48.png',
            title: 'NEXUS Wallet Installed',
            message: 'Click the extension icon to get started with your multi-blockchain wallet!'
        });
    }

    async initializeWallet() {
        // Check if auto-lock timer should be set
        const result = await chrome.storage.local.get(['isUnlocked', 'lastActivity', 'settings']);
        
        if (result.isUnlocked) {
            const now = Date.now();
            const lastActivity = result.lastActivity || now;
            const autoLock = result.settings?.autoLock || 30;
            const lockTime = lastActivity + (autoLock * 60 * 1000);
            
            if (now > lockTime) {
                // Auto-lock the wallet
                await chrome.storage.local.set({ isUnlocked: false });
                console.log('Wallet auto-locked due to inactivity');
            }
        }
    }

    async handleWebPageRequest(request, sender, sendResponse) {
        try {
            switch (request.type) {
                case 'CONNECT_WALLET':
                    const connectionResult = await this.handleWalletConnection(request, sender);
                    sendResponse(connectionResult);
                    break;

                case 'GET_ACCOUNTS':
                    const accounts = await this.getAccounts();
                    sendResponse(accounts);
                    break;

                case 'SIGN_MESSAGE':
                    const signResult = await this.signMessage(request.message, request.network);
                    sendResponse(signResult);
                    break;

                case 'SEND_TRANSACTION':
                    const txResult = await this.sendTransaction(request.transaction);
                    sendResponse(txResult);
                    break;

                case 'GET_BALANCE':
                    const balance = await this.getBalance(request.address, request.network);
                    sendResponse(balance);
                    break;

                case 'ENCRYPT_DATA':
                    const encrypted = await this.encryptData(request.data);
                    sendResponse(encrypted);
                    break;

                case 'DECRYPT_DATA':
                    const decrypted = await this.decryptData(request.encryptedData);
                    sendResponse(decrypted);
                    break;

                default:
                    sendResponse({ error: 'Unknown request type' });
            }
        } catch (error) {
            console.error('Background request error:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleWalletConnection(request, sender) {
        const result = await chrome.storage.local.get(['isUnlocked', 'wallets', 'connectedSites']);
        
        if (!result.isUnlocked) {
            return { 
                success: false, 
                error: 'Wallet is locked. Please unlock first.' 
            };
        }

        const siteUrl = new URL(sender.tab.url).origin;
        const connectedSites = result.connectedSites || [];
        
        if (!connectedSites.includes(siteUrl)) {
            // Show connection approval popup
            const approved = await this.requestConnectionApproval(siteUrl, sender.tab);
            
            if (!approved) {
                return { 
                    success: false, 
                    error: 'User rejected connection' 
                };
            }

            // Add site to connected list
            connectedSites.push(siteUrl);
            await chrome.storage.local.set({ connectedSites });
        }

        // Return wallet addresses
        const wallets = result.wallets || {};
        const addresses = {};
        
        for (const [network, wallet] of Object.entries(wallets)) {
            addresses[network] = wallet.address;
        }

        return {
            success: true,
            addresses,
            chainId: this.getChainId(request.network || 'ethereum')
        };
    }

    async requestConnectionApproval(siteUrl, tab) {
        // In a real extension, this would show a popup for user approval
        // For demo purposes, we'll simulate approval
        console.log(`Connection request from ${siteUrl}`);
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon48.png',
            title: 'Connection Request',
            message: `${new URL(siteUrl).hostname} wants to connect to your wallet`
        });
        
        return true; // Auto-approve for demo
    }

    async getAccounts() {
        const result = await chrome.storage.local.get(['isUnlocked', 'wallets', 'currentNetwork']);
        
        if (!result.isUnlocked) {
            return { error: 'Wallet is locked' };
        }

        const currentNetwork = result.currentNetwork || 'ethereum';
        const wallet = result.wallets?.[currentNetwork];
        
        return {
            success: true,
            accounts: wallet ? [wallet.address] : [],
            network: currentNetwork
        };
    }

    async signMessage(message, network) {
        const result = await chrome.storage.local.get(['isUnlocked', 'wallets']);
        
        if (!result.isUnlocked) {
            return { error: 'Wallet is locked' };
        }

        const wallet = result.wallets?.[network];
        if (!wallet) {
            return { error: `No wallet found for network: ${network}` };
        }

        // Mock signing - in real app, use proper cryptographic signing
        const signature = this.mockSign(message, wallet.privateKey);
        
        return {
            success: true,
            signature,
            address: wallet.address
        };
    }

    async sendTransaction(transaction) {
        // Mock transaction sending - in real app, broadcast to network
        return {
            success: true,
            txHash: '0x' + this.generateTxHash(),
            message: 'Transaction sent successfully'
        };
    }

    async getBalance(address, network) {
        // Mock balance fetching - in real app, query blockchain
        return {
            success: true,
            balance: (Math.random() * 10).toFixed(4),
            network
        };
    }

    async encryptData(data) {
        // Mock encryption - use Web Crypto API in real app
        return {
            success: true,
            encrypted: btoa(data + '|' + Date.now())
        };
    }

    async decryptData(encryptedData) {
        // Mock decryption
        try {
            const decoded = atob(encryptedData);
            const [data] = decoded.split('|');
            return {
                success: true,
                decrypted: data
            };
        } catch (error) {
            return {
                success: false,
                error: 'Failed to decrypt data'
            };
        }
    }

    async checkForDApp(tab) {
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('moz-extension://')) {
            return;
        }

        // Inject content script for DApp detection
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        } catch (error) {
            console.log('Could not inject content script:', error);
        }
    }

    async updateMarketPrices() {
        try {
            // Fetch latest prices for portfolio calculation
            const response = await fetch('http://localhost:3001/api/v1/market/prices');
            const result = await response.json();
            
            if (result.success) {
                await chrome.storage.local.set({
                    marketPrices: result.data,
                    lastPriceUpdate: Date.now()
                });
            }
        } catch (error) {
            console.log('Failed to update market prices:', error);
        }
    }

    mockSign(message, privateKey) {
        // Mock signature generation
        const hash = this.hashString(message + privateKey);
        return '0x' + hash.substring(0, 128);
    }

    generateTxHash() {
        return Array.from({ length: 64 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }

    hashString(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    getChainId(network) {
        const chainIds = {
            ethereum: 1,
            bitcoin: null, // Bitcoin doesn't use chain IDs
            ton: 1,
            dogecoin: null
        };
        return chainIds[network];
    }
}

// Initialize background service
new NexusBackground();