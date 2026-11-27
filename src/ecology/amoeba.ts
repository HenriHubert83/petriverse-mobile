// Port of prototype/scripts/amoeba.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {Drifter,add,sub,scale,unit,smooth} from './drifter';
export const REACH_TIME=2.8,RESCUE_TIME=15;
export type AmoebaPhase='seeking'|'approaching'|'reaching'|'digesting'|'sated';
export class Amoeba extends Drifter {
  phase:AmoebaPhase='seeking';targetNode=-1;captiveNode=-1;siteNodes:number[]=[];
  destination:Point;reachPoint:Point;ingestAxis:Point={x:1,y:0};
  reachAge=0;digestionAge=0;restAge=0;armExtension=0;victimHome:Point={x:0,y:0};searchAfter=3.2;
  constructor(id:number,at:Point){super(id,at,6,'amoeba');this.destination={...at};this.reachPoint=add(at,{x:60,y:0});}
  override step(delta:number,_center:Point):void{
    const previous=this.crawlPhase();this.age+=delta;this.hitFlash=Math.max(0,this.hitFlash-delta);this.stunned=Math.max(0,this.stunned-delta);
    const diff=sub(this.destination,this.nucleus);this.heading=unit(diff);
    if((this.phase==='seeking'||this.phase==='approaching')&&this.stunned<=0){
      const distance=Math.max(0,this.speed*(delta+0.5/0.85*(Math.cos(previous-1.2)-Math.cos(this.crawlPhase()-1.2))));
      const length=Math.hypot(diff.x,diff.y);
      this.nucleus=length<=distance||length===0?{...this.destination}:add(this.nucleus,scale(diff,distance/length));
    }
    const extension=this.phase==='reaching'?1:this.phase==='digesting'?Math.max(0,1-this.digestionAge/1.1):0;
    const gap=extension-this.armExtension;this.armExtension+=Math.sign(gap)*Math.min(Math.abs(gap),delta*1.5);
  }
  crawlPhase():number{return this.age*0.85+this.id*0.71;}
  rescueRemaining():number{return this.captiveNode>=0?Math.max(0,RESCUE_TIME-this.digestionAge):0;}
  mealProgress():number{return Math.max(0,Math.min(1,this.digestionAge/RESCUE_TIME));}
  captivePosition(reduced=false):Point{
    let inside=add(this.nucleus,scale(this.ingestAxis,22));
    if(!reduced)inside=add(inside,scale({x:this.ingestAxis.y,y:-this.ingestAxis.x},Math.sin(this.digestionAge*1.1+this.id)*2.2));
    return reduced?inside:add(this.victimHome,scale(sub(inside,this.victimHome),smooth(0,1.1,this.digestionAge)));
  }
  opacity():number{return 1;}
}
