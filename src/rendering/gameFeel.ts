// Presentation-only port of pinned prototype/scripts/game_feel.gd. See CREDITS.md.
// A private visual RNG never consumes gameplay randomness. Shake is sampled for
// parity, but mobile keeps the dish and touch camera aligned and does not apply it.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {HarvestResult} from '../campaign/journeyHarvest';
import type {Point} from '../geometry/loopGeometry';
import {add,sub,scale,unit,smooth} from '../ecology/drifter';
import {JourneyBoss} from '../campaign/journeyBoss';
import {dishForStage} from '../campaign/journeyPlan';
import {creatureDefinition} from '../content/creatureCatalogue';
import {SeededRandom} from '../engine/seededRandom';

export const HEARTBEAT=1.45,MAX_MOTES=14,MOTE_FLIGHT=0.72,MOTE_STAGGER=0.075;
export const FEEL_COLORS={pearl:'#d8f6ee',food:'#c6eba4',danger:'#f2a3c4',warm:'#edb184'} as const;
const {pearl:PEARL,food:FOOD,danger:DANGER,warm:WARM}=FEEL_COLORS;
const NOTES=[0,2,4,7,9,12,14,16,19,21,24];
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp=(a:Point,b:Point,t:number)=>add(a,scale(sub(b,a),t));
const magnitude=(p:Point)=>Math.hypot(p.x,p.y);
const orthogonal=(p:Point)=>({x:p.y,y:-p.x});
const rotated=(p:Point,r:number)=>({x:p.x*Math.cos(r)-p.y*Math.sin(r),y:p.x*Math.sin(r)+p.y*Math.cos(r)});
const angle=(r:number)=>({x:Math.cos(r),y:Math.sin(r)});
export interface GameFeelOptions {reducedMotion?:boolean;quality?:0|1|2;journeyComplete?:boolean;encounterTotal?:number;hidden?:boolean;paused?:boolean;announce?:boolean}
export interface GameFeelCue {name:'mote'|'heartbeat'|'ui_press'|'swell';gain:number;pitch:number}
export interface FeelRing {at:Point;age:number;life:number;from:number;to:number;color:string;width:number}
export interface FeelSpark {at:Point;velocity:Point;age:number;life:number;size:number;color:string}
export interface FeelFlash {polygon:Point[];age:number;life:number;color:string}
export interface FeelNumber {at:Point;text:string;detail:string;age:number;life:number;color:string;size:number}
export interface FeelMote {from:Point;to:Point;control:string;age:number;delay:number;units:number;color:string;note:number;bend:number}
export interface FeelCard {caption:string;title:string;detail:string;age:number;life:number;color:string;boss:boolean}
interface Counter {shown:number;target:number;pop:number}

export function bossWindow(run:EncounterSimulation):boolean {
  const boss=run.state==='active'?run.boss():undefined;
  return Boolean(boss?.canTakePulse()&&(!(boss instanceof JourneyBoss)||boss.variant!==2||boss.contraction()>0.8));
}
export function motePosition(mote:FeelMote,age=mote.age):Point {
  const t=clamp((age-mote.delay)/MOTE_FLIGHT),smoothT=t*t*(3-2*t),eased=smoothT+(t*t-smoothT)*0.45;
  const lift=scale(unit(orthogonal(sub(mote.to,mote.from))),clamp(magnitude(sub(mote.to,mote.from))*0.28,40,160)*mote.bend);
  const control=add(add(scale(add(mote.from,mote.to),0.5),lift),{x:0,y:-60});
  return lerp(lerp(mote.from,control,eased),lerp(control,mote.to,eased),eased);
}

export class GameFeel {
  clock=0;visible=true;reducedMotion=false;quality:0|1|2=2;
  motes:FeelMote[]=[];sparks:FeelSpark[]=[];flashes:FeelFlash[]=[];rings:FeelRing[]=[];numbers:FeelNumber[]=[];
  trauma=0;shake:Point={x:0,y:0};hurt=0;hurtPip=-1;healGlow=0;critical=0;celebration=0;beatClock=0;card:FeelCard|undefined;
  lastCardDish='';bossOpen=false;
  private run:EncounterSimulation|undefined;private lastCapture=0;private lastIntegrity=-1;private lastState='';private lastObjective=-1;
  private lastPathSize=0;private lastClosed=false;private lastSecond=-1;private readyCells:boolean[]=[];
  private drawnPoints:Point[]=[];private drawnSerial=0;private discovered:string[]=[];private pendingDiscovery='';
  private counters=new Map<string,Counter>();private cues:GameFeelCue[]=[];private rng=new SeededRandom(1);
  constructor(run?:EncounterSimulation){if(run)this.reset(run);}
  reset(run:EncounterSimulation):void {
    if(this.run&&this.run.runSeed!==run.runSeed)this.lastCardDish='';
    this.run=run;this.clock=0;this.motes=[];this.sparks=[];this.flashes=[];this.rings=[];this.numbers=[];this.cues=[];
    this.counters.clear();this.trauma=0;this.shake={x:0,y:0};this.hurt=0;this.healGlow=0;this.celebration=0;this.critical=0;this.beatClock=0;this.card=undefined;
    this.lastCapture=run.captureSerial;this.lastIntegrity=run.integrity;this.lastState=run.state;this.lastObjective=-1;
    this.lastPathSize=run.selection.active?run.selection.path.length:0;this.lastClosed=run.selection.closed;this.lastSecond=-1;
    this.readyCells=run.cells.map((_,i)=>run.isReady(i));this.drawnPoints=[];this.drawnSerial=run.captureSerial;
    this.discovered=[...run.seenSpecies];this.pendingDiscovery='';this.bossOpen=bossWindow(run);
    this.rng=new SeededRandom(BigInt(run.runSeed)^BigInt(run.encounterIndex+1)*0x45d9f3bn);
    this.trackCounters(run);
  }
  shown(name:string,actual:number):number {
    let counter=this.counters.get(name);if(!counter){counter={shown:actual,target:actual,pop:0};this.counters.set(name,counter);}counter.target=actual;
    return actual<counter.shown?actual:clamp(Math.floor(counter.shown+0.001),0,Math.max(0,actual));
  }
  pop(name:string):number{return this.counters.get(name)?.pop??0;}
  heldUnits(name:string):number{return this.motes.filter(mote=>mote.control===name).reduce((sum,mote)=>sum+mote.units,0);}
  drainCues():GameFeelCue[]{const cues=this.cues;this.cues=[];return cues;}
  private cue(name:GameFeelCue['name'],gain:number,pitch=1):void{this.cues.push({name,gain,pitch});}
  private setPop(name:string,value=1):void {
    if(!this.counters.has(name))this.counters.set(name,{shown:0,target:0,pop:value});else this.counters.get(name)!.pop=value;
  }
  update(run:EncounterSimulation,delta:number,options:GameFeelOptions={}):void {
    if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid feedback delta');
    if(run!==this.run)this.reset(run);
    this.reducedMotion=options.reducedMotion??false;this.quality=options.quality??2;
    // Switching this option also ends already-travelling effects immediately.
    if(this.reducedMotion){this.motes=[];this.sparks=[];this.shake={x:0,y:0};}
    const paused=run.state==='paused'||Boolean(options.paused);this.visible=!paused&&!options.hidden;
    if(run.captureSerial!==this.lastCapture){if(run.captureSerial>this.lastCapture&&run.lastCapture)this.onCapture(run,run.lastCapture);this.lastCapture=run.captureSerial;}
    if(run.integrity<this.lastIntegrity)this.onInjury(run,this.lastIntegrity-run.integrity);
    else if(run.integrity>this.lastIntegrity&&['active','brief','complete'].includes(run.state))this.healGlow=1;
    this.lastIntegrity=run.integrity;
    if(run.state!==this.lastState){this.onState(run,this.lastState,options);this.lastState=run.state;}
    this.trackCounters(run);this.observeSelection(run);
    if(paused)return;
    this.observeClock(run);this.observeBoss(run);this.observeRecovery(run);this.observeDiscovery(run);
    this.clock+=delta;this.advance(run,delta);
  }
  private trackCounters(run:EncounterSimulation):void {
    const actual=run.harvest.nourishment,held=this.heldUnits('objective');let counter=this.counters.get('objective');
    if(!counter){counter={shown:Math.max(0,actual-held),target:actual,pop:0};this.counters.set('objective',counter);}
    if(actual<counter.target)counter.shown=Math.max(0,actual-held);counter.target=actual;this.lastObjective=actual;
    for(const name of ['biomass','score'] as const){
      const value=run[name];let c=this.counters.get(name);if(!c){c={shown:value,target:value,pop:0};this.counters.set(name,c);}
      if(value<c.shown)c.shown=value;c.target=value;
    }
  }
  private observeSelection(run:EncounterSimulation):void {
    const selection=run.selection,size=selection.active?selection.path.length:0;
    if(run.state==='active'&&size>this.lastPathSize&&size>0)this.rings.push({at:{...run.board.anchors[selection.path[size-1]]},age:0,life:0.38,from:26,to:44,color:PEARL,width:1.6});
    if(size>=2){this.drawnPoints=selection.path.map(i=>({...run.board.anchors[i]}));this.drawnSerial=run.captureSerial;}
    else if(size===0&&this.drawnPoints.length>=2){if(run.captureSerial===this.drawnSerial&&run.state==='active')this.fizzle(this.drawnPoints);this.drawnPoints=[];}
    const closed=selection.active&&selection.closed;
    if(closed&&!this.lastClosed&&size>0)this.rings.push({at:{...run.board.anchors[selection.path[0]]},age:0,life:0.55,from:30,to:64,color:PEARL,width:2.4});
    this.lastPathSize=size;this.lastClosed=closed;
  }
  private observeClock(run:EncounterSimulation):void {
    if(run.state!=='active'||run.lessonActive()){this.lastSecond=-1;return;}
    const remaining=Math.ceil(run.harvest.deadline()-run.stageElapsed);
    if(remaining!==this.lastSecond&&this.lastSecond>=0&&remaining<=10&&remaining>=1){this.setPop('timer');this.cue('ui_press',0.35+0.04*(10-remaining),0.62);}
    this.lastSecond=remaining;
  }
  private observeBoss(run:EncounterSimulation):void {
    const boss=run.boss(),open=bossWindow(run);
    if(open&&!this.bossOpen&&boss){
      const together=boss instanceof JourneyBoss&&boss.variant===2;
      this.rings.push({at:{...boss.nucleus},age:0,life:0.9,from:40,to:120,color:PEARL,width:2.6});
      this.numbers.push({at:add(boss.nucleus,{x:0,y:-40}),text:together?'Together':'Open',detail:together?'ONE LOOP, BOTH HEARTS':'CAPTURE THE CENTER',age:0,life:1.8,color:PEARL,size:26});this.cue('swell',0.4);
    }
    this.bossOpen=open;
  }
  private observeRecovery(run:EncounterSimulation):void {
    const ready=run.cells.map((_,i)=>run.isReady(i));
    if(run.state==='active'&&this.readyCells.length===ready.length&&!this.reducedMotion)ready.forEach((now,i)=>{
      if(now&&!this.readyCells[i])this.rings.push({at:{...run.board.anchors[i]},age:0,life:0.5,from:22,to:38,color:PEARL,width:1.2});
    });this.readyCells=ready;
  }
  private observeDiscovery(run:EncounterSimulation):void {
    if(run.state!=='active'){this.discovered=[...run.seenSpecies];return;}
    const fresh=run.seenSpecies.filter(id=>!this.discovered.includes(id));if(fresh.length)this.pendingDiscovery=fresh[fresh.length-1];this.discovered=[...run.seenSpecies];
    if(!this.pendingDiscovery)return;
    const body=run.enemies.find(candidate=>candidate.kind===this.pendingDiscovery||candidate.form===this.pendingDiscovery);if(!body)return;
    this.rings.push({at:{...body.nucleus},age:0,life:1.1,from:24,to:70,color:'#c7caea',width:1.8});
    this.numbers.push({at:add(body.nucleus,{x:0,y:-24}),text:'New species',detail:creatureDefinition(this.pendingDiscovery)?.name??'',age:0,life:2.4,color:'#dfe2f7',size:18});this.pendingDiscovery='';
  }
  private onCapture(run:EncounterSimulation,result:HarvestResult):void {
    const polygon=result.polygon,center=scale(polygon.reduce(add,{x:0,y:0}),1/Math.max(1,polygon.length)),color=result.poison>0?DANGER:PEARL,grade=result.captureGrade;
    if(polygon.length>=3){
      this.flashes.push({polygon:polygon.map(point=>({...point})),age:0,life:grade?0.8:0.55,color});
      const perEdge=(this.quality===2?4:this.quality===1?2:1)+(grade?2:0);
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];let normal=unit(orthogonal(sub(a,b)));
        const outward=sub(scale(add(a,b),0.5),center);if(normal.x*outward.x+normal.y*outward.y<0)normal=scale(normal,-1);
        for(let j=0;j<perEdge;j++)this.spark(lerp(a,b,(j+this.random())/perEdge),scale(rotated(normal,this.random(-0.5,0.5)),this.random(30,85)*(grade?1.4:1)),this.random(0.45,0.85),this.random(2,3.6),this.random()>0.3?color:FOOD);
      }
    }
    const gained=this.lastObjective>=0?clamp(run.harvest.nourishment-this.lastObjective,0,result.food):result.food;
    const sources=result.positions.filter((_,i)=>['food','grazer','bacterium'].includes(result.preyKinds[i]));if(!sources.length)sources.push(center);
    if(gained>0&&!this.reducedMotion){
      const count=Math.min(gained,MAX_MOTES),lift=Math.min(Math.max(result.flow-1,0),4);
      for(let i=0;i<count;i++)this.motes.push({from:add(sources[i%sources.length],scale(angle(this.random(0,Math.PI*2)),this.random(0,10))),to:{...run.board.center},control:'objective',age:0,
        delay:0.12+i*MOTE_STAGGER,units:Math.floor(gained/count)+(i<gained%count?1:0),color:FOOD,note:i+lift,bend:this.random(-1,1)});
    }
    const goalUnits=result.rescued+result.threats+result.purified;
    if(goalUnits>0&&!this.reducedMotion){
      const origins=result.positions.filter((_,i)=>result.preyKinds[i]!=='food');if(!origins.length)origins.push(center);
      for(let i=0;i<Math.min(goalUnits,6);i++)this.motes.push({from:{...origins[i%origins.length]},to:{...run.board.center},control:'goal',age:0,delay:0.2+i*0.09,units:0,color:PEARL,note:-1,bend:this.random(-1,1)});
    }
    const headline=result.food>0?`+${result.food}`:result.rescued>0?'Rescued':result.bossLayers>0?'Hit':result.threats>0?'Cleared':result.purified>0?'Neutralized':'';
    const tint=result.food>0?FOOD:result.purified>0?'#d9c3e6':PEARL;
    const caption=[grade,result.flow>=2?`Flow ×${result.flow}`:''].filter(Boolean).join(' · ');
    if(result.flow>=2)this.setPop('flow');
    if(headline)this.numbers.push({at:center,text:headline,detail:caption,age:0,life:caption?2.1:1.45,color:tint,size:grade?30:24});
    if(result.poison>0)this.numbers.push({at:add(run.board.center,{x:0,y:-78}),text:`−${result.poison}`,detail:'',age:0,life:1.3,color:DANGER,size:24});
    if(grade){this.trauma=Math.max(this.trauma,grade==='Living constellation'?0.38:0.26);this.burst(center,this.quality>0?14:6,PEARL,120,0.9,false);}
  }
  private onInjury(run:EncounterSimulation,amount:number):void {
    this.trauma=Math.min(1,this.trauma+0.55+0.15*amount);this.hurt=1;this.hurtPip=run.integrity;
    for(let i=0;i<(this.quality>0?10:4);i++){const direction=angle(this.random(0,Math.PI*2));this.spark(add(run.board.center,scale(direction,50)),scale(direction,this.random(40,90)),this.random(0.4,0.8),this.random(2,3.2),DANGER);}
  }
  private onState(run:EncounterSimulation,previous:string,options:GameFeelOptions):void {
    if(run.state==='complete'&&previous==='active'){
      if(options.journeyComplete&&!this.reducedMotion){
        for(let wave=0;wave<3;wave++)this.rings.push({at:{...run.board.center},age:-0.45*wave,life:1.6,from:70,to:380,color:wave===1?FOOD:PEARL,width:2.6-wave*0.5});
        for(let i=0;i<(this.quality===2?48:20);i++){const direction=angle(this.random(0,Math.PI*2));this.spark(add(run.board.center,scale(direction,this.random(60,140))),add(scale(direction,this.random(30,90)),{x:0,y:-35}),this.random(1.6,2.6),this.random(2,3.6),i%4===0?'#f3dca2':PEARL);}
      }
      this.celebration=1;
      for(let i=0;i<(this.quality===2?36:18);i++){const direction=angle(Math.PI*2*i/36+this.random(0,0.2));this.spark(add(run.board.center,scale(direction,64)),add(scale(direction,this.random(60,150)),{x:0,y:-20}),this.random(0.9,1.6),this.random(2.2,4),i%3?PEARL:FOOD);}
    }
    if(run.state==='active'&&previous==='brief'){
      this.counters.clear();this.lastObjective=-1;this.bossOpen=bossWindow(run);if(options.announce!==false)this.announce(run,options.encounterTotal??15);
    }
    if(run.state==='brief'){this.motes=[];this.counters.clear();this.lastObjective=-1;}
  }
  private announce(run:EncounterSimulation,total:number):void {
    const dish=dishForStage(run.stageIndex),spec=run.harvest.spec;if(run.lessonActive()){this.lastCardDish=dish.name;return;}
    const newDish=dish.name!==this.lastCardDish,boss=!newDish&&spec.mode==='boss';
    this.card={caption:newDish?'A NEW DISH':boss?`BOSS · ${dish.name.toUpperCase()}`:`${dish.name.toUpperCase()} · ENCOUNTER ${run.encounterIndex+1} OF ${total}`,
      title:newDish?dish.name:spec.name??'A living encounter',detail:newDish?dish.subtitle:'',age:0,life:newDish?3.2:boss?2.8:2.1,color:newDish?dish.color:boss?WARM:dish.color,boss};
    this.lastCardDish=dish.name;this.cue('swell',newDish||boss?0.55:0.3);
  }
  private random(from=0,to=1):number{return this.rng.float(from,to);}
  private spark(at:Point,velocity:Point,life:number,size:number,color:string):void {
    if(!this.reducedMotion)this.sparks.push({at:{...at},velocity:{...velocity},age:0,life,size,color});
  }
  private burst(at:Point,count:number,color:string,speed:number,life:number,small:boolean):void {
    for(let i=0;i<count;i++)this.spark(at,scale(angle(Math.PI*2*i/count+this.random(0,0.4)),speed*this.random(0.5,1)),life*this.random(0.7,1),small?1.6:this.random(2,3.4),color);
  }
  private fizzle(points:readonly Point[]):void {
    if(this.reducedMotion)return;
    for(let i=0;i<points.length-1;i++){
      const direction=unit(sub(points[i+1],points[i])),a=add(points[i],scale(direction,27)),b=sub(points[i+1],scale(direction,27));
      for(let k=0;k<(this.quality>0?3:1);k++)this.spark(lerp(a,b,this.random()),add(scale(angle(this.random(0,Math.PI*2)),this.random(8,22)),{x:0,y:10}),this.random(0.35,0.6),this.random(1.4,2.2),'#9eb8bd');
    }
  }
  private advance(run:EncounterSimulation,delta:number):void {
    for(const [name,counter] of this.counters){
      counter.pop=Math.max(0,counter.pop-delta*3.2);
      if(name==='objective'){
        const settled=Math.max(0,counter.target-this.heldUnits('objective'));if(settled>counter.shown+0.001){counter.shown=settled;counter.pop=1;}continue;
      }
      if(counter.shown<counter.target){const before=Math.trunc(counter.shown);counter.shown=Math.min(counter.target,counter.shown+Math.max(12,(counter.target-counter.shown)*3.5)*delta);if(Math.trunc(counter.shown)!==before)counter.pop=Math.max(counter.pop,0.55);}
    }
    this.trauma=Math.max(0,this.trauma-delta*1.7);
    const power=this.trauma*this.trauma*5/1.5;
    this.shake=this.reducedMotion?{x:0,y:0}:{x:(Math.sin(this.clock*47)+Math.sin(this.clock*83+1.3)*0.5)*power,y:(Math.cos(this.clock*53+0.4)+Math.sin(this.clock*71)*0.5)*power};
    this.hurt=Math.max(0,this.hurt-delta*1.4);this.healGlow=Math.max(0,this.healGlow-delta*0.8);this.celebration=Math.max(0,this.celebration-delta*0.45);
    const target=run.state==='active'&&run.integrity<=1&&run.maxIntegrity>=3?1:0;
    this.critical+=clamp(target-this.critical,-delta*0.8,delta*0.8);
    if(this.critical>0){const before=this.beatClock;this.beatClock=(this.beatClock+delta)%HEARTBEAT;if(this.beatClock<before&&this.critical>0.4)this.cue('heartbeat',0.5*this.critical);}else this.beatClock=0;
    if(this.card){this.card.age+=delta;if(this.card.age>=this.card.life)this.card=undefined;}
    for(const mote of this.motes)mote.age+=delta;
    for(const mote of this.motes.filter(mote=>mote.age>=mote.delay+MOTE_FLIGHT)){
      this.setPop(mote.control);this.burst(mote.to,this.quality>0?3:1,mote.color,26,0.35,true);
      if(mote.note>=0)this.cue('mote',0.16,2**((NOTES[Math.min(mote.note,7)]+5)/12));
    }
    this.motes=this.motes.filter(mote=>mote.age<mote.delay+MOTE_FLIGHT);
    for(const spark of this.sparks){spark.age+=delta;spark.at=add(spark.at,scale(spark.velocity,delta));spark.velocity=scale(spark.velocity,Math.exp(-delta*3.4));}
    this.sparks=this.sparks.filter(spark=>spark.age<spark.life);
    for(const flash of this.flashes)flash.age+=delta;this.flashes=this.flashes.filter(flash=>flash.age<flash.life);
    for(const ring of this.rings)ring.age+=delta;this.rings=this.rings.filter(ring=>ring.age<ring.life);
    for(const number of this.numbers)number.age+=delta;this.numbers=this.numbers.filter(number=>number.age<number.life);
  }
  beat():number {
    if(this.critical<=0)return 0;if(this.reducedMotion)return 0.5*this.critical;
    return clamp(Math.exp(-((this.beatClock/0.09)**2))+0.7*Math.exp(-(((this.beatClock-0.33)/0.09)**2))+Math.exp(-(((this.beatClock-HEARTBEAT)/0.09)**2)))*this.critical;
  }
}

// Renderer contract uses only circles, strokes and labels. It requires no images
// or shaders and leaves every gameplay and camera coordinate untouched.
export interface FeelDisc {at:Point;radius:number;color:string;opacity:number;rim?:boolean}
export interface FeelStroke {points:Point[];color:string;opacity:number;width:number}
export interface FeelLabel {at:Point;text:string;color:string;opacity:number;size:number;scale:number}
export interface GameFeelFrame {visible:boolean;discs:FeelDisc[];rings:(FeelDisc&{width:number})[];strokes:FeelStroke[];labels:FeelLabel[]}
export function sampleGameFeel(feel:GameFeel,run:EncounterSimulation):GameFeelFrame {
  const frame:GameFeelFrame={visible:feel.visible&&run.state!=='paused',discs:[],rings:[],strokes:[],labels:[]};if(!frame.visible)return frame;
  const motion=!feel.reducedMotion,center=run.board.center;
  const danger=feel.critical*0.09+feel.beat()*0.16+feel.hurt*feel.hurt*0.38;
  if(danger>0.004)frame.discs.push({at:center,radius:404,color:DANGER,opacity:danger,rim:true});
  if(feel.healGlow>0.01)frame.discs.push({at:center,radius:110,color:PEARL,opacity:feel.healGlow*0.22});
  if(feel.celebration>0.01&&motion)frame.discs.push({at:center,radius:80+(1-feel.celebration)*260,color:PEARL,opacity:feel.celebration**2*0.16});
  for(const ring of feel.rings){if(ring.age<0)continue;const t=clamp(ring.age/ring.life);frame.rings.push({at:ring.at,radius:ring.from+(ring.to-ring.from)*(motion?1-(1-t)**3:0),color:ring.color,opacity:0.55*(1-t),width:ring.width});}
  for(const flash of feel.flashes){
    const t=clamp(flash.age/flash.life),fade=(1-t)**2,width=motion?7+(1.5-7)*t:2;
    for(let i=0;i<flash.polygon.length;i++){
      const a=flash.polygon[i],b=flash.polygon[(i+1)%flash.polygon.length],direction=unit(sub(b,a));
      const points=[add(a,scale(direction,24)),sub(b,scale(direction,24))];
      frame.strokes.push({points,color:flash.color,opacity:0.3*fade,width:width+6},{points,color:flash.color,opacity:0.85*fade,width:width*0.45});
    }
    if(motion)for(const at of flash.polygon)frame.discs.push({at,radius:18+t*30,color:flash.color,opacity:0.55*fade});
  }
  if(motion){
    for(const spark of feel.sparks){const life=1-spark.age/spark.life;frame.discs.push({at:spark.at,radius:spark.size*(0.6+0.4*life)*3.2,color:spark.color,opacity:life*0.85});}
    for(const mote of feel.motes){
      if(mote.age<mote.delay)continue;const t=clamp((mote.age-mote.delay)/MOTE_FLIGHT);
      for(let k=0;k<4;k++)frame.discs.push({at:motePosition(mote,Math.max(mote.delay,mote.age-0.018*(k+1))),radius:9-k*1.8,color:mote.color,opacity:0.32-k*0.07});
      const at=motePosition(mote);frame.discs.push({at,radius:13-4*t,color:mote.color,opacity:0.95},{at,radius:4,color:'#ffffff',opacity:0.9});
    }
    const selection=run.selection;
    if(run.state==='active'&&selection.active&&selection.path.length>=2){
      const points=selection.path.map(i=>run.board.anchors[i]);if(selection.closed)points.push(points[0]);
      const color=selection.motherBlocked()?WARM:run.harvestPreview().poison>0?DANGER:PEARL;
      for(let i=0;i<points.length-1;i++){
        const direction=unit(sub(points[i+1],points[i])),a=add(points[i],scale(direction,27)),b=sub(points[i+1],scale(direction,27)),length=magnitude(sub(b,a));if(length<4)continue;
        const pulses=Math.max(1,Math.trunc(length/90));for(let k=0;k<pulses;k++){
          const phase=(feel.clock*(selection.closed?1.6:1.1)+k/pulses+i*0.37)%1;
          frame.discs.push({at:lerp(a,b,phase),radius:selection.closed?7:5.5,color,opacity:Math.sin(phase*Math.PI)*(selection.closed?0.55:0.38)});
        }
      }
    }
  }
  for(const number of feel.numbers){
    const t=number.age/number.life,rise=(1-(1-Math.min(1,t*1.4))**3)*(motion?42:0),opacity=1-smooth(0.62,1,t),appear=Math.min(1,number.age/0.22);
    const size=motion?0.6+0.4*appear+Math.sin(appear*Math.PI)*0.18:1,at=add(number.at,{x:0,y:-28-rise});
    frame.labels.push({at,text:number.text,color:number.color,opacity,size:number.size,scale:size});
    if(number.detail)frame.labels.push({at:add(at,{x:0,y:22*size}),text:number.detail.toUpperCase(),color:PEARL,opacity,size:12,scale:size});
  }
  const card=feel.card;
  if(card&&run.state==='active'){
    const t=card.age,opacity=smooth(0,0.35,t)*(1-smooth(card.life-0.8,card.life,t));
    const at=add(center,{x:0,y:-150}),drift=motion?(1-smooth(0,0.6,t))*10:0;
    frame.discs.push({at,radius:250,color:'#010507',opacity:0.55*opacity});
    frame.labels.push({at:add(at,{x:0,y:-34+drift}),text:card.caption,color:card.color,opacity:0.9*opacity,size:12,scale:1},
      {at:add(at,{x:0,y:8+drift}),text:card.title,color:'#e3eee4',opacity,size:card.caption==='A NEW DISH'?40:34,scale:1});
    const width=46+40*smooth(0.1,0.9,t);frame.strokes.push({points:[add(at,{x:-width/2,y:26+drift}),add(at,{x:width/2,y:26+drift})],color:card.color,opacity:0.6*opacity,width:1});
    if(card.detail)frame.labels.push({at:add(at,{x:0,y:54+drift}),text:card.detail,color:'#b3ccca',opacity,size:16,scale:1});
  }
  return frame;
}
