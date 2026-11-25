// Rare populations from prototype/scripts/expedition_creatures.gd.
// Each biome's generated visit favors an undiscovered form, using an independent RNG.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {EncounterSpec} from './journeyHarvest';
import {SeededRandom} from '../engine/seededRandom';
import {Drifter,sub} from '../ecology/drifter';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {EXPEDITION_FORMS,formDefinition} from '../content/creatureCatalogue';

export interface ExpeditionVisit {form:string;encounter:number;spawned:boolean}
const HUNTERS=['drifter','shellback','twinspore','divider'];
const ACTIONS:Record<string,string>={food:'green food · gather it',cyst:'purple poison · keep it out of meals',
  spore:'pearl spore · rescue it',grazer:'food thief · capture its golden center',parasite:'cell blocker · capture its body',
  divider:'splitting hunter · capture it early',drifter:'hunter · protect Mother',shellback:'armored hunter · capture twice'};

export function planExpeditions(seed:number,route:readonly EncounterSpec[],known:readonly string[]):ExpeditionVisit[]{
  const rng=new SeededRandom(BigInt(seed)^0x72c9a341n),result:ExpeditionVisit[]=[];
  for(let biome=0;biome<3;biome++){
    let pool=EXPEDITION_FORMS.filter(entry=>Math.floor(entry.firstStage/4)===biome);
    const unseen=pool.filter(entry=>!known.includes(entry.id));if(unseen.length)pool=unseen;
    if(!pool.length)continue;
    const entry=rng.pick(pool),visits=route.flatMap((spec,index)=>
      Math.floor(spec.stage/4)===biome&&spec.stage>=entry.firstStage&&spec.generated?[index]:[]);
    if(visits.length)result.push({form:entry.id,encounter:rng.pick(visits),spawned:false});
  }
  return result;
}

export function validExpeditions(value:unknown,route:readonly EncounterSpec[]):value is ExpeditionVisit[]{
  if(!Array.isArray(value)||value.length>3)return false;
  const biomes=new Set<number>();
  for(const item of value){
    if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.form!=='string'||
      typeof item.spawned!=='boolean'||!Number.isSafeInteger(item.encounter)||item.encounter<0||item.encounter>=route.length)return false;
    const entry=formDefinition(item.form);if(!entry?.expedition)return false;
    const biome=Math.floor(entry.firstStage/4),spec=route[item.encounter];
    if(biomes.has(biome)||Math.floor(spec.stage/4)!==biome||spec.stage<entry.firstStage||!spec.generated)return false;
    biomes.add(biome);
  }
  return true;
}

export function stepExpeditions(run:EncounterSimulation):void{
  if(!run.creatureContentEnabled||run.stageElapsed<8)return;
  for(const visit of run.expeditionRoster){
    if(visit.spawned||visit.encounter!==run.encounterIndex)continue;
    const entry=formDefinition(visit.form);if(!entry?.expedition)continue;
    if(HUNTERS.includes(entry.kind)&&run.enemies.filter(body=>HUNTERS.includes(body.kind)).length>=4)continue;
    if(['grazer','parasite'].includes(entry.kind)&&run.enemies.filter(body=>body.kind===entry.kind).length>=2)continue;
    spawnExpedition(run,entry.id);visit.spawned=true;
  }
}

export function spawnExpedition(run:EncounterSimulation,form:string):Drifter{
  const entry=formDefinition(form);if(!entry?.expedition)throw new Error('Unknown expedition creature');
  const area=(run.harvest.rotation+5)%8,ecology=run.harvest.ecology;
  let body:Drifter;
  if(['food','cyst','spore'].includes(entry.kind)){
    body=new HarvestOrganism(++run.nextEnemyId,entry.kind,ecology.pocket(run,area,true),{x:9,y:7},area);
    body.form=entry.id;run.enemies.push(body);
  }else if(['grazer','parasite','divider'].includes(entry.kind)){
    const site=ecology.arrivalSite(run,{area,kind:entry.kind});
    const enemy=ecology.add(run,entry.kind,area,site.position,entry.id) as EcologyEnemy;
    enemy.destination=site.destination;
    if(entry.kind==='parasite'){enemy.targetNode=site.target;enemy.siteNodes=site.nodes;}
    body=enemy;
  }else{
    const at=ecology.pocket(run,area,true),outward=sub(at,run.board.center);
    body=new Drifter(++run.nextEnemyId,at,5.4,entry.kind);body.form=entry.id;
    body.pairAngle=Math.atan2(outward.y,outward.x)+Math.PI/2;run.enemies.push(body);
  }
  run.discoverBody(body);
  ecology.announce(`Rare discovery: ${entry.name} · ${ACTIONS[entry.kind]??''}`);
  return body;
}
