/**
 * Bitorzo Market Data Service - Institutional-Grade Data Accuracy
 * Implements multiple data sources, validation, and self-healing mechanisms
 * Designed for 24/7 continuous operation without manual intervention
 */

import axios from 'axios';
import { EventEmitter } from 'events';

export class MarketDataService extends EventEmitter {
    constructor() {
        super();
        this.dataSources = new Map();
        this.cache = new Map();
        this.healthStatus = new Map();
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000
        };
        
        // Initialize data sources with priority order
        this.initializeDataSources();
        
        // Start continuous health monitoring
        this.startHealthMonitoring();
        
        // Start data validation pipeline
        this.startDataValidation();
        
        console.log('🚀 MarketDataService initialized - Continuous operation enabled');
    }

    initializeDataSources() {
        // Primary Exchange Sources (Real trading data)
        this.dataSources.set('binance', {
            priority: 1,
            endpoint: 'https://api.binance.com/api/v3/ticker/24hr',
            apiKey: null, // Public API
            rateLimit: 1200, // requests per minute
            lastCall: 0,
            reliability: 0.99,
            type: 'exchange',
            exchange: 'Binance'
        });

        this.dataSources.set('coinbase_pro', {
            priority: 2,
            endpoint: 'https://api.exchange.coinbase.com/products',
            apiKey: null, // Public API
            rateLimit: 600,
            lastCall: 0,
            reliability: 0.98,
            type: 'exchange',
            exchange: 'Coinbase Pro'
        });

        this.dataSources.set('kraken', {
            priority: 3,
            endpoint: 'https://api.kraken.com/0/public/Ticker',
            apiKey: null, // Public API
            rateLimit: 1000,
            lastCall: 0,
            reliability: 0.97,
            type: 'exchange',
            exchange: 'Kraken'
        });

        this.dataSources.set('kucoin', {
            priority: 4,
            endpoint: 'https://api.kucoin.com/api/v1/market/allTickers',
            apiKey: null, // Public API
            rateLimit: 600,
            lastCall: 0,
            reliability: 0.96,
            type: 'exchange',
            exchange: 'KuCoin'
        });

        this.dataSources.set('huobi', {
            priority: 5,
            endpoint: 'https://api.huobi.pro/market/tickers',
            apiKey: null, // Public API
            rateLimit: 600,
            lastCall: 0,
            reliability: 0.95,
            type: 'exchange',
            exchange: 'Huobi'
        });

        this.dataSources.set('okx', {
            priority: 6,
            endpoint: 'https://www.okx.com/api/v5/market/tickers',
            apiKey: null, // Public API
            rateLimit: 600,
            lastCall: 0,
            reliability: 0.94,
            type: 'exchange',
            exchange: 'OKX'
        });

        // Aggregator Sources (Backup & Validation)
        this.dataSources.set('coingecko', {
            priority: 7,
            endpoint: 'https://api.coingecko.com/api/v3/simple/price',
            apiKey: process.env.COINGECKO_API_KEY,
            rateLimit: 50, // Demo tier
            lastCall: 0,
            reliability: 0.95,
            type: 'aggregator',
            exchange: 'CoinGecko'
        });

        this.dataSources.set('coinmarketcap', {
            priority: 8,
            endpoint: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
            apiKey: process.env.CMC_API_KEY,
            rateLimit: 333,
            lastCall: 0,
            reliability: 0.97,
            type: 'aggregator',
            exchange: 'CoinMarketCap'
        });

        this.dataSources.set('cryptocompare', {
            priority: 9,
            endpoint: 'https://min-api.cryptocompare.com/data/pricemultifull',
            apiKey: process.env.CRYPTOCOMPARE_API_KEY,
            rateLimit: 300,
            lastCall: 0,
            reliability: 0.93,
            type: 'aggregator',
            exchange: 'CryptoCompare'
        });

        // Initialize health status for all sources
        for (const [source, config] of this.dataSources) {
            this.healthStatus.set(source, {
                status: 'unknown',
                lastCheck: 0,
                consecutiveFailures: 0,
                averageLatency: 0,
                uptime: 0,
                exchangeName: config.exchange
            });
        }
    }

    async fetchPriceData(symbols, options = {}) {
        const { 
            requireConsensus = true, 
            maxAge = 30000, // 30 seconds
            minSources = 2 
        } = options;

        try {
            // Check cache first
            const cacheKey = `prices_${symbols.join(',')}_${Date.now() - (Date.now() % maxAge)}`;
            if (this.cache.has(cacheKey) && !options.forceRefresh) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < maxAge) {
                    this.emit('data_served_from_cache', { symbols, source: 'cache' });
                    return cached.data;
                }
            }

            // Fetch from multiple sources simultaneously
            const sourceTasks = Array.from(this.dataSources.entries())
                .filter(([source, config]) => this.healthStatus.get(source).status !== 'down')
                .sort((a, b) => a[1].priority - b[1].priority)
                .map(([source, config]) => this.fetchFromSource(source, symbols));

            const results = await Promise.allSettled(sourceTasks);
            const validResults = results
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value);

            if (validResults.length < minSources) {
                throw new Error(`Insufficient data sources: ${validResults.length}/${minSources} required`);
            }

            // Validate and consolidate data
            const consolidatedData = this.consolidateData(validResults, symbols, requireConsensus);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: consolidatedData,
                timestamp: Date.now(),
                sources: validResults.map(r => r.source)
            });

            // Emit success event
            this.emit('data_fetched', {
                symbols,
                sources: validResults.length,
                latency: Date.now() - Date.now(),
                consensus: requireConsensus
            });

            return consolidatedData;

        } catch (error) {
            this.emit('fetch_error', { symbols, error: error.message });
            throw error;
        }
    }

    async fetchFromSource(sourceName, symbols) {
        const config = this.dataSources.get(sourceName);
        const health = this.healthStatus.get(sourceName);
        
        // Rate limiting check
        const timeSinceLastCall = Date.now() - config.lastCall;
        const minInterval = (3600000 / config.rateLimit); // ms between calls
        
        if (timeSinceLastCall < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
        }

        const startTime = Date.now();
        
        try {
            const data = await this.retryWithBackoff(async () => {
                return await this.callSourceAPI(sourceName, symbols);
            });

            // Update success metrics
            const latency = Date.now() - startTime;
            health.lastCheck = Date.now();
            health.consecutiveFailures = 0;
            health.averageLatency = (health.averageLatency + latency) / 2;
            health.status = 'healthy';
            
            config.lastCall = Date.now();

            return {
                source: sourceName,
                data: data,
                latency: latency,
                timestamp: Date.now()
            };

        } catch (error) {
            // Update failure metrics
            health.consecutiveFailures++;
            health.lastCheck = Date.now();
            
            if (health.consecutiveFailures >= 3) {
                health.status = 'down';
                this.emit('source_down', { source: sourceName, error: error.message });
            }

            throw error;
        }
    }

    async callSourceAPI(sourceName, symbols) {
        const config = this.dataSources.get(sourceName);
        const headers = {
            'User-Agent': 'Bitorzo-Analytics/1.0'
        };
        
        if (config.apiKey) {
            headers['X-API-Key'] = config.apiKey;
        }

        switch (sourceName) {
            case 'binance':
                return await this.fetchBinanceData(symbols, headers);
            
            case 'coinbase_pro':
                return await this.fetchCoinbaseProData(symbols, headers);
            
            case 'kraken':
                return await this.fetchKrakenData(symbols, headers);
            
            case 'kucoin':
                return await this.fetchKucoinData(symbols, headers);
            
            case 'huobi':
                return await this.fetchHuobiData(symbols, headers);
            
            case 'okx':
                return await this.fetchOKXData(symbols, headers);
            
            case 'coingecko':
                return await this.fetchCoingeckoData(symbols, headers);
            
            case 'coinmarketcap':
                return await this.fetchCMCData(symbols, headers);
            
            case 'cryptocompare':
                return await this.fetchCryptoCompareData(symbols, headers);
            
            default:
                throw new Error(`Unknown data source: ${sourceName}`);
        }
    }

    async fetchCoinbaseData(symbols, headers) {
        const response = await axios.get(
            'https://api.coinbase.com/v2/exchange-rates?currency=USD',
            { headers, timeout: 5000 }
        );
        
        const rates = response.data.data.rates;
        const result = {};
        
        for (const symbol of symbols) {
            if (rates[symbol]) {
                result[symbol] = {
                    price: parseFloat(rates[symbol]),
                    volume_24h: null, // Coinbase doesn't provide volume in this endpoint
                    market_cap: null,
                    last_updated: new Date().toISOString()
                };
            }
        }
        
        return result;
    }

    async fetchBinanceData(symbols, headers) {
        try {
            // Fetch all tickers at once for efficiency
            const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', { 
                headers, 
                timeout: 10000 
            });
            
            const result = {};
            const tickers = response.data;
            
            for (const symbol of symbols) {
                const ticker = tickers.find(t => 
                    t.symbol === `${symbol}USDT` || 
                    t.symbol === `${symbol}BUSD` ||
                    t.symbol === `${symbol}BTC`
                );
                
                if (ticker) {
                    let price = parseFloat(ticker.lastPrice);
                    
                    // Convert BTC pairs to USD
                    if (ticker.symbol.endsWith('BTC')) {
                        const btcTicker = tickers.find(t => t.symbol === 'BTCUSDT');
                        if (btcTicker) {
                            price = price * parseFloat(btcTicker.lastPrice);
                        }
                    }
                    
                    result[symbol] = {
                        price: price,
                        volume_24h: parseFloat(ticker.volume),
                        price_change_24h: parseFloat(ticker.priceChangePercent),
                        high_24h: parseFloat(ticker.highPrice),
                        low_24h: parseFloat(ticker.lowPrice),
                        last_updated: new Date().toISOString(),
                        exchange: 'Binance'
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.warn('Binance API error:', error.message);
            return {};
        }
    }

    async fetchCoinbaseProData(symbols, headers) {
        try {
            const result = {};
            
            for (const symbol of symbols) {
                try {
                    const productId = `${symbol}-USD`;
                    const [statsResponse, tickerResponse] = await Promise.all([
                        axios.get(`https://api.exchange.coinbase.com/products/${productId}/stats`, { headers, timeout: 5000 }),
                        axios.get(`https://api.exchange.coinbase.com/products/${productId}/ticker`, { headers, timeout: 5000 })
                    ]);
                    
                    const stats = statsResponse.data;
                    const ticker = tickerResponse.data;
                    
                    result[symbol] = {
                        price: parseFloat(ticker.price),
                        volume_24h: parseFloat(stats.volume),
                        high_24h: parseFloat(stats.high),
                        low_24h: parseFloat(stats.low),
                        last_updated: new Date().toISOString(),
                        exchange: 'Coinbase Pro'
                    };
                } catch (error) {
                    console.warn(`Coinbase Pro: Failed to fetch ${symbol}:`, error.message);
                }
            }
            
            return result;
        } catch (error) {
            console.warn('Coinbase Pro API error:', error.message);
            return {};
        }
    }

    async fetchKrakenData(symbols, headers) {
        try {
            const pairs = symbols.map(s => `X${s}ZUSD`).join(',');
            const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${pairs}`, { 
                headers, 
                timeout: 10000 
            });
            
            const result = {};
            const data = response.data.result;
            
            for (const symbol of symbols) {
                const pairKey = Object.keys(data).find(key => 
                    key.includes(symbol) || key.includes(`X${symbol}`)
                );
                
                if (pairKey && data[pairKey]) {
                    const ticker = data[pairKey];
                    result[symbol] = {
                        price: parseFloat(ticker.c[0]), // Last trade price
                        volume_24h: parseFloat(ticker.v[1]), // 24h volume
                        high_24h: parseFloat(ticker.h[1]), // 24h high
                        low_24h: parseFloat(ticker.l[1]), // 24h low
                        last_updated: new Date().toISOString(),
                        exchange: 'Kraken'
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.warn('Kraken API error:', error.message);
            return {};
        }
    }

    async fetchKucoinData(symbols, headers) {
        try {
            const response = await axios.get('https://api.kucoin.com/api/v1/market/allTickers', { 
                headers, 
                timeout: 10000 
            });
            
            const result = {};
            const tickers = response.data.data.ticker;
            
            for (const symbol of symbols) {
                const ticker = tickers.find(t => 
                    t.symbol === `${symbol}-USDT` || 
                    t.symbol === `${symbol}-USD`
                );
                
                if (ticker) {
                    result[symbol] = {
                        price: parseFloat(ticker.last),
                        volume_24h: parseFloat(ticker.volValue), // Volume in USD
                        price_change_24h: parseFloat(ticker.changeRate) * 100,
                        high_24h: parseFloat(ticker.high),
                        low_24h: parseFloat(ticker.low),
                        last_updated: new Date().toISOString(),
                        exchange: 'KuCoin'
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.warn('KuCoin API error:', error.message);
            return {};
        }
    }

    async fetchHuobiData(symbols, headers) {
        try {
            const response = await axios.get('https://api.huobi.pro/market/tickers', { 
                headers, 
                timeout: 10000 
            });
            
            const result = {};
            const tickers = response.data.data;
            
            for (const symbol of symbols) {
                const ticker = tickers.find(t => 
                    t.symbol === `${symbol.toLowerCase()}usdt` || 
                    t.symbol === `${symbol.toLowerCase()}usd`
                );
                
                if (ticker) {
                    result[symbol] = {
                        price: parseFloat(ticker.close),
                        volume_24h: parseFloat(ticker.vol),
                        high_24h: parseFloat(ticker.high),
                        low_24h: parseFloat(ticker.low),
                        last_updated: new Date().toISOString(),
                        exchange: 'Huobi'
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.warn('Huobi API error:', error.message);
            return {};
        }
    }

    async fetchOKXData(symbols, headers) {
        try {
            const response = await axios.get('https://www.okx.com/api/v5/market/tickers?instType=SPOT', { 
                headers, 
                timeout: 10000 
            });
            
            const result = {};
            const tickers = response.data.data;
            
            for (const symbol of symbols) {
                const ticker = tickers.find(t => 
                    t.instId === `${symbol}-USDT` || 
                    t.instId === `${symbol}-USD`
                );
                
                if (ticker) {
                    result[symbol] = {
                        price: parseFloat(ticker.last),
                        volume_24h: parseFloat(ticker.volCcy24h), // Volume in quote currency
                        price_change_24h: parseFloat(ticker.chgUtc8) * 100,
                        high_24h: parseFloat(ticker.high24h),
                        low_24h: parseFloat(ticker.low24h),
                        last_updated: new Date().toISOString(),
                        exchange: 'OKX'
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.warn('OKX API error:', error.message);
            return {};
        }
    }

    async fetchCryptoCompareData(symbols, headers) {
        try {
            const symbolsParam = symbols.join(',');
            const response = await axios.get(
                `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbolsParam}&tsyms=USD`,
                { headers, timeout: 10000 }
            );
            
            const result = {};
            const data = response.data.RAW;
            
            for (const symbol of symbols) {
                if (data[symbol] && data[symbol].USD) {
                    const info = data[symbol].USD;
                    result[symbol] = {
                        price: parseFloat(info.PRICE),
                        volume_24h: parseFloat(info.TOTALVOLUME24HTO),
                        price_change_24h: parseFloat(info.CHANGEPCT24HOUR),
                        high_24h: parseFloat(info.HIGH24HOUR),
                        low_24h: parseFloat(info.LOW24HOUR),
                        market_cap: parseFloat(info.MKTCAP),
                        last_updated: new Date().toISOString(),
                        exchange: 'CryptoCompare'
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.warn('CryptoCompare API error:', error.message);
            return {};
        }
    }

    async fetchCoingeckoData(symbols, headers) {
        const ids = symbols.map(s => s.toLowerCase()).join(',');
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`,
            { headers, timeout: 5000 }
        );
        
        const result = {};
        for (const [id, data] of Object.entries(response.data)) {
            const symbol = id.toUpperCase();
            result[symbol] = {
                price: data.usd,
                volume_24h: data.usd_24h_vol,
                price_change_24h: data.usd_24h_change,
                market_cap: data.usd_market_cap,
                last_updated: new Date().toISOString()
            };
        }
        
        return result;
    }

    async fetchCMCData(symbols, headers) {
        const symbolsParam = symbols.join(',');
        const response = await axios.get(
            `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbolsParam}`,
            { headers, timeout: 5000 }
        );
        
        const result = {};
        for (const [symbol, data] of Object.entries(response.data.data)) {
            result[symbol] = {
                price: data.quote.USD.price,
                volume_24h: data.quote.USD.volume_24h,
                price_change_24h: data.quote.USD.percent_change_24h,
                market_cap: data.quote.USD.market_cap,
                last_updated: data.last_updated
            };
        }
        
        return result;
    }

    async fetchAlphaVantageData(symbols, headers) {
        const result = {};
        
        // Alpha Vantage is for traditional assets, not crypto
        // This is a placeholder for future RWA integration
        for (const symbol of symbols) {
            if (['AAPL', 'GOOGL', 'TSLA', 'MSFT'].includes(symbol)) {
                const response = await axios.get(
                    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.dataSources.get('alphavantage').apiKey}`,
                    { headers, timeout: 10000 }
                );
                
                const quote = response.data['Global Quote'];
                if (quote) {
                    result[symbol] = {
                        price: parseFloat(quote['05. price']),
                        volume_24h: parseFloat(quote['06. volume']),
                        price_change_24h: parseFloat(quote['09. change']),
                        last_updated: quote['07. latest trading day']
                    };
                }
            }
        }
        
        return result;
    }

    consolidateData(results, symbols, requireConsensus) {
        const consolidated = {};
        
        for (const symbol of symbols) {
            const symbolData = [];
            
            // Collect all price data for this symbol
            for (const result of results) {
                if (result.data[symbol]) {
                    symbolData.push({
                        ...result.data[symbol],
                        source: result.source,
                        latency: result.latency
                    });
                }
            }
            
            if (symbolData.length === 0) {
                continue; // Skip symbols with no data
            }
            
            // Data validation and consensus
            const prices = symbolData.map(d => d.price).filter(p => p > 0);
            
            if (prices.length === 0) {
                continue;
            }
            
            // Calculate price statistics
            const median = this.calculateMedian(prices);
            const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
            const stdDev = this.calculateStandardDeviation(prices, mean);
            const outlierThreshold = 0.05; // 5% deviation threshold
            
            // Remove outliers
            const validPrices = prices.filter(p => Math.abs(p - median) / median < outlierThreshold);
            
            if (requireConsensus && validPrices.length < 2) {
                this.emit('consensus_failed', { 
                    symbol, 
                    validSources: validPrices.length,
                    totalSources: prices.length 
                });
                continue;
            }
            
            // Use median of valid prices for final value
            const finalPrice = this.calculateMedian(validPrices);
            
            // Aggregate other metrics
            const volumes = symbolData.map(d => d.volume_24h).filter(v => v && v > 0);
            const marketCaps = symbolData.map(d => d.market_cap).filter(m => m && m > 0);
            const priceChanges = symbolData.map(d => d.price_change_24h).filter(p => p !== null && p !== undefined);
            
            // Aggregate exchange prices for transparency
            const exchangePrices = symbolData.map(d => ({
                exchange: d.exchange || 'Unknown',
                price: d.price,
                volume: d.volume_24h,
                source: d.source
            })).sort((a, b) => b.volume - a.volume);

            consolidated[symbol] = {
                price: finalPrice,
                volume_24h: volumes.length > 0 ? this.calculateMedian(volumes) : null,
                market_cap: marketCaps.length > 0 ? this.calculateMedian(marketCaps) : null,
                price_change_24h: priceChanges.length > 0 ? this.calculateMedian(priceChanges) : null,
                high_24h: symbolData.map(d => d.high_24h).filter(h => h).length > 0 ? 
                    Math.max(...symbolData.map(d => d.high_24h).filter(h => h)) : null,
                low_24h: symbolData.map(d => d.low_24h).filter(l => l).length > 0 ? 
                    Math.min(...symbolData.map(d => d.low_24h).filter(l => l)) : null,
                exchange_prices: exchangePrices,
                price_range: {
                    min: Math.min(...validPrices),
                    max: Math.max(...validPrices),
                    spread_percentage: ((Math.max(...validPrices) - Math.min(...validPrices)) / finalPrice) * 100
                },
                data_quality: {
                    sources_count: symbolData.length,
                    consensus_reached: validPrices.length >= 2,
                    price_deviation: stdDev / mean,
                    outliers_removed: prices.length - validPrices.length,
                    confidence_score: Math.min(95, 60 + (validPrices.length * 7)) // Max 95% confidence
                },
                last_updated: new Date().toISOString(),
                sources: symbolData.map(d => d.source)
            };
        }
        
        return consolidated;
    }

    async retryWithBackoff(fn, attempt = 1) {
        try {
            return await fn();
        } catch (error) {
            if (attempt >= this.retryConfig.maxRetries) {
                throw error;
            }
            
            const delay = Math.min(
                this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
                this.retryConfig.maxDelay
            );
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.retryWithBackoff(fn, attempt + 1);
        }
    }

    startHealthMonitoring() {
        // Health check every 60 seconds
        setInterval(async () => {
            await this.performHealthChecks();
        }, 60000);
        
        // Self-healing every 5 minutes
        setInterval(async () => {
            await this.performSelfHealing();
        }, 300000);
    }

    async performHealthChecks() {
        const healthPromises = Array.from(this.dataSources.keys()).map(async (source) => {
            try {
                const startTime = Date.now();
                await this.callSourceAPI(source, ['BTC']); // Test with BTC
                const latency = Date.now() - startTime;
                
                const health = this.healthStatus.get(source);
                health.status = 'healthy';
                health.lastCheck = Date.now();
                health.averageLatency = (health.averageLatency + latency) / 2;
                
            } catch (error) {
                const health = this.healthStatus.get(source);
                health.consecutiveFailures++;
                health.lastCheck = Date.now();
                
                if (health.consecutiveFailures >= 3) {
                    health.status = 'down';
                }
            }
        });
        
        await Promise.allSettled(healthPromises);
        
        // Emit health status
        this.emit('health_check_complete', {
            timestamp: Date.now(),
            sources: Object.fromEntries(this.healthStatus)
        });
    }

    async performSelfHealing() {
        let healingActions = 0;
        
        for (const [source, health] of this.healthStatus) {
            if (health.status === 'down' && health.consecutiveFailures >= 5) {
                // Attempt to recover source
                try {
                    await this.callSourceAPI(source, ['BTC']);
                    health.status = 'recovering';
                    health.consecutiveFailures = Math.floor(health.consecutiveFailures / 2);
                    healingActions++;
                    
                    this.emit('source_recovering', { source });
                } catch (error) {
                    // Still down, consider alternative actions
                    this.emit('source_recovery_failed', { source, error: error.message });
                }
            }
        }
        
        // Cache cleanup
        this.cleanupCache();
        
        this.emit('self_healing_complete', {
            timestamp: Date.now(),
            actions_taken: healingActions,
            cache_cleaned: true
        });
    }

    cleanupCache() {
        const maxAge = 300000; // 5 minutes
        const now = Date.now();
        
        for (const [key, value] of this.cache) {
            if (now - value.timestamp > maxAge) {
                this.cache.delete(key);
            }
        }
    }

    startDataValidation() {
        // Validate data integrity every 30 seconds
        setInterval(() => {
            this.validateDataIntegrity();
        }, 30000);
    }

    validateDataIntegrity() {
        const validationResults = {
            timestamp: Date.now(),
            checks: [],
            errors: [],
            warnings: []
        };
        
        // Check cache consistency
        for (const [key, value] of this.cache) {
            if (!value.data || !value.timestamp) {
                validationResults.errors.push(`Invalid cache entry: ${key}`);
                this.cache.delete(key);
            }
        }
        
        // Check source reliability
        for (const [source, health] of this.healthStatus) {
            const uptime = health.consecutiveFailures === 0 ? 1 : 0.5;
            
            if (uptime < 0.8) {
                validationResults.warnings.push(`Low reliability for source: ${source}`);
            }
        }
        
        this.emit('data_validation_complete', validationResults);
    }

    // Utility functions
    calculateMedian(numbers) {
        const sorted = numbers.sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        
        return sorted[middle];
    }

    calculateStandardDeviation(numbers, mean) {
        const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
        return Math.sqrt(avgSquareDiff);
    }

    // Public API
    getHealthStatus() {
        return Object.fromEntries(this.healthStatus);
    }

    getDataSources() {
        return Array.from(this.dataSources.keys());
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            oldest: Math.min(...Array.from(this.cache.values()).map(v => v.timestamp)),
            newest: Math.max(...Array.from(this.cache.values()).map(v => v.timestamp))
        };
    }
}

// Export singleton instance for global use
export const marketDataService = new MarketDataService();
export default MarketDataService;