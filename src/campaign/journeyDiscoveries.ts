// Optional helping visitors from prototype/scripts/journey_discoveries.gd.
// Discovery clocks use simulation time and a separate seeded random stream.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {SeededRandom} from '../engine/seededRandom';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {add,sub,scale,unit} from '../ecology/drifter';
import {creatureDefinition} from '../content/creatureCatalogue';
import {stepExpeditions} from './expeditionCreatures';

export const VISITOR_REACH=290;
const VISITORS=['moonlace','glass_harp','glowdrift'];
export function visitorForm(stage:number):string{return VISITORS[Math.max(0,Math.min(2,Math.floor(stage/4)))];}
export function beginDiscoveries(run:EncounterSimulation):void{
  if(!run.creatureContentEnabled)return;
  const biome=Math.floor(run.stageIndex/4),rng=new SeededRandom(BigInt(run.runSeed)^BigInt(0x711a+biome));
  const stage=run.stageIndex<4?2:biome*4+rng.int(0,2);
  if(run.stageIndex===stage)run.harvest.visitorAt=36+rng.float(0,8);
}

export function stepDiscoveries(run:EncounterSimulation,delta=0):void{
  if(!run.creatureContentEnabled)return;
  stepExpeditions(run);
  const harvest=run.harvest;
  if(harvest.visitorAt>0&&!harvest.visitorSpawned&&run.stageElapsed>=harvest.visitorAt){
    const visitor=new HarvestOrganism(++run.nextEnemyId,'spore',harvest.ecology.pocket(run,(harvest.rotation+5)%8,true),{x:24,y:18},1.3);
    visitor.visitor=true;visitor.form=visitorForm(run.stageIndex);run.enemies.push(visitor);
    harvest.visitorSpawned=true;run.discoverBody(visitor);
    harvest.ecology.announce(`A ${creatureDefinition(visitor.form)!.name} is visiting · watch it help, or bring it home`);
  }
  for(const body of [...run.enemies]){
    if(!(body instanceof HarvestOrganism)||!body.visitor)continue;
    const offset=sub(body.nucleus,run.board.center),distance=Math.hypot(offset.x,offset.y);
    if(distance>VISITOR_REACH)body.origin=sub(body.origin,scale(unit(offset),distance-VISITOR_REACH));
    if(body.form==='glowdrift'){
      if(body.opening()>0.45)for(const hunter of run.enemies){
        if(['drifter','shellback','twinspore','divider'].includes(hunter.kind)&&!hunter.isBoss()&&
          Math.hypot(hunter.nucleus.x-body.nucleus.x,hunter.nucleus.y-body.nucleus.y)<125)hunter.slowed=Math.max(hunter.slowed,0.7);
      }
      continue;
    }
    if(body.form==='glass_harp'){separateFood(run,body,delta);continue;}
    if(body.age<6+18*body.bloomReleases)continue;
    body.bloomReleases++;
    for(let i=0;i<2;i++){
      const angle=body.bloomReleases*2.399+i*Math.PI;
      const food=new HarvestOrganism(++run.nextEnemyId,'food',add(body.nucleus,{x:Math.cos(angle)*37,y:Math.sin(angle)*37}),{x:14,y:12},angle);
      food.bloomId=-100000-body.id*8-body.bloomReleases;run.enemies.push(food);
    }
  }
}

function separateFood(run:EncounterSimulation,visitor:HarvestOrganism,delta:number):void{
  const current=visitor.opening()*delta;
  for(const body of run.enemies){
    if(!(body instanceof HarvestOrganism)||!['food','cyst'].includes(body.kind)||
      Math.hypot(body.nucleus.x-visitor.nucleus.x,body.nucleus.y-visitor.nucleus.y)>140)continue;
    const direction=scale(sub(visitor.nucleus,body.nucleus),body.kind==='cyst'?-1:1),length=Math.hypot(direction.x,direction.y);
    const shift=length>2.4*current?scale(unit(direction),2.4*current):direction,next=add(body.origin,shift);
    if(Math.hypot(next.x-run.board.center.x,next.y-run.board.center.y)<=338)body.origin=next;
  }
}
