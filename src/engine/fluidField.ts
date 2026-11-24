// Port of prototype/scripts/fluid_field.gd (Petriverse 0.3.0).
// Attribution and license: CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
export const SIZE=28, COUNT=SIZE*SIZE, STEP=1/20, MAX_SPEED=18, OFFSET_RANGE=96;
export type WaterSource={x:number;y:number;radial:number;curl:number};
export interface FluidSnapshot {clock:number;accumulator:number;phase:number;velocity:number[];transport:number[]}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const finite=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
function limit(x:number,y:number,max:number):Point{const len=Math.hypot(x,y),s=len>max?max/len:1;return {x:x*s,y:y*s};}
export class FluidField {
  center:Point={x:640,y:450};radius=392;origin:Point={x:0,y:0};spacing=1;
  phase=0;clock=0;accumulator=0;revision=0;
  velocity=new Float64Array(COUNT*2);transport=new Float64Array(COUNT*2);
  readonly wet=new Uint8Array(COUNT);readonly points=new Float64Array(COUNT*2);
  readonly pressure=new Float32Array(COUNT);readonly divergence=new Float32Array(COUNT);
  sources:WaterSource[]=[];
  private next=new Float64Array(COUNT*2);private offsets=new Float64Array(COUNT*2);
  reset(at:Point,extent:number,seed:number):void{
    if(!finite(at)||!Number.isFinite(extent)||extent<=0||!Number.isFinite(seed))throw Error('Invalid fluid geometry or seed');
    this.center={...at};this.radius=extent;this.origin={x:at.x-extent,y:at.y-extent};
    this.spacing=extent*2/(SIZE-1);this.phase=((seed%10007+10007)%10007)*0.017;
    this.clock=0;this.accumulator=0;this.velocity.fill(0);this.transport.fill(0);this.sources=[];
    this.pressure.fill(0);this.divergence.fill(0);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const i=x+y*SIZE,k=i*2,px=this.origin.x+x*this.spacing,py=this.origin.y+y*this.spacing;
      this.points[k]=px;this.points[k+1]=py;const d=Math.hypot(px-at.x,py-at.y);
      this.wet[i]=Number(x>0&&y>0&&x<SIZE-1&&y<SIZE-1&&d<extent-8&&d>55);
      if(this.wet[i]){const v=this.ambient({x:px,y:py});this.velocity[k]=v.x;this.velocity[k+1]=v.y;}
    }
    this.project();this.revision++;
  }
  ambient(at:Point):Point{
    const x=(at.x-this.center.x)/155,y=(at.y-this.center.y)/155;
    const a=x*1.13+y*0.71+this.phase+this.clock*0.039,b=x*-0.64+y*1.31-this.phase*0.7-this.clock*0.031;
    const ca=Math.cos(a)*4.8,cb=Math.cos(b)*3.5;
    return {x:0.71*ca+1.31*cb,y:-1.13*ca+0.64*cb};
  }
  interpolate(values:Float64Array,at:Point):Point{
    const gx=clamp((at.x-this.origin.x)/this.spacing,0,SIZE-1.001),gy=clamp((at.y-this.origin.y)/this.spacing,0,SIZE-1.001);
    const x=Math.floor(gx),y=Math.floor(gy),fx=gx-x,fy=gy-y,k=(x+y*SIZE)*2;
    const a=(j:number)=>{const u=values[k+j]+(values[k+2+j]-values[k+j])*fx;
      const v=values[k+SIZE*2+j]+(values[k+SIZE*2+2+j]-values[k+SIZE*2+j])*fx;return u+(v-u)*fy;};
    return {x:a(0),y:a(1)};
  }
  sample(at:Point):Point{
    if(!finite(at)||Math.hypot(at.x-this.center.x,at.y-this.center.y)>=this.radius)return {x:0,y:0};
    return this.interpolate(this.velocity,at);
  }
  displacement(at:Point):Point{return finite(at)?this.interpolate(this.transport,at):{x:0,y:0};}
  stroke(from:Point,to:Point,strength=0.35):void{
    if(!finite(from)||!finite(to)||!Number.isFinite(strength))return;
    const dx=to.x-from.x,dy=to.y-from.y,l2=dx*dx+dy*dy;if(l2<0.00001)return;
    const low=(v:number,o:number)=>clamp(Math.floor((v-65-o)/this.spacing),1,SIZE-2);
    const high=(v:number,o:number)=>clamp(Math.ceil((v+65-o)/this.spacing),1,SIZE-2);
    const lx=low(Math.min(from.x,to.x),this.origin.x),ly=low(Math.min(from.y,to.y),this.origin.y);
    const hx=high(Math.max(from.x,to.x),this.origin.x),hy=high(Math.max(from.y,to.y),this.origin.y);
    const impulse=limit(dx,dy,70);
    for(let y=ly;y<=hy;y++)for(let x=lx;x<=hx;x++){
      const i=x+y*SIZE,k=i*2;if(!this.wet[i])continue;
      const ox=this.points[k]-from.x,oy=this.points[k+1]-from.y,t=clamp((ox*dx+oy*dy)/l2,0,1);
      const d2=(ox-dx*t)**2+(oy-dy*t)**2,scale=strength*Math.exp(-d2/1500);
      const v=limit(this.velocity[k]+impulse.x*scale,this.velocity[k+1]+impulse.y*scale,MAX_SPEED);
      this.velocity[k]=v.x;this.velocity[k+1]=v.y;
    }
    this.revision++;
  }
  step(delta:number):void{
    if(!Number.isFinite(delta)||delta<=0)return;
    this.accumulator+=delta;
    while(this.accumulator>=STEP-1e-9){this.accumulator=Math.max(0,this.accumulator-STEP);this.advance();}
  }
  advance():void{
    this.clock+=STEP;const vel=this.velocity,next=this.next;next.set(vel);
    for(let i=0;i<COUNT;i++){
      if(!this.wet[i])continue;const k=i*2,x=this.points[k],y=this.points[k+1];
      const carried=this.interpolate(vel,{x:x-vel[k]*STEP,y:y-vel[k+1]*STEP});
      const viscX=(vel[k-2]+vel[k+2]+vel[k-SIZE*2]+vel[k+SIZE*2])*0.25;
      const viscY=(vel[k-1]+vel[k+3]+vel[k-SIZE*2+1]+vel[k+SIZE*2+1])*0.25;
      const amb=this.ambient({x,y});
      let vx=carried.x+(viscX-carried.x)*0.035,vy=carried.y+(viscY-carried.y)*0.035;
      vx+=(amb.x-vx)*STEP*0.28;vy+=(amb.y-vy)*STEP*0.28;
      for(const s of this.sources){
        const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy),env=Math.exp(-(dx*dx+dy*dy)/6200)*smooth(12,40,d);
        const nx=d?dx/d:0,ny=d?dy/d:0;
        vx+=(nx*s.radial+ny*s.curl)*env*STEP;vy+=(ny*s.radial-nx*s.curl)*env*STEP;
      }
      next[k]=vx;next[k+1]=vy;
    }
    this.velocity=next;this.next=vel;this.project();
    const tr=this.transport,out=this.offsets;out.set(tr);
    for(let i=0;i<COUNT;i++){
      if(!this.wet[i])continue;const k=i*2,vx=this.velocity[k],vy=this.velocity[k+1];
      const carried=this.interpolate(tr,{x:this.points[k]-vx*STEP,y:this.points[k+1]-vy*STEP});
      const decay=Math.exp(-STEP*0.045),v=limit((carried.x+vx*STEP)*decay,(carried.y+vy*STEP)*decay,OFFSET_RANGE-1);
      out[k]=v.x;out[k+1]=v.y;
    }
    this.transport=out;this.offsets=tr;this.revision++;
  }
  project():void{
    const v=this.velocity,p=this.pressure,d=this.divergence,w=this.wet;p.fill(0);
    for(let i=0;i<COUNT;i++)if(w[i]){
      const k=i*2;d[i]=-0.5*this.spacing*(v[k+2]-v[k-2]+v[k+SIZE*2+1]-v[k-SIZE*2+1]);
    }
    for(let pass=0;pass<9;pass++)for(let i=0;i<COUNT;i++){
      if(!w[i])continue;let sum=0,count=0;
      for(const j of [i-1,i+1,i-SIZE,i+SIZE])if(w[j]){sum+=p[j];count++;}
      p[i]=(d[i]+sum)/Math.max(1,count);
    }
    for(let i=0;i<COUNT;i++){
      if(!w[i])continue;const k=i*2;
      const left=w[i-1]?p[i-1]:p[i],right=w[i+1]?p[i+1]:p[i],up=w[i-SIZE]?p[i-SIZE]:p[i],down=w[i+SIZE]?p[i+SIZE]:p[i];
      let vx=v[k]-(right-left)*0.5/this.spacing,vy=v[k+1]-(down-up)*0.5/this.spacing;
      const dx=this.points[k]-this.center.x,dy=this.points[k+1]-this.center.y,r=Math.hypot(dx,dy),nx=r?dx/r:0,ny=r?dy/r:0;
      const slip=Math.max(smooth(this.radius-65,this.radius-12,r),1-smooth(55,90,r)),normal=(vx*nx+vy*ny)*slip;
      vx-=nx*normal;vy-=ny*normal;const bounded=limit(vx,vy,MAX_SPEED);v[k]=bounded.x;v[k+1]=bounded.y;
    }
  }
  // Normalized RGBA channels for a future GPU texture upload. No Skia dependency here.
  flowTextureData():Float32Array{
    const result=new Float32Array(COUNT*4);
    for(let i=0;i<COUNT;i++){const k=i*2,j=i*4;result[j]=this.transport[k]/(OFFSET_RANGE*2)+0.5;result[j+1]=this.transport[k+1]/(OFFSET_RANGE*2)+0.5;result[j+2]=this.velocity[k]/(MAX_SPEED*2)+0.5;result[j+3]=this.velocity[k+1]/(MAX_SPEED*2)+0.5;}
    return result;
  }
  snapshot():FluidSnapshot{return {clock:this.clock,accumulator:this.accumulator,phase:this.phase,velocity:Array.from(this.velocity),transport:Array.from(this.transport)};}
  restore(data:Partial<FluidSnapshot>|null):boolean{
    if(!data||!Array.isArray(data.velocity)||!Array.isArray(data.transport)||data.velocity.length!==COUNT*2||data.transport.length!==COUNT*2)return false;
    if(!data.velocity.every(Number.isFinite)||!data.transport.every(Number.isFinite))return false;
    if(!Number.isFinite(data.clock??0)||!Number.isFinite(data.accumulator??0)||!Number.isFinite(data.phase??this.phase))return false;
    this.clock=Math.max(0,data.clock??0);this.accumulator=clamp(data.accumulator??0,0,STEP);this.phase=data.phase??this.phase;
    for(let i=0;i<COUNT;i++){
      const k=i*2,v=this.wet[i]?limit(data.velocity[k],data.velocity[k+1],MAX_SPEED):{x:0,y:0};
      const t=this.wet[i]?limit(data.transport[k],data.transport[k+1],OFFSET_RANGE-1):{x:0,y:0};
      this.velocity[k]=v.x;this.velocity[k+1]=v.y;this.transport[k]=t.x;this.transport[k+1]=t.y;
    }
    this.revision++;return true;
  }
}
