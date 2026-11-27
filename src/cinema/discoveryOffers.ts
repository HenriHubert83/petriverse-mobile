import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {JourneyProfile} from '../storage/journeyProfile';
import {creatureFilm,newFilmOffers} from './creatureFilms';
export {visibleFilmSpecies} from './creatureFilms';
/** Pending notices belong to one encounter; watched/offered identity lives in the profile. */
export class DiscoveryOfferQueue {
  private token='';private pending:string[]=[];private observed=new Set<string>();
  get pendingIds():readonly string[]{return [...this.pending];}
  poll(run:EncounterSimulation,profile:JourneyProfile,blocked=false):string[]{
    const token=`${run.runSeed}:${run.encounterKey}`;
    if(token!==this.token){this.token=token;this.pending=[];}
    this.pending=this.pending.filter(id=>!profile.introducedSpecies.includes(id));
    if(blocked)return [];
    const fresh=newFilmOffers(run,profile.introducedSpecies,[...profile.offeredSpecies,...this.observed]);
    for(const id of fresh){this.observed.add(id);this.pending.push(id);}return fresh;
  }
  /** Watching one clears the remaining notice, leaving every offer in the journal. */
  takeNext():string|undefined{const id=this.pending[0];this.pending=[];return id;}
  later():void{this.pending=[];}
}
export function markFilmOffered(profile:JourneyProfile,ids:readonly string[]):JourneyProfile{
  const valid=[...new Set(ids)].filter(id=>Boolean(creatureFilm(id)));
  const offered=valid.filter(id=>!profile.offeredSpecies.includes(id)),discovered=valid.filter(id=>!profile.discovered.includes(id));
  if(!offered.length&&!discovered.length)return profile;
  return {...profile,offeredSpecies:[...profile.offeredSpecies,...offered],discovered:[...profile.discovered,...discovered]};
}
/** Skipping an introduction also marks it introduced, matching the original cinema. */
export function markFilmIntroduced(profile:JourneyProfile,id:string):JourneyProfile{
  if(!creatureFilm(id)||profile.introducedSpecies.includes(id))return profile;
  return {...profile,introducedSpecies:[...profile.introducedSpecies,id]};
}
