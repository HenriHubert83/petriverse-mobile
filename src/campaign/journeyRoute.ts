// Port of prototype/scripts/journey_route.gd; see CREDITS.md and LICENSE.
import {SeededRandom} from '../engine/seededRandom';
import {authoredStage} from './journeyPlan';
import type {JourneySpec} from './journeyPlan';
type Mode=Exclude<JourneySpec['mode'],'boss'>;
export const ROUTE_TOTAL=15,MAX_TRAITS=6;
const NAMES:Record<Mode,string[]>={
  feed:['Algae orchard','A generous current','Gathering season','Drifting banquet'],
  rescue:['Pearl migration','Lost hatchlings','A scattered nursery','Carrying new life'],
  defend:['Hungry neighbours','The living perimeter','Between two hunters','Guarding the garden'],
  purify:['Violet shallows','Clearing the nursery','Poison in the reeds','A cleaner home'],
  sectors:['Across the current','Many little gardens','The wandering harvest','Food on every shore'],
};
const DETAILS:Record<Mode,string>={
  feed:'Gather green food. Nudge purple cysts aside to keep meals clean.',
  rescue:'Rescue pearl spores while gathering food. A hunter may try to eat them first.',
  defend:'Capture threats while feeding. Catch hunters before they reach Mother.',
  purify:'Capture purple cysts in poison-only loops. Feed using separate clean loops.',
  sectors:'Collect food in the marked sectors around the dish. Move between feeding pockets.',
};
const FAMILY_DETAILS:Record<string,string>={
  bacterium:'Copper bacteria steal food. Push silver phages toward them; infected bacteria rupture after 9s, releasing stolen food.',
  amoeba:'Amoebas swallow blue cells. Loop around their gold nucleus within 15s to rescue the cell.',
  grazer:'Food thieves compete for algae; catching them returns what they ate.',
  parasite:'Parasites block blue cells; capture their bodies using other cells.',
  divider:'Dividers split if ignored; catch the parent early or both young later.',
};
export function makeRoute(seed:number):JourneySpec[]{
  const rng=new SeededRandom(BigInt(seed)^0x2c716e49n),result:JourneySpec[]=[],namesUsed=new Set<string>();
  for(let stage=0;stage<12;stage++){
    const authored=authoredStage(stage);result.push(authored);
    if(![2,5,8].includes(stage))continue;
    const biome=Math.floor(stage/4),pool:Mode[]=['feed','rescue'];
    if(stage>=2)pool.push('defend');if(stage>=4)pool.push('purify');if(stage>=5)pool.push('sectors');
    let mode=rng.pick(pool.filter(m=>m!==authored.mode));if(stage===2)mode='feed';
    const families=['grazer'];if(stage>=4)families.push('parasite','bacterium');if(stage>=6)families.push('divider');if(stage>=5)families.push('amoeba');
    const family=rng.pick(families),companion=rng.pick(families),unused=NAMES[mode].filter(n=>!namesUsed.has(n));
    const name=rng.pick(unused.length?unused:NAMES[mode]);namesUsed.add(name);
    const events:NonNullable<JourneySpec['event']>[]=['migration'];if(stage>=5)events.push('hatching');if(stage>=8)events.push('traveller');
    result.push({stage,generated:true,name,mode,food:(mode==='feed'?24:18)+biome*4+rng.int(0,2)*2,
      target:{feed:0,rescue:3+Number(biome===2),defend:3+biome,purify:4+biome,sectors:4}[mode],
      duration:330+biome*30,threats:4+biome,featured:family,families:[family,companion],
      hunter:stage<4?'drifter':rng.pick(stage<8?['drifter','shellback']:['drifter','shellback','twinspore']),
      event:rng.pick(events),eventAt:rng.int(34,52),sectorStep:rng.pick([3,5,7]),lesson:DETAILS[mode]+' '+FAMILY_DETAILS[family]});
  }
  const allies=result.find(s=>s.stage===2&&s.generated)!;
  Object.assign(allies,{name:'Small allies',mode:'feed',food:20,target:0,featured:'bacterium',families:['bacterium'],phageLesson:true,
    lesson:'Silver phages are helpers. Drag their cluster toward the copper bacterium. It ruptures after 9 seconds and releases stolen food. You can also capture the bacterium yourself.'});
  return result;
}
