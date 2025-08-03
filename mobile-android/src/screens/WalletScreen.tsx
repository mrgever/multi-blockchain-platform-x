import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';

interface WalletBalance {
  currency: string;
  balance: number;
  usdValue: number;
}

export default function WalletScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  useEffect(() => {
    authenticateUser();
  }, []);

  const authenticateUser = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to access your wallet',
          fallbackLabel: 'Use passcode',
        });

        if (result.success) {
          setIsAuthenticated(true);
          await loadWalletData();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // Fallback for devices without biometric authentication
        setIsAuthenticated(true);
        await loadWalletData();
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Failed to authenticate');
    }
  };

  const loadWalletData = async () => {
    setLoading(true);
    try {
      // Load wallet address from secure storage
      const storedAddress = await SecureStore.getItemAsync('walletAddress');
      if (storedAddress) {
        setWalletAddress(storedAddress);
      } else {
        // Generate a demo address
        const demoAddress = '0x' + Math.random().toString(16).substr(2, 40);
        setWalletAddress(demoAddress);
        await SecureStore.setItemAsync('walletAddress', demoAddress);
      }

      // Load demo balances
      setBalances([
        { currency: 'ETH', balance: 2.5, usdValue: 5700 },
        { currency: 'BTC', balance: 0.05, usdValue: 2162 },
        { currency: 'USDT', balance: 1000, usdValue: 1000 },
        { currency: 'BNB', balance: 5, usdValue: 1576 },
      ]);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!sendAmount || !recipientAddress) {
      Alert.alert('Error', 'Please enter amount and recipient address');
      return;
    }

    Alert.alert(
      'Confirm Transaction',
      `Send ${sendAmount} to ${recipientAddress.substring(0, 10)}...?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Transaction sent successfully!');
            setSendAmount('');
            setRecipientAddress('');
          },
        },
      ]
    );
  };

  const copyAddress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied', 'Wallet address copied to clipboard');
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="lock-closed" size={64} color="#1e40af" />
          <Text style={styles.authText}>Authentication Required</Text>
          <TouchableOpacity style={styles.authButton} onPress={authenticateUser}>
            <Text style={styles.authButtonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Wallet Header */}
        <LinearGradient
          colors={['#1e40af', '#7c3aed']}
          style={styles.walletHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.walletTitle}>Multi-Chain Wallet</Text>
          <TouchableOpacity onPress={copyAddress} style={styles.addressContainer}>
            <Text style={styles.addressText}>
              {walletAddress.substring(0, 6)}...{walletAddress.substring(36)}
            </Text>
            <Ionicons name="copy-outline" size={16} color="white" />
          </TouchableOpacity>
          
          <View style={styles.totalBalance}>
            <Text style={styles.totalLabel}>Total Balance</Text>
            <Text style={styles.totalValue}>
              ${balances.reduce((sum, b) => sum + b.usdValue, 0).toLocaleString()}
            </Text>
          </View>
        </LinearGradient>

        {/* Balances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assets</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#1e40af" />
          ) : (
            balances.map((item, index) => (
              <View key={index} style={styles.balanceCard}>
                <View style={styles.balanceRow}>
                  <View style={styles.currencyInfo}>
                    <View style={styles.currencyIcon}>
                      <Text style={styles.currencySymbol}>{item.currency[0]}</Text>
                    </View>
                    <View>
                      <Text style={styles.currencyName}>{item.currency}</Text>
                      <Text style={styles.balanceAmount}>{item.balance}</Text>
                    </View>
                  </View>
                  <Text style={styles.usdValue}>${item.usdValue.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Send Transaction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Transaction</Text>
          <View style={styles.sendCard}>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={sendAmount}
              onChangeText={setSendAmount}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={styles.input}
              placeholder="Recipient Address"
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.sendGradient}
              >
                <Ionicons name="send" size={20} color="white" />
                <Text style={styles.sendButtonText}>Send</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="arrow-down" size={24} color="#1e40af" />
            </View>
            <Text style={styles.actionLabel}>Receive</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="swap-horizontal" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionLabel}>Swap</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="layers" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.actionLabel}>Stake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="time" size={24} color="#10b981" />
            </View>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
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
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  walletHeader: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  addressText: {
    color: 'white',
    fontSize: 12,
    marginRight: 6,
  },
  totalBalance: {
    marginTop: 20,
  },
  totalLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  totalValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
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
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  balanceAmount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  usdValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sendCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendButton: {
    marginTop: 8,
  },
  sendGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
});