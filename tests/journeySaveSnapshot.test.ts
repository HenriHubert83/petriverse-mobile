import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession,UnsupportedSaveVersionError} from '../src/campaign/journeySession';
import {SeededRandom} from '../src/engine/seededRandom';
import {SMALL_LESSON,WIDE_LESSON} from '../src/campaign/journeyLesson';
import {Amoeba} from '../src/ecology/amoeba';
import {Bacterium} from '../src/ecology/bacterium';
import {JourneyBoss} from '../src/campaign/journeyBoss';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {JOURNEY_SAVE_VERSION} from '../src/storage/journeySnapshot';

const json=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function finish(session:JourneySession):void{
  const run=session.current;session.begin();run.lesson.stepIndex=run.stageIndex===0?4:-1;
  run.harvest.nourishment=run.harvest.spec.food;run.harvest.rescued=20;run.harvest.purified=20;run.harvest.defended=20;
  run.harvest.visited=[0,1,2,3,4,5,6,7];run.harvest.huntersCaptured=20;run.bossDefeated=run.harvest.spec.mode==='boss';
  run.harvest.checkCompletion(run);session.observeCompletion();assert.equal(run.state,'complete');
}
function advanceTo(stage:number):JourneySession{
  const session=new JourneySession(73);
  while(session.current.stageIndex!==stage){finish(session);session.chooseEvolution('continue');}
  return session;
}
function paired(session:JourneySession):JourneySession{
  const before=session.snapshot(),restored=JourneySession.restore(json(before),{pauseOnResume:false});
  assert.deepEqual(restored.snapshot(),before);
  return restored;
}
function advanceBoth(a:JourneySession,b:JourneySession,seconds=3):void{
  for(let i=0;i<seconds*60;i++){a.update(1/60);b.update(1/60);}
  assert.deepEqual(b.snapshot(),a.snapshot());
}
test('full save resumes tutorial recovery without changing RNG, fluid, cell linkage or capture rewards',()=>{
  const session=new JourneySession(73);session.begin();session.current.capture(SMALL_LESSON);
  for(let i=0;i<30;i++)session.update(1/60);
  const restored=paired(session);
  assert.equal(restored.current.clots[0].members[0],restored.current.cells[restored.current.clots[0].nodes[0]]);
  advanceBoth(session,restored,7);
  session.current.capture(WIDE_LESSON);restored.current.capture(WIDE_LESSON);advanceBoth(session,restored,7);
  assert.equal(restored.current.state,'complete');assert.deepEqual(restored.offers,['fission','elastic']);
  const score=restored.current.score;const ended=JourneySession.restore(json(restored.snapshot()));ended.observeCompletion();assert.equal(ended.current.score,score);
  session.chooseEvolution('fission');ended.chooseEvolution('fission');assert.deepEqual(ended.snapshot(),session.snapshot());
});
test('continued active journey starts paused and forgets an interrupted membrane and nudge drag',()=>{
  const session=new JourneySession(7);session.begin();session.current.selection.start(session.current.board.anchors[0]);
  session.current.nudge.targetId=3;session.current.nudge.aim={x:20,y:10};
  const saved=session.snapshot(),restored=JourneySession.restore(json(saved));
  assert.equal(restored.current.state,'paused');assert.equal(restored.current.selection.active,false);assert.deepEqual(restored.current.selection.path,[]);
  assert.equal(restored.current.nudge.targetId,-1);assert.deepEqual(restored.current.nudge.aim,{x:0,y:0});
  const elapsed=restored.current.elapsed;restored.update(100);assert.equal(restored.current.elapsed,elapsed);
  assert.equal(session.current.selection.active,true,'taking a snapshot must not interrupt live input');
});
test('all fifteen encounter snapshots retain completion idempotence, offers and next encounter state',()=>{
  const session=new JourneySession(511);
  for(let i=0;i<15;i++){
    let restored=paired(session);finish(session);finish(restored);assert.deepEqual(restored.snapshot(),session.snapshot());
    restored=paired(session);const score=restored.current.score;restored.observeCompletion();restored.update(0);assert.equal(restored.current.score,score);
    if(i<14){session.chooseEvolution('continue');restored.chooseEvolution('continue');assert.deepEqual(restored.snapshot(),session.snapshot());}
    else{assert.equal(restored.finished,true);assert.equal(restored.chooseEvolution('continue'),false);}
  }
});
test('restoring a failed encounter retains its independent retry RNG and discards failed-attempt rewards',()=>{
  const session=advanceTo(2);session.current.chooseGrowthRole('feeder');session.begin();
  const before=session.snapshot();for(let i=0;i<60;i++)session.update(1/60);
  session.current.biomass=29;session.current.score+=1234;session.current.state='loss';
  const restored=paired(session);session.retry();restored.retry();assert.deepEqual(restored.snapshot(),session.snapshot());
  assert.equal(restored.current.growthRoles[1],'feeder');assert.equal(restored.current.score,before.encounter.run.score);
  assert.equal(restored.current.biomass,before.encounter.run.biomass);assert.equal(restored.retries,1);
});
test('active waves, events and all three bosses continue deterministically across a JSON save',()=>{
  for(const stage of [2,3,5,7,9,11]){
    const session=advanceTo(stage);session.begin();for(let i=0;i<60;i++)session.update(1/60);
    if([3,7,11].includes(stage)){const boss=session.current.boss();assert.ok(boss instanceof JourneyBoss);boss.patternTime=9;boss.roundIndex=1;boss.resetRemaining=1.3;}
    advanceBoth(session,paired(session),2);
  }
});
test('amoeba captivity, rescue animation and phage infection resume with their runtime relationships',()=>{
  const session=advanceTo(5);session.begin();const run=session.current;run.enemies=[];
  const amoeba=new Amoeba(++run.nextEnemyId,run.board.anchors[8]);amoeba.phase='digesting';amoeba.captiveNode=0;amoeba.targetNode=0;amoeba.siteNodes=[1,9,10];amoeba.digestionAge=4;
  run.cells[0].captor=amoeba.id;run.enemies.push(amoeba);
  const bacterium=new Bacterium(++run.nextEnemyId,{x:720,y:600},1);bacterium.age=4;bacterium.infectionAge=2;bacterium.storedFood=2;run.enemies.push(bacterium);
  const phage=run.phages.add(run,{...bacterium.nucleus})!;phage.hostId=bacterium.id;phage.age=5;
  const restored=paired(session);advanceBoth(session,restored,1);
  run.amoebas.rescue(run,amoeba);const other=restored.current.enemies.find(b=>b.id===amoeba.id) as Amoeba;restored.current.amoebas.rescue(restored.current,other);
  const again=paired(restored);advanceBoth(restored,again,1);
});
test('malformed full saves and unsupported versions fail before simulation receives unsafe state',()=>{
  const session=new JourneySession(73);session.begin();const snapshot=session.snapshot();
  const mutations:((x:any)=>void)[]=[
    x=>{x.index=99;},x=>{x.rng.state='-1';},x=>{x.rng.increment='2';},x=>{x.checkpoint.colony='invalid';},x=>{x.checkpoint.colony.lost[0]=true;},
    x=>{x.encounter.run.stageElapsed=Infinity;},x=>{x.encounter.cells.pop();},x=>{x.encounter.cells[0].captor=999;},
    x=>{x.encounter.water.velocity[0]=NaN;},x=>{x.encounter.run.maxIntegrity=7;},x=>{x.route[0].food++;},
    x=>{x.encounter.enemies.push(json(x.encounter.enemies[0]));},x=>{x.encounter.mother.lost[0]=true;},
    x=>{x.encounter.lesson.nodes=[99];},x=>{x.offers=['unknown'];},x=>{x.finished=true;},
  ];
  for(const change of mutations){const copy=json(snapshot);change(copy);assert.throws(()=>JourneySession.restore(copy));}
  const newer=json(snapshot) as any;newer.version=JOURNEY_SAVE_VERSION+1;assert.throws(()=>JourneySession.restore(newer),UnsupportedSaveVersionError);
});
test('random state preserves non-default stream sequences and rejects invalid uint64 encodings',()=>{
  const rng=new SeededRandom(90,71n);for(let i=0;i<37;i++)rng.uint32();const restored=SeededRandom.restore(json(rng.saveState()));
  for(let i=0;i<100;i++)assert.equal(restored.uint32(),rng.uint32());
  for(const state of ['-1','00','1e3','18446744073709551616'])assert.throws(()=>SeededRandom.restore({state,increment:'3'}));
});

test('capture and final completion may save phages awaiting orphan cleanup',()=>{
  for(const final of [false,true]){
    const session=advanceTo(final?11:5);session.begin();const run=session.current;
    run.enemies=[];run.phages.clusters=[];
    const center=SMALL_LESSON.reduce((sum,id)=>({x:sum.x+run.board.anchors[id].x/3,y:sum.y+run.board.anchors[id].y/3}),{x:0,y:0});
    const host=new Bacterium(++run.nextEnemyId,center,0);host.age=4;host.infectionAge=2;run.enemies.push(host);
    const cluster=run.phages.add(run,center)!;cluster.hostId=host.id;
    if(final){run.bossDefeated=true;run.harvest.checkCompletion(run);session.observeCompletion();}
    else{const result=run.capture(SMALL_LESSON);assert.equal(result.valid,true);assert.ok(!run.enemies.includes(host));}
    assert.equal(run.phages.clusters.length,1);const restored=paired(session);
    if(!final){session.update(1/60);restored.update(1/60);assert.deepEqual(restored.snapshot(),session.snapshot());assert.equal(restored.current.phages.clusters.length,0);}
  }
});
