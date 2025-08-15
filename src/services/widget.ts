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
    nextPrayer?: any,
    locationName?: string
  ): Promise<void> {
    try {
      console.log('🔄 WIDGET UPDATE: Starting widget data update', {
        location,
        prayerTimes: prayerTimes?.times,
        nextPrayer,
        locationName
      });

      const hijriDate = new Intl.DateTimeFormat('tr-TR-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());

      // Calculate next prayer if not provided
      let calculatedNextPrayer = nextPrayer;
      if (!calculatedNextPrayer && prayerTimes?.times) {
        calculatedNextPrayer = this.calculateNextPrayer(prayerTimes.times);
      }

      // Normalize remainingMinutes field from various shapes
      const remainingMinutes: number = this.calculateRemainingMinutes(calculatedNextPrayer);

      // Normalize allPrayerTimes to expected keys
      const timesSrc: any = prayerTimes?.times || prayerTimes || {};
      const allPrayerTimes: WidgetData['allPrayerTimes'] = {
        imsak: timesSrc.imsak || timesSrc.fajr || timesSrc.Imsak || '',
        gunes: timesSrc.gunes || timesSrc.sunrise || timesSrc.Gunes || '',
        ogle: timesSrc.ogle || timesSrc.dhuhr || timesSrc.Ogle || '',
        ikindi: timesSrc.ikindi || timesSrc.asr || timesSrc.Ikindi || '',
        aksam: timesSrc.aksam || timesSrc.maghrib || timesSrc.Aksam || '',
        yatsi: timesSrc.yatsi || timesSrc.isha || timesSrc.Yatsi || '',
      };

      const widgetData: WidgetData = {
        nextPrayer: {
          name: calculatedNextPrayer?.name || 'İmsak',
          time: calculatedNextPrayer?.time || '--:--',
          remainingMinutes,
        },
        currentTime: new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        location: locationName || location.city || 'Konum',
        hijriDate,
        allPrayerTimes,
      };

      console.log('📱 WIDGET DATA: Prepared widget data', widgetData);

      // Save to SharedPreferences for Android widget (snapshot-first)
      if (Platform.OS === 'android' && WidgetModule) {
        await WidgetModule.updateWidgetData(JSON.stringify(widgetData));
        console.log('✅ WIDGET: Data saved to SharedPreferences');
        
        // Force a broadcast refresh for all providers
        if (WidgetModule.forceRefreshAll) {
          await WidgetModule.forceRefreshAll();
          console.log('🔄 WIDGET: All providers refreshed');
        } else {
          await WidgetModule.forceRefresh();
          console.log('🔄 WIDGET: Standard provider refreshed');
        }
      }

      // Save coordinates for location-based updates
      await this.saveWidgetLocation(location);
      console.log('📍 WIDGET: Location saved for widget updates');
      
    } catch (error) {
      console.error('❌ WIDGET ERROR: Error updating widget data:', error);
    }
  }

  /** Trigger widget refresh hooks for lifecycle events */
  static async triggerSoftRefresh(): Promise<void> {
    try {
      if (Platform.OS === 'android' && WidgetModule) {
        if (WidgetModule.forceRefreshAll) await WidgetModule.forceRefreshAll(); else await WidgetModule.forceRefresh();
      }
    } catch (e) { console.warn('Soft refresh failed', e); }
  }

  /**
   * Save location for widget updates
   */
  private static async saveWidgetLocation(location: LocationInfo): Promise<void> {
    try {
      if (!location || typeof location.latitude === 'undefined' || typeof location.longitude === 'undefined') {
        console.warn('Invalid location data for widget:', location);
        return;
      }
      
      if (Platform.OS === 'android' && WidgetModule) {
        await WidgetModule.saveCoordinates(location.latitude, location.longitude);
        console.log('📍 WIDGET: Location saved successfully:', location.latitude, location.longitude);
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
      
      // Widget'ı force refresh et
      await this.refreshWidget();
      
      // Native SharedPreferences'a da kaydet
      if (Platform.OS === 'android') {
        try {
          const prefs = await import('@react-native-async-storage/async-storage');
          await prefs.default.setItem('widget_theme', JSON.stringify(theme));
        } catch (e) {
          console.warn('Could not save theme to native storage:', e);
        }
      }
      
      console.log('✅ Widget teması güncellendi:', theme);
    } catch (error) {
      console.error('❌ Widget tema güncelleme hatası:', error);
    }
  }

  /**
   * Get available widget themes
   */
  static getAvailableThemes(): WidgetTheme[] {
    return [
      // Açık Tema - Klasik Beyaz
      {
        background: '#ffffff',
        primaryColor: '#177267',
        textColor: '#1f2937',
        accentColor: '#ffc574',
      },
      // Koyu Tema - Gece Modu
      {
        background: '#1f2937',
        primaryColor: '#10b981',
        textColor: '#ffffff',
        accentColor: '#f59e0b',
      },
      // Yeşil Tema - Doğa
      {
        background: '#f0fdf4',
        primaryColor: '#059669',
        textColor: '#064e3b',
        accentColor: '#d97706',
      },
      // Altın Tema - Lüks
      {
        background: '#fef3c7',
        primaryColor: '#92400e',
        textColor: '#451a03',
        accentColor: '#059669',
      },
      // Mavi Tema - Gökyüzü
      {
        background: '#eff6ff',
        primaryColor: '#1d4ed8',
        textColor: '#1e3a8a',
        accentColor: '#f59e0b',
      },
      // Mor Tema - Gece Gökyüzü
      {
        background: '#faf5ff',
        primaryColor: '#7c3aed',
        textColor: '#581c87',
        accentColor: '#10b981',
      },
      // Gradient Tema - Gün Batımı
      {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        primaryColor: '#ffffff',
        textColor: '#ffffff',
        accentColor: '#fbbf24',
      },
      // Minimal Tema - Sade
      {
        background: '#f8fafc',
        primaryColor: '#374151',
        textColor: '#111827',
        accentColor: '#059669',
      },
      // Kırmızı Tema - Güçlü
      {
        background: '#fef2f2',
        primaryColor: '#dc2626',
        textColor: '#7f1d1d',
        accentColor: '#059669',
      },
      // Turuncu Tema - Enerji
      {
        background: '#fff7ed',
        primaryColor: '#ea580c',
        textColor: '#9a3412',
        accentColor: '#1d4ed8',
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

  /**
   * Calculate next prayer from prayer times
   */
  private static calculateNextPrayer(prayerTimes: any): any {
    const now = new Date();
    const prayers = [
      { key: 'imsak', name: 'İmsak', time: prayerTimes.imsak },
      { key: 'gunes', name: 'Güneş', time: prayerTimes.gunes },
      { key: 'ogle', name: 'Öğle', time: prayerTimes.ogle },
      { key: 'ikindi', name: 'İkindi', time: prayerTimes.ikindi },
      { key: 'aksam', name: 'Akşam', time: prayerTimes.aksam },
      { key: 'yatsi', name: 'Yatsı', time: prayerTimes.yatsi },
    ];

    for (const prayer of prayers) {
      if (!prayer.time || prayer.time === '' || prayer.time === 'undefined') continue;
      
      const timeParts = prayer.time.split(':');
      if (timeParts.length !== 2) continue;
      
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) continue;
      
      const prayerDate = new Date();
      prayerDate.setHours(hours, minutes, 0, 0);

      if (prayerDate > now) {
        return {
          name: prayer.name,
          time: prayer.time,
          remaining_minutes: Math.floor((prayerDate.getTime() - now.getTime()) / 60000),
        };
      }
    }

    // If no prayer left today, return tomorrow's first prayer
    const firstValidPrayer = prayers.find(p => p.time && p.time !== '' && p.time !== 'undefined');
    if (firstValidPrayer) {
      const timeParts = firstValidPrayer.time.split(':');
      if (timeParts.length === 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (!isNaN(hours) && !isNaN(minutes)) {
          const tomorrowPrayer = new Date();
          tomorrowPrayer.setDate(tomorrowPrayer.getDate() + 1);
          tomorrowPrayer.setHours(hours, minutes, 0, 0);
          
          return {
            name: firstValidPrayer.name,
            time: firstValidPrayer.time,
            remaining_minutes: Math.floor((tomorrowPrayer.getTime() - now.getTime()) / 60000),
          };
        }
      }
    }
    
    // Fallback
    return {
      name: 'Öğle',
      time: '13:00',
      remaining_minutes: 0,
    };
  }

  /**
   * Calculate remaining minutes from next prayer data
   */
  private static calculateRemainingMinutes(nextPrayer: any): number {
    if (!nextPrayer) return 0;

    // If we have remaining_minutes, use it
    if (typeof nextPrayer.remaining_minutes === 'number') {
      return nextPrayer.remaining_minutes;
    }

    // If we have remainingMinutes, use it
    if (typeof nextPrayer.remainingMinutes === 'number') {
      return nextPrayer.remainingMinutes;
    }

    // If we have time, calculate it
    if (nextPrayer.time) {
      try {
        const [hours, minutes] = nextPrayer.time.split(':').map(Number);
        const prayerDate = new Date();
        prayerDate.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        if (prayerDate > now) {
          return Math.floor((prayerDate.getTime() - now.getTime()) / 60000);
        }
      } catch (error) {
        console.error('Error calculating remaining minutes:', error);
      }
    }

    return 0;
  }

  /**
   * Sync theme settings with widget
   */
  static async syncThemeWithSettings(settingsTheme: string): Promise<void> {
    try {
      const themes = this.getAvailableThemes();
      let selectedTheme = themes[0]; // Default theme

      // Map settings theme to widget theme
      switch (settingsTheme) {
        case 'dark':
          selectedTheme = themes[1]; // Dark theme
          break;
        case 'green':
          selectedTheme = themes[2]; // Green theme
          break;
        case 'gold':
          selectedTheme = themes[3]; // Gold theme
          break;
        default:
          selectedTheme = themes[0]; // Light theme
      }

      await this.setWidgetTheme(selectedTheme);
      console.log('🎨 WIDGET THEME: Theme synced with settings', selectedTheme);
    } catch (error) {
      console.error('❌ WIDGET THEME ERROR: Failed to sync theme', error);
    }
  }

  /**
   * Update widget with current app state
   */
  static async updateFromAppState(
    location: LocationInfo,
    prayerTimes: any,
    settings: any,
    locationName?: string
  ): Promise<void> {
    try {
      // Sync theme first
      if (settings?.theme) {
        await this.syncThemeWithSettings(settings.theme);
      }

      // Persist basic settings for native receivers (pre-alarm, ezan enable)
      try {
        if ((global as any).NativeModules?.WidgetModule?.updateWidgetData) {
          // store settings snapshot to SharedPreferences via updateWidgetData side channel
          const prefsSnapshot = {
            settings: {
              preMinutes: typeof settings?.before_minutes === 'number' ? settings.before_minutes : 10,
              enableEzan: settings?.ezanEnabled ?? true,
              prayers: settings?.prayers || undefined,
            },
          } as any;
          // call updateTheme to force providers refresh quickly after settings change
          if ((global as any).NativeModules?.WidgetModule?.updateTheme) {
            await (global as any).NativeModules.WidgetModule.updateTheme(
              JSON.stringify(await (async () => {
                const themes = this.getAvailableThemes();
                switch (settings?.theme) {
                  case 'dark': return themes[1];
                  case 'green': return themes[2];
                  case 'gold': return themes[3];
                  default: return themes[0];
                }
              })())
            );
          }
          // piggy-back settings into widget_data; native provider reads prefs.settings
          const existing = {
            nextPrayer: undefined,
            currentTime: '',
            location: locationName || '',
            hijriDate: '',
            allPrayerTimes: prayerTimes?.times || {},
            ...prefsSnapshot,
          } as any;
          await (global as any).NativeModules.WidgetModule.updateWidgetData(JSON.stringify(existing));
        }
      } catch {}

      // Update widget data
      await this.updateWidgetData(location, prayerTimes, undefined, locationName);
      
      console.log('🔄 WIDGET SYNC: Widget updated from app state');
    } catch (error) {
      console.error('❌ WIDGET SYNC ERROR: Failed to update from app state', error);
    }
  }

  /**
   * Persist settings coming from web/PWA to native prefs and refresh widgets
   */
  static async persistSettingsToNative(settings: { preMinutes?: number; enableEzan?: boolean; theme?: string; [key: string]: any }): Promise<void> {
    try {
      // Theme map if provided
      if (settings?.theme) {
        await this.syncThemeWithSettings(settings.theme as string);
      }
      if (Platform.OS === 'android' && WidgetModule) {
        const snapshot = { settings } as any;
        await WidgetModule.updateWidgetData(JSON.stringify(snapshot));
        if (WidgetModule.forceRefreshAll) {
          await WidgetModule.forceRefreshAll();
        } else {
          await WidgetModule.forceRefresh();
        }
      }
    } catch (error) {
      console.error('Error persisting settings to native:', error);
    }
  }
}
