// Parameter mapping from microscope.gd. Presentation only; never advances simulation.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {CORE_UVS,CORE_RADII} from '../engine/motherDamage';
import {Drifter,smooth} from '../ecology/drifter';
import {Bacterium} from '../ecology/bacterium';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import type {MissionAppearance} from './missionAppearance';
export type TissueUniforms=Record<string,number|number[]>;
const zeros=(n:number)=>Array<number>(n).fill(0);
export function tissueDefaults():TissueUniforms{return {
 clock:0,phase:0,motion:1,energy:1,selected:0,warmth:0,kind:0,feeding:0,shock:0,threat_direction:[0,0],threat_strength:0,dissolve:0,infection:0,division:0,bell_breath:0,visitor_open:1,visitor_glow:0,arrival:1,
 colony_grade:[1,1,1],water_base:[.055,.115,.150],light_direction:[-.65,-1],water_immersion:.16,phenotype:[1,1,0,0],core_sites:CORE_UVS.flatMap(p=>[p.x,p.y]),core_radii:[...CORE_RADII],core_damage:zeros(7),injury_sites:CORE_UVS.flatMap(p=>[p.x,p.y]),injury_pulse:zeros(7),injury_opening:zeros(7),injury_seal:zeros(7),invading_depth:0,host_center:[0,0],host_extent:[120,120],host_rotation:0,fatal_damage:0,mother_response:0,armor_damage:0,protection_layers:0,evolution_layers:0,nourishment:0,nucleus_uv:[.5,.5],adaptations:zeros(4),traits:zeros(4),evolution_form:zeros(4),evolution_organs:zeros(12),flow_velocity:[0,0],growth_front:1,growth_pulse:0,
};}
export function sceneTissue(run:EncounterSimulation,look:MissionAppearance,reducedMotion:boolean):TissueUniforms{return {
 ...tissueDefaults(),clock:reducedMotion?0:run.elapsed,motion:reducedMotion?0:1,colony_grade:look.colonyGrade,water_base:look.waterBase.map((v,i)=>v*look.waterGrade[i]),light_direction:look.lightDirection,
};}
export function bodyTissue(body:Drifter,reducedMotion:boolean):TissueUniforms{
 const kind=({bacterium:8,food:6,cyst:7,shellback:3,twinspore:4,divider:4,parasite:5,conjoined:5} as Record<string,number>)[body.kind]??2;
 const opening='opening'in body&&typeof body.opening==='function'?body.opening():1;
 const hatch=body.cradle&&'hatchRemaining'in body&&typeof body.hatchRemaining==='function'?body.hatchRemaining():-1;
 const breath='currentStrength'in body&&typeof body.currentStrength==='function'?body.currentStrength():0;
 return {kind,phase:body.id*.8,warmth:body.isBoss()?.6:1,feeding:Math.sin(body.huntTime/6*Math.PI)*.6,energy:body.slowed>0?.9:1,shock:body.hitFlash*.5,selected:body.shieldFlash*.8,visitor_open:body.visitor&&!reducedMotion?opening:1,visitor_glow:body.form==='glowdrift'&&!reducedMotion?opening*.6:0,
 division:hatch>=0?smooth(.35,1,1-hatch/12):body instanceof EcologyEnemy&&body.kind==='divider'&&!body.daughter?smooth(12,20,body.age):0,
 infection:body instanceof Bacterium?Math.max(0,Math.min(body.infectionAge/9,1)):0,dissolve:body instanceof Bacterium?smooth(7.8,9,body.infectionAge):hatch>=0?(1-smooth(0,2,hatch))*.5:0,
 armor_damage:body.kind==='shellback'&&body.health===1?1:0,protection_layers:(body.isBoss()||body.kind==='bell_bud')&&!body.canTakePulse()?body.health:body.cradle&&body.gateIds.length?2:0,bell_breath:reducedMotion?0:breath,flow_velocity:reducedMotion?[0,0]:[Math.min(body.speed/12,1),0]};
}
export function motherTissue(run:EncounterSimulation,reducedMotion:boolean):TissueUniforms{
 const sites=CORE_UVS.flatMap(p=>[p.x,p.y]),pulses=zeros(7),opening=zeros(7),seals=zeros(7),progress=Array.from(run.motherDamage.progressValues());
 for(const bite of run.motherDamage.bites){const i=bite.core,age=bite.age;sites[i*2]=(bite.origin.x-run.board.center.x)/120+.5;sites[i*2+1]=(bite.origin.y-run.board.center.y)/120+.5;
 pulses[i]=Math.sin(Math.min(age/1.4,1)*Math.PI)*.7;opening[i]=reducedMotion?0:smooth(.04,.34,age)*(1-smooth(.72,1.24,age));seals[i]=reducedMotion?0:Math.sin(smooth(1.30,2.2,age)*Math.PI);}
 const fatal=run.integrity===0?Math.min(...run.motherDamage.activeIndices().map(i=>progress[i])):0;
 return {kind:1,phase:1,core_damage:progress,injury_sites:sites,injury_pulse:pulses,injury_opening:opening,injury_seal:seals,fatal_damage:fatal,shock:reducedMotion?0:run.motherDamage.recoil(),mother_response:run.state==='complete'?1:run.state==='loss'?run.integrity===0?-1:-.35:0};
}
// Authored lobe orientation and maturation. Does not move the capture nucleus.
export function bodyPose(body:Drifter,center:{x:number;y:number},clock:number,reducedMotion:boolean,lobe=0){
 const nuclei=body.nuclei(),at=nuclei[lobe],other=nuclei[1-lobe],movement=reducedMotion?0:1;
 let angle=other?Math.atan2(other.y-at.y,other.x-at.x):Math.atan2(center.y-at.y,center.x-at.x);
 if(['grazer','parasite','divider','drifter','bacterium'].includes(body.kind)&&Math.hypot(body.heading.x,body.heading.y)>.001)angle=Math.atan2(body.heading.y,body.heading.x);
 let rate=body.isBoss()?.7:body.kind==='shellback'?1:body.kind==='twinspore'?2.1:4.8,extent=body.isBoss()?.075:body.kind==='shellback'?.018:body.kind==='twinspore'?.055:.035;
 if(['food','cyst','spore'].includes(body.kind)){rate=.65;extent=.12;}
 const phase=body.id*.8+lobe;angle+=(Math.sin(clock*rate+phase)*.72+Math.sin(clock*rate*.43+phase*1.73)*.28)*extent*movement;
 if(body.kind==='cyst'&&'nudgeRoll'in body&&typeof body.nudgeRoll==='function')angle+=body.nudgeRoll()*movement;
 let scaleX=1,scaleY=1;
 if(body instanceof Bacterium){const infection=Math.max(0,body.infectionAge/9);scaleX+=infection*.05;scaleY+=infection*.25;}
 if(body instanceof EcologyEnemy&&body.kind==='divider'){const division=body.daughter?0:smooth(12,20,body.age),size=body.daughter?.70:1;scaleX=(1+division*.18)*size;scaleY=size;}
 if(body.cradle&&'hatchRemaining'in body&&typeof body.hatchRemaining==='function'){const remaining=body.hatchRemaining();if(remaining>=0)scaleX=1+(1-remaining/12)*.35*movement;}
 return {angle,scaleX,scaleY};
}
