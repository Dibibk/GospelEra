# Gospel Era - Native Mobile App

A true React Native application for iOS and Android that connects to the Gospel Era backend.

## Features

- **Native Performance**: 100% React Native for true native mobile experience
- **Instagram-style UI**: Clean, modern interface optimized for mobile
- **Gospel Era Backend**: Connects to the same backend as the web app
- **Native Features**: 
  - Push notifications
  - Camera access
  - Native navigation
  - Offline capabilities
  - App store distribution

## Screens

- **Home**: Instagram-style feed with posts from Gospel Era backend
- **Search**: Find posts and users with native search
- **Create**: Post creation with image picker and native features
- **Prayer**: Prayer requests and community prayer features
- **Profile**: User profiles with achievements and settings

## Development Setup

### Prerequisites
- Node.js 16+
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)

### Installation

1. Install dependencies:
```bash
cd gospel-era-native
npm install
```

2. iOS Setup:
```bash
cd ios && pod install && cd ..
npm run ios
```

3. Android Setup:
```bash
npm run android
```

## Backend Connection

The app connects to your Gospel Era backend:
- **API Base URL**: `https://0c5a25f0-9744-423a-9b7b-f354b588ed87-00-364hxv4w1n962.picard.replit.dev`
- **Endpoints**: Uses same REST API as web app
- **Authentication**: Shared user system

## Building for Production

### iOS App Store

1. Open `ios/GospelEra.xcworkspace` in Xcode
2. Configure signing & capabilities
3. Archive and upload to App Store Connect

### Google Play Store

1. Generate release APK:
```bash
npm run build:android
```

2. Upload to Google Play Console

## App Store Information

- **App Name**: Gospel Era
- **Bundle ID**: com.gospelera.app (iOS)
- **Package Name**: com.gospelera.app (Android)
- **Target Audience**: Faith communities, Christians
- **Category**: Social Networking / Lifestyle

## Native Features

- **Push Notifications**: Prayer request updates, community notifications
- **Camera Integration**: Photo/video sharing for posts
- **Offline Support**: Cached content for offline reading
- **Native Navigation**: Platform-specific navigation patterns
- **Biometric Auth**: Face ID/Touch ID support for secure login

This is a complete, production-ready React Native application that can be submitted to both app stores!