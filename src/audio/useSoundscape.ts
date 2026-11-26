import {useCallback,useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {createAudioPlayer,setAudioModeAsync} from 'expo-audio';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {Preferences} from '../settings/preferences';
import {CONNECT_OCTAVE,CURRENT,MUSIC,POND,SOUNDS} from './audioAssets';
import {SoundscapePlayback} from './soundscapePlayback';
import type {ExternalSoundCue} from './soundscape';
export type {ExternalSoundCue} from './soundscape';

export interface SoundscapeOptions {enabled?:boolean;narrationActive?:boolean;journeyComplete?:boolean}
export function useSoundscape(run:EncounterSimulation|undefined,prefs:Readonly<Preferences>,options:SoundscapeOptions={}){
  const current=useRef({run,prefs,options}),playback=useRef<SoundscapePlayback|undefined>(undefined);
  current.current={run,prefs,options};
  useEffect(()=>{
    let closed=false,frame=0,last=0;
    const subscription=AppState.addEventListener('change',state=>playback.current?.setForeground(state==='active'));
    void setAudioModeAsync({playsInSilentMode:true,allowsRecording:false,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'}).then(()=>{
      if(closed)return;
      const audio=new SoundscapePlayback(source=>createAudioPlayer(source,{updateInterval:100}),{music:MUSIC,effects:SOUNDS,pond:POND,current:CURRENT,connectOctave:CONNECT_OCTAVE});
      playback.current=audio;audio.setForeground(AppState.currentState==='active');
      const tick=(now:number)=>{
        if(closed)return;
        const {run:live,prefs:settings,options:controls}=current.current;
        if(now-last>=40){audio.update(live,settings,last?Math.min(.1,(now-last)/1000):0,controls);last=now;}
        frame=requestAnimationFrame(tick);
      };
      frame=requestAnimationFrame(tick);
    }).catch(()=>{/* The game stays usable if the device cannot initialize audio. */});
    return()=>{closed=true;cancelAnimationFrame(frame);subscription.remove();playback.current?.dispose();playback.current=undefined;};
  },[]);
  return {
    uiPress:useCallback(()=>playback.current?.uiPress(),[]),
    playCue:useCallback((cue:ExternalSoundCue)=>{
      const audio=playback.current;if(!audio)return;
      // A new encounter can emit its title cue before the next audio frame.
      // Establish that run first so the next frame does not clear the cue.
      const live=current.current;audio.update(live.run,live.prefs,0,live.options);audio.externalCue(cue);
    },[]),
  };
}
