// Presentation poses from amoeba_visual.gd and phage_visual.gd. No simulation writes.
import type {Point} from '../geometry/loopGeometry';
import {add,sub,scale,smooth} from '../ecology/drifter';
import {Amoeba,REACH_TIME} from '../ecology/amoeba';
import type {EncounterSimulation} from '../engine/encounterSimulation';
export const rotate=(point:Point,angle:number):Point=>({x:point.x*Math.cos(angle)-point.y*Math.sin(angle),y:point.x*Math.sin(angle)+point.y*Math.cos(angle)});
const lerp=(a:Point,b:Point,t:number)=>add(a,scale(sub(b,a),t));
const angleLerp=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export class AmoebaVisualState {
  private rotation=0;private clock=0;private oriented=false;
  sample(body:Amoeba,time:number,motion:number){
    const elapsed=Math.max(0,Math.min(.1,time-this.clock)),direction=['reaching','digesting','sated'].includes(body.phase)?body.ingestAxis:body.heading;
    if(direction.x**2+direction.y**2>.01){const angle=Math.atan2(direction.y,direction.x);this.rotation=this.oriented?angleLerp(this.rotation,angle,1-Math.exp(-elapsed*2.2)):angle;this.oriented=true;}
    this.clock=time;
    const rotation=this.rotation,meal=body.mealProgress(),captivePosition=body.captivePosition(motion<=0),goal=rotate(sub(body.phase==='digesting'?captivePosition:body.reachPoint,body.nucleus),-rotation);
    const extension=body.phase==='reaching'?smooth(0,REACH_TIME,body.reachAge):body.phase==='digesting'?1-smooth(.65,1.8,body.digestionAge):0;
    const ingestion=body.captiveNode>=0?smooth(0,1.1,body.digestionAge):0,closure=body.captiveNode>=0?smooth(0,.35,body.digestionAge):0;
    const low={x:extension>.001?Math.min(-120,goal.x-43):-120,y:extension>.001?Math.min(-95,goal.y-43):-95};
    const high={x:extension>.001?Math.max(120,goal.x+43):120,y:extension>.001?Math.max(95,goal.y+43):95};
    return {rotation,meal,goal,low,extent:sub(high,low),extension:extension*motion,ingestion,closure,
      captiveVisible:body.captiveNode>=0,captivePosition,
      captiveWidth:(63+(43-63)*ingestion)*(1-smooth(.45,1,meal)*.65),
      captiveAngle:(body.digestionAge*.18+Math.sin(time*.72)*.08)*motion,
      captiveOpacity:1-smooth(.92,1,meal),captiveDissolve:smooth(.6,1,meal)*.95,
      chamberRadius:(28+(24-28)*ingestion)*(1-meal*.3),
      hostCenter:add(body.nucleus,rotate({x:(.5-.534)*152,y:(.5-.463)*152},rotation)),
    };
  }
}
export interface VirionPose {key:string;at:Point;angle:number;height:number;contraction:number;opacity:number;phase:number}
export interface CapsidPose {at:Point;growth:number;fade:number}
export interface BurstFragment {at:Point;radius:number;angle:number;opacity:number}
export function phageDriftOffset(index:number,age:number):Point{
  const angle=index*Math.PI*2/3+.2;return {x:Math.cos(angle)*15+Math.sin(age*.6+index*1.7)*2.5,y:Math.sin(angle)*15+Math.cos(age*.43+index)*2.5};
}
export function samplePhageSwarm(run:EncounterSimulation,clock:number,motion:number){
  const virions:VirionPose[]=[],capsids:CapsidPose[]=[],fragments:BurstFragment[]=[],ripples:{at:Point;radius:number;opacity:number}[]=[];
  for(const group of run.phages.clusters){
    const body=run.phages.host(run,group.hostId),arrival=smooth(.1,2.5,group.age);
    for(let i=0;i<3;i++){
      let at=add(group.nucleus,phageDriftOffset(i,clock*motion)),angle=i*2.4+Math.sin(clock*.25*motion+group.id+i)*.3,contraction=0;
      if(body){
        const ports=[{x:-21,y:-7.5},{x:0,y:8.5},{x:21,y:-7.5}],facing=Math.atan2(body.heading.y,body.heading.x),targetAngle=facing+(i===1?Math.PI:0);
        const destination=sub(add(body.nucleus,rotate(ports[i],facing)),rotate({x:0,y:5.2},targetAngle)),dock=smooth(i*.12,1.25+i*.12,body.infectionAge);
        at=lerp(add(group.attachedFrom,phageDriftOffset(i,0)),destination,dock);angle=angleLerp(angle,targetAngle,dock);contraction=smooth(.7+i*.12,1.8+i*.12,body.infectionAge);
      }else angle+=group.nudgeRoll()*motion*.4;
      virions.push({key:`${group.id}:${i}`,at,angle,height:25*(.65+.35*arrival),contraction,opacity:arrival*group.opacity(),phase:i*1.71});
    }
    if(body){
      const growth=smooth(2.4,7.5,body.infectionAge),fade=1-smooth(8,9,body.infectionAge),facing=Math.atan2(body.heading.y,body.heading.x);
      for(let i=0;i<17;i++)capsids.push({at:add(body.nucleus,rotate({x:Math.sin(i*2.399)*27,y:Math.cos(i*1.73)*5},facing)),growth,fade});
    }
  }
  for(const burst of run.phages.bursts){
    const fade=1-smooth(.8,3.2,burst.age),spread=(1-Math.exp(-burst.age*1.8))*40*motion;
    for(let i=0;i<14;i++){
      const angle=i*2.399+burst.serial,origin=rotate({x:Math.sin(i*1.71)*25,y:Math.cos(i*2.39)*6},burst.angle);
      const at=add(add(burst.at,origin),{x:Math.cos(angle)*spread,y:Math.sin(angle)*spread});
      if(i<6)virions.push({key:`burst:${burst.serial}:${i}`,at,angle:angle+burst.age*.15*motion,height:9,contraction:0,opacity:fade*.7,phase:i*1.71});
      fragments.push({at,radius:2+i%3,angle,opacity:fade*.46});
    }
    if(motion>0)ripples.push({at:burst.at,radius:15+spread,opacity:fade*.10});
  }
  return {virions,capsids,fragments,ripples};
}
/** Source sprite phases stay with a virion while other clusters arrive or leave. */
export class PhageVisualState {
  private phases=new Map<string,number>();
  sample(run:EncounterSimulation,clock:number,motion:number){
    const poses=samplePhageSwarm(run,clock,motion),wanted=new Set<string>();
    for(const virion of poses.virions){
      wanted.add(virion.key);if(!this.phases.has(virion.key))this.phases.set(virion.key,this.phases.size*1.71);
      virion.phase=this.phases.get(virion.key)!;
    }
    for(const key of this.phases.keys())if(!wanted.has(key))this.phases.delete(key);
    return poses;
  }
}
