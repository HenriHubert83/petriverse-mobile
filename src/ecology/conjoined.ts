// Port of prototype/scripts/conjoined.gd, legacy route-based boss.
// The current journey boss behavior is a separate module. See CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {Drifter,add,sub,scale,unit,smooth} from './drifter';
export const ROUTES=[[0,8,9,1],[3,11,12,4],[5,13,14,6]] as const;
export const CYCLE=13;
const lerp=(a:Point,b:Point,t:number)=>add(a,scale(sub(b,a),t));
export class Conjoined extends Drifter {
  hitCycle=-1;attackCount=0;readonly centers:Point[];readonly axes:Point[];
  constructor(id:number,readonly board:{restAnchors:readonly Point[]}){
    super(id,{x:0,y:0},0,'conjoined');this.health=3;
    this.centers=ROUTES.map(route=>scale(route.reduce((sum,id)=>add(sum,board.restAnchors[id]),{x:0,y:0}),1/route.length));
    this.axes=ROUTES.map(route=>unit(sub(board.restAnchors[route[2]],board.restAnchors[route[1]])));
    this.nucleus={...this.centers[0]};
  }
  cycleIndex():number{return Math.floor(this.age/CYCLE);}
  phase():number{return this.age%CYCLE;}
  contraction():number{return smooth(3,5,this.phase())*(1-smooth(10,12.5,this.phase()));}
  override canTakePulse():boolean{return this.health>0&&this.hitCycle!==this.cycleIndex();}
  private route(){const current=this.cycleIndex()%this.centers.length;return {current,previous:(current+this.centers.length-1)%this.centers.length,travel:this.age>=CYCLE?smooth(0,3,this.phase()):1};}
  override nuclei():Point[]{
    const {current,previous,travel}=this.route(),axis=unit(lerp(this.axes[previous],this.axes[current],travel));
    const separation=82+(27-82)*this.contraction(),offset=scale(axis,separation);
    return [sub(this.nucleus,offset),add(this.nucleus,offset)];
  }
  override step(delta:number,_center:Point):void{
    this.age+=delta;this.hitFlash=Math.max(0,this.hitFlash-delta);this.shieldFlash=Math.max(0,this.shieldFlash-delta);
    const {current,previous,travel}=this.route();this.nucleus=lerp(this.centers[previous],this.centers[current],travel);
  }
  override applyPulse(_damage:number):boolean{
    if(!this.canTakePulse())return false;
    this.health=Math.max(0,this.health-1);this.hitCycle=this.cycleIndex();this.hitFlash=1.3;return this.health===0;
  }
  attackDue():boolean{const due=this.cycleIndex()+1;if(due<=this.attackCount)return false;this.attackCount=due;return true;}
  override isBoss():boolean{return true;}
  override bodyCount():number{return 0;}
}
