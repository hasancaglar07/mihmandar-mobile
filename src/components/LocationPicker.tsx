
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAppDispatch } from '../store';
import { updateLocationSettings } from '../store/slices/settingsSlice';
import { Colors } from '../constants/colors';
import apiService from '../services/api';

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onCitySelected?: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ visible, onClose, onCitySelected }) => {
  const dispatch = useAppDispatch();
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTurkishCities();
    }
  }, [visible]);

  const getTurkishCities = () => {
    return [
      { name: 'İstanbul', districts: ['Fatih', 'Beyoğlu', 'Kadıköy', 'Üsküdar', 'Beşiktaş'] },
      { name: 'Ankara', districts: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Sincan'] },
      { name: 'İzmir', districts: ['Konak', 'Bornova', 'Karşıyaka', 'Bayraklı', 'Çiğli'] },
      { name: 'Bursa', districts: ['Osmangazi', 'Nilüfer', 'Yıldırım', 'Mudanya', 'Gemlik'] },
      { name: 'Antalya', districts: ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Aksu', 'Döşemealtı'] },
      { name: 'Adana', districts: ['Seyhan', 'Yüreğir', 'Çukurova', 'Sarıçam', 'Karaisalı'] },
      { name: 'Konya', districts: ['Meram', 'Karatay', 'Selçuklu', 'Ereğli', 'Akşehir'] },
      { name: 'Gaziantep', districts: ['Şahinbey', 'Şehitkamil', 'Oğuzeli', 'Nizip', 'Nurdağı'] },
      { name: 'Kayseri', districts: ['Melikgazi', 'Kocasinan', 'Talas', 'Develi', 'Yahyalı'] },
      { name: 'Trabzon', districts: ['Ortahisar', 'Akçaabat', 'Yomra', 'Arsin', 'Vakfıkebir'] }
    ];
  };

  const fetchTurkishCities = async () => {
    try {
      const response = await apiService.fetchCities();
      setCities(response.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      // Fallback to hardcoded cities
      setCities(getTurkishCities());
    }
  };

  const handleSelectCity = (city) => {
    dispatch(updateLocationSettings({ 
      city: city.name, 
      district: city.districts?.[0] || '' 
    }));
    onCitySelected?.();
    onClose();
  };

  const filteredCities = cities.filter(city => 
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <View style={{ width: 50 }} />
        <Text style={styles.headerTitle}>Şehir Seç</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>Kapat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCityItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleSelectCity(item)}
    >
      <Text style={styles.itemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderList = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.itemText}>Şehirler yükleniyor...</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredCities}
        renderItem={renderCityItem}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        <TextInput
          style={styles.searchInput}
          placeholder="Şehir ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {renderList()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    color: Colors.primary,
    fontSize: 16,
  },
  searchInput: {
    padding: 12,
    margin: 16,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    fontSize: 16,
  },
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  itemText: {
    fontSize: 16,
    color: Colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});