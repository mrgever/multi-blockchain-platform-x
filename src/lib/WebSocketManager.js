import { io } from 'socket.io-client';
import EventEmitter from 'events';

export class WebSocketManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      url: config.url || 'ws://localhost:3001',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      ...config
    };
    
    this.socket = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        timeout: this.config.timeout,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.processQueuedMessages();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        this.emit('disconnected', reason);
      });

      this.socket.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.setupEventHandlers();
    });
  }

  setupEventHandlers() {
    this.socket.on('blockchain-update', (data) => {
      this.emit('blockchain-update', data);
      this.notifySubscribers('blockchain', data);
    });

    this.socket.on('transaction-stream', (data) => {
      this.emit('transaction', data);
      this.notifySubscribers('transactions', data);
    });

    this.socket.on('price-update', (data) => {
      this.emit('price-update', data);
      this.notifySubscribers('prices', data);
    });

    this.socket.on('analytics-update', (data) => {
      this.emit('analytics', data);
      this.notifySubscribers('analytics', data);
    });

    this.socket.on('alert', (data) => {
      this.emit('alert', data);
      this.notifySubscribers('alerts', data);
    });

    this.socket.on('metrics', (data) => {
      this.emit('metrics', data);
      this.notifySubscribers('metrics', data);
    });
  }

  subscribe(channel, callback) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    
    this.subscriptions.get(channel).add(callback);
    
    if (this.connected) {
      this.socket.emit('subscribe', { channel });
    } else {
      this.messageQueue.push({ type: 'subscribe', data: { channel } });
    }

    return () => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel);
          if (this.connected) {
            this.socket.emit('unsubscribe', { channel });
          }
        }
      }
    };
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

  emit(event, data) {
    super.emit(event, data);
  }

  send(event, data) {
    if (this.connected) {
      this.socket.emit(event, data);
    } else {
      this.messageQueue.push({ type: 'emit', event, data });
    }
  }

  processQueuedMessages() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message.type === 'subscribe') {
        this.socket.emit('subscribe', message.data);
      } else if (message.type === 'emit') {
        this.socket.emit(message.event, message.data);
      }
    }
  }

  startRealtimeStreaming(options = {}) {
    const streamConfig = {
      blockchains: options.blockchains || ['ethereum', 'polygon', 'bsc'],
      dataTypes: options.dataTypes || ['transactions', 'blocks', 'prices'],
      filters: options.filters || {},
      ...options
    };

    this.send('start-streaming', streamConfig);
    
    return {
      stop: () => this.send('stop-streaming', { id: streamConfig.id })
    };
  }

  requestAnalytics(query) {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      
      const timeout = setTimeout(() => {
        reject(new Error('Analytics request timeout'));
      }, 30000);

      this.socket.once(`analytics-response-${requestId}`, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      });

      this.send('analytics-request', { ...query, requestId });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.subscriptions.clear();
      this.messageQueue = [];
    }
  }
}

export default WebSocketManager;