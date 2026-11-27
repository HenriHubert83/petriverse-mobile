import {test} from 'node:test';
import assert from 'node:assert/strict';
import {anatomyRecipe,ANATOMY_IDS,membraneScale,motherBranch} from '../src/evolution/motherAppearance';
import {compareEvolution,sampleForEvolution} from '../src/evolution/evolutionComparison';
import {evolutionGrowthProgress,guidedEvolutionFrame} from '../src/evolution/evolutionPresentation';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {Drifter} from '../src/ecology/drifter';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {captureEncounter} from '../src/storage/journeySnapshot';

test('anatomy growth keeps existing organs and smoothly grows the new trait for 3.2 seconds',()=>{
  const owned=['elastic','enzyme','feast','filter'],before=anatomyRecipe(owned,'filter',0),middle=anatomyRecipe(owned,'filter',.5),after=anatomyRecipe(owned,'filter',1);
  assert.equal(before.organs[5],0);assert.equal(middle.organs[5],.5);assert.equal(after.organs[5],1);
  assert.equal(middle.organs[3],1);assert.equal(middle.layers,3.5);assert.equal(middle.growthPulse,1);
  assert.equal(after.form[1],1.55);assert.equal(after.form[0],0);assert.equal(after.form[3],4/6);
  assert.deepEqual(after.traits,[0,1,1,0]);assert.deepEqual(after.adaptations,[1,0,0,0]);
  assert.equal(evolutionGrowthProgress(1.6),.5);assert.equal(evolutionGrowthProgress(3.3),1);assert.equal(evolutionGrowthProgress(0,true),1);
  assert.deepEqual(anatomyRecipe(owned),anatomyRecipe([...owned]));assert.deepEqual(owned,['elastic','enzyme','feast','filter']);
});
test('first specialization fixes Mother lineage while later specializations remain visible in cells',()=>{
  const hybrid=['elastic','fission','symbiosis','enzyme'];
  assert.equal(motherBranch(hybrid),'elastic');assert.equal(motherBranch(['grazer','symbiosis','fission']),'symbiosis');assert.equal(motherBranch(['nursery']),'');
  const recipe=anatomyRecipe(hybrid);
  assert.deepEqual(recipe.form.slice(0,3),[.23,1+.55/3,.23]);
  assert.equal(anatomyRecipe(ANATOMY_IDS).layers,12);assert.equal(anatomyRecipe(ANATOMY_IDS).form[3],1);
  const nimble=anatomyRecipe(['fission','grazer','lure','nursery']);assert.equal(nimble.form[0],1.55);
  const hunter=anatomyRecipe(['symbiosis','enzyme','residual','frenzy']);assert.equal(hunter.form[2],1.55);
  for(const angle of [0,.5,Math.PI,4.2])assert.ok(membraneScale(angle,recipe.form)>=1/1.22&&membraneScale(angle,recipe.form)<=1/.66);
});
test('every comparison agrees with actual harvest outcomes and leaves live run and randomness untouched',()=>{
  for(const offered of ANATOMY_IDS)for(const owned of [[],['fission'],['elastic'],['symbiosis'],['filter'],['catalyst']]){
    if(owned.includes(offered))continue;
    const options={seed:73,mutations:owned,maxIntegrity:4,growthRoles:{1:'feeder' as const}},spec={stage:2,mode:'feed' as const,food:20,target:0,duration:100};
    const run=new EncounterSimulation(spec,options),sample=sampleForEvolution(offered);
    run.enemies=sample.bodies.map((kind,i)=>['food','cyst'].includes(kind)?new HarvestOrganism(i+1,kind,{x:900+i,y:450},{x:0,y:0},0):new Drifter(i+1,{x:900+i,y:450},0,kind));
    run.nextEnemyId=sample.bodies.length;
    const saved=JSON.stringify(captureEncounter(run)),comparison=compareEvolution(run,offered);
    assert.equal(JSON.stringify(captureEncounter(run)),saved);
    const afterRun=new EncounterSimulation(spec,{...options,mutations:[...owned,offered]});afterRun.enemies=run.enemies;
    const before=run.harvest.outcome(run.enemies.map(b=>b.id),run,sample.loop),after=afterRun.harvest.outcome(afterRun.enemies.map(b=>b.id),afterRun,sample.loop);
    for(const key of ['food','rawFood','poison','filtered','threats','foodBonuses'] as const){
      assert.deepEqual(comparison.before[key],before[key],`${owned} + ${offered} before ${key}`);
      assert.deepEqual(comparison.after[key],after[key],`${owned} + ${offered} after ${key}`);
    }
    assert.ok(comparison.playstyle);assert.match(comparison.assumption,/short links/);assert.ok(comparison.synergy);
  }
});
test('comparison shows poison costs, stacked bonuses, armor and clean nursery regrowth',()=>{
  const run={mutations:['filter'],integrity:2,maxIntegrity:3,harvest:{cleanFood:10}};
  const catalyst=compareEvolution(run,'catalyst');assert.equal(catalyst.before.food,1);assert.equal(catalyst.after.food,5);assert.equal(catalyst.after.poison,1);
  assert.match(catalyst.effect,/still poison/);assert.match(catalyst.synergy,/both cysts/);
  const enzyme=compareEvolution({...run,mutations:['symbiosis']},'enzyme');assert.equal(enzyme.before.food,0);assert.equal(enzyme.after.food,2);assert.equal(enzyme.after.damage,2);
  assert.match(compareEvolution(run,'nursery').effect,/10\/12 → 0\/12: \+1 organelle regrown/);
  const first=compareEvolution({...run,mutations:[]},'fission');assert.equal(first.before.food,3);assert.equal(first.after.food,4);assert.equal(first.after.recovery,2);
  const elastic=compareEvolution({...run,mutations:[]},'elastic');assert.equal(elastic.after.food,6);assert.equal(elastic.after.recovery,3.6);assert.equal(elastic.after.capacity,10);
});
test('guided examples use source loop sizes and recovery; reduced motion keeps the loop visible',()=>{
  const small=guidedEvolutionFrame('fission',2),wide=guidedEvolutionFrame('elastic',2);
  assert.equal(small.count,3);assert.equal(wide.count,6);assert.equal(small.recovery,2);assert.equal(wide.recovery,3.6);
  assert.ok(small.merge>0);assert.equal(guidedEvolutionFrame('fission',3.7).phase,1);assert.equal(guidedEvolutionFrame('elastic',3.7).phase<1,true);
  const still=guidedEvolutionFrame('elastic',90,true);assert.equal(still.time,1.6);assert.equal(still.drawing,true);assert.equal(still.merge,0);assert.equal(still.foodOpacity,1);
});
