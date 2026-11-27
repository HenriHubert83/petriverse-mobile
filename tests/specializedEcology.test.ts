import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Amoeba} from '../src/ecology/amoeba';
import {AmoebaSystem,AmoebaContext} from '../src/ecology/amoebaSystem';
import {Bacterium} from '../src/ecology/bacterium';
import {Conjoined} from '../src/ecology/conjoined';
import {Drifter} from '../src/ecology/drifter';
import {EcologyEnemy} from '../src/ecology/ecologyEnemy';
import {PhageSystem,PhageContext} from '../src/ecology/phageSystem';
import {Cell} from '../src/geometry/cell';
import {captureValid} from '../src/geometry/loopGeometry';
const p=(x:number,y:number)=>({x,y});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const center=p(640,450);
// Controlled fixture with an outside rescue triangle and nine ready cells.
function colony():AmoebaContext & {selection:{path:number[];maxVertices:number}}{
  const anchors=[p(625,325),p(594,212),p(767,255),p(718,363),p(772,445),p(731,529),p(637,580),p(553,530),p(512,452),p(552,365),p(886,415),p(396,462)];
  const cells=anchors.map(()=>new Cell());
  return {enemies:[],cells,board:{anchors,triangles:[[0,1,2],[3,4,10],[7,8,9]],center,motherRadius:40},selection:{path:[],maxVertices:8},isReady:id=>Boolean(cells[id]?.isReady()),harvest:{ecology:{announce:()=>{}}}};
}
function reach(run:ReturnType<typeof colony>,sys:AmoebaSystem):Amoeba{
  const a=new Amoeba(1,p(670,265));run.enemies.push(a);a.age=4;sys.chooseTarget(run,a);assert.equal(a.phase,'approaching');
  a.nucleus={...a.destination};sys.step(run,0);assert.equal(a.phase,'reaching');return a;
}
function phageRun():PhageContext{
  return {enemies:[],nextEnemyId:100,kills:0,board:{center,dishRadius:392,anchors:[]},fluid:{sample:()=>p(0,0),sources:[]},harvest:{defended:0,ecology:{announce:()=>{}}},discover:()=>{}};
}
test('behavioral enemies preserve emergence, divider pace and latch restrictions',()=>{
  const divider=new EcologyEnemy(1,'divider',p(100,0));divider.step(2,p(0,0));close(divider.nucleus.x,100);
  divider.step(1,p(0,0));close(divider.nucleus.x,97.25);close(divider.splitRemaining(),17);
  const warden=new EcologyEnemy(2,'warden',p(100,0));warden.destination=p(0,0);warden.step(10,p(0,0));close(warden.nucleus.x,100);
  const parasite=new EcologyEnemy(3,'parasite',p(100,0));parasite.latched=true;parasite.destination=p(0,0);parasite.step(10,p(0,0));close(parasite.nucleus.x,100);
});
test('amoeba crawl integrates its original cycle across frame subdivisions',()=>{
  const period=2*Math.PI/0.85,a=new Amoeba(1,p(0,0)),b=new Amoeba(1,p(0,0));a.destination=b.destination=p(1000,0);
  a.step(period,center);for(let i=0;i<120;i++)b.step(period/120,center);
  close(a.nucleus.x,6*period);close(a.nucleus.x,b.nucleus.x);
});
test('amoeba rescue site excludes victim and Mother; selected or recovering cell protected',()=>{
  for(const selected of [true,false]){
    const run=colony(),sys=new AmoebaSystem(),a=reach(run,sys),victim=a.targetNode;
    assert.ok(!a.siteNodes.includes(victim));assert.ok(captureValid(a.siteNodes,run.board,run.isReady));
    if(selected)run.selection.path.push(victim);else run.cells[victim].spend(3);
    sys.step(run,3);assert.equal(a.captiveNode,-1);assert.equal(a.phase,'seeking');
  }
});
test('capture, fifteen-second deadline, rescue and cell recovery',()=>{
  const run=colony(),sys=new AmoebaSystem(),a=reach(run,sys),victim=a.targetNode;
  sys.step(run,2.7);assert.equal(a.captiveNode,-1);sys.step(run,0.11);assert.equal(a.captiveNode,victim);
  assert.equal(a.rescueRemaining(),15);assert.equal(run.cells[victim].captor,a.id);assert.equal(run.isReady(victim),false);
  assert.deepEqual(a.captivePosition(),run.board.anchors[victim]);sys.step(run,14.9);close(a.rescueRemaining(),0.1);
  assert.equal(sys.rescue(run,a),true);assert.equal(sys.rescue(run,a),false);assert.equal(run.cells[victim].captor,-1);
  const r=sys.returnFor(victim)!;assert.deepEqual(sys.returnPosition(r,true),r.home);
  sys.stepReturns(1.25);run.cells[victim].step(1.25);assert.equal(run.isReady(victim),true);assert.equal(sys.releases.length,0);
});
test('expired amoeba rescue loses a cell and four missing cells block another target',()=>{
  const run=colony(),sys=new AmoebaSystem(),a=reach(run,sys),victim=a.targetNode;
  sys.step(run,2.8);sys.step(run,15);assert.equal(run.cells[victim].lost,true);assert.equal(run.cells[victim].captor,-1);assert.equal(a.phase,'sated');
  for(const c of run.cells.filter(c=>!c.lost).slice(0,3))c.lost=true;
  const other=new Amoeba(2,p(670,265));run.enemies.push(other);sys.chooseTarget(run,other);assert.equal(other.targetNode,-1);
});
test('phage clusters cap at two and ignore nonbacterial hosts',()=>{
  const run=phageRun(),sys=new PhageSystem(),at=p(800,300),a=sys.add(run,at)!;
  assert.ok(sys.add(run,p(900,300)));assert.equal(sys.add(run,at),undefined);
  const amoeba=new Amoeba(1,at);amoeba.age=5;run.enemies.push(amoeba);
  a.age=3;sys.step(run,0);assert.equal(a.hostId,-1);assert.equal(sys.nearestHost(run,at),undefined);
  const b=new Bacterium(2,at);b.age=2;run.enemies.push(b);assert.equal(sys.nearestHost(run,at),undefined);
  b.age=3;assert.equal(sys.nearestHost(run,at),b);
});
test('one phage infection ruptures at nine seconds and returns stolen food as organisms',()=>{
  const run=phageRun(),sys=new PhageSystem(),at=p(800,300),b=new Bacterium(1,at);b.age=3;b.storedFood=2;run.enemies.push(b);
  const g=sys.add(run,at)!;g.age=3;sys.step(run,0);assert.equal(g.hostId,b.id);assert.equal(b.infectionAge,0);assert.equal(sys.learned,true);
  b.step(8.9,center);sys.step(run,8.9);assert.ok(run.enemies.includes(b));assert.equal(run.kills,0);
  b.step(0.11,center);sys.step(run,0.11);assert.ok(!run.enemies.includes(b));assert.equal(sys.clusters.length,0);
  assert.equal(run.enemies.length,2);assert.ok(run.enemies.every(e=>e.kind==='food'&&e.story==='phage_salvage'));
  assert.equal(run.harvest.defended,1);assert.equal(run.kills,1);assert.equal(sys.bursts.length,1);
  sys.aftermath(0.5);sys.waterSources(run);assert.ok(run.fluid.sources[0].radial>0);sys.aftermath(3);assert.equal(sys.bursts.length,0);
});
test('phage snapshot roundtrip and direct capture do not produce duplicate rupture',()=>{
  const run=phageRun(),sys=new PhageSystem(),at=p(800,300),b=new Bacterium(1,at);b.age=3;run.enemies.push(b);
  const g=sys.add(run,at)!;g.age=3;sys.step(run,0);g.startNudge(p(1,2));
  const restored=new PhageSystem();restored.restore(JSON.parse(JSON.stringify(sys.snapshot())));assert.deepEqual(restored.snapshot(),sys.snapshot());
  run.enemies=[];restored.step(run,1);assert.equal(restored.clusters.length,0);assert.equal(restored.bursts.length,0);assert.equal(run.kills,0);
});
test('legacy Conjoined uses three authored routes and one pulse per cycle',()=>{
  const restAnchors=Array.from({length:24},(_,i)=>p(640+200*Math.cos(i*0.3),450+200*Math.sin(i*0.3)));
  const b=new Conjoined(1,{restAnchors});assert.equal(b.health,3);assert.equal(b.attackDue(),true);assert.equal(b.attackDue(),false);
  b.step(5,center);close(b.contraction(),1);const [a,c]=b.nuclei();close(Math.hypot(a.x-c.x,a.y-c.y),54);
  assert.equal(b.applyPulse(10),false);assert.equal(b.health,2);assert.equal(b.applyPulse(1),false);assert.equal(b.health,2);
  b.step(8,center);assert.equal(b.attackDue(),true);assert.equal(b.canTakePulse(),true);b.applyPulse(1);b.step(13,center);assert.equal(b.applyPulse(1),true);assert.equal(b.health,0);
});
