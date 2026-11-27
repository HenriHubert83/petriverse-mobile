import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Board} from '../src/geometry/board';
import {Cell} from '../src/geometry/cell';
import {InputController,MOTHER_WARNING} from '../src/geometry/inputController';
import {Point,area,polygonFor,distanceToSegment} from '../src/geometry/loopGeometry';
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const ready=()=>true;
function trace(input:InputController,ids:number[]){input.start(input.board.anchors[ids[0]]);for(let i=1;i<ids.length;i++)input.drag(input.board.anchors[ids[i-1]],input.board.anchors[ids[i]]);}
test('original board topology and three biome layouts',()=>{
  for(let dish=0;dish<3;dish++){
    const b=new Board();b.configureDish(dish);
    assert.equal(b.anchors.length,24);assert.equal(b.edges.length,56);assert.equal(b.triangles.length,32);
    assert.deepEqual(b.validateBoard(),[]);assert.equal(b.availableTriangles(ready),32);
    b.anchors.forEach((a,id)=>assert.equal(b.hitTest(a),id));
  }
});
test('cell cooldown, captivity and loss',()=>{
  const c=new Cell();assert.equal(c.isReady(),true);c.spend(3);assert.equal(c.isReady(),false);c.step(1.5);assert.equal(c.progress(),0.5);c.step(1.5);assert.equal(c.isReady(),true);c.captor=9;assert.equal(c.isReady(),false);c.captor=-1;c.lost=true;assert.equal(c.isReady(),false);
});
test('independent drift, held anchors, frame-rate independence and restart',()=>{
  const b=new Board();b.stepMotion(5);const travel=b.anchors.map((a,i)=>dist(a,b.restAnchors[i])).sort((a,b)=>a-b);
  assert.ok(travel[0]>=8);assert.ok(travel[12]>=25);
  const held=b.anchors.slice();b.stepMotion(8,[0,8,9]);for(const id of [0,8,9])assert.deepEqual(b.anchors[id],held[id]);assert.ok(dist(b.anchors[5],held[5])>15);
  b.stepMotion(1/60);assert.ok(dist(b.anchors[8],held[8])<=15/60);
  const slow=new Board(),fast=new Board();for(let i=0;i<300;i++)slow.stepMotion(1/30);for(let i=0;i<1440;i++)fast.stepMotion(1/144);
  slow.anchors.forEach((a,i)=>assert.ok(dist(a,fast.anchors[i])<0.001));
  b.resetMotion();assert.deepEqual(b.anchors,b.restAnchors);assert.ok(b.motionTimes.every(t=>t===0));
});
test('drift preserves spacing, planar bonds, mother clearance and speed in all biomes',()=>{
  for(let dish=0;dish<3;dish++){
    const b=new Board();b.configureDish(dish);
    for(let frame=0;frame<1200;frame++){
      const previous=b.anchors.slice();b.stepMotion(0.25,[[0,8,9],[3,11,12],[],[0,3,6,18]][Math.floor(frame/60)%4]);
      for(let i=0;i<24;i++){
        assert.ok(dist(previous[i],b.anchors[i])/0.25<=12.01);assert.ok(dist(b.anchors[i],b.center)<=b.dishRadius-34.99);
        for(let j=0;j<i;j++)assert.ok(dist(b.anchors[i],b.anchors[j])>=59.99);
      }
      if(frame%40===0){assert.deepEqual(b.validateBoard(),[]);for(const tri of b.triangles)assert.ok(area(polygonFor(tri,b.anchors))>=299.99);for(const e of b.edges)assert.ok(distanceToSegment(b.center,b.anchors[e[0]],b.anchors[e[1]])>=b.motherRadius+17.99);}
    }
  }
});
test('swept drag accepts free connections and releases exact polygon',()=>{
  const b=new Board(),input=new InputController(b,ready);assert.equal(b.neighbors[0].includes(17),false);
  trace(input,[0,17,9,0]);assert.deepEqual(input.path,[0,17,9]);assert.equal(input.closed,true);assert.deepEqual(input.release(),[0,17,9]);assert.equal(input.active,false);
  input.start(b.anchors[0]);assert.equal(input.legalNext().length,23);input.cancel();
});
test('mother exclusion in both windings and backtracking',()=>{
  const b=new Board(),input=new InputController(b,ready);
  for(const ring of [[0,1,2,3,4,5,6,7],[7,6,5,4,3,2,1,0]]){
    trace(input,[...ring,ring[0]]);assert.equal(input.motherBlocked(),true);assert.equal(input.canClose(),false);assert.equal(input.rejectionReason,MOTHER_WARNING);assert.deepEqual(input.release(),[]);
  }
  input.start(b.anchors[0]);input.visit(2);input.visit(4);assert.equal(input.motherBlocked(),true);input.visit(2);input.visit(9);input.visit(0);assert.equal(input.closed,true);assert.equal(input.motherBlocked(),false);
});
test('busy cells, backtracking, crossing, reopening and assisted release',()=>{
  const b=new Board(),cells=b.anchors.map(()=>new Cell()),input=new InputController(b,id=>cells[id].isReady());
  cells[17].spend(1);input.start(b.anchors[17]);assert.equal(input.active,false);input.start(b.anchors[0]);assert.equal(input.visit(17),false);assert.match(input.rejectionReason,/busy/);cells[17].step(1);
  input.visit(17);input.visit(9);input.visit(0);assert.equal(input.closed,true);input.visit(9);assert.equal(input.closed,false);input.visit(17);assert.deepEqual(input.path,[0,17]);input.visit(9);assert.equal(input.closeNearStart(b.anchors[0]),false);input.assistedClosure=true;assert.equal(input.closeNearStart(b.anchors[0]),true);cells[9].spend(1);assert.deepEqual(input.release(),[]);
  input.start(b.anchors[16]);input.visit(20);input.visit(18);assert.equal(input.visit(22),false);assert.match(input.rejectionReason,/cross/);
});
