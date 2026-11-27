// Port of public producer_lab.gd experiments, with isolated encounter state.
// The original lab disables journey/profile/record writes. This model has no storage.
import {EncounterSimulation} from '../engine/encounterSimulation';
import {JourneyBoss} from '../campaign/journeyBoss';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {Drifter,add,sub,scale,unit} from '../ecology/drifter';
import type {Point} from '../geometry/loopGeometry';
import {BOSS_HEALTH,BROOD_TOTAL,BROOD_SAFE_NEEDED,ESCORT_SECONDS,CURRENT_GOAL,CURRENT_SECONDS,
  Escort,BossPhase,arcPoint,currentLayout,currentVelocity,insideDish} from './producerLabRules';
import type {CurrentChoice} from './producerLabRules';

export type ExperimentId=1|2|3;
export type LabPhase='menu'|'choice'|'brief'|'playing'|'won'|'lost';
export const EXPERIMENTS:readonly {id:ExperimentId;title:string;detail:string;instructions:readonly string[]}[]=[
  {id:1,title:'Safe passage',detail:'Escort 3 pearl brood along the arc. Need 2 safe, including at least 1 true arrival.',instructions:[
    'Draw a loop through at least 3 blue cells, return to the first cell, then release. Enclose hunters to remove them.',
    'Brood follow the glowing arc. Enclosing a brood rescues it safely, but does not count as an arrival.',
    'Lose too many brood, run out of time, or lose Mother and the experiment fails.']},
  {id:2,title:'Choose the current',detail:'Choose a fast channel or sheltered eddy in the same seeded dish. Gather 8 food in 75 seconds.',instructions:[
    'Draw loops around food. Avoid purple cysts: they poison Mother.',
    'Watch the arrows. The current really carries food. Keep loops clean and quick.']},
  {id:3,title:'The Regent breaks',detail:'Break the shields, then hit the open Regent. Its shell breaks after the first hit.',instructions:[
    'Loop both gold shield wardens to open the Regent, then loop the Regent. Each hit costs 3 food charge.',
    'After the first hit its shell breaks, shields move to opposite flanks, and food opens below it.']},
];
interface Brood {body:HarvestOrganism;t:number}
interface Hunter {body:Drifter;position:Point}
interface HunterArrival {at:number;warned:boolean;spawned:boolean;position:Point}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

export class ProducerLab {
  phase:LabPhase='menu';experiment:ExperimentId|undefined;feedback='Pick an experiment.';
  run:EncounterSimulation;escort=new Escort();bossPhase=new BossPhase();
  broods:Brood[]=[];hunters:Hunter[]=[];hunterSchedule:HunterArrival[]=[];
  remaining=0;elapsed=0;currentChoice:CurrentChoice|undefined;bossRef:JourneyBoss|undefined;
  private bossHitsSeen=0;private seenCapture=0;
  constructor(readonly seed=12345){this.run=this.createRun(0);}
  get definition(){return EXPERIMENTS.find(entry=>entry.id===this.experiment);}
  get paused():boolean{return this.phase==='playing'&&this.run.state==='paused';}
  private createRun(stage:number):EncounterSimulation {
    const run=new EncounterSimulation({stage,mode:stage===7?'boss':'feed',duration:99999,food:999,target:999,threats:0},
      {seed:this.seed,maxIntegrity:5,integrity:5,content:false,creatureContentEnabled:false,habitatContentEnabled:false,guidedLesson:false});
    run.state='paused';return run;
  }
  showMenu():void {
    this.run.selection.cancel();this.run.nudge.cancel();this.run.state='paused';this.run.enemies=[];
    this.phase='menu';this.experiment=undefined;this.broods=[];this.hunters=[];this.bossRef=undefined;this.feedback='Pick an experiment.';
  }
  selectExperiment(id:ExperimentId):void {
    this.run.selection.cancel();this.run.nudge.cancel();this.experiment=id;this.escort=new Escort();this.bossPhase=new BossPhase();
    this.broods=[];this.hunters=[];this.hunterSchedule=[];this.bossHitsSeen=0;this.seenCapture=0;this.elapsed=0;this.currentChoice=undefined;this.bossRef=undefined;
    this.run=this.createRun(id===3?7:0);
    if(id===1)this.setupEscort();
    else if(id===2){this.phase='choice';this.feedback='Same seeded dish. Choose a current using the forecast.';return;}
    else this.setupBoss();
    this.phase='brief';
  }
  retry():void{if(this.experiment)this.selectExperiment(this.experiment);}
  pause():void{if(this.phase==='playing')this.run.togglePause();}
  interrupt():void{this.run.selection.cancel();this.run.nudge.cancel();if(this.phase==='playing'&&this.run.state==='active')this.run.togglePause();}
  chooseCurrent(choice:CurrentChoice):boolean {
    if(this.phase!=='choice'||this.experiment!==2)return false;
    this.currentChoice=choice;const layout=currentLayout(choice,this.run.board.center);
    for(const p of layout.food)this.addOrganism('food',p);for(const p of layout.cysts)this.addOrganism('cyst',p);
    this.remaining=CURRENT_SECONDS;this.phase='brief';this.feedback=choice==='channel'?
      'Fast channel: rich moving lane, poison beside it.':'Sheltered eddy: small safe pockets, gentle current.';return true;
  }
  begin():boolean {
    if(!['brief','choice'].includes(this.phase)||!this.experiment)return false;
    if(this.phase==='choice')this.chooseCurrent('channel');
    this.phase='playing';this.run.state='active';return true;
  }
  private addOrganism(kind:string,at:Point):HarvestOrganism {
    const id=++this.run.nextEnemyId,body=new HarvestOrganism(id,kind,at,{x:0,y:0},id*1.7);
    this.run.enemies.push(body);return body;
  }
  private setupEscort():void {
    this.remaining=ESCORT_SECONDS;
    for(let i=0;i<BROOD_TOTAL;i++)this.broods.push({body:this.addOrganism('spore',arcPoint(this.run.board.center,0)),t:-0.09*i});
    for(let i=0;i<3;i++)this.hunterSchedule.push({at:13+i*17,warned:false,spawned:false,
      position:add(this.run.board.center,i%2===0?{x:-298,y:-198}:{x:298,y:-208})});
    this.feedback='Escort the pearl brood along the arc.';
  }
  private setupBoss():void {
    this.remaining=120;this.bossRef=new JourneyBoss(++this.run.nextEnemyId,this.run.board,1);this.bossRef.health=BOSS_HEALTH;
    this.run.enemies.push(this.bossRef);this.run.harvest.ecology.spawnGates(this.run);this.run.harvest.nourishment=3;
    for(let i=0;i<3;i++)this.addOrganism('food',add(this.run.board.center,{x:-120+i*110,y:215}));
    this.feedback='Break both shield wardens, then loop the open Regent. A hit costs 3 food charge.';
  }
  /** Run after touch capture too: final captures may leave ACTIVE before the next frame. */
  observe():void {
    if(this.phase!=='playing')return;
    this.processCaptures();this.checkEnd();
  }
  update(delta:number):void {
    if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid lab delta');
    this.run.step(delta);this.observe();
    if(this.phase!=='playing'||this.run.state!=='active')return;
    this.elapsed+=delta;this.remaining=Math.max(0,this.remaining-delta);
    if(this.experiment===1)this.stepEscort(delta);
    else if(this.experiment===2)this.stepCurrent(delta);
    else this.stepBoss();
    this.checkEnd();
  }
  private stepEscort(delta:number):void {
    const run=this.run;
    for(const event of this.hunterSchedule){
      if(!event.warned&&this.elapsed>=event.at-3){event.warned=true;this.feedback='Warning: a hunter approaches the arc in 3s. Watch the marked rim.';}
      if(!event.spawned&&this.elapsed>=event.at){
        event.spawned=true;const body=new Drifter(++run.nextEnemyId,event.position,0,'drifter');
        run.enemies.push(body);this.hunters.push({body,position:{...event.position}});
      }
    }
    for(const entry of [...this.broods]){
      entry.t+=delta*0.024;entry.body.age=Math.min(entry.body.age,10);
      entry.body.nucleus=arcPoint(run.board.center,entry.t);entry.body.origin={...entry.body.nucleus};
      if(entry.t>=1){this.escort.recordArrival();run.enemies=run.enemies.filter(body=>body!==entry.body);this.broods=this.broods.filter(body=>body!==entry);
        this.feedback=`A brood arrived under its own travel: ${this.escort.safeCount()} safe, ${this.escort.arrived} arrived.`;}
    }
    for(const hunter of this.hunters){
      if(!run.enemies.includes(hunter.body))continue;
      let target=hunter.position,best=Infinity;
      for(const brood of this.broods){const d=distance(hunter.position,brood.body.nucleus);if(d<best){best=d;target=brood.body.nucleus;}}
      const diff=sub(target,hunter.position),travel=30*delta;
      hunter.position=distance(target,hunter.position)<=travel?{...target}:add(hunter.position,scale(unit(diff),travel));hunter.body.nucleus={...hunter.position};
      for(const brood of [...this.broods])if(distance(hunter.position,brood.body.nucleus)<24){
        this.escort.recordLost();run.enemies=run.enemies.filter(body=>body!==brood.body&&body!==hunter.body);this.broods=this.broods.filter(body=>body!==brood);
        this.feedback=`A hunter ate a brood: ${this.escort.lost} lost. Too many lost ends the escort.`;break;
      }
    }
    this.hunters=this.hunters.filter(hunter=>run.enemies.includes(hunter.body));
  }
  private stepCurrent(delta:number):void {
    if(!this.currentChoice)return;const run=this.run,layout=currentLayout(this.currentChoice,run.board.center);
    for(const body of run.enemies){
      if(!(body instanceof HarvestOrganism)||!['food','cyst'].includes(body.kind))continue;
      body.age=Math.min(body.age,20);const v=currentVelocity(this.currentChoice,body.nucleus,run.board.center,this.elapsed);
      let next=add(body.nucleus,scale(v,delta));
      if(!insideDish(next,run.board.center)){
        next=sub(body.nucleus,scale(v,delta));
        if(this.currentChoice==='channel'&&body.kind==='food')next={x:run.board.center.x-285,y:layout.laneY};
      }
      body.origin=next;body.nucleus={...next};
    }
    const foods=run.enemies.filter(body=>body.kind==='food').length;
    if(foods<5&&this.remaining>4)this.addOrganism('food',layout.food[foods%layout.food.length]);
  }
  private stepBoss():void {
    if(!this.bossRef)return;if(this.bossPhase.phaseBroken)this.positionWardens();
    if(this.bossRef.openRemaining>0)this.feedback=`Regent OPEN for ${Math.ceil(this.bossRef.openRemaining)}s: loop it now (needs 3 charge, have ${this.run.harvest.nourishment}).`;
  }
  private positionWardens():void {
    if(!this.bossRef)return;const anchors=this.bossPhase.shieldAnchors(this.bossRef.nucleus);
    const wardens=this.run.enemies.filter(body=>body.kind==='warden');
    for(let i=0;i<Math.min(wardens.length,anchors.length);i++){
      wardens[i].nucleus={...anchors[i]};if(wardens[i] instanceof EcologyEnemy)(wardens[i] as EcologyEnemy).destination={...anchors[i]};
    }
  }
  private processCaptures():void {
    const run=this.run;if(run.captureSerial===this.seenCapture)return;this.seenCapture=run.captureSerial;
    const ids=run.lastCapture?.ids??[];
    if(this.experiment===1){
      for(const brood of [...this.broods])if(ids.includes(brood.body.id)){
        this.broods=this.broods.filter(body=>body!==brood);this.escort.recordRescued();
        this.feedback=`Brood rescued inside your loop: safe, but a win still needs 1 true arrival (${this.escort.arrived} arrived).`;
      }
    }else if(this.experiment===2){
      if((run.lastCapture?.food??0)>0)this.feedback=`Food gathered ${run.harvest.nourishment} / ${CURRENT_GOAL}. Cysts in a loop poison Mother.`;
    }else if(run.harvest.bossHits>this.bossHitsSeen){
      this.bossHitsSeen=run.harvest.bossHits;const defeated=this.bossPhase.applyHit();
      if(this.bossPhase.breakCount===1&&this.bossHitsSeen===1){
        this.feedback='The Regent breaks! Shell cracked, shields swing to opposite flanks, and a safe feeding opening appears below.';
        this.positionWardens();for(let i=0;i<3;i++)this.addOrganism('food',add(this.bossRef!.nucleus,{x:-70+i*70,y:130}));
      }else if(!defeated)this.feedback=`Regent hit: ${this.bossPhase.health} health left. Re-break its shields during the open window.`;
    }
  }
  private checkEnd():void {
    if(this.run.integrity<=0){this.finish(false,'Mother died.');return;}
    if(this.experiment===1){
      if(this.escort.isWon()){this.finish(true,`Safe passage complete: ${this.escort.arrived} arrived, ${this.escort.rescued} loop-rescued.`);return;}
      if(this.escort.isDoomed()){this.finish(false,`Too many brood lost to reach ${BROOD_SAFE_NEEDED} safe with a true arrival.`);return;}
    }else if(this.experiment===2&&this.run.harvest.nourishment>=CURRENT_GOAL){this.finish(true,`Current mastered: gathered ${this.run.harvest.nourishment} food.`);return;}
    else if(this.experiment===3&&(this.bossPhase.defeated()||this.run.bossDefeated)){this.finish(true,'The Regent is defeated.');return;}
    if(this.remaining<=0)this.finish(false,'Time ran out.');
  }
  private finish(won:boolean,why:string):void {
    this.phase=won?'won':'lost';this.feedback=why;this.run.state='paused';this.run.selection.cancel();this.run.nudge.cancel();
  }
}
