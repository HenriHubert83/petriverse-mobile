import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,BackHandler,ScrollView,StyleSheet,View} from 'react-native';
import {JourneySession} from '../campaign/journeySession';
import {dishForStage} from '../campaign/journeyPlan';
import {JourneyBoss} from '../campaign/journeyBoss';
import {mutationDefinition} from '../evolution/mutations';
import {EncounterView} from '../rendering/EncounterView';
import {WaterTracers} from '../rendering/waterTracers';
import {SimulationClock} from './simulationClock';
import {TouchController} from './touchController';
import {AppText as Text,AppPressable as Pressable} from './AccessibleText';
import {habitatChoicePending,habitatName,habitatOptions} from '../campaign/journeyHabitats';
import type {Preferences} from '../settings/preferences';
import type {JourneyProfile} from '../storage/journeyProfile';
import {DiscoveryOfferQueue,markFilmOffered} from '../cinema/discoveryOffers';
import {creatureFilm} from '../cinema/creatureFilms';
import {EvolutionPanel,EvolutionReveal} from './EvolutionPanel';
import {EndingScreen} from './EndingScreen';
import {GameplayGuidance} from './GameplayGuidance';
import {CaptureFeedback,guidanceGoals} from './gameGuidance';
import {KEEPSAKES} from '../campaign/journeyMastery';
import type {ExternalSoundCue} from '../audio/useSoundscape';
import {GameFeel} from '../rendering/gameFeel';

function Button({label,onPress,disabled=false,quiet=false,fill=false}:{label:string;onPress:()=>void;disabled?:boolean;quiet?:boolean;fill?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[styles.button,fill&&styles.pauseAction,quiet&&styles.quietButton,(pressed||disabled)&&styles.dim]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const timeLeft=(seconds:number)=>{const left=Math.ceil(Math.max(0,seconds));return `${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;};
interface GameScreenProps{
  session:JourneySession;onSave:(session:JourneySession)=>void;onInterrupted:(session:JourneySession)=>void;
  onHome:()=>void;onNewJourney:()=>void;onRetrySave:()=>void;onRetryProfile:()=>void;
  saving:boolean;saveError:string;profileNotice:string;recoveryNotice:string;busy:boolean;
  preferences:Readonly<Preferences>;profile:JourneyProfile;onProfileChange:(update:(profile:JourneyProfile)=>JourneyProfile)=>void;
  onJournal:()=>void;onPond:()=>void;onSettings:()=>void;onWatch:(speciesId:string)=>void;
  onSoundCue:(cue:ExternalSoundCue)=>void;
}
export function GameScreen({session,onSave,onInterrupted,onHome,onNewJourney,onRetrySave,onRetryProfile,
  saving,saveError,profileNotice,recoveryNotice,busy,preferences,profile,onProfileChange,onJournal,onPond,onSettings,onWatch,onSoundCue}:GameScreenProps){
  const [,setRevision]=useState(0),[width,setWidth]=useState(0),[appActive,setAppActive]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
  const [evolutionReveal,setEvolutionReveal]=useState<string|undefined>();
  const activeRef=useRef(appActive);
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  const run=session.current,touch=useMemo(()=>new TouchController(run),[run]);
  useEffect(()=>{touch.configure(preferences);},[touch,preferences.clickMode,preferences.assistedClosure]);
  const tracers=useMemo(()=>new WaterTracers(),[run]);
  const feedback=useMemo(()=>new CaptureFeedback(),[run]);
  const updateFeedback=useCallback((delta:number)=>{
    const serial=feedback.warningSerial;feedback.observe(run,delta);
    if(feedback.warningSerial!==serial)onSoundCue({name:'warning',gain:.35,pitch:1});
  },[feedback,run,onSoundCue]);
  const [feel]=useState(()=>new GameFeel());
  const updateFeel=useCallback((delta:number)=>{
    feel.update(run,delta,{reducedMotion:preferences.reducedMotion,quality:preferences.visualQuality,journeyComplete:session.finished,encounterTotal:session.route.length});
    for(const cue of feel.drainCues())onSoundCue(cue);
  },[feel,run,preferences.reducedMotion,preferences.visualQuality,session,onSoundCue]);
  useEffect(()=>{updateFeel(0);},[updateFeel]);
  const [discoveryOffers]=useState(()=>new DiscoveryOfferQueue());
  const discoveryProfile=useRef(profile);discoveryProfile.current=profile;
  const observed=useRef({run,state:run.state});
  if(observed.current.run!==run)observed.current={run,state:run.state};
  const observeState=useCallback(()=>{
    session.observeCompletion();
    if(observed.current.state!==run.state){observed.current.state=run.state;onSave(session);}
  },[session,run,onSave]);
  const interaction=useCallback(()=>{updateFeedback(0);observeState();updateFeel(0);refresh();},[updateFeedback,observeState,updateFeel,refresh]);
  const running=appActive&&run.state!=='paused';
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',state=>{
      const active=state==='active';
      if(!active&&activeRef.current){
        touch.cancel();if(run.state==='active')run.togglePause();observed.current.state=run.state;onInterrupted(session);
      }
      activeRef.current=active;setAppActive(active);refresh();
    });return()=>subscription.remove();
  },[run,touch,session,onInterrupted,refresh]);
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(evolutionReveal){setEvolutionReveal(undefined);return true;}
      touch.cancel();
      if(run.state==='active'){run.togglePause();observed.current.state=run.state;onSave(session);refresh();}
      else onHome();
      return true;
    });return()=>handler.remove();
  },[run,touch,session,onSave,onHome,refresh,evolutionReveal]);
  useEffect(()=>{
    if(!running)return;
    const clock=new SimulationClock();let frame=0,lastRender=-Infinity,cancelled=false;
    const tick=(now:number)=>{
      if(cancelled)return;clock.advance(now,true,delta=>{
        const pace=preferences.deliberateCapture&&run.state==='active'&&run.selection.closed ? .35 : 1;
        session.update(delta*pace);updateFeedback(delta);updateFeel(delta);
      });observeState();
      if(now-lastRender>=1000/30){
        const offers=discoveryOffers.poll(run,discoveryProfile.current);
        if(offers.length)onProfileChange(current=>markFilmOffered(current,offers));
        tracers.sync(run.fluid.clock,preferences.reducedMotion?0:1,run.fluid,{key:`${session.seed}:${session.index}`,dustSeed:session.seed^session.index},preferences.visualQuality);
        lastRender=now;refresh();
      }
      const aftermath=run.clots.length||run.motherDamage.active()||run.amoebas.releases.length||run.phages.bursts.length;
      if(['complete','loss'].includes(run.state)&&!aftermath&&session.progressionReady){refresh();return;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>{cancelled=true;cancelAnimationFrame(frame);clock.reset();};
  },[run,running,session,tracers,updateFeedback,updateFeel,refresh,observeState,preferences.deliberateCapture,preferences.reducedMotion,preferences.visualQuality,discoveryOffers,onProfileChange]);
  const changed=()=>{observed.current={run:session.current,state:session.current.state};onSave(session);refresh();};
  const pause=()=>{touch.cancel();run.togglePause();changed();};
  const advance=(id:string)=>{touch.cancel();if(session.chooseEvolution(id)){if(id!=='continue'&&id!=='repair')setEvolutionReveal(id);changed();}};
  const home=()=>{touch.cancel();onHome();};
  const dish=dishForStage(run.stageIndex),spec=run.harvest.spec,harvest=run.harvest,boss=run.boss();
  const lesson=run.lessonActive()?run.lesson.instruction(run):undefined;
  const growth=run.growthSlot();
  const habitatPending=habitatChoicePending(run);
  const pendingDiscovery=discoveryOffers.pendingIds[0];
  const progressTarget=spec.mode==='feed'?(harvest.hunterQuota()||spec.food):spec.target;
  const saveNeedsAttention=saveError!==''||profileNotice!=='';
  const sidebarWidth=Math.max(160,Math.min(208,width*0.23));
  if(evolutionReveal)return <EvolutionReveal session={session} traitId={evolutionReveal} reducedMotion={preferences.reducedMotion} onDismiss={()=>setEvolutionReveal(undefined)}/>;
  if(session.finished&&session.progressionReady)return <EndingScreen session={session} profile={profile} preferences={preferences}
    onPond={onPond} onJournal={onJournal} onNewJourney={onNewJourney} onHome={home} busy={busy} saving={saving}
    error={saveError||profileNotice} onRetrySave={saveError?onRetrySave:onRetryProfile}/>;
  return <View style={styles.root} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
    <View style={styles.main}>
      <View style={[styles.sidebar,{width:sidebarWidth}]}>
        <View style={styles.sideHeader}>
          <Text style={styles.brand}>PETRIVERSE</Text>
          <View style={styles.pauseSlot}>
            {(run.state==='active'||run.state==='paused')&&<Pressable accessibilityRole="button"
              accessibilityLabel={run.state==='paused'?'Resume':'Pause'}
              accessibilityHint={saveNeedsAttention?'Save needs attention. Open the pause menu for details.':undefined}
              onPress={pause} style={({pressed})=>[styles.pauseButton,pressed&&styles.dim]}>
              <Text style={styles.buttonText}>{run.state==='paused'?'Resume':'Pause'}</Text>
              {saveNeedsAttention&&<View pointerEvents="none" style={styles.saveIndicator}><Text style={styles.saveIndicatorText}>!</Text></View>}
            </Pressable>}
          </View>
        </View>
        <ScrollView style={styles.sideScroll} contentContainerStyle={styles.sideContent}>
          <Text style={styles.subtitle}>{dish.name} · {session.index+1} / {session.route.length}</Text>
          <Text style={styles.encounterName}>{spec.name}</Text>
          <View style={styles.metrics}>
            <View style={styles.metric}><Text style={styles.label}>MOTHER</Text><Text style={styles.value}>{run.integrity} / {run.maxIntegrity}</Text></View>
            <View style={styles.metric}><Text style={styles.label}>{spec.mode==='boss'?'PULSE FOOD':'FOOD'}</Text><Text style={styles.value}>{harvest.nourishment} / {spec.mode==='boss'?3:spec.food}</Text></View>
          </View>
          {spec.mode!=='feed'||harvest.hunterQuota()>0?<Text style={styles.detail}>{harvest.objectiveCount()} / {progressTarget} {harvest.objectiveLabel()}</Text>:null}
          <Text style={styles.timer}>{lesson?'Take your time':`${timeLeft(harvest.deadline()-run.stageElapsed)} left`}</Text>
          {(run.state==='complete'||run.state==='loss')&&!session.progressionReady&&<Text style={styles.notice}>{run.state==='complete'?'Your colony is settling…':'The pond grows quiet…'}</Text>}
          {run.state==='active'&&<>
            {run.selection.active&&<>{preferences.clickMode&&<Button label="Capture" disabled={!run.selection.closed} onPress={()=>{touch.captureSelection();interaction();}}/>}
              <Button label="Cancel loop" quiet onPress={()=>{touch.cancel();refresh();}}/></>}
            {run.nudge.targetId>=0&&<Button label="Cancel nudge" quiet onPress={()=>{touch.cancel();refresh();}}/>}
            <GameplayGuidance run={run} clickMode={preferences.clickMode} feedback={feedback}/>
          </>}
          {run.state==='active'&&pendingDiscovery&&!run.selection.active&&run.nudge.targetId<0&&<View style={styles.guidance}>
            <Text style={styles.guideTitle}>New discovery · {creatureFilm(pendingDiscovery)?.name}</Text>
            <Button label="Watch discovery" onPress={()=>{const id=discoveryOffers.takeNext();if(id){touch.cancel();onWatch(id);}}}/>
            <Button label="Later" quiet onPress={()=>{discoveryOffers.later();refresh();}}/>
          </View>}
          <Text style={styles.detail}>{run.growthActive('guard')>0?`${Math.max(0,run.growthActive('guard')-run.guardianSpent)} guard ready`:dish.subtitle}</Text>
          <Text style={styles.detail}>Food saved {feel.shown('biomass',run.biomass)} · Score {feel.shown('score',run.score)}</Text>
          {run.mutations.length>0&&<Text style={styles.detail}>{run.mutations.map(id=>mutationDefinition(id)?.name??id).join('\n')}</Text>}
          {boss instanceof JourneyBoss&&<Text style={styles.notice}>{boss.statusText()}</Text>}
          <Text style={styles.label}>NUDGE</Text><Text style={styles.detail}>{run.nudge.cooldown>0?`Ready in ${Math.ceil(run.nudge.cooldown)}s`:preferences.clickMode?'Tap a purple cyst, then tap its destination.':'Drag a purple cyst aside'}</Text>
          <Text style={styles.cameraHint}>Pinch to zoom. Move two fingers to look around. Fit shows the whole dish.</Text>
        </ScrollView>
      </View>
      <View style={styles.play}>
        <EncounterView run={run} touch={touch} tracers={tracers} feel={feel} onInteraction={interaction}
          reducedMotion={preferences.reducedMotion} highContrast={preferences.highContrast} visualQuality={preferences.visualQuality}/>
      </View>
      {run.state!=='active'&&(!['complete','loss'].includes(run.state)||session.progressionReady)&&<View style={styles.overlay}>
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent}>
          {run.state==='brief'&&<>
            <Text style={styles.eyebrow}>{dish.name.toUpperCase()}</Text>
            <Text style={styles.title}>{spec.name}</Text><Text style={styles.body}>{spec.lesson}</Text>
            {guidanceGoals(run).map(goal=><Text key={goal} style={styles.detail}>{goal}</Text>)}
            {growth>=0&&<>
              <Text style={styles.body}>A new organelle is growing. Choose how it helps your colony.</Text>
              <View style={styles.row}>
                <Button label="Guard: blocks one hunter" onPress={()=>{run.chooseGrowthRole('guard');changed();}}/>
                <Button label="Feeder: rewards large meals" onPress={()=>{run.chooseGrowthRole('feeder');changed();}}/>
              </View>
            </>}
            {growth<0&&run.stageIndex===2&&run.growthRoles[1]&&<Text style={styles.detail}>New organelle: {run.growthRoles[1]}</Text>}
            {growth<0&&run.stageIndex===8&&run.growthRoles[5]&&<Text style={styles.detail}>New organelle: {run.growthRoles[5]}</Text>}
            {growth<0&&habitatPending&&<>
              <Text style={styles.title}>Choose your habitat</Text><Text style={styles.body}>Where will your colony feed next?</Text>
              <View style={styles.offers}>{habitatOptions(run).map(option=><View key={option.id} style={styles.offer}>
                <Text style={styles.encounterName}>{option.name}</Text>{option.bullets.map(bullet=><Text key={bullet} style={styles.body}>{bullet}</Text>)}
                <Button label={option.action} onPress={()=>{if(session.chooseHabitat(option.id))changed();}}/>
              </View>)}</View>
            </>}
            {growth<0&&!habitatPending&&<>
              {run.stageIndex>=2&&run.stageIndex%4!==3&&run.habitatContentEnabled&&<Text style={styles.notice}>{habitatName(run.stageIndex,run.habitatChoice)}</Text>}
              <Button label={session.index===0?'Begin the journey':'Enter the water'} onPress={()=>{session.begin();changed();}}/>
            </>}
            {session.index===0&&<Text style={styles.detail}>{preferences.clickMode?'Tap blue cells to build a loop. Tap the first cell, then Capture.':'Drag between blue cells to draw a loop. Return to the first cell and release.'}</Text>}
          </>}
          {run.state==='paused'&&<>
            <Text style={styles.title}>The pond can wait.</Text><Text style={styles.body}>Your colony is resting.</Text>
            {recoveryNotice!==''&&<Text style={styles.notice}>{recoveryNotice}</Text>}
            <View style={styles.pauseActions}>
              <Button label="Resume" onPress={pause} fill/>
              <Button label="Return to title" onPress={home} disabled={busy} quiet fill/>
              <Button label="Field journal" onPress={onJournal} quiet fill/>
              <Button label="Home pond" onPress={onPond} quiet fill/>
              <Button label="Settings" onPress={onSettings} quiet fill/>
            </View>
            <Text style={styles.credits}>Petriverse by Marco van Hylckama Vlieg{`\n`}Mobile adaptation by Henri Hubert / AI Engineer Hub{`\n`}Original game and artwork: CC BY-NC 4.0</Text>
          </>}
          {run.state==='loss'&&<>
            <Text style={styles.title}>{harvest.lossTitle}</Text><Text style={styles.body}>{harvest.lossReason}</Text>
            <Button label="Retry this encounter" onPress={()=>{touch.cancel();session.retry();changed();}}/>
            <Text style={styles.detail}>Return with the colony and food you brought into this encounter.</Text>
          </>}
          {run.state==='complete'&&<>
            <Text style={styles.eyebrow}>{session.finished?'JOURNEY COMPLETE':'ENCOUNTER COMPLETE'}</Text>
            <Text style={styles.title}>{session.finished?'A little universe, alive.':'Your colony is growing.'}</Text>
            <Text style={styles.body}>Score {run.score} · {run.biomass} food saved{session.finished?` · ${run.totalRescued} spores rescued`:''}</Text>
            <Text style={styles.detail}>Health bonus +{run.stageBonus.health} · Swift finish +{run.stageBonus.swift} · Best flow {run.stageBonus.flow}</Text>
            {run.masteryAwards.length>0&&<Text style={styles.notice}>{run.masteryAwards.map(award=>KEEPSAKES[award.id]).join(' · ')}</Text>}
            {!session.finished&&<>
              <EvolutionPanel session={session} onChoose={advance} reducedMotion={preferences.reducedMotion}/>
            </>}
            {session.finished&&<Text style={styles.body}>Your colony is arriving home…</Text>}
          </>}
          {run.state!=='paused'&&<>
            <View style={styles.row}><Button label="Field journal" onPress={onJournal} quiet/><Button label="Home pond" onPress={onPond} quiet/><Button label="Settings" onPress={onSettings} quiet/></View>
            <View style={styles.row}><Button label="Return to title" onPress={home} disabled={busy} quiet/></View>
          </>}
          {saveError!==''&&<>
            <Text accessibilityLiveRegion="polite" style={styles.saveError}>{saveError}</Text>
            <Button label="Try saving again" onPress={onRetrySave} disabled={busy} quiet/>
          </>}
          {profileNotice!==''&&<><Text style={styles.notice}>{profileNotice}</Text><Button label="Retry profile" onPress={onRetryProfile} disabled={busy} quiet/></>}
        </ScrollView>
      </View>}
    </View>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#06171c'},main:{flex:1,flexDirection:'row'},
  sidebar:{flexGrow:0,flexShrink:0,paddingTop:8},sideHeader:{paddingHorizontal:12,gap:4},sideScroll:{flex:1},sideContent:{paddingHorizontal:12,paddingTop:8,paddingBottom:12,gap:6},
  brand:{color:'#e1eee4',fontSize:13,fontWeight:'600',letterSpacing:2},subtitle:{color:'#91adae',fontSize:10,lineHeight:14},encounterName:{color:'#dceae0',fontSize:15,fontWeight:'600'},
  pauseSlot:{height:44,marginVertical:2},pauseButton:{height:44,justifyContent:'center',alignItems:'center',backgroundColor:'#112b30',borderColor:'#34585e',borderWidth:1,borderRadius:10},
  saveIndicator:{position:'absolute',right:10,top:13,width:18,height:18,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'#f0c1ac'},saveIndicatorText:{color:'#112b30',fontSize:12,lineHeight:16,fontWeight:'700'},
  metrics:{flexDirection:'row',gap:8},metric:{flex:1},label:{color:'#86a5a7',fontSize:9,letterSpacing:1,marginTop:3},value:{color:'#c8dda4',fontSize:20,fontWeight:'500'},timer:{color:'#d8e7d8',fontSize:12,lineHeight:17,fontWeight:'500'},
  detail:{color:'#9bb6b4',fontSize:11,lineHeight:15},notice:{color:'#dbc899',fontSize:11,lineHeight:16,marginTop:6},
  play:{flex:1,minWidth:0},guidance:{gap:3,backgroundColor:'#10272c',borderRadius:8,padding:8},guideTitle:{color:'#d8e7d8',fontSize:12,fontWeight:'500'},guideDetail:{color:'#9bb6b4',fontSize:11,lineHeight:15},cameraHint:{color:'#87a5a5',fontSize:10,lineHeight:14,marginTop:6},
  overlay:{...StyleSheet.absoluteFill,backgroundColor:'#041015c9',alignItems:'center',justifyContent:'center',padding:10},card:{flexGrow:0,maxHeight:'100%',width:'94%',maxWidth:640,backgroundColor:'#0c242b',borderColor:'#2c5055',borderWidth:1,borderRadius:18},cardContent:{padding:20,gap:10},
  eyebrow:{fontSize:10,color:'#9ac8c2',letterSpacing:2},title:{color:'#e3eee4',fontSize:24,fontWeight:'500'},body:{color:'#c0d3ce',fontSize:13,lineHeight:19},
  button:{minHeight:44,paddingHorizontal:16,paddingVertical:12,alignItems:'center',justifyContent:'center',backgroundColor:'#325f5b',borderRadius:10,borderWidth:1,borderColor:'#59857b'},quietButton:{backgroundColor:'#112b30',borderColor:'#34585e'},buttonText:{color:'#e0eee0',fontSize:12,fontWeight:'600',textAlign:'center'},dim:{opacity:0.45},
  pauseActions:{flexDirection:'row',gap:8},pauseAction:{flex:1,minWidth:0,paddingHorizontal:6},
  row:{flexDirection:'row',flexWrap:'wrap',gap:10},offers:{flexDirection:'row',flexWrap:'wrap',gap:10},offer:{flexGrow:1,flexBasis:165,gap:8,backgroundColor:'#102e34',padding:12,borderRadius:10},credits:{color:'#87a5a5',fontSize:11,lineHeight:17,marginTop:12},
  saveError:{color:'#f0c1ac',fontSize:12,lineHeight:17},
});
