import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { LocationInfo } from '../types';

export class LocationService {
  static async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Konum İzni',
            message: 'Mihmandar uygulaması namaz vakitleri ve kıble yönü için konumunuza erişmek istiyor.',
            buttonNeutral: 'Daha Sonra',
            buttonNegative: 'İptal',
            buttonPositive: 'İzin Ver',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      try {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
  }

  static async checkLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      return result === RESULTS.GRANTED;
    } else {
      const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return result === RESULTS.GRANTED;
    }
  }

  static async getCurrentLocation(): Promise<LocationInfo> {
    return new Promise((resolve, reject) => {
      const hasPermission = this.checkLocationPermission();
      
      if (!hasPermission) {
        reject(new Error('Location permission not granted'));
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
          reject(new Error('Unable to get location'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  static watchPosition(
    onSuccess: (location: LocationInfo) => void,
    onError: (error: any) => void
  ): number {
    return Geolocation.watchPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      onError,
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update when user moves 10 meters
        interval: 5000,     // Update every 5 seconds
        fastestInterval: 2000, // Don't update faster than every 2 seconds
      }
    );
  }

  static clearWatch(watchId: number): void {
    Geolocation.clearWatch(watchId);
  }
}

// Convenience function
export const getCurrentLocation = async (): Promise<LocationInfo> => {
  const hasPermission = await LocationService.checkLocationPermission();
  
  if (!hasPermission) {
    const permissionGranted = await LocationService.requestLocationPermission();
    if (!permissionGranted) {
      throw new Error('Location permission required');
    }
  }
  
  return LocationService.getCurrentLocation();
};

// Bridge: Save selected coordinates for the Android widget via SharedPreferences
type NativeLocationPrefs = { saveCoordinates: (lat: number, lng: number) => Promise<boolean> } | undefined;
const { LocationPrefs } = NativeModules as { LocationPrefs?: NativeLocationPrefs };

export const persistCoordinatesForWidget = async (lat: number, lng: number) => {
  try {
    if (LocationPrefs && typeof LocationPrefs.saveCoordinates === 'function') {
      await LocationPrefs.saveCoordinates(lat, lng);
    }
  } catch {}
};
