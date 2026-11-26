import React from 'react';
import {Circle,Group,Image,ImageShader,Path,Rect,Shader,vec} from '@shopify/react-native-skia';
import type {SkImage,SkRuntimeEffect} from '@shopify/react-native-skia';
import type {Point} from '../geometry/loopGeometry';
import type {Clot} from '../geometry/clot';
import {smooth} from '../ecology/drifter';
import {spriteMetrics,textureKey} from './organismTextures';
import type {TextureKey} from './organismTextures';
import type {TissueUniforms} from './tissueUniforms';
export type SpecimenImages=Partial<Record<TextureKey,SkImage>>;
export function LivingSprite({kind,form='',at,images,opacity=1,angle=0,width,effect,uniforms,host,scaleY=1}:{kind:string;form?:string;at:Point;images:SpecimenImages;opacity?:number;angle?:number;width?:number;effect:SkRuntimeEffect|null;uniforms:TissueUniforms;host?:SkImage;scaleY?:number}){
 const image=images[textureKey(kind,form)],metric=spriteMetrics(kind,form),w=width??metric.width,h=(image?w*image.height()/image.width():w)*scaleY;
 const origin=[at.x-w*metric.uv.x,at.y-h*metric.uv.y],pad=kind==='cell'||kind.startsWith('mother')?.3:0,hostImage=host??image;
 return <Group opacity={opacity} origin={vec(at.x,at.y)} transform={[{rotate:angle}]}>
  {image&&effect&&hostImage?<Rect x={origin[0]-w*pad} y={origin[1]-h*pad} width={w*(1+pad*2)} height={h*(1+pad*2)}>
   <Shader source={effect} uniforms={{...uniforms,textureSize:[image.width(),image.height()],hostTextureSize:[hostImage.width(),hostImage.height()],displaySize:[w,h],spriteOrigin:origin,spriteAnchor:[at.x,at.y],spriteRotation:angle,nucleus_uv:[metric.uv.x,metric.uv.y]}}>
    <ImageShader image={image} fit="none" tx="clamp" ty="clamp"/><ImageShader image={hostImage} fit="none" tx="clamp" ty="clamp"/>
   </Shader>
  </Rect>:image?<Image image={image} x={origin[0]} y={origin[1]} width={w} height={h} fit="fill"/>:<Circle cx={at.x} cy={at.y} r={w*.25} color="#b7d7cd"/>}
 </Group>;
}
export function LivingBridge({first,second,image,effect,clock,motion,width=6,boss=false,opacity=1}:{first:Point;second:Point;image?:SkImage;effect:SkRuntimeEffect|null;clock:number;motion:number;width?:number;boss?:boolean;opacity?:number}){
 const x=Math.min(first.x,second.x)-30,y=Math.min(first.y,second.y)-30,w=Math.abs(first.x-second.x)+60,h=Math.abs(first.y-second.y)+60;
 return <Group opacity={opacity}>{image&&effect?<Rect x={x} y={y} width={w} height={h}><Shader source={effect} uniforms={{textureSize:[image.width(),image.height()],first:[first.x,first.y],second:[second.x,second.y],width,clock,motion,boss:boss?1:0,pulse:0}}><ImageShader image={image} fit="none" tx="clamp" ty="clamp"/></Shader></Rect>:<Path path={`M ${first.x} ${first.y} L ${second.x} ${second.y}`} color="#9ab8b3" style="stroke" strokeWidth={width} opacity={.35}/>}</Group>;
}
export function FusedClot({clot,image,effect,uniforms}:{clot:Clot;image?:SkImage;effect:SkRuntimeEffect|null;uniforms:TissueUniforms}){
 if(!image||!effect||clot.amount()<=.24)return null;
 const points=clot.cellPositions(),x=Math.min(...points.map(p=>p.x))-90,y=Math.min(...points.map(p=>p.y))-90,w=Math.max(...points.map(p=>p.x))-x+90,h=Math.max(...points.map(p=>p.y))-y+90;
 const members=points.flatMap(p=>[p.x,p.y]);while(members.length<24)members.push(0);
 return <Rect x={x} y={y} width={w} height={h}><Shader source={effect} uniforms={{bounds_size:[w,h],textureSize:[image.width(),image.height()],members,member_count:points.length,fusion:clot.amount(),opacity:smooth(.24,.82,clot.amount()),clock:uniforms.clock,feeding:clot.positions.length?clot.digestion():0,mastery:clot.mastery.length?1:0,colony_grade:uniforms.colony_grade,water_base:uniforms.water_base,light_direction:uniforms.light_direction}}><ImageShader image={image} fit="none" tx="clamp" ty="clamp"/></Shader></Rect>;
}
