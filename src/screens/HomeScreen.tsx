import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { useAppDispatch, useAppSelector } from '../store';
import { getPrayerTimes } from '../store/slices/prayerTimesSlice';
import { fetchUserLocation } from '../store/slices/locationSlice';
import { Colors } from '../constants/colors';
import { WidgetService } from '../services/widget';
import WidgetManager from '../components/WidgetManager';
import { NotificationService } from '../services/notifications';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const { data: prayerTimes, loading } = useAppSelector(state => state.prayerTimes);
  const { currentLocation, selectedCity, selectedDistrict } = useAppSelector(state => state.location);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shouldShowWidgetPrompt, setShouldShowWidgetPrompt] = useState(false);
  const [nextPrayer, setNextPrayer] = useState<{
    name: string;
    time: string;
    remaining: string;
    remainingMinutes: number;
  } | null>(null);
  const [hijriDate, setHijriDate] = useState('');

  // Check if first launch and show widget prompt
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasShownPrompt = await WidgetService.checkFirstLaunch();
        if (!hasShownPrompt) {
          console.log('🎯 İlk açılış tespit edildi, widget prompt gösteriliyor');
          setShouldShowWidgetPrompt(true);
        }
      } catch (error) {
        console.error('İlk açılış kontrolünde hata:', error);
      }
    };
    checkFirstLaunch();
  }, []);

  // Update current time every second
  useEffect(() => {
    const updateDateTime = () => {
      setCurrentTime(new Date());
      // Update Hijri date
      try {
        const hijriFormatter = new Intl.DateTimeFormat('tr-TR-u-ca-islamic', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        setHijriDate(hijriFormatter.format(new Date()));
      } catch {
        setHijriDate('');
      }
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate next prayer and update widget
  useEffect(() => {
    if (prayerTimes) {
      const next = NotificationService.getNextPrayerCountdown(prayerTimes);
      if (next) {
        const { hours, minutes, seconds } = next.remaining;
        const totalMinutes = hours * 60 + minutes;
        
        setNextPrayer({
          name: next.name,
          time: next.time,
          remaining: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          remainingMinutes: totalMinutes,
        });

        // Update widget data
        updateWidgetData(next, totalMinutes);
      }
    }
  }, [prayerTimes, currentTime]);

  // Initial data fetch and widget prompt
  useEffect(() => {
    const initializeApp = async () => {
      // Fetch prayer times
      if (selectedCity) {
        dispatch(getPrayerTimes({ city: selectedCity, district: selectedDistrict }));
      } else if (currentLocation) {
        dispatch(getPrayerTimes({ 
          latitude: currentLocation.latitude, 
          longitude: currentLocation.longitude 
        }));
      } else {
        dispatch(fetchUserLocation());
      }

      // Show widget prompt if needed (after a delay for better UX)
      setTimeout(async () => {
        const shouldShow = await WidgetService.shouldShowWidgetPrompt();
        if (shouldShow) {
          await WidgetService.showWidgetInstallationPrompt();
        }
      }, 3000); // 3 seconds delay
    };

    initializeApp();
  }, [dispatch, selectedCity, selectedDistrict, currentLocation]);

  const updateWidgetData = async (nextPrayerData: any, remainingMinutes: number) => {
    if (currentLocation && prayerTimes) {
      const locationName = selectedCity && selectedDistrict 
        ? `${selectedDistrict}, ${selectedCity}`
        : selectedCity || 'Mevcut Konum';

      await WidgetService.updateWidgetData(
        currentLocation,
        prayerTimes,
        {
          name: nextPrayerData.name,
          time: nextPrayerData.time,
          remaining_minutes: remainingMinutes,
        },
        locationName
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedCity) {
      await dispatch(getPrayerTimes({ city: selectedCity, district: selectedDistrict }));
    } else if (currentLocation) {
      await dispatch(getPrayerTimes({ 
        latitude: currentLocation.latitude, 
        longitude: currentLocation.longitude 
      }));
    } else {
      await dispatch(fetchUserLocation());
    }
    setRefreshing(false);
  };

  const getPrayerIcon = (prayerKey: string): string => {
    const prayerIcons: { [key: string]: string } = {
      'İmsak': 'weather-night',
      'Güneş': 'weather-sunny',
      'Öğle': 'weather-sunny',
      'İkindi': 'weather-sunset',
      'Akşam': 'weather-sunset-down',
      'Yatsı': 'weather-night',
    };
    return prayerIcons[prayerKey] || 'mosque';
  };

  const getGreeting = (): string => {
    const hour = currentTime.getHours();
    if (hour < 6) return 'İyi geceler';
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  return (
    <LinearGradient
      colors={['#f8fffe', '#f0fdf9', '#ecfdf5']}
      style={styles.container}
    >
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
        {/* Welcome Header */}
        <View style={styles.welcomeSection}>
          <LinearGradient
            colors={[Colors.primary, '#059669']}
            style={styles.welcomeCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.welcomeContent}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.appName}>Mihmandar'a Hoş Geldiniz</Text>
                {hijriDate && (
                  <Text style={styles.hijriWelcome}>🌙 {hijriDate}</Text>
                )}
              </View>
              <MaterialCommunityIcons name="mosque" size={48} color={Colors.white} />
            </View>
          </LinearGradient>
        </View>

        {/* Next Prayer Card */}
        {nextPrayer && (
          <View style={styles.nextPrayerSection}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6', '#a855f7']}
              style={styles.nextPrayerCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.nextPrayerHeader}>
                <MaterialCommunityIcons 
                  name={getPrayerIcon(nextPrayer.name)} 
                  size={32} 
                  color={Colors.white} 
                />
                <Text style={styles.nextPrayerLabel}>Sıradaki Namaz</Text>
              </View>
              
              <View style={styles.nextPrayerContent}>
                <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
                <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
                <Text style={styles.countdown}>{nextPrayer.remaining}</Text>
              </View>

              <TouchableOpacity 
                style={styles.widgetButton}
                onPress={() => setShowWidgetManager(true)}
              >
                <MaterialCommunityIcons name="widgets" size={20} color={Colors.white} />
                <Text style={styles.widgetButtonText}>Widget Ekle</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Quick Access Cards */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity style={styles.quickAccessCard}>
              <LinearGradient
                colors={['#f59e0b', '#f97316']}
                style={styles.quickAccessGradient}
              >
                <MaterialCommunityIcons name="clock-outline" size={28} color={Colors.white} />
                <Text style={styles.quickAccessText}>Namaz Vakitleri</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessCard}>
              <LinearGradient
                colors={['#06b6d4', '#0891b2']}
                style={styles.quickAccessGradient}
              >
                <MaterialCommunityIcons name="compass" size={28} color={Colors.white} />
                <Text style={styles.quickAccessText}>Kıble Pusulası</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAccessCard}
              onPress={() => setShowWidgetManager(true)}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.quickAccessGradient}
              >
                <MaterialCommunityIcons name="widgets" size={28} color={Colors.white} />
                <Text style={styles.quickAccessText}>Widget Yönetimi</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessCard}>
              <LinearGradient
                colors={['#ec4899', '#db2777']}
                style={styles.quickAccessGradient}
              >
                <MaterialCommunityIcons name="cog" size={28} color={Colors.white} />
                <Text style={styles.quickAccessText}>Ayarlar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Prayer Times Summary */}
        {prayerTimes && (
          <View style={styles.prayerSummarySection}>
            <Text style={styles.sectionTitle}>Bugünün Namaz Vakitleri</Text>
            
            <View style={styles.prayerSummaryCard}>
              <View style={styles.prayerSummaryHeader}>
                <MaterialCommunityIcons name="calendar-today" size={24} color={Colors.primary} />
                <Text style={styles.prayerSummaryDate}>
                  {format(currentTime, 'EEEE, d MMMM yyyy', { locale: tr })}
                </Text>
              </View>
              
              <View style={styles.prayerTimesList}>
                {Object.entries(prayerTimes.times).map(([key, time]) => (
                  <View key={key} style={styles.prayerTimeItem}>
                    <Text style={styles.prayerTimeName}>{key}</Text>
                    <Text style={styles.prayerTimeValue}>{time}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Widget Information */}
        <View style={styles.widgetInfoSection}>
          <View style={styles.widgetInfoCard}>
            <MaterialCommunityIcons name="information" size={24} color={Colors.info} />
            <View style={styles.widgetInfoContent}>
              <Text style={styles.widgetInfoTitle}>📱 Widget Hakkında</Text>
              <Text style={styles.widgetInfoText}>
                Ana ekranınıza namaz vakitleri widget'ını ekleyerek namaz vakitlerini sürekli takip edebilirsiniz.
              </Text>
              <TouchableOpacity 
                style={styles.widgetInfoButton}
                onPress={() => setShowWidgetManager(true)}
              >
                <Text style={styles.widgetInfoButtonText}>Widget Yönetimi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Widget Manager Modal */}
      <WidgetManager
        visible={showWidgetManager}
        onClose={() => setShowWidgetManager(false)}
      />

      {/* First Launch Widget Prompt */}
      <WidgetManager
        visible={shouldShowWidgetPrompt}
        onClose={() => {
          setShouldShowWidgetPrompt(false);
          WidgetService.markFirstLaunchComplete();
        }}
        isFirstLaunch={true}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 18,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  hijriWelcome: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  nextPrayerSection: {
    marginBottom: 24,
  },
  nextPrayerCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  nextPrayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextPrayerLabel: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
    marginLeft: 12,
  },
  nextPrayerContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nextPrayerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  nextPrayerTime: {
    fontSize: 22,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 12,
  },
  countdown: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
    fontFamily: 'monospace',
  },
  widgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  widgetButtonText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickAccessSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAccessCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  quickAccessGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  quickAccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginTop: 8,
  },
  prayerSummarySection: {
    marginBottom: 24,
  },
  prayerSummaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  prayerSummaryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  prayerTimesList: {
    gap: 8,
  },
  prayerTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  prayerTimeName: {
    fontSize: 16,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  prayerTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  widgetInfoSection: {
    marginBottom: 20,
  },
  widgetInfoCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  widgetInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  widgetInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  widgetInfoText: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  widgetInfoButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  widgetInfoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default HomeScreen;
