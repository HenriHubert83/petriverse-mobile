import test from 'node:test';
import assert from 'node:assert/strict';
import {TitlePond} from '../src/mobile/titlePond';
import {JourneySession} from '../src/campaign/journeySession';
import {createJourneyProfile} from '../src/storage/journeyProfile';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';

test('title microscope moves without touching an existing journey or profile',()=>{
  const journey=new JourneySession(91),profile=createJourneyProfile();
  const saved=JSON.stringify(journey.snapshot()),savedProfile=JSON.stringify(profile);
  const pond=new TitlePond(),other=new TitlePond(),run=pond.run;
  const positions=run.enemies.map(body=>({...body.nucleus})),anchors=run.board.anchors.map(at=>({...at})),rng=run.rng.saveState();
  for(let i=0;i<90;i++)pond.advance(1/30);
  assert.notDeepEqual(run.enemies.map(body=>body.nucleus),positions);assert.notDeepEqual(run.board.anchors,anchors);
  assert.ok(run.fluid.revision>0);assert.ok(run.elapsed>0);assert.deepEqual(run.rng.saveState(),rng);
  assert.equal(JSON.stringify(journey.snapshot()),saved);assert.equal(JSON.stringify(profile),savedProfile);
  assert.equal(other.run.elapsed,0);assert.deepEqual(other.run.enemies.map(body=>body.nucleus),positions);
});

test('title specimens remain visible and harmless beyond gameplay lifetime and deadline',()=>{
  const pond=new TitlePond(),run=pond.run,ids=run.enemies.map(body=>body.id);
  for(let i=0;i<1900;i++)pond.advance(.1);
  assert.ok(run.elapsed>run.harvest.spec.duration);
  assert.deepEqual(run.enemies.map(body=>body.id),ids);
  for(const body of run.enemies){
    assert.ok(body instanceof HarvestOrganism);assert.equal(body.opacity(),1);
    const distance=Math.hypot(body.nucleus.x-run.board.center.x,body.nucleus.y-run.board.center.y);
    assert.ok(distance>run.board.motherRadius+40&&distance<run.board.dishRadius-25);
    assert.ok(Number.isFinite(body.nucleus.x)&&Number.isFinite(body.nucleus.y));
  }
  assert.equal(run.state,'active');assert.equal(run.integrity,run.maxIntegrity);assert.equal(run.stageElapsed,0);
  assert.equal(run.score,0);assert.equal(run.totalFood,0);assert.equal(run.totalRescued,0);assert.equal(run.captureSerial,0);
  assert.equal(run.harvest.blooms,0);assert.equal(run.harvest.threatsSpawned,0);
  assert.deepEqual(run.seenSpecies,[]);assert.deepEqual(run.rescuedSpecimens,[]);assert.deepEqual(run.masteryAwards,[]);
  assert.ok(run.cells.every((_,id)=>run.isReady(id)));assert.equal(run.lessonActive(),false);
  assert.equal(run.contentEnabled,false);assert.equal(run.creatureContentEnabled,false);assert.equal(run.habitatContentEnabled,false);
});

test('reduced motion freezes the title scene and a delayed frame cannot catch up wall time',()=>{
  const pond=new TitlePond(),run=pond.run;
  pond.advance(.1);const before=JSON.stringify({elapsed:run.elapsed,anchors:run.board.anchors,bodies:run.enemies,fluid:run.fluid.snapshot()});
  pond.advance(1000,{reducedMotion:true,visualQuality:0});
  assert.equal(JSON.stringify({elapsed:run.elapsed,anchors:run.board.anchors,bodies:run.enemies,fluid:run.fluid.snapshot()}),before);
  assert.equal(pond.tracers.visible,false);assert.equal(pond.tracers.visibleCount,240);
  const elapsed=run.elapsed;pond.advance(1000);assert.ok(run.elapsed-elapsed<=.065001);assert.equal(pond.tracers.visible,true);
  assert.throws(()=>pond.advance(-1),RangeError);assert.throws(()=>pond.advance(NaN),RangeError);
});
