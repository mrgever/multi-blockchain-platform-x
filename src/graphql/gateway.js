import { ApolloServer } from '@apollo/server';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import { startStandaloneServer } from '@apollo/server/standalone';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    request.http.headers.set('authorization', context.authorization || '');
    request.http.headers.set('x-trace-id', context.traceId || '');
  }
}

export class GraphQLFederationGateway {
  constructor(config = {}) {
    this.config = {
      port: config.port || 4000,
      services: [
        {
          name: 'analytics',
          url: 'http://localhost:4001/graphql'
        },
        {
          name: 'blockchain',
          url: 'http://localhost:4002/graphql'
        },
        {
          name: 'ml',
          url: 'http://localhost:4003/graphql'
        },
        {
          name: 'auth',
          url: 'http://localhost:4004/graphql'
        }
      ],
      ...config
    };

    this.gateway = null;
    this.server = null;
  }

  async initialize() {
    try {
      this.gateway = new ApolloGateway({
        serviceList: this.config.services,
        buildService({ url }) {
          return new AuthenticatedDataSource({ url });
        },
        schemaConfigDeliveryEndpoint: process.env.APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT,
        pollIntervalInMs: 30000
      });

      this.server = new ApolloServer({
        gateway: this.gateway,
        context: ({ req }) => ({
          authorization: req.headers.authorization,
          traceId: req.headers['x-trace-id'] || this.generateTraceId()
        }),
        plugins: [
          {
            requestDidStart() {
              return {
                willSendResponse({ response, context }) {
                  response.http.headers.set('x-trace-id', context.traceId);
                }
              };
            }
          }
        ]
      });

      const { url } = await startStandaloneServer(this.server, {
        listen: { port: this.config.port }
      });

      console.log(`🚀 GraphQL Gateway ready at ${url}`);
      console.log(`📊 Federation services: ${this.config.services.length}`);
      
      return { url, gateway: this.gateway };
    } catch (error) {
      console.error('Failed to start GraphQL Gateway:', error);
      throw error;
    }
  }

  generateTraceId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  async shutdown() {
    if (this.server) {
      await this.server.stop();
    }
    if (this.gateway) {
      await this.gateway.stop();
    }
  }
}

// Analytics Service Schema
export const analyticsTypeDefs = `#graphql
  type Query {
    analytics(timeframe: String!, filters: AnalyticsFilters): AnalyticsResult
    metrics(network: String!): NetworkMetrics
  }

  type AnalyticsResult {
    totalVolume: Float!
    transactionCount: Int!
    uniqueAddresses: Int!
    topTokens: [TokenMetrics!]!
  }

  type NetworkMetrics {
    tps: Float!
    avgBlockTime: Float!
    gasPrice: Float!
    congestionLevel: Float!
  }

  type TokenMetrics {
    symbol: String!
    volume: Float!
    change24h: Float!
  }

  input AnalyticsFilters {
    networks: [String!]
    minValue: Float
    tokenTypes: [String!]
  }

  extend type Transaction @key(fields: "hash") {
    hash: ID! @external
    analytics: TransactionAnalytics
  }

  type TransactionAnalytics {
    riskScore: Float!
    gasEfficiency: Float!
    category: String!
    similarTransactions: [String!]!
  }
`;

// Blockchain Service Schema
export const blockchainTypeDefs = `#graphql
  type Query {
    transaction(hash: ID!): Transaction
    block(number: Int!, network: String!): Block
    address(address: String!): AddressInfo
  }

  type Transaction @key(fields: "hash") {
    hash: ID!
    from: String!
    to: String
    value: String!
    gasUsed: String!
    gasPrice: String!
    blockNumber: Int!
    timestamp: String!
    network: String!
  }

  type Block {
    number: Int!
    hash: String!
    parentHash: String!
    timestamp: String!
    transactions: [Transaction!]!
    gasUsed: String!
    gasLimit: String!
  }

  type AddressInfo {
    address: String!
    balance: String!
    transactionCount: Int!
    firstSeen: String!
    labels: [String!]!
  }
`;

// ML Service Schema
export const mlTypeDefs = `#graphql
  type Query {
    predictions(model: String!, input: PredictionInput!): PredictionResult
    anomalies(timeframe: String!): [Anomaly!]!
    clustering(algorithm: String!, parameters: ClusteringParams): ClusteringResult
  }

  type PredictionResult {
    prediction: Float!
    confidence: Float!
    factors: [PredictionFactor!]!
  }

  type PredictionFactor {
    name: String!
    weight: Float!
    impact: Float!
  }

  type Anomaly {
    id: ID!
    score: Float!
    transaction: Transaction!
    reasons: [String!]!
    timestamp: String!
  }

  type ClusteringResult {
    clusters: [Cluster!]!
    silhouetteScore: Float!
  }

  type Cluster {
    id: Int!
    centroid: [Float!]!
    members: [String!]!
    characteristics: [String!]!
  }

  input PredictionInput {
    features: [Float!]!
    context: String
  }

  input ClusteringParams {
    k: Int
    features: [String!]!
  }

  extend type Transaction @key(fields: "hash") {
    hash: ID! @external
    mlPredictions: TransactionPredictions
  }

  type TransactionPredictions {
    futureValue: PredictionResult
    riskAssessment: PredictionResult
    category: String!
  }
`;

export default GraphQLFederationGateway;