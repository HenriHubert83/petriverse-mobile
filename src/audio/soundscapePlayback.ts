import {SoundscapeEnvelope,SoundscapeEvents,TRACKS,type EffectName,type ExternalSoundCue,type MusicTrack,type SoundCue} from './soundscape';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {Preferences} from '../settings/preferences';

/** Small adapter keeps playback lifecycle testable without loading a native module. */
export interface SoundPlayer {
  volume:number;loop:boolean;playing:boolean;duration:number;currentTime:number;
  playbackRate:number;shouldCorrectPitch:boolean;
  play():void;pause():void;replace(source:number):void;remove():void;
}
export interface SoundAssets {music:Record<MusicTrack,number>;effects:Record<EffectName,number>;pond:number;current:number;connectOctave:number}
interface Voice {player:SoundPlayer;gain:number;active:boolean;age:number;ui:boolean}
export class SoundscapePlayback {
  private readonly events=new SoundscapeEvents();
  private readonly envelope=new SoundscapeEnvelope();
  private readonly music:SoundPlayer[]=[];
  private readonly loops:SoundPlayer[]=[];
  private readonly voices:Voice[]=[];
  private activeMusic=0;
  private currentTrack:MusicTrack='stillwater';
  private crossfade=-1;
  private foreground=true;
  private enabled=false;
  private disposed=false;
  private lastRun:EncounterSimulation|undefined;
  private latestPrefs:Readonly<Preferences>|undefined;
  private paused=false;
  private cueClock=0;
  private readonly externalRecent=new Map<ExternalSoundCue['name'],number>();
  constructor(create:(source:number|null)=>SoundPlayer,private readonly assets:SoundAssets){
    // If native setup fails partway through, release every player already made.
    try{
      for(let i=0;i<2;i++){const player=create(i===0?assets.music.stillwater:null);this.music.push(player);player.volume=0;}
      for(const source of [assets.pond,assets.current]){const player=create(source);this.loops.push(player);player.loop=true;player.volume=0;}
      for(let i=0;i<10;i++){const player=create(null);this.voices.push({player,gain:1,active:false,age:0,ui:false});player.volume=0;}
    }catch(error){this.dispose();throw error;}
  }
  private all(){return [...this.music,...this.loops,...this.voices.map(v=>v.player)];}
  private stopEffects(includeUI=true){for(const voice of this.voices)if(includeUI||!voice.ui){voice.player.pause();voice.active=false;}}
  setForeground(active:boolean){
    if(this.disposed||active===this.foreground)return;
    this.foreground=active;
    if(!active){for(const player of this.all())player.pause();this.stopEffects();this.events.reset(this.lastRun);this.externalRecent.clear();}
  }
  private startBeds(){
    if(!this.music[this.activeMusic].playing)this.music[this.activeMusic].play();
    if(this.crossfade>=0&&!this.music[1-this.activeMusic].playing)this.music[1-this.activeMusic].play();
    for(const player of this.loops)if(!player.playing)player.play();
  }
  private transition(track:MusicTrack){
    const incoming=this.music[1-this.activeMusic];incoming.pause();incoming.volume=0;
    incoming.replace(this.assets.music[track]);incoming.play();this.currentTrack=track;this.crossfade=0;
  }
  private effect(cue:SoundCue,ui=false){
    if(this.disposed||!this.foreground||!this.enabled||this.paused&&!ui||!this.latestPrefs||this.latestPrefs.muted||this.latestPrefs.effectsVolume<=0)return;
    let voice=this.voices.find(v=>!v.active||v.age>.25&&!v.player.playing);
    if(!voice&&['injury','victory','loss'].includes(cue.name))voice=this.voices[0];
    if(!voice)return;
    const highNote=cue.name==='connect'&&cue.pitch>2;
    voice.player.pause();voice.player.replace(highNote?this.assets.connectOctave:this.assets.effects[cue.name]);voice.gain=cue.gain;voice.ui=ui;
    voice.player.volume=this.latestPrefs.effectsVolume*cue.gain*.62;
    voice.player.shouldCorrectPitch=false;
    // The original connection melody reaches 3.4x. An octave copy preserves
    // those notes within Expo's native 2x playback rate limit.
    voice.player.playbackRate=highNote?cue.pitch/2:Math.min(2,cue.pitch);voice.active=true;voice.age=0;voice.player.play();this.envelope.cue(cue.name);
  }
  uiPress(){this.effect({name:'ui_press',gain:.55,pitch:1},true);}
  externalCue(cue:ExternalSoundCue){
    if(this.disposed||!this.foreground||!this.enabled||this.paused||!Number.isFinite(cue.gain)||!Number.isFinite(cue.pitch))return;
    // Mote uses the connection recording but retains its own source identity.
    // Particle notes must not rate-limit actual pointer connection feedback.
    if((this.externalRecent.get(cue.name)??-100)>this.cueClock-.065)return;
    this.externalRecent.set(cue.name,this.cueClock);
    this.effect({name:cue.name==='mote'?'connect':cue.name,gain:Math.max(0,Math.min(1,cue.gain)),pitch:Math.max(.6,Math.min(3.4,cue.pitch))});
  }
  update(run:EncounterSimulation|undefined,prefs:Readonly<Preferences>,delta:number,options:{enabled?:boolean;narrationActive?:boolean;journeyComplete?:boolean}={}){
    if(this.disposed)return;
    this.latestPrefs=prefs;
    if(run!==this.lastRun){this.stopEffects();this.events.reset(run);this.lastRun=run;this.externalRecent.clear();this.cueClock=0;}
    this.paused=run?.state==='paused';
    const enabled=options.enabled!==false;
    if(!enabled||!this.foreground){
      if(this.enabled){for(const player of this.all())player.pause();this.stopEffects();}
      this.enabled=false;this.events.reset(run);this.externalRecent.clear();return;
    }
    if(!this.enabled)this.events.reset(run);
    this.enabled=true;
    const dt=Math.min(.25,Math.max(0,delta));
    if(!this.paused)this.cueClock+=dt;
    const mix=this.envelope.advance(run,prefs,dt,options.narrationActive);
    const desired=run?TRACKS[Math.max(0,Math.min(2,Math.floor(run.stageIndex/4)))]:TRACKS[0];
    const active=this.music[this.activeMusic];
    if(this.crossfade<0&&(desired!==this.currentTrack||(active.duration>5&&active.currentTime>=active.duration-5)))this.transition(desired);
    if(this.crossfade>=0){
      this.crossfade=Math.min(5,this.crossfade+dt);const amount=this.crossfade/5;
      active.volume=mix.music*Math.cos(amount*Math.PI*.5);
      this.music[1-this.activeMusic].volume=mix.music*Math.sin(amount*Math.PI*.5);
      if(this.crossfade>=5){active.pause();active.volume=0;this.activeMusic=1-this.activeMusic;this.crossfade=-1;}
    }else active.volume=mix.music;
    this.loops[0].volume=mix.pond;this.loops[1].volume=mix.current;
    this.startBeds();
    // Pausing discards incomplete effects, so resume cannot play stale feedback.
    if(prefs.muted)this.stopEffects();else if(this.paused)this.stopEffects(false);
    for(const voice of this.voices){voice.player.volume=mix.effects*voice.gain;voice.age+=dt;}
    for(const cue of this.events.advance(run,dt,options.journeyComplete))this.effect(cue);
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    for(const player of this.all()){try{player.pause();}catch{}try{player.remove();}catch{}}
    this.events.reset(undefined);
  }
}
