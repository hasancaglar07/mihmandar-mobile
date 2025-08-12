import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings, NotificationSettings } from '../../types';

const initialState: AppSettings = {
  theme: 'light',
  language: 'tr',
  notifications: {
    enabled: true,
    before_minutes: 15,
    prayers: {
      imsak: true,
      gunes: true,
      ogle: true,
      ikindi: true,
      aksam: true,
      yatsi: true,
    },
  },
  location: {
    latitude: 0,
    longitude: 0,
  },
  selected_city: undefined,
  selected_district: undefined,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'tr' | 'en'>) => {
      state.language = action.payload;
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    togglePrayerNotification: (state, action: PayloadAction<keyof NotificationSettings['prayers']>) => {
      state.notifications.prayers[action.payload] = !state.notifications.prayers[action.payload];
    },
    setNotificationTiming: (state, action: PayloadAction<number>) => {
      state.notifications.before_minutes = action.payload;
    },
    updateLocationSettings: (state, action: PayloadAction<{ city?: string; district?: string }>) => {
      if (action.payload.city) {
        state.selected_city = action.payload.city;
      }
      if (action.payload.district) {
        state.selected_district = action.payload.district;
      }
    },
    resetSettings: () => initialState,
  },
});

export const {
  setTheme,
  setLanguage,
  updateNotificationSettings,
  togglePrayerNotification,
  setNotificationTiming,
  updateLocationSettings,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
