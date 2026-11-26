import type {EncounterSimulation,CaptureResult} from '../engine/encounterSimulation';
import type {Point} from '../geometry/loopGeometry';
import {boardViewport,toBoard,transformViewport,viewportZoom} from './boardViewport';
import type {BoardViewport} from './boardViewport';
import {MIN_DRAG} from '../ecology/cystNudge';

type PointerId=number|string;
export interface TouchPoint extends Point {id:PointerId}
interface CameraGesture {ids:[PointerId,PointerId];view:BoardViewport;center:Point;distance:number}
const midpoint=(a:Point,b:Point):Point=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

// One finger draws or nudges. Two fingers own the camera until every finger is
// lifted, so dropping back to one can never release a half-drawn capture loop.
export class TouchController {
  view:BoardViewport;
  private pointer:PointerId|undefined;private previous:Point|undefined;private mode:'loop'|'nudge'|'tap'|undefined;
  private clickMode=false;
  private camera:CameraGesture|undefined;private blocked=false;private interrupted=false;
  constructor(readonly run:EncounterSimulation){this.view=boardViewport(0,0,run.board.center,run.board.dishRadius);}
  configure(options:{clickMode:boolean;assistedClosure:boolean}):void{
    if(this.clickMode!==options.clickMode)this.cancel();
    this.clickMode=options.clickMode;this.run.selection.assistedClosure=options.assistedClosure;
  }
  captureSelection():CaptureResult|undefined{
    if(!this.clickMode||this.run.state!=='active'||!this.run.selection.closed)return;
    return this.run.release();
  }
  get zoom():number{return viewportZoom(this.view,this.run.board.center,this.run.board.dishRadius);}
  resize(width:number,height:number):void{
    if(width===this.view.width&&height===this.view.height)return;
    this.cancel();this.view=boardViewport(width,height,this.run.board.center,this.run.board.dishRadius);this.updatePadding();
  }
  resetView():void{
    this.cancel();this.view=boardViewport(this.view.width,this.view.height,this.run.board.center,this.run.board.dishRadius);this.updatePadding();
  }
  zoomBy(ratio:number):void{
    this.cancel();const center={x:this.view.width/2,y:this.view.height/2};
    this.view=transformViewport(this.view,ratio,center,center,this.run.board.center,this.run.board.dishRadius);this.updatePadding();
  }
  private updatePadding():void{
    // A minimum screen-space hit target, including when the camera is enlarged.
    this.run.selection.hitPadding=this.view.scale>0?Math.max(0,14/this.view.scale-this.run.board.hitRadius):0;
  }
  private cancelGameplay(preserve=false):void{
    this.pointer=undefined;this.previous=undefined;this.mode=undefined;
    if(!preserve){this.run.selection.cancel();this.run.nudge.cancel();}
  }
  // A fresh native responder grant begins a new group, including after an OS
  // termination that never delivered the previous group's final finger release.
  startTouches(points:readonly TouchPoint[],fresh=false):void{
    if(fresh){this.cancelGameplay(this.clickMode&&!this.blocked&&!this.interrupted);this.camera=undefined;this.blocked=false;this.interrupted=false;}
    if(this.run.state!=='active'){this.cancel();return;}
    if(this.interrupted)return;
    if(points.length>=2){this.moveCamera(points);return;}
    if(points.length===1&&!this.blocked&&this.pointer===undefined)this.begin(points[0].id,points[0]);
  }
  moveTouches(points:readonly TouchPoint[]):void{
    if(this.run.state!=='active'){this.cancel();return;}
    if(this.interrupted)return;
    if(points.length>=2){this.moveCamera(points);return;}
    this.camera=undefined;
    if(this.blocked)return;
    if(points.length===1)this.move(points[0].id,points[0]);
  }
  endTouches(remaining:readonly TouchPoint[],ended:readonly TouchPoint[]):CaptureResult|undefined{
    let result:CaptureResult|undefined;
    if(this.run.state!=='active')this.cancel();
    if(!this.blocked){
      const point=ended.find(p=>p.id===this.pointer);
      if(point)result=this.end(point.id,point);
    }
    if(remaining.length===0){this.cancelGameplay(this.clickMode&&!this.blocked&&!this.interrupted);this.camera=undefined;this.blocked=false;this.interrupted=false;}
    else if(remaining.length<2)this.camera=undefined;
    else if(!this.interrupted)this.moveCamera(remaining);
    return result;
  }
  private moveCamera(points:readonly TouchPoint[]):void{
    this.cancelGameplay();this.blocked=true;
    let a=this.camera&&points.find(p=>p.id===this.camera!.ids[0]),b=this.camera&&points.find(p=>p.id===this.camera!.ids[1]);
    if(!this.camera||!a||!b){
      [a,b]=points;this.camera={ids:[a.id,b.id],view:{...this.view},center:midpoint(a,b),distance:Math.max(1,distance(a,b))};return;
    }
    this.view=transformViewport(this.camera.view,Math.max(1,distance(a,b))/this.camera.distance,this.camera.center,midpoint(a,b),this.run.board.center,this.run.board.dishRadius);
    this.updatePadding();
  }
  begin(id:PointerId,point:Point,touches=1):boolean{
    if(touches!==1||this.pointer!==undefined){this.cancel();return false;}
    if(this.blocked)return false;
    const at=toBoard(point,this.view);if(!at||this.run.state!=='active')return false;
    if(this.clickMode&&this.run.nudge.targetId>=0){
      this.run.nudge.release(this.run,at);this.pointer=id;this.previous=at;this.mode='tap';return true;
    }
    if(this.clickMode&&this.run.selection.active){
      let nearest=this.run.board.hitRadius+this.run.selection.hitPadding,anchorId=-1;
      this.run.board.anchors.forEach((anchor,index)=>{const d=distance(anchor,at);if(d<nearest){nearest=d;anchorId=index;}});
      this.run.selection.visit(anchorId);this.run.selection.closeNearStart(at);
      this.pointer=id;this.previous=at;this.mode='tap';return true;
    }
    this.run.selection.start(at);
    if(this.run.selection.active)this.mode=this.clickMode?'tap':'loop';
    else if(this.run.nudge.begin(this.run,at))this.mode='nudge';else return false;
    this.pointer=id;this.previous=at;return true;
  }
  move(id:PointerId,point:Point,touches=1):void{
    if(this.blocked||touches!==1||id!==this.pointer||this.run.state!=='active'){this.cancel();return;}
    const at=toBoard(point,this.view);if(!at){this.cancel();return;}
    if(this.mode==='nudge')this.run.nudge.point(at);
    else if(this.mode==='loop'&&this.previous){this.run.fluid.stroke(this.previous,at);this.run.selection.drag(this.previous,at);}
    this.previous=at;
  }
  end(id:PointerId,point:Point):CaptureResult|undefined{
    if(this.blocked||id!==this.pointer||this.run.state!=='active'){this.cancel();return;}
    const at=toBoard(point,this.view);if(!at){this.cancel();return;}
    this.move(id,point);
    let result:CaptureResult|undefined;
    if(this.mode==='nudge'){
      if(!this.clickMode||distance(at,this.run.nudge.pointerOrigin)>=MIN_DRAG)this.run.nudge.release(this.run,at);
    }else if(this.mode==='loop'){this.run.selection.closeNearStart(at);result=this.run.release();}
    this.pointer=undefined;this.previous=undefined;this.mode=undefined;return result;
  }
  cancel():void{if(this.pointer!==undefined||this.camera||this.blocked){this.blocked=true;this.interrupted=true;}this.cancelGameplay();this.camera=undefined;}
}
