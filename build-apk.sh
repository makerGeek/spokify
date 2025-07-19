#!/bin/bash

# Spokify APK Build Script
set -e

echo "🚀 Building Spokify APK..."

# Step 1: Build web assets
echo "📦 Building web assets..."
npm run build

# Step 2: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync

# Step 3: Set environment variables
export JAVA_HOME=/nix/store/2vwkssqpzykk37r996cafq7x63imf4sp-openjdk-21+35
export ANDROID_HOME=~/android-sdk
export ANDROID_SDK_ROOT=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Step 4: Build debug APK
echo "🔨 Building debug APK..."
cd android

# Check if Gradle wrapper exists
if [ ! -f "./gradlew" ]; then
    echo "❌ Gradle wrapper not found!"
    exit 1
fi

# Make gradlew executable
chmod +x ./gradlew

# Build the APK
./gradlew assembleDebug

# Check if APK was created
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo "✅ APK built successfully!"
    echo "📍 Location: android/$APK_PATH"
    ls -la "$APK_PATH"
else
    echo "❌ APK build failed - file not found at $APK_PATH"
    echo "📋 Build output:"
    find app/build -name "*.apk" -type f 2>/dev/null || echo "No APK files found"
    exit 1
fi

echo "🎉 Build complete! Your APK is ready for installation."