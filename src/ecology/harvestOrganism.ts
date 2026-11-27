// Port of prototype/scripts/harvest_organism.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {Drifter,add,sub,scale,unit,smooth} from './drifter';
export const LIFETIME=27,NUDGE_DURATION=1.25;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export class HarvestOrganism extends Drifter {
  origin:Point;drift:Point;phase:number;
  nudgeVector:Point={x:0,y:0};nudgeElapsed=NUDGE_DURATION;
  constructor(id:number,species:string,position:Point,driftExtent:Point,seedPhase:number){
    super(id,position,0,species);this.origin={...position};this.drift={...driftExtent};this.phase=seedPhase;
  }
  startNudge(displacement:Point):void{this.nudgeVector={...displacement};this.nudgeElapsed=0;}
  nudgeEase(seconds:number):number{return 1-(1-clamp(seconds/NUDGE_DURATION))**3;}
  nudgeRoll():number{return Math.sin(clamp(this.nudgeElapsed/NUDGE_DURATION)*Math.PI)*0.75*(this.nudgeVector.y>=0?1:-1);}
  positionAt(seconds:number,_center:Point):Point{
    const x=Math.sin(seconds*0.12+this.phase)-Math.sin(this.phase);
    const y=Math.sin(seconds*0.16+this.phase*1.7)-Math.sin(this.phase*1.7);
    return add(this.origin,{x:x*this.drift.x,y:y*this.drift.y});
  }
  override advect(displacement:Point):void{this.origin=add(this.origin,displacement);super.advect(displacement);}
  override step(delta:number,center:Point):void{
    this.age+=delta;
    if(this.nudgeElapsed<NUDGE_DURATION){
      const previous=this.nudgeEase(this.nudgeElapsed);
      this.nudgeElapsed=Math.min(NUDGE_DURATION,this.nudgeElapsed+delta);
      this.origin=add(this.origin,scale(this.nudgeVector,this.nudgeEase(this.nudgeElapsed)-previous));
    }
    this.origin=add(this.origin,this.lureIncrement(delta));
    const destination=this.positionAt(this.age,center);this.heading=unit(sub(destination,this.nucleus));this.nucleus=destination;
  }
  lifetime():number{return this.cradle?Math.max(90,this.cradleOpenAge+16):this.visitor?72:this.story==='hatchling'?40:LIFETIME;}
  hatchRemaining():number{return this.cradle&&this.cradleOpenAge>=0&&this.gateIds.length===0?Math.max(0,12-(this.age-this.cradleOpenAge)):-1;}
  opening():number{const cycle=this.age%18;return smooth(0,4,cycle)*(1-smooth(11,17,cycle));}
  opacity():number{return 1-smooth(this.lifetime()-3,this.lifetime(),this.age);}
}
