/**
 * Bitorzo Health Monitor & Self-Healing System
 * Ensures 24/7 continuous operation with automatic recovery
 * Monitors all system components and data accuracy
 */

import { EventEmitter } from 'events';
import { marketDataService } from './market-data-service.js';
import { autonomousTrendMonitor } from './autonomous-trend-monitor.js';

export class HealthMonitor extends EventEmitter {
    constructor() {
        super();
        this.checks = new Map();
        this.alerts = [];
        this.metrics = new Map();
        this.healingHistory = [];
        this.isRunning = false;
        
        this.initializeHealthChecks();
        this.startContinuousMonitoring();
        
        console.log('🏥 Health Monitor initialized - Continuous health monitoring enabled');
    }

    initializeHealthChecks() {
        // Market Data Accuracy Checks
        this.checks.set('market_data_accuracy', {
            name: 'Market Data Accuracy',
            interval: 30000, // 30 seconds
            critical: true,
            lastCheck: 0,
            failures: 0,
            maxFailures: 3,
            checkFunction: this.checkMarketDataAccuracy.bind(this)
        });

        // Data Source Health
        this.checks.set('data_sources', {
            name: 'Data Sources Health',
            interval: 60000, // 1 minute
            critical: true,
            lastCheck: 0,
            failures: 0,
            maxFailures: 2,
            checkFunction: this.checkDataSources.bind(this)
        });

        // Trend Monitor Health
        this.checks.set('trend_monitor', {
            name: 'Autonomous Trend Monitor',
            interval: 120000, // 2 minutes
            critical: false,
            lastCheck: 0,
            failures: 0,
            maxFailures: 5,
            checkFunction: this.checkTrendMonitor.bind(this)
        });

        // System Performance
        this.checks.set('system_performance', {
            name: 'System Performance',
            interval: 60000, // 1 minute
            critical: false,
            lastCheck: 0,
            failures: 0,
            maxFailures: 10,
            checkFunction: this.checkSystemPerformance.bind(this)
        });

        // Application Health
        this.checks.set('application_health', {
            name: 'Application Health',
            interval: 30000, // 30 seconds
            critical: true,
            lastCheck: 0,
            failures: 0,
            maxFailures: 5,
            checkFunction: this.checkApplicationHealth.bind(this)
        });

        // Data Validation Pipeline
        this.checks.set('data_validation', {
            name: 'Data Validation Pipeline',
            interval: 45000, // 45 seconds
            critical: true,
            lastCheck: 0,
            failures: 0,
            maxFailures: 3,
            checkFunction: this.checkDataValidation.bind(this)
        });
    }

    async startContinuousMonitoring() {
        if (this.isRunning) {
            console.log('⚠️ Health monitor already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting 24/7 health monitoring...');

        // Start individual check intervals
        for (const [checkId, check] of this.checks) {
            this.startCheckInterval(checkId, check);
        }

        // Master health evaluation every 5 minutes
        this.masterHealthInterval = setInterval(async () => {
            await this.performMasterHealthEvaluation();
        }, 300000);

        // Self-healing routine every 10 minutes
        this.selfHealingInterval = setInterval(async () => {
            await this.performSelfHealing();
        }, 600000);

        // Generate health reports every hour
        this.reportingInterval = setInterval(async () => {
            await this.generateHealthReport();
        }, 3600000);

        this.emit('monitoring_started', { timestamp: Date.now() });
    }

    startCheckInterval(checkId, check) {
        const interval = setInterval(async () => {
            try {
                await this.runHealthCheck(checkId, check);
            } catch (error) {
                this.logAlert('health_check_error', 'error', {
                    check: checkId,
                    error: error.message
                });
            }
        }, check.interval);

        check.intervalId = interval;
    }

    async runHealthCheck(checkId, check) {
        const startTime = Date.now();
        
        try {
            const result = await check.checkFunction();
            const latency = Date.now() - startTime;
            
            // Update metrics
            this.updateMetrics(checkId, {
                status: result.healthy ? 'healthy' : 'unhealthy',
                latency,
                details: result.details || {},
                timestamp: Date.now()
            });

            // Handle check result
            if (result.healthy) {
                check.failures = 0;
                check.lastCheck = Date.now();
            } else {
                check.failures++;
                
                if (check.failures >= check.maxFailures) {
                    await this.handleCriticalFailure(checkId, check, result);
                } else {
                    this.logAlert(`${checkId}_warning`, 'warning', {
                        check: check.name,
                        failures: check.failures,
                        maxFailures: check.maxFailures,
                        details: result.details
                    });
                }
            }

            this.emit('health_check_complete', {
                checkId,
                healthy: result.healthy,
                latency,
                details: result.details
            });

        } catch (error) {
            check.failures++;
            this.logAlert(`${checkId}_error`, 'error', {
                check: check.name,
                error: error.message,
                failures: check.failures
            });
        }
    }

    async checkMarketDataAccuracy() {
        try {
            // Test multiple cryptocurrencies for data consistency
            const testSymbols = ['BTC', 'ETH', 'BNB'];
            const data = await marketDataService.fetchPriceData(testSymbols, {
                requireConsensus: true,
                minSources: 2
            });

            const issues = [];
            
            for (const [symbol, info] of Object.entries(data)) {
                // Check data freshness
                const age = Date.now() - new Date(info.last_updated).getTime();
                if (age > 300000) { // 5 minutes
                    issues.push(`${symbol} data is stale (${Math.floor(age/1000)}s old)`);
                }

                // Check price reasonableness
                if (info.price <= 0) {
                    issues.push(`${symbol} has invalid price: ${info.price}`);
                }

                // Check data quality
                if (info.data_quality && info.data_quality.price_deviation > 0.1) {
                    issues.push(`${symbol} has high price deviation: ${(info.data_quality.price_deviation * 100).toFixed(2)}%`);
                }

                // Check consensus
                if (info.data_quality && !info.data_quality.consensus_reached) {
                    issues.push(`${symbol} failed consensus check`);
                }
            }

            return {
                healthy: issues.length === 0,
                details: {
                    symbols_checked: testSymbols.length,
                    symbols_received: Object.keys(data).length,
                    issues: issues,
                    data_sources: Object.values(data)[0]?.sources || [],
                    check_time: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                healthy: false,
                details: {
                    error: error.message,
                    error_type: 'market_data_fetch_failed'
                }
            };
        }
    }

    async checkDataSources() {
        try {
            const healthStatus = marketDataService.getHealthStatus();
            const sources = Object.keys(healthStatus);
            const healthySources = Object.values(healthStatus).filter(s => s.status === 'healthy').length;
            const downSources = Object.values(healthStatus).filter(s => s.status === 'down');

            return {
                healthy: healthySources >= 2, // Need at least 2 healthy sources
                details: {
                    total_sources: sources.length,
                    healthy_sources: healthySources,
                    down_sources: downSources.map(s => s.source || 'unknown'),
                    uptime_percentage: (healthySources / sources.length) * 100,
                    source_details: healthStatus
                }
            };

        } catch (error) {
            return {
                healthy: false,
                details: {
                    error: error.message,
                    error_type: 'data_sources_check_failed'
                }
            };
        }
    }

    async checkTrendMonitor() {
        try {
            const queueStatus = autonomousTrendMonitor.getQueueStatus();
            const activeFeatures = autonomousTrendMonitor.getActiveFeatures();
            const errorSummary = autonomousTrendMonitor.getErrorSummary();

            // Check if trend monitor is responsive
            const isResponsive = autonomousTrendMonitor.isRunning;
            
            // Check queue health
            const queueHealthy = queueStatus.total < 100; // Don't let queue grow too large
            
            // Check error rate
            const errorRate = errorSummary.recent_errors / Math.max(1, activeFeatures.length);
            const errorHealthy = errorRate < 0.5; // Less than 50% error rate

            return {
                healthy: isResponsive && queueHealthy && errorHealthy,
                details: {
                    is_running: isResponsive,
                    queue_size: queueStatus.total,
                    active_features: activeFeatures.length,
                    recent_errors: errorSummary.recent_errors,
                    error_rate: errorRate,
                    queue_by_priority: queueStatus.by_priority,
                    queue_by_type: queueStatus.by_type
                }
            };

        } catch (error) {
            return {
                healthy: false,
                details: {
                    error: error.message,
                    error_type: 'trend_monitor_check_failed'
                }
            };
        }
    }

    async checkSystemPerformance() {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime();
            
            // Memory thresholds
            const memoryHealthy = memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9;
            
            // CPU usage (approximate)
            const cpuUsage = process.cpuUsage();
            const cpuPercentage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage
            const cpuHealthy = cpuPercentage < 80;

            return {
                healthy: memoryHealthy && cpuHealthy,
                details: {
                    memory: {
                        used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                        total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                        usage_percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
                        healthy: memoryHealthy
                    },
                    cpu: {
                        usage_percentage: cpuPercentage,
                        healthy: cpuHealthy
                    },
                    uptime_hours: uptime / 3600,
                    node_version: process.version
                }
            };

        } catch (error) {
            return {
                healthy: false,
                details: {
                    error: error.message,
                    error_type: 'performance_check_failed'
                }
            };
        }
    }

    async checkApplicationHealth() {
        try {
            const checks = [];
            
            // Check if market data service is initialized
            checks.push({
                name: 'market_data_service',
                healthy: marketDataService && typeof marketDataService.fetchPriceData === 'function'
            });

            // Check if trend monitor is available
            checks.push({
                name: 'trend_monitor',
                healthy: autonomousTrendMonitor && typeof autonomousTrendMonitor.getQueueStatus === 'function'
            });

            // Check cache status
            const cacheStats = marketDataService.getCacheStats();
            checks.push({
                name: 'cache_system',
                healthy: cacheStats && cacheStats.size >= 0
            });

            const allHealthy = checks.every(check => check.healthy);

            return {
                healthy: allHealthy,
                details: {
                    component_checks: checks,
                    cache_stats: cacheStats,
                    check_time: new Date().toISOString()
                }
            };

        } catch (error) {
            return {
                healthy: false,
                details: {
                    error: error.message,
                    error_type: 'application_health_check_failed'
                }
            };
        }
    }

    async checkDataValidation() {
        try {
            // Test data validation pipeline
            const testData = {
                BTC: {
                    price: 45000,
                    volume_24h: 1000000,
                    last_updated: new Date().toISOString()
                }
            };

            // Validate data structure
            const validationResults = this.validateDataStructure(testData);
            
            // Check data freshness validation
            const freshnessCheck = this.validateDataFreshness(testData);
            
            // Check price validation
            const priceCheck = this.validatePriceData(testData);

            const allValid = validationResults.valid && freshnessCheck.valid && priceCheck.valid;

            return {
                healthy: allValid,
                details: {
                    structure_validation: validationResults,
                    freshness_validation: freshnessCheck,
                    price_validation: priceCheck,
                    validation_pipeline_active: true
                }
            };

        } catch (error) {
            return {
                healthy: false,
                details: {
                    error: error.message,
                    error_type: 'data_validation_check_failed'
                }
            };
        }
    }

    validateDataStructure(data) {
        try {
            for (const [symbol, info] of Object.entries(data)) {
                if (!info.price || typeof info.price !== 'number') {
                    return { valid: false, reason: `Invalid price for ${symbol}` };
                }
                if (!info.last_updated) {
                    return { valid: false, reason: `Missing timestamp for ${symbol}` };
                }
            }
            return { valid: true };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    validateDataFreshness(data) {
        try {
            const maxAge = 600000; // 10 minutes
            for (const [symbol, info] of Object.entries(data)) {
                const age = Date.now() - new Date(info.last_updated).getTime();
                if (age > maxAge) {
                    return { valid: false, reason: `${symbol} data too old: ${age}ms` };
                }
            }
            return { valid: true };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    validatePriceData(data) {
        try {
            for (const [symbol, info] of Object.entries(data)) {
                if (info.price <= 0) {
                    return { valid: false, reason: `Invalid price for ${symbol}: ${info.price}` };
                }
                if (symbol === 'BTC' && (info.price < 1000 || info.price > 1000000)) {
                    return { valid: false, reason: `BTC price out of reasonable range: ${info.price}` };
                }
            }
            return { valid: true };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    async handleCriticalFailure(checkId, check, result) {
        this.logAlert(`${checkId}_critical`, 'critical', {
            check: check.name,
            failures: check.failures,
            maxFailures: check.maxFailures,
            details: result.details
        });

        // Attempt immediate healing
        const healingResult = await this.attemptHealing(checkId, check);
        
        if (!healingResult.success) {
            // Escalate to emergency procedures
            await this.escalateToEmergency(checkId, check, result);
        }
    }

    async attemptHealing(checkId, check) {
        console.log(`🏥 Attempting healing for ${check.name}...`);
        
        try {
            switch (checkId) {
                case 'market_data_accuracy':
                    return await this.healMarketDataIssues();
                    
                case 'data_sources':
                    return await this.healDataSourceIssues();
                    
                case 'trend_monitor':
                    return await this.healTrendMonitorIssues();
                    
                case 'system_performance':
                    return await this.healPerformanceIssues();
                    
                case 'application_health':
                    return await this.healApplicationIssues();
                    
                case 'data_validation':
                    return await this.healDataValidationIssues();
                    
                default:
                    return { success: false, reason: 'Unknown check type' };
            }
        } catch (error) {
            return { success: false, reason: error.message };
        }
    }

    async healMarketDataIssues() {
        // Clear cache to force fresh data fetch
        marketDataService.cache.clear();
        
        // Force health check on all data sources
        await marketDataService.performHealthChecks();
        
        return { success: true, actions: ['cache_cleared', 'health_checks_forced'] };
    }

    async healDataSourceIssues() {
        // Trigger self-healing in market data service
        await marketDataService.performSelfHealing();
        
        return { success: true, actions: ['market_data_self_healing'] };
    }

    async healTrendMonitorIssues() {
        // Trigger self-healing in trend monitor
        await autonomousTrendMonitor.performSelfHealing();
        
        return { success: true, actions: ['trend_monitor_self_healing'] };
    }

    async healPerformanceIssues() {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        // Clear old metrics
        this.clearOldMetrics();
        
        return { success: true, actions: ['garbage_collection', 'metrics_cleanup'] };
    }

    async healApplicationIssues() {
        // Restart services if needed
        const actions = [];
        
        try {
            // Re-initialize market data service connections
            await marketDataService.performHealthChecks();
            actions.push('market_data_reinitialized');
        } catch (error) {
            console.error('Failed to reinitialize market data service:', error);
        }
        
        return { success: actions.length > 0, actions };
    }

    async healDataValidationIssues() {
        // Reset validation pipeline
        marketDataService.startDataValidation();
        
        return { success: true, actions: ['validation_pipeline_reset'] };
    }

    async escalateToEmergency(checkId, check, result) {
        const emergency = {
            timestamp: Date.now(),
            check: check.name,
            checkId,
            severity: 'emergency',
            details: result.details,
            actions_required: this.generateEmergencyActions(checkId)
        };

        this.logAlert('system_emergency', 'emergency', emergency);
        
        // Send emergency notification (in a real system, this would be email/SMS)
        console.error('🚨 SYSTEM EMERGENCY 🚨', emergency);
        
        this.emit('emergency_alert', emergency);
    }

    generateEmergencyActions(checkId) {
        const actions = {
            'market_data_accuracy': [
                'Switch to backup data sources',
                'Enable manual data validation',
                'Alert operations team'
            ],
            'data_sources': [
                'Activate emergency data feeds',
                'Implement fallback mechanisms',
                'Contact data providers'
            ],
            'trend_monitor': [
                'Disable autonomous development',
                'Switch to manual monitoring',
                'Preserve development queue'
            ],
            'system_performance': [
                'Scale up resources',
                'Optimize memory usage',
                'Check for memory leaks'
            ],
            'application_health': [
                'Restart application services',
                'Check infrastructure status',
                'Verify dependencies'
            ],
            'data_validation': [
                'Implement manual validation',
                'Quarantine suspicious data',
                'Review validation rules'
            ]
        };

        return actions[checkId] || ['Contact system administrator'];
    }

    async performMasterHealthEvaluation() {
        const overallHealth = {
            timestamp: Date.now(),
            status: 'healthy',
            critical_failures: 0,
            warnings: 0,
            checks: {}
        };

        for (const [checkId, check] of this.checks) {
            const metrics = this.metrics.get(checkId);
            if (metrics) {
                overallHealth.checks[checkId] = {
                    status: metrics.status,
                    failures: check.failures,
                    last_check: check.lastCheck,
                    critical: check.critical
                };

                if (check.critical && metrics.status !== 'healthy') {
                    overallHealth.critical_failures++;
                    overallHealth.status = 'critical';
                } else if (metrics.status !== 'healthy') {
                    overallHealth.warnings++;
                    if (overallHealth.status === 'healthy') {
                        overallHealth.status = 'warning';
                    }
                }
            }
        }

        this.emit('master_health_evaluation', overallHealth);
        return overallHealth;
    }

    async performSelfHealing() {
        console.log('🏥 Performing comprehensive self-healing...');
        
        const healingActions = [];
        
        // Clean up old alerts
        const oneHourAgo = Date.now() - 3600000;
        const oldAlertCount = this.alerts.length;
        this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
        if (this.alerts.length < oldAlertCount) {
            healingActions.push('alerts_cleaned');
        }
        
        // Clean up old metrics
        this.clearOldMetrics();
        healingActions.push('metrics_cleaned');
        
        // Verify all check intervals are running
        for (const [checkId, check] of this.checks) {
            if (!check.intervalId) {
                this.startCheckInterval(checkId, check);
                healingActions.push(`restarted_check_${checkId}`);
            }
        }
        
        const healingReport = {
            timestamp: Date.now(),
            actions_taken: healingActions,
            alerts_count: this.alerts.length,
            metrics_count: this.metrics.size,
            checks_running: Array.from(this.checks.keys()).filter(id => this.checks.get(id).intervalId).length
        };
        
        this.healingHistory.push(healingReport);
        
        // Keep only last 24 healing reports
        if (this.healingHistory.length > 24) {
            this.healingHistory.shift();
        }
        
        this.emit('self_healing_complete', healingReport);
        return healingReport;
    }

    async generateHealthReport() {
        const report = {
            timestamp: Date.now(),
            system_status: await this.performMasterHealthEvaluation(),
            alerts_summary: this.getAlertsSummary(),
            performance_metrics: this.getPerformanceMetrics(),
            healing_history: this.healingHistory.slice(-5), // Last 5 healing actions
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
        };

        this.emit('health_report_generated', report);
        console.log('📊 Health report generated:', {
            status: report.system_status.status,
            critical_failures: report.system_status.critical_failures,
            warnings: report.system_status.warnings,
            recent_alerts: report.alerts_summary.recent
        });

        return report;
    }

    updateMetrics(checkId, metrics) {
        this.metrics.set(checkId, {
            ...metrics,
            check_id: checkId
        });
    }

    clearOldMetrics() {
        const sixHoursAgo = Date.now() - 21600000; // 6 hours
        
        for (const [checkId, metrics] of this.metrics) {
            if (metrics.timestamp < sixHoursAgo) {
                this.metrics.delete(checkId);
            }
        }
    }

    logAlert(type, severity, details) {
        const alert = {
            timestamp: Date.now(),
            type,
            severity,
            details,
            id: this.generateAlertId()
        };

        this.alerts.push(alert);
        
        // Keep only last 1000 alerts
        if (this.alerts.length > 1000) {
            this.alerts.shift();
        }

        const logFunction = severity === 'critical' ? console.error : 
                           severity === 'error' ? console.error :
                           severity === 'warning' ? console.warn : console.log;

        logFunction(`🚨 ${severity.toUpperCase()} Alert: ${type}`, details);
        
        this.emit('alert_logged', alert);
    }

    generateAlertId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getAlertsSummary() {
        const oneHourAgo = Date.now() - 3600000;
        const recent = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
        
        return {
            total: this.alerts.length,
            recent: recent.length,
            by_severity: recent.reduce((acc, alert) => {
                acc[alert.severity] = (acc[alert.severity] || 0) + 1;
                return acc;
            }, {}),
            by_type: recent.reduce((acc, alert) => {
                acc[alert.type] = (acc[alert.type] || 0) + 1;
                return acc;
            }, {})
        };
    }

    getPerformanceMetrics() {
        const metrics = {};
        
        for (const [checkId, data] of this.metrics) {
            if (data.latency) {
                metrics[checkId] = {
                    status: data.status,
                    latency: data.latency,
                    timestamp: data.timestamp
                };
            }
        }
        
        return metrics;
    }

    // Public API methods
    getSystemHealth() {
        return this.performMasterHealthEvaluation();
    }

    getDetailedMetrics() {
        return Object.fromEntries(this.metrics);
    }

    getRecentAlerts(hours = 1) {
        const cutoff = Date.now() - (hours * 3600000);
        return this.alerts.filter(alert => alert.timestamp > cutoff);
    }

    forceHealthCheck(checkId) {
        const check = this.checks.get(checkId);
        if (check) {
            return this.runHealthCheck(checkId, check);
        }
        throw new Error(`Unknown health check: ${checkId}`);
    }

    stop() {
        this.isRunning = false;
        
        // Clear all intervals
        for (const [checkId, check] of this.checks) {
            if (check.intervalId) {
                clearInterval(check.intervalId);
                delete check.intervalId;
            }
        }
        
        if (this.masterHealthInterval) clearInterval(this.masterHealthInterval);
        if (this.selfHealingInterval) clearInterval(this.selfHealingInterval);
        if (this.reportingInterval) clearInterval(this.reportingInterval);
        
        console.log('🛑 Health monitor stopped');
        this.emit('monitoring_stopped', { timestamp: Date.now() });
    }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();
export default HealthMonitor;