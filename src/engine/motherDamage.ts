// Port of prototype/scripts/mother_damage.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {add,sub,scale,smooth} from '../ecology/drifter';

export const DAMAGE_DURATION=2.2, CORE_EXTENT=120;
export const CORE_UVS:readonly Point[]=[
  {x:0.389,y:0.258},{x:0.707,y:0.364},{x:0.673,y:0.632},
  {x:0.477,y:0.722},{x:0.246,y:0.550},{x:0.568,y:0.250},{x:0.360,y:0.660},
];
export const CORE_RADII=[0.061,0.063,0.060,0.065,0.061,0.059,0.058] as const;
export interface Bite {
  serial:number;enemyId:number;core:number;origin:Point;age:number;
  kind:string;nuclei:Point[];health:number;form:string;
}
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export class MotherDamage {
  lost:boolean[]=CORE_UVS.map(()=>false);
  capacity=5; bites:Bite[]=[]; serial=0;

  activeIndices():number[]{
    return [0,2,4,...(this.capacity>=4?[1]:[]),...(this.capacity>=5?[3]:[]),
      ...(this.capacity>=6?[5]:[]),...(this.capacity>=7?[6]:[])];
  }
  setCapacity(value:number):void{
    if(!Number.isFinite(value))throw new RangeError('Invalid Mother capacity');
    this.capacity=clamp(Math.trunc(value),3,7);
    const active=new Set(this.activeIndices());
    this.lost=this.lost.map((lost,i)=>active.has(i)&&lost);
    this.bites=this.bites.filter(b=>active.has(b.core));
  }
  resetFromIntegrity(integrity:number):void{
    this.lost.fill(false);this.bites=[];this.prepareIntegrity(integrity);
  }
  coreOffset(index:number):Point{return scale(sub(CORE_UVS[index],{x:0.5,y:0.5}),CORE_EXTENT);}
  prepareIntegrity(integrity:number):void{
    let missing=this.capacity-clamp(integrity,0,this.capacity);
    for(const i of this.activeIndices())if(this.lost[i])missing--;
    for(const i of this.activeIndices())if(missing>0&&!this.lost[i]){this.lost[i]=true;missing--;}
  }
  record(enemyId:number,origin:Point,center:Point,kind='drifter',nuclei:readonly Point[]=[],health=1,form=''):void{
    let nearest=-1,distance=Infinity;
    for(const i of this.activeIndices()){
      if(this.lost[i])continue;
      const offset=sub(origin,add(center,this.coreOffset(i))),d=offset.x**2+offset.y**2;
      if(d<distance){distance=d;nearest=i;}
    }
    if(nearest<0)return;
    this.lost[nearest]=true;
    this.bites.push({serial:++this.serial,enemyId,core:nearest,origin:{...origin},age:0,
      kind,nuclei:nuclei.map(p=>({...p})),health,form});
  }
  step(delta:number):void{
    for(const bite of this.bites)bite.age+=delta;
    this.bites=this.bites.filter(b=>b.age<DAMAGE_DURATION);
  }
  active():boolean{return this.bites.length>0;}
  coreProgress(index:number):number{
    if(!this.lost[index])return 0;
    const bite=this.bites.find(b=>b.core===index);
    return bite?smooth(0.54,1.56,bite.age):1;
  }
  progressValues():Float32Array{return Float32Array.from(CORE_UVS.map((_,i)=>this.coreProgress(i)));}
  recoil():number{
    let amount=0;
    for(const {age} of this.bites)amount=Math.max(amount,
      Math.sin(clamp(age/0.46,0,1)*Math.PI),0.55*Math.sin(clamp((age-0.4)/1.1,0,1)*Math.PI));
    return amount;
  }
}
