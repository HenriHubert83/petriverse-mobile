// Port of prototype/scripts/board.gd; see CREDITS.md and LICENSE.
import data from '../../data/board.json';
import {Point,distanceToSegment,segmentsIntersect} from './loopGeometry';
export const MOTION_STEP=1/60, MAX_SPEED=12, CELL_SPACING=60;
type Edge=readonly [number,number];
type Triangle=readonly [number,number,number];
type WoundTriangle=readonly [number,number,number,number];
export interface FlowSampler {sample(point:Point):Point}
const p=(x=0,y=0):Point=>({x,y});
const add=(a:Point,b:Point)=>p(a.x+b.x,a.y+b.y);
const sub=(a:Point,b:Point)=>p(a.x-b.x,a.y-b.y);
const mul=(a:Point,s:number)=>p(a.x*s,a.y*s);
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
const len2=(a:Point)=>dot(a,a);
const len=(a:Point)=>Math.hypot(a.x,a.y);
const norm=(a:Point)=>{const l=len(a);return l===0?p():mul(a,1/l);};
const dist2=(a:Point,b:Point)=>len2(sub(a,b));
const dist=(a:Point,b:Point)=>len(sub(a,b));
const rotate=(a:Point,r:number)=>p(a.x*Math.cos(r)-a.y*Math.sin(r),a.x*Math.sin(r)+a.y*Math.cos(r));
const shares=(e:Edge,f:Edge)=>e[0]===f[0]||e[0]===f[1]||e[1]===f[0]||e[1]===f[1];
const apart=(a:Point,b:Point,c:Point,d:Point)=>Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.max(c.x,d.x)<Math.min(a.x,b.x)||Math.max(a.y,b.y)<Math.min(c.y,d.y)||Math.max(c.y,d.y)<Math.min(a.y,b.y);
export class Board {
  readonly center=p(data.center[0],data.center[1]);
  readonly dishRadius=data.dish_radius;readonly motherRadius=data.mother_radius;readonly hitRadius=data.hit_radius;
  readonly tuning={...data.tuning};readonly spawnAngles=data.spawn_angles_degrees.slice();
  anchors:Point[]=data.anchors.map(a=>p(a[0],a[1]));
  restAnchors:Point[]=this.anchors.slice();
  motionTimes:number[]=[];motionHomes:Point[]=[];velocities:Point[]=[];motionAccumulator=0;
  readonly neighbors:number[][]=this.anchors.map(()=>[]);
  readonly edges:Edge[]=data.edges.map(e=>[e[0],e[1]]);
  readonly localEdges:Edge[][]=this.anchors.map(()=>[]);
  readonly triangles:Triangle[]=[];
  readonly localTriangles:WoundTriangle[][]=this.anchors.map(()=>[]);
  constructor(){
    for(const e of this.edges){const [a,b]=e;this.neighbors[a].push(b);this.neighbors[b].push(a);this.localEdges[a].push(e);this.localEdges[b].push(e);}
    for(let a=0;a<this.anchors.length;a++)for(const b of this.neighbors[a])for(const c of this.neighbors[b]){
      if(a<b&&b<c&&this.neighbors[c].includes(a)){
        this.triangles.push([a,b,c]);
        const winding=Math.sign(cross(sub(this.anchors[b],this.anchors[a]),sub(this.anchors[c],this.anchors[a])));
        for(const id of [a,b,c])this.localTriangles[id].push([a,b,c,winding]);
      }
    }
    this.resetMotion();
  }
  resetMotion():void {
    this.anchors=this.restAnchors.map(v=>p(v.x,v.y));this.motionTimes=this.anchors.map(()=>0);
    this.motionHomes=this.anchors.slice();this.velocities=this.anchors.map(()=>p());this.motionAccumulator=0;
  }
  stepMotion(delta:number,held:readonly number[]=[],fluid?:FlowSampler):void {
    if(!Number.isFinite(delta)||delta<=0)return;
    this.motionAccumulator+=delta;
    const pinned=new Set(held);
    while(this.motionAccumulator>=MOTION_STEP-1e-9){
      this.motionAccumulator=Math.max(0,this.motionAccumulator-MOTION_STEP);this.wanderStep(pinned,fluid);
    }
  }
  private wanderStep(held:ReadonlySet<number>,fluid?:FlowSampler):void {
    for(let id=0;id<this.anchors.length;id++){
      if(held.has(id))continue;
      this.motionTimes[id]+=MOTION_STEP;
      const t=this.motionTimes[id]*(0.85+(id%7)*0.07),phase=id*2.399963+0.7;
      const heading=phase+Math.sin(t*0.13+phase*0.17)*1.35+Math.sin(t*0.047+phase*0.81)*2.1;
      let desired=mul(p(Math.cos(heading),Math.sin(heading)),10+2*Math.sin(t*0.09+phase));
      const position=this.anchors[id];
      if(fluid)desired=add(desired,mul(fluid.sample(position),0.32));
      const home=sub(this.motionHomes[id],position);
      desired=add(desired,mul(norm(home),Math.max(0,len(home)-55)*0.16));
      for(let other=0;other<this.anchors.length;other++){
        if(other===id)continue;
        const away=sub(position,this.anchors[other]),distance=len(away);
        if(distance<92)desired=add(desired,mul(away,Math.pow((92-distance)/32,2)*16/Math.max(distance,0.01)));
      }
      const radial=sub(position,this.center),radius=len(radial),radialUnit=norm(radial);
      desired=sub(desired,mul(radialUnit,Math.max(0,radius-(this.dishRadius-70))*0.65));
      desired=add(desired,mul(radialUnit,Math.max(0,112-radius)*0.75));
      for(const other of this.neighbors[id]){
        const toward=sub(this.anchors[other],position),restLength=dist(this.motionHomes[id],this.motionHomes[other]);
        desired=add(desired,mul(norm(toward),Math.max(0,len(toward)-restLength-28)*0.3));
      }
      for(const tri of this.localTriangles[id]){
        const a=tri[0]===id?tri[1]:tri[0],b=tri[2]===id?tri[1]:tri[2];
        const edge=sub(this.anchors[b],this.anchors[a]);
        let normal=norm(p(edge.y,-edge.x));normal=mul(normal,Math.sign(dot(sub(position,this.anchors[a]),normal)));
        const altitude=Math.abs(dot(sub(position,this.anchors[a]),normal));
        desired=add(desired,mul(normal,Math.max(0,42-altitude)*0.65));
      }
      const speed=len(desired);if(speed>MAX_SPEED)desired=mul(desired,MAX_SPEED/speed);
      this.velocities[id]=add(this.velocities[id],mul(sub(desired,this.velocities[id]),1-Math.exp(-MOTION_STEP/0.7)));
      const candidate=add(position,mul(this.velocities[id],MOTION_STEP));
      if(this.canMove(id,candidate))this.anchors[id]=candidate;
      else this.velocities[id]=mul(rotate(this.velocities[id],id%2===0?0.08:-0.08),0.92);
    }
  }
  canMove(id:number,candidate:Point):boolean {
    if(!Number.isInteger(id)||id<0||id>=this.anchors.length||!Number.isFinite(candidate.x)||!Number.isFinite(candidate.y))return false;
    if(dist2(candidate,this.center)>(this.dishRadius-35)**2)return false;
    for(let other=0;other<this.anchors.length;other++){
      if(other!==id&&dist2(candidate,this.anchors[other])<Math.min(CELL_SPACING**2,dist2(this.anchors[id],this.anchors[other]))-0.0001)return false;
    }
    const old=this.anchors[id];this.anchors[id]=candidate;
    try {
      for(const tri of this.localTriangles[id]){
        if(cross(sub(this.anchors[tri[1]],this.anchors[tri[0]]),sub(this.anchors[tri[2]],this.anchors[tri[0]]))*tri[3]<600)return false;
      }
      for(const e of this.localEdges[id]){
        const a=this.anchors[e[0]],b=this.anchors[e[1]];
        if(distanceToSegment(this.center,a,b)<this.motherRadius+18)return false;
        for(const f of this.edges){
          if(shares(e,f))continue;const c=this.anchors[f[0]],d=this.anchors[f[1]];
          if(!apart(a,b,c,d)&&segmentsIntersect(a,b,c,d))return false;
        }
      }
      return true;
    } finally {this.anchors[id]=old;}
  }
  hitTest(point:Point):number {
    let closest=-1,distance=this.hitRadius;
    for(let i=0;i<this.anchors.length;i++){const d=dist(point,this.anchors[i]);if(d<=distance){distance=d;closest=i;}}
    return closest;
  }
  availableTriangles(ready:(id:number)=>boolean):number {
    return this.triangles.filter(t=>t.every(ready)).length;
  }
  validateBoard():string[] {
    const errors:string[]=[];
    if(this.anchors.length!==24)errors.push('Expected 24 anchors');
    const visited=new Set([0]),frontier=[0];
    while(frontier.length){for(const neighbor of this.neighbors[frontier.pop()!]??[]){if(!visited.has(neighbor)){visited.add(neighbor);frontier.push(neighbor);}}}
    if(visited.size!==this.anchors.length)errors.push('Disconnected board');
    for(let i=0;i<this.edges.length;i++){
      const e=this.edges[i],a=this.anchors[e[0]],b=this.anchors[e[1]];
      if(distanceToSegment(this.center,a,b)<this.motherRadius+18)errors.push('Edge occludes mother: '+e.join(','));
      for(let j=i+1;j<this.edges.length;j++){const f=this.edges[j];if(!shares(e,f)&&segmentsIntersect(a,b,this.anchors[f[0]],this.anchors[f[1]]))errors.push('Crossing edges: '+e.join(',')+' / '+f.join(','));}
    }
    return errors;
  }
  configureDish(index:number):void {
    this.restAnchors=this.restAnchors.map(anchor=>{
      let relative=sub(anchor,this.center);
      if(index===1)relative=rotate(p(relative.x*0.90,relative.y*1.02),0.12);
      else if(index===2)relative=rotate(p(relative.x*1.02,relative.y*0.91),-0.16);
      return add(this.center,relative);
    });
    this.resetMotion();
  }
}
