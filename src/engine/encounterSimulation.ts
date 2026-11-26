// Encounter integration of prototype/scripts/run_controller.gd.
// content=true populates the source encounter; omitted leaves an isolated fixture.
// See CREDITS.md and LICENSE.
import {Board} from '../geometry/board';
import {Cell} from '../geometry/cell';
import {Clot} from '../geometry/clot';
import {InputController} from '../geometry/inputController';
import {segmentsIntersect} from '../geometry/loopGeometry';
import type {Point} from '../geometry/loopGeometry';
import {commitJourney,targets} from '../geometry/loopResolver';
import type {CapturePlan,InvalidCapture,Target} from '../geometry/loopResolver';
import {maximum} from '../evolution/captureRules';
import {Drifter,add,sub,scale,unit,smooth} from '../ecology/drifter';
import {Amoeba} from '../ecology/amoeba';
import {AmoebaSystem} from '../ecology/amoebaSystem';
import {PhageSystem} from '../ecology/phageSystem';
import {CystNudge,COOLDOWN} from '../ecology/cystNudge';
import {JourneyHarvest} from '../campaign/journeyHarvest';
import type {EncounterSpec,HarvestResult} from '../campaign/journeyHarvest';
import {completeMastery} from '../campaign/journeyMastery';
import type {MasteryAward} from '../campaign/journeyMastery';
import {FluidField} from './fluidField';
import {MotherDamage} from './motherDamage';
import {SeededRandom} from './seededRandom';
import {JourneyLesson,WIDE_LESSON} from '../campaign/journeyLesson';
import {assignCreatureForm,discoveryId} from '../content/creatureCatalogue';
import type {ExpeditionVisit} from '../campaign/expeditionCreatures';
import {enterHabitat} from '../campaign/journeyHabitats';
import type {HabitatId,HabitatHistory} from '../campaign/journeyHabitats';
import type {ColonyId} from '../campaign/journeyPlan';

export type EncounterState='brief'|'active'|'paused'|'complete'|'loss';
export type GrowthRole='guard'|'feeder';
export interface RescuedSpecimen {token:string;form:string;stage:number;encounter:number;rare:boolean;story:string}
export type CaptureResult=InvalidCapture|(HarvestResult&{strain:number});
export interface EncounterOptions {
  seed?:number;waterSeed?:number;encounterIndex?:number;maxIntegrity?:number;integrity?:number;
  biomass?:number;mutations?:readonly string[];growthRoles?:Readonly<Record<number,GrowthRole>>;
  content?:boolean;guidedLesson?:boolean;rng?:SeededRandom;hydrate?:boolean;
  creatureContentEnabled?:boolean;nextEnemyId?:number;expeditionRoster?:readonly ExpeditionVisit[];
  habitatContentEnabled?:boolean;colonyId?:ColonyId;habitatHistory?:HabitatHistory;
}
const len=(p:Point)=>Math.hypot(p.x,p.y);
const limit=(p:Point,max:number):Point=>len(p)>max?scale(p,max/len(p)):p;
export class EncounterSimulation {
  readonly journey=true;
  readonly board=new Board();readonly cells:Cell[];readonly selection:InputController;
  readonly fluid=new FluidField();readonly motherDamage=new MotherDamage();
  readonly amoebas=new AmoebaSystem();readonly phages=new PhageSystem();readonly nudge=new CystNudge();
  readonly harvest:JourneyHarvest;readonly runSeed:number;readonly encounterIndex:number;readonly encounterKey:string;
  readonly contentEnabled:boolean;readonly rng:SeededRandom;readonly lesson=new JourneyLesson();
  readonly creatureContentEnabled:boolean;expeditionRoster:ExpeditionVisit[];
  readonly habitatContentEnabled:boolean;readonly colonyId:ColonyId;
  habitatChoice:HabitatId='bloom';habitatConfirmed=false;habitatApplied=false;habitatHistory:HabitatHistory;
  readonly maxIntegrity:number;readonly mutations:readonly string[];readonly growthRoles:Record<number,GrowthRole>;
  state:EncounterState='brief';enemies:Drifter[]=[];nextEnemyId=0;
  elapsed=0;stageElapsed=0;integrity:number;biomass:number;score=0;kills=0;totalFood=0;totalRescued=0;
  bestCapture=0;loopsDrawn=0;bossDefeated=false;guardianSpent=0;guardianBlockSerial=0;
  lastContacts:number[]=[];contactTime=0;resolvedContacts=0;
  captureSerial=0;lastCapture:HarvestResult|undefined;clots:Clot[]=[];
  residuals:{polygon:Point[];remaining:number}[]=[];rescuedSpecimens:RescuedSpecimen[]=[];
  masteryAwards:MasteryAward[]=[];seenSpecies:string[]=[];
  stageBonus={health:0,swift:0,flow:0};
  private waterPositions=new Map<number,Point>();

  constructor(spec:EncounterSpec,options:EncounterOptions={}){
    for(const value of [spec.stage,spec.food,spec.target,spec.duration])if(!Number.isFinite(value)||value<0)throw new RangeError('Invalid encounter specification');
    this.harvest=new JourneyHarvest(Object.freeze({...spec}));
    this.runSeed=options.seed??1;this.encounterIndex=options.encounterIndex??spec.stage;
    this.rng=options.rng??new SeededRandom(this.runSeed);this.contentEnabled=options.content??false;
    this.creatureContentEnabled=options.creatureContentEnabled??true;
    this.habitatContentEnabled=options.habitatContentEnabled??this.creatureContentEnabled;this.colonyId=options.colonyId??'wanderer';
    if(!this.habitatContentEnabled){this.habitatConfirmed=true;this.habitatApplied=true;}
    this.habitatHistory={...options.habitatHistory};
    this.nextEnemyId=options.nextEnemyId??0;
    this.expeditionRoster=(options.expeditionRoster??[]).map(visit=>({...visit}));
    this.encounterKey=options.encounterIndex===undefined?String(spec.stage):`route:${options.encounterIndex}`;
    this.board.configureDish(Math.floor(spec.stage/4));
    this.cells=this.board.anchors.map(()=>new Cell());
    this.mutations=Object.freeze([...(options.mutations??[])]);this.growthRoles={...options.growthRoles};
    this.selection=new InputController(this.board,id=>this.isReady(id));this.selection.maxVertices=maximum(this.mutations);
    this.motherDamage.setCapacity(options.maxIntegrity??3);this.maxIntegrity=this.motherDamage.capacity;
    this.integrity=Math.max(0,Math.min(this.maxIntegrity,options.integrity??this.maxIntegrity));
    this.motherDamage.resetFromIntegrity(this.integrity);this.biomass=options.biomass??0;
    const appearanceSeed=options.encounterIndex===undefined?this.runSeed:this.runSeed^((options.encounterIndex+1)*0x119de1f3);
    this.fluid.reset(this.board.center,this.board.dishRadius,(options.waterSeed??appearanceSeed)^(spec.stage*48271));
    if(this.contentEnabled&&!options.hydrate){this.harvest.begin(this);if(spec.stage===0&&options.guidedLesson!==false)this.lesson.begin(this);}
  }
  waterHistory():{id:number;position:Point}[]{return [...this.waterPositions].map(([id,position])=>({id,position:{...position}}));}
  restoreWaterHistory(values:readonly {id:number;position:Point}[]):void{this.waterPositions=new Map(values.map(v=>[v.id,{...v.position}]));}
  get stageIndex():number{return this.harvest.spec.stage;}
  get maxVertices():number{return this.selection.maxVertices;}
  lessonActive():boolean{return this.lesson.active(this);}
  boss():Drifter|undefined{return this.enemies.find(b=>b.isBoss());}
  addBody<T extends Drifter>(body:T):T{
    if(this.enemies.some(b=>b.id===body.id)||this.phages.clusters.some(b=>b.id===body.id))throw new Error('Duplicate organism ID');
    this.nextEnemyId=Math.max(this.nextEnemyId,body.id);this.enemies.push(body);return body;
  }
  growthSlot():number{return this.stageIndex===2&&this.growthRoles[1]===undefined?1:this.stageIndex===8&&this.growthRoles[5]===undefined?5:-1;}
  chooseGrowthRole(role:GrowthRole):boolean{
    const slot=this.growthSlot();if(this.state!=='brief'||slot<0||!['guard','feeder'].includes(role))return false;
    this.growthRoles[slot]=role;return true;
  }
  begin():boolean{
    if(this.state!=='brief')return false;if(this.growthSlot()>=0)this.chooseGrowthRole('guard');
    enterHabitat(this);this.state='active';return true;
  }
  isReady(id:number):boolean{return Number.isInteger(id)&&id>=0&&id<this.cells.length&&this.cells[id].isReady()&&!this.harvest.ecology.blocked(this,id);}
  targetSnapshot():Target[]{
    return this.enemies.map(b=>({id:b.id,position:{...b.nucleus},nuclei:b.nuclei().map(p=>({...p})),health:b.health,kind:b.kind,eligible:b.canTakePulse()}));
  }
  preview():number[]{
    return this.state==='active'&&this.selection.canClose()?targets(this.selection.path,this.board,id=>this.isReady(id),this.targetSnapshot(),this.maxVertices):[];
  }
  harvestPreview(){return this.harvest.outcome(this.preview(),this);}
  commitHarvest(plan:CapturePlan):HarvestResult{return this.harvest.commit(plan,this);}
  capture(path:readonly number[]):CaptureResult{
    const result=commitJourney(path,this);
    if(result.valid){
      this.lastCapture=result;this.clots.push(new Clot(++this.captureSerial,result,this.cells,this.board.center));
      this.lesson.record(this,result);
      this.harvest.checkCompletion(this);
    }
    return result;
  }
  release():CaptureResult{return this.capture(this.selection.release());}
  togglePause():void{
    if(this.state==='active'){this.selection.cancel();this.nudge.cancel();this.state='paused';}
    else if(this.state==='paused')this.state='active';
  }
  bankFood(amount:number):void{if(this.biomass<30)this.biomass=Math.min(30,this.biomass+amount);}
  discover(kind:string):void{if(!this.seenSpecies.includes(kind))this.seenSpecies.push(kind);}
  discoverBody(body:Drifter):void{
    this.discover(body.kind);
    const identity=discoveryId(body.kind,body.form);
    if(this.creatureContentEnabled&&identity)this.discover(identity);
  }
  assignForm(body:Drifter):void{
    if(this.creatureContentEnabled)assignCreatureForm(body,this.runSeed,this.stageIndex);
    this.discoverBody(body);
  }
  growthActive(role:GrowthRole):number{
    const active=this.motherDamage.activeIndices();
    return Object.entries(this.growthRoles).filter(([slot,value])=>value===role&&active.includes(Number(slot))&&!this.motherDamage.lost[Number(slot)]).length;
  }
  heal(amount:number):void{
    let restored=Math.min(amount,this.maxIntegrity-this.integrity);this.integrity+=restored;
    for(const i of this.motherDamage.activeIndices())if(restored>0&&this.motherDamage.lost[i]){
      this.motherDamage.lost[i]=false;this.motherDamage.bites=this.motherDamage.bites.filter(b=>b.core!==i);restored--;
    }
  }
  finishEncounter():void{
    if(this.state!=='active'||this.integrity<=0)return;
    this.selection.cancel();this.nudge.cancel();this.amoebas.releaseAll(this);completeMastery(this);
    const health=this.integrity*50,swift=this.stageIndex>0&&this.harvest.spec.mode!=='boss'?Math.trunc(Math.max(0,this.harvest.deadline()-this.stageElapsed))*2:0;
    this.score+=health+swift;this.stageBonus={health,swift,flow:this.harvest.bestFlow};this.state='complete';
    // Campaign progression will consume this state and add end-of-journey bonuses.
  }
  resolveContacts():void{
    const harmless=['food','cyst','spore','grazer','parasite','warden','amoeba','bacterium'];
    const contacts=this.enemies.filter(b=>b.health>0&&!b.isBoss()&&!harmless.includes(b.kind)&&b.nuclei().some(p=>len(sub(p,this.board.center))<=this.board.motherRadius+10));
    if(!contacts.length)return;
    contacts.sort((a,b)=>a.id-b.id);this.motherDamage.prepareIntegrity(this.integrity);
    let damaging=0;
    for(const body of contacts){
      if(this.growthActive('guard')>this.guardianSpent){this.guardianSpent++;this.guardianBlockSerial++;continue;}
      const nuclei=body.nuclei(),contact=nuclei.reduce((best,p)=>len(sub(p,this.board.center))<len(sub(best,this.board.center))?p:best);
      this.motherDamage.record(body.id,contact,this.board.center,body.kind,nuclei,body.health,body.form);damaging++;
    }
    this.lastContacts=contacts.map(b=>b.id);this.contactTime=this.elapsed;this.integrity=Math.max(0,this.integrity-damaging);
    this.enemies=this.enemies.filter(b=>!this.lastContacts.includes(b.id));this.resolvedContacts+=contacts.length;
    if(this.integrity===0){
      this.state='loss';this.harvest.lossTitle='The mother was eaten.';
      this.harvest.lossReason='A hunter reached the center and consumed her last organelle.';this.selection.cancel();this.nudge.cancel();
    }
  }
  private stepRecovery(delta:number):void{
    for(const cell of this.cells)cell.step(delta);this.clots=this.clots.filter(c=>!c.finished());
  }
  step(delta:number):void{
    if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid simulation delta');
    if(this.state!=='active'){
      this.nudge.cancel();
      if(this.state==='brief'){this.fluid.sources=[];this.fluid.step(delta);}
      if(['complete','loss'].includes(this.state)&&(this.clots.length||this.motherDamage.active()||this.amoebas.releases.length||this.phages.bursts.length)){
        this.stepWater(delta);this.amoebas.stepReturns(delta);this.phages.aftermath(delta);this.stepRecovery(delta);this.motherDamage.step(delta);
      }
      return;
    }
    delta=Math.min(delta,Math.max(0,this.harvest.deadline()-this.stageElapsed));
    this.elapsed+=delta;this.nudge.step(delta,this);if(!this.lessonActive())this.stageElapsed+=delta;
    const held=[...this.selection.path,...this.cells.flatMap((c,id)=>c.isReady()?[]:[id])];
    if(this.lessonActive())held.push(...WIDE_LESSON);
    this.stepWater(delta);this.board.stepMotion(delta,held,this.fluid);this.stepRecovery(delta);this.motherDamage.step(delta);
    for(const body of this.enemies){
      const previous=body.nuclei();body.step(delta,this.harvest.ecology.huntDestination(this,body));this.advectBody(body,delta);
      if(!body.isBoss())for(const membrane of this.residuals){
        const current=body.nuclei();
        for(let i=0;i<current.length;i++)for(let j=0;j<membrane.polygon.length;j++){
          if(segmentsIntersect(previous[i],current[i],membrane.polygon[j],membrane.polygon[(j+1)%membrane.polygon.length]))body.slowed=1;
        }
      }
    }
    for(const membrane of this.residuals)membrane.remaining-=delta;
    this.residuals=this.residuals.filter(m=>m.remaining>0);this.resolveContacts();
    if(this.state!=='active')return;
    if(this.contentEnabled)this.harvest.stepContent(this,delta);else this.harvest.stepExistingBodies(this,delta);
    this.harvest.checkCompletion(this);
  }
  private advectBody(body:Drifter,delta:number):void{
    if(this.lessonActive()||body.isBoss()||['bell_bud','warden','parasite','amoeba'].includes(body.kind)||body.gateIds.length)return;
    let movement:Point={x:0,y:0};
    if(['food','cyst','spore'].includes(body.kind))movement=scale(limit(scale(this.fluid.sample(body.nucleus),0.18),1.2),delta);
    else if(body.speed>0&&body.stunned<=0)movement=scale(limit(scale(this.fluid.sample(body.nucleus),0.04),Math.min(0.45,body.speed*0.08)),delta);
    if(len(sub(add(body.nucleus,movement),this.board.center))<=this.board.dishRadius-25)body.advect(movement);
  }
  private stepWater(delta:number):void{
    this.fluid.sources=[];this.phages.waterSources(this);
    const nudgeAge=COOLDOWN-this.nudge.cooldown;
    if(this.nudge.cooldown>0&&len(this.nudge.rippleVector)>0&&nudgeAge<1.7){
      const strength=Math.sin(nudgeAge/1.7*Math.PI),p=this.nudge.rippleOrigin;
      this.fluid.sources.push({x:p.x,y:p.y,radial:12*strength,curl:5*strength});
    }
    for(const clot of this.clots){
      const p=clot.progress(),envelope=Math.sin(p*Math.PI),flourish=clot.serial===this.captureSerial&&this.lastCapture?.captureGrade?1.7:1;
      this.fluid.sources.push({x:clot.center.x,y:clot.center.y,radial:(-22+40*smooth(0.5,0.9,p))*envelope*flourish,curl:9*envelope*flourish});
    }
    for(let i=0;i<this.cells.length;i++)if(this.cells[i].isReady()&&!this.selection.path.includes(i))this.fluid.stroke(sub(this.board.anchors[i],scale(this.board.velocities[i],delta)),this.board.anchors[i],0.12);
    const moving=new Map<number,Point>();
    for(const body of this.enemies){
      const previous=this.waterPositions.get(body.id)??body.nucleus,movement=sub(body.nucleus,previous);moving.set(body.id,{...body.nucleus});
      if(delta>0&&len(movement)<12&&body.age>2.5){
        this.fluid.stroke(previous,body.nucleus,0.85);
        const velocity=scale(movement,1/Math.max(delta,0.001));
        if(len(velocity)>1){
          const direction=unit(velocity),rear=sub(body.nucleus,scale(direction,24)),strength=Math.min(len(velocity),12)*1.1;
          for(const side of [-1,1]){
            const at=add(rear,scale({x:-direction.y,y:direction.x},side*18));this.fluid.sources.push({x:at.x,y:at.y,radial:0,curl:strength*side});
          }
        }
      }
      if(body instanceof Amoeba&&['reaching','digesting'].includes(body.phase)){
        const at=body.phase==='reaching'?body.reachPoint:body.captivePosition();
        const force=body.phase==='reaching'?-8*Math.sin(Math.max(0,Math.min(1,body.reachAge/2.8))*Math.PI):-12*(1-smooth(0,1.5,body.digestionAge));
        this.fluid.sources.push({x:at.x,y:at.y,radial:force,curl:force*0.25});
      }
    }
    this.waterPositions=moving;this.fluid.step(delta);
  }
}
