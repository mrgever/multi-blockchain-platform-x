/**
 * NEXUS Wallet Connector
 * Enhanced wallet connection system for external wallets
 */

class WalletConnector {
    constructor() {
        this.connectedWallets = new Map();
        this.supportedWallets = {
            metamask: {
                name: 'MetaMask',
                icon: '🦊',
                detector: () => window.ethereum?.isMetaMask,
                networks: ['ethereum', 'polygon', 'bsc']
            },
            walletconnect: {
                name: 'WalletConnect',
                icon: '🔗',
                detector: () => window.WalletConnect,
                networks: ['ethereum', 'polygon', 'bsc', 'arbitrum']
            },
            phantom: {
                name: 'Phantom',
                icon: '👻',
                detector: () => window.solana?.isPhantom,
                networks: ['solana']
            },
            coinbase: {
                name: 'Coinbase Wallet',
                icon: '🌐',
                detector: () => window.ethereum?.isCoinbaseWallet,
                networks: ['ethereum', 'polygon', 'bsc']
            },
            trust: {
                name: 'Trust Wallet',
                icon: '🛡️',
                detector: () => window.ethereum?.isTrust,
                networks: ['ethereum', 'bsc']
            }
        };
        
        this.init();
    }

    async init() {
        // Check for existing connections on load
        this.loadSavedConnections();
        this.setupEventListeners();
        
        // Auto-detect available wallets
        setTimeout(() => this.detectAvailableWallets(), 1000);
    }

    setupEventListeners() {
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountChange(accounts);
            });

            window.ethereum.on('chainChanged', (chainId) => {
                this.handleChainChange(chainId);
            });

            window.ethereum.on('disconnect', () => {
                this.handleDisconnect('metamask');
            });
        }
    }

    detectAvailableWallets() {
        const available = [];
        
        for (const [id, wallet] of Object.entries(this.supportedWallets)) {
            if (wallet.detector()) {
                available.push({ id, ...wallet });
            }
        }
        
        this.updateWalletStatus(available);
        return available;
    }

    updateWalletStatus(available) {
        const statusElements = document.querySelectorAll('[data-wallet-status]');
        statusElements.forEach(el => {
            const walletId = el.dataset.walletStatus;
            const isAvailable = available.some(w => w.id === walletId);
            
            if (isAvailable) {
                el.classList.remove('opacity-50');
                el.classList.add('hover:shadow-lg', 'cursor-pointer');
            } else {
                el.classList.add('opacity-50');
                el.title = `${this.supportedWallets[walletId]?.name} not detected`;
            }
        });
    }

    async connectWallet(walletId) {
        try {
            const wallet = this.supportedWallets[walletId];
            if (!wallet) {
                throw new Error(`Unsupported wallet: ${walletId}`);
            }

            if (!wallet.detector()) {
                throw new Error(`${wallet.name} not detected. Please install the extension.`);
            }

            let connection;
            
            switch (walletId) {
                case 'metamask':
                    connection = await this.connectMetaMask();
                    break;
                case 'walletconnect':
                    connection = await this.connectWalletConnect();
                    break;
                case 'phantom':
                    connection = await this.connectPhantom();
                    break;
                case 'coinbase':
                    connection = await this.connectCoinbase();
                    break;
                case 'trust':
                    connection = await this.connectTrust();
                    break;
                default:
                    throw new Error(`Connection method not implemented for ${walletId}`);
            }

            this.connectedWallets.set(walletId, connection);
            this.saveConnection(walletId, connection);
            this.updateUI(walletId, connection);
            
            return connection;

        } catch (error) {
            console.error(`Failed to connect ${walletId}:`, error);
            this.showError(`Failed to connect ${wallet.name}: ${error.message}`);
            throw error;
        }
    }

    async connectMetaMask() {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });

        const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest']
        });

        return {
            address: accounts[0],
            chainId: parseInt(chainId, 16),
            balance: parseFloat(window.Web3.utils.fromWei(balance, 'ether')),
            provider: window.ethereum,
            type: 'metamask'
        };
    }

    async connectWalletConnect() {
        const WalletConnectProvider = window.WalletConnectProvider.default;
        
        const provider = new WalletConnectProvider({
            infuraId: "YOUR_INFURA_ID", // Replace with actual Infura ID
            rpc: {
                1: "https://mainnet.infura.io/v3/YOUR_INFURA_ID",
                137: "https://polygon-rpc.com/"
            }
        });

        await provider.enable();
        
        const web3 = new Web3(provider);
        const accounts = await web3.eth.getAccounts();
        const chainId = await web3.eth.getChainId();
        const balance = await web3.eth.getBalance(accounts[0]);

        return {
            address: accounts[0],
            chainId: parseInt(chainId),
            balance: parseFloat(web3.utils.fromWei(balance, 'ether')),
            provider: provider,
            type: 'walletconnect'
        };
    }

    async connectPhantom() {
        const resp = await window.solana.connect();
        const balance = await window.solana.getBalance(resp.publicKey);

        return {
            address: resp.publicKey.toString(),
            chainId: 'solana-mainnet',
            balance: balance / 1000000000, // Convert lamports to SOL
            provider: window.solana,
            type: 'phantom'
        };
    }

    async connectCoinbase() {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });

        return {
            address: accounts[0],
            chainId: parseInt(chainId, 16),
            provider: window.ethereum,
            type: 'coinbase'
        };
    }

    async connectTrust() {
        // Trust Wallet uses similar interface to MetaMask
        return await this.connectMetaMask();
    }

    async disconnectWallet(walletId) {
        const connection = this.connectedWallets.get(walletId);
        
        if (connection) {
            try {
                if (connection.provider && connection.provider.disconnect) {
                    await connection.provider.disconnect();
                }
            } catch (error) {
                console.warn('Error disconnecting wallet:', error);
            }
            
            this.connectedWallets.delete(walletId);
            this.removeSavedConnection(walletId);
            this.updateUI(walletId, null);
        }
    }

    getConnectedWallet(walletId) {
        return this.connectedWallets.get(walletId);
    }

    getAllConnectedWallets() {
        return Array.from(this.connectedWallets.entries()).map(([id, connection]) => ({
            id,
            ...connection
        }));
    }

    async sendTransaction(walletId, transaction) {
        const connection = this.connectedWallets.get(walletId);
        if (!connection) {
            throw new Error(`Wallet ${walletId} not connected`);
        }

        const { provider, type, address } = connection;

        switch (type) {
            case 'metamask':
            case 'coinbase':
            case 'trust':
                return await provider.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: address,
                        ...transaction
                    }]
                });

            case 'walletconnect':
                const web3 = new Web3(provider);
                return await web3.eth.sendTransaction({
                    from: address,
                    ...transaction
                });

            case 'phantom':
                return await provider.signAndSendTransaction(transaction);

            default:
                throw new Error(`Transaction not supported for wallet type: ${type}`);
        }
    }

    async switchNetwork(walletId, chainId) {
        const connection = this.connectedWallets.get(walletId);
        if (!connection) {
            throw new Error(`Wallet ${walletId} not connected`);
        }

        const hexChainId = `0x${chainId.toString(16)}`;
        
        try {
            await connection.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: hexChainId }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                // Add the network
                const networkConfig = this.getNetworkConfig(chainId);
                await connection.provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [networkConfig],
                });
            } else {
                throw switchError;
            }
        }
    }

    getNetworkConfig(chainId) {
        const networks = {
            1: {
                chainId: '0x1',
                chainName: 'Ethereum Mainnet',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.infura.io/v3/YOUR_INFURA_ID'],
                blockExplorerUrls: ['https://etherscan.io']
            },
            137: {
                chainId: '0x89',
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com/'],
                blockExplorerUrls: ['https://polygonscan.com']
            },
            56: {
                chainId: '0x38',
                chainName: 'Binance Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com']
            }
        };

        return networks[chainId] || networks[1];
    }

    handleAccountChange(accounts) {
        if (accounts.length === 0) {
            this.handleDisconnect('metamask');
        } else {
            const connection = this.connectedWallets.get('metamask');
            if (connection) {
                connection.address = accounts[0];
                this.updateUI('metamask', connection);
            }
        }
    }

    handleChainChange(chainId) {
        const connection = this.connectedWallets.get('metamask');
        if (connection) {
            connection.chainId = parseInt(chainId, 16);
            this.updateUI('metamask', connection);
        }
    }

    handleDisconnect(walletId) {
        this.disconnectWallet(walletId);
        this.showInfo(`${this.supportedWallets[walletId].name} disconnected`);
    }

    saveConnection(walletId, connection) {
        const savedConnections = JSON.parse(localStorage.getItem('nexus_wallet_connections') || '{}');
        savedConnections[walletId] = {
            address: connection.address,
            chainId: connection.chainId,
            type: connection.type,
            connected: true,
            lastConnected: Date.now()
        };
        localStorage.setItem('nexus_wallet_connections', JSON.stringify(savedConnections));
    }

    loadSavedConnections() {
        const savedConnections = JSON.parse(localStorage.getItem('nexus_wallet_connections') || '{}');
        
        // Auto-reconnect to previously connected wallets
        Object.entries(savedConnections).forEach(([walletId, data]) => {
            if (data.connected && (Date.now() - data.lastConnected) < 24 * 60 * 60 * 1000) {
                // Try to reconnect if connected within last 24 hours
                this.attemptReconnect(walletId);
            }
        });
    }

    async attemptReconnect(walletId) {
        try {
            await this.connectWallet(walletId);
        } catch (error) {
            console.log(`Failed to auto-reconnect ${walletId}:`, error.message);
        }
    }

    removeSavedConnection(walletId) {
        const savedConnections = JSON.parse(localStorage.getItem('nexus_wallet_connections') || '{}');
        delete savedConnections[walletId];
        localStorage.setItem('nexus_wallet_connections', JSON.stringify(savedConnections));
    }

    updateUI(walletId, connection) {
        const elements = document.querySelectorAll(`[data-wallet="${walletId}"]`);
        
        elements.forEach(el => {
            if (connection) {
                el.classList.add('connected');
                const addressEl = el.querySelector('.wallet-address');
                if (addressEl) {
                    addressEl.textContent = this.formatAddress(connection.address);
                }
                
                const balanceEl = el.querySelector('.wallet-balance');
                if (balanceEl && connection.balance) {
                    balanceEl.textContent = `${connection.balance.toFixed(4)} ${this.getNetworkSymbol(connection.chainId)}`;
                }
                
                const statusEl = el.querySelector('.wallet-status');
                if (statusEl) {
                    statusEl.textContent = 'Connected';
                    statusEl.className = 'wallet-status text-green-600';
                }
            } else {
                el.classList.remove('connected');
                const statusEl = el.querySelector('.wallet-status');
                if (statusEl) {
                    statusEl.textContent = 'Disconnected';
                    statusEl.className = 'wallet-status text-gray-600';
                }
            }
        });

        // Update global wallet status
        this.updateGlobalWalletStatus();
    }

    updateGlobalWalletStatus() {
        const connectedCount = this.connectedWallets.size;
        const statusElements = document.querySelectorAll('[data-global-wallet-status]');
        
        statusElements.forEach(el => {
            if (connectedCount > 0) {
                el.textContent = `${connectedCount} wallet${connectedCount > 1 ? 's' : ''} connected`;
                el.className = 'text-green-600 font-medium';
            } else {
                el.textContent = 'No wallets connected';
                el.className = 'text-gray-600';
            }
        });
    }

    formatAddress(address) {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    getNetworkSymbol(chainId) {
        const symbols = {
            1: 'ETH',
            137: 'MATIC',
            56: 'BNB',
            'solana-mainnet': 'SOL'
        };
        return symbols[chainId] || 'ETH';
    }

    showError(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            console.error(message);
        }
    }

    showInfo(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            console.log(message);
        }
    }

    // Integration with PaymentManager
    getAvailableWalletsForPayment(currency) {
        const availableWallets = [];
        
        for (const [walletId, connection] of this.connectedWallets.entries()) {
            const wallet = this.supportedWallets[walletId];
            const currencyUpper = currency.toUpperCase();
            
            // Check if wallet supports the currency
            if (this.walletSupportsCurrency(wallet, currencyUpper)) {
                availableWallets.push({
                    id: walletId,
                    name: wallet.name,
                    icon: wallet.icon,
                    address: connection.address,
                    balance: connection.balance
                });
            }
        }
        
        return availableWallets;
    }

    walletSupportsCurrency(wallet, currency) {
        const currencyNetworks = {
            'ETH': ['ethereum'],
            'USDT': ['ethereum', 'polygon', 'bsc'],
            'BTC': ['bitcoin'], // Would need Bitcoin wallet support
            'MATIC': ['polygon'],
            'BNB': ['bsc'],
            'SOL': ['solana']
        };
        
        const supportedNetworks = currencyNetworks[currency] || [];
        return wallet.networks.some(network => supportedNetworks.includes(network));
    }
}

// Initialize global wallet connector
window.nexusWalletConnector = new WalletConnector();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletConnector;
}