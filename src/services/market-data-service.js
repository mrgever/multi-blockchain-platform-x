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
        // Primary Sources (Institutional Grade)
        this.dataSources.set('coinbase', {
            priority: 1,
            endpoint: 'https://api.coinbase.com/v2/exchange-rates',
            apiKey: process.env.COINBASE_API_KEY,
            rateLimit: 10000, // requests per hour
            lastCall: 0,
            reliability: 0.99,
            type: 'primary'
        });

        this.dataSources.set('binance', {
            priority: 2,
            endpoint: 'https://api.binance.com/api/v3/ticker/price',
            apiKey: process.env.BINANCE_API_KEY,
            rateLimit: 6000,
            lastCall: 0,
            reliability: 0.98,
            type: 'primary'
        });

        // Secondary Sources (Backup & Validation)
        this.dataSources.set('coingecko', {
            priority: 3,
            endpoint: 'https://api.coingecko.com/api/v3/simple/price',
            apiKey: process.env.COINGECKO_API_KEY,
            rateLimit: 50, // Demo tier
            lastCall: 0,
            reliability: 0.95,
            type: 'secondary'
        });

        this.dataSources.set('coinmarketcap', {
            priority: 4,
            endpoint: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
            apiKey: process.env.CMC_API_KEY,
            rateLimit: 333,
            lastCall: 0,
            reliability: 0.97,
            type: 'secondary'
        });

        // Real-World Asset Sources (Future Integration)
        this.dataSources.set('alphavantage', {
            priority: 5,
            endpoint: 'https://www.alphavantage.co/query',
            apiKey: process.env.ALPHA_VANTAGE_API_KEY,
            rateLimit: 5, // Free tier
            lastCall: 0,
            reliability: 0.94,
            type: 'rwa'
        });

        // Initialize health status for all sources
        for (const [source, config] of this.dataSources) {
            this.healthStatus.set(source, {
                status: 'unknown',
                lastCheck: 0,
                consecutiveFailures: 0,
                averageLatency: 0,
                uptime: 0
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
        const headers = {};
        
        if (config.apiKey) {
            headers['X-API-Key'] = config.apiKey;
        }

        switch (sourceName) {
            case 'coinbase':
                return await this.fetchCoinbaseData(symbols, headers);
            
            case 'binance':
                return await this.fetchBinanceData(symbols, headers);
            
            case 'coingecko':
                return await this.fetchCoingeckoData(symbols, headers);
            
            case 'coinmarketcap':
                return await this.fetchCMCData(symbols, headers);
            
            case 'alphavantage':
                return await this.fetchAlphaVantageData(symbols, headers);
            
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
        const result = {};
        
        for (const symbol of symbols) {
            try {
                const ticker = `${symbol}USDT`;
                const [priceResponse, volumeResponse] = await Promise.all([
                    axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`, { headers, timeout: 5000 }),
                    axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${ticker}`, { headers, timeout: 5000 })
                ]);
                
                result[symbol] = {
                    price: parseFloat(priceResponse.data.price),
                    volume_24h: parseFloat(volumeResponse.data.volume),
                    price_change_24h: parseFloat(volumeResponse.data.priceChangePercent),
                    last_updated: new Date().toISOString()
                };
            } catch (error) {
                // Continue with other symbols if one fails
                console.warn(`Binance: Failed to fetch ${symbol}:`, error.message);
            }
        }
        
        return result;
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
            
            consolidated[symbol] = {
                price: finalPrice,
                volume_24h: volumes.length > 0 ? this.calculateMedian(volumes) : null,
                market_cap: marketCaps.length > 0 ? this.calculateMedian(marketCaps) : null,
                price_change_24h: priceChanges.length > 0 ? this.calculateMedian(priceChanges) : null,
                data_quality: {
                    sources_count: symbolData.length,
                    consensus_reached: validPrices.length >= 2,
                    price_deviation: stdDev / mean,
                    outliers_removed: prices.length - validPrices.length
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