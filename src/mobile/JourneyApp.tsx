import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,AppState,BackHandler,ScrollView,StyleSheet,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {JourneySession} from '../campaign/journeySession';
import type {JourneySnapshot} from '../campaign/journeySession';
import {COLONIES,dishForStage,type ColonyId} from '../campaign/journeyPlan';
import {SaveRepository} from '../storage/saveRepository';
import {JourneyRecoveryRepository} from '../storage/journeyRecoveryRepository';
import {colonyUnlocked,createJourneyProfile,observeJourney,parseJourneyProfile} from '../storage/journeyProfile';
import type {JourneyProfile} from '../storage/journeyProfile';
import {AUTOSAVE_INTERVAL_MS,SaveCoordinator} from './saveCoordinator';
import {GameScreen} from './GameScreen';
import {FieldJournal} from './FieldJournal';
import {HomePondScreen} from './HomePondScreen';
import {SettingsScreen} from './SettingsScreen';
import {DiscoveryCinema} from './DiscoveryCinema';
import {ExperimentsScreen} from './ExperimentsScreen';
import {AppearanceProvider,AppText as Text,AppPressable as Pressable} from './AccessibleText';
import {PreferencesController} from '../settings/preferencesController';
import {useSoundscape} from '../audio/useSoundscape';
import {markFilmIntroduced} from '../cinema/discoveryOffers';

// Keep repository queues across screen and React remounts. Native storage lives
// outside the React tree, so a former view must not race a newly mounted view.
const journeyStore=new JourneyRecoveryRepository(AsyncStorage,'petriverse.journey');
const profileStore=new SaveRepository<JourneyProfile>(AsyncStorage,'petriverse.profile',parseJourneyProfile);
const makeCoordinator=(colony:()=>ColonyId)=>new SaveCoordinator<JourneySession,JourneySnapshot,JourneyProfile>({
  journey:journeyStore,profile:profileStore,
  createSession:(profile)=>new JourneySession(Date.now()>>>0,{knownSpecies:profile.discovered,colonyId:colonyUnlocked(profile,colony())?colony():'wanderer'}),capture:(session:JourneySession)=>session.snapshot(),
  restore:(snapshot:JourneySnapshot)=>JourneySession.restore(snapshot),
  createProfile:createJourneyProfile,observeProfile:observeJourney,
  finished:(session:JourneySession)=>session.finished,
  pause:(session:JourneySession)=>{
    session.current.selection.cancel();session.current.nudge.cancel();
    if(session.current.state==='active')session.current.togglePause();
  },
});

function MenuButton({label,onPress,quiet=false,disabled=false,fill=false}:{label:string;onPress:()=>void;quiet?:boolean;disabled?:boolean;fill?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[styles.button,fill&&styles.menuLinkButton,quiet&&styles.quiet,(pressed||disabled)&&styles.dim]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

export function JourneyApp(){
  const selectedColony=useRef<ColonyId>('wanderer');
  const [coordinator]=useState(()=>makeCoordinator(()=>selectedColony.current)),[preferences]=useState(()=>new PreferencesController(AsyncStorage));
  const [,setRevision]=useState(0),[help,setHelp]=useState(false),[panel,setPanel]=useState<'journal'|'pond'|'settings'|'colonies'|'experiments'|undefined>();
  const [panelReturn,setPanelReturn]=useState<'pond'|undefined>();
  const [film,setFilm]=useState<string|undefined>();
  useEffect(()=>{
    coordinator.attach();const unsubscribe=coordinator.subscribe(()=>setRevision(v=>v+1));
    const unsubscribePreferences=preferences.subscribe(()=>setRevision(v=>v+1));
    void coordinator.load();void preferences.load();
    const timer=setInterval(()=>{
      if(AppState.currentState==='active')void coordinator.autosave();
    },AUTOSAVE_INTERVAL_MS);
    return()=>{clearInterval(timer);unsubscribe();unsubscribePreferences();coordinator.detach();};
  },[coordinator,preferences]);
  const save=useCallback((session:JourneySession)=>{void coordinator.save(session);},[coordinator]);
  const interrupt=useCallback((session:JourneySession)=>{void coordinator.interrupt(session);},[coordinator]);
  const home=useCallback(()=>{void coordinator.returnToTitle();},[coordinator]);
  const retrySave=useCallback(()=>{void coordinator.save();},[coordinator]);
  const retryProfile=useCallback(()=>{void coordinator.retryProfile();},[coordinator]);
  const profileChange=useCallback((update:(profile:JourneyProfile)=>JourneyProfile)=>{void coordinator.updateProfile(update);},[coordinator]);
  const openPanel=useCallback((next:'journal'|'pond'|'settings'|'colonies'|'experiments')=>{
    if(coordinator.session&&coordinator.screen==='game')void coordinator.interrupt();
    setPanelReturn(undefined);setPanel(next);
  },[coordinator]);
  const back=useCallback(()=>{setPanel(panelReturn);setPanelReturn(undefined);setHelp(false);},[panelReturn]);
  const watch=useCallback((id:string)=>{
    if(coordinator.session&&coordinator.screen==='game')void coordinator.interrupt();
    setFilm(id);
  },[coordinator]);
  const closeFilm=useCallback((id:string,_completed:boolean)=>{
    profileChange(profile=>markFilmIntroduced(profile,id));setFilm(undefined);
  },[profileChange]);
  useEffect(()=>{
    if((!panel&&!help)||panel==='experiments')return;
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(film)return false;back();return true;});
    return()=>handler.remove();
  },[panel,help,film,back]);
  const requestNew=useCallback(()=>openPanel('colonies'),[openPanel]);
  const beginColony=useCallback((id:ColonyId)=>{
    if(!coordinator.canStart)return;
    if(!colonyUnlocked(coordinator.profile,id))return;
    selectedColony.current=id;
    const start=(confirmed=false)=>{void coordinator.startNew(confirmed).then(started=>{if(started){setPanel(undefined);setHelp(false);}});};
    if(coordinator.needsConfirmation){
      Alert.alert('Start a new journey?',coordinator.session?
        'This replaces your unfinished journey. Your discoveries and records will be kept.':
        'Your saved journey and its backup could not be recovered. Start a new journey and replace the unreadable save?',[
        {text:'Keep my journey',style:'cancel'},
        {text:'Start new journey',style:'destructive',onPress:()=>start(true)},
      ],{cancelable:true});
    }else start();
  },[coordinator]);
  const prefs=preferences.value;
  const {uiPress,playCue}=useSoundscape(coordinator.screen==='game'?coordinator.session?.current:undefined,prefs,{enabled:coordinator.loaded&&preferences.loaded&&panel!=='experiments',narrationActive:!!film,journeyComplete:coordinator.isFinished});
  const wrap=(content:React.ReactNode)=><AppearanceProvider value={prefs} onPressSound={uiPress}>{content}</AppearanceProvider>;
  if(!coordinator.loaded||!preferences.loaded)return wrap(<View style={styles.loading}><ActivityIndicator color="#c8dda4"/><Text style={styles.body}>Opening your pond…</Text></View>);
  if(film)return wrap(<DiscoveryCinema speciesId={film} replaying={coordinator.profile.introducedSpecies.includes(film)} reducedMotion={prefs.reducedMotion}
    muted={prefs.muted} effectsVolume={prefs.effectsVolume} subtitles={prefs.subtitles} onDismiss={closeFilm}/>);
  if(panel==='journal')return wrap(<FieldJournal profile={coordinator.profile} onBack={back} onWatch={watch}
    seenSpecies={coordinator.session?.current.seenSpecies} readOnly={!coordinator.canEditProfile} saving={coordinator.saving} error={coordinator.profileError} onRetrySave={retryProfile}/>);
  if(panel==='pond')return wrap(<HomePondScreen profile={coordinator.profile} onBack={back} onJournal={()=>{setPanelReturn('pond');setPanel('journal');}}
    onProfileChange={profileChange} reducedMotion={prefs.reducedMotion} readOnly={!coordinator.canEditProfile} saving={coordinator.saving} error={coordinator.profileError} onRetrySave={retryProfile}/>);
  if(panel==='experiments')return wrap(<ExperimentsScreen onBack={back} preferences={prefs}/>);
  if(panel==='settings')return wrap(<SettingsScreen value={prefs} onChange={patch=>{void preferences.update(patch);}} onBack={back}
    onRetry={()=>{void preferences.retry();}} error={preferences.error} saving={preferences.saving} readOnly={!preferences.writable}/>);
  if(panel==='colonies')return wrap(<View style={styles.root}><ScrollView contentContainerStyle={styles.colonyPage}>
    <Text style={styles.title}>Choose your colony</Text><Text style={styles.body}>Your discoveries and home pond stay with you across journeys.</Text>
    {COLONIES.map(colony=><View key={colony.id} style={styles.colony}>
      <Text style={styles.title}>{colony.name}</Text><Text style={styles.body}>{colony.detail}</Text>
      <MenuButton label={colonyUnlocked(coordinator.profile,colony.id)?`Begin as ${colony.name}`:colony.unlock} disabled={!colonyUnlocked(coordinator.profile,colony.id)||!coordinator.canStart}
        onPress={()=>beginColony(colony.id as ColonyId)}/></View>)}
    {coordinator.error!==''&&<Text style={styles.error}>{coordinator.error}</Text>}<MenuButton label="Back" onPress={back} quiet/>
  </ScrollView></View>);
  if(coordinator.screen==='game'&&coordinator.session)return wrap(<GameScreen session={coordinator.session}
    onSave={save} onInterrupted={interrupt} onHome={home} onNewJourney={requestNew}
    saveStatus={coordinator.saving?'Saving…':coordinator.savedAt?'Progress saved':'Automatic saving is on'}
    saveError={coordinator.error} profileNotice={coordinator.profileError} recoveryNotice={coordinator.notice}
    onRetrySave={retrySave} onRetryProfile={retryProfile} busy={coordinator.busy} preferences={prefs} profile={coordinator.profile}
    onProfileChange={profileChange} onJournal={()=>openPanel('journal')} onPond={()=>openPanel('pond')} onSettings={()=>openPanel('settings')} onWatch={watch} onSoundCue={playCue}/>);
  const session=coordinator.session;
  return wrap(<View style={styles.root}><ScrollView contentContainerStyle={styles.page}>
    <View style={styles.introduction}>
      <Text style={styles.eyebrow}>A LITTLE UNIVERSE, ALIVE</Text>
      <Text style={styles.brand}>PETRIVERSE</Text>
      <Text style={styles.tagline}>Gather. Protect. Evolve.</Text>
      <View style={styles.pond} accessible={false} pointerEvents="none">
        <View style={styles.mother}><View style={styles.core}/></View>
        <View style={[styles.cell,{left:24,top:31}]}/><View style={[styles.cell,{right:20,top:50}]}/>
        <View style={[styles.cell,{left:42,bottom:23}]}/><View style={[styles.cell,{right:34,bottom:28}]}/>
      </View>
      <Text style={styles.credits}>Petriverse by Marco van Hylckama Vlieg{`\n`}Mobile adaptation by Henri Hubert / AI Engineer Hub</Text>
    </View>
    <View style={styles.menu}>
      {help?<>
        <Text style={styles.title}>How to play</Text>
        <Text style={styles.body}>Drag between blue cells to draw a loop. Return to the first cell and release to capture what is inside.</Text>
        <Text style={styles.body}>Use one finger to draw or nudge. Pinch with two fingers to zoom, and move both fingers to pan. Tap Fit to see the whole dish again.</Text>
        <Text style={styles.body}>Gather green food and protect Mother. Keep purple cysts and Mother outside your loops. Drag a cyst aside when your nudge is ready.</Text>
        <Text style={styles.body}>Follow each encounter’s goals. Spend saved food on adaptations or repairs between encounters.</Text>
        <Text style={styles.body}>Your journey saves automatically during play. Returning from another app pauses the pond; tap Resume when you are ready.</Text>
        <Text style={styles.credits}>Original game and artwork: CC BY-NC 4.0.</Text>
        <MenuButton label="Back" onPress={()=>setHelp(false)} quiet/>
      </>:<>
        {session&&<View style={styles.summary}>
          <Text style={styles.eyebrow}>{coordinator.isFinished?'JOURNEY COMPLETE':'YOUR COLONY IS WAITING'}</Text>
          <Text style={styles.title}>{dishForStage(session.current.stageIndex).name}</Text>
          <Text style={styles.body}>Encounter {session.index+1} of {session.route.length} · {session.current.harvest.spec.name}</Text>
          <Text style={styles.detail}>Score {session.current.score} · {session.current.biomass} food saved</Text>
        </View>}
        {coordinator.notice!==''&&<Text accessibilityLiveRegion="polite" style={styles.notice}>{coordinator.notice}</Text>}
        {coordinator.error!==''&&<Text accessibilityLiveRegion="polite" style={styles.error}>{coordinator.error}</Text>}
        {coordinator.canContinue&&<MenuButton label={coordinator.isFinished?'View your completed journey':'Continue your journey'} onPress={()=>coordinator.continueJourney()}/>}
        {coordinator.canStart&&<MenuButton label={session?'Start a new journey':'Begin your journey'} onPress={requestNew} quiet={!!session}/>}
        {coordinator.canRetryLoad&&<MenuButton label="Retry loading" onPress={()=>{void coordinator.retryLoad();}}/>}
        {coordinator.error!==''&&session&&<MenuButton label="Try saving again" onPress={retrySave} disabled={coordinator.busy} quiet/>}
        {coordinator.profileError!==''&&<>
          <Text accessibilityLiveRegion="polite" style={styles.notice}>{coordinator.profileError}</Text>
          <MenuButton label="Retry profile" onPress={retryProfile} disabled={coordinator.busy} quiet/>
        </>}
        <MenuButton label="How to play & credits" onPress={()=>setHelp(true)} quiet/>
        <View style={styles.menuLinks}>
          <View style={styles.menuLinkRow}>
            <MenuButton label="Field journal" onPress={()=>openPanel('journal')} quiet fill/>
            <MenuButton label="Home pond" onPress={()=>openPanel('pond')} quiet fill/>
          </View>
          <View style={styles.menuLinkRow}>
            <MenuButton label="Experiments" onPress={()=>openPanel('experiments')} quiet fill/>
            <MenuButton label="Settings" onPress={()=>openPanel('settings')} quiet fill/>
          </View>
        </View>
        {coordinator.profile.bestScore>0&&<Text style={styles.detail}>Best score {coordinator.profile.bestScore} · {coordinator.profile.victories} journeys completed</Text>}
        {coordinator.saving&&<Text accessibilityLiveRegion="polite" style={styles.detail}>Saving…</Text>}
      </>}
    </View>
  </ScrollView></View>);
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#06171c'},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:16,backgroundColor:'#06171c'},
  menuLinks:{gap:8},menuLinkRow:{flex:1,flexDirection:'row',gap:8},menuLinkButton:{flex:1},colonyPage:{padding:24,gap:16,width:'100%',maxWidth:700,alignSelf:'center'},colony:{gap:8,padding:18,backgroundColor:'#0c242b',borderWidth:1,borderColor:'#2c5055',borderRadius:14},
  page:{flexGrow:1,padding:24,flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:28},
  introduction:{flexGrow:1,flexBasis:260,maxWidth:440,alignItems:'center',gap:10},menu:{flexGrow:1,flexBasis:300,maxWidth:520,gap:10,padding:20,backgroundColor:'#0c242b',borderColor:'#2c5055',borderWidth:1,borderRadius:18},
  eyebrow:{fontSize:10,color:'#9ac8c2',letterSpacing:2},brand:{color:'#e1eee4',fontSize:29,fontWeight:'600',letterSpacing:5},tagline:{color:'#a5c1be',fontSize:15},title:{color:'#e3eee4',fontSize:22,fontWeight:'500'},
  body:{color:'#c0d3ce',fontSize:13,lineHeight:20},detail:{color:'#91adae',fontSize:11,lineHeight:16},credits:{color:'#87a5a5',fontSize:10,lineHeight:15,textAlign:'center'},
  button:{minHeight:44,paddingHorizontal:16,paddingVertical:12,alignItems:'center',justifyContent:'center',backgroundColor:'#325f5b',borderRadius:10,borderWidth:1,borderColor:'#59857b'},quiet:{backgroundColor:'#112b30',borderColor:'#34585e'},buttonText:{color:'#e0eee0',fontSize:13,fontWeight:'600',textAlign:'center'},dim:{opacity:0.45},
  summary:{gap:6,marginBottom:5},notice:{color:'#d5dca9',fontSize:12,lineHeight:18},error:{color:'#f0c1ac',fontSize:12,lineHeight:18},
  pond:{width:174,height:154,borderRadius:80,borderWidth:1,borderColor:'#46676a',backgroundColor:'#102e34',alignItems:'center',justifyContent:'center',marginVertical:4},
  mother:{width:63,height:63,borderRadius:32,borderWidth:2,borderColor:'#91adae',backgroundColor:'#25494f',alignItems:'center',justifyContent:'center'},core:{width:23,height:23,borderRadius:12,backgroundColor:'#bcb370',borderWidth:2,borderColor:'#dfca8b'},cell:{position:'absolute',width:17,height:17,borderRadius:9,borderWidth:1,borderColor:'#b2d3d8',backgroundColor:'#365d66'},
});
