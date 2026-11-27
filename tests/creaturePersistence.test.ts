import {test} from 'node:test';
import assert from 'node:assert/strict';
import legacyFixture from './fixtures/journey-v1-continuation.json';
import {JourneySession} from '../src/campaign/journeySession';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {captureOrganism,restoreOrganism} from '../src/storage/organismSnapshot';
import {Board} from '../src/geometry/board';
import {SMALL_LESSON} from '../src/campaign/journeyLesson';
import {createJourneyProfile,observeJourney,parseJourneyProfile} from '../src/storage/journeyProfile';
import {stepDiscoveries} from '../src/campaign/journeyDiscoveries';

const json=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function finish(session:JourneySession):void{
  const run=session.current;session.begin();run.lesson.stepIndex=run.stageIndex===0?4:-1;
  run.harvest.nourishment=run.harvest.spec.food;run.harvest.rescued=20;run.harvest.purified=20;run.harvest.defended=20;
  run.harvest.visited=[0,1,2,3,4,5,6,7];run.harvest.huntersCaptured=20;run.bossDefeated=run.harvest.spec.mode==='boss';
  run.harvest.checkCompletion(run);session.observeCompletion();session.update(1.6);assert.equal(run.state,'complete');
  for(let i=0;i<600&&!session.progressionReady;i++)session.update(1/60);
  assert.equal(session.progressionReady,true);
}
function toIndex(index:number):JourneySession{
  const s=new JourneySession(73);while(s.index<index){finish(s);assert.ok(s.chooseEvolution('continue'));}return s;
}
function alignAtCapture(body:HarvestOrganism,session:JourneySession):void{
  const run=session.current;
  body.nucleus=body.origin=SMALL_LESSON.reduce((p,i)=>({x:p.x+run.board.anchors[i].x/3,y:p.y+run.board.anchors[i].y/3}),{x:0,y:0});
  body.age=8;body.drift={x:0,y:0};
  run.enemies=[body];run.phages.clusters=[];
}

test('historical version 1 save keeps exact ecology for twelve seconds across visitor arrival time',()=>{
  assert.equal(legacyFixture.before.version,1);
  const resumed=JourneySession.restore(json(legacyFixture.before),{pauseOnResume:false});
  assert.equal(resumed.creatureContentEnabled,false);assert.deepEqual(resumed.current.expeditionRoster,[]);
  for(let i=0;i<legacyFixture.steps;i++)resumed.update(1/60);
  const expected=JourneySession.restore(json(legacyFixture.after),{pauseOnResume:false});
  assert.deepEqual(resumed.snapshot(),expected.snapshot());
  const entry=JourneySession.restore(resumed.entrySnapshot());
  assert.equal(entry.creatureContentEnabled,false);assert.equal(entry.current.harvest.visitorAt,-1);
  finish(resumed);resumed.chooseEvolution('continue');assert.equal(resumed.current.creatureContentEnabled,false);
});

test('Moonlace food with negative bloom identifiers survives JSON and keeps its shoal identity',()=>{
  const session=toIndex(2);session.begin();const run=session.current;
  run.stageElapsed=run.elapsed=run.harvest.visitorAt;stepDiscoveries(run);
  const visitor=run.enemies.find(b=>b.visitor)!;assert.equal(visitor.form,'moonlace');
  visitor.age=6;stepDiscoveries(run);
  assert.equal(run.enemies.filter(b=>b.bloomId< -1).length,2);
  const saved=session.snapshot(),restored=JourneySession.restore(json(saved),{pauseOnResume:false});
  assert.deepEqual(restored.snapshot(),saved);
  const duplicateVisitor=json(saved);duplicateVisitor.encounter.harvest.visitorSpawned=false;
  assert.throws(()=>JourneySession.restore(duplicateVisitor));
  const wrongVisitor=json(saved);wrongVisitor.encounter.enemies.find(b=>b.common.visitor)!.common.form='glowdrift';
  assert.throws(()=>JourneySession.restore(wrongVisitor));
  for(let i=0;i<60;i++){session.update(1/60);restored.update(1/60);}
  assert.deepEqual(restored.snapshot(),session.snapshot());
  const high=new HarvestOrganism(999999999,'food',{x:800,y:400},{x:2,y:3},0);
  high.bloomId=-100000-high.id*8-20;
  assert.equal(restoreOrganism(captureOrganism(high),new Board()).bloomId,high.bloomId);
  for(const id of [-Infinity,-1e10-1,NaN,0.5]){
    const invalid=json(captureOrganism(high));invalid.common.bloomId=id;
    assert.throws(()=>restoreOrganism(invalid,new Board()));
  }
});

test('organism IDs and rescued form identities remain unique across authored and generated visits at the same stage',()=>{
  const session=toIndex(2);session.begin();let run=session.current;
  const first=new HarvestOrganism(++run.nextEnemyId,'spore',{x:0,y:0},{x:0,y:0},0);first.form='moonlace';first.visitor=true;
  alignAtCapture(first,session);run.discoverBody(first);assert.equal(run.capture(SMALL_LESSON).valid,true);
  let profile=observeJourney(createJourneyProfile(),session);assert.equal(profile.residents[0].form,'moonlace');assert.equal(profile.residents[0].rare,true);
  const lastID=run.nextEnemyId;finish(session);session.chooseEvolution('continue');session.begin();run=session.current;
  assert.equal(run.stageIndex,2);assert.equal(run.harvest.spec.generated,true);
  assert.ok(run.enemies.every(b=>b.id>lastID));
  const second=new HarvestOrganism(++run.nextEnemyId,'spore',{x:0,y:0},{x:0,y:0},0);second.form='glasswing_spore';
  alignAtCapture(second,session);run.discoverBody(second);assert.equal(run.capture(SMALL_LESSON).valid,true);
  profile=observeJourney(profile,session);assert.equal(profile.residents.length,2);
  assert.equal(new Set(profile.residents.map(r=>r.token)).size,2);
  assert.equal(profile.residents[1].rare,true);assert.ok(profile.discovered.includes('glasswing_spore'));
  const reopened=JourneySession.restore(json(session.snapshot()));
  assert.deepEqual(observeJourney(parseJourneyProfile(json(profile)),reopened),profile);
});

test('expedition identity survives resume and retry replays its entry roster without changing later visitors',()=>{
  const session=toIndex(3);session.begin();const run=session.current,entry=json(run.expeditionRoster);
  run.stageElapsed=run.elapsed=8;stepDiscoveries(run);
  const visit=run.expeditionRoster.find(v=>v.encounter===3)!;
  assert.equal(visit.spawned,true);assert.equal(run.enemies.filter(b=>b.form===visit.form).length,1);
  const restored=JourneySession.restore(json(session.snapshot()),{pauseOnResume:false});
  stepDiscoveries(restored.current);assert.equal(restored.current.enemies.filter(b=>b.form===visit.form).length,1);
  const spentCheckpoint=json(session.snapshot());spentCheckpoint.checkpoint.colony.expeditionRoster[0].spawned=true;
  assert.throws(()=>JourneySession.restore(spentCheckpoint));
  const duplicateVisit=json(session.snapshot());duplicateVisit.encounter.run.expeditionRoster[0].spawned=false;
  assert.throws(()=>JourneySession.restore(duplicateVisit));
  const checkpoint=JourneySession.restore(restored.entrySnapshot());assert.deepEqual(checkpoint.current.expeditionRoster,entry);
  const afterID=restored.current.nextEnemyId;restored.current.state='loss';assert.equal(restored.retry(),true);
  assert.deepEqual(restored.current.expeditionRoster,entry);restored.begin();restored.current.stageElapsed=restored.current.elapsed=8;
  stepDiscoveries(restored.current);assert.equal(restored.current.nextEnemyId,afterID);
  assert.deepEqual(restored.current.expeditionRoster,run.expeditionRoster);
});

test('current saves reject malformed content state instead of silently changing saved encounters',()=>{
  const saved=toIndex(3).snapshot();
  for(const change of [
    (s:any)=>{delete s.creatureContentEnabled;},(s:any)=>{s.encounter.run.creatureContentEnabled=false;},
    (s:any)=>{s.encounter.run.expeditionRoster[0].form='unknown';},
    (s:any)=>{s.encounter.run.expeditionRoster[1].spawned=true;},
    (s:any)=>{s.encounter.run.expeditionRoster[0].encounter=1;},
    (s:any)=>{s.checkpoint.colony.nextEnemyId=s.encounter.run.nextEnemyId+1;},
    (s:any)=>{s.encounter.harvest.visitorAt=20;},(s:any)=>{s.encounter.harvest.visitorSpawned=true;},
    (s:any)=>{delete s.encounter.harvest.visitorSpawned;},
  ]){const bad=json(saved);change(bad);assert.throws(()=>JourneySession.restore(bad));}
});
