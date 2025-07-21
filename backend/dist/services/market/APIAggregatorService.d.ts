export interface APIProvider {
    name: string;
    baseUrl: string;
    priority: number;
    rateLimit: number;
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
export declare class APIAggregatorService {
    private providers;
    private rateLimitTracker;
    private failedProviders;
    private backoffDelay;
    fetchWithFallback<T>(endpoint: string, transformers: Record<string, (data: any, params?: any) => T>, params?: any, maxRetries?: number): Promise<APIResponse<T>>;
    private fetchFromProvider;
    private buildUrl;
    private buildCMCUrl;
    private buildCryptoCompareUrl;
    private getSortedProviders;
    private isProviderAvailable;
    private isRateLimited;
    private trackRequest;
    private markRateLimited;
    private markProviderFailure;
    private markProviderSuccess;
    private getRetryAfter;
    private getMockData;
    private getMockMarketData;
    private getMockGlobalData;
    private getMockTrendingData;
    private getMockCoinsList;
    checkProviderHealth(): Promise<Record<string, any>>;
}
//# sourceMappingURL=APIAggregatorService.d.ts.map