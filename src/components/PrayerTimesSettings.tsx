import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Slider,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/colors';
import { NotificationService } from '../services/notifications';

interface PrayerTimesSettingsProps {
  visible: boolean;
  onClose: () => void;
}

interface EzanSettings {
  enabled: boolean;
  volume: number;
  ezanType: 'builtin' | 'traditional' | 'modern';
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
  const [ezanSettings, setEzanSettings] = useState<EzanSettings>({
    enabled: false,
    volume: 0.8,
    ezanType: 'traditional',
    vibration: true,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    beforeMinutes: 10,
    prayers: {
      imsak: true,
      gunes: false,
      ogle: true,
      ikindi: true,
      aksam: true,
      yatsi: true,
    },
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
    NotificationService.setEzanSettings({ ...ezanSettings, enabled });
  };

  const handleEzanVolumeChange = (volume: number) => {
    setEzanSettings(prev => ({ ...prev, volume }));
    NotificationService.setEzanSettings({ ...ezanSettings, volume });
  };

  const handleEzanTypeChange = (ezanType: 'builtin' | 'traditional' | 'modern') => {
    setEzanSettings(prev => ({ ...prev, ezanType }));
    NotificationService.setEzanSettings({ ...ezanSettings, ezanType });
  };

  const handleTestEzan = async () => {
    try {
      await NotificationService.playEzan('test');
      Alert.alert('Test', 'Ezan testi başlatıldı');
    } catch (error) {
      Alert.alert('Hata', 'Ezan çalarken bir hata oluştu');
    }
  };

  const handlePrayerNotificationToggle = (prayer: keyof NotificationSettings['prayers']) => {
    setNotificationSettings(prev => ({
      ...prev,
      prayers: {
        ...prev.prayers,
        [prayer]: !prev.prayers[prayer],
      },
    }));
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
              <TouchableOpacity style={styles.quickActionCard}>
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={styles.quickActionGradient}
                >
                  <MaterialCommunityIcons name="volume-high" size={24} color={Colors.white} />
                  <Text style={styles.quickActionText}>Ezan Aç</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionCard}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.quickActionGradient}
                >
                  <MaterialCommunityIcons name="bell-plus" size={24} color={Colors.white} />
                  <Text style={styles.quickActionText}>Bildirimleri Aç</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionCard}>
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

              {ezanSettings.enabled && (
                <>
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
                    <Text style={styles.subsectionTitle}>Ezan Türü</Text>
                    <View style={styles.ezanTypeGrid}>
                      {[
                        { key: 'traditional', name: 'Geleneksel', icon: 'mosque' },
                        { key: 'modern', name: 'Modern', icon: 'music-note' },
                        { key: 'builtin', name: 'Basit', icon: 'bell' },
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

                  <TouchableOpacity style={styles.testButton} onPress={handleTestEzan}>
                    <LinearGradient
                      colors={[Colors.secondary, '#f59e0b']}
                      style={styles.testButtonGradient}
                    >
                      <MaterialCommunityIcons name="play" size={20} color={Colors.white} />
                      <Text style={styles.testButtonText}>Ezan Testini Dinle</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
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
                  onValueChange={(enabled) => setNotificationSettings(prev => ({ ...prev, enabled }))}
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
                      onValueChange={(beforeMinutes) => setNotificationSettings(prev => ({ ...prev, beforeMinutes }))}
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
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
              {[
                { name: 'Açık', colors: ['#ffffff', '#f8fffe'], selected: true },
                { name: 'Koyu', colors: ['#1f2937', '#374151'], selected: false },
                { name: 'Doğa', colors: ['#10b981', '#059669'], selected: false },
                { name: 'Altın', colors: ['#f59e0b', '#d97706'], selected: false },
                { name: 'Gece', colors: ['#6366f1', '#4f46e5'], selected: false },
              ].map((theme, index) => (
                <TouchableOpacity key={index} style={styles.themeCard}>
                  <LinearGradient
                    colors={theme.colors}
                    style={styles.themePreview}
                  >
                    {theme.selected && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={Colors.white} />
                    )}
                  </LinearGradient>
                  <Text style={styles.themeName}>{theme.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
});

export default PrayerTimesSettings;
