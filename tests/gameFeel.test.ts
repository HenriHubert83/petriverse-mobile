import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameFeel,HEARTBEAT,MAX_MOTES,MOTE_FLIGHT,MOTE_STAGGER,bossWindow,motePosition,sampleGameFeel} from '../src/rendering/gameFeel';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {authoredStage} from '../src/campaign/journeyPlan';
import {JourneyBoss} from '../src/campaign/journeyBoss';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {Drifter,add,scale} from '../src/ecology/drifter';
import {captureEncounter} from '../src/storage/journeySnapshot';
import {TouchController} from '../src/mobile/touchController';

function fixture(stage=1){
  const run=new EncounterSimulation({...authoredStage(stage),food:999,target:999,duration:120},{seed:73,content:false,creatureContentEnabled:false,habitatContentEnabled:false});
  run.begin();const feel=new GameFeel(run);feel.update(run,0);return {run,feel};
}
function meal(run:EncounterSimulation,foods:number,cysts=0){
  const nodes=[0,8,9],center=scale(nodes.reduce((sum,id)=>add(sum,run.board.anchors[id]),{x:0,y:0}),1/3);
  for(const cell of run.cells)cell.remaining=0;run.enemies=[];
  for(let i=0;i<foods+cysts;i++)run.addBody(new HarvestOrganism(++run.nextEnemyId,i<foods?'food':'cyst',add(center,{x:(i%3-1)*6,y:0}),{x:0,y:0},0));
  const result=run.capture(nodes);assert.equal(result.valid,true);return result;
}
const advance=(feel:GameFeel,run:EncounterSimulation,seconds:number,options:Parameters<GameFeel['update']>[2]={})=>{
  for(let i=0;i<Math.round(seconds*60);i++)feel.update(run,1/60,options);
};

test('reward motes carry real food, cap at14, land in source order and never overstate counters',()=>{
  const {run,feel}=fixture();meal(run,25);feel.update(run,1/60);
  assert.equal(feel.motes.length,MAX_MOTES);assert.equal(feel.heldUnits('objective'),25);assert.equal(feel.shown('objective',25),0);
  assert.equal(feel.motes[13].delay+MOTE_FLIGHT,0.12+13*MOTE_STAGGER+MOTE_FLIGHT);
  assert.equal(feel.motes.reduce((sum,mote)=>sum+mote.units,0),25);assert.deepEqual(motePosition(feel.motes[0],0),feel.motes[0].from);
  assert.deepEqual(motePosition(feel.motes[0],feel.motes[0].delay+MOTE_FLIGHT),feel.motes[0].to);
  let popped=false,cues=0;
  for(let i=0;i<120;i++){
    feel.update(run,1/60);assert.ok(feel.shown('objective',25)<=25);popped ||= feel.pop('objective')>0.5;
    cues+=feel.drainCues().filter(cue=>cue.name==='mote').length;
  }
  assert.equal(feel.motes.length,0);assert.equal(feel.shown('objective',25),25);assert.equal(popped,true);assert.equal(cues,14);
  run.harvest.nourishment=2;feel.update(run,0);assert.equal(feel.shown('objective',2),2);
  run.score=4;assert.equal(feel.shown('score',4),4);
});

test('only nourishment gained receives food motes when a boss caps its charge',()=>{
  const {run,feel}=fixture(3);run.harvest.nourishment=5;feel.update(run,0);const result=meal(run,3);assert.ok(result.valid&&result.food===3);
  assert.equal(run.harvest.nourishment,6);feel.update(run,0);assert.equal(feel.heldUnits('objective'),1);assert.equal(feel.motes.length,1);
});

test('baseline attachment and render sampling do not replay saves or change gameplay, RNG or touch mapping',()=>{
  const {run}=fixture();meal(run,3);run.integrity=1;run.discover('shellback');
  const before=captureEncounter(run),rng=run.rng.saveState(),touch=new TouchController(run);touch.resize(690,340);const viewport={...touch.view};
  const feel=new GameFeel(run);feel.update(run,0);assert.equal(feel.motes.length,0);assert.equal(feel.numbers.length,0);assert.equal(feel.hurt,0);
  advance(feel,run,2);sampleGameFeel(feel,run);assert.deepEqual(captureEncounter(run),before);assert.deepEqual(run.rng.saveState(),rng);assert.deepEqual(touch.view,viewport);
  run.integrity=0;feel.update(run,1/60);assert.ok(feel.trauma>0);assert.notDeepEqual(feel.shake,{x:0,y:0});assert.deepEqual(touch.view,viewport);
});

test('pause freezes and hides feedback; reduced motion settles food and preserves quiet injury warnings',()=>{
  const {run,feel}=fixture();meal(run,3);feel.update(run,0);run.togglePause();feel.update(run,0);
  const ages=feel.motes.map(mote=>mote.age),clock=feel.clock;advance(feel,run,3);
  assert.deepEqual(feel.motes.map(mote=>mote.age),ages);assert.equal(feel.clock,clock);assert.equal(sampleGameFeel(feel,run).visible,false);
  run.togglePause();feel.update(run,0,{reducedMotion:true});assert.equal(feel.motes.length,0);assert.equal(feel.shown('objective',run.harvest.nourishment),3);
  run.integrity=1;feel.update(run,1/60,{reducedMotion:true});assert.ok(feel.hurt>0.9);assert.deepEqual(feel.shake,{x:0,y:0});assert.equal(feel.sparks.length,0);
  const frame=sampleGameFeel(feel,run);assert.equal(frame.visible,true);assert.ok(frame.discs.some(disc=>disc.rim));assert.ok(frame.labels.length>0);
  advance(feel,run,2,{reducedMotion:true});assert.equal(feel.beat(),0.5*feel.critical);assert.equal(feel.drainCues().some(cue=>cue.name==='mote'),false);
});

test('selection append, closure, abandonment and cell recovery trigger their own one-time rings',()=>{
  const {run,feel}=fixture();run.selection.start(run.board.anchors[0]);feel.update(run,0);assert.equal(feel.rings.length,1);
  run.selection.visit(8);run.selection.visit(9);feel.update(run,0);const append=feel.rings.length;
  run.selection.visit(0);feel.update(run,0);assert.equal(feel.rings.length,append+1);feel.update(run,0);assert.equal(feel.rings.length,append+1);
  run.selection.cancel();feel.update(run,0);assert.equal(feel.sparks.length,6);assert.ok(sampleGameFeel(feel,run).discs.length>0);
  const rings=feel.rings.length;run.cells[4].remaining=1;feel.update(run,0);run.cells[4].remaining=0;feel.update(run,0);
  assert.equal(feel.rings.length,rings+1);assert.equal(feel.rings.at(-1)?.life,0.5);feel.update(run,0);assert.equal(feel.rings.length,rings+1);
  run.selection.start(run.board.anchors[0]);run.selection.visit(8);feel.update(run,0);const sparks=feel.sparks.length;
  run.togglePause();feel.update(run,0);assert.equal(feel.sparks.length,sparks);
});

test('boss openings and pending discoveries are announced once, with Conjoined timing respected',()=>{
  const {run,feel}=fixture(7),boss=new JourneyBoss(++run.nextEnemyId,run.board,1);run.enemies=[boss];feel.update(run,0);
  boss.openRemaining=14;feel.update(run,0);assert.equal(feel.numbers.filter(number=>number.text==='Open').length,1);
  feel.update(run,0);assert.equal(feel.numbers.filter(number=>number.text==='Open').length,1);assert.equal(feel.drainCues().filter(cue=>cue.name==='swell').length,1);
  run.discover('shellback');feel.update(run,0);assert.equal(feel.numbers.filter(number=>number.text==='New species').length,0);
  run.addBody(new Drifter(++run.nextEnemyId,{x:850,y:450},0,'shellback'));feel.update(run,0);feel.update(run,0);
  assert.equal(feel.numbers.filter(number=>number.text==='New species'&&number.detail==='Shellback').length,1);
  const pair=new JourneyBoss(++run.nextEnemyId,run.board,2);run.enemies=[pair];pair.patternTime=0;assert.equal(bossWindow(run),false);
  feel.update(run,0);pair.patternTime=10;assert.equal(bossWindow(run),true);feel.update(run,0);assert.equal(feel.numbers.at(-1)?.text,'Together');
});

test('heartbeat, timer and opening cards retain source cadence without changing simulation clocks',()=>{
  const {run,feel}=fixture();run.integrity=1;advance(feel,run,HEARTBEAT*3);const cues=feel.drainCues();
  assert.ok(feel.critical>0.9);assert.ok(cues.filter(cue=>cue.name==='heartbeat').length>=2);assert.equal(run.stageElapsed,0);
  run.integrity=3;advance(feel,run,2);assert.equal(feel.critical,0);assert.equal(feel.beat(),0);
  run.stageElapsed=109;feel.update(run,0);feel.drainCues();run.stageElapsed=110;feel.update(run,0);feel.update(run,0);
  assert.deepEqual(feel.drainCues(),[{name:'ui_press',gain:0.35,pitch:0.62}]);
  const next=new EncounterSimulation(authoredStage(2),{seed:run.runSeed,content:false});feel.update(next,0);feel.lastCardDish='Stillwater';next.begin();feel.update(next,0);
  assert.equal(feel.card?.title,next.harvest.spec.name);assert.equal(feel.drainCues().filter(cue=>cue.name==='swell').length,1);
  advance(feel,next,2.2);assert.equal(feel.card,undefined);
});

test('final victory sends exactly three staggered rings while normal completions celebrate once',()=>{
  const {run,feel}=fixture();run.finishEncounter();feel.update(run,0,{journeyComplete:true});
  assert.deepEqual(feel.rings.filter(ring=>ring.life===1.6).map(ring=>ring.age),[0,-0.45,-0.9]);
  const sparks=feel.sparks.length;feel.update(run,0,{journeyComplete:true});assert.equal(feel.sparks.length,sparks);assert.equal(feel.celebration,1);
  const quiet=fixture();quiet.run.finishEncounter();quiet.feel.update(quiet.run,0,{journeyComplete:true,reducedMotion:true});
  assert.equal(quiet.feel.rings.length,0);assert.equal(quiet.feel.sparks.length,0);
});

test('asset-free renderer primitives carry capture, healing and readable reward presentation',()=>{
  const {run,feel}=fixture();meal(run,3);feel.update(run,0.2);const frame=sampleGameFeel(feel,run);
  assert.ok(frame.discs.length>0);assert.equal(frame.strokes.length,6);assert.ok(frame.labels.some(label=>label.text==='+3'));
  for(const shape of [...frame.discs,...frame.rings]){assert.ok(Number.isFinite(shape.at.x)&&Number.isFinite(shape.at.y));assert.ok(shape.radius>0);assert.ok(shape.opacity>=0&&shape.opacity<=1);}
  run.integrity--;feel.update(run,0);run.integrity++;feel.update(run,0);assert.equal(feel.healGlow,1);
  assert.ok(sampleGameFeel(feel,run).discs.some(disc=>disc.radius===110));
  feel.update(run,0,{hidden:true});assert.deepEqual(sampleGameFeel(feel,run),{visible:false,discs:[],rings:[],strokes:[],labels:[]});
});
