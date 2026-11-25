import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Board} from '../src/geometry/board';
import {Drifter} from '../src/ecology/drifter';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import {EcologyEnemy} from '../src/ecology/ecologyEnemy';
import {Amoeba} from '../src/ecology/amoeba';
import {Bacterium} from '../src/ecology/bacterium';
import {PhageCluster} from '../src/ecology/phageCluster';
import {Conjoined} from '../src/ecology/conjoined';
import {JourneyBoss} from '../src/campaign/journeyBoss';
import {captureOrganism,restoreOrganism} from '../src/storage/organismSnapshot';

const position={x:800,y:350};
test('organism records preserve subclass behavior and motion through JSON',()=>{
  const board=new Board();board.configureDish(2);
  const organisms:Drifter[]=[new Drifter(1,position,10,'twinspore'),new HarvestOrganism(2,'cyst',position,{x:4,y:6},0.3),
    new EcologyEnemy(3,'grazer',position,5),new Amoeba(4,position),new Bacterium(5,position,3),new PhageCluster(6,position),
    new Conjoined(7,board),new JourneyBoss(8,board,0),new JourneyBoss(9,board,1),new JourneyBoss(10,board,2)];
  for(const body of organisms){
    body.age=8;body.lureVector={x:12,y:-4};body.lureElapsed=0.2;body.gateIds=[900];body.form='fixture';body.huntTarget=44;
    if(body instanceof EcologyEnemy){body.destination={x:850,y:390};body.actionClock=9;body.storedFood=2;body.spawning=0;}
    if(body instanceof Bacterium)body.infectionAge=3;
    if(body instanceof Amoeba){body.phase='digesting';body.captiveNode=2;body.digestionAge=2;body.armExtension=0.4;}
    if(body instanceof PhageCluster){body.hostId=5;body.attachedFrom={x:710,y:310};}
    if(body instanceof JourneyBoss){body.patternTime=10;body.roundIndex=1;body.openRemaining=4;}
    const captured=captureOrganism(body);
    // New simulation fields must be deliberately added to the save schema.
    assert.deepEqual(Object.keys(body).filter(key=>!['board','centers','axes'].includes(key)).sort(),
      [...Object.keys(captured.common),...Object.keys(captured.specific)].sort());
    const restored=restoreOrganism(JSON.parse(JSON.stringify(captured)),board);
    assert.equal(restored.constructor,body.constructor);
    assert.deepEqual(captureOrganism(restored),captureOrganism(body));
    body.step(0.25,board.center);restored.step(0.25,board.center);
    assert.deepEqual(captureOrganism(restored),captureOrganism(body));
    assert.deepEqual(restored.nuclei(),body.nuclei());
    if(restored instanceof Conjoined)assert.equal(restored.board,board);
  }
});

test('juvenile Bellwether records retain their non-boss identity',()=>{
  const board=new Board(),body=new JourneyBoss(1,board,0);body.juvenile=true;body.kind='bell_bud';body.health=1;
  const restored=restoreOrganism(JSON.parse(JSON.stringify(captureOrganism(body))),board);
  assert.ok(restored instanceof JourneyBoss);assert.equal(restored.isBoss(),false);assert.equal(restored.kind,'bell_bud');
});

test('malformed organisms cannot introduce fields, invalid kinds, indices or nonfinite state',()=>{
  const board=new Board(),value=captureOrganism(new Amoeba(1,position));
  for(const change of [
    (v:any)=>{v.common.nucleus.x=NaN;},(v:any)=>{v.common.health=Infinity;},(v:any)=>{v.common.id=-1;},
    (v:any)=>{v.specific.targetNode=24;},(v:any)=>{v.specific.phase='unknown';},(v:any)=>{v.common.kind='food';},
    (v:any)=>{v.type='constructor';},(v:any)=>{v.common.extra='ignored?';},(v:any)=>{v.specific.siteNodes=[2,2];},
    (v:any)=>{v.common.nucleus.z=0;},(v:any)=>{delete v.common.age;},
  ]){const corrupt=JSON.parse(JSON.stringify(value));change(corrupt);assert.throws(()=>restoreOrganism(corrupt,board));}
  const body=new JourneyBoss(2,board,2),corrupt=captureOrganism(body);corrupt.specific.juvenile=true;
  assert.throws(()=>restoreOrganism(corrupt,board));
});

test('organism snapshots and restored state do not share mutable arrays or points',()=>{
  const board=new Board(),body=new EcologyEnemy(1,'parasite',position);body.siteNodes=[1,2];body.gateIds=[3];
  const value=captureOrganism(body),restored=restoreOrganism(value,board) as EcologyEnemy;
  // Deliberately mutate the decoded point to test snapshot isolation despite Point's readonly API.
  (restored.nucleus as {x:number;y:number}).x=0;restored.siteNodes.push(4);restored.gateIds.push(7);
  assert.equal(body.nucleus.x,position.x);assert.deepEqual(body.siteNodes,[1,2]);assert.deepEqual(body.gateIds,[3]);
  assert.deepEqual(value.specific.siteNodes,[1,2]);assert.deepEqual(value.common.gateIds,[3]);
});
