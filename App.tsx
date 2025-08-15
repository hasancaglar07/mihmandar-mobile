import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import MinimalPrayerScreen from './src/screens/MinimalPrayerScreen';
import PrayerTimesScreen from './src/screens/PrayerTimesScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { NotificationService } from './src/services/notifications';

function App(): React.JSX.Element {
  // Uygulama başlangıcında bildirim altyapısını kur
  useEffect(() => {
    try { NotificationService.initialize(); } catch {}
    // Android: permission prompt'larını Firebase init gerektirmeden atla
    if (Platform.OS === 'ios') {
      try { NotificationService.requestPermissions(); } catch {}
    }
  }, []);

  // Uygulama açılışında doğrudan native Namaz ekranını göster
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
