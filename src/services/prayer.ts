import { ENDPOINTS } from '../constants/config';
import { httpGet } from './http';

export type CitiesResponse = { cities: { id: number; name: string; districts: string[] }[] };
export type PrayerTimes = {
  date: string;
  city: string;
  district: string;
  times: Record<'imsak'|'gunes'|'ogle'|'ikindi'|'aksam'|'yatsi', string>;
  next_prayer: { name: string; time: string; remaining_minutes: number };
};

export const fetchCities = () => httpGet<CitiesResponse>(ENDPOINTS.cities);
export const fetchPrayerTimes = (city: string, district?: string) =>
  httpGet<PrayerTimes>(`${ENDPOINTS.prayerTimes}?city=${encodeURIComponent(city)}${district ? `&district=${encodeURIComponent(district)}` : ''}`);
export const fetchQibla = (latitude: number, longitude: number) =>
  httpGet<{ qibla_direction: number; latitude: number; longitude: number; distance_to_kaaba_km: number }>(`${ENDPOINTS.qibla}?latitude=${latitude}&longitude=${longitude}`);


