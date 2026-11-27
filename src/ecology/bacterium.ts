// Port of prototype/scripts/bacterium.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {EcologyEnemy} from './ecologyEnemy';
export const INFECTION_TIME=9;
export class Bacterium extends EcologyEnemy {
  infectionAge=-1;
  constructor(id:number,position:Point,area=0){super(id,'bacterium',position,area);this.speed=7;}
  override step(delta:number,center:Point):void{
    super.step(delta,center);
    if(this.infectionAge>=0){this.infectionAge+=delta;this.slowed=0.5;}
  }
  infectionRemaining():number{return Math.max(0,INFECTION_TIME-this.infectionAge);}
}
