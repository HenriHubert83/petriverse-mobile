// Port of prototype/scripts/ecology_enemy.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {Drifter,sub,unit,add,scale} from './drifter';
export class EcologyEnemy extends Drifter {
  destination:Point;targetId=-1;targetNode=-1;siteNodes:number[]=[];latched=false;
  actionClock=0;storedFood=0;daughter=false;sector:number;spawning=2.5;
  constructor(id:number,species:string,position:Point,area=0){
    super(id,position,7,species);this.destination={...position};this.sector=area;
    this.speed=({grazer:8,parasite:7,divider:5.5,warden:0} as Record<string,number>)[species]??7;
  }
  override step(delta:number,center:Point):void{
    this.age+=delta;this.hitFlash=Math.max(0,this.hitFlash-delta);this.shieldFlash=Math.max(0,this.shieldFlash-delta);
    const liveTime=Math.max(0,delta-this.spawning);this.spawning=Math.max(0,this.spawning-delta);
    this.stunned=Math.max(0,this.stunned-delta);this.slowed=Math.max(0,this.slowed-delta);
    if(liveTime<=0||this.stunned>0)return;
    if(this.kind==='divider')this.destination={...center};
    else if(this.kind==='warden'||this.latched)return;
    const diff=sub(this.destination,this.nucleus),length=Math.hypot(diff.x,diff.y);
    if(length*length>0.01)this.heading=unit(diff);
    const distance=this.speed*liveTime*(this.slowed>0?0.6:1);
    this.nucleus=length<=distance||length===0?{...this.destination}:add(this.nucleus,scale(diff,distance/length));
  }
  splitRemaining():number{return Math.max(0,20-this.age);}
  opacity():number{return 1;}
}
