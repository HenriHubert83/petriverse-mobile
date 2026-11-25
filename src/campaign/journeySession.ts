// Journey progression and snapshot boundary from prototype/scripts/run_controller.gd.
// See CREDITS.md. The home pond and remaining profile integrations are separate work.
import {EncounterSimulation} from '../engine/encounterSimulation';
import type {GrowthRole,RescuedSpecimen} from '../engine/encounterSimulation';
import {SeededRandom} from '../engine/seededRandom';
import {makeRoute,MAX_TRAITS} from './journeyRoute';
import {capacityForStage} from './journeyPlan';
import type {JourneySpec} from './journeyPlan';
import {journeyOffers,mutationDefinition} from '../evolution/mutations';
import type {MasteryAward} from './journeyMastery';
import {planExpeditions} from './expeditionCreatures';
import type {ExpeditionVisit} from './expeditionCreatures';
import {captureEncounter,restoreEncounter,readJourneyHeader,JOURNEY_SAVE_VERSION} from '../storage/journeySnapshot';
import type {JourneySnapshot} from '../storage/journeySnapshot';
export {UnsupportedSaveVersionError} from '../storage/journeySnapshot';
export type {JourneySnapshot} from '../storage/journeySnapshot';

interface ColonyState {
  integrity:number;capacity:number;biomass:number;score:number;mutations:string[];growthRoles:Record<number,GrowthRole>;
  lost:boolean[];totalFood:number;totalRescued:number;kills:number;loopsDrawn:number;bestCapture:number;
  rescuedSpecimens:RescuedSpecimen[];masteryAwards:MasteryAward[];seenSpecies:string[];
  nextEnemyId:number;expeditionRoster:ExpeditionVisit[];
}
const copyState=(s:ColonyState):ColonyState=>({...s,mutations:[...s.mutations],growthRoles:{...s.growthRoles},lost:[...s.lost],
  rescuedSpecimens:s.rescuedSpecimens.map(v=>({...v})),masteryAwards:s.masteryAwards.map(v=>({...v})),seenSpecies:[...s.seenSpecies],
  expeditionRoster:s.expeditionRoster.map(v=>({...v}))});
export class JourneySession {
  readonly route:readonly JourneySpec[];
  readonly creatureContentEnabled:boolean;
  current:EncounterSimulation;
  index=0;retries=0;finished=false;offers:string[]=[];
  private handledCompletion=-1;
  private rng:SeededRandom;
  private checkpoint:{colony:ColonyState;rng:SeededRandom;retryHealing?:boolean};
  constructor(readonly seed:number,options:{knownSpecies?:readonly string[];creatureContentEnabled?:boolean}={}){
    this.route=makeRoute(seed);this.rng=new SeededRandom(seed);
    this.creatureContentEnabled=options.creatureContentEnabled??true;
    const initial:ColonyState={integrity:3,capacity:3,biomass:0,score:0,mutations:[],growthRoles:{},lost:Array(7).fill(false),
      totalFood:0,totalRescued:0,kills:0,loopsDrawn:0,bestCapture:0,rescuedSpecimens:[],masteryAwards:[],seenSpecies:[],nextEnemyId:0,
      expeditionRoster:this.creatureContentEnabled?planExpeditions(seed,this.route,options.knownSpecies??[]):[]};
    this.checkpoint={colony:copyState(initial),rng:this.rng.clone(),retryHealing:false};this.current=this.createEncounter(initial);
  }
  private createEncounter(colony:ColonyState):EncounterSimulation{
    const spec=this.route[this.index],capacity=capacityForStage(spec.stage),integrity=Math.min(capacity,colony.integrity+Math.max(0,capacity-colony.capacity));
    const run=new EncounterSimulation(spec,{seed:this.seed,encounterIndex:this.index,maxIntegrity:capacity,integrity,
      biomass:colony.biomass,mutations:colony.mutations,growthRoles:colony.growthRoles,content:true,rng:this.rng,
      creatureContentEnabled:this.creatureContentEnabled,nextEnemyId:this.creatureContentEnabled?colony.nextEnemyId:0,expeditionRoster:colony.expeditionRoster});
    run.motherDamage.lost=[...colony.lost];run.motherDamage.setCapacity(capacity);run.motherDamage.prepareIntegrity(integrity);
    for(const key of ['score','totalFood','totalRescued','kills','loopsDrawn','bestCapture'] as const)run[key]=colony[key];
    run.rescuedSpecimens=colony.rescuedSpecimens.map(s=>({...s}));run.masteryAwards=colony.masteryAwards.map(a=>({...a}));
    run.seenSpecies=[...new Set([...colony.seenSpecies,...run.seenSpecies])];return run;
  }
  private colony():ColonyState{
    const r=this.current;
    return {integrity:r.integrity,capacity:r.maxIntegrity,biomass:r.biomass,score:r.score,mutations:[...r.mutations],growthRoles:{...r.growthRoles},lost:[...r.motherDamage.lost],
      totalFood:r.totalFood,totalRescued:r.totalRescued,kills:r.kills,loopsDrawn:r.loopsDrawn,bestCapture:r.bestCapture,
      rescuedSpecimens:r.rescuedSpecimens.map(s=>({...s})),masteryAwards:r.masteryAwards.map(a=>({...a})),seenSpecies:[...r.seenSpecies],
      nextEnemyId:r.nextEnemyId,expeditionRoster:r.expeditionRoster.map(v=>({...v}))};
  }
  begin():boolean{
    if(!this.current.begin())return false;
    // Keep the entry RNG before content creation, but remember the selected growth role.
    this.checkpoint.colony.growthRoles={...this.current.growthRoles};return true;
  }
  update(delta:number):void{this.current.step(delta);this.observeCompletion();}
  observeCompletion():void{
    const r=this.current;if(r.state!=='complete'||this.handledCompletion===this.index)return;
    this.handledCompletion=this.index;
    if(this.index===this.route.length-1){
      this.finished=true;r.score+=r.integrity*200;r.stageBonus.health+=r.integrity*200;r.enemies=[];this.offers=[];
    }else{
      // Draw the offers before suppressing them on special visits, as in the source RNG stream.
      this.offers=journeyOffers(r.mutations,this.rng,r.stageIndex>=2);
      if(r.harvest.spec.generated||r.mutations.length>=MAX_TRAITS)this.offers=[];
    }
  }
  evolutionCost():number{return Math.min(24,6+2*this.current.mutations.length);}
  chooseEvolution(id:string):boolean{
    this.observeCompletion();const run=this.current;
    if(run.state!=='complete'||this.finished)return false;
    const next=this.colony();
    if(id==='repair'){
      if(run.biomass<6||run.integrity>=run.maxIntegrity)return false;
      run.biomass-=6;run.heal(2);Object.assign(next,this.colony());
    }else if(id!=='continue'){
      if(!this.offers.includes(id)||!mutationDefinition(id)||run.mutations.includes(id)||run.biomass<this.evolutionCost())return false;
      next.biomass-=this.evolutionCost();next.mutations.push(id);
    }
    this.index++;this.offers=[];this.checkpoint={colony:copyState(next),rng:this.rng.clone(),retryHealing:false};this.current=this.createEncounter(next);return true;
  }
  retry():boolean{
    if(this.current.state!=='loss')return false;
    this.retries++;this.rng=this.checkpoint.rng.clone();this.current=this.createEncounter(copyState(this.checkpoint.colony));
    this.current.heal(Math.max(0,3-this.current.integrity));this.checkpoint.retryHealing=true;this.offers=[];return true;
  }
  // Recreate the entry without awarding anything or invoking the retry action.
  // Results are already stable checkpoints and must retain their offers/ending.
  entrySnapshot():JourneySnapshot{
    if(['brief','complete','loss'].includes(this.current.state))return this.snapshot();
    const entry=new JourneySession(this.seed,{creatureContentEnabled:this.creatureContentEnabled});
    entry.index=this.index;entry.retries=this.retries;entry.handledCompletion=this.index-1;
    entry.rng=this.checkpoint.rng.clone();
    const colony=copyState(this.checkpoint.colony);colony.growthRoles={...this.current.growthRoles};
    entry.checkpoint={colony:copyState(colony),rng:entry.rng.clone(),retryHealing:this.checkpoint.retryHealing};
    entry.current=entry.createEncounter(colony);
    if(this.checkpoint.retryHealing)entry.current.heal(Math.max(0,3-entry.current.integrity));
    return entry.snapshot();
  }
  snapshot():JourneySnapshot{
    this.observeCompletion();
    return {format:'petriverse-mobile-journey',version:JOURNEY_SAVE_VERSION,creatureContentEnabled:this.creatureContentEnabled,seed:this.seed,route:this.route.map(s=>({...s,...(s.families?{families:[...s.families]}:{})})),
      index:this.index,retries:this.retries,finished:this.finished,offers:[...this.offers],handledCompletion:this.handledCompletion,
      rng:this.rng.saveState(),checkpoint:{colony:copyState(this.checkpoint.colony),rng:this.checkpoint.rng.saveState(),
        ...(this.checkpoint.retryHealing===undefined?{}:{retryHealing:this.checkpoint.retryHealing})},encounter:captureEncounter(this.current)};
  }
  static restore(value:unknown,options:{pauseOnResume?:boolean}={}):JourneySession{
    const data=readJourneyHeader(value),result=new JourneySession(data.seed,{creatureContentEnabled:data.creatureContentEnabled});
    result.index=data.index;result.retries=data.retries;result.finished=data.finished;result.offers=data.offers;result.handledCompletion=data.handledCompletion;
    result.rng=data.rng;result.checkpoint={colony:data.colony,rng:data.retryRng,retryHealing:data.retryHealing};
    result.current=restoreEncounter(data.encounter,data.route[data.index],data.seed,data.index,data.rng,options.pauseOnResume??true,data.legacy);
    if(result.current.creatureContentEnabled!==result.creatureContentEnabled)throw Error('Mismatched creature content version');
    const roster=result.current.expeditionRoster;
    if(roster.length!==data.colony.expeditionRoster.length||roster.some((v,i)=>{
      const entry=data.colony.expeditionRoster[i];
      return v.form!==entry.form||v.encounter!==entry.encounter||(entry.spawned&&!v.spawned)||
        (v.spawned!==entry.spawned&&v.encounter!==data.index)||(entry.spawned&&entry.encounter>=data.index);
    }))throw Error('Mismatched expedition checkpoint');
    if(result.creatureContentEnabled&&result.current.nextEnemyId<data.colony.nextEnemyId)throw Error('Invalid organism ID continuation');
    const complete=result.current.state==='complete';
    if((complete&&data.handledCompletion!==data.index)||(!complete&&data.handledCompletion===data.index)||
      data.finished!==(complete&&data.index===data.route.length-1)||(!complete&&data.offers.length)||
      data.offers.some(id=>result.current.mutations.includes(id)))throw Error('Invalid saved journey completion');
    return result;
  }
}
