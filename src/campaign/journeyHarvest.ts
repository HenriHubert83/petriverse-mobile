// Capture, scoring and objective subset of prototype/scripts/journey_harvest.gd.
// Bloom/director setup, lessons, habitat events and legacy final surge are pending.
// See CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {distanceToSegment} from '../geometry/loopGeometry';
import type {CapturePlan} from '../geometry/loopResolver';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {damage} from '../evolution/captureRules';
import {Drifter,add,sub,scale,unit} from '../ecology/drifter';
import {Amoeba} from '../ecology/amoeba';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {EncounterEcology} from '../ecology/encounterEcology';
import {JourneyBoss} from './journeyBoss';
import {captureMastery} from './journeyMastery';
import type {Feat} from './journeyMastery';

export interface EncounterSpec {
  stage:number;mode:'feed'|'rescue'|'purify'|'defend'|'sectors'|'boss';
  food:number;target:number;duration:number;generated?:boolean;
}
export interface HarvestOutcome {
  food:number;poison:number;threats:number;rescued:number;purified:number;rawFood:number;
  filtered:number;bossLayers:number;wardens:number;salvage:number;foodBonuses:Record<string,number>;cellsRescued:number;
}
export interface HarvestResult extends HarvestOutcome {
  valid:true;ids:number[];points:number;captureGrade:string;captureBonus:number;flow:number;flowBonus:number;
  polygon:Point[];positions:Point[];preyKinds:string[];preyForms:string[];nodes:number[];
  kills:number;bodies:number;armorHits:number;restoredNode:number;recovery:number;mastery:Feat[];
}
// The only expedition spore forms in pinned expedition_creatures.gd. Full form catalogue is pending.
const EXPEDITION_SPORES=new Set(['glasswing_spore','comet_spore']);
export const FLOW_WINDOW=3,FLOW_STEP=40;
export class JourneyHarvest {
  readonly ecology=new EncounterEcology();
  nourishment=0;poisonTaken=0;rescued=0;purified=0;defended=0;visited:number[]=[];
  cleanFood=0;huntersCaptured=0;bossHits=0;flow=0;bestFlow=0;lastFlowTime=-100;
  lossTitle='The mother died.';lossReason='';rotation=0;
  constructor(readonly spec:Readonly<EncounterSpec>){}

  outcome(ids:readonly number[],run:EncounterSimulation,loopSize=run.selection.path.length):HarvestOutcome{
    const result:HarvestOutcome={food:0,poison:0,threats:0,rescued:0,purified:0,rawFood:0,filtered:0,
      bossLayers:0,wardens:0,salvage:0,foodBonuses:{},cellsRescued:0};
    let cysts=0;
    for(const body of run.enemies){
      if(!ids.includes(body.id))continue;
      if(body.kind==='food')result.rawFood++;
      else if(body.kind==='cyst')cysts++;
      else if(body.kind==='spore')result.rescued++;
      else if(body.kind==='warden')result.wardens++;
      else if(body.isBoss()){
        if(this.nourishment>=3&&body.canTakePulse())result.bossLayers++;
      }else if(body.health<=damage(run.mutations,loopSize)){
        result.threats++;
        if(body instanceof Amoeba&&body.captiveNode>=0)result.cellsRescued++;
        if(body instanceof EcologyEnemy&&['grazer','bacterium'].includes(body.kind))result.salvage+=body.storedFood;
        result.salvage+=body.carriedFood;
      }
    }
    result.food=result.rawFood+result.salvage;result.poison=cysts;
    if(this.spec.mode==='purify'&&result.rawFood===0&&result.rescued===0&&result.threats===0&&ids.length===cysts){
      result.purified=cysts;result.poison=0;
    }else if(run.mutations.includes('filter')){result.filtered=Math.min(1,cysts);result.poison-=result.filtered;}
    const has=(id:string)=>run.mutations.includes(id),bonuses=result.foodBonuses;
    if(has('fission')&&loopSize<=4&&result.rawFood>0&&result.poison===0)bonuses.fission=1;
    if(has('elastic')&&loopSize>=6&&result.rawFood>0)bonuses.elastic=result.rawFood;
    if(has('feast')&&result.rawFood>=4)bonuses.feast=2;
    if(has('grazer')&&[1,2].includes(result.rawFood)&&result.poison===0)bonuses.grazer=1;
    if(has('symbiosis')&&result.threats>0)bonuses.symbiosis=result.threats*2;
    if(has('catalyst')&&result.purified===0&&cysts>0)bonuses.catalyst=cysts*2;
    if(run.growthActive('feeder')>0&&result.rawFood>=4&&result.poison===0)bonuses.feeder=run.growthActive('feeder');
    result.food+=Object.values(bonuses).reduce((a,b)=>a+b,0);
    return result;
  }
  hunterQuota():number{return this.spec.mode==='feed'&&this.spec.generated&&this.spec.stage>=4?2:0;}

  commit(plan:CapturePlan,run:EncounterSimulation):HarvestResult{
    const {nodes,polygon,ids,recovery}=plan,result=this.outcome(ids,run,nodes.length);
    const positions:Point[]=[],preyKinds:string[]=[],preyForms:string[]=[],absorbed:number[]=[],splitHearts:Point[]=[];
    let armorHits=0,bossLayers=0,poisonLeft=result.poison;
    run.motherDamage.prepareIntegrity(run.integrity);
    for(const body of run.enemies){
      if(!ids.includes(body.id))continue;
      if(body.isBoss()){
        if(this.nourishment<3||!body.canTakePulse())continue;
        this.nourishment-=3;bossLayers++;this.bossHits++;
        if(!body.applyPulse(1)){
          if(body instanceof JourneyBoss&&body.variant===2)splitHearts.push({...body.nucleus});
          continue;
        }
        run.bossDefeated=true;
      }else if(!['food','cyst','spore'].includes(body.kind)){
        if(!body.applyPulse(damage(run.mutations,nodes.length))){armorHits++;continue;}
        if(['drifter','shellback','twinspore','divider'].includes(body.kind))this.huntersCaptured++;
      }
      if(body.kind==='food'){
        const v=sub(body.nucleus,run.board.center),angle=Math.atan2(v.y,v.x)/(Math.PI/4);
        // Godot roundi resolves half-way values away from zero, unlike Math.round.
        const sector=((Math.sign(angle)*Math.floor(Math.abs(angle)+0.5))%8+8)%8;
        if(!this.visited.includes(sector))this.visited.push(sector);
      }
      if(body.kind==='cyst'&&poisonLeft>0){
        const origin=add(run.board.center,scale(unit(sub(body.nucleus,run.board.center)),43));
        run.motherDamage.record(body.id,origin,run.board.center,'cyst',[origin]);poisonLeft--;
      }
      if(body.kind==='spore')run.rescuedSpecimens.push({token:`${run.runSeed}:${run.stageIndex}:${body.id}`,
        form:body.form,stage:run.stageIndex,encounter:run.encounterIndex+1,rare:body.visitor||EXPEDITION_SPORES.has(body.form),story:body.story});
      if(body instanceof Amoeba)run.amoebas.rescue(run,body);
      absorbed.push(body.id);
      for(const p of body.nuclei()){positions.push({...p});preyKinds.push(body.kind);preyForms.push(body.form);}
    }
    for(const at of splitHearts){
      const offset=sub(at,run.board.center),birthplace=add(run.board.center,scale(unit(offset),Math.max(180,Math.hypot(offset.x,offset.y))));
      const young=new Drifter(++run.nextEnemyId,birthplace,5.4,'twinspore');young.stunned=3;young.foragingDone=true;
      run.enemies.push(young);run.discover('twinspore');
      this.ecology.announce('Young hearts are hatching nearby · catch both before they reach Mother');
    }
    this.nourishment+=result.food;if(this.spec.mode==='boss')this.nourishment=Math.min(6,this.nourishment);
    run.bankFood(result.food);run.totalFood+=result.food;this.poisonTaken+=result.poison;
    run.integrity=Math.max(0,run.integrity-result.poison);
    this.rescued+=result.rescued;this.purified+=result.purified;this.defended+=result.threats;run.totalRescued+=result.rescued;
    const mastery=captureMastery(run,absorbed,result.poison);
    run.enemies=run.enemies.filter(b=>!absorbed.includes(b.id));
    const center=scale(polygon.reduce(add,{x:0,y:0}),1/polygon.length);
    if(absorbed.length&&run.stageIndex>=2)this.ecology.disturbSurvivors(run,center);
    this.ecology.resolveGates(run);
    run.kills+=result.rawFood+result.threats;run.bestCapture=Math.max(run.bestCapture,result.rawFood);run.loopsDrawn++;
    let captureGrade='',captureBonus=0,flowBonus=0;
    if(result.poison===0){
      if(positions.length>=7){captureGrade='Living constellation';captureBonus=300;}
      else if(positions.length>=5){captureGrade='Grand sweep';captureBonus=150;}
      else if(result.rawFood>=2&&result.threats>=1){captureGrade='Balanced harvest';captureBonus=75;}
    }
    const meaningful=result.food>0||result.threats>0||result.rescued>0||result.purified>0||bossLayers>0;
    if(meaningful&&result.poison===0){
      this.flow=run.stageElapsed-this.lastFlowTime<=FLOW_WINDOW?this.flow+1:1;
      this.lastFlowTime=run.stageElapsed;this.bestFlow=Math.max(this.bestFlow,this.flow);flowBonus=FLOW_STEP*Math.min(this.flow-1,5);
    }else this.flow=0;
    const points=result.food*25+result.threats*100+result.rescued*150+result.purified*30+bossLayers*300+captureBonus+flowBonus;
    run.score+=points;
    if(run.mutations.includes('nursery')&&result.poison===0){
      this.cleanFood+=result.rawFood;
      if(this.cleanFood>=12&&run.integrity>0){this.cleanFood-=12;run.heal(1);}
    }
    let restoredNode=-1;
    if(run.mutations.includes('frenzy')&&positions.length>=3){restoredNode=nodes[0];run.cells[restoredNode].remaining=0;}
    if(run.mutations.includes('lure'))for(const body of run.enemies){
      if(body.kind==='food'&&polygon.some((p,i)=>distanceToSegment(body.nucleus,p,polygon[(i+1)%polygon.length])<110))body.pullToward(center,22);
    }
    if(run.mutations.includes('residual'))run.residuals.push({polygon:polygon.map(p=>({...p})),remaining:4});
    return {...result,valid:true,ids:[...ids],points,captureGrade,captureBonus,flow:this.flow,flowBonus,
      polygon:polygon.map(p=>({...p})),positions,preyKinds,preyForms,nodes:[...nodes],kills:result.rawFood+result.threats,
      bodies:positions.length,armorHits,restoredNode,recovery,bossLayers,mastery};
  }
  objectiveCount():number{
    switch(this.spec.mode){
      case 'feed':return this.hunterQuota()>0?this.huntersCaptured:this.nourishment;
      case 'rescue':return this.rescued;
      case 'purify':return this.purified;
      case 'defend':return this.defended;
      case 'sectors':return this.visited.length;
      case 'boss':return this.bossHits;
    }
  }
  objectiveLabel():string{
    if(this.hunterQuota()>0)return 'hunters captured';
    return {rescue:'spores rescued',purify:'cysts neutralized',defend:'hunters captured',sectors:'feeding sectors',boss:'layers dissolved',feed:'food gathered'}[this.spec.mode];
  }
  deadline():number{return this.spec.duration;}
  checkCompletion(run:EncounterSimulation):void{
    if(run.state!=='active')return;
    if(run.integrity<=0){
      this.lossTitle='The mother was poisoned.';this.lossReason='A mixed meal contained more cysts than the colony could survive.';run.state='loss';
    }else if(this.spec.mode==='boss'?run.bossDefeated:
      this.nourishment>=this.spec.food&&(this.spec.mode==='feed'?this.huntersCaptured>=this.hunterQuota():this.objectiveCount()>=this.spec.target)){
      run.finishEncounter();
    }
    if(run.state==='active'&&run.stageElapsed>=this.deadline()){
      this.lossTitle='The current moved on.';this.lossReason="The encounter's goals were unfinished. Retry this encounter with your colony intact.";run.state='loss';
    }
    if(run.state!=='active')run.selection.cancel();
  }
  stepExistingBodies(run:EncounterSimulation,delta:number):void{
    run.enemies=run.enemies.filter(b=>!(b instanceof HarvestOrganism)||!['food','cyst','spore'].includes(b.kind)||b.age<b.lifetime());
    this.ecology.stepExistingBodies(run,delta);
    if(run.stageIndex>=4){
      const now=run.stageElapsed;
      const current=run.stageIndex>=8?{x:Math.cos(now*0.025)*0.65,y:Math.sin(now*0.025)*0.65}:
        {x:Math.floor(now/18)%2===0?0.7:-0.7,y:0.18*Math.sin(now*0.1)};
      for(const body of run.enemies)if(body instanceof HarvestOrganism&&['food','cyst','spore'].includes(body.kind))body.origin=add(body.origin,scale(current,delta));
    }
  }
}
