import { Kafka } from 'kafkajs';
import EventEmitter from 'events';
import pino from 'pino';

const logger = pino({ level: 'info' });

export class KafkaAnalytics extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      clientId: 'bitorzo-analytics',
      brokers: config.brokers || ['localhost:9092'],
      connectionTimeout: 3000,
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      ...config
    };
    
    this.kafka = new Kafka(this.config);
    this.producer = null;
    this.consumer = null;
    this.connected = false;
    this.topics = {
      BLOCKCHAIN_EVENTS: 'blockchain-events',
      TRANSACTION_ANALYTICS: 'transaction-analytics',
      WALLET_ACTIVITY: 'wallet-activity',
      ANOMALY_DETECTION: 'anomaly-detection',
      AGGREGATED_METRICS: 'aggregated-metrics'
    };
  }

  async initialize() {
    try {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000
      });
      
      this.consumer = this.kafka.consumer({ 
        groupId: 'bitorzo-analytics-group',
        sessionTimeout: 20000,
        heartbeatInterval: 3000
      });

      await this.producer.connect();
      await this.consumer.connect();
      
      this.connected = true;
      logger.info('Kafka Analytics initialized successfully');
      
      await this.setupConsumers();
      this.emit('connected');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Kafka Analytics:', error);
      this.emit('error', error);
      return false;
    }
  }

  async setupConsumers() {
    const topics = Object.values(this.topics);
    await this.consumer.subscribe({ topics, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          this.processMessage(topic, data);
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      }
    });
  }

  processMessage(topic, data) {
    switch (topic) {
      case this.topics.BLOCKCHAIN_EVENTS:
        this.emit('blockchain-event', data);
        this.analyzeBlockchainEvent(data);
        break;
      case this.topics.TRANSACTION_ANALYTICS:
        this.emit('transaction-analytics', data);
        break;
      case this.topics.WALLET_ACTIVITY:
        this.emit('wallet-activity', data);
        break;
      case this.topics.ANOMALY_DETECTION:
        this.emit('anomaly-detected', data);
        break;
      case this.topics.AGGREGATED_METRICS:
        this.emit('metrics-update', data);
        break;
    }
  }

  async publishEvent(topic, data) {
    if (!this.connected) {
      throw new Error('Kafka not connected');
    }

    try {
      const message = {
        key: data.id || `${Date.now()}`,
        value: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: 'bitorzo-platform'
        }),
        headers: {
          'correlation-id': `${Date.now()}-${Math.random()}`,
          'event-type': topic
        }
      };

      await this.producer.send({
        topic,
        messages: [message],
        acks: -1,
        compression: 1
      });

      logger.info(`Event published to ${topic}`, { id: message.key });
      return true;
    } catch (error) {
      logger.error('Failed to publish event:', error);
      throw error;
    }
  }

  async trackTransaction(transaction) {
    const enrichedTx = {
      ...transaction,
      analytics: {
        gasEfficiency: this.calculateGasEfficiency(transaction),
        networkLoad: await this.getNetworkLoad(transaction.network),
        priceImpact: this.calculatePriceImpact(transaction),
        riskScore: await this.calculateRiskScore(transaction)
      }
    };

    await this.publishEvent(this.topics.TRANSACTION_ANALYTICS, enrichedTx);
    
    if (enrichedTx.analytics.riskScore > 0.7) {
      await this.publishEvent(this.topics.ANOMALY_DETECTION, {
        type: 'high-risk-transaction',
        transaction: enrichedTx,
        severity: 'high'
      });
    }

    return enrichedTx;
  }

  async trackWalletActivity(wallet, activity) {
    const enrichedActivity = {
      wallet,
      activity,
      metrics: {
        totalTransactions: await this.getWalletTransactionCount(wallet),
        avgTransactionSize: await this.getAvgTransactionSize(wallet),
        lastActivity: new Date().toISOString(),
        walletAge: await this.getWalletAge(wallet)
      }
    };

    await this.publishEvent(this.topics.WALLET_ACTIVITY, enrichedActivity);
    return enrichedActivity;
  }

  async analyzeBlockchainEvent(event) {
    const analysis = {
      eventType: event.type,
      blockchain: event.blockchain,
      blockNumber: event.blockNumber,
      timestamp: event.timestamp,
      metrics: {
        tps: await this.calculateTPS(event.blockchain),
        avgBlockTime: await this.getAvgBlockTime(event.blockchain),
        pendingTransactions: await this.getPendingTransactions(event.blockchain),
        networkCongestion: await this.getNetworkCongestion(event.blockchain)
      }
    };

    await this.publishEvent(this.topics.AGGREGATED_METRICS, analysis);
    return analysis;
  }

  calculateGasEfficiency(transaction) {
    if (!transaction.gasUsed || !transaction.gasLimit) return 0;
    return (transaction.gasUsed / transaction.gasLimit) * 100;
  }

  calculatePriceImpact(transaction) {
    if (!transaction.amount || !transaction.marketPrice) return 0;
    const volumeImpact = transaction.amount / transaction.marketPrice;
    return Math.min(volumeImpact * 100, 100);
  }

  async calculateRiskScore(transaction) {
    let riskScore = 0;
    
    if (transaction.amount > 100000) riskScore += 0.2;
    if (!transaction.to || transaction.to === '0x0') riskScore += 0.3;
    if (transaction.data && transaction.data.length > 1000) riskScore += 0.1;
    
    const recipientHistory = await this.checkRecipientHistory(transaction.to);
    if (recipientHistory.suspicious) riskScore += 0.4;
    
    return Math.min(riskScore, 1);
  }

  async checkRecipientHistory(address) {
    return { suspicious: false };
  }

  async getNetworkLoad(network) {
    const loads = {
      ethereum: 0.75,
      polygon: 0.45,
      bsc: 0.60,
      arbitrum: 0.30
    };
    return loads[network] || 0.5;
  }

  async getWalletTransactionCount(wallet) {
    return Math.floor(Math.random() * 1000);
  }

  async getAvgTransactionSize(wallet) {
    return Math.random() * 10000;
  }

  async getWalletAge(wallet) {
    return Math.floor(Math.random() * 365);
  }

  async calculateTPS(blockchain) {
    const tps = {
      ethereum: 15,
      polygon: 7000,
      bsc: 300,
      arbitrum: 4000
    };
    return tps[blockchain] || 100;
  }

  async getAvgBlockTime(blockchain) {
    const blockTimes = {
      ethereum: 12,
      polygon: 2,
      bsc: 3,
      arbitrum: 0.25
    };
    return blockTimes[blockchain] || 10;
  }

  async getPendingTransactions(blockchain) {
    return Math.floor(Math.random() * 10000);
  }

  async getNetworkCongestion(blockchain) {
    return Math.random();
  }

  async aggregateMetrics(timeWindow = '1h') {
    const metrics = {
      totalTransactions: 0,
      totalVolume: 0,
      uniqueWallets: 0,
      avgTransactionSize: 0,
      topTokens: [],
      networkDistribution: {},
      anomaliesDetected: 0,
      timestamp: new Date().toISOString(),
      timeWindow
    };

    await this.publishEvent(this.topics.AGGREGATED_METRICS, metrics);
    return metrics;
  }

  async disconnect() {
    try {
      if (this.producer) await this.producer.disconnect();
      if (this.consumer) await this.consumer.disconnect();
      this.connected = false;
      logger.info('Kafka Analytics disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka:', error);
    }
  }
}

export default KafkaAnalytics;