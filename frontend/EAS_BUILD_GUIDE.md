# Verityn - EAS Build Guide

## Prerequisites

Before starting, make sure you have:
- **Node.js** (v18 or later)
- **Yarn** or npm
- **Expo account** (free at expo.dev)
- For iOS: **Apple Developer account** ($99/year) - only needed for device builds
- For Android: No account needed for APK builds

---

## Step 1: Download the Project

1. Click **"Download"** button in Emergent to get the project ZIP
2. Extract it to a folder on your Mac
3. Open Terminal and navigate to the frontend folder:
   ```bash
   cd /path/to/verityn/frontend
   ```

---

## Step 2: Install Dependencies

```bash
# Install project dependencies
yarn install

# Install EAS CLI globally
npm install -g eas-cli
```

---

## Step 3: Login to Expo

```bash
# Login to your Expo account
eas login

# Verify login
eas whoami
```

---

## Step 4: Configure Project

```bash
# Initialize EAS for this project (only first time)
eas build:configure
```

When prompted:
- Select **iOS** and **Android** (or just the one you need)
- It will create/update `eas.json` and link to your Expo account

---

## Step 5: Build Options

### Option A: iOS Simulator Build (Fastest - No Apple Developer needed)

```bash
eas build --profile development --platform ios
```

This creates a `.app` file for iOS Simulator. After build completes:
1. Download the build from the URL provided
2. Unzip and drag to iOS Simulator

### Option B: iOS Device Build (Requires Apple Developer)

```bash
eas build --profile development-device --platform ios
```

You'll need to:
1. Have an Apple Developer account
2. Register your device's UDID with Apple
3. EAS will guide you through the process

### Option C: Android APK (No account needed)

```bash
eas build --profile development --platform android
```

After build completes:
1. Download the APK from the URL provided
2. Transfer to your Android device
3. Install (enable "Install from unknown sources" in settings)

### Option D: Preview Build (Internal Testing)

```bash
# iOS (requires Apple Developer)
eas build --profile preview --platform ios

# Android APK
eas build --profile preview --platform android
```

---

## Step 6: Install Development Build

### For iOS Simulator:
```bash
# After build completes, EAS gives you a URL
# Download and extract, then:
open -a Simulator
# Drag the .app file onto the Simulator window
```

### For iOS Device:
1. Install **Expo Dev Client** from App Store first
2. Scan the QR code from EAS build page
3. Or use the install link provided

### For Android:
1. Download the APK
2. Transfer to device (AirDrop, email, Google Drive)
3. Open and install
4. Allow "Install from unknown sources" if prompted

---

## Step 7: Run Development Server

After installing the development build, you need to run a dev server:

```bash
cd /path/to/verityn/frontend
npx expo start --dev-client
```

Then:
1. Open the Verityn app on your device/simulator
2. It will connect to your local dev server
3. You can now test all features with hot reload!

---

## Build Profiles Summary

| Profile | Platform | Output | Apple Dev Required |
|---------|----------|--------|-------------------|
| `development` | iOS | Simulator .app | No |
| `development` | Android | Debug APK | No |
| `development-device` | iOS | Device IPA | Yes |
| `preview` | iOS | Internal IPA | Yes |
| `preview` | Android | Release APK | No |
| `production` | iOS | App Store | Yes |
| `production` | Android | Play Store AAB | No (for APK) |

---

## Troubleshooting

### "Missing iOS credentials"
- Run `eas credentials` to set up
- For simulator builds, no credentials needed

### "Build failed"
- Check `eas build:list` for error details
- Run `eas build --platform ios --clear-cache` to retry

### "App crashes on launch"
- Make sure dev server is running: `npx expo start --dev-client`
- Check backend URL in app.json is correct

### "Cannot connect to dev server"
- Ensure device and Mac are on same WiFi network
- Try: `npx expo start --dev-client --tunnel`

---

## Quick Commands Reference

```bash
# iOS Simulator (fastest for testing)
eas build --profile development --platform ios

# Android APK
eas build --profile development --platform android

# Check build status
eas build:list

# Run dev server after install
npx expo start --dev-client
```

---

## Backend URL

The app is configured to use this backend:
```
https://news-feed-eu.preview.emergentagent.com
```

This will work as long as the Emergent preview is running.

For production, you'll need to:
1. Deploy the backend to a permanent host (Railway, Render, etc.)
2. Update `EXPO_PUBLIC_BACKEND_URL` in app.json and eas.json
