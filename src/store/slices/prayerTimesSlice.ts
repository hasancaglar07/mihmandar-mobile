import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PrayerTimes } from '../../types';
import { fetchPrayerTimes } from '../../services/api';

interface PrayerTimesState {
  data: PrayerTimes | null;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

const initialState: PrayerTimesState = {
  data: null,
  loading: false,
  error: null,
  lastFetched: null,
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

export const { clearError, updateNextPrayer } = prayerTimesSlice.actions;
export default prayerTimesSlice.reducer;
