import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession} from '../src/campaign/journeySession';
import {SMALL_LESSON} from '../src/campaign/journeyLesson';
function complete(session:JourneySession):void{
  session.begin();const run=session.current;run.lesson.stepIndex=4;run.harvest.nourishment=run.harvest.spec.food;
  run.harvest.rescued=20;run.harvest.purified=20;run.harvest.defended=20;run.harvest.visited=[0,1,2,3,4,5,6,7];
  run.harvest.huntersCaptured=20;run.bossDefeated=run.harvest.spec.mode==='boss';run.harvest.checkCompletion(run);session.observeCompletion();
  assert.equal(run.state,'complete');
}
function completingCapture():JourneySession{
  const session=new JourneySession(73);session.begin();session.current.lesson.stepIndex=4;
  session.current.harvest.nourishment=session.current.harvest.spec.food-3;
  assert.equal(session.current.capture(SMALL_LESSON).valid,true);session.observeCompletion();
  assert.equal(session.current.state,'complete');return session;
}
test('evolution waits 1.6 seconds without advancing simulation, spending food or drawing new random values',()=>{
  const session=new JourneySession(73);complete(session);session.current.biomass=20;
  const snapshot=session.snapshot();assert.equal(session.progressionReady,false);assert.equal(session.resultRevealRemaining,1.6);
  assert.equal(session.chooseEvolution('fission'),false);assert.equal(session.chooseEvolution('continue'),false);assert.deepEqual(session.snapshot(),snapshot);
  session.update(1.5);assert.equal(session.progressionReady,false);session.update(.1);assert.equal(session.progressionReady,true);
  assert.deepEqual(session.snapshot(),snapshot);assert.equal(session.chooseEvolution('fission'),true);assert.equal(session.index,1);assert.equal(session.current.biomass,14);
  assert.equal(session.chooseEvolution('fission'),false);assert.equal(session.current.state,'brief');
});
test('real capture recovery and Mother bites must both finish even after the result timer expires',()=>{
  const session=completingCapture();
  session.update(1.6);assert.ok(session.current.clots.length>0);assert.equal(session.progressionReady,false);
  for(let i=0;i<600&&!session.progressionReady;i++)session.update(1/60);assert.equal(session.progressionReady,true);
  const run=session.current;run.motherDamage.record(99,{x:run.board.center.x+40,y:run.board.center.y},run.board.center);
  assert.equal(session.progressionReady,false);assert.equal(session.chooseEvolution('continue'),false);
  session.update(2.2);assert.equal(session.progressionReady,true);assert.equal(session.chooseEvolution('continue'),true);
});
test('the final encounter uses the source 2.8 second result reveal before the epilogue',()=>{
  const session=new JourneySession(73);
  while(session.index<session.route.length-1){complete(session);session.update(1.6);assert.equal(session.chooseEvolution('continue'),true);}
  complete(session);assert.equal(session.finished,true);assert.equal(session.resultRevealRemaining,2.8);
  session.update(1.6);assert.equal(session.progressionReady,false);session.update(1.2);assert.equal(session.progressionReady,true);
  assert.equal(session.chooseEvolution('continue'),false);
});
test('reopening a completed checkpoint skips the transient reveal but retains live capture aftermath',()=>{
  const settled=new JourneySession(73);complete(settled);const before=settled.snapshot();
  const resumed=JourneySession.restore(before);assert.equal(resumed.progressionReady,true);assert.deepEqual(resumed.snapshot(),before);
  const active=completingCapture();
  const saved=active.snapshot(),restored=JourneySession.restore(saved);assert.equal(restored.resultRevealRemaining,0);assert.equal(restored.progressionReady,false);
  for(let i=0;i<600&&!restored.progressionReady;i++)restored.update(1/60);assert.equal(restored.progressionReady,true);
});
