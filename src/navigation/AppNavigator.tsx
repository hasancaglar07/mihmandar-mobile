import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { TabParamList, RootStackParamList } from '../types';
import { Colors } from '../constants/colors';

// Screens
import WebContentScreen from '../screens/WebContentScreen';
import PrayerTimesScreen from '../screens/PrayerTimesScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Anasayfa':
              iconName = 'home';
              break;
            case 'Ses':
              iconName = 'volume-up';
              break;
            case 'Kitaplar':
              iconName = 'book';
              break;
            case 'Youtube':
              iconName = 'play-circle-outline';
              break;
            case 'Namaz':
              iconName = 'access-time';
              break;
            default:
              iconName = 'web';
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
        name="Anasayfa"
        component={WebContentScreen}
        initialParams={{ path: '/?native=true', title: 'Anasayfa' }}
        options={{
          title: 'Anasayfa',
          tabBarLabel: 'Anasayfa',
        }}
      />
      <Tab.Screen
        name="Ses"
        component={WebContentScreen}
        initialParams={{ path: '/ses-kayitlari?native=true', title: 'Ses Kayıtları' }}
        options={{
          title: 'Ses Kayıtları',
          tabBarLabel: 'Ses',
        }}
      />
      <Tab.Screen
        name="Kitaplar"
        component={WebContentScreen}
        initialParams={{ path: '/kitaplar?native=true', title: 'Kitaplar' }}
        options={{
          title: 'Kitaplar',
          tabBarLabel: 'Kitaplar',
        }}
      />
      <Tab.Screen
        name="Youtube"
        component={WebContentScreen}
        initialParams={{ path: '/video-analizi?native=true', title: 'Videolar' }}
        options={{
          title: 'Videolar',
          tabBarLabel: 'Youtube',
        }}
      />
      <Tab.Screen
        name="Namaz"
        component={PrayerTimesScreen}
        options={{
          title: 'Namaz Vakitleri',
          tabBarLabel: 'Namaz',
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