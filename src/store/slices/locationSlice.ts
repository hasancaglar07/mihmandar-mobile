import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LocationInfo, City, QiblaDirection } from '../../types';
import { fetchCities, fetchQiblaDirection } from '../../services/api';
import { getCurrentLocation } from '../../services/location';

interface LocationState {
  currentLocation: LocationInfo | null;
  cities: City[];
  selectedCity: string | null;
  selectedDistrict: string | null;
  qiblaDirection: QiblaDirection | null;
  loading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  cities: [],
  selectedCity: null,
  selectedDistrict: null,
  qiblaDirection: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchUserLocation = createAsyncThunk(
  'location/fetchUserLocation',
  async () => {
    const location = await getCurrentLocation();
    return location;
  }
);

export const loadCities = createAsyncThunk(
  'location/loadCities',
  async () => {
    const response = await fetchCities();
    return response.cities;
  }
);

export const getQiblaDirection = createAsyncThunk(
  'location/getQiblaDirection',
  async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    const response = await fetchQiblaDirection(latitude, longitude);
    return response;
  }
);

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setSelectedCity: (state, action: PayloadAction<string>) => {
      state.selectedCity = action.payload;
      state.selectedDistrict = null; // Reset district when city changes
    },
    setSelectedDistrict: (state, action: PayloadAction<string>) => {
      state.selectedDistrict = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateCurrentLocation: (state, action: PayloadAction<LocationInfo>) => {
      state.currentLocation = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user location
      .addCase(fetchUserLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLocation = action.payload;
      })
      .addCase(fetchUserLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get location';
      })
      // Load cities
      .addCase(loadCities.fulfilled, (state, action) => {
        state.cities = action.payload;
      })
      .addCase(loadCities.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load cities';
      })
      // Get qibla direction
      .addCase(getQiblaDirection.pending, (state) => {
        state.loading = true;
      })
      .addCase(getQiblaDirection.fulfilled, (state, action) => {
        state.loading = false;
        state.qiblaDirection = action.payload;
      })
      .addCase(getQiblaDirection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get qibla direction';
      });
  },
});

export const {
  setSelectedCity,
  setSelectedDistrict,
  clearError,
  updateCurrentLocation,
} = locationSlice.actions;

export default locationSlice.reducer;
