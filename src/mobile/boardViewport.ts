import type {Point} from '../geometry/loopGeometry';
export interface BoardViewport {width:number;height:number;scale:number;x:number;y:number}
export function boardViewport(width:number,height:number,center:Point,radius:number):BoardViewport{
  const scale=width>0&&height>0?Math.min(width,height)/(2*(radius+20)):0;
  return {width,height,scale,x:width/2-center.x*scale,y:height/2-center.y*scale};
}
export function toBoard(point:Point,view:BoardViewport):Point|undefined{
  if(view.scale<=0||point.x<0||point.y<0||point.x>view.width||point.y>view.height)return;
  return {x:(point.x-view.x)/view.scale,y:(point.y-view.y)/view.scale};
}
export function toScreen(point:Point,view:BoardViewport):Point{return {x:view.x+point.x*view.scale,y:view.y+point.y*view.scale};}
