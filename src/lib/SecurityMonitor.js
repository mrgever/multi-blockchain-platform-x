/**
 * Security Monitor - Production security and monitoring
 * Handles rate limiting, anomaly detection, and security alerts
 */

import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';
import axios from 'axios';

export class SecurityMonitor {
  constructor() {
    this.suspiciousActivities = new Map();
    this.rateLimiters = new Map();
    this.securityRules = {
      maxTransactionsPerHour: 10,
      maxFailedAttemptsPerHour: 5,
      suspiciousPatterns: [
        /eval\(/i,
        /document\.write/i,
        /<script/i,
        /javascript:/i,
        /onload=/i,
        /onerror=/i
      ],
      blacklistedAddresses: new Set([
        // Known malicious addresses would go here
      ])
    };

    this.initializeSentry();
    this.setupSecurityHeaders();
    this.startMonitoring();
  }

  /**
   * Initialize Sentry for error tracking and performance monitoring
   */
  initializeSentry() {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.NODE_ENV || 'development',
      integrations: [
        new BrowserTracing({
          // Performance Monitoring
          tracingOrigins: ['localhost', /^\//],
          routingInstrumentation: Sentry.browserTracingIntegration(),
        }),
      ],
      tracesSampleRate: import.meta.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Security-relevant options
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.authorization;
        }
        
        // Don't send events in development unless explicitly enabled
        if (import.meta.env.NODE_ENV === 'development' && 
            !import.meta.env.VITE_SENTRY_ENABLE_DEV) {
          return null;
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'Non-Error promise rejection captured'
      ],
    });

    // Set user context (without PII)
    Sentry.setContext('app', {
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.NODE_ENV
    });
  }

  /**
   * Setup security headers check
   */
  setupSecurityHeaders() {
    // Check if critical security headers are present
    if (typeof window !== 'undefined') {
      const checkHeaders = async () => {
        try {
          const response = await fetch(window.location.origin, { method: 'HEAD' });
          const headers = response.headers;
          
          const requiredHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'content-security-policy'
          ];
          
          const missingHeaders = requiredHeaders.filter(
            header => !headers.get(header)
          );
          
          if (missingHeaders.length > 0) {
            this.reportSecurityIssue('missing-security-headers', {
              missingHeaders,
              url: window.location.origin
            });
          }
        } catch (error) {
          console.error('Failed to check security headers:', error);
        }
      };
      
      // Check headers on load
      checkHeaders();
    }
  }

  /**
   * Start monitoring for security threats
   */
  startMonitoring() {
    // Monitor for XSS attempts
    this.monitorXSS();
    
    // Monitor for suspicious network activity
    this.monitorNetworkActivity();
    
    // Monitor for rate limit violations
    this.monitorRateLimits();
    
    // Monitor wallet interactions
    this.monitorWalletActivity();
  }

  /**
   * Monitor for XSS attempts
   */
  monitorXSS() {
    // Override potentially dangerous methods
    const dangerousMethods = ['eval', 'Function'];
    
    dangerousMethods.forEach(method => {
      const original = window[method];
      window[method] = (...args) => {
        this.reportSecurityIssue('potential-xss', {
          method,
          args: args.map(arg => String(arg).substring(0, 100))
        });
        
        // In production, block the execution
        if (import.meta.env.NODE_ENV === 'production') {
          throw new Error(`Security: ${method} is not allowed`);
        }
        
        return original.apply(window, args);
      };
    });

    // Monitor DOM mutations for script injections
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'SCRIPT' || 
                (node.innerHTML && this.containsSuspiciousPattern(node.innerHTML))) {
              this.reportSecurityIssue('suspicious-dom-mutation', {
                nodeName: node.nodeName,
                content: String(node.innerHTML || '').substring(0, 100)
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * Monitor network activity
   */
  monitorNetworkActivity() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource, config] = args;
      
      // Check for suspicious URLs
      if (this.isSuspiciousUrl(resource)) {
        this.reportSecurityIssue('suspicious-network-request', {
          url: resource,
          method: config?.method || 'GET'
        });
        
        // Block in production
        if (import.meta.env.NODE_ENV === 'production') {
          throw new Error('Security: Blocked suspicious request');
        }
      }
      
      return originalFetch.apply(window, args);
    };

    // Monitor WebSocket connections
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      if (this.isSuspiciousUrl(url)) {
        this.reportSecurityIssue('suspicious-websocket', { url });
        
        if (import.meta.env.NODE_ENV === 'production') {
          throw new Error('Security: Blocked suspicious WebSocket');
        }
      }
      
      return new OriginalWebSocket(url, protocols);
    };
  }

  /**
   * Monitor rate limits
   */
  monitorRateLimits() {
    // Clear rate limit counters every hour
    setInterval(() => {
      this.rateLimiters.clear();
    }, 3600000);
  }

  /**
   * Monitor wallet activity
   */
  monitorWalletActivity() {
    // Monitor for suspicious transaction patterns
    window.addEventListener('wallet-transaction', (event) => {
      const { to, value, from } = event.detail;
      
      // Check if address is blacklisted
      if (this.securityRules.blacklistedAddresses.has(to.toLowerCase())) {
        this.reportSecurityIssue('blacklisted-address', {
          address: to,
          type: 'recipient'
        });
        
        // Prevent transaction
        event.preventDefault();
        throw new Error('Security: Transaction to blacklisted address blocked');
      }
      
      // Check for unusual transaction patterns
      this.checkTransactionPattern(from, to, value);
    });
  }

  /**
   * Check if content contains suspicious patterns
   */
  containsSuspiciousPattern(content) {
    return this.securityRules.suspiciousPatterns.some(
      pattern => pattern.test(content)
    );
  }

  /**
   * Check if URL is suspicious
   */
  isSuspiciousUrl(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      
      // Allow same-origin and configured API endpoints
      const allowedHosts = [
        window.location.hostname,
        'stripe.com',
        'js.stripe.com',
        'api.stripe.com',
        'infura.io',
        'alchemy.com',
        'walletconnect.org',
        'coingecko.com'
      ];
      
      return !allowedHosts.some(host => 
        urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
      );
    } catch {
      return true; // Invalid URLs are suspicious
    }
  }

  /**
   * Check transaction patterns
   */
  checkTransactionPattern(from, to, value) {
    const key = `${from}-transactions`;
    const now = Date.now();
    
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, []);
    }
    
    const transactions = this.rateLimiters.get(key);
    transactions.push({ to, value, timestamp: now });
    
    // Keep only last hour
    const oneHourAgo = now - 3600000;
    const recentTransactions = transactions.filter(
      tx => tx.timestamp > oneHourAgo
    );
    this.rateLimiters.set(key, recentTransactions);
    
    // Check for violations
    if (recentTransactions.length > this.securityRules.maxTransactionsPerHour) {
      this.reportSecurityIssue('rate-limit-exceeded', {
        address: from,
        count: recentTransactions.length,
        limit: this.securityRules.maxTransactionsPerHour
      });
    }
  }

  /**
   * Report security issue
   */
  reportSecurityIssue(type, details) {
    const issue = {
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Log to console in development
    if (import.meta.env.NODE_ENV === 'development') {
      console.warn('Security Issue:', issue);
    }
    
    // Send to Sentry
    Sentry.captureMessage(`Security: ${type}`, {
      level: 'warning',
      extra: issue
    });
    
    // Send to backend security endpoint
    this.sendSecurityAlert(issue);
  }

  /**
   * Send security alert to backend
   */
  async sendSecurityAlert(issue) {
    try {
      await axios.post('/api/security/alert', issue, {
        headers: {
          'X-Security-Alert': 'true'
        }
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * Rate limiting helper
   */
  checkRateLimit(key, limit = 10, windowMs = 60000) {
    const now = Date.now();
    const limiter = this.rateLimiters.get(key) || { count: 0, resetAt: now + windowMs };
    
    if (now > limiter.resetAt) {
      limiter.count = 0;
      limiter.resetAt = now + windowMs;
    }
    
    limiter.count++;
    this.rateLimiters.set(key, limiter);
    
    if (limiter.count > limit) {
      this.reportSecurityIssue('rate-limit-violation', {
        key,
        count: limiter.count,
        limit
      });
      return false;
    }
    
    return true;
  }

  /**
   * Content Security Policy violation handler
   */
  handleCSPViolation(event) {
    this.reportSecurityIssue('csp-violation', {
      blockedUri: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy
    });
  }

  /**
   * Initialize CSP reporting
   */
  initializeCSPReporting() {
    document.addEventListener('securitypolicyviolation', 
      this.handleCSPViolation.bind(this)
    );
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics() {
    return {
      suspiciousActivities: this.suspiciousActivities.size,
      rateLimitViolations: Array.from(this.rateLimiters.entries()).filter(
        ([key, limiter]) => limiter.count > 10
      ).length,
      timestamp: new Date().toISOString()
    };
  }
}

// Create and export singleton instance
const securityMonitor = new SecurityMonitor();

// Expose to window for debugging (only in development)
if (import.meta.env.NODE_ENV === 'development') {
  window.__securityMonitor = securityMonitor;
}

export default securityMonitor;