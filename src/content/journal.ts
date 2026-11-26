// Discovery presentation and directions from the original journey_hud.gd and journey_plan.gd.
import {BASE_CREATURES,CREATURE_CATALOGUE} from './creatureCatalogue';
import type {CreatureDefinition} from './creatureCatalogue';
import {dishForStage} from '../campaign/journeyPlan';

export type JournalFilter='all'|'discovered'|'undiscovered';
export interface JournalEntry {
  id:string;kind:string;known:boolean;name:string;detail:string;rare:boolean;expedition:boolean;
}
const baseIds=new Set(BASE_CREATURES.map(entry=>entry.id));
export function creatureSearchHint(entry:CreatureDefinition):string{
  const dish=dishForStage(entry.firstStage).name;
  if(entry.expedition)return `Rare in ${dish}. Each new journey hosts one of four local forms, favoring discoveries missing from your journal.`;
  if(entry.rare)return `Look in ${dish}. Choose the sheltered route to guarantee a visitor, then rescue its pearl before it leaves.`;
  if(!baseIds.has(entry.id))return `May appear in ${dish}. Watch the new arrivals; its form varies between journeys.`;
  return `Look in ${dish}. The encounter briefing explains what to do when you meet it.`;
}
export function journalEntries(discovered:readonly string[],filter:JournalFilter='all',seenSpecies:readonly string[]=[]):JournalEntry[]{
  const knownIds=new Set([...discovered,...seenSpecies]);
  return CREATURE_CATALOGUE.flatMap(entry=>{
    const known=knownIds.has(entry.id);
    if((filter==='discovered'&&!known)||(filter==='undiscovered'&&known))return [];
    return [{id:entry.id,kind:entry.kind,known,name:known?entry.name:'Undiscovered',
      detail:known?entry.detail:creatureSearchHint(entry),rare:entry.rare,expedition:entry.expedition}];
  });
}
export function journalProgress(discovered:readonly string[],seenSpecies:readonly string[]=[]):{found:number;total:number}{
  const known=new Set([...discovered,...seenSpecies]);
  return {found:CREATURE_CATALOGUE.filter(entry=>known.has(entry.id)).length,total:CREATURE_CATALOGUE.length};
}
