import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession} from '../src/campaign/journeySession';
import {createJourneyProfile,parseJourneyProfile,observeJourney,colonyUnlocked} from '../src/storage/journeyProfile';
import {UnsupportedSaveVersionError} from '../src/storage/saveRepository';

function complete(session:JourneySession):void{
  const run=session.current;session.begin();run.lesson.stepIndex=4;
  run.harvest.nourishment=run.harvest.spec.food;run.harvest.rescued=20;run.harvest.purified=20;run.harvest.defended=20;
  run.harvest.visited=[0,1,2,3,4,5,6,7];run.harvest.huntersCaptured=20;run.bossDefeated=run.harvest.spec.mode==='boss';
  run.harvest.checkCompletion(run);session.observeCompletion();session.update(1.6);assert.equal(run.state,'complete');
  for(let i=0;i<600&&!session.progressionReady;i++)session.update(1/60);
  assert.equal(session.progressionReady,true);
}
test('new profile and older partial records load stable defaults, future schemas are protected',()=>{
  const blank=createJourneyProfile();assert.deepEqual(parseJourneyProfile(JSON.parse(JSON.stringify(blank))),blank);
  assert.equal(colonyUnlocked(blank,'wanderer'),true);assert.equal(colonyUnlocked(blank,'weaver'),false);assert.equal(colonyUnlocked(blank,'symbiont'),false);
  const legacy=parseJourneyProfile({victories:2,bestScore:120,discovered:['food'],residents:[{token:'old:1',form:'spore'}]});
  assert.equal(legacy.version,1);assert.equal(legacy.victories,2);assert.equal(legacy.bestScore,120);
  assert.equal(legacy.residents[0].welcomed,true);assert.deepEqual(legacy.completedSeeds,[]);
  assert.throws(()=>parseJourneyProfile({version:2}),UnsupportedSaveVersionError);
});
test('profile validation rejects malformed records rather than silently replacing progress',()=>{
  for(const patch of [{version:null},{victories:-1},{deepestDish:4},{bestScore:Infinity},{discovered:'food'},{completedSeeds:[-2]},
    {residents:[{token:'bad',form:'spore'}]},{pondMemories:[{token:'bad',id:'unknown',stage:2}]}]){
    assert.throws(()=>parseJourneyProfile({...createJourneyProfile(),...patch}));
  }
  const missing={...createJourneyProfile()} as Record<string,unknown>;delete missing.bestScore;assert.throws(()=>parseJourneyProfile(missing));
});
test('rescues, discoveries, encounter clears and keepsakes are idempotent and preserve resident customizations',()=>{
  const session=new JourneySession(73),original=createJourneyProfile();
  session.current.rescuedSpecimens=[{token:'73:0:9',form:'spore',stage:0,encounter:1,rare:false,story:''}];
  session.current.masteryAwards=[{id:'guardian',stage:0,encounter:'route:0',title:'A life protected',detail:'',food:1}];
  let profile=observeJourney(original,session);assert.equal(original.residents.length,0);
  assert.equal(profile.residents.length,1);assert.equal(profile.residents[0].arrivedAfter,0);assert.equal(profile.residents[0].welcomed,false);
  assert.equal(profile.pondMemories.length,1);assert.strictEqual(observeJourney(profile,session),profile);
  complete(session);profile=observeJourney(profile,session);assert.equal(profile.clearedEncounters.length,1);
  const restored=parseJourneyProfile(JSON.parse(JSON.stringify(profile)));restored.residents[0].nickname='Pearl';restored.residents[0].welcomed=true;
  const next=observeJourney(restored,session);assert.equal(next.residents.length,1);assert.equal(next.residents[0].nickname,'Pearl');
  assert.equal(next.residents[0].welcomed,true);assert.equal(next.pondMemories.length,1);assert.equal(next.clearedEncounters.length,1);
});
test('original colony thresholds follow completed dish bosses and victories are counted once per seed',()=>{
  const session=new JourneySession(73);let profile=createJourneyProfile();
  for(let i=0;i<session.route.length;i++){
    const stage=session.current.stageIndex;
    profile=observeJourney(profile,session);const before=profile.deepestDish;complete(session);profile=observeJourney(profile,session);
    assert.equal(profile.deepestDish,Math.max(before,Math.floor(stage/4)+Number(stage%4===3)));
    if(stage===3)assert.equal(colonyUnlocked(profile,'weaver'),true);
    if(stage===7)assert.equal(colonyUnlocked(profile,'symbiont'),true);
    if(!session.finished)session.chooseEvolution('continue');
  }
  assert.equal(profile.deepestDish,3);assert.equal(profile.victories,1);assert.equal(profile.bestScore,session.current.score);
  const restored=parseJourneyProfile(JSON.parse(JSON.stringify(profile)));assert.strictEqual(observeJourney(restored,session),restored);
  assert.equal(restored.completedSeeds.length,1);assert.equal(restored.clearedEncounters.length,15);
});
test('retry observation cannot farm profile records or mutate already saved profile data',()=>{
  const session=new JourneySession(88);complete(session);let profile=observeJourney(createJourneyProfile(),session);
  session.chooseEvolution('continue');session.begin();session.current.rescuedSpecimens=[{token:'88:1:9',form:'spore',stage:1,encounter:2,rare:false,story:''}];
  profile=observeJourney(profile,session);const frozen=JSON.stringify(profile);session.current.state='loss';session.retry();
  session.current.rescuedSpecimens=[{token:'88:1:9',form:'spore',stage:1,encounter:2,rare:false,story:''}];
  const again=observeJourney(profile,session);assert.equal(again.residents.length,1);assert.equal(again.victories,0);
  assert.equal(again.clearedEncounters.length,1);assert.equal(JSON.stringify(profile),frozen);
});

test('an ordinary rescued spore retains its unassigned form through profile observation and reopening',()=>{
  const session=new JourneySession(73);complete(session);session.chooseEvolution('continue');session.begin();
  const run=session.current,spore=run.enemies.find(body=>body.kind==='spore');
  assert.ok(spore);assert.equal(spore.form,'');
  const sector=(run.harvest.rotation+1)%8;
  const capture=run.capture([8+sector,16+sector,16+(sector+1)%8]);
  assert.equal(capture.valid,true);assert.equal(run.harvest.rescued,1);
  const profile=observeJourney(createJourneyProfile(),session);
  assert.equal(profile.residents.length,1);assert.equal(profile.residents[0].form,'');
  assert.equal(profile.residents[0].token,run.rescuedSpecimens[0].token);
  const reopened=parseJourneyProfile(JSON.parse(JSON.stringify(profile)));
  assert.deepEqual(reopened,profile);assert.strictEqual(observeJourney(reopened,session),reopened);
  for(const form of [null,undefined,5,{},'x'.repeat(257)]){
    assert.throws(()=>parseJourneyProfile({...profile,residents:[{...profile.residents[0],form}]}));
  }
});
