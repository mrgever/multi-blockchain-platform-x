/**
 * Mobile Wallet Connector for Bitorzo
 * Handles wallet connections for mobile devices including WalletConnect and in-app browsers
 * Supports MetaMask, Trust Wallet, Coinbase Wallet, Rainbow, and other mobile wallets
 */

export class MobileWalletConnector {
    constructor() {
        this.isConnected = false;
        this.account = null;
        this.provider = null;
        this.walletType = null;
        this.chainId = null;
        this.isMobile = this.detectMobile();
        this.walletConnectProvider = null;
        
        console.log('📱 Mobile Wallet Connector initialized');
        console.log('Device type:', this.isMobile ? 'Mobile' : 'Desktop');
    }

    detectMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }

    async detectAvailableWallets() {
        const wallets = [];

        // Check for injected providers (in-app browsers)
        if (window.ethereum) {
            // MetaMask Mobile
            if (window.ethereum.isMetaMask) {
                wallets.push({
                    name: 'MetaMask',
                    type: 'injected',
                    icon: '🦊',
                    provider: window.ethereum,
                    available: true
                });
            }
            
            // Coinbase Wallet
            if (window.ethereum.isCoinbaseWallet) {
                wallets.push({
                    name: 'Coinbase Wallet',
                    type: 'injected',
                    icon: '🔵',
                    provider: window.ethereum,
                    available: true
                });
            }
            
            // Trust Wallet
            if (window.ethereum.isTrust) {
                wallets.push({
                    name: 'Trust Wallet',
                    type: 'injected',
                    icon: '🛡️',
                    provider: window.ethereum,
                    available: true
                });
            }
            
            // Generic injected wallet
            if (!window.ethereum.isMetaMask && !window.ethereum.isCoinbaseWallet && !window.ethereum.isTrust) {
                wallets.push({
                    name: 'Browser Wallet',
                    type: 'injected',
                    icon: '🌐',
                    provider: window.ethereum,
                    available: true
                });
            }
        }

        // WalletConnect for mobile wallets
        if (this.isMobile) {
            wallets.push({
                name: 'WalletConnect',
                type: 'walletconnect',
                icon: '📱',
                provider: null,
                available: true,
                description: 'Connect any mobile wallet'
            });
        }

        // Deep link wallets for mobile
        if (this.isMobile) {
            const mobileWallets = [
                {
                    name: 'MetaMask',
                    type: 'deeplink',
                    icon: '🦊',
                    scheme: 'metamask://',
                    downloadUrl: 'https://metamask.app.link/',
                    available: this.isWalletInstalled('metamask')
                },
                {
                    name: 'Trust Wallet',
                    type: 'deeplink',
                    icon: '🛡️',
                    scheme: 'trust://',
                    downloadUrl: 'https://trustwallet.com/download',
                    available: this.isWalletInstalled('trust')
                },
                {
                    name: 'Rainbow',
                    type: 'deeplink',
                    icon: '🌈',
                    scheme: 'rainbow://',
                    downloadUrl: 'https://rainbow.me/',
                    available: this.isWalletInstalled('rainbow')
                },
                {
                    name: 'Coinbase Wallet',
                    type: 'deeplink',
                    icon: '🔵',
                    scheme: 'cbwallet://',
                    downloadUrl: 'https://www.coinbase.com/wallet',
                    available: this.isWalletInstalled('coinbase')
                }
            ];

            wallets.push(...mobileWallets);
        }

        return wallets;
    }

    isWalletInstalled(walletName) {
        // For mobile, we can't easily detect if apps are installed
        // We'll assume they might be and let the deep link handle it
        return true;
    }

    async connectWallet(walletOption) {
        try {
            console.log(`📱 Connecting to ${walletOption.name}...`);

            switch (walletOption.type) {
                case 'injected':
                    return await this.connectInjected(walletOption);
                
                case 'walletconnect':
                    return await this.connectWalletConnect();
                
                case 'deeplink':
                    return await this.connectDeepLink(walletOption);
                
                default:
                    throw new Error(`Unsupported wallet type: ${walletOption.type}`);
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    async connectInjected(walletOption) {
        if (!walletOption.provider) {
            throw new Error('No provider available');
        }

        try {
            // Request account access
            const accounts = await walletOption.provider.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned');
            }

            // Get chain ID
            const chainId = await walletOption.provider.request({
                method: 'eth_chainId'
            });

            this.isConnected = true;
            this.account = accounts[0];
            this.provider = walletOption.provider;
            this.walletType = walletOption.name;
            this.chainId = parseInt(chainId, 16);

            // Set up event listeners
            this.setupEventListeners();

            console.log('✅ Wallet connected:', {
                account: this.account,
                wallet: this.walletType,
                chainId: this.chainId
            });

            return {
                success: true,
                account: this.account,
                chainId: this.chainId,
                walletType: this.walletType
            };

        } catch (error) {
            if (error.code === 4001) {
                throw new Error('User rejected the connection request');
            }
            throw error;
        }
    }

    async connectWalletConnect() {
        try {
            // Dynamically import WalletConnect
            const WalletConnectProvider = await this.loadWalletConnect();
            
            if (!WalletConnectProvider) {
                throw new Error('WalletConnect not available');
            }

            this.walletConnectProvider = new WalletConnectProvider({
                rpc: {
                    1: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID', // Replace with actual Infura ID
                    137: 'https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID',
                    56: 'https://bsc-dataseed.binance.org/'
                },
                qrcode: true,
                qrcodeModalOptions: {
                    mobileLinks: [
                        'metamask',
                        'trust',
                        'rainbow',
                        'argent',
                        'imtoken',
                        'pillar'
                    ]
                }
            });

            // Enable session
            await this.walletConnectProvider.enable();

            this.isConnected = true;
            this.account = this.walletConnectProvider.accounts[0];
            this.provider = this.walletConnectProvider;
            this.walletType = 'WalletConnect';
            this.chainId = this.walletConnectProvider.chainId;

            // Set up WalletConnect event listeners
            this.setupWalletConnectListeners();

            console.log('✅ WalletConnect connected:', {
                account: this.account,
                chainId: this.chainId
            });

            return {
                success: true,
                account: this.account,
                chainId: this.chainId,
                walletType: this.walletType
            };

        } catch (error) {
            console.error('WalletConnect connection failed:', error);
            throw error;
        }
    }

    async connectDeepLink(walletOption) {
        try {
            // Create a connection request URL
            const connectionUrl = this.generateDeepLinkUrl(walletOption);
            
            // Try to open the wallet app
            window.location.href = connectionUrl;
            
            // For deep links, we need to wait for the user to return
            // This is a simplified approach - in a real app you'd use more sophisticated handling
            return new Promise((resolve, reject) => {
                // Set a timeout for the connection attempt
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout - please make sure the wallet app is installed'));
                }, 30000); // 30 seconds

                // Listen for the app returning focus
                const handleVisibilityChange = () => {
                    if (!document.hidden) {
                        // App regained focus, check if connection was established
                        setTimeout(async () => {
                            try {
                                // Try to detect if wallet is now available
                                if (window.ethereum) {
                                    const result = await this.connectInjected({
                                        name: walletOption.name,
                                        provider: window.ethereum
                                    });
                                    clearTimeout(timeout);
                                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                                    resolve(result);
                                } else {
                                    // If no provider, assume user cancelled or app not installed
                                    clearTimeout(timeout);
                                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                                    reject(new Error('Wallet connection failed - app may not be installed'));
                                }
                            } catch (error) {
                                clearTimeout(timeout);
                                document.removeEventListener('visibilitychange', handleVisibilityChange);
                                reject(error);
                            }
                        }, 1000);
                    }
                };

                document.addEventListener('visibilitychange', handleVisibilityChange);
            });

        } catch (error) {
            console.error('Deep link connection failed:', error);
            throw error;
        }
    }

    generateDeepLinkUrl(walletOption) {
        const currentUrl = encodeURIComponent(window.location.href);
        const dappName = encodeURIComponent('Bitorzo');
        
        switch (walletOption.name.toLowerCase()) {
            case 'metamask':
                return `https://metamask.app.link/dapp/${window.location.hostname}`;
            
            case 'trust wallet':
                return `https://link.trustwallet.com/open_url?coin_id=60&url=${currentUrl}`;
            
            case 'rainbow':
                return `https://rnbwapp.com/wc?uri=${currentUrl}`;
            
            case 'coinbase wallet':
                return `https://go.cb-w.com/dapp?cb_url=${currentUrl}`;
            
            default:
                return walletOption.scheme + currentUrl;
        }
    }

    async loadWalletConnect() {
        try {
            // Try to load WalletConnect from CDN
            if (!window.WalletConnectProvider) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/@walletconnect/web3-provider@1.8.0/dist/umd/index.min.js';
                
                return new Promise((resolve, reject) => {
                    script.onload = () => {
                        resolve(window.WalletConnectProvider.default);
                    };
                    script.onerror = () => {
                        console.warn('Failed to load WalletConnect from CDN');
                        resolve(null);
                    };
                    document.head.appendChild(script);
                    
                    // Fallback timeout
                    setTimeout(() => {
                        if (!window.WalletConnectProvider) {
                            resolve(null);
                        }
                    }, 5000);
                });
            }
            
            return window.WalletConnectProvider.default;
        } catch (error) {
            console.warn('WalletConnect not available:', error);
            return null;
        }
    }

    setupEventListeners() {
        if (!this.provider) return;

        // Account changed
        this.provider.on('accountsChanged', (accounts) => {
            console.log('📱 Accounts changed:', accounts);
            if (accounts.length === 0) {
                this.disconnect();
            } else {
                this.account = accounts[0];
                this.onAccountChanged(accounts[0]);
            }
        });

        // Chain changed
        this.provider.on('chainChanged', (chainId) => {
            console.log('📱 Chain changed:', chainId);
            this.chainId = parseInt(chainId, 16);
            this.onChainChanged(this.chainId);
        });

        // Disconnect
        this.provider.on('disconnect', () => {
            console.log('📱 Wallet disconnected');
            this.disconnect();
        });
    }

    setupWalletConnectListeners() {
        if (!this.walletConnectProvider) return;

        this.walletConnectProvider.on('accountsChanged', (accounts) => {
            console.log('📱 WC Accounts changed:', accounts);
            if (accounts.length === 0) {
                this.disconnect();
            } else {
                this.account = accounts[0];
                this.onAccountChanged(accounts[0]);
            }
        });

        this.walletConnectProvider.on('chainChanged', (chainId) => {
            console.log('📱 WC Chain changed:', chainId);
            this.chainId = chainId;
            this.onChainChanged(chainId);
        });

        this.walletConnectProvider.on('disconnect', () => {
            console.log('📱 WC Disconnected');
            this.disconnect();
        });
    }

    async switchNetwork(chainId) {
        if (!this.provider) {
            throw new Error('No wallet connected');
        }

        const networks = {
            1: {
                chainId: '0x1',
                chainName: 'Ethereum Mainnet',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.infura.io/v3/YOUR_PROJECT_ID']
            },
            137: {
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com/']
            },
            56: {
                chainId: '0x38',
                chainName: 'BSC Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/']
            }
        };

        const network = networks[chainId];
        if (!network) {
            throw new Error(`Unsupported network: ${chainId}`);
        }

        try {
            await this.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: network.chainId }]
            });
        } catch (switchError) {
            // If the chain hasn't been added to the wallet
            if (switchError.code === 4902) {
                try {
                    await this.provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [network]
                    });
                } catch (addError) {
                    throw new Error('Failed to add network to wallet');
                }
            } else {
                throw switchError;
            }
        }
    }

    async getBalance() {
        if (!this.provider || !this.account) {
            throw new Error('No wallet connected');
        }

        try {
            const balance = await this.provider.request({
                method: 'eth_getBalance',
                params: [this.account, 'latest']
            });

            // Convert from Wei to ETH
            const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
            return balanceInEth;
        } catch (error) {
            console.error('Failed to get balance:', error);
            throw error;
        }
    }

    async signMessage(message) {
        if (!this.provider || !this.account) {
            throw new Error('No wallet connected');
        }

        try {
            const signature = await this.provider.request({
                method: 'personal_sign',
                params: [message, this.account]
            });

            return signature;
        } catch (error) {
            console.error('Failed to sign message:', error);
            throw error;
        }
    }

    disconnect() {
        if (this.walletConnectProvider) {
            this.walletConnectProvider.disconnect();
        }

        this.isConnected = false;
        this.account = null;
        this.provider = null;
        this.walletType = null;
        this.chainId = null;
        this.walletConnectProvider = null;

        this.onDisconnected();
        console.log('📱 Wallet disconnected');
    }

    // Event handlers (to be overridden)
    onAccountChanged(account) {
        console.log('Account changed to:', account);
    }

    onChainChanged(chainId) {
        console.log('Chain changed to:', chainId);
    }

    onDisconnected() {
        console.log('Wallet disconnected');
    }

    // Utility methods
    getConnectionInfo() {
        return {
            isConnected: this.isConnected,
            account: this.account,
            walletType: this.walletType,
            chainId: this.chainId,
            isMobile: this.isMobile
        };
    }

    getNetworkName(chainId = this.chainId) {
        const networks = {
            1: 'Ethereum',
            137: 'Polygon',
            56: 'BSC',
            10: 'Optimism',
            42161: 'Arbitrum',
            43114: 'Avalanche'
        };
        return networks[chainId] || `Chain ${chainId}`;
    }

    formatAddress(address = this.account) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    isValidAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
}

export default MobileWalletConnector;