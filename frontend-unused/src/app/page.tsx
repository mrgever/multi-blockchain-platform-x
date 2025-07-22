'use client'

import { useEffect, useState } from 'react'

interface ApiHealthResponse {
  status: string;
  timestamp: string;
  environment: string;
}

interface BlockchainsResponse {
  blockchains: string[];
  tokens?: any;
}

export default function Home() {
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null)
  const [blockchains, setBlockchains] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch health status
      const healthResponse = await fetch('http://localhost:3001/health')
      if (healthResponse.ok) {
        const healthData: ApiHealthResponse = await healthResponse.json()
        setApiHealth(healthData)
      }

      // Fetch blockchains
      const blockchainsResponse = await fetch('http://localhost:3001/api/v1/blockchains')
      if (blockchainsResponse.ok) {
        const blockchainsData: BlockchainsResponse = await blockchainsResponse.json()
        setBlockchains(blockchainsData.blockchains || [])
      }
    } catch (err) {
      setError('Failed to fetch data from API')
      console.error('API Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Multi-Blockchain Platform...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🚀 Multi-Blockchain Platform
            </h1>
            <p className="text-gray-600 text-lg">
              Manage TON, Ethereum, Bitcoin, Dogecoin, and USDT from one platform
            </p>
          </div>

          {/* API Status */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              📊 System Status
            </h2>
            
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                  <span className="text-red-700">{error}</span>
                </div>
                <button 
                  onClick={fetchData}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : apiHealth ? (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
                    <span className="text-green-700 font-medium">API Online</span>
                  </div>
                  <span className="text-green-600 text-sm">
                    Environment: {apiHealth.environment}
                  </span>
                </div>
                <p className="text-green-600 text-sm mt-2">
                  Last updated: {new Date(apiHealth.timestamp).toLocaleString()}
                </p>
              </div>
            ) : null}
          </div>

          {/* Supported Blockchains */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              ⛓️ Supported Blockchains
            </h2>
            
            {blockchains.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {blockchains.map((chain) => (
                  <div
                    key={chain}
                    className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 text-center"
                  >
                    <div className="font-semibold text-blue-800">{chain}</div>
                    <div className="text-blue-600 text-sm mt-1">
                      {chain === 'ETHEREUM' && '+ USDT (ERC-20)'}
                      {chain === 'TON' && 'The Open Network'}
                      {chain === 'BITCOIN' && 'Digital Gold'}
                      {chain === 'DOGECOIN' && 'To the Moon! 🚀'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No blockchains loaded</p>
            )}
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              ✨ Platform Features
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-blue-800">🔐 Wallet Management</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    HD Wallet Generation (BIP32/BIP39/BIP44)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    Secure Mnemonic Management
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    Multi-Currency Support
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    Client-Side Key Management
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-3 text-green-800">💰 Transaction Features</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Send & Receive Transactions
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Real-Time Fee Estimation
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    Transaction History
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                    USDT (ERC-20) Support
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">🚧 Coming Soon</h4>
              <p className="text-yellow-700 text-sm">
                Blockchain Explorer, Real-time Monitoring, Advanced Security Features, 
                Multi-Factor Authentication, and Portfolio Analytics
              </p>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="bg-gray-800 text-white rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">🔗 API Endpoints</h2>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-green-400">GET</span>
                <span>/health</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">GET</span>
                <span>/api/v1/blockchains</span>
              </div>
              <div className="text-gray-400 text-xs mt-4">
                Backend running on: http://localhost:3001
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}