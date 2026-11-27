// Adapted from prototype/scripts/loop_strain.gd; see CREDITS.md and LICENSE.
import {Point} from './loopGeometry';
export const COMFORT_LENGTH=130,LENGTH_STEP=90,SECONDS_PER_STEP=0.38,MAX_PENALTY=2.4;
export function edgeAmount(a:Point,b:Point):number{return Math.max(0,Math.hypot(a.x-b.x,a.y-b.y)-COMFORT_LENGTH)/LENGTH_STEP;}
export function penalty(path:readonly number[],anchors:readonly Point[],closed=true):number{
  if(path.length<2)return 0;
  let total=0;for(let i=0;i<path.length-1;i++)total+=edgeAmount(anchors[path[i]],anchors[path[i+1]]);
  if(closed&&path.length>=3)total+=edgeAmount(anchors[path[path.length-1]],anchors[path[0]]);
  return Math.min(MAX_PENALTY,total*SECONDS_PER_STEP);
}
export function edgeTint(a:Point,b:Point):number{return Math.max(0,Math.min(1,edgeAmount(a,b)/1.5));}
