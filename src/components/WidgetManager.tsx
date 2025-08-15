import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import { Colors } from '../constants/colors';
import { WidgetService } from '../services/widget';
import { useAppDispatch, useAppSelector } from '../store';
import {
  updateWidgetSettings,
  updateNotificationSettings,
  updateEzanSettings,
  togglePrayerNotification,
} from '../store/slices/settingsSlice';
import { NotificationService } from '../services/notifications';

interface WidgetManagerProps {
  visible: boolean;
  onClose: () => void;
}

const WidgetManager: React.FC<WidgetManagerProps> = ({ visible, onClose }) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const { widget, notifications } = settings;

  useEffect(() => {
    if (visible) {
      // Sync with native widget state if needed
      WidgetService.isWidgetEnabled().then(enabled => {
        if (enabled !== widget.enabled) {
          dispatch(updateWidgetSettings({ enabled }));
        }
      });
    }
  }, [visible, widget.enabled, dispatch]);

  const handleToggleWidget = async (value: boolean) => {
    if (value) {
      const success = await WidgetService.showWidgetInstallationPrompt();
      dispatch(updateWidgetSettings({ enabled: success }));
    } else {
      // Optionally, you can add a function to remove the widget
      dispatch(updateWidgetSettings({ enabled: false }));
    }
  };

  const handleRefreshWidget = async () => {
    try {
      await WidgetService.refreshWidget();
      Alert.alert('✅ Başarılı', 'Widget başarıyla yenilendi!');
    } catch (error) {
      Alert.alert('❌ Hata', 'Widget yenilenirken bir hata oluştu.');
    }
  };

  const themes = [
    { name: 'Açık', key: 'light', colors: ['#ffffff', '#f8fffe'] },
    { name: 'Koyu', key: 'dark', colors: ['#1f2937', '#374151'] },
    { name: 'Doğa', key: 'green', colors: ['#10b981', '#059669'] },
    { name: 'Altın', key: 'gold', colors: ['#f59e0b', '#d97706'] },
  ];

  const widgetTypes = [
    { key: 'compact', name: 'Kompakt', description: 'Sadece sıradaki vakit', icon: 'view-compact' },
    { key: 'standard', name: 'Standart', description: 'Sıradaki vakit + Hicri tarih', icon: 'view-module' },
    { key: 'full', name: 'Tam', description: 'Tüm günün vakitleri', icon: 'view-grid' },
  ];

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <LinearGradient colors={['#f0fdf4', '#ecfdf5', '#d1fae5']} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="tune" size={28} color={Colors.primary} />
              <Text style={styles.title}>Ayarlar</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Widget Nasıl Eklenir?</Text>
            <View style={styles.instructionsCard}>
              <Text style={styles.stepText}>
                1. Ana ekranınızda boş bir alana uzun basın.
              </Text>
              <Text style={styles.stepText}>
                2. {Platform.OS === 'android' ? '"Widget\'lar" menüsünü açın.' : '"+" butonuna dokunun.'}
              </Text>
              <Text style={styles.stepText}>
                3. "Mihmandar" uygulamasını bulun ve istediğiniz widget'ı ana ekranınıza sürükleyin.
              </Text>
            </View>
          </View>

          {/* Widget Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Widget Ayarları</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Widget'ı Etkinleştir</Text>
                <Switch
                  value={widget.enabled}
                  onValueChange={handleToggleWidget}
                  trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
              <TouchableOpacity style={styles.button} onPress={handleRefreshWidget}>
                <MaterialCommunityIcons name="refresh" size={20} color={Colors.white} />
                <Text style={styles.buttonText}>Widget'ı Şimdi Yenile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Widget Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🖼️ Widget Türü</Text>
            <View style={styles.card}>
              {widgetTypes.map(({ key, name, description, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.typeRow, widget.type === key && styles.typeRowSelected]}
                  onPress={() => dispatch(updateWidgetSettings({ type: key as any }))}
                >
                  <MaterialCommunityIcons name={icon} size={28} color={widget.type === key ? Colors.primary : Colors.darkGray} />
                  <View style={styles.typeTextContainer}>
                    <Text style={[styles.typeName, widget.type === key && styles.typeNameSelected]}>{name}</Text>
                    <Text style={styles.typeDescription}>{description}</Text>
                  </View>
                  {widget.type === key && <MaterialCommunityIcons name="check-circle" size={24} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Widget Theme */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 Widget Teması</Text>
            <View style={styles.themeGrid}>
              {themes.map(theme => (
                <TouchableOpacity
                  key={theme.key}
                  onPress={() => dispatch(updateWidgetSettings({ theme: theme.key as any }))}
                >
                  <LinearGradient colors={theme.colors} style={[styles.themeCard, widget.theme === theme.key && styles.selectedThemeCard]}>
                    {widget.theme === theme.key && <MaterialCommunityIcons name="check" size={24} color={Colors.white} />}
                  </LinearGradient>
                  <Text style={styles.themeName}>{theme.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Bildirim Ayarları</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Tüm Bildirimler</Text>
                <Switch
                  value={notifications.enabled}
                  onValueChange={v => dispatch(updateNotificationSettings({ enabled: v }))}
                  trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
              {notifications.enabled && (
                <>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.settingLabel}>Hatırlatma Zamanı: {notifications.before_minutes} dk önce</Text>
                    <Slider
                      minimumValue={0}
                      maximumValue={60}
                      step={5}
                      value={notifications.before_minutes}
                      onSlidingComplete={v => dispatch(updateNotificationSettings({ before_minutes: v }))}
                    />
                  </View>
                  {Object.keys(notifications.prayers).map(prayer => (
                    <View key={prayer} style={styles.settingRow}>
                      <Text style={styles.settingLabel}>{prayer.charAt(0).toUpperCase() + prayer.slice(1)}</Text>
                      <Switch
                        value={notifications.prayers[prayer as keyof typeof notifications.prayers]}
                        onValueChange={() => dispatch(togglePrayerNotification(prayer as any))}
                      />
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>

          {/* Ezan Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔊 Ezan Sesi Ayarları</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Ezan Okunsun</Text>
                <Switch
                  value={notifications.ezan.enabled}
                  onValueChange={v => dispatch(updateEzanSettings({ enabled: v }))}
                />
              </View>
              {notifications.ezan.enabled && (
                <>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Titreşim</Text>
                    <Switch
                      value={notifications.ezan.vibration}
                      onValueChange={v => dispatch(updateEzanSettings({ vibration: v }))}
                    />
                  </View>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.settingLabel}>Ses Seviyesi: {Math.round(notifications.ezan.volume * 100)}%</Text>
                    <Slider
                      minimumValue={0}
                      maximumValue={1}
                      value={notifications.ezan.volume}
                      onSlidingComplete={v => dispatch(updateEzanSettings({ volume: v }))}
                    />
                  </View>
                  <TouchableOpacity style={styles.button} onPress={() => NotificationService.playEzan('test')}>
                    <MaterialCommunityIcons name="play" size={20} color={Colors.white} />
                    <Text style={styles.buttonText}>Ezan Sesini Test Et</Text>
                  </TouchableOpacity>
                </>
              )}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    backgroundColor: '#f0f2f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  instructionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  stepText: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  typeRowSelected: {
    backgroundColor: '#e6f4f2',
    borderColor: Colors.primary,
  },
  typeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  typeNameSelected: {
    color: Colors.primary,
  },
  typeDescription: {
    fontSize: 13,
    color: Colors.darkGray,
  },
  themeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeCard: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThemeCard: {
    borderColor: Colors.primary,
  },
  themeName: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    color: Colors.text,
  },
  sliderContainer: {
    paddingVertical: 12,
  },
});

export default WidgetManager;