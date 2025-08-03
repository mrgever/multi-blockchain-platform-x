import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

export default function HomeScreen({ navigation }: any) {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarketData = async () => {
    try {
      // Simulate API call - replace with actual API endpoint
      const mockData: MarketData[] = [
        { symbol: 'BTC', price: 43250.50, change24h: 2.34, volume: 28500000000 },
        { symbol: 'ETH', price: 2280.75, change24h: -1.23, volume: 15600000000 },
        { symbol: 'BNB', price: 315.20, change24h: 3.45, volume: 1200000000 },
        { symbol: 'SOL', price: 98.60, change24h: 5.67, volume: 2300000000 },
        { symbol: 'XRP', price: 0.62, change24h: -0.89, volume: 1800000000 },
      ];
      
      setMarketData(mockData);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMarketData();
  };

  const formatPrice = (price: number) => {
    return price >= 1 ? price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) : price.toFixed(4);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`;
    return `$${volume.toLocaleString()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Card */}
        <LinearGradient
          colors={['#1e40af', '#7c3aed']}
          style={styles.headerCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome to Bitorzo</Text>
            <Text style={styles.subText}>Real-time Blockchain Analytics</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>10+</Text>
              <Text style={styles.statLabel}>Exchanges</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>1M+</Text>
              <Text style={styles.statLabel}>Data Points/Min</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>99.9%</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.actionGradient}
            >
              <Ionicons name="analytics" size={24} color="white" />
              <Text style={styles.actionText}>Analytics</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Monitor')}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.actionGradient}
            >
              <Ionicons name="pulse" size={24} color="white" />
              <Text style={styles.actionText}>Monitor</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Wallet')}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.actionGradient}
            >
              <Ionicons name="wallet" size={24} color="white" />
              <Text style={styles.actionText}>Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Market Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Overview</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#1e40af" style={styles.loader} />
          ) : (
            marketData.map((item, index) => (
              <TouchableOpacity key={index} style={styles.marketCard}>
                <View style={styles.marketRow}>
                  <View style={styles.symbolContainer}>
                    <View style={styles.iconCircle}>
                      <Text style={styles.symbolIcon}>{item.symbol[0]}</Text>
                    </View>
                    <View>
                      <Text style={styles.symbol}>{item.symbol}/USDT</Text>
                      <Text style={styles.volume}>Vol: {formatVolume(item.volume)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>${formatPrice(item.price)}</Text>
                    <View style={[
                      styles.changeContainer,
                      { backgroundColor: item.change24h >= 0 ? '#dcfce7' : '#fee2e2' }
                    ]}>
                      <Ionicons 
                        name={item.change24h >= 0 ? 'trending-up' : 'trending-down'} 
                        size={12} 
                        color={item.change24h >= 0 ? '#16a34a' : '#dc2626'} 
                      />
                      <Text style={[
                        styles.change,
                        { color: item.change24h >= 0 ? '#16a34a' : '#dc2626' }
                      ]}>
                        {Math.abs(item.change24h).toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Features</Text>
          
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Ionicons name="flash" size={28} color="#1e40af" />
              <Text style={styles.featureTitle}>Real-time Data</Text>
              <Text style={styles.featureDesc}>Live streaming from 10+ exchanges</Text>
            </View>
            
            <View style={styles.featureCard}>
              <Ionicons name="shield-checkmark" size={28} color="#10b981" />
              <Text style={styles.featureTitle}>Secure Wallet</Text>
              <Text style={styles.featureDesc}>Multi-chain support with biometric auth</Text>
            </View>
            
            <View style={styles.featureCard}>
              <Ionicons name="trending-up" size={28} color="#f59e0b" />
              <Text style={styles.featureTitle}>AI Analytics</Text>
              <Text style={styles.featureDesc}>ML-powered market insights</Text>
            </View>
            
            <View style={styles.featureCard}>
              <Ionicons name="server" size={28} color="#8b5cf6" />
              <Text style={styles.featureTitle}>Transparency</Text>
              <Text style={styles.featureDesc}>Real-time pipeline monitoring</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  headerCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  loader: {
    marginTop: 20,
  },
  marketCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  symbolIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  symbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  volume: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
});