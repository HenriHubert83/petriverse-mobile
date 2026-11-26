import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,BackHandler,ScrollView,StyleSheet,View} from 'react-native';
import {Circle,Group,Path} from '@shopify/react-native-skia';
import {AppearanceProvider,AppPressable as Pressable,AppText as Text} from './AccessibleText';
import {ProducerLab,EXPERIMENTS} from '../experiments/producerLab';
import {BROOD_SAFE_NEEDED,CURRENT_GOAL,currentLayout,escortArc} from '../experiments/producerLabRules';
import type {Point} from '../geometry/loopGeometry';
import {EncounterView} from '../rendering/EncounterView';
import {WaterTracers} from '../rendering/waterTracers';
import {GameFeel} from '../rendering/gameFeel';
import {TouchController} from './touchController';
import {SimulationClock} from './simulationClock';
import {DEFAULT_PREFERENCES} from '../settings/preferences';
import type {Preferences} from '../settings/preferences';
import {useSoundscape} from '../audio/useSoundscape';

export interface ExperimentsScreenProps {onBack:()=>void;preferences?:Readonly<Preferences>}
const path=(points:readonly Point[])=>points.length?`M ${points.map(point=>`${point.x} ${point.y}`).join(' L ')}`:'';
function Button({label,onPress,disabled=false,quiet=false}:{label:string;onPress:()=>void;disabled?:boolean;quiet?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[styles.button,quiet&&styles.quiet,(pressed||disabled)&&styles.dim]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
function LabOverlay({lab,reducedMotion}:{lab:ProducerLab;reducedMotion:boolean}){
  const center=lab.run.board.center,time=reducedMotion?0:lab.elapsed;
  if(lab.experiment===1){
    const arc=escortArc(center),goal=arc[arc.length-1];
    return <Group><Path path={path(arc)} style="stroke" strokeWidth={3} color="#8ce6d9" opacity={0.5}/>
      <Circle cx={goal.x} cy={goal.y} r={16} color="#99ffcc" opacity={0.35}/><Circle cx={goal.x} cy={goal.y} r={16} style="stroke" strokeWidth={2} color="#ccffe5"/>
      {lab.broods.map(brood=><Circle key={brood.body.id} cx={brood.body.nucleus.x} cy={brood.body.nucleus.y} r={18} style="stroke" strokeWidth={1.6} color="#ccffe5" opacity={0.7}/>)}
      {lab.hunterSchedule.filter(event=>event.warned&&!event.spawned).map(event=><Circle key={event.at} cx={event.position.x} cy={event.position.y}
        r={14+4*Math.sin(time*6)} style="stroke" strokeWidth={3} color="#ff8066" opacity={0.8}/>)}</Group>;
  }
  if(lab.experiment===2&&lab.currentChoice){
    const layout=currentLayout(lab.currentChoice,center);
    if(lab.currentChoice==='channel')return <Group>{Array.from({length:7},(_,i)=>{
      const x=center.x-270+i*88,y=layout.laneY;
      return <Path key={i} path={`M ${x} ${y} L ${x+42} ${y} M ${x+30} ${y-7} L ${x+42} ${y} L ${x+30} ${y+7}`} style="stroke" strokeWidth={3} color="#80d9ff" opacity={0.8}/>;
    })}</Group>;
    return <Group>{layout.pockets.map((p,i)=><Path key={i} path={path(Array.from({length:25},(_,n)=>{
      const angle=0.3+time*0.4+1.9*n/24;return {x:p.x+62*Math.cos(angle),y:p.y+62*Math.sin(angle)};
    }))} style="stroke" strokeWidth={3} color="#80e6cc" opacity={0.7}/>)}</Group>;
  }
  if(lab.experiment===3&&lab.bossRef&&lab.bossPhase.phaseBroken)return <Circle cx={lab.bossRef.nucleus.x} cy={lab.bossRef.nucleus.y}
    r={58} style="stroke" strokeWidth={4} color="#ff7359" opacity={0.9}/>;
  return null;
}

export function ExperimentsScreen({onBack,preferences=DEFAULT_PREFERENCES}:ExperimentsScreenProps){
  const [lab]=useState(()=>new ProducerLab()),[,setRevision]=useState(0),[active,setActive]=useState(AppState.currentState==='active');
  const [feel]=useState(()=>new GameFeel());
  const activeRef=useRef(active),refresh=useCallback(()=>setRevision(value=>value+1),[]);
  const run=lab.run,touch=useMemo(()=>new TouchController(run),[run]),tracers=useMemo(()=>new WaterTracers(),[run]);
  const {uiPress,playCue}=useSoundscape(lab.phase==='menu'?undefined:run,preferences,{enabled:true});
  const feedback=useCallback((delta:number)=>{
    feel.update(lab.run,delta,{reducedMotion:preferences.reducedMotion,quality:preferences.visualQuality,announce:false});
    for(const cue of feel.drainCues())playCue(cue);
  },[feel,lab,preferences.reducedMotion,preferences.visualQuality,playCue]);
  useEffect(()=>{feedback(0);},[feedback,run]);
  useEffect(()=>{touch.configure(preferences);},[touch,preferences.clickMode,preferences.assistedClosure]);
  const interact=useCallback(()=>{lab.observe();feedback(0);refresh();},[lab,feedback,refresh]);
  const action=(perform:()=>void)=>{touch.cancel();perform();refresh();};
  useEffect(()=>{
    const listener=AppState.addEventListener('change',state=>{
      const foreground=state==='active';if(!foreground&&activeRef.current){touch.cancel();lab.interrupt();}
      activeRef.current=foreground;setActive(foreground);refresh();
    });return()=>listener.remove();
  },[lab,touch,refresh]);
  useEffect(()=>{
    const listener=BackHandler.addEventListener('hardwareBackPress',()=>{
      touch.cancel();if(lab.phase==='playing'&&run.state==='active')lab.pause();else if(lab.phase==='menu')onBack();else lab.showMenu();refresh();return true;
    });return()=>listener.remove();
  },[lab,run,touch,onBack,refresh]);
  const running=active&&lab.phase==='playing'&&run.state==='active';
  useEffect(()=>{
    if(!running)return;
    const clock=new SimulationClock();let frame=0,lastRender=-Infinity,disposed=false;
    const tick=(now:number)=>{
      if(disposed)return;
      clock.advance(now,true,delta=>{lab.update(delta*(preferences.deliberateCapture&&run.selection.closed?0.35:1));feedback(delta);});
      if(now-lastRender>=1000/30){
        tracers.sync(run.fluid.clock,preferences.reducedMotion?0:1,run.fluid,{key:`lab:${lab.experiment}`,dustSeed:lab.seed},preferences.visualQuality);
        lastRender=now;refresh();
      }
      if(lab.phase==='playing'&&run.state==='active')frame=requestAnimationFrame(tick);else refresh();
    };frame=requestAnimationFrame(tick);
    return()=>{disposed=true;cancelAnimationFrame(frame);clock.reset();};
  },[lab,run,running,tracers,feedback,refresh,preferences.deliberateCapture,preferences.reducedMotion,preferences.visualQuality]);
  const leave=()=>action(onBack),menu=()=>action(()=>lab.showMenu());
  if(lab.phase==='menu')return <AppearanceProvider value={preferences} onPressSound={uiPress}><View style={styles.root}><ScrollView contentContainerStyle={styles.menu}>
    <Text style={styles.eyebrow}>EXPERIMENTS · PRODUCER LAB</Text><Text style={styles.title}>Choose an experiment</Text>
    <Text style={styles.body}>Practice three small challenges in their own dish.</Text>
    {EXPERIMENTS.map(experiment=><View key={experiment.id} style={styles.experiment}>
      <Text style={styles.heading}>{experiment.id} · {experiment.title}</Text><Text style={styles.body}>{experiment.detail}</Text>
      <Button label={`Try ${experiment.title}`} onPress={()=>action(()=>lab.selectExperiment(experiment.id))}/>
    </View>)}<Button label="Return to title" onPress={leave} quiet/>
  </ScrollView></View></AppearanceProvider>;
  const status=lab.experiment===1?`Safe ${lab.escort.safeCount()}/${BROOD_SAFE_NEEDED} · arrived ${lab.escort.arrived} · rescued ${lab.escort.rescued} · lost ${lab.escort.lost}`:
    lab.experiment===2?`Food ${run.harvest.nourishment}/${CURRENT_GOAL}`:`Regent health ${lab.bossPhase.health} · charge ${run.harvest.nourishment}/3`;
  const meal=run.selection.canClose()?run.harvestPreview():undefined;
  return <AppearanceProvider value={preferences} onPressSound={uiPress}><View style={styles.root}><View style={styles.main}>
    <View style={styles.sidebar}><ScrollView contentContainerStyle={styles.sidebarContent}>
      <Text style={styles.eyebrow}>PRODUCER LAB</Text><Text style={styles.heading}>{lab.definition?.title}</Text>
      <Text style={styles.status}>{status}</Text><Text style={styles.status}>Mother {run.integrity}/5 · {Math.ceil(lab.remaining)}s</Text>
      {lab.experiment===3&&<Text style={styles.notice}>{lab.bossPhase.phaseBroken?'SHELL BROKEN':'Shell intact'}</Text>}
      {lab.phase==='playing'&&!lab.paused&&<Button label="Pause" onPress={()=>action(()=>lab.pause())}/>}
      <Text accessibilityLiveRegion="polite" style={styles.body}>{run.selection.rejectionReason||lab.feedback}</Text>
      {meal&&<Text style={styles.notice}>{meal.food} food · {meal.threats} hunters · {meal.rescued} rescued{meal.bossLayers>0?` · ${meal.bossLayers} Regent hit`:''}{meal.poison>0?` · ${meal.poison} poison, Mother ${Math.max(0,run.integrity-meal.poison)}/5`:' · Clean loop'}</Text>}
      {preferences.clickMode&&run.selection.active&&<><Button label="Capture" disabled={!run.selection.closed} onPress={()=>{touch.captureSelection();interact();}}/>
        <Button label="Cancel loop" quiet onPress={()=>action(()=>{})}/></>}
      <Text style={styles.detail}>{preferences.clickMode?'Tap blue cells, then tap the first cell to close your loop. Tap Capture.':'Draw through blue cells, return to the first cell, then release.'}</Text>
      <Text style={styles.detail}>{run.nudge.cooldown>0?`Nudge ready in ${Math.ceil(run.nudge.cooldown)}s`:preferences.clickMode?'Tap a cyst, then its destination to nudge it.':'Drag a cyst aside to nudge it.'}</Text>
      {preferences.clickMode&&run.nudge.targetId>=0&&<Button label="Cancel nudge" quiet onPress={()=>action(()=>{})}/>}
      <Text style={styles.detail}>Pinch to zoom. Move two fingers to look around.</Text>
    </ScrollView></View>
    <View style={styles.play}><EncounterView run={run} touch={touch} tracers={tracers} feel={feel} onInteraction={interact}
      reducedMotion={preferences.reducedMotion} highContrast={preferences.highContrast} visualQuality={preferences.visualQuality}>
      <LabOverlay lab={lab} reducedMotion={preferences.reducedMotion}/>
    </EncounterView></View>
    {(lab.phase!=='playing'||lab.paused)&&<View style={styles.overlay}><ScrollView style={styles.card} contentContainerStyle={styles.cardContent}>
      <Text style={styles.eyebrow}>EXPERIMENT {lab.experiment}</Text><Text style={styles.title}>{lab.definition?.title}</Text>
      {lab.phase==='choice'?<>
        <Text style={styles.body}>Both currents need 8 food in 75 seconds. Mother and her blue cells keep their own motion.</Text>
        <View style={styles.experiment}><Text style={styles.heading}>Fast channel</Text><Text style={styles.body}>Food rides a fast lane; purple cysts wait just below it.</Text>
          <Button label="Take the fast channel" onPress={()=>action(()=>{lab.chooseCurrent('channel');})}/></View>
        <View style={styles.experiment}><Text style={styles.heading}>Sheltered eddy</Text><Text style={styles.body}>Three small safe pockets in slow eddies; cysts far below.</Text>
          <Button label="Take the sheltered eddy" onPress={()=>action(()=>{lab.chooseCurrent('shelter');})}/></View>
      </>:lab.phase==='brief'?<>
        {lab.definition?.instructions.map(instruction=><Text key={instruction} style={styles.body}>{instruction}</Text>)}
        {lab.currentChoice&&<Text style={styles.notice}>{lab.feedback}</Text>}
        <Button label="Start experiment" onPress={()=>action(()=>{lab.begin();})}/>
      </>:lab.phase==='won'||lab.phase==='lost'?<>
        <Text style={styles.heading}>{lab.phase==='won'?'Success':'Try again'}</Text><Text style={styles.body}>{lab.feedback}</Text>
        <Button label="Retry experiment" onPress={()=>action(()=>lab.retry())}/>
      </>:<><Text style={styles.body}>The experiment is paused.</Text><Button label="Resume" onPress={()=>action(()=>lab.pause())}/><Button label="Retry experiment" onPress={()=>action(()=>lab.retry())} quiet/></>}
      <View style={styles.row}><Button label="Experiments menu" onPress={menu} quiet/><Button label="Return to title" onPress={leave} quiet/></View>
    </ScrollView></View>}
  </View></View></AppearanceProvider>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#06171c'},main:{flex:1,flexDirection:'row'},menu:{padding:24,gap:14,width:'100%',maxWidth:760,alignSelf:'center'},
  eyebrow:{color:'#9ac8c2',fontSize:10,letterSpacing:1.6},title:{color:'#e3eee4',fontSize:26,fontWeight:'600'},heading:{color:'#dceae0',fontSize:18,fontWeight:'600'},
  body:{color:'#c0d3ce',fontSize:14,lineHeight:21},detail:{color:'#9bb6b4',fontSize:12,lineHeight:18},status:{color:'#c8dda4',fontSize:16,lineHeight:23},notice:{color:'#dbc899',fontSize:13,lineHeight:20},
  experiment:{gap:10,padding:16,backgroundColor:'#102e34',borderRadius:12,borderWidth:1,borderColor:'#34585e'},
  button:{minHeight:44,paddingHorizontal:14,paddingVertical:12,alignItems:'center',justifyContent:'center',backgroundColor:'#325f5b',borderRadius:10,borderWidth:1,borderColor:'#59857b'},
  quiet:{backgroundColor:'#112b30',borderColor:'#34585e'},buttonText:{color:'#e0eee0',fontSize:14,fontWeight:'600'},dim:{opacity:0.45},
  sidebar:{width:'24%',minWidth:160,maxWidth:230},sidebarContent:{padding:12,gap:10},play:{flex:1,minWidth:0},
  overlay:{...StyleSheet.absoluteFill,backgroundColor:'#041015ce',alignItems:'center',justifyContent:'center',padding:12},
  card:{flexGrow:0,maxHeight:'100%',width:'96%',maxWidth:680,backgroundColor:'#0c242b',borderWidth:1,borderColor:'#2c5055',borderRadius:18},cardContent:{padding:20,gap:14},row:{flexDirection:'row',flexWrap:'wrap',gap:10},
});
