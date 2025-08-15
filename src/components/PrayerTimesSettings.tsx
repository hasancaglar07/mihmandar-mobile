import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/colors';
import { NotificationService } from '../services/notifications';
import { WidgetService } from '../services/widget';
import { PrayerDataService } from '../services/prayerData';
import { useAppSelector, useAppDispatch } from '../store';
import { updateNotificationSettings, updateEzanSettings } from '../store/slices/settingsSlice';

interface PrayerTimesSettingsProps {
  visible: boolean;
  onClose: () => void;
}

interface EzanSettings {
  enabled: boolean;
  volume: number;
  ezanType: 'builtin' | 'traditional' | 'modern' | 'chime';
  vibration: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  beforeMinutes: number;
  prayers: {
    imsak: boolean;
    gunes: boolean;
    ogle: boolean;
    ikindi: boolean;
    aksam: boolean;
    yatsi: boolean;
  };
}

const PrayerTimesSettings: React.FC<PrayerTimesSettingsProps> = ({ visible, onClose }) => {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector(state => state.settings);
  
  const [ezanSettings, setEzanSettings] = useState<EzanSettings>({
    enabled: notifications.ezan.enabled,
    volume: notifications.ezan.volume,
    ezanType: notifications.ezan.ezanType,
    vibration: notifications.ezan.vibration,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: notifications.enabled,
    beforeMinutes: notifications.before_minutes,
    prayers: notifications.prayers,
  });

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const currentEzanSettings = NotificationService.getEzanSettings();
      setEzanSettings(currentEzanSettings);
      // Load notification settings from AsyncStorage or Redux
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleEzanToggle = (enabled: boolean) => {
    setEzanSettings(prev => ({ ...prev, enabled }));
    dispatch(updateEzanSettings({ enabled }));
    NotificationService.setEzanSettings({ ...ezanSettings, enabled });
    persistAndReschedule({ ...notificationSettings }, { ...ezanSettings, enabled });
  };

  const handleEzanVolumeChange = (volume: number) => {
    const newSettings = { ...ezanSettings, volume };
    setEzanSettings(newSettings);
    NotificationService.setEzanSettings(newSettings);
    WidgetService.persistSettingsToNative({ preMinutes: notificationSettings.beforeMinutes, enableEzan: newSettings.enabled, prayers: notificationSettings.prayers }).catch(()=>{});
  };

  const handleEzanTypeChange = (ezanType: 'builtin' | 'traditional' | 'modern' | 'chime') => {
    const newSettings = { ...ezanSettings, ezanType };
    setEzanSettings(newSettings);
    NotificationService.setEzanSettings(newSettings);
    WidgetService.persistSettingsToNative({ preMinutes: notificationSettings.beforeMinutes, enableEzan: newSettings.enabled, prayers: notificationSettings.prayers }).catch(()=>{});
  };

  const handleTestEzan = async () => {
    try {
      // Test için geçici olarak ezan'ı aktif et
      const testSettings = { ...ezanSettings, enabled: true };
      NotificationService.setEzanSettings(testSettings);
      
      console.log('🎵 Test edilen ezan türü:', ezanSettings.ezanType);
      await NotificationService.playEzan('test');
      
      Alert.alert(
        '🎵 Ezan Testi', 
        `${ezanSettings.ezanType} ezan sesi çalınıyor...\n\nEzan dosyası: ${getEzanFileName(ezanSettings.ezanType)}`,
        [{ text: 'Tamam', style: 'default' }]
      );
      
      // Orijinal ayarları geri yükle
      NotificationService.setEzanSettings(ezanSettings);
    } catch (error) {
      console.error('Ezan test hatası:', error);
      Alert.alert(
        'Hata', 
        `Ezan çalarken bir hata oluştu: ${error.message}\n\nEzan türü: ${ezanSettings.ezanType}\nDosya: ${getEzanFileName(ezanSettings.ezanType)}`,
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const getEzanFileName = (ezanType: string) => {
    switch (ezanType) {
      case 'traditional': return 'ezan_traditional.mp3';
      case 'modern': return 'ezan_modern.mp3';
      case 'chime': return 'ezan_chime.mp3';
      default: return 'ezan_builtin.mp3';
    }
  };

  const handleTestNotification = async () => {
    try {
      NotificationService.showImmediateNotification(
        '🔔 Test Bildirimi',
        'Bildirim sistemi çalışıyor! Emülatörde bildirimler aktif.'
      );
      Alert.alert(
        '✅ Test Başarılı',
        'Test bildirimi gönderildi! Emülatörün bildirim panelini kontrol edin.',
        [{ text: 'Tamam', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        'Hata',
        `Bildirim gönderilemedi: ${error.message}`,
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const handlePrayerNotificationToggle = (prayer: keyof NotificationSettings['prayers']) => {
    setNotificationSettings(prev => {
      const next = {
        ...prev,
        prayers: { ...prev.prayers, [prayer]: !prev.prayers[prayer] },
      };
      dispatch(updateNotificationSettings({ prayers: next.prayers }));
      persistAndReschedule(next, ezanSettings);
      return next;
    });
  };

  const persistAndReschedule = async (ns: NotificationSettings, ez: EzanSettings) => {
    try {
      // Persist to native for receivers and widgets
      await WidgetService.persistSettingsToNative({ preMinutes: ns.beforeMinutes, enableEzan: ez.enabled, prayers: ns.prayers });
    } catch {}
    try {
      const snap = await PrayerDataService.loadSnapshot();
      if (snap && ns.enabled) {
        NotificationService.schedulePrayerNotifications(
          { times: snap.times } as any,
          { enabled: true, before_minutes: ns.beforeMinutes, prayers: ns.prayers } as any
        );
      } else if (!ns.enabled) {
        NotificationService.cancelAllNotifications();
      }
    } catch {}
  };

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

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#f0fdf4', '#ecfdf5', '#d1fae5']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="cog" size={28} color={Colors.primary} />
              <Text style={styles.title}>Namaz Vakitleri Ayarları</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionCard} onPress={async ()=>{
                try {
                  await NotificationService.playEzan('test');
                } catch {}
              }}>
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={styles.quickActionGradient}
                >
                  <MaterialCommunityIcons name="volume-high" size={24} color={Colors.white} />
                  <Text style={styles.quickActionText}>Ezan Aç</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionCard} onPress={async ()=>{
                setNotificationSettings(prev=>({...prev, enabled: true}));
                try {
                  // Re-schedule with last known snapshot
                  const snap = await PrayerDataService.loadSnapshot();
                  if (snap) {
                    NotificationService.schedulePrayerNotifications(
                      { times: snap.times } as any,
                      { enabled: true, before_minutes: 10, prayers: { imsak:true, gunes:true, ogle:true, ikindi:true, aksam:true, yatsi:true } } as any
                    );
                  }
                } catch {}
              }}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.quickActionGradient}
                >
                  <MaterialCommunityIcons name="bell-plus" size={24} color={Colors.white} />
                  <Text style={styles.quickActionText}>Bildirimleri Aç</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionCard} onPress={()=>{
                try { require('../services/widget').WidgetService.openWidgetSettings(); } catch {}
              }}>
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.quickActionGradient}
                >
                  <MaterialCommunityIcons name="widgets" size={24} color={Colors.white} />
                  <Text style={styles.quickActionText}>Widget Ekle</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Ezan Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔊 Ezan Ayarları</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="volume-high" size={24} color={Colors.primary} />
                  <Text style={styles.settingLabel}>Ezan Sesini Aç</Text>
                </View>
                <Switch
                  value={ezanSettings.enabled}
                  onValueChange={handleEzanToggle}
                  trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="vibrate" size={24} color={Colors.secondary} />
                  <Text style={styles.settingLabel}>Titreşim</Text>
                </View>
                <Switch
                  value={ezanSettings.vibration}
                  onValueChange={(vibration) => setEzanSettings(prev => ({ ...prev, vibration }))}
                  trackColor={{ false: Colors.lightGray, true: Colors.secondary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.volumeContainer}>
                <Text style={styles.volumeLabel}>Ses Düzeyi: {Math.round(ezanSettings.volume * 100)}%</Text>
                <Slider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={ezanSettings.volume}
                  onValueChange={handleEzanVolumeChange}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.lightGray}
                  thumbStyle={{ backgroundColor: Colors.primary }}
                />
              </View>

              <View style={styles.ezanTypeContainer}>
                <Text style={styles.subsectionTitle}>Ezan Türü Seçimi</Text>
                <Text style={styles.volumeLabel}>Çalmak istediğiniz ezan sesini seçin:</Text>
                <View style={styles.ezanTypeGrid}>
                  {[
                    { key: 'traditional', name: 'Geleneksel', icon: 'mosque' },
                    { key: 'modern', name: 'Modern', icon: 'music-note' },
                    { key: 'builtin', name: 'Basit', icon: 'bell' },
                    { key: 'chime', name: 'Zil', icon: 'bell-ring' },
                  ].map(({ key, name, icon }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.ezanTypeButton,
                        ezanSettings.ezanType === key && styles.ezanTypeButtonSelected
                      ]}
                      onPress={() => handleEzanTypeChange(key as any)}
                    >
                      <MaterialCommunityIcons 
                        name={icon} 
                        size={24} 
                        color={ezanSettings.ezanType === key ? Colors.white : Colors.primary} 
                      />
                      <Text style={[
                        styles.ezanTypeText,
                        ezanSettings.ezanType === key && styles.ezanTypeTextSelected
                      ]}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.testButton, { flex: 1 }]} onPress={handleTestEzan}>
                  <LinearGradient
                    colors={[Colors.secondary, '#f59e0b']}
                    style={styles.testButtonGradient}
                  >
                    <MaterialCommunityIcons name="play" size={20} color={Colors.white} />
                    <Text style={styles.testButtonText}>Ezan Test</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.testButton, { flex: 1 }]} onPress={handleTestNotification}>
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.testButtonGradient}
                  >
                    <MaterialCommunityIcons name="bell" size={20} color={Colors.white} />
                    <Text style={styles.testButtonText}>Bildirim Test</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Bildirim Ayarları</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="bell" size={24} color={Colors.info} />
                  <Text style={styles.settingLabel}>Bildirimleri Aç</Text>
                </View>
                <Switch
                  value={notificationSettings.enabled}
                  onValueChange={(enabled) => {
                    setNotificationSettings(prev => ({ ...prev, enabled }));
                    dispatch(updateNotificationSettings({ enabled }));
                    persistAndReschedule({ ...notificationSettings, enabled }, ezanSettings);
                  }}
                  trackColor={{ false: Colors.lightGray, true: Colors.info }}
                  thumbColor={Colors.white}
                />
              </View>

              {notificationSettings.enabled && (
                <>
                  <View style={styles.beforeMinutesContainer}>
                    <Text style={styles.beforeMinutesLabel}>
                      Vakitten {notificationSettings.beforeMinutes} dakika önce hatırlat
                    </Text>
                    <Slider
                      style={styles.beforeMinutesSlider}
                      minimumValue={0}
                      maximumValue={30}
                      step={5}
                      value={notificationSettings.beforeMinutes}
                      onValueChange={(beforeMinutes) => {
                        setNotificationSettings(prev => ({ ...prev, beforeMinutes }));
                        dispatch(updateNotificationSettings({ before_minutes: beforeMinutes }));
                        persistAndReschedule({ ...notificationSettings, beforeMinutes }, ezanSettings);
                      }}
                      minimumTrackTintColor={Colors.info}
                      maximumTrackTintColor={Colors.lightGray}
                      thumbStyle={{ backgroundColor: Colors.info }}
                    />
                  </View>

                  <View style={styles.prayerTogglesContainer}>
                    <Text style={styles.subsectionTitle}>Hangi vakitlerde bildirim alsın?</Text>
                    {Object.entries(notificationSettings.prayers).map(([prayer, enabled]) => (
                      <View key={prayer} style={styles.prayerToggleItem}>
                        <Text style={styles.prayerToggleLabel}>
                          {getPrayerDisplayName(prayer)}
                        </Text>
                        <Switch
                          value={enabled}
                          onValueChange={() => handlePrayerNotificationToggle(prayer as any)}
                          trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                          thumbColor={Colors.white}
                        />
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Advanced Reminder Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Gelişmiş Hatırlatma</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="clock-alert" size={24} color={Colors.warning} />
                  <Text style={styles.settingLabel}>Özel Hatırlatma Zamanları</Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  trackColor={{ false: Colors.lightGray, true: Colors.warning }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.reminderTimesContainer}>
                <Text style={styles.subsectionTitle}>Hatırlatma Zamanları (dk)</Text>
                <View style={styles.reminderTimesList}>
                  {[5, 10, 15, 30, 60].map((time) => (
                    <TouchableOpacity key={time} style={styles.reminderTimeChip}>
                      <Text style={styles.reminderTimeText}>{time} dk</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="calendar-clock" size={24} color={Colors.info} />
                  <Text style={styles.settingLabel}>Cuma Günü Özel Hatırlatma</Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  trackColor={{ false: Colors.lightGray, true: Colors.info }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="moon-waning-crescent" size={24} color={Colors.secondary} />
                  <Text style={styles.settingLabel}>Ramazan Modu</Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() => {}}
                  trackColor={{ false: Colors.lightGray, true: Colors.secondary }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>
          </View>

          {/* Widget Themes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 Widget Temaları</Text>
            <Text style={styles.volumeLabel}>Widget'ınızın görünümünü özelleştirin:</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
              {[
                { name: 'Açık', colors: ['#ffffff', '#f8fffe'], themeIndex: 0 },
                { name: 'Koyu', colors: ['#1f2937', '#374151'], themeIndex: 1 },
                { name: 'Doğa', colors: ['#f0fdf4', '#10b981'], themeIndex: 2 },
                { name: 'Altın', colors: ['#fef3c7', '#f59e0b'], themeIndex: 3 },
                { name: 'Mavi', colors: ['#eff6ff', '#1d4ed8'], themeIndex: 4 },
                { name: 'Mor', colors: ['#faf5ff', '#7c3aed'], themeIndex: 5 },
                { name: 'Gradient', colors: ['#667eea', '#764ba2'], themeIndex: 6 },
                { name: 'Minimal', colors: ['#f8fafc', '#374151'], themeIndex: 7 },
                { name: 'Kırmızı', colors: ['#fef2f2', '#dc2626'], themeIndex: 8 },
                { name: 'Turuncu', colors: ['#fff7ed', '#ea580c'], themeIndex: 9 },
              ].map((theme, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.themeCard}
                  onPress={async () => {
                    try {
                      const availableThemes = WidgetService.getAvailableThemes();
                      const selectedTheme = availableThemes[theme.themeIndex];
                      
                      // Tema uygula
                      await WidgetService.setWidgetTheme(selectedTheme);
                      
                      // Widget'ı force refresh et
                      await WidgetService.refreshWidget();
                      
                      // Mevcut prayer data ile widget'ı güncelle
                      try {
                        const { PrayerDataService } = require('../services/prayerData');
                        const snapshot = await PrayerDataService.loadSnapshot();
                        if (snapshot) {
                          await WidgetService.updateWidgetData(
                            snapshot.location,
                            { times: snapshot.times },
                            snapshot.nextPrayer,
                            snapshot.locationName
                          );
                        }
                      } catch (e) {
                        console.warn('Widget data update failed:', e);
                      }
                      
                      Alert.alert(
                        '✅ Tema Uygulandı',
                        `${theme.name} teması widget'a uygulandı ve güncellendi!`,
                        [{ text: 'Tamam', style: 'default' }]
                      );
                    } catch (error) {
                      Alert.alert(
                        'Hata',
                        `Tema uygulanırken hata oluştu: ${error.message}`,
                        [{ text: 'Tamam', style: 'default' }]
                      );
                    }
                  }}
                >
                  <LinearGradient
                    colors={theme.colors}
                    style={styles.themePreview}
                  >
                    <MaterialCommunityIcons name="widgets" size={20} color={theme.themeIndex === 1 || theme.themeIndex === 6 ? Colors.white : Colors.text} />
                  </LinearGradient>
                  <Text style={styles.themeName}>{theme.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.themeInfo}>
              <MaterialCommunityIcons name="information-outline" size={16} color={Colors.darkGray} />
              <Text style={styles.themeInfoText}>
                Tema değişiklikleri widget'a anında yansır. 3x2 boyutunda tüm vakitler görünür.
              </Text>
            </View>
          </View>

          {/* Information */}
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="information" size={24} color={Colors.info} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>💡 Bilgi</Text>
                <Text style={styles.infoText}>
                  • Ezan sesi sadece namaz vakti girdiğinde çalar{'\n'}
                  • Bildirimler vakitten önce hatırlatma amaçlıdır{'\n'}
                  • Widget temaları anında uygulanır{'\n'}
                  • Tüm ayarlar otomatik kaydedilir
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    marginTop: 80,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  volumeContainer: {
    paddingTop: 16,
  },
  volumeLabel: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 8,
  },
  volumeSlider: {
    width: '100%',
    height: 40,
  },
  ezanTypeContainer: {
    paddingTop: 16,
  },
  ezanTypeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  ezanTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  ezanTypeButtonSelected: {
    backgroundColor: Colors.primary,
  },
  ezanTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },
  ezanTypeTextSelected: {
    color: Colors.white,
  },
  testButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  testButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 8,
  },
  beforeMinutesContainer: {
    paddingTop: 16,
  },
  beforeMinutesLabel: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 8,
  },
  beforeMinutesSlider: {
    width: '100%',
    height: 40,
  },
  prayerTogglesContainer: {
    paddingTop: 16,
  },
  prayerToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prayerToggleLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  infoCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
  },
  // Quick Actions Styles
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  quickActionGradient: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 6,
    textAlign: 'center',
  },
  // Advanced Reminder Styles
  reminderTimesContainer: {
    paddingTop: 16,
  },
  reminderTimesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderTimeChip: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  reminderTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  // Widget Theme Styles
  themeScroll: {
    marginHorizontal: -10,
  },
  themeCard: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.lightGray,
  },
  themeName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  themeInfoText: {
    fontSize: 12,
    color: Colors.darkGray,
    marginLeft: 6,
    flex: 1,
  },
});

export default PrayerTimesSettings;