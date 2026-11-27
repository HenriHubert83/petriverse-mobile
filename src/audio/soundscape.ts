// Adapted from prototype/scripts/soundscape.gd, encounter_rhythm.gd,
// mother_alert.gd and journey_guidance.gd. See CREDITS.md and LICENSE.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {pacing} from '../campaign/encounterRhythm';
import {smooth} from '../ecology/drifter';
import type {Preferences} from '../settings/preferences';

export const TRACKS=['stillwater','glassgarden','deepwater'] as const;
export type MusicTrack=typeof TRACKS[number];
export const EFFECTS=['connect','close','absorb','injury','fracture','evolve','warning','victory','loss','mastery','heartbeat','swell','ui_press','ui_hover'] as const;
export type EffectName=typeof EFFECTS[number];
export interface SoundCue {name:EffectName;gain:number;pitch:number}
export interface ExternalSoundCue {name:'mote'|'heartbeat'|'ui_press'|'swell'|'warning';gain:number;pitch:number}
const NOTES=[0,2,4,7,9,12,14,16,19,21];
interface Observation {capture:number;integrity:number;guard:number;path:string;pathLength:number;mastery:number;state:string;burst:number}
function observe(run:EncounterSimulation):Observation {
  return {capture:run.captureSerial,integrity:run.integrity,guard:run.guardianBlockSerial,
    path:run.selection.path.join(','),pathLength:run.selection.path.length,mastery:run.masteryAwards.length,
    state:run.state,burst:run.phages.bursts.at(-1)?.serial??-1};
}
export function currentEnergy(run:EncounterSimulation):number {
  if(run.stageIndex===0||!['active','paused'].includes(run.state))return 0;
  const pace=pacing(run.stageIndex),t=run.stageElapsed%pace.cycle;
  if(t<pace.warning)return .12;
  if(t<pace.arrival)return .15+.5*(t-pace.warning)/(pace.arrival-pace.warning);
  if(t<pace.rest)return .72;
  return .3-.25*(t-pace.rest)/(pace.cycle-pace.rest);
}
export function dangerWarning(run:EncounterSimulation):boolean {
  if(run.state!=='active'||run.integrity<=0)return false;
  return run.enemies.some(body=>{
    if(body.isBoss())return false;
    const distances=body.nuclei().map(p=>Math.hypot(p.x-run.board.center.x,p.y-run.board.center.y));
    if(run.integrity<=2&&!['food','cyst','spore','grazer','parasite','warden','amoeba','bacterium'].includes(body.kind)&&distances.some(d=>d<135))return true;
    if(!['drifter','shellback','twinspore','divider'].includes(body.kind)||body.speed<=0||body.huntTarget>=0)return false;
    const spawning=body.kind==='divider'&&'spawning' in body&&typeof body.spawning==='number'?body.spawning:0;
    const seconds=Math.max(0,Math.min(...distances)-run.board.motherRadius-10)/body.speed+body.stunned+body.slowed*.4+spawning+body.fedRemaining*.65;
    return 1-smooth(1,22,seconds)>.65;
  });
}

/** Pure event detector. Attaching/restoring a run only establishes a baseline. */
export class SoundscapeEvents {
  private run:EncounterSimulation|undefined;
  private previous:Observation|undefined;
  private clock=0;
  private pending:(SoundCue&{remaining:number})[]=[];
  private recent=new Map<EffectName,number>();
  private lastWarning=-20;
  private lastMastery=-20;
  reset(run:EncounterSimulation|undefined):void {
    this.run=run;this.previous=run?observe(run):undefined;this.pending=[];this.recent.clear();
    this.clock=0;this.lastWarning=0;this.lastMastery=-20;
  }
  advance(run:EncounterSimulation|undefined,delta:number,journeyComplete=false):SoundCue[]{
    if(run!==this.run||!this.previous){this.reset(run);return [];}
    if(!run||run.state==='paused')return [];
    this.clock+=Math.max(0,delta);
    const output:SoundCue[]=[];
    const emit=(name:EffectName,gain=1,pitch=1)=>{
      if((this.recent.get(name)??-100)>this.clock-.065)return;
      this.recent.set(name,this.clock);output.push({name,gain,pitch:Math.max(.6,Math.min(3.4,pitch))});
    };
    const schedule=(name:EffectName,remaining:number,gain=1,pitch=1)=>this.pending.push({name,remaining,gain,pitch});
    for(const cue of this.pending){cue.remaining-=Math.max(0,delta);if(cue.remaining<=0)emit(cue.name,cue.gain,cue.pitch);}
    this.pending=this.pending.filter(cue=>cue.remaining>0);
    const before=this.previous,now=observe(run),capture=run.lastCapture,burst=run.phages.bursts.at(-1);
    if(burst&&burst.serial!==before.burst&&burst.age<.4){emit('fracture',.24,.78);schedule('absorb',.28,.30);}
    if(now.capture!==before.capture){
      emit('close',.65);
      if(capture?.positions.length)schedule('absorb',.55,.75);
      if(capture?.captureGrade){
        schedule('connect',.16,.45,1.26);schedule('connect',.31,.50,1.5);schedule('connect',.48,.56,2);
        if(capture.captureGrade==='Living constellation')schedule('connect',.65,.52,2.52);
        schedule('absorb',.96,.5,1.15);
      }
      if(capture&&capture.rescued>0&&!capture.mastery.length&&this.clock-this.lastMastery>=8){schedule('mastery',.9,.32);this.lastMastery=this.clock;}
      if(capture&&capture.armorHits>0)schedule('fracture',.12,.65);
    }else if(now.path!==before.path&&now.pathLength){
      emit('connect',now.pathLength<before.pathLength?.35:.55,2**(NOTES[Math.min(now.pathLength-1,NOTES.length-1)]/12));
    }
    if(now.integrity<before.integrity)emit('injury',.82);
    if(now.guard!==before.guard)emit('fracture',.55,1.35);
    if(now.mastery>before.mastery&&this.clock-this.lastMastery>=8){schedule('mastery',.9,.6);this.lastMastery=this.clock;}
    if(now.state!==before.state){
      if(now.state==='complete')schedule(journeyComplete?'victory':'evolve',journeyComplete?.7:.4,journeyComplete?.8:.7);
      if(now.state==='loss')schedule('loss',1.3,.8);
    }
    if(this.clock-this.lastWarning>=12&&dangerWarning(run)){emit('warning',.45);this.lastWarning=this.clock;}
    this.previous=now;return output;
  }
}

export class SoundscapeEnvelope {
  boot=0;pause=1;duck=0;current=0;
  cue(name:EffectName){if(['close','injury','evolve','victory','loss'].includes(name))this.duck=1.1;}
  advance(run:EncounterSimulation|undefined,prefs:Readonly<Preferences>,delta:number,narrationActive=false){
    const dt=Math.max(0,delta),target=run?.state==='paused'?.45:1;
    this.boot=Math.min(1,this.boot+dt/3);this.pause+=Math.sign(target-this.pause)*Math.min(Math.abs(target-this.pause),dt*.7);
    this.duck=Math.max(0,this.duck-dt);this.current+=((run?currentEnergy(run):0)*.48-this.current)*(1-Math.exp(-dt/3));
    const master=(prefs.muted?0:1)*this.pause*this.boot;
    return {music:prefs.musicVolume*master*(narrationActive?.35:1)*(this.duck>0?.78:1),
      pond:prefs.effectsVolume*master*.42,current:prefs.effectsVolume*master*this.current,
      effects:prefs.muted?0:prefs.effectsVolume*.62};
  }
}
