import { Platform } from 'react-native';

export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
});
// Geliştirme: lokal Next.js; Yayın: canlı site
// Geliştirme: lokal Next.js; Yayın: canlı site
export const WEB_BASE_URL = __DEV__ ? 'http://10.0.2.2:3002' : 'https://mihmandar.org';

export const ENDPOINTS = {
  cities: `${API_BASE_URL}/cities`,
  prayerTimes: `${API_BASE_URL}/prayer-times`,
  qibla: `${API_BASE_URL}/qibla-direction`,
};


