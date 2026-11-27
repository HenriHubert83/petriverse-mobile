import React,{useMemo} from 'react';
import {Group,ImageShader,Path,Points,Rect,Shader,Skia,vec} from '@shopify/react-native-skia';
import type {SkImage,SkRuntimeEffect} from '@shopify/react-native-skia';
import type {FluidField} from '../engine/fluidField';
import type {Point} from '../geometry/loopGeometry';
import type {MissionAppearance} from './missionAppearance';
import type {TissueUniforms} from './tissueUniforms';
import {pondPopulation,samplePondDebris,samplePondSpecimen} from './pondLife';
import {pondSpecimenShader} from './shaders/pondSpecimen';
// Original ambient specimen atlas, routes, depth and photographic optics. The
// suspension's five forms use batched native paths instead of Godot MultiMesh;
// their subpixel refraction/softness remains an approximation on this backend.
export function PondAmbient({look,clock,motion,quality,fluid,image,fieldEffect,fieldUniforms,fieldChildren,traveller}:{look:MissionAppearance;clock:number;motion:number;quality:0|1|2;fluid:FluidField;image?:SkImage;fieldEffect:SkRuntimeEffect|null;fieldUniforms:TissueUniforms;fieldChildren:React.ReactNode;traveller?:{position:Point;strength:number}}){
 const population=useMemo(()=>pondPopulation(look),[look]),effect=useMemo(()=>{try{return Skia.RuntimeEffect.Make(pondSpecimenShader);}catch{return null;}},[]);
 const buckets=new Map<string,{path:string;points:Point[];width:number;alpha:number}>();
 for(const d of population.debris.slice(0,[80,160,264][quality])){
  const {at,angle}=samplePondDebris(d,clock,motion,look,fluid),r=Math.hypot(at.x-640,at.y-450);if(r>389)continue;
  const edge=Math.max(0,Math.min(1,(389-r)/35)),calm=.32+.68*Math.max(0,Math.min(1,(r-57)/66)),alpha=Math.round(d.alpha*edge*calm*.75*16)/16;if(alpha<=0)continue;
  const width=d.kind===0?Math.round(d.size.x):d.kind===1?1.25:d.kind===4?.55:.75,key=`${d.kind}:${width}:${alpha}`;
  let b=buckets.get(key);if(!b){b={path:'',points:[],width,alpha};buckets.set(key,b);}
  const point=(x:number,y:number)=>({x:at.x+x*Math.cos(angle)-y*Math.sin(angle),y:at.y+x*Math.sin(angle)+y*Math.cos(angle)});
  if(d.kind===0){b.points.push(at);continue;}
  if(d.kind===1){const a=point(-d.size.x*.33,0),z=point(d.size.x*.33,0);b.path+=`M${a.x},${a.y}L${z.x},${z.y}`;continue;}
  const points=Array.from({length:d.kind===4?10:17},(_,i)=>{
    if(d.kind===4){const x=(i/9-.5)*d.size.x,y=Math.sin((i/9-.5)*5+d.phase+clock*motion*.13)*.17*d.size.y;return point(x,y);}
    const theta=i/16*Math.PI*2,scale=d.kind===3?1+Math.sin(theta*3+d.phase)*.065:1;return point(Math.cos(theta)*d.size.x*.32*scale,Math.sin(theta)*d.size.y*.32*scale);
  });b.path+=points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join('');
 }
 const visible=population.specimens.slice(0,[10,18,46][quality]).map(s=>({s,value:samplePondSpecimen(s,clock,motion,look,fluid)}));
 if(traveller)visible.unshift({s:{at:traveller.position,extent:360,phase:0,kind:1,opacity:traveller.strength*.56,blur:.012,swim:[1,0,0,.5]},value:{at:motion?traveller.position:{x:640,y:560},angle:Math.PI*.26,depth:.5,extent:360,blur:.012}});
 return <Group>
  {image&&effect&&fieldEffect&&visible.map(({s,value},i)=>{const extent=value.extent,origin=[value.at.x-extent/2,value.at.y-extent/2];return <Group key={i} origin={vec(value.at.x,value.at.y)} transform={[{rotate:value.angle}]}><Rect x={origin[0]} y={origin[1]} width={extent} height={extent}><Shader source={effect} uniforms={{clock,motion,phase:s.phase,kind:s.kind,blur:value.blur,opacity:s.opacity,water_grade:look.waterGrade,water_base:look.waterBase.slice(),light_direction:look.lightDirection,depth:value.depth,frame_origin:[s.kind%2*.5,Math.floor(s.kind/2)*.5],textureSize:[image.width(),image.height()],spriteOrigin:origin,displayExtent:extent,spriteAnchor:[value.at.x,value.at.y],spriteRotation:value.angle}}>
    <Shader source={fieldEffect} uniforms={fieldUniforms}>{fieldChildren}</Shader><ImageShader image={image} fit="none" tx="clamp" ty="clamp"/>
   </Shader></Rect></Group>;})}
  {[...buckets].map(([key,b])=><Group key={key} opacity={b.alpha}>
   {b.path.length>0&&<Path path={b.path} color="#66858c" style="stroke" strokeWidth={b.width}/>}
   {b.points.length>0&&<Points mode="points" points={b.points} strokeCap="round" color="#73979f" strokeWidth={b.width}/>}
  </Group>)}
 </Group>;
}
