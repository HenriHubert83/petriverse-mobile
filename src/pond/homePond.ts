// Home-pond presentation rules from prototype/scripts/home_pond.gd.
// This model owns no live journey, simulation clock, rewards or gameplay fluid.
// See CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {SeededRandom} from '../engine/seededRandom';
import {godotStringHash} from './godotHash';
import {newResidents,residentCompanion,residentMaturity,keepsakeUnlocked} from '../storage/journeyProfile';
import type {JourneyProfile,ProfileResident} from '../storage/journeyProfile';
import {KEEPSAKES} from '../campaign/journeyMastery';
import type {Feat} from '../campaign/journeyMastery';

export const POND_PAGE_SIZE=36,EPILOGUE_RESIDENTS=12,WELCOME_SECONDS=6;
const TAU=Math.PI*2;
const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
const scale=(a:Point,s:number):Point=>({x:a.x*s,y:a.y*s});
const lerp=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const direction=(angle:number):Point=>({x:Math.cos(angle),y:Math.sin(angle)});
const bounded=(p:Point,max:number):Point=>{const length=Math.hypot(p.x,p.y);return length>max?scale(p,max/length):p;};
const smooth=(a:number,b:number,value:number):number=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);};

export interface PondResident {
  record:ProfileResident;home:Point;phase:number;texturePhase:number;extent:number;habit:number;maturity:number;
  companion?:ProfileResident;
}
export interface PondDecoration {form:string;home:Point;phase:number;width:number;opacity:number;feat?:Feat}
export interface PondGarden {id:Feat;name:string;form:string}
export interface HomePondLayout {
  page:number;pageCount:number;total:number;epilogue:boolean;
  residents:PondResident[];algae:PondDecoration[];keepsakes:PondDecoration[];gardens:PondGarden[];
  mother:{position:Point;width:number;stage:number;traits:string[]};
}
export interface PondResidentPose extends PondResident {position:Point;rotation:number;width:number;opening:number;glow:number;welcoming:boolean}
export interface PondDecorationPose extends PondDecoration {position:Point;rotation:number}
export interface HomePondFrame {
  residents:PondResidentPose[];algae:PondDecorationPose[];keepsakes:PondDecorationPose[];
  mother:HomePondLayout['mother']&{rotation:number};
}
export function homePondInitialPage(profile:JourneyProfile):number{
  const index=profile.residents.findIndex(resident=>!resident.welcomed);return index<0?0:Math.floor(index/POND_PAGE_SIZE);
}
export function buildHomePond(profile:JourneyProfile,page=0,epilogue=false):HomePondLayout{
  const total=profile.residents.length,pageCount=Math.max(1,Math.ceil(total/POND_PAGE_SIZE));
  const selectedPage=Math.max(0,Math.min(pageCount-1,Number.isFinite(page)?Math.trunc(page):0));
  const count=epilogue?EPILOGUE_RESIDENTS:POND_PAGE_SIZE,start=epilogue?Math.max(0,total-count):selectedPage*POND_PAGE_SIZE;
  // Copies keep an old presentation frame independent of subsequent profile edits.
  const records=profile.residents.slice(start,start+count).map(record=>({...record}));
  const residents=records.map((record,index):PondResident=>{
    const rng=new SeededRandom(godotStringHash(record.token)),extent=record.rare?94:rng.float(48,67);
    const texturePhase=rng.float(0,TAU),angle=index*2.399+rng.float(-0.25,0.25),radius=150+(index%4)*45;
    return {record,extent,texturePhase,home:scale(direction(angle),radius),phase:rng.float(0,TAU),
      habit:godotStringHash(record.token)%3,maturity:residentMaturity(profile,record),
      companion:residentCompanion(profile,record,records)};
  });
  const algae:PondDecoration[]=new Set(profile.residents.map(record=>record.form)).size>=3?
    Array.from({length:9},(_,i)=>({form:'fern_desmid',home:scale(direction(i*2.399),(238+i%3*25)*(epilogue?0.8:1)),phase:i*1.71,width:12+i%3*3,opacity:0.45})):[];
  const gardenForms:Record<Feat,string>={guardian:'snow_spore',gatherer:'fern_desmid',clear_water:'glass_harp'};
  const keepsakes:PondDecoration[]=[],gardens:PondGarden[]=[];
  for(const [j,id] of (Object.keys(gardenForms) as Feat[]).entries()){
    if(!keepsakeUnlocked(profile,id))continue;
    const form=gardenForms[id];gardens.push({id,name:KEEPSAKES[id],form});
    for(let i=0;i<6;i++)keepsakes.push({feat:id,form,home:add(scale(direction(-2.75+j*2.1),275),scale(direction(i*2.399),16+i*5)),
      phase:i*1.71+j,width:(id==='clear_water'?32:18)+i%3*4,opacity:0.65});
  }
  return {page:selectedPage,pageCount,total,epilogue,residents,algae,keepsakes,gardens,
    mother:{position:{x:640,y:epilogue?430:450},width:epilogue?217:145,stage:Math.max(0,profile.deepestDish*4-1),traits:[...profile.lastColonyTraits]}};
}

/** Sample from the pond's own clock. Pause/reduced-motion clock control lives below. */
export function sampleHomePond(layout:HomePondLayout,time:number,options:{welcomeTokens?:readonly string[];welcomeRemaining?:number;reducedMotion?:boolean}={}):HomePondFrame{
  const clock=Number.isFinite(time)?Math.max(0,time):0,mother=layout.mother.position;
  const newcomers=new Set(options.welcomeTokens??[]),remaining=Math.max(0,Math.min(WELCOME_SECONDS,options.welcomeRemaining??0));
  const residents=layout.residents.map((specimen,i):PondResidentPose=>{
    const phase=specimen.phase;
    let drift={x:Math.sin(clock*0.042+phase)*34+Math.sin(clock*0.071+phase*2)*13,
      y:Math.sin(clock*0.035+phase*1.7)*28+Math.sin(clock*0.063+phase)*16};
    let home={...specimen.home};
    if(specimen.habit===0)home=scale(home,1-0.17*(0.5+Math.sin(clock*0.043+phase)*0.5));
    else if(specimen.habit===1){
      const kin=layout.residents.filter(other=>other.record.token!==specimen.record.token&&other.record.form===specimen.record.form);
      if(kin.length)home=lerp(home,scale(kin.reduce((sum,other)=>add(sum,other.home),{x:0,y:0}),1/kin.length),0.20);
    }else drift=scale(drift,0.45);
    if(specimen.companion){
      const other=layout.residents.find(other=>other.record.token===specimen.companion!.token);
      if(other)home=lerp(home,other.home,smooth(-0.25,0.85,Math.sin(clock*0.047+phase))*0.32);
    }
    let offset=add(home,drift);
    if(layout.epilogue){
      const angle=i*2.399+phase*0.06;
      offset=add({x:Math.cos(angle)*(213+i%2*17),y:Math.sin(angle)*(136+i%2*11)},scale(drift,0.2));
    }
    let position=add(mother,bounded(offset,332));
    const welcoming=newcomers.has(specimen.record.token)&&remaining>0;
    if(!options.reducedMotion&&welcoming){
      const length=Math.hypot(home.x,home.y),entry=add(mother,length?scale(home,350/length):{x:0,y:0});
      position=lerp(entry,position,smooth(0,1,(WELCOME_SECONDS-remaining)/3));
    }
    const opening=0.5+Math.sin(clock*TAU/18+phase)*0.5;
    return {...specimen,position,rotation:phase+Math.sin(clock*0.07+phase)*0.35,width:specimen.extent*(0.78+0.22*specimen.maturity),
      opening:specimen.record.rare?opening:1,glow:specimen.record.form==='glowdrift'?opening*0.6:0,welcoming};
  });
  const algae=layout.algae.map((specimen,i):PondDecorationPose=>({...specimen,
    position:add(mother,add(specimen.home,{x:Math.sin(clock*0.023+i*2.399)*18,y:Math.cos(clock*0.019+i*2.399)*18})),rotation:specimen.phase}));
  const keepsakes=layout.keepsakes.map((specimen):PondDecorationPose=>({...specimen,
    position:add(mother,add(specimen.home,{x:Math.sin(clock*0.045+specimen.phase)*8,y:Math.cos(clock*0.033+specimen.phase)*8})),
    rotation:specimen.phase+Math.sin(clock*0.03+specimen.phase)*0.12}));
  return {residents,algae,keepsakes,mother:{...layout.mother,position:{...mother},traits:[...layout.mother.traits],rotation:Math.sin(clock*0.13)*0.06}};
}
export function pickPondResident(frame:HomePondFrame,at:Point):string|undefined{
  let selected:string|undefined,nearest=45;
  for(const resident of frame.residents){
    const distance=Math.hypot(at.x-resident.position.x,at.y-resident.position.y);
    if(distance<nearest){nearest=distance;selected=resident.record.token;}
  }
  return selected;
}

/** Presentation timers are independent of journey progression and wall-clock time. */
export class HomePondClock {
  time=0;welcomeRemaining=0;welcomeTokens:string[]=[];
  open(profile:JourneyProfile):{page:number;selectedToken?:string}{
    this.welcomeTokens=newResidents(profile).map(resident=>resident.token);
    this.welcomeRemaining=this.welcomeTokens.length?WELCOME_SECONDS:0;
    return {page:homePondInitialPage(profile),selectedToken:this.welcomeTokens[0]};
  }
  step(delta:number,options:{blocked?:boolean;reducedMotion?:boolean}={}):string[]{
    if(!Number.isFinite(delta)||delta<=0||options.blocked)return [];
    if(!options.reducedMotion)this.time+=delta;
    if(this.welcomeRemaining<=0)return [];
    this.welcomeRemaining=Math.max(0,this.welcomeRemaining-delta);
    if(this.welcomeRemaining>0)return [];
    const welcomed=this.welcomeTokens;this.welcomeTokens=[];return welcomed;
  }
}
