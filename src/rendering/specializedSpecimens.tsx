import React,{useMemo,useRef} from 'react';
import {AlphaType,ColorType,Circle,Group,Image,ImageShader,Path,Rect,Shader,Skia,vec} from '@shopify/react-native-skia';
import type {SkImage,SkRuntimeEffect} from '@shopify/react-native-skia';
import type {Point} from '../geometry/loopGeometry';
import type {Amoeba} from '../ecology/amoeba';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {arrivalProgress} from '../ecology/organismArrival';
import {LivingSprite} from './livingSpecimens';
import type {SpecimenImages} from './livingSpecimens';
import type {TissueUniforms} from './tissueUniforms';
import {amoebaBodyShader} from './shaders/amoebaBody';
import {phageShader} from './shaders/phage';
import {AMOEBA_OUTLINE_RESOLUTION,amoebaOutline} from './amoebaOutline';
import {AmoebaVisualState,PhageVisualState} from './specializedVisuals';

let bodyEffect:SkRuntimeEffect|null|undefined,virionEffect:SkRuntimeEffect|null|undefined;
const outlines=new WeakMap<SkImage,SkImage|null>();
function compile(source:string):SkRuntimeEffect|null{try{return Skia.RuntimeEffect.Make(source);}catch{return null;}}
function outlineFor(image:SkImage):SkImage|null{
  if(outlines.has(image))return outlines.get(image)!;
  let outline:SkImage|null=null;
  try{
    const raster=image.makeNonTextureImage()??image,width=image.width(),height=image.height();
    const pixels=raster.readPixels(0,0,{width,height,colorType:ColorType.RGBA_8888,alphaType:AlphaType.Unpremul});
    if(pixels){
      const field=amoebaOutline(pixels,width,height),size=AMOEBA_OUTLINE_RESOLUTION;
      outline=Skia.Image.MakeImage({width:size,height:size,colorType:ColorType.RGBA_F32,alphaType:AlphaType.Opaque},Skia.Data.fromBytes(new Uint8Array(field.buffer)),size*16);
    }
  }catch{}
  outlines.set(image,outline);return outline;
}
const arc=(at:Point,radius:number,start:number,end:number,steps=20)=>Array.from({length:steps+1},(_,i)=>{const a=start+(end-start)*i/steps;return `${i?'L':'M'} ${at.x+Math.cos(a)*radius} ${at.y+Math.sin(a)*radius}`;}).join(' ');

export function AmoebaSpecimen({body,clock,motion,images,tissueEffect,uniforms}:{body:Amoeba;clock:number;motion:number;images:SpecimenImages;tissueEffect:SkRuntimeEffect|null;uniforms:TissueUniforms}){
  const visual=useRef<AmoebaVisualState|null>(null);if(!visual.current)visual.current=new AmoebaVisualState();
  const pose=visual.current.sample(body,clock,motion),image=images.amoeba,outline=useMemo(()=>image?outlineFor(image):null,[image]);
  if(bodyEffect===undefined)bodyEffect=compile(amoebaBodyShader);
  const opacity=arrivalProgress(body),water=uniforms.water_base??[.055,.115,.15];
  return <>
    {image&&outline&&bodyEffect?<Group transform={[{translateX:body.nucleus.x},{translateY:body.nucleus.y}]}><Group transform={[{rotate:pose.rotation}]}>
      <Rect x={pose.low.x} y={pose.low.y} width={pose.extent.x} height={pose.extent.y}>
        <Shader source={bodyEffect} uniforms={{textureSize:[image.width(),image.height()],outlineSize:[AMOEBA_OUTLINE_RESOLUTION,AMOEBA_OUTLINE_RESOLUTION],rectOrigin:[pose.low.x,pose.low.y],extent:[pose.extent.x,pose.extent.y],origin:[-pose.low.x,-pose.low.y],target:[pose.goal.x,pose.goal.y],clock,crawl:body.crawlPhase(),motion,phase:body.id*.71,arrival:opacity,extension:pose.extension,ingestion:pose.ingestion,closure:pose.closure,meal:pose.meal,water_base:water}}>
          <ImageShader image={image} fit="none" tx="clamp" ty="clamp"/><ImageShader image={outline} fit="none" tx="clamp" ty="clamp"/>
        </Shader>
      </Rect>
    </Group></Group>:<LivingSprite kind="amoeba" at={body.nucleus} angle={pose.rotation} width={152} images={images} opacity={opacity} effect={tissueEffect} uniforms={uniforms}/>}
    {pose.captiveVisible&&<>
      <Circle cx={pose.captivePosition.x} cy={pose.captivePosition.y} r={pose.chamberRadius} color="#668278" opacity={.14*pose.ingestion}/>
      <Circle cx={pose.captivePosition.x} cy={pose.captivePosition.y} r={pose.chamberRadius} color="#b5ccba" style="stroke" strokeWidth={.8} opacity={.32*pose.ingestion}/>
      <Path path={arc({x:pose.captivePosition.x-.8,y:pose.captivePosition.y-1},pose.chamberRadius-1.7,3.2,5.2)} color="#c2e0db" style="stroke" strokeWidth={1.1} opacity={.40*pose.ingestion}/>
      {Array.from({length:14},(_,i)=>{
        const phase=i*2.399+clock*.32*motion,radius=pose.chamberRadius+Math.sin(i*1.7+clock*.7*motion)*4;
        return <Circle key={i} cx={pose.captivePosition.x+Math.cos(phase)*radius} cy={pose.captivePosition.y+Math.sin(phase)*radius} r={.6+i%3*.25} color="#a8c2ab" opacity={pose.meal*.6}/>;
      })}
      <LivingSprite kind="cell" at={pose.captivePosition} angle={pose.captiveAngle} width={pose.captiveWidth} images={images} effect={tissueEffect} host={image} opacity={pose.captiveOpacity}
        uniforms={{...uniforms,kind:0,phase:body.id*.7,clock,motion,energy:1-pose.meal*.8,invading_depth:pose.ingestion,host_center:[pose.hostCenter.x,pose.hostCenter.y],host_extent:[152,152],host_rotation:pose.rotation,dissolve:pose.captiveDissolve,arrival:1}}/>
    </>}
  </>;
}
export function PhageSpecimen({at,angle=0,height=25,clock=0,motion=1,phase=0,contraction=0,opacity=1,image}:{at:Point;angle?:number;height?:number;clock?:number;motion?:number;phase?:number;contraction?:number;opacity?:number;image?:SkImage}){
  if(virionEffect===undefined)virionEffect=compile(phageShader);
  if(!image)return null;
  const width=height*image.width()/image.height(),origin=[at.x-width/2,at.y-height/2];
  return <Group opacity={opacity} origin={vec(at.x,at.y)} transform={[{rotate:angle}]}>
    {virionEffect?<Rect x={origin[0]} y={origin[1]} width={width} height={height}>
      <Shader source={virionEffect} uniforms={{textureSize:[image.width(),image.height()],displaySize:[width,height],spriteOrigin:origin,clock,phase,motion,contraction}}>
        <ImageShader image={image} fit="none" tx="clamp" ty="clamp"/>
      </Shader>
    </Rect>:<Image image={image} x={origin[0]} y={origin[1]} width={width} height={height} fit="fill"/>}
  </Group>;
}
export function PhageSwarm({run,clock,motion,image}:{run:EncounterSimulation;clock:number;motion:number;image?:SkImage}){
  const visual=useRef<PhageVisualState|null>(null);if(!visual.current)visual.current=new PhageVisualState();
  const poses=visual.current.sample(run,clock,motion);
  return <>
    {poses.virions.map(({key,...pose})=><PhageSpecimen key={key} {...pose} image={image} clock={clock} motion={motion}/>)}
    {poses.capsids.map((capsid,i)=><Group key={`capsid${i}`}>
      <Circle cx={capsid.at.x} cy={capsid.at.y} r={.65} color="#ccdbfa" opacity={capsid.growth*capsid.fade*.55}/>
      <Circle cx={capsid.at.x} cy={capsid.at.y} r={1.05} color="#abc4f5" style="stroke" strokeWidth={.5} opacity={capsid.growth*capsid.fade*.4}/>
    </Group>)}
    {poses.fragments.map((fragment,i)=><Path key={`fragment${i}`} path={arc(fragment.at,fragment.radius,fragment.angle,fragment.angle+1.8,8)} color="#baba85" style="stroke" strokeWidth={.65} opacity={fragment.opacity}/>)}
    {poses.ripples.map((ripple,i)=><Circle key={`ripple${i}`} cx={ripple.at.x} cy={ripple.at.y} r={ripple.radius} color="#91cfdb" style="stroke" strokeWidth={.8} opacity={ripple.opacity}/>)}
  </>;
}
