// Types for the Mihmandar Mobile App

export interface City {
  id: number;
  name: string;
  districts: string[];
}

export interface PrayerTimes {
  date: string;
  city: string;
  district: string;
  times: {
    imsak: string;
    gunes: string;
    ogle: string;
    ikindi: string;
    aksam: string;
    yatsi: string;
  };
  next_prayer: {
    name: string;
    time: string;
    remaining_minutes: number;
  };
}

export interface QiblaDirection {
  qibla_direction: number;
  latitude: number;
  longitude: number;
  distance_to_kaaba_km: number;
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  before_minutes: number;
  prayers: {
    imsak: boolean;
    gunes: boolean;
    ogle: boolean;
    ikindi: boolean;
    aksam: boolean;
    yatsi: boolean;
  };
}

export interface SearchResult {
  type: 'book' | 'article' | 'video';
  id: string;
  title: string;
  author?: string;
  excerpt?: string;
  url?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'tr' | 'en';
  notifications: NotificationSettings;
  location: LocationInfo;
  selected_city?: string;
  selected_district?: string;
}

export type RootStackParamList = {
  Main: undefined;
  PrayerTimes: undefined;
  QiblaFinder: undefined;
  Search: undefined;
  WebContent: { url: string; title: string };
  Settings: undefined;
};

export type TabParamList = {
  PrayerTimes: undefined;
  QiblaFinder: undefined;
  Search: undefined;
  Settings: undefined;
};
