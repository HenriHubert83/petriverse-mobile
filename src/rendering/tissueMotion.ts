// CPU geometry counterpart of living_cilia / cytoplasm_granules.gdshader.
// Paths/points are collected across organisms into bounded native draw buckets.
import type {Point} from '../geometry/loopGeometry';
import {membraneScale} from '../evolution/motherAppearance';
import type {TissueUniforms} from './tissueUniforms';
export interface MotionBucket {path:string;points:Point[];color:string;opacity:number;width:number}
export type MotionBatch=Map<string,MotionBucket>;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const scalar=(u:TissueUniforms,key:string,fallback=0)=>typeof u[key]==='number'?u[key] as number:fallback;
const array=(u:TissueUniforms,key:string,fallback:number[])=>Array.isArray(u[key])?u[key] as number[]:fallback;
function bucket(batch:MotionBatch,color:string,alpha:number,width:number):MotionBucket{
 const opacity=Math.round(clamp(alpha,0,1)*12)/12,size=Math.max(.4,Math.round(width*4)/4),key=`${color}:${opacity}:${size}`;
 let value=batch.get(key);if(!value){value={path:'',points:[],color,opacity,width:size};batch.set(key,value);}return value;
}
export function appendTissueMotion(batch:MotionBatch,at:Point,width:number,rotation:number,uniforms:TissueUniforms,opacity=1):void{
 const kind=scalar(uniforms,'kind'),phase=scalar(uniforms,'phase'),clock=scalar(uniforms,'clock'),motion=scalar(uniforms,'motion',1),energy=scalar(uniforms,'energy',1),feeding=scalar(uniforms,'feeding');
 if(opacity<=.01)return;
 const t=clock*motion*(.91+.09*Math.sin(phase*1.71))+phase,vigor=.24+.76*energy,traits=array(uniforms,'traits',[0,0,0,0]),lure=traits[3],form=array(uniforms,'evolution_form',[0,0,0,0]),phenotype=array(uniforms,'phenotype',[1,1,0,0]),flow=array(uniforms,'flow_velocity',[0,0]);
 const cos=Math.cos(rotation),sin=Math.sin(rotation),world=(x:number,y:number):Point=>({x:at.x+(x*cos-y*sin)*width,y:at.y+(x*sin+y*cos)*width});
 const count=kind===1?26:kind===2?13:9;
 for(let i=0;i<count;i++){
  const a=i*2.399+phase,r=.11+.18*Math.sqrt((i+1)/(count+1));
  const position=(time:number)=>{let x=Math.cos(a)*r+Math.sin(time*.31+a*1.3)*.032*motion,y=Math.sin(a)*r+Math.cos(time*.27+a*.7)*.032*motion;const dx=Math.sin(time*.53+y*9+a)*.012*motion,dy=Math.cos(time*.43-x*11+a)*.012*motion;x+=dx;y+=dy;if(kind===2||kind===4)y*=.38;return world(x,y);};
  const head=position(t*vigor),tail=position((t-.55*motion)*vigor),gold=kind===1&&i%3===0,sparkle=.5+.5*Math.sin(t*.64+i*2.1);
  bucket(batch,gold?'#ffcf66':'#b8e3db',(gold?.18+feeding*.35:.16+sparkle*.12)*energy*opacity,Math.max(width*.006,1.1)).points.push(head);
  const trail=bucket(batch,'#b8e3db',.08*energy*opacity,.56);trail.path+=`M${head.x},${head.y}L${tail.x},${tail.y}`;
 }
 if(kind>=4)return;
 const normal=kind===1?34:16,total=kind===2?34:kind===3?6:normal+(lure>0?(kind===1?8:7):0);
 for(let i=0;i<total;i++){
  let angle=Math.PI*2*i/(kind===2?34:kind===3?6:normal)+phase*.13,growth=1;
  if(kind<=1&&i>=normal){angle=Math.PI*2*(i-normal)/(kind===1?8:7)+phase*.13+.13;growth=lure;}
  const ox=Math.cos(angle),oy=Math.sin(angle),tx=-oy,ty=ox,beatWave=(.5+.5*Math.sin(t*1.38))**3-.3125;
  const breath=(beatWave*.053+Math.sin(t*.49+1.3)*.011)*motion*vigor;
  let bx=ox*(kind===2?.385:.391)*(1-breath),by=oy*(kind===2?.168:.391)*(1-breath);
  if(kind<=1){const scale=membraneScale(angle,form as [number,number,number,number]);bx*=scale;by*=scale;if(kind===0){bx/=phenotype[0];by/=phenotype[1];}}
  let length=(.042+.019*Math.sin(i*2.17+phase))*(kind===2?1.5:1);if(kind<=1)length*=(1+1.15*lure)*growth;
  const cycle=t*(kind===2?7.2:2.4)-angle*2+Math.sin(angle*3+phase)*.25,beat=(Math.sin(cycle)+.32*Math.sin(cycle*2+.4))*motion*vigor;
  const points=Array.from({length:8},(_,j)=>{const u=j/7,delayed=Math.sin(cycle-u*1.9)*.35*motion*vigor,bend=(beat*.64*u*u+delayed*u*u*u+Math.sin(u*Math.PI)*.13)*length;return world(bx+ox*length*u+tx*bend-flow[0]*.009*u*u*motion,by+oy*length*u+ty*bend-flow[1]*.009*u*u*motion);});
  for(const [start,end,taper]of [[0,4,1],[4,7,.53]]){const target=bucket(batch,'#add9e6',(.21+.20*energy)*growth*opacity*(taper<1?.72:1),Math.max(width*.001,.56)*taper);target.path+=`M${points[start].x},${points[start].y}`+points.slice(start+1,end+1).map(p=>`L${p.x},${p.y}`).join('');}
 }
}
