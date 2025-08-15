
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/colors';

interface PrayerTimeCardProps {
  name: string;
  time: string;
  isCurrent: boolean;
}

const prayerIconMapping: { [key: string]: string } = {
  imsak: 'weather-night',
  gunes: 'weather-sunny',
  ogle: 'weather-partly-cloudy',
  ikindi: 'weather-cloudy',
  aksam: 'weather-sunset',
  yatsi: 'weather-night',
};

export const PrayerTimeCard: React.FC<PrayerTimeCardProps> = ({ name, time, isCurrent }) => {
  const iconName = prayerIconMapping[name.toLowerCase()] || 'clock-outline';

  return (
    <View style={[styles.card, isCurrent && styles.currentCard]}>
      <MaterialCommunityIcons name={iconName} size={28} color={isCurrent ? Colors.white : Colors.primary} />
      <Text style={[styles.name, isCurrent && styles.currentText]}>{name}</Text>
      <Text style={[styles.time, isCurrent && styles.currentText]}>{time}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentCard: {
    backgroundColor: Colors.primary,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginLeft: 16,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  currentText: {
    color: Colors.white,
  },
});