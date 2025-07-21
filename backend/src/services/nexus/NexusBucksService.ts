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
  price: number; // in USD
  bonus: number;
  popular?: boolean;
  savings?: string;
  features: string[];
}

export class NexusBucksService {
  private users = new Map<string, NexusBucksUser>();
  private transactions = new Map<string, NexusBucksTransaction[]>();

  // Package options
  private packages: NexusBucksPackage[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      amount: 100,
      price: 4.99,
      bonus: 10,
      savings: '10% Bonus',
      features: ['Basic trading tools', 'Standard support', '30-day history']
    },
    {
      id: 'popular',
      name: 'Popular Pack',
      amount: 200,
      price: 9.99,
      bonus: 30,
      popular: true,
      savings: '15% Bonus',
      features: ['Advanced trading tools', 'Priority support', '90-day history', 'Price alerts']
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      amount: 500,
      price: 19.99,
      bonus: 100,
      savings: '20% Bonus',
      features: ['Professional tools', '24/7 VIP support', 'Unlimited history', 'Advanced analytics', 'API access']
    }
  ];

  // Spending categories and costs
  private spendingCategories = {
    premium: {
      'Premium Subscription (1 month)': 50,
      'Premium Subscription (3 months)': 130,
      'Premium Subscription (1 year)': 480,
    },
    tools: {
      'Advanced Chart Tools': 25,
      'Portfolio Tracker Pro': 15,
      'Price Alert Premium': 10,
      'API Access (1 month)': 30,
      'Professional Analytics': 35,
      'Custom Indicators': 20,
    },
    themes: {
      'Dark Pro Theme': 5,
      'Neon Theme': 8,
      'Cyberpunk Theme': 10,
      'Minimal Pro Theme': 6,
      'Trading Floor Theme': 12,
    },
    exclusive: {
      'Early Access to New Features': 40,
      'VIP Support Channel': 25,
      'Exclusive Market Reports': 30,
      'Private Discord Access': 15,
      'Custom Wallet Branding': 35,
    }
  };

  // Initialize user with welcome bonus
  createUser(identifier: string, type: 'email' | 'wallet' = 'wallet'): NexusBucksUser {
    const userId = this.generateUserId();
    const user: NexusBucksUser = {
      id: userId,
      [type === 'email' ? 'email' : 'walletAddress']: identifier,
      balance: 200, // Welcome bonus!
      totalEarned: 200,
      totalSpent: 0,
      level: 'Bronze',
      joinDate: new Date(),
      lastActive: new Date(),
    };

    this.users.set(userId, user);
    this.transactions.set(userId, []);

    // Add welcome transaction
    this.addTransaction(userId, {
      type: 'bonus',
      amount: 200,
      description: '🎉 Welcome to NEXUS! Enjoy 200 free NEXUS Bucks!',
      metadata: { source: 'welcome_bonus' }
    });

    return user;
  }

  getUserByWallet(walletAddress: string): NexusBucksUser | null {
    for (const user of this.users.values()) {
      if (user.walletAddress === walletAddress) {
        return user;
      }
    }
    return null;
  }

  getUserById(userId: string): NexusBucksUser | null {
    return this.users.get(userId) || null;
  }

  // Purchase packages
  purchasePackage(userId: string, packageId: string, paymentMethod?: string): {
    success: boolean;
    message: string;
    newBalance?: number;
    transactionId?: string;
  } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const packageInfo = this.packages.find(p => p.id === packageId);
    if (!packageInfo) {
      return { success: false, message: 'Package not found' };
    }

    // In production, this would process the payment
    // For demo, we'll simulate successful payment
    
    const totalAmount = packageInfo.amount + packageInfo.bonus;
    user.balance += totalAmount;
    user.totalEarned += totalAmount;
    user.lastActive = new Date();

    // Update user level based on total earned
    this.updateUserLevel(user);

    const transactionId = this.addTransaction(userId, {
      type: 'purchased',
      amount: totalAmount,
      description: `📦 Purchased ${packageInfo.name} - ${packageInfo.amount} + ${packageInfo.bonus} bonus`,
      metadata: { 
        packageId, 
        baseAmount: packageInfo.amount,
        bonus: packageInfo.bonus,
        price: packageInfo.price,
        paymentMethod: paymentMethod || 'demo'
      }
    });

    return {
      success: true,
      message: `Successfully purchased ${packageInfo.name}!`,
      newBalance: user.balance,
      transactionId
    };
  }

  // Custom amount purchase
  purchaseCustomAmount(userId: string, amount: number, paymentMethod?: string): {
    success: boolean;
    message: string;
    newBalance?: number;
    transactionId?: string;
  } {
    if (amount < 10 || amount > 10000) {
      return { success: false, message: 'Amount must be between 10 and 10,000 N-Bucks' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Calculate price: $0.05 per N-Buck with bonuses for larger amounts
    let bonus = 0;
    if (amount >= 1000) bonus = Math.floor(amount * 0.25); // 25% bonus
    else if (amount >= 500) bonus = Math.floor(amount * 0.20); // 20% bonus
    else if (amount >= 200) bonus = Math.floor(amount * 0.15); // 15% bonus
    else if (amount >= 100) bonus = Math.floor(amount * 0.10); // 10% bonus

    const price = amount * 0.05; // $0.05 per N-Buck
    const totalAmount = amount + bonus;

    user.balance += totalAmount;
    user.totalEarned += totalAmount;
    user.lastActive = new Date();

    this.updateUserLevel(user);

    const transactionId = this.addTransaction(userId, {
      type: 'purchased',
      amount: totalAmount,
      description: `💰 Custom purchase - ${amount} N-Bucks${bonus > 0 ? ` + ${bonus} bonus` : ''}`,
      metadata: { 
        baseAmount: amount,
        bonus,
        price,
        paymentMethod: paymentMethod || 'demo'
      }
    });

    return {
      success: true,
      message: `Successfully purchased ${amount} N-Bucks${bonus > 0 ? ` with ${bonus} bonus` : ''}!`,
      newBalance: user.balance,
      transactionId
    };
  }

  // Spend N-Bucks
  spendNBucks(userId: string, amount: number, description: string, category?: string): {
    success: boolean;
    message: string;
    newBalance?: number;
    transactionId?: string;
  } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.balance < amount) {
      return { 
        success: false, 
        message: `Insufficient balance. You need ${amount} N-Bucks but only have ${user.balance}` 
      };
    }

    user.balance -= amount;
    user.totalSpent += amount;
    user.lastActive = new Date();

    const transactionId = this.addTransaction(userId, {
      type: 'spent',
      amount: -amount,
      description: `🛒 ${description}`,
      metadata: { category }
    });

    return {
      success: true,
      message: `Successfully spent ${amount} N-Bucks on ${description}`,
      newBalance: user.balance,
      transactionId
    };
  }

  // Earn N-Bucks (for activities, referrals, etc.)
  earnNBucks(userId: string, amount: number, description: string, source?: string): {
    success: boolean;
    message: string;
    newBalance?: number;
    transactionId?: string;
  } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    user.balance += amount;
    user.totalEarned += amount;
    user.lastActive = new Date();

    this.updateUserLevel(user);

    const transactionId = this.addTransaction(userId, {
      type: 'earned',
      amount,
      description: `⭐ ${description}`,
      metadata: { source }
    });

    return {
      success: true,
      message: `You earned ${amount} N-Bucks!`,
      newBalance: user.balance,
      transactionId
    };
  }

  // Get available packages
  getPackages(): NexusBucksPackage[] {
    return this.packages;
  }

  // Get spending categories
  getSpendingCategories(): typeof this.spendingCategories {
    return this.spendingCategories;
  }

  // Get user transactions
  getUserTransactions(userId: string, limit: number = 50): NexusBucksTransaction[] {
    const userTransactions = this.transactions.get(userId) || [];
    return userTransactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get user stats
  getUserStats(userId: string): any {
    const user = this.users.get(userId);
    const transactions = this.transactions.get(userId) || [];

    if (!user) return null;

    const dailyActivity = this.calculateDailyActivity(transactions);
    const spendingByCategory = this.calculateSpendingByCategory(transactions);

    return {
      user,
      totalTransactions: transactions.length,
      dailyActivity,
      spendingByCategory,
      nextLevelRequirement: this.getNextLevelRequirement(user.level),
      achievements: this.getUserAchievements(user, transactions)
    };
  }

  // Private helper methods
  private generateUserId(): string {
    return 'nbuser_' + Math.random().toString(36).substr(2, 9);
  }

  private addTransaction(userId: string, transaction: Omit<NexusBucksTransaction, 'id' | 'userId' | 'timestamp'>): string {
    const transactionId = 'tx_' + Math.random().toString(36).substr(2, 9);
    const fullTransaction: NexusBucksTransaction = {
      id: transactionId,
      userId,
      timestamp: new Date(),
      ...transaction
    };

    if (!this.transactions.has(userId)) {
      this.transactions.set(userId, []);
    }

    this.transactions.get(userId)!.push(fullTransaction);
    return transactionId;
  }

  private updateUserLevel(user: NexusBucksUser): void {
    const totalEarned = user.totalEarned;
    
    if (totalEarned >= 10000) user.level = 'Platinum';
    else if (totalEarned >= 5000) user.level = 'Diamond';
    else if (totalEarned >= 2000) user.level = 'Gold';
    else if (totalEarned >= 500) user.level = 'Silver';
    else user.level = 'Bronze';
  }

  private getNextLevelRequirement(currentLevel: string): { level: string; required: number } {
    switch (currentLevel) {
      case 'Bronze': return { level: 'Silver', required: 500 };
      case 'Silver': return { level: 'Gold', required: 2000 };
      case 'Gold': return { level: 'Diamond', required: 5000 };
      case 'Diamond': return { level: 'Platinum', required: 10000 };
      default: return { level: 'Platinum', required: 10000 };
    }
  }

  private calculateDailyActivity(transactions: NexusBucksTransaction[]): any[] {
    const last7Days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayTransactions = transactions.filter(t => 
        t.timestamp.toDateString() === date.toDateString()
      );

      last7Days.push({
        date: date.toISOString().split('T')[0],
        transactions: dayTransactions.length,
        earned: dayTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        spent: Math.abs(dayTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
      });
    }

    return last7Days;
  }

  private calculateSpendingByCategory(transactions: NexusBucksTransaction[]): any {
    const spending = {};
    transactions
      .filter(t => t.type === 'spent')
      .forEach(t => {
        const category = t.metadata?.category || 'other';
        spending[category] = (spending[category] || 0) + Math.abs(t.amount);
      });

    return spending;
  }

  private getUserAchievements(user: NexusBucksUser, transactions: NexusBucksTransaction[]): string[] {
    const achievements = [];

    if (user.totalEarned >= 1000) achievements.push('💰 First Thousand');
    if (user.totalSpent >= 500) achievements.push('🛒 Big Spender');
    if (transactions.length >= 50) achievements.push('📊 Active Trader');
    if (user.level === 'Platinum') achievements.push('👑 Platinum Member');

    return achievements;
  }
}