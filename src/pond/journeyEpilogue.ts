// Epilogue content from prototype/scripts/journey_hud.gd and home_pond.gd.
import type {JourneySession} from '../campaign/journeySession';
import type {JourneyProfile} from '../storage/journeyProfile';
import {buildHomePond} from './homePond';
import {CREATURE_CATALOGUE} from '../content/creatureCatalogue';
import {mutationDefinition} from '../evolution/mutations';
const BUILD_NAMES:Readonly<Record<string,string>>={fission:'Nimble colony',elastic:'Feast colony',symbiosis:'Hunter colony'};
export function epilogueReady(session:JourneySession):boolean{
  const run=session.current;return session.finished&&run.state==='complete'&&run.clots.length===0&&!run.motherDamage.active();
}
export function journeyEpilogue(session:JourneySession,profile:JourneyProfile){
  const run=session.current,layout=buildHomePond(profile,0,true);
  // The final Mother belongs to this journey, even if an older profile is still saving.
  layout.mother={...layout.mother,stage:run.stageIndex,traits:[...run.mutations]};
  const discovered=new Set([...profile.discovered,...run.seenSpecies]);
  const undiscovered=CREATURE_CATALOGUE.filter(species=>!discovered.has(species.id)).length;
  const anchor=run.mutations.find(id=>Object.hasOwn(BUILD_NAMES,id));
  return {
    layout,motherDamage:Array.from(run.motherDamage.progressValues()),
    title:'A whole world, alive.',subtitle:'Stillwater, Glassgarden and the Blue Deep. The lives you brought home.',
    colonyName:anchor?BUILD_NAMES[anchor]:'An adaptable colony',traits:run.mutations.slice(0,8).map(id=>mutationDefinition(id)?.name??id),
    score:run.score,rescued:run.totalRescued,evolutions:run.mutations.length,integrity:run.integrity,food:run.totalFood,
    bestScore:Math.max(run.score,profile.bestScore),undiscovered,
    note:undiscovered>0?`${undiscovered} species still undiscovered. Another current is waiting.`:'Every known species discovered. A different colony is waiting.',
  };
}
