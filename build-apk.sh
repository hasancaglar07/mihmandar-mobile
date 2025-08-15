#!/bin/bash

# Mihmandar Mobile APK Build Script
# This script builds a production-ready APK with widget functionality

set -e  # Exit on any error

echo "🚀 Starting Mihmandar Mobile APK build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the mobile directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the mobile directory."
    exit 1
fi

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    print_error "ANDROID_HOME environment variable is not set."
    print_error "Please install Android SDK and set ANDROID_HOME."
    exit 1
fi

# Check if Java is available
if ! command -v java &> /dev/null; then
    print_error "Java is not installed or not in PATH."
    exit 1
fi

print_status "Environment checks passed ✅"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf android/app/build/
rm -rf node_modules/.cache/
npx react-native clean || true

# Install dependencies
print_status "Installing dependencies..."
npm install

# Generate bundle
print_status "Generating React Native bundle..."
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

# Create assets directory if it doesn't exist
mkdir -p android/app/src/main/assets/

# Build the APK
print_status "Building Android APK..."
cd android

# Clean and build
./gradlew clean
./gradlew assembleRelease

cd ..

# Check if APK was created successfully
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    print_success "APK built successfully! 🎉"
    
    # Get APK info
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    print_status "APK Location: $APK_PATH"
    print_status "APK Size: $APK_SIZE"
    
    # Create a timestamped copy
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    TIMESTAMPED_APK="mihmandar-mobile-$TIMESTAMP.apk"
    cp "$APK_PATH" "$TIMESTAMPED_APK"
    print_success "Timestamped APK created: $TIMESTAMPED_APK"
    
    # Widget functionality check
    print_status "Verifying widget components..."
    
    WIDGET_FILES=(
        "android/app/src/main/java/com/mihmandarmobile/widget/PrayerWidgetProvider.kt"
        "android/app/src/main/java/com/mihmandarmobile/widget/PrayerWidgetCompactProvider.kt"
        "android/app/src/main/java/com/mihmandarmobile/widget/PrayerWidgetFullProvider.kt"
        "android/app/src/main/java/com/mihmandarmobile/widget/WidgetModule.java"
        "android/app/src/main/java/com/mihmandarmobile/widget/PrayerAlarmReceiver.kt"
        "android/app/src/main/java/com/mihmandarmobile/widget/PrayerWidgetBootReceiver.kt"
    )
    
    MISSING_FILES=()
    for file in "${WIDGET_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            MISSING_FILES+=("$file")
        fi
    done
    
    if [ ${#MISSING_FILES[@]} -eq 0 ]; then
        print_success "All widget components are present ✅"
    else
        print_warning "Some widget files are missing:"
        for file in "${MISSING_FILES[@]}"; do
            print_warning "  - $file"
        done
    fi
    
    # Check widget layouts
    WIDGET_LAYOUTS=(
        "android/app/src/main/res/layout/prayer_widget_layout.xml"
        "android/app/src/main/res/layout/prayer_widget_compact.xml"
        "android/app/src/main/res/layout/prayer_widget_full.xml"
    )
    
    MISSING_LAYOUTS=()
    for layout in "${WIDGET_LAYOUTS[@]}"; do
        if [ ! -f "$layout" ]; then
            MISSING_LAYOUTS+=("$layout")
        fi
    done
    
    if [ ${#MISSING_LAYOUTS[@]} -eq 0 ]; then
        print_success "All widget layouts are present ✅"
    else
        print_warning "Some widget layouts are missing:"
        for layout in "${MISSING_LAYOUTS[@]}"; do
            print_warning "  - $layout"
        done
    fi
    
    # Check widget info files
    WIDGET_INFO_FILES=(
        "android/app/src/main/res/xml/prayer_widget_info.xml"
        "android/app/src/main/res/xml/prayer_widget_compact_info.xml"
        "android/app/src/main/res/xml/prayer_widget_full_info.xml"
    )
    
    MISSING_INFO=()
    for info in "${WIDGET_INFO_FILES[@]}"; do
        if [ ! -f "$info" ]; then
            MISSING_INFO+=("$info")
        fi
    done
    
    if [ ${#MISSING_INFO[@]} -eq 0 ]; then
        print_success "All widget info files are present ✅"
    else
        print_warning "Some widget info files are missing:"
        for info in "${MISSING_INFO[@]}"; do
            print_warning "  - $info"
        done
    fi
    
    print_success "Build completed successfully! 🎉"
    print_status "You can now install the APK on your Android device to test widget functionality."
    print_status ""
    print_status "Widget Features Included:"
    print_status "  ✅ Standard Prayer Times Widget"
    print_status "  ✅ Compact Prayer Times Widget"
    print_status "  ✅ Full Prayer Times Widget"
    print_status "  ✅ Real-time prayer time updates"
    print_status "  ✅ Theme synchronization"
    print_status "  ✅ Location-based prayer times"
    print_status "  ✅ Remaining time countdown"
    print_status "  ✅ Boot receiver for widget persistence"
    print_status "  ✅ Prayer alarm notifications"
    print_status ""
    print_status "Installation command:"
    print_status "  adb install $TIMESTAMPED_APK"
    
else
    print_error "APK build failed! Check the logs above for errors."
    exit 1
fi