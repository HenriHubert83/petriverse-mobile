import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Drifter} from '../src/ecology/drifter';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {PhageCluster} from '../src/ecology/phageCluster';
import {CystNudge,NudgeContext} from '../src/ecology/cystNudge';
import {arrivalProgress} from '../src/ecology/organismArrival';
import {FoodWeb,FoodWebContext} from '../src/ecology/foodWeb';
const p=(x:number,y:number)=>({x,y});
const center=p(640,450);
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8);
function nudgeRun():NudgeContext {
  return {journey:true,state:'active',enemies:[],phages:{clusters:[]},
    selection:{active:false,cancel(){this.active=false;}},
    board:{center,dishRadius:392,hitTest:()=>-1},
    isReady:()=>true,boss:()=>undefined,lessonActive:()=>false};
}
function foodRun():FoodWebContext{return {stageIndex:2,enemies:[],board:{center,dishRadius:392}};}
function organism(id:number,kind:string,x:number,y:number):HarvestOrganism{
  const b=new HarvestOrganism(id,kind,p(x,y),p(0,0),0);b.age=3;return b;
}
test('arrival progress is age-based, including original ID-dependent duration',()=>{
  const body=new Drifter(4,p(800,300),0);body.age=1.28;near(arrivalProgress(body),0.5);
  body.age=10;assert.equal(arrivalProgress(body),1);
});
test('nudge gives ready cells priority and ignores immature or attached targets',()=>{
  const run=nudgeRun(),n=new CystNudge(),c=organism(1,'cyst',800,300);
  run.enemies=[c];c.age=0;assert.equal(n.pick(run,c.nucleus),undefined);c.age=3;
  run.board.hitTest=()=>0;assert.equal(n.pick(run,c.nucleus),undefined);
  run.board.hitTest=()=>-1;assert.equal(n.pick(run,c.nucleus),c);
  run.selection.active=true;assert.equal(n.pick(run,c.nucleus),undefined);run.selection.active=false;
  const phage=new PhageCluster(2,p(900,300));phage.age=3;run.phages.clusters=[phage];
  assert.equal(n.pick(run,phage.nucleus),phage);phage.hostId=99;assert.equal(n.pick(run,phage.nucleus),undefined);
});
test('nudge clamps range, enforces cooldown and cancels short or paused gestures',()=>{
  const run=nudgeRun(),n=new CystNudge(),c=organism(1,'cyst',800,300);run.enemies=[c];
  assert.equal(n.begin(run,c.nucleus),true);assert.equal(n.release(run,p(805,300)),undefined);assert.equal(n.cooldown,0);
  assert.equal(n.begin(run,c.nucleus),true);const result=n.release(run,p(1000,300))!;
  near(result.to.x,860);near(c.nudgeVector.x,60);assert.equal(n.cooldown,6);
  assert.equal(n.begin(run,c.nucleus),false);n.step(6,run);assert.equal(n.begin(run,c.nucleus),true);
  run.state='paused';assert.equal(n.release(run,p(850,300)),undefined);
});
test('nudge keeps the future drift envelope inside the dish',()=>{
  const run=nudgeRun(),n=new CystNudge(),c=organism(1,'cyst',1000,450);c.drift=p(5,0);run.enemies=[c];
  assert.equal(n.begin(run,c.nucleus),true);assert.equal(n.release(run,p(1060,450)),undefined);
  assert.equal(n.cooldown,0);assert.equal(n.begin(run,c.nucleus),true);
  const result=n.release(run,p(940,450))!;near(result.to.x,940);
});
test('hunter selects a nearby prey and eats it after six seconds, not earlier',()=>{
  const run=foodRun(),web=new FoodWeb(),h=new Drifter(1,p(800,300),0),food=organism(2,'food',810,300);
  h.age=3;run.enemies=[h,food];web.step(run,2);
  assert.equal(h.huntTarget,food.id);near(web.eatingProgress(run,food.id),1/3);assert.deepEqual(web.huntDestination(run,h),food.nucleus);
  web.step(run,3.9);assert.ok(run.enemies.includes(food));web.step(run,0.11);
  assert.ok(!run.enemies.includes(food));assert.equal(h.carriedFood,1);assert.equal(h.fedRemaining,8);assert.equal(web.eatenFood,1);
  assert.equal(h.foragingDone,true);assert.deepEqual(web.huntDestination(run,h),center);
});
test('food web respects protected prey, spore priority and early encounter gating',()=>{
  const run=foodRun(),web=new FoodWeb(),h=new Drifter(1,p(800,300),0);
  const food=organism(2,'food',810,300),spore=organism(3,'spore',830,300);
  h.age=3;spore.gateIds=[9];run.enemies=[h,food,spore];run.stageIndex=1;web.step(run,1);assert.equal(h.huntTarget,-1);
  run.stageIndex=2;web.step(run,0);assert.equal(h.huntTarget,food.id);
  h.huntTarget=-1;spore.gateIds=[];web.step(run,0);assert.equal(h.huntTarget,spore.id);
});
test('lost prey ends foraging; capture disturbance produces a bounded five-pixel lure',()=>{
  const run=foodRun(),web=new FoodWeb(),h=new Drifter(1,p(800,300),0),food=organism(2,'food',810,300);
  h.age=3;run.enemies=[h,food];web.step(run,0);run.enemies=[h];web.step(run,1);
  assert.equal(h.huntTarget,-1);assert.equal(h.foragingDone,true);
  run.enemies=[food];web.disturbSurvivors(run,p(800,300));near(food.lureVector.x,5);food.step(0.7,center);near(food.nucleus.x,815);
});
