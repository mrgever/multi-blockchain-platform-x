# Bitorzo Mobile - Android App

A React Native mobile application for the Bitorzo blockchain analytics platform, providing real-time market data, wallet management, and system monitoring on Android devices.

## 🚀 Features

- **Real-time Market Data**: Live cryptocurrency prices and market trends
- **Multi-Chain Wallet**: Secure wallet with biometric authentication
- **System Dashboard**: Monitor data pipeline performance
- **Analytics Dashboard**: Advanced blockchain analytics via WebView
- **Push Notifications**: Price alerts and transaction notifications
- **Biometric Security**: Fingerprint/Face authentication
- **Dark Mode Support**: Automatic theme switching

## 📱 Screenshots

The app includes 5 main screens:
1. **Home**: Market overview and quick actions
2. **Dashboard**: Full analytics dashboard (WebView)
3. **System Monitor**: Real-time pipeline monitoring (WebView)
4. **Wallet**: Multi-chain wallet with send/receive
5. **Settings**: App preferences and security settings

## 🛠️ Tech Stack

- **React Native 0.72.6**: Cross-platform mobile framework
- **Expo SDK 49**: Development and build tools
- **TypeScript**: Type-safe development
- **React Navigation 6**: Screen navigation
- **Expo SecureStore**: Secure key storage
- **Expo LocalAuthentication**: Biometric authentication
- **React Native WebView**: Web content integration
- **Ethers.js & Web3.js**: Blockchain interactions

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development)
- EAS CLI for building (`npm install -g eas-cli`)

### Development Setup

1. Navigate to the mobile app directory:
```bash
cd mobile-android
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
# or for Android specifically
npm run android
```

4. Use Expo Go app on your Android device to scan the QR code

## 🏗️ Building for Production

### Android APK/AAB Build

1. Configure EAS:
```bash
eas build:configure
```

2. Build for Android:
```bash
# For development/testing (APK)
npm run build:android:preview

# For Google Play Store (AAB)
npm run build:android:production
```

3. Download the build from Expo dashboard when complete

### Local Build (Without EAS)

1. Eject from Expo (if needed):
```bash
expo eject
```

2. Build using Android Studio:
```bash
cd android
./gradlew assembleRelease
```

## 📱 App Structure

```
mobile-android/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── assets/                # Images and fonts
│   ├── icon.png          # App icon
│   ├── splash.png        # Splash screen
│   └── adaptive-icon.png # Android adaptive icon
└── src/
    ├── screens/          # App screens
    │   ├── HomeScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── SystemMonitorScreen.tsx
    │   ├── WalletScreen.tsx
    │   └── SettingsScreen.tsx
    ├── components/       # Reusable components
    ├── services/         # API and blockchain services
    └── utils/           # Helper functions
```

## 🔐 Security Features

- **Biometric Authentication**: Fingerprint/Face ID for wallet access
- **Secure Storage**: Encrypted key storage using Expo SecureStore
- **HTTPS Only**: All API calls use secure connections
- **No Private Keys**: Keys never leave the device
- **Session Management**: Automatic timeout for sensitive operations

## 🎨 Customization

### Theming
Modify colors and styles in each screen's StyleSheet or create a global theme file.

### WebView URLs
Update WebView source URLs in `DashboardScreen.tsx` and `SystemMonitorScreen.tsx` to point to your deployed platform.

### App Configuration
Edit `app.json` for:
- App name and slug
- Bundle identifiers
- Version numbers
- Permissions
- Splash screen settings

## 📊 Performance Optimization

- **Lazy Loading**: Screens load on-demand
- **Image Optimization**: Use appropriate image sizes
- **List Virtualization**: FlatList for long lists
- **Memoization**: React.memo for expensive components
- **Async Storage**: Cache frequently accessed data

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📝 Publishing

### Google Play Store

1. Generate signed AAB:
```bash
npm run build:android:production
```

2. Upload to Google Play Console
3. Fill in store listing details
4. Submit for review

### Direct APK Distribution

1. Build APK:
```bash
npm run build:android:preview
```

2. Download APK from EAS
3. Distribute via your preferred method

## 🔄 Updates

Use Expo Updates for over-the-air updates:
```bash
expo publish
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache
```bash
expo start -c
```

2. **Build failures**: Check Android SDK setup
```bash
expo doctor
```

3. **WebView not loading**: Check CSP headers and network permissions

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Email: support@bitorzo.com

## 🚀 Next Steps

1. Add more native features (camera, NFC, etc.)
2. Implement push notifications server
3. Add offline mode with data sync
4. Integrate native blockchain SDKs
5. Add more language support