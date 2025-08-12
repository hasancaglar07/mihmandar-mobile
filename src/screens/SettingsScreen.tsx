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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '../store';
import {
  setTheme,
  setLanguage,
  togglePrayerNotification,
  setNotificationTiming,
  updateNotificationSettings,
  resetSettings,
} from '../store/slices/settingsSlice';
import { clearRecentSearches } from '../store/slices/searchSlice';
import { Colors, getDynamicColors } from '../constants/colors';
import { NotificationService } from '../services/notifications';
import { persistCoordinatesForWidget } from '../services/location';

const notificationTimings = [
  { label: 'Vakit girdiğinde', value: 0 },
  { label: '5 dakika önce', value: 5 },
  { label: '10 dakika önce', value: 10 },
  { label: '15 dakika önce', value: 15 },
  { label: '30 dakika önce', value: 30 },
];

const languages = [
  { label: 'Türkçe', value: 'tr' },
  { label: 'English', value: 'en' },
];

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const settings = useAppSelector(state => state.settings);
  const { selectedCity, selectedDistrict } = useAppSelector(state => state.location);
  const { recentSearches } = useAppSelector(state => state.search);
  
  const [showNotificationTiming, setShowNotificationTiming] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  const dynamicColors = getDynamicColors(settings.theme === 'dark');

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

  const handlePrayerNotificationToggle = (prayerKey: keyof typeof settings.notifications.prayers) => {
    dispatch(togglePrayerNotification(prayerKey));
  };

  const handleNotificationTimingSelect = (minutes: number) => {
    dispatch(setNotificationTiming(minutes));
    setShowNotificationTiming(false);
  };

  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    dispatch(setTheme(newTheme));
  };

  const handleLanguageSelect = (language: 'tr' | 'en') => {
    dispatch(setLanguage(language));
    setShowLanguageSelector(false);
  };

  const handleClearSearchHistory = () => {
    Alert.alert(
      'Arama Geçmişini Temizle',
      'Tüm arama geçmişi silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            dispatch(clearRecentSearches());
            Alert.alert('Başarılı', 'Arama geçmişi temizlendi.');
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Ayarları Sıfırla',
      'Tüm ayarlar varsayılan değerlere sıfırlanacak. Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            dispatch(resetSettings());
            NotificationService.cancelAllNotifications();
            Alert.alert('Başarılı', 'Ayarlar varsayılan değerlere sıfırlandı.');
          },
        },
      ]
    );
  };

  // Example: When leaving settings we can persist last known GPS location if available in settings
  const persistGpsIfAvailable = () => {
    // If you store GPS location in settings, persist here; otherwise this is a no-op
    const gps: any = (settings as any).gpsLocation;
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      persistCoordinatesForWidget(gps.latitude, gps.longitude);
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

  const getLanguageLabel = () => {
    const language = languages.find(l => l.value === settings.language);
    return language ? language.label : 'Türkçe';
  };

  const renderSettingSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Icon name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showChevron && (
          <Icon name="chevron-right" size={20} color={Colors.darkGray} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: dynamicColors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Settings */}
        {renderSettingSection('Konum', (
          <View>
            {renderSettingItem({
              icon: 'location-on',
              title: 'Seçili Konum',
              subtitle: selectedCity && selectedDistrict 
                ? `${selectedDistrict}, ${selectedCity}`
                : selectedCity || 'Konum seçilmedi',
              showChevron: true,
            })}
          </View>
        ))}

        {/* Notification Settings */}
        {renderSettingSection('Bildirimler', (
          <View>
            {renderSettingItem({
              icon: 'notifications',
              title: 'Namaz Vakti Bildirimleri',
              subtitle: settings.notifications.enabled ? 'Aktif' : 'Kapalı',
              rightComponent: (
                <Switch
                  value={settings.notifications.enabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: Colors.lightGray, true: Colors.primary + '50' }}
                  thumbColor={settings.notifications.enabled ? Colors.primary : Colors.darkGray}
                />
              ),
            })}
            
            {settings.notifications.enabled && (
              <>
                {renderSettingItem({
                  icon: 'schedule',
                  title: 'Bildirim Zamanı',
                  subtitle: getNotificationTimingLabel(),
                  onPress: () => setShowNotificationTiming(true),
                  showChevron: true,
                })}
                
                <View style={styles.prayerNotifications}>
                  <Text style={styles.prayerNotificationsTitle}>Namaz Vakitleri</Text>
                  {Object.entries(prayerNames).map(([key, name]) => (
                    <View key={key} style={styles.prayerNotificationItem}>
                      <Text style={styles.prayerNotificationText}>{name}</Text>
                      <Switch
                        value={settings.notifications.prayers[key as keyof typeof settings.notifications.prayers]}
                        onValueChange={() => handlePrayerNotificationToggle(key as keyof typeof settings.notifications.prayers)}
                        trackColor={{ false: Colors.lightGray, true: Colors.primary + '50' }}
                        thumbColor={settings.notifications.prayers[key as keyof typeof settings.notifications.prayers] ? Colors.primary : Colors.darkGray}
                        style={styles.prayerSwitch}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}

        {/* Appearance Settings */}
        {renderSettingSection('Görünüm', (
          <View>
            {renderSettingItem({
              icon: settings.theme === 'dark' ? 'dark-mode' : 'light-mode',
              title: 'Tema',
              subtitle: settings.theme === 'dark' ? 'Koyu Tema' : 'Açık Tema',
              rightComponent: (
                <Switch
                  value={settings.theme === 'dark'}
                  onValueChange={handleThemeToggle}
                  trackColor={{ false: Colors.lightGray, true: Colors.primary + '50' }}
                  thumbColor={settings.theme === 'dark' ? Colors.primary : Colors.darkGray}
                />
              ),
            })}
            
            {renderSettingItem({
              icon: 'language',
              title: 'Dil',
              subtitle: getLanguageLabel(),
              onPress: () => setShowLanguageSelector(true),
              showChevron: true,
            })}
          </View>
        ))}

        {/* Data & Privacy */}
        {renderSettingSection('Veri ve Gizlilik', (
          <View>
            {renderSettingItem({
              icon: 'history',
              title: 'Arama Geçmişini Temizle',
              subtitle: `${recentSearches.length} arama kaydı`,
              onPress: handleClearSearchHistory,
              showChevron: true,
            })}
          </View>
        ))}

        {/* About */}
        {renderSettingSection('Hakkında', (
          <View>
            {renderSettingItem({
              icon: 'info',
              title: 'Uygulama Sürümü',
              subtitle: '1.0.0',
            })}
            
            {renderSettingItem({
              icon: 'help',
              title: 'Yardım ve Destek',
              showChevron: true,
            })}
            
            {renderSettingItem({
              icon: 'privacy-tip',
              title: 'Gizlilik Politikası',
              showChevron: true,
            })}
          </View>
        ))}

        {/* Reset */}
        {renderSettingSection('Ayarlar', (
          <View>
            {renderSettingItem({
              icon: 'restore',
              title: 'Ayarları Sıfırla',
              subtitle: 'Tüm ayarları varsayılan değerlere sıfırla',
              onPress: handleResetSettings,
              showChevron: true,
            })}
          </View>
        ))}
      </ScrollView>

      {/* Notification Timing Modal */}
      <Modal
        visible={showNotificationTiming}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationTiming(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bildirim Zamanı</Text>
              <TouchableOpacity onPress={() => setShowNotificationTiming(false)}>
                <Icon name="close" size={24} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
            
            {notificationTimings.map((timing) => (
              <TouchableOpacity
                key={timing.value}
                style={[
                  styles.modalItem,
                  settings.notifications.before_minutes === timing.value && styles.modalItemSelected,
                ]}
                onPress={() => handleNotificationTimingSelect(timing.value)}
              >
                <Text style={[
                  styles.modalItemText,
                  settings.notifications.before_minutes === timing.value && styles.modalItemTextSelected,
                ]}>
                  {timing.label}
                </Text>
                {settings.notifications.before_minutes === timing.value && (
                  <Icon name="check" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dil Seçimi</Text>
              <TouchableOpacity onPress={() => setShowLanguageSelector(false)}>
                <Icon name="close" size={24} color={Colors.darkGray} />
              </TouchableOpacity>
            </View>
            
            {languages.map((language) => (
              <TouchableOpacity
                key={language.value}
                style={[
                  styles.modalItem,
                  settings.language === language.value && styles.modalItemSelected,
                ]}
                onPress={() => handleLanguageSelect(language.value as 'tr' | 'en')}
              >
                <Text style={[
                  styles.modalItemText,
                  settings.language === language.value && styles.modalItemTextSelected,
                ]}>
                  {language.label}
                </Text>
                {settings.language === language.value && (
                  <Icon name="check" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerNotifications: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  prayerNotificationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  prayerNotificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prayerNotificationText: {
    fontSize: 16,
    color: Colors.text,
  },
  prayerSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default SettingsScreen;
