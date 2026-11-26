import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {authoredStage} from '../src/campaign/journeyPlan';
import {SMALL_LESSON,WIDE_LESSON} from '../src/campaign/journeyLesson';
import {TouchController} from '../src/mobile/touchController';
import {boardViewport,toBoard,toScreen} from '../src/mobile/boardViewport';
import {SimulationClock} from '../src/mobile/simulationClock';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';

test('landscape viewport maps real board coordinates in both directions and rejects invalid bounds',()=>{
  for(const [width,height] of [[380,280],[690,340],[1000,720]]){
    const view=boardViewport(width,height,{x:640,y:450},392),p={x:763.2,y:180.3};
    const round=toBoard(toScreen(p,view),view)!;assert.ok(Math.hypot(round.x-p.x,round.y-p.y)<1e-8);
    assert.deepEqual(toScreen({x:640,y:450},view),{x:width/2,y:height/2});
    assert.equal(toBoard({x:-1,y:0},view),undefined);assert.equal(toBoard({x:width+1,y:0},view),undefined);
  }
  assert.equal(toBoard({x:0,y:0},boardViewport(0,0,{x:640,y:450},392)),undefined);
});
test('phone-sized native pointer samples complete the actual two-part tutorial',()=>{
  for(const size of [[380,280],[690,340]]){
    const run=new EncounterSimulation(authoredStage(0),{content:true,seed:73});run.begin();const touch=new TouchController(run);touch.resize(size[0],size[1]);
    const draw=(nodes:readonly number[])=>{
      const points=nodes.map(id=>toScreen(run.board.anchors[id],touch.view));assert.ok(touch.begin(4,points[0]));
      for(const p of [...points.slice(1),points[0]])touch.move(4,p);
      const result=touch.end(4,points[0]);assert.equal(result?.valid,true,run.selection.rejectionReason);return result;
    };
    const first=draw(SMALL_LESSON);assert.ok(first?.valid&&first.rawFood===3);run.step(7);
    const second=draw(WIDE_LESSON);assert.ok(second?.valid&&second.rawFood===6);run.step(7);assert.equal(run.state,'complete');
  }
});
test('multitouch, pointer changes, cancellation, resize and pause never commit a partial loop',()=>{
  for(const interrupt of ['second','wrong','cancel','resize','pause','outside']){
    const run=new EncounterSimulation(authoredStage(0),{content:true});run.begin();const touch=new TouchController(run);touch.resize(600,350);
    const a=toScreen(run.board.anchors[0],touch.view),b=toScreen(run.board.anchors[8],touch.view);
    touch.begin(1,a);touch.move(1,b);
    if(interrupt==='second')touch.begin(2,b,2);
    else if(interrupt==='wrong')touch.move(2,b);
    else if(interrupt==='resize')touch.resize(700,350);
    else if(interrupt==='pause')run.togglePause();
    else if(interrupt==='outside')touch.move(1,{x:-1,y:20});
    else touch.cancel();
    touch.end(1,a);assert.equal(run.loopsDrawn,0);assert.equal(run.harvest.nourishment,0);assert.equal(run.selection.active,false);
  }
});
test('fixed stepping is frame-rate independent and discards suspended wall time',()=>{
  const run=(fps:number)=>{const clock=new SimulationClock();let elapsed=0,count=0;for(let i=0;i<=fps*2;i++)clock.advance(i*1000/fps,true,d=>{elapsed+=d;count++;});return {elapsed,count};};
  assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(120));assert.equal(run(30).count,120);
  const clock=new SimulationClock();let steps=0;const step=()=>steps++;
  clock.advance(0,true,step);clock.advance(10000,false,step);assert.equal(steps,0);
  clock.reset();clock.advance(20000,true,step);clock.advance(20000+1000/60,true,step);assert.equal(steps,1);
  clock.advance(30000,true,step);assert.equal(steps,16);clock.advance(NaN,true,step);assert.equal(steps,16);
});
test('tap controls keep a loop between native touch groups and capture only on explicit action',()=>{
  const run=new EncounterSimulation(authoredStage(0),{content:true,seed:73});run.begin();
  const touch=new TouchController(run);touch.resize(600,350);touch.configure({clickMode:true,assistedClosure:true});
  for(const index of [...SMALL_LESSON,SMALL_LESSON[0]]){
    const point={...toScreen(run.board.anchors[index],touch.view),id:1};
    touch.startTouches([point],true);touch.endTouches([],[point]);
    assert.equal(run.loopsDrawn,0);
  }
  assert.equal(run.selection.closed,true);assert.equal(touch.captureSelection()?.valid,true);
  assert.equal(run.harvest.nourishment,3);assert.equal(run.selection.active,false);
});
test('camera gestures, interruptions and control changes discard staged tap loops',()=>{
  for(const reason of ['pinch','interrupt','mode']){
    const run=new EncounterSimulation(authoredStage(0),{content:true,seed:73});run.begin();
    const touch=new TouchController(run);touch.resize(600,350);touch.configure({clickMode:true,assistedClosure:false});
    for(const index of [...SMALL_LESSON,SMALL_LESSON[0]]){
      const point={...toScreen(run.board.anchors[index],touch.view),id:1};touch.startTouches([point],true);touch.endTouches([],[point]);
    }
    if(reason==='pinch'){
      touch.startTouches([{id:1,x:200,y:175},{id:2,x:400,y:175}],true);
      touch.endTouches([{id:1,x:200,y:175}],[{id:2,x:400,y:175}]);touch.endTouches([],[{id:1,x:200,y:175}]);
    }else if(reason==='mode')touch.configure({clickMode:false,assistedClosure:false});else touch.cancel();
    assert.equal(touch.captureSelection(),undefined);assert.equal(run.loopsDrawn,0);assert.equal(run.selection.active,false);
  }
});
test('tap controls can nudge by two taps or a drag without leaving a stale target',()=>{
  for(const drag of [false,true]){
    const run=new EncounterSimulation(authoredStage(1),{content:true,seed:73});run.begin();
    const cyst=new HarvestOrganism(900,'cyst',{x:640,y:200},{x:0,y:0},0);cyst.age=10;run.enemies=[cyst];
    const touch=new TouchController(run);touch.resize(600,350);touch.configure({clickMode:true,assistedClosure:false});
    const a={...toScreen(cyst.nucleus,touch.view),id:1},b={...toScreen({x:680,y:200},touch.view),id:2};
    touch.startTouches([a],true);
    if(drag){touch.moveTouches([{...b,id:1}]);touch.endTouches([],[{...b,id:1}]);}
    else {touch.endTouches([],[a]);assert.equal(run.nudge.targetId,900);touch.startTouches([b],true);touch.endTouches([],[b]);}
    assert.equal(run.nudge.targetId,-1);assert.equal(run.nudge.cooldown,6);assert.equal(run.loopsDrawn,0);
  }
});
