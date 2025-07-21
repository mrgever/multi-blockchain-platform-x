import axios from 'axios';
import { APIAggregatorService, APIResponse } from './APIAggregatorService';
import { DataTransformers } from './DataTransformers';

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: any | null;
  last_updated: string;
  sparkline_in_7d: {
    price: number[];
  };
  price_change_percentage_7d_in_currency: number;
}

export class MarketDataService {
  private apiAggregator = new APIAggregatorService();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 30000; // 30 seconds

  private coinIds = {
    'BITCOIN': 'bitcoin',
    'ETHEREUM': 'ethereum',
    'TON': 'the-open-network',
    'DOGECOIN': 'dogecoin',
    'USDT': 'tether'
  };

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getCoinPrices(perPage: number = 100, page: number = 1): Promise<CoinGeckoPrice[]> {
    const cacheKey = `coin-prices-${perPage}-${page}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const params = {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: perPage,
      page: page,
      sparkline: true,
      price_change_percentage: '1h,24h,7d'
    };

    const transformers = DataTransformers.getTransformers('coins/markets');
    const result = await this.apiAggregator.fetchWithFallback<CoinGeckoPrice[]>(
      'coins/markets',
      transformers,
      params
    );

    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
      console.log(`✅ Market data fetched via ${result.provider}`);
      return result.data;
    }

    console.log('❌ All APIs failed, using mock data');
    return this.getMockPrices();
  }

  async getAllCoins(): Promise<any[]> {
    const cacheKey = 'all-coins-list';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/coins/list`);
      const coins = response.data;
      this.setCache(cacheKey, coins);
      return coins;
    } catch (error) {
      console.error('Error fetching all coins:', error);
      return this.getMockAllCoins();
    }
  }

  async getTopMemeCoins(): Promise<CoinGeckoPrice[]> {
    const cacheKey = 'top-meme-coins';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get popular meme coins
      const memeCoins = 'dogecoin,shiba-inu,pepe,floki,bonk,dogwifcoin,meme,wojak,safe-moon,kishu-inu';
      const response = await axios.get(
        `${this.baseUrl}/coins/markets`,
        {
          params: {
            vs_currency: 'usd',
            ids: memeCoins,
            order: 'market_cap_desc',
            per_page: 20,
            page: 1,
            sparkline: true,
            price_change_percentage: '24h,7d'
          }
        }
      );

      const prices = response.data;
      this.setCache(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error('Error fetching meme coins:', error);
      return this.getMockMemeCoins();
    }
  }

  async getTopDefiCoins(): Promise<CoinGeckoPrice[]> {
    const cacheKey = 'top-defi-coins';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get popular DeFi coins
      const defiCoins = 'uniswap,chainlink,aave,compound-coin,makerdao,curve-dao-token,yearn-finance,1inch,synthetix,balancer';
      const response = await axios.get(
        `${this.baseUrl}/coins/markets`,
        {
          params: {
            vs_currency: 'usd',
            ids: defiCoins,
            order: 'market_cap_desc',
            per_page: 20,
            page: 1,
            sparkline: true,
            price_change_percentage: '24h,7d'
          }
        }
      );

      const prices = response.data;
      this.setCache(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error('Error fetching DeFi coins:', error);
      return this.getMockDefiCoins();
    }
  }

  async getCoinDetails(coinId: string): Promise<any> {
    const cacheKey = `coin-details-${coinId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.baseUrl}/coins/${coinId}`,
        {
          params: {
            localization: false,
            tickers: true,
            market_data: true,
            community_data: true,
            developer_data: true,
            sparkline: true
          }
        }
      );

      const details = response.data;
      this.setCache(cacheKey, details);
      return details;
    } catch (error) {
      console.error(`Error fetching details for ${coinId}:`, error);
      return null;
    }
  }

  async getHistoricalData(coinId: string, days: number = 7): Promise<any> {
    const cacheKey = `historical-${coinId}-${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.baseUrl}/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: days <= 1 ? 'hourly' : 'daily'
          }
        }
      );

      const data = response.data;
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${coinId}:`, error);
      return null;
    }
  }

  async getGlobalStats(): Promise<any> {
    const cacheKey = 'global-stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const transformers = DataTransformers.getTransformers('global');
    const result = await this.apiAggregator.fetchWithFallback<any>(
      'global',
      transformers
    );

    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
      console.log(`✅ Global stats fetched via ${result.provider}`);
      return result.data;
    }

    console.log('❌ All APIs failed for global stats, using mock data');
    return this.getMockGlobalStats();
  }

  async getTrendingCoins(): Promise<any> {
    const cacheKey = 'trending-coins';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const transformers = DataTransformers.getTransformers('search/trending');
    const result = await this.apiAggregator.fetchWithFallback<any>(
      'search/trending',
      transformers
    );

    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
      console.log(`✅ Trending coins fetched via ${result.provider}`);
      return result.data;
    }

    console.log('❌ All APIs failed for trending coins, using empty data');
    return { coins: [] };
  }

  private getMockPrices(): CoinGeckoPrice[] {
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
          price: Array.from({length: 168}, (_, i) => 43000 + Math.sin(i * 0.1) * 2000 + Math.random() * 1000)
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
          price: Array.from({length: 168}, (_, i) => 2600 + Math.sin(i * 0.15) * 150 + Math.random() * 100)
        },
        price_change_percentage_7d_in_currency: 4.23
      }
    ];
  }

  private getMockGlobalStats(): any {
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

  getCoinIdBySymbol(symbol: string): string | null {
    return this.coinIds[symbol.toUpperCase()] || null;
  }

  // Format numbers for display
  formatPrice(price: number): string {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else if (price < 100) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else {
      return `$${marketCap.toLocaleString()}`;
    }
  }

  formatVolume(volume: number): string {
    return this.formatMarketCap(volume);
  }

  formatPercentage(percentage: number): string {
    const formatted = Math.abs(percentage).toFixed(2);
    return `${percentage >= 0 ? '+' : '-'}${formatted}%`;
  }

  // Mock data functions
  private getMockAllCoins(): any[] {
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

  private getMockMemeCoins(): CoinGeckoPrice[] {
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
      } as CoinGeckoPrice,
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
      } as CoinGeckoPrice
    ];
  }

  private getMockDefiCoins(): CoinGeckoPrice[] {
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
      } as CoinGeckoPrice
    ];
  }

  private generateMockSparkline(basePrice: number): number[] {
    const data = [];
    for (let i = 0; i < 168; i++) { // 7 days * 24 hours
      data.push(basePrice * (1 + (Math.random() - 0.5) * 0.2));
    }
    return data;
  }

  // Public method to check API health
  async checkAPIHealth(): Promise<Record<string, any>> {
    return await this.apiAggregator.checkProviderHealth();
  }
}