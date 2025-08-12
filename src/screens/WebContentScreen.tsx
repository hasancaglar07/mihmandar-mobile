import React, { useRef, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEB_BASE_URL } from '../constants/config';

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
      }catch(e){}
      true;
    })();
  `;

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
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
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
