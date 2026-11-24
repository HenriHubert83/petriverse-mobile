// Shared capture and journey dispatch from prototype/scripts/loop_resolver.gd.
// See CREDITS.md and LICENSE. The actual journey harvest rules are not yet ported.
import {Point,captureValid,contains,polygonFor} from './loopGeometry';
import {Cell} from './cell';
import {penalty} from './loopStrain';
import {recovery} from '../evolution/captureRules';
export interface Target {id:number;position:Point;nuclei?:readonly Point[];health:number;eligible?:boolean;kind?:string}
export interface CaptureBoard {anchors:readonly Point[];center:Point;motherRadius:number;tuning:{recovery_seconds:number}}
export interface CapturePlan {nodes:number[];polygon:Point[];ids:number[];recovery:number;strain:number}
export type InvalidCapture={valid:false;ids:number[];points:0};
export function enclosed(target:Target,polygon:readonly Point[]):boolean {
  return target.eligible!==false&&(target.nuclei??[target.position]).every(p=>contains(p,polygon))&&target.health>0;
}
export function targets(path:readonly number[],board:CaptureBoard,ready:(id:number)=>boolean,snapshot:readonly Target[],maximum=8):number[]{
  if(!captureValid(path,board,ready,maximum))return [];
  const polygon=polygonFor(path,board.anchors);
  return snapshot.filter(t=>enclosed(t,polygon)).map(t=>t.id);
}
export interface JourneyCaptureContext<Result extends object> {
  state:string;board:CaptureBoard;cells:readonly Cell[];mutations:readonly string[];maxVertices:number;
  isReady(id:number):boolean;targetSnapshot():readonly Target[];
  // This callback is the future JourneyHarvest.commit port, not a placeholder reward implementation.
  commitHarvest(plan:CapturePlan):Result;
}
export function commitJourney<Result extends object>(path:readonly number[],run:JourneyCaptureContext<Result>):InvalidCapture|(Result&{strain:number}){
  const ready=(id:number)=>run.isReady(id);
  if(run.state!=='active'||!captureValid(path,run.board,ready,run.maxVertices))return {valid:false,ids:[],points:0};
  const snapshot=run.targetSnapshot();
  const polygon=polygonFor(path,run.board.anchors).map(p=>({...p}));
  const ids=targets(path,run.board,ready,snapshot,run.maxVertices);
  const strain=penalty(path,run.board.anchors);
  const seconds=recovery(run.mutations,path.length,run.board.tuning.recovery_seconds)+strain;
  const plan:CapturePlan={nodes:path.slice(),polygon,ids,recovery:seconds,strain};
  for(const id of path)run.cells[id].spend(seconds);
  return {...run.commitHarvest(plan),strain};
}
