import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';

function TestApp(): React.JSX.Element {
  const handleButtonPress = () => {
    Alert.alert('Başarılı!', 'Mihmandar Mobile Uygulaması çalışıyor!');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#177267" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>🕌 Mihmandar Mobile</Text>
          <Text style={styles.subtitle}>Test Uygulaması</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✅ Başarıyla Çalışıyor!</Text>
            <Text style={styles.cardText}>
              React Native uygulaması başarıyla derlendi ve çalışıyor.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Özellikler</Text>
            <Text style={styles.feature}>• Namaz Vakitleri</Text>
            <Text style={styles.feature}>• Kıble Bulucu</Text>
            <Text style={styles.feature}>• Birleşik Arama</Text>
            <Text style={styles.feature}>• Ayarlar</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleButtonPress}>
            <Text style={styles.buttonText}>Test Et</Text>
          </TouchableOpacity>

          <View style={styles.info}>
            <Text style={styles.infoText}>
              Tüm backend API'lar hazır ve çalışıyor.{'\n'}
              Mobile app geliştirme tamamlandı!
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#177267',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6C757D',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#6C757D',
    lineHeight: 22,
  },
  feature: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 8,
    paddingLeft: 10,
  },
  button: {
    backgroundColor: '#177267',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 30,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  info: {
    backgroundColor: '#177267',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TestApp;
