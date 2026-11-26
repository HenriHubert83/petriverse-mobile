import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AppState,BackHandler,ScrollView,StyleSheet,View,useWindowDimensions} from 'react-native';
import {AppText as Text} from './AccessibleText';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CollectionButton,CollectionSaveNotice,collectionStyles as shared} from './CollectionScreen';
import {LivingPond} from './HomePondScreen';
import type {JourneySession} from '../campaign/journeySession';
import type {JourneyProfile} from '../storage/journeyProfile';
import type {Preferences} from '../settings/preferences';
import {journeyEpilogue} from '../pond/journeyEpilogue';
import {sampleHomePond} from '../pond/homePond';

export interface EndingScreenProps {
  session:JourneySession;profile:JourneyProfile;preferences:Readonly<Preferences>;
  onPond:()=>void;onNewJourney:()=>void;onHome:()=>void;onJournal?:()=>void;
  busy?:boolean;saving?:boolean;error?:string;onRetrySave?:()=>void;
}
export function EndingScreen({session,profile,preferences,onPond,onNewJourney,onHome,onJournal,busy=false,saving,error,onRetrySave}:EndingScreenProps){
  const [time,setTime]=useState(0),clock=useRef(0),{width,height}=useWindowDimensions();
  const landscape=width>height,reducedMotion=preferences.reducedMotion,insets=useSafeAreaInsets();
  const sceneHeight=Math.max(landscape?180:420,height-insets.top-insets.bottom-220);
  const ending=useMemo(()=>journeyEpilogue(session,profile),[session,profile]);
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{onHome();return true;});return()=>handler.remove();
  },[onHome]);
  useEffect(()=>{
    if(reducedMotion)return;
    let frame=0,previous:number|undefined,accumulator=0,active=AppState.currentState==='active';
    const subscription=AppState.addEventListener('change',state=>{active=state==='active';previous=undefined;accumulator=0;});
    const animate=(timestamp:number)=>{
      if(active){
        accumulator+=previous===undefined?0:Math.max(0,Math.min(0.1,(timestamp-previous)/1000));
        if(accumulator>=1/30){clock.current+=accumulator;accumulator=0;setTime(clock.current);}
      }
      previous=active?timestamp:undefined;frame=requestAnimationFrame(animate);
    };frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);subscription.remove();};
  },[reducedMotion]);
  const pond=sampleHomePond(ending.layout,time,{reducedMotion});
  return <ScrollView style={shared.root} contentContainerStyle={styles.page}>
    <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{ending.title}</Text>
      <Text style={styles.subtitle}>{ending.subtitle}</Text></View>
    <View style={[styles.content,{minHeight:sceneHeight},!landscape&&styles.portrait]}>
      <View style={styles.pond} accessibilityLabel={`${ending.layout.residents.length} rescued residents gathered around the colony you raised.`}>
        <LivingPond frame={pond} motherDamage={ending.motherDamage}/>
      </View>
      <ScrollView nestedScrollEnabled style={[styles.details,!landscape&&styles.portraitDetails]} contentContainerStyle={styles.detailsContent}>
        <Text style={shared.eyebrow}>THE COLONY YOU RAISED</Text>
        <Text accessibilityRole="header" style={shared.title}>{ending.colonyName}</Text>
        {ending.traits.length>0&&<Text style={shared.caption}>{ending.traits.join(' · ')}</Text>}
        <Text style={styles.survived}>{ending.integrity} health cores survived</Text>
        <Text style={shared.caption}>{ending.food} food gathered</Text>
        <Text accessibilityRole="header" style={styles.remembers}>The pond remembers.</Text>
        <Text style={shared.body}>Every rescued organism stays in your home pond. These are some of the lives you brought home.</Text>
        <Text style={shared.caption}>Next time, follow a different habitat, discover another species, or raise a new kind of colony.</Text>
      </ScrollView>
    </View>
    <View style={styles.summary}>
      <Text style={styles.stats}>Score {ending.score} · Lives rescued {ending.rescued} · Evolutions {ending.evolutions}{ending.bestScore>ending.score?` · Best ${ending.bestScore}`:''}</Text>
      <Text style={styles.note}>{ending.note}</Text>
    </View>
    <View style={styles.actions}>
      <CollectionButton label="Visit your home pond" onPress={onPond} style={styles.primary}/>
      {onJournal&&<CollectionButton label="Field journal" onPress={onJournal}/>}
      <CollectionButton label="New journey" onPress={onNewJourney} disabled={busy}/>
      <CollectionButton label="Return home" onPress={onHome}/>
    </View>
    <CollectionSaveNotice saving={saving} error={error} onRetrySave={onRetrySave}/>
  </ScrollView>;
}
const styles=StyleSheet.create({
  page:{flexGrow:1},header:{alignItems:'center',paddingHorizontal:18,paddingTop:12,paddingBottom:6,gap:4},title:{fontSize:26,color:'#e6ecda',fontWeight:'600'},subtitle:{fontSize:13,lineHeight:18,color:'#b6d1c9',textAlign:'center'},
  content:{flex:1,minHeight:0,flexDirection:'row'},portrait:{flexDirection:'column'},pond:{flex:1,minHeight:130},details:{width:'34%',minWidth:220,maxWidth:380},portraitDetails:{width:'100%',maxWidth:undefined,flex:0.7},detailsContent:{paddingHorizontal:18,paddingVertical:10,gap:8},survived:{fontSize:13,lineHeight:18,color:'#acd9ca',marginTop:4},remembers:{fontSize:19,color:'#e0e8d4',marginTop:6},
  summary:{alignItems:'center',gap:3,paddingHorizontal:14,paddingVertical:7,backgroundColor:'#102c31'},stats:{fontSize:13,lineHeight:18,color:'#b4daca',textAlign:'center'},note:{fontSize:12,lineHeight:17,color:'#93b6b1',textAlign:'center'},actions:{flexDirection:'row',justifyContent:'center',gap:8,paddingHorizontal:12,paddingVertical:9,flexWrap:'wrap'},primary:{backgroundColor:'#244e47',borderColor:'#679e84'},
});
