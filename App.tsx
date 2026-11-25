import React,{useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StatusBar} from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import {JourneyApp} from './src/mobile/JourneyApp';

export default function App(){
  useEffect(()=>{ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(()=>{});},[]);
  return <GestureHandlerRootView style={styles.root}><SafeAreaProvider>
    <StatusBar hidden/><SafeAreaView style={styles.root}><JourneyApp/></SafeAreaView>
  </SafeAreaProvider></GestureHandlerRootView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#06171c'}});
