// NEXUS Wallet Extension - Content Script
class NexusProvider {
    constructor() {
        this.isNexus = true;
        this.isConnected = false;
        this.selectedAddress = null;
        this.chainId = null;
        
        this.setupProvider();
        this.injectProvider();
    }

    setupProvider() {
        // Web3 Provider methods
        this.request = this.request.bind(this);
        this.enable = this.enable.bind(this);
        this.send = this.send.bind(this);
        this.sendAsync = this.sendAsync.bind(this);
        
        // Event emitter functionality
        this._events = {};
    }

    async request({ method, params = [] }) {
        try {
            switch (method) {
                case 'eth_requestAccounts':
                case 'eth_accounts':
                    return await this.getAccounts();
                
                case 'eth_chainId':
                    return this.chainId;
                
                case 'personal_sign':
                    return await this.personalSign(params[0], params[1]);
                
                case 'eth_signTypedData_v4':
                    return await this.signTypedData(params[1], params[0]);
                
                case 'eth_sendTransaction':
                    return await this.sendTransaction(params[0]);
                
                case 'eth_getBalance':
                    return await this.getBalance(params[0]);
                
                case 'net_version':
                    return this.chainId?.toString();
                
                case 'wallet_switchEthereumChain':
                    return await this.switchChain(params[0]);
                
                case 'wallet_addEthereumChain':
                    return await this.addChain(params[0]);
                
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }
        } catch (error) {
            console.error('NEXUS Provider error:', error);
            throw error;
        }
    }

    async enable() {
        return await this.getAccounts();
    }

    send(method, params) {
        return this.request({ method, params });
    }

    sendAsync(payload, callback) {
        this.request(payload)
            .then(result => callback(null, { id: payload.id, result }))
            .catch(error => callback(error));
    }

    async getAccounts() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_ACCOUNTS'
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            this.isConnected = response.accounts.length > 0;
            this.selectedAddress = response.accounts[0] || null;
            this.chainId = this.getChainIdFromNetwork(response.network);
            
            return response.accounts;
        } catch (error) {
            console.error('Failed to get accounts:', error);
            return [];
        }
    }

    async personalSign(message, address) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'SIGN_MESSAGE',
                message,
                address,
                network: this.getCurrentNetwork()
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            return response.signature;
        } catch (error) {
            console.error('Failed to sign message:', error);
            throw error;
        }
    }

    async signTypedData(address, typedData) {
        // Similar to personalSign but for structured data
        return await this.personalSign(JSON.stringify(typedData), address);
    }

    async sendTransaction(transaction) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'SEND_TRANSACTION',
                transaction
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            return response.txHash;
        } catch (error) {
            console.error('Failed to send transaction:', error);
            throw error;
        }
    }

    async getBalance(address) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_BALANCE',
                address,
                network: this.getCurrentNetwork()
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Convert to hex (Wei format for Ethereum)
            const balance = Math.floor(parseFloat(response.balance) * 1e18);
            return '0x' + balance.toString(16);
        } catch (error) {
            console.error('Failed to get balance:', error);
            return '0x0';
        }
    }

    async switchChain(chainParams) {
        // Mock chain switching
        this.chainId = chainParams.chainId;
        this.emit('chainChanged', this.chainId);
        return null;
    }

    async addChain(chainParams) {
        // Mock chain addition
        console.log('Add chain requested:', chainParams);
        return null;
    }

    getCurrentNetwork() {
        // Map chain ID to network name
        const networks = {
            1: 'ethereum',
            56: 'binance',
            137: 'polygon',
            43114: 'avalanche'
        };
        
        return networks[parseInt(this.chainId)] || 'ethereum';
    }

    getChainIdFromNetwork(network) {
        const chainIds = {
            ethereum: 1,
            binance: 56,
            polygon: 137,
            avalanche: 43114
        };
        
        return chainIds[network] || 1;
    }

    // Event emitter methods
    on(event, listener) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(listener);
    }

    removeListener(event, listener) {
        if (!this._events[event]) return;
        const index = this._events[event].indexOf(listener);
        if (index > -1) {
            this._events[event].splice(index, 1);
        }
    }

    emit(event, ...args) {
        if (!this._events[event]) return;
        this._events[event].forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error('Event listener error:', error);
            }
        });
    }

    injectProvider() {
        // Inject NEXUS provider into window
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                // NEXUS Wallet Provider Injection
                window.nexus = {
                    isNexus: true,
                    isConnected: false,
                    selectedAddress: null,
                    chainId: null,
                    
                    // Connection methods
                    connect: async function() {
                        const accounts = await this.request({ method: 'eth_requestAccounts' });
                        this.isConnected = accounts.length > 0;
                        this.selectedAddress = accounts[0] || null;
                        return accounts;
                    },
                    
                    // Request method
                    request: function(args) {
                        return new Promise((resolve, reject) => {
                            window.postMessage({
                                type: 'NEXUS_PROVIDER_REQUEST',
                                data: args
                            }, '*');
                            
                            const handler = (event) => {
                                if (event.data.type === 'NEXUS_PROVIDER_RESPONSE') {
                                    window.removeEventListener('message', handler);
                                    if (event.data.error) {
                                        reject(new Error(event.data.error));
                                    } else {
                                        resolve(event.data.result);
                                    }
                                }
                            };
                            
                            window.addEventListener('message', handler);
                        });
                    },
                    
                    // Encryption utilities
                    encrypt: function(data) {
                        return new Promise((resolve, reject) => {
                            window.postMessage({
                                type: 'NEXUS_ENCRYPT_REQUEST',
                                data: data
                            }, '*');
                            
                            const handler = (event) => {
                                if (event.data.type === 'NEXUS_ENCRYPT_RESPONSE') {
                                    window.removeEventListener('message', handler);
                                    if (event.data.error) {
                                        reject(new Error(event.data.error));
                                    } else {
                                        resolve(event.data.result);
                                    }
                                }
                            };
                            
                            window.addEventListener('message', handler);
                        });
                    },
                    
                    decrypt: function(encryptedData) {
                        return new Promise((resolve, reject) => {
                            window.postMessage({
                                type: 'NEXUS_DECRYPT_REQUEST',
                                data: encryptedData
                            }, '*');
                            
                            const handler = (event) => {
                                if (event.data.type === 'NEXUS_DECRYPT_RESPONSE') {
                                    window.removeEventListener('message', handler);
                                    if (event.data.error) {
                                        reject(new Error(event.data.error));
                                    } else {
                                        resolve(event.data.result);
                                    }
                                }
                            };
                            
                            window.addEventListener('message', handler);
                        });
                    }
                };
                
                // Also inject as ethereum provider for Web3 compatibility
                window.ethereum = window.nexus;
                
                // Announce provider
                window.dispatchEvent(new Event('ethereum#initialized'));
            })();
        `;
        
        // Inject before any other scripts
        (document.head || document.documentElement).appendChild(script);
        script.remove();
        
        // Listen for provider requests from injected script
        window.addEventListener('message', async (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'NEXUS_PROVIDER_REQUEST') {
                try {
                    const result = await this.request(event.data.data);
                    window.postMessage({
                        type: 'NEXUS_PROVIDER_RESPONSE',
                        result
                    }, '*');
                } catch (error) {
                    window.postMessage({
                        type: 'NEXUS_PROVIDER_RESPONSE',
                        error: error.message
                    }, '*');
                }
            }
            
            if (event.data.type === 'NEXUS_ENCRYPT_REQUEST') {
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'ENCRYPT_DATA',
                        data: event.data.data
                    });
                    
                    window.postMessage({
                        type: 'NEXUS_ENCRYPT_RESPONSE',
                        result: response.encrypted
                    }, '*');
                } catch (error) {
                    window.postMessage({
                        type: 'NEXUS_ENCRYPT_RESPONSE',
                        error: error.message
                    }, '*');
                }
            }
            
            if (event.data.type === 'NEXUS_DECRYPT_REQUEST') {
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'DECRYPT_DATA',
                        encryptedData: event.data.data
                    });
                    
                    window.postMessage({
                        type: 'NEXUS_DECRYPT_RESPONSE',
                        result: response.decrypted
                    }, '*');
                } catch (error) {
                    window.postMessage({
                        type: 'NEXUS_DECRYPT_RESPONSE',
                        error: error.message
                    }, '*');
                }
            }
        });
    }
}

// Initialize provider
const nexusProvider = new NexusProvider();

// Notify website that NEXUS is available
const announceProvider = () => {
    window.dispatchEvent(new CustomEvent('nexus#initialized'));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announceProvider);
} else {
    announceProvider();
}