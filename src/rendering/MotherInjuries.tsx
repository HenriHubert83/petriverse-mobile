// Source microscope.sync_injuries and injury_motes.gd. All ages are simulation time.
import React from 'react';
import {Circle,Group,Path} from '@shopify/react-native-skia';
import type {SkRuntimeEffect} from '@shopify/react-native-skia';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {add,sub,scale,unit,smooth} from '../ecology/drifter';
import type {Point} from '../geometry/loopGeometry';
import {LivingSprite,LivingBridge} from './livingSpecimens';
import type {SpecimenImages} from './livingSpecimens';
import {motherTextureKey,spriteMetrics,textureKey} from './organismTextures';
import type {TissueUniforms} from './tissueUniforms';
const path=(points:Point[],closed=false)=>points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join('')+(closed?'Z':'');
const lerp=(a:Point,b:Point,t:number)=>add(a,scale(sub(b,a),t));
export function MotherInjuries({run,images,effect,bridgeEffect,uniforms,reducedMotion}:{run:EncounterSimulation;images:SpecimenImages;effect:SkRuntimeEffect|null;bridgeEffect:SkRuntimeEffect|null;uniforms:TissueUniforms;reducedMotion:boolean}){
 const host=images[motherTextureKey(run.maxIntegrity,run.mutations)],progress=Array.from(run.motherDamage.progressValues()),motion=reducedMotion?0:1;
 return <Group>{run.motherDamage.bites.map(bite=>{
  const age=bite.age,core=add(run.board.center,run.motherDamage.coreOffset(bite.core)),direction=unit(sub(core,bite.origin)),press=Math.sin(Math.min(age/.40,1)*Math.PI)*motion,burrow=smooth(.18,.84,age)*motion,sink=smooth(1.48,2.2,age),feeding=Math.sin(progress[bite.core]*Math.PI);
  let mouth=lerp(bite.origin,sub(core,scale(direction,9)),burrow);mouth=sub(mouth,scale(direction,press*2.3));mouth=add(mouth,scale(direction,(sink*6+Math.sin(age*16)*feeding*.8)*motion));
  const points=(bite.nuclei.length?bite.nuclei:[bite.origin]).map(p=>add(mouth,scale(sub(p,bite.origin),1-burrow*.30))),squeeze=Math.sin(burrow*Math.PI)*.15,angle=Math.atan2(run.board.center.y-bite.origin.y,run.board.center.x-bite.origin.x);
  const width=spriteMetrics(bite.kind,bite.form).width*(1-burrow*.25+press*.08-squeeze*.3),heightScale=(1-burrow*.34-press*.11-squeeze+feeding*.06*motion)/(1-burrow*.25+press*.08-squeeze*.3);
  const side=unit({x:mouth.y-core.y,y:core.x-mouth.x}),drawIn=Math.sin(smooth(.50,1.66,age)*Math.PI),upper:Point[]=[],lower:Point[]=[];
  for(let j=0;j<17;j++){const t=j/16,center=add(lerp(core,mouth,t),scale(side,Math.sin(t*Math.PI)*Math.sin(age*6)*2.4)),w=Math.sin(t*Math.PI)*(1.3+drawIn*1.5)*(1-t*.65);upper.push(add(center,scale(side,w)));lower.push(sub(center,scale(side,w)));}
  return <Group key={bite.serial}>
   {bite.kind!=='cyst'&&<Group opacity={1-burrow*.12-sink*.28}>
    {points.length===2&&<LivingBridge first={points[0]} second={points[1]} image={images[textureKey(bite.kind,bite.form)]} effect={bridgeEffect} clock={Number(uniforms.clock)} motion={motion} opacity={1-sink}/>}
    {points.map((at,i)=><LivingSprite key={i} kind={bite.kind} form={bite.form} at={at} angle={angle+(points.length===2?Math.PI*i:0)} width={width} scaleY={heightScale} images={images} host={host} effect={effect} uniforms={{...uniforms,kind:2,phase:bite.enemyId*.8+i*1.3,warmth:1,feeding,invading_depth:burrow,host_center:[run.board.center.x,run.board.center.y],host_extent:[120,120],core_damage:progress,dissolve:sink,armor_damage:bite.kind==='shellback'&&bite.health===1?1:0}}/>)}
   </Group>}
   {!reducedMotion&&drawIn>0&&<Group><Path path={path([...upper,...lower.slice().reverse()],true)} color="#f5b04a" opacity={drawIn*.20}/><Path path={path(upper)} style="stroke" strokeWidth={.65} color="#ffde87" opacity={drawIn*.48}/><Path path={path(lower)} style="stroke" strokeWidth={.55} color="#b0dbd4" opacity={drawIn*.30}/></Group>}
   {!reducedMotion&&Array.from({length:28},(_,i)=>{
    const t=(age-.54-i*.028)/.48;if(t<=0||t>=1)return null;
    const theta=i*2.399+bite.core*1.31,origin=add(core,{x:Math.cos(theta)*(2+i%4*1.2),y:Math.sin(theta)*(2+i%4*1.2)});
    const location=(v:number)=>add(lerp(origin,mouth,smooth(0,1,v)),scale(side,Math.sin(v*Math.PI)*Math.sin(theta)*7)),at=location(t),alpha=Math.sin(t*Math.PI)*(.65+i%3*.12),size=(.65+i%4*.29)*(1-t*.38);
    return <Group key={i}><Path path={path(Array.from({length:4},(_,j)=>location(Math.max(0,t-(3-j)*.035))))} style="stroke" strokeWidth={size*.65} color="#e0a342" opacity={alpha*.23}/><Circle cx={at.x} cy={at.y} r={size*3} color="#ff8f29" opacity={alpha*.10}/><Circle cx={at.x} cy={at.y} r={size} color="#ffcf64" opacity={alpha}/><Circle cx={at.x-.2} cy={at.y-.3} r={size*.38} color="#fff5c7" opacity={alpha}/></Group>;
   })}
  </Group>;
 })}</Group>;
}
