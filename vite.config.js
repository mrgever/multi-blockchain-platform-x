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
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'web3': ['ethers', 'web3modal', '@walletconnect/web3-provider'],
          'crypto': ['bitcoinjs-lib', 'bip39'],
          'ui': ['@stripe/stripe-js']
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
      '@stripe/stripe-js'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});