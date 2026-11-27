import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import type {EncounterOptions} from '../src/engine/encounterSimulation';
import type {EncounterSpec,HarvestResult} from '../src/campaign/journeyHarvest';
import {MotherDamage,DAMAGE_DURATION} from '../src/engine/motherDamage';
import {JourneyBoss} from '../src/campaign/journeyBoss';
import {Drifter,add,sub,scale,unit} from '../src/ecology/drifter';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {EcologyEnemy} from '../src/ecology/ecologyEnemy';
import {Amoeba} from '../src/ecology/amoeba';
import {Bacterium} from '../src/ecology/bacterium';
import {PhageCluster} from '../src/ecology/phageCluster';
import type {Point} from '../src/geometry/loopGeometry';

const NARROW=[0,8,9],WIDE=[0,1,2,10,9,8],TEN=[0,8,16,17,18,19,11,3,2,1];
const p=(x:number,y:number):Point=>({x,y});
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function run(spec:Partial<EncounterSpec>={},options:EncounterOptions={}):EncounterSimulation{
  const r=new EncounterSimulation({stage:0,mode:'feed',food:999,target:999,duration:300,...spec},options);r.begin();return r;
}
function center(r:EncounterSimulation,path:readonly number[]=NARROW):Point{
  return scale(path.reduce((sum,id)=>add(sum,r.board.anchors[id]),p(0,0)),1/path.length);
}
function meal(r:EncounterSimulation,kinds:readonly string[],path:readonly number[]=NARROW):Drifter[]{
  const at=center(r,path);
  return kinds.map(kind=>{
    const id=++r.nextEnemyId,body=['food','cyst','spore'].includes(kind)?new HarvestOrganism(id,kind,at,p(0,0),0):new Drifter(id,at,0,kind);
    return r.addBody(body);
  });
}
function select(r:EncounterSimulation,path:readonly number[]=NARROW):void{
  r.selection.start(r.board.anchors[path[0]]);
  for(const id of [...path.slice(1),path[0]])r.selection.visit(id);
  assert.equal(r.selection.closed,true,r.selection.rejectionReason);
}
function capture(r:EncounterSimulation,path:readonly number[]=NARROW):HarvestResult&{strain:number}{
  select(r,path);const result=r.release();assert.equal(result.valid,true);
  if(!result.valid)throw new Error('Capture unexpectedly invalid');return result;
}
function settle(r:EncounterSimulation):void{for(let i=0;i<360;i++)r.step(1/60);}

test('Mother damage claims nearest intact cores, copies geometry and retains wounds after aftermath',()=>{
  const damage=new MotherDamage(),origin={...p(52,-34)},nuclei=[{...origin}];
  damage.record(1,origin,p(0,0),'shellback',nuclei,2,'amber_nautilus');
  assert.equal(damage.bites[0].core,1);origin.x=999;nuclei[0].y=999;
  assert.deepEqual(damage.bites[0].origin,p(52,-34));assert.deepEqual(damage.bites[0].nuclei,[p(52,-34)]);
  damage.step(0.25);assert.equal(damage.coreProgress(1),0);assert.ok(damage.recoil()>0);
  damage.step(0.5);assert.ok(damage.coreProgress(1)>0&&damage.coreProgress(1)<1);
  damage.record(2,p(52,-34),p(0,0));assert.notEqual(damage.bites[1].core,1);
  damage.step(DAMAGE_DURATION);assert.equal(damage.active(),false);
  assert.equal([...damage.progressValues()].filter(v=>v===1).length,2);
});

test('Mother capacity changes, direct starting health and healing stay consistent',()=>{
  const r=run({}, {maxIntegrity:7,integrity:3});
  assert.deepEqual(r.motherDamage.activeIndices(),[0,2,4,1,3,5,6]);assert.equal(r.motherDamage.lost.filter(Boolean).length,4);
  r.motherDamage.record(1,p(640,500),r.board.center);r.integrity--;r.heal(2);
  assert.equal(r.integrity,4);assert.equal(r.motherDamage.lost.filter(Boolean).length,3);
  r.heal(20);assert.equal(r.integrity,7);assert.equal(r.motherDamage.active(),false);
  r.motherDamage.setCapacity(3);assert.deepEqual(r.motherDamage.activeIndices(),[0,2,4]);
  r.motherDamage.resetFromIntegrity(2);assert.equal(r.motherDamage.lost.filter(Boolean).length,1);
});

test('simultaneous contacts all resolve even beyond remaining health and final injury finishes after loss',()=>{
  const r=run({}, {integrity:1}),at=add(r.board.center,p(0,-r.board.motherRadius));
  for(const id of [9,3,6])r.addBody(new Drifter(id,at,0));
  select(r);r.resolveContacts();
  assert.equal(r.integrity,0);assert.equal(r.state,'loss');assert.deepEqual(r.lastContacts,[3,6,9]);
  assert.equal(r.enemies.length,0);assert.equal(r.resolvedContacts,3);assert.equal(r.motherDamage.bites.length,1);
  assert.equal(r.motherDamage.bites[0].enemyId,3);assert.equal(r.selection.active,false);
  const elapsed=r.elapsed,anchors=r.board.anchors.map(p=>({...p}));r.step(3);
  assert.equal(r.motherDamage.active(),false);assert.equal(r.elapsed,elapsed);assert.deepEqual(r.board.anchors,anchors);
  assert.equal(r.harvest.lossTitle,'The mother was eaten.');
});

test('guards intercept contacts once, harmless species do not bite and pause freezes active effects',()=>{
  const r=run({}, {maxIntegrity:4,growthRoles:{1:'guard'}}),at=add(r.board.center,p(0,-30));
  r.addBody(new Drifter(1,at,0));r.resolveContacts();assert.equal(r.integrity,4);assert.equal(r.guardianSpent,1);assert.equal(r.motherDamage.active(),false);
  r.addBody(new Drifter(2,at,0));r.resolveContacts();assert.equal(r.integrity,3);assert.equal(r.motherDamage.bites.length,1);
  r.addBody(new EcologyEnemy(3,'grazer',at));r.resolveContacts();assert.equal(r.integrity,3);assert.equal(r.enemies.length,1);
  r.cells[0].spend(3);r.nudge.cooldown=4;r.togglePause();
  const before={elapsed:r.elapsed,water:r.fluid.snapshot(),anchors:r.board.anchors.map(p=>({...p})),bites:structuredClone(r.motherDamage.bites)};
  r.step(2);assert.equal(r.state,'paused');assert.equal(r.cells[0].remaining,3);assert.equal(r.nudge.cooldown,4);
  assert.equal(r.elapsed,before.elapsed);assert.deepEqual(r.fluid.snapshot(),before.water);assert.deepEqual(r.board.anchors,before.anchors);assert.deepEqual(r.motherDamage.bites,before.bites);
  r.togglePause();r.step(0.2);near(r.cells[0].remaining,2.8);near(r.motherDamage.bites[0].age,0.2);
});

test('real input capture agrees with preview and preserves small versus wide mutation tradeoffs',()=>{
  const cases=[
    {mutations:['fission','elastic'],path:NARROW,kinds:['food','food','food'],food:4,poison:0,bonuses:{fission:1}},
    {mutations:['fission','elastic'],path:WIDE,kinds:['food','food','food'],food:6,poison:0,bonuses:{elastic:3}},
    {mutations:['elastic'],path:TEN,kinds:['food','food','food'],food:6,poison:0,bonuses:{elastic:3}},
    {mutations:['fission'],path:NARROW,kinds:['food','cyst'],food:1,poison:1,bonuses:{}},
    {mutations:['filter','catalyst','grazer','fission'],path:NARROW,kinds:['food','cyst'],food:5,poison:0,bonuses:{fission:1,grazer:1,catalyst:2}},
    {mutations:['feast','elastic'],path:WIDE,kinds:['food','food','food','food','cyst'],food:10,poison:1,bonuses:{elastic:4,feast:2}},
    {mutations:['symbiosis'],path:NARROW,kinds:['drifter'],food:2,poison:0,bonuses:{symbiosis:2}},
    {mutations:['fission','elastic','feast','grazer','catalyst'],path:NARROW,kinds:[],food:0,poison:0,bonuses:{}},
  ];
  for(const c of cases){
    const r=run({}, {mutations:c.mutations});meal(r,c.kinds,c.path);select(r,c.path);
    const preview=r.harvestPreview(),result=r.release();assert.equal(result.valid,true);
    if(!result.valid)continue;
    assert.equal(result.food,c.food);assert.equal(result.poison,c.poison);assert.deepEqual(result.foodBonuses,c.bonuses);
    for(const key of Object.keys(preview) as (keyof typeof preview)[])assert.deepEqual(result[key],preview[key]);
    assert.equal(r.harvest.nourishment,c.food);assert.equal(r.totalFood,c.food);assert.equal(r.integrity,3-c.poison);
    assert.equal(r.motherDamage.bites.length,c.poison);assert.equal(r.loopsDrawn,1);
    assert.ok(c.path.every(n=>!r.isReady(n)));assert.equal(r.clots.length,1);
    const score=r.score;assert.equal(r.capture(c.path).valid,false);assert.equal(r.score,score);
  }
});

test('purification requires cysts alone; filtering and poisoned food retain exact costs',()=>{
  const pure=run({mode:'purify'}, {mutations:['catalyst','filter']});meal(pure,['cyst','cyst']);
  const a=capture(pure);assert.equal(a.purified,2);assert.equal(a.filtered,0);assert.equal(a.food,0);assert.equal(a.poison,0);assert.equal(a.points,60);
  const mixed=run({mode:'purify'}, {mutations:['filter']});meal(mixed,['food','cyst','cyst']);
  const b=capture(mixed);assert.equal(b.purified,0);assert.equal(b.filtered,1);assert.equal(b.food,1);assert.equal(b.poison,1);
  const lethal=run({food:1}, {integrity:1,mutations:['nursery']});meal(lethal,['food','cyst']);
  capture(lethal);assert.equal(lethal.harvest.nourishment,1);assert.equal(lethal.state,'loss');assert.equal(lethal.integrity,0);
  assert.equal(lethal.harvest.lossTitle,'The mother was poisoned.');assert.equal(lethal.motherDamage.bites[0].kind,'cyst');
  assert.equal(lethal.capture(NARROW).valid,false);
});

test('shell armor requires a second capture; a wide enzyme pulse resolves it in one',()=>{
  const r=run(),[shell]=meal(r,['shellback']);
  const first=capture(r);assert.equal(first.threats,0);assert.equal(first.armorHits,1);assert.equal(first.bodies,0);assert.equal(shell.health,1);assert.equal(r.harvest.flow,0);
  settle(r);shell.nucleus=center(r);const second=capture(r);assert.equal(second.threats,1);assert.equal(second.armorHits,0);assert.equal(r.enemies.length,0);
  const strong=run({}, {mutations:['enzyme']});meal(strong,['shellback'],WIDE);
  const single=capture(strong,WIDE);assert.equal(single.threats,1);assert.equal(single.armorHits,0);near(single.recovery-single.strain,4.2);
});

test('salvage, protected-life mastery and specimen identity are committed before bodies disappear',()=>{
  const r=run({stage:2},{seed:73,encounterIndex:5}),at=center(r);
  const grazer=r.addBody(new EcologyEnemy(1,'grazer',at));grazer.storedFood=3;grazer.carriedFood=2;
  const [spore,hunter]=meal(r,['spore','drifter']);spore.form='glasswing_spore';spore.story='expedition';hunter.carriedFood=1;
  const result=capture(r);assert.equal(result.salvage,6);assert.equal(result.threats,2);assert.equal(result.rescued,1);assert.deepEqual(result.mastery,['guardian']);
  assert.equal(r.biomass,7);assert.equal(r.harvest.nourishment,6);assert.equal(r.totalFood,6);assert.equal(r.score,result.points+150);
  assert.deepEqual(r.rescuedSpecimens,[{token:`73:2:${spore.id}`,form:'glasswing_spore',stage:2,encounter:6,rare:true,story:'expedition'}]);
  settle(r);meal(r,['spore','drifter']);assert.deepEqual(capture(r).mastery,[]);
});

test('gatherer mastery is once per encounter and capped bank storage does not reduce progress',()=>{
  const r=run({stage:1},{biomass:29});const bodies=meal(r,['food','food','food','food']);
  bodies.forEach((b,i)=>b.bloomId=i<2?1:2);
  const result=capture(r);assert.deepEqual(result.mastery,['gatherer']);assert.equal(r.biomass,30);assert.equal(r.masteryAwards[0].food,0);assert.equal(r.harvest.nourishment,4);
  assert.equal(r.score,result.points+150);r.biomass=35;r.bankFood(4);assert.equal(r.biomass,35);
});

test('frenzy releases the starting cell, residuals slow a crossing hunter and lure moves surviving food',()=>{
  const r=run({}, {mutations:['frenzy','residual','lure']});meal(r,['food','food','food']);
  const edge=scale(add(r.board.anchors[8],r.board.anchors[9]),0.5),outward=unit(sub(edge,r.board.center));
  const origin=add(edge,scale(outward,30)),extra=r.addBody(new HarvestOrganism(++r.nextEnemyId,'food',origin,p(0,0),0));
  const result=capture(r);assert.equal(result.restoredNode,0);assert.equal(r.isReady(0),true);assert.ok(!r.clots[0].nodes.includes(0));
  assert.equal(r.residuals[0].remaining,4);assert.ok(Math.hypot(extra.lureVector.x,extra.lureVector.y)>21);
  const hunter=r.addBody(new Drifter(++r.nextEnemyId,add(edge,scale(outward,2)),10));
  r.step(0.4);assert.ok(hunter.slowed>0);r.step(0.3);assert.ok(Math.hypot(extra.origin.x-origin.x,extra.origin.y-origin.y)>20);
});

test('nursery healing uses twelve clean raw food; feeder bonuses stop when their organelle is lost',()=>{
  const r=run({}, {maxIntegrity:4,integrity:3,mutations:['nursery'],growthRoles:{1:'feeder'}});
  for(let i=0;i<3;i++){
    meal(r,['food','food','food','food']);const result=capture(r);assert.equal(result.foodBonuses.feeder,1);if(i<2)settle(r);
  }
  assert.equal(r.integrity,4);assert.equal(r.harvest.cleanFood,0);assert.equal(r.motherDamage.lost.filter(Boolean).length,0);
  const dead=run({}, {maxIntegrity:4,integrity:0,growthRoles:{1:'feeder'}});meal(dead,['food','food','food','food']);
  assert.equal(dead.harvest.outcome(dead.enemies.map(b=>b.id),dead,3).foodBonuses.feeder,undefined);
});

test('flow rewards only clean meaningful captures, caps its bonus and expires after three seconds',()=>{
  const r=run();
  for(let i=0;i<8;i++){
    // Separate ready triangles allow fast successive captures without bypassing cell spending.
    const path=[i,8+i,8+(i+1)%8];meal(r,['food'],path);
    const result=capture(r,path);assert.equal(result.flow,i+1);assert.equal(result.flowBonus,Math.min(i,5)*40);
    // This fixture isolates timing; advancing recovery would move it outside the combo window.
    r.cells.forEach(c=>c.step(10));
  }
  assert.equal(r.harvest.bestFlow,8);r.stageElapsed=3.01;meal(r,['food']);assert.equal(capture(r).flow,1);
  r.cells.forEach(c=>c.step(10));assert.equal(capture(r).flow,0);
  r.cells.forEach(c=>c.step(10));meal(r,['food','cyst']);assert.equal(capture(r).flowBonus,0);
});

test('food web feeds a hunter and a later real capture recovers its meal',()=>{
  const r=run({stage:2}),at=center(r),hunter=r.addBody(new Drifter(1,at,0));hunter.age=3;
  const food=r.addBody(new HarvestOrganism(2,'food',add(at,p(5,0)),p(0,0),0));food.age=3;
  for(let i=0;i<361;i++)r.step(1/60);
  assert.equal(r.enemies.includes(food),false);assert.equal(hunter.carriedFood,1);assert.equal(r.harvest.ecology.foodWeb.eatenFood,1);
  hunter.nucleus=center(r);const result=capture(r);assert.equal(result.salvage,1);assert.equal(result.food,1);assert.equal(result.threats,1);
});

test('capturing an amoeba returns the actual captive cell and counts one rescue',()=>{
  const r=run({stage:2}),body=r.addBody(new Amoeba(1,center(r)));
  body.phase='digesting';body.captiveNode=3;body.targetNode=3;body.siteNodes=[...NARROW];body.victimHome={...r.board.anchors[3]};r.cells[3].captor=1;
  const result=capture(r);assert.equal(result.cellsRescued,1);assert.equal(result.threats,1);assert.equal(r.cells[3].captor,-1);
  near(r.cells[3].remaining,1.25);assert.equal(r.amoebas.releases.length,1);
  r.togglePause();r.step(2);near(r.cells[3].remaining,1.25);r.togglePause();r.step(1.25);
  assert.equal(r.cells[3].isReady(),true);assert.equal(r.amoebas.releases.length,0);
});

test('integrated phage infection removes a bacterium once and leaves its salvage capturable',()=>{
  const r=run({stage:2}),at=center(r),body=r.addBody(new Bacterium(1,at));
  body.age=3;body.spawning=0;body.storedFood=2;
  const group=new PhageCluster(2,at);group.age=3;r.phages.clusters=[group];r.nextEnemyId=2;
  r.step(0);assert.equal(group.hostId,1);
  for(let i=0;i<541;i++)r.step(1/60);
  assert.equal(r.enemies.includes(body),false);assert.equal(r.harvest.defended,1);assert.equal(r.kills,1);
  assert.equal(r.phages.clusters.length,0);assert.equal(r.enemies.filter(b=>b.story==='phage_salvage').length,2);
  for(const food of r.enemies){food.nucleus=center(r);if(food instanceof HarvestOrganism)food.origin=center(r);}
  const result=capture(r);assert.equal(result.rawFood,2);assert.equal(result.threats,0);assert.equal(r.harvest.defended,1);assert.equal(r.kills,3);
});

test('all journey boss variants keep their opening, reforming and multi-nucleus geometry rules',()=>{
  const r=run({stage:3,mode:'boss'}),bell=new JourneyBoss(1,r.board,0);
  assert.equal(bell.canTakePulse(),false);bell.step(8,r.board.center);assert.equal(bell.canTakePulse(),true);assert.equal(bell.secondsUntilClose(),16);
  assert.equal(bell.applyPulse(99),false);assert.equal(bell.health,2);assert.equal(bell.canTakePulse(),false);
  bell.step(4,r.board.center);assert.equal(bell.patternTime,0);assert.equal(bell.canTakePulse(),false);bell.step(8,r.board.center);assert.equal(bell.canTakePulse(),true);
  const regent=new JourneyBoss(2,r.board,1);assert.equal(regent.canTakePulse(),false);regent.openRemaining=14;
  regent.step(13.99,r.board.center);assert.equal(regent.canTakePulse(),true);regent.step(0.02,r.board.center);assert.equal(regent.canTakePulse(),false);
  const hearts=new JourneyBoss(3,r.board,2);assert.equal(hearts.nuclei().length,2);assert.equal(hearts.canTakePulse(),true);
  near(Math.hypot(hearts.nuclei()[0].x-hearts.nuclei()[1].x,hearts.nuclei()[0].y-hearts.nuclei()[1].y),156);
  hearts.step(6,r.board.center);near(Math.hypot(hearts.nuclei()[0].x-hearts.nuclei()[1].x,hearts.nuclei()[0].y-hearts.nuclei()[1].y),54);
  hearts.juvenile=true;assert.equal(hearts.isBoss(),false);
});

test('boss capture spends preexisting charge, strips only one layer and spawns young hearts',()=>{
  const r=run({stage:11,mode:'boss'}),boss=r.addBody(new JourneyBoss(1,r.board,2)),path=[0,8,9,1];
  boss.patternTime=6;meal(r,['food','food','food'],path);
  const uncharged=capture(r,path);assert.equal(uncharged.bossLayers,0);assert.equal(r.harvest.nourishment,3);assert.equal(boss.health,3);
  settle(r);boss.nucleus=center(r,path);boss.patternTime=6;
  const hit=capture(r,path);assert.equal(hit.bossLayers,1);assert.equal(boss.health,2);assert.equal(r.harvest.nourishment,0);assert.equal(hit.points,300);
  const young=r.enemies.find(b=>b.kind==='twinspore')!;assert.ok(young);assert.equal(young.stunned,3);assert.equal(young.foragingDone,true);
  assert.equal(r.harvest.bossHits,1);assert.equal(r.state,'active');
  // Killing the last layer completes the encounter only after a new charged capture.
  settle(r);r.harvest.nourishment=6;boss.health=1;boss.nucleus=center(r,path);boss.patternTime=6;
  const final=capture(r,path);assert.equal(final.bossLayers,1);assert.equal(r.bossDefeated,true);assert.equal(r.state,'complete');
});

test('Regent shields open a timed opportunity and regrow after an incomplete pair',()=>{
  const r=run({stage:7,mode:'boss'}),boss=r.addBody(new JourneyBoss(1,r.board,1));r.harvest.ecology.spawnGates(r,boss);
  const initial=[...boss.gateIds];assert.equal(initial.length,2);
  const guard=r.enemies.find(b=>b.id===initial[0])!;guard.nucleus=center(r);capture(r);
  assert.equal(boss.gateIds.length,1);assert.equal(boss.shieldRemaining,18);assert.equal(boss.canTakePulse(),false);
  for(let i=0;i<1081;i++)r.step(1/60);
  assert.equal(boss.gateIds.length,2);assert.ok(boss.gateIds.every(id=>!initial.includes(id)));
  for(const id of boss.gateIds){const b=r.enemies.find(b=>b.id===id)!;b.nucleus=center(r);}
  const cleared=capture(r);assert.equal(cleared.wardens,2);assert.equal(cleared.threats,0);assert.equal(boss.openRemaining,14);assert.equal(boss.canTakePulse(),true);
});

test('objectives require both food and task progress, with later generated feeding hunter quotas',()=>{
  for(const mode of ['rescue','purify','defend','sectors'] as const){
    const r=run({stage:2,mode,food:1,target:1});r.harvest.nourishment=1;r.harvest.checkCompletion(r);assert.equal(r.state,'active');
    if(mode==='rescue')r.harvest.rescued=1;
    if(mode==='purify')r.harvest.purified=1;
    if(mode==='defend')r.harvest.defended=1;
    if(mode==='sectors')r.harvest.visited=[2];
    r.harvest.checkCompletion(r);assert.equal(r.state,'complete');
  }
  const later=run({stage:4,generated:true,food:1});meal(later,['food']);capture(later);assert.equal(later.state,'active');assert.equal(later.harvest.hunterQuota(),2);
  settle(later);meal(later,['drifter','drifter']);capture(later);assert.equal(later.state,'complete');
});

test('deadline clamps combat time; goals at the deadline win; completion awards are idempotent',()=>{
  const timeout=run({duration:0.1});timeout.step(2);near(timeout.stageElapsed,0.1);assert.equal(timeout.state,'loss');assert.equal(timeout.harvest.lossTitle,'The current moved on.');
  const r=run({stage:1,food:1,duration:20});r.stageElapsed=20;meal(r,['food']);const result=capture(r);
  assert.equal(r.state,'complete');assert.equal(r.stageBonus.swift,0);assert.equal(r.stageBonus.health,150);
  assert.equal(r.score,result.points+150+150);assert.deepEqual(r.masteryAwards.map(a=>a.id),['clear_water']);
  const score=r.score;r.finishEncounter();assert.equal(r.score,score);const elapsed=r.stageElapsed;r.step(8);
  assert.equal(r.stageElapsed,elapsed);assert.equal(r.clots.length,0);assert.ok(r.cells.every(c=>c.isReady()));
});

test('latched parasites block capture input and invalid gestures cannot change encounter rewards',()=>{
  const r=run(),parasite=r.addBody(new EcologyEnemy(1,'parasite',center(r)));parasite.latched=true;parasite.targetNode=0;
  r.selection.start(r.board.anchors[0]);assert.equal(r.selection.active,false);assert.equal(r.capture(NARROW).valid,false);
  assert.equal(r.score,0);assert.equal(r.loopsDrawn,0);assert.ok(r.cells.every(c=>c.isReady()));
  parasite.latched=false;meal(r,['food']);select(r);r.togglePause();assert.equal(r.selection.active,false);
  assert.equal(r.release().valid,false);assert.equal(r.loopsDrawn,0);assert.throws(()=>r.step(NaN),RangeError);
});
