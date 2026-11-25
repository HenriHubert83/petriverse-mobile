import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession} from '../src/campaign/journeySession';
import type {JourneySnapshot} from '../src/campaign/journeySession';
import {SMALL_LESSON,WIDE_LESSON} from '../src/campaign/journeyLesson';
import {SaveRepository} from '../src/storage/saveRepository';
import type {KeyValueStorage} from '../src/storage/saveRepository';
import {createJourneyProfile,parseJourneyProfile,observeJourney} from '../src/storage/journeyProfile';
import {SaveCoordinator} from '../src/mobile/saveCoordinator';

class MemoryStorage implements KeyValueStorage {
  values=new Map<string,string>();
  async getItem(key:string){return this.values.get(key)??null;}
  async setItem(key:string,value:string){this.values.set(key,value);}
  async removeItem(key:string){this.values.delete(key);}
}
const pause=(session:JourneySession)=>{
  session.current.selection.cancel();session.current.nudge.cancel();
  if(session.current.state==='active')session.current.togglePause();
};
function controller(storage:MemoryStorage){
  return new SaveCoordinator({
    journey:new SaveRepository<JourneySnapshot>(storage,'journey',value=>{
      JourneySession.restore(value);return value as JourneySnapshot;
    }),
    profile:new SaveRepository(storage,'profile',parseJourneyProfile),
    createSession:()=>new JourneySession(73),capture:(session:JourneySession)=>session.snapshot(),
    restore:(snapshot:JourneySnapshot)=>JourneySession.restore(snapshot),
    createProfile:createJourneyProfile,observeProfile:observeJourney,
    finished:(session:JourneySession)=>session.finished,pause,
  });
}
const step=(session:JourneySession,frames:number)=>{for(let i=0;i<frames;i++)session.update(1/60);};

test('close and Continue preserve a real tutorial capture, recovery animation and subsequent evolution',async()=>{
  const storage=new MemoryStorage(),first=controller(storage);
  await first.load();assert.equal(storage.values.size,0);assert.equal(await first.startNew(),true);
  const original=first.session!;original.begin();
  assert.equal(original.current.capture(SMALL_LESSON).valid,true);step(original,120);
  assert.equal(await first.save(),true);
  const expected=original.snapshot();assert.equal(expected.encounter.run.state,'active');
  first.detach();

  const reopened=controller(storage);await reopened.load();
  assert.equal(reopened.screen,'menu');assert.equal(reopened.continueJourney(),true);
  const restored=reopened.session!;assert.equal(restored.current.state,'paused');
  const actual=restored.snapshot();actual.encounter.run.state='active';assert.deepEqual(actual,expected);
  assert.ok(restored.current.clots.length>0);
  assert.strictEqual(restored.current.clots[0].members[0],restored.current.cells[restored.current.clots[0].nodes[0]]);
  restored.current.togglePause();step(restored,300);step(original,300);
  assert.deepEqual(restored.snapshot(),original.snapshot());
  assert.equal(restored.current.capture(WIDE_LESSON).valid,true);step(restored,420);
  assert.equal(restored.current.state,'complete');assert.equal(await reopened.save(),true);
  const completedScore=restored.current.score;
  assert.equal(restored.chooseEvolution('fission'),true);assert.equal(await reopened.save(),true);

  const afterUpgrade=controller(storage);await afterUpgrade.load();
  assert.equal(afterUpgrade.session!.index,1);assert.deepEqual(afterUpgrade.session!.current.mutations,['fission']);
  assert.equal(afterUpgrade.session!.current.score,completedScore);
  assert.equal(afterUpgrade.profile.clearedEncounters.length,1);
  assert.equal(await afterUpgrade.save(),true);assert.equal(afterUpgrade.profile.clearedEncounters.length,1);
});

test('a malformed real journey checkpoint recovers the previous valid encounter without destroying the backup',async()=>{
  const storage=new MemoryStorage(),game=controller(storage);await game.load();await game.startNew();
  game.session!.begin();game.session!.current.capture(SMALL_LESSON);step(game.session!,60);
  await game.save();
  const firstSave=storage.values.get('journey')!;
  step(game.session!,60);await game.save();
  const corrupt=JSON.parse(storage.values.get('journey')!);corrupt.data.checkpoint.colony='damaged';
  storage.values.set('journey',JSON.stringify(corrupt));
  const recovered=controller(storage);await recovered.load();
  assert.match(recovered.notice,/backup/);assert.equal(recovered.session!.current.elapsed,JSON.parse(firstSave).data.encounter.run.elapsed);
  assert.equal(await recovered.save(),true);
  storage.values.set('journey','broken again');
  const secondRecovery=controller(storage);await secondRecovery.load();
  assert.match(secondRecovery.notice,/backup/);
  assert.equal(secondRecovery.session!.current.elapsed,JSON.parse(firstSave).data.encounter.run.elapsed);
});

test('background interruption clears a partial loop and persists a paused encounter without making a capture',async()=>{
  const storage=new MemoryStorage(),game=controller(storage);await game.load();await game.startNew();
  const session=game.session!;session.begin();
  // An unfinished gesture is transient and must never become a capture on Continue.
  session.current.selection.path.push(...SMALL_LESSON);
  const before=session.current.captureSerial;
  assert.equal(await game.interrupt(),true);assert.equal(session.current.state,'paused');
  assert.deepEqual(session.current.selection.path,[]);assert.equal(session.current.captureSerial,before);
  const reopened=controller(storage);await reopened.load();
  assert.equal(reopened.session!.current.state,'paused');assert.equal(reopened.session!.current.captureSerial,before);
  assert.deepEqual(reopened.session!.current.selection.path,[]);
  const snapshot=reopened.session!.snapshot();reopened.session!.update(3600);
  assert.deepEqual(reopened.session!.snapshot(),snapshot);
});
