// Port of prototype/scripts/cyst_nudge.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {Drifter,add,sub,scale} from './drifter';
import {HarvestOrganism} from './harvestOrganism';
import {PhageCluster} from './phageCluster';
import {arrivalProgress} from './organismArrival';
export const RANGE=60,COOLDOWN=6,MIN_DRAG=8,HIT_RADIUS=23;
const zero=():Point=>({x:0,y:0});
const len=(p:Point)=>Math.hypot(p.x,p.y);
const dist=(a:Point,b:Point)=>len(sub(a,b));
const limit=(p:Point,max:number):Point=>{const n=len(p);return n>max&&n>0?scale(p,max/n):p;};
export interface NudgeContext {
  journey:boolean;state:string;enemies:Drifter[];phages:{clusters:PhageCluster[]};
  selection:{active:boolean;cancel():void};
  board:{center:Point;dishRadius:number;hitTest(point:Point):number};
  isReady(id:number):boolean;boss():Drifter|undefined|null;lessonActive():boolean;
}
export class CystNudge {
  cooldown=0;learned=false;rippleOrigin=zero();rippleVector=zero();
  targetId=-1;pointerOrigin=zero();aim=zero();
  cancel():void{this.targetId=-1;this.aim=zero();}
  resetEncounter():void{this.cancel();this.cooldown=0;this.rippleVector=zero();}
  step(delta:number,run:NudgeContext):void{
    this.cooldown=Math.max(0,this.cooldown-delta);
    if(this.targetId>=0&&!this.target(run))this.cancel();
  }
  eligible(body:Drifter):body is HarvestOrganism {
    return body instanceof HarvestOrganism&&(body.kind==='cyst'||(body instanceof PhageCluster&&body.hostId<0))&&arrivalProgress(body)>0.8&&body.opacity()>0.3;
  }
  target(run:NudgeContext):HarvestOrganism|undefined{
    return [...run.enemies,...run.phages.clusters].find((b):b is HarvestOrganism=>b.id===this.targetId&&this.eligible(b));
  }
  cellHasPriority(run:NudgeContext,at:Point):boolean{const id=run.board.hitTest(at);return id>=0&&run.isReady(id);}
  pick(run:NudgeContext,at:Point):HarvestOrganism|undefined{
    if(!run.journey||run.state!=='active'||run.selection.active||this.cellHasPriority(run,at))return;
    let best:HarvestOrganism|undefined,distance=Infinity;
    for(const body of [...run.enemies,...run.phages.clusters]){
      if(!this.eligible(body))continue;const d=dist(body.nucleus,at);
      if(d<Math.min(distance,body.kind==='phage'?32:HIT_RADIUS)){best=body;distance=d;}
    }
    return best;
  }
  begin(run:NudgeContext,at:Point):boolean{
    const body=this.pick(run,at);if(!body||this.cooldown>0)return false;
    run.selection.cancel();this.targetId=body.id;this.pointerOrigin={...at};this.aim=zero();return true;
  }
  point(at:Point):void{this.aim=limit(sub(at,this.pointerOrigin),RANGE);}
  displacement(run:NudgeContext):Point{
    const b=this.target(run);if(!b)return zero();
    const radius=Math.max(0,run.board.dishRadius-24-len(b.drift)*2),start=b.nucleus;
    const finish=add(run.board.center,limit(sub(add(start,this.aim),run.board.center),radius));
    const move=limit(sub(finish,start),RANGE);
    return move.x*this.aim.x+move.y*this.aim.y>0?move:zero();
  }
  release(run:NudgeContext,at:Point):{from:Point;to:Point;kind:string}|undefined{
    this.point(at);const body=this.target(run),move=this.displacement(run);
    if(run.state!=='active'||!body||this.cooldown>0||len(this.aim)<MIN_DRAG||len(move)<MIN_DRAG){this.cancel();return;}
    this.rippleOrigin={...body.nucleus};this.rippleVector=move;body.startNudge(move);
    this.cooldown=COOLDOWN;this.learned=true;this.cancel();
    return {from:this.rippleOrigin,to:add(this.rippleOrigin,move),kind:body.kind};
  }
  teachingTarget(run:NudgeContext):HarvestOrganism|undefined{
    if(this.learned||this.cooldown>0||run.selection.active||run.boss()||run.lessonActive())return;
    for(const cyst of run.enemies){
      if(cyst.kind!=='cyst'||!this.eligible(cyst)||this.cellHasPriority(run,cyst.nucleus))continue;
      if(run.enemies.some(food=>food.kind==='food'&&dist(cyst.nucleus,food.nucleus)<65))return cyst;
    }
  }
}
