import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform, Alert } from 'react-native';
import Sound from 'react-native-sound';
import { PrayerTimes, NotificationSettings } from '../types';

interface EzanSettings {
  enabled: boolean;
  volume: number;
  ezanType: 'builtin' | 'traditional' | 'modern';
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
      },
      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
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

      // Ezan channel
      PushNotification.createChannel(
        {
          channelId: 'ezan-call',
          channelName: 'Ezan',
          channelDescription: 'Ezan sesi ile namaz vakti bildirimleri',
          playSound: true,
          soundName: 'ezan_traditional.mp3',
          importance: Importance.MAX,
          vibrate: true,
        },
        (created) => console.log(`Ezan channel created: ${created}`)
      );
    }
  }

  static requestPermissions(): Promise<boolean> {
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
            this.ezanSound.setVolume(this.ezanSettings.volume);
            this.ezanSound.play((success) => {
              if (success) {
                console.log('Ezan played successfully');
              } else {
                console.error('Ezan playback failed');
              }
              resolve();
            });
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
      default:
        return 'ezan_builtin.mp3';
    }
  }

  private static showEzanNotification(prayerName: string) {
    const displayName = this.getPrayerDisplayName(prayerName);
    
    PushNotification.localNotification({
      title: '🕌 Ezan',
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

    // Cancel existing notifications
    this.cancelAllNotifications();

    const prayers = Object.entries(prayerTimes.times);
    const today = new Date();

    prayers.forEach(([prayerName, time]) => {
      const prayerKey = prayerName as keyof NotificationSettings['prayers'];
      
      if (!settings.prayers[prayerKey]) {
        return; // Skip if notifications disabled for this prayer
      }

      const [hours, minutes] = time.split(':').map(Number);
      const prayerDate = new Date(today);
      prayerDate.setHours(hours, minutes, 0, 0);

      // If the prayer time has passed today, schedule for tomorrow
      if (prayerDate <= today) {
        prayerDate.setDate(prayerDate.getDate() + 1);
      }

      // Schedule notification at prayer time
      this.scheduleNotification({
        id: `prayer-${prayerName}`,
        title: 'Namaz Vakti',
        message: `${this.getPrayerDisplayName(prayerName)} vakti girdi`,
        date: prayerDate,
      });

      // Schedule notification before prayer time (if enabled)
      if (settings.before_minutes > 0) {
        const beforeDate = new Date(prayerDate.getTime() - settings.before_minutes * 60 * 1000);
        
        if (beforeDate > today) {
          this.scheduleNotification({
            id: `prayer-${prayerName}-before`,
            title: 'Namaz Vakti Yaklaşıyor',
            message: `${this.getPrayerDisplayName(prayerName)} vaktine ${settings.before_minutes} dakika kaldı`,
            date: beforeDate,
          });
        }
      }
    });
  }

  private static scheduleNotification({
    id,
    title,
    message,
    date,
  }: {
    id: string;
    title: string;
    message: string;
    date: Date;
  }) {
    PushNotification.localNotificationSchedule({
      id: id,
      title: title,
      message: message,
      date: date,
      channelId: 'prayer-times',
      soundName: 'default',
      playSound: true,
      vibrate: true,
      vibration: 300,
      priority: 'high',
      importance: 'high',
    });
  }

  static cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  static cancelNotification(id: string) {
    PushNotification.cancelLocalNotification(id);
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
  } | null {
    const now = new Date();
    const today = now.toDateString();
    const prayers = Object.entries(prayerTimes.times);

    for (const [prayerName, time] of prayers) {
      const [hours, minutes] = time.split(':').map(Number);
      const prayerDate = new Date(`${today} ${time}:00`);

      if (prayerDate > now) {
        const diff = prayerDate.getTime() - now.getTime();
        const remainingHours = Math.floor(diff / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const remainingSeconds = Math.floor((diff % (1000 * 60)) / 1000);

        return {
          name: this.getPrayerDisplayName(prayerName),
          time: time,
          remaining: {
            hours: remainingHours,
            minutes: remainingMinutes,
            seconds: remainingSeconds,
          },
        };
      }
    }

    // If no prayer left today, return first prayer of tomorrow
    const firstPrayer = prayers[0];
    return {
      name: this.getPrayerDisplayName(firstPrayer[0]),
      time: firstPrayer[1],
      remaining: { hours: 0, minutes: 0, seconds: 0 },
    };
  }
}
