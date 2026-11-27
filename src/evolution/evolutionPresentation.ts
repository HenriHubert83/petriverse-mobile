// Timings and guided capture demonstration from microscope.gd / mutation_card.gd.
import {smooth} from '../ecology/drifter';
export const EVOLUTION_GROWTH_SECONDS=3.2;
export function evolutionGrowthProgress(seconds:number,reducedMotion=false):number{
  return reducedMotion?1:Math.max(0,Math.min(1,seconds/EVOLUTION_GROWTH_SECONDS));
}
export function guidedEvolutionFrame(offered:string,seconds:number,reducedMotion=false){
  const small=offered==='fission',count=small?3:6,recovery=small?2:3.6;
  const time=reducedMotion?1.6:Math.max(0,seconds)%7.5,phase=Math.max(0,Math.min(1,(time-1.6)/recovery));
  const merge=smooth(0,0.27,phase)*(1-smooth(0.56,1,phase));
  return {count,time,phase,merge,foodOpacity:1-smooth(0,0.4,phase),food:small?4:6,recovery,
    drawing:time<=1.6||reducedMotion,
    caption:phase>0?`+${small?4:6} food · ${phase>=1?'ready again':'cells recovering'}`:
      small?'Example: follow a small loop':'Example: surround more space'};
}
