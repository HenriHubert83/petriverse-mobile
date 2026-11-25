// Explicit, versioned snapshots for the implemented mobile simulation.
// Mirrors the original journey_save.gd boundary; no executable objects are loaded.
import {EncounterSimulation} from '../engine/encounterSimulation';
import type {GrowthRole,RescuedSpecimen,EncounterState} from '../engine/encounterSimulation';
import {SeededRandom} from '../engine/seededRandom';
import type {RandomSnapshot} from '../engine/seededRandom';
import {Clot} from '../geometry/clot';
import type {Point} from '../geometry/loopGeometry';
import {PhageCluster} from '../ecology/phageCluster';
import {Amoeba} from '../ecology/amoeba';
import {Bacterium} from '../ecology/bacterium';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {captureOrganism,restoreOrganism} from './organismSnapshot';
import {makeRoute,MAX_TRAITS} from '../campaign/journeyRoute';
import {capacityForStage} from '../campaign/journeyPlan';
import type {JourneySpec} from '../campaign/journeyPlan';
import {mutationDefinition} from '../evolution/mutations';
import {FEATS} from '../campaign/journeyMastery';
import type {MasteryAward,Feat} from '../campaign/journeyMastery';
import type {HarvestResult} from '../campaign/journeyHarvest';
import type {CellReturn} from '../ecology/amoebaSystem';

export const JOURNEY_SAVE_VERSION=1;
export class UnsupportedSaveVersionError extends Error {
  constructor(){super('This journey was saved by a newer version of Petriverse. Update the app to continue.');this.name='UnsupportedSaveVersionError';}
}
export interface ColonyState {
  integrity:number;capacity:number;biomass:number;score:number;mutations:string[];growthRoles:Record<number,GrowthRole>;
  lost:boolean[];totalFood:number;totalRescued:number;kills:number;loopsDrawn:number;bestCapture:number;
  rescuedSpecimens:RescuedSpecimen[];masteryAwards:MasteryAward[];seenSpecies:string[];
}
const RUN_NUMBERS=['elapsed','stageElapsed','integrity','biomass','score','kills','totalFood','totalRescued','bestCapture','loopsDrawn',
  'nextEnemyId','guardianSpent','guardianBlockSerial','contactTime','resolvedContacts','captureSerial'] as const;
const HARVEST_NUMBERS=['nourishment','poisonTaken','rescued','purified','defended','cleanFood','huntersCaptured','bossHits','flow','bestFlow',
  'lastFlowTime','rotation','blooms','sporesSpawned','threatsSpawned','nextBloom','lastRefill'] as const;
const CAPTURE_NUMBERS=['food','poison','threats','rescued','purified','rawFood','filtered','bossLayers','wardens','salvage','cellsRescued','points',
  'captureBonus','flow','flowBonus','kills','bodies','armorHits','restoredNode','recovery'] as const;
const COUNTERS=['score','totalFood','totalRescued','kills','loopsDrawn','bestCapture'] as const;
const STATE_VALUES=['brief','active','paused','complete','loss'];
const PHASE_LIMIT=1e9;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const pick=<T,K extends keyof T>(value:T,keys:readonly K[]):Pick<T,K>=>Object.fromEntries(keys.map(k=>[k,clone(value[k])])) as Pick<T,K>;
function object(value:unknown,label='object'):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error(`Invalid saved ${label}`);
  return value as Record<string,unknown>;
}
function number(value:unknown,min=-PHASE_LIMIT,max=PHASE_LIMIT):number{
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Invalid saved number');return value;
}
function integer(value:unknown,min=0,max=PHASE_LIMIT):number{const n=number(value,min,max);if(!Number.isSafeInteger(n))throw Error('Invalid saved integer');return n;}
function bool(value:unknown):boolean{if(typeof value!=='boolean')throw Error('Invalid saved boolean');return value;}
function text(value:unknown,max=4096):string{if(typeof value!=='string'||value.length>max)throw Error('Invalid saved text');return value;}
function array<T>(value:unknown,read:(v:unknown)=>T,max=4096,exact?:number):T[]{
  if(!Array.isArray(value)||value.length>max||(exact!==undefined&&value.length!==exact))throw Error('Invalid saved array');return value.map(read);
}
const point=(v:unknown):Point=>{const p=object(v,'point');return {x:number(p.x,-1e5,1e5),y:number(p.y,-1e5,1e5)};};
const node=(v:unknown)=>integer(v,0,23);
const id=(v:unknown)=>integer(v,0);
function unique<T>(values:T[]):T[]{if(new Set(values).size!==values.length)throw Error('Duplicate saved identifier');return values;}
function numbers<K extends string>(value:Record<string,unknown>,keys:readonly K[],min=-PHASE_LIMIT):Record<K,number>{
  return Object.fromEntries(keys.map(k=>[k,number(value[k],min)])) as Record<K,number>;
}
function traits(value:unknown):string[]{return unique(array(value,v=>{const s=text(v,64);if(!mutationDefinition(s))throw Error('Unknown saved mutation');return s;},MAX_TRAITS));}
function growth(value:unknown):Record<number,GrowthRole>{
  const result:Record<number,GrowthRole>={};
  for(const [key,entry] of Object.entries(object(value,'growth roles'))){
    if(!['1','5'].includes(key)||!['guard','feeder'].includes(String(entry)))throw Error('Invalid saved growth role');result[Number(key)]=entry as GrowthRole;
  }return result;
}
function specimens(value:unknown):RescuedSpecimen[]{return array(value,v=>{const p=object(v);return {token:text(p.token,200),form:text(p.form,200),stage:integer(p.stage,0,11),encounter:integer(p.encounter,1,15),rare:bool(p.rare),story:text(p.story)};},4096);}
function awards(value:unknown):MasteryAward[]{return array(value,v=>{const p=object(v),key=text(p.id,64);if(!Object.hasOwn(FEATS,key))throw Error('Invalid saved mastery');return {id:key as Feat,stage:integer(p.stage,0,11),encounter:text(p.encounter,200),title:text(p.title),detail:text(p.detail),food:integer(p.food,0,1)};},45);}
function motherMask(value:unknown,capacity:number,integrity:number):boolean[]{
  const lost=array(value,bool,7,7),active=[0,2,4,...(capacity>=4?[1]:[]),...(capacity>=5?[3]:[]),...(capacity>=6?[5]:[]),...(capacity>=7?[6]:[])];
  if(lost.some((missing,i)=>missing&&!active.includes(i))||lost.filter(Boolean).length!==capacity-integrity)throw Error('Invalid saved organelles');
  return lost;
}
export function readColony(value:unknown):ColonyState{
  const p=object(value,'colony'),capacity=integer(p.capacity,3,7),integrity=integer(p.integrity,0,capacity);
  const counters=numbers(p,COUNTERS,0);for(const n of Object.values(counters))integer(n);
  return {integrity,capacity,biomass:integer(p.biomass,0,30),...counters,mutations:traits(p.mutations),growthRoles:growth(p.growthRoles),
    lost:motherMask(p.lost,capacity,integrity),rescuedSpecimens:specimens(p.rescuedSpecimens),masteryAwards:awards(p.masteryAwards),seenSpecies:unique(array(p.seenSpecies,v=>text(v,100),100))};
}
function captureResult(value:unknown):(HarvestResult&{strain?:number})|undefined{
  if(value===null)return;
  const p=object(value,'capture'),values=numbers(p,CAPTURE_NUMBERS);
  if(p.valid!==true)throw Error('Invalid saved capture');
  for(const [key,n] of Object.entries(values))if(key!=='restoredNode'&&n<0)throw Error('Invalid saved capture value');
  integer(values.restoredNode,-1,23);number(values.recovery,0.001,100);
  const nodes=unique(array(p.nodes,node,12)),polygon=array(p.polygon,point,12,nodes.length);
  if(nodes.length<3)throw Error('Invalid saved capture polygon');
  const positions=array(p.positions,point,4096),preyKinds=array(p.preyKinds,v=>text(v,100),4096,positions.length),preyForms=array(p.preyForms,v=>text(v,200),4096,positions.length);
  const foodBonuses:Record<string,number>={};
  for(const [k,v] of Object.entries(object(p.foodBonuses))) {
    if(!['fission','elastic','feast','grazer','symbiosis','catalyst','feeder'].includes(k))throw Error('Invalid saved food bonus');foodBonuses[k]=integer(v);
  }
  return {valid:true,...values,...(p.strain===undefined?{}:{strain:number(p.strain,0)}),foodBonuses,nodes,polygon,positions,preyKinds,preyForms,ids:unique(array(p.ids,id,4096)),
    captureGrade:text(p.captureGrade),mastery:array(p.mastery,v=>{const k=text(v,64);if(!Object.hasOwn(FEATS,k))throw Error('Invalid saved capture mastery');return k as Feat;},3)};
}
export function captureEncounter(run:EncounterSimulation){
  return {
    run:{...pick(run,RUN_NUMBERS),state:run.state,bossDefeated:run.bossDefeated,maxIntegrity:run.maxIntegrity,mutations:[...run.mutations],growthRoles:{...run.growthRoles},
      lastContacts:[...run.lastContacts],lastCapture:run.lastCapture?clone(run.lastCapture):null,residuals:clone(run.residuals),rescuedSpecimens:clone(run.rescuedSpecimens),
      masteryAwards:clone(run.masteryAwards),seenSpecies:[...run.seenSpecies],stageBonus:{...run.stageBonus}},
    board:pick(run.board,['anchors','motionTimes','motionHomes','velocities','motionAccumulator']),
    cells:run.cells.map(c=>pick(c,['remaining','duration','captor','lost'])),
    mother:pick(run.motherDamage,['lost','bites','serial']),
    harvest:{...pick(run.harvest,HARVEST_NUMBERS),visited:[...run.harvest.visited],lossTitle:run.harvest.lossTitle,lossReason:run.harvest.lossReason,
      ecology:{...pick(run.harvest.ecology,['notice','noticeTime','nextWave','wave','pending']),foodWeb:pick(run.harvest.ecology.foodWeb,['eatenFood','escapedSpores'])},
      events:{...pick(run.harvest.events,['at','born','warned','woken','wakeWarned','food','sites']),kind:run.harvest.events.kind??null}},
    lesson:pick(run.lesson,['stepIndex','nodes']),nudge:pick(run.nudge,['cooldown','learned','rippleOrigin','rippleVector']),
    water:run.fluid.snapshot(),waterPositions:run.waterHistory(),
    enemies:run.enemies.map(captureOrganism),
    phages:{clusters:run.phages.clusters.map(captureOrganism),bursts:clone(run.phages.bursts),serial:run.phages.burstSerial,learned:run.phages.learned},
    cellReturns:clone(run.amoebas.releases),
    clots:run.clots.map(c=>pick(c,['serial','nodes','polygon','positions','preyKinds','preyForms','restoredNode','food','poison','mastery','duration'])),
    assistedClosure:run.selection.assistedClosure,
  };
}
export type EncounterSnapshot=ReturnType<typeof captureEncounter>;
export interface JourneySnapshot {
  format:'petriverse-mobile-journey';version:1;seed:number;route:JourneySpec[];index:number;retries:number;finished:boolean;
  offers:string[];handledCompletion:number;rng:RandomSnapshot;checkpoint:{colony:ColonyState;rng:RandomSnapshot};encounter:EncounterSnapshot;
}
export function readJourneyHeader(value:unknown){
  const p=object(value,'journey');
  if(p.format!=='petriverse-mobile-journey')throw Error('Unrecognized journey save');
  const version=integer(p.version,1);if(version>JOURNEY_SAVE_VERSION)throw new UnsupportedSaveVersionError();
  const seed=integer(p.seed,0,0xffffffff),route=makeRoute(seed);
  // This schema identifies the exact route generator. Future route changes require migration.
  if(JSON.stringify(p.route)!==JSON.stringify(route))throw Error('Invalid or mismatched saved journey route');
  const index=integer(p.index,0,route.length-1),retries=integer(p.retries),finished=bool(p.finished),offers=traits(p.offers),handledCompletion=integer(p.handledCompletion,-1,index);
  const checkpoint=object(p.checkpoint,'retry checkpoint'),colony=readColony(checkpoint.colony),rng=SeededRandom.restore(p.rng),retryRng=SeededRandom.restore(checkpoint.rng);
  if(colony.capacity>capacityForStage(route[index].stage))throw Error('Invalid retry colony capacity');
  if(finished&&index!==route.length-1)throw Error('Invalid completed journey');
  return {seed,route,index,retries,finished,offers,handledCompletion,colony,rng,retryRng,encounter:p.encounter};
}
export function restoreEncounter(value:unknown,spec:JourneySpec,seed:number,index:number,rng:SeededRandom,pauseOnResume=true):EncounterSimulation{
  const p=object(value,'encounter'),r=object(p.run,'encounter state'),capacity=capacityForStage(spec.stage);
  if(integer(r.maxIntegrity,3,7)!==capacity)throw Error('Invalid saved Mother capacity');
  const state=text(r.state,20);if(!STATE_VALUES.includes(state))throw Error('Invalid saved encounter state');
  const run=new EncounterSimulation(spec,{seed,encounterIndex:index,maxIntegrity:capacity,integrity:integer(r.integrity,0,capacity),
    biomass:integer(r.biomass,0,30),mutations:traits(r.mutations),growthRoles:growth(r.growthRoles),content:true,hydrate:true,rng});
  Object.assign(run,numbers(r,RUN_NUMBERS,0));
  for(const key of RUN_NUMBERS)if(!['elapsed','stageElapsed','contactTime'].includes(key))integer(run[key]);
  number(run.stageElapsed,0,spec.duration);if(run.elapsed<run.stageElapsed)throw Error('Invalid saved elapsed time');
  run.state=(state==='active'&&pauseOnResume?'paused':state) as EncounterState;
  if(run.integrity===0&&['active','paused','complete'].includes(state))throw Error('Invalid living colony');
  run.bossDefeated=bool(r.bossDefeated);run.lastContacts=unique(array(r.lastContacts,id));run.lastCapture=captureResult(r.lastCapture);
  run.residuals=array(r.residuals,v=>{const s=object(v);return {polygon:array(s.polygon,point,12),remaining:number(s.remaining,0,4)};},100);
  for(const m of run.residuals)if(m.polygon.length<3)throw Error('Invalid saved residual membrane');
  run.rescuedSpecimens=specimens(r.rescuedSpecimens);run.masteryAwards=awards(r.masteryAwards);run.seenSpecies=unique(array(r.seenSpecies,v=>text(v,100),100));
  run.stageBonus=numbers(object(r.stageBonus),['health','swift','flow'],0);
  const board=object(p.board,'board');
  run.board.anchors=array(board.anchors,point,24,24);run.board.motionHomes=array(board.motionHomes,point,24,24);
  run.board.motionTimes=array(board.motionTimes,v=>number(v,0),24,24);run.board.velocities=array(board.velocities,point,24,24);
  run.board.motionAccumulator=number(board.motionAccumulator,0,1/60+1e-9);
  if(run.board.anchors.some(v=>Math.hypot(v.x-run.board.center.x,v.y-run.board.center.y)>run.board.dishRadius)||run.board.validateBoard().length)throw Error('Invalid saved board geometry');
  const cells=array(p.cells,v=>{const c=object(v);const duration=number(c.duration,0.001,100);return {remaining:number(c.remaining,0,duration),duration,captor:integer(c.captor,-1),lost:bool(c.lost)};},24,24);
  cells.forEach((c,i)=>Object.assign(run.cells[i],c));
  const mother=object(p.mother,'mother');run.motherDamage.lost=motherMask(mother.lost,capacity,run.integrity);run.motherDamage.serial=integer(mother.serial);
  run.motherDamage.bites=array(mother.bites,v=>{const b=object(v);return {serial:integer(b.serial,1,run.motherDamage.serial),enemyId:id(b.enemyId),core:integer(b.core,0,6),origin:point(b.origin),age:number(b.age,0,2.2),kind:text(b.kind,100),nuclei:array(b.nuclei,point,12),health:integer(b.health,0,100),form:text(b.form,200)};},7);
  unique(run.motherDamage.bites.map(b=>b.core));for(const bite of run.motherDamage.bites)if(!run.motherDamage.lost[bite.core])throw Error('Invalid saved bite');
  const h=object(p.harvest,'harvest');Object.assign(run.harvest,numbers(h,HARVEST_NUMBERS));
  for(const key of HARVEST_NUMBERS)if(key!=='lastFlowTime'&&run.harvest[key]<0)throw Error('Invalid saved harvest counter');
  run.harvest.visited=unique(array(h.visited,v=>integer(v,0,7),8));run.harvest.lossTitle=text(h.lossTitle);run.harvest.lossReason=text(h.lossReason);
  integer(run.harvest.rotation,0,7);
  const ecology=object(h.ecology),foodWeb=object(ecology.foodWeb);
  Object.assign(run.harvest.ecology,{notice:text(ecology.notice),noticeTime:number(ecology.noticeTime,0,100),nextWave:number(ecology.nextWave,0),wave:integer(ecology.wave),
    pending:array(ecology.pending,v=>{const e=object(v);const kind=text(e.kind,100);if(!['bloom','spore','hunter','grazer','parasite','divider','amoeba','bacterium','warden'].includes(kind))throw Error('Unknown saved arrival');
      return {at:number(e.at,0),kind,area:integer(e.area,0,7),...(e.species===undefined?{}:{species:text(e.species,100)})};},2048)});
  Object.assign(run.harvest.ecology.foodWeb,{eatenFood:integer(foodWeb.eatenFood),escapedSpores:integer(foodWeb.escapedSpores)});
  const events=object(h.events),eventKind=events.kind;if(eventKind!==null&&!['migration','hatching','traveller'].includes(String(eventKind)))throw Error('Invalid saved habitat event');
  Object.assign(run.harvest.events,{kind:eventKind===null?undefined:eventKind,at:number(events.at,0),born:bool(events.born),warned:bool(events.warned),woken:bool(events.woken),wakeWarned:bool(events.wakeWarned),food:unique(array(events.food,id,4096)),sites:array(events.sites,point,8)});
  const lesson=object(p.lesson);run.lesson.stepIndex=integer(lesson.stepIndex,-1,4);run.lesson.nodes=unique(array(lesson.nodes,node,12));
  if(spec.stage!==0&&run.lesson.stepIndex!==-1)throw Error('Invalid saved lesson');
  const nudge=object(p.nudge);Object.assign(run.nudge,{cooldown:number(nudge.cooldown,0,6),learned:bool(nudge.learned),rippleOrigin:point(nudge.rippleOrigin),rippleVector:point(nudge.rippleVector)});
  const fluid=object(p.water,'fluid'),water={clock:number(fluid.clock,0),accumulator:number(fluid.accumulator,0,1/20+1e-9),phase:number(fluid.phase),velocity:array(fluid.velocity,v=>number(v,-18.000001,18.000001),1568,1568),transport:array(fluid.transport,v=>number(v,-95.000001,95.000001),1568,1568)};
  for(let i=0;i<1568;i+=2)if(Math.hypot(water.velocity[i],water.velocity[i+1])>18.000001||Math.hypot(water.transport[i],water.transport[i+1])>95.000001)throw Error('Invalid fluid magnitude');
  if(!run.fluid.restore(water))throw Error('Invalid saved fluid');
  // Current-schema data is strictly bounded above; retain exact doubles for continuation.
  run.fluid.velocity.set(water.velocity);run.fluid.transport.set(water.transport);
  const waterHistory=array(p.waterPositions,v=>{const w=object(v);return {id:integer(w.id,1,run.nextEnemyId),position:point(w.position)};},4096);
  unique(waterHistory.map(v=>v.id));run.restoreWaterHistory(waterHistory);
  run.enemies=array(p.enemies,v=>restoreOrganism(v,run.board),2048);
  const phages=object(p.phages,'phages');run.phages.burstSerial=integer(phages.serial);run.phages.learned=bool(phages.learned);
  run.phages.clusters=array(phages.clusters,v=>{const c=restoreOrganism(v,run.board);if(!(c instanceof PhageCluster))throw Error('Invalid phage class');return c;},2);
  run.phages.bursts=array(phages.bursts,v=>{const b=object(v);return {at:point(b.at),age:number(b.age,0,3.2),angle:number(b.angle,-100,100),serial:integer(b.serial,1,run.phages.burstSerial)};},10);
  run.amoebas.releases=array(p.cellReturns,v=>{const c=object(v);return {node:node(c.node),age:number(c.age,0,1.25),from:point(c.from),gate:point(c.gate),home:point(c.home),origin:point(c.origin)} as CellReturn;},24);
  unique(run.amoebas.releases.map(c=>c.node));
  const entities=[...run.enemies,...run.phages.clusters],ids=unique(entities.map(b=>b.id));
  if(ids.some(v=>v>run.nextEnemyId))throw Error('Invalid next organism identifier');
  for(const cell of run.cells)if(cell.captor>=0){const owner=run.enemies.find(b=>b.id===cell.captor);if(!(owner instanceof Amoeba)||owner.captiveNode!==run.cells.indexOf(cell)||cell.lost)throw Error('Invalid saved cell captor');}
  for(const body of run.enemies){
    if(body.gateIds.some(id=>id>run.nextEnemyId||id===body.id)||body.huntTarget>run.nextEnemyId||body.huntTarget===body.id)throw Error('Invalid saved organism reference');
    if(body instanceof EcologyEnemy&&(body.targetId>run.nextEnemyId||body.targetId===body.id))throw Error('Invalid saved ecological target');
    if(body instanceof Amoeba&&body.phase==='digesting'&&(body.captiveNode<0||run.cells[body.captiveNode].captor!==body.id||body.siteNodes.length!==3))throw Error('Invalid saved captivity');
    if(body instanceof Amoeba&&['approaching','reaching'].includes(body.phase)&&(body.targetNode<0||body.siteNodes.length!==3))throw Error('Invalid saved amoeba site');
    if(body instanceof EcologyEnemy&&body.kind==='parasite'&&body.latched&&body.targetNode<0)throw Error('Invalid saved parasite latch');
  }
  for(const cluster of run.phages.clusters)if(cluster.hostId>=0){
    const host=run.enemies.find(b=>b.id===cluster.hostId);
    // Capturing an infected host leaves its cluster until the next simulation tick.
    if(cluster.hostId>run.nextEnemyId||cluster.hostId===cluster.id||(host&&(!(host instanceof Bacterium)||host.infectionAge<0)))throw Error('Invalid saved phage host');
  }
  run.clots=array(p.clots,v=>{
    const c=object(v,'clot'),nodes=unique(array(c.nodes,node,12)),polygon=array(c.polygon,point,12,nodes.length),positions=array(c.positions,point,4096);
    if(!nodes.length)throw Error('Empty saved clot');
    const mastery=array(c.mastery,v=>{const k=text(v,64);if(!Object.hasOwn(FEATS,k))throw Error('Invalid clot mastery');return k;},3);
    const clot=new Clot(integer(c.serial,1,run.captureSerial),{nodes,polygon,positions,preyKinds:array(c.preyKinds,v=>text(v,100),4096,positions.length),preyForms:array(c.preyForms,v=>text(v,200),4096,positions.length),
      restoredNode:integer(c.restoredNode,-1,23),food:integer(c.food),poison:integer(c.poison),mastery},run.cells,run.board.center,number(c.duration,0.001,100));
    return clot;
  },100);
  unique(run.clots.map(c=>c.serial));run.selection.assistedClosure=bool(p.assistedClosure);run.selection.cancel();run.nudge.cancel();
  return run;
}
