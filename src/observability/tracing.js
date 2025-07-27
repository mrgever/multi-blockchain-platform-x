import { NodeSDK } from '@opentelemetry/auto-instrumentations-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class BitorzoTracing {
  constructor(config = {}) {
    this.config = {
      serviceName: 'bitorzo-platform',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      sampleRate: config.sampleRate || 0.1,
      ...config
    };
    
    this.sdk = null;
    this.tracer = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize OpenTelemetry SDK
      this.sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        }),
        
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false, // Disable filesystem instrumentation for performance
            },
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              requestHook: (span, request) => {
                span.setAttributes({
                  'http.request.body.size': request.headers['content-length'] || 0,
                  'http.user_agent': request.headers['user-agent'] || 'unknown'
                });
              },
              responseHook: (span, response) => {
                span.setAttributes({
                  'http.response.body.size': response.headers['content-length'] || 0
                });
              }
            },
            '@opentelemetry/instrumentation-redis': {
              enabled: true,
              dbStatementSerializer: (cmdName, cmdArgs) => {
                return `${cmdName} ${cmdArgs.slice(0, 2).join(' ')}...`;
              }
            },
            '@opentelemetry/instrumentation-graphql': {
              enabled: true,
              allowValues: true,
              depth: 3
            }
          })
        ],

        spanProcessor: new BatchSpanProcessor(
          new JaegerExporter({
            endpoint: this.config.jaegerEndpoint,
          }),
          {
            maxQueueSize: 1000,
            scheduledDelayMillis: 5000,
            exportTimeoutMillis: 30000,
            maxExportBatchSize: 512,
          }
        ),
      });

      // Start the SDK
      this.sdk.start();
      
      // Get tracer instance
      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
      
      this.initialized = true;
      console.log('OpenTelemetry tracing initialized');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize tracing:', error);
      return false;
    }
  }

  // Create span for blockchain operations
  traceBlockchainOperation(operationName, attributes = {}) {
    return this.tracer.startSpan(`blockchain.${operationName}`, {
      kind: 1, // SPAN_KIND_CLIENT
      attributes: {
        'blockchain.operation': operationName,
        'blockchain.service': 'bitorzo',
        ...attributes
      }
    });
  }

  // Create span for Kafka operations
  traceKafkaOperation(operationName, topic, attributes = {}) {
    return this.tracer.startSpan(`kafka.${operationName}`, {
      kind: 3, // SPAN_KIND_PRODUCER or CONSUMER
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': topic,
        'messaging.operation': operationName,
        ...attributes
      }
    });
  }

  // Create span for ML operations
  traceMLOperation(modelName, operation, attributes = {}) {
    return this.tracer.startSpan(`ml.${operation}`, {
      attributes: {
        'ml.model.name': modelName,
        'ml.operation': operation,
        'ml.framework': 'tensorflow',
        ...attributes
      }
    });
  }

  // Create span for database operations
  traceDatabaseOperation(operation, collection, attributes = {}) {
    return this.tracer.startSpan(`db.${operation}`, {
      kind: 3, // SPAN_KIND_CLIENT
      attributes: {
        'db.system': 'redis',
        'db.operation': operation,
        'db.collection.name': collection,
        ...attributes
      }
    });
  }

  // Trace WebSocket operations
  traceWebSocketOperation(event, attributes = {}) {
    return this.tracer.startSpan(`websocket.${event}`, {
      attributes: {
        'websocket.event': event,
        'network.protocol.name': 'websocket',
        ...attributes
      }
    });
  }

  // Trace Zero-Knowledge proof operations
  traceZKOperation(proofType, attributes = {}) {
    return this.tracer.startSpan(`zk.${proofType}`, {
      attributes: {
        'zk.proof.type': proofType,
        'zk.protocol': 'groth16',
        'zk.curve': 'bn128',
        ...attributes
      }
    });
  }

  // Utility to run function with tracing
  async withTracing(spanName, fn, attributes = {}) {
    const span = this.tracer.startSpan(spanName, { attributes });
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Create custom metrics
  recordMetric(name, value, attributes = {}) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        [`metric.${name}`]: value,
        ...attributes
      });
    }
  }

  // Trace analytics pipeline
  async traceAnalyticsPipeline(operation, fn) {
    return this.withTracing(
      `analytics.pipeline.${operation}`,
      fn,
      {
        'analytics.operation': operation,
        'analytics.version': '2.0'
      }
    );
  }

  // Trace vector search operations
  async traceVectorSearch(query, fn) {
    return this.withTracing(
      'vector.search',
      fn,
      {
        'vector.query.length': query.length,
        'vector.model': 'all-MiniLM-L6-v2',
        'vector.database': 'pinecone'
      }
    );
  }

  // Performance monitoring
  startTimer(name) {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.recordMetric(`timer.${name}`, duration, {
          'timer.unit': 'milliseconds'
        });
        return duration;
      }
    };
  }

  // Error tracking
  recordError(error, context = {}) {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.setAttributes({
        'error.type': error.constructor.name,
        'error.message': error.message,
        'error.stack': error.stack,
        ...context
      });
    }
  }

  // Distributed context propagation
  injectContext(carrier) {
    trace.setSpanContext(context.active(), carrier);
  }

  extractContext(carrier) {
    return trace.setSpanContext(context.active(), carrier);
  }

  async shutdown() {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.initialized = false;
      console.log('OpenTelemetry tracing shut down');
    }
  }
}

// Middleware for Express.js
export function tracingMiddleware(tracing) {
  return (req, res, next) => {
    const span = tracing.tracer.startSpan(`http.${req.method} ${req.path}`);
    
    span.setAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'http.path': req.path,
      'http.user_agent': req.get('User-Agent') || 'unknown',
      'http.remote_addr': req.ip
    });

    res.on('finish', () => {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response.size': res.get('content-length') || 0
      });
      
      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      
      span.end();
    });

    next();
  };
}

export default BitorzoTracing;