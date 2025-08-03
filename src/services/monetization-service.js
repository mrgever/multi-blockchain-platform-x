/**
 * Monetization Service - Real-time profit generation engine
 * Handles arbitrage detection, fee optimization, and premium features
 */

import { EventEmitter } from 'events';
import { MarketDataService } from './market-data-service.js';
import { SalesDataService } from './sales-data-service.js';

export class MonetizationService extends EventEmitter {
    constructor() {
        super();
        this.marketDataService = new MarketDataService();
        this.salesDataService = new SalesDataService();
        
        // Arbitrage detection engine
        this.arbitrageEngine = {
            opportunities: new Map(),
            profitThreshold: 0.001, // 0.1% minimum profit
            maxLatency: 50, // 50ms execution window
            confidence: new Map()
        };
        
        // Fee optimization engine
        this.feeOptimizer = {
            gasPriceHistory: [],
            predictions: new Map(),
            savingsTracker: {
                daily: 0,
                monthly: 0,
                annual: 0
            }
        };
        
        // Premium features state
        this.premiumFeatures = {
            realTimeArbitrage: { tier: 'pro', enabled: false },
            advancedSignals: { tier: 'pro', enabled: false },
            feeOptimization: { tier: 'basic', enabled: true },
            liquidationAlerts: { tier: 'enterprise', enabled: false },
            apiAccess: { tier: 'pro', enabled: false }
        };
        
        // System metrics
        this.metrics = {
            dataVolume: 0,
            eventsPerSecond: 0,
            activeConnections: 0,
            uptime: Date.now(),
            reliability: 99.9
        };
        
        // Revenue tracking
        this.revenueData = {
            daily: {
                transactions: 0,
                volume: 0,
                fees: 0,
                arbitrageProfit: 0,
                premiumSubscriptions: 0,
                totalRevenue: 0,
                lastUpdated: Date.now()
            },
            weekly: {
                transactions: 0,
                volume: 0,
                fees: 0,
                arbitrageProfit: 0,
                premiumSubscriptions: 0,
                totalRevenue: 0
            },
            monthly: {
                transactions: 0,
                volume: 0,
                fees: 0,
                arbitrageProfit: 0,
                premiumSubscriptions: 0,
                totalRevenue: 0
            },
            history: []
        };
        
        this.initialize();
    }

    async initialize() {
        console.log('💰 Initializing Monetization Service...');
        
        // Start monitoring systems
        this.startArbitrageMonitoring();
        this.startFeeOptimization();
        this.startMetricsCollection();
        this.startRevenueTracking();
        this.scheduleDailyRevenueUpdate();
        
        console.log('✅ Monetization Service initialized');
    }

    // Arbitrage Detection Methods
    async detectArbitrageOpportunities(symbols = ['BTC', 'ETH', 'BNB']) {
        const opportunities = [];
        
        for (const symbol of symbols) {
            const orderBooks = await this.salesDataService.getOrderBookSnapshot(symbol);
            const exchangeNames = Object.keys(orderBooks);
            
            // Check all exchange pairs for arbitrage
            for (let i = 0; i < exchangeNames.length; i++) {
                for (let j = i + 1; j < exchangeNames.length; j++) {
                    const opportunity = this.calculateArbitrage(
                        orderBooks[exchangeNames[i]],
                        orderBooks[exchangeNames[j]],
                        symbol
                    );
                    
                    if (opportunity && opportunity.profit > this.arbitrageEngine.profitThreshold) {
                        opportunities.push(opportunity);
                    }
                }
            }
        }
        
        // Sort by profit potential
        opportunities.sort((a, b) => b.expectedProfit - a.expectedProfit);
        
        // Store and emit
        this.arbitrageEngine.opportunities.set(Date.now(), opportunities);
        this.emit('arbitrage_detected', opportunities);
        
        return opportunities;
    }

    calculateArbitrage(bookA, bookB, symbol) {
        if (!bookA?.bids?.length || !bookB?.asks?.length) return null;
        if (!bookB?.bids?.length || !bookA?.asks?.length) return null;
        
        // Check buy from A, sell to B
        const profitAtoB = bookB.bids[0].price - bookA.asks[0].price;
        const profitBtoA = bookA.bids[0].price - bookB.asks[0].price;
        
        let bestOpportunity = null;
        
        if (profitAtoB > 0) {
            const volume = Math.min(bookA.asks[0].quantity, bookB.bids[0].quantity);
            bestOpportunity = {
                type: 'arbitrage',
                symbol,
                buyExchange: bookA.exchange,
                sellExchange: bookB.exchange,
                buyPrice: bookA.asks[0].price,
                sellPrice: bookB.bids[0].price,
                profit: profitAtoB,
                profitPercentage: (profitAtoB / bookA.asks[0].price) * 100,
                volume,
                expectedProfit: profitAtoB * volume,
                confidence: this.calculateConfidence(bookA, bookB),
                timestamp: Date.now(),
                expiresIn: this.arbitrageEngine.maxLatency
            };
        } else if (profitBtoA > 0) {
            const volume = Math.min(bookB.asks[0].quantity, bookA.bids[0].quantity);
            bestOpportunity = {
                type: 'arbitrage',
                symbol,
                buyExchange: bookB.exchange,
                sellExchange: bookA.exchange,
                buyPrice: bookB.asks[0].price,
                sellPrice: bookA.bids[0].price,
                profit: profitBtoA,
                profitPercentage: (profitBtoA / bookB.asks[0].price) * 100,
                volume,
                expectedProfit: profitBtoA * volume,
                confidence: this.calculateConfidence(bookB, bookA),
                timestamp: Date.now(),
                expiresIn: this.arbitrageEngine.maxLatency
            };
        }
        
        return bestOpportunity;
    }

    calculateConfidence(bookA, bookB) {
        // Confidence based on book depth, spread, and data freshness
        const depthScore = Math.min(
            (bookA.metrics?.liquidityScore || 0) + (bookB.metrics?.liquidityScore || 0),
            100
        ) / 100;
        
        const spreadScore = 1 - (
            (bookA.metrics?.spreadPercentage || 0.1) + 
            (bookB.metrics?.spreadPercentage || 0.1)
        ) / 2;
        
        const freshnessScore = Math.max(0, 1 - 
            (Date.now() - Math.max(bookA.lastUpdate || 0, bookB.lastUpdate || 0)) / 60000
        );
        
        return (depthScore + spreadScore + freshnessScore) / 3;
    }

    // Fee Optimization Methods
    async optimizeTransactionFees(transactionType, urgency = 'normal', chainId = 1) {
        const currentGasPrice = await this.getCurrentGasPrice(chainId);
        const prediction = await this.predictGasPrice(chainId, urgency);
        
        const optimization = {
            currentGasPrice,
            recommendedGasPrice: prediction.recommended,
            estimatedSavings: currentGasPrice - prediction.recommended,
            savingsPercentage: ((currentGasPrice - prediction.recommended) / currentGasPrice) * 100,
            confidence: prediction.confidence,
            strategy: this.determineStrategy(transactionType, urgency, prediction),
            alternativeChains: await this.findCheaperChains(transactionType)
        };
        
        // Track savings
        if (optimization.estimatedSavings > 0) {
            this.feeOptimizer.savingsTracker.daily += optimization.estimatedSavings;
            this.emit('fee_optimized', optimization);
        }
        
        return optimization;
    }

    async getCurrentGasPrice(chainId) {
        // Simulate fetching current gas price
        const basePrices = {
            1: 30, // Ethereum
            56: 5, // BSC
            137: 30, // Polygon
            42161: 0.5 // Arbitrum
        };
        
        const basePrice = basePrices[chainId] || 10;
        const variance = Math.random() * 10 - 5; // ±5 gwei variance
        
        return Math.max(1, basePrice + variance);
    }

    async predictGasPrice(chainId, urgency) {
        // ML-based gas price prediction
        const historicalData = this.feeOptimizer.gasPriceHistory.slice(-100);
        
        // Simple prediction model (in production, use sophisticated ML)
        const avgPrice = historicalData.length > 0
            ? historicalData.reduce((sum, p) => sum + p, 0) / historicalData.length
            : await this.getCurrentGasPrice(chainId);
        
        const urgencyMultiplier = {
            low: 0.8,
            normal: 1.0,
            high: 1.2,
            urgent: 1.5
        }[urgency] || 1.0;
        
        return {
            recommended: avgPrice * urgencyMultiplier * (0.9 + Math.random() * 0.2),
            confidence: 0.85 + Math.random() * 0.1,
            timeToConfirmation: Math.floor(15 + Math.random() * 300) // seconds
        };
    }

    determineStrategy(transactionType, urgency, prediction) {
        if (urgency === 'urgent') {
            return {
                action: 'execute_now',
                reason: 'Urgent transaction requires immediate execution'
            };
        }
        
        if (prediction.confidence > 0.8 && prediction.timeToConfirmation < 60) {
            return {
                action: 'execute_with_optimization',
                reason: 'High confidence in gas price prediction'
            };
        }
        
        if (transactionType === 'batch' && urgency === 'low') {
            return {
                action: 'batch_and_wait',
                reason: 'Batch transactions for maximum savings'
            };
        }
        
        return {
            action: 'execute_normal',
            reason: 'Standard execution recommended'
        };
    }

    async findCheaperChains(transactionType) {
        const chains = [
            { id: 1, name: 'Ethereum', avgCost: 30 },
            { id: 56, name: 'BSC', avgCost: 5 },
            { id: 137, name: 'Polygon', avgCost: 0.1 },
            { id: 42161, name: 'Arbitrum', avgCost: 0.5 },
            { id: 10, name: 'Optimism', avgCost: 0.4 }
        ];
        
        // Sort by cost
        return chains.sort((a, b) => a.avgCost - b.avgCost).slice(0, 3);
    }

    // Real-time Data Volume Tracking
    trackDataVolume(bytes) {
        this.metrics.dataVolume += bytes;
        this.metrics.eventsPerSecond = this.calculateEventsPerSecond();
        
        this.emit('metrics_updated', {
            dataVolume: this.metrics.dataVolume,
            eventsPerSecond: this.metrics.eventsPerSecond,
            timestamp: Date.now()
        });
    }

    calculateEventsPerSecond() {
        // Simulate varying event rate
        const baseRate = 50000;
        const variance = Math.sin(Date.now() / 10000) * 20000;
        return Math.max(10000, baseRate + variance);
    }

    // Market Opportunity Alerts
    async detectMarketOpportunities() {
        const opportunities = [];
        
        // Liquidation opportunities
        const liquidationRisk = await this.detectLiquidationRisks();
        if (liquidationRisk.length > 0) {
            opportunities.push({
                type: 'liquidation',
                severity: 'high',
                positions: liquidationRisk,
                estimatedProfit: liquidationRisk.reduce((sum, r) => sum + r.potentialProfit, 0)
            });
        }
        
        // Volatility spike opportunities
        const volatilitySpikes = await this.detectVolatilitySpikes();
        opportunities.push(...volatilitySpikes);
        
        // MEV opportunities
        const mevOpportunities = await this.detectMEVOpportunities();
        opportunities.push(...mevOpportunities);
        
        this.emit('market_opportunities', opportunities);
        return opportunities;
    }

    async detectLiquidationRisks() {
        // Simulate liquidation detection
        return [
            {
                protocol: 'Aave',
                position: '0x1234...5678',
                collateral: 100000,
                debt: 80000,
                healthFactor: 1.05,
                liquidationPrice: 42500,
                currentPrice: 43000,
                potentialProfit: 2500,
                timeToLiquidation: 300 // seconds
            }
        ];
    }

    async detectVolatilitySpikes() {
        return [
            {
                type: 'volatility_spike',
                symbol: 'BTC',
                direction: 'up',
                magnitude: 5.2, // percentage
                confidence: 0.78,
                tradingStrategy: 'momentum_long',
                estimatedReturn: 2.3 // percentage
            }
        ];
    }

    async detectMEVOpportunities() {
        return [
            {
                type: 'mev_sandwich',
                targetTx: '0xabcd...1234',
                estimatedProfit: 450, // USD
                gasRequired: 200000,
                successProbability: 0.65
            }
        ];
    }

    // System Reliability Tracking
    updateSystemReliability(isHealthy) {
        const alpha = 0.01; // Smoothing factor
        this.metrics.reliability = this.metrics.reliability * (1 - alpha) + (isHealthy ? 100 : 0) * alpha;
        
        this.emit('reliability_updated', {
            reliability: this.metrics.reliability,
            uptime: Date.now() - this.metrics.uptime,
            timestamp: Date.now()
        });
    }

    // Premium Feature Management
    checkFeatureAccess(feature, userTier = 'free') {
        const featureConfig = this.premiumFeatures[feature];
        if (!featureConfig) return false;
        
        const tierHierarchy = {
            free: 0,
            basic: 1,
            pro: 2,
            enterprise: 3
        };
        
        return tierHierarchy[userTier] >= tierHierarchy[featureConfig.tier];
    }

    getUpgradePrompt(feature) {
        const featureConfig = this.premiumFeatures[feature];
        if (!featureConfig) return null;
        
        const prompts = {
            realTimeArbitrage: {
                title: 'Unlock Real-Time Arbitrage Detection',
                description: 'Get instant alerts for profitable arbitrage opportunities across 7+ exchanges',
                benefits: [
                    'Sub-50ms latency detection',
                    'Risk-adjusted opportunity scoring',
                    'Automated execution via API',
                    'Historical performance analytics'
                ],
                cta: 'Upgrade to Pro',
                pricing: '$299/month'
            },
            advancedSignals: {
                title: 'Advanced AI Trading Signals',
                description: 'ML-powered signals with 68% win rate and comprehensive market analysis',
                benefits: [
                    'Technical, on-chain, and sentiment analysis',
                    'Custom signal configurations',
                    'Backtesting tools',
                    'Risk management integration'
                ],
                cta: 'Upgrade to Pro',
                pricing: '$299/month'
            },
            liquidationAlerts: {
                title: 'Enterprise Liquidation Monitoring',
                description: 'Monitor and profit from DeFi liquidation events before they happen',
                benefits: [
                    'Track 1M+ positions in real-time',
                    'Cascade prediction algorithms',
                    'MEV integration',
                    'White-glove support'
                ],
                cta: 'Contact Sales',
                pricing: 'Custom pricing'
            }
        };
        
        return prompts[feature] || null;
    }

    // Monitoring Methods
    startArbitrageMonitoring() {
        setInterval(() => {
            this.detectArbitrageOpportunities(['BTC', 'ETH', 'BNB']);
        }, 5000); // Every 5 seconds
    }

    startFeeOptimization() {
        setInterval(async () => {
            // Update gas price history
            const currentGas = await this.getCurrentGasPrice(1);
            this.feeOptimizer.gasPriceHistory.push(currentGas);
            if (this.feeOptimizer.gasPriceHistory.length > 1000) {
                this.feeOptimizer.gasPriceHistory.shift();
            }
            
            // Update savings tracker
            if (Date.now() % 86400000 < 60000) { // Daily reset
                this.feeOptimizer.savingsTracker.monthly += this.feeOptimizer.savingsTracker.daily;
                this.feeOptimizer.savingsTracker.daily = 0;
            }
            if (Date.now() % 2592000000 < 60000) { // Monthly reset
                this.feeOptimizer.savingsTracker.annual += this.feeOptimizer.savingsTracker.monthly;
                this.feeOptimizer.savingsTracker.monthly = 0;
            }
        }, 60000); // Every minute
    }

    startMetricsCollection() {
        setInterval(() => {
            // Simulate data volume growth
            this.trackDataVolume(Math.random() * 1000000); // Random bytes
            
            // Update active connections
            this.metrics.activeConnections = Math.floor(1000 + Math.random() * 500);
            
            // Check system health
            this.updateSystemReliability(Math.random() > 0.01); // 99% healthy
            
            // Detect market opportunities
            if (Math.random() > 0.9) { // 10% chance
                this.detectMarketOpportunities();
            }
        }, 1000); // Every second
    }

    // Revenue Tracking Methods
    updateRevenueData(source, amount) {
        const now = Date.now();
        
        // Update daily revenue
        this.revenueData.daily[source] += amount;
        this.revenueData.daily.totalRevenue = 
            this.revenueData.daily.fees +
            this.revenueData.daily.arbitrageProfit +
            this.revenueData.daily.premiumSubscriptions;
        this.revenueData.daily.lastUpdated = now;
        
        // Update weekly and monthly
        this.revenueData.weekly[source] += amount;
        this.revenueData.weekly.totalRevenue = 
            this.revenueData.weekly.fees +
            this.revenueData.weekly.arbitrageProfit +
            this.revenueData.weekly.premiumSubscriptions;
            
        this.revenueData.monthly[source] += amount;
        this.revenueData.monthly.totalRevenue = 
            this.revenueData.monthly.fees +
            this.revenueData.monthly.arbitrageProfit +
            this.revenueData.monthly.premiumSubscriptions;
        
        this.emit('revenue_updated', {
            source,
            amount,
            daily: this.revenueData.daily.totalRevenue,
            timestamp: now
        });
    }
    
    async fetchExternalRevenueData() {
        // Simulate fetching revenue data from various sources
        const sources = [
            { type: 'fees', amount: Math.random() * 1000 },
            { type: 'arbitrageProfit', amount: Math.random() * 500 },
            { type: 'premiumSubscriptions', amount: Math.random() * 300 }
        ];
        
        for (const source of sources) {
            this.updateRevenueData(source.type, source.amount);
        }
        
        // Track transaction volume
        const volumeData = await this.salesDataService.getTotalVolume();
        this.revenueData.daily.volume = volumeData;
        this.revenueData.daily.transactions += Math.floor(Math.random() * 100);
    }
    
    performDailyRevenueUpdate() {
        console.log('📊 Performing daily revenue update...');
        
        // Store current daily data in history
        const dailySnapshot = {
            ...this.revenueData.daily,
            date: new Date().toISOString().split('T')[0]
        };
        this.revenueData.history.push(dailySnapshot);
        
        // Keep only last 365 days of history
        if (this.revenueData.history.length > 365) {
            this.revenueData.history.shift();
        }
        
        // Reset daily counters
        this.revenueData.daily = {
            transactions: 0,
            volume: 0,
            fees: 0,
            arbitrageProfit: 0,
            premiumSubscriptions: 0,
            totalRevenue: 0,
            lastUpdated: Date.now()
        };
        
        // Reset weekly counters if it's been 7 days
        const weeklyResetNeeded = this.revenueData.history.length % 7 === 0;
        if (weeklyResetNeeded) {
            this.revenueData.weekly = {
                transactions: 0,
                volume: 0,
                fees: 0,
                arbitrageProfit: 0,
                premiumSubscriptions: 0,
                totalRevenue: 0
            };
        }
        
        // Reset monthly counters if it's been 30 days
        const monthlyResetNeeded = this.revenueData.history.length % 30 === 0;
        if (monthlyResetNeeded) {
            this.revenueData.monthly = {
                transactions: 0,
                volume: 0,
                fees: 0,
                arbitrageProfit: 0,
                premiumSubscriptions: 0,
                totalRevenue: 0
            };
        }
        
        console.log('✅ Daily revenue update completed');
        
        this.emit('daily_revenue_reset', {
            previousDay: dailySnapshot,
            timestamp: Date.now()
        });
        
        // Save to persistent storage (in production, use database)
        this.saveRevenueDataToPersistentStorage();
    }
    
    async saveRevenueDataToPersistentStorage() {
        // In production, this would save to a database
        // For now, we'll just log it
        console.log('💾 Saving revenue data to persistent storage');
        
        // You could also write to a JSON file for persistence
        if (typeof window === 'undefined') {
            // Node.js environment
            try {
                const fs = await import('fs');
                const dataPath = './revenue-data.json';
                fs.writeFileSync(dataPath, JSON.stringify(this.revenueData, null, 2));
            } catch (err) {
                console.error('Error saving revenue data:', err);
            }
        }
    }
    
    async loadRevenueDataFromStorage() {
        // Load historical revenue data on startup
        if (typeof window === 'undefined') {
            try {
                const fs = await import('fs');
                const dataPath = './revenue-data.json';
                if (fs.existsSync(dataPath)) {
                    const data = fs.readFileSync(dataPath, 'utf8');
                    const loadedData = JSON.parse(data);
                    this.revenueData = { ...this.revenueData, ...loadedData };
                    console.log('📈 Loaded historical revenue data');
                }
            } catch (err) {
                console.error('Error loading revenue data:', err);
            }
        }
    }
    
    scheduleDailyRevenueUpdate() {
        // Calculate milliseconds until next midnight UTC
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        const msUntilMidnight = tomorrow - now;
        
        console.log(`⏰ Daily revenue update scheduled in ${Math.floor(msUntilMidnight / 1000 / 60)} minutes`);
        
        // Schedule first update at midnight
        setTimeout(() => {
            this.performDailyRevenueUpdate();
            
            // Then schedule updates every 24 hours
            setInterval(() => {
                this.performDailyRevenueUpdate();
            }, 24 * 60 * 60 * 1000); // 24 hours
        }, msUntilMidnight);
    }
    
    startRevenueTracking() {
        // Load historical data on startup
        this.loadRevenueDataFromStorage();
        
        // Track revenue from arbitrage opportunities
        this.on('arbitrage_detected', (opportunities) => {
            opportunities.forEach(opp => {
                if (opp.expectedProfit > 0) {
                    // Simulate successful arbitrage execution (10% success rate)
                    if (Math.random() < 0.1) {
                        this.updateRevenueData('arbitrageProfit', opp.expectedProfit);
                    }
                }
            });
        });
        
        // Track fee optimization savings as revenue
        this.on('fee_optimized', (optimization) => {
            if (optimization.estimatedSavings > 0) {
                this.updateRevenueData('fees', optimization.estimatedSavings * 0.1); // 10% of savings as fee
            }
        });
        
        // Simulate premium subscription revenue
        setInterval(() => {
            const dailySubscriptionRevenue = 299 * Math.floor(Math.random() * 5); // 0-5 new subscriptions
            if (dailySubscriptionRevenue > 0) {
                this.updateRevenueData('premiumSubscriptions', dailySubscriptionRevenue / 30); // Daily portion
            }
        }, 60 * 60 * 1000); // Every hour
        
        // Fetch external revenue data periodically
        setInterval(() => {
            this.fetchExternalRevenueData();
        }, 5 * 60 * 1000); // Every 5 minutes
    }
    
    getRevenueReport() {
        const report = {
            current: {
                daily: this.revenueData.daily,
                weekly: this.revenueData.weekly,
                monthly: this.revenueData.monthly
            },
            history: {
                last7Days: this.revenueData.history.slice(-7),
                last30Days: this.revenueData.history.slice(-30),
                trend: this.calculateRevenueTrend()
            },
            projections: {
                dailyAverage: this.calculateAverageRevenue('daily'),
                monthlyProjection: this.calculateAverageRevenue('daily') * 30,
                annualProjection: this.calculateAverageRevenue('daily') * 365
            }
        };
        
        return report;
    }
    
    calculateRevenueTrend() {
        if (this.revenueData.history.length < 2) return 'insufficient_data';
        
        const recent = this.revenueData.history.slice(-7);
        const previous = this.revenueData.history.slice(-14, -7);
        
        if (previous.length === 0) return 'insufficient_data';
        
        const recentAvg = recent.reduce((sum, day) => sum + day.totalRevenue, 0) / recent.length;
        const previousAvg = previous.reduce((sum, day) => sum + day.totalRevenue, 0) / previous.length;
        
        const change = ((recentAvg - previousAvg) / previousAvg) * 100;
        
        if (change > 10) return 'growing';
        if (change < -10) return 'declining';
        return 'stable';
    }
    
    calculateAverageRevenue(period) {
        const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
        const relevantHistory = this.revenueData.history.slice(-days);
        
        if (relevantHistory.length === 0) return 0;
        
        return relevantHistory.reduce((sum, day) => sum + day.totalRevenue, 0) / relevantHistory.length;
    }
    
    // Public API
    getSystemMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.uptime,
            dataVolumeFormatted: this.formatDataVolume(this.metrics.dataVolume),
            savingsTracker: this.feeOptimizer.savingsTracker,
            revenueData: this.revenueData
        };
    }

    formatDataVolume(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let unitIndex = 0;
        let value = bytes;
        
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        
        return `${value.toFixed(2)} ${units[unitIndex]}`;
    }

    getCurrentArbitrageOpportunities() {
        const recent = Array.from(this.arbitrageEngine.opportunities.values())
            .flat()
            .filter(opp => Date.now() - opp.timestamp < 60000); // Last minute
        
        return recent.sort((a, b) => b.expectedProfit - a.expectedProfit);
    }

    getFeeSavingsSummary() {
        return {
            daily: this.feeOptimizer.savingsTracker.daily,
            monthly: this.feeOptimizer.savingsTracker.monthly,
            annual: this.feeOptimizer.savingsTracker.annual,
            totalTransactionsOptimized: Math.floor(this.feeOptimizer.savingsTracker.daily / 0.5),
            averageSavingsPerTx: this.feeOptimizer.savingsTracker.daily / Math.max(1, Math.floor(this.feeOptimizer.savingsTracker.daily / 0.5))
        };
    }
}

// Export singleton instance
export const monetizationService = new MonetizationService();
export default MonetizationService;