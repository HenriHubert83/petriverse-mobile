// Original public Producer Lab rules, pinned producer_lab_rules.gd. See CREDITS.md.
import type {Point} from '../geometry/loopGeometry';
import {SeededRandom} from '../engine/seededRandom';
import {add,sub,scale,unit} from '../ecology/drifter';

export const BROOD_TOTAL=3,BROOD_SAFE_NEEDED=2,ESCORT_SECONDS=90,CURRENT_GOAL=8,CURRENT_SECONDS=75,BOSS_HEALTH=3;
export type CurrentChoice='channel'|'shelter';
export interface CurrentLayout {food:Point[];cysts:Point[];pockets:Point[];laneY:number;choice:CurrentChoice}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const lerp=(a:Point,b:Point,t:number)=>add(a,scale(sub(b,a),t));

export class Escort {
  arrived=0;rescued=0;lost=0;
  safeCount():number{return this.arrived+this.rescued;}
  remaining():number{return BROOD_TOTAL-this.arrived-this.rescued-this.lost;}
  recordArrival():void{this.arrived++;}
  recordRescued():void{this.rescued++;}
  recordLost():void{this.lost++;}
  isWon():boolean{return this.arrived>=1&&this.safeCount()>=BROOD_SAFE_NEEDED;}
  isDoomed():boolean{return this.safeCount()+this.remaining()<BROOD_SAFE_NEEDED||(this.arrived===0&&this.remaining()===0);}
}
export function arcPoint(center:Point,t:number):Point {
  const a=add(center,{x:-262,y:-118}),c=add(center,{x:0,y:-238}),b=add(center,{x:262,y:-142}),u=Math.max(0,Math.min(1,t));
  return lerp(lerp(a,c,u),lerp(c,b,u),u);
}
export function escortArc(center:Point):Point[]{return Array.from({length:25},(_,i)=>arcPoint(center,i/24));}
export function currentLayout(choice:CurrentChoice,center:Point,seed=12345):CurrentLayout {
  const rng=new SeededRandom(seed),food:Point[]=[],cysts:Point[]=[];
  const pockets=choice==='channel'?[add(center,{x:0,y:-150})]:[
    add(center,{x:-205,y:-135}),add(center,{x:15,y:-215}),add(center,{x:215,y:-105})];
  if(choice==='channel'){
    for(let i=0;i<9;i++)food.push(add(center,{x:-270+i*62+rng.float(-9,9),y:-150+rng.float(-16,16)}));
    for(let i=0;i<4;i++)cysts.push(add(center,{x:[-230,-155,155,230][i]+rng.float(-8,8),y:-92+rng.float(-8,8)}));
  }else{
    for(const p of pockets)for(let i=0;i<3;i++)food.push(add(p,{x:rng.float(-30,30),y:rng.float(-22,22)}));
    for(let i=0;i<4;i++)cysts.push(add(center,{x:-150+i*95,y:175+rng.float(-10,10)}));
  }
  return {food,cysts,pockets,laneY:center.y-150,choice};
}
export function currentVelocity(choice:CurrentChoice,at:Point,center:Point,time:number):Point {
  if(distance(at,center)<135)return {x:0,y:0};
  if(choice==='channel')return Math.abs(at.y-(center.y-150))<52?{x:30,y:Math.sin(time*0.7+at.x*0.01)*3}:{x:2,y:0};
  const pockets=[add(center,{x:-205,y:-135}),add(center,{x:15,y:-215}),add(center,{x:215,y:-105})];
  let best=pockets[0];for(const p of pockets)if(distance(at,p)<distance(at,best))best=p;
  const offset=sub(at,best);if(Math.hypot(offset.x,offset.y)>95)return {x:0,y:0};
  // Godot Vector2.orthogonal() is (y, -x).
  return scale(unit({x:offset.y,y:-offset.x}),6);
}
export function insideDish(at:Point,center:Point,radius=392):boolean {
  const d=distance(at,center);return d<radius-28&&d>118;
}
export class BossPhase {
  health=BOSS_HEALTH;phaseBroken=false;breakCount=0;openingCreated=false;
  shieldAnchors(bossAt:Point):Point[]{return this.phaseBroken?
    [add(bossAt,{x:-118,y:62}),add(bossAt,{x:118,y:62})]:[add(bossAt,{x:-72,y:-52}),add(bossAt,{x:72,y:-52})];}
  applyHit():boolean {
    if(this.health<=0)return true;this.health--;
    if(!this.phaseBroken){this.phaseBroken=true;this.breakCount++;this.openingCreated=true;}
    return this.health===0;
  }
  defeated():boolean{return this.health<=0;}
}
