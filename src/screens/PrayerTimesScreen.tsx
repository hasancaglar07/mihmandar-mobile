
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector, useAppDispatch } from '../store';
import { 
  getPrayerTimes, 
  setCurrentLocation, 
  setSelectedCity, 
  setUseGPS 
} from '../store/slices/prayerTimesSlice';
import { Colors } from '../constants/colors';
import { PrayerTimeCard } from '../components/PrayerTimeCard';
import { Countdown } from '../components/Countdown';
import { LocationPicker } from '../components/LocationPicker';
import { NotificationService } from '../services/notifications';
import WidgetManager from '../components/WidgetManager';
import PrayerTimesSettings from '../components/PrayerTimesSettings';
import { LocationService } from '../services/location';
import { WidgetService } from '../services/widget';
import apiService from '../services/api';

const PrayerTimesScreen = () => {
  const dispatch = useAppDispatch();
  const [isWidgetManagerVisible, setWidgetManagerVisible] = useState(false);
  const [isPrayerSettingsVisible, setPrayerSettingsVisible] = useState(false);
  const [isLocationPickerVisible, setLocationPickerVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const {
    data: prayerData,
    loading,
    error,
    currentLocation,
    selectedCity,
    selectedDistrict,
    useGPS,
  } = useAppSelector(state => state.prayerTimes);
  const { selected_city, selected_district, notifications } = useAppSelector(state => state.settings);

  const fetchGPSLocation = async () => {
    setLocationLoading(true);
    try {
      console.log('🌍 GPS konum alma başlatılıyor...');
      
      // Yeni güçlü location service kullan
      const locationResult = await LocationService.getCurrentLocation({
        timeout: 20000,
        retryCount: 3,
        showErrorAlert: true
      });
      
      console.log('📍 Konum alındı:', locationResult);
      
      // Redux store'a konum bilgisini kaydet
      dispatch(setCurrentLocation({
        latitude: locationResult.location.latitude,
        longitude: locationResult.location.longitude,
        source: locationResult.source,
        timestamp: locationResult.timestamp
      }));
      
      // Konum kaynağına göre kullanıcıyı bilgilendir
      if (locationResult.source === 'fallback') {
        console.log('⚠️ Fallback konum kullanılıyor');
      } else if (locationResult.source === 'cache') {
        console.log('💾 Cache\'den konum kullanılıyor');
      } else {
        console.log('🛰️ GPS\'ten taze konum alındı');
      }
      
      console.log('🕌 GPS ile namaz vakitleri çekiliyor...');
      const prayerTimes = await apiService.fetchPrayerTimesByGPS(
        locationResult.location.latitude, 
        locationResult.location.longitude
      );
      console.log('✅ GPS namaz vakitleri alındı:', prayerTimes);
      
      // GPS'ten gelen veriyi doğrudan Redux store'a kaydet
      dispatch({
        type: 'prayerTimes/getPrayerTimes/fulfilled',
        payload: prayerTimes
      });
      
      // Widget'ı güncelle
      try {
        console.log('🔄 Widget güncelleniyor...');
        await WidgetService.updateWidgetData(
          locationResult.location,
          prayerTimes,
          prayerTimes.next_prayer,
          prayerTimes.city || 'GPS Konumu'
        );
        console.log('✅ Widget başarıyla güncellendi');
      } catch (widgetError) {
        console.error('❌ Widget güncelleme hatası:', widgetError);
      }
      
      // Ezan ayarlarını güncelle
      if (notifications.ezan.enabled) {
        NotificationService.setEzanSettings({
          enabled: notifications.ezan.enabled,
          volume: notifications.ezan.volume,
          ezanType: notifications.ezan.ezanType,
          vibration: notifications.ezan.vibration,
        });
      }
      
      // Namaz vakti bildirimlerini planla
      NotificationService.schedulePrayerNotifications(prayerTimes, {
        enabled: notifications.enabled,
        beforeMinutes: notifications.before_minutes,
        prayers: notifications.prayers,
      });
      
    } catch (error) {
      console.error('❌ GPS konum hatası:', error);
      
      // Hata durumunda şehir seçimine geç
        dispatch(setUseGPS(false));
      
      if (!selected_city) {
        console.log('📍 Şehir seçici açılıyor...');
        setLocationPickerVisible(true);
      } else {
        // Mevcut şehir seçimi varsa onu kullan
        console.log('🏙️ Mevcut şehir seçimi kullanılıyor:', selected_city, selected_district);
      }
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect çalıştı:', { useGPS, selectedCity, selectedDistrict });
    
    if (useGPS) {
      console.log('🌍 GPS modu aktif, konum alınıyor...');
      fetchGPSLocation();
    } else if (selectedCity && selectedDistrict) {
      console.log('🏙️ Şehir seçimi ile namaz vakitleri çekiliyor:', selectedCity, selectedDistrict);
      
      dispatch(getPrayerTimes({ city: selectedCity, district: selectedDistrict }))
        .unwrap()
        .then(async (prayerTimes) => {
          console.log('✅ Şehir bazlı namaz vakitleri alındı:', prayerTimes);
          
          // Widget'ı güncelle
          try {
            console.log('🔄 Widget güncelleniyor (şehir bazlı)...');
            await WidgetService.updateWidgetData(
              { latitude: 0, longitude: 0 }, // Şehir bazlı için dummy location
              prayerTimes,
              prayerTimes.next_prayer,
              `${selectedCity}, ${selectedDistrict}`
            );
            console.log('✅ Widget başarıyla güncellendi (şehir bazlı)');
          } catch (widgetError) {
            console.error('❌ Widget güncelleme hatası (şehir bazlı):', widgetError);
          }
          
          // Ezan ayarlarını güncelle
           if (notifications.ezan.enabled) {
             NotificationService.setEzanSettings({
               enabled: notifications.ezan.enabled,
               volume: notifications.ezan.volume,
               ezanType: notifications.ezan.ezanType,
               vibration: notifications.ezan.vibration,
             });
           }
           
           // Şehir bazlı namaz vakti bildirimlerini planla
           NotificationService.schedulePrayerNotifications(prayerTimes, {
             enabled: notifications.enabled,
             beforeMinutes: notifications.before_minutes,
             prayers: notifications.prayers,
           });
        })
        .catch((error) => {
          console.error('❌ Şehir bazlı namaz vakitleri hatası:', error);
        });
    } else if (!selectedCity) {
      console.log('📍 Konum seçici açılıyor...');
      setLocationPickerVisible(true);
    }
  }, [dispatch, selectedCity, selectedDistrict, useGPS]);

  const nextPrayer = useMemo(() => {
    if (prayerData && prayerData.times) {
      return prayerData.next_prayer;
    }
    return null;
  }, [prayerData]);

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={Colors.primary} style={styles.centered} />;
    }
    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setLocationPickerVisible(true)}>
            <Text style={styles.buttonText}>Konum Seç</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!prayerData || !prayerData.times) {
      return (
        <View style={styles.centered}>
          <Text style={styles.infoText}>Vakit bilgisi bulunamadı.</Text>
          <TouchableOpacity style={styles.button} onPress={() => setLocationPickerVisible(true)}>
            <Text style={styles.buttonText}>Konum Seç</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView>
        <View style={styles.headerContainer}>
          <Text style={styles.date}>{prayerData.date}</Text>
          <Text style={styles.hijriDate}>{prayerData.city}{prayerData.district ? `, ${prayerData.district}` : ''}</Text>
        </View>

        {nextPrayer && (
          <View style={styles.countdownContainer}>
            <Text style={styles.nextPrayerText}>Sıradaki Vakit: {nextPrayer.name}</Text>
            <Countdown targetTime={nextPrayer.time} />
          </View>
        )}

        <View style={styles.prayerTimesContainer}>
          {Object.entries(prayerData.times).map(([name, time]) => (
            <PrayerTimeCard
              key={name}
              name={name}
              time={time}
              isCurrent={nextPrayer?.name === name}
            />
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.topBarButton} 
          onPress={() => {
            if (useGPS) {
              dispatch(setUseGPS(false));
              setLocationPickerVisible(true);
            } else {
              setLocationPickerVisible(true);
            }
          }}
        >
          <MaterialCommunityIcons 
            name={useGPS ? "crosshairs-gps" : "map-marker"} 
            size={20} 
            color={useGPS ? Colors.success : Colors.primary} 
          />
          <Text style={styles.locationText}>
            {locationLoading ? 'Konum alınıyor...' : 
             useGPS ? (currentLocation ? 'GPS Konumu' : 'GPS Hatası') :
             (selectedCity && selectedDistrict ? `${selectedCity}, ${selectedDistrict}` : 'Konum Seç')}
          </Text>
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          {!useGPS && (
            <TouchableOpacity 
              style={styles.gpsButton}
              onPress={() => dispatch(setUseGPS(true))}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color={Colors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.topBarButton} onPress={() => setPrayerSettingsVisible(true)}>
            <MaterialCommunityIcons name="cog" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBarButton} onPress={() => setWidgetManagerVisible(true)}>
            <MaterialCommunityIcons name="widgets" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}

      <LocationPicker
            visible={isLocationPickerVisible}
            onClose={() => setLocationPickerVisible(false)}
            onCitySelected={(city, district) => {
              dispatch(setUseGPS(false));
              dispatch(setSelectedCity({ city, district }));
              setLocationPickerVisible(false);
            }}
          />

      <PrayerTimesSettings
        visible={isPrayerSettingsVisible}
        onClose={() => setPrayerSettingsVisible(false)}
      />

      <WidgetManager
        visible={isWidgetManagerVisible}
        onClose={() => setWidgetManagerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  topBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gpsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  date: {
    fontSize: 18,
    color: Colors.text,
  },
  hijriDate: {
    fontSize: 16,
    color: Colors.darkGray,
    marginTop: 4,
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  nextPrayerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  prayerTimesContainer: {
    paddingHorizontal: 16,
  },
});

export default PrayerTimesScreen;