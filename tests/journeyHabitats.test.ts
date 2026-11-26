import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession} from '../src/campaign/journeySession';
import {habitatChoicePending,habitatChoicesAvailable,habitatOptions,habitatName,enterHabitat} from '../src/campaign/journeyHabitats';
import {JOURNEY_SAVE_VERSION} from '../src/storage/journeySnapshot';
import {stepDiscoveries} from '../src/campaign/journeyDiscoveries';
import {createJourneyProfile,colonyUnlocked} from '../src/storage/journeyProfile';
import {Drifter} from '../src/ecology/drifter';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import type {ColonyId} from '../src/campaign/journeyPlan';
import {SMALL_LESSON} from '../src/campaign/journeyLesson';
import legacyFixture from './fixtures/journey-v2-continuation.json';

const json=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
function finish(session:JourneySession):void{
  const run=session.current;session.begin();run.lesson.stepIndex=run.stageIndex===0?4:-1;
  run.harvest.nourishment=run.harvest.spec.food;run.harvest.rescued=20;run.harvest.purified=20;run.harvest.defended=20;
  run.harvest.visited=[0,1,2,3,4,5,6,7];run.harvest.huntersCaptured=20;run.bossDefeated=run.harvest.spec.mode==='boss';
  run.harvest.checkCompletion(run);session.observeCompletion();session.update(1.6);assert.equal(run.state,'complete');
  for(let i=0;i<600&&!session.progressionReady;i++)session.update(1/60);
  assert.equal(session.progressionReady,true);
}
function toIndex(index:number):JourneySession{
  const session=new JourneySession(73);while(session.index<index){finish(session);assert.ok(session.chooseEvolution('continue'));}return session;
}
const foodCount=(session:JourneySession)=>session.current.enemies.filter(body=>body.kind==='food').length;
const cystCount=(session:JourneySession)=>session.current.enemies.filter(body=>body.kind==='cyst').length;

test('habitat options keep teaching and boss encounters unchanged and expose original biome names',()=>{
  const session=new JourneySession(73);
  for(let index=0;index<15;index++){
    const run=session.current,expected=run.stageIndex>=2&&run.stageIndex%4!==3;
    assert.equal(habitatChoicesAvailable(run),expected);assert.equal(habitatChoicePending(run),expected);
    assert.equal(habitatOptions(run).length,expected?2:0);assert.equal(session.chooseHabitat('unknown'),false);
    if(!expected)assert.equal(session.chooseHabitat('refuge'),false);
    if(index<14){finish(session);session.chooseEvolution('continue');}
  }
  assert.equal(habitatName(2,'bloom'),'Blooming banks');assert.equal(habitatName(4,'refuge'),'Glass grotto');
  assert.equal(habitatName(10,'refuge'),'Midnight refuge');
});

test('a selected habitat saves before entry without moving organisms, spending food, or drawing RNG',()=>{
  const session=toIndex(5),run=session.current,rng=run.rng.saveState(),positions=run.enemies.map(body=>({...body.nucleus}));
  const food=foodCount(session),cysts=cystCount(session);assert.ok(session.chooseHabitat('refuge'));
  assert.equal(session.chooseHabitat('bloom'),false);session.update(20);
  assert.equal(run.stageElapsed,0);assert.equal(foodCount(session),food);assert.equal(cystCount(session),cysts);
  assert.deepEqual(run.enemies.map(body=>body.nucleus),positions);assert.deepEqual(run.rng.saveState(),rng);
  const saved=session.snapshot(),restored=JourneySession.restore(json(saved));assert.deepEqual(restored.snapshot(),saved);
  assert.equal(restored.current.habitatChoice,'refuge');assert.equal(habitatChoicePending(restored.current),false);
  assert.equal(restored.current.habitatApplied,false);assert.equal(restored.current.state,'brief');
});

test('shelter trims exactly the fifth algae in each bloom, preserves cysts, and applies once across saves',()=>{
  const session=toIndex(5),run=session.current,food=foodCount(session),cysts=cystCount(session);
  session.chooseHabitat('refuge');session.begin();assert.equal(foodCount(session),food-2);assert.equal(cystCount(session),cysts);
  assert.equal(run.harvest.visitorAt,36);assert.equal(run.habitatHistory['route:5'],'refuge');
  const before=foodCount(session);enterHabitat(run);assert.equal(foodCount(session),before);
  run.harvest.spawnBloom(run,3);assert.equal(foodCount(session),before+4);assert.equal(cystCount(session),cysts+2);
  const restored=JourneySession.restore(json(session.snapshot()));enterHabitat(restored.current);
  assert.equal(foodCount(restored),before+4);assert.equal(restored.current.habitatApplied,true);
  restored.current.togglePause();assert.equal(restored.current.state,'active');
  assert.equal(restored.chooseHabitat('bloom'),false);
});

test('shelter retains every feeding wave but halves normal hunters and suppresses staggered extras',()=>{
  for(const index of [5,10]){
    const session=toIndex(index),run=session.current;session.chooseHabitat('refuge');session.begin();
    run.harvest.ecology.pending=[];for(let wave=0;wave<4;wave++)run.harvest.ecology.queueWave(run);
    assert.equal(run.harvest.ecology.pending.filter(event=>event.kind==='hunter').length,2);
    assert.equal(run.harvest.ecology.pending.filter(event=>event.kind==='bloom').length,4);
    const ordinary=toIndex(index);ordinary.chooseHabitat('bloom');ordinary.begin();ordinary.current.harvest.ecology.pending=[];
    for(let wave=0;wave<4;wave++)ordinary.current.harvest.ecology.queueWave(ordinary.current);
    assert.ok(ordinary.current.harvest.ecology.pending.filter(event=>event.kind==='hunter').length>=4);
  }
});

test('shelter visitor waits for active simulation, appears at 36 seconds, and survives retry without rerolling',()=>{
  const session=toIndex(5);session.chooseHabitat('refuge');const chosen=session.snapshot();session.begin();
  const run=session.current;run.togglePause();session.update(40);assert.equal(run.harvest.visitorSpawned,false);assert.equal(run.stageElapsed,0);
  run.togglePause();run.stageElapsed=run.elapsed=36;stepDiscoveries(run);
  assert.ok(run.enemies.some(body=>body.visitor&&body.form==='glass_harp'));
  const restored=JourneySession.restore(json(session.snapshot()),{pauseOnResume:false});
  const recovered=JourneySession.restore(restored.entrySnapshot());assert.equal(recovered.current.habitatChoice,'refuge');
  assert.equal(recovered.current.habitatApplied,false);assert.equal(foodCount(recovered),foodCount(JourneySession.restore(chosen)));
  restored.current.state='loss';assert.ok(restored.retry());assert.equal(restored.current.habitatChoice,'refuge');
  assert.equal(restored.current.habitatConfirmed,true);assert.equal(restored.current.habitatApplied,false);
  restored.begin();assert.equal(foodCount(restored),8);assert.equal(restored.current.harvest.visitorAt,36);
  assert.equal(restored.current.harvest.visitorSpawned,false);
});

test('new encounters offer a fresh route while preserving travelled habitat history',()=>{
  const session=toIndex(2);session.current.chooseGrowthRole('feeder');session.chooseHabitat('refuge');
  session.begin();assert.equal(session.current.growthRoles[1],'feeder');finish(session);session.chooseEvolution('continue');
  assert.equal(session.index,3);assert.equal(session.current.habitatChoice,'bloom');assert.equal(session.current.habitatConfirmed,false);
  assert.deepEqual(session.current.habitatHistory,{'route:2':'refuge'});session.chooseHabitat('bloom');session.begin();
  assert.deepEqual(session.current.habitatHistory,{'route:2':'refuge','route:3':'bloom'});
  const restored=JourneySession.restore(json(session.snapshot()));assert.deepEqual(restored.current.habitatHistory,session.current.habitatHistory);
});

test('advanced colonies use original starting traits, skip the tutorial, and retain their real capture bonuses',()=>{
  for(const [id,trait] of [['wanderer',''],['weaver','fission'],['symbiont','symbiosis']] as const){
    const session=new JourneySession(73,{colonyId:id}),run=session.current;
    assert.equal(session.colonyId,id);assert.equal(run.colonyId,id);assert.equal(run.integrity,3);assert.equal(run.biomass,0);
    assert.deepEqual(run.mutations,trait?[trait]:[]);assert.equal(run.lessonActive(),id==='wanderer');
    if(id!=='wanderer')assert.equal(foodCount(session),15);
    session.begin();run.lesson.stepIndex=-1;
    const at=SMALL_LESSON.reduce((p,n)=>({x:p.x+run.board.anchors[n].x/3,y:p.y+run.board.anchors[n].y/3}),{x:0,y:0});
    run.enemies=[id==='symbiont'?new Drifter(++run.nextEnemyId,at,0):new HarvestOrganism(++run.nextEnemyId,'food',at,{x:0,y:0},0)];
    const captured=run.capture(SMALL_LESSON);assert.equal(captured.valid,true);if(!captured.valid)continue;
    if(id==='weaver'){assert.ok(Math.abs(captured.recovery-captured.strain-2)<1e-9);assert.equal(captured.foodBonuses.fission,1);}
    if(id==='symbiont'){assert.equal(captured.foodBonuses.symbiosis,2);assert.equal(captured.food,2);}
    const resumed=JourneySession.restore(json(session.snapshot()));assert.equal(resumed.colonyId,id);assert.deepEqual(resumed.current.mutations,run.mutations);
    resumed.current.state='loss';resumed.retry();assert.equal(resumed.colonyId,id);assert.equal(resumed.current.lessonActive(),id==='wanderer');
    assert.deepEqual(resumed.current.mutations,trait?[trait]:[]);
  }
  assert.throws(()=>new JourneySession(1,{colonyId:'unknown' as ColonyId}));
});

test('colony unlocks remain tied to completed dishes and advanced traits are not offered twice',()=>{
  const profile=createJourneyProfile();assert.equal(colonyUnlocked(profile,'wanderer'),true);assert.equal(colonyUnlocked(profile,'weaver'),false);
  profile.deepestDish=1;assert.equal(colonyUnlocked(profile,'weaver'),true);assert.equal(colonyUnlocked(profile,'symbiont'),false);
  profile.deepestDish=2;assert.equal(colonyUnlocked(profile,'symbiont'),true);
  for(const id of ['weaver','symbiont'] as const){
    const session=new JourneySession(73,{colonyId:id}),trait=session.current.mutations[0];finish(session);
    assert.equal(session.offers.includes(trait),false);assert.equal(session.evolutionCost(),8);
    session.chooseEvolution('continue');assert.ok(session.current.mutations.includes(trait));
  }
});

test('schema 3 rejects inconsistent habitat choices, histories and starting colony identities',()=>{
  const session=toIndex(5);session.chooseHabitat('refuge');session.begin();const saved=session.snapshot();assert.equal(saved.version,JOURNEY_SAVE_VERSION);
  for(const change of [
    (value:any)=>{value.colonyId='unknown';},(value:any)=>{value.colonyId='weaver';},
    (value:any)=>{value.encounter.run.colonyId='symbiont';},(value:any)=>{delete value.habitatContentEnabled;},
    (value:any)=>{value.encounter.run.habitatChoice='unknown';},(value:any)=>{value.encounter.run.habitatApplied=false;},
    (value:any)=>{value.encounter.run.habitatConfirmed=false;},(value:any)=>{value.checkpoint.habitatChoice='bloom';},
    (value:any)=>{value.encounter.run.habitatHistory['route:4']='refuge';},
    (value:any)=>{value.encounter.run.habitatHistory['route:6']='bloom';},
    (value:any)=>{value.encounter.run.habitatHistory['route:5']='bloom';},
    (value:any)=>{value.checkpoint.colony.habitatHistory['route:5']='refuge';},
    (value:any)=>{value.encounter.run.habitatContentEnabled=false;},
    (value:any)=>{value.encounter.harvest.visitorAt=40;},
  ]){const invalid=json(saved);change(invalid);assert.throws(()=>JourneySession.restore(invalid));}
});

test('historical version 2 saves keep exact ecology across 36 seconds and keep habitats disabled afterward',()=>{
  assert.equal(legacyFixture.before.version,2);
  const restored=JourneySession.restore(json(legacyFixture.before),{pauseOnResume:false});
  assert.equal(restored.colonyId,'wanderer');assert.equal(restored.habitatContentEnabled,false);
  assert.equal(habitatChoicePending(restored.current),false);assert.equal(restored.chooseHabitat('refuge'),false);
  for(let i=0;i<legacyFixture.steps;i++)restored.update(1/60);
  const expected=JourneySession.restore(json(legacyFixture.after),{pauseOnResume:false});
  assert.deepEqual(restored.snapshot(),expected.snapshot());assert.equal(restored.current.harvest.visitorSpawned,false);
  const entry=JourneySession.restore(restored.entrySnapshot());assert.equal(entry.habitatContentEnabled,false);
  assert.equal(entry.current.habitatApplied,true);assert.equal(entry.current.habitatChoice,'bloom');
  finish(restored);restored.chooseEvolution('continue');assert.equal(restored.habitatContentEnabled,false);
  assert.equal(habitatChoicesAvailable(restored.current),false);assert.equal(restored.current.creatureContentEnabled,true);
});
