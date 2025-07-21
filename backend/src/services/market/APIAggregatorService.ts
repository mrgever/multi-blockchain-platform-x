import axios, { AxiosResponse } from 'axios';

export interface APIProvider {
  name: string;
  baseUrl: string;
  priority: number;
  rateLimit: number; // requests per minute
  timeout: number;
  headers?: Record<string, string>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: string;
  retryAfter?: number;
}

export class APIAggregatorService {
  private providers: APIProvider[] = [
    {
      name: 'CoinGecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      priority: 1,
      rateLimit: 50, // 50 requests per minute for free tier
      timeout: 10000,
    },
    {
      name: 'CoinMarketCap',
      baseUrl: 'https://pro-api.coinmarketcap.com/v1',
      priority: 2,
      rateLimit: 333, // 10,000 requests per month
      timeout: 10000,
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY || 'demo-key'
      }
    },
    {
      name: 'CryptoCompare',
      baseUrl: 'https://min-api.cryptocompare.com/data',
      priority: 3,
      rateLimit: 100, // 100,000 requests per month
      timeout: 10000,
      headers: {
        'Authorization': `Apikey ${process.env.CRYPTOCOMPARE_API_KEY || 'demo-key'}`
      }
    }
  ];

  private rateLimitTracker = new Map<string, { requests: number; resetTime: number }>();
  private failedProviders = new Map<string, number>(); // provider -> failure timestamp
  private backoffDelay = 5 * 60 * 1000; // 5 minutes backoff

  async fetchWithFallback<T>(
    endpoint: string,
    transformers: Record<string, (data: any, params?: any) => T>,
    params?: any,
    maxRetries: number = 3
  ): Promise<APIResponse<T>> {
    const sortedProviders = this.getSortedProviders();
    let lastError: string = 'No providers available';

    for (const provider of sortedProviders) {
      if (this.isProviderAvailable(provider)) {
        try {
          console.log(`🔄 Trying ${provider.name} for ${endpoint}`);
          const result = await this.fetchFromProvider<T>(
            provider,
            endpoint,
            transformers[provider.name],
            params,
            maxRetries
          );

          if (result.success) {
            console.log(`✅ ${provider.name} succeeded for ${endpoint}`);
            this.markProviderSuccess(provider.name);
            return result;
          } else if (result.retryAfter) {
            console.log(`⏳ ${provider.name} rate limited, trying next provider`);
            this.markRateLimited(provider.name, result.retryAfter);
          } else {
            console.log(`❌ ${provider.name} failed: ${result.error}`);
            lastError = result.error || 'Unknown error';
          }
        } catch (error: any) {
          console.log(`💥 ${provider.name} threw exception: ${error.message}`);
          this.markProviderFailure(provider.name);
          lastError = error.message;
        }
      } else {
        console.log(`🚫 ${provider.name} not available (rate limited or failed recently)`);
      }
    }

    console.log('🔄 All providers failed, falling back to mock data');
    return {
      success: true,
      data: this.getMockData<T>(endpoint, params),
      provider: 'mock',
      error: `All providers failed. Last error: ${lastError}`
    };
  }

  private async fetchFromProvider<T>(
    provider: APIProvider,
    endpoint: string,
    transformer: (data: any, params?: any) => T,
    params?: any,
    maxRetries: number = 3
  ): Promise<APIResponse<T>> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const url = this.buildUrl(provider, endpoint, params);
        console.log(`📡 Making request to: ${url}`);

        const response: AxiosResponse = await axios.get(url, {
          timeout: provider.timeout,
          headers: provider.headers,
          validateStatus: (status) => status < 500, // Don't throw on 4xx
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = this.getRetryAfter(response.headers);
          return {
            success: false,
            error: 'Rate limited',
            retryAfter: retryAfter * 1000
          };
        }

        // Handle other 4xx errors
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Transform the data using provider-specific transformer
        const transformedData = transformer(response.data, params);
        
        this.trackRequest(provider.name);
        
        return {
          success: true,
          data: transformedData,
          provider: provider.name
        };

      } catch (error: any) {
        retries++;
        console.log(`❌ Attempt ${retries}/${maxRetries} failed for ${provider.name}: ${error.message}`);

        if (retries === maxRetries) {
          return {
            success: false,
            error: error.message,
            provider: provider.name
          };
        }

        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      provider: provider.name
    };
  }

  private buildUrl(provider: APIProvider, endpoint: string, params?: any): string {
    let url = `${provider.baseUrl}/${endpoint.replace(/^\//, '')}`;
    
    // Provider-specific URL building
    if (provider.name === 'CoinMarketCap') {
      url = this.buildCMCUrl(provider.baseUrl, endpoint, params);
    } else if (provider.name === 'CryptoCompare') {
      url = this.buildCryptoCompareUrl(provider.baseUrl, endpoint, params);
    } else {
      // CoinGecko format (default)
      if (params) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }
    }

    return url;
  }

  private buildCMCUrl(baseUrl: string, endpoint: string, params?: any): string {
    const endpointMap: Record<string, string> = {
      'coins/markets': 'cryptocurrency/listings/latest',
      'global': 'global-metrics/quotes/latest',
      'search/trending': 'cryptocurrency/trending/latest'
    };

    const mappedEndpoint = endpointMap[endpoint] || endpoint;
    let url = `${baseUrl}/${mappedEndpoint}`;

    if (params) {
      const queryParams = new URLSearchParams();
      
      // Map CoinGecko params to CMC params
      if (params.vs_currency) queryParams.append('convert', params.vs_currency.toUpperCase());
      if (params.per_page) queryParams.append('limit', params.per_page);
      if (params.page) queryParams.append('start', ((params.page - 1) * (params.per_page || 100) + 1).toString());
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return url;
  }

  private buildCryptoCompareUrl(baseUrl: string, endpoint: string, params?: any): string {
    const endpointMap: Record<string, string> = {
      'coins/markets': 'top/mktcapfull',
      'global': 'stats/general',
      'search/trending': 'top/totalvolfull'
    };

    const mappedEndpoint = endpointMap[endpoint] || endpoint;
    let url = `${baseUrl}/${mappedEndpoint}`;

    if (params) {
      const queryParams = new URLSearchParams();
      
      // Map params to CryptoCompare format
      if (params.vs_currency) queryParams.append('tsym', params.vs_currency.toUpperCase());
      if (params.per_page) queryParams.append('limit', params.per_page);
      if (params.page) queryParams.append('page', params.page);
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return url;
  }

  private getSortedProviders(): APIProvider[] {
    return this.providers
      .filter(provider => this.isProviderAvailable(provider))
      .sort((a, b) => a.priority - b.priority);
  }

  private isProviderAvailable(provider: APIProvider): boolean {
    // Check if provider has failed recently
    const failureTime = this.failedProviders.get(provider.name);
    if (failureTime && (Date.now() - failureTime) < this.backoffDelay) {
      return false;
    }

    // Check rate limits
    return !this.isRateLimited(provider.name);
  }

  private isRateLimited(providerName: string): boolean {
    const tracker = this.rateLimitTracker.get(providerName);
    if (!tracker) return false;

    if (Date.now() > tracker.resetTime) {
      this.rateLimitTracker.delete(providerName);
      return false;
    }

    const provider = this.providers.find(p => p.name === providerName);
    return tracker.requests >= (provider?.rateLimit || 50);
  }

  private trackRequest(providerName: string): void {
    const now = Date.now();
    const resetTime = now + (60 * 1000); // 1 minute window
    
    const tracker = this.rateLimitTracker.get(providerName);
    if (!tracker || now > tracker.resetTime) {
      this.rateLimitTracker.set(providerName, { requests: 1, resetTime });
    } else {
      tracker.requests++;
    }
  }

  private markRateLimited(providerName: string, retryAfter: number): void {
    const tracker = this.rateLimitTracker.get(providerName) || { requests: 0, resetTime: 0 };
    tracker.resetTime = Date.now() + retryAfter;
    this.rateLimitTracker.set(providerName, tracker);
  }

  private markProviderFailure(providerName: string): void {
    this.failedProviders.set(providerName, Date.now());
    console.log(`🚫 Marked ${providerName} as failed until ${new Date(Date.now() + this.backoffDelay).toISOString()}`);
  }

  private markProviderSuccess(providerName: string): void {
    this.failedProviders.delete(providerName);
  }

  private getRetryAfter(headers: any): number {
    return parseInt(headers['retry-after'] || headers['x-ratelimit-reset'] || '60', 10);
  }

  private getMockData<T>(endpoint: string, params?: any): T {
    // Return appropriate mock data based on endpoint
    const mockDataMap: Record<string, any> = {
      'coins/markets': this.getMockMarketData(params),
      'global': this.getMockGlobalData(),
      'search/trending': this.getMockTrendingData(),
      'coins/list': this.getMockCoinsList()
    };

    return mockDataMap[endpoint] || {} as T;
  }

  private getMockMarketData(params?: any): any[] {
    const perPage = params?.per_page || 100;
    const mockCoins = [];

    for (let i = 1; i <= perPage; i++) {
      mockCoins.push({
        id: `mock-coin-${i}`,
        symbol: `MOCK${i}`,
        name: `Mock Coin ${i}`,
        image: `https://via.placeholder.com/64x64/FF6B6B/FFFFFF?text=M${i}`,
        current_price: Math.random() * 1000,
        market_cap: Math.random() * 1e9,
        market_cap_rank: i,
        price_change_percentage_24h: (Math.random() - 0.5) * 20,
        total_volume: Math.random() * 1e6,
        sparkline_in_7d: {
          price: Array.from({ length: 168 }, () => Math.random() * 100)
        }
      });
    }

    return mockCoins;
  }

  private getMockGlobalData(): any {
    return {
      data: {
        active_cryptocurrencies: 13500 + Math.floor(Math.random() * 100),
        total_market_cap: { usd: 1.7e12 + Math.random() * 1e11 },
        total_volume: { usd: 8.9e10 + Math.random() * 1e10 },
        market_cap_change_percentage_24h_usd: (Math.random() - 0.5) * 10
      }
    };
  }

  private getMockTrendingData(): any {
    return {
      coins: Array.from({ length: 10 }, (_, i) => ({
        item: {
          id: `trending-${i + 1}`,
          name: `Trending Coin ${i + 1}`,
          symbol: `TREND${i + 1}`,
          market_cap_rank: i + 1,
          thumb: `https://via.placeholder.com/64x64/4ECDC4/FFFFFF?text=T${i + 1}`
        }
      }))
    };
  }

  private getMockCoinsList(): any[] {
    return Array.from({ length: 1000 }, (_, i) => ({
      id: `coin-${i + 1}`,
      symbol: `COIN${i + 1}`,
      name: `Coin ${i + 1}`
    }));
  }

  // Health check method
  async checkProviderHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    for (const provider of this.providers) {
      const isAvailable = this.isProviderAvailable(provider);
      const rateLimitInfo = this.rateLimitTracker.get(provider.name);
      const failureTime = this.failedProviders.get(provider.name);

      health[provider.name] = {
        available: isAvailable,
        priority: provider.priority,
        rateLimit: rateLimitInfo ? {
          requests: rateLimitInfo.requests,
          resetTime: new Date(rateLimitInfo.resetTime).toISOString()
        } : null,
        lastFailure: failureTime ? new Date(failureTime).toISOString() : null,
        backoffUntil: failureTime ? new Date(failureTime + this.backoffDelay).toISOString() : null
      };
    }

    return health;
  }
}