// Adapted from prototype/scripts/loop_geometry.gd, Petriverse 0.3.0.
// Original attribution and CC BY-NC 4.0 license: see CREDITS.md and LICENSE.
// Pinned source: be96d3e0641571cc37255fb8701ea83e20c28aee.
export type Point = Readonly<{x:number;y:number}>;
export const EPS=0.001, BOUNDARY_TOLERANCE=2, MIN_AREA=4;
const sub=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function distanceToSegment(p:Point,a:Point,b:Point):number {
  const ab=sub(b,a),len=dot(ab,ab);
  if(len<=EPS*EPS)return distance(p,a);
  const t=Math.max(0,Math.min(1,dot(sub(p,a),ab)/len));
  return distance(p,{x:a.x+ab.x*t,y:a.y+ab.y*t});
}
export function segmentsIntersect(a:Point,b:Point,c:Point,d:Point):boolean {
  const ab=sub(b,a),cd=sub(d,c),u=cross(ab,sub(c,a)),v=cross(ab,sub(d,a)),w=cross(cd,sub(a,c)),z=cross(cd,sub(b,c));
  if(((u>EPS&&v< -EPS)||(u< -EPS&&v>EPS))&&((w>EPS&&z< -EPS)||(w< -EPS&&z>EPS)))return true;
  return distanceToSegment(a,c,d)<=EPS||distanceToSegment(b,c,d)<=EPS||distanceToSegment(c,a,b)<=EPS||distanceToSegment(d,a,b)<=EPS;
}
export function area(points:readonly Point[]):number {
  let total=0;for(let i=0;i<points.length;i++)total+=cross(points[i],points[(i+1)%points.length]);return Math.abs(total)*0.5;
}
export function simplePolygon(points:readonly Point[]):boolean {
  const n=points.length;if(n<3||area(points)<MIN_AREA)return false;
  for(let i=0;i<n;i++){
    const a=points[i],b=points[(i+1)%n],c=points[(i+2)%n];
    if(distance(a,b)<EPS)return false;
    if(Math.abs(cross(sub(b,a),sub(c,b)))<=EPS&&dot(sub(b,a),sub(c,b))<0)return false;
    for(let j=i+1;j<n;j++){
      if(j===i+1||(i===0&&j===n-1))continue;
      if(segmentsIntersect(a,b,points[j],points[(j+1)%n]))return false;
    }
  }return true;
}
export function contains(p:Point,points:readonly Point[]):boolean {
  if(points.length<3)return false;let inside=false;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    if(distanceToSegment(p,a,b)<=BOUNDARY_TOLERANCE)return true;
    if((a.y>p.y)!==(b.y>p.y)){
      const intersectX=(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x;
      if(p.x<intersectX)inside=!inside;
    }
  }return inside;
}
export function polygonFor(path:readonly number[],anchors:readonly Point[]):Point[]{return path.map(id=>anchors[id]);}
export function touchesMother(points:readonly Point[],center:Point,radius:number):boolean {
  if(contains(center,points))return true;
  for(let i=0;i<points.length;i++)if(distanceToSegment(center,points[i],points[(i+1)%points.length])<=radius+BOUNDARY_TOLERANCE)return true;
  return false;
}
type Ready=(id:number)=>boolean;
export function validate(path:readonly number[],anchors:readonly Point[],ready:Ready,maxVertices=8):boolean {
  if(path.length<3||path.length>maxVertices)return false;
  const seen=new Set<number>();
  for(const id of path){if(!Number.isInteger(id)||id<0||id>=anchors.length||seen.has(id)||!ready(id))return false;seen.add(id);}
  return simplePolygon(polygonFor(path,anchors));
}
export function captureValid(path:readonly number[],board:{anchors:readonly Point[];center:Point;motherRadius:number},ready:Ready,maxVertices=8):boolean {
  return validate(path,board.anchors,ready,maxVertices)&&!touchesMother(polygonFor(path,board.anchors),board.center,board.motherRadius);
}
export function canAppend(path:readonly number[],id:number,anchors:readonly Point[],ready:Ready,maxVertices=8):boolean {
  if(!path.length||!Number.isInteger(id)||id<0||id>=anchors.length||path.length>=maxVertices||path.includes(id)||!ready(id))return false;
  const a=anchors[path[path.length-1]],b=anchors[id];
  if(path.length>1){const previous=anchors[path[path.length-2]];if(Math.abs(cross(sub(a,previous),sub(b,a)))<=EPS&&dot(sub(a,previous),sub(b,a))<0)return false;}
  for(let i=0;i<path.length-2;i++)if(segmentsIntersect(a,b,anchors[path[i]],anchors[path[i+1]]))return false;
  return true;
}
