// Live demonstration timelines ported from prototype/scripts/creature_film_stage.gd.
// Every capture, infection, rescue and split is resolved by the actual game engine.
import {EncounterSimulation} from '../engine/encounterSimulation';
import type {CaptureResult} from '../engine/encounterSimulation';
import {capacityForStage} from '../campaign/journeyPlan';
import {JourneyBoss} from '../campaign/journeyBoss';
import {stepDiscoveries} from '../campaign/journeyDiscoveries';
import {Drifter,add,sub,scale,unit,smooth} from '../ecology/drifter';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {Amoeba} from '../ecology/amoeba';
import {Bacterium} from '../ecology/bacterium';
import {captureValid,contains,polygonFor,distanceToSegment} from '../geometry/loopGeometry';
import type {Point} from '../geometry/loopGeometry';
import {creatureFilm} from './creatureFilms';
import type {CreatureFilm} from './creatureFilms';
const lerp=(a:Point,b:Point,t:number)=>add(a,scale(sub(b,a),t));
const distance=(a:Point,b:Point)=>(a.x-b.x)**2+(a.y-b.y)**2;
export type FilmEvent=CaptureResult|{error:string}|{nudge:true};
export class CreatureFilmStage {
  readonly entry:CreatureFilm;readonly run:EncounterSimulation;readonly duration:number;
  elapsed=0;focus:Point;cameraTarget:Point;zoom=4;cue='Watch the bright center.';
  subject:Drifter;companion:Drifter|undefined;
  pointer:Point={x:0,y:0};pointerVisible=false;gesture:number[]=[];gestureTime=0;
  readonly events:FilmEvent[]=[];readonly milestones:Record<string,boolean>={};
  private readonly done=new Set<string>();private previousPointer:Point={x:0,y:0};
  constructor(readonly speciesId:string,readonly reducedMotion=false){
    const entry=creatureFilm(speciesId);if(!entry)throw Error(`Unknown discovery film: ${speciesId}`);this.entry=entry;
    const scene=entry.scene,stage=['amoeba','parasite','shellback','glass_harp'].includes(scene)?5:
      ['divider','conjoined','glowdrift'].includes(scene)?8:['regent','warden'].includes(scene)?7:scene==='bellwether'?3:2;
    this.run=new EncounterSimulation({stage,mode:'feed',food:999,target:999,duration:999},{seed:73,maxIntegrity:capacityForStage(stage),habitatContentEnabled:false});
    const run=this.run;run.begin();run.harvest.nourishment=9;
    this.duration=({amoeba:16.8,phage:14,shellback:16,parasite:15,regent:19,warden:15,bellwether:16,conjoined:16} as Record<string,number>)[scene]??12;
    this.focus=[0,8,9].reduce((p,n)=>add(p,scale(run.board.anchors[n],1/3)),{x:0,y:0});
    let subject:Drifter;
    if(['food','cyst','spore','moonlace','glass_harp','glowdrift'].includes(scene)){
      const body=this.organism(entry.kind,this.focus,entry.form);subject=body;
      if(['moonlace','glass_harp','glowdrift'].includes(scene))body.visitor=true;
      if(scene==='cyst'){this.companion=this.organism('food',add(this.focus,{x:28,y:4}));this.cue='Keep purple poison outside your meals.';}
      if(scene==='glass_harp'){this.organism('food',add(this.focus,{x:68,y:10}));this.organism('cyst',add(this.focus,{x:-68,y:10}));this.cue='Food drifts inward. Purple poison drifts outward.';}
      if(scene==='glowdrift'){this.companion=this.hunter('drifter',add(this.focus,{x:78,y:0}));this.cue='Its opening chambers slow nearby hunters.';}
      if(scene==='moonlace')this.cue='Its opening petals release food.';
    }else if(['hunter','shellback','twinspore'].includes(scene)){
      subject=this.hunter(entry.kind,this.focus,entry.form);
      if(scene==='hunter')this.companion=this.organism('food',add(this.focus,{x:10,y:0}));
      if(scene==='shellback')this.cue='First loop: crack the shell. Second loop: capture.';
      if(scene==='twinspore')this.cue='Both bright nuclei belong inside the same loop.';
    }else if(['grazer','divider'].includes(scene)){
      const body=this.ecology(entry.kind,this.focus,entry.form);subject=body;body.speed=2;
      if(scene==='grazer'){this.companion=this.organism('food',add(this.focus,{x:10,y:0}));this.cue='A food thief. Capture it to recover its meal.';}
      else {body.age=16;this.cue='An older divider is about to split.';}
    }else if(scene==='parasite'){
      const site=run.harvest.ecology.arrivalSite(run,{kind:'parasite',area:0});
      const body=this.ecology('parasite',site.destination,entry.form) as EcologyEnemy;subject=body;
      body.targetNode=site.target;body.siteNodes=site.nodes;body.actionClock=4;this.focus={...body.nucleus};
      this.cue='Follow the tether. Capture the parasite with other cells.';
    }else if(scene==='amoeba'){
      const body=this.ecology('amoeba',this.focus) as Amoeba;subject=body;run.amoebas.chooseTarget(run,body);
      body.nucleus={...body.destination};body.searchAfter=body.age+0.4;
      this.focus=lerp(body.nucleus,run.board.anchors[body.targetNode],0.3);this.cue='One membrane reaches out to swallow a cell.';
    }else if(scene==='phage'){
      const body=this.ecology('bacterium',{x:828,y:495}) as Bacterium;subject=body;body.speed=0;
      body.heading=unit({x:1,y:0.18});body.storedFood=2;this.companion=run.phages.add(run,{x:820,y:425});if(this.companion)this.companion.age=4;
      this.focus={x:824,y:478};this.zoom=5.3;this.cue='Nudge the silver cluster toward the bacterium.';
    }else{
      const variant=scene==='bellwether'?0:scene==='conjoined'?2:1,body=new JourneyBoss(901,run.board,variant);subject=body;
      if(entry.kind==='bell_bud'){body.juvenile=true;body.kind='bell_bud';body.health=1;body.nucleus={...this.focus};}
      run.addBody(body);if(variant===1)run.harvest.ecology.spawnGates(run,body);
      if(variant===0){this.organism('food',add(body.nucleus,{x:100,y:10}));this.organism('cyst',add(body.nucleus,{x:-90,y:10}));}
      this.focus={...body.nucleus};this.zoom=scene==='warden'?3.8:3.4;
      this.cue=variant===1?'Break the linked shields to expose the center.':variant===2?'Wait for both hearts to come together.':'Gather food to charge a hit. Wait for its opening.';
    }
    this.subject=subject;
    if(scene==='warden'){const guard=run.enemies.find(b=>b.kind==='warden');if(guard)this.focus={...guard.nucleus};}
    this.cameraTarget={...this.focus};
  }
  private organism(kind:string,at:Point,form=''):HarvestOrganism{
    const body=new HarvestOrganism(++this.run.nextEnemyId,kind,at,{x:0,y:0},0.7);body.form=form;body.age=4;return this.run.addBody(body);
  }
  private hunter(kind:string,at:Point,form=''):Drifter{
    const body=new Drifter(++this.run.nextEnemyId,at,2,kind);body.form=form;body.age=4;return this.run.addBody(body);
  }
  private ecology(kind:string,at:Point,form=''):EcologyEnemy|Amoeba{
    const body=this.run.harvest.ecology.add(this.run,kind,0,at,form);body.age=4;
    if(body instanceof EcologyEnemy)body.spawning=0;return body;
  }
  private once(key:string,after:number):boolean{
    if(this.elapsed<after||this.done.has(key))return false;this.done.add(key);return true;
  }
  findLoop(points:readonly Point[],padding=0):number[]{
    if(!points.length)return [];
    const {run}=this,center=points.reduce((p,v)=>add(p,scale(v,1/points.length)),{x:0,y:0});
    const closest=run.cells.map((_,i)=>i).filter(i=>run.isReady(i)).sort((a,b)=>distance(run.board.anchors[a],center)-distance(run.board.anchors[b],center)).slice(0,12);
    for(const size of [3,4])for(let a=0;a<closest.length;a++)for(let b=a+1;b<closest.length;b++)for(let c=b+1;c<closest.length;c++){
      const fourth=size===3?[-1]:closest.map((_,i)=>i).slice(c+1);
      for(const d of fourth){
        const path=[closest[a],closest[b],closest[c],...(d>=0?[closest[d]]:[])].sort((i,j)=>Math.atan2(run.board.anchors[i].y-center.y,run.board.anchors[i].x-center.x)-Math.atan2(run.board.anchors[j].y-center.y,run.board.anchors[j].x-center.x));
        if(!captureValid(path,run.board,id=>run.isReady(id),8))continue;
        const polygon=polygonFor(path,run.board.anchors);
        if(points.every(p=>contains(p,polygon)&&polygon.every((v,i)=>distanceToSegment(p,v,polygon[(i+1)%polygon.length])>=padding)))return path;
      }
    }
    return [];
  }
  private startCapture(points:readonly Point[],padding=0):void{
    if(this.gesture.length)return;this.gesture=this.findLoop(points,padding);
    if(!this.gesture.length){this.events.push({error:'No legal demonstration loop'});return;}
    this.gestureTime=0;this.pointer={...this.run.board.anchors[this.gesture[0]]};this.previousPointer={...this.pointer};
    this.run.selection.start(this.pointer);this.pointerVisible=true;
  }
  private stepGesture(delta:number):void{
    if(!this.gesture.length)return;this.gestureTime+=delta;const segment=Math.floor(this.gestureTime/0.65),run=this.run;
    if(segment>=this.gesture.length){
      this.pointer={...run.board.anchors[this.gesture[0]]};run.selection.drag(this.previousPointer,this.pointer);
      const result=run.release();this.events.push(result);this.gesture=[];this.pointerVisible=false;
      if(result.valid)this.cue=result.cellsRescued>0?'Cell rescued. It returns to your colony.':result.armorHits>0&&result.kills===0?'Shell cracked. Let the cells recover, then capture again.':result.rescued>0?'Rescued. A new resident for your home pond.':result.food>0?'Food recovered. Your colony grows stronger.':result.bossLayers>0?'A protective layer dissolves.':'Captured. The blue cells return to their places.';
      return;
    }
    const from=run.board.anchors[this.gesture[segment]],to=run.board.anchors[this.gesture[(segment+1)%this.gesture.length]];
    this.pointer=lerp(from,to,smooth(0,1,(this.gestureTime%0.65)/0.65));run.selection.drag(this.previousPointer,this.pointer);this.previousPointer={...this.pointer};
  }
  advance(delta:number):void{
    if(!Number.isFinite(delta)||delta<0)throw RangeError('Invalid film delta');
    this.elapsed+=delta;const {entry,run,subject}=this,scene=entry.scene;
    if(['food','spore','twinspore'].includes(scene)){if(this.once('capture',4))this.startCapture(subject.nuclei());}
    else if(['hunter','grazer'].includes(scene)){
      if(subject.carriedFood>0||(subject instanceof EcologyEnemy&&subject.storedFood>0))this.milestones.ate=true;
      if(this.once('capture',6.4))this.startCapture(subject.nuclei(),scene==='grazer'?18:0);
    }else if(scene==='shellback'){
      if(this.once('crack',3))this.startCapture(subject.nuclei());if(this.once('capture',9))this.startCapture(subject.nuclei());
    }else if(scene==='cyst'&&this.once('nudge',3)){
      this.pointer={...subject.nucleus};if(run.nudge.begin(run,this.pointer)){
        const result=run.nudge.release(run,add(this.pointer,{x:-80,y:-40}));if(result){this.events.push({nudge:true});this.milestones.nudged=true;}
      }this.cue='The poison floats clear of the food.';
    }else if(scene==='amoeba'){
      if(subject instanceof Amoeba&&subject.captiveNode>=0){this.milestones.swallowed=true;this.cue='A blue cell is trapped. You have 15 seconds to save it.';}
      if(this.once('rescue',8))this.startCapture(subject.nuclei());
    }else if(scene==='parasite'){
      if(subject instanceof EcologyEnemy&&subject.latched)this.milestones.latched=true;if(this.once('capture',8))this.startCapture(subject.nuclei());
    }else if(scene==='divider'){
      if(!run.enemies.includes(subject)){this.milestones.split=true;this.cue='One becomes two. Both young hunters can be captured.';}
      if(this.once('capture',6))this.startCapture(run.enemies.map(b=>b.nucleus));
    }else if(scene==='phage'){
      const companion=this.companion!;
      if(this.once('nudge',1)&&run.nudge.begin(run,companion.nucleus))run.nudge.release(run,add(companion.nucleus,scale(unit(sub(subject.nucleus,companion.nucleus)),60)));
      if(subject instanceof Bacterium&&subject.infectionAge>=0){this.milestones.infected=true;this.cue='Attached. The bacterium will rupture after 9 seconds.';}
      if(run.phages.burstSerial>0){this.milestones.ruptured=true;this.cue='The stolen food is released. Loop around it to collect it.';}
    }else if(scene==='bellwether'){
      if(subject.canTakePulse())this.milestones.opened=true;if(this.once('capture',9))this.startCapture(subject.nuclei());
    }else if(['regent','warden'].includes(scene)){
      if(this.once('firstShield',2)||this.once('secondShield',8)){
        const guard=run.enemies.find(b=>b.kind==='warden');if(guard){this.cameraTarget={...guard.nucleus};this.startCapture(guard.nuclei());}
      }
      if(subject.canTakePulse()){this.milestones.opened=true;this.cue='Shields removed. The golden center is open.';}
      if(scene==='regent'&&this.once('capture',14)){this.cameraTarget={...subject.nucleus};this.startCapture(subject.nuclei());}
    }else if(scene==='conjoined'&&this.once('capture',7))this.startCapture(subject.nuclei());
    else if(scene==='moonlace'&&subject.bloomReleases>0)this.milestones.bloomed=true;
    else if(scene==='glowdrift'&&this.companion!.slowed>0)this.milestones.sheltered=true;
    this.stepGesture(delta);run.step(delta);
    // Isolated scenes do not schedule campaign content, but helpers still perform their real behavior.
    stepDiscoveries(run,delta);
    this.focus=this.reducedMotion?{...this.cameraTarget}:lerp(this.focus,this.cameraTarget,1-Math.exp(-delta*2.1));
  }
}
