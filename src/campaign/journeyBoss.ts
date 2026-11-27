// Port of prototype/scripts/journey_boss.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {Conjoined} from '../ecology/conjoined';
import {add,sub,scale,unit,smooth} from '../ecology/drifter';

export const BREATH_CYCLE=24, INHALE=8, SHIELD_WINDOW=18;
export type BossVariant=0|1|2;
export class JourneyBoss extends Conjoined {
  openRemaining=0;resetRemaining=0;roundIndex=0;patternTime=0;juvenile=false;
  constructor(id:number,board:{restAnchors:readonly Point[]},readonly variant:BossVariant){
    super(id,board);this.kind=['bellwether','regent','conjoined'][variant];
  }
  override isBoss():boolean{return !this.juvenile;}
  override nuclei():Point[]{
    if(this.variant<2)return [{...this.nucleus}];
    const current=this.roundIndex%this.axes.length;
    let axis=this.axes[current];
    if(this.resetRemaining>0){
      const previous=this.axes[(current+this.axes.length-1)%this.axes.length];
      axis=unit(add(previous,scale(sub(axis,previous),smooth(0,3,4-this.resetRemaining))));
    }
    const wide=78+16*Math.min(this.roundIndex,2),separation=wide+(27-wide)*this.contraction();
    return [sub(this.nucleus,scale(axis,separation)),add(this.nucleus,scale(axis,separation))];
  }
  override canTakePulse():boolean{
    return this.health>0&&this.resetRemaining<=0&&(this.variant===2||this.openRemaining>0);
  }
  secondsUntilOpen():number{
    if(this.resetRemaining>0)return this.resetRemaining;
    return this.variant===0?Math.max(0,INHALE-this.phase()):0;
  }
  secondsUntilClose():number{return this.openRemaining;}
  currentStrength():number{
    return this.variant===0&&this.resetRemaining<=0&&this.phase()<INHALE?Math.sin(this.phase()/INHALE*Math.PI):0;
  }
  statusText():string{
    if(this.resetRemaining>0)return `REFORMING · ${Math.ceil(this.resetRemaining)}s`;
    if(this.variant===2)return this.contraction()>0.8?'HEARTS TOGETHER':'HEARTS APART';
    if(this.canTakePulse())return `OPEN · ${Math.ceil(this.openRemaining)}s LEFT`;
    if(this.variant===0)return `INHALING · OPENS IN ${Math.ceil(this.secondsUntilOpen())}s`;
    return this.shieldRemaining>0?`LAST SHIELD · ${Math.ceil(this.shieldRemaining)}s`:`CAPTURE ${this.gateIds.length} SHIELDS`;
  }
  override cycleIndex():number{return this.roundIndex;}
  override phase():number{return this.patternTime%BREATH_CYCLE;}
  override contraction():number{
    if(this.variant===2){
      const phase=Math.min(this.roundIndex,2);
      return smooth(1,6+phase,this.phase())*(1-smooth(18-phase,23,this.phase()));
    }
    return this.variant===0?this.currentStrength():0;
  }
  override applyPulse(_damage:number):boolean{
    if(!this.canTakePulse())return false;
    this.health=Math.max(0,this.health-1);this.hitFlash=1.3;
    this.openRemaining=0;this.resetRemaining=4;this.patternTime=0;this.roundIndex++;
    return this.health===0;
  }
  override step(delta:number,_center:Point):void{
    this.age+=delta;this.hitFlash=Math.max(0,this.hitFlash-delta);this.shieldFlash=Math.max(0,this.shieldFlash-delta);
    const remaining=Math.max(0,delta-this.resetRemaining);
    this.resetRemaining=Math.max(0,this.resetRemaining-delta);this.patternTime+=remaining;
    if(this.variant===0)this.openRemaining=this.phase()>=INHALE&&this.resetRemaining<=0?BREATH_CYCLE-this.phase():0;
    else if(this.variant===1)this.openRemaining=Math.max(0,this.openRemaining-delta);
    if(!this.juvenile){
      const to=this.centers[this.roundIndex%this.centers.length],diff=sub(to,this.nucleus);
      this.nucleus=Math.hypot(diff.x,diff.y)<=delta*90?{...to}:add(this.nucleus,scale(unit(diff),delta*90));
    }
  }
}
