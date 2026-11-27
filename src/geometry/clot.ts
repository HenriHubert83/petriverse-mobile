// Port of prototype/scripts/clot.gd; see CREDITS.md and LICENSE.
import type {Point} from './loopGeometry';
import type {Cell} from './cell';
const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a:Point,s:number):Point=>({x:a.x*s,y:a.y*s});
const length=(a:Point)=>Math.hypot(a.x,a.y);
const unit=(a:Point):Point=>length(a)>0?mul(a,1/length(a)):{x:0,y:0};
const lerp=(a:Point,b:Point,t:number)=>add(a,mul(sub(b,a),t));
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,t:number)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
export function easeInFluid(start:number,finish:number,value:number):number{
  const u=clamp((value-start)/(finish-start));return u*u*u*(u*(u*6-15)+10);
}
export interface ClotResult {
  nodes:readonly number[];polygon:readonly Point[];positions:readonly Point[];
  preyKinds?:readonly string[];preyForms?:readonly string[];food?:number;poison?:number;
  mastery?:readonly unknown[];restoredNode?:number;
}
export class Clot {
  readonly nodes:number[];readonly polygon:Point[];readonly positions:Point[];
  readonly members:Cell[];readonly duration:number;readonly center:Point;readonly destinations:Point[];
  readonly preyKinds:string[];readonly preyForms:string[];readonly food:number;readonly poison:number;
  readonly mastery:unknown[];readonly restoredNode:number;
  constructor(readonly serial:number,result:ClotResult,cells:readonly Cell[],mother:Point,savedDuration?:number){
    this.nodes=result.nodes.slice();this.polygon=result.polygon.map(p=>({...p}));
    this.positions=result.positions.map(p=>({...p}));this.preyKinds=[...(result.preyKinds??[])];
    this.preyForms=[...(result.preyForms??[])];this.food=result.food??0;this.poison=result.poison??0;
    this.mastery=[...(result.mastery??[])];this.restoredNode=result.restoredNode??-1;
    const index=this.nodes.indexOf(this.restoredNode);
    if(index>=0){this.nodes.splice(index,1);this.polygon.splice(index,1);}
    if(!this.nodes.length||this.nodes.length!==this.polygon.length||this.nodes.some(id=>!cells[id]))throw Error('Invalid recovery group');
    this.members=this.nodes.map(id=>cells[id]);this.duration=savedDuration??this.members[0].duration;
    const points=this.positions.length?this.positions:this.polygon;
    let center=mul(points.reduce(add,{x:0,y:0}),1/points.length);
    let outward=sub(center,mother);
    if(length(outward)<112){if(length(outward)**2<1)outward=sub(this.polygon[0],mother);center=add(mother,mul(unit(outward),112));}
    this.center=center;
    let winding=0;for(let i=0;i<this.polygon.length;i++){const a=this.polygon[i],b=this.polygon[(i+1)%this.polygon.length];winding+=a.x*b.y-a.y*b.x;}
    const start=Math.atan2(this.polygon[0].y-center.y,this.polygon[0].x-center.x);
    const radius=this.nodes.length*0.75;
    this.destinations=this.nodes.map((_,i)=>{const a=start+Math.sign(winding)*2*Math.PI*i/this.nodes.length;return add(center,{x:Math.cos(a)*radius,y:Math.sin(a)*radius});});
  }
  get age():number{return this.duration-this.members[0].remaining;}
  progress():number{return this.members[0].progress();}
  finished():boolean{return this.members[0].isReady();}
  amount():number{const t=this.progress();return easeInFluid(0,0.27,t)*(1-easeInFluid(0.56,1,t));}
  digestion():number{const t=this.progress();return smooth(0.22,0.36,t)*(1-smooth(0.53,0.66,t));}
  cellPosition(index:number,reducedMotion=false):Point{
    const origin=this.polygon[index];if(reducedMotion)return {...origin};
    const t=this.progress(),lag=(this.nodes[index]*7%5)*0.006;
    const pull=easeInFluid(lag,0.27,t)*(1-easeInFluid(0.56+lag,1,t));
    const goal=this.destinations[index],v=sub(goal,origin),curl=this.nodes[index]%2===0?1:-1;
    const curve=mul(unit({x:v.y,y:-v.x}),Math.sin(pull*Math.PI)*curl*(6+index%3*2));
    const pulse=mul(unit(sub(goal,this.center)),Math.sin(this.age*5+index*0.8)*1.2*this.digestion());
    return add(lerp(origin,add(goal,pulse),pull),curve);
  }
  cellPositions(reducedMotion=false):Point[]{return this.nodes.map((_,i)=>this.cellPosition(i,reducedMotion));}
  preyPosition(index:number,reducedMotion=false):Point{return reducedMotion?{...this.positions[index]}:lerp(this.positions[index],this.center,smooth(0,0.30,this.progress()));}
}
