import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {AppState,BackHandler,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {JourneySession} from '../campaign/journeySession';
import {dishForStage} from '../campaign/journeyPlan';
import {JourneyBoss} from '../campaign/journeyBoss';
import {mutationDefinition} from '../evolution/mutations';
import {EncounterView} from '../rendering/EncounterView';
import {WaterTracers} from '../rendering/waterTracers';
import {SimulationClock} from './simulationClock';
import {TouchController} from './touchController';

function Button({label,onPress,disabled=false,quiet=false}:{label:string;onPress:()=>void;disabled?:boolean;quiet?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[styles.button,quiet&&styles.quietButton,(pressed||disabled)&&styles.dim]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const timeLeft=(seconds:number)=>{const left=Math.ceil(Math.max(0,seconds));return `${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;};
export function GameScreen(){
  const [session,setSession]=useState(()=>new JourneySession(Date.now()>>>0));
  const [,setRevision]=useState(0),[appActive,setAppActive]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  const run=session.current,touch=useMemo(()=>new TouchController(run),[run]);
  const tracers=useMemo(()=>new WaterTracers(),[run]);
  const interaction=useCallback(()=>{session.observeCompletion();refresh();},[session,refresh]);
  const running=appActive&&run.state!=='paused';
  useEffect(()=>{
    const subscription=AppState.addEventListener('change',state=>{
      if(state!=='active'){touch.cancel();if(run.state==='active')run.togglePause();}
      setAppActive(state==='active');refresh();
    });return()=>subscription.remove();
  },[run,touch,refresh]);
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(run.state!=='active')return false;touch.cancel();run.togglePause();refresh();return true;
    });return()=>handler.remove();
  },[run,touch,refresh]);
  useEffect(()=>{
    if(!running)return;
    const clock=new SimulationClock();let frame=0,lastRender=-Infinity,cancelled=false;
    const tick=(now:number)=>{
      if(cancelled)return;clock.advance(now,true,delta=>session.update(delta));
      if(now-lastRender>=1000/30){
        tracers.sync(run.fluid.clock,1,run.fluid,{key:`${session.seed}:${session.index}`,dustSeed:session.seed^session.index},0);
        lastRender=now;refresh();
      }
      const aftermath=run.clots.length||run.motherDamage.active()||run.amoebas.releases.length||run.phages.bursts.length;
      if(['complete','loss'].includes(run.state)&&!aftermath){refresh();return;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>{cancelled=true;cancelAnimationFrame(frame);clock.reset();};
  },[run,running,session,tracers,refresh]);
  const pause=()=>{touch.cancel();run.togglePause();refresh();};
  const advance=(id:string)=>{touch.cancel();if(session.chooseEvolution(id))refresh();};
  const dish=dishForStage(run.stageIndex),spec=run.harvest.spec,harvest=run.harvest,boss=run.boss();
  const lesson=run.lessonActive()?run.lesson.instruction(run):undefined,event=harvest.events.sample(run);
  const growth=run.growthSlot();
  const progressTarget=spec.mode==='feed'?(harvest.hunterQuota()||spec.food):spec.target;
  return <View style={styles.root}>
    <View style={styles.header}>
      <View><Text style={styles.brand}>PETRIVERSE</Text><Text style={styles.subtitle}>{dish.name} · Encounter {session.index+1} of {session.route.length}</Text></View>
      {(run.state==='active'||run.state==='paused')&&<Button label={run.state==='paused'?'Resume':'Pause'} onPress={pause} quiet/>}
    </View>
    <View style={styles.main}>
      <ScrollView style={styles.sidebar} contentContainerStyle={styles.sideContent}>
        <Text style={styles.encounterName}>{spec.name}</Text>
        <Text style={styles.label}>MOTHER</Text><Text style={styles.value}>{run.integrity} / {run.maxIntegrity}</Text>
        <Text style={styles.detail}>{run.growthActive('guard')>0?`${Math.max(0,run.growthActive('guard')-run.guardianSpent)} guard ready`:dish.subtitle}</Text>
        <Text style={styles.label}>{spec.mode==='boss'?'FOOD FOR A PULSE':'FOOD GATHERED'}</Text>
        <Text style={styles.value}>{harvest.nourishment} / {spec.mode==='boss'?3:spec.food}</Text>
        {spec.mode!=='feed'||harvest.hunterQuota()>0?<Text style={styles.detail}>{harvest.objectiveCount()} / {progressTarget} {harvest.objectiveLabel()}</Text>:null}
        <Text style={styles.detail}>{lesson?'Take your time':`${timeLeft(harvest.deadline()-run.stageElapsed)} left`}</Text>
        <Text style={styles.label}>FOOD SAVED</Text><Text style={styles.value}>{run.biomass}</Text>
        <Text style={styles.detail}>Score {run.score}</Text>
        {run.mutations.length>0&&<Text style={styles.detail}>{run.mutations.map(id=>mutationDefinition(id)?.name??id).join('\n')}</Text>}
        {boss instanceof JourneyBoss&&<Text style={styles.notice}>{boss.statusText()}</Text>}
        <Text style={styles.label}>NUDGE</Text><Text style={styles.detail}>{run.nudge.cooldown>0?`Ready in ${Math.ceil(run.nudge.cooldown)}s`:'Drag a purple cyst aside'}</Text>
      </ScrollView>
      <View style={styles.play}>
        <EncounterView run={run} touch={touch} tracers={tracers} onInteraction={interaction}/>
        <View pointerEvents="none" style={styles.guidance}>
          {run.state==='active'&&<>
            <Text style={styles.guideTitle}>{run.selection.rejectionReason||lesson?.title||event?.title||harvest.ecology.pressureText(run)}</Text>
            <Text style={styles.guideDetail}>{lesson?.detail||event?.detail||(run.selection.active?'Return to your first cell, then release.':'Loop around green food. Keep purple cysts and Mother outside.')}</Text>
          </>}
        </View>
      </View>
      {run.state!=='active'&&<View style={styles.overlay}>
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent}>
          {run.state==='brief'&&<>
            <Text style={styles.eyebrow}>{dish.name.toUpperCase()}</Text>
            <Text style={styles.title}>{spec.name}</Text><Text style={styles.body}>{spec.lesson}</Text>
            {growth>=0&&<>
              <Text style={styles.body}>A new organelle is growing. Choose how it helps your colony.</Text>
              <View style={styles.row}>
                <Button label="Guard: blocks one hunter" onPress={()=>{run.chooseGrowthRole('guard');refresh();}}/>
                <Button label="Feeder: rewards large meals" onPress={()=>{run.chooseGrowthRole('feeder');refresh();}}/>
              </View>
            </>}
            {growth<0&&run.stageIndex===2&&run.growthRoles[1]&&<Text style={styles.detail}>New organelle: {run.growthRoles[1]}</Text>}
            {growth<0&&run.stageIndex===8&&run.growthRoles[5]&&<Text style={styles.detail}>New organelle: {run.growthRoles[5]}</Text>}
            <Button label={session.index===0?'Begin the journey':'Enter the water'} onPress={()=>{session.begin();refresh();}}/>
            {session.index===0&&<Text style={styles.detail}>Drag between blue cells to draw a loop. Return to the first cell and release.</Text>}
          </>}
          {run.state==='paused'&&<>
            <Text style={styles.title}>The pond can wait.</Text><Text style={styles.body}>Your colony is resting.</Text>
            <Button label="Resume" onPress={pause}/>
            <Text style={styles.credits}>Petriverse by Marco van Hylckama Vlieg{`\n`}Mobile adaptation by Henri Hubert / AI Engineer Hub{`\n`}Original game and artwork: CC BY-NC 4.0</Text>
          </>}
          {run.state==='loss'&&<>
            <Text style={styles.title}>{harvest.lossTitle}</Text><Text style={styles.body}>{harvest.lossReason}</Text>
            <Button label="Retry this encounter" onPress={()=>{touch.cancel();session.retry();refresh();}}/>
            <Text style={styles.detail}>Return with the colony and food you brought into this encounter.</Text>
          </>}
          {run.state==='complete'&&<>
            <Text style={styles.eyebrow}>{session.finished?'JOURNEY COMPLETE':'ENCOUNTER COMPLETE'}</Text>
            <Text style={styles.title}>{session.finished?'A little universe, alive.':'Your colony is growing.'}</Text>
            <Text style={styles.body}>Score {run.score} · {run.biomass} food saved{session.finished?` · ${run.totalRescued} spores rescued`:''}</Text>
            {!session.finished&&<>
              {session.offers.length>0&&<Text style={styles.detail}>Choose an adaptation for {session.evolutionCost()} food, or save it for later.</Text>}
              <View style={styles.offers}>{session.offers.map(id=>{
                const mutation=mutationDefinition(id);if(!mutation)return null;
                return <View style={styles.offer} key={id}><Text style={styles.encounterName}>{mutation.name}</Text><Text style={styles.body}>{mutation.detail}</Text>
                  <Text style={styles.detail}>{mutation.tradeoff}</Text><Button label={`Adapt · ${session.evolutionCost()}`} disabled={run.biomass<session.evolutionCost()} onPress={()=>advance(id)}/></View>;
              })}</View>
              <View style={styles.row}>
                <Button label="Continue" onPress={()=>advance('continue')}/>
                {run.integrity<run.maxIntegrity&&<Button label="Heal up to 2 · 6 food" disabled={run.biomass<6} onPress={()=>advance('repair')} quiet/>}
              </View>
            </>}
            {session.finished&&<Button label="Begin a new journey" onPress={()=>{touch.cancel();setSession(new JourneySession(Date.now()>>>0));}}/>}
          </>}
        </ScrollView>
      </View>}
    </View>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#06171c'},header:{minHeight:54,paddingHorizontal:18,paddingVertical:6,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  brand:{color:'#e1eee4',fontSize:19,fontWeight:'600',letterSpacing:4},subtitle:{color:'#91adae',fontSize:11,marginTop:3},main:{flex:1,flexDirection:'row'},
  sidebar:{width:156,flexGrow:0,flexShrink:0},sideContent:{paddingHorizontal:18,paddingBottom:16,gap:5},encounterName:{color:'#dceae0',fontSize:15,fontWeight:'600',marginBottom:4},
  label:{color:'#86a5a7',fontSize:10,letterSpacing:1.2,marginTop:10},value:{color:'#c8dda4',fontSize:22,fontWeight:'500'},detail:{color:'#9bb6b4',fontSize:11,lineHeight:16},notice:{color:'#dbc899',fontSize:11,lineHeight:16,marginTop:10},
  play:{flex:1},guidance:{minHeight:42,marginBottom:6,marginHorizontal:8,alignItems:'center',backgroundColor:'#06171cbd',borderRadius:8,padding:5},guideTitle:{color:'#d8e7d8',fontSize:12,textAlign:'center'},guideDetail:{color:'#9bb6b4',fontSize:11,textAlign:'center',marginTop:2},
  overlay:{...StyleSheet.absoluteFill,backgroundColor:'#041015c9',alignItems:'center',justifyContent:'center',padding:10},card:{flexGrow:0,maxHeight:'100%',width:'94%',maxWidth:640,backgroundColor:'#0c242b',borderColor:'#2c5055',borderWidth:1,borderRadius:18},cardContent:{padding:20,gap:10},
  eyebrow:{fontSize:10,color:'#9ac8c2',letterSpacing:2},title:{color:'#e3eee4',fontSize:24,fontWeight:'500'},body:{color:'#c0d3ce',fontSize:13,lineHeight:19},
  button:{minHeight:44,paddingHorizontal:16,paddingVertical:12,alignItems:'center',justifyContent:'center',backgroundColor:'#325f5b',borderRadius:10,borderWidth:1,borderColor:'#59857b'},quietButton:{backgroundColor:'#112b30',borderColor:'#34585e'},buttonText:{color:'#e0eee0',fontSize:12,fontWeight:'600'},dim:{opacity:0.45},
  row:{flexDirection:'row',flexWrap:'wrap',gap:10},offers:{flexDirection:'row',flexWrap:'wrap',gap:10},offer:{flexGrow:1,flexBasis:165,gap:8,backgroundColor:'#102e34',padding:12,borderRadius:10},credits:{color:'#87a5a5',fontSize:11,lineHeight:17,marginTop:12},
});
