# 🕌 Mihmandar Mobile - Widget Build Guide

Bu rehber, Mihmandar Mobile uygulamasının widget fonksiyonları ile birlikte Android APK'sını oluşturma sürecini açıklar.

## 📋 Gereksinimler

### Sistem Gereksinimleri
- **Node.js** (v16 veya üzeri)
- **Java Development Kit (JDK)** (v11 veya üzeri)
- **Android SDK** (API Level 31 veya üzeri)
- **Android Studio** (önerilen)
- **Git**

### Ortam Değişkenleri
Aşağıdaki ortam değişkenlerinin ayarlandığından emin olun:

```bash
# Windows
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Java\jdk-11.0.x

# Linux/macOS
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
```

## 🚀 Hızlı Başlangıç

### Windows Kullanıcıları
```cmd
cd mobile
build-apk.bat
```

### Linux/macOS Kullanıcıları
```bash
cd mobile
chmod +x build-apk.sh
./build-apk.sh
```

## 🔧 Manuel Build Süreci

### 1. Bağımlılıkları Yükle
```bash
cd mobile
npm install
```

### 2. Android Projesini Temizle
```bash
npx react-native clean
cd android
./gradlew clean
cd ..
```

### 3. Bundle Oluştur
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
```

### 4. APK Oluştur
```bash
cd android
./gradlew assembleRelease
cd ..
```

APK dosyası şu konumda oluşturulacak:
`android/app/build/outputs/apk/release/app-release.apk`

## 🎯 Widget Özellikleri

### Dahil Edilen Widget Türleri
1. **Standart Widget** (`PrayerWidgetProvider`)
   - Tüm namaz vakitlerini gösterir
   - Sıradaki namaz ve kalan süre
   - Hijri tarih

2. **Kompakt Widget** (`PrayerWidgetCompactProvider`)
   - Sadece sıradaki namaz
   - Minimal tasarım
   - Küçük alan kaplar

3. **Tam Widget** (`PrayerWidgetFullProvider`)
   - Detaylı namaz vakitleri
   - Tüm günün programı
   - Geniş bilgi alanı

### Widget Fonksiyonları
- ✅ **Gerçek Zamanlı Güncelleme**: Namaz vakitleri otomatik güncellenir
- ✅ **Tema Senkronizasyonu**: Uygulama teması ile widget teması senkronize
- ✅ **Konum Tabanlı**: GPS veya manuel konum seçimi
- ✅ **Kalan Süre Hesaplama**: Dakika ve saniye hassasiyetinde
- ✅ **Boot Receiver**: Cihaz yeniden başlatıldığında widget'lar çalışmaya devam eder
- ✅ **Alarm Bildirimleri**: Namaz vakti ve öncesi bildirimler

## 🧪 Widget Test Süreci

### Uygulama İçi Test
1. Uygulamayı açın
2. Namaz Vakitleri sayfasına gidin
3. "Widget Test" butonuna tıklayın
4. Tüm testleri çalıştırın

### Manuel Test Adımları
1. **Widget Ekleme**:
   - Ana ekranda boş alana uzun basın
   - "Widget'lar" seçeneğini seçin
   - "Mihmandar" uygulamasını bulun
   - İstediğiniz widget türünü seçin

2. **Fonksiyon Testi**:
   - Widget'ın namaz vakitlerini gösterdiğini kontrol edin
   - Kalan süre sayacının çalıştığını doğrulayın
   - Widget'a tıklayarak uygulamanın açıldığını test edin

3. **Tema Testi**:
   - Uygulama ayarlarından temayı değiştirin
   - Widget'ın tema değişikliğini yansıttığını kontrol edin

## 📱 APK Kurulumu

### ADB ile Kurulum
```bash
adb install mihmandar-mobile-YYYYMMDD_HHMMSS.apk
```

### Manuel Kurulum
1. APK dosyasını Android cihaza kopyalayın
2. Dosya yöneticisinden APK'ya tıklayın
3. "Bilinmeyen kaynaklardan kuruluma izin ver" seçeneğini etkinleştirin
4. Kurulumu tamamlayın

## 🔍 Sorun Giderme

### Yaygın Sorunlar

#### 1. Build Hatası: "ANDROID_HOME not set"
**Çözüm**: Android SDK yolunu ortam değişkenlerine ekleyin
```bash
# Windows
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk

# Linux/macOS
export ANDROID_HOME=$HOME/Android/Sdk
```

#### 2. Widget Görünmüyor
**Çözüm**: 
- Uygulamanın konum iznine sahip olduğunu kontrol edin
- Widget'ı kaldırıp tekrar ekleyin
- Cihazı yeniden başlatın

#### 3. Namaz Vakitleri Güncellenmiyor
**Çözüm**:
- İnternet bağlantısını kontrol edin
- Konum servislerinin açık olduğunu doğrulayın
- Uygulamayı açıp konum iznini verin

#### 4. Tema Değişmiyor
**Çözüm**:
- Uygulama ayarlarından temayı tekrar seçin
- Widget'ı yenileyin (uzun basıp "Yenile" seçin)

### Log Kontrolü
```bash
# Widget loglarını görüntüle
adb logcat | grep -i widget

# Uygulama loglarını görüntüle
adb logcat | grep -i mihmandar
```

## 📊 Widget Performans Optimizasyonu

### Pil Tasarrufu
- Widget'lar sadece gerektiğinde güncellenir
- Arka plan işlemleri minimize edilmiştir
- Alarm yöneticisi verimli kullanılır

### Bellek Kullanımı
- Widget verileri SharedPreferences'ta saklanır
- Gereksiz API çağrıları önlenir
- Görsel kaynaklar optimize edilmiştir

## 🔐 Güvenlik

### İzinler
- `ACCESS_FINE_LOCATION`: Konum tabanlı namaz vakitleri
- `INTERNET`: API'den veri çekme
- `RECEIVE_BOOT_COMPLETED`: Cihaz başlatıldığında widget'ları yeniden etkinleştirme
- `WAKE_LOCK`: Alarm bildirimleri için

### Veri Güvenliği
- Konum verileri sadece lokal olarak saklanır
- API çağrıları HTTPS üzerinden yapılır
- Kişisel veriler üçüncü taraflarla paylaşılmaz

## 📞 Destek

Widget ile ilgili sorunlar için:
1. Önce bu rehberdeki sorun giderme bölümünü kontrol edin
2. Uygulama içi "Widget Test" özelliğini kullanın
3. Log dosyalarını kontrol edin

## 🔄 Güncelleme Süreci

Yeni widget özellikleri eklemek için:
1. `mobile/src/services/widget.ts` dosyasını güncelleyin
2. Android widget provider'larını düzenleyin
3. Yeni layout dosyaları ekleyin (gerekirse)
4. AndroidManifest.xml'i güncelleyin
5. Build scriptini çalıştırın

## 📈 Widget Metrikleri

Build sonrası kontrol edilecek öğeler:
- [ ] Tüm widget provider'ları mevcut
- [ ] Layout dosyaları eksiksiz
- [ ] Widget info XML'leri doğru
- [ ] AndroidManifest.xml güncel
- [ ] Native module bağlantıları çalışıyor
- [ ] API entegrasyonu aktif
- [ ] Tema sistemi çalışıyor
- [ ] Alarm sistemi aktif

---

**Not**: Bu rehber sürekli güncellenmektedir. En son sürüm için repository'yi kontrol edin.