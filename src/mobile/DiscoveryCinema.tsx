import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,BackHandler,ScrollView,StyleSheet,View,useWindowDimensions} from 'react-native';
import {AppPressable as Pressable,AppText as Text,useAppearance} from './AccessibleText';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {FilmPlayback} from '../cinema/filmPlayback';
import {FilmScene} from '../cinema/FilmScene';
import {narrationAssets} from '../cinema/narrationAssets';
export interface DiscoveryCinemaProps {
  speciesId:string;replaying?:boolean;reducedMotion?:boolean;muted?:boolean;effectsVolume?:number;subtitles?:boolean;paused?:boolean;
  onDismiss:(speciesId:string,completed:boolean)=>void;
}
export function DiscoveryCinema(props:DiscoveryCinemaProps){
  const [replay,setReplay]=useState(0);
  return <CinemaPlayback key={`${props.speciesId}:${replay}`} {...props} onReplay={()=>setReplay(value=>value+1)}/>;
}
function CinemaPlayback({speciesId,replaying=false,reducedMotion=false,muted=false,effectsVolume=0.7,subtitles=true,paused=false,onDismiss,onReplay}:DiscoveryCinemaProps&{onReplay:()=>void}){
  const [playback]=useState(()=>new FilmPlayback(speciesId,reducedMotion)),[,refresh]=useState(0);
  const [userPaused,setUserPaused]=useState(false),[foreground,setForeground]=useState(AppState.currentState==='active');
  const [needsResume,setNeedsResume]=useState(false),[audioUnavailable,setAudioUnavailable]=useState(false);
  const player=useAudioPlayer(narrationAssets[speciesId],{updateInterval:100}),status=useAudioPlayerStatus(player);
  const dismissRef=useRef(onDismiss),finished=useRef(false);dismissRef.current=onDismiss;
  const {width,height}=useWindowDimensions(),landscape=width>height,{highContrast}=useAppearance();
  const held=userPaused||needsResume||paused||!foreground;
  const loading=!status.isLoaded&&!audioUnavailable;
  const heldRef=useRef(held),readyRef=useRef(!loading);heldRef.current=held;readyRef.current=!loading;
  const close=useCallback((completed:boolean)=>{
    if(finished.current)return;finished.current=true;player.pause();dismissRef.current(speciesId,completed);
  },[player,speciesId]);
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{close(false);return true;});return()=>handler.remove();
  },[close]);
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',next=>{
      const active=next==='active';setForeground(active);
      if(!active){player.pause();playback.hold('background',true);setNeedsResume(true);}
    });return()=>subscription.remove();
  },[player,playback]);
  const wasPlaying=useRef(false);
  useEffect(()=>{
    if(wasPlaying.current&&!status.playing&&!status.isBuffering&&!status.didJustFinish&&!held&&status.currentTime<status.duration-0.2){
      playback.hold('user',true);setNeedsResume(true);
    }
    wasPlaying.current=status.playing;
  },[status.playing,status.isBuffering,status.didJustFinish,status.currentTime,status.duration,held,playback]);
  useEffect(()=>{
    if(status.error)setAudioUnavailable(true);
  },[status.error]);
  useEffect(()=>{
    if(status.isLoaded)return;
    const timeout=setTimeout(()=>setAudioUnavailable(true),5000);return()=>clearTimeout(timeout);
  },[status.isLoaded]);
  useEffect(()=>{player.volume=Math.max(0,Math.min(1,effectsVolume));player.muted=muted;},[effectsVolume,muted,player]);
  useEffect(()=>{
    playback.hold('background',!foreground);playback.hold('user',userPaused||needsResume);playback.hold('external',paused);
    playback.hold('loading',loading);playback.hold('buffering',status.isBuffering&&!audioUnavailable);
    if(held||loading||audioUnavailable)player.pause();else if(status.isLoaded&&!playback.completed)player.play();
  },[playback,player,held,foreground,userPaused,needsResume,paused,loading,status.isLoaded,status.isBuffering,audioUnavailable]);
  useEffect(()=>{
    let frame=0,alive=true;
    const tick=(timestamp:number)=>{
      if(!alive)return;
      // Read immediate refs as well as clock holds to close the React scheduling gap.
      if(!heldRef.current&&readyRef.current&&playback.tick(timestamp)>0)refresh(value=>value+1);
      else if(heldRef.current||!readyRef.current)playback.hold('frame',true);
      if(!heldRef.current&&readyRef.current)playback.hold('frame',false);
      if(playback.completed)close(true);else frame=requestAnimationFrame(tick);
    };frame=requestAnimationFrame(tick);
    return()=>{alive=false;cancelAnimationFrame(frame);};
  },[playback,player,close]);
  const togglePause=()=>{if(needsResume)setNeedsResume(false);setUserPaused(value=>needsResume?false:!value);};
  return <View style={styles.root}>
    <View style={styles.header}><View style={styles.heading}>
      <Text style={styles.eyebrow}>{replaying?'FIELD NOTES · WATCH AGAIN':'FIRST ENCOUNTER · YOUR DISH IS PAUSED'}</Text>
      <Text style={styles.title} accessibilityRole="header">{playback.stage.entry.name}</Text>
    </View><Button label={replaying?'Return':'Later'} onPress={()=>close(false)}/></View>
    <View style={[styles.content,landscape?styles.landscape:styles.portrait]}>
      <FilmScene film={playback.stage} highContrast={highContrast}/>
      <View style={[styles.notes,landscape?styles.sideNotes:styles.bottomNotes]}>
        <Text style={styles.cue}>{playback.stage.cue}</Text>
        <ScrollView style={styles.transcript} contentContainerStyle={styles.transcriptContent}>
          {(subtitles||audioUnavailable)&&<Text style={styles.narration}>{playback.stage.entry.narration}</Text>}
          {audioUnavailable&&<Text style={styles.status}>Narration is unavailable. You can follow the demonstration and transcript.</Text>}
          {loading&&<Text style={styles.status}>Loading narration…</Text>}
          {needsResume&&<Text style={styles.status}>Paused while the app was away. Resume when you are ready.</Text>}
        </ScrollView>
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(playback.progress*100)}}><View style={[styles.progressFill,{width:`${playback.progress*100}%`}]}/></View>
        <View style={styles.controls}><Button label={userPaused||needsResume?'Resume':'Pause'} onPress={togglePause}/><Button label="Replay" onPress={()=>{player.pause();onReplay();}}/>
          <Text style={styles.time}>{Math.ceil(playback.finishAt-playback.elapsed)}s</Text></View>
      </View>
    </View>
  </View>;
}
function Button({label,onPress}:{label:string;onPress:()=>void}){
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[styles.button,pressed&&styles.pressed]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#091f26',padding:14,gap:10},header:{flexDirection:'row',alignItems:'center',gap:12},heading:{flex:1,gap:3},eyebrow:{color:'#8eb6b5',fontSize:10,letterSpacing:1.5},title:{color:'#e8e9ce',fontSize:23,fontWeight:'600'},
  content:{flex:1,gap:16,minHeight:0},landscape:{flexDirection:'row'},portrait:{flexDirection:'column'},notes:{gap:10},sideNotes:{width:'34%',maxWidth:430},bottomNotes:{flex:0.65},cue:{fontSize:15,lineHeight:21,color:'#c7ddcb',fontWeight:'600'},transcript:{flex:1},transcriptContent:{gap:10},narration:{fontSize:15,lineHeight:23,color:'#b8c9bd'},status:{fontSize:12,lineHeight:18,color:'#91b4b0'},
  progress:{height:3,backgroundColor:'#244951',borderRadius:2,overflow:'hidden'},progressFill:{height:3,backgroundColor:'#a6cfad'},controls:{flexDirection:'row',alignItems:'center',gap:8},button:{minHeight:44,minWidth:66,borderWidth:1,borderColor:'#41666a',paddingHorizontal:13,paddingVertical:11,borderRadius:9,alignItems:'center',justifyContent:'center'},buttonText:{color:'#d6e5d5',fontSize:14,fontWeight:'500'},pressed:{opacity:0.55},time:{marginLeft:'auto',fontSize:12,color:'#91b4b0'},
});
