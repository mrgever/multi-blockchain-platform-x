import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleToggle = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(prev => !prev);
  };

  const handleSettingPress = (setting: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(setting, `Configure ${setting} settings`);
  };

  const settingsSections = [
    {
      title: 'Security',
      items: [
        {
          icon: 'finger-print',
          label: 'Biometric Authentication',
          value: biometric,
          toggle: true,
          onToggle: () => handleToggle(setBiometric),
        },
        {
          icon: 'key',
          label: 'Change Passcode',
          arrow: true,
          onPress: () => handleSettingPress('Passcode'),
        },
        {
          icon: 'shield-checkmark',
          label: 'Two-Factor Authentication',
          arrow: true,
          onPress: () => handleSettingPress('2FA'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications',
          label: 'Push Notifications',
          value: notifications,
          toggle: true,
          onToggle: () => handleToggle(setNotifications),
        },
        {
          icon: 'trending-up',
          label: 'Price Alerts',
          value: priceAlerts,
          toggle: true,
          onToggle: () => handleToggle(setPriceAlerts),
        },
        {
          icon: 'refresh',
          label: 'Auto Refresh',
          value: autoRefresh,
          toggle: true,
          onToggle: () => handleToggle(setAutoRefresh),
        },
        {
          icon: 'moon',
          label: 'Dark Mode',
          value: darkMode,
          toggle: true,
          onToggle: () => handleToggle(setDarkMode),
        },
      ],
    },
    {
      title: 'Network',
      items: [
        {
          icon: 'globe',
          label: 'Default Network',
          value: 'Ethereum',
          arrow: true,
          onPress: () => handleSettingPress('Network'),
        },
        {
          icon: 'server',
          label: 'RPC Endpoints',
          arrow: true,
          onPress: () => handleSettingPress('RPC'),
        },
        {
          icon: 'speedometer',
          label: 'Gas Settings',
          arrow: true,
          onPress: () => handleSettingPress('Gas'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle',
          label: 'Version',
          value: '1.0.0',
        },
        {
          icon: 'document-text',
          label: 'Terms of Service',
          arrow: true,
          onPress: () => handleSettingPress('Terms'),
        },
        {
          icon: 'lock-closed',
          label: 'Privacy Policy',
          arrow: true,
          onPress: () => handleSettingPress('Privacy'),
        },
        {
          icon: 'help-circle',
          label: 'Support',
          arrow: true,
          onPress: () => handleSettingPress('Support'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.lastItem,
                  ]}
                  onPress={item.onPress}
                  disabled={item.toggle}
                  activeOpacity={item.arrow ? 0.7 : 1}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color="#1e40af"
                      />
                    </View>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.settingRight}>
                    {item.value && typeof item.value === 'string' && (
                      <Text style={styles.settingValue}>{item.value}</Text>
                    )}
                    {item.toggle && (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={item.value ? '#1e40af' : '#f3f4f6'}
                      />
                    )}
                    {item.arrow && (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#9ca3af"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => Alert.alert('Success', 'Signed out successfully'),
                },
              ]
            );
          }}
        >
          <Ionicons name="log-out" size={20} color="#dc2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Bitorzo Mobile</Text>
          <Text style={styles.appDescription}>
            Advanced Blockchain Analytics Platform
          </Text>
          <Text style={styles.copyright}>© 2024 Bitorzo. All rights reserved.</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 11,
    color: '#9ca3af',
  },
});