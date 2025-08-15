import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiService from './api';
import { LocationService, getLocationForWidget } from './location';
import { WidgetService } from './widget';
import { NotificationService } from './notifications';

type Times = {
  imsak: string; gunes: string; ogle: string; ikindi: string; aksam: string; yatsi: string;
};

export type PrayerSnapshot = {
  date: string;
  timezoneOffset: number;
  locationName: string;
  latitude?: number;
  longitude?: number;
  times: Times;
};

const STORAGE_KEY = 'prayer_snapshot_v1';

export class PrayerDataService {
  static async loadSnapshot(): Promise<PrayerSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static async saveSnapshot(data: PrayerSnapshot): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  static async refreshFromGPSAndSync(): Promise<PrayerSnapshot | null> {
    try {
      const loc = await getLocationForWidget();
      if (!loc) return null;
      const res = await apiService.fetchPrayerTimesByGPS(loc.latitude, loc.longitude);
      const snapshot: PrayerSnapshot = {
        date: res.date,
        timezoneOffset: -new Date().getTimezoneOffset(),
        locationName: res.city || 'Konum',
        latitude: loc.latitude,
        longitude: loc.longitude,
        times: res.times,
      };
      await this.saveSnapshot(snapshot);
      // Update widget and notifications atomically
      try {
        await WidgetService.updateWidgetData(
          { latitude: loc.latitude, longitude: loc.longitude } as any,
          { times: res.times },
          undefined,
          snapshot.locationName
        );
      } catch {}
      try {
        NotificationService.schedulePrayerNotifications(
          { times: res.times } as any,
          { enabled: true, before_minutes: 10, prayers: { imsak:true, gunes:true, ogle:true, ikindi:true, aksam:true, yatsi:true } } as any
        );
      } catch {}
      return snapshot;
    } catch (e) {
      return null;
    }
  }

  static async syncFromAppState(options: {
    location?: { latitude: number; longitude: number; city?: string } | null;
    times?: Times | null;
    settings?: { before_minutes?: number; ezanEnabled?: boolean; prayers?: any; theme?: string } | null;
    locationName?: string;
  }): Promise<void> {
    try {
      const { location, times, settings, locationName } = options;
      if (times) {
        const snapshot: PrayerSnapshot = {
          date: new Date().toISOString().slice(0, 10),
          timezoneOffset: -new Date().getTimezoneOffset(),
          locationName: locationName || location?.city || 'Konum',
          latitude: location?.latitude,
          longitude: location?.longitude,
          times,
        };
        await this.saveSnapshot(snapshot);
      }
      // Push to widget
      try {
        if (location && times) {
          await WidgetService.updateFromAppState(
            location as any,
            { times } as any,
            { theme: settings?.theme, before_minutes: settings?.before_minutes, ezanEnabled: settings?.ezanEnabled } as any,
            locationName
          );
        }
      } catch {}
      // Plan notifications
      try {
        if (times) {
          NotificationService.schedulePrayerNotifications(
            { times } as any,
            { enabled: settings?.ezanEnabled ?? true, before_minutes: Number(settings?.before_minutes ?? 10), prayers: settings?.prayers || { imsak:true, gunes:true, ogle:true, ikindi:true, aksam:true, yatsi:true } } as any
          );
        }
      } catch {}
    } catch {}
  }
}



