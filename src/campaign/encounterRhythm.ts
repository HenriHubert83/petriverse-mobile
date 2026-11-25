// Port of prototype/scripts/encounter_rhythm.gd; see CREDITS.md and LICENSE.
import type {EncounterSimulation} from '../engine/encounterSimulation';
export const BLOOM_CYCLE=48;
const CYCLES=[48,48,48,48,46,44,42,42,40,38,36,36];
export function pacing(stage:number){
  const i=Math.max(0,Math.min(11,stage)),warning=i<4?12:i<8?10:8;
  return {cycle:CYCLES[i],warning,arrival:warning+8,rest:warning+22,extraEvery:i<5||i%4===3?0:i<10?2:1};
}
export function rhythmSample(run:EncounterSimulation):{title:string;remaining:number;id:string}{
  if(run.stageIndex===0)return {id:'practice',title:'A quiet beginning',remaining:0};
  const pace=pacing(run.stageIndex),t=run.stageElapsed%pace.cycle;
  if(t<pace.warning)return {id:'feed',title:'A feeding current',remaining:pace.warning-t};
  if(t<pace.arrival)return {id:'warning',title:'Life is approaching',remaining:pace.arrival-t};
  if(t<pace.rest)return {id:'surge',title:'The pond stirs',remaining:pace.rest-t};
  return {id:'rest',title:'A moment of stillness',remaining:pace.cycle-t};
}
