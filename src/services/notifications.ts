import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform } from 'react-native';
import { PrayerTimes, NotificationSettings } from '../types';

export class NotificationService {
  static initialize() {
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

    // Create notification channel for Android
    if (Platform.OS === 'android') {
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
        (created) => console.log(`Channel created: ${created}`)
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
