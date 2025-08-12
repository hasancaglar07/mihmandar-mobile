import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import prayerTimesReducer from './slices/prayerTimesSlice';
import locationReducer from './slices/locationSlice';
import settingsReducer from './slices/settingsSlice';
import searchReducer from './slices/searchSlice';

export const store = configureStore({
  reducer: {
    prayerTimes: prayerTimesReducer,
    location: locationReducer,
    settings: settingsReducer,
    search: searchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
