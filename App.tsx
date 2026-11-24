import React, {useEffect, useState} from 'react';
import {AppState, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StatusBar} from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import {RendererDiagnostic} from './src/rendering/RendererDiagnostic';

export default function App() {
  const [active,setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [paused,setPaused] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setActive(state === 'active');
      if(state !== 'active') setPaused(true);
    });
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => subscription.remove();
  }, []);
  return <GestureHandlerRootView style={styles.root}><SafeAreaProvider>
    <StatusBar hidden />
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View><Text style={styles.title}>PETRIVERSE</Text><Text style={styles.subtitle}>Mobile rendering diagnostic · not gameplay</Text></View>
        <Pressable accessibilityRole="button" onPress={() => setPaused(p => !p)} style={styles.button}><Text style={styles.label}>{paused ? 'Resume' : 'Pause'}</Text></Pressable>
      </View>
      <RendererDiagnostic running={active && !paused}/>
      <Text style={styles.footer}>Original game: see CREDITS.md · Mobile adaptation by AI Engineer Hub</Text>
    </SafeAreaView>
  </SafeAreaProvider></GestureHandlerRootView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#08191f'},header:{paddingHorizontal:20,paddingVertical:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{color:'#e2f4ef',fontSize:25,fontWeight:'600',letterSpacing:4},subtitle:{color:'#8baeb2',fontSize:12},button:{padding:12,borderWidth:1,borderColor:'#517d83',borderRadius:10},label:{color:'#e2f4ef'},footer:{color:'#8baeb2',fontSize:11,textAlign:'center',padding:8}});
