// Authored ecological moments from prototype/scripts/habitat_events.gd.
// See CREDITS.md and LICENSE.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {Point} from '../geometry/loopGeometry';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {add,scale,smooth} from '../ecology/drifter';
type Kind='migration'|'hatching'|'traveller';
const KINDS:Record<number,Kind>={2:'migration',5:'hatching',9:'traveller'};
const NAMES={migration:'A drifting bloom',hatching:'A sleeping garden',traveller:'A giant in the deep'};
export class HabitatEvents {
  kind:Kind|undefined;at=46;born=false;warned=false;woken=false;wakeWarned=false;food:number[]=[];sites:Point[]=[];
  begin(run:EncounterSimulation):void{this.kind=run.harvest.spec.event??KINDS[run.stageIndex];this.at=run.harvest.spec.eventAt??46;}
  position(run:EncounterSimulation):Point{
    const age=run.stageElapsed-this.at;
    return add(run.board.center,{x:-315+630*Math.max(0,Math.min(1,age/32)),y:96+Math.sin(age*0.09)*23});
  }
  sample(run:EncounterSimulation){
    const age=run.stageElapsed-this.at,kind=this.kind;if(!kind||age< -8||age>32)return;
    const detail=age<0?`Arrives in ${Math.ceil(-age)}s · watch the water`:kind==='hatching'?
      age<22?`Cysts hatch in ${Math.ceil(22-age)}s · gather the green food first`:'The garden has woken · leave purple cysts outside':
      kind==='migration'?'A food bloom is drifting past · its grazer follows':'Harmless, far below · its current separates food and poison';
    return {kind,age,title:NAMES[kind],detail,position:this.position(run),strength:smooth(0,5,age)*(1-smooth(24,32,age))};
  }
  step(run:EncounterSimulation,delta:number):void{
    const event=this.sample(run);if(!event)return;
    const {age,kind}=event;
    if(!this.warned){this.warned=true;run.harvest.ecology.announce(event.title+' · arrives in 8s');}
    if(age<0)return;
    if(!this.born){
      this.born=true;
      if(kind!=='traveller'){
        const area=(run.harvest.rotation+2)%8;
        for(let i=0;i<3;i++){
          const at=run.harvest.ecology.pocket(run,(area+i)%8);this.sites.push(at);
          for(let j=0;j<2;j++){
            const food=new HarvestOrganism(++run.nextEnemyId,'food',add(at,{x:(j-0.5)*20,y:0}),{x:5,y:4},i+j);
            food.bloomId=100000+run.stageIndex;run.enemies.push(food);if(run.creatureContentEnabled)run.assignForm(food);this.food.push(food.id);
          }
        }
        if(kind==='migration')run.harvest.ecology.pending.push({at:run.stageElapsed+8,kind:'grazer',area});
      }
    }
    if(kind==='migration')for(const body of run.enemies){
      if(!(body instanceof HarvestOrganism)||!this.food.includes(body.id))continue;
      const next=add(body.origin,scale({x:2.6,y:-0.9},delta));
      if(Math.hypot(next.x-run.board.center.x,next.y-run.board.center.y)<330)body.origin=next;
    }
    if(kind==='hatching'){
      if(age>=14&&!this.wakeWarned){this.wakeWarned=true;run.harvest.ecology.announce('The garden is waking · cysts hatch at the marked sites in 8s');}
      if(age>=22&&!this.woken){
        this.woken=true;for(const at of this.sites){
          const id=++run.nextEnemyId,cyst=new HarvestOrganism(id,'cyst',at,{x:6,y:4},id);
          run.enemies.push(cyst);if(run.creatureContentEnabled)run.assignForm(cyst);
        }
      }
    }
    if(kind==='traveller')for(const body of run.enemies){
      if(!(body instanceof HarvestOrganism)||!['food','cyst'].includes(body.kind)||Math.hypot(body.nucleus.x-event.position.x,body.nucleus.y-event.position.y)>180)continue;
      const next=add(body.origin,{x:0,y:(body.kind==='food'?-1:1)*2.8*event.strength*delta});
      if(Math.hypot(next.x-run.board.center.x,next.y-run.board.center.y)<334)body.origin=next;
    }
  }
}
