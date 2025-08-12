import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { fetchPrayerTimes, fetchCities } from '../services/prayer';

export default function MinimalPrayerScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('');
  const [cities, setCities] = useState<{ name: string; districts: string[] }[]>([]);
  const [selecting, setSelecting] = useState<'city'|'district'|null>(null);
  const [times, setTimes] = useState<any>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPrayerTimes(city, district);
      setTimes(res);
    } catch (e: any) {
      setError(e.message || 'Hata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchCities();
        setCities(res.cities.map(c => ({ name: c.name, districts: c.districts })));
      } catch {}
      load();
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Namaz Vakitleri (Basit)</Text>
      <Text style={styles.subtitle}>{city}{district ? ` / ${district}` : ''}</Text>
      {loading && <Text style={styles.info}>Yükleniyor...</Text>}
      {error && <Text style={[styles.info,{color:'#c1121f'}]}>Hata: {error}</Text>}
      {times && (
        <View style={styles.card}>
          {Object.entries(times.times).map(([k,v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.key}>{k.toUpperCase()}</Text>
              <Text style={styles.val}>{String(v)}</Text>
            </View>
          ))}
          <View style={[styles.row,{marginTop:8}]}> 
            <Text style={styles.key}>Sıradaki</Text>
            <Text style={styles.val}>{times.next_prayer?.name} - {times.next_prayer?.time}</Text>
          </View>
        </View>
      )}
      <View style={{ flexDirection:'row', gap:10, marginBottom:12 }}>
        <TouchableOpacity onPress={()=> setSelecting('city')} style={[styles.btn,{backgroundColor:'#0d6efd'}]}>
          <Text style={styles.btnText}>Şehir Seç</Text>
        </TouchableOpacity>
        {city ? (
          <TouchableOpacity onPress={()=> setSelecting('district')} style={[styles.btn,{backgroundColor:'#6f42c1'}]}>
            <Text style={styles.btnText}>İlçe Seç</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {selecting && (
        <View style={styles.selector}>
          <Text style={styles.selectorTitle}>{selecting === 'city' ? 'Şehir Seçin' : `${city} ilçeleri`}</Text>
          <FlatList
            data={selecting === 'city' ? cities.map(c=>c.name) : (cities.find(c=>c.name===city)?.districts || [])}
            keyExtractor={(item)=>String(item)}
            ItemSeparatorComponent={()=> <View style={{height:1, backgroundColor:'#E9ECEF'}}/>}
            renderItem={({item}) => (
              <TouchableOpacity
                style={{paddingVertical:10}}
                onPress={()=>{
                  if (selecting === 'city') { setCity(String(item)); setDistrict(''); }
                  else setDistrict(String(item));
                  setSelecting(null); setTimes(null); load();
                }}
              >
                <Text style={{color:'#212529'}}>{String(item)}</Text>
              </TouchableOpacity>
            )}
            style={{maxHeight:240}}
          />
          <TouchableOpacity onPress={()=> setSelecting(null)} style={[styles.btn,{marginTop:12}]}>
            <Text style={styles.btnText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity onPress={load} style={styles.btn}><Text style={styles.btnText}>Yenile</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor:'#F8F9FA' },
  title: { fontSize:20, fontWeight:'700', color:'#177267' },
  subtitle: { fontSize:14, color:'#6C757D', marginBottom:12 },
  info: { fontSize:14 },
  card: { backgroundColor:'#fff', borderRadius:12, padding:12, marginVertical:12,
          shadowColor:'#000', shadowOpacity:0.06, shadowRadius:6, elevation:3 },
  row: { flexDirection:'row', justifyContent:'space-between', paddingVertical:6 },
  key: { color:'#212529', fontWeight:'600' },
  val: { color:'#212529' },
  btn: { backgroundColor:'#177267', paddingVertical:12, borderRadius:8, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700' },
  selector: { backgroundColor:'#fff', borderRadius:12, padding:12, marginBottom:12,
              shadowColor:'#000', shadowOpacity:0.06, shadowRadius:6, elevation:3 },
  selectorTitle: { fontWeight:'700', color:'#212529', marginBottom:8 }
});


