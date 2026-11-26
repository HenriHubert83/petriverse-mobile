import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SoundscapeEvents,SoundscapeEnvelope,EFFECTS,currentEnergy,dangerWarning} from '../src/audio/soundscape';
import {SoundscapePlayback,type SoundAssets,type SoundPlayer} from '../src/audio/soundscapePlayback';
import {DEFAULT_PREFERENCES} from '../src/settings/preferences';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {Drifter} from '../src/ecology/drifter';
const run=(stage=0)=>{const r=new EncounterSimulation({stage,mode:'feed',food:999,target:999,duration:300},{habitatContentEnabled:false});r.begin();return r;};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('restoring a damaged, completed or captured run produces no historical audio',()=>{
  const events=new SoundscapeEvents(),r=run();r.integrity=1;r.captureSerial=8;r.guardianBlockSerial=5;r.state='complete';
  r.selection.path=[0,8,9];r.phages.bursts=[{at:r.board.center,age:.1,angle:0,serial:7}];
  assert.deepEqual(events.advance(r,.1,true),[]);assert.deepEqual(events.advance(r,2,true),[]);
  const other=run();other.captureSerial=3;assert.deepEqual(events.advance(other,.1),[]);
});
test('connections use pentatonic pitches and fresh captures, injuries and outcomes sound once',()=>{
  const events=new SoundscapeEvents(),r=run();events.advance(r,0);
  r.selection.path=[0,8,9];let cues=events.advance(r,.1);assert.equal(cues[0].name,'connect');close(cues[0].pitch,2**(4/12));
  r.captureSerial++;r.selection.path=[];r.integrity--;cues=events.advance(r,.1);assert.deepEqual(cues.map(c=>c.name),['close','injury']);
  assert.deepEqual(events.advance(r,.1),[]);
  r.state='complete';assert.deepEqual(events.advance(r,.1,true),[]);
  assert.deepEqual(events.advance(r,.71,true).map(c=>c.name),['victory']);assert.deepEqual(events.advance(r,1,true),[]);
});
test('phage burst cues and outcome delays freeze while paused; resets discard pending cues',()=>{
  const events=new SoundscapeEvents(),r=run();events.advance(r,0);
  r.phages.bursts=[{at:r.board.center,age:.1,angle:0,serial:1}];assert.equal(events.advance(r,.1)[0].name,'fracture');
  r.state='paused';assert.deepEqual(events.advance(r,30),[]);r.state='active';assert.equal(events.advance(r,.3)[0].name,'absorb');
  r.state='loss';events.advance(r,.1);events.reset(r);assert.deepEqual(events.advance(r,2),[]);
});
test('warning respects contact timing, targeting and twelve-second cooldown',()=>{
  const r=run(),events=new SoundscapeEvents();r.integrity=3;
  const hunter=new Drifter(1,{x:r.board.center.x+100,y:r.board.center.y},10);r.enemies=[hunter];assert.equal(dangerWarning(r),true);
  hunter.huntTarget=4;assert.equal(dangerWarning(r),false);hunter.huntTarget=-1;
  events.advance(r,0);assert.equal(events.advance(r,12)[0].name,'warning');assert.deepEqual(events.advance(r,1),[]);
});
test('source music envelope applies fade, narration duck, muted output and current energy',()=>{
  const envelope=new SoundscapeEnvelope(),r=run(1);close(currentEnergy(r),.12);r.stageElapsed=20;close(currentEnergy(r),.72);
  let mix=envelope.advance(r,DEFAULT_PREFERENCES,3);close(mix.music,.65);
  mix=envelope.advance(r,DEFAULT_PREFERENCES,0,true);close(mix.music,.65*.35);
  envelope.cue('injury');mix=envelope.advance(r,DEFAULT_PREFERENCES,0);close(mix.music,.65*.78);
  r.state='paused';mix=envelope.advance(r,DEFAULT_PREFERENCES,3);close(mix.music,.65*.45);
  mix=envelope.advance(r,{...DEFAULT_PREFERENCES,muted:true},1);assert.deepEqual(mix,{music:0,pond:0,current:0,effects:0});
});

class Player implements SoundPlayer {
  volume=0;loop=false;playing=false;duration=60;currentTime=0;playbackRate=1;shouldCorrectPitch=true;
  removed=0;starts=0;replacements:number[]=[];
  constructor(public source:number|null){}
  play(){this.playing=true;this.starts++;}pause(){this.playing=false;}remove(){this.removed++;}
  replace(source:number){this.source=source;this.currentTime=0;this.replacements.push(source);}
}
const assets:SoundAssets={music:{stillwater:1,glassgarden:2,deepwater:3},effects:Object.fromEntries(EFFECTS.map((name,index)=>[name,10+index])) as SoundAssets['effects'],pond:50,current:51,connectOctave:52};
function playback(){const players:Player[]=[];const audio=new SoundscapePlayback(source=>{const p=new Player(source);players.push(p);return p;},assets);return {audio,players};}
test('playback bounds voices, releases all native players and never runs in background',()=>{
  const {audio,players}=playback(),r=run();assert.equal(players.length,14);audio.update(r,DEFAULT_PREFERENCES,.1);
  r.integrity--;audio.update(r,DEFAULT_PREFERENCES,.1);assert.ok(players.slice(4).some(p=>p.playing));
  audio.setForeground(false);assert.ok(players.every(p=>!p.playing));const starts=players.reduce((n,p)=>n+p.starts,0);
  r.integrity--;audio.update(r,DEFAULT_PREFERENCES,5);assert.equal(players.reduce((n,p)=>n+p.starts,0),starts);
  audio.setForeground(true);audio.update(r,DEFAULT_PREFERENCES,.1);assert.ok(players.slice(4).every(p=>!p.playing));
  audio.dispose();audio.dispose();assert.ok(players.every(p=>p.removed===1&&!p.playing));
});
test('stage transitions crossfade tracks and imported octave preserves higher source notes',()=>{
  const {audio,players}=playback(),r=run();for(let i=0;i<20;i++)audio.update(r,DEFAULT_PREFERENCES,.25);
  const next=run(5);audio.update(next,DEFAULT_PREFERENCES,.25);assert.equal(players[1].source,2);assert.ok(players[0].volume>0&&players[1].volume>0);
  for(let i=0;i<20;i++)audio.update(next,DEFAULT_PREFERENCES,.25);
  assert.equal(players[0].playing,false);assert.equal(players[1].playing,true);
  next.selection.path=[0,1,2,3,4,5,6,7,8];audio.update(next,DEFAULT_PREFERENCES,.1);
  const note=players.slice(4).find(p=>p.playing)!;assert.equal(note.source,assets.connectOctave);close(note.playbackRate,2**(19/12)/2);
  audio.dispose();
});
test('disabled playback and failed construction clean up without starting beds',()=>{
  const {audio,players}=playback();audio.update(undefined,DEFAULT_PREFERENCES,.1,{enabled:false});assert.ok(players.every(p=>p.starts===0));audio.dispose();
  const partial:Player[]=[];assert.throws(()=>new SoundscapePlayback(source=>{if(partial.length===3)throw new Error('native error');const p=new Player(source);partial.push(p);return p;},assets));
  assert.ok(partial.every(p=>p.removed===1));
});
test('UI feedback plays through paused menus and obeys mute and background state',()=>{
  const {audio,players}=playback(),r=run();r.state='paused';audio.update(r,DEFAULT_PREFERENCES,.1);
  audio.uiPress();const voice=players.slice(4).find(p=>p.playing)!;assert.equal(voice.source,assets.effects.ui_press);
  audio.update(r,DEFAULT_PREFERENCES,.1);assert.equal(voice.playing,true);
  audio.update(r,{...DEFAULT_PREFERENCES,muted:true},.1);audio.uiPress();assert.ok(players.slice(4).every(p=>!p.playing));
  audio.setForeground(false);audio.uiPress();assert.ok(players.every(p=>!p.playing));audio.dispose();
});
test('external mote notes retain independent rate limits and original pitched connection sound',()=>{
  const {audio,players}=playback(),r=run();audio.update(r,DEFAULT_PREFERENCES,.1);
  audio.externalCue({name:'mote',gain:.3,pitch:3});audio.externalCue({name:'mote',gain:.3,pitch:3});
  assert.equal(players.slice(4).filter(p=>p.playing).length,1);
  const mote=players.slice(4).find(p=>p.playing)!;assert.equal(mote.source,assets.connectOctave);close(mote.playbackRate,1.5);
  r.selection.path=[0];audio.update(r,DEFAULT_PREFERENCES,.02);
  assert.equal(players.slice(4).filter(p=>p.playing).length,2,'mote must not suppress a real connection');
  audio.update(r,DEFAULT_PREFERENCES,.05);audio.externalCue({name:'mote',gain:.3,pitch:1});
  assert.equal(players.slice(4).filter(p=>p.playing).length,3);audio.dispose();
});
test('external gameplay cues obey mute, pause, background, disabled and disposed gates',()=>{
  const {audio,players}=playback(),r=run();audio.update(r,DEFAULT_PREFERENCES,.1);
  const send=()=>audio.externalCue({name:'heartbeat',gain:.4,pitch:1});send();
  assert.equal(players.slice(4).find(p=>p.playing)!.source,assets.effects.heartbeat);
  r.state='paused';audio.update(r,DEFAULT_PREFERENCES,.1);send();assert.ok(players.slice(4).every(p=>!p.playing));
  r.state='active';audio.update(r,{...DEFAULT_PREFERENCES,muted:true},.1);send();assert.ok(players.slice(4).every(p=>!p.playing));
  audio.setForeground(false);send();assert.ok(players.every(p=>!p.playing));
  audio.setForeground(true);audio.update(r,DEFAULT_PREFERENCES,.1,{enabled:false});send();assert.ok(players.every(p=>!p.playing));
  audio.update(r,DEFAULT_PREFERENCES,.1);audio.dispose();send();audio.uiPress();assert.ok(players.every(p=>!p.playing));
});
test('external swell and timer cues share the bounded voice pool and reject invalid numeric input',()=>{
  const {audio,players}=playback(),r=run();audio.update(r,DEFAULT_PREFERENCES,.1);
  audio.externalCue({name:'swell',gain:NaN,pitch:1});assert.ok(players.slice(4).every(p=>!p.playing));
  for(let i=0;i<12;i++){
    audio.externalCue({name:i%2?'ui_press':'swell',gain:.3,pitch:i%2?.86:1});audio.update(r,DEFAULT_PREFERENCES,.07);
  }
  assert.equal(players.length,14);assert.equal(players.slice(4).filter(p=>p.playing).length,10);
  assert.ok(players.slice(4).every(p=>p.source===assets.effects.ui_press||p.source===assets.effects.swell));audio.dispose();
});
