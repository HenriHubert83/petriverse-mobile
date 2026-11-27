import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession} from '../src/campaign/journeySession';
import {SMALL_LESSON,WIDE_LESSON} from '../src/campaign/journeyLesson';

function finish(session:JourneySession):void{
  const run=session.current;session.begin();run.lesson.stepIndex=4;
  run.harvest.nourishment=run.harvest.spec.food;run.harvest.rescued=20;run.harvest.purified=20;run.harvest.defended=20;
  run.harvest.visited=[0,1,2,3,4,5,6,7];run.harvest.huntersCaptured=20;run.bossDefeated=run.harvest.spec.mode==='boss';
  run.harvest.checkCompletion(run);session.observeCompletion();session.update(1.6);assert.equal(run.state,'complete');
  for(let i=0;i<600&&!session.progressionReady;i++)session.update(1/60);
  assert.equal(session.progressionReady,true);
}
test('real opening harvest buys its first adaptation and carries colony state into the next encounter',()=>{
  const session=new JourneySession(73);session.begin();session.current.capture(SMALL_LESSON);session.update(7);session.current.capture(WIDE_LESSON);session.update(7);
  assert.equal(session.current.state,'complete');assert.deepEqual(session.offers,['fission','elastic']);assert.equal(session.current.biomass,9);
  session.update(1.6);
  const score=session.current.score;assert.equal(session.chooseEvolution('unknown'),false);assert.equal(session.chooseEvolution('fission'),true);
  assert.equal(session.index,1);assert.equal(session.current.state,'brief');assert.deepEqual(session.current.mutations,['fission']);
  assert.equal(session.current.biomass,3);assert.equal(session.current.score,score);assert.equal(session.current.totalFood,9);
});
test('retry restores entry food, achievements and seeded content without banking failed-attempt gains',()=>{
  const session=new JourneySession(73);finish(session);session.current.biomass=12;session.chooseEvolution('elastic');
  const run=session.current,score=run.score,shape=run.enemies.map(b=>({kind:b.kind,at:b.nucleus}));
  session.begin();run.biomass=30;run.score+=999;run.totalRescued=50;run.state='loss';run.integrity=0;
  assert.equal(session.retry(),true);assert.equal(session.current.biomass,6);assert.equal(session.current.score,score);assert.equal(session.current.totalRescued,0);
  assert.equal(session.current.state,'brief');assert.deepEqual(session.current.enemies.map(b=>({kind:b.kind,at:b.nucleus})),shape);assert.equal(session.retries,1);
});
test('all fifteen transitions grow the colony, suppress special-visit offers and award the ending once',()=>{
  const session=new JourneySession(73);
  for(let i=0;i<15;i++){
    assert.equal(session.index,i);const run=session.current;session.begin();assert.ok(run.maxIntegrity>=3&&run.maxIntegrity<=7);
    finish(session);const before=run.score;session.observeCompletion();assert.equal(run.score,before);
    if(run.harvest.spec.generated)assert.deepEqual(session.offers,[]);
    if(i<14){assert.equal(session.finished,false);assert.equal(session.chooseEvolution('continue'),true);}
  }
  assert.equal(session.finished,true);assert.equal(session.current.maxIntegrity,7);assert.equal(session.chooseEvolution('continue'),false);
  const score=session.current.score;session.update(4);assert.equal(session.current.score,score);
});
test('adaptations require food, and healing charges only once before advancing',()=>{
  const session=new JourneySession(73);finish(session);assert.equal(session.chooseEvolution('elastic'),false);assert.equal(session.index,0);
  session.current.integrity=1;session.current.motherDamage.resetFromIntegrity(1);session.current.biomass=6;
  assert.equal(session.chooseEvolution('repair'),true);assert.equal(session.current.integrity,3);assert.equal(session.current.biomass,0);
  assert.equal(session.chooseEvolution('repair'),false);assert.equal(session.index,1);
});
test('a chosen growth role survives retry and later encounters',()=>{
  const session=new JourneySession(73);finish(session);session.chooseEvolution('continue');finish(session);session.chooseEvolution('continue');
  assert.equal(session.current.growthSlot(),1);assert.equal(session.current.chooseGrowthRole('feeder'),true);session.begin();
  session.current.state='loss';session.retry();assert.equal(session.current.growthRoles[1],'feeder');assert.equal(session.current.growthActive('feeder'),1);
  finish(session);session.chooseEvolution('continue');assert.equal(session.current.growthRoles[1],'feeder');
});
