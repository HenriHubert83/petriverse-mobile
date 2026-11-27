import React,{useEffect,useState} from 'react';
import {BackHandler,ScrollView,StyleSheet,View} from 'react-native';
import type {JourneySession} from '../campaign/journeySession';
import {mutationDefinition} from '../evolution/mutations';
import {compareEvolution} from '../evolution/evolutionComparison';
import {ANATOMY_CHANGES} from '../evolution/motherAppearance';
import type {AnatomyId} from '../evolution/motherAppearance';
import {evolutionGrowthProgress} from '../evolution/evolutionPresentation';
import {EvolutionSpecimens,GuidedEvolutionDemo,useEvolutionClock} from './EvolutionSpecimens';
import {AppPressable as Pressable,AppText as Text,useAppearance} from './AccessibleText';

function Action({title,onPress,disabled=false,secondary=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[styles.button,secondary&&styles.secondary,(pressed||disabled)&&styles.dim]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
export function EvolutionPanel({session,onChoose,reducedMotion=false}:{session:JourneySession;onChoose:(id:string)=>void;reducedMotion?:boolean}){
  const [detailed,setDetailed]=useState(false),run=session.current,cost=session.evolutionCost(),ready=session.progressionReady;
  const seconds=useEvolutionClock(`${session.seed}:${session.index}`,reducedMotion),{highContrast}=useAppearance();
  const guided=run.mutations.length===0&&session.offers.length===2,next=session.route[session.index+1];
  if(session.finished)return null;
  return <View style={styles.panel}>
    <Text style={styles.heading}>{session.offers.length?(guided?'Choose how you like to capture':'Improve your colony'):'A moment to recover'}</Text>
    <Text style={styles.body}>{run.biomass} food saved · {run.integrity}/{run.maxIntegrity} health</Text>
    {!!session.offers.length&&<>
      <Text style={styles.detail}>Evolution {run.mutations.length+1} of 6. Each lasts until this journey ends.</Text>
      <Text style={styles.body}>{run.biomass>=cost?`Upgrades cost ${cost} food · ${run.biomass-cost} left afterward`:`Upgrades cost ${cost} food · need ${cost-run.biomass} more`}</Text>
      <Action secondary title={detailed?'Show cards':'Compare details'} onPress={()=>setDetailed(value=>!value)}/>
      <View style={styles.cards}>{session.offers.map(id=>{
        const definition=mutationDefinition(id);if(!definition)return null;
        const comparison=compareEvolution(run,id),before=comparison.before,after=comparison.after,canBuy=ready&&run.biomass>=cost;
        return <View key={id} style={[styles.card,highContrast&&styles.contrastCard]}>
          {!detailed&&(guided?<GuidedEvolutionDemo offered={id} seconds={seconds} reducedMotion={reducedMotion}/>:
            <EvolutionSpecimens run={run} owned={[...run.mutations,id]} clock={seconds} reducedMotion={reducedMotion}/>)}
          <Text style={styles.role}>{guided?(id==='fission'?'FASTER SMALL CAPTURES':'MORE FOOD FROM LARGE CAPTURES'):definition.role}</Text>
          <Text style={styles.name}>{definition.name}</Text>
          <Text style={styles.body}>{definition.summary}</Text>
          {detailed?<>
            <Text style={styles.body}>{definition.detail}</Text>
            <Text style={styles.example}>Example: {comparison.sample.label}.</Text>
          </>:<Text style={styles.example}>Example: {comparison.sample.loop} cells · {comparison.sample.bodies.length} organisms</Text>}
          <View style={styles.metrics}>
            <Text style={styles.metric}>Food {before.food} → {after.food}</Text>
            <Text style={styles.body}>Recovery {before.recovery.toFixed(1)}s → {after.recovery.toFixed(1)}s</Text>
            <Text style={styles.body}>Loop limit {before.capacity} → {after.capacity} cells</Text>
            {(before.poison>0||after.poison>0)&&<Text style={styles.body}>Poison {before.poison} → {after.poison}</Text>}
          </View>
          {detailed&&<>
            {!!comparison.effect&&<Text style={styles.body}>{comparison.effect}</Text>}
            <Text style={styles.accent}>{comparison.synergy}</Text>
            <Text style={styles.detail}>{comparison.assumption}</Text>
            {(before.poison>0||after.poison>0)&&<Text style={styles.detail}>Each unfiltered cyst costs 1 organelle.</Text>}
          </>}
          <Text style={styles.detail}>Tradeoff: {definition.tradeoff}</Text>
          {!detailed&&<Text style={styles.detail}>Short links · see Compare details</Text>}
          <View style={styles.footer}><Action title={run.biomass<cost?`Need ${cost-run.biomass} more food`:`Evolve for ${cost} food`}
            disabled={!canBuy} onPress={()=>onChoose(id)}/></View>
        </View>;
      })}</View>
    </>}
    {!session.offers.length&&<Text style={styles.body}>{run.mutations.length>=6?
      'Your six evolutions define this colony. Try a different combination next journey.':
      'Evolution choices return at the next milestone. Your food and colony travel with you.'}</Text>}
    {!ready&&<Text accessibilityLiveRegion="polite" style={styles.accent}>Your colony is settling. Capture and recovery finish before you continue.</Text>}
    {next&&<Text style={styles.detail}>Next: {next.name}</Text>}
    <View style={styles.actions}>
      <Action title="Continue without spending" onPress={()=>onChoose('continue')} disabled={!ready}/>
      {run.integrity<run.maxIntegrity&&<Action secondary title="Heal up to 2 · 6 food" onPress={()=>onChoose('repair')} disabled={!ready||run.biomass<6}/>}
    </View>
  </View>;
}

// Mount only after the real purchase succeeds. Dismiss never buys again or starts
// the briefing; owned anatomy remains in the session and its existing save data.
export function EvolutionReveal({session,traitId,onDismiss,reducedMotion=false}:{
  session:JourneySession;traitId:string;onDismiss:()=>void;reducedMotion?:boolean;
}){
  const run=session.current,seconds=useEvolutionClock(`${session.seed}:${session.index}:${traitId}`,reducedMotion),progress=evolutionGrowthProgress(seconds,reducedMotion);
  const definition=mutationDefinition(traitId);
  useEffect(()=>{const handler=BackHandler.addEventListener('hardwareBackPress',()=>{onDismiss();return true;});return()=>handler.remove();},[onDismiss]);
  if(!definition||run.state!=='brief'||!run.mutations.includes(traitId))return null;
  return <View style={styles.revealScreen} accessibilityViewIsModal><ScrollView contentContainerStyle={styles.revealScroll}>
    <View style={[styles.panel,styles.revealCard]}>
    <Text style={styles.role}>EVOLUTION</Text>
    <Text style={styles.heading}>{definition.name}</Text>
    <Text style={styles.body}>{progress<1?'Your colony is evolving.':'Now part of your colony.'} {ANATOMY_CHANGES[traitId as AnatomyId]}</Text>
    <EvolutionSpecimens colony run={run} owned={run.mutations} growing={traitId} progress={progress} clock={seconds} reducedMotion={reducedMotion}/>
    <View style={styles.labels}><Text style={styles.accent}>The Mother</Text><Text style={styles.accent}>Her cells</Text></View>
    <Text style={styles.body}>{definition.detail}</Text>
    <Action title="Continue" onPress={onDismiss}/>
    <Text style={styles.detail}>You can continue at any time. The next encounter begins when you are ready.</Text>
    </View>
  </ScrollView></View>;
}
const styles=StyleSheet.create({
  panel:{gap:12},heading:{color:'#e3eee4',fontSize:23,fontWeight:'700'},body:{color:'#c0d3ce',fontSize:15,lineHeight:21},
  detail:{color:'#a6bfbb',fontSize:13,lineHeight:19},accent:{color:'#a8d8cc',fontSize:14,lineHeight:20},
  role:{color:'#9ac8c2',fontSize:12,fontWeight:'700',letterSpacing:1},name:{color:'#e3eee4',fontSize:21,fontWeight:'700'},
  cards:{flexDirection:'row',flexWrap:'wrap',gap:12},card:{flexGrow:1,flexBasis:220,minWidth:200,backgroundColor:'#102e34',borderColor:'#31575c',borderWidth:1,borderRadius:16,padding:16,gap:10},
  contrastCard:{borderColor:'#b6d3cf'},example:{color:'#a6bfbb',fontSize:12,lineHeight:18},metrics:{gap:4,paddingVertical:5},metric:{color:'#ddecdb',fontSize:18,fontWeight:'600'},
  footer:{marginTop:'auto',paddingTop:7},actions:{flexDirection:'row',flexWrap:'wrap',gap:10},
  button:{backgroundColor:'#325f5b',borderColor:'#59857b',borderWidth:1,borderRadius:12,paddingHorizontal:17,paddingVertical:14,minHeight:48,alignItems:'center'},
  secondary:{backgroundColor:'#16363d',borderColor:'#47666b'},buttonText:{color:'#e0eee0',fontSize:15,fontWeight:'600'},dim:{opacity:0.45},
  labels:{flexDirection:'row',justifyContent:'space-around',marginTop:-10},
  revealScreen:{flex:1,backgroundColor:'#06171c'},revealScroll:{flexGrow:1,padding:24,justifyContent:'center',alignItems:'center'},
  revealCard:{width:'100%',maxWidth:740,padding:24,borderWidth:1,borderColor:'#31575c',borderRadius:20,backgroundColor:'#0c242b'},
});
