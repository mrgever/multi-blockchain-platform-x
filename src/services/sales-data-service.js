/**
 * Sales Data Service - Advanced Market Intelligence
 * Provides comprehensive sales information, order book analysis, and market insights
 * Integrates with multiple exchanges for real-time data aggregation
 */

import { EventEmitter } from 'events';
import { MarketDataService } from './market-data-service.js';

export class SalesDataService extends EventEmitter {
    constructor() {
        super();
        this.marketDataService = new MarketDataService();
        this.orderBookData = new Map();
        this.tradeStreams = new Map();
        this.exchangeWebSockets = new Map();
        this.historicalData = new Map();
        this.isRealTimeActive = false;
        
        this.exchangeConfigs = {
            binance: {
                websocket: 'wss://stream.binance.com:9443/ws/',
                orderBookEndpoint: 'https://api.binance.com/api/v3/depth',
                tradesEndpoint: 'https://api.binance.com/api/v3/trades',
                historicalEndpoint: 'https://api.binance.com/api/v3/klines',
                priority: 1,
                reliability: 0.99
            },
            coinbase: {
                websocket: 'wss://ws-feed.exchange.coinbase.com',
                orderBookEndpoint: 'https://api.exchange.coinbase.com/products/{symbol}/book',
                tradesEndpoint: 'https://api.exchange.coinbase.com/products/{symbol}/trades',
                historicalEndpoint: 'https://api.exchange.coinbase.com/products/{symbol}/candles',
                priority: 2,
                reliability: 0.98
            },
            kraken: {
                websocket: 'wss://ws.kraken.com',
                orderBookEndpoint: 'https://api.kraken.com/0/public/Depth',
                tradesEndpoint: 'https://api.kraken.com/0/public/Trades',
                historicalEndpoint: 'https://api.kraken.com/0/public/OHLC',
                priority: 3,
                reliability: 0.97
            },
            bybit: {
                websocket: 'wss://stream.bybit.com/realtime_public',
                orderBookEndpoint: 'https://api.bybit.com/v5/market/orderbook',
                tradesEndpoint: 'https://api.bybit.com/v5/market/recent-trade',
                historicalEndpoint: 'https://api.bybit.com/v5/market/kline',
                priority: 4,
                reliability: 0.96
            },
            okx: {
                websocket: 'wss://ws.okx.com:8443/ws/v5/public',
                orderBookEndpoint: 'https://www.okx.com/api/v5/market/books',
                tradesEndpoint: 'https://www.okx.com/api/v5/market/trades',
                historicalEndpoint: 'https://www.okx.com/api/v5/market/candles',
                priority: 5,
                reliability: 0.95
            },
            kucoin: {
                websocket: 'wss://ws-api.kucoin.com/endpoint',
                orderBookEndpoint: 'https://api.kucoin.com/api/v3/market/orderbook/level2',
                tradesEndpoint: 'https://api.kucoin.com/api/v1/market/histories',
                historicalEndpoint: 'https://api.kucoin.com/api/v1/market/candles',
                priority: 6,
                reliability: 0.94
            },
            bitfinex: {
                websocket: 'wss://api-pub.bitfinex.com/ws/2',
                orderBookEndpoint: 'https://api-pub.bitfinex.com/v2/book/{symbol}/P0',
                tradesEndpoint: 'https://api-pub.bitfinex.com/v2/trades/{symbol}/hist',
                historicalEndpoint: 'https://api-pub.bitfinex.com/v2/candles/trade:{timeframe}:{symbol}/hist',
                priority: 7,
                reliability: 0.93
            }
        };
        
        this.initialize();
    }

    async initialize() {
        console.log('🚀 Initializing Sales Data Service...');
        
        // Setup market data service listeners
        this.marketDataService.on('data_fetched', (data) => {
            this.processMarketData(data);
        });

        this.marketDataService.on('source_down', (data) => {
            this.handleExchangeDown(data.source);
        });

        console.log('✅ Sales Data Service initialized');
    }

    async startRealTimeDataStreams(symbols = ['BTC', 'ETH', 'BNB']) {
        if (this.isRealTimeActive) {
            console.log('⚠️ Real-time streams already active');
            return;
        }

        console.log('🔄 Starting real-time data streams...');
        this.isRealTimeActive = true;

        for (const symbol of symbols) {
            await this.startOrderBookStream(symbol);
            await this.startTradeStream(symbol);
        }

        // Setup periodic order book snapshots
        this.orderBookInterval = setInterval(() => {
            this.captureOrderBookSnapshots(symbols);
        }, 10000); // Every 10 seconds

        this.emit('realtime_started', { symbols, timestamp: Date.now() });
    }

    async startOrderBookStream(symbol) {
        console.log(`📊 Starting order book stream for ${symbol}...`);
        
        for (const [exchange, config] of Object.entries(this.exchangeConfigs)) {
            try {
                await this.connectOrderBookWebSocket(exchange, symbol, config);
            } catch (error) {
                console.error(`Failed to connect to ${exchange} order book for ${symbol}:`, error);
            }
        }
    }

    async connectOrderBookWebSocket(exchange, symbol, config) {
        const wsKey = `${exchange}_${symbol}_orderbook`;
        
        if (this.exchangeWebSockets.has(wsKey)) {
            return; // Already connected
        }

        try {
            let ws;
            let subscribeMessage;

            switch (exchange) {
                case 'binance':
                    const streamName = `${symbol.toLowerCase()}usdt@depth20@100ms`;
                    ws = new WebSocket(`${config.websocket}${streamName}`);
                    break;

                case 'coinbase':
                    ws = new WebSocket(config.websocket);
                    subscribeMessage = {
                        type: 'subscribe',
                        product_ids: [`${symbol}-USD`],
                        channels: ['level2']
                    };
                    break;

                case 'kraken':
                    ws = new WebSocket(config.websocket);
                    subscribeMessage = {
                        event: 'subscribe',
                        pair: [`${symbol}/USD`],
                        subscription: { name: 'book', depth: 25 }
                    };
                    break;
            }

            ws.onopen = () => {
                console.log(`✅ Connected to ${exchange} order book WebSocket for ${symbol}`);
                if (subscribeMessage) {
                    ws.send(JSON.stringify(subscribeMessage));
                }
            };

            ws.onmessage = (event) => {
                this.handleOrderBookMessage(exchange, symbol, JSON.parse(event.data));
            };

            ws.onerror = (error) => {
                console.error(`❌ ${exchange} WebSocket error for ${symbol}:`, error);
            };

            ws.onclose = () => {
                console.log(`🔌 ${exchange} WebSocket closed for ${symbol}`);
                this.exchangeWebSockets.delete(wsKey);
                
                // Attempt reconnection after 5 seconds
                setTimeout(() => {
                    this.connectOrderBookWebSocket(exchange, symbol, config);
                }, 5000);
            };

            this.exchangeWebSockets.set(wsKey, ws);

        } catch (error) {
            console.error(`Failed to setup ${exchange} WebSocket for ${symbol}:`, error);
        }
    }

    handleOrderBookMessage(exchange, symbol, data) {
        try {
            const processedData = this.normalizeOrderBookData(exchange, symbol, data);
            if (processedData) {
                this.updateOrderBook(exchange, symbol, processedData);
                this.emit('orderbook_updated', {
                    exchange,
                    symbol,
                    data: processedData,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error(`Error processing order book data from ${exchange}:`, error);
        }
    }

    normalizeOrderBookData(exchange, symbol, rawData) {
        switch (exchange) {
            case 'binance':
                if (rawData.bids && rawData.asks) {
                    return {
                        bids: rawData.bids.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        asks: rawData.asks.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        exchange: 'Binance',
                        symbol,
                        timestamp: Date.now()
                    };
                }
                break;

            case 'coinbase':
                if (rawData.type === 'snapshot' && rawData.bids && rawData.asks) {
                    return {
                        bids: rawData.bids.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        asks: rawData.asks.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        exchange: 'Coinbase Pro',
                        symbol,
                        timestamp: Date.now()
                    };
                }
                break;

            case 'kraken':
                if (Array.isArray(rawData) && rawData[1] && (rawData[1].bs || rawData[1].as)) {
                    const bookData = rawData[1];
                    return {
                        bids: Object.entries(bookData.bs || bookData.b || {}).map(([price, [quantity]]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        asks: Object.entries(bookData.as || bookData.a || {}).map(([price, [quantity]]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        exchange: 'Kraken',
                        symbol,
                        timestamp: Date.now()
                    };
                }
                break;

            case 'bybit':
                if (rawData.b && rawData.a) {
                    return {
                        bids: rawData.b.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        asks: rawData.a.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        exchange: 'Bybit',
                        symbol,
                        timestamp: Date.now()
                    };
                }
                break;

            case 'okx':
                if (rawData.bids && rawData.asks) {
                    return {
                        bids: rawData.bids.map(bid => ({
                            price: parseFloat(bid[0]),
                            quantity: parseFloat(bid[1]),
                            total: parseFloat(bid[0]) * parseFloat(bid[1])
                        })),
                        asks: rawData.asks.map(ask => ({
                            price: parseFloat(ask[0]),
                            quantity: parseFloat(ask[1]),
                            total: parseFloat(ask[0]) * parseFloat(ask[1])
                        })),
                        exchange: 'OKX',
                        symbol,
                        timestamp: Date.now()
                    };
                }
                break;

            case 'kucoin':
                if (rawData.bids && rawData.asks) {
                    return {
                        bids: rawData.bids.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        asks: rawData.asks.map(([price, quantity]) => ({
                            price: parseFloat(price),
                            quantity: parseFloat(quantity),
                            total: parseFloat(price) * parseFloat(quantity)
                        })),
                        exchange: 'KuCoin',
                        symbol,
                        timestamp: Date.now()
                    };
                }
                break;

            case 'bitfinex':
                if (Array.isArray(rawData)) {
                    const bids = rawData.filter(order => order[2] > 0);
                    const asks = rawData.filter(order => order[2] < 0);
                    
                    return {
                        bids: bids.map(([price, count, amount]) => ({
                            price: parseFloat(price),
                            quantity: Math.abs(parseFloat(amount)),
                            total: parseFloat(price) * Math.abs(parseFloat(amount))
                        })),
                        asks: asks.map(([price, count, amount]) => ({
                            price: parseFloat(price),
                            quantity: Math.abs(parseFloat(amount)),
                            total: parseFloat(price) * Math.abs(parseFloat(amount))
                        })),
                        exchange: 'Bitfinex',
                        symbol,
                        timestamp: Date.now()
                    };
                }
                break;
        }

        return null;
    }

    updateOrderBook(exchange, symbol, data) {
        const key = `${exchange}_${symbol}`;
        this.orderBookData.set(key, {
            ...data,
            lastUpdate: Date.now()
        });

        // Calculate derived metrics
        this.calculateOrderBookMetrics(key, data);
    }

    calculateOrderBookMetrics(key, data) {
        if (!data.bids?.length || !data.asks?.length) return;

        const bestBid = data.bids[0];
        const bestAsk = data.asks[0];
        
        const metrics = {
            spread: bestAsk.price - bestBid.price,
            spreadPercentage: ((bestAsk.price - bestBid.price) / bestAsk.price) * 100,
            midPrice: (bestBid.price + bestAsk.price) / 2,
            bidDepth: data.bids.reduce((sum, bid) => sum + bid.total, 0),
            askDepth: data.asks.reduce((sum, ask) => sum + ask.total, 0),
            imbalance: 0,
            liquidityScore: 0
        };

        // Calculate order book imbalance
        const totalBidVolume = data.bids.reduce((sum, bid) => sum + bid.quantity, 0);
        const totalAskVolume = data.asks.reduce((sum, ask) => sum + ask.quantity, 0);
        metrics.imbalance = (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);

        // Calculate liquidity score (higher is more liquid)
        const top5BidDepth = data.bids.slice(0, 5).reduce((sum, bid) => sum + bid.total, 0);
        const top5AskDepth = data.asks.slice(0, 5).reduce((sum, ask) => sum + ask.total, 0);
        metrics.liquidityScore = Math.min(top5BidDepth, top5AskDepth) / 1000; // Normalized

        // Store metrics
        const existingData = this.orderBookData.get(key);
        this.orderBookData.set(key, {
            ...existingData,
            metrics,
            lastMetricsUpdate: Date.now()
        });

        this.emit('metrics_calculated', {
            exchange: data.exchange,
            symbol: data.symbol,
            metrics,
            timestamp: Date.now()
        });
    }

    async startTradeStream(symbol) {
        console.log(`💱 Starting trade stream for ${symbol}...`);
        
        // Similar implementation to order book streams but for trade data
        // This would track individual trades and volume patterns
        
        for (const [exchange, config] of Object.entries(this.exchangeConfigs)) {
            try {
                await this.connectTradeWebSocket(exchange, symbol, config);
            } catch (error) {
                console.error(`Failed to connect to ${exchange} trades for ${symbol}:`, error);
            }
        }
    }

    async connectTradeWebSocket(exchange, symbol, config) {
        // Implementation for trade WebSocket connections
        // This would be similar to order book connections but focused on trade data
        console.log(`🔄 Setting up trade WebSocket for ${exchange} ${symbol}`);
    }

    async getComprehensiveMarketData(symbols) {
        console.log('📈 Fetching comprehensive market data...');
        
        try {
            // Get basic market data from existing service
            const marketData = await this.marketDataService.fetchPriceData(symbols, {
                requireConsensus: true,
                minSources: 2
            });

            // Enhance with order book data
            const enhancedData = {};
            
            for (const symbol of symbols) {
                enhancedData[symbol] = {
                    ...marketData[symbol],
                    orderBooks: this.getOrderBookData(symbol),
                    marketMetrics: this.getMarketMetrics(symbol),
                    liquidityAnalysis: this.getLiquidityAnalysis(symbol),
                    exchangeComparison: this.getExchangeComparison(symbol)
                };
            }

            this.emit('comprehensive_data_ready', {
                data: enhancedData,
                timestamp: Date.now()
            });

            return enhancedData;

        } catch (error) {
            console.error('Failed to fetch comprehensive market data:', error);
            throw error;
        }
    }

    getOrderBookData(symbol) {
        const orderBooks = {};
        
        for (const [key, data] of this.orderBookData) {
            if (key.includes(symbol)) {
                const exchange = key.split('_')[0];
                orderBooks[exchange] = {
                    bids: data.bids?.slice(0, 10) || [], // Top 10 bids
                    asks: data.asks?.slice(0, 10) || [], // Top 10 asks
                    metrics: data.metrics || {},
                    lastUpdate: data.lastUpdate
                };
            }
        }
        
        return orderBooks;
    }

    getMarketMetrics(symbol) {
        const metrics = {
            averageSpread: 0,
            totalLiquidity: 0,
            marketImbalance: 0,
            volatility: 0,
            priceDiscrepancy: 0
        };

        const relevantOrderBooks = Array.from(this.orderBookData.entries())
            .filter(([key]) => key.includes(symbol))
            .map(([, data]) => data);

        if (relevantOrderBooks.length === 0) return metrics;

        // Calculate average spread across exchanges
        const spreads = relevantOrderBooks
            .filter(book => book.metrics?.spread)
            .map(book => book.metrics.spread);
        
        if (spreads.length > 0) {
            metrics.averageSpread = spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length;
        }

        // Calculate total liquidity
        metrics.totalLiquidity = relevantOrderBooks.reduce((total, book) => {
            return total + (book.metrics?.bidDepth || 0) + (book.metrics?.askDepth || 0);
        }, 0);

        // Calculate market imbalance
        const imbalances = relevantOrderBooks
            .filter(book => book.metrics?.imbalance !== undefined)
            .map(book => book.metrics.imbalance);
        
        if (imbalances.length > 0) {
            metrics.marketImbalance = imbalances.reduce((sum, imbalance) => sum + imbalance, 0) / imbalances.length;
        }

        return metrics;
    }

    getLiquidityAnalysis(symbol) {
        const analysis = {
            depthAnalysis: {},
            liquidityProviders: [],
            marketMakers: [],
            liquidityRisk: 'low'
        };

        // Analyze market depth across price levels
        const orderBooks = this.getOrderBookData(symbol);
        
        for (const [exchange, book] of Object.entries(orderBooks)) {
            if (book.bids?.length && book.asks?.length) {
                // Analyze depth at different price levels
                const priceRanges = [0.1, 0.5, 1.0, 2.0, 5.0]; // Percentage ranges
                analysis.depthAnalysis[exchange] = {};

                for (const range of priceRanges) {
                    const midPrice = book.metrics?.midPrice || 
                        (book.bids[0]?.price + book.asks[0]?.price) / 2;
                    
                    const bidThreshold = midPrice * (1 - range / 100);
                    const askThreshold = midPrice * (1 + range / 100);
                    
                    const bidDepth = book.bids
                        .filter(bid => bid.price >= bidThreshold)
                        .reduce((sum, bid) => sum + bid.total, 0);
                    
                    const askDepth = book.asks
                        .filter(ask => ask.price <= askThreshold)
                        .reduce((sum, ask) => sum + ask.total, 0);
                    
                    analysis.depthAnalysis[exchange][`${range}%`] = {
                        bidDepth,
                        askDepth,
                        totalDepth: bidDepth + askDepth
                    };
                }
            }
        }

        return analysis;
    }

    getExchangeComparison(symbol) {
        const comparison = {};
        const orderBooks = this.getOrderBookData(symbol);
        
        for (const [exchange, book] of Object.entries(orderBooks)) {
            if (book.metrics) {
                comparison[exchange] = {
                    bestBid: book.bids?.[0]?.price || 0,
                    bestAsk: book.asks?.[0]?.price || 0,
                    spread: book.metrics.spread || 0,
                    spreadPercentage: book.metrics.spreadPercentage || 0,
                    liquidityScore: book.metrics.liquidityScore || 0,
                    imbalance: book.metrics.imbalance || 0,
                    lastUpdate: book.lastUpdate
                };
            }
        }

        // Calculate arbitrage opportunities
        const exchanges = Object.keys(comparison);
        const arbitrageOpportunities = [];

        for (let i = 0; i < exchanges.length; i++) {
            for (let j = i + 1; j < exchanges.length; j++) {
                const exchange1 = exchanges[i];
                const exchange2 = exchanges[j];
                
                const bid1 = comparison[exchange1]?.bestBid || 0;
                const ask1 = comparison[exchange1]?.bestAsk || 0;
                const bid2 = comparison[exchange2]?.bestBid || 0;
                const ask2 = comparison[exchange2]?.bestAsk || 0;

                // Check for arbitrage opportunity
                if (bid1 > ask2) {
                    arbitrageOpportunities.push({
                        buyExchange: exchange2,
                        sellExchange: exchange1,
                        buyPrice: ask2,
                        sellPrice: bid1,
                        profit: bid1 - ask2,
                        profitPercentage: ((bid1 - ask2) / ask2) * 100
                    });
                } else if (bid2 > ask1) {
                    arbitrageOpportunities.push({
                        buyExchange: exchange1,
                        sellExchange: exchange2,
                        buyPrice: ask1,
                        sellPrice: bid2,
                        profit: bid2 - ask1,
                        profitPercentage: ((bid2 - ask1) / ask1) * 100
                    });
                }
            }
        }

        return {
            exchanges: comparison,
            arbitrageOpportunities,
            bestExchange: this.findBestExchange(comparison),
            priceDiscrepancy: this.calculatePriceDiscrepancy(comparison)
        };
    }

    findBestExchange(comparison) {
        let bestExchange = null;
        let bestScore = -1;

        for (const [exchange, data] of Object.entries(comparison)) {
            // Score based on spread, liquidity, and freshness
            const spreadScore = data.spreadPercentage ? Math.max(0, 10 - data.spreadPercentage) : 0;
            const liquidityScore = Math.min(10, data.liquidityScore || 0);
            const freshnessScore = data.lastUpdate ? 
                Math.max(0, 10 - (Date.now() - data.lastUpdate) / 60000) : 0;
            
            const totalScore = (spreadScore + liquidityScore + freshnessScore) / 3;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestExchange = exchange;
            }
        }

        return {
            exchange: bestExchange,
            score: bestScore,
            reasoning: 'Based on spread, liquidity, and data freshness'
        };
    }

    calculatePriceDiscrepancy(comparison) {
        const prices = Object.values(comparison)
            .map(data => (data.bestBid + data.bestAsk) / 2)
            .filter(price => price > 0);
        
        if (prices.length < 2) return 0;

        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        
        return ((maxPrice - minPrice) / minPrice) * 100;
    }

    async captureOrderBookSnapshots(symbols) {
        console.log('📸 Capturing order book snapshots...');
        
        for (const symbol of symbols) {
            const snapshot = {
                symbol,
                timestamp: Date.now(),
                exchanges: {}
            };

            for (const [key, data] of this.orderBookData) {
                if (key.includes(symbol)) {
                    const exchange = key.split('_')[0];
                    snapshot.exchanges[exchange] = {
                        bids: data.bids?.slice(0, 5) || [], // Top 5 for snapshot
                        asks: data.asks?.slice(0, 5) || [],
                        metrics: data.metrics || {}
                    };
                }
            }

            // Store snapshot for historical analysis
            const snapshotKey = `${symbol}_${Date.now()}`;
            this.historicalData.set(snapshotKey, snapshot);

            // Keep only last 100 snapshots per symbol
            this.cleanupHistoricalData(symbol);

            this.emit('snapshot_captured', snapshot);
        }
    }

    cleanupHistoricalData(symbol) {
        const symbolSnapshots = Array.from(this.historicalData.entries())
            .filter(([key]) => key.startsWith(symbol))
            .sort(([a], [b]) => b.localeCompare(a)); // Sort by timestamp descending

        if (symbolSnapshots.length > 100) {
            const toDelete = symbolSnapshots.slice(100);
            toDelete.forEach(([key]) => this.historicalData.delete(key));
        }
    }

    processMarketData(data) {
        // Process enhanced market data from the base service
        this.emit('market_data_processed', {
            data,
            enhancedMetrics: this.calculateEnhancedMetrics(data),
            timestamp: Date.now()
        });
    }

    calculateEnhancedMetrics(marketData) {
        // Calculate additional metrics for sales information
        return {
            marketCap: this.calculateTotalMarketCap(marketData),
            volumeWeightedPrice: this.calculateVWAP(marketData),
            correlationMatrix: this.calculateCorrelations(marketData),
            volatilityIndex: this.calculateVolatilityIndex(marketData)
        };
    }

    calculateTotalMarketCap(marketData) {
        return Object.values(marketData)
            .filter(data => data.market_cap)
            .reduce((total, data) => total + data.market_cap, 0);
    }

    calculateVWAP(marketData) {
        // Volume Weighted Average Price calculation
        let totalVolume = 0;
        let weightedPriceSum = 0;

        for (const data of Object.values(marketData)) {
            if (data.price && data.volume_24h) {
                totalVolume += data.volume_24h;
                weightedPriceSum += data.price * data.volume_24h;
            }
        }

        return totalVolume > 0 ? weightedPriceSum / totalVolume : 0;
    }

    calculateCorrelations(marketData) {
        // Simplified correlation calculation
        // In production, this would use historical price data
        const symbols = Object.keys(marketData);
        const correlations = {};

        for (let i = 0; i < symbols.length; i++) {
            for (let j = i + 1; j < symbols.length; j++) {
                const symbol1 = symbols[i];
                const symbol2 = symbols[j];
                
                // Placeholder correlation based on price changes
                const change1 = marketData[symbol1]?.price_change_24h || 0;
                const change2 = marketData[symbol2]?.price_change_24h || 0;
                
                const correlation = Math.abs(change1 - change2) < 5 ? 0.7 : 0.3;
                correlations[`${symbol1}_${symbol2}`] = correlation;
            }
        }

        return correlations;
    }

    calculateVolatilityIndex(marketData) {
        const volatilities = Object.values(marketData)
            .map(data => Math.abs(data.price_change_24h || 0))
            .filter(vol => vol > 0);

        if (volatilities.length === 0) return 0;

        const avgVolatility = volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length;
        return Math.min(100, avgVolatility * 2); // Normalized to 0-100
    }

    handleExchangeDown(exchange) {
        console.warn(`⚠️ Exchange ${exchange} is down`);
        
        // Close WebSocket connections for this exchange
        for (const [key, ws] of this.exchangeWebSockets) {
            if (key.startsWith(exchange)) {
                ws.close();
                this.exchangeWebSockets.delete(key);
            }
        }

        this.emit('exchange_down', { exchange, timestamp: Date.now() });
    }

    stop() {
        console.log('🛑 Stopping Sales Data Service...');
        
        this.isRealTimeActive = false;
        
        // Close all WebSocket connections
        for (const [key, ws] of this.exchangeWebSockets) {
            ws.close();
        }
        this.exchangeWebSockets.clear();

        // Clear intervals
        if (this.orderBookInterval) {
            clearInterval(this.orderBookInterval);
        }

        this.emit('service_stopped', { timestamp: Date.now() });
    }

    // Public API methods
    getOrderBookSnapshot(symbol, exchange = null) {
        if (exchange) {
            const key = `${exchange}_${symbol}`;
            return this.orderBookData.get(key) || null;
        }
        
        // Return all exchanges for this symbol
        const snapshots = {};
        for (const [key, data] of this.orderBookData) {
            if (key.includes(symbol)) {
                const exchangeName = key.split('_')[0];
                snapshots[exchangeName] = data;
            }
        }
        return snapshots;
    }

    getMarketOverview(symbols) {
        return symbols.map(symbol => ({
            symbol,
            orderBooks: this.getOrderBookData(symbol),
            metrics: this.getMarketMetrics(symbol),
            comparison: this.getExchangeComparison(symbol)
        }));
    }

    getHistoricalSnapshots(symbol, limit = 10) {
        return Array.from(this.historicalData.entries())
            .filter(([key]) => key.startsWith(symbol))
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, limit)
            .map(([, snapshot]) => snapshot);
    }

    // Phase 2: Historical Order Book Analysis Methods
    async fetchHistoricalOrderBookData(symbol, exchange, startDate, endDate) {
        console.log(`📚 Fetching historical order book data for ${symbol} on ${exchange}...`);
        
        const config = this.exchangeConfigs[exchange];
        if (!config || !config.historicalEndpoint) {
            throw new Error(`Historical data not available for ${exchange}`);
        }

        try {
            // This would connect to historical data APIs or data warehouses
            // For now, we'll simulate with recent data
            const historicalData = {
                symbol,
                exchange,
                period: { start: startDate, end: endDate },
                orderBookSnapshots: [],
                volumeProfile: {},
                liquidityMetrics: {}
            };

            // Generate sample historical snapshots
            const intervals = this.generateTimeIntervals(startDate, endDate, 3600000); // Hourly
            
            for (const timestamp of intervals) {
                const snapshot = await this.generateHistoricalSnapshot(symbol, exchange, timestamp);
                historicalData.orderBookSnapshots.push(snapshot);
            }

            // Calculate volume profile
            historicalData.volumeProfile = this.calculateVolumeProfile(historicalData.orderBookSnapshots);
            
            // Calculate liquidity metrics over time
            historicalData.liquidityMetrics = this.calculateHistoricalLiquidityMetrics(historicalData.orderBookSnapshots);

            return historicalData;

        } catch (error) {
            console.error(`Failed to fetch historical data for ${exchange}:`, error);
            throw error;
        }
    }

    generateTimeIntervals(startDate, endDate, intervalMs) {
        const intervals = [];
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        for (let time = start; time <= end; time += intervalMs) {
            intervals.push(time);
        }
        
        return intervals;
    }

    async generateHistoricalSnapshot(symbol, exchange, timestamp) {
        // In production, this would fetch real historical data
        // For demo, we generate realistic sample data
        const basePrice = symbol === 'BTC' ? 43000 : symbol === 'ETH' ? 2600 : 300;
        const volatility = 0.02; // 2% volatility
        const priceVariation = basePrice * volatility * (Math.random() - 0.5);
        const midPrice = basePrice + priceVariation;

        const snapshot = {
            timestamp,
            symbol,
            exchange,
            midPrice,
            bestBid: midPrice - (midPrice * 0.0001),
            bestAsk: midPrice + (midPrice * 0.0001),
            bidDepth: Math.random() * 1000000,
            askDepth: Math.random() * 1000000,
            spread: midPrice * 0.0002,
            spreadPercentage: 0.02,
            orderCount: {
                bids: Math.floor(Math.random() * 1000),
                asks: Math.floor(Math.random() * 1000)
            },
            imbalance: (Math.random() - 0.5) * 0.2
        };

        return snapshot;
    }

    calculateVolumeProfile(snapshots) {
        const priceRanges = {};
        const rangeSize = 100; // $100 price ranges

        for (const snapshot of snapshots) {
            const rangeKey = Math.floor(snapshot.midPrice / rangeSize) * rangeSize;
            
            if (!priceRanges[rangeKey]) {
                priceRanges[rangeKey] = {
                    range: `$${rangeKey}-${rangeKey + rangeSize}`,
                    volume: 0,
                    count: 0,
                    avgDepth: 0
                };
            }

            priceRanges[rangeKey].volume += (snapshot.bidDepth + snapshot.askDepth);
            priceRanges[rangeKey].count++;
            priceRanges[rangeKey].avgDepth = priceRanges[rangeKey].volume / priceRanges[rangeKey].count;
        }

        return priceRanges;
    }

    calculateHistoricalLiquidityMetrics(snapshots) {
        const metrics = {
            averageSpread: 0,
            averageDepth: 0,
            volatility: 0,
            liquidityScore: 0,
            marketEfficiency: 0,
            periods: []
        };

        if (snapshots.length === 0) return metrics;

        // Calculate averages
        const totalSpread = snapshots.reduce((sum, s) => sum + s.spreadPercentage, 0);
        const totalDepth = snapshots.reduce((sum, s) => sum + s.bidDepth + s.askDepth, 0);
        
        metrics.averageSpread = totalSpread / snapshots.length;
        metrics.averageDepth = totalDepth / snapshots.length;

        // Calculate volatility
        const prices = snapshots.map(s => s.midPrice);
        const priceChanges = [];
        for (let i = 1; i < prices.length; i++) {
            priceChanges.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        if (priceChanges.length > 0) {
            const avgChange = priceChanges.reduce((sum, c) => sum + c, 0) / priceChanges.length;
            const variance = priceChanges.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / priceChanges.length;
            metrics.volatility = Math.sqrt(variance) * 100; // Percentage
        }

        // Calculate liquidity score (0-100)
        const depthScore = Math.min(100, metrics.averageDepth / 10000);
        const spreadScore = Math.max(0, 100 - metrics.averageSpread * 1000);
        metrics.liquidityScore = (depthScore + spreadScore) / 2;

        // Market efficiency (based on spread consistency)
        const spreadStdDev = this.calculateStandardDeviation(snapshots.map(s => s.spreadPercentage));
        metrics.marketEfficiency = Math.max(0, 100 - spreadStdDev * 1000);

        // Period analysis
        const periodSize = Math.floor(snapshots.length / 10); // 10 periods
        for (let i = 0; i < snapshots.length; i += periodSize) {
            const periodSnapshots = snapshots.slice(i, i + periodSize);
            if (periodSnapshots.length > 0) {
                metrics.periods.push({
                    start: periodSnapshots[0].timestamp,
                    end: periodSnapshots[periodSnapshots.length - 1].timestamp,
                    avgSpread: periodSnapshots.reduce((sum, s) => sum + s.spreadPercentage, 0) / periodSnapshots.length,
                    avgDepth: periodSnapshots.reduce((sum, s) => sum + s.bidDepth + s.askDepth, 0) / periodSnapshots.length,
                    imbalance: periodSnapshots.reduce((sum, s) => sum + s.imbalance, 0) / periodSnapshots.length
                });
            }
        }

        return metrics;
    }

    async analyzeMarketManipulation(symbol, exchange, timeframe) {
        console.log(`🔍 Analyzing market manipulation patterns for ${symbol} on ${exchange}...`);
        
        const patterns = {
            spoofing: [],
            washTrading: [],
            pumpAndDump: [],
            frontRunning: []
        };

        // Get recent order book snapshots
        const snapshots = this.getHistoricalSnapshots(symbol, 50);
        
        if (snapshots.length < 10) {
            return patterns; // Not enough data
        }

        // Detect spoofing (large orders that disappear quickly)
        for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i-1];
            const curr = snapshots[i];
            
            // Check for sudden large order appearance/disappearance
            const bidDepthChange = Math.abs(curr.exchanges[exchange]?.metrics?.bidDepth - prev.exchanges[exchange]?.metrics?.bidDepth) || 0;
            const askDepthChange = Math.abs(curr.exchanges[exchange]?.metrics?.askDepth - prev.exchanges[exchange]?.metrics?.askDepth) || 0;
            
            if (bidDepthChange > 100000 || askDepthChange > 100000) {
                patterns.spoofing.push({
                    timestamp: curr.timestamp,
                    type: 'Large order fluctuation',
                    severity: 'Medium',
                    details: {
                        bidDepthChange,
                        askDepthChange
                    }
                });
            }
        }

        // Detect wash trading (matching orders from same source)
        // This would require trade data analysis
        
        // Detect pump and dump patterns
        const priceChanges = [];
        for (let i = 1; i < snapshots.length; i++) {
            const prevPrice = snapshots[i-1].exchanges[exchange]?.metrics?.midPrice || 0;
            const currPrice = snapshots[i].exchanges[exchange]?.metrics?.midPrice || 0;
            
            if (prevPrice > 0) {
                priceChanges.push({
                    timestamp: snapshots[i].timestamp,
                    change: (currPrice - prevPrice) / prevPrice
                });
            }
        }

        // Look for rapid price increases followed by crashes
        for (let i = 5; i < priceChanges.length - 5; i++) {
            const prevChanges = priceChanges.slice(i-5, i);
            const nextChanges = priceChanges.slice(i, i+5);
            
            const prevAvg = prevChanges.reduce((sum, c) => sum + c.change, 0) / prevChanges.length;
            const nextAvg = nextChanges.reduce((sum, c) => sum + c.change, 0) / nextChanges.length;
            
            if (prevAvg > 0.05 && nextAvg < -0.03) {
                patterns.pumpAndDump.push({
                    timestamp: priceChanges[i].timestamp,
                    type: 'Potential pump and dump',
                    severity: 'High',
                    details: {
                        pumpPercentage: prevAvg * 100,
                        dumpPercentage: nextAvg * 100
                    }
                });
            }
        }

        return patterns;
    }

    generateOrderBookHeatmap(historicalData) {
        const heatmapData = {
            timestamps: [],
            priceLevels: [],
            bidIntensity: [],
            askIntensity: []
        };

        if (!historicalData.orderBookSnapshots || historicalData.orderBookSnapshots.length === 0) {
            return heatmapData;
        }

        // Extract unique timestamps and price levels
        const allPrices = new Set();
        historicalData.orderBookSnapshots.forEach(snapshot => {
            heatmapData.timestamps.push(snapshot.timestamp);
            
            // Add price levels around the mid price
            const midPrice = snapshot.midPrice;
            for (let i = -10; i <= 10; i++) {
                allPrices.add(Math.round(midPrice + (midPrice * 0.001 * i)));
            }
        });

        heatmapData.priceLevels = Array.from(allPrices).sort((a, b) => a - b);

        // Generate intensity data
        for (const priceLevel of heatmapData.priceLevels) {
            const bidRow = [];
            const askRow = [];
            
            for (const snapshot of historicalData.orderBookSnapshots) {
                const distanceFromMid = (priceLevel - snapshot.midPrice) / snapshot.midPrice;
                
                // Simulate intensity based on distance from mid price
                if (distanceFromMid < 0) {
                    // Bid side
                    bidRow.push(Math.max(0, 100 - Math.abs(distanceFromMid) * 5000));
                    askRow.push(0);
                } else {
                    // Ask side
                    bidRow.push(0);
                    askRow.push(Math.max(0, 100 - Math.abs(distanceFromMid) * 5000));
                }
            }
            
            heatmapData.bidIntensity.push(bidRow);
            heatmapData.askIntensity.push(askRow);
        }

        return heatmapData;
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        
        return Math.sqrt(avgSquaredDiff);
    }
}

// Export singleton instance
export const salesDataService = new SalesDataService();
export default SalesDataService;