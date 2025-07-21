interface SwapQuote {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    rate: number;
    fee: string;
    gasEstimate: string;
    priceImpact: number;
    route: string[];
    platform: string;
}
export declare class SwapService {
    private cache;
    private cacheTimeout;
    private platforms;
    private memecoins;
    private getFromCache;
    private setCache;
    getSwapQuote(fromToken: string, toToken: string, amount: string, blockchain?: string): Promise<SwapQuote[]>;
    private getQuoteFromPlatform;
    private generateMockQuote;
    private getMockExchangeRate;
    private estimateGas;
    private getMockSwapQuotes;
    getSwapHistory(address: string, blockchain?: string): Promise<any[]>;
    executeSwap(fromToken: string, toToken: string, amount: string, platform: string, slippage: number | undefined, // 0.5% default slippage
    userAddress: string): Promise<any>;
    getSupportedTokens(blockchain?: string): any[];
    getTokenPrice(tokenAddress: string, blockchain?: string): Promise<number>;
    getArbitrageOpportunities(token: string, blockchain?: string): Promise<any[]>;
    swapToNUSD(fromToken: string, amount: string, blockchain: string, userAddress: string): Promise<any>;
    private getNUSDExchangeRate;
    private getConfirmationTime;
    getNUSDBalance(userAddress: string): Promise<number>;
    getNUSDTransactionHistory(userAddress: string): Promise<any[]>;
    getAffiliateLinks(): Promise<any>;
    getRevenueStats(): Promise<any>;
}
export {};
//# sourceMappingURL=SwapService.d.ts.map