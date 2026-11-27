import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ProducerLab} from '../src/experiments/producerLab';
import {BossPhase,Escort,arcPoint,escortArc,currentLayout,currentVelocity,insideDish} from '../src/experiments/producerLabRules';
import {TouchController} from '../src/mobile/touchController';
import {toScreen} from '../src/mobile/boardViewport';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {EcologyEnemy} from '../src/ecology/ecologyEnemy';
import type {Drifter} from '../src/ecology/drifter';
import {add,scale} from '../src/ecology/drifter';
import {JourneySession} from '../src/campaign/journeySession';
import {createJourneyProfile} from '../src/storage/journeyProfile';

const center={x:640,y:450},nodes=[0,8,9];
const step=(lab:ProducerLab,seconds:number)=>{for(let i=0;i<Math.round(seconds*60);i++)lab.update(1/60);};
function placeForCapture(lab:ProducerLab,bodies:readonly Drifter[]){
  const middle=scale(nodes.reduce((sum,id)=>add(sum,lab.run.board.anchors[id]),{x:0,y:0}),1/nodes.length);
  for(const body of bodies){body.nucleus={...middle};if(body instanceof HarvestOrganism)body.origin={...middle};}
  return middle;
}
function capture(lab:ProducerLab){
  const run=lab.run,touch=new TouchController(run);touch.resize(690,340);
  const points=nodes.map(id=>toScreen(run.board.anchors[id],touch.view));assert.equal(touch.begin(1,points[0]),true);
  for(const point of [...points.slice(1),points[0]])touch.move(1,point);
  const result=touch.end(1,points[0]);assert.equal(result?.valid,true);lab.observe();return result!;
}

test('source escort rules require an actual arrival and fail when the goal becomes unreachable',()=>{
  const escort=new Escort();escort.recordRescued();escort.recordRescued();
  assert.equal(escort.safeCount(),2);assert.equal(escort.isWon(),false);assert.equal(escort.isDoomed(),false);
  escort.recordArrival();assert.equal(escort.isWon(),true);
  const lost=new Escort();lost.recordLost();lost.recordLost();assert.equal(lost.isDoomed(),true);
  const allRescued=new Escort();for(let i=0;i<3;i++)allRescued.recordRescued();
  assert.equal(allRescued.isWon(),false);assert.equal(allRescued.isDoomed(),true);
  const arc=escortArc(center);assert.equal(arc.length,25);assert.deepEqual(arc[0],{x:378,y:332});assert.deepEqual(arc[24],{x:902,y:308});
  assert.deepEqual(arcPoint(center,-1),arc[0]);assert.deepEqual(arcPoint(center,2),arc[24]);
  assert.ok(arc.every(point=>Math.hypot(point.x-center.x,point.y-center.y)>150));
});

test('original current forecasts produce different seeded safe layouts and real velocity fields',()=>{
  const channel=currentLayout('channel',center),shelter=currentLayout('shelter',center);
  assert.deepEqual(currentLayout('channel',center),channel);assert.deepEqual(currentLayout('shelter',center),shelter);
  assert.notDeepEqual(channel.food,shelter.food);assert.notDeepEqual(currentLayout('channel',center,73).food,channel.food);
  for(const layout of [channel,shelter]){
    assert.equal(layout.food.length,9);assert.equal(layout.cysts.length,4);
    assert.ok([...layout.food,...layout.cysts].every(point=>insideDish(point,center)));
  }
  assert.ok(channel.food.every(point=>Math.abs(point.y-channel.laneY)<30));
  assert.equal(currentVelocity('channel',{x:640,y:300},center,0).x,30);
  assert.ok(Math.hypot(...Object.values(currentVelocity('shelter',{x:640,y:300},center,0)))<8);
  assert.deepEqual(currentVelocity('shelter',{x:445,y:315},center,0),{x:0,y:-6});
  assert.deepEqual(currentVelocity('channel',center,center,0),{x:0,y:0});
  assert.deepEqual(currentVelocity('shelter',center,center,0),{x:0,y:0});
});

test('the Regent shell break occurs once and moves wardens to the original lower flank anchors',()=>{
  const phase=new BossPhase();assert.deepEqual(phase.shieldAnchors(center),[{x:568,y:398},{x:712,y:398}]);
  assert.equal(phase.applyHit(),false);assert.equal(phase.phaseBroken,true);assert.equal(phase.openingCreated,true);assert.equal(phase.breakCount,1);
  assert.deepEqual(phase.shieldAnchors(center),[{x:522,y:512},{x:758,y:512}]);
  assert.equal(phase.applyHit(),false);assert.equal(phase.breakCount,1);assert.equal(phase.applyHit(),true);assert.equal(phase.defeated(),true);
});

test('practice state is isolated and real touch loops rescue brood without counting as arrivals',()=>{
  const journey=new JourneySession(73),profile=createJourneyProfile(),saved=journey.snapshot(),profileBefore=structuredClone(profile);
  const lab=new ProducerLab();assert.equal(lab.phase,'menu');lab.selectExperiment(1);
  assert.equal(lab.broods.length,3);assert.equal(lab.run.integrity,5);assert.equal(lab.run.state,'paused');
  const brief=lab.broods.map(entry=>({...entry.body.nucleus}));step(lab,2);assert.deepEqual(lab.broods.map(entry=>entry.body.nucleus),brief);assert.equal(lab.remaining,90);
  lab.begin();placeForCapture(lab,[lab.broods[0].body]);const result=capture(lab);
  assert.ok(result.valid&&result.rescued===1);assert.equal(lab.escort.rescued,1);assert.equal(lab.escort.arrived,0);assert.equal(lab.phase,'playing');
  assert.deepEqual(journey.snapshot(),saved);assert.deepEqual(profile,profileBefore);
  lab.retry();assert.equal(lab.phase,'brief');assert.equal(lab.escort.safeCount(),0);assert.equal(lab.broods.length,3);assert.equal(lab.run.captureSerial,0);
});

test('escort warnings, paused clocks, true arrivals and hunter losses use the authored schedule',()=>{
  const lab=new ProducerLab();lab.selectExperiment(1);lab.begin();step(lab,10.1);
  assert.equal(lab.hunterSchedule[0].warned,true);assert.equal(lab.hunters.length,0);
  lab.interrupt();const time=lab.elapsed,positions=lab.broods.map(entry=>({...entry.body.nucleus}));step(lab,20);
  assert.equal(lab.elapsed,time);assert.deepEqual(lab.broods.map(entry=>entry.body.nucleus),positions);assert.equal(lab.paused,true);
  lab.pause();step(lab,3);assert.equal(lab.hunters.length,1);assert.equal(lab.hunterSchedule[0].spawned,true);
  lab.hunters[0].position={...lab.broods[0].body.nucleus};lab.update(1/60);
  assert.equal(lab.escort.lost,1);assert.equal(lab.broods.length,2);assert.equal(lab.hunters.length,0);
  for(const brood of lab.broods)brood.t=0.9999;lab.update(1/60);
  assert.equal(lab.escort.arrived,2);assert.equal(lab.phase,'won');assert.equal(lab.run.state,'paused');
  lab.retry();lab.begin();lab.escort.recordLost();lab.escort.recordLost();lab.observe();assert.equal(lab.phase,'lost');
});

test('both current experiments transport real food and preserve the same seeded layout on retry',()=>{
  for(const choice of ['channel','shelter'] as const){
    const lab=new ProducerLab();lab.selectExperiment(2);assert.equal(lab.phase,'choice');lab.chooseCurrent(choice);
    const initial=lab.run.enemies.map(body=>({...body.nucleus}));assert.equal(lab.run.enemies.length,13);
    lab.begin();step(lab,1);assert.notDeepEqual(lab.run.enemies.map(body=>body.nucleus),initial);
    const food=lab.run.enemies.find(body=>body.kind==='food')!;placeForCapture(lab,[food]);const result=capture(lab);
    assert.ok(result.valid&&result.food>=1);assert.ok(lab.run.harvest.nourishment>=1);
    lab.retry();assert.equal(lab.phase,'choice');lab.chooseCurrent(choice);assert.deepEqual(lab.run.enemies.map(body=>body.nucleus),initial);
    assert.equal(lab.remaining,75);assert.equal(lab.run.harvest.nourishment,0);
  }
});

test('current victory, food replenishment, poison failure and timeout settle immediately after capture',()=>{
  const lab=new ProducerLab();lab.selectExperiment(2);lab.chooseCurrent('channel');lab.begin();
  const foods=lab.run.enemies.filter(body=>body.kind==='food');placeForCapture(lab,foods);const result=capture(lab);
  assert.ok(result.valid&&result.food===9);assert.equal(lab.phase,'won');assert.equal(lab.run.state,'paused');
  lab.retry();lab.chooseCurrent('shelter');lab.begin();lab.run.enemies=lab.run.enemies.filter(body=>body.kind!=='food');lab.update(1/60);
  assert.equal(lab.run.enemies.filter(body=>body.kind==='food').length,1);step(lab,0.2);assert.equal(lab.run.enemies.filter(body=>body.kind==='food').length,5);
  lab.run.integrity=1;placeForCapture(lab,[lab.run.enemies.find(body=>body.kind==='cyst')!]);const poison=capture(lab);
  assert.ok(poison.valid&&poison.poison>=1);assert.equal(lab.phase,'lost');assert.equal(lab.feedback,'Mother died.');
  lab.retry();lab.chooseCurrent('channel');lab.begin();lab.remaining=0.001;lab.update(1/60);assert.equal(lab.phase,'lost');assert.equal(lab.feedback,'Time ran out.');
});

test('real shield and Regent captures drive the shell break, regrowth, feeding opening and final victory',()=>{
  const lab=new ProducerLab();lab.selectExperiment(3);assert.equal(lab.bossRef!.health,3);assert.equal(lab.bossRef!.canTakePulse(),false);lab.begin();
  let wardens=lab.run.enemies.filter(body=>body.kind==='warden');assert.equal(wardens.length,2);
  placeForCapture(lab,wardens);capture(lab);assert.equal(lab.bossRef!.canTakePulse(),true);
  for(const cell of lab.run.cells)cell.remaining=0;
  placeForCapture(lab,[lab.bossRef!]);const first=capture(lab);
  assert.ok(first.valid&&first.bossLayers===1);assert.equal(lab.bossPhase.phaseBroken,true);assert.equal(lab.bossPhase.breakCount,1);assert.equal(lab.bossPhase.health,2);
  assert.equal(lab.run.enemies.filter(body=>body.kind==='food').length,6);assert.equal(lab.run.harvest.nourishment,0);
  step(lab,5);wardens=lab.run.enemies.filter(body=>body.kind==='warden');assert.equal(wardens.length,2);
  assert.deepEqual(wardens.map(body=>body.nucleus),lab.bossPhase.shieldAnchors(lab.bossRef!.nucleus));
  assert.ok(wardens.every(body=>body instanceof EcologyEnemy));
  for(let hit=0;hit<2;hit++){
    for(const cell of lab.run.cells)cell.remaining=0;placeForCapture(lab,lab.run.enemies.filter(body=>body.kind==='warden'));capture(lab);
    for(const cell of lab.run.cells)cell.remaining=0;lab.run.harvest.nourishment=3;placeForCapture(lab,[lab.bossRef!]);capture(lab);
    if(hit===0)step(lab,5);
  }
  assert.equal(lab.phase,'won');assert.equal(lab.bossPhase.health,0);assert.equal(lab.bossPhase.breakCount,1);assert.equal(lab.run.state,'paused');
});

test('simulation terminal states and partial gestures cannot bypass lab results or background pause',()=>{
  const lab=new ProducerLab();lab.selectExperiment(3);lab.begin();lab.run.integrity=0;lab.run.state='loss';lab.update(0);assert.equal(lab.phase,'lost');
  lab.retry();lab.begin();lab.run.bossDefeated=true;lab.run.state='complete';lab.update(0);assert.equal(lab.phase,'won');
  lab.selectExperiment(1);lab.begin();lab.run.selection.path.push(...nodes);lab.run.selection.active=true;
  const captures=lab.run.captureSerial;lab.interrupt();assert.equal(lab.run.selection.active,false);assert.equal(lab.run.captureSerial,captures);assert.equal(lab.paused,true);
  lab.showMenu();assert.equal(lab.phase,'menu');assert.equal(lab.run.enemies.length,0);
});
