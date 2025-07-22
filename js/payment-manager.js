/**
 * NEXUS Payment Manager
 * Handles unified payment processing for wallet and Stripe payments
 */

class PaymentManager {
    constructor() {
        this.stripe = null;
        this.web3 = null;
        this.supportedCryptos = ['BTC', 'ETH', 'USDT', 'DOGE', 'TON'];
        this.paymentMethods = {
            WALLET: 'wallet',
            STRIPE: 'stripe'
        };
        
        this.init();
    }

    async init() {
        await this.initializeStripe();
        await this.initializeWeb3();
    }

    async initializeStripe() {
        if (typeof Stripe === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                this.stripe = Stripe(this.getStripePublicKey());
            };
            document.head.appendChild(script);
        } else {
            this.stripe = Stripe(this.getStripePublicKey());
        }
    }

    async initializeWeb3() {
        if (window.ethereum) {
            try {
                const Web3 = window.Web3 || await this.loadWeb3();
                this.web3 = new Web3(window.ethereum);
            } catch (error) {
                console.warn('Web3 initialization failed:', error);
            }
        }
    }

    getStripePublicKey() {
        return window.STRIPE_PUBLIC_KEY || 'pk_test_your_stripe_public_key_here';
    }

    async loadWeb3() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/web3@4.0.0/dist/web3.min.js';
            script.onload = () => resolve(window.Web3);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async processPayment(paymentData) {
        const { method, amount, currency, metadata = {} } = paymentData;

        try {
            switch (method) {
                case this.paymentMethods.WALLET:
                    return await this.processWalletPayment(amount, currency, metadata);
                case this.paymentMethods.STRIPE:
                    return await this.processStripePayment(amount, currency, metadata);
                default:
                    throw new Error('Unsupported payment method');
            }
        } catch (error) {
            console.error('Payment processing failed:', error);
            throw error;
        }
    }

    async processStripePayment(amount, currency, metadata) {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        const response = await fetch('/.netlify/functions/stripe-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency.toLowerCase(),
                metadata
            }),
        });

        const { clientSecret } = await response.json();

        const result = await this.stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: this.stripe.elements().getElement('card'),
                billing_details: {
                    name: metadata.customerName || 'Anonymous',
                    email: metadata.customerEmail
                }
            }
        });

        if (result.error) {
            throw new Error(result.error.message);
        }

        return {
            success: true,
            paymentId: result.paymentIntent.id,
            status: result.paymentIntent.status,
            method: 'stripe',
            amount,
            currency
        };
    }

    async processWalletPayment(amount, currency, metadata) {
        if (!this.supportedCryptos.includes(currency.toUpperCase())) {
            throw new Error(`Unsupported cryptocurrency: ${currency}`);
        }

        const walletType = await this.detectWalletType();
        
        switch (walletType) {
            case 'metamask':
                return await this.processMetaMaskPayment(amount, currency, metadata);
            case 'generated':
                return await this.processGeneratedWalletPayment(amount, currency, metadata);
            default:
                throw new Error('No wallet detected');
        }
    }

    async detectWalletType() {
        if (window.ethereum && window.ethereum.isMetaMask) {
            return 'metamask';
        }
        
        const generatedWallet = localStorage.getItem('nexus_wallet_data');
        if (generatedWallet) {
            return 'generated';
        }
        
        return null;
    }

    async processMetaMaskPayment(amount, currency, metadata) {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected');
        }

        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await this.web3.eth.getAccounts();
            const fromAddress = accounts[0];

            if (currency.toUpperCase() === 'ETH') {
                return await this.sendETHPayment(fromAddress, amount, metadata);
            } else {
                return await this.sendTokenPayment(fromAddress, amount, currency, metadata);
            }
        } catch (error) {
            throw new Error(`MetaMask payment failed: ${error.message}`);
        }
    }

    async sendETHPayment(fromAddress, amount, metadata) {
        const toAddress = this.getPaymentAddress('ETH');
        const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');

        const transactionHash = await this.web3.eth.sendTransaction({
            from: fromAddress,
            to: toAddress,
            value: amountWei,
            data: this.web3.utils.utf8ToHex(JSON.stringify(metadata))
        });

        return {
            success: true,
            paymentId: transactionHash,
            method: 'wallet',
            walletType: 'metamask',
            currency: 'ETH',
            amount,
            fromAddress,
            toAddress
        };
    }

    async sendTokenPayment(fromAddress, amount, tokenSymbol, metadata) {
        const tokenContract = this.getTokenContract(tokenSymbol);
        const toAddress = this.getPaymentAddress(tokenSymbol);
        const decimals = await tokenContract.methods.decimals().call();
        const amountWei = this.web3.utils.toBN(amount).mul(this.web3.utils.toBN(10).pow(this.web3.utils.toBN(decimals)));

        const transactionHash = await tokenContract.methods.transfer(toAddress, amountWei).send({
            from: fromAddress
        });

        return {
            success: true,
            paymentId: transactionHash,
            method: 'wallet',
            walletType: 'metamask',
            currency: tokenSymbol,
            amount,
            fromAddress,
            toAddress
        };
    }

    async processGeneratedWalletPayment(amount, currency, metadata) {
        const walletData = JSON.parse(localStorage.getItem('nexus_wallet_data'));
        if (!walletData || !walletData.privateKeys) {
            throw new Error('Generated wallet not found');
        }

        const currencyUpper = currency.toUpperCase();
        const privateKey = walletData.privateKeys[currencyUpper];
        
        if (!privateKey) {
            throw new Error(`Private key for ${currencyUpper} not found`);
        }

        switch (currencyUpper) {
            case 'ETH':
            case 'USDT':
                return await this.sendEthereumTransaction(privateKey, amount, currency, metadata);
            case 'BTC':
                return await this.sendBitcoinTransaction(privateKey, amount, metadata);
            case 'DOGE':
                return await this.sendDogecoinTransaction(privateKey, amount, metadata);
            default:
                throw new Error(`Unsupported currency: ${currency}`);
        }
    }

    async sendEthereumTransaction(privateKey, amount, currency, metadata) {
        const toAddress = this.getPaymentAddress(currency);
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        this.web3.eth.accounts.wallet.add(account);

        let transactionHash;
        
        if (currency.toUpperCase() === 'ETH') {
            const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');
            transactionHash = await this.web3.eth.sendTransaction({
                from: account.address,
                to: toAddress,
                value: amountWei,
                gas: 21000
            });
        } else {
            // ERC-20 token (e.g., USDT)
            const tokenContract = this.getTokenContract(currency);
            const decimals = await tokenContract.methods.decimals().call();
            const amountWei = this.web3.utils.toBN(amount).mul(this.web3.utils.toBN(10).pow(this.web3.utils.toBN(decimals)));
            
            transactionHash = await tokenContract.methods.transfer(toAddress, amountWei).send({
                from: account.address,
                gas: 65000
            });
        }

        return {
            success: true,
            paymentId: transactionHash,
            method: 'wallet',
            walletType: 'generated',
            currency: currency.toUpperCase(),
            amount,
            fromAddress: account.address,
            toAddress
        };
    }

    async sendBitcoinTransaction(privateKey, amount, metadata) {
        // This would require a Bitcoin library and API integration
        // For now, return a mock response - implement with bitcoinjs-lib
        throw new Error('Bitcoin payments not yet implemented - coming soon');
    }

    async sendDogecoinTransaction(privateKey, amount, metadata) {
        // This would require a Dogecoin library and API integration
        throw new Error('Dogecoin payments not yet implemented - coming soon');
    }

    getPaymentAddress(currency) {
        // Real payment addresses - Replace with your actual receiving addresses
        const addresses = {
            'ETH': '0x8ba1f109551bD432803012645Hac136c54c74c1a',
            'USDT': '0x8ba1f109551bD432803012645Hac136c54c74c1a', // Same as ETH for ERC-20 USDT
            'BTC': 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
            'DOGE': 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'
        };
        return addresses[currency.toUpperCase()] || addresses['ETH'];
    }

    getTokenContract(tokenSymbol) {
        const tokenAddresses = {
            'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7'
        };
        
        const tokenABI = [
            {
                "constant": false,
                "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
                "name": "transfer",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "type": "function"
            }
        ];

        return new this.web3.eth.Contract(tokenABI, tokenAddresses[tokenSymbol.toUpperCase()]);
    }

    createPaymentInterface(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID ${containerId} not found`);
        }

        const {
            amount,
            currency = 'USD',
            showWalletOption = true,
            showStripeOption = true,
            onPaymentSuccess = () => {},
            onPaymentError = () => {}
        } = options;

        container.innerHTML = this.generatePaymentHTML(amount, currency, showWalletOption, showStripeOption);
        
        this.bindPaymentEvents(container, { amount, currency, onPaymentSuccess, onPaymentError });
    }

    generatePaymentHTML(amount, currency, showWallet, showStripe) {
        return `
            <div class="nexus-payment-interface bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-xl font-bold mb-4">Complete Payment</h3>
                <div class="payment-amount mb-6">
                    <div class="text-2xl font-bold text-blue-600">${currency === 'USD' ? '$' : ''}${amount} ${currency !== 'USD' ? currency : ''}</div>
                </div>
                
                <div class="payment-methods">
                    ${showWallet ? `
                    <div class="payment-method mb-4">
                        <input type="radio" id="payment-wallet" name="paymentMethod" value="wallet" class="mr-2">
                        <label for="payment-wallet" class="text-lg font-medium">Pay with Cryptocurrency Wallet</label>
                        <div id="wallet-options" class="ml-6 mt-2 hidden">
                            <select id="crypto-currency" class="w-full p-2 border rounded">
                                <option value="ETH">Ethereum (ETH)</option>
                                <option value="USDT">Tether (USDT)</option>
                                <option value="BTC">Bitcoin (BTC)</option>
                                <option value="DOGE">Dogecoin (DOGE)</option>
                            </select>
                            <div class="mt-2 text-sm text-gray-600">
                                <div id="wallet-status">Detecting wallet...</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${showStripe ? `
                    <div class="payment-method mb-4">
                        <input type="radio" id="payment-stripe" name="paymentMethod" value="stripe" class="mr-2">
                        <label for="payment-stripe" class="text-lg font-medium">Pay with Credit Card</label>
                        <div id="stripe-elements" class="ml-6 mt-2 hidden">
                            <div id="card-element" class="p-3 border rounded"></div>
                            <div id="card-errors" class="text-red-500 text-sm mt-2"></div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <button id="submit-payment" class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50" disabled>
                    Complete Payment
                </button>
                
                <div id="payment-result" class="mt-4 hidden"></div>
            </div>
        `;
    }

    async bindPaymentEvents(container, options) {
        const { amount, currency, onPaymentSuccess, onPaymentError } = options;
        
        const walletRadio = container.querySelector('#payment-wallet');
        const stripeRadio = container.querySelector('#payment-stripe');
        const submitButton = container.querySelector('#submit-payment');
        const walletOptions = container.querySelector('#wallet-options');
        const stripeElements = container.querySelector('#stripe-elements');
        const walletStatus = container.querySelector('#wallet-status');

        if (walletRadio) {
            walletRadio.addEventListener('change', async () => {
                if (walletRadio.checked) {
                    walletOptions?.classList.remove('hidden');
                    stripeElements?.classList.add('hidden');
                    submitButton.disabled = false;
                    
                    const walletType = await this.detectWalletType();
                    if (walletStatus) {
                        walletStatus.textContent = walletType ? 
                            `${walletType === 'metamask' ? 'MetaMask' : 'Generated'} wallet detected` :
                            'No wallet detected';
                    }
                }
            });
        }

        if (stripeRadio) {
            stripeRadio.addEventListener('change', () => {
                if (stripeRadio.checked) {
                    stripeElements?.classList.remove('hidden');
                    walletOptions?.classList.add('hidden');
                    this.initializeStripeElements(container);
                    submitButton.disabled = false;
                }
            });
        }

        submitButton.addEventListener('click', async () => {
            const selectedMethod = container.querySelector('input[name="paymentMethod"]:checked')?.value;
            if (!selectedMethod) return;

            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            try {
                let result;
                
                if (selectedMethod === 'wallet') {
                    const cryptoCurrency = container.querySelector('#crypto-currency')?.value || currency;
                    result = await this.processPayment({
                        method: 'wallet',
                        amount,
                        currency: cryptoCurrency
                    });
                } else if (selectedMethod === 'stripe') {
                    result = await this.processPayment({
                        method: 'stripe',
                        amount,
                        currency
                    });
                }

                this.showPaymentResult(container, result, true);
                onPaymentSuccess(result);
                
            } catch (error) {
                this.showPaymentResult(container, { error: error.message }, false);
                onPaymentError(error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Complete Payment';
            }
        });
    }

    async initializeStripeElements(container) {
        if (!this.stripe) return;

        const elements = this.stripe.elements();
        const cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
            },
        });

        const cardElementDiv = container.querySelector('#card-element');
        if (cardElementDiv) {
            cardElement.mount('#card-element');
            
            cardElement.addEventListener('change', ({error}) => {
                const displayError = container.querySelector('#card-errors');
                if (error) {
                    displayError.textContent = error.message;
                } else {
                    displayError.textContent = '';
                }
            });
        }
    }

    showPaymentResult(container, result, success) {
        const resultDiv = container.querySelector('#payment-result');
        if (!resultDiv) return;

        resultDiv.classList.remove('hidden');
        
        if (success) {
            resultDiv.innerHTML = `
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    <strong>Payment Successful!</strong><br>
                    Payment ID: ${result.paymentId}<br>
                    Method: ${result.method}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Payment Failed!</strong><br>
                    ${result.error}
                </div>
            `;
        }
    }
}

// Initialize global payment manager
window.nexusPaymentManager = new PaymentManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}