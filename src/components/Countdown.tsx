
import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface CountdownProps {
  targetTime: string;
}

export const Countdown: React.FC<CountdownProps> = ({ targetTime }) => {
  const [remainingTime, setRemainingTime] = useState('');

  useEffect(() => {
    const calculateRemainingTime = () => {
      // Validate targetTime
      if (!targetTime || targetTime === '' || targetTime === 'undefined') {
        return '00:00:00';
      }
      
      const timeParts = targetTime.split(':');
      if (timeParts.length !== 2) {
        return '00:00:00';
      }
      
      const targetHours = parseInt(timeParts[0], 10);
      const targetMinutes = parseInt(timeParts[1], 10);
      
      if (isNaN(targetHours) || isNaN(targetMinutes)) {
        return '00:00:00';
      }
      
      const now = new Date();
      const target = new Date();
      target.setHours(targetHours, targetMinutes, 0, 0);

      if (target < now) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const timer = setInterval(() => {
      setRemainingTime(calculateRemainingTime());
    }, 1000);
    
    // Initial calculation
    setRemainingTime(calculateRemainingTime());

    return () => clearInterval(timer);
  }, [targetTime]);

  return <Text style={styles.countdownText}>{remainingTime}</Text>;
};

const styles = StyleSheet.create({
  countdownText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    fontFamily: 'monospace',
  },
});