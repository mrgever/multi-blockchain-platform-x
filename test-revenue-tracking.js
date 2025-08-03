/**
 * Test script for revenue tracking functionality
 * Run with: node test-revenue-tracking.js
 */

import { MonetizationService } from './src/services/monetization-service.js';

console.log('🧪 Testing Revenue Tracking System\n');

// Create monetization service instance
const service = new MonetizationService();

// Listen to revenue events
service.on('revenue_updated', (data) => {
    console.log('💰 Revenue Update:', {
        source: data.source,
        amount: `$${data.amount.toFixed(2)}`,
        dailyTotal: `$${data.daily.toFixed(2)}`,
        time: new Date(data.timestamp).toLocaleTimeString()
    });
});

service.on('daily_revenue_reset', (data) => {
    console.log('\n📅 Daily Revenue Reset Triggered:');
    console.log('Previous Day Summary:', {
        date: data.previousDay.date,
        totalRevenue: `$${data.previousDay.totalRevenue.toFixed(2)}`,
        transactions: data.previousDay.transactions,
        fees: `$${data.previousDay.fees.toFixed(2)}`,
        arbitrageProfit: `$${data.previousDay.arbitrageProfit.toFixed(2)}`,
        subscriptions: `$${data.previousDay.premiumSubscriptions.toFixed(2)}`
    });
});

// Test revenue updates
console.log('📊 Simulating revenue events...\n');

// Simulate manual revenue updates
setTimeout(() => {
    console.log('\n--- Manual Revenue Updates ---');
    service.updateRevenueData('fees', 125.50);
    service.updateRevenueData('arbitrageProfit', 450.00);
    service.updateRevenueData('premiumSubscriptions', 299.00);
}, 1000);

// Get revenue report
setTimeout(() => {
    console.log('\n📈 Revenue Report:');
    const report = service.getRevenueReport();
    
    console.log('\nCurrent Period:');
    console.log('Daily:', {
        revenue: `$${report.current.daily.totalRevenue.toFixed(2)}`,
        transactions: report.current.daily.transactions,
        lastUpdated: new Date(report.current.daily.lastUpdated).toLocaleTimeString()
    });
    
    console.log('Weekly:', {
        revenue: `$${report.current.weekly.totalRevenue.toFixed(2)}`
    });
    
    console.log('Monthly:', {
        revenue: `$${report.current.monthly.totalRevenue.toFixed(2)}`
    });
    
    console.log('\nProjections:');
    console.log('Daily Average:', `$${report.projections.dailyAverage.toFixed(2)}`);
    console.log('Monthly Projection:', `$${report.projections.monthlyProjection.toFixed(2)}`);
    console.log('Annual Projection:', `$${report.projections.annualProjection.toFixed(2)}`);
    
    console.log('\nTrend:', report.history.trend);
}, 3000);

// Test daily update (simulate midnight)
setTimeout(() => {
    console.log('\n⏰ Simulating Daily Update (midnight UTC)...');
    service.performDailyRevenueUpdate();
}, 5000);

// Show final system metrics
setTimeout(() => {
    console.log('\n📊 System Metrics with Revenue:');
    const metrics = service.getSystemMetrics();
    console.log({
        dataVolume: metrics.dataVolumeFormatted,
        eventsPerSecond: metrics.eventsPerSecond,
        reliability: `${metrics.reliability.toFixed(2)}%`,
        dailyRevenue: `$${metrics.revenueData.daily.totalRevenue.toFixed(2)}`,
        historicalDays: metrics.revenueData.history.length
    });
    
    console.log('\n✅ Revenue tracking test completed!');
    console.log('The system will automatically update revenue data every 24 hours at midnight UTC.');
    process.exit(0);
}, 7000);