// Authored data from pinned prototype/scripts/journey_plan.gd. See CREDITS.md.
import data from '../../data/journey.json';
import type {EncounterSpec} from './journeyHarvest';
export interface JourneySpec extends EncounterSpec {
  name:string;lesson:string;threats:number;featured:string;families?:string[];
  hunter?:string;event?:'migration'|'hatching'|'traveller';eventAt?:number;sectorStep?:number;phageLesson?:boolean;
}
const FEATURED=['food','grazer','grazer','bellwether','parasite','amoeba','divider','regent','divider','parasite','divider','conjoined'];
export const DISHES=data.dishes;
export const COLONIES=data.colonies;
export type ColonyId='wanderer'|'weaver'|'symbiont';
export function isColonyId(value:unknown):value is ColonyId{return value==='wanderer'||value==='weaver'||value==='symbiont';}
export function colonyDefinition(id:ColonyId){return COLONIES.find(colony=>colony.id===id)!;}
export function authoredStage(index:number):JourneySpec{
  if(!Number.isInteger(index)||index<0||index>=data.stages.length)throw new RangeError('Invalid journey stage');
  return {...data.stages[index],stage:index,generated:false,featured:FEATURED[index]} as JourneySpec;
}
export function dishForStage(stage:number){return DISHES[Math.max(0,Math.min(2,Math.floor(stage/4)))];}
export function capacityForStage(stage:number):number{return 3+Number(stage>=2)+Number(stage>=4)+Number(stage>=8)+Number(stage>=10);}
