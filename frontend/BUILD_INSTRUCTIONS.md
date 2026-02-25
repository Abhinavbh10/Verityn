# Verityn App - Build Instructions

## Prerequisites

### For Android APK:
- Node.js 18+
- Java JDK 17
- Android Studio with SDK (or just Android SDK)
- Environment variable: `ANDROID_HOME` pointing to Android SDK

### For iOS IPA:
- macOS only
- Xcode 15+
- Apple Developer Account ($99/year)
- CocoaPods: `sudo gem install cocoapods`

---

## Method 1: EAS Cloud Build (Easiest - No Local Setup)

```bash
# Step 1: Install EAS CLI
npm install -g eas-cli

# Step 2: Login to Expo (create free account at expo.dev)
eas login

# Step 3: Build APK for Android
eas build -p android --profile preview

# Step 4: Build for iOS (requires Apple Developer account)
eas build -p ios --profile preview

# Download links will be provided after build completes (~10-15 mins)
```

---

## Method 2: EAS Local Build

```bash
# Android APK (requires Android SDK)
eas build -p android --profile preview --local

# iOS IPA (requires Xcode on macOS)
eas build -p ios --profile preview --local
```

---

## Method 3: Manual Native Build

### Android APK

```bash
# Step 1: Generate native Android project
npx expo prebuild --platform android --clean

# Step 2: Navigate to android folder
cd android

# Step 3: Build release APK
./gradlew assembleRelease

# Step 4: Find your APK at:
# android/app/build/outputs/apk/release/app-release.apk
```

### iOS IPA (macOS Only)

```bash
# Step 1: Generate native iOS project
npx expo prebuild --platform ios --clean

# Step 2: Install CocoaPods dependencies
cd ios && pod install && cd ..

# Step 3: Open in Xcode
open ios/Verityn.xcworkspace

# Step 4: In Xcode:
#   - Select your Apple Developer Team
#   - Select "Any iOS Device (arm64)" as build target
#   - Product → Archive
#   - Window → Organizer → Distribute App
```

---

## Quick Commands Reference

```bash
# ========== CLOUD BUILDS (Recommended) ==========

# Android APK
eas build -p android --profile preview

# Android App Bundle (for Play Store)
eas build -p android --profile production

# iOS Build
eas build -p ios --profile preview

# iOS Production (for App Store)
eas build -p ios --profile production

# ========== LOCAL BUILDS ==========

# Android APK locally
eas build -p android --profile preview --local

# iOS locally
eas build -p ios --profile preview --local

# ========== NATIVE PROJECT GENERATION ==========

# Generate Android native project
npx expo prebuild --platform android

# Generate iOS native project
npx expo prebuild --platform ios

# Generate both
npx expo prebuild

# Clean and regenerate
npx expo prebuild --clean
```

---

## Signing Configuration

### Android Signing (for release builds)

Create `android/app/keystore.properties`:
```
storeFile=release.keystore
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

Generate keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias verityn -keyalg RSA -keysize 2048 -validity 10000
```

### iOS Signing
- Managed automatically by EAS Build
- For manual builds, configure in Xcode with your Apple Developer account

---

## Troubleshooting

### Android Build Fails
```bash
# Clean gradle cache
cd android && ./gradlew clean && cd ..

# Rebuild
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

### iOS Build Fails
```bash
# Clean and reinstall pods
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### EAS Build Issues
```bash
# Clear EAS cache
eas build:configure --platform all

# Check build status
eas build:list
```
