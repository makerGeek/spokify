#!/bin/bash

# Spokify APK Build Script
echo "🚀 Building Spokify APK..."

# Step 1: Build the web application
echo "📦 Building web application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Web build failed"
    exit 1
fi

# Step 2: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed"
    exit 1
fi

echo "✅ Build preparation complete!"
echo ""
echo "📱 Next steps:"
echo "1. Open Android Studio: npx cap open android"
echo "2. Build APK in Android Studio (Build → Build Bundle(s)/APK(s) → Build APK(s))"
echo ""
echo "💡 Or build via command line:"
echo "   cd android && ./gradlew assembleDebug"
echo ""
echo "📂 APK will be saved to: android/app/build/outputs/apk/debug/app-debug.apk"