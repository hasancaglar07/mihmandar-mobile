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
import { Colors } from '../constants/colors';
import { WidgetService } from '../services/widget';

interface WidgetManagerProps {
  visible: boolean;
  onClose: () => void;
}

const WidgetManager: React.FC<WidgetManagerProps> = ({ visible, onClose }) => {
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(false);
  const [isWidgetAdded, setIsWidgetAdded] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [selectedWidgetType, setSelectedWidgetType] = useState<'compact' | 'standard' | 'full'>('standard');
  const [customTheme, setCustomTheme] = useState({
    background: '#ffffff',
    primaryColor: '#177267',
    textColor: '#1f2937',
    accentColor: '#ffc574',
  });

  useEffect(() => {
    if (visible) {
      loadWidgetStatus();
    }
  }, [visible]);

  const loadWidgetStatus = async () => {
    try {
      const enabled = await WidgetService.isWidgetEnabled();
      const added = await WidgetService.isWidgetAddedToHomeScreen();
      setIsWidgetEnabled(enabled);
      setIsWidgetAdded(added);
    } catch (error) {
      console.error('Error loading widget status:', error);
    }
  };

  const handleEnableWidget = async (value: boolean) => {
    if (value) {
      const success = await WidgetService.showWidgetInstallationPrompt();
      if (success) {
        setIsWidgetEnabled(true);
        loadWidgetStatus();
      }
    } else {
      setIsWidgetEnabled(false);
    }
  };

  const handleAddWidget = () => {
    WidgetService.openWidgetSettings();
  };

  const handleRefreshWidget = async () => {
    try {
      await WidgetService.refreshWidget();
      Alert.alert('✅ Başarılı', 'Widget güncellendi!');
    } catch (error) {
      Alert.alert('❌ Hata', 'Widget güncellenirken bir hata oluştu.');
    }
  };

  const handleThemeChange = async (themeIndex: number) => {
    try {
      const themes = WidgetService.getAvailableThemes();
      await WidgetService.setWidgetTheme(themes[themeIndex]);
      setSelectedTheme(themeIndex);
      Alert.alert('🎨 Tema Değiştirildi', 'Widget teması güncellendi!');
    } catch (error) {
      Alert.alert('❌ Hata', 'Tema değiştirilirken bir hata oluştu.');
    }
  };

  const themes = WidgetService.getAvailableThemes();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#f0fdf4', '#ecfdf5', '#d1fae5']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="widgets" size={28} color={Colors.primary} />
              <Text style={styles.title}>Widget Yönetimi</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Widget Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Widget Durumu</Text>
            
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <View style={styles.statusLeft}>
                  <MaterialCommunityIcons 
                    name="toggle-switch" 
                    size={24} 
                    color={isWidgetEnabled ? Colors.success : Colors.darkGray} 
                  />
                  <Text style={styles.statusLabel}>Widget Etkin</Text>
                </View>
                <Switch
                  value={isWidgetEnabled}
                  onValueChange={handleEnableWidget}
                  trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={styles.statusItem}>
                <View style={styles.statusLeft}>
                  <MaterialCommunityIcons 
                    name="home" 
                    size={24} 
                    color={isWidgetAdded ? Colors.success : Colors.darkGray} 
                  />
                  <Text style={styles.statusLabel}>Ana Ekrana Eklendi</Text>
                </View>
                <MaterialCommunityIcons 
                  name={isWidgetAdded ? "check-circle" : "close-circle"} 
                  size={24} 
                  color={isWidgetAdded ? Colors.success : Colors.error} 
                />
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Hızlı İşlemler</Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, !isWidgetEnabled && styles.disabledButton]}
              onPress={handleAddWidget}
              disabled={!isWidgetEnabled}
            >
              <LinearGradient
                colors={isWidgetEnabled ? [Colors.primary, '#059669'] : [Colors.lightGray, Colors.darkGray]}
                style={styles.actionGradient}
              >
                <MaterialCommunityIcons name="plus" size={24} color={Colors.white} />
                <Text style={styles.actionText}>Widget Ekle</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, !isWidgetAdded && styles.disabledButton]}
              onPress={handleRefreshWidget}
              disabled={!isWidgetAdded}
            >
              <LinearGradient
                colors={isWidgetAdded ? [Colors.secondary, '#f59e0b'] : [Colors.lightGray, Colors.darkGray]}
                style={styles.actionGradient}
              >
                <MaterialCommunityIcons name="refresh" size={24} color={Colors.white} />
                <Text style={styles.actionText}>Widget Yenile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Widget Type Selection */}
          {isWidgetEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📱 Widget Türü</Text>
              
              <View style={styles.widgetTypeGrid}>
                {[
                  { key: 'compact', name: 'Kompakt', description: 'Sadece sıradaki namaz', icon: 'view-compact' },
                  { key: 'standard', name: 'Standart', description: 'Sıradaki + Hijri tarih', icon: 'view-module' },
                  { key: 'full', name: 'Tam', description: 'Tüm namaz vakitleri', icon: 'view-grid' },
                ].map(({ key, name, description, icon }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.widgetTypeCard,
                      selectedWidgetType === key && styles.selectedWidgetType
                    ]}
                    onPress={() => setSelectedWidgetType(key as any)}
                  >
                    <MaterialCommunityIcons 
                      name={icon} 
                      size={32} 
                      color={selectedWidgetType === key ? Colors.white : Colors.primary} 
                    />
                    <Text style={[
                      styles.widgetTypeName,
                      selectedWidgetType === key && styles.widgetTypeNameSelected
                    ]}>{name}</Text>
                    <Text style={[
                      styles.widgetTypeDescription,
                      selectedWidgetType === key && styles.widgetTypeDescriptionSelected
                    ]}>{description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Theme Selection */}
          {isWidgetEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎨 Widget Teması</Text>
              
              <View style={styles.themeGrid}>
                {themes.map((theme, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.themeCard,
                      selectedTheme === index && styles.selectedTheme
                    ]}
                    onPress={() => handleThemeChange(index)}
                  >
                    <View 
                      style={[
                        styles.themePreview,
                        { backgroundColor: theme.background }
                      ]}
                    >
                      <View style={[styles.themePrimaryBar, { backgroundColor: theme.primaryColor }]} />
                      <View style={styles.themeTextLines}>
                        <View style={[styles.themeTextLine, { backgroundColor: theme.textColor }]} />
                        <View style={[styles.themeTextLine, styles.themeTextLineShort, { backgroundColor: theme.accentColor }]} />
                      </View>
                    </View>
                    {selectedTheme === index && (
                      <MaterialCommunityIcons 
                        name="check-circle" 
                        size={20} 
                        color={Colors.success}
                        style={styles.themeCheckIcon}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Custom Theme Builder */}
              <View style={styles.customThemeContainer}>
                <Text style={styles.customThemeTitle}>🛠️ Özel Tema Oluştur</Text>
                
                <View style={styles.colorPickerGrid}>
                  {[
                    { key: 'background', name: 'Arka Plan', color: customTheme.background },
                    { key: 'primaryColor', name: 'Ana Renk', color: customTheme.primaryColor },
                    { key: 'textColor', name: 'Metin Rengi', color: customTheme.textColor },
                    { key: 'accentColor', name: 'Vurgu Rengi', color: customTheme.accentColor },
                  ].map(({ key, name, color }) => (
                    <View key={key} style={styles.colorPickerItem}>
                      <Text style={styles.colorPickerLabel}>{name}</Text>
                      <TouchableOpacity
                        style={[styles.colorPickerButton, { backgroundColor: color }]}
                        onPress={() => {
                          // Color picker functionality would go here
                          Alert.alert('Renk Seçici', 'Renk seçici özelliği geliştirilecek');
                        }}
                      >
                        <MaterialCommunityIcons name="palette" size={16} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Widget Preview */}
          {isWidgetEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👀 Widget Önizleme</Text>
              
              <View style={styles.widgetPreview}>
                <LinearGradient
                  colors={[themes[selectedTheme].background, themes[selectedTheme].background]}
                  style={styles.previewCard}
                >
                  <View style={styles.previewHeader}>
                    <MaterialCommunityIcons name="mosque" size={20} color={themes[selectedTheme].primaryColor} />
                    <Text style={[styles.previewTitle, { color: themes[selectedTheme].textColor }]}>
                      Mihmandar
                    </Text>
                  </View>
                  <Text style={[styles.previewNext, { color: themes[selectedTheme].primaryColor }]}>
                    Sıradaki: Öğle
                  </Text>
                  <Text style={[styles.previewTime, { color: themes[selectedTheme].textColor }]}>
                    12:45 (≈ 23 dk)
                  </Text>
                  <Text style={[styles.previewDate, { color: themes[selectedTheme].accentColor }]}>
                    🌙 15 Rabiulevvel 1446
                  </Text>
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Nasıl Kullanılır?</Text>
            
            <View style={styles.instructionsCard}>
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Widget'ı etkinleştirin</Text>
              </View>
              
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  {Platform.OS === 'android' 
                    ? 'Ana ekranınızda boş alana uzun basın ve "Widget\'lar" seçeneğini bulun'
                    : 'Ana ekranınızda boş alana uzun basın ve "+" butonuna dokunun'
                  }
                </Text>
              </View>
              
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>"Mihmandar" uygulamasını bulun ve widget'ı sürükleyip bırakın</Text>
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
    marginTop: 100,
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
    fontSize: 20,
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
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedTheme: {
    borderColor: Colors.primary,
  },
  themePreview: {
    width: 80,
    height: 80,
    padding: 8,
    position: 'relative',
  },
  themePrimaryBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  themeTextLines: {
    flex: 1,
    justifyContent: 'space-around',
  },
  themeTextLine: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: 4,
  },
  themeTextLineShort: {
    width: '60%',
  },
  themeCheckIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  widgetPreview: {
    alignItems: 'center',
  },
  previewCard: {
    width: 200,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewNext: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewDate: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  instructionsCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  widgetTypeGrid: {
    gap: 12,
  },
  widgetTypeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.lightGray,
    marginBottom: 12,
  },
  selectedWidgetType: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  widgetTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  widgetTypeNameSelected: {
    color: Colors.white,
  },
  widgetTypeDescription: {
    fontSize: 12,
    color: Colors.darkGray,
    textAlign: 'center',
    marginTop: 4,
  },
  widgetTypeDescriptionSelected: {
    color: Colors.white,
    opacity: 0.9,
  },
  customThemeContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  customThemeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorPickerItem: {
    flex: 1,
    minWidth: '45%',
  },
  colorPickerLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 6,
  },
  colorPickerButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
});

export default WidgetManager;
