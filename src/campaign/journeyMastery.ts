// Port of prototype/scripts/journey_mastery.gd; see CREDITS.md and LICENSE.
import type {EncounterSimulation} from '../engine/encounterSimulation';

export const FEATS={
  guardian:{title:'A life protected',detail:'Rescued a spore with a nearby hunter.'},
  gatherer:{title:'Two blooms, one loop',detail:'Gathered at least four food from two different blooms.'},
  clear_water:{title:'A clean encounter',detail:'Finished without taking poison damage.'},
} as const;
export const KEEPSAKES={guardian:'Pearl nursery',gatherer:'Fern meadow',clear_water:'Glass garden'} as const;
export type Feat=keyof typeof FEATS;
export interface MasteryAward {id:Feat;stage:number;encounter:string;title:string;detail:string;food:number}
export function award(run:EncounterSimulation,id:Feat):boolean{
  if(run.stageIndex===0||run.integrity<=0||run.masteryAwards.some(a=>a.id===id&&a.encounter===run.encounterKey))return false;
  const before=run.biomass;run.bankFood(1);run.score+=150;
  run.masteryAwards.push({id,stage:run.stageIndex,encounter:run.encounterKey,...FEATS[id],food:run.biomass-before});
  return true;
}
export function captureMastery(run:EncounterSimulation,absorbed:readonly number[],poison:number):Feat[]{
  if(poison>0||run.stageIndex===0)return [];
  const bodies=run.enemies.filter(b=>absorbed.includes(b.id)),earned:Feat[]=[];
  const hunters=bodies.filter(b=>['drifter','shellback','twinspore','divider'].includes(b.kind));
  if(bodies.some(s=>s.kind==='spore'&&hunters.some(h=>Math.hypot(s.nucleus.x-h.nucleus.x,s.nucleus.y-h.nucleus.y)<=110))&&award(run,'guardian'))earned.push('guardian');
  const food=bodies.filter(b=>b.kind==='food'),blooms=new Set(food.filter(b=>b.bloomId>=0).map(b=>b.bloomId));
  if(food.length>=4&&blooms.size>=2&&award(run,'gatherer'))earned.push('gatherer');
  return earned;
}
export function completeMastery(run:EncounterSimulation):void{
  if(run.harvest.poisonTaken===0)award(run,'clear_water');
}
export function masterySuggestion(run:EncounterSimulation):string{
  const preferred=run.harvest.spec.mode==='rescue'?'guardian':'gatherer';
  if(run.masteryAwards.some(a=>a.id===preferred&&a.encounter===run.encounterKey))return 'Optional feat earned · '+FEATS[preferred].title;
  return preferred==='guardian'?'Optional · rescue a spore with a nearby hunter.':'Optional · gather 4 food from two blooms in one loop.';
}
