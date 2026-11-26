// Pure examples from prototype/scripts/evolution_comparison.gd. See CREDITS.md.
import {damage,maximum,recovery} from './captureRules';
import {mutationDefinition} from './mutations';
export const COMPARISON_ASSUMPTION='Example assumes short links; actual link strain varies.';
const PLAYSTYLES:Record<string,string>={
  fission:'frequent small clean captures',grazer:'frequent small clean captures',frenzy:'frequent small clean captures',nursery:'frequent small clean captures',
  elastic:'broad feasts',feast:'broad feasts',filter:'broad feasts',catalyst:'broad feasts',
  symbiosis:'hunting for food',enzyme:'hunting for food',lure:'hunting for food',residual:'hunting for food',
};
export interface EvolutionSample {loop:number;bodies:readonly string[];label:string}
export interface EvolutionOutcome {food:number;rawFood:number;poison:number;filtered:number;threats:number;foodBonuses:Record<string,number>;recovery:number;capacity:number;damage:number}
export interface ComparisonRun {
  mutations:readonly string[];integrity:number;maxIntegrity:number;
  harvest?:{cleanFood:number};growthActive?:(role:'feeder')=>number;
}
export interface EvolutionComparison {
  offered:string;playstyle:string;sample:EvolutionSample;assumption:string;
  before:EvolutionOutcome;after:EvolutionOutcome;synergy:string;effect:string;lines:string[];detailSummary:string;
}
export function sampleForEvolution(offered:string):EvolutionSample{
  switch(offered){
    case 'elastic':return {loop:6,bodies:['food','food','food'],label:'3 desmids in a 6-cell loop'};
    case 'enzyme':return {loop:6,bodies:['shellback'],label:'1 Shellback (2 armor) in a 6-cell loop'};
    case 'lure':return {loop:3,bodies:['food','food'],label:'2 desmids in a 3-cell loop, 1 more nearby'};
    case 'residual':return {loop:3,bodies:['food','food'],label:'2 desmids in a 3-cell loop, then a hunter crosses it'};
    case 'filter':case 'catalyst':return {loop:3,bodies:['food','cyst','cyst'],label:'1 desmid + 2 cysts in a 3-cell loop'};
    case 'feast':return {loop:6,bodies:['food','food','food','food'],label:'4 desmids in a 6-cell loop'};
    case 'grazer':return {loop:3,bodies:['food','food'],label:'2 desmids in a 3-cell loop'};
    case 'symbiosis':return {loop:3,bodies:['drifter'],label:'1 hunter in a 3-cell loop'};
    case 'nursery':return {loop:3,bodies:['food','food'],label:'2 clean desmids in a 3-cell loop'};
    default:return {loop:3,bodies:['food','food','food'],label:'3 desmids in a 3-cell loop'};
  }
}
export function evaluateEvolution(traits:readonly string[],sample:EvolutionSample,feeder=0):EvolutionOutcome{
  const size=sample.loop;let rawFood=0,cysts=0,threats=0;
  for(const kind of sample.bodies){if(kind==='food')rawFood++;else if(kind==='cyst')cysts++;else if((kind==='shellback'?2:1)<=damage(traits,size))threats++;}
  const filtered=traits.includes('filter')?Math.min(1,cysts):0,poison=cysts-filtered,foodBonuses:Record<string,number>={};
  if(traits.includes('fission')&&size<=4&&rawFood>0&&poison===0)foodBonuses.fission=1;
  if(traits.includes('elastic')&&size>=6&&rawFood>0)foodBonuses.elastic=rawFood;
  if(traits.includes('feast')&&rawFood>=4)foodBonuses.feast=2;
  if(traits.includes('grazer')&&[1,2].includes(rawFood)&&poison===0)foodBonuses.grazer=1;
  if(traits.includes('symbiosis')&&threats>0)foodBonuses.symbiosis=threats*2;
  if(traits.includes('catalyst')&&cysts>0)foodBonuses.catalyst=cysts*2;
  if(feeder>0&&rawFood>=4&&poison===0)foodBonuses.feeder=feeder;
  return {food:rawFood+Object.values(foodBonuses).reduce((sum,n)=>sum+n,0),rawFood,poison,filtered,threats,foodBonuses,
    recovery:recovery(traits,size),capacity:maximum(traits),damage:damage(traits,size)};
}
const SYNERGIES:Record<string,string>={
  'catalyst|filter':'Filter Veil neutralises the first cyst while Catalyst turns both cysts into food.',
  'filter|catalyst':"Catalyst pays +2 per cyst; Filter Veil removes the first cyst's poison.",
  'grazer|fission':'Both reward the same clean 3-cell loop, and their bonuses stack.',
  'fission|grazer':'Delicate Grazer stacks on the same small clean loops Fission speeds up.',
  'feast|elastic':'Elastic Membranes doubles desmids in the wide loops Feast Chambers rewards.',
  'elastic|feast':"Feast Chambers adds +2 on top of Elastic's doubled wide-loop desmids.",
  'enzyme|elastic':'Wide loops can both double food with Elastic and break armor with Enzyme Sacs.',
  'enzyme|symbiosis':'Enzyme Sacs kills the Shellback; Symbiosis then pays +2 food for it.',
  'symbiosis|enzyme':'Enzyme Sacs makes wide-loop hunter kills reliable food for Symbiosis.',
  'nursery|fission':"Fission's quick clean loops fill the Nursery's 12-desmid regrowth faster.",
  'nursery|grazer':"Grazer's small clean meals count fully toward Nursery regrowth.",
  'lure|fission':'Lure gathers desmids into the small loops Fission recovers fastest.',
  'frenzy|fission':'Frenzy frees the starting cell of the small loops Fission already speeds up.',
  'filter|elastic':'Elastic catches cyst-rich pockets; Filter Veil makes the first cyst harmless.',
  'residual|symbiosis':'Slowed hunters are easier to enclose for Symbiosis food.',
};
export function evolutionSynergy(owned:readonly string[],offered:string):string{
  for(const id of owned){const pair=SYNERGIES[`${offered}|${id}`];if(pair)return pair;}
  return owned.length?`No direct synergy with ${owned.map(id=>mutationDefinition(id)?.name??id).join(', ')}; it opens a different option.`:"First trait: it sets your colony's direction.";
}
export function compareEvolution(run:ComparisonRun,offered:string):EvolutionComparison{
  const afterTraits=run.mutations.includes(offered)?[...run.mutations]:[...run.mutations,offered];
  const sample=sampleForEvolution(offered),feeder=run.growthActive?.('feeder')??0;
  const before=evaluateEvolution(run.mutations,sample,feeder),after=evaluateEvolution(afterTraits,sample,feeder);
  let effect='';
  switch(offered){
    case 'enzyme':effect=`Armor damage ${before.damage} → ${after.damage}: the Shellback is captured, not just cracked.`;break;
    case 'residual':effect='A crossing hunter moves 40% slower for 1.0s; the membrane lasts 4s.';break;
    case 'lure':effect='The nearby desmid is pulled 22 pixels toward the loop, ready for the next capture.';break;
    case 'frenzy':effect='3+ bodies in one loop: the starting cell is ready again at once.';break;
    case 'nursery':{
      const clean=run.harvest?.cleanFood??0,total=clean+after.rawFood;
      effect=`Clean-desmid regrowth: ${clean}/12 → ${total>=12?total%12:total}/12${total>=12&&run.integrity<run.maxIntegrity?': +1 organelle regrown':''}.`;break;
    }
    case 'filter':effect=`The first cyst is filtered: poison ${before.poison} → ${after.poison}.`;break;
    case 'catalyst':effect='Each cyst pays +2 food; unfiltered cysts still poison.';break;
    case 'symbiosis':effect='Each captured hunter also pays +2 food.';break;
  }
  const synergy=evolutionSynergy(run.mutations,offered),playstyle=PLAYSTYLES[offered]??'';
  const lines=[`Example: ${sample.label}.`,`Food ${before.food} → ${after.food}`,
    `Cells ready in ${before.recovery.toFixed(1)}s → ${after.recovery.toFixed(1)}s · loop up to ${before.capacity} → ${after.capacity} cells`];
  if(before.poison!==after.poison||after.poison>0)lines.push(`Poison ${before.poison} → ${after.poison} (each unfiltered cyst costs 1 organelle)`);
  if(effect)lines.push(effect);lines.push(synergy,COMPARISON_ASSUMPTION);
  const definition=mutationDefinition(offered);
  return {offered,playstyle,sample,assumption:COMPARISON_ASSUMPTION,before,after,synergy,effect,lines,
    detailSummary:`${definition?.name??offered}: ${playstyle}. ${lines.join(' ')} Tradeoff: ${definition?.tradeoff??''}`};
}
