import test from 'node:test';
import assert from 'node:assert/strict';
import {Amoeba} from '../src/ecology/amoeba';
import {Bacterium} from '../src/ecology/bacterium';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {amoebaOutline} from '../src/rendering/amoebaOutline';
import {AmoebaVisualState,PhageVisualState,phageDriftOffset,samplePhageSwarm} from '../src/rendering/specializedVisuals';

test('amoeba outline thresholds original alpha and encodes a signed two-pass distance field',()=>{
  const size=12,pixels=new Uint8Array(size*size*4);
  for(let y=3;y<9;y++)for(let x=3;x<9;x++)pixels[(y*size+x)*4+3]=255;
  pixels[(1*size+1)*4+3]=114; // Below the source 0.45 threshold.
  const first=amoebaOutline(pixels,size,size,size),second=amoebaOutline(pixels,size,size,size);
  assert.deepEqual(first,second);const at=(x:number,y:number)=>(first[(y*size+x)*4]-.5)*2;
  assert.ok(at(6,6)<0);assert.ok(at(1,1)>0);assert.ok(at(0,0)>at(2,2));
  assert.ok(Math.abs(at(3,6)+.5/size)<1e-6);assert.ok(Math.abs(at(2,6)-.5/size)<1e-6);
  for(let i=3;i<first.length;i+=4)assert.equal(first[i],1);
});

test('amoeba ingestion visual follows actual captive state without moving the capture nucleus',()=>{
  const body=new Amoeba(9,{x:500,y:400}),visual=new AmoebaVisualState();body.phase='reaching';body.reachPoint={x:580,y:400};body.ingestAxis={x:1,y:0};body.reachAge=2.8;
  const before=JSON.stringify(body),reach=visual.sample(body,4,1);assert.equal(JSON.stringify(body),before);
  assert.equal(reach.extension,1);assert.deepEqual(reach.goal,{x:80,y:0});assert.equal(reach.captiveVisible,false);
  body.phase='digesting';body.captiveNode=3;body.victimHome={x:580,y:400};body.digestionAge=0;
  const beginning=visual.sample(body,4.1,1);assert.equal(beginning.captiveWidth,63);assert.equal(beginning.closure,0);assert.deepEqual(beginning.captivePosition,body.victimHome);
  body.digestionAge=1.1;const inside=visual.sample(body,5.2,1);assert.equal(inside.ingestion,1);assert.equal(inside.closure,1);assert.equal(inside.captiveWidth,43);assert.ok(inside.goal.x<30);
  body.digestionAge=15;const digested=visual.sample(body,19,1);assert.equal(digested.captiveOpacity,0);assert.ok(digested.captiveDissolve>.9);assert.ok(digested.captiveWidth<20);
  const reduced=visual.sample(body,20,0);assert.equal(reduced.extension,0);assert.deepEqual(reduced.captivePosition,{x:522,y:400});assert.equal(reduced.captiveAngle,0);
  assert.deepEqual(body.nucleus,{x:500,y:400});
});

test('amoeba heading crosses the angle boundary smoothly and pose sampling is deterministic',()=>{
  const body=new Amoeba(3,{x:0,y:0}),one=new AmoebaVisualState(),two=new AmoebaVisualState();body.heading={x:-1,y:.01};
  const initial=one.sample(body,1,1);two.sample(body,1,1);body.heading={x:-1,y:-.01};const next=one.sample(body,1.1,1);
  assert.ok(Math.abs(next.rotation-initial.rotation)<.02);assert.deepEqual(next,two.sample(body,1.1,1));
});

test('phages dock three distinct baseplates, contract sheaths, assemble capsids and release offspring',()=>{
  const run=new EncounterSimulation({stage:2,mode:'feed',food:99,target:99,duration:999}),body=run.addBody(new Bacterium(1,{x:700,y:400}));
  body.heading={x:1,y:0};const group=run.phages.add(run,{x:700,y:330})!;group.age=4;
  const free=samplePhageSwarm(run,4,1);assert.equal(free.virions.length,3);assert.equal(free.capsids.length,0);
  group.hostId=body.id;group.attachedFrom={...group.nucleus};body.infectionAge=6;
  const infected=samplePhageSwarm(run,10,1);assert.equal(infected.virions.length,3);assert.equal(infected.capsids.length,17);
  assert.ok(infected.virions.every(v=>v.contraction===1));assert.ok(infected.capsids.every(c=>c.growth>0&&c.fade===1));
  assert.ok(Math.abs(infected.virions[0].at.x-679)<1e-6);assert.ok(Math.abs(infected.virions[0].at.y-387.3)<1e-6);
  assert.ok(Math.abs(infected.virions[1].at.y-413.7)<1e-6);assert.deepEqual(infected,samplePhageSwarm(run,10,1));
  const before=JSON.stringify(run.phages.snapshot());samplePhageSwarm(run,11,0);assert.equal(JSON.stringify(run.phages.snapshot()),before);
  run.phages.clusters=[];run.phages.rupture(run,body);run.phages.aftermath(.9);
  const burst=samplePhageSwarm(run,12,1);assert.equal(burst.virions.length,6);assert.equal(burst.fragments.length,14);assert.equal(burst.ripples.length,1);assert.ok(burst.virions.every(v=>v.height===9));
  const still=samplePhageSwarm(run,12,0);assert.equal(still.ripples.length,0);assert.notDeepEqual(still.virions[0].at,burst.virions[0].at);
  assert.deepEqual(phageDriftOffset(1,0),phageDriftOffset(1,0));
});


test('articulated virion phases persist when earlier clusters disappear',()=>{
  const run=new EncounterSimulation({stage:2,mode:'feed',food:99,target:99,duration:999}),visual=new PhageVisualState();
  run.phages.add(run,{x:700,y:330});const second=run.phages.add(run,{x:800,y:330})!;
  const first=visual.sample(run,2,1),phase=first.virions.find(v=>v.key===`${second.id}:0`)!.phase;
  assert.equal(phase,3*1.71);run.phages.clusters=[second];
  assert.equal(visual.sample(run,3,1).virions[0].phase,phase);
});
