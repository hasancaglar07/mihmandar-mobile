import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useAppSelector } from '../store';
import { WidgetService } from '../services/widget';
import { NotificationService } from '../services/notifications';
import { getLocationForWidget } from '../services/location';
import { Colors } from '../constants/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface WidgetTestManagerProps {
  visible: boolean;
  onClose: () => void;
}

const WidgetTestManager: React.FC<WidgetTestManagerProps> = ({ visible, onClose }) => {
  const { data: prayerTimes } = useAppSelector(state => state.prayerTimes);
  const { currentLocation, selectedCity, selectedDistrict } = useAppSelector(state => state.location);
  const { notifications } = useAppSelector(state => state.settings);

  const [testResults, setTestResults] = useState<{ [key: string]: 'pending' | 'success' | 'error' }>({});
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateTestResult = (testName: string, result: 'success' | 'error') => {
    setTestResults(prev => ({ ...prev, [testName]: result }));
  };

  const runAllTests = async () => {
    setTestResults({});
    setTestLogs([]);
    addLog('🚀 Widget test suite başlatılıyor...');

    await testLocationPersistence();
    await testWidgetDataUpdate();
    await testThemeSync();
    await testPrayerTimeSync();
    await testWidgetRefresh();
    await testWidgetStatus();

    addLog('✅ Tüm testler tamamlandı!');
  };

  const testLocationPersistence = async () => {
    addLog('📍 Konum kalıcılığı test ediliyor...');
    setTestResults(prev => ({ ...prev, location: 'pending' }));

    try {
      const location = await getLocationForWidget();
      if (location) {
        addLog(`✅ Konum alındı: ${location.latitude}, ${location.longitude}`);
        updateTestResult('location', 'success');
      } else {
        addLog('❌ Konum alınamadı');
        updateTestResult('location', 'error');
      }
    } catch (error) {
      addLog(`❌ Konum hatası: ${error}`);
      updateTestResult('location', 'error');
    }
  };

  const testWidgetDataUpdate = async () => {
    addLog('📱 Widget veri güncellemesi test ediliyor...');
    setTestResults(prev => ({ ...prev, dataUpdate: 'pending' }));

    try {
      if (!currentLocation || !prayerTimes) {
        addLog('❌ Konum veya namaz vakitleri mevcut değil');
        updateTestResult('dataUpdate', 'error');
        return;
      }

      const next = NotificationService.getNextPrayerCountdown(prayerTimes);
      const locationName = selectedCity && selectedDistrict 
        ? `${selectedDistrict}, ${selectedCity}`
        : selectedCity || 'Test Konumu';

      await WidgetService.updateFromAppState(
        currentLocation,
        prayerTimes,
        { theme: 'light' },
        locationName
      );

      addLog('✅ Widget verisi güncellendi');
      updateTestResult('dataUpdate', 'success');
    } catch (error) {
      addLog(`❌ Widget veri güncelleme hatası: ${error}`);
      updateTestResult('dataUpdate', 'error');
    }
  };

  const testThemeSync = async () => {
    addLog('🎨 Tema senkronizasyonu test ediliyor...');
    setTestResults(prev => ({ ...prev, themeSync: 'pending' }));

    try {
      const themes = WidgetService.getAvailableThemes();
      
      // Test each theme
      for (let i = 0; i < themes.length; i++) {
        await WidgetService.setWidgetTheme(themes[i]);
        addLog(`✅ Tema ${i + 1} uygulandı`);
        await new Promise<void>(resolve => setTimeout(resolve, 500)); // Small delay
      }

      updateTestResult('themeSync', 'success');
    } catch (error) {
      addLog(`❌ Tema senkronizasyon hatası: ${error}`);
      updateTestResult('themeSync', 'error');
    }
  };

  const testPrayerTimeSync = async () => {
    addLog('🕌 Namaz vakti senkronizasyonu test ediliyor...');
    setTestResults(prev => ({ ...prev, prayerSync: 'pending' }));

    try {
      if (!prayerTimes) {
        addLog('❌ Namaz vakitleri mevcut değil');
        updateTestResult('prayerSync', 'error');
        return;
      }

      const next = NotificationService.getNextPrayerCountdown(prayerTimes);
      if (next) {
        addLog(`✅ Sıradaki namaz: ${next.name} - ${next.time}`);
        addLog(`⏰ Kalan süre: ${next.remaining.hours}:${next.remaining.minutes}:${next.remaining.seconds}`);
        updateTestResult('prayerSync', 'success');
      } else {
        addLog('❌ Sıradaki namaz bulunamadı');
        updateTestResult('prayerSync', 'error');
      }
    } catch (error) {
      addLog(`❌ Namaz vakti senkronizasyon hatası: ${error}`);
      updateTestResult('prayerSync', 'error');
    }
  };

  const testWidgetRefresh = async () => {
    addLog('🔄 Widget yenileme test ediliyor...');
    setTestResults(prev => ({ ...prev, refresh: 'pending' }));

    try {
      await WidgetService.refreshWidget();
      addLog('✅ Widget yenilendi');
      updateTestResult('refresh', 'success');
    } catch (error) {
      addLog(`❌ Widget yenileme hatası: ${error}`);
      updateTestResult('refresh', 'error');
    }
  };

  const testWidgetStatus = async () => {
    addLog('📊 Widget durumu kontrol ediliyor...');
    setTestResults(prev => ({ ...prev, status: 'pending' }));

    try {
      const isActive = await WidgetService.isWidgetAddedToHomeScreen();
      const isEnabled = await WidgetService.isWidgetEnabled();

      addLog(`📱 Widget aktif: ${isActive ? 'Evet' : 'Hayır'}`);
      addLog(`⚙️ Widget etkin: ${isEnabled ? 'Evet' : 'Hayır'}`);

      if (isActive && isEnabled) {
        updateTestResult('status', 'success');
      } else {
        addLog('⚠️ Widget tam olarak yapılandırılmamış');
        updateTestResult('status', 'error');
      }
    } catch (error) {
      addLog(`❌ Widget durum kontrolü hatası: ${error}`);
      updateTestResult('status', 'error');
    }
  };

  const getTestIcon = (result: 'pending' | 'success' | 'error' | undefined) => {
    switch (result) {
      case 'pending':
        return { name: 'loading', color: Colors.warning };
      case 'success':
        return { name: 'check-circle', color: Colors.success };
      case 'error':
        return { name: 'alert-circle', color: Colors.error };
      default:
        return { name: 'help-circle', color: Colors.darkGray };
    }
  };

  const clearLogs = () => {
    setTestLogs([]);
    setTestResults({});
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Widget Test Yöneticisi</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Test Controls */}
          <View style={styles.controlsSection}>
            <TouchableOpacity style={styles.runTestsButton} onPress={runAllTests}>
              <MaterialCommunityIcons name="play-circle" size={24} color={Colors.white} />
              <Text style={styles.runTestsText}>Tüm Testleri Çalıştır</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
              <MaterialCommunityIcons name="delete" size={20} color={Colors.error} />
              <Text style={styles.clearText}>Logları Temizle</Text>
            </TouchableOpacity>
          </View>

          {/* Test Results */}
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>📊 Test Sonuçları</Text>
            
            {[
              { key: 'location', name: 'Konum Kalıcılığı' },
              { key: 'dataUpdate', name: 'Veri Güncellemesi' },
              { key: 'themeSync', name: 'Tema Senkronizasyonu' },
              { key: 'prayerSync', name: 'Namaz Vakti Senkronizasyonu' },
              { key: 'refresh', name: 'Widget Yenileme' },
              { key: 'status', name: 'Widget Durumu' },
            ].map(test => {
              const icon = getTestIcon(testResults[test.key]);
              return (
                <View key={test.key} style={styles.testResult}>
                  <MaterialCommunityIcons 
                    name={icon.name} 
                    size={20} 
                    color={icon.color} 
                  />
                  <Text style={styles.testName}>{test.name}</Text>
                </View>
              );
            })}
          </View>

          {/* Test Logs */}
          <View style={styles.logsSection}>
            <Text style={styles.sectionTitle}>📝 Test Logları</Text>
            <View style={styles.logsContainer}>
              {testLogs.length === 0 ? (
                <Text style={styles.noLogs}>Henüz log yok. Testleri çalıştırın.</Text>
              ) : (
                testLogs.map((log, index) => (
                  <Text key={index} style={styles.logEntry}>
                    {log}
                  </Text>
                ))
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>⚡ Hızlı İşlemler</Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => WidgetService.openWidgetSettings()}
            >
              <MaterialCommunityIcons name="widgets" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Widget Ayarları</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => WidgetService.showWidgetManagement()}
            >
              <MaterialCommunityIcons name="cog" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Widget Yönetimi</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  controlsSection: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  runTestsButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  runTestsText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  clearText: {
    color: Colors.error,
    fontWeight: '600',
  },
  resultsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  testName: {
    fontSize: 14,
    color: Colors.text,
  },
  logsSection: {
    padding: 20,
    paddingTop: 0,
  },
  logsContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  noLogs: {
    color: Colors.darkGray,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  logEntry: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  actionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default WidgetTestManager;