import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { TabParamList, RootStackParamList } from '../types';
import { Colors } from '../constants/colors';

// Screens
import PrayerTimesScreen from '../screens/PrayerTimesScreen';
import QiblaFinderScreen from '../screens/QiblaFinderScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WebContentScreen from '../screens/WebContentScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'PrayerTimes':
              iconName = 'access-time';
              break;
            case 'QiblaFinder':
              iconName = 'navigation';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.darkGray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.lightGray,
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen
        name="PrayerTimes"
        component={PrayerTimesScreen}
        options={{
          title: 'Namaz Vakitleri',
          tabBarLabel: 'Namaz',
        }}
      />
      <Tab.Screen
        name="QiblaFinder"
        component={QiblaFinderScreen}
        options={{
          title: 'Kıble Yönü',
          tabBarLabel: 'Kıble',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Arama',
          tabBarLabel: 'Arama',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Ayarlar',
          tabBarLabel: 'Ayarlar',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WebContent"
        component={WebContentScreen}
        options={({ route }) => ({
          title: route.params?.title || 'İçerik',
          headerBackTitleVisible: false,
        })}
      />
    </Stack.Navigator>
  );
}
