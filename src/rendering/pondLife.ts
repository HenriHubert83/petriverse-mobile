// Authored ambient routes and recipe from pond_life.gd. No gameplay RNG access.
import {SeededRandom} from '../engine/seededRandom';
import type {FluidField} from '../engine/fluidField';
import type {Point} from '../geometry/loopGeometry';
import type {MissionAppearance} from './missionAppearance';
import {WaterInteraction} from './waterInteraction';
const TAU=Math.PI*2,center={x:640,y:450},fract=(n:number)=>n-Math.floor(n);
export interface PondSpecimen {at:Point;extent:number;phase:number;kind:number;opacity:number;blur:number;swim:number[]}
export interface PondDebris {at:Point;size:Point;phase:number;angle:number;depth:number;kind:number;speed:number;alpha:number}
export function pondPopulation(look:MissionAppearance){
 const rng=new SeededRandom(look.lifeSeed),specimens:PondSpecimen[]=[];
 for(let i=0;i<look.lifeCount;i++){
  const a=rng.float()*TAU,r=Math.sqrt(rng.float(.06,.83))*380,kind=[[1,3,1,2,0],[0,2,0,1,2],[2,3,2,1,3]][look.biome][i%5];
  const extent=kind===0?rng.float(24,44):rng.float(19,38),phase=rng.float()*TAU,opacity=rng.float(.78,.94),blur=rng.float(.001,.0025);
  const interval=kind===1?rng.float(6.5,10):rng.float(12,18),reach=kind===1?rng.float(48,70):rng.float(42,62);
  specimens.push({at:{x:center.x+Math.cos(a)*r,y:center.y+Math.sin(a)*r},extent,phase,kind,opacity,blur,swim:[interval,rng.float(0,80),reach,rng.float(.12,.78)]});
 }
 const dust=new SeededRandom(look.dustSeed),debris:PondDebris[]=Array(look.dustCount);
 for(let i=0;i<look.dustCount;i++){
  const angle=dust.float()*TAU,radius=Math.sqrt(dust.float())*378,depth=dust.float(),category=i*264/look.dustCount;
  let kind=0,size={x:0,y:0};size.x=dust.float(2,4.5);size.y=size.x;let alpha=dust.float(.2,.4);
  if(category>=250){kind=4;size={x:dust.float(14,34),y:8};alpha=.24;}
  else if(category>=224){kind=3;size={x:dust.float(6,11),y:dust.float(4,8)};alpha=dust.float(.16,.28);}
  else if(category>=196){kind=2;size={x:dust.float(7,12),y:dust.float(4,7)};alpha=dust.float(.20,.34);}
  else if(category>=160){kind=1;size={x:dust.float(4.5,8),y:3};}
  const rotation=dust.float()*TAU;debris[i*97%look.dustCount]={at:{x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius},size,angle:rotation,phase:dust.float()*TAU,depth,kind,speed:dust.float(),alpha};
 }
 return {specimens,debris};
}
function waypoint(leg:number,s:PondSpecimen):Point{
 const angle=fract(Math.sin(leg*127.1+s.phase*311.7)*43758.5453)*TAU,distance=(.35+fract(Math.sin(leg*269.5+s.phase*183.3)*23421.631)*.65)*s.swim[2];
 const dx=s.at.x+Math.cos(angle)*distance-center.x,dy=s.at.y+Math.sin(angle)*distance-center.y,scale=Math.min(1,353/Math.hypot(dx,dy));return {x:center.x+dx*scale,y:center.y+dy*scale};
}
export function swimmingPosition(s:PondSpecimen,time:number):Point{
 const at=(time+Math.sin(time*.31+s.phase)*.65+s.swim[1])/s.swim[0],leg=Math.floor(at),f=fract(at),a=waypoint(leg-1,s),b=waypoint(leg,s),c=waypoint(leg+1,s),d=waypoint(leg+2,s);
 const axis=(key:'x'|'y')=>.5*(2*b[key]+(-a[key]+c[key])*f+(2*a[key]-5*b[key]+4*c[key]-d[key])*f*f+(-a[key]+3*b[key]-3*c[key]+d[key])*f*f*f);return {x:axis('x'),y:axis('y')};
}
export function samplePondSpecimen(s:PondSpecimen,clock:number,motion:number,look:MissionAppearance,fluid:FluidField){
 const t=clock*motion,swim=swimmingPosition(s,t),at={x:swim.x+Math.sin(t*.029+look.biome)*5,y:swim.y+Math.cos(t*.023+look.biome)*4},offset=fluid.displacement(at),current=WaterInteraction.displacement(at,fluid.sources,[],[]);
 if(motion){at.x+=(current.x*.65+offset.x*(.90+s.swim[3]*.55))*motion;at.y+=(current.y*.65+offset.y*(.90+s.swim[3]*.55))*motion;}else{at.x=s.at.x;at.y=s.at.y;}
 let angle=s.phase+Math.sin(t*.067+s.phase)*.33+Math.sin(t*.037+s.phase*1.9)*.21;
 if(s.kind===1){const ahead=swimmingPosition(s,t+.3),behind=swimmingPosition(s,t-.3);angle=Math.atan2(ahead.y-behind.y,ahead.x-behind.x)+Math.PI*.25;}
 if(!motion)angle=s.phase;
 const depth=Math.max(0,Math.min(1,s.swim[3]+(Math.sin(t*.081+s.phase)*.14+Math.sin(t*.043+s.phase*2.3)*.09)*motion));
 return {at,angle,depth,extent:s.extent*(1+(s.swim[3]-depth)*.055),blur:s.blur+depth*.010};
}
export function samplePondDebris(d:PondDebris,clock:number,motion:number,look:MissionAppearance,fluid:FluidField){
 const t=clock*motion,speed=.085+d.speed*.075;
 let x=Math.sin(t*speed+d.phase)*(18+d.depth*39)+Math.sin(t*.24+d.phase*1.7)*3,y=Math.cos(t*speed*.76+d.phase*1.3)*(18+d.depth*39)+Math.cos(t*.21+d.phase)*3;
 if(d.kind===2){x+=Math.sin(t*.22+d.phase)*18;y+=Math.cos(t*.17+d.phase)*18;}
 if(look.biome===1){x+=Math.sin(t*.035)*8;y+=Math.cos(t*.031)*3;}else if(look.biome===2){x+=Math.sin(t*.022)*3;y+=Math.sin(t*.029)*9;}
 const at={x:d.at.x+x*.24*motion,y:d.at.y+y*.24*motion},offset=fluid.displacement(at),current=WaterInteraction.displacement(at,fluid.sources,[],[]);
 at.x+=(offset.x+current.x)*motion*(1.05+d.depth*.8);at.y+=(offset.y+current.y)*motion*(1.05+d.depth*.8);
 return {at,angle:d.angle+(Math.sin(t*.13+d.phase)*.20+Math.sin(t*.083+d.phase*1.7)*.12)*motion};
}
