// Port of prototype/scripts/phage_system.gd. See CREDITS.md and LICENSE.
// Context is the explicit boundary to the future journey controller.
import type {Point} from '../geometry/loopGeometry';
import type {WaterSource} from '../engine/fluidField';
import {Drifter,add,sub,scale} from './drifter';
import {Bacterium} from './bacterium';
import {PhageCluster} from './phageCluster';
import {HarvestOrganism} from './harvestOrganism';
export const CONTACT_RADIUS=36;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const limit=(p:Point,max:number):Point=>{const l=Math.hypot(p.x,p.y);return l>max?scale(p,max/l):p;};
type Burst={at:Point;age:number;angle:number;serial:number};
export interface PhageContext {
  enemies:Drifter[];nextEnemyId:number;kills:number;
  board:{center:Point;dishRadius:number;anchors:readonly Point[]};
  fluid:{sample(at:Point):Point;sources:WaterSource[]};
  harvest:{defended:number;ecology:{announce(message:string):void}};
  discover(kind:string):void;
}
type GroupSnapshot={id:number;nucleus:Point;origin:Point;drift:Point;phase:number;age:number;hostId:number;attachedFrom:Point;nudgeVector:Point;nudgeElapsed:number};
export interface PhageSnapshot{clusters:GroupSnapshot[];bursts:Burst[];serial:number;learned:boolean}
const groupData=(g:PhageCluster):GroupSnapshot=>({id:g.id,nucleus:{...g.nucleus},origin:{...g.origin},drift:{...g.drift},phase:g.phase,age:g.age,hostId:g.hostId,attachedFrom:{...g.attachedFrom},nudgeVector:{...g.nudgeVector},nudgeElapsed:g.nudgeElapsed});
export class PhageSystem {
  clusters:PhageCluster[]=[];bursts:Burst[]=[];burstSerial=0;learned=false;
  reset():void{this.clusters=[];this.bursts=[];this.burstSerial=0;}
  host(run:PhageContext,id:number):Bacterium|undefined{return run.enemies.find((b):b is Bacterium=>b instanceof Bacterium&&b.id===id);}
  add(run:PhageContext,at:Point):PhageCluster|undefined{
    if(this.clusters.length>=2)return;
    const group=new PhageCluster(++run.nextEnemyId,at);this.clusters.push(group);run.discover('phage');return group;
  }
  pair(run:PhageContext,body:Drifter):void{
    let at=add(body.nucleus,{x:0,y:-72}),clearance=-Infinity;
    for(let i=0;i<16;i++){
      const angle=i*2*Math.PI/16,candidate=add(body.nucleus,{x:Math.cos(angle)*72,y:Math.sin(angle)*72});
      if(distance(candidate,run.board.center)>run.board.dishRadius-40)continue;
      let d=Infinity;for(const cell of run.board.anchors)d=Math.min(d,distance(candidate,cell));
      if(d>clearance){clearance=d;at=candidate;}
    }
    this.add(run,at);
  }
  freeCluster():PhageCluster|undefined{return this.clusters.find(g=>g.hostId<0&&g.age>2.5&&g.opacity()>0.4);}
  nearestHost(run:PhageContext,at:Point,radius=Infinity):Bacterium|undefined{
    let chosen:Bacterium|undefined;
    for(const b of run.enemies){
      if(!(b instanceof Bacterium)||b.infectionAge>=0||b.age<2.5)continue;
      const d=distance(b.nucleus,at);if(d<radius){chosen=b;radius=d;}
    }
    return chosen;
  }
  aftermath(delta:number):void{for(const b of this.bursts)b.age+=delta;this.bursts=this.bursts.filter(b=>b.age<3.2);}
  step(run:PhageContext,delta:number):void{
    this.aftermath(delta);const consumed=new Set<number>();
    for(const group of this.clusters){
      if(group.hostId>=0){
        const body=this.host(run,group.hostId);
        if(!body){consumed.add(group.id);continue;}
        group.age+=delta;group.nucleus={...body.nucleus};
        if(body.infectionRemaining()<=0){this.rupture(run,body);consumed.add(group.id);}continue;
      }
      group.step(delta,run.board.center);
      group.advect(scale(limit(scale(run.fluid.sample(group.nucleus),0.2),1.2),delta));
      const bound=add(run.board.center,limit(sub(group.nucleus,run.board.center),run.board.dishRadius-30));
      group.advect(sub(bound,group.nucleus));
      if(group.age>=group.lifetime()){consumed.add(group.id);continue;}
      if(group.age<2.5)continue;
      const body=this.nearestHost(run,group.nucleus,CONTACT_RADIUS);
      if(body){group.hostId=body.id;group.attachedFrom={...group.nucleus};body.infectionAge=0;this.learned=true;
        run.harvest.ecology.announce('Phages attached · bacterium ruptures in 9s. You can keep feeding.');}
    }
    this.clusters=this.clusters.filter(g=>!consumed.has(g.id));
  }
  rupture(run:PhageContext,body:Bacterium):void{
    const index=run.enemies.indexOf(body);if(index<0)return;
    this.bursts.push({at:{...body.nucleus},age:0,angle:Math.atan2(body.heading.y,body.heading.x),serial:++this.burstSerial});
    run.enemies.splice(index,1);run.harvest.defended++;run.kills++;
    for(let i=0;i<body.storedFood;i++){
      const angle=i*2*Math.PI/Math.max(1,body.storedFood)+body.id,offset={x:Math.cos(angle)*20,y:Math.sin(angle)*20};
      const food=new HarvestOrganism(++run.nextEnemyId,'food',add(body.nucleus,offset),{x:4,y:3},i);
      food.story='phage_salvage';run.enemies.push(food);
    }
    const detail=body.storedFood>0?' · loop around the '+body.storedFood+' released food':' · one threat removed';
    run.harvest.ecology.announce('Bacterium ruptured'+detail);
  }
  waterSources(run:PhageContext):void{
    for(const b of this.bursts)if(b.age<1.8){
      const strength=Math.sin(b.age/1.8*Math.PI);
      run.fluid.sources.push({x:b.at.x,y:b.at.y,radial:28*strength,curl:5*strength});
    }
  }
  snapshot():PhageSnapshot{return {clusters:this.clusters.map(groupData),bursts:this.bursts.map(b=>({...b,at:{...b.at}})),serial:this.burstSerial,learned:this.learned};}
  restore(data:Partial<PhageSnapshot>):void{
    this.reset();this.learned=data.learned??false;this.burstSerial=data.serial??0;
    this.bursts=(data.bursts??[]).map(b=>({...b,at:{...b.at}}));
    for(const value of data.clusters??[]){
      const group=new PhageCluster(value.id,value.nucleus);
      Object.assign(group,groupData(Object.assign(group,value)));this.clusters.push(group);
    }
  }
}
