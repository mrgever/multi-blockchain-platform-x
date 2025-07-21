"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const axios_1 = __importDefault(require("axios"));
const APIAggregatorService_1 = require("./APIAggregatorService");
const DataTransformers_1 = require("./DataTransformers");
class MarketDataService {
    apiAggregator = new APIAggregatorService_1.APIAggregatorService();
    cache = new Map();
    cacheTimeout = 30000; // 30 seconds
    coinIds = {
        'BITCOIN': 'bitcoin',
        'ETHEREUM': 'ethereum',
        'TON': 'the-open-network',
        'DOGECOIN': 'dogecoin',
        'USDT': 'tether'
    };
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }
    setCache(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    async getCoinPrices(perPage = 100, page = 1) {
        const cacheKey = `coin-prices-${perPage}-${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const params = {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: perPage,
            page: page,
            sparkline: true,
            price_change_percentage: '1h,24h,7d'
        };
        const transformers = DataTransformers_1.DataTransformers.getTransformers('coins/markets');
        const result = await this.apiAggregator.fetchWithFallback('coins/markets', transformers, params);
        if (result.success && result.data) {
            this.setCache(cacheKey, result.data);
            console.log(`✅ Market data fetched via ${result.provider}`);
            return result.data;
        }
        console.log('❌ All APIs failed, using mock data');
        return this.getMockPrices();
    }
    async getAllCoins() {
        const cacheKey = 'all-coins-list';
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/coins/list`);
            const coins = response.data;
            this.setCache(cacheKey, coins);
            return coins;
        }
        catch (error) {
            console.error('Error fetching all coins:', error);
            return this.getMockAllCoins();
        }
    }
    async getTopMemeCoins() {
        const cacheKey = 'top-meme-coins';
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            // Get popular meme coins
            const memeCoins = 'dogecoin,shiba-inu,pepe,floki,bonk,dogwifcoin,meme,wojak,safe-moon,kishu-inu';
            const response = await axios_1.default.get(`${this.baseUrl}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    ids: memeCoins,
                    order: 'market_cap_desc',
                    per_page: 20,
                    page: 1,
                    sparkline: true,
                    price_change_percentage: '24h,7d'
                }
            });
            const prices = response.data;
            this.setCache(cacheKey, prices);
            return prices;
        }
        catch (error) {
            console.error('Error fetching meme coins:', error);
            return this.getMockMemeCoins();
        }
    }
    async getTopDefiCoins() {
        const cacheKey = 'top-defi-coins';
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            // Get popular DeFi coins
            const defiCoins = 'uniswap,chainlink,aave,compound-coin,makerdao,curve-dao-token,yearn-finance,1inch,synthetix,balancer';
            const response = await axios_1.default.get(`${this.baseUrl}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    ids: defiCoins,
                    order: 'market_cap_desc',
                    per_page: 20,
                    page: 1,
                    sparkline: true,
                    price_change_percentage: '24h,7d'
                }
            });
            const prices = response.data;
            this.setCache(cacheKey, prices);
            return prices;
        }
        catch (error) {
            console.error('Error fetching DeFi coins:', error);
            return this.getMockDefiCoins();
        }
    }
    async getCoinDetails(coinId) {
        const cacheKey = `coin-details-${coinId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/coins/${coinId}`, {
                params: {
                    localization: false,
                    tickers: true,
                    market_data: true,
                    community_data: true,
                    developer_data: true,
                    sparkline: true
                }
            });
            const details = response.data;
            this.setCache(cacheKey, details);
            return details;
        }
        catch (error) {
            console.error(`Error fetching details for ${coinId}:`, error);
            return null;
        }
    }
    async getHistoricalData(coinId, days = 7) {
        const cacheKey = `historical-${coinId}-${days}`;
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/coins/${coinId}/market_chart`, {
                params: {
                    vs_currency: 'usd',
                    days: days,
                    interval: days <= 1 ? 'hourly' : 'daily'
                }
            });
            const data = response.data;
            this.setCache(cacheKey, data);
            return data;
        }
        catch (error) {
            console.error(`Error fetching historical data for ${coinId}:`, error);
            return null;
        }
    }
    async getGlobalStats() {
        const cacheKey = 'global-stats';
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const transformers = DataTransformers_1.DataTransformers.getTransformers('global');
        const result = await this.apiAggregator.fetchWithFallback('global', transformers);
        if (result.success && result.data) {
            this.setCache(cacheKey, result.data);
            console.log(`✅ Global stats fetched via ${result.provider}`);
            return result.data;
        }
        console.log('❌ All APIs failed for global stats, using mock data');
        return this.getMockGlobalStats();
    }
    async getTrendingCoins() {
        const cacheKey = 'trending-coins';
        const cached = this.getFromCache(cacheKey);
        if (cached)
            return cached;
        const transformers = DataTransformers_1.DataTransformers.getTransformers('search/trending');
        const result = await this.apiAggregator.fetchWithFallback('search/trending', transformers);
        if (result.success && result.data) {
            this.setCache(cacheKey, result.data);
            console.log(`✅ Trending coins fetched via ${result.provider}`);
            return result.data;
        }
        console.log('❌ All APIs failed for trending coins, using empty data');
        return { coins: [] };
    }
    getMockPrices() {
        return [
            {
                id: 'bitcoin',
                symbol: 'btc',
                name: 'Bitcoin',
                image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
                current_price: 43250.67,
                market_cap: 847123456789,
                market_cap_rank: 1,
                fully_diluted_valuation: 908234567890,
                total_volume: 23456789012,
                high_24h: 44100.23,
                low_24h: 42800.45,
                price_change_24h: 1250.34,
                price_change_percentage_24h: 2.98,
                market_cap_change_24h: 24567890123,
                market_cap_change_percentage_24h: 2.98,
                circulating_supply: 19587234,
                total_supply: 19587234,
                max_supply: 21000000,
                ath: 69045.67,
                ath_change_percentage: -37.34,
                ath_date: '2021-11-10T14:24:11.849Z',
                atl: 67.81,
                atl_change_percentage: 63652.34,
                atl_date: '2013-07-06T00:00:00.000Z',
                roi: null,
                last_updated: new Date().toISOString(),
                sparkline_in_7d: {
                    price: Array.from({ length: 168 }, (_, i) => 43000 + Math.sin(i * 0.1) * 2000 + Math.random() * 1000)
                },
                price_change_percentage_7d_in_currency: 5.67
            },
            {
                id: 'ethereum',
                symbol: 'eth',
                name: 'Ethereum',
                image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
                current_price: 2650.34,
                market_cap: 318567890123,
                market_cap_rank: 2,
                fully_diluted_valuation: null,
                total_volume: 15678901234,
                high_24h: 2720.45,
                low_24h: 2580.12,
                price_change_24h: 67.89,
                price_change_percentage_24h: 2.63,
                market_cap_change_24h: 8123456789,
                market_cap_change_percentage_24h: 2.63,
                circulating_supply: 120234567,
                total_supply: 120234567,
                max_supply: null,
                ath: 4878.26,
                ath_change_percentage: -45.67,
                ath_date: '2021-11-10T14:24:19.604Z',
                atl: 0.432979,
                atl_change_percentage: 612345.67,
                atl_date: '2015-10-20T00:00:00.000Z',
                roi: null,
                last_updated: new Date().toISOString(),
                sparkline_in_7d: {
                    price: Array.from({ length: 168 }, (_, i) => 2600 + Math.sin(i * 0.15) * 150 + Math.random() * 100)
                },
                price_change_percentage_7d_in_currency: 4.23
            }
        ];
    }
    getMockGlobalStats() {
        return {
            data: {
                active_cryptocurrencies: 13456,
                upcoming_icos: 0,
                ongoing_icos: 49,
                ended_icos: 3738,
                markets: 789,
                total_market_cap: {
                    usd: 1723456789012
                },
                total_volume: {
                    usd: 89123456789
                },
                market_cap_percentage: {
                    btc: 49.2,
                    eth: 18.5
                },
                market_cap_change_percentage_24h_usd: 2.45,
                updated_at: Date.now() / 1000
            }
        };
    }
    getCoinIdBySymbol(symbol) {
        return this.coinIds[symbol.toUpperCase()] || null;
    }
    // Format numbers for display
    formatPrice(price) {
        if (price < 0.01) {
            return `$${price.toFixed(6)}`;
        }
        else if (price < 1) {
            return `$${price.toFixed(4)}`;
        }
        else if (price < 100) {
            return `$${price.toFixed(2)}`;
        }
        else {
            return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }
    formatMarketCap(marketCap) {
        if (marketCap >= 1e12) {
            return `$${(marketCap / 1e12).toFixed(2)}T`;
        }
        else if (marketCap >= 1e9) {
            return `$${(marketCap / 1e9).toFixed(2)}B`;
        }
        else if (marketCap >= 1e6) {
            return `$${(marketCap / 1e6).toFixed(2)}M`;
        }
        else {
            return `$${marketCap.toLocaleString()}`;
        }
    }
    formatVolume(volume) {
        return this.formatMarketCap(volume);
    }
    formatPercentage(percentage) {
        const formatted = Math.abs(percentage).toFixed(2);
        return `${percentage >= 0 ? '+' : '-'}${formatted}%`;
    }
    // Mock data functions
    getMockAllCoins() {
        const categories = ['major', 'meme', 'defi', 'gamefi', 'metaverse', 'ai', 'layer1', 'layer2'];
        const mockCoins = [];
        for (let i = 1; i <= 500; i++) {
            mockCoins.push({
                id: `mock-coin-${i}`,
                symbol: `MOCK${i}`,
                name: `MockCoin ${i}`,
                category: categories[Math.floor(Math.random() * categories.length)]
            });
        }
        return mockCoins;
    }
    getMockMemeCoins() {
        return [
            {
                id: 'dogecoin',
                symbol: 'doge',
                name: 'Dogecoin',
                image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
                current_price: 0.087,
                market_cap_rank: 8,
                price_change_percentage_24h: 5.2,
                price_change_percentage_7d_in_currency: 12.5,
                market_cap: 12456789012,
                total_volume: 567890123,
                sparkline_in_7d: { price: this.generateMockSparkline(0.087) }
            },
            {
                id: 'shiba-inu',
                symbol: 'shib',
                name: 'Shiba Inu',
                image: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
                current_price: 0.000024,
                market_cap_rank: 15,
                price_change_percentage_24h: -3.1,
                price_change_percentage_7d_in_currency: 8.7,
                market_cap: 14123456789,
                total_volume: 345678901,
                sparkline_in_7d: { price: this.generateMockSparkline(0.000024) }
            }
        ];
    }
    getMockDefiCoins() {
        return [
            {
                id: 'uniswap',
                symbol: 'uni',
                name: 'Uniswap',
                image: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
                current_price: 8.45,
                market_cap_rank: 20,
                price_change_percentage_24h: 2.3,
                price_change_percentage_7d_in_currency: -1.2,
                market_cap: 5123456789,
                total_volume: 234567890,
                sparkline_in_7d: { price: this.generateMockSparkline(8.45) }
            }
        ];
    }
    generateMockSparkline(basePrice) {
        const data = [];
        for (let i = 0; i < 168; i++) { // 7 days * 24 hours
            data.push(basePrice * (1 + (Math.random() - 0.5) * 0.2));
        }
        return data;
    }
    // Public method to check API health
    async checkAPIHealth() {
        return await this.apiAggregator.checkProviderHealth();
    }
}
exports.MarketDataService = MarketDataService;
//# sourceMappingURL=MarketDataService.js.map