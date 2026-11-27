import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import type {EncounterOptions} from '../src/engine/encounterSimulation';
import type {EncounterSpec} from '../src/campaign/journeyHarvest';
import {JourneyBoss} from '../src/campaign/journeyBoss';
import {Drifter,add,scale} from '../src/ecology/drifter';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {EcologyEnemy} from '../src/ecology/ecologyEnemy';
import {Amoeba} from '../src/ecology/amoeba';
import {CaptureFeedback,captureHealthText,captureSummary,contactSeconds,foodBonusText,guidanceGoals,motherAlert,nextAction,previewWarning,selectedLoopConfidence,targetOfKind} from '../src/mobile/gameGuidance';
const NARROW=[0,8,9];
function run(spec:Partial<EncounterSpec>={},options:EncounterOptions={}){
  const r=new EncounterSimulation({stage:0,mode:'feed',food:99,target:99,duration:300,...spec},options);r.begin();return r;
}
const center=(r:EncounterSimulation)=>scale(NARROW.reduce((sum,id)=>add(sum,r.board.anchors[id]),{x:0,y:0}),1/3);
function meal(r:EncounterSimulation,kind:string){return r.addBody(new HarvestOrganism(++r.nextEnemyId,kind,center(r),{x:0,y:0},0));}
function select(r:EncounterSimulation,closed=true){
  r.selection.start(r.board.anchors[NARROW[0]]);
  for(const id of NARROW.slice(1))r.selection.visit(id);
  if(closed)r.selection.visit(NARROW[0]);
  assert.equal(r.selection.canClose(),true);
}
test('live confidence agrees with the committed meal and return time without mutating the run',()=>{
  const r=run({}, {mutations:['fission','filter','catalyst','grazer']});meal(r,'food');meal(r,'cyst');meal(r,'spore');select(r);
  const positions=r.enemies.map(b=>({...b.nucleus})),before=r.rng.saveState();
  const confidence=selectedLoopConfidence(r)!;
  assert.equal(confidence.outcome.food,5);assert.equal(confidence.outcome.poison,0);assert.equal(confidence.outcome.rescued,1);
  assert.match(confidence.summary,/\+5 food · 1 rescued · No health lost/);assert.match(confidence.detail,/Bitter Catalyst \+2 · other bonuses \+2/);
  assert.equal(nextAction(r).title,'Release to rescue');assert.equal(nextAction(r,true).title,'Tap Capture to rescue');
  assert.deepEqual(r.enemies.map(b=>b.nucleus),positions);assert.deepEqual(r.rng.saveState(),before);assert.equal(r.captureSerial,0);
  const result=r.release();assert.equal(result.valid,true);if(!result.valid)return;
  assert.equal(result.food,confidence.outcome.food);assert.equal(result.poison,confidence.outcome.poison);assert.equal(result.rescued,confidence.outcome.rescued);
  assert.equal(result.recovery,confidence.returnTime);assert.equal(captureSummary(result),captureSummary(confidence.outcome));
});
test('new poison warns for 1.8 seconds, a paused frame freezes it and a new loop starts fresh',()=>{
  const r=run();meal(r,'food');select(r,false);const feedback=new CaptureFeedback();feedback.observe(r,0);
  assert.equal(feedback.warningSerial,0);assert.equal(nextAction(r).title,'Return to START');
  meal(r,'cyst');feedback.observe(r,0);assert.equal(feedback.warningRemaining,1.8);assert.equal(feedback.warningSerial,1);
  assert.equal(selectedLoopConfidence(r,feedback)?.poisonEntered,true);assert.match(selectedLoopConfidence(r,feedback)!.summary,/POISON ENTERED/);
  feedback.observe(r,0.5);assert.equal(feedback.warningRemaining,1.3);
  r.state='paused';feedback.observe(r,10);assert.equal(feedback.warningRemaining,1.3);
  r.state='active';feedback.observe(r,2);assert.equal(feedback.warningRemaining,0);assert.equal(feedback.warningSerial,1);
  r.selection.cancel();feedback.observe(r,0);assert.equal(feedback.outcome,undefined);select(r);feedback.observe(r,0);assert.equal(feedback.warningSerial,1);
  r.integrity=1;assert.equal(nextAction(r).title,'This loop will kill you');assert.equal(nextAction(r).urgent,true);
  assert.equal(captureHealthText(r.harvestPreview(),r.integrity),'−1 health · 0 remaining');
  feedback.clear();assert.equal(feedback.previousPoison,-1);assert.equal(feedback.warningSerial,1);
});
test('cyst-only clearing, armor cracks and linked nuclei use real eligibility rules',()=>{
  const purify=run({mode:'purify'});meal(purify,'cyst');select(purify);
  assert.equal(nextAction(purify).title,'Release to clear poison');assert.equal(selectedLoopConfidence(purify)?.outcome.poison,0);
  const r=run(),shell=r.addBody(new Drifter(1,center(r),0,'shellback'));select(r);
  assert.equal(nextAction(r).title,'Release to crack its shell');const result=r.release();assert.ok(result.valid);if(result.valid)assert.equal(captureSummary(result),'Armor cracked');
  r.cells.forEach(c=>c.remaining=0);shell.health=1;select(r);assert.equal(nextAction(r).title,'Release to defend');
  r.enemies=[];const pair=r.addBody(new Drifter(2,center(r),0,'twinspore'));
  pair.nuclei=()=>[center(r),r.board.center];assert.equal(previewWarning(r),'Fit both glowing nuclei');assert.equal(nextAction(r).title,'Include BOTH gold centers');
});
test('busy cells identify digestion, swallowed cells, permanent loss and parasite blocks',()=>{
  const r=run();r.cells[0].remaining=2.3;r.selection.start(r.board.anchors[0]);assert.equal(nextAction(r).title,'Cell is digesting');assert.match(nextAction(r).detail,/2.3s/);
  r.cells[0].captor=55;assert.equal(nextAction(r).title,'An amoeba swallowed this cell');assert.equal(nextAction(r).target,55);
  r.cells[0].lost=true;assert.equal(nextAction(r).title,'Cell was digested');
  r.cells[0].remaining=0;r.cells[0].captor=-1;r.cells[0].lost=false;
  const parasite=r.addBody(new EcologyEnemy(3,'parasite',center(r)));parasite.latched=true;parasite.targetNode=0;
  assert.equal(nextAction(r).title,'A parasite blocks this cell');
});
test('danger prioritizes actual Mother contact estimates and earlier captive rescue deadlines',()=>{
  const r=run(),body=r.addBody(new Drifter(1,add(r.board.center,{x:r.board.motherRadius+110,y:0}),10));
  assert.equal(contactSeconds(r,body),10);assert.equal(nextAction(r).title,'Protect the mother first');
  assert.equal(motherAlert(r).id,1);assert.ok(motherAlert(r).strength>0);assert.deepEqual(motherAlert(r).direction,{x:1,y:0});
  body.huntTarget=2;assert.equal(contactSeconds(r,body),Infinity);assert.equal(motherAlert(r).id,-1);
  const spore=r.addBody(new HarvestOrganism(2,'spore',center(r),{x:0,y:0},0));assert.equal(nextAction(r).title,'A hunter wants the spore');assert.equal(nextAction(r).target,spore.id);
  body.huntTarget=-1;const captive=r.addBody(new Amoeba(3,center(r)));captive.captiveNode=0;captive.digestionAge=10;
  assert.equal(nextAction(r).title,'Save your blue cell · 5s');assert.equal(nextAction(r).target,3);
  body.stunned=2;body.slowed=5;body.fedRemaining=8;assert.equal(contactSeconds(r,body),19.2);
  r.state='complete';assert.equal(motherAlert(r).strength,0);
});
test('boss guidance distinguishes charge, protection, opening and both-heart geometry',()=>{
  const r=run({stage:3,mode:'boss'}),boss=r.addBody(new JourneyBoss(9,r.board,0));boss.nucleus=center(r);select(r);
  assert.equal(nextAction(r).title,'Need 3 more food charge');r.harvest.nourishment=3;
  assert.equal(nextAction(r).title,'The boss is protected');assert.match(nextAction(r).detail,/inhaling/);
  boss.openRemaining=12;assert.equal(nextAction(r).title,'Release to attack');r.selection.cancel();assert.equal(nextAction(r).title,'Attack the boss now');
  boss.openRemaining=0;boss.resetRemaining=3;assert.equal(nextAction(r).title,'Boss is reforming');assert.equal(guidanceGoals(r)[0],'Collect 3 food to charge each attack.');
  const conjoined=run({stage:11,mode:'boss'});conjoined.harvest.nourishment=3;
  const twin=conjoined.addBody(new JourneyBoss(10,conjoined.board,2));twin.nuclei=()=>[center(conjoined),conjoined.board.center];select(conjoined);
  assert.equal(nextAction(conjoined).title,'Include BOTH gold centers');
});
test('fading spores, waking habitat and unseen food sectors retain source priority',()=>{
  const rescue=run({mode:'rescue'}),spore=meal(rescue,'spore');spore.age=12;
  assert.equal(nextAction(rescue).title,'Rescue the fading spore');spore.visitor=true;assert.equal(nextAction(rescue).title,'Collect 99 more food');
  const garden=run({stage:5,event:'hatching'});garden.harvest.events.begin(garden);garden.stageElapsed=60;const food=meal(garden,'food');garden.harvest.events.food=[food.id];
  assert.equal(nextAction(garden).title,'Harvest before the garden wakes');assert.match(nextAction(garden).detail,/8s/);
  const sectors=run({mode:'sectors',target:2});sectors.harvest.visited=[0];
  sectors.addBody(new HarvestOrganism(1,'food',add(sectors.board.center,{x:150,y:0}),{x:0,y:0},0));
  sectors.addBody(new HarvestOrganism(2,'food',add(sectors.board.center,{x:0,y:-150}),{x:0,y:0},0));
  assert.equal(targetOfKind(sectors,'food'),2);
  assert.equal(foodBonusText({foodBonuses:{grazer:1,fission:1}}),'Rapid Fission +1 · other bonuses +1');
});
