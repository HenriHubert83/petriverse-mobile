import type {Point} from '../geometry/loopGeometry';
export interface BoardViewport {width:number;height:number;scale:number;x:number;y:number}
export const MAX_BOARD_ZOOM=3;
const margin=20;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function boardViewport(width:number,height:number,center:Point,radius:number):BoardViewport{
  const scale=width>0&&height>0?Math.min(width,height)/(2*(radius+margin)):0;
  return {width,height,scale,x:width/2-center.x*scale,y:height/2-center.y*scale};
}
export function viewportZoom(view:BoardViewport,center:Point,radius:number):number{
  const fit=boardViewport(view.width,view.height,center,radius);return fit.scale>0?view.scale/fit.scale:1;
}
// Keep each fitted axis centered. Once enlarged beyond that axis, allow travel
// to either edge without letting the board's bounding square disappear offscreen.
export function transformViewport(view:BoardViewport,ratio:number,from:Point,to:Point,center:Point,radius:number):BoardViewport{
  if(view.scale<=0||!Number.isFinite(ratio)||ratio<=0||![from.x,from.y,to.x,to.y].every(Number.isFinite))return view;
  const fit=boardViewport(view.width,view.height,center,radius),scale=clamp(view.scale*ratio,fit.scale,fit.scale*MAX_BOARD_ZOOM);
  const axis=(size:number,boardCenter:number,offset:number)=>{
    const extent=(radius+margin)*scale;
    return extent*2<=size?size/2-boardCenter*scale:clamp(offset,size-(boardCenter+radius+margin)*scale,-(boardCenter-radius-margin)*scale);
  };
  return {...view,scale,x:axis(view.width,center.x,to.x-(from.x-view.x)*scale/view.scale),
    y:axis(view.height,center.y,to.y-(from.y-view.y)*scale/view.scale)};
}
export function toBoard(point:Point,view:BoardViewport):Point|undefined{
  if(view.scale<=0||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.y<0||point.x>view.width||point.y>view.height)return;
  return {x:(point.x-view.x)/view.scale,y:(point.y-view.y)/view.scale};
}
export function toScreen(point:Point,view:BoardViewport):Point{return {x:view.x+point.x*view.scale,y:view.y+point.y*view.scale};}
