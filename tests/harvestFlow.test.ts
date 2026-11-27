import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {add,scale} from '../src/ecology/drifter';
import {sampleHarvestFlow,streamPosition} from '../src/rendering/harvestFlow';

test('nutrient streams preserve a lethal poison capture and reduce to a static Mother ring',()=>{
  const run=new EncounterSimulation({stage:0,mode:'feed',food:99,target:99,duration:300},{integrity:1});run.begin();
  const path=[0,8,9],at=scale(path.reduce((sum,id)=>add(sum,run.board.anchors[id]),{x:0,y:0}),1/path.length);
  for(const [i,kind] of ['food','cyst'].entries())run.addBody(new HarvestOrganism(i+1,kind,at,{x:0,y:0},0));
  const result=run.capture(path);assert.equal(result.valid,true);assert.equal(run.state,'loss');assert.equal(run.clots.length,1);
  assert.equal(sampleHarvestFlow(run.clots,run.board.center)[0].fade,0);
  run.step(run.clots[0].duration*0.5);
  const flow=sampleHarvestFlow(run.clots,run.board.center)[0];
  assert.equal(flow.color,'#e9a1c3');assert.equal(flow.fade,1);assert.equal(flow.particles.length,5);
  assert.deepEqual(flow.strands[0][0],run.clots[0].center);
  for(const points of flow.strands)assert.ok(Math.hypot(points[23].x-run.board.center.x,points[23].y-run.board.center.y)<1e-8);
  const still=sampleHarvestFlow(run.clots,run.board.center,true)[0];
  assert.equal(still.fade,flow.fade);assert.equal(still.color,flow.color);assert.deepEqual(still.strands,[]);assert.deepEqual(still.particles,[]);
  run.step(100);assert.deepEqual(sampleHarvestFlow(run.clots,run.board.center),[]);
});
test('stream geometry stays finite at coincident endpoints',()=>{
  assert.deepEqual(streamPosition({x:4,y:5},{x:4,y:5},3,1,0.5),{x:4,y:5});
});
