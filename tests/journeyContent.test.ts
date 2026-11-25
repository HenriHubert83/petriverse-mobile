import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SeededRandom} from '../src/engine/seededRandom';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {authoredStage,capacityForStage,DISHES} from '../src/campaign/journeyPlan';
import {makeRoute} from '../src/campaign/journeyRoute';
import {SMALL_LESSON,WIDE_LESSON} from '../src/campaign/journeyLesson';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {EcologyEnemy} from '../src/ecology/ecologyEnemy';
import {Bacterium} from '../src/ecology/bacterium';
import {JourneyBoss} from '../src/campaign/journeyBoss';
const populated=(stage:number)=>{const run=new EncounterSimulation(authoredStage(stage),{seed:73,content:true});run.begin();return run;};

test('PCG32 matches independently compiled original C++ output for seed 73',()=>{
  const expected=[2549279984,1263507064,68637017,3728329839,1811868029,1759594931,2508999900,3404371629,383769128,2080217228];
  const rng=new SeededRandom(73);assert.deepEqual(expected.map(()=>rng.uint32()),expected);
  const copy=rng.clone();for(let i=0;i<50;i++)assert.equal(copy.float(-8,6),rng.float(-8,6));
  const a=new SeededRandom(19),b=a.clone();assert.equal(a.int(8,8),8);assert.equal(a.uint32(),b.uint32());
  for(let i=0;i<100;i++){assert.ok([3,4,5].includes(a.int(5,3)));const f=a.float();assert.ok(f>=0&&f<=1);}
  assert.throws(()=>a.pick([]),RangeError);assert.throws(()=>a.int(0,2**33),RangeError);
});
test('authored twelve stages become a reproducible fifteen-encounter route with three bosses',()=>{
  const a=makeRoute(73),b=makeRoute(73);assert.deepEqual(a,b);assert.notDeepEqual(makeRoute(74),a);
  assert.equal(a.length,15);assert.equal(a.filter(s=>s.generated).length,3);
  assert.deepEqual(a.filter(s=>s.mode==='boss').map(s=>s.name),['The Bellwether','The Glass Regent','The Conjoined']);
  assert.deepEqual(a.filter(s=>!s.generated).map(s=>s.stage),Array.from({length:12},(_,i)=>i));
  assert.equal(a[3].name,'Small allies');assert.equal(a[3].phageLesson,true);assert.equal(a[3].food,20);
  assert.deepEqual(DISHES.map(d=>d.name),['Stillwater','Glassgarden','Blue Deep']);
  assert.deepEqual([0,2,4,8,10].map(capacityForStage),[3,4,5,6,7]);
  assert.throws(()=>authoredStage(12),RangeError);
});
test('the guided opening survives idle time and completes through both real captures and recovery',()=>{
  const run=populated(0);assert.equal(run.enemies.length,3);assert.ok(run.enemies.every(b=>b.kind==='food'));
  run.step(180);run.step(180);assert.equal(run.state,'active');assert.equal(run.stageElapsed,0);assert.equal(run.enemies.length,3);
  const small=run.capture(SMALL_LESSON);assert.equal(small.valid,true);if(!small.valid)return;
  assert.equal(small.rawFood,3);assert.equal(run.lesson.stepIndex,1);assert.equal(run.state,'active');
  run.step(7);assert.equal(run.lesson.stepIndex,2);assert.equal(run.enemies.length,6);
  const wide=run.capture(WIDE_LESSON);assert.equal(wide.valid,true);if(!wide.valid)return;
  assert.equal(wide.rawFood,6);assert.equal(run.lesson.stepIndex,3);assert.equal(run.state,'active');
  run.step(7);assert.equal(run.lessonActive(),false);assert.equal(run.state,'complete');assert.equal(run.harvest.nourishment,9);
});
test('starting blooms, rescue pearls and each boss populate from authored modes',()=>{
  const rescue=populated(1);assert.equal(rescue.enemies.filter(b=>b.kind==='food').length,10);assert.equal(rescue.enemies.filter(b=>b.kind==='cyst').length,4);
  assert.equal(rescue.enemies.filter(b=>b.kind==='spore').length,1);
  for(const [stage,kind] of [[3,'bellwether'],[7,'regent'],[11,'conjoined']] as const){
    const run=populated(stage),boss=run.boss();assert.ok(boss instanceof JourneyBoss);assert.equal(boss.kind,kind);
    assert.equal(run.enemies.filter(b=>b.kind==='food').length,5);assert.equal(boss.gateIds.length,stage===7?2:0);
  }
  const nursery=populated(2);assert.ok(nursery.enemies.some(b=>b.kind==='bell_bud'&&b.health===1&&!b.isBoss()));
});
test('arrivals are warned eight seconds ahead and a later wave introduces a hunter',()=>{
  const run=populated(1),ecology=run.harvest.ecology;
  run.stageElapsed=12;ecology.stepExistingBodies(run,0);
  assert.equal(ecology.warningSites(run).length,1);assert.equal(ecology.warningSites(run)[0].remaining,8);
  assert.equal(run.enemies.some(b=>b.kind==='grazer'),false);
  run.stageElapsed=19.99;ecology.stepExistingBodies(run,0);assert.equal(run.enemies.some(b=>b.kind==='grazer'),false);
  run.stageElapsed=20;ecology.stepExistingBodies(run,0);assert.ok(run.enemies.some(b=>b.kind==='grazer'));assert.equal(run.harvest.blooms,3);
  run.stageElapsed=60;ecology.stepExistingBodies(run,0);assert.ok(ecology.pending.some(e=>e.kind==='hunter'&&e.at===72));
  run.stageElapsed=72;ecology.stepExistingBodies(run,0);assert.ok(run.enemies.some(b=>b.kind==='drifter'));
});
test('depleted food refills early, expires normally, and never spawns past the last refill window',()=>{
  const run=populated(1);run.enemies=[];run.stageElapsed=18;run.harvest.stepContent(run,0);
  assert.equal(run.enemies.filter(b=>b.kind==='food').length,5);
  for(const body of run.enemies)body.age=100;
  run.stageElapsed=run.harvest.spec.duration-17;run.harvest.nextBloom=run.stageElapsed;
  run.harvest.ecology.nextWave=Infinity;run.harvest.ecology.pending=[];
  const blooms=run.harvest.blooms;run.harvest.stepContent(run,0);assert.equal(run.harvest.blooms,blooms);assert.equal(run.enemies.length,0);
});
test('Small allies starts a paired bacterium and suppresses its first hunter',()=>{
  const spec=makeRoute(73)[3],run=new EncounterSimulation(spec,{seed:73,content:true});run.begin();
  const bacterium=run.enemies.find(b=>b.kind==='bacterium');assert.ok(bacterium instanceof Bacterium);assert.ok(run.phages.clusters.length>0);
  run.stageElapsed=12;run.harvest.ecology.stepExistingBodies(run,0);assert.equal(run.harvest.ecology.pending.some(e=>e.kind==='hunter'),false);
});
test('a grazed meal is stored, and an ignored divider produces two daughters',()=>{
  const run=new EncounterSimulation(authoredStage(5));run.begin();const at={x:840,y:450};
  const grazer=new EcologyEnemy(1,'grazer',at);grazer.spawning=0;run.addBody(grazer);
  run.addBody(new HarvestOrganism(2,'food',at,{x:0,y:0},0));run.harvest.ecology.stepExistingBodies(run,4);
  assert.equal(grazer.storedFood,1);assert.equal(run.enemies.some(b=>b.id===2),false);
  const divider=new EcologyEnemy(3,'divider',{x:950,y:450});divider.age=25;divider.spawning=0;run.addBody(divider);
  run.harvest.ecology.stepExistingBodies(run,0);const young=run.enemies.filter(b=>b.kind==='divider');
  assert.equal(young.length,2);assert.ok(young.every(b=>b instanceof EcologyEnemy&&b.daughter&&b.speed===7));
});
test('a protected open cradle hatches two rescueable spores after twelve seconds',()=>{
  const run=populated(6),holder=run.enemies.find(b=>b.cradle);assert.ok(holder instanceof HarvestOrganism);
  run.enemies=run.enemies.filter(b=>!holder.gateIds.includes(b.id));run.harvest.ecology.resolveGates(run);assert.equal(holder.cradleOpenAge,0);
  holder.age=11.99;run.harvest.ecology.stepExistingBodies(run,0);assert.ok(run.enemies.includes(holder));
  holder.age=12;run.harvest.ecology.stepExistingBodies(run,0);assert.equal(run.enemies.includes(holder),false);
  assert.equal(run.enemies.filter(b=>b.story==='hatchling'&&b.kind==='spore').length,2);
});
test('authored migration and hatching events happen once and keep their warning windows',()=>{
  const run=populated(5),events=run.harvest.events,initial=run.enemies.length;
  run.stageElapsed=38;events.step(run,0);assert.equal(events.sample(run)?.age,-8);assert.equal(events.born,false);
  run.stageElapsed=46;events.step(run,0);assert.equal(run.enemies.length,initial+6);events.step(run,0);assert.equal(run.enemies.length,initial+6);
  run.stageElapsed=60;events.step(run,0);assert.ok(events.wakeWarned);assert.equal(events.woken,false);
  run.stageElapsed=68;events.step(run,0);assert.ok(events.woken);assert.equal(run.enemies.length,initial+9);events.step(run,0);assert.equal(run.enemies.length,initial+9);
  const nursery=populated(2);nursery.stageElapsed=46;nursery.harvest.events.step(nursery,1);
  assert.equal(nursery.harvest.events.food.length,6);assert.ok(nursery.harvest.ecology.pending.some(e=>e.kind==='grazer'&&e.at===54));
});
test('the deep traveller separates food and poison without changing health or capture rules',()=>{
  const run=populated(9);run.enemies=[];run.stageElapsed=56;const p=run.harvest.events.position(run);
  const food=run.addBody(new HarvestOrganism(1000,'food',p,{x:0,y:0},0)),cyst=run.addBody(new HarvestOrganism(1001,'cyst',p,{x:0,y:0},0));
  run.harvest.events.step(run,1);assert.ok(food.origin.y<p.y);assert.ok(cyst.origin.y>p.y);assert.equal(run.integrity,3);
});
