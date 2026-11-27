// Port of prototype/scripts/drifter.gd; attribution in CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
export const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
export const sub=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
export const scale=(p:Point,n:number):Point=>({x:p.x*n,y:p.y*n});
export const unit=(p:Point):Point=>{const n=Math.hypot(p.x,p.y);return n?scale(p,1/n):{x:0,y:0};};
export const smooth=(a:number,b:number,v:number):number=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
function moveToward(a:Point,b:Point,d:number):Point{
  const delta=sub(b,a),n=Math.hypot(delta.x,delta.y);return n<=d||n===0?{...b}:add(a,scale(delta,d/n));
}
export class Drifter {
  heading:Point={x:0,y:0};health:number;age=0;form='';gateIds:number[]=[];
  shieldRemaining=0;cradle=false;cradleOpenAge=-1;story='';visitor=false;
  bloomReleases=0;bloomId=-1;huntTarget=-1;huntTime=0;forageRemaining=0;foragingDone=false;
  fedRemaining=0;carriedFood=0;stunned=0;slowed=0;hitFlash=0;shieldFlash=0;
  pairAngle:number;pairSpan=30;lureVector:Point={x:0,y:0};lureElapsed=0.7;
  nucleus:Point;
  constructor(readonly id:number,position:Point,public speed:number,public kind='drifter'){
    this.nucleus={...position};this.health=kind==='shellback'?2:1;this.pairAngle=id*2.399;
  }
  nuclei():Point[]{
    if(this.kind!=='twinspore')return [{...this.nucleus}];
    const angle=this.pairAngle+Math.sin(this.age*0.35+this.id)*0.22;
    const span=this.pairSpan+Math.sin(this.age*0.65+this.id)*3;
    const axis={x:Math.cos(angle)*span,y:Math.sin(angle)*span};
    return [sub(this.nucleus,axis),add(this.nucleus,axis)];
  }
  bodyCount():number{return this.kind==='twinspore'?2:1;}
  pointValue():number{return this.kind==='shellback'?200:this.kind==='twinspore'?250:100;}
  applyPulse(damage:number):boolean{
    this.health=Math.max(0,this.health-damage);this.stunned=this.health>0?1.1:0;this.hitFlash=0.8;return this.health===0;
  }
  isBoss():boolean{return false;}
  canTakePulse():boolean{return this.health>0&&this.gateIds.length===0;}
  pullToward(center:Point,distance:number):void{this.lureVector=sub(moveToward(this.nucleus,center,distance),this.nucleus);this.lureElapsed=0;}
  advect(displacement:Point):void{this.nucleus=add(this.nucleus,displacement);}
  protected lureIncrement(delta:number):Point{
    if(this.lureElapsed>=0.7)return {x:0,y:0};
    const old=smooth(0,0.7,this.lureElapsed);this.lureElapsed=Math.min(0.7,this.lureElapsed+delta);
    return scale(this.lureVector,smooth(0,0.7,this.lureElapsed)-old);
  }
  step(delta:number,center:Point):void{
    this.age+=delta;this.hitFlash=Math.max(0,this.hitFlash-delta);this.shieldFlash=Math.max(0,this.shieldFlash-delta);
    const movementTime=Math.max(0,delta-this.stunned);this.stunned=Math.max(0,this.stunned-delta);
    const slowTime=Math.min(this.slowed,movementTime);this.slowed=Math.max(0,this.slowed-delta);
    this.heading=unit(sub(center,this.nucleus));
    const feedingTime=Math.min(this.fedRemaining,movementTime);this.fedRemaining=Math.max(0,this.fedRemaining-delta);
    this.nucleus=moveToward(this.nucleus,center,this.speed*(movementTime-slowTime*0.4)*(feedingTime>0?0.35:1));
    this.nucleus=add(this.nucleus,this.lureIncrement(delta));
  }
}
