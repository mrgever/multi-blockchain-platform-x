export interface NexusBucksUser {
    id: string;
    email?: string;
    walletAddress?: string;
    balance: number;
    totalEarned: number;
    totalSpent: number;
    level: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Platinum';
    joinDate: Date;
    lastActive: Date;
    premiumUntil?: Date;
}
export interface NexusBucksTransaction {
    id: string;
    userId: string;
    type: 'earned' | 'spent' | 'purchased' | 'bonus' | 'reward';
    amount: number;
    description: string;
    metadata?: any;
    timestamp: Date;
}
export interface NexusBucksPackage {
    id: string;
    name: string;
    amount: number;
    price: number;
    bonus: number;
    popular?: boolean;
    savings?: string;
    features: string[];
}
export declare class NexusBucksService {
    private users;
    private transactions;
    private packages;
    private spendingCategories;
    createUser(identifier: string, type?: 'email' | 'wallet'): NexusBucksUser;
    getUserByWallet(walletAddress: string): NexusBucksUser | null;
    getUserById(userId: string): NexusBucksUser | null;
    purchasePackage(userId: string, packageId: string, paymentMethod?: string): {
        success: boolean;
        message: string;
        newBalance?: number;
        transactionId?: string;
    };
    purchaseCustomAmount(userId: string, amount: number, paymentMethod?: string): {
        success: boolean;
        message: string;
        newBalance?: number;
        transactionId?: string;
    };
    spendNBucks(userId: string, amount: number, description: string, category?: string): {
        success: boolean;
        message: string;
        newBalance?: number;
        transactionId?: string;
    };
    earnNBucks(userId: string, amount: number, description: string, source?: string): {
        success: boolean;
        message: string;
        newBalance?: number;
        transactionId?: string;
    };
    getPackages(): NexusBucksPackage[];
    getSpendingCategories(): typeof this.spendingCategories;
    getUserTransactions(userId: string, limit?: number): NexusBucksTransaction[];
    getUserStats(userId: string): any;
    private generateUserId;
    private addTransaction;
    private updateUserLevel;
    private getNextLevelRequirement;
    private calculateDailyActivity;
    private calculateSpendingByCategory;
    private getUserAchievements;
}
//# sourceMappingURL=NexusBucksService.d.ts.map