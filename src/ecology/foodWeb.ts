// Food-web subset of prototype/scripts/journey_ecology.gd; see CREDITS.md and LICENSE.
// Encounter waves, gates, competitors and cradle logic remain separate migration work.
import type {Point} from '../geometry/loopGeometry';
import {Drifter,add,sub,scale,unit} from './drifter';
import {HarvestOrganism} from './harvestOrganism';
export const FEEDING_TIME=6;
const len=(p:Point)=>Math.hypot(p.x,p.y);
const dist=(a:Point,b:Point)=>len(sub(a,b));
const limit=(p:Point,max:number):Point=>{const n=len(p);return n>max?scale(p,max/n):p;};
const hunterKind=(b:Drifter)=>b.kind==='drifter'||b.kind==='twinspore';
export interface FoodWebContext {stageIndex:number;enemies:Drifter[];board:{center:Point;dishRadius:number}}
export class FoodWeb {
  eatenFood=0;escapedSpores=0;
  constructor(private readonly announce:(message:string)=>void=()=>{}){}
  preyFor(run:FoodWebContext,hunter:Drifter):Drifter|undefined{return run.enemies.find(b=>b.id===hunter.huntTarget);}
  huntDestination(run:FoodWebContext,body:Drifter):Point{
    return (body.huntTarget>=0?this.preyFor(run,body)?.nucleus:undefined)??run.board.center;
  }
  eatingProgress(run:FoodWebContext,preyId:number):number{
    let progress=0;for(const h of run.enemies)if(h.huntTarget===preyId)progress=Math.max(progress,h.huntTime/FEEDING_TIME);return progress;
  }
  step(run:FoodWebContext,delta:number):void{
    if(run.stageIndex<2)return;
    const eaten=new Set<number>();
    for(const hunter of run.enemies){
      if(!hunterKind(hunter)||hunter.age<2.5)continue;
      if(hunter.huntTarget<0&&!hunter.foragingDone){
        const candidates=run.enemies.filter(e=>['food','spore'].includes(e.kind)&&!e.gateIds.length&&e.age>2&&dist(e.nucleus,hunter.nucleus)<100&&!run.enemies.some(h=>h.huntTarget===e.id));
        const cost=(e:Drifter)=>dist(e.nucleus,hunter.nucleus)-(e.kind==='spore'?30:0);
        candidates.sort((a,b)=>cost(a)-cost(b));
        if(candidates.length){hunter.huntTarget=candidates[0].id;hunter.forageRemaining=24;}
      }
      if(hunter.huntTarget<0)continue;
      const prey=this.preyFor(run,hunter);hunter.forageRemaining=Math.max(0,hunter.forageRemaining-delta);
      if(!prey||hunter.forageRemaining<=0){hunter.huntTarget=-1;hunter.huntTime=0;hunter.foragingDone=true;continue;}
      if(dist(hunter.nucleus,prey.nucleus)<22&&hunter.stunned<=0){
        hunter.huntTime+=delta;
        if(hunter.huntTime>=FEEDING_TIME){
          eaten.add(prey.id);
          if(prey.kind==='food'){hunter.carriedFood++;this.eatenFood++;}else this.escapedSpores++;
          hunter.huntTarget=-1;hunter.huntTime=0;hunter.fedRemaining=8;hunter.foragingDone=true;
          this.announce(prey.kind==='food'?'Hunter is digesting · recover its food':'A spore was eaten · catch hunter and spore together next time');
        }
      }else hunter.huntTime=Math.max(0,hunter.huntTime-delta*0.5);
    }
    for(const body of run.enemies){
      if(!(body instanceof HarvestOrganism)||!['food','spore'].includes(body.kind))continue;
      let drift:Point={x:0,y:0},neighbors=0;
      if(body.kind==='food'&&body.bloomId>=0){
        for(const other of run.enemies)if(other.id!==body.id&&other.kind==='food'&&other.bloomId===body.bloomId&&dist(body.nucleus,other.nucleus)<65){drift=add(drift,sub(other.nucleus,body.nucleus));neighbors++;}
        if(neighbors)drift=limit(scale(drift,1/neighbors),0.45);
      }
      for(const hunter of run.enemies)if(['drifter','twinspore','grazer'].includes(hunter.kind)){
        const away=sub(body.nucleus,hunter.nucleus),d=len(away);
        if(d<72)drift=add(drift,scale(unit(away),(1-d/72)*(body.kind==='spore'?1.2:0.65)));
      }
      body.origin=add(body.origin,scale(limit(drift,1.5),Math.max(delta,0)));
      body.origin=add(run.board.center,limit(sub(body.origin,run.board.center),run.board.dishRadius-48));
    }
    run.enemies=run.enemies.filter(e=>!eaten.has(e.id));
  }
  disturbSurvivors(run:FoodWebContext,center:Point):void{
    for(const b of run.enemies)if(['food','spore'].includes(b.kind)&&dist(b.nucleus,center)<135){
      const away=unit(sub(b.nucleus,center));b.pullToward(add(b.nucleus,scale(away,20)),5);
    }
  }
}
