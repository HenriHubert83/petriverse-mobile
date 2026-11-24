// Capture-related subset of prototype/scripts/mutations.gd. See CREDITS.md and LICENSE.
// The catalogue, seeded offers and meal bonuses are separate migration work.
export function recovery(selected:readonly string[],size:number,base=3):number{
  let seconds=selected.includes('fission')&&size<=4?Math.max(1,base-1):base;
  if(selected.includes('elastic'))seconds+=0.6;
  if(selected.includes('enzyme')&&size>=6)seconds+=1.2;
  if(selected.includes('filter'))seconds+=1.2;
  if(selected.includes('feast')&&size>=6)seconds+=1;
  return Math.max(1,seconds);
}
export function damage(selected:readonly string[],size:number):number{return selected.includes('enzyme')&&size>=6?2:1;}
export function maximum(selected:readonly string[]):number{return selected.includes('elastic')?10:8;}
