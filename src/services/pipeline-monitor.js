/**
 * Pipeline Monitor Service
 * Real-time monitoring of data ingestion and processing pipeline
 */

import { EventEmitter } from 'events';

export class PipelineMonitor extends EventEmitter {
    constructor() {
        super();
        
        // Pipeline stages tracking
        this.stages = {
            ingestion: { count: 0, rate: 0, errors: 0, latency: [] },
            validation: { count: 0, rate: 0, errors: 0, latency: [] },
            normalization: { count: 0, rate: 0, errors: 0, latency: [] },
            aggregation: { count: 0, rate: 0, errors: 0, latency: [] },
            caching: { count: 0, hits: 0, misses: 0, hitRate: 0 },
            delivery: { count: 0, rate: 0, errors: 0, latency: [] }
        };
        
        // Data source monitoring
        this.sources = new Map();
        this.initializeSources();
        
        // System metrics
        this.systemMetrics = {
            cpuUsage: 0,
            memoryUsage: 0,
            networkIO: 0,
            diskIO: 0,
            activeConnections: 0,
            totalDataProcessed: 0,
            uptime: Date.now(),
            lastUpdate: Date.now()
        };
        
        // Data quality metrics
        this.qualityMetrics = {
            outliers: [],
            corrections: [],
            skewDetections: [],
            validationFailures: [],
            freshnessMap: new Map()
        };
        
        // Performance tracking
        this.performanceMetrics = {
            p50Latency: 0,
            p95Latency: 0,
            p99Latency: 0,
            avgThroughput: 0,
            peakThroughput: 0,
            errorRate: 0
        };
        
        // WebSocket connection for real-time updates
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        
        // Start monitoring
        this.startMonitoring();
    }
    
    initializeSources() {
        const exchanges = [
            { id: 'binance', name: 'Binance', type: 'websocket', priority: 1 },
            { id: 'coinbase', name: 'Coinbase Pro', type: 'rest', priority: 1 },
            { id: 'kraken', name: 'Kraken', type: 'rest', priority: 2 },
            { id: 'bybit', name: 'Bybit', type: 'websocket', priority: 2 },
            { id: 'okx', name: 'OKX', type: 'websocket', priority: 2 },
            { id: 'huobi', name: 'Huobi', type: 'rest', priority: 3 },
            { id: 'kucoin', name: 'KuCoin', type: 'rest', priority: 3 },
            { id: 'gateio', name: 'Gate.io', type: 'websocket', priority: 3 },
            { id: 'bitfinex', name: 'Bitfinex', type: 'rest', priority: 2 },
            { id: 'coingecko', name: 'CoinGecko', type: 'aggregator', priority: 4 }
        ];
        
        exchanges.forEach(exchange => {
            this.sources.set(exchange.id, {
                ...exchange,
                status: 'initializing',
                latency: 0,
                avgLatency: 0,
                minLatency: Infinity,
                maxLatency: 0,
                lastUpdate: Date.now(),
                dataPoints: 0,
                errors: 0,
                reliability: 100,
                metrics: {
                    requestsPerSecond: 0,
                    bytesReceived: 0,
                    bytesPerSecond: 0,
                    connectionUptime: 0
                }
            });
        });
    }
    
    startMonitoring() {
        // Simulate pipeline activity
        this.simulatePipelineActivity();
        
        // Update metrics periodically
        setInterval(() => this.updateMetrics(), 1000);
        setInterval(() => this.checkDataQuality(), 5000);
        setInterval(() => this.calculatePerformanceMetrics(), 10000);
        
        // Monitor source health
        setInterval(() => this.monitorSourceHealth(), 2000);
        
        console.log('📊 Pipeline Monitor initialized');
    }
    
    simulatePipelineActivity() {
        // Simulate data flowing through pipeline stages
        setInterval(() => {
            const baseRate = 5000 + Math.random() * 5000;
            
            // Ingestion stage
            this.stages.ingestion.count += baseRate;
            this.stages.ingestion.rate = baseRate;
            this.stages.ingestion.latency.push(10 + Math.random() * 40);
            
            // Validation stage (95% success rate)
            const validatedRate = baseRate * 0.95;
            this.stages.validation.count += validatedRate;
            this.stages.validation.rate = validatedRate;
            this.stages.validation.errors += baseRate * 0.05;
            this.stages.validation.latency.push(5 + Math.random() * 15);
            
            // Normalization stage
            this.stages.normalization.count += validatedRate;
            this.stages.normalization.rate = validatedRate;
            this.stages.normalization.latency.push(8 + Math.random() * 12);
            
            // Aggregation stage
            const aggregatedRate = validatedRate * 0.9;
            this.stages.aggregation.count += aggregatedRate;
            this.stages.aggregation.rate = aggregatedRate;
            this.stages.aggregation.latency.push(15 + Math.random() * 25);
            
            // Caching stage
            this.stages.caching.count += aggregatedRate;
            this.stages.caching.hits += aggregatedRate * 0.85;
            this.stages.caching.misses += aggregatedRate * 0.15;
            this.stages.caching.hitRate = (this.stages.caching.hits / this.stages.caching.count) * 100;
            
            // Delivery stage
            this.stages.delivery.count += aggregatedRate;
            this.stages.delivery.rate = aggregatedRate;
            this.stages.delivery.latency.push(3 + Math.random() * 7);
            
            // Update total processed
            this.systemMetrics.totalDataProcessed += baseRate;
            
            // Emit pipeline update
            this.emit('pipeline_update', this.stages);
        }, 1000);
    }
    
    monitorSourceHealth() {
        this.sources.forEach((source, id) => {
            // Simulate source metrics
            const isHealthy = Math.random() > 0.05; // 95% healthy
            
            if (isHealthy) {
                source.status = 'active';
                source.latency = Math.random() * 100 + 10;
                source.avgLatency = (source.avgLatency * 0.9) + (source.latency * 0.1);
                source.minLatency = Math.min(source.minLatency, source.latency);
                source.maxLatency = Math.max(source.maxLatency, source.latency);
                source.lastUpdate = Date.now();
                source.dataPoints += Math.floor(Math.random() * 1000);
                source.reliability = Math.min(100, source.reliability + 0.1);
                
                // Update connection metrics
                source.metrics.requestsPerSecond = Math.floor(Math.random() * 100 + 50);
                source.metrics.bytesReceived += Math.floor(Math.random() * 100000);
                source.metrics.bytesPerSecond = Math.floor(Math.random() * 50000 + 10000);
                source.metrics.connectionUptime = Date.now() - this.systemMetrics.uptime;
            } else {
                source.status = Math.random() > 0.5 ? 'warning' : 'error';
                source.errors++;
                source.reliability = Math.max(0, source.reliability - 1);
            }
            
            // Update freshness map
            this.qualityMetrics.freshnessMap.set(id, Date.now() - source.lastUpdate);
        });
        
        this.emit('sources_update', Array.from(this.sources.values()));
    }
    
    updateMetrics() {
        // Update system metrics
        this.systemMetrics.cpuUsage = 20 + Math.random() * 30;
        this.systemMetrics.memoryUsage = 1.5 + Math.random() * 2;
        this.systemMetrics.networkIO = 100 + Math.random() * 50;
        this.systemMetrics.diskIO = 50 + Math.random() * 30;
        this.systemMetrics.activeConnections = Array.from(this.sources.values())
            .filter(s => s.status === 'active').length;
        this.systemMetrics.lastUpdate = Date.now();
        
        this.emit('system_metrics', this.systemMetrics);
    }
    
    checkDataQuality() {
        // Simulate data quality checks
        const outlierCount = Math.floor(Math.random() * 10);
        const correctionCount = Math.floor(Math.random() * 8);
        
        for (let i = 0; i < outlierCount; i++) {
            this.qualityMetrics.outliers.push({
                timestamp: Date.now(),
                source: Array.from(this.sources.keys())[Math.floor(Math.random() * this.sources.size)],
                type: 'price_spike',
                value: Math.random() * 1000,
                action: 'filtered'
            });
        }
        
        for (let i = 0; i < correctionCount; i++) {
            this.qualityMetrics.corrections.push({
                timestamp: Date.now(),
                source: Array.from(this.sources.keys())[Math.floor(Math.random() * this.sources.size)],
                type: 'timestamp_adjustment',
                correction: Math.random() * 100
            });
        }
        
        // Check for price skew
        const skew = Math.random() * 0.1;
        if (skew > 0.05) {
            this.qualityMetrics.skewDetections.push({
                timestamp: Date.now(),
                pair: 'BTC/USDT',
                maxDiff: skew,
                exchanges: ['binance', 'coinbase'],
                action: 'arbitrage_opportunity'
            });
        }
        
        // Keep only recent quality metrics (last hour)
        const oneHourAgo = Date.now() - 3600000;
        this.qualityMetrics.outliers = this.qualityMetrics.outliers.filter(o => o.timestamp > oneHourAgo);
        this.qualityMetrics.corrections = this.qualityMetrics.corrections.filter(c => c.timestamp > oneHourAgo);
        this.qualityMetrics.skewDetections = this.qualityMetrics.skewDetections.filter(s => s.timestamp > oneHourAgo);
        
        this.emit('quality_metrics', this.qualityMetrics);
    }
    
    calculatePerformanceMetrics() {
        // Calculate latency percentiles
        const allLatencies = [];
        Object.values(this.stages).forEach(stage => {
            if (stage.latency && stage.latency.length > 0) {
                allLatencies.push(...stage.latency);
            }
        });
        
        if (allLatencies.length > 0) {
            allLatencies.sort((a, b) => a - b);
            const p50Index = Math.floor(allLatencies.length * 0.5);
            const p95Index = Math.floor(allLatencies.length * 0.95);
            const p99Index = Math.floor(allLatencies.length * 0.99);
            
            this.performanceMetrics.p50Latency = allLatencies[p50Index] || 0;
            this.performanceMetrics.p95Latency = allLatencies[p95Index] || 0;
            this.performanceMetrics.p99Latency = allLatencies[p99Index] || 0;
        }
        
        // Calculate throughput
        const totalRate = Object.values(this.stages).reduce((sum, stage) => sum + (stage.rate || 0), 0);
        this.performanceMetrics.avgThroughput = totalRate / Object.keys(this.stages).length;
        this.performanceMetrics.peakThroughput = Math.max(this.performanceMetrics.peakThroughput, totalRate);
        
        // Calculate error rate
        const totalErrors = Object.values(this.stages).reduce((sum, stage) => sum + (stage.errors || 0), 0);
        const totalProcessed = this.systemMetrics.totalDataProcessed;
        this.performanceMetrics.errorRate = totalProcessed > 0 ? (totalErrors / totalProcessed) * 100 : 0;
        
        // Clean up old latency data
        Object.values(this.stages).forEach(stage => {
            if (stage.latency && stage.latency.length > 100) {
                stage.latency = stage.latency.slice(-100);
            }
        });
        
        this.emit('performance_metrics', this.performanceMetrics);
    }
    
    // WebSocket connection for real-time updates
    connect() {
        if (this.ws) return;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/monitor`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Connected to Pipeline Monitor WebSocket');
                this.reconnectAttempts = 0;
                this.emit('connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleRealtimeUpdate(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
                this.ws = null;
                this.emit('disconnected');
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.attemptReconnect();
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
        setTimeout(() => this.connect(), delay);
    }
    
    handleRealtimeUpdate(data) {
        switch (data.type) {
            case 'pipeline_metrics':
                this.stages = { ...this.stages, ...data.payload };
                this.emit('pipeline_update', this.stages);
                break;
                
            case 'source_status':
                const source = this.sources.get(data.payload.id);
                if (source) {
                    Object.assign(source, data.payload);
                    this.emit('source_update', source);
                }
                break;
                
            case 'quality_alert':
                this.qualityMetrics = { ...this.qualityMetrics, ...data.payload };
                this.emit('quality_alert', data.payload);
                break;
                
            case 'system_metrics':
                this.systemMetrics = { ...this.systemMetrics, ...data.payload };
                this.emit('system_metrics', this.systemMetrics);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    
    // Public API
    getStageMetrics(stageName) {
        return this.stages[stageName] || null;
    }
    
    getSourceStatus(sourceId) {
        return this.sources.get(sourceId) || null;
    }
    
    getAllSources() {
        return Array.from(this.sources.values());
    }
    
    getSystemHealth() {
        const activeSources = Array.from(this.sources.values()).filter(s => s.status === 'active').length;
        const totalSources = this.sources.size;
        const avgLatency = Array.from(this.sources.values())
            .reduce((sum, s) => sum + s.avgLatency, 0) / totalSources;
        
        return {
            healthy: activeSources === totalSources && avgLatency < 100,
            activeSources,
            totalSources,
            avgLatency,
            uptime: Date.now() - this.systemMetrics.uptime,
            errorRate: this.performanceMetrics.errorRate
        };
    }
    
    getQualitySummary() {
        return {
            outliersLastHour: this.qualityMetrics.outliers.length,
            correctionsLastHour: this.qualityMetrics.corrections.length,
            skewDetections: this.qualityMetrics.skewDetections.length,
            maxSkew: this.qualityMetrics.skewDetections.length > 0 
                ? Math.max(...this.qualityMetrics.skewDetections.map(s => s.maxDiff))
                : 0
        };
    }
}

// Export singleton instance
export const pipelineMonitor = new PipelineMonitor();
export default PipelineMonitor;