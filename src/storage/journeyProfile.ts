// Persistent journey records from prototype/scripts/journey_profile.gd.
// Profile data is retained now; the home pond, journal and colony selection UI are separate ports.
import type {JourneySession} from '../campaign/journeySession';
import type {RescuedSpecimen} from '../engine/encounterSimulation';
import {UnsupportedSaveVersionError} from './saveRepository';

export interface ProfileResident extends RescuedSpecimen {
  arrivedAfter:number;welcomed:boolean;nickname?:string;
}
export interface PondMemory {token:string;id:string;stage:number}
export interface JourneyProfile {
  version:1;
  discovered:string[];introducedSpecies:string[];offeredSpecies:string[];
  residents:ProfileResident[];clearedEncounters:string[];lastColonyTraits:string[];pondMemories:PondMemory[];
  deepestDish:number;victories:number;bestScore:number;completedSeeds:number[];
}
export function createJourneyProfile():JourneyProfile{
  return {version:1,discovered:[],introducedSpecies:[],offeredSpecies:[],residents:[],clearedEncounters:[],
    lastColonyTraits:[],pondMemories:[],deepestDish:0,victories:0,bestScore:0,completedSeeds:[]};
}
const plain=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const invalid=():never=>{throw new Error('Invalid journey profile.');};
function number(v:unknown,max=Number.MAX_SAFE_INTEGER):number{
  if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>max)return invalid();return v;
}
function string(v:unknown,max=256,allowEmpty=false):string{
  if(typeof v!=='string'||v.length>max||(!allowEmpty&&!v.length))return invalid();return v;
}
function list(v:unknown):unknown[]{if(!Array.isArray(v)||v.length>100000)return invalid();return v;}
function strings(v:unknown):string[]{return [...new Set(list(v).map(s=>string(s)))];}
function boolean(v:unknown):boolean{if(typeof v!=='boolean')return invalid();return v;}

// Version 0 / absent version accepts earlier partial JSON profile records with defaults.
// This does not import desktop Godot .cfg files or promise desktop-save interoperability.
export function parseJourneyProfile(value:unknown):JourneyProfile{
  if(!plain(value))return invalid();
  const version=Object.hasOwn(value,'version')?value.version:0;
  if(typeof version==='number'&&Number.isSafeInteger(version)&&version>1)throw new UnsupportedSaveVersionError();
  if(version!==0&&version!==1)return invalid();
  const legacy=version===0;
  const field=(name:string,fallback:unknown)=>Object.hasOwn(value,name)?value[name]:legacy?fallback:invalid();
  const profile:JourneyProfile={
    version:1,discovered:strings(field('discovered',[])),introducedSpecies:strings(field('introducedSpecies',[])),
    offeredSpecies:strings(field('offeredSpecies',[])),clearedEncounters:strings(field('clearedEncounters',[])),
    lastColonyTraits:strings(field('lastColonyTraits',[])),deepestDish:number(field('deepestDish',0),3),
    victories:number(field('victories',0)),bestScore:number(field('bestScore',0)),
    completedSeeds:[...new Set(list(field('completedSeeds',[])).map(s=>number(s,0xffffffff)))],
    residents:[],pondMemories:[],
  };
  const tokens=new Set<string>();
  for(const data of list(field('residents',[]))){
    if(!plain(data))return invalid();
    // Ordinary mobile spores can be rescued before a catalogue form is assigned.
    // Keep their empty form rather than rejecting valid progress or inventing an identity.
    const resident:ProfileResident={token:string(data.token),form:string(data.form,256,true),
      stage:number(data.stage??(legacy?0:undefined),11),encounter:number(data.encounter??(legacy?1:undefined),15),
      rare:boolean(data.rare??(legacy?false:undefined)),story:string(data.story??(legacy?'':undefined),256,true),
      arrivedAfter:number(data.arrivedAfter??(legacy?0:undefined)),welcomed:boolean(data.welcomed??(legacy?true:undefined))};
    if(resident.encounter<1||tokens.has(resident.token))return invalid();
    if(data.nickname!==undefined)resident.nickname=string(data.nickname,24,true);
    tokens.add(resident.token);profile.residents.push(resident);
  }
  const memories=new Set<string>();
  for(const data of list(field('pondMemories',[]))){
    if(!plain(data))return invalid();
    const memory={token:string(data.token),id:string(data.id),stage:number(data.stage,11)};
    if(!['guardian','gatherer','clear_water'].includes(memory.id)||memories.has(memory.token))return invalid();
    memories.add(memory.token);profile.pondMemories.push(memory);
  }
  if(profile.victories<profile.completedSeeds.length)return invalid();
  return profile;
}

export function colonyUnlocked(profile:JourneyProfile,id:string):boolean{
  return id==='wanderer'||(id==='weaver'&&profile.deepestDish>=1)||(id==='symbiont'&&profile.deepestDish>=2);
}

// Observation is idempotent across periodic saves, restored games and retries.
// Return the same object if nothing changed, allowing the caller to avoid needless writes.
export function observeJourney(profile:JourneyProfile,session:JourneySession):JourneyProfile{
  const next=parseJourneyProfile(profile),run=session.current;let changed=false;
  const residentTokens=new Set(next.residents.map(r=>r.token));
  for(const specimen of run.rescuedSpecimens){
    if(residentTokens.has(specimen.token))continue;
    next.residents.push({...specimen,arrivedAfter:next.clearedEncounters.length,welcomed:false});
    residentTokens.add(specimen.token);changed=true;
  }
  if(run.state==='complete'){
    const encounter=`${session.seed}:${run.encounterKey}`;
    if(!next.clearedEncounters.includes(encounter)){
      next.clearedEncounters.push(encounter);next.lastColonyTraits=[...run.mutations];changed=true;
    }
  }
  for(const species of run.seenSpecies)if(!next.discovered.includes(species)){next.discovered.push(species);changed=true;}
  const completedStages=session.route.slice(0,session.index).filter(stage=>stage.mode==='boss').map(stage=>stage.stage);
  if(run.state==='complete'&&run.harvest.spec.mode==='boss')completedStages.push(run.stageIndex);
  const completedDishes=completedStages.reduce((deepest,stage)=>Math.max(deepest,Math.floor(stage/4)+1),0);
  if(completedDishes>next.deepestDish){next.deepestDish=completedDishes;changed=true;}
  if(session.finished&&!next.completedSeeds.includes(session.seed)){
    next.completedSeeds.push(session.seed);next.victories++;next.bestScore=Math.max(next.bestScore,run.score);changed=true;
  }
  const memoryTokens=new Set(next.pondMemories.map(m=>m.token));
  for(const award of run.masteryAwards){
    const token=`${session.seed}:${award.encounter}:${award.id}`;
    if(memoryTokens.has(token))continue;
    next.pondMemories.push({token,id:award.id,stage:award.stage});memoryTokens.add(token);changed=true;
  }
  // Validate generated records too, so a bad runtime value never becomes a durable profile.
  return changed?parseJourneyProfile(next):profile;
}
