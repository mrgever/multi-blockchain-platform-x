import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'crypto': 'crypto-browserify',
      'stream': 'stream-browserify',
      'buffer': 'buffer'
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        analytics: resolve(__dirname, 'bitorzo-analytics.html'),
        features: resolve(__dirname, 'advanced-features.html')
      },
      external: [
        // Mark heavy dependencies as external to avoid build issues
        '@xenova/transformers',
        '@pinecone-database/pinecone',
        'snarkjs',
        'circomlibjs',
        '@apollo/server',
        '@apollo/gateway',
        '@opentelemetry/api',
        'ipfs-http-client',
        'kafkajs',
        'redis'
      ],
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'web3': ['ethers', 'web3modal'],
          'crypto': ['bitcoinjs-lib', 'bip39'],
          'ui': ['@stripe/stripe-js'],
          'charts': ['chart.js', 'd3']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'ethers',
      'web3modal',
      '@walletconnect/web3-provider',
      'bitcoinjs-lib',
      'bip39',
      '@stripe/stripe-js',
      'chart.js',
      'd3',
      'lodash',
      'moment'
    ],
    exclude: [
      // Exclude heavy ML/AI dependencies from pre-bundling
      '@xenova/transformers',
      '@tensorflow/tfjs',
      '@pinecone-database/pinecone',
      'snarkjs',
      'circomlibjs',
      'kafkajs',
      'redis'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});