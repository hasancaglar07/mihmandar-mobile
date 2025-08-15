# Mihmandar Mobile - Namaz Vakitleri Uygulaması

🕌 **Mihmandar** - Modern ve kullanıcı dostu namaz vakitleri uygulaması

## 📱 Özellikler

### 🌍 **Konum Tabanlı Namaz Vakitleri**
- GPS ile otomatik konum tespiti
- 81 il ve tüm ilçeler için manuel seçim
- Hassas namaz vakti hesaplamaları

### 🔔 **Akıllı Bildirim Sistemi**
- Namaz vakti bildirimleri
- Önceden hatırlatma seçenekleri
- Ezan sesi ile bildirimler
- Titreşim ayarları

### 📱 **5 Farklı Widget Boyutu**
- **1x1:** Kompakt widget
- **2x1:** Orta boyut widget
- **4x1:** Geniş widget
- **3x2:** Detaylı widget
- **4x2:** Tam boyut widget

### 🎵 **Ezan Sesi Seçenekleri**
- Geleneksel ezan
- Modern ezan
- Chime sesi
- Ses seviyesi ayarı

### 🎨 **Modern Tasarım**
- Sade ve şık arayüz
- Koyu/açık tema desteği
- Renkli vakit göstergeleri
- Saniyeli geri sayım

## 🚀 **Teknoloji Stack**

- **React Native 0.81**
- **TypeScript**
- **Redux Toolkit**
- **Android Widgets (Kotlin)**
- **iOS Widgets (Swift)**
- **Push Notifications**
- **Geolocation Services**

## 📦 **Kurulum**

### Android
```bash
npm install
cd android
./gradlew assembleRelease
```

### iOS (GitHub Actions)
```bash
npm install
# GitHub Actions otomatik build alır
```

## 🔧 **Geliştirme**

```bash
# Bağımlılıkları yükle
npm install

# Android emülatörde çalıştır
npm run android

# iOS simülatörde çalıştır
npm run ios

# Metro bundler başlat
npm start
```

## 📱 **Platform Desteği**

- ✅ **Android 5.0+** (API 21+)
- ✅ **iOS 12.0+**
- ✅ **Android Widgets**
- ✅ **iOS Widgets**
- ✅ **Push Notifications**
- ✅ **Background Services**

## 🏪 **Mağaza Durumu**

- 🔄 **Google Play Store:** Yayın sürecinde
- 🔄 **Apple App Store:** GitHub Actions ile otomatik deploy

## 🤖 **CI/CD**

- ✅ **GitHub Actions:** iOS otomatik build
- ✅ **Android:** Manuel build
- ✅ **App Store Connect:** Otomatik upload

## 👨‍💻 **Geliştirici**

**Hasan Çağlar** - [@hasancaglar07](https://github.com/hasancaglar07)

---

🕌 **Mihmandar ile namaz vakitlerini kaçırmayın!** 🤲

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
