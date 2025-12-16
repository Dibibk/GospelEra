# Capacitor Setup Complete! ✅

## Gospel Era - Mobile App Build Instructions

Your PWA has been successfully wrapped with Capacitor and is ready to build native Android and iOS apps.

---

## 📋 Project Configuration

- **App Name**: Gospel Era
- **App ID**: com.gospelera.app
- **Build Command**: `npm run build`
- **Web Directory**: `dist/public`
- **Config File**: `capacitor.config.ts`

---

## 🚀 Quick Start Commands

### Build & Sync to Both Platforms
```bash
npm run build
npx cap sync
```

### Build & Sync to Android Only
```bash
npm run build
npx cap sync android
```

### Build & Sync to iOS Only
```bash
npm run build
npx cap sync ios
```

### Sync Without Rebuilding (if you already built)
```bash
npx cap sync
```

---

## 📱 Next Steps for Publishing

### For Android (Google Play Store):

1. **Download the `android/` folder** from this Replit project to your computer

2. **Open in Android Studio**:
   ```bash
   # Navigate to the android folder you downloaded
   # Open Android Studio → Open an Existing Project → Select the android folder
   ```

3. **Configure signing** (for release builds):
   - Generate a keystore file
   - Add signing config to `android/app/build.gradle`

4. **Build the APK/AAB**:
   - Build → Generate Signed Bundle/APK
   - Choose "Android App Bundle" (AAB) for Play Store
   - Or "APK" for testing

5. **Upload to Google Play Console**:
   - Create a new app in Play Console
   - Upload the AAB file
   - Complete store listing and publish

**Requirements**:
- Android Studio installed
- Google Play Developer Account ($25 one-time fee)

---

### For iOS (Apple App Store):

1. **Download the `ios/` folder** from this Replit project to your Mac

2. **Install CocoaPods dependencies**:
   ```bash
   cd ios/App
   pod install
   ```

3. **Open in Xcode**:
   ```bash
   open App.xcworkspace
   ```

4. **Configure signing**:
   - Select your team in Xcode
   - Set bundle identifier to `com.gospelera.app`
   - Add capabilities (push notifications, etc.) if needed

5. **Build and Archive**:
   - Product → Archive
   - Upload to App Store Connect

6. **Submit to App Store**:
   - Complete app information in App Store Connect
   - Submit for review

**Requirements**:
- Mac computer with Xcode
- Apple Developer Account ($99/year)

---

## 🔧 Development Workflow

1. **Make changes to your web app** (React code in `client/src/`)

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Sync to native platforms**:
   ```bash
   npx cap sync
   ```

4. **Test on native platforms**:
   - Android: Open `android/` in Android Studio → Run
   - iOS: Open `ios/App/App.xcworkspace` in Xcode → Run

---

## 📁 Important Folders

- **`android/`** - Native Android project (open in Android Studio)
- **`ios/`** - Native iOS project (open in Xcode)
- **`dist/public/`** - Built web app (synced to native platforms)
- **`capacitor.config.ts`** - Capacitor configuration

---

## ⚠️ Important Notes

1. **Do not edit files in `android/app/src/main/assets/public/`** or **`ios/App/App/public/`** directly - they are overwritten on sync

2. **Always run `npm run build` before syncing** to ensure latest changes are included

3. **The `android/` and `ios/` folders are gitignored** by default - make sure to back them up or commit them if needed

4. **Replit environment limitations**: iOS builds require Mac + Xcode, Android builds require Android Studio - you'll need to download the folders and build locally

---

## 🆘 Troubleshooting

**"Module not found" errors in native apps:**
- Run `npx cap sync` again
- Clean build in Android Studio / Xcode

**Changes not appearing in native app:**
- Make sure you ran `npm run build` first
- Run `npx cap sync` to copy latest build

**iOS build errors:**
- Make sure you ran `pod install` in `ios/App/`
- Open `App.xcworkspace` NOT `App.xcodeproj`

---

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Publishing Guide](https://capacitorjs.com/docs/android/deploying-to-google-play)
- [iOS Publishing Guide](https://capacitorjs.com/docs/ios/deploying-to-app-store)

---

✅ **Your Gospel Era app is now ready to be built as a native mobile app!**
