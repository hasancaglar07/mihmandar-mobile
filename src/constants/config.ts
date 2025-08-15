import { Platform } from 'react-native';

export const API_BASE_URL = Platform.select({
  android: __DEV__ ? 'http://10.0.2.2:8000' : 'https://new-production-1016.up.railway.app',
  ios: __DEV__ ? 'http://localhost:8000' : 'https://new-production-1016.up.railway.app',
  default: __DEV__ ? 'http://localhost:8000' : 'https://new-production-1016.up.railway.app',
});

// Web base URL for WebView content
export const WEB_BASE_URL = __DEV__ ? 'http://10.0.2.2:3002' : 'https://mihmandar.org';

// External prayer times API as fallback
export const EXTERNAL_PRAYER_API = 'https://vakit.vercel.app/api/timesForGPS';

export const ENDPOINTS = {
  cities: `${API_BASE_URL}/cities`,
  prayerTimes: `${API_BASE_URL}/prayer-times`,
  qibla: `${API_BASE_URL}/qibla-direction`,
};


