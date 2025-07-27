const { Kafka } = require('kafkajs');
const { EventEmitter } = require('events');
const Redis = require('redis');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class KafkaService extends EventEmitter {
  constructor() {
    super();
    this.kafka = new Kafka({
      clientId: 'bitorzo-backend',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      connectionTimeout: 3000,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'bitorzo-backend-group' });
    this.admin = this.kafka.admin();
    
    this.redisClient = null;
    this.connected = false;
    this.topics = {
      BLOCKCHAIN_EVENTS: 'blockchain-events',
      TRANSACTION_STREAM: 'transaction-stream',
      ANALYTICS_PIPELINE: 'analytics-pipeline',
      ANOMALY_ALERTS: 'anomaly-alerts',
      AGGREGATED_DATA: 'aggregated-data'
    };
  }

  async initialize() {
    try {
      // Connect to Kafka
      await this.admin.connect();
      await this.producer.connect();
      await this.consumer.connect();

      // Create topics if they don't exist
      await this.createTopics();

      // Initialize Redis
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err) => logger.error('Redis error:', err));
      await this.redisClient.connect();

      // Subscribe to topics
      await this.consumer.subscribe({ 
        topics: Object.values(this.topics), 
        fromBeginning: false 
      });

      // Start consuming
      await this.startConsuming();

      this.connected = true;
      logger.info('Kafka service initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  async createTopics() {
    const topicConfigs = Object.values(this.topics).map(topic => ({
      topic,
      numPartitions: 3,
      replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '86400000' }, // 24 hours
        { name: 'compression.type', value: 'gzip' }
      ]
    }));

    try {
      await this.admin.createTopics({
        topics: topicConfigs,
        waitForLeaders: true
      });
      logger.info('Topics created/verified');
    } catch (error) {
      if (error.message.includes('already exists')) {
        logger.info('Topics already exist');
      } else {
        throw error;
      }
    }
  }

  async startConsuming() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          await this.processMessage(topic, data, { partition, offset: message.offset });
        } catch (error) {
          logger.error('Error processing message:', error);
        }
      }
    });
  }

  async processMessage(topic, data, metadata) {
    switch (topic) {
      case this.topics.BLOCKCHAIN_EVENTS:
        await this.processBlockchainEvent(data);
        break;
      case this.topics.TRANSACTION_STREAM:
        await this.processTransaction(data);
        break;
      case this.topics.ANALYTICS_PIPELINE:
        await this.processAnalytics(data);
        break;
      case this.topics.ANOMALY_ALERTS:
        await this.processAnomaly(data);
        break;
    }

    // Cache recent data in Redis
    await this.cacheData(topic, data);
    
    // Emit for WebSocket broadcast
    this.emit('message', { topic, data, metadata });
  }

  async processBlockchainEvent(event) {
    // Aggregate blockchain metrics
    const metrics = {
      blockchain: event.blockchain,
      blockNumber: event.blockNumber,
      timestamp: event.timestamp,
      transactionCount: event.transactions?.length || 0,
      gasUsed: event.gasUsed,
      difficulty: event.difficulty
    };

    // Store in Redis for quick access
    await this.redisClient.hSet(
      `blockchain:${event.blockchain}:latest`,
      {
        blockNumber: event.blockNumber.toString(),
        timestamp: event.timestamp,
        metrics: JSON.stringify(metrics)
      }
    );

    // Publish aggregated metrics
    await this.publishMessage(this.topics.AGGREGATED_DATA, {
      type: 'blockchain-metrics',
      data: metrics
    });
  }

  async processTransaction(transaction) {
    // Enrich transaction data
    const enriched = {
      ...transaction,
      processedAt: new Date().toISOString(),
      gasEfficiency: this.calculateGasEfficiency(transaction),
      valueUSD: await this.getUSDValue(transaction)
    };

    // Check for anomalies
    const anomalyScore = await this.checkForAnomalies(enriched);
    if (anomalyScore > 0.7) {
      await this.publishMessage(this.topics.ANOMALY_ALERTS, {
        type: 'suspicious-transaction',
        transaction: enriched,
        score: anomalyScore,
        reasons: this.getAnomalyReasons(enriched, anomalyScore)
      });
    }

    // Update transaction statistics
    await this.updateTransactionStats(enriched);
  }

  async processAnalytics(analytics) {
    // Store analytics results
    const key = `analytics:${analytics.type}:${analytics.timeframe}`;
    await this.redisClient.setEx(
      key,
      3600, // 1 hour TTL
      JSON.stringify(analytics)
    );

    // Trigger downstream processing if needed
    if (analytics.alerts && analytics.alerts.length > 0) {
      for (const alert of analytics.alerts) {
        await this.publishMessage(this.topics.ANOMALY_ALERTS, alert);
      }
    }
  }

  async processAnomaly(anomaly) {
    // Log anomaly
    logger.warn('Anomaly detected:', anomaly);

    // Store in Redis for dashboard
    await this.redisClient.lPush(
      'anomalies:recent',
      JSON.stringify({
        ...anomaly,
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
    );

    // Trim list to keep only recent 100 anomalies
    await this.redisClient.lTrim('anomalies:recent', 0, 99);

    // Emit for real-time alerts
    this.emit('anomaly', anomaly);
  }

  async publishMessage(topic, data) {
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: data.id || `${Date.now()}`,
          value: JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
            source: 'bitorzo-backend'
          }),
          headers: {
            'content-type': 'application/json',
            'correlation-id': `${Date.now()}-${Math.random()}`
          }
        }],
        acks: -1,
        compression: 1
      });
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async cacheData(topic, data) {
    try {
      const key = `recent:${topic}`;
      await this.redisClient.lPush(key, JSON.stringify(data));
      await this.redisClient.lTrim(key, 0, 999); // Keep last 1000 items
      await this.redisClient.expire(key, 3600); // 1 hour TTL
    } catch (error) {
      logger.error('Redis cache error:', error);
    }
  }

  calculateGasEfficiency(transaction) {
    if (!transaction.gasUsed || !transaction.gasLimit) return 0;
    return (transaction.gasUsed / transaction.gasLimit) * 100;
  }

  async getUSDValue(transaction) {
    // In production, this would fetch real prices
    const prices = {
      ETH: 2500,
      MATIC: 0.8,
      BNB: 300,
      USDT: 1,
      USDC: 1
    };
    
    const token = transaction.token || 'ETH';
    const price = prices[token] || 0;
    return transaction.value * price;
  }

  async checkForAnomalies(transaction) {
    let score = 0;

    // Large transaction
    if (transaction.valueUSD > 1000000) score += 0.3;
    
    // New address
    const addressAge = await this.getAddressAge(transaction.from);
    if (addressAge < 86400000) score += 0.2; // Less than 24 hours
    
    // High gas usage
    if (transaction.gasEfficiency < 50) score += 0.2;
    
    // Contract creation
    if (!transaction.to) score += 0.3;

    return Math.min(score, 1);
  }

  async getAddressAge(address) {
    const cached = await this.redisClient.get(`address:${address}:firstSeen`);
    if (cached) {
      return Date.now() - new Date(cached).getTime();
    }
    
    // First time seeing this address
    await this.redisClient.set(
      `address:${address}:firstSeen`,
      new Date().toISOString()
    );
    return 0;
  }

  getAnomalyReasons(transaction, score) {
    const reasons = [];
    
    if (transaction.valueUSD > 1000000) {
      reasons.push('High value transaction');
    }
    
    if (transaction.gasEfficiency < 50) {
      reasons.push('Inefficient gas usage');
    }
    
    if (!transaction.to) {
      reasons.push('Contract creation');
    }
    
    return reasons;
  }

  async updateTransactionStats(transaction) {
    const hour = new Date().toISOString().slice(0, 13);
    const statsKey = `stats:transactions:${transaction.blockchain}:${hour}`;
    
    await this.redisClient.hIncrBy(statsKey, 'count', 1);
    await this.redisClient.hIncrByFloat(statsKey, 'volume', transaction.valueUSD);
    await this.redisClient.expire(statsKey, 86400); // 24 hour TTL
  }

  async getRecentData(topic, limit = 100) {
    const key = `recent:${topic}`;
    const data = await this.redisClient.lRange(key, 0, limit - 1);
    return data.map(item => JSON.parse(item));
  }

  async getMetrics() {
    const metrics = {
      topics: {},
      redis: {},
      kafka: {}
    };

    // Get topic metadata
    const metadata = await this.admin.fetchTopicMetadata();
    for (const topic of metadata.topics) {
      metrics.topics[topic.name] = {
        partitions: topic.partitions.length,
        replicas: topic.partitions[0]?.replicas?.length || 0
      };
    }

    // Get Redis info
    const redisInfo = await this.redisClient.info();
    metrics.redis = {
      connected: this.redisClient.isOpen,
      memory: redisInfo.includes('used_memory_human') ? 
        redisInfo.match(/used_memory_human:(\S+)/)?.[1] : 'unknown'
    };

    // Kafka connection status
    metrics.kafka = {
      connected: this.connected,
      brokers: this.kafka.brokers?.length || 0
    };

    return metrics;
  }

  async disconnect() {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      await this.admin.disconnect();
      await this.redisClient.quit();
      
      this.connected = false;
      logger.info('Kafka service disconnected');
    } catch (error) {
      logger.error('Error disconnecting:', error);
    }
  }
}

module.exports = KafkaService;