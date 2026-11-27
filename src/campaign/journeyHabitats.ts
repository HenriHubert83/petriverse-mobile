// Route choices from prototype/scripts/journey_habitats.gd; see CREDITS.md.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {Drifter} from '../ecology/drifter';
import {visitorForm} from './journeyDiscoveries';
import {creatureDefinition} from '../content/creatureCatalogue';

export type HabitatId='bloom'|'refuge';
export type HabitatHistory=Record<string,HabitatId>;
export interface HabitatOption {id:HabitatId;name:string;detail:string;bullets:readonly string[];action:string}
const NAMES=[['Blooming banks','Quiet shallows'],['Sunlit reeds','Glass grotto'],['Luminous current','Midnight refuge']];
export function isHabitatId(value:unknown):value is HabitatId{return value==='bloom'||value==='refuge';}
export function habitatName(stage:number,id:HabitatId):string{
  return NAMES[Math.max(0,Math.min(2,Math.floor(stage/4)))][id==='refuge'?1:0];
}
export function habitatChoicesAvailable(run:EncounterSimulation):boolean{
  return run.habitatContentEnabled&&run.journey&&run.stageIndex>=2&&run.stageIndex%4!==3;
}
export function habitatChoicePending(run:EncounterSimulation):boolean{
  return habitatChoicesAvailable(run)&&run.state==='brief'&&!run.habitatConfirmed;
}
export function habitatOptions(run:EncounterSimulation):HabitatOption[]{
  if(!habitatChoicesAvailable(run))return [];
  const visitor=creatureDefinition(visitorForm(run.stageIndex))!.name;
  return [
    {id:'bloom',name:habitatName(run.stageIndex,'bloom'),detail:'5 food per bloom. More hunters. Rare visitors in some encounters.',
      bullets:['Abundant algae: 5 food per bloom.','More hunters compete for your food.','Rare visitors in some encounters.'],action:'Take the food-rich route'},
    {id:'refuge',name:habitatName(run.stageIndex,'refuge'),detail:`4 food per bloom. Fewer hunters. A ${visitor} will visit.`,
      bullets:['Smaller blooms: 4 food per bloom.','Half as many hunter arrivals.',`A ${visitor} will visit.`],action:'Take the sheltered route'},
  ];
}
export function chooseHabitat(run:EncounterSimulation,id:string):boolean{
  if(!habitatChoicePending(run)||!isHabitatId(id))return false;
  run.habitatChoice=id;run.habitatConfirmed=true;return true;
}
export function trimHabitatBloom(run:EncounterSimulation,bodies:readonly Drifter[]):void{
  if(!habitatChoicesAvailable(run)||run.habitatChoice!=='refuge')return;
  const food=bodies.filter(body=>body.kind==='food');
  if(food.length>4)run.enemies=run.enemies.filter(body=>body!==food[food.length-1]);
}
export function enterHabitat(run:EncounterSimulation):void{
  if(!run.habitatContentEnabled||run.habitatApplied)return;
  run.habitatConfirmed=true;run.habitatApplied=true;
  if(!habitatChoicesAvailable(run))return;
  run.habitatHistory[run.encounterKey]=run.habitatChoice;
  if(run.habitatChoice==='refuge'){
    const blooms=new Map<number,Drifter[]>();
    for(const body of run.enemies)if(body.kind==='food'){
      const bloom=blooms.get(body.bloomId)??[];bloom.push(body);blooms.set(body.bloomId,bloom);
    }
    for(const bodies of blooms.values())trimHabitatBloom(run,bodies);
    run.harvest.visitorAt=36;
  }
}
export function habitatHunterArrives(run:EncounterSimulation,wave:number):boolean{
  return !habitatChoicesAvailable(run)||run.habitatChoice!=='refuge'||wave%2===0;
}
export function habitatExtraHunters(run:EncounterSimulation):boolean{
  return !habitatChoicesAvailable(run)||run.habitatChoice!=='refuge';
}
