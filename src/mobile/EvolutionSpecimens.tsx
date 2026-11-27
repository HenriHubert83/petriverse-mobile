import React,{useEffect,useMemo,useState} from 'react';
import {AppState,StyleSheet,View} from 'react-native';
import {Canvas,Group,Image,Path,Skia,useImage} from '@shopify/react-native-skia';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {anatomyRecipe} from '../evolution/motherAppearance';
import {guidedEvolutionFrame} from '../evolution/evolutionPresentation';
import {organismTextures,motherTextureKey} from '../rendering/organismTextures';
import {LivingSprite} from '../rendering/livingSpecimens';
import {livingTissueShader} from '../rendering/shaders/livingTissue';
import {sceneTissue,motherTissue} from '../rendering/tissueUniforms';
import {missionAppearance} from '../rendering/missionAppearance';
import {AppText as Text} from './AccessibleText';

// This clock is presentation only. Backgrounding never advances the run or growth.
export function useEvolutionClock(identity:string,reducedMotion:boolean):number{
  const [seconds,setSeconds]=useState(0);
  useEffect(()=>{
    setSeconds(0);if(reducedMotion)return;
    let frame=0,last:number|undefined,active=AppState.currentState!=='background';
    const subscription=AppState.addEventListener('change',state=>{active=state==='active';last=undefined;});
    const tick=(now:number)=>{
      if(active){if(last!==undefined){const delta=Math.max(0,Math.min((now-last)/1000,0.05));setSeconds(value=>value+delta);}last=now;}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);subscription.remove();};
  },[identity,reducedMotion]);return seconds;
}

export function EvolutionSpecimens({run,owned,growing='',progress=1,clock=0,reducedMotion=false,colony=false}:{
  run:EncounterSimulation;owned:readonly string[];growing?:string;progress?:number;clock?:number;reducedMotion?:boolean;colony?:boolean;
}){
  const [width,setWidth]=useState(0),height=colony?230:120;
  const cell=useImage(organismTextures.cell),motherKey=motherTextureKey(run.maxIntegrity,owned),mother=useImage(organismTextures[motherKey]);
  const effect=useMemo(()=>{try{return Skia.RuntimeEffect.Make(livingTissueShader);}catch{return null;}},[]);
  const look=useMemo(()=>missionAppearance(run.runSeed,run.stageIndex,run.habitatChoice),[run.runSeed,run.stageIndex,run.habitatChoice]);
  const recipe=anatomyRecipe(owned,growing,progress),scene={...sceneTissue(run,look,reducedMotion),clock:reducedMotion?0:clock};
  const tissue={...scene,traits:recipe.traits,adaptations:recipe.adaptations,evolution_form:recipe.form,evolution_organs:recipe.organs,
    evolution_layers:recipe.layers,growth_front:recipe.growthFront,growth_pulse:recipe.growthPulse};
  const images={...(cell?{cell}:{}),...(mother?{[motherKey]:mother}:{})};
  const design=colony?520:220,scale=Math.min(1,width/design);
  const positions=colony?[{x:350,y:64},{x:418,y:120},{x:338,y:170}]:[{x:110,y:60}];
  return <View accessible={false} style={{height}} onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
    {width>0&&<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Group transform={[{translateX:(width-design*scale)/2},{translateY:(height-(colony?230:120)*scale)/2},{scale}]}>
        {colony&&<LivingSprite kind={motherKey} at={{x:154,y:114}} width={196} images={images} effect={effect}
          uniforms={{...scene,...motherTissue(run,reducedMotion),traits:recipe.traits,adaptations:recipe.adaptations,
            growth_front:recipe.growthFront,growth_pulse:recipe.growthPulse}}/>}
        {positions.map((at,i)=><Group key={i}>
          <LivingSprite kind="cell" at={at} width={colony?80:76} angle={i*2.399} images={images} effect={effect}
            uniforms={{...tissue,phase:i*1.7,phenotype:look.cells[i]}}/>
          {recipe.traits[0]>0&&<LivingSprite kind="cell" at={{x:at.x+Math.cos(i*2.399+0.4)*41,y:at.y+Math.sin(i*2.399+0.4)*41}}
            width={35*recipe.traits[0]} opacity={recipe.traits[0]} images={images} effect={effect} uniforms={{...scene,phase:i*1.7+1}}/>}
        </Group>)}
      </Group>
    </Canvas>}
  </View>;
}

export function GuidedEvolutionDemo({offered,seconds,reducedMotion}:{offered:string;seconds:number;reducedMotion:boolean}){
  const [width,setWidth]=useState(0),cell=useImage(organismTextures.cell),food=useImage(organismTextures.food);
  const frame=guidedEvolutionFrame(offered,seconds,reducedMotion),center={x:110,y:42};
  const scale=Math.min(1,width/220);
  const points=Array.from({length:frame.count},(_,i)=>{const angle=-Math.PI/2+Math.PI*2*i/frame.count;return {x:center.x+Math.cos(angle)*82,y:center.y+Math.sin(angle)*28};});
  return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
    <View style={{height:95}}>{width>0&&<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}><Group transform={[{translateX:(width-220*scale)/2},{scale}]}>
      {frame.drawing&&points.map((p,i)=>{const q=points[(i+1)%points.length],amount=Math.max(0,Math.min(1,frame.time/1.6*frame.count-i));
        return <Path key={`line${i}`} path={`M ${p.x} ${p.y} L ${p.x+(q.x-p.x)*amount} ${p.y+(q.y-p.y)*amount}`} color="#87c5c5" opacity={0.65} style="stroke" strokeWidth={1.5}/>;})}
      {food&&[0,1,2].map(i=><Image key={`food${i}`} image={food} x={center.x+(i-1)*19-10} y={center.y-10} width={20} height={20} fit="fill" opacity={frame.foodOpacity}/>)}
      {cell&&points.map((p,i)=><Image key={`cell${i}`} image={cell} x={p.x+(center.x-p.x)*frame.merge-14} y={p.y+(center.y-p.y)*frame.merge-14} width={28} height={28} fit="fill" opacity={1-frame.merge}/>)}
      {cell&&frame.merge>0&&<Image image={cell} x={center.x-27} y={center.y-27} width={54} height={54} fit="fill" opacity={frame.merge}/>}
    </Group></Canvas>}</View>
    <Text style={{fontSize:12,color:'#a6c9c5',textAlign:'center',marginBottom:10}}>{frame.caption}</Text>
  </View>;
}
