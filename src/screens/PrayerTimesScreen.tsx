import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format, addMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';

import { useAppDispatch, useAppSelector } from '../store';
import { getPrayerTimes } from '../store/slices/prayerTimesSlice';
import { fetchUserLocation, setSelectedCity, setSelectedDistrict } from '../store/slices/locationSlice';
import { Colors } from '../constants/colors';
import { persistCoordinatesForWidget } from '../services/location';
import { NotificationService } from '../services/notifications';
import CitySelector from '../components/CitySelector';

const { width } = Dimensions.get('window');

const PrayerTimesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const { data: prayerTimes, loading, error } = useAppSelector(state => state.prayerTimes);
  const { currentLocation, selectedCity, selectedDistrict, cities } = useAppSelector(state => state.location);
  const { notifications } = useAppSelector(state => state.settings);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayer, setNextPrayer] = useState<{
    name: string;
    time: string;
    remaining: string;
  } | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate next prayer and remaining time
  useEffect(() => {
    if (prayerTimes) {
      const next = NotificationService.getNextPrayerCountdown(prayerTimes);
      if (next) {
        const { hours, minutes, seconds } = next.remaining;
        setNextPrayer({
          name: next.name,
          time: next.time,
          remaining: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        });
      }
    }
  }, [prayerTimes, currentTime]);

  // Initial data fetch
  useEffect(() => {
    if (selectedCity) {
      dispatch(getPrayerTimes({ city: selectedCity, district: selectedDistrict }));
    } else {
      // Try to get user location
      dispatch(fetchUserLocation());
    }
  }, [dispatch, selectedCity, selectedDistrict]);

  // Schedule notifications when prayer times change
  useEffect(() => {
    if (prayerTimes && notifications.enabled) {
      NotificationService.schedulePrayerNotifications(prayerTimes, notifications);
    }
  }, [prayerTimes, notifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedCity) {
      await dispatch(getPrayerTimes({ city: selectedCity, district: selectedDistrict }));
    } else if (currentLocation) {
      await dispatch(fetchUserLocation());
    }
    setRefreshing(false);
  };

  const handleLocationPress = () => {
    setShowCitySelector(true);
  };

  const handleCitySelect = (city: string, district?: string) => {
    dispatch(setSelectedCity(city));
    if (district) {
      dispatch(setSelectedDistrict(district));
    }
    dispatch(getPrayerTimes({ city, district }));
    setShowCitySelector(false);

    // If you have coordinates for the selected city/district in your data layer, persist them as well.
    // This example assumes currentLocation remains from GPS; otherwise integrate a geocoding step.
    if (currentLocation?.latitude && currentLocation?.longitude) {
      persistCoordinatesForWidget(currentLocation.latitude, currentLocation.longitude);
    }
  };

  // When GPS location is fetched, persist for widget
  useEffect(() => {
    if (currentLocation?.latitude && currentLocation?.longitude) {
      persistCoordinatesForWidget(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const getPrayerDisplayName = (prayerKey: string): string => {
    const prayerNames: { [key: string]: string } = {
      imsak: 'İmsak',
      gunes: 'Güneş',
      ogle: 'Öğle',
      ikindi: 'İkindi',
      aksam: 'Akşam',
      yatsi: 'Yatsı',
    };
    return prayerNames[prayerKey] || prayerKey;
  };

  const isPrayerPast = (prayerTime: string): boolean => {
    const [hours, minutes] = prayerTime.split(':').map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(hours, minutes, 0, 0);
    return prayerDate <= currentTime;
  };

  const isCurrentPrayer = (prayerKey: string): boolean => {
    return nextPrayer?.name === getPrayerDisplayName(prayerKey);
  };

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="error-outline" size={64} color={Colors.error} />
        <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Location Header */}
        <TouchableOpacity style={styles.locationHeader} onPress={handleLocationPress}>
          <View style={styles.locationInfo}>
            <Icon name="location-on" size={20} color={Colors.primary} />
            <Text style={styles.locationText}>
              {selectedCity && selectedDistrict
                ? `${selectedDistrict}, ${selectedCity}`
                : selectedCity || 'Konum Seçiniz'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={Colors.darkGray} />
        </TouchableOpacity>

        {/* Current Date */}
        <Text style={styles.dateText}>
          {format(currentTime, 'EEEE, d MMMM yyyy', { locale: tr })}
        </Text>

        {/* Next Prayer Countdown */}
        {nextPrayer && (
          <View style={styles.nextPrayerCard}>
            <Text style={styles.nextPrayerLabel}>Bir Sonraki Namaz</Text>
            <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
            <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
            <Text style={styles.countdown}>{nextPrayer.remaining}</Text>
          </View>
        )}

        {/* Prayer Times List */}
        {prayerTimes ? (
          <View style={styles.prayerTimesList}>
            {Object.entries(prayerTimes.times).map(([prayerKey, time]) => (
              <View
                key={prayerKey}
                style={[
                  styles.prayerTimeItem,
                  isCurrentPrayer(prayerKey) && styles.currentPrayerItem,
                  isPrayerPast(time) && styles.pastPrayerItem,
                ]}
              >
                <View style={styles.prayerNameContainer}>
                  <Text
                    style={[
                      styles.prayerName,
                      isCurrentPrayer(prayerKey) && styles.currentPrayerText,
                      isPrayerPast(time) && styles.pastPrayerText,
                    ]}
                  >
                    {getPrayerDisplayName(prayerKey)}
                  </Text>
                  {notifications.prayers[prayerKey as keyof typeof notifications.prayers] && (
                    <Icon
                      name="notifications"
                      size={16}
                      color={isCurrentPrayer(prayerKey) ? Colors.white : Colors.secondary}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.prayerTime,
                    isCurrentPrayer(prayerKey) && styles.currentPrayerText,
                    isPrayerPast(time) && styles.pastPrayerText,
                  ]}
                >
                  {time}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Namaz vakitleri yükleniyor...</Text>
            </View>
          )
        )}

        {/* Monthly Calendar Button */}
        <TouchableOpacity style={styles.calendarButton}>
          <Icon name="calendar-today" size={20} color={Colors.primary} />
          <Text style={styles.calendarButtonText}>Aylık Takvim</Text>
          <Icon name="chevron-right" size={20} color={Colors.darkGray} />
        </TouchableOpacity>
      </ScrollView>

      {/* City Selector Modal */}
      <CitySelector
        visible={showCitySelector}
        cities={cities}
        selectedCity={selectedCity}
        selectedDistrict={selectedDistrict}
        onSelect={handleCitySelect}
        onClose={() => setShowCitySelector(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 8,
  },
  dateText: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  nextPrayerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextPrayerLabel: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  nextPrayerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  nextPrayerTime: {
    fontSize: 20,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 16,
  },
  countdown: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    fontFamily: 'monospace',
  },
  prayerTimesList: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  currentPrayerItem: {
    backgroundColor: Colors.primary,
  },
  pastPrayerItem: {
    opacity: 0.6,
  },
  prayerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.text,
    marginRight: 8,
  },
  currentPrayerText: {
    color: Colors.white,
  },
  pastPrayerText: {
    color: Colors.darkGray,
  },
  prayerTime: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  calendarButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default PrayerTimesScreen;
