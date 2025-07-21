"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTransformers = void 0;
class DataTransformers {
    // CoinGecko transformer (passthrough since it's our base format)
    static coinGeckoMarketData(data) {
        return Array.isArray(data) ? data : data.data || [];
    }
    static coinGeckoGlobal(data) {
        return data;
    }
    static coinGeckoTrending(data) {
        return data;
    }
    static coinGeckoCoinsList(data) {
        return Array.isArray(data) ? data : [];
    }
    // CoinMarketCap transformers
    static cmcMarketData(data) {
        if (!data?.data)
            return [];
        return data.data.map((coin) => ({
            id: coin.slug || coin.symbol?.toLowerCase(),
            symbol: coin.symbol?.toLowerCase() || '',
            name: coin.name || '',
            image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
            current_price: coin.quote?.USD?.price || 0,
            market_cap: coin.quote?.USD?.market_cap || 0,
            market_cap_rank: coin.cmc_rank || 0,
            fully_diluted_valuation: coin.quote?.USD?.fully_diluted_market_cap || null,
            total_volume: coin.quote?.USD?.volume_24h || 0,
            high_24h: 0, // Not provided by CMC
            low_24h: 0, // Not provided by CMC
            price_change_24h: coin.quote?.USD?.price_change_24h || 0,
            price_change_percentage_24h: coin.quote?.USD?.percent_change_24h || 0,
            market_cap_change_24h: coin.quote?.USD?.market_cap_change_24h || 0,
            market_cap_change_percentage_24h: 0, // Calculate if needed
            circulating_supply: coin.circulating_supply || 0,
            total_supply: coin.total_supply || null,
            max_supply: coin.max_supply || null,
            ath: 0, // Not directly provided
            ath_change_percentage: 0,
            ath_date: '',
            atl: 0,
            atl_change_percentage: 0,
            atl_date: '',
            roi: null,
            last_updated: coin.last_updated || new Date().toISOString(),
            sparkline_in_7d: {
                price: this.generateSparkline(coin.quote?.USD?.price || 0)
            },
            price_change_percentage_7d_in_currency: coin.quote?.USD?.percent_change_7d || 0
        }));
    }
    static cmcGlobal(data) {
        if (!data?.data)
            return { data: {} };
        const globalData = data.data;
        return {
            data: {
                active_cryptocurrencies: globalData.active_cryptocurrencies || 0,
                upcoming_icos: 0,
                ongoing_icos: 0,
                ended_icos: 0,
                markets: globalData.active_market_pairs || 0,
                total_market_cap: {
                    usd: globalData.quote?.USD?.total_market_cap || 0
                },
                total_volume: {
                    usd: globalData.quote?.USD?.total_volume_24h || 0
                },
                market_cap_percentage: {
                    btc: globalData.btc_dominance || 0,
                    eth: globalData.eth_dominance || 0
                },
                market_cap_change_percentage_24h_usd: globalData.quote?.USD?.total_market_cap_change_24h || 0,
                updated_at: Date.now() / 1000
            }
        };
    }
    static cmcTrending(data) {
        if (!data?.data)
            return { coins: [] };
        return {
            coins: data.data.map((coin, index) => ({
                item: {
                    id: coin.slug || coin.symbol?.toLowerCase(),
                    name: coin.name || '',
                    symbol: coin.symbol || '',
                    market_cap_rank: index + 1,
                    thumb: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`
                }
            }))
        };
    }
    // CryptoCompare transformers
    static cryptoCompareMarketData(data) {
        if (!data?.Data)
            return [];
        return data.Data.map((coin, index) => {
            const coinInfo = coin.CoinInfo || {};
            const usdData = coin.DISPLAY?.USD || coin.RAW?.USD || {};
            return {
                id: coinInfo.Name?.toLowerCase() || '',
                symbol: coinInfo.Name?.toLowerCase() || '',
                name: coinInfo.FullName || '',
                image: coinInfo.ImageUrl ? `https://www.cryptocompare.com${coinInfo.ImageUrl}` : '',
                current_price: parseFloat(usdData.PRICE?.replace('$', '').replace(',', '') || '0'),
                market_cap: parseFloat(usdData.MKTCAP?.replace('$', '').replace(/[,B,M,K]/g, '') || '0') * this.getMultiplier(usdData.MKTCAP),
                market_cap_rank: index + 1,
                fully_diluted_valuation: null,
                total_volume: parseFloat(usdData.TOTALVOLUME24HTO?.replace('$', '').replace(/[,B,M,K]/g, '') || '0') * this.getMultiplier(usdData.TOTALVOLUME24HTO),
                high_24h: parseFloat(usdData.HIGH24HOUR?.replace('$', '').replace(',', '') || '0'),
                low_24h: parseFloat(usdData.LOW24HOUR?.replace('$', '').replace(',', '') || '0'),
                price_change_24h: parseFloat(usdData.CHANGE24HOUR?.replace('$', '').replace(',', '') || '0'),
                price_change_percentage_24h: parseFloat(usdData.CHANGEPCT24HOUR || '0'),
                market_cap_change_24h: 0,
                market_cap_change_percentage_24h: 0,
                circulating_supply: 0, // Not directly available
                total_supply: null,
                max_supply: null,
                ath: 0,
                ath_change_percentage: 0,
                ath_date: '',
                atl: 0,
                atl_change_percentage: 0,
                atl_date: '',
                roi: null,
                last_updated: new Date().toISOString(),
                sparkline_in_7d: {
                    price: this.generateSparkline(parseFloat(usdData.PRICE?.replace('$', '').replace(',', '') || '0'))
                },
                price_change_percentage_7d_in_currency: 0 // Would need separate API call
            };
        });
    }
    static cryptoCompareGlobal(data) {
        return {
            data: {
                active_cryptocurrencies: data?.Data?.TotalCoins || 13500,
                upcoming_icos: 0,
                ongoing_icos: 0,
                ended_icos: 0,
                markets: data?.Data?.TotalExchanges || 500,
                total_market_cap: {
                    usd: data?.Data?.TotalMarketCapUsd || 1.7e12
                },
                total_volume: {
                    usd: data?.Data?.Total24HVolumeUsd || 8.9e10
                },
                market_cap_percentage: {
                    btc: 45.0, // Default values
                    eth: 18.5
                },
                market_cap_change_percentage_24h_usd: 0,
                updated_at: Date.now() / 1000
            }
        };
    }
    static cryptoCompareTrending(data) {
        if (!data?.Data)
            return { coins: [] };
        return {
            coins: data.Data.slice(0, 10).map((coin, index) => {
                const coinInfo = coin.CoinInfo || {};
                return {
                    item: {
                        id: coinInfo.Name?.toLowerCase() || '',
                        name: coinInfo.FullName || '',
                        symbol: coinInfo.Name || '',
                        market_cap_rank: index + 1,
                        thumb: coinInfo.ImageUrl ? `https://www.cryptocompare.com${coinInfo.ImageUrl}` : ''
                    }
                };
            })
        };
    }
    // Helper methods
    static generateSparkline(basePrice) {
        const data = [];
        for (let i = 0; i < 168; i++) { // 7 days * 24 hours
            data.push(basePrice * (1 + (Math.random() - 0.5) * 0.15)); // ±15% variation
        }
        return data;
    }
    static getMultiplier(value) {
        if (!value)
            return 1;
        if (value.includes('B'))
            return 1e9;
        if (value.includes('M'))
            return 1e6;
        if (value.includes('K'))
            return 1e3;
        return 1;
    }
    // Get all transformers for an endpoint
    static getTransformers(endpoint) {
        const transformerMap = {
            'coins/markets': {
                'CoinGecko': this.coinGeckoMarketData,
                'CoinMarketCap': this.cmcMarketData,
                'CryptoCompare': this.cryptoCompareMarketData
            },
            'global': {
                'CoinGecko': this.coinGeckoGlobal,
                'CoinMarketCap': this.cmcGlobal,
                'CryptoCompare': this.cryptoCompareGlobal
            },
            'search/trending': {
                'CoinGecko': this.coinGeckoTrending,
                'CoinMarketCap': this.cmcTrending,
                'CryptoCompare': this.cryptoCompareTrending
            },
            'coins/list': {
                'CoinGecko': this.coinGeckoCoinsList,
                'CoinMarketCap': (data) => [],
                'CryptoCompare': (data) => []
            }
        };
        return transformerMap[endpoint] || {};
    }
}
exports.DataTransformers = DataTransformers;
//# sourceMappingURL=DataTransformers.js.map