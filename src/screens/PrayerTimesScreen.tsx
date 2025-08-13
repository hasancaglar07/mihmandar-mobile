import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Animated,

} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, addMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import LinearGradient from 'react-native-linear-gradient';

import { useAppDispatch, useAppSelector } from '../store';
import { getPrayerTimes } from '../store/slices/prayerTimesSlice';
import { fetchUserLocation, setSelectedCity, setSelectedDistrict } from '../store/slices/locationSlice';
import { Colors } from '../constants/colors';
import { persistCoordinatesForWidget } from '../services/location';
import { NotificationService } from '../services/notifications';
import { WidgetService } from '../services/widget';
import CitySelector from '../components/CitySelector';
import PrayerTimesSettings from '../components/PrayerTimesSettings';
import WidgetManager from '../components/WidgetManager';

const { width } = Dimensions.get('window');

const PrayerTimesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const { data: prayerTimes, loading, error } = useAppSelector(state => state.prayerTimes);
  const { currentLocation, selectedCity, selectedDistrict, cities } = useAppSelector(state => state.location);
  const { notifications } = useAppSelector(state => state.settings);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showPrayerSettings, setShowPrayerSettings] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextPrayer, setNextPrayer] = useState<{
    name: string;
    time: string;
    remaining: string;
  } | null>(null);
  const [hijriDate, setHijriDate] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [progressAnim] = useState(new Animated.Value(0));
  // Animated header enhancements
  const iconPulseAnim = useRef(new Animated.Value(0)).current;
  const countdownBlinkAnim = useRef(new Animated.Value(0)).current;

  // Update current time every second and hijri date
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

    // Animate on mount
    // Entrance + looping animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();

    // Pulse the prayer icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(iconPulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Blink the countdown subtly
    Animated.loop(
      Animated.sequence([
        Animated.timing(countdownBlinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(countdownBlinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(timer);
  }, [fadeAnim, progressAnim]);
  const prayerDisplayToKey = (display: string | undefined): string | null => {
    if (!display) return null;
    const map: { [key: string]: string } = {
      İmsak: 'imsak',
      Güneş: 'gunes',
      Öğle: 'ogle',
      İkindi: 'ikindi',
      Akşam: 'aksam',
      Yatsı: 'yatsi',
    };
    return map[display] || null;
  };


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
      console.log('📍 LOCATION DEBUG: Konum alındı, widget için kaydediliyor:', {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      });
      persistCoordinatesForWidget(currentLocation.latitude, currentLocation.longitude);
      // Widget'ı güncelle
      if (prayerTimes) {
        console.log('🔄 WIDGET DEBUG: Widget güncelleniyor, namaz vakitleri:', prayerTimes);
        WidgetService.updateWidgetData(currentLocation, prayerTimes);
      }
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  // When prayer times are fetched, update widget
  useEffect(() => {
    if (prayerTimes && currentLocation) {
      WidgetService.updateWidgetData(currentLocation, prayerTimes);
    }
  }, [prayerTimes, currentLocation]);

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

  const getPrayerIcon = (prayerKey: string): string => {
    const prayerIcons: { [key: string]: string } = {
      imsak: 'weather-night',
      gunes: 'weather-sunny',
      ogle: 'weather-sunny',
      ikindi: 'weather-sunset',
      aksam: 'weather-sunset-down',
      yatsi: 'weather-night',
    };
    return prayerIcons[prayerKey] || 'mosque';
  };

  const getPrayerGradient = (prayerKey: string): string[] => {
    const gradients: { [key: string]: string[] } = {
      imsak: ['#1e3c72', '#2a5298'],
      gunes: ['#ff9a9e', '#fecfef'],
      ogle: ['#a8edea', '#fed6e3'],
      ikindi: ['#ffecd2', '#fcb69f'],
      aksam: ['#667eea', '#764ba2'],
      yatsi: ['#434343', '#000000'],
    };
    return gradients[prayerKey] || [Colors.primary, Colors.secondary];
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
        {/* Enhanced Location Header */}
        <Animated.View style={[styles.locationHeader, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.locationButton} onPress={handleLocationPress}>
            <LinearGradient
              colors={[Colors.primary, '#059669']}
              style={styles.locationGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="location-on" size={22} color={Colors.white} />
              <Text style={styles.locationText}>
                {selectedCity && selectedDistrict
                  ? `${selectedDistrict}, ${selectedCity}`
                  : selectedCity || 'Konum Seçiniz'}
              </Text>
              <Icon name="chevron-right" size={24} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Enhanced Date Display */}
        <Animated.View style={[styles.dateContainer, { opacity: fadeAnim }]}>
          <Text style={styles.gregorianDate}>
            {format(currentTime, 'EEEE, d MMMM yyyy', { locale: tr })}
          </Text>
          {hijriDate && (
            <Text style={styles.hijriDate}>
              🌙 {hijriDate}
            </Text>
          )}
        </Animated.View>

        {/* Enhanced Next Prayer Countdown */}
        {nextPrayer && (
          <Animated.View style={[styles.nextPrayerCard, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6', '#a855f7']}
              style={styles.nextPrayerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.nextPrayerHeader}>
                {/* Animated pulsing icon of upcoming prayer */}
                <Animated.View
                  style={{
                    transform: [
                      { scale: iconPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
                    ],
                  }}
                >
                  <MaterialCommunityIcons name={getPrayerIcon(prayerDisplayToKey(nextPrayer.name) || '')} size={24} color={Colors.white} />
                </Animated.View>
                <Text style={styles.nextPrayerLabel}>Bir Sonraki Namaz</Text>
              </View>
              <View style={styles.nextPrayerContent}>
                <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
                <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
              </View>
              <View style={styles.countdownContainer}>
                <MaterialCommunityIcons name="timer-sand" size={28} color={Colors.white} />
                <Animated.Text
                  style={[
                    styles.countdown,
                    { opacity: countdownBlinkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                  ]}
                >
                  {nextPrayer.remaining}
                </Animated.Text>
              </View>
              {/* Subtle progress */}
              <View style={styles.progressBarContainer}>
                <Animated.View 
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '70%'] }),
                    },
                  ]}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Enhanced Prayer Times Grid */}
        {prayerTimes ? (
          <Animated.View style={[styles.prayerTimesContainer, { opacity: fadeAnim }]}>
            {Object.entries(prayerTimes.times).map(([prayerKey, time], index) => (
              <Animated.View
                key={prayerKey}
                style={[
                  styles.prayerCard,
                  {
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50 * (index + 1), 0],
                      }),
                    }],
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    isCurrentPrayer(prayerKey)
                      ? ['#10b981', '#059669']
                      : isPrayerPast(time)
                      ? ['#e5e7eb', '#d1d5db']
                      : getPrayerGradient(prayerKey)
                  }
                  style={styles.prayerCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.prayerCardHeader}>
                    <MaterialCommunityIcons
                      name={getPrayerIcon(prayerKey)}
                      size={28}
                      color={Colors.white}
                    />
                    {notifications.prayers[prayerKey as keyof typeof notifications.prayers] && (
                      <MaterialCommunityIcons
                        name="bell"
                        size={16}
                        color={Colors.white}
                        style={styles.notificationIcon}
                      />
                    )}
                  </View>
                  
                  <View style={styles.prayerCardContent}>
                    <Text style={styles.prayerCardName}>
                      {getPrayerDisplayName(prayerKey)}
                    </Text>
                    <Text style={styles.prayerCardTime}>
                      {time}
                    </Text>
                  </View>
                  
                  {isCurrentPrayer(prayerKey) && (
                    <View style={styles.currentPrayerBadge}>
                      <MaterialCommunityIcons name="star" size={16} color={Colors.white} />
                      <Text style={styles.currentBadgeText}>ŞİMDİ</Text>
                    </View>
                  )}
                  
                  {isPrayerPast(time) && (
                    <View style={styles.pastPrayerOverlay}>
                      <MaterialCommunityIcons name="check" size={20} color={Colors.white} />
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>
            ))}
          </Animated.View>
        ) : (
          loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Namaz vakitleri yükleniyor...</Text>
            </View>
          )
        )}

        {/* Quick Access to Settings - Prominent Position */}
        <Animated.View style={[styles.prominentSettingsCard, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#ff6b6b', '#ee5a52', '#ff4757']}
            style={styles.prominentSettingsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.prominentSettingsContent}>
              <MaterialCommunityIcons name="settings" size={48} color={Colors.white} />
              <View style={styles.prominentSettingsTexts}>
                <Text style={styles.prominentSettingsTitle}>🔧 AYARLAR</Text>
                <Text style={styles.prominentSettingsSubtitle}>Ezan • Bildirim • Widget Temaları</Text>
                <Text style={styles.prominentSettingsAction}>Ayarları açmak için dokunun →</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.prominentSettingsButton}
              onPress={async () => {
                setShowPrayerSettings(true);
                // Widget'ı güncelle
                if (currentLocation && prayerTimes) {
                  await WidgetService.updateWidgetData(currentLocation, prayerTimes);
                }
              }}
            >
              <MaterialCommunityIcons name="arrow-right-circle" size={32} color={Colors.white} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Main Settings Button - Always Visible */}
        <Animated.View style={[styles.mainSettingsContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.mainSettingsButton}
            onPress={async () => {
              setShowPrayerSettings(true);
              // Widget'ı güncelle
              if (currentLocation && prayerTimes) {
                await WidgetService.updateWidgetData(currentLocation, prayerTimes);
              }
            }}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed', '#6366f1']}
              style={styles.mainSettingsGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.mainSettingsContent}>
                <View style={styles.mainSettingsLeft}>
                  <MaterialCommunityIcons name="cog" size={40} color={Colors.white} />
                  <View style={styles.mainSettingsTexts}>
                    <Text style={styles.mainSettingsTitle}>⚙️ Ayarlar</Text>
                    <Text style={styles.mainSettingsSubtitle}>Ezan, Bildirim ve Widget Ayarları</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={28} color={Colors.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Enhanced Settings & Features Section */}
        <Animated.View style={[styles.featuresContainer, { opacity: fadeAnim }]}>
          {/* Header */}
          <Text style={styles.featuresTitle}>🛠️ Gelişmiş Özellikler</Text>
          
          {/* Feature Cards Grid */}
          <View style={styles.featureCardsGrid}>
            {/* Calendar Feature */}
            <TouchableOpacity style={styles.featureCard}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.featureCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.featureCardHeader}>
                  <MaterialCommunityIcons name="calendar-month" size={28} color={Colors.white} />
                  <View style={styles.featureCardBadge}>
                    <Text style={styles.featureCardBadgeText}>YENİ</Text>
                  </View>
                </View>
                <Text style={styles.featureCardTitle}>Aylık Takvim</Text>
                <Text style={styles.featureCardDescription}>Tüm ayın namaz vakitlerini görüntüle</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Ezan & Notifications */}
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => setShowPrayerSettings(true)}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.featureCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.featureCardHeader}>
                  <MaterialCommunityIcons name="bell-ring" size={28} color={Colors.white} />
                  <View style={styles.featureCardBadge}>
                    <Text style={styles.featureCardBadgeText}>HOT</Text>
                  </View>
                </View>
                <Text style={styles.featureCardTitle}>Ezan & Bildirim</Text>
                <Text style={styles.featureCardDescription}>Ezan sesi ve bildirim ayarları</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Widget Management Section */}
          <View style={styles.widgetManagementSection}>
            <View style={styles.widgetSectionHeader}>
              <MaterialCommunityIcons name="widgets" size={24} color={Colors.primary} />
              <Text style={styles.widgetSectionTitle}>📱 Widget Yönetimi</Text>
            </View>
            
            <View style={styles.widgetControlsContainer}>
              {/* Widget Status */}
              <View style={styles.widgetStatusCard}>
                <LinearGradient
                  colors={['#ecfdf5', '#f0fdf4']}
                  style={styles.widgetStatusGradient}
                >
                  <View style={styles.widgetStatusHeader}>
                    <MaterialCommunityIcons name="widgets-outline" size={32} color={Colors.primary} />
                    <View style={styles.widgetStatusInfo}>
                      <Text style={styles.widgetStatusTitle}>Widget Durumu</Text>
                      <Text style={styles.widgetStatusDescription}>
                        Ana ekranınızda {/* widget count will be dynamic */}2 widget aktif
                      </Text>
                    </View>
                    <View style={styles.widgetStatusIndicator}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} />
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Widget Actions */}
              <View style={styles.widgetActionsGrid}>
                            <TouchableOpacity 
              style={styles.widgetActionCard}
              onPress={() => setShowWidgetManager(true)}
            >
              <LinearGradient
                colors={['#ddd6fe', '#e0e7ff']}
                style={styles.widgetActionGradient}
              >
                <MaterialCommunityIcons name="plus-circle" size={24} color="#7c3aed" />
                <Text style={styles.widgetActionText}>Widget Ekle</Text>
              </LinearGradient>
            </TouchableOpacity>

                <TouchableOpacity style={styles.widgetActionCard}>
                  <LinearGradient
                    colors={['#fed7d7', '#fecaca']}
                    style={styles.widgetActionGradient}
                  >
                    <MaterialCommunityIcons name="refresh" size={24} color="#dc2626" />
                    <Text style={styles.widgetActionText}>Yenile</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.widgetActionCard}
                  onPress={() => setShowWidgetManager(true)}
                >
                  <LinearGradient
                    colors={['#fef3c7', '#fde68a']}
                    style={styles.widgetActionGradient}
                  >
                    <MaterialCommunityIcons name="palette" size={24} color="#d97706" />
                    <Text style={styles.widgetActionText}>Temalar</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.widgetActionCard}
                  onPress={() => setShowPrayerSettings(true)}
                >
                  <LinearGradient
                    colors={['#d1fae5', '#a7f3d0']}
                    style={styles.widgetActionGradient}
                  >
                    <MaterialCommunityIcons name="cog" size={24} color="#059669" />
                    <Text style={styles.widgetActionText}>Ayarlar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Quick Access Settings */}
              <View style={styles.quickSettingsSection}>
                <Text style={styles.quickSettingsTitle}>⚡ Hızlı Ayarlar</Text>
                <View style={styles.quickSettingsGrid}>
                  <TouchableOpacity 
                    style={styles.quickSettingButton}
                    onPress={() => setShowPrayerSettings(true)}
                  >
                    <LinearGradient
                      colors={['#8b5cf6', '#7c3aed']}
                      style={styles.quickSettingGradient}
                    >
                      <MaterialCommunityIcons name="bell-ring" size={32} color={Colors.white} />
                      <Text style={styles.quickSettingTitle}>Ezan & Bildirim</Text>
                      <Text style={styles.quickSettingDescription}>Ezan sesi, bildirimler ve vakitten önce uyarılar</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.quickSettingButton}
                    onPress={() => setShowPrayerSettings(true)}
                  >
                    <LinearGradient
                      colors={['#f59e0b', '#d97706']}
                      style={styles.quickSettingGradient}
                    >
                      <MaterialCommunityIcons name="widgets" size={32} color={Colors.white} />
                      <Text style={styles.quickSettingTitle}>Widget Temaları</Text>
                      <Text style={styles.quickSettingDescription}>Widget görünümünü ve tema seçeneklerini ayarla</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Widget Preview */}
              <View style={styles.widgetPreviewSection}>
                <Text style={styles.widgetPreviewTitle}>📱 Widget Önizleme</Text>
                
                {/* Modern Widget Preview Cards */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.widgetPreviewScroll}>
                  {/* Compact Widget Preview */}
                  <View style={styles.widgetPreviewCard}>
                    <Text style={styles.widgetPreviewLabel}>Kompakt Widget</Text>
                    <View style={styles.mockWidgetCompact}>
                      <LinearGradient
                        colors={['#ffffff', '#f8fffe']}
                        style={styles.mockWidgetGradient}
                      >
                        <View style={styles.mockWidgetHeader}>
                          <Text style={styles.mockWidgetIcon}>🕌</Text>
                          <View style={styles.mockWidgetStatus}>
                            <View style={styles.mockStatusDot} />
                          </View>
                        </View>
                        <View style={styles.mockWidgetContent}>
                          <Text style={styles.mockWidgetNext}>Sıradaki: Öğle</Text>
                          <Text style={styles.mockWidgetTime}>12:45</Text>
                          <Text style={styles.mockWidgetRemaining}>23 dk</Text>
                        </View>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Standard Widget Preview */}
                  <View style={styles.widgetPreviewCard}>
                    <Text style={styles.widgetPreviewLabel}>Standart Widget</Text>
                    <View style={styles.mockWidgetStandard}>
                      <LinearGradient
                        colors={['#ffffff', '#f0fdf9']}
                        style={styles.mockWidgetGradient}
                      >
                        <View style={styles.mockWidgetHeader}>
                          <MaterialCommunityIcons name="bell" size={16} color={Colors.primary} />
                          <Text style={styles.mockWidgetAppName}>Mihmandar</Text>
                          <View style={styles.mockStatusDot} />
                        </View>
                        <View style={styles.mockWidgetMain}>
                          <Text style={styles.mockWidgetIcon}>🕌</Text>
                          <View style={styles.mockWidgetDetails}>
                            <Text style={styles.mockWidgetNext}>Sıradaki: Öğle</Text>
                            <Text style={styles.mockWidgetTime}>12:45 (23 dk)</Text>
                          </View>
                        </View>
                        <Text style={styles.mockWidgetHijri}>🌙 15 Rabiulevvel 1446</Text>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Full Widget Preview */}
                  <View style={styles.widgetPreviewCard}>
                    <Text style={styles.widgetPreviewLabel}>Tam Widget</Text>
                    <View style={styles.mockWidgetFull}>
                      <LinearGradient
                        colors={['#ffffff', '#f8fffe']}
                        style={styles.mockWidgetGradient}
                      >
                        <View style={styles.mockWidgetHeader}>
                          <MaterialCommunityIcons name="bell" size={14} color={Colors.primary} />
                          <Text style={styles.mockWidgetAppName}>Namaz Vakitleri</Text>
                          <Text style={styles.mockWidgetDate}>15 Ara</Text>
                        </View>
                        <View style={styles.mockWidgetNextPrayer}>
                          <Text style={styles.mockWidgetNextText}>Sıradaki: Öğle - 12:45 (23 dk)</Text>
                        </View>
                        <View style={styles.mockWidgetGrid}>
                          {['İmsak', 'Güneş', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'].map((prayer, index) => (
                            <View key={prayer} style={styles.mockPrayerItem}>
                              <Text style={styles.mockPrayerName}>{prayer}</Text>
                              <Text style={styles.mockPrayerTime}>12:45</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={styles.mockWidgetHijri}>🌙 15 Rabiulevvel 1446</Text>
                      </LinearGradient>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
        </Animated.View>
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

      {/* Prayer Times Settings Modal */}
      <PrayerTimesSettings
        visible={showPrayerSettings}
        onClose={() => setShowPrayerSettings(false)}
      />

      {/* Widget Manager Modal */}
      <WidgetManager
        visible={showWidgetManager}
        onClose={() => setShowWidgetManager(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  locationHeader: {
    marginBottom: 20,
  },
  locationButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  locationText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 12,
  },
  dateContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gregorianDate: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  hijriDate: {
    fontSize: 14,
    color: Colors.darkGray,
    fontStyle: 'italic',
  },
  nextPrayerCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  nextPrayerGradient: {
    padding: 24,
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
    marginLeft: 8,
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
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdown: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  prayerTimesContainer: {
    marginBottom: 20,
  },
  prayerCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  prayerCardGradient: {
    padding: 16,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  prayerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    opacity: 0.8,
  },
  prayerCardContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  prayerCardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  prayerCardTime: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'monospace',
  },
  currentPrayerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
    marginLeft: 4,
  },
  pastPrayerOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 8,
  },
  // Enhanced Features Section Styles
  featuresContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  featureCardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  featureCardGradient: {
    padding: 20,
    minHeight: 140,
  },
  featureCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  featureCardBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 6,
  },
  featureCardDescription: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    lineHeight: 18,
  },
  // Widget Management Section
  widgetManagementSection: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  widgetSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  widgetSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  widgetControlsContainer: {
    gap: 16,
  },
  widgetStatusCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  widgetStatusGradient: {
    padding: 16,
  },
  widgetStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetStatusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  widgetStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  widgetStatusDescription: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  widgetStatusIndicator: {
    marginLeft: 8,
  },
  widgetActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  widgetActionCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  widgetActionGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  // Widget Preview Section
  widgetPreviewSection: {
    marginTop: 8,
  },
  widgetPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  widgetPreviewScroll: {
    marginHorizontal: -10,
  },
  widgetPreviewCard: {
    marginHorizontal: 10,
    alignItems: 'center',
  },
  widgetPreviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  // Mock Widget Styles
  mockWidgetCompact: {
    width: 140,
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  mockWidgetStandard: {
    width: 160,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  mockWidgetFull: {
    width: 180,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  mockWidgetGradient: {
    flex: 1,
    padding: 8,
  },
  mockWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mockWidgetAppName: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
    marginLeft: 4,
  },
  mockWidgetDate: {
    fontSize: 7,
    color: Colors.darkGray,
  },
  mockWidgetStatus: {
    marginLeft: 'auto',
  },
  mockStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  mockWidgetContent: {
    flex: 1,
    justifyContent: 'center',
  },
  mockWidgetMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mockWidgetDetails: {
    flex: 1,
    marginLeft: 6,
  },
  mockWidgetIcon: {
    fontSize: 16,
  },
  mockWidgetNext: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 1,
  },
  mockWidgetTime: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text,
  },
  mockWidgetRemaining: {
    fontSize: 7,
    color: Colors.darkGray,
  },
  mockWidgetHijri: {
    fontSize: 6,
    color: '#f59e0b',
    textAlign: 'center',
  },
  mockWidgetNextPrayer: {
    backgroundColor: 'rgba(23, 114, 103, 0.1)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 4,
  },
  mockWidgetNextText: {
    fontSize: 7,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  mockWidgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginBottom: 4,
  },
  mockPrayerItem: {
    width: '30%',
    backgroundColor: Colors.background,
    borderRadius: 4,
    padding: 2,
    alignItems: 'center',
  },
  mockPrayerName: {
    fontSize: 5,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  mockPrayerTime: {
    fontSize: 6,
    fontWeight: 'bold',
    color: Colors.text,
  },
  // Quick Settings Section
  quickSettingsSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  quickSettingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  quickSettingsGrid: {
    gap: 12,
  },
  quickSettingButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  quickSettingGradient: {
    padding: 24,
    alignItems: 'center',
  },
  quickSettingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  quickSettingDescription: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Main Settings Button Styles
  mainSettingsContainer: {
    marginVertical: 20,
  },
  mainSettingsButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  mainSettingsGradient: {
    padding: 24,
  },
  mainSettingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mainSettingsTexts: {
    marginLeft: 16,
    flex: 1,
  },
  mainSettingsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  mainSettingsSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
  },
  // Prominent Settings Card Styles
  prominentSettingsCard: {
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  prominentSettingsGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prominentSettingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prominentSettingsTexts: {
    marginLeft: 16,
    flex: 1,
  },
  prominentSettingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  prominentSettingsSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  prominentSettingsAction: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  prominentSettingsButton: {
    marginLeft: 16,
    padding: 8,
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
