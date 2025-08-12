import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { City } from '../types';
import { Colors } from '../constants/colors';

interface CitySelectorProps {
  visible: boolean;
  cities: City[];
  selectedCity: string | null;
  selectedDistrict: string | null;
  onSelect: (city: string, district?: string) => void;
  onClose: () => void;
}

const CitySelector: React.FC<CitySelectorProps> = ({
  visible,
  cities,
  selectedCity,
  selectedDistrict,
  onSelect,
  onClose,
}) => {
  const [searchText, setSearchText] = useState('');
  const [showDistricts, setShowDistricts] = useState(false);
  const [selectedCityData, setSelectedCityData] = useState<City | null>(null);
  const [filteredCities, setFilteredCities] = useState<City[]>(cities);
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredCities(cities);
    } else {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredCities(filtered);
    }
  }, [searchText, cities]);

  useEffect(() => {
    if (selectedCityData && searchText.trim() === '') {
      setFilteredDistricts(selectedCityData.districts);
    } else if (selectedCityData) {
      const filtered = selectedCityData.districts.filter(district =>
        district.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredDistricts(filtered);
    }
  }, [searchText, selectedCityData]);

  const handleCityPress = (city: City) => {
    setSelectedCityData(city);
    setShowDistricts(true);
    setSearchText('');
  };

  const handleDistrictPress = (district: string) => {
    onSelect(selectedCityData!.name, district);
    resetState();
  };

  const handleCityOnlySelect = () => {
    if (selectedCityData) {
      onSelect(selectedCityData.name);
      resetState();
    }
  };

  const handleBack = () => {
    if (showDistricts) {
      setShowDistricts(false);
      setSelectedCityData(null);
      setSearchText('');
    } else {
      onClose();
    }
  };

  const resetState = () => {
    setShowDistricts(false);
    setSelectedCityData(null);
    setSearchText('');
  };

  const renderCityItem = ({ item }: { item: City }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        selectedCity === item.name && styles.selectedItem,
      ]}
      onPress={() => handleCityPress(item)}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Text style={styles.itemSubtext}>{item.districts.length} ilçe</Text>
      </View>
      <Icon name="chevron-right" size={24} color={Colors.darkGray} />
    </TouchableOpacity>
  );

  const renderDistrictItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        selectedDistrict === item && styles.selectedItem,
      ]}
      onPress={() => handleDistrictPress(item)}
    >
      <Text style={styles.itemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showDistricts ? selectedCityData?.name : 'Şehir Seçimi'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={Colors.darkGray} />
          <TextInput
            style={styles.searchInput}
            placeholder={showDistricts ? 'İlçe ara...' : 'Şehir ara...'}
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={Colors.darkGray}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="clear" size={20} color={Colors.darkGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* City Only Option */}
        {showDistricts && (
          <TouchableOpacity
            style={styles.cityOnlyOption}
            onPress={handleCityOnlySelect}
          >
            <Icon name="location-city" size={20} color={Colors.primary} />
            <Text style={styles.cityOnlyText}>
              Sadece {selectedCityData?.name} (İlçe seçmeden)
            </Text>
          </TouchableOpacity>
        )}

        {/* List */}
        <FlatList
          style={styles.list}
          data={showDistricts ? filteredDistricts : filteredCities}
          keyExtractor={(item, index) => 
            showDistricts ? `district-${item}` : `city-${(item as City).id}`
          }
          renderItem={showDistricts ? renderDistrictItem : renderCityItem}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: Colors.text,
  },
  cityOnlyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cityOnlyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listItem: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.shadow.ios,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedItem: {
    backgroundColor: Colors.primary,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  itemSubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginVertical: 4,
  },
});

export default CitySelector;
