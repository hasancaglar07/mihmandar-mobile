import { Alert, Platform, Linking, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationInfo } from '../types';

interface WidgetData {
  nextPrayer: {
    name: string;
    time: string;
    remainingMinutes: number;
  };
  currentTime: string;
  location: string;
  hijriDate: string;
  allPrayerTimes: {
    imsak: string;
    gunes: string;
    ogle: string;
    ikindi: string;
    aksam: string;
    yatsi: string;
  };
}

interface WidgetTheme {
  background: string;
  primaryColor: string;
  textColor: string;
  accentColor: string;
}

const { WidgetModule } = NativeModules;

export class WidgetService {
  private static readonly WIDGET_PROMPT_SHOWN_KEY = 'widget_prompt_shown';
  private static readonly WIDGET_ENABLED_KEY = 'widget_enabled';
  private static readonly WIDGET_THEME_KEY = 'widget_theme';

  /**
   * Check if the widget installation prompt should be shown
   */
  static async shouldShowWidgetPrompt(): Promise<boolean> {
    try {
      const promptShown = await AsyncStorage.getItem(this.WIDGET_PROMPT_SHOWN_KEY);
      const widgetEnabled = await AsyncStorage.getItem(this.WIDGET_ENABLED_KEY);
      
      // Show prompt if not shown before and widget is not enabled
      return !promptShown && !widgetEnabled;
    } catch (error) {
      console.error('Error checking widget prompt status:', error);
      return false;
    }
  }

  /**
   * Mark that the widget prompt has been shown
   */
  static async markWidgetPromptShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WIDGET_PROMPT_SHOWN_KEY, 'true');
    } catch (error) {
      console.error('Error marking widget prompt as shown:', error);
    }
  }

  /**
   * Enable widget tracking
   */
  static async enableWidget(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WIDGET_ENABLED_KEY, 'true');
    } catch (error) {
      console.error('Error enabling widget:', error);
    }
  }

  /**
   * Check if widget is enabled
   */
  static async isWidgetEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.WIDGET_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Show widget installation prompt with enhanced UX
   */
  static async showWidgetInstallationPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '🕌 Namaz Vakitleri Widget\'ı',
        'Ana ekranınıza namaz vakitleri widget\'ını ekleyerek vakitleri her zaman takip edebilirsiniz.\n\n✨ Özellikler:\n• Bir sonraki namaz vakti\n• Kalan süre sayacı\n• Hijri takvim tarihi\n• Otomatik güncelleme',
        [
          {
            text: '⏭️ Şimdi Değil',
            style: 'cancel',
            onPress: () => {
              this.markWidgetPromptShown();
              resolve(false);
            },
          },
          {
            text: '❌ Tekrar Sorma',
            style: 'destructive',
            onPress: () => {
              this.markWidgetPromptShown();
              resolve(false);
            },
          },
          {
            text: '📱 Widget Ekle',
            style: 'default',
            onPress: () => {
              this.enableWidget();
              this.markWidgetPromptShown();
              this.openWidgetSettings();
              resolve(true);
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Open system widget settings page
   */
  static openWidgetSettings(): void {
    if (Platform.OS === 'android') {
      // Open Android home screen to add widget
      try {
        const intent = 'android.appwidget.action.APPWIDGET_PICK';
        Linking.openURL(`intent://#Intent;action=${intent};end`);
      } catch (error) {
        // Fallback: Show instructions
        Alert.alert(
          'Widget Nasıl Eklenir?',
          '1. Ana ekranınızda boş bir alana uzun basın\n2. "Widget\'lar" veya "Araçlar" seçeneğine dokunun\n3. "Mihmandar" uygulamasını bulun\n4. "Namaz Vakitleri" widget\'ını sürükleyip bırakın'
        );
      }
    } else {
      // iOS widget instructions
      Alert.alert(
        'Widget Nasıl Eklenir?',
        '1. Ana ekranınızda boş bir alana uzun basın\n2. Sol üst köşedeki "+" butonuna dokunun\n3. "Mihmandar" uygulamasını arayın\n4. Widget boyutunu seçin ve "Widget Ekle" butonuna dokunun'
      );
    }
  }

  /**
   * Update widget data
   */
  static async updateWidgetData(
    location: LocationInfo,
    prayerTimes: any,
    nextPrayer: any,
    locationName: string
  ): Promise<void> {
    try {
      const hijriDate = new Intl.DateTimeFormat('tr-TR-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());

      const widgetData: WidgetData = {
        nextPrayer: {
          name: nextPrayer?.name || 'İmsak',
          time: nextPrayer?.time || '--:--',
          remainingMinutes: nextPrayer?.remaining_minutes || 0,
        },
        currentTime: new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        location: locationName,
        hijriDate,
        allPrayerTimes: prayerTimes?.times || {},
      };

      // Save to SharedPreferences for Android widget
      if (Platform.OS === 'android' && WidgetModule) {
        await WidgetModule.updateWidgetData(JSON.stringify(widgetData));
      }

      // Save coordinates for location-based updates
      await this.saveWidgetLocation(location);
      
    } catch (error) {
      console.error('Error updating widget data:', error);
    }
  }

  /**
   * Save location for widget updates
   */
  private static async saveWidgetLocation(location: LocationInfo): Promise<void> {
    try {
      if (Platform.OS === 'android' && WidgetModule) {
        await WidgetModule.saveCoordinates(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('Error saving widget location:', error);
    }
  }

  /**
   * Set widget theme
   */
  static async setWidgetTheme(theme: WidgetTheme): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WIDGET_THEME_KEY, JSON.stringify(theme));
      
      if (Platform.OS === 'android' && WidgetModule) {
        await WidgetModule.updateTheme(JSON.stringify(theme));
      }
    } catch (error) {
      console.error('Error setting widget theme:', error);
    }
  }

  /**
   * Get available widget themes
   */
  static getAvailableThemes(): WidgetTheme[] {
    return [
      {
        background: '#ffffff',
        primaryColor: '#177267',
        textColor: '#1f2937',
        accentColor: '#ffc574',
      },
      {
        background: '#1f2937',
        primaryColor: '#10b981',
        textColor: '#ffffff',
        accentColor: '#f59e0b',
      },
      {
        background: '#f0fdf4',
        primaryColor: '#059669',
        textColor: '#064e3b',
        accentColor: '#d97706',
      },
      {
        background: '#fef3c7',
        primaryColor: '#92400e',
        textColor: '#451a03',
        accentColor: '#059669',
      },
    ];
  }

  /**
   * Force widget refresh
   */
  static async refreshWidget(): Promise<void> {
    try {
      if (Platform.OS === 'android' && WidgetModule) {
        await WidgetModule.forceRefresh();
      }
    } catch (error) {
      console.error('Error refreshing widget:', error);
    }
  }

  /**
   * Check if widget is added to home screen
   */
  static async isWidgetAddedToHomeScreen(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && WidgetModule) {
        return await WidgetModule.isWidgetActive();
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Show widget management screen
   */
  static async showWidgetManagement(): Promise<void> {
    const isEnabled = await this.isWidgetEnabled();
    const isAdded = await this.isWidgetAddedToHomeScreen();

    if (!isEnabled) {
      await this.showWidgetInstallationPrompt();
      return;
    }

    if (!isAdded) {
      Alert.alert(
        'Widget Henüz Eklenmemiş',
        'Ana ekranınıza widget eklemek ister misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Widget Ekle', 
            onPress: () => this.openWidgetSettings() 
          },
        ]
      );
      return;
    }

    // Show widget management options
    Alert.alert(
      'Widget Yönetimi',
      'Widget ayarlarını yönetmek için seçenekleri kullanın.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: '🔄 Yenile', 
          onPress: () => this.refreshWidget() 
        },
        { 
          text: '🎨 Tema Değiştir', 
          onPress: () => {
            // This would open theme selection screen
            console.log('Open theme selection');
          }
        },
      ]
    );
  }

  /**
   * Check if this is the first app launch
   */
  static async checkFirstLaunch(): Promise<boolean> {
    try {
      const hasShownPrompt = await AsyncStorage.getItem('widget_first_launch_completed');
      return hasShownPrompt === 'true';
    } catch (error) {
      console.error('Error checking first launch:', error);
      return false;
    }
  }

  /**
   * Mark first launch as completed
   */
  static async markFirstLaunchComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem('widget_first_launch_completed', 'true');
      console.log('✅ İlk açılış tamamlandı olarak işaretlendi');
    } catch (error) {
      console.error('Error marking first launch complete:', error);
    }
  }
}
