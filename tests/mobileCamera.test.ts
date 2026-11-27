import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {authoredStage} from '../src/campaign/journeyPlan';
import {SMALL_LESSON,WIDE_LESSON} from '../src/campaign/journeyLesson';
import {boardViewport,toBoard,toScreen,transformViewport,viewportZoom} from '../src/mobile/boardViewport';
import {TouchController} from '../src/mobile/touchController';
import type {TouchPoint} from '../src/mobile/touchController';

const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
function setup(){
  const run=new EncounterSimulation(authoredStage(0),{content:true,seed:73});run.begin();
  const touch=new TouchController(run);touch.resize(600,350);return {run,touch};
}
const finger=(id:number,x:number,y:number):TouchPoint=>({id,x,y});
function enlarge(touch:TouchController){
  touch.startTouches([finger(1,230,175),finger(2,370,175)],true);
  touch.moveTouches([finger(1,195,195),finger(2,405,195)]);
  touch.endTouches([],[]);
}
function draw(touch:TouchController,nodes:readonly number[]){
  const points=nodes.map(id=>({...toScreen(touch.run.board.anchors[id],touch.view),id:4}));
  for(const p of points)assert.ok(toBoard(p,touch.view),'Every loop point must be on screen');
  touch.startTouches([points[0]],true);
  for(const p of [...points.slice(1),points[0]])touch.moveTouches([p]);
  return touch.endTouches([],[points[0]]);
}

test('pinch follows its focal point and bounded panning cannot lose the dish',()=>{
  const center={x:640,y:450},radius=392,fit=boardViewport(550,350,center,radius);
  const from={x:290,y:180},to={x:310,y:195},anchor=toBoard(from,fit)!;
  const enlarged=transformViewport(fit,2,from,to,center,radius),mapped=toScreen(anchor,enlarged);
  close(mapped.x,to.x);close(mapped.y,to.y);close(viewportZoom(enlarged,center,radius),2);
  for(const target of [{x:-1e6,y:-1e6},{x:1e6,y:1e6}]){
    const panned=transformViewport(enlarged,1,to,target,center,radius);
    const low=toScreen({x:center.x-radius-20,y:center.y-radius-20},panned),high=toScreen({x:center.x+radius+20,y:center.y+radius+20},panned);
    assert.ok(low.x<=0&&low.y<=0&&high.x>=panned.width&&high.y>=panned.height);
  }
  close(viewportZoom(transformViewport(enlarged,100,to,to,center,radius),center,radius),3);
  assert.deepEqual(transformViewport(enlarged,0.001,to,to,center,radius),fit);
});

test('real tutorial captures work after pinch zoom and two-finger translation',()=>{
  const {run,touch}=setup();const fitted=touch.view;enlarge(touch);
  close(touch.zoom,1.5);assert.notEqual(touch.view.y,fitted.y);
  const first=draw(touch,SMALL_LESSON);assert.ok(first?.valid&&first.rawFood===3);run.step(7);
  const second=draw(touch,WIDE_LESSON);assert.ok(second?.valid&&second.rawFood===6);run.step(7);
  assert.equal(run.state,'complete');
});

test('adding a second finger cancels the loop and one remaining finger stays quarantined',()=>{
  const {run,touch}=setup(),points=SMALL_LESSON.map(id=>({...toScreen(run.board.anchors[id],touch.view),id:1}));
  touch.startTouches([points[0]],true);touch.moveTouches([points[1]]);assert.equal(run.selection.active,true);
  touch.startTouches([points[1],finger(2,400,240)]);assert.equal(run.selection.active,false);
  touch.moveTouches([points[1],finger(2,430,260)]);
  touch.endTouches([points[1]],[finger(2,430,260)]);
  for(const p of [...points,points[0]])touch.moveTouches([p]);
  assert.equal(touch.endTouches([],[points[0]]),undefined);
  assert.equal(run.loopsDrawn,0);assert.equal(run.harvest.nourishment,0);
  touch.resetView();assert.equal(draw(touch,SMALL_LESSON)?.valid,true);
});

test('finger order and third-finger changes do not jump the camera or resume gameplay',()=>{
  const {run,touch}=setup(),a=finger(1,200,175),b=finger(2,400,175);
  touch.startTouches([a,b],true);touch.moveTouches([finger(2,450,195),finger(1,150,195)]);
  const before={...touch.view};
  touch.startTouches([finger(3,310,280),finger(2,450,195),finger(1,150,195)]);
  assert.deepEqual(touch.view,before);
  touch.endTouches([finger(3,310,280),finger(2,450,195)],[finger(1,150,195)]);
  assert.deepEqual(touch.view,before);
  touch.endTouches([finger(2,450,195)],[finger(3,310,280)]);
  touch.moveTouches([finger(2,300,175)]);touch.endTouches([],[finger(2,300,175)]);
  assert.equal(run.loopsDrawn,0);assert.equal(run.selection.active,false);
});

test('pause, cancellation and real resize cancel camera ownership without stale captures',()=>{
  for(const reason of ['pause','cancel','resize']){
    const {run,touch}=setup();enlarge(touch);
    touch.startTouches([finger(1,230,175),finger(2,370,175)],true);
    if(reason==='pause'){run.togglePause();touch.moveTouches([finger(1,200,175),finger(2,400,175)]);run.togglePause();}
    else if(reason==='resize')touch.resize(550,350);else touch.cancel();
    const stopped={...touch.view};
    touch.moveTouches([finger(1,100,100),finger(2,500,250)]);assert.deepEqual(touch.view,stopped);
    touch.endTouches([finger(1,230,175)],[finger(2,370,175)]);
    const at={...toScreen(run.board.anchors[SMALL_LESSON[0]],touch.view),id:1};
    touch.moveTouches([at]);touch.endTouches([],[at]);
    assert.equal(run.loopsDrawn,0);assert.equal(run.selection.active,false);
    touch.resetView();assert.equal(draw(touch,SMALL_LESSON)?.valid,true);
  }
});

test('same-size layout events retain zoom, while Fit and real size changes restore framing',()=>{
  const {touch}=setup();enlarge(touch);const zoomed={...touch.view};
  touch.resize(600,350);assert.deepEqual(touch.view,zoomed);
  touch.resetView();close(touch.zoom,1);
  touch.zoomBy(100);close(touch.zoom,3);touch.zoomBy(0.001);close(touch.zoom,1);
  enlarge(touch);touch.resize(550,300);close(touch.zoom,1);
  assert.deepEqual(toScreen(touch.run.board.center,touch.view),{x:275,y:150});
});
