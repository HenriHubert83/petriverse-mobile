// Existing-body integration from prototype/scripts/journey_ecology.gd.
// Wave scheduling, competitor decisions and cradle hatching remain pending.
// See CREDITS.md and LICENSE.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {Point} from '../geometry/loopGeometry';
import {Drifter,add,sub,scale,unit} from './drifter';
import {FoodWeb} from './foodWeb';
import {EcologyEnemy} from './ecologyEnemy';
import {HarvestOrganism} from './harvestOrganism';
import {JourneyBoss,SHIELD_WINDOW} from '../campaign/journeyBoss';

export class EncounterEcology {
  notice='';noticeTime=0;
  readonly foodWeb=new FoodWeb(message=>this.announce(message));
  announce(message:string):void{this.notice=message;this.noticeTime=5;}
  blocked(run:EncounterSimulation,node:number):boolean{
    return run.enemies.some(b=>b instanceof EcologyEnemy&&b.kind==='parasite'&&b.latched&&b.targetNode===node);
  }
  pocket(run:EncounterSimulation,area:number):Point{
    const n=((area%8)+8)%8,a=run.board.anchors;
    return scale(add(add(a[n],a[8+n]),a[8+(n+1)%8]),1/3);
  }
  spawnGates(run:EncounterSimulation,holder:Drifter|undefined=run.boss()):void{
    if(!holder||holder.health<=0||(holder.isBoss()&&(!(holder instanceof JourneyBoss)||holder.variant!==1)))return;
    run.enemies=run.enemies.filter(b=>!holder.gateIds.includes(b.id));
    holder.gateIds=[];holder.shieldRemaining=0;
    for(let i=0;i<2;i++){
      const area=(run.harvest.rotation+(holder instanceof JourneyBoss&&holder.isBoss()?holder.roundIndex*3:0)+i*2)%8;
      const at=holder.isBoss()?this.pocket(run,area):add(holder.nucleus,{x:i===0?-27:27,y:12});
      const guard=new EcologyEnemy(++run.nextEnemyId,'warden',at,area);guard.spawning=0;
      run.enemies.push(guard);holder.gateIds.push(guard.id);run.discover('warden');
    }
  }
  resolveGates(run:EncounterSimulation):void{
    const alive=new Set(run.enemies.map(b=>b.id));
    for(const holder of run.enemies){
      if(!holder.gateIds.length)continue;
      const previous=holder.gateIds.length;holder.gateIds=holder.gateIds.filter(id=>alive.has(id));
      if(!holder.gateIds.length){
        holder.shieldRemaining=0;
        if(holder instanceof JourneyBoss&&holder.isBoss()){
          holder.openRemaining=14;this.announce('Shields broken · Regent open for 14s');
        }else{
          holder.cradleOpenAge=holder.age;this.announce('Cradle open · rescue now, or protect it for 12s to hatch two young');
        }
      }else if(previous>holder.gateIds.length){
        holder.shieldRemaining=SHIELD_WINDOW;this.announce('Capture the remaining shield before it regrows · 18s');
      }
    }
  }
  huntDestination(run:EncounterSimulation,body:Drifter):Point{return this.foodWeb.huntDestination(run,body);}
  disturbSurvivors(run:EncounterSimulation,center:Point):void{this.foodWeb.disturbSurvivors(run,center);}
  stepExistingBodies(run:EncounterSimulation,delta:number):void{
    this.noticeTime=Math.max(0,this.noticeTime-delta);
    const boss=run.boss();
    if(boss instanceof JourneyBoss&&boss.variant===1&&!boss.gateIds.length&&boss.openRemaining<=0&&boss.resetRemaining<=0)this.spawnGates(run,boss);
    for(const holder of [...run.enemies]){
      if(holder.shieldRemaining>0){
        holder.shieldRemaining=Math.max(0,holder.shieldRemaining-delta);
        if(holder.shieldRemaining<=0&&holder.gateIds.length){
          this.spawnGates(run,holder);this.announce('Shields regrew · capture both together or in quick succession');
        }
      }
      if(holder instanceof JourneyBoss&&['bellwether','bell_bud'].includes(holder.kind)){
        for(const food of run.enemies){
          if(!(food instanceof HarvestOrganism)||!['food','cyst'].includes(food.kind))continue;
          const toward=sub(holder.nucleus,food.nucleus),d=Math.hypot(toward.x,toward.y);
          if(d>60&&d<250)food.origin=add(food.origin,scale(unit(toward),holder.currentStrength()*3*delta*(1-d/350)));
        }
      }
    }
    const linked=new Set(run.enemies.flatMap(b=>b.gateIds));
    run.enemies=run.enemies.filter(b=>b.kind!=='warden'||linked.has(b.id));
    run.amoebas.step(run,delta);run.phages.step(run,delta);this.foodWeb.step(run,delta);
  }
}
