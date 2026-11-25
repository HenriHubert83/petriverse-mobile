import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Drifter} from '../src/ecology/drifter';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
const p=(x:number,y:number)=>({x,y});
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const center=p(0,0);
test('armored drifters require two pulses and respect gate eligibility',()=>{
  const d=new Drifter(1,p(100,0),10,'shellback');assert.equal(d.health,2);assert.equal(d.pointValue(),200);
  d.gateIds=[9];assert.equal(d.canTakePulse(),false);d.gateIds=[];assert.equal(d.canTakePulse(),true);
  assert.equal(d.applyPulse(1),false);assert.equal(d.stunned,1.1);assert.equal(d.hitFlash,0.8);
  d.step(1,center);near(d.nucleus.x,100);d.step(0.2,center);near(d.nucleus.x,99);
  assert.equal(d.applyPulse(1),true);assert.equal(d.canTakePulse(),false);
});
test('twinspores retain two moving nuclei around their logical center',()=>{
  const d=new Drifter(7,p(90,40),0,'twinspore');const before=d.nuclei();assert.equal(d.bodyCount(),2);assert.equal(d.pointValue(),250);
  near((before[0].x+before[1].x)/2,90);near((before[0].y+before[1].y)/2,40);
  d.step(2,center);const after=d.nuclei();assert.notDeepEqual(after,before);near((after[0].x+after[1].x)/2,90);near((after[0].y+after[1].y)/2,40);
});
test('movement follows original slow, feeding and stun timing',()=>{
  const d=new Drifter(1,p(100,0),10);d.slowed=0.5;d.step(1,center);near(d.nucleus.x,92);
  d.fedRemaining=0.2;d.step(1,center);near(d.nucleus.x,88.5);assert.equal(d.fedRemaining,0);
  d.stunned=2;d.step(1,center);near(d.nucleus.x,88.5);assert.equal(d.stunned,1);
  d.step(2,center);near(d.nucleus.x,78.5);
});
test('lure moves a stationary organism smoothly without overshoot',()=>{
  const d=new Drifter(1,p(100,0),0);d.pullToward(center,20);d.step(0.35,center);near(d.nucleus.x,90);
  d.step(0.35,center);near(d.nucleus.x,80);d.step(2,center);near(d.nucleus.x,80);
});
test('plankton drifts from its authored origin and retains advected displacement',()=>{
  const h=new HarvestOrganism(1,'food',p(100,200),p(4,7),0.2);assert.deepEqual(h.positionAt(0,center),p(100,200));
  h.step(2,center);const before=h.nucleus;assert.notDeepEqual(before,p(100,200));
  h.advect(p(3,-2));near(h.nucleus.x,before.x+3);near(h.origin.x,103);near(h.origin.y,198);
  h.step(0,center);near(h.nucleus.x,before.x+3);near(h.nucleus.y,before.y-2);
});
test('nudge and lure offsets persist after their original easing durations',()=>{
  const h=new HarvestOrganism(2,'cyst',p(100,0),p(0,0),0);h.startNudge(p(20,-10));h.step(0.625,center);
  near(h.origin.x,117.5);near(h.origin.y,-8.75);assert.ok(h.nudgeRoll()<0);h.step(0.625,center);near(h.origin.x,120);near(h.origin.y,-10);
  h.pullToward(p(100,-10),10);h.step(0.7,center);near(h.origin.x,110);near(h.origin.y,-10);h.step(2,center);near(h.nucleus.x,110);
});
test('bloom lifetime, cradle gates, opening and fade match source constants',()=>{
  const h=new HarvestOrganism(3,'spore',p(0,0),p(0,0),0);assert.equal(h.lifetime(),27);h.age=25.5;near(h.opacity(),0.5);
  h.story='hatchling';assert.equal(h.lifetime(),40);h.visitor=true;assert.equal(h.lifetime(),72);h.cradle=true;h.cradleOpenAge=100;assert.equal(h.lifetime(),116);
  h.age=104;assert.equal(h.hatchRemaining(),8);h.gateIds=[1];assert.equal(h.hatchRemaining(),-1);h.gateIds=[];h.age=112;assert.equal(h.hatchRemaining(),0);
  h.age=4;near(h.opening(),1);h.age=17;near(h.opening(),0);
});
