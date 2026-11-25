// Ordinary encounter director and behavior from prototype/scripts/journey_ecology.gd.
// Legacy final surges and sheltered habitat scheduling remain pending.
// See CREDITS.md and LICENSE.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {Point} from '../geometry/loopGeometry';
import {Drifter,add,sub,scale,unit} from './drifter';
import {FoodWeb} from './foodWeb';
import {EcologyEnemy} from './ecologyEnemy';
import {HarvestOrganism} from './harvestOrganism';
import {JourneyBoss,SHIELD_WINDOW} from '../campaign/journeyBoss';
import {Amoeba} from './amoeba';
import {Bacterium} from './bacterium';
import {contains,polygonFor} from '../geometry/loopGeometry';
import {pacing,rhythmSample} from '../campaign/encounterRhythm';

export interface ArrivalEvent {at:number;kind:string;area:number;species?:string}
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

export class EncounterEcology {
  notice='';noticeTime=0;
  nextWave=12;wave=0;pending:ArrivalEvent[]=[];
  readonly foodWeb=new FoodWeb(message=>this.announce(message));
  announce(message:string):void{this.notice=message;this.noticeTime=5;}
  blocked(run:EncounterSimulation,node:number):boolean{
    return run.enemies.some(b=>b instanceof EcologyEnemy&&b.kind==='parasite'&&b.latched&&b.targetNode===node);
  }
  pocket(run:EncounterSimulation,area:number,outer=false):Point{
    const n=((area%8)+8)%8,a=run.board.anchors;
    return outer?scale(add(add(a[8+n],a[16+n]),a[16+(n+1)%8]),1/3):scale(add(add(a[n],a[8+n]),a[8+(n+1)%8]),1/3);
  }
  add(run:EncounterSimulation,kind:string,area:number,at:Point,form=''):EcologyEnemy|Amoeba{
    const id=++run.nextEnemyId,body=kind==='amoeba'?new Amoeba(id,at):kind==='bacterium'?new Bacterium(id,at,area%8):new EcologyEnemy(id,kind,at,area%8);
    body.form=form;run.enemies.push(body);run.discover(kind);return body;
  }
  begin(run:EncounterSimulation):void{
    this.nextWave=pacing(run.stageIndex).warning;
    if(run.harvest.spec.mode==='boss')this.spawnGates(run);
    if(run.harvest.spec.phageLesson){const body=this.add(run,'bacterium',run.harvest.rotation,this.pocket(run,run.harvest.rotation));run.phages.pair(run,body);}
    if(run.stageIndex===2&&!run.harvest.spec.generated){
      const bud=new JourneyBoss(++run.nextEnemyId,run.board,0);bud.juvenile=true;bud.kind='bell_bud';bud.health=1;
      bud.nucleus=this.pocket(run,(run.harvest.rotation+2)%8);run.enemies.push(bud);run.discover('bell_bud');
    }
    if(run.stageIndex===6&&!run.harvest.spec.generated){
      const spore=run.enemies.find(b=>b.kind==='spore');if(spore){spore.cradle=true;spore.story='cradle';this.spawnGates(run,spore);}
    }
  }
  hunterSpeed(run:EncounterSimulation):number{
    return run.stageIndex<4||run.mutations.length<4?5.4:Math.min(9,5.4+0.7*(run.mutations.length-3)+0.15*(run.stageIndex-4));
  }
  queueWave(run:EncounterSimulation):void{
    const spec=run.harvest.spec,area=(run.harvest.rotation+this.wave*(spec.sectorStep??3))%8,stage=run.stageIndex;
    let family=stage<4?'grazer':this.wave%2===0?'parasite':'grazer';
    if((stage===6&&this.wave%2===0)||(stage>=8&&this.wave%2===1))family='divider';
    if((stage===5&&this.wave%3===0)||(stage>=8&&this.wave%3===2))family='amoeba';
    if(spec.families?.length)family=spec.families[this.wave%spec.families.length];
    else if((stage===2&&this.wave===1)||(stage>=4&&this.wave%3===1))family='bacterium';
    const at=run.stageElapsed+8,early=stage>=4&&run.mutations.length>=5,pace=pacing(stage);
    this.pending.push({at,kind:'bloom',area},{at,kind:family,area});
    if((stage>=2||this.wave>0)&&!(spec.phageLesson&&this.wave===0)){
      this.pending.push({at:early?at:at+4,kind:'hunter',area:(area+3)%8,...(spec.hunter?{species:spec.hunter}:{})});
      if(pace.extraEvery>0&&this.wave%pace.extraEvery===0)this.pending.push({at:early?at+6:at+10,kind:'hunter',area:(area+6)%8,species:'drifter'});
    }
    if(spec.mode==='rescue')this.pending.push({at,kind:'spore',area});
    this.wave++;this.announce('Life approaches in 8s · watch the marked water');
  }
  arrivalSite(run:EncounterSimulation,event:Pick<ArrivalEvent,'kind'|'area'>){
    const point=this.pocket(run,event.area,['hunter','parasite'].includes(event.kind));
    const site={position:event.kind==='hunter'?point:add(point,{x:18,y:-12}),nodes:[] as number[],target:8+event.area,destination:point};
    if(event.kind!=='parasite')return site;
    let best=Infinity;
    for(const triangle of run.board.triangles){
      if(triangle.includes(site.target))continue;
      const polygon=polygonFor(triangle,run.board.anchors),center=scale(polygon.reduce(add,{x:0,y:0}),1/3);
      const cost=dist(center,run.board.anchors[site.target])+1000*run.enemies.filter(b=>b.kind==='cyst'&&contains(b.nucleus,polygon)).length;
      if(cost<best){best=cost;site.nodes=[...triangle];site.destination=center;site.position=add(center,{x:18,y:-12});}
    }
    return site;
  }
  spawnEvent(run:EncounterSimulation,event:ArrivalEvent):void{
    if(event.kind==='bloom'){run.harvest.spawnBloom(run,event.area);return;}
    if(event.kind==='spore'){if(run.enemies.filter(b=>b.kind==='spore').length<3)run.harvest.spawnSpore(run,event.area);return;}
    if(event.kind==='hunter'){
      if(run.enemies.filter(b=>['drifter','shellback','twinspore','divider'].includes(b.kind)).length>=4)return;
      const kind=event.species??(run.stageIndex>=4&&this.wave%2===0?(run.stageIndex<8?'shellback':'twinspore'):'drifter');
      const at=this.arrivalSite(run,event).position,outward=sub(at,run.board.center);
      const body=new Drifter(++run.nextEnemyId,at,this.hunterSpeed(run),kind);body.pairAngle=Math.atan2(outward.y,outward.x)+Math.PI/2;
      run.enemies.push(body);run.discover(kind);run.harvest.threatsSpawned++;return;
    }
    if(run.enemies.filter(b=>b.kind===event.kind).length>=(event.kind==='amoeba'&&run.stageIndex<8?1:2))return;
    const site=this.arrivalSite(run,event),body=this.add(run,event.kind,event.area,site.position);
    if(event.kind==='bacterium')run.phages.pair(run,body);
    if(body instanceof EcologyEnemy){
      if(event.kind==='parasite'){body.targetNode=site.target;body.siteNodes=site.nodes;body.destination=site.destination;}
      else if(event.kind==='grazer')body.destination=site.destination;
    }
  }
  warningSites(run:EncounterSimulation):{position:Point;remaining:number;kind:string}[]{
    return this.pending.filter(e=>e.at>run.stageElapsed&&e.at-run.stageElapsed<=8&&!['bloom','spore'].includes(e.kind))
      .map(e=>({position:this.arrivalSite(run,e).position,remaining:e.at-run.stageElapsed,kind:e.kind}));
  }
  pressureText(run:EncounterSimulation):string{
    if(this.noticeTime>0)return this.notice;
    const beat=rhythmSample(run);return beat.title+(beat.remaining>0?` · ${Math.ceil(beat.remaining)}s`:'');
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
    if(run.contentEnabled){
      if(run.stageIndex>0&&run.stageElapsed>=this.nextWave&&run.stageElapsed<run.harvest.spec.duration-22){this.queueWave(run);this.nextWave+=pacing(run.stageIndex).cycle;}
      const due=this.pending.filter(e=>e.at<=run.stageElapsed);this.pending=this.pending.filter(e=>e.at>run.stageElapsed);
      for(const event of due)this.spawnEvent(run,event);
    }
    run.amoebas.step(run,delta);run.phages.step(run,delta);this.foodWeb.step(run,delta);
    this.stepCradles(run);this.stepCompetitors(run,delta);
  }
  private stepCradles(run:EncounterSimulation):void{
    for(const holder of [...run.enemies]){
      if(!(holder instanceof HarvestOrganism)||!holder.cradle||holder.hatchRemaining()!==0)continue;
      run.enemies=run.enemies.filter(b=>b!==holder);
      const outward=sub(holder.nucleus,run.board.center);let axis=unit({x:outward.y,y:-outward.x});if(axis.x===0&&axis.y===0)axis={x:1,y:0};
      for(let i=0;i<2;i++){
        const young=new HarvestOrganism(++run.nextEnemyId,'spore',add(holder.nucleus,scale(axis,i===0?-13:13)),{x:7,y:6},i*Math.PI);
        young.form=i===0?'snow_spore':'sail_spore';young.story='hatchling';run.enemies.push(young);run.discover(young.form);
      }
      this.announce('The cradle hatched · rescue both pearl-white young');
    }
  }
  private stepCompetitors(run:EncounterSimulation,delta:number):void{
    const removed=new Set<number>(),newborns:{area:number;position:Point;form:string}[]=[];
    for(const body of [...run.enemies]){
      if(!(body instanceof EcologyEnemy)||body.spawning>0)continue;
      if(['grazer','bacterium'].includes(body.kind)){
        if(body instanceof Bacterium&&body.infectionAge>=3){body.destination={...body.nucleus};continue;}
        let food:Drifter|undefined,distance=Infinity;
        for(const candidate of run.enemies){
          if(candidate.kind!=='food'||removed.has(candidate.id))continue;
          const d=dist(body.nucleus,candidate.nucleus);if(d<distance){distance=d;food=candidate;}
        }
        if(food&&body.storedFood<3){
          if(body.targetId!==food.id)body.actionClock=0;
          body.targetId=food.id;body.destination={...food.nucleus};
          if(distance<18){body.actionClock+=delta;if(body.actionClock>=4){body.actionClock=0;body.storedFood++;this.foodWeb.eatenFood++;removed.add(food.id);}}
        }else body.destination=add(run.board.center,scale(unit(sub(body.nucleus,run.board.center)),435));
        if(dist(body.nucleus,run.board.center)>408&&(!(body instanceof Bacterium)||body.infectionAge<0))removed.add(body.id);
      }else if(body.kind==='parasite'){
        if(!body.siteNodes.length)continue;
        body.destination=scale(body.siteNodes.reduce((sum,n)=>add(sum,run.board.anchors[n]),{x:0,y:0}),1/body.siteNodes.length);
        if(body.latched)body.nucleus={...body.destination};
        else if(dist(body.nucleus,body.destination)<6){
          body.actionClock+=delta;
          if(body.actionClock>=7&&!run.selection.path.includes(body.targetNode)&&run.cells[body.targetNode]?.isReady()&&!run.amoebas.reserved(run,body.targetNode,body.id)){
            body.latched=true;this.announce('A parasite blocked a cell · capture its coral body');
          }
        }
      }else if(body.kind==='divider'&&!body.daughter&&body.splitRemaining()<=0){
        removed.add(body.id);const out=sub(body.nucleus,run.board.center),axis=unit({x:out.y,y:-out.x});
        for(const sign of [-1,1])newborns.push({area:body.sector,position:add(body.nucleus,scale(axis,sign*20)),form:body.form});
        this.announce('Divider split · catch both young hunters in one loop');
      }
    }
    run.enemies=run.enemies.filter(b=>!removed.has(b.id));
    for(const child of newborns){const b=this.add(run,'divider',child.area,child.position,child.form) as EcologyEnemy;b.daughter=true;b.speed=7;b.spawning=1;}
  }
}
