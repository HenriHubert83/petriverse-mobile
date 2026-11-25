// Journey catalogue and offers from prototype/scripts/mutations.gd. See CREDITS.md.
import data from '../../data/journey.json';
import type {SeededRandom} from '../engine/seededRandom';
export interface MutationDefinition {id:string;name:string;mark:string;role:string;summary:string;detail:string;tradeoff:string}
const PATHS:Record<string,readonly string[]>={fission:['grazer','frenzy','lure','nursery'],elastic:['feast','enzyme','filter','catalyst'],symbiosis:['enzyme','residual','frenzy','nursery']};
export function mutationDefinition(id:string):MutationDefinition|undefined{
  const source=data.mutations.find(m=>m.id===id);if(!source)return;
  const item={...source};
  if(id==='fission')Object.assign(item,{role:'NIMBLE COLONY',summary:'Quick, precise meals feed more.',detail:'Clean 3-4 cell meals give +1 food.\nThose cells recover in 2 seconds.',tradeoff:'Larger loops get neither bonus.'});
  if(id==='elastic')Object.assign(item,{role:'FEAST COLONY',summary:'Wider membranes gather more food.',detail:'6+ cell loops give double desmid food.\nConnect up to 10 cells.'});
  if(id==='symbiosis')item.role='HUNTER COLONY';
  if(id==='lure')Object.assign(item,{detail:'A membrane draws nearby desmids\ntoward it. Prepare the next meal.',tradeoff:'Food moves; cysts stay in their current.'});
  if(id==='residual')item.detail='A membrane lingers for 4 seconds.\nCrossing hunters slow by 40% for 1s.';
  return item;
}
export function journeyOffers(selected:readonly string[],rng:SeededRandom,defenseLearned=true):string[]{
  if(!selected.length)return ['fission','elastic'];
  const pool=data.mutations.filter(m=>!selected.includes(m.id)&&(defenseLearned||!['symbiosis','enzyme','residual'].includes(m.id))).map(m=>m.id);
  const result:string[]=[],anchor=selected.find(id=>PATHS[id]);
  if(anchor){
    const related=pool.filter(id=>PATHS[anchor].includes(id));
    while(result.length<2&&related.length){const id=related.splice(rng.int(0,related.length-1),1)[0];result.push(id);pool.splice(pool.indexOf(id),1);}
    if(result.length===2){const alternatives=pool.filter(id=>!PATHS[anchor].includes(id));if(alternatives.length)result.push(rng.pick(alternatives));}
  }
  while(result.length<3&&pool.length)result.push(pool.splice(rng.int(0,pool.length-1),1)[0]);
  return result;
}
