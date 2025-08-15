import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform, Alert } from 'react-native';
import Sound from 'react-native-sound';
import { PrayerTimes, NotificationSettings } from '../types';

interface EzanSettings {
  enabled: boolean;
  volume: number;
  ezanType: 'builtin' | 'traditional' | 'modern' | 'chime';
  vibration: boolean;
}

export class NotificationService {
  private static ezanSound: Sound | null = null;
  private static ezanSettings: EzanSettings = {
    enabled: false,
    volume: 0.8,
    ezanType: 'traditional',
    vibration: true,
  };

  static initialize() {
    // Initialize sound system
    Sound.setCategory('Playback');
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
        
        // Ezan çalma kontrolü
        if (notification.userInfo && notification.userInfo.playEzan && notification.userInfo.prayerName) {
          console.log('🕌 Ezan çalınacak:', notification.userInfo.prayerName);
          
          // Ezan ayarlarını güncelle
          if (notification.userInfo.ezanType) {
            NotificationService.setEzanSettings({
              ...NotificationService.getEzanSettings(),
              ezanType: notification.userInfo.ezanType,
              enabled: true,
            });
          }
          
          // Ezan çal
          NotificationService.playEzan(notification.userInfo.prayerName)
            .then(() => {
              console.log('✅ Ezan başarıyla çalındı');
            })
            .catch((error) => {
              console.error('❌ Ezan çalma hatası:', error);
            });
        }
      },
      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
        
        // Ezan durdur/ertele aksiyonları
        if (notification.action === 'Durdur') {
          NotificationService.stopEzan();
          console.log('🔇 Ezan durduruldu');
        } else if (notification.action === 'Ertele') {
          NotificationService.stopEzan();
          // 5 dakika sonra tekrar çal
          setTimeout(() => {
            if (notification.userInfo && notification.userInfo.prayerName) {
              NotificationService.playEzan(notification.userInfo.prayerName);
            }
          }, 5 * 60 * 1000); // 5 dakika
          console.log('⏰ Ezan 5 dakika ertelendi');
        }
      },
      onRegistrationError: function(err) {
        console.error(err.message, err);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      // Prayer notification channel
      PushNotification.createChannel(
        {
          channelId: 'prayer-times',
          channelName: 'Namaz Vakitleri',
          channelDescription: 'Namaz vakti bildirimlerini alın',
          playSound: true,
          soundName: 'default',
          importance: Importance.HIGH,
          vibrate: true,
        },
        (created) => console.log(`Prayer channel created: ${created}`)
      );

      // Ezan channel (we play sound via react-native-sound, so disable channel sound to avoid missing resource crashes)
      PushNotification.createChannel(
        {
          channelId: 'ezan-call',
          channelName: 'Ezan',
          channelDescription: 'Ezan bildirimi',
          playSound: false,
          importance: Importance.MAX,
          vibrate: true,
        },
        (created) => console.log(`Ezan channel created: ${created}`)
      );
    }
  }

  static requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Android'de runtime notification permission Android 13+ için sistem diyalogudur.
      // react-native-push-notification üzerinden çağırmak Firebase init gerektirebilir.
      // Bu nedenle burada true döneriz; izin prompt'u gerekirse Settings üzerinden açılır.
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      PushNotification.requestPermissions()
        .then((permissions) => {
          resolve(permissions.alert === 1);
        })
        .catch(() => {
          resolve(false);
        });
    });
  }

  static setEzanSettings(settings: EzanSettings) {
    this.ezanSettings = { ...settings };
  }

  static getEzanSettings(): EzanSettings {
    return { ...this.ezanSettings };
  }

  static playEzan(prayerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ezanSettings.enabled) {
        resolve();
        return;
      }

      try {
        // Stop any currently playing ezan
        this.stopEzan();

        const ezanFile = this.getEzanFile();
        this.ezanSound = new Sound(ezanFile, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.error('Failed to load ezan sound', error);
            reject(error);
            return;
          }

          if (this.ezanSound) {
            if (this.ezanSettings.enabled && this.ezanSound) {
              this.ezanSound.setVolume(this.ezanSettings.volume);
              this.ezanSound.play(() => {
                this.stopEzan();
              });
            }
          }
        });

        // Show ezan notification
        this.showEzanNotification(prayerName);

      } catch (error) {
        reject(error);
      }
    });
  }

  static stopEzan() {
    if (this.ezanSound) {
      this.ezanSound.stop();
      this.ezanSound.release();
      this.ezanSound = null;
    }
  }

  private static getEzanFile(): string {
    switch (this.ezanSettings.ezanType) {
      case 'traditional':
        return 'ezan_traditional.mp3';
      case 'modern':
        return 'ezan_modern.mp3';
      case 'chime':
        return 'azan_chime.mp3';
      default:
        return 'ezan_builtin.mp3';
    }
  }

  private static showEzanNotification(prayerName: string) {
    const displayName = this.getPrayerDisplayName(prayerName);
    
    PushNotification.localNotification({
      title: '�� Ezan',
      message: `${displayName} vakti girdi - Ezan okunuyor`,
      channelId: 'ezan-call',
      soundName: 'default',
      playSound: false, // We're playing our own sound
      vibrate: this.ezanSettings.vibration,
      priority: 'max',
      importance: 'max',
      ongoing: true,
      actions: ['Durdur'],
      invokeApp: true,
    });
  }

  static schedulePrayerNotifications(
    prayerTimes: PrayerTimes,
    settings: NotificationSettings
  ) {
    if (!settings.enabled) {
      return;
    }

    console.log('📅 Namaz vakti bildirimleri planlanıyor:', prayerTimes.city, prayerTimes.district);

    // Cancel existing notifications
    this.cancelAllNotifications();

    const prayers = Object.entries(prayerTimes.times);
    const today = new Date();
    
    // Türkiye saat dilimi için offset hesapla
    const turkeyOffset = 3 * 60; // UTC+3 dakika cinsinden
    const localOffset = today.getTimezoneOffset(); // Yerel saat dilimi offset'i (negatif)
    const timeDifference = turkeyOffset + localOffset; // Türkiye ile yerel saat arasındaki fark

    prayers.forEach(([prayerName, time]) => {
      const prayerKey = prayerName.toLowerCase() as keyof NotificationSettings['prayers'];
      
      if (!settings.prayers[prayerKey]) {
        return; // Skip if notifications disabled for this prayer
      }

      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn('⚠️ Geçersiz namaz vakti:', prayerName, time);
        return;
      }

      // Türkiye saatine göre namaz vaktini hesapla
      const prayerDate = new Date(today);
      prayerDate.setHours(hours, minutes, 0, 0);
      
      // Zaman dilimi farkını uygula
      prayerDate.setMinutes(prayerDate.getMinutes() - timeDifference);

      // If the prayer time has passed today, schedule for tomorrow
      if (prayerDate <= today) {
        prayerDate.setDate(prayerDate.getDate() + 1);
      }

      console.log(`🕌 ${prayerName} vakti planlandı:`, prayerDate.toLocaleString('tr-TR'));

      // Schedule notification at prayer time with ezan
      this.scheduleNotification({
        id: `prayer-${prayerName}`,
        title: '🕌 Namaz Vakti',
        message: `${this.getPrayerDisplayName(prayerName)} vakti girdi`,
        date: prayerDate,
        playEzan: true,
        prayerName: prayerName,
      });

      // Schedule notification before prayer time (if enabled)
      if (settings.beforeMinutes > 0) {
        const beforeDate = new Date(prayerDate.getTime() - settings.beforeMinutes * 60 * 1000);
        
        if (beforeDate > today) {
          this.scheduleNotification({
            id: `prayer-${prayerName}-before`,
            title: '⏰ Namaz Vakti Yaklaşıyor',
            message: `${this.getPrayerDisplayName(prayerName)} vaktine ${settings.beforeMinutes} dakika kaldı`,
            date: beforeDate,
            playEzan: false,
          });
        }
      }
    });

    // Re-schedule at midnight to refresh next day's prayers
    try {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 5, 0); // 5 sn tampon
      this.scheduleNotification({
        id: 'prayer-reschedule-midnight',
        title: '🔄 Namaz Vakitleri Güncelleme',
        message: 'Yeni gün için bildirimler yeniden planlanıyor',
        date: midnight,
        playEzan: false,
      });
    } catch (error) {
      console.error('Gece yarısı bildirim planlanamadı:', error);
    }
  }

  private static scheduleNotification({
    id,
    title,
    message,
    date,
    playEzan = false,
    prayerName,
  }: {
    id: string;
    title: string;
    message: string;
    date: Date;
    playEzan?: boolean;
    prayerName?: string;
  }) {
    PushNotification.localNotificationSchedule({
      id: id,
      title: title,
      message: message,
      date: date,
      channelId: playEzan ? 'ezan-call' : 'prayer-times',
      soundName: playEzan ? 'default' : 'default',
      playSound: !playEzan, // Ezan çalacaksa bildirim sesini kapat
      vibrate: true,
      vibration: 300,
      priority: 'high',
      importance: 'high',
      userInfo: {
        playEzan: playEzan,
        prayerName: prayerName || '',
        ezanType: this.ezanSettings.ezanType,
      },
      actions: playEzan ? ['Durdur', 'Erteле'] : undefined,
    });
    
    console.log(`📱 Bildirim planlandı: ${title} - ${date.toLocaleString('tr-TR')} ${playEzan ? '(Ezan ile)' : ''}`);
    
    // Ezan çalacaksa, bildirim zamanında ezan çalmak için callback ekle
    if (playEzan && prayerName) {
      // React Native'de bildirim callback'i için PushNotification.configure kullanılmalı
      // Bu kısım initialize() fonksiyonunda yapılacak
    }
  }

  static cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  static cancelNotification(id: string) {
    PushNotification.cancelLocalNotification(id);
  }

  /**
   * Re-schedule notifications now (e.g., after midnight, location change, or settings change)
   */
  static reschedule(prayerTimes: PrayerTimes, settings: NotificationSettings) {
    try {
      this.schedulePrayerNotifications(prayerTimes, settings);
    } catch (e) {
      console.warn('Reschedule failed', e);
    }
  }

  static showImmediateNotification(title: string, message: string) {
    PushNotification.localNotification({
      title: title,
      message: message,
      channelId: 'prayer-times',
      soundName: 'default',
      playSound: true,
      vibrate: true,
    });
  }

  private static getPrayerDisplayName(prayerName: string): string {
    const prayerNames: { [key: string]: string } = {
      imsak: 'İmsak',
      gunes: 'Güneş',
      ogle: 'Öğle',
      ikindi: 'İkindi',
      aksam: 'Akşam',
      yatsi: 'Yatsı',
    };
    return prayerNames[prayerName] || prayerName;
  }

  static getNextPrayerCountdown(prayerTimes: PrayerTimes): {
    name: string;
    time: string;
    remaining: {
      hours: number;
      minutes: number;
      seconds: number;
    };
    remaining_minutes: number;
  } | null {
    const now = new Date();
    const prayers = Object.entries(prayerTimes.times);

    // Prayer order for proper sequence
    const prayerOrder = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];
    
    // Sort prayers by their order
    const sortedPrayers = prayers.sort((a, b) => {
      const indexA = prayerOrder.indexOf(a[0]);
      const indexB = prayerOrder.indexOf(b[0]);
      return indexA - indexB;
    });

    for (const [prayerName, time] of sortedPrayers) {
      if (!time || time === '--:--') continue;
      
      try {
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) continue;
        
        const prayerDate = new Date();
        prayerDate.setHours(hours, minutes, 0, 0);

        if (prayerDate > now) {
          const diff = prayerDate.getTime() - now.getTime();
          const remainingHours = Math.floor(diff / (1000 * 60 * 60));
          const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const remainingSeconds = Math.floor((diff % (1000 * 60)) / 1000);
          const totalRemainingMinutes = Math.floor(diff / (1000 * 60));

          return {
            name: this.getPrayerDisplayName(prayerName),
            time: time,
            remaining: {
              hours: remainingHours,
              minutes: remainingMinutes,
              seconds: remainingSeconds,
            },
            remaining_minutes: totalRemainingMinutes,
          };
        }
      } catch (error) {
        console.error(`Error processing prayer time ${prayerName}: ${time}`, error);
        continue;
      }
    }

    // If no prayer left today, calculate tomorrow's first prayer (Imsak)
    const firstPrayer = sortedPrayers.find(([key]) => key === 'imsak') || sortedPrayers[0];
    if (firstPrayer) {
      try {
        const [hours, minutes] = firstPrayer[1].split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const tomorrowPrayer = new Date();
          tomorrowPrayer.setDate(tomorrowPrayer.getDate() + 1);
          tomorrowPrayer.setHours(hours, minutes, 0, 0);
          
          const diff = tomorrowPrayer.getTime() - now.getTime();
          const remainingHours = Math.floor(diff / (1000 * 60 * 60));
          const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const remainingSeconds = Math.floor((diff % (1000 * 60)) / 1000);
          const totalRemainingMinutes = Math.floor(diff / (1000 * 60));

          return {
            name: this.getPrayerDisplayName(firstPrayer[0]),
            time: firstPrayer[1],
            remaining: {
              hours: remainingHours,
              minutes: remainingMinutes,
              seconds: remainingSeconds,
            },
            remaining_minutes: totalRemainingMinutes,
          };
        }
      } catch (error) {
        console.error('Error calculating tomorrow\'s first prayer', error);
      }
    }

    // Fallback
    return {
      name: 'İmsak',
      time: '05:00',
      remaining: { hours: 0, minutes: 0, seconds: 0 },
      remaining_minutes: 0,
    };
  }

  /**
   * Get formatted remaining time string
   */
  static getFormattedRemainingTime(remaining: { hours: number; minutes: number; seconds: number }): string {
    const { hours, minutes, seconds } = remaining;
    
    if (hours > 0) {
      return `${hours}s ${minutes}dk ${seconds}sn`;
    } else if (minutes > 0) {
      return `${minutes}dk ${seconds}sn`;
    } else if (seconds > 0) {
      return `${seconds}sn`;
    } else {
      return 'Şimdi';
    }
  }

  /**
   * Get compact remaining time string for widgets
   */
  static getCompactRemainingTime(remaining: { hours: number; minutes: number; seconds: number }): string {
    const { hours, minutes } = remaining;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}dk`;
    } else {
      return 'Şimdi';
    }
  }
}