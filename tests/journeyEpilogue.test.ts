import test from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession} from '../src/campaign/journeySession';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {createJourneyProfile} from '../src/storage/journeyProfile';
import {CREATURE_CATALOGUE} from '../src/content/creatureCatalogue';
import {journeyEpilogue,epilogueReady} from '../src/pond/journeyEpilogue';

test('epilogue uses the current final Mother and latest twelve real rescues without altering records',()=>{
  const session=new JourneySession(73),profile=createJourneyProfile();
  session.current=new EncounterSimulation({stage:11,mode:'boss',duration:999,target:1,food:0},{maxIntegrity:7,integrity:5,mutations:['elastic','enzyme']});
  const run=session.current;run.totalRescued=15;run.totalFood=212;run.score=4567;
  profile.residents=Array.from({length:15},(_,i)=>({token:`73:${i}`,form:'spore',stage:2,encounter:3,rare:false,story:'',arrivedAfter:0,welcomed:false}));
  profile.deepestDish=1;profile.lastColonyTraits=['fission'];profile.bestScore=5000;profile.discovered=['food'];run.seenSpecies=['food','amoeba'];
  const before=JSON.stringify(profile),ending=journeyEpilogue(session,profile);
  assert.equal(ending.layout.epilogue,true);assert.deepEqual(ending.layout.residents.map(r=>r.record.token),profile.residents.slice(-12).map(r=>r.token));
  assert.equal(ending.layout.mother.stage,11);assert.equal(ending.layout.mother.width,217);assert.deepEqual(ending.layout.mother.traits,['elastic','enzyme']);
  assert.equal(ending.motherDamage.filter(value=>value===1).length,2);assert.equal(ending.colonyName,'Feast colony');assert.equal(ending.integrity,5);
  assert.equal(ending.undiscovered,42);assert.equal(ending.score,4567);assert.equal(ending.bestScore,5000);assert.equal(ending.rescued,15);assert.equal(JSON.stringify(profile),before);
});

test('ending waits until completion and original aftermath settle; completed catalogue receives source note',()=>{
  const session=new JourneySession(7),profile=createJourneyProfile();assert.equal(epilogueReady(session),false);
  session.finished=true;session.current.state='complete';assert.equal(epilogueReady(session),true);
  session.current.motherDamage.record(1,{x:500,y:500},session.current.board.center);assert.equal(epilogueReady(session),false);
  session.current.motherDamage.step(3);assert.equal(epilogueReady(session),true);
  profile.discovered=CREATURE_CATALOGUE.map(c=>c.id);
  const ending=journeyEpilogue(session,profile);assert.equal(ending.undiscovered,0);assert.equal(ending.note,'Every known species discovered. A different colony is waiting.');
  assert.equal(ending.layout.residents.length,0);assert.equal(ending.colonyName,'An adaptable colony');
});
