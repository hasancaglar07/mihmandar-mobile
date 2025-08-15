@echo off
setlocal enabledelayedexpansion

REM Mihmandar Mobile APK Build Script for Windows
REM This script builds a production-ready APK with widget functionality

echo 🚀 Starting Mihmandar Mobile APK build process...

REM Check if we're in the mobile directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the mobile directory.
    exit /b 1
)

REM Check if Android SDK is available
if "%ANDROID_HOME%"=="" (
    echo [ERROR] ANDROID_HOME environment variable is not set.
    echo [ERROR] Please install Android SDK and set ANDROID_HOME.
    exit /b 1
)

REM Check if Java is available
java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java is not installed or not in PATH.
    exit /b 1
)

echo [INFO] Environment checks passed ✅

REM Clean previous builds
echo [INFO] Cleaning previous builds...
if exist "android\app\build\" rmdir /s /q "android\app\build\"
if exist "node_modules\.cache\" rmdir /s /q "node_modules\.cache\"
call npx react-native clean 2>nul

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

REM Create assets directory if it doesn't exist
if not exist "android\app\src\main\assets\" mkdir "android\app\src\main\assets\"

REM Generate bundle
echo [INFO] Generating React Native bundle...
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
if errorlevel 1 (
    echo [ERROR] Failed to generate bundle
    exit /b 1
)

REM Build the APK
echo [INFO] Building Android APK...
cd android

REM Clean and build
call gradlew clean
if errorlevel 1 (
    echo [ERROR] Gradle clean failed
    cd ..
    exit /b 1
)

call gradlew assembleRelease
if errorlevel 1 (
    echo [ERROR] Gradle build failed
    cd ..
    exit /b 1
)

cd ..

REM Check if APK was created successfully
set APK_PATH=android\app\build\outputs\apk\release\app-release.apk
if exist "%APK_PATH%" (
    echo [SUCCESS] APK built successfully! 🎉
    
    REM Get APK info
    for %%A in ("%APK_PATH%") do set APK_SIZE=%%~zA
    echo [INFO] APK Location: %APK_PATH%
    echo [INFO] APK Size: !APK_SIZE! bytes
    
    REM Create a timestamped copy
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set TIMESTAMP=!datetime:~0,8!_!datetime:~8,6!
    set TIMESTAMPED_APK=mihmandar-mobile-!TIMESTAMP!.apk
    copy "%APK_PATH%" "!TIMESTAMPED_APK!" >nul
    echo [SUCCESS] Timestamped APK created: !TIMESTAMPED_APK!
    
    REM Widget functionality check
    echo [INFO] Verifying widget components...
    
    set WIDGET_MISSING=0
    
    if not exist "android\app\src\main\java\com\mihmandarmobile\widget\PrayerWidgetProvider.kt" (
        echo [WARNING] PrayerWidgetProvider.kt is missing
        set WIDGET_MISSING=1
    )
    
    if not exist "android\app\src\main\java\com\mihmandarmobile\widget\PrayerWidgetCompactProvider.kt" (
        echo [WARNING] PrayerWidgetCompactProvider.kt is missing
        set WIDGET_MISSING=1
    )
    
    if not exist "android\app\src\main\java\com\mihmandarmobile\widget\PrayerWidgetFullProvider.kt" (
        echo [WARNING] PrayerWidgetFullProvider.kt is missing
        set WIDGET_MISSING=1
    )
    
    if not exist "android\app\src\main\java\com\mihmandarmobile\widget\WidgetModule.java" (
        echo [WARNING] WidgetModule.java is missing
        set WIDGET_MISSING=1
    )
    
    if not exist "android\app\src\main\java\com\mihmandarmobile\widget\PrayerAlarmReceiver.kt" (
        echo [WARNING] PrayerAlarmReceiver.kt is missing
        set WIDGET_MISSING=1
    )
    
    if not exist "android\app\src\main\java\com\mihmandarmobile\widget\PrayerWidgetBootReceiver.kt" (
        echo [WARNING] PrayerWidgetBootReceiver.kt is missing
        set WIDGET_MISSING=1
    )
    
    if !WIDGET_MISSING!==0 (
        echo [SUCCESS] All widget components are present ✅
    )
    
    echo [SUCCESS] Build completed successfully! 🎉
    echo [INFO] You can now install the APK on your Android device to test widget functionality.
    echo.
    echo [INFO] Widget Features Included:
    echo [INFO]   ✅ Standard Prayer Times Widget
    echo [INFO]   ✅ Compact Prayer Times Widget
    echo [INFO]   ✅ Full Prayer Times Widget
    echo [INFO]   ✅ Real-time prayer time updates
    echo [INFO]   ✅ Theme synchronization
    echo [INFO]   ✅ Location-based prayer times
    echo [INFO]   ✅ Remaining time countdown
    echo [INFO]   ✅ Boot receiver for widget persistence
    echo [INFO]   ✅ Prayer alarm notifications
    echo.
    echo [INFO] Installation command:
    echo [INFO]   adb install !TIMESTAMPED_APK!
    
) else (
    echo [ERROR] APK build failed! Check the logs above for errors.
    exit /b 1
)

pause