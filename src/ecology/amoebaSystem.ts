// Port of prototype/scripts/amoeba_system.gd; see CREDITS.md and LICENSE.
import {Point,captureValid,contains,polygonFor} from '../geometry/loopGeometry';
import type {Cell} from '../geometry/cell';
import {Drifter,add,sub,scale,unit,smooth} from './drifter';
import {Amoeba,REACH_TIME,RESCUE_TIME} from './amoeba';
import {EcologyEnemy} from './ecologyEnemy';
export const RETURN_TIME=1.25,MAX_MISSING=4;
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const lerp=(a:Point,b:Point,t:number)=>add(a,scale(sub(b,a),t));
export interface AmoebaContext {
  enemies:Drifter[];cells:Cell[];
  board:{anchors:readonly Point[];triangles:readonly (readonly number[])[];center:Point;motherRadius:number};
  selection:{path:readonly number[];maxVertices:number};
  isReady(id:number):boolean;
  harvest:{ecology:{announce(message:string):void}};
}
export interface CellReturn {node:number;age:number;from:Point;gate:Point;home:Point;origin:Point}
interface Site {nodes:number[];position:Point}
export class AmoebaSystem {
  releases:CellReturn[]=[];
  reset():void{this.releases=[];}
  owner(run:AmoebaContext,node:number):Amoeba|undefined{return run.enemies.find((b):b is Amoeba=>b instanceof Amoeba&&b.captiveNode===node);}
  missing(run:AmoebaContext):number{return run.cells.filter(c=>c.lost||c.captor>=0).length;}
  reserved(run:AmoebaContext,node:number,exceptId:number):boolean{
    return run.enemies.some(b=>b.id!==exceptId&&(
      (b instanceof Amoeba&&['approaching','reaching','digesting'].includes(b.phase)&&(b.targetNode===node||b.siteNodes.includes(node)))||
      (b instanceof EcologyEnemy&&b.kind==='parasite'&&b.targetNode===node)));
  }
  eligible(run:AmoebaContext,body:Amoeba,node:number):boolean{
    return node>=0&&run.isReady(node)&&!run.selection.path.includes(node)&&!this.reserved(run,node,body.id);
  }
  siteFor(run:AmoebaContext,body:Amoeba,victim:number):Site|undefined{
    let best=Infinity,result:Site|undefined;
    for(const triangle of run.board.triangles){
      if(triangle.includes(victim)||triangle.some(n=>!run.isReady(n)||this.reserved(run,n,body.id)))continue;
      const polygon=polygonFor(triangle,run.board.anchors);
      if(!captureValid(triangle,run.board,id=>run.isReady(id),run.selection.maxVertices))continue;
      const at=scale(add(add(polygon[0],polygon[1]),polygon[2]),1/3);
      const distance=dist(at,run.board.anchors[victim]);
      if(distance<35||distance>115||run.enemies.some(e=>e.kind==='cyst'&&contains(e.nucleus,polygon)))continue;
      const cost=distance+dist(at,body.nucleus)*0.65;
      if(cost<best){best=cost;result={nodes:[...triangle],position:at};}
    }
    return result;
  }
  chooseTarget(run:AmoebaContext,body:Amoeba):void{
    if(this.missing(run)>=MAX_MISSING||run.cells.filter(c=>c.isReady()).length<9)return;
    const choices=run.cells.map((_,i)=>i).sort((a,b)=>dist(run.board.anchors[a],body.nucleus)-dist(run.board.anchors[b],body.nucleus));
    for(const node of choices){
      if(!this.eligible(run,body,node))continue;
      const site=this.siteFor(run,body,node);if(!site)continue;
      body.targetNode=node;body.siteNodes=site.nodes;body.destination=site.position;body.phase='approaching';body.reachAge=0;return;
    }
  }
  siteCenter(run:AmoebaContext,body:Amoeba):Point{
    return body.siteNodes.reduce((s,n)=>add(s,scale(run.board.anchors[n],1/body.siteNodes.length)),{x:0,y:0});
  }
  cancelReach(body:Amoeba):void{
    body.phase='seeking';body.targetNode=-1;body.siteNodes=[];body.reachAge=0;body.searchAfter=body.age+2;body.destination={...body.nucleus};
  }
  step(run:AmoebaContext,delta:number):void{
    this.stepReturns(delta);
    for(const body of run.enemies){
      if(!(body instanceof Amoeba))continue;
      if(body.phase==='sated'){body.restAge+=delta;if(body.restAge>=7)this.cancelReach(body);continue;}
      if(body.phase==='digesting'){
        body.nucleus=this.siteCenter(run,body);body.digestionAge=Math.min(RESCUE_TIME,body.digestionAge+delta);
        if(body.digestionAge>=RESCUE_TIME){
          const cell=run.cells[body.captiveNode];cell.lost=true;cell.captor=-1;body.captiveNode=-1;body.phase='sated';body.restAge=0;
          run.harvest.ecology.announce('A cell was digested · it regrows at the next encounter');
        }continue;
      }
      if(body.age<body.searchAfter)continue;
      if(body.phase==='seeking'){this.chooseTarget(run,body);body.searchAfter=body.age+1;continue;}
      if(!this.eligible(run,body,body.targetNode)||this.missing(run)>=MAX_MISSING||body.siteNodes.some(n=>run.cells[n].lost||run.cells[n].captor>=0)){
        this.cancelReach(body);continue;
      }
      body.destination=this.siteCenter(run,body);body.reachPoint={...run.board.anchors[body.targetNode]};body.ingestAxis=unit(sub(body.reachPoint,body.nucleus));
      if(body.phase==='approaching'){if(dist(body.nucleus,body.destination)<4){body.phase='reaching';body.reachAge=0;}continue;}
      body.nucleus={...body.destination};body.reachAge+=delta;if(body.reachAge<REACH_TIME)continue;
      const safe=body.siteNodes.every(n=>run.isReady(n));
      const staggered=!run.enemies.some(e=>e instanceof Amoeba&&e.captiveNode>=0&&e.digestionAge<5);
      if(!safe||!staggered||run.cells.filter(c=>c.isReady()).length<9)continue;
      body.captiveNode=body.targetNode;body.victimHome={...run.board.anchors[body.captiveNode]};body.digestionAge=0;body.phase='digesting';
      run.cells[body.captiveNode].captor=body.id;
      run.harvest.ecology.announce('Cell swallowed · loop around the amoeba’s gold nucleus within 15s');
    }
  }
  stepReturns(delta:number):void{
    for(const r of this.releases)r.age=Math.min(RETURN_TIME,r.age+delta);
    this.releases=this.releases.filter(r=>r.age<RETURN_TIME);
  }
  rescue(run:AmoebaContext,body:Amoeba):boolean{
    if(body.captiveNode<0)return false;
    const node=body.captiveNode,cell=run.cells[node];cell.captor=-1;cell.spend(RETURN_TIME);
    this.releases.push({node,age:0,from:body.captivePosition(),gate:add(body.nucleus,scale(body.ingestAxis,58)),home:{...run.board.anchors[node]},origin:{...body.nucleus}});
    body.captiveNode=-1;body.phase='sated';body.restAge=0;run.harvest.ecology.announce('Cell rescued · returning to your colony');return true;
  }
  releaseAll(run:AmoebaContext):void{for(const b of run.enemies)if(b instanceof Amoeba)this.rescue(run,b);}
  returnFor(node:number):CellReturn|undefined{return this.releases.find(r=>r.node===node);}
  returnPosition(release:CellReturn,reduced=false):Point{
    if(reduced)return {...release.home};
    const t=smooth(0,1,release.age/RETURN_TIME);
    return lerp(lerp(release.from,release.gate,t),lerp(release.gate,release.home,t),t);
  }
}
