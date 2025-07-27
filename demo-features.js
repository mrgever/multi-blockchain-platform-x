// Demo implementations of advanced features for showcase purposes
// These are simplified versions for demonstration and don't require external dependencies

export class DemoVectorSearch {
  constructor() {
    this.initialized = true;
    this.cache = new Map();
  }

  async initialize() {
    console.log('Demo Vector Search initialized');
    return true;
  }

  async generateEmbedding(text) {
    // Simulate embedding generation with a simple hash-based approach
    const hash = this.simpleHash(text);
    const embedding = [];
    for (let i = 0; i < 384; i++) {
      embedding.push(Math.sin(hash + i) * Math.cos(hash * i));
    }
    return embedding;
  }

  async semanticSearch(query, options = {}) {
    const { topK = 10 } = options;
    
    // Simulate search results
    const results = [];
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Mock transaction data
    const mockTransactions = [
      { hash: '0x123...', from: '0xabc...', to: '0xdef...', value: 1000, blockchain: 'ethereum' },
      { hash: '0x456...', from: '0xghi...', to: '0xjkl...', value: 2500, blockchain: 'polygon' },
      { hash: '0x789...', from: '0xmno...', to: '0xpqr...', value: 500, blockchain: 'bsc' }
    ];

    for (const tx of mockTransactions) {
      const txText = `Transaction from ${tx.from} to ${tx.to} value ${tx.value} on ${tx.blockchain}`;
      const txEmbedding = await this.generateEmbedding(txText);
      const similarity = this.cosineSimilarity(queryEmbedding, txEmbedding);
      
      results.push({
        ...tx,
        score: similarity,
        relevance: similarity * Math.random()
      });
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, topK);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export class DemoZKProofSystem {
  constructor() {
    this.initialized = true;
  }

  async initialize() {
    console.log('Demo ZK Proof System initialized');
    return true;
  }

  async generateBalanceProof(balance, threshold) {
    // Simulate proof generation
    const proof = {
      pi_a: [this.randomHex(), this.randomHex()],
      pi_b: [[this.randomHex(), this.randomHex()], [this.randomHex(), this.randomHex()]],
      pi_c: [this.randomHex(), this.randomHex()],
      protocol: 'groth16',
      curve: 'bn128'
    };

    const commitment = this.generateCommitment(balance);
    
    return {
      proof,
      publicSignals: [commitment, threshold.toString()],
      verified: false
    };
  }

  async verifyBalanceProof(proof, publicSignals) {
    // Simulate verification (always returns true for demo)
    return {
      verified: true,
      commitment: publicSignals[0],
      threshold: publicSignals[1],
      timestamp: new Date().toISOString()
    };
  }

  generateCommitment(value) {
    // Simple commitment scheme for demo
    return `0x${(value * 12345 + 67890).toString(16)}`;
  }

  randomHex() {
    return '0x' + Math.random().toString(16).substr(2, 64).padStart(64, '0');
  }
}

export class DemoKafkaAnalytics {
  constructor() {
    this.connected = true;
    this.topics = {
      BLOCKCHAIN_EVENTS: 'blockchain-events',
      TRANSACTION_ANALYTICS: 'transaction-analytics',
      ANOMALY_DETECTION: 'anomaly-detection'
    };
  }

  async initialize() {
    console.log('Demo Kafka Analytics initialized');
    return true;
  }

  async publishEvent(topic, data) {
    console.log(`[Kafka Demo] Publishing to ${topic}:`, data);
    return true;
  }

  async trackTransaction(transaction) {
    const enriched = {
      ...transaction,
      analytics: {
        gasEfficiency: Math.random() * 100,
        networkLoad: Math.random(),
        priceImpact: Math.random() * 10,
        riskScore: Math.random()
      }
    };

    await this.publishEvent(this.topics.TRANSACTION_ANALYTICS, enriched);
    return enriched;
  }

  async aggregateMetrics(timeWindow = '1h') {
    return {
      totalTransactions: Math.floor(Math.random() * 10000),
      totalVolume: Math.floor(Math.random() * 1000000),
      uniqueWallets: Math.floor(Math.random() * 5000),
      avgTransactionSize: Math.random() * 1000,
      timestamp: new Date().toISOString(),
      timeWindow
    };
  }
}

export class DemoWebSocketManager {
  constructor() {
    this.connected = true;
    this.subscriptions = new Map();
  }

  async connect() {
    console.log('Demo WebSocket Manager connected');
    this.simulateRealTimeData();
    return Promise.resolve();
  }

  subscribe(channel, callback) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(callback);

    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  simulateRealTimeData() {
    setInterval(() => {
      // Simulate transaction updates
      this.notifySubscribers('transactions', {
        hash: '0x' + Math.random().toString(16).substr(2, 64),
        from: '0x' + Math.random().toString(16).substr(2, 40),
        to: '0x' + Math.random().toString(16).substr(2, 40),
        value: Math.random() * 10000,
        timestamp: new Date().toISOString()
      });

      // Simulate price updates
      this.notifySubscribers('prices', {
        ETH: 2500 + (Math.random() - 0.5) * 100,
        BTC: 45000 + (Math.random() - 0.5) * 1000,
        gasPrice: 20 + (Math.random() - 0.5) * 10
      });
    }, 2000);
  }

  notifySubscribers(channel, data) {
    const callbacks = this.subscriptions.get(channel);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  disconnect() {
    this.connected = false;
    this.subscriptions.clear();
  }
}

export class DemoWasmCrypto {
  constructor() {
    this.initialized = true;
  }

  async initialize() {
    console.log('Demo WASM Crypto initialized');
    return true;
  }

  async hash(data) {
    // Simulate fast hashing
    return Array.from(new TextEncoder().encode(data))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async benchmark() {
    // Simulate performance comparison
    return {
      jsTime: 150,
      wasmTime: 30,
      speedup: 5.0
    };
  }
}

// Initialize demo features
export async function initializeDemoFeatures() {
  const features = {
    vectorSearch: new DemoVectorSearch(),
    zkProofs: new DemoZKProofSystem(),
    kafka: new DemoKafkaAnalytics(),
    websocket: new DemoWebSocketManager(),
    wasm: new DemoWasmCrypto()
  };

  for (const [name, feature] of Object.entries(features)) {
    await feature.initialize();
    console.log(`✅ ${name} demo initialized`);
  }

  return features;
}

// Global demo functions for UI interaction
window.demoFeatures = null;

window.initializeDemo = async function() {
  window.demoFeatures = await initializeDemoFeatures();
  console.log('🚀 All demo features initialized');
  return window.demoFeatures;
};

window.testVectorSearch = async function() {
  if (!window.demoFeatures) await window.initializeDemo();
  
  const results = await window.demoFeatures.vectorSearch.semanticSearch(
    "large ETH transfers to DeFi protocols"
  );
  
  console.log('Vector search results:', results);
  return results;
};

window.testZKProof = async function() {
  if (!window.demoFeatures) await window.initializeDemo();
  
  const proof = await window.demoFeatures.zkProofs.generateBalanceProof(10000, 5000);
  const verification = await window.demoFeatures.zkProofs.verifyBalanceProof(
    proof.proof, 
    proof.publicSignals
  );
  
  console.log('ZK Proof verification:', verification);
  return verification;
};

window.testKafkaMetrics = async function() {
  if (!window.demoFeatures) await window.initializeDemo();
  
  const metrics = await window.demoFeatures.kafka.aggregateMetrics();
  console.log('Kafka metrics:', metrics);
  return metrics;
};

window.testWasmPerformance = async function() {
  if (!window.demoFeatures) await window.initializeDemo();
  
  const benchmark = await window.demoFeatures.wasm.benchmark();
  console.log('WASM performance:', benchmark);
  return benchmark;
};

export default { 
  DemoVectorSearch, 
  DemoZKProofSystem, 
  DemoKafkaAnalytics, 
  DemoWebSocketManager,
  DemoWasmCrypto,
  initializeDemoFeatures 
};