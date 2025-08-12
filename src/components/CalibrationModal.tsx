import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';


import { Colors } from '../constants/colors';

interface CalibrationModalProps {
  visible: boolean;
  onClose: () => void;
  compassAccuracy: number;
}

const { width } = Dimensions.get('window');

const CalibrationModal: React.FC<CalibrationModalProps> = ({
  visible,
  onClose,
  compassAccuracy,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  const getAccuracyStatus = () => {
    if (compassAccuracy < 0) {
      return {
        status: 'unreliable',
        color: Colors.error,
        text: 'Güvenilmez',
        icon: 'error',
      };
    } else if (compassAccuracy > 50) {
      return {
        status: 'poor',
        color: Colors.warning,
        text: 'Zayıf',
        icon: 'warning',
      };
    } else if (compassAccuracy > 20) {
      return {
        status: 'fair',
        color: Colors.secondary,
        text: 'Orta',
        icon: 'info',
      };
    } else {
      return {
        status: 'good',
        color: Colors.success,
        text: 'İyi',
        icon: 'check-circle',
      };
    }
  };

  const accuracyStatus = getAccuracyStatus();

  const calibrationSteps = [
    {
      icon: 'phone-android',
      title: 'Telefonu Düz Tutun',
      description: 'Telefonunuzu düz bir yüzey üzerinde tutun',
    },
    {
      icon: 'all-inclusive',
      title: 'Sekiz Hareketi',
      description: 'Telefonunuzu havada "8" şeklinde hareket ettirin',
    },
    {
      icon: 'rotate-right',
      title: 'Döndürün',
      description: 'Telefonunuzu yavaşça 360° döndürün',
    },
    {
      icon: 'check',
      title: 'Tamamlandı',
      description: 'Kalibrasyon tamamlandı, normal şekilde kullanabilirsiniz',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Icon name="tune" size={24} color={Colors.primary} />
              <Text style={styles.headerTitle}>Pusula Kalibrasyonu</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={Colors.darkGray} />
            </TouchableOpacity>
          </View>

          {/* Accuracy Status */}
          <View style={[styles.accuracyStatus, { backgroundColor: accuracyStatus.color + '20' }]}>
            <Icon name={accuracyStatus.icon} size={20} color={accuracyStatus.color} />
            <Text style={styles.accuracyLabel}>Mevcut Doğruluk: </Text>
            <Text style={[styles.accuracyValue, { color: accuracyStatus.color }]}>
              {accuracyStatus.text}
            </Text>
            <Text style={styles.accuracyDegree}>
              ({compassAccuracy.toFixed(1)}°)
            </Text>
          </View>

          {/* Animation */}
          <View style={styles.animationContainer}>
            {/* Here you would typically add a Lottie animation showing phone calibration */}
            <View style={styles.phoneAnimation}>
              <Icon name="phone-android" size={64} color={Colors.primary} />
              <Text style={styles.animationText}>Telefonu "8" şeklinde hareket ettirin</Text>
            </View>
          </View>

          {/* Calibration Steps */}
          <View style={styles.stepsContainer}>
            <Text style={styles.stepsTitle}>Kalibrasyon Adımları:</Text>
            {calibrationSteps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepIcon}>
                  <Icon name={step.icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Icon name="info" size={16} color={Colors.info} />
            <Text style={styles.infoText}>
              Pusula doğruluğu metal nesneler, manyetik alanlar ve elektronik cihazlardan etkilenebilir.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
              <Text style={styles.primaryButtonText}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: width - 40,
    maxHeight: '80%',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  accuracyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  accuracyLabel: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  accuracyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  accuracyDegree: {
    fontSize: 12,
    color: Colors.darkGray,
    marginLeft: 4,
  },
  animationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  phoneAnimation: {
    alignItems: 'center',
    padding: 20,
  },
  animationText: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 12,
    textAlign: 'center',
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12,
    color: Colors.darkGray,
    lineHeight: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.info + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: Colors.darkGray,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default CalibrationModal;
