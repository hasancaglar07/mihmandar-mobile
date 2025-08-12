import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  Vibration,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CompassHeading from 'react-native-compass-heading';

import { useAppDispatch, useAppSelector } from '../store';
import { fetchUserLocation, getQiblaDirection } from '../store/slices/locationSlice';
import { Colors } from '../constants/colors';
import QiblaCompass from '../components/QiblaCompass';
import CalibrationModal from '../components/CalibrationModal';

const { width, height } = Dimensions.get('window');
const compassSize = Math.min(width, height) * 0.7;

interface CompassData {
  heading: number;
  accuracy: number;
}

const QiblaFinderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const { currentLocation, qiblaDirection, loading, error } = useAppSelector(state => state.location);
  
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [compassAccuracy, setCompassAccuracy] = useState<number>(0);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(true);
  const [showCalibration, setShowCalibration] = useState<boolean>(false);
  const [isAligned, setIsAligned] = useState<boolean>(false);
  
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lastVibrationRef = useRef<number>(0);

  // Initialize compass and location
  useEffect(() => {
    // Start compass
    const degree_update_rate = 3; // Update every 3 degrees
    
    CompassHeading.start(degree_update_rate, (data: CompassData) => {
      setCompassHeading(data.heading);
      setCompassAccuracy(data.accuracy);
      
      // Check if compass needs calibration
      if (data.accuracy < 0 || data.accuracy > 50) {
        setIsCalibrated(false);
      } else {
        setIsCalibrated(true);
      }
    });

    // Get user location and qibla direction
    if (!currentLocation) {
      dispatch(fetchUserLocation())
        .unwrap()
        .then((location) => {
          dispatch(getQiblaDirection({
            latitude: location.latitude,
            longitude: location.longitude,
          }));
        })
        .catch((error) => {
          Alert.alert(
            'Konum Hatası',
            'Kıble yönünü hesaplayabilmek için konumunuza erişmemiz gerekiyor.',
            [
              { text: 'Tekrar Dene', onPress: () => dispatch(fetchUserLocation()) },
              { text: 'İptal', style: 'cancel' },
            ]
          );
        });
    } else {
      dispatch(getQiblaDirection({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }));
    }

    return () => {
      CompassHeading.stop();
    };
  }, [dispatch, currentLocation]);

  // Check alignment and provide feedback
  useEffect(() => {
    if (qiblaDirection) {
      const qiblaAngle = qiblaDirection.qibla_direction;
      const difference = Math.abs(compassHeading - qiblaAngle);
      const minDifference = Math.min(difference, 360 - difference);
      
      const tolerance = 2; // ±2 degrees tolerance
      const newIsAligned = minDifference <= tolerance;
      
      if (newIsAligned && !isAligned) {
        // Just aligned - vibrate and pulse
        const now = Date.now();
        if (now - lastVibrationRef.current > 1000) { // Prevent multiple vibrations
          Vibration.vibrate(200);
          lastVibrationRef.current = now;
          
          // Pulse animation
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
      
      setIsAligned(newIsAligned);
    }
  }, [compassHeading, qiblaDirection, isAligned, pulseAnim]);

  // Rotate compass needle
  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: -compassHeading,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [compassHeading, rotationAnim]);

  const handleCalibrationPress = () => {
    setShowCalibration(true);
  };

  const handleRefresh = () => {
    if (currentLocation) {
      dispatch(getQiblaDirection({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }));
    } else {
      dispatch(fetchUserLocation())
        .unwrap()
        .then((location) => {
          dispatch(getQiblaDirection({
            latitude: location.latitude,
            longitude: location.longitude,
          }));
        });
    }
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="error-outline" size={64} color={Colors.error} />
        <Text style={styles.errorTitle}>Kıble Yönü Hesaplanamadı</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!qiblaDirection || loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="navigation" size={64} color={Colors.primary} />
        <Text style={styles.loadingText}>Kıble yönü hesaplanıyor...</Text>
        <Text style={styles.loadingSubtext}>Konumunuz alınıyor</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={[styles.statusBar, { paddingTop: insets.top }]}>
        <View style={styles.statusItem}>
          <Icon 
            name={isCalibrated ? 'gps-fixed' : 'gps-not-fixed'} 
            size={16} 
            color={isCalibrated ? Colors.success : Colors.warning} 
          />
          <Text style={[styles.statusText, { color: isCalibrated ? Colors.success : Colors.warning }]}>
            {isCalibrated ? 'Kalibre' : 'Kalibrasyon Gerekli'}
          </Text>
        </View>
        
        <TouchableOpacity onPress={handleCalibrationPress}>
          <Icon name="tune" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionTitle}>Telefonu Yatay Tutun</Text>
          <Text style={styles.instructionText}>
            Kıble yönünü bulmak için telefonunuzu düz bir şekilde tutun
          </Text>
        </View>

        {/* Compass */}
        <View style={styles.compassContainer}>
          <Animated.View
            style={[
              styles.compassWrapper,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <QiblaCompass
              size={compassSize}
              compassHeading={compassHeading}
              qiblaDirection={qiblaDirection.qibla_direction}
              isAligned={isAligned}
              isCalibrated={isCalibrated}
            />
          </Animated.View>
        </View>

        {/* Alignment Status */}
        <View style={[styles.alignmentStatus, isAligned && styles.alignmentStatusAligned]}>
          <Icon 
            name={isAligned ? 'check-circle' : 'radio-button-unchecked'} 
            size={24} 
            color={isAligned ? Colors.success : Colors.darkGray} 
          />
          <Text style={[styles.alignmentText, isAligned && styles.alignmentTextAligned]}>
            {isAligned ? 'Kıble Yönüne Hizalandı' : 'Yeşil Oku Takip Edin'}
          </Text>
        </View>

        {/* Distance Information */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Kâbe'ye Uzaklık</Text>
            <Text style={styles.infoValue}>
              {formatDistance(qiblaDirection.distance_to_kaaba_km)}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Kıble Açısı</Text>
            <Text style={styles.infoValue}>
              {qiblaDirection.qibla_direction.toFixed(1)}°
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Pusula Açısı</Text>
            <Text style={styles.infoValue}>
              {compassHeading.toFixed(1)}°
            </Text>
          </View>
        </View>
      </View>

      {/* Calibration Modal */}
      <CalibrationModal
        visible={showCalibration}
        onClose={() => setShowCalibration(false)}
        compassAccuracy={compassAccuracy}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusBar: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 22,
  },
  compassContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alignmentStatusAligned: {
    backgroundColor: Colors.success,
  },
  alignmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  alignmentTextAligned: {
    color: Colors.white,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default QiblaFinderScreen;
