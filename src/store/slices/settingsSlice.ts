import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AppSettings, NotificationSettings } from '../../types';
import { WidgetService } from '../../services/widget';

interface WidgetSettings {
  enabled: boolean;
  theme: 'light' | 'dark' | 'green' | 'gold';
  showHijriDate: boolean;
  compactMode: boolean;
}

interface ExtendedAppSettings extends AppSettings {
  widget: WidgetSettings;
}

const initialState: ExtendedAppSettings = {
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
    ezan: {
      enabled: true,
      vibration: true,
      volume: 1,
      ezanType: 'traditional',
    },
  },
  location: {
    latitude: 0,
    longitude: 0,
  },
  selected_city: undefined,
  selected_district: undefined,
  widget: {
    enabled: false,
    theme: 'light',
    showHijriDate: true,
    compactMode: false,
  },
};

// Async thunk for syncing widget theme
export const syncWidgetTheme = createAsyncThunk(
  'settings/syncWidgetTheme',
  async (theme: 'light' | 'dark' | 'green' | 'gold') => {
    await WidgetService.syncThemeWithSettings(theme);
    return theme;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      // Auto-sync widget theme
      state.widget.theme = action.payload === 'dark' ? 'dark' : 'light';
    },
    setLanguage: (state, action: PayloadAction<'tr' | 'en'>) => {
      state.language = action.payload;
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updateEzanSettings: (state, action: PayloadAction<Partial<NotificationSettings['ezan']>>) => {
      state.notifications.ezan = { ...state.notifications.ezan, ...action.payload };
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
    // Widget-specific settings
    setWidgetEnabled: (state, action: PayloadAction<boolean>) => {
      state.widget.enabled = action.payload;
    },
    setWidgetTheme: (state, action: PayloadAction<'light' | 'dark' | 'green' | 'gold'>) => {
      state.widget.theme = action.payload;
    },
    setWidgetShowHijriDate: (state, action: PayloadAction<boolean>) => {
      state.widget.showHijriDate = action.payload;
    },
    setWidgetCompactMode: (state, action: PayloadAction<boolean>) => {
      state.widget.compactMode = action.payload;
    },
    updateWidgetSettings: (state, action: PayloadAction<Partial<WidgetSettings>>) => {
      state.widget = { ...state.widget, ...action.payload };
    },
    resetSettings: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncWidgetTheme.fulfilled, (state, action) => {
        state.widget.theme = action.payload;
      });
  },
});

export const {
  setTheme,
  setLanguage,
  updateNotificationSettings,
  updateEzanSettings,
  togglePrayerNotification,
  setNotificationTiming,
  updateLocationSettings,
  setWidgetEnabled,
  setWidgetTheme,
  setWidgetShowHijriDate,
  setWidgetCompactMode,
  updateWidgetSettings,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;