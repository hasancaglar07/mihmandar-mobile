import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  Button,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '../store';
import {
  setTheme,
  togglePrayerNotification,
  setNotificationTiming,
  updateNotificationSettings,
} from '../store/slices/settingsSlice';
import { Colors, getDynamicColors } from '../constants/colors';
import { NotificationService } from '../services/notifications';
import { persistCoordinatesForWidget, requestLocationPermission, getCurrentLocation } from '../services/location';

const notificationTimings = [
  { label: 'Vakit girdiğinde', value: 0 },
  { label: '5 dakika önce', value: 5 },
  { label: '10 dakika önce', value: 10 },
  { label: '15 dakika önce', value: 15 },
  { label: '30 dakika önce', value: 30 },
];

const WidgetSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const settings = useAppSelector(state => state.settings);
  const { selectedCity, selectedDistrict, coordinates } = useAppSelector(state => state.location);
  
  const [showNotificationTiming, setShowNotificationTiming] = useState(false);
  
  const dynamicColors = getDynamicColors(settings.theme === 'dark');

  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    dispatch(setTheme(newTheme));
  };

  const handlePrayerNotificationToggle = (prayerKey: keyof typeof settings.notifications.prayers) => {
    dispatch(togglePrayerNotification(prayerKey));
  };

  const handleNotificationTimingSelect = (minutes: number) => {
    dispatch(setNotificationTiming(minutes));
    setShowNotificationTiming(false);
  };

  const handleNotificationToggle = (enabled: boolean) => {
    dispatch(updateNotificationSettings({ enabled }));
    
    if (!enabled) {
      NotificationService.cancelAllNotifications();
      Alert.alert(
        'Bildirimler Kapatıldı',
        'Namaz vakti bildirimleri kapatıldı.',
        [{ text: 'Tamam' }]
      );
    } else {
      NotificationService.requestPermissions().then((granted) => {
        if (!granted) {
          Alert.alert(
            'Bildirim İzni',
            'Bildirim göndermek için izin gerekli. Ayarlardan izin verebilirsiniz.',
            [{ text: 'Tamam' }]
          );
          dispatch(updateNotificationSettings({ enabled: false }));
        }
      });
    }
  };

  const handleUpdateLocation = async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      try {
        const location = await getCurrentLocation();
        dispatch(persistCoordinatesForWidget(location.latitude, location.longitude));
        Alert.alert('Konum Güncellendi', 'Widget konumu başarıyla güncellendi.');
      } catch (error) {
        Alert.alert('Konum Hatası', 'Konum alınamadı. Lütfen GPS ayarlarınızı kontrol edin.');
      }
    }
  };

  const prayerNames = {
    imsak: 'İmsak',
    gunes: 'Güneş',
    ogle: 'Öğle',
    ikindi: 'İkindi',
    aksam: 'Akşam',
    yatsi: 'Yatsı',
  };

  const getNotificationTimingLabel = () => {
    const timing = notificationTimings.find(t => t.value === settings.notifications.before_minutes);
    return timing ? timing.label : 'Özel';
  };

  const renderSettingSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderSettingItem = ({
    icon,
    title,
    subtitle,
    rightComponent,
    onPress,
    showChevron = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    rightComponent?: React.ReactNode;
    onPress?: () => void;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: dynamicColors.cardBackground }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Icon name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: dynamicColors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: dynamicColors.secondaryText }]}>{subtitle}</Text>
        )}
      </View>
      {rightComponent}
      {showChevron && <Icon name="chevron-right" size={24} color={dynamicColors.secondaryText} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: dynamicColors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {renderSettingSection('Görünüm Ayarları',
        <>
          {renderSettingItem({
            icon: 'brightness-6',
            title: 'Koyu Tema',
            rightComponent: (
              <Switch
                value={settings.theme === 'dark'}
                onValueChange={handleThemeToggle}
                trackColor={{ false: Colors.gray, true: Colors.primary } }
                thumbColor={Colors.white}
              />
            ),
          })}
        </>
      )}

      {renderSettingSection('Widget Konum Ayarları',
        <>
          {renderSettingItem({
            icon: 'location-on',
            title: 'Konumu Güncelle',
            subtitle: `Mevcut Konum: ${coordinates ? `${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}` : (selectedCity ? `${selectedCity}, ${selectedDistrict}` : 'Seçilmedi')}`,
            onPress: handleUpdateLocation,
            showChevron: true,
          })}
        </>
      )}

      {renderSettingSection('Bildirim Ayarları',
        <>
          {renderSettingItem({
            icon: 'notifications',
            title: 'Bildirimler',
            rightComponent: (
              <Switch
                value={settings.notifications.enabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: Colors.gray, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            ),
          })}
          {settings.notifications.enabled && (
            <>
              {renderSettingItem({
                icon: 'timer',
                title: 'Bildirim Zamanı',
                subtitle: getNotificationTimingLabel(),
                onPress: () => setShowNotificationTiming(true),
                showChevron: true,
              })}
              {Object.keys(prayerNames).map(key => (
                <View key={key} style={styles.prayerNotificationItem}>
                  <Text style={[styles.prayerName, { color: dynamicColors.text }]}>{prayerNames[key as keyof typeof prayerNames]}</Text>
                  <Switch
                    value={settings.notifications.prayers[key as keyof typeof settings.notifications.prayers]}
                    onValueChange={() => handlePrayerNotificationToggle(key as keyof typeof settings.notifications.prayers)}
                    trackColor={{ false: Colors.gray, true: Colors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
              ))}
            </>
          )}
        </>
      )}

      <Modal
        transparent={true}
        visible={showNotificationTiming}
        animationType="fade"
        onRequestClose={() => setShowNotificationTiming(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowNotificationTiming(false)}>
          <View style={[styles.modalContent, { backgroundColor: dynamicColors.cardBackground }]}>
            {notificationTimings.map(timing => (
              <TouchableOpacity
                key={timing.value}
                style={styles.modalItem}
                onPress={() => handleNotificationTimingSelect(timing.value)}
              >
                <Text style={{ color: dynamicColors.text }}>{timing.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: 'transparent',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  prayerNotificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  prayerName: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 8,
    padding: 16,
    width: '80%',
  },
  modalItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});

export default WidgetSettingsScreen;