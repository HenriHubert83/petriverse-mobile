// Port of prototype/scripts/input_controller.gd; see CREDITS.md and LICENSE.
import {Point,BOUNDARY_TOLERANCE,canAppend,captureValid,distanceToSegment,polygonFor,simplePolygon,touchesMother} from './loopGeometry';
export interface InputBoard {
  anchors:readonly Point[];center:Point;motherRadius:number;hitRadius:number;
  hitTest(point:Point):number;
}
export const MOTHER_WARNING='Keep the mother outside the loop. Backtrack or cancel.';
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export class InputController {
  path:number[]=[];closed=false;active=false;rejectedId=-1;rejectionReason='';
  maxVertices=8;assistedClosure=false;
  hitPadding=0;
  constructor(readonly board:InputBoard,readonly ready:(id:number)=>boolean){}
  cancel():void {this.path.length=0;this.closed=false;this.active=false;this.rejectedId=-1;this.rejectionReason='';}
  start(point:Point):void {
    this.cancel();let id=this.board.hitTest(point);
    if(this.hitPadding>0){let nearest=this.board.hitRadius+this.hitPadding;id=-1;this.board.anchors.forEach((p,i)=>{const distance=dist(p,point);if(distance<nearest){nearest=distance;id=i;}});}
    if(id>=0&&this.ready(id)){this.path.push(id);this.active=true;}
    else if(id>=0){this.rejectedId=id;this.rejectionReason='This cell is busy. Start from a ready blue cell.';}
  }
  visit(id:number):boolean {
    if(!this.active||!Number.isInteger(id)||id<0||id>=this.board.anchors.length)return false;
    this.rejectedId=-1;this.rejectionReason='';
    const path=this.path,last=path[path.length-1];
    if(this.closed){if(id===last){this.closed=false;return true;}return false;}
    if(id===last)return false;
    if(path.length>=2&&id===path[path.length-2]){path.pop();return true;}
    if(id===path[0]&&this.canClose()){this.closed=true;return true;}
    if(id===path[0]&&this.motherBlocked()){this.rejectedId=id;this.rejectionReason=MOTHER_WARNING;return false;}
    if(canAppend(path,id,this.board.anchors,this.ready,this.maxVertices)){path.push(id);return true;}
    this.rejectedId=id;
    if(!this.ready(id))this.rejectionReason='This cell is busy. Wait for it to return, or use another.';
    else if(id===path[0]&&path.length<3)this.rejectionReason='Use at least 3 blue cells before returning to START.';
    else if(path.includes(id)&&id!==path[0])this.rejectionReason='Already in your loop. Backtrack to undo, or return to START.';
    else if(path.length>=this.maxVertices&&id!==path[0])this.rejectionReason='Limit: '+this.maxVertices+' cells. Return to START or backtrack.';
    else this.rejectionReason='A loop cannot cross itself. Backtrack along your last line.';
    return false;
  }
  drag(from:Point,to:Point):void {
    const dx=to.x-from.x,dy=to.y-from.y,a=dx*dx+dy*dy;
    // Godot Vector2.is_equal_approx uses per-component relative tolerance.
    const eq=(x:number,y:number)=>x===y||Math.abs(x-y)<Math.max(0.00001,Math.abs(x)*0.00001);
    if(!this.active||(eq(from.x,to.x)&&eq(from.y,to.y))||a===0)return;
    const hits:{id:number;t:number}[]=[];
    for(let id=0;id<this.board.anchors.length;id++){
      const p=this.board.anchors[id],ox=from.x-p.x,oy=from.y-p.y,r=this.board.hitRadius+this.hitPadding;
      if(Math.hypot(ox,oy)<=r)continue;
      const b=2*(ox*dx+oy*dy),c=ox*ox+oy*oy-r*r,disc=b*b-4*a*c;
      if(disc<0)continue;const t=(-b-Math.sqrt(disc))/(2*a);
      if(t>=0&&t<=1)hits.push({id,t});
    }
    hits.sort((a,b)=>a.t-b.t);for(const hit of hits)this.visit(hit.id);
  }
  canClose():boolean {return this.active&&captureValid(this.path,this.board,this.ready,this.maxVertices);}
  closeNearStart(point:Point):boolean {
    if(!this.assistedClosure||this.closed||!this.canClose())return false;
    if(dist(point,this.board.anchors[this.path[0]])>this.board.hitRadius+12)return false;
    this.closed=true;return true;
  }
  motherBlocked():boolean {
    if(!this.active||this.path.length<2)return false;
    const points=polygonFor(this.path,this.board.anchors);
    for(let i=0;i<points.length-1;i++)if(distanceToSegment(this.board.center,points[i],points[i+1])<=this.board.motherRadius+BOUNDARY_TOLERANCE)return true;
    return simplePolygon(points)&&touchesMother(points,this.board.center,this.board.motherRadius);
  }
  legalNext():number[] {
    if(!this.active||this.closed)return [];
    return this.board.anchors.map((_,id)=>id).filter(id=>canAppend(this.path,id,this.board.anchors,this.ready,this.maxVertices));
  }
  release():number[] {const result=this.closed&&this.canClose()?this.path.slice():[];this.cancel();return result;}
}
