# Building Spokify APK

This guide explains how to build your Spokify PWA into an Android APK using Capacitor.

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 11 or 17** - Required for Android development
3. **Android SDK** - Installed via Android Studio

## Build Process

### Step 1: Build the Web App
```bash
npm run build
```

### Step 2: Sync with Capacitor
```bash
npx cap sync
```

### Step 3: Open in Android Studio
```bash
npx cap open android
```

### Step 4: Build APK in Android Studio

1. **Open the project** - Android Studio will open the `android/` directory
2. **Sync Gradle** - Allow Android Studio to sync the project
3. **Configure signing** (for release builds):
   - Go to `Build` → `Generate Signed Bundle/APK`
   - Select `APK`
   - Create a new keystore or use existing one
4. **Build APK**:
   - For debug: `Build` → `Build Bundle(s)/APK(s)` → `Build APK(s)`
   - For release: `Build` → `Generate Signed Bundle/APK`

### Alternative: Command Line Build

After setting up Android development environment:

```bash
# Debug APK
cd android
./gradlew assembleDebug

# Release APK (requires signing configuration)
./gradlew assembleRelease
```

## Output Location

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`

## Quick Development Commands

```bash
# Build web assets and sync
npm run build && npx cap sync

# Open in Android Studio
npx cap open android

# Run on connected device/emulator
npx cap run android
```

## App Configuration

The app is configured via `capacitor.config.ts`:
- **App ID**: `com.spokify.app`
- **App Name**: `Spokify`
- **Web Directory**: `dist/public`

## Features Included in APK

✅ **Offline functionality** - Service worker caching
✅ **Native app icon** - From manifest.json
✅ **Splash screen** - Auto-generated from icon
✅ **Full-screen experience** - Standalone display mode
✅ **Push notifications** - Ready for implementation
✅ **File system access** - For downloads/caching
✅ **Camera access** - If needed for future features

## Troubleshooting

### Build Errors
- Ensure Android SDK is properly installed
- Check Java version (JDK 11 or 17)
- Clean and rebuild: `npx cap sync --force`

### App Not Loading
- Check `capacitor.config.ts` webDir path
- Ensure `npm run build` completed successfully
- Verify assets are in `dist/public/`

### Performance Issues
- Enable Android Hardware Acceleration
- Use release build for better performance
- Optimize images and assets

## Distribution

### Google Play Store
1. Create developer account
2. Use release APK with proper signing
3. Follow Play Store guidelines
4. Add privacy policy and descriptions

### Direct Distribution
- Share APK file directly
- Enable "Install from Unknown Sources" on target devices
- Consider using Firebase App Distribution for testing

## Next Steps

1. **Test thoroughly** on various Android devices
2. **Optimize performance** for mobile hardware
3. **Add native features** using Capacitor plugins
4. **Implement push notifications** for better engagement
5. **Prepare for app store submission**