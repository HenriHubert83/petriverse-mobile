import type {EncounterSimulation,CaptureResult} from '../engine/encounterSimulation';
import type {Point} from '../geometry/loopGeometry';
import {boardViewport,toBoard} from './boardViewport';
import type {BoardViewport} from './boardViewport';

// Native events enter one coordinate system and one owned pointer. Interruptions
// always cancel rather than releasing a potentially stale membrane.
export class TouchController {
  view:BoardViewport;
  private pointer:number|string|undefined;private previous:Point|undefined;private mode:'loop'|'nudge'|undefined;
  constructor(readonly run:EncounterSimulation){this.view=boardViewport(0,0,run.board.center,run.board.dishRadius);}
  resize(width:number,height:number):void{
    this.cancel();this.view=boardViewport(width,height,this.run.board.center,this.run.board.dishRadius);
    // Slightly larger selection targets on small screens; capture geometry is unchanged.
    this.run.selection.hitPadding=this.view.scale>0?Math.max(0,14/this.view.scale-this.run.board.hitRadius):0;
  }
  begin(id:number|string,point:Point,touches=1):boolean{
    if(touches!==1||this.pointer!==undefined){this.cancel();return false;}
    const at=toBoard(point,this.view);if(!at||this.run.state!=='active')return false;
    this.run.selection.start(at);
    if(this.run.selection.active)this.mode='loop';
    else if(this.run.nudge.begin(this.run,at))this.mode='nudge';else return false;
    this.pointer=id;this.previous=at;return true;
  }
  move(id:number|string,point:Point,touches=1):void{
    if(touches!==1||id!==this.pointer||this.run.state!=='active'){this.cancel();return;}
    const at=toBoard(point,this.view);if(!at){this.cancel();return;}
    if(this.mode==='nudge')this.run.nudge.point(at);
    else if(this.previous){this.run.fluid.stroke(this.previous,at);this.run.selection.drag(this.previous,at);}
    this.previous=at;
  }
  end(id:number|string,point:Point):CaptureResult|undefined{
    if(id!==this.pointer||this.run.state!=='active'){this.cancel();return;}
    const at=toBoard(point,this.view);if(!at){this.cancel();return;}
    this.move(id,point);
    let result:CaptureResult|undefined;
    if(this.mode==='nudge')this.run.nudge.release(this.run,at);
    else {this.run.selection.closeNearStart(at);result=this.run.release();}
    this.pointer=undefined;this.previous=undefined;this.mode=undefined;return result;
  }
  cancel():void{this.pointer=undefined;this.previous=undefined;this.mode=undefined;this.run.selection.cancel();this.run.nudge.cancel();}
}
