import Chart from 'chart.js/auto';
import * as d3 from 'd3';
import { WebSocketManager } from './WebSocketManager.js';
import { KafkaAnalytics } from './KafkaAnalytics.js';

export class AnalyticsDashboard {
  constructor(container) {
    this.container = container;
    this.charts = new Map();
    this.wsManager = new WebSocketManager();
    this.kafkaAnalytics = new KafkaAnalytics();
    this.data = {
      transactions: [],
      blocks: [],
      prices: {},
      metrics: {},
      alerts: []
    };
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.wsManager.connect();
      await this.kafkaAnalytics.initialize();
      
      this.setupEventListeners();
      this.renderDashboard();
      this.startDataStreaming();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      return false;
    }
  }

  setupEventListeners() {
    this.wsManager.on('transaction', (tx) => {
      this.data.transactions.push(tx);
      if (this.data.transactions.length > 1000) {
        this.data.transactions.shift();
      }
      this.updateTransactionChart();
    });

    this.wsManager.on('blockchain-update', (update) => {
      this.data.blocks.push(update);
      this.updateBlockchainMetrics();
    });

    this.wsManager.on('price-update', (prices) => {
      this.data.prices = { ...this.data.prices, ...prices };
      this.updatePriceCharts();
    });

    this.wsManager.on('alert', (alert) => {
      this.data.alerts.unshift(alert);
      if (this.data.alerts.length > 50) {
        this.data.alerts.pop();
      }
      this.displayAlert(alert);
    });

    this.kafkaAnalytics.on('metrics-update', (metrics) => {
      this.data.metrics = metrics;
      this.updateMetricsDisplay();
    });

    this.kafkaAnalytics.on('anomaly-detected', (anomaly) => {
      this.handleAnomaly(anomaly);
    });
  }

  renderDashboard() {
    this.container.innerHTML = `
      <div class="analytics-dashboard p-6 bg-gray-900 text-white min-h-screen">
        <div class="dashboard-header mb-8">
          <h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Bitorzo Analytics Dashboard
          </h1>
          <p class="text-gray-400">Real-time blockchain analytics powered by Kafka</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="metric-card bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-sm text-gray-400 mb-2">Total Volume (24h)</h3>
            <p class="text-3xl font-bold" id="total-volume">$0</p>
            <span class="text-sm text-green-400">+0%</span>
          </div>
          <div class="metric-card bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-sm text-gray-400 mb-2">Active Wallets</h3>
            <p class="text-3xl font-bold" id="active-wallets">0</p>
            <span class="text-sm text-blue-400">Live</span>
          </div>
          <div class="metric-card bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-sm text-gray-400 mb-2">Transactions/sec</h3>
            <p class="text-3xl font-bold" id="tps">0</p>
            <span class="text-sm text-yellow-400">Avg</span>
          </div>
          <div class="metric-card bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-sm text-gray-400 mb-2">Anomalies</h3>
            <p class="text-3xl font-bold" id="anomalies">0</p>
            <span class="text-sm text-red-400">Detected</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="chart-container bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Transaction Volume</h3>
            <canvas id="tx-volume-chart" height="200"></canvas>
          </div>
          <div class="chart-container bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Network Distribution</h3>
            <canvas id="network-dist-chart" height="200"></canvas>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 lg:col-span-2">
            <h3 class="text-lg font-semibold mb-4">Real-time Transaction Flow</h3>
            <div id="transaction-flow" style="height: 400px;"></div>
          </div>
          <div class="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Recent Alerts</h3>
            <div id="alerts-container" class="space-y-2 max-h-96 overflow-y-auto"></div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Gas Price Trends</h3>
            <canvas id="gas-price-chart" height="150"></canvas>
          </div>
          <div class="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-lg font-semibold mb-4">Top Tokens by Volume</h3>
            <div id="top-tokens" class="space-y-2"></div>
          </div>
        </div>
      </div>
    `;

    this.initializeCharts();
    this.initializeD3Visualizations();
  }

  initializeCharts() {
    const txVolumeCtx = document.getElementById('tx-volume-chart').getContext('2d');
    this.charts.set('txVolume', new Chart(txVolumeCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Transaction Volume',
          data: [],
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
          },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
          }
        }
      }
    }));

    const networkDistCtx = document.getElementById('network-dist-chart').getContext('2d');
    this.charts.set('networkDist', new Chart(networkDistCtx, {
      type: 'doughnut',
      data: {
        labels: ['Ethereum', 'Polygon', 'BSC', 'Arbitrum'],
        datasets: [{
          data: [40, 30, 20, 10],
          backgroundColor: [
            'rgb(59, 130, 246)',
            'rgb(139, 92, 246)',
            'rgb(236, 72, 153)',
            'rgb(34, 197, 94)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: 'rgba(255, 255, 255, 0.7)' }
          }
        }
      }
    }));

    const gasPriceCtx = document.getElementById('gas-price-chart').getContext('2d');
    this.charts.set('gasPrice', new Chart(gasPriceCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Gas Price (Gwei)',
          data: [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
          },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
          }
        }
      }
    }));
  }

  initializeD3Visualizations() {
    this.createTransactionFlow();
  }

  createTransactionFlow() {
    const container = d3.select('#transaction-flow');
    const width = container.node().getBoundingClientRect().width;
    const height = 400;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    const simulation = d3.forceSimulation()
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.radius + 2));

    this.transactionFlowViz = { svg, g, simulation, width, height };
  }

  updateTransactionChart() {
    const chart = this.charts.get('txVolume');
    if (!chart) return;

    const now = new Date();
    const label = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    
    chart.data.labels.push(label);
    if (chart.data.labels.length > 20) {
      chart.data.labels.shift();
    }

    const volume = this.data.transactions.reduce((sum, tx) => sum + (tx.value || 0), 0);
    chart.data.datasets[0].data.push(volume);
    if (chart.data.datasets[0].data.length > 20) {
      chart.data.datasets[0].data.shift();
    }

    chart.update('none');
  }

  updateBlockchainMetrics() {
    const volumeEl = document.getElementById('total-volume');
    const walletsEl = document.getElementById('active-wallets');
    const tpsEl = document.getElementById('tps');

    if (volumeEl) {
      const volume = this.data.transactions.reduce((sum, tx) => sum + (tx.value || 0), 0);
      volumeEl.textContent = `$${(volume / 1000000).toFixed(2)}M`;
    }

    if (walletsEl) {
      const uniqueWallets = new Set(this.data.transactions.map(tx => tx.from));
      walletsEl.textContent = uniqueWallets.size.toLocaleString();
    }

    if (tpsEl) {
      const recentTxs = this.data.transactions.filter(tx => 
        Date.now() - new Date(tx.timestamp).getTime() < 60000
      );
      tpsEl.textContent = (recentTxs.length / 60).toFixed(2);
    }
  }

  updatePriceCharts() {
    const gasChart = this.charts.get('gasPrice');
    if (!gasChart) return;

    const now = new Date();
    const label = `${now.getHours()}:${now.getMinutes()}`;
    
    gasChart.data.labels.push(label);
    if (gasChart.data.labels.length > 30) {
      gasChart.data.labels.shift();
    }

    const gasPrice = this.data.prices.gasPrice || Math.random() * 100;
    gasChart.data.datasets[0].data.push(gasPrice);
    if (gasChart.data.datasets[0].data.length > 30) {
      gasChart.data.datasets[0].data.shift();
    }

    gasChart.update('none');
  }

  updateMetricsDisplay() {
    const anomaliesEl = document.getElementById('anomalies');
    if (anomaliesEl && this.data.metrics.anomaliesDetected !== undefined) {
      anomaliesEl.textContent = this.data.metrics.anomaliesDetected;
    }

    this.updateTopTokens();
  }

  updateTopTokens() {
    const container = document.getElementById('top-tokens');
    if (!container) return;

    const tokens = [
      { symbol: 'ETH', volume: 2500000, change: 5.2 },
      { symbol: 'USDT', volume: 1800000, change: 0.1 },
      { symbol: 'MATIC', volume: 1200000, change: -2.3 },
      { symbol: 'BNB', volume: 900000, change: 3.7 },
      { symbol: 'USDC', volume: 750000, change: 0.0 }
    ];

    container.innerHTML = tokens.map(token => `
      <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
        <div class="flex items-center space-x-3">
          <span class="font-semibold">${token.symbol}</span>
          <span class="text-sm text-gray-400">$${(token.volume / 1000000).toFixed(2)}M</span>
        </div>
        <span class="text-sm ${token.change >= 0 ? 'text-green-400' : 'text-red-400'}">
          ${token.change >= 0 ? '+' : ''}${token.change.toFixed(1)}%
        </span>
      </div>
    `).join('');
  }

  displayAlert(alert) {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    const alertEl = document.createElement('div');
    alertEl.className = `alert p-3 rounded border ${
      alert.severity === 'high' ? 'bg-red-900 border-red-700' : 
      alert.severity === 'medium' ? 'bg-yellow-900 border-yellow-700' : 
      'bg-blue-900 border-blue-700'
    }`;
    
    alertEl.innerHTML = `
      <div class="flex items-start space-x-2">
        <i class="fas fa-exclamation-triangle text-${
          alert.severity === 'high' ? 'red' : 
          alert.severity === 'medium' ? 'yellow' : 'blue'
        }-400"></i>
        <div class="flex-1">
          <p class="text-sm font-medium">${alert.title}</p>
          <p class="text-xs text-gray-400 mt-1">${alert.message}</p>
          <p class="text-xs text-gray-500 mt-1">${new Date(alert.timestamp).toLocaleTimeString()}</p>
        </div>
      </div>
    `;

    container.insertBefore(alertEl, container.firstChild);
    
    if (container.children.length > 10) {
      container.removeChild(container.lastChild);
    }
  }

  handleAnomaly(anomaly) {
    this.displayAlert({
      severity: 'high',
      title: 'Anomaly Detected',
      message: `${anomaly.type}: ${anomaly.description}`,
      timestamp: anomaly.timestamp
    });

    const anomaliesEl = document.getElementById('anomalies');
    if (anomaliesEl) {
      const count = parseInt(anomaliesEl.textContent) || 0;
      anomaliesEl.textContent = count + 1;
    }
  }

  startDataStreaming() {
    this.wsManager.startRealtimeStreaming({
      blockchains: ['ethereum', 'polygon', 'bsc', 'arbitrum'],
      dataTypes: ['transactions', 'blocks', 'prices', 'metrics'],
      filters: {
        minValue: 100,
        includeTokenTransfers: true
      }
    });

    setInterval(() => {
      this.kafkaAnalytics.aggregateMetrics('5m');
    }, 300000);
  }

  async destroy() {
    this.wsManager.disconnect();
    await this.kafkaAnalytics.disconnect();
    
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export default AnalyticsDashboard;