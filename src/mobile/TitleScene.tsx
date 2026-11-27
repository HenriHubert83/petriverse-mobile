import React,{useEffect,useMemo,useState} from 'react';
import {AppState,Image,StyleSheet,View} from 'react-native';
import {EncounterView} from '../rendering/EncounterView';
import type {Preferences} from '../settings/preferences';
import {TitlePond as TitlePondModel} from './titlePond';
import {TouchController} from './touchController';

const noInteraction=()=>{};

/** A decorative microscope, independent of the player's journey and storage. */
export function TitleScene({preferences}:{preferences:Readonly<Preferences>}){
  const [pond]=useState(()=>new TitlePondModel());
  const touch=useMemo(()=>new TouchController(pond.run),[pond]);
  const [,refresh]=useState(0);
  const [active,setActive]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
  const {reducedMotion,highContrast,visualQuality}=preferences;
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',state=>setActive(state==='active'));
    return()=>subscription.remove();
  },[]);
  useEffect(()=>{
    pond.advance(0,{reducedMotion,visualQuality});refresh(value=>value+1);
    if(!active||reducedMotion)return;
    let frame=0,previous:number|undefined,elapsed=0,cancelled=false;
    const animate=(timestamp:number)=>{
      if(cancelled)return;
      elapsed+=previous===undefined?0:Math.max(0,Math.min(.1,(timestamp-previous)/1000));previous=timestamp;
      if(elapsed>=1/30){pond.advance(elapsed,{visualQuality});elapsed=0;refresh(value=>value+1);}
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return()=>{cancelled=true;cancelAnimationFrame(frame);};
  },[pond,active,reducedMotion,visualQuality]);
  return <View style={styles.hero}>
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <EncounterView run={pond.run} touch={touch} tracers={pond.tracers} onInteraction={noInteraction}
        interactive={false} reducedMotion={reducedMotion} highContrast={highContrast} visualQuality={visualQuality}/>
    </View>
    <Image source={require('../../assets/branding/petriverse-title-v2.png')} style={styles.logo}
      resizeMode="contain" accessibilityRole="image" accessibilityLabel="Petriverse"/>
  </View>;
}

const styles=StyleSheet.create({
  hero:{width:'100%',aspectRatio:1.5,maxHeight:276,overflow:'hidden'},
  logo:{position:'absolute',top:0,left:0,width:'100%',height:'60%'},
});
