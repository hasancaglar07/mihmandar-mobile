import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PrayerTimes } from '../../types';
import { fetchPrayerTimes } from '../../services/api';

interface LocationInfo {
  latitude: number;
  longitude: number;
  source: 'gps' | 'cache' | 'fallback';
  timestamp: number;
}

interface PrayerTimesState {
  data: PrayerTimes | null;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  currentLocation: LocationInfo | null;
  selectedCity: string | null;
  selectedDistrict: string | null;
  useGPS: boolean;
}

const initialState: PrayerTimesState = {
  data: null,
  loading: false,
  error: null,
  lastFetched: null,
  currentLocation: null,
  selectedCity: null,
  selectedDistrict: null,
  useGPS: true,
};

// Async thunk for fetching prayer times
export const getPrayerTimes = createAsyncThunk(
  'prayerTimes/getPrayerTimes',
  async ({ city, district }: { city: string; district?: string }) => {
    const response = await fetchPrayerTimes(city, district);
    return response;
  }
);

const prayerTimesSlice = createSlice({
  name: 'prayerTimes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateNextPrayer: (state, action: PayloadAction<{ name: string; time: string; remaining_minutes: number }>) => {
      if (state.data) {
        state.data.next_prayer = action.payload;
      }
    },
    setCurrentLocation: (state, action: PayloadAction<LocationInfo>) => {
      state.currentLocation = action.payload;
    },
    setSelectedCity: (state, action: PayloadAction<{ city: string; district?: string }>) => {
      state.selectedCity = action.payload.city;
      state.selectedDistrict = action.payload.district || null;
    },
    setUseGPS: (state, action: PayloadAction<boolean>) => {
      state.useGPS = action.payload;
      if (!action.payload) {
        state.currentLocation = null;
      }
    },
    clearLocationData: (state) => {
      state.currentLocation = null;
      state.selectedCity = null;
      state.selectedDistrict = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPrayerTimes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPrayerTimes.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(getPrayerTimes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch prayer times';
      });
  },
});

export const { 
  clearError, 
  updateNextPrayer, 
  setCurrentLocation, 
  setSelectedCity, 
  setUseGPS, 
  clearLocationData 
} = prayerTimesSlice.actions;
export default prayerTimesSlice.reducer;
