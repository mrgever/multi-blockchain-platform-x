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
export declare class MarketDataService {
    private apiAggregator;
    private cache;
    private cacheTimeout;
    private coinIds;
    private getFromCache;
    private setCache;
    getCoinPrices(perPage?: number, page?: number): Promise<CoinGeckoPrice[]>;
    getAllCoins(): Promise<any[]>;
    getTopMemeCoins(): Promise<CoinGeckoPrice[]>;
    getTopDefiCoins(): Promise<CoinGeckoPrice[]>;
    getCoinDetails(coinId: string): Promise<any>;
    getHistoricalData(coinId: string, days?: number): Promise<any>;
    getGlobalStats(): Promise<any>;
    getTrendingCoins(): Promise<any>;
    private getMockPrices;
    private getMockGlobalStats;
    getCoinIdBySymbol(symbol: string): string | null;
    formatPrice(price: number): string;
    formatMarketCap(marketCap: number): string;
    formatVolume(volume: number): string;
    formatPercentage(percentage: number): string;
    private getMockAllCoins;
    private getMockMemeCoins;
    private getMockDefiCoins;
    private generateMockSparkline;
    checkAPIHealth(): Promise<Record<string, any>>;
}
export {};
//# sourceMappingURL=MarketDataService.d.ts.map