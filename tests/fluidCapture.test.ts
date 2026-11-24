import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Board} from '../src/geometry/board';
import {Cell} from '../src/geometry/cell';
import {InputController} from '../src/geometry/inputController';
import {FluidField,COUNT,MAX_SPEED,OFFSET_RANGE} from '../src/engine/fluidField';
import {commitJourney,targets,CapturePlan,Target} from '../src/geometry/loopResolver';
import {penalty,edgeTint} from '../src/geometry/loopStrain';
import {recovery,damage,maximum} from '../src/evolution/captureRules';
import type {Point} from '../src/geometry/loopGeometry';
const p=(x:number,y:number)=>({x,y});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const field=(seed=73)=>{const f=new FluidField();f.reset(p(640,450),392,seed);return f;};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('seeded currents, local coherence and directional momentum',()=>{
  const a=field(),b=field(),c=field(74);assert.deepEqual(a.velocity,b.velocity);assert.notDeepEqual(a.velocity,c.velocity);
  assert.ok(dist(a.sample(p(810,270)),a.sample(p(814,270)))<1.5);
  a.stroke(p(730,235),p(880,235));assert.ok(a.sample(p(810,235)).x>b.sample(p(810,235)).x+4);
  for(let i=0;i<180;i++){a.step(1/60);b.step(1/60);}
  let diff=0;for(let i=0;i<COUNT;i++)diff+=Math.hypot(a.velocity[2*i]-b.velocity[2*i],a.velocity[2*i+1]-b.velocity[2*i+1]);
  assert.ok(diff>5);assert.ok(dist(a.displacement(p(810,235)),b.displacement(p(810,235)))>2);
});
test('fixed timestep, bounded water and normalized texture channels',()=>{
  const slow=field(),fast=field();for(let i=0;i<90;i++)slow.step(1/30);for(let i=0;i<432;i++)fast.step(1/144);
  assert.deepEqual(slow.velocity,fast.velocity);assert.deepEqual(slow.transport,fast.transport);
  for(let i=0;i<COUNT;i++){const k=i*2,v=Math.hypot(slow.velocity[k],slow.velocity[k+1]),t=Math.hypot(slow.transport[k],slow.transport[k+1]);assert.ok(Number.isFinite(v)&&v<=MAX_SPEED+0.001);assert.ok(Number.isFinite(t)&&t<OFFSET_RANGE);if(!slow.wet[i]){assert.equal(v,0);assert.equal(t,0);}}
  assert.deepEqual(slow.sample(p(2000,2000)),p(0,0));const tex=slow.flowTextureData();assert.equal(tex.length,COUNT*4);assert.ok(tex.every(v=>v>=0&&v<=1));
});
test('snapshot roundtrip, rejected corruption and restart',()=>{
  const a=field();a.stroke(p(730,235),p(880,235));a.step(3);const saved=a.snapshot();const b=field(125);
  assert.equal(b.restore(JSON.parse(JSON.stringify(saved))),true);a.step(0.2);b.step(0.2);
  assert.deepEqual(b.snapshot(),a.snapshot());const before=b.snapshot();assert.equal(b.restore({...before,velocity:[1]}),false);assert.equal(b.restore({...before,clock:NaN}),false);assert.deepEqual(b.snapshot(),before);
  b.reset(p(640,450),392,73);assert.equal(b.clock,0);assert.ok(b.transport.every(v=>v===0));
});
test('water influences board drift without moving held cells',()=>{
  const board=new Board(),dry=new Board(),f=field();const held=[0,8,9],before=board.anchors.slice();
  for(let i=0;i<120;i++){board.stepMotion(1/60,held,f);dry.stepMotion(1/60,held);f.step(1/60);}
  for(const id of held)assert.deepEqual(board.anchors[id],before[id]);assert.ok(board.anchors.some((a,i)=>dist(a,dry.anchors[i])>0.01));
  assert.ok(board.velocities.every(v=>Math.hypot(v.x,v.y)<=12.001));assert.deepEqual(board.validateBoard(),[]);
});
test('link strain and original mutation recovery, damage and limits',()=>{
  const anchors=[p(0,0),p(220,0),p(220,220)];close(penalty([0,1],anchors),0.38);close(penalty([0,1,2],anchors,false),0.76);assert.ok(penalty([0,1,2],anchors)>0.76);close(penalty([0,1],[p(0,0),p(3000,0)]),2.4);assert.equal(edgeTint(p(0,0),p(130,0)),0);
  close(recovery(['fission'],3),2);close(recovery(['elastic','enzyme','filter','feast'],6),7);assert.equal(damage(['enzyme'],6),2);assert.equal(damage(['enzyme'],5),1);assert.equal(maximum(['elastic']),10);
});
test('capture preview and commit share nucleus rules and stale input protection',()=>{
  const board=new Board(),cells=board.anchors.map(()=>new Cell()),path=[0,8,9],poly=path.map(id=>board.anchors[id]);
  const at=p(poly.reduce((s,v)=>s+v.x,0)/3,poly.reduce((s,v)=>s+v.y,0)/3),outside=board.center;
  const snapshot:Target[]=[{id:1,position:at,health:1},{id:2,position:at,nuclei:[at,outside],health:1},{id:3,position:at,nuclei:[at,at],health:2},{id:4,position:at,health:0},{id:5,position:at,health:1,eligible:false}];
  const isReady=(id:number)=>cells[id].isReady();let calls=0;
  const run={state:'active',board,cells,mutations:['fission'],maxVertices:8,isReady,targetSnapshot:()=>snapshot,commitHarvest:(plan:CapturePlan)=>{calls++;assert.deepEqual(plan.ids,[1,3]);assert.ok(plan.nodes.every(id=>!isReady(id)));return {valid:true as const,ids:plan.ids,points:0,recovery:plan.recovery};}};
  assert.deepEqual(targets(path,board,isReady,snapshot),[1,3]);
  const input=new InputController(board,isReady);input.start(board.anchors[0]);for(const id of [8,9,0])input.visit(id);assert.equal(input.closed,true);
  const result=commitJourney(input.release(),run);assert.equal(result.valid,true);assert.equal(calls,1);assert.ok(path.every(id=>cells[id].remaining===2+penalty(path,board.anchors)));assert.equal(cells[1].remaining,0);
  assert.equal(commitJourney(path,run).valid,false);assert.equal(calls,1);
  cells.forEach(c=>c.step(10));run.state='paused';assert.equal(commitJourney(path,run).valid,false);assert.ok(cells.every(c=>c.isReady()));
});
