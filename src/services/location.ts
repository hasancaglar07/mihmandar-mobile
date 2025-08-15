import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid, NativeModules, Alert } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { LocationInfo } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationOptions {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
  retryCount?: number;
  showErrorAlert?: boolean;
}

interface LocationResult {
  location: LocationInfo;
  source: 'gps' | 'cache' | 'fallback';
  timestamp: number;
}

const LOCATION_CACHE_KEY = 'last_known_location';
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

export class LocationService {
  private static lastKnownLocation: LocationResult | null = null;
  private static isRequestingLocation = false;
  
  /**
   * Android için konum izni kontrolü ve isteme
   */
  static async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        // Önce mevcut izni kontrol et
        const currentPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (currentPermission) {
          console.log('✅ LOCATION: Android izni zaten mevcut');
          return true;
        }
        
        console.log('📱 LOCATION: Android izni isteniyor...');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Konum İzni Gerekli',
            message: 'Mihmandar uygulaması namaz vakitleri ve kıble yönü için konumunuza erişmek istiyor.',
            buttonNeutral: 'Daha Sonra',
            buttonNegative: 'İptal',
            buttonPositive: 'İzin Ver',
          }
        );
        
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log(isGranted ? '✅ LOCATION: Android izni verildi' : '❌ LOCATION: Android izni reddedildi');
        return isGranted;
      } catch (err) {
        console.error('❌ LOCATION: Android izin hatası:', err);
        return false;
      }
    } else {
      // iOS için
      try {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        const isGranted = result === RESULTS.GRANTED;
        console.log(isGranted ? '✅ LOCATION: iOS izni verildi' : '❌ LOCATION: iOS izni reddedildi');
        return isGranted;
      } catch (err) {
        console.error('❌ LOCATION: iOS izin hatası:', err);
        return false;
      }
    }
  }

  /**
   * Mevcut konum iznini kontrol et
   */
  static async checkLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        return result === RESULTS.GRANTED;
      } else {
        const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('❌ LOCATION: İzin kontrolü hatası:', error);
      return false;
    }
  }

  /**
   * Cache'den son bilinen konumu al
   */
  static async getCachedLocation(): Promise<LocationResult | null> {
    try {
      // Memory cache'i kontrol et
      if (this.lastKnownLocation) {
        const age = Date.now() - this.lastKnownLocation.timestamp;
        if (age < LOCATION_CACHE_DURATION) {
          console.log('📍 LOCATION: Memory cache\'den konum alındı');
          return this.lastKnownLocation;
        }
      }
      
      // AsyncStorage cache'i kontrol et
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const locationResult: LocationResult = JSON.parse(cached);
        const age = Date.now() - locationResult.timestamp;
        
        if (age < LOCATION_CACHE_DURATION) {
          console.log('💾 LOCATION: AsyncStorage cache\'den konum alındı');
          this.lastKnownLocation = locationResult;
          return locationResult;
        } else {
          console.log('⏰ LOCATION: Cache süresi dolmuş, temizleniyor');
          await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ LOCATION: Cache okuma hatası:', error);
      return null;
    }
  }

  /**
   * Konumu cache'e kaydet
   */
  static async cacheLocation(location: LocationInfo, source: 'gps' | 'fallback'): Promise<void> {
    try {
      const locationResult: LocationResult = {
        location,
        source,
        timestamp: Date.now()
      };
      
      // Memory cache'e kaydet
      this.lastKnownLocation = locationResult;
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(locationResult));
      console.log('💾 LOCATION: Konum cache\'e kaydedildi:', source);
    } catch (error) {
      console.error('❌ LOCATION: Cache kaydetme hatası:', error);
    }
  }

  /**
   * GPS'ten mevcut konumu al (retry logic ile)
   */
  static async getCurrentLocationFromGPS(options: LocationOptions = {}): Promise<LocationInfo> {
    const {
      timeout = 15000,
      maximumAge = 10000,
      enableHighAccuracy = true,
      retryCount = 3
    } = options;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(`🌍 LOCATION: GPS denemesi ${attempt}/${retryCount}`);
        
        const location = await new Promise<LocationInfo>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (position) => {
              const location: LocationInfo = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              console.log('✅ LOCATION: GPS başarılı:', location);
              resolve(location);
            },
            (error) => {
              console.error(`❌ LOCATION: GPS hatası (deneme ${attempt}):`, error.message);
              reject(new Error(`GPS Error: ${error.message} (Code: ${error.code})`));
            },
            {
              enableHighAccuracy,
              timeout,
              maximumAge,
            }
          );
        });
        
        // Başarılı olursa cache'e kaydet
        await this.cacheLocation(location, 'gps');
        return location;
        
      } catch (error) {
        console.error(`❌ LOCATION: GPS denemesi ${attempt} başarısız:`, error);
        
        if (attempt === retryCount) {
          throw error;
        }
        
        // Bir sonraki deneme için bekle
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('GPS location failed after all retries');
  }

  /**
   * Ana konum alma fonksiyonu (cache, GPS, fallback stratejisi)
   */
  static async getCurrentLocation(options: LocationOptions = {}): Promise<LocationResult> {
    const { showErrorAlert = false } = options;
    
    // Eğer zaten bir istek yapılıyorsa bekle
    if (this.isRequestingLocation) {
      console.log('⏳ LOCATION: Başka bir konum isteği bekliyor...');
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.isRequestingLocation) {
            clearInterval(checkInterval);
            resolve(void 0);
          }
        }, 100);
      });
      
      // Eğer bu sırada konum alındıysa cache'den döndür
      const cached = await this.getCachedLocation();
      if (cached) {
        return cached;
      }
    }
    
    this.isRequestingLocation = true;
    
    try {
      // 1. Önce cache'i kontrol et
      console.log('🔍 LOCATION: Cache kontrol ediliyor...');
      const cached = await this.getCachedLocation();
      if (cached) {
        return cached;
      }
      
      // 2. İzin kontrolü
      console.log('🔐 LOCATION: İzin kontrol ediliyor...');
      let hasPermission = await this.checkLocationPermission();
      
      if (!hasPermission) {
        console.log('📱 LOCATION: İzin isteniyor...');
        hasPermission = await this.requestLocationPermission();
        
        if (!hasPermission) {
          throw new Error('Konum izni verilmedi. Lütfen ayarlardan konum iznini açın.');
        }
      }
      
      // 3. GPS'ten konum al
      console.log('🛰️ LOCATION: GPS\'ten konum alınıyor...');
      const location = await this.getCurrentLocationFromGPS(options);
      
      const result: LocationResult = {
        location,
        source: 'gps',
        timestamp: Date.now()
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ LOCATION: Konum alma hatası:', error);
      
      // Hata durumunda cache'den eski konum döndürmeyi dene
      const oldCached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (oldCached) {
        try {
          const locationResult: LocationResult = JSON.parse(oldCached);
          console.log('🔄 LOCATION: Eski cache kullanılıyor');
          
          return {
            ...locationResult,
            source: 'cache'
          };
        } catch (parseError) {
          console.error('❌ LOCATION: Cache parse hatası:', parseError);
        }
      }
      
      // Son çare: Fallback konum (İstanbul)
      console.log('🏙️ LOCATION: Fallback konum kullanılıyor (İstanbul)');
      const fallbackLocation: LocationInfo = {
        latitude: 41.0082,
        longitude: 28.9784
      };
      
      const fallbackResult: LocationResult = {
        location: fallbackLocation,
        source: 'fallback',
        timestamp: Date.now()
      };
      
      // Fallback'i de cache'e kaydet
      await this.cacheLocation(fallbackLocation, 'fallback');
      
      if (showErrorAlert) {
        Alert.alert(
          'Konum Hatası',
          'Konumunuz alınamadı. İstanbul konumu kullanılıyor. Daha doğru namaz vakitleri için GPS\'i açın.',
          [{ text: 'Tamam' }]
        );
      }
      
      return fallbackResult;
      
    } finally {
      this.isRequestingLocation = false;
    }
  }

  /**
   * Konum izleme (watch position)
   */
  static watchPosition(
    onSuccess: (result: LocationResult) => void,
    onError: (error: any) => void,
    options: LocationOptions = {}
  ): number {
    const { enableHighAccuracy = true } = options;
    
    return Geolocation.watchPosition(
      async (position) => {
        const location: LocationInfo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        const result: LocationResult = {
          location,
          source: 'gps',
          timestamp: Date.now()
        };
        
        // Cache'e kaydet
        await this.cacheLocation(location, 'gps');
        
        onSuccess(result);
      },
      onError,
      {
        enableHighAccuracy,
        distanceFilter: 10, // 10 metre hareket ettiğinde güncelle
        interval: 5000,     // 5 saniyede bir kontrol et
        fastestInterval: 2000, // En hızlı 2 saniyede bir güncelle
      }
    );
  }

  /**
   * Konum izlemeyi durdur
   */
  static clearWatch(watchId: number): void {
    Geolocation.clearWatch(watchId);
  }

  /**
   * Cache'i temizle
   */
  static async clearCache(): Promise<void> {
    try {
      this.lastKnownLocation = null;
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
      console.log('🗑️ LOCATION: Cache temizlendi');
    } catch (error) {
      console.error('❌ LOCATION: Cache temizleme hatası:', error);
    }
  }
}

// Convenience function - Geriye uyumluluk için
export const getCurrentLocation = async (): Promise<LocationInfo> => {
  const result = await LocationService.getCurrentLocation({ showErrorAlert: true });
  return result.location;
};

// Widget için gelişmiş konum alma
export const getLocationForWidget = async (): Promise<LocationInfo | null> => {
  try {
    const result = await LocationService.getCurrentLocation();
    
    // Widget için native module'e kaydet
    await persistCoordinatesForWidget(result.location.latitude, result.location.longitude);
    
    console.log('📍 WIDGET LOCATION: Konum alındı ve kaydedildi:', result);
    return result.location;
  } catch (error) {
    console.error('❌ WIDGET LOCATION: Hata:', error);
    return null;
  }
};

// Native module bridge
type NativeLocationPrefs = { saveCoordinates: (lat: number, lng: number) => Promise<boolean> } | undefined;
type NativeWidgetModule = {
  saveCoordinates: (lat: number, lng: number) => Promise<boolean>;
  updateWidgetData: (data: string) => Promise<boolean>;
} | undefined;

const { LocationPrefs, WidgetModule } = NativeModules as {
  LocationPrefs?: NativeLocationPrefs;
  WidgetModule?: NativeWidgetModule;
};

export const persistCoordinatesForWidget = async (lat: number, lng: number): Promise<void> => {
  try {
    console.log('📍 WIDGET PERSIST: Konum kaydediliyor:', { lat, lng });
    
    // WidgetModule'ü önce dene
    if (WidgetModule && typeof WidgetModule.saveCoordinates === 'function') {
      const result = await WidgetModule.saveCoordinates(lat, lng);
      console.log('✅ WIDGET PERSIST: WidgetModule başarılı:', result);
      return;
    }
    
    // LocationPrefs'i fallback olarak kullan
    if (LocationPrefs && typeof LocationPrefs.saveCoordinates === 'function') {
      const result = await LocationPrefs.saveCoordinates(lat, lng);
      console.log('✅ WIDGET PERSIST: LocationPrefs başarılı:', result);
      return;
    }
    
    console.warn('⚠️ WIDGET PERSIST: Native module bulunamadı');
  } catch (error) {
    console.error('❌ WIDGET PERSIST: Hata:', error);
  }
};
