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
    sparkline_in_7d?: {
        price: number[];
    };
    price_change_percentage_7d_in_currency: number;
}
export declare class DataTransformers {
    static coinGeckoMarketData(data: any): CoinGeckoPrice[];
    static coinGeckoGlobal(data: any): any;
    static coinGeckoTrending(data: any): any;
    static coinGeckoCoinsList(data: any): any[];
    static cmcMarketData(data: any): CoinGeckoPrice[];
    static cmcGlobal(data: any): any;
    static cmcTrending(data: any): any;
    static cryptoCompareMarketData(data: any): CoinGeckoPrice[];
    static cryptoCompareGlobal(data: any): any;
    static cryptoCompareTrending(data: any): any;
    private static generateSparkline;
    private static getMultiplier;
    static getTransformers(endpoint: string): Record<string, (data: any, params?: any) => any>;
}
export {};
//# sourceMappingURL=DataTransformers.d.ts.map