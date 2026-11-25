// Port of prototype/scripts/journey_lesson.gd; see CREDITS.md and LICENSE.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {HarvestResult} from './journeyHarvest';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {add,scale} from '../ecology/drifter';
export const SMALL_LESSON=[0,8,9],WIDE_LESSON=[0,1,2,10,9,8];
export class JourneyLesson {
  stepIndex=-1;nodes:number[]=[];
  active(run:EncounterSimulation):boolean{return run.stageIndex===0&&this.stepIndex>=0&&this.stepIndex<4;}
  route():number[]{return this.stepIndex<2?SMALL_LESSON:WIDE_LESSON;}
  begin(run:EncounterSimulation):void{this.stepIndex=0;this.nodes=[];run.enemies=[];run.harvest.nourishment=0;this.seedFood(run);}
  private seedFood(run:EncounterSimulation):void{
    run.enemies=[];const a=run.board.anchors;
    const centers=[scale(add(add(a[0],a[8]),a[9]),1/3)];
    if(this.stepIndex===2)centers.push(scale(add(add(a[1],a[2]),a[10]),1/3));
    for(const center of centers)for(let i=0;i<3;i++)run.enemies.push(new HarvestOrganism(++run.nextEnemyId,'food',add(center,{x:(i-1)*16,y:0}),{x:0,y:0},i));
  }
  record(run:EncounterSimulation,result:HarvestResult):void{
    if(!this.active(run)||result.rawFood===0||run.enemies.length)return;
    if((this.stepIndex===0&&[3,4].includes(result.nodes.length))||(this.stepIndex===2&&result.nodes.length>=6)){
      this.nodes=[...result.nodes];this.stepIndex++;
    }
  }
  step(run:EncounterSimulation):void{
    for(const body of run.enemies)body.age=Math.min(body.age,3);
    if([1,3].includes(this.stepIndex)&&this.nodes.every(id=>run.isReady(id))){
      this.stepIndex++;this.nodes=[];if(this.stepIndex===2)this.seedFood(run);
    }else if([0,2].includes(this.stepIndex)&&!run.enemies.length&&!run.clots.length)this.seedFood(run);
  }
  instruction(run:EncounterSimulation):{title:string;detail:string}{
    if([1,3].includes(this.stepIndex))return {title:'Watch your cells return',detail:`They merge to digest the food. Ready again in ${Math.max(0,...this.nodes.map(id=>run.cells[id].remaining)).toFixed(1)}s.`};
    return this.stepIndex===2?{title:'Try a wider capture',detail:'Drag through 1 to 6 around both food clusters. Return to 1, then release.'}:
      {title:'Try a small capture',detail:'Drag 1 → 2 → 3 → 1, then release. Any ready blue cells can connect.'};
  }
}
