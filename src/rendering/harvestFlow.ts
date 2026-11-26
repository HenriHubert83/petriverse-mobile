// Nutrient thread geometry from prototype/scripts/harvest_flow.gd.
import type {Point} from '../geometry/loopGeometry';
import type {Clot} from '../geometry/clot';
import {add,scale,smooth,sub,unit} from '../ecology/drifter';

export function streamPosition(origin:Point,target:Point,age:number,strand:number,u:number):Point{
  const delta=sub(target,origin),side=unit({x:delta.y,y:-delta.x});
  const arch=Math.sin(u*Math.PI)*(Math.sin(u*3.1-age*0.73+strand)*7+strand*2.5);
  return add(add(origin,scale(delta,u)),scale(side,arch));
}
export interface NutrientFlow {
  serial:number;color:string;fade:number;target:Point;reducedMotion:boolean;strands:Point[][];
  particles:{position:Point;trail:Point[];alpha:number;radius:number}[];
}
export function sampleHarvestFlow(clots:readonly Clot[],target:Point,reducedMotion=false):NutrientFlow[]{
  return clots.filter(clot=>clot.food>0||clot.poison>0).map(clot=>{
    const t=clot.progress(),fade=smooth(0.22,0.35,t)*(1-smooth(0.78,0.98,t));
    const position=(strand:number,u:number)=>streamPosition(clot.center,target,clot.age,strand,u);
    return {serial:clot.serial,color:clot.poison>0?'#e9a1c3':'#d1eaa0',fade,target:{...target},reducedMotion,
      strands:reducedMotion?[]:Array.from({length:2},(_,strand)=>Array.from({length:24},(_,i)=>position(strand,i/23))),
      particles:reducedMotion?[]:Array.from({length:Math.min(12,clot.food*2+clot.poison*3)},(_,i)=>{
        const u=smooth(0,1,(t-0.26)*2.2-i*0.033);
        return {position:position(i%2,u),alpha:Math.sin(u*Math.PI)*fade,radius:0.85+i%3*0.13,
          trail:Array.from({length:4},(_,j)=>position(i%2,Math.max(0,u-(3-j)*0.012)))};
      })};
  });
}
