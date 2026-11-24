// Port of prototype/scripts/water_tracers.gd; see CREDITS.md and LICENSE.
// Visual-only seeded PRNG differs from Godot; gameplay RNG is not affected.
import type {Point} from '../geometry/loopGeometry';
export const CAPACITY=960;
export interface TracerFluid {center:Point;sample(at:Point):Point}
export interface TracerLook {key:string;dustSeed:number}
export interface Mote {at:Point;velocity:Point;size:number;depth:number;phase:number;rate:number;response:number;glints:boolean}
const TAU=2*Math.PI;
function random(seed:number):()=>number{
  let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export class WaterTracers {
  motes:Mote[]=[];lastTime=-1;recipe='';visibleCount=CAPACITY;visible=true;
  sync(time:number,motion:number,fluid:TracerFluid,look:TracerLook,quality:number):void{
    if(!this.motes.length||this.recipe!==look.key||time<this.lastTime){
      this.recipe=look.key;const rng=random(look.dustSeed^0x47ad11),range=(a:number,b:number)=>a+(b-a)*rng();
      this.motes=Array.from({length:CAPACITY},(_,i)=>{
        const angle=rng()*TAU,r=Math.sqrt(range(76*76,366*366));
        const at={x:fluid.center.x+Math.cos(angle)*r,y:fluid.center.y+Math.sin(angle)*r},v=fluid.sample(at);
        return {at,velocity:{x:v.x*2.8,y:v.y*2.8},size:range(0.32,0.70),depth:range(0.45,1),phase:rng()*TAU,rate:range(0.45,1.1),response:range(0.08,0.32),glints:i%4===0};
      });
      this.lastTime=time;
    }
    const delta=clamp(time-this.lastTime,0,0.1);this.lastTime=time;
    this.visibleCount=[240,560,CAPACITY][clamp(Math.trunc(quality),0,2)];this.visible=motion>0;
    if(delta<=0||motion<=0)return;
    for(const mote of this.motes){
      const flow=fluid.sample(mote.at),scale=2.4+mote.depth*0.8,t=1-Math.exp(-delta/mote.response);
      const vx=mote.velocity.x+(flow.x*scale-mote.velocity.x)*t,vy=mote.velocity.y+(flow.y*scale-mote.velocity.y)*t;
      mote.velocity={x:vx,y:vy};mote.at={x:mote.at.x+vx*delta,y:mote.at.y+vy*delta};
      const dx=mote.at.x-fluid.center.x,dy=mote.at.y-fluid.center.y,d=Math.hypot(dx,dy);
      if(d>368||d<68){
        const nx=d?dx/d:1,ny=d?dy/d:0,r=clamp(d,68,368),dot=vx*nx+vy*ny;
        mote.at={x:fluid.center.x+nx*r,y:fluid.center.y+ny*r};
        mote.velocity={x:vx-nx*dot,y:vy-ny*dot};
      }
    }
  }
  // Each visible mote: position, rotation, speed fraction, glint flag,
  // size, depth, phase fraction and rate. A future GPU batch consumes this.
  instanceData():Float32Array{
    const data=new Float32Array((this.visible?this.visibleCount:0)*9);
    for(let i=0;i<data.length/9;i++){
      const m=this.motes[i],j=i*9;
      data.set([m.at.x,m.at.y,Math.atan2(m.velocity.y,m.velocity.x),Math.min(Math.hypot(m.velocity.x,m.velocity.y)/60,1),Number(m.glints),m.size,m.depth,m.phase/TAU,m.rate],j);
    }
    return data;
  }
}
