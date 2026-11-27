// Presentation-only wake field from prototype/scripts/water_interaction.gd.
// See CREDITS.md and LICENSE. Separate from the gameplay FluidField.
import type {Point} from '../geometry/loopGeometry';
import type {WaterSource} from '../engine/fluidField';
export const LIMIT=6,LIFETIME=3.2;
export type Stroke=readonly [number,number,number,number];
export interface WakeSample {strokes:Stroke[];strengths:Float32Array}
type Wake={from:Point;to:Point;time:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export class WaterInteraction {
  wakes:Wake[]=[];
  stroke(from:Point,to:Point,time:number):void{
    if(Math.hypot(from.x-to.x,from.y-to.y)<5)return;
    this.wakes.push({from:{...from},to:{...to},time});while(this.wakes.length>LIMIT)this.wakes.shift();
  }
  sample(time:number,reduced:boolean):WakeSample{
    if(reduced)this.wakes=[];
    this.wakes=this.wakes.filter(w=>time-w.time<LIFETIME&&time>=w.time);
    const strokes:Stroke[]=Array.from({length:LIMIT},()=>[0,0,0,0] as const);
    const strengths=new Float32Array(LIMIT);
    this.wakes.forEach((w,i)=>{strokes[i]=[w.from.x,w.from.y,w.to.x,w.to.y];strengths[i]=(1-(time-w.time)/LIFETIME)**1.5*1.45;});
    return {strokes,strengths};
  }
  static displacement(at:Point,currents:readonly WaterSource[],strokes:readonly Stroke[],strengths:ArrayLike<number>):Point{
    let x=0,y=0;
    for(const c of currents){
      const dx=at.x-c.x,dy=at.y-c.y,d=Math.hypot(dx,dy),n=Math.max(d,1),env=Math.exp(-d*d/14400)*Math.min(d/24,1);
      x+=(dx*c.radial+dy*c.curl)/n*env;y+=(dy*c.radial-dx*c.curl)/n*env;
    }
    for(let i=0;i<strokes.length;i++){
      if(!(strengths[i]>0))continue;
      const [ax,ay,bx,by]=strokes[i],sx=bx-ax,sy=by-ay,l2=sx*sx+sy*sy;
      const t=clamp(((at.x-ax)*sx+(at.y-ay)*sy)/Math.max(l2,1));
      const dx=at.x-ax-sx*t,dy=at.y-ay-sy*t,n=Math.max(Math.hypot(dx,dy),4);
      const len=Math.sqrt(l2),env=Math.exp(-(dx*dx+dy*dy)/900)*strengths[i];
      x+=(dx/n*7+(len?sx/len:0)*2)*env;y+=(dy/n*7+(len?sy/len:0)*2)*env;
    }
    const l=Math.hypot(x,y),s=l>28?28/l:1;return {x:x*s,y:y*s};
  }
}
