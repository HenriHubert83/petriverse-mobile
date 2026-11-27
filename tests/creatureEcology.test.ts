import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {authoredStage} from '../src/campaign/journeyPlan';
import {makeRoute} from '../src/campaign/journeyRoute';
import {planExpeditions,validExpeditions,stepExpeditions,spawnExpedition} from '../src/campaign/expeditionCreatures';
import {beginDiscoveries,stepDiscoveries,visitorForm,VISITOR_REACH} from '../src/campaign/journeyDiscoveries';
import {EXPEDITION_FORMS,formDefinition,validForm} from '../src/content/creatureCatalogue';
import {Drifter,add,scale} from '../src/ecology/drifter';
import {EcologyEnemy} from '../src/ecology/ecologyEnemy';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';

function quiet(stage:number):EncounterSimulation{
  const run=new EncounterSimulation(authoredStage(stage),{seed:73,content:true});run.begin();
  run.enemies=[];run.phages.clusters=[];run.harvest.nextBloom=10000;
  run.harvest.ecology.nextWave=10000;run.harvest.ecology.pending=[];run.harvest.events.kind=undefined;
  run.harvest.visitorAt=-1;return run;
}
function visitor(stage:number):{run:EncounterSimulation;body:HarvestOrganism}{
  const run=quiet(stage);run.harvest.visitorAt=0.1;run.stageElapsed=0.1;stepDiscoveries(run);
  const body=run.enemies[0] as HarvestOrganism;
  body.origin=add(run.board.center,{x:150,y:0});body.nucleus={...body.origin};body.drift={x:0,y:0};
  return {run,body};
}
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

test('ordinary forms decorate authored spawn paths without advancing the gameplay random stream',()=>{
  for(const stage of [1,2,4,5,6,8]){
    const run=new EncounterSimulation(authoredStage(stage),{seed:73,content:true});
    const legacy=new EncounterSimulation(authoredStage(stage),{seed:73,content:true,creatureContentEnabled:false});
    assert.deepEqual(run.rng.saveState(),legacy.rng.saveState());
    assert.deepEqual(run.enemies.map(b=>[b.id,b.kind,b.nucleus]),legacy.enemies.map(b=>[b.id,b.kind,b.nucleus]));
    for(const body of run.enemies){
      if(!body.form)continue;
      assert.ok(validForm(body.form,body.kind));assert.ok(formDefinition(body.form)!.firstStage<=stage);
      assert.ok(run.seenSpecies.includes(body.form));assert.equal(formDefinition(body.form)!.rare,false);
    }
    assert.ok(legacy.enemies.every(b=>b.form===''));
    const rng=run.rng.saveState();
    run.harvest.ecology.add(run,'grazer',0,run.harvest.ecology.pocket(run,0));
    run.harvest.ecology.spawnEvent(run,{at:0,kind:'hunter',area:3,species:'drifter'});
    assert.deepEqual(run.rng.saveState(),rng);
  }
});

test('divider daughters inherit exact rare and base identities without rerolling forms',()=>{
  for(const form of ['', 'hourglass_divider','ribbon_divider']){
    const run=quiet(8),body=run.harvest.ecology.add(run,'divider',1,add(run.board.center,{x:220,y:0}),form) as EcologyEnemy;
    body.age=25;body.spawning=0;run.harvest.ecology.stepExistingBodies(run,0);
    const daughters=run.enemies.filter(b=>b.kind==='divider');assert.equal(daughters.length,2);
    assert.ok(daughters.every(b=>b.form===form&&(b as EcologyEnemy).daughter));
    if(form)assert.ok(run.seenSpecies.includes(form));
  }
});

test('authored migration food and hatching cysts receive eligible forms',()=>{
  const run=quiet(5),events=run.harvest.events;events.kind='hatching';events.at=0;run.stageElapsed=0;
  events.step(run,0);run.stageElapsed=22;events.step(run,0);
  assert.equal(run.enemies.filter(b=>b.kind==='food').length,6);assert.equal(run.enemies.filter(b=>b.kind==='cyst').length,3);
  assert.ok(run.enemies.some(b=>b.form!==''));
  for(const body of run.enemies)if(body.form){assert.ok(validForm(body.form,body.kind));assert.ok(run.seenSpecies.includes(body.form));}
});

test('expedition plans favor unseen forms across four journeys and preserve RNG independence',()=>{
  const known:string[]=[];
  for(let journey=0;journey<4;journey++){
    const seed=73+journey*31,route=makeRoute(seed),run=quiet(2),rng=run.rng.saveState();
    const roster=planExpeditions(seed,route,known);
    assert.deepEqual(roster,planExpeditions(seed,route,known));assert.equal(roster.length,3);assert.ok(validExpeditions(roster,route));
    assert.deepEqual(run.rng.saveState(),rng);
    for(const visit of roster){assert.equal(known.includes(visit.form),false);known.push(visit.form);assert.equal(visit.spawned,false);}
  }
  assert.deepEqual(new Set(known),new Set(EXPEDITION_FORMS.map(entry=>entry.id)));
  const repeats=planExpeditions(73,makeRoute(73),known);assert.equal(repeats.length,3);
});

test('expedition roster validation rejects duplicate biomes and invalid or premature routes',()=>{
  const route=makeRoute(73),valid=planExpeditions(73,route,[]);
  assert.ok(validExpeditions([],route));assert.equal(validExpeditions(null,route),false);
  for(const change of [
    (roster:any[])=>{roster[0].form='moonlace';},
    (roster:any[])=>{roster[0].encounter=999;},
    (roster:any[])=>{roster[0].encounter=2;},
    (roster:any[])=>{roster[0].encounter=3.5;},
    (roster:any[])=>{roster[0].spawned='false';},
    (roster:any[])=>{roster[1]={...roster[0]};},
  ]){
    const roster=structuredClone(valid);change(roster);assert.equal(validExpeditions(roster,route),false);
  }
});

test('every expedition spawns its original gameplay class, defenses and discovery identity',()=>{
  for(const entry of EXPEDITION_FORMS){
    const run=quiet(entry.firstStage),body=spawnExpedition(run,entry.id);
    assert.equal(body.form,entry.id);assert.equal(body.kind,entry.kind);assert.equal(body.age,0);
    assert.equal(body.visitor,false);assert.ok(run.seenSpecies.includes(entry.id));assert.ok(run.seenSpecies.includes(entry.kind));
    assert.equal(body.health,entry.kind==='shellback'?2:1);
    if(['food','cyst','spore'].includes(entry.kind))assert.ok(body instanceof HarvestOrganism);
    if(['grazer','parasite','divider'].includes(entry.kind))assert.ok(body instanceof EcologyEnemy);
    if(entry.kind==='parasite'){
      const parasite=body as EcologyEnemy;assert.equal(parasite.siteNodes.length,3);
      assert.ok(!parasite.siteNodes.includes(parasite.targetNode));
    }
  }
  assert.throws(()=>spawnExpedition(quiet(2),'moonlace'));
});

test('expeditions wait eight seconds, respect hunter and competitor limits, and spawn once',()=>{
  const route=makeRoute(73),index=3;
  for(const [form,kind,limit] of [['trident_hunter','drifter',4],['chalice_grazer','grazer',2]] as const){
    const run=new EncounterSimulation(route[index],{seed:73,content:true,encounterIndex:index,expeditionRoster:[{form,encounter:index,spawned:false}]});
    run.begin();run.enemies=[];run.stageElapsed=7.99;stepExpeditions(run);assert.equal(run.enemies.length,0);
    run.stageElapsed=8;
    for(let i=0;i<limit;i++)run.enemies.push(kind==='drifter'?new Drifter(++run.nextEnemyId,{x:800,y:450},5.4):new EcologyEnemy(++run.nextEnemyId,kind,{x:800,y:450}));
    stepExpeditions(run);assert.equal(run.expeditionRoster[0].spawned,false);assert.equal(run.enemies.length,limit);
    run.enemies.pop();stepExpeditions(run);assert.equal(run.expeditionRoster[0].spawned,true);
    assert.equal(run.enemies.filter(b=>b.form===form).length,1);
    const count=run.enemies.length;stepExpeditions(run);assert.equal(run.enemies.length,count);
  }
});

test('rare visitor schedule is seeded separately and remains disabled for legacy journeys',()=>{
  for(const seed of [1,73,104,0xffffffff]){
    const schedules:number[]=[];
    for(let stage=0;stage<12;stage++){
      const run=new EncounterSimulation(authoredStage(stage),{seed}),rng=run.rng.saveState();
      beginDiscoveries(run);assert.deepEqual(run.rng.saveState(),rng);
      if(run.harvest.visitorAt>0){schedules.push(stage);assert.ok(run.harvest.visitorAt>=36&&run.harvest.visitorAt<=44);}
      const legacy=new EncounterSimulation(authoredStage(stage),{seed,creatureContentEnabled:false});
      beginDiscoveries(legacy);legacy.stageElapsed=100;stepDiscoveries(legacy);
      assert.equal(legacy.harvest.visitorAt,-1);assert.equal(legacy.enemies.length,0);
    }
    assert.equal(schedules.length,3);assert.equal(schedules[0],2);assert.ok(schedules[1]>=4&&schedules[1]<=6);assert.ok(schedules[2]>=8&&schedules[2]<=10);
  }
});

test('Moonlace releases real food once per opening and retains capturable visitor reach',()=>{
  const {run,body}=visitor(2);assert.equal(body.form,'moonlace');assert.equal(body.visitor,true);
  body.age=5.99;stepDiscoveries(run);assert.equal(run.enemies.length,1);
  body.age=6;stepDiscoveries(run);assert.equal(body.bloomReleases,1);assert.equal(run.enemies.length,3);
  const food=run.enemies.filter(b=>b.kind==='food');assert.ok(food.every(b=>b.bloomId===-100000-body.id*8-1));
  stepDiscoveries(run);assert.equal(run.enemies.length,3);
  body.age=24;stepDiscoveries(run);assert.equal(body.bloomReleases,2);assert.equal(run.enemies.length,5);
  assert.equal(run.harvest.nourishment,0,'the player still needs to capture the food');
  body.origin=add(run.board.center,{x:330,y:0});body.nucleus={...body.origin};stepDiscoveries(run);
  assert.equal(distance(body.origin,run.board.center),VISITOR_REACH);
  assert.equal(body.lifetime(),72);
});

test('Glass Harp gently separates adjacent food and poison without awarding objectives; pause freezes it',()=>{
  const {run,body}=visitor(4);assert.equal(body.form,'glass_harp');body.age=5;
  const at=add(body.nucleus,{x:0,y:45}),food=new HarvestOrganism(++run.nextEnemyId,'food',at,{x:0,y:0},0);
  const cyst=new HarvestOrganism(++run.nextEnemyId,'cyst',at,{x:0,y:0},0);run.enemies.push(food,cyst);
  let largestShift=0;
  for(let i=0;i<360;i++){
    const before={...food.nucleus};food.step(1/60,run.board.center);cyst.step(1/60,run.board.center);body.age+=1/60;
    stepDiscoveries(run,1/60);largestShift=Math.max(largestShift,distance(before,food.nucleus));
  }
  assert.ok(distance(food.nucleus,cyst.nucleus)>20);assert.ok(largestShift<0.05);
  assert.equal(run.harvest.nourishment,0);assert.equal(run.harvest.purified,0);
  const before=run.enemies.map(b=>({...b.nucleus}));run.togglePause();run.step(20);
  assert.deepEqual(run.enemies.map(b=>b.nucleus),before);
});

test('Glowdrift slows nearby ordinary hunters during openings but leaves distant hunters unaffected',()=>{
  const {run,body}=visitor(8);assert.equal(body.form,'glowdrift');body.age=6;
  const hunter=new Drifter(++run.nextEnemyId,add(body.nucleus,{x:45,y:0}),5.4);
  const distant=new Drifter(++run.nextEnemyId,add(body.nucleus,{x:0,y:160}),5.4);run.enemies.push(hunter,distant);
  stepDiscoveries(run,1/60);assert.ok(hunter.slowed>0);assert.equal(distant.slowed,0);
  const nearStart={...hunter.nucleus},farStart={...distant.nucleus};
  hunter.step(0.4,add(nearStart,{x:100,y:0}));distant.step(0.4,add(farStart,{x:100,y:0}));
  assert.ok(distance(hunter.nucleus,nearStart)<distance(distant.nucleus,farStart)*0.75);
  body.age=17;hunter.slowed=0;stepDiscoveries(run,1/60);assert.equal(hunter.slowed,0);
  assert.equal(run.enemies.filter(b=>b.kind==='food').length,0);
});

test('ordinary loops rescue all helper and expedition spores with their exact rare identity',()=>{
  for(const [stage,form] of [[2,visitorForm(2)],[4,visitorForm(4)],[8,visitorForm(8)],[2,'glasswing_spore'],[8,'comet_spore']] as const){
    const run=quiet(stage),body=EXPEDITION_FORMS.some(entry=>entry.id===form)?spawnExpedition(run,form):new HarvestOrganism(++run.nextEnemyId,'spore',{x:0,y:0},{x:0,y:0},0);
    if(!run.enemies.includes(body)){body.visitor=true;body.form=form;run.enemies.push(body);}
    const path=[0,8,9],at=scale(path.reduce((sum,id)=>add(sum,run.board.anchors[id]),{x:0,y:0}),1/path.length);
    body.nucleus=at;(body as HarvestOrganism).origin={...at};
    const result=run.capture(path);assert.equal(result.valid,true);if(!result.valid)continue;
    assert.equal(result.rescued,1);assert.equal(run.rescuedSpecimens[0].form,form);assert.equal(run.rescuedSpecimens[0].rare,true);
    assert.equal(run.enemies.includes(body),false);
  }
});
