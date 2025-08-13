import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Platform, NativeSyntheticEvent } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEB_BASE_URL } from '../constants/config';
import { persistCoordinatesForWidget } from '../services/location';
import { WidgetService } from '../services/widget';

type Props = { path?: string; title?: string };

export default function WebContentScreen({ path = '/', title = 'İçerik' }: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceUrl = useMemo(() => `${WEB_BASE_URL}${path}`, [path]);

  const injectedJS = `
    (function(){
      try{
        var meta=document.querySelector('meta[name="viewport"]');
        if(!meta){meta=document.createElement('meta');meta.name='viewport';document.head.appendChild(meta)}
        meta.setAttribute('content','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
        document.documentElement.style.scrollBehavior='smooth';

        // Expose a light bridge for the web app
        window.MihmandarBridge = {
          setLocation: function(lat, lng){
            try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type:'widget:setLocation', lat: Number(lat), lng: Number(lng) })); }catch(e){}
          },
          updateWidget: function(data){
            try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type:'widget:update', payload: data })); }catch(e){}
          },
          setEzanSettings: function(settings){
            try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type:'ezan:set', payload: settings })); }catch(e){}
          },
          setNotificationSettings: function(settings){
            try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type:'notify:set', payload: settings })); }catch(e){}
          },
          setWidgetTheme: function(theme){
            try{ window.ReactNativeWebView.postMessage(JSON.stringify({ type:'widget:theme', payload: theme })); }catch(e){}
          }
        };

        // Auto-send geolocation to RN if available (best-effort)
        if (navigator && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(pos){
            try{
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'widget:setLocation',
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              }));
            }catch(e){}
          }, function(){}, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
        }
      }catch(e){}
      true;
    })();
  `;

  const handleMessage = async (event: any) => {
    try {
      const data = event?.nativeEvent?.data;
      if (!data) return;
      const msg = JSON.parse(data);
      switch (msg.type) {
        case 'widget:setLocation':
          if (msg.lat && msg.lng) {
            console.log('🌍 WebView -> RN location:', msg.lat, msg.lng);
            await persistCoordinatesForWidget(msg.lat, msg.lng);
          }
          break;
        case 'widget:update':
          if (msg.payload) {
            // Attempt to refresh widget using current app-side location + payload if available
            try { await WidgetService.refreshWidget(); } catch {}
          }
          break;
        case 'widget:theme':
          try { await WidgetService.applyTheme(msg.payload); } catch {}
          break;
        case 'ezan:set':
          // Optional: forward to NotificationService if needed
          break;
        case 'notify:set':
          // Optional: forward to NotificationService if needed
          break;
        default:
          break;
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.navBtn} disabled={!canGoBack} onPress={()=> webRef.current?.goBack()}>
          <Text style={[styles.navText,!canGoBack&&styles.navTextDisabled]}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={()=> webRef.current?.reload()}>
          <Text style={styles.navText}>⟳</Text>
        </TouchableOpacity>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: sourceUrl }}
        style={styles.web}
        onLoadStart={()=> setLoading(true)}
        onLoadEnd={()=> setLoading(false)}
        onNavigationStateChange={(s)=>{ setCanGoBack(s.canGoBack); setCanGoForward(s.canGoForward); }}
        onError={()=>{ setError('Sayfa yüklenemedi'); setLoading(false); }}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        geolocationEnabled
        decelerationRate={Platform.OS==='ios'?'normal':'fast'}
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        startInLoadingState
        renderLoading={()=> (
          <View style={styles.loading}><ActivityIndicator size="large" color="#177267" /></View>
        )}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#177267" />
        </View>
      )}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={()=> { setError(null); webRef.current?.reload(); }}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#fff' },
  topBar:{ height:50, flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:12, borderBottomWidth:1, borderBottomColor:'#E9ECEF' },
  navBtn:{ padding:8 },
  navText:{ fontSize:18, color:'#177267' },
  navTextDisabled:{ color:'#C5C7CA' },
  title:{ fontWeight:'700', color:'#212529' },
  web:{ flex:1 },
  loading:{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#F8F9FA' },
  loadingOverlay:{ position:'absolute', left:0, right:0, top:50, bottom:0, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(248,249,250,0.6)' },
  errorBar:{ position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#dc3545', padding:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  errorText:{ color:'#fff', fontWeight:'600' },
  retryText:{ color:'#fff', textDecorationLine:'underline' },
});
