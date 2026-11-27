import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Cell} from '../src/geometry/cell';
import {Clot} from '../src/geometry/clot';
import {WaterInteraction} from '../src/rendering/waterInteraction';
import {WaterTracers} from '../src/rendering/waterTracers';
const p=(x:number,y:number)=>({x,y});
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const mother=p(640,450),polygon=[p(625,325),p(594,212),p(767,255)];
function recovery(restoredNode=-1){
  const cells=Array.from({length:3},()=>new Cell());cells.forEach(c=>c.spend(3));
  if(restoredNode>=0)cells[restoredNode].remaining=0;
  const clot=new Clot(1,{nodes:[0,1,2],polygon,positions:[p(650,260)],food:1,restoredNode},cells,mother);
  return {clot,cells};
}
test('digestion contracts and returns cells exactly at readiness',()=>{
  const {clot,cells}=recovery();assert.deepEqual(clot.cellPositions(),polygon);assert.equal(clot.amount(),0);
  cells.forEach(c=>c.step(1.2));assert.equal(clot.amount(),1);assert.ok(clot.digestion()>0.9);
  assert.ok(clot.cellPositions().every(v=>dist(v,clot.center)<5));assert.deepEqual(clot.preyPosition(0),clot.center);
  assert.deepEqual(clot.cellPositions(true),polygon);assert.deepEqual(clot.preyPosition(0,true),p(650,260));
  cells.forEach(c=>c.step(1.8));assert.equal(clot.finished(),true);assert.equal(clot.amount(),0);assert.deepEqual(clot.cellPositions(),polygon);
});
test('frenzy excludes restored cell and Mother clearance remains bounded',()=>{
  const {clot,cells}=recovery(0);assert.deepEqual(clot.nodes,[1,2]);assert.deepEqual(clot.polygon,polygon.slice(1));assert.equal(cells[0].isReady(),true);assert.equal(clot.finished(),false);
  const near=new Clot(2,{nodes:[1,2],polygon:polygon.slice(1),positions:[mother]},cells,mother);
  assert.ok(Math.abs(dist(near.center,mother)-112)<1e-9);
});
test('visual wakes use six slots and expire on the presentation clock',()=>{
  const w=new WaterInteraction();w.stroke(p(0,0),p(3,0),0);assert.equal(w.wakes.length,0);
  for(let i=0;i<8;i++)w.stroke(p(i,0),p(i+20,0),1);
  const first=w.sample(1,false);assert.equal(first.strokes.length,6);assert.ok(first.strengths.every(v=>v>1.4));
  const later=w.sample(2,false);assert.ok(later.strengths.every(v=>v<first.strengths[0]));
  assert.deepEqual(w.sample(2,false).strengths,later.strengths);assert.ok(w.sample(4.3,false).strengths.every(v=>v===0));
  w.stroke(p(0,0),p(20,0),5);assert.ok(w.sample(5,true).strengths.every(v=>v===0));
});
test('visual displacement is directional and bounded',()=>{
  const w=new WaterInteraction();w.stroke(p(0,0),p(100,0),0);const s=w.sample(0,false);
  const at=p(50,5),v=WaterInteraction.displacement(at,[],s.strokes,s.strengths);assert.ok(v.x>0&&v.y>0);
  const large=WaterInteraction.displacement(at,[{x:20,y:5,radial:1e4,curl:1e4}],s.strokes,s.strengths);assert.ok(Math.hypot(large.x,large.y)<=28.000001);
});
test('tracer transport, seed repeatability and original quality counts',()=>{
  const flow={center:mother,sample:()=>p(4,1)},look={key:'test',dustSeed:73};
  const a=new WaterTracers(),b=new WaterTracers();a.sync(0,1,flow,look,2);b.sync(0,1,flow,look,2);assert.deepEqual(a.motes,b.motes);
  const initial=a.motes.map(m=>({...m.at}));for(let frame=1;frame<=120;frame++)a.sync(frame/60,1,flow,look,2);
  assert.equal(a.motes.length,960);assert.ok(a.motes.reduce((sum,m,i)=>sum+dist(m.at,initial[i]),0)/960>4);
  assert.ok(a.motes.every(m=>m.size>=0.32&&m.size<=0.70&&dist(m.at,mother)>=67.999&&dist(m.at,mother)<=368.001));
  assert.equal(a.instanceData().length,960*9);a.sync(2,1,flow,look,1);assert.equal(a.instanceData().length,560*9);a.sync(2,1,flow,look,0);assert.equal(a.instanceData().length,240*9);
});
test('pause and reduced motion do not accumulate tracer catch-up',()=>{
  const flow={center:mother,sample:()=>p(4,1)},look={key:'test',dustSeed:73},a=new WaterTracers();a.sync(0,1,flow,look,2);a.sync(0.1,1,flow,look,2);
  const frozen=structuredClone(a.motes);a.sync(0.1,1,flow,look,2);assert.deepEqual(a.motes,frozen);
  a.sync(9,0,flow,look,0);assert.equal(a.instanceData().length,0);a.sync(9,1,flow,look,0);assert.deepEqual(a.motes,frozen);
  a.sync(9.01,1,flow,look,0);assert.ok(a.motes.every((m,i)=>dist(m.at,frozen[i].at)<1));
});
