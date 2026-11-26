import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JourneySession} from '../src/campaign/journeySession';
import type {JourneySnapshot} from '../src/campaign/journeySession';
import {JourneyRecoveryRepository,SaveCommitUncertainError} from '../src/storage/journeyRecoveryRepository';
import {SaveRepository} from '../src/storage/saveRepository';
import type {KeyValueStorage} from '../src/storage/saveRepository';
import {SMALL_LESSON,WIDE_LESSON} from '../src/campaign/journeyLesson';

class Storage implements KeyValueStorage {
  values=new Map<string,string>();writes=0;failAt=0;afterWrite=false;
  async getItem(key:string){return this.values.get(key)??null;}
  async setItem(key:string,value:string){
    this.writes++;
    if(this.writes===this.failAt&&!this.afterWrite)throw new Error('Write failed');
    this.values.set(key,value);
    if(this.writes===this.failAt)throw new Error('Write acknowledgement lost');
  }
  async removeItem(key:string){this.values.delete(key);}
}
const repo=(storage:Storage)=>new JourneyRecoveryRepository(storage,'journey');
const pointer=(storage:Storage)=>JSON.parse(storage.values.get('journey.active')!) as {slot:number;generation:string;run:string};
const key=(storage:Storage,type='exact')=>`journey.slot${pointer(storage).slot}.${type}`;
const corruptExact=(storage:Storage)=>{storage.values.set(key(storage),'bad');storage.values.set(key(storage)+'.backup','bad');};
const step=(s:JourneySession,frames:number)=>{for(let i=0;i<frames;i++)s.update(1/60);};
function complete(s:JourneySession){
  const r=s.current;s.begin();if(r.stageIndex===0)r.lesson.stepIndex=4;r.harvest.nourishment=r.harvest.spec.food;
  r.harvest.rescued=20;r.harvest.purified=20;r.harvest.defended=20;r.harvest.visited=[0,1,2,3,4,5,6,7];
  r.harvest.huntersCaptured=20;r.bossDefeated=r.harvest.spec.mode==='boss';r.harvest.checkCompletion(r);s.observeCompletion();s.update(1.6);
  for(let i=0;i<600&&!s.progressionReady;i++)s.update(1/60);
  assert.equal(s.progressionReady,true);
  assert.equal(r.state,'complete');
}
function recovered(result:Awaited<ReturnType<JourneyRecoveryRepository['load']>>){
  assert.ok(result.status==='ready'||result.status==='recovered');return JourneySession.restore(result.value);
}

test('exact save and its backup take priority, then the same encounter entry recovers safely',async()=>{
  const storage=new Storage(),store=repo(storage),s=new JourneySession(73);await store.load();await store.replace(s.snapshot());
  s.begin();s.current.capture(SMALL_LESSON);step(s,60);await store.save(s.snapshot());const earlier=s.snapshot();
  step(s,60);await store.save(s.snapshot());
  assert.equal(recovered(await repo(storage).load()).current.elapsed,s.current.elapsed);
  storage.values.set(key(storage),'bad');let result=await repo(storage).load();
  assert.equal(result.status,'recovered');assert.equal(recovered(result).current.elapsed,earlier.encounter.run.elapsed);
  corruptExact(storage);result=await repo(storage).load();
  assert.equal(result.status,'recovered');assert.equal('recovery' in result&&result.recovery,'checkpoint');
  const fallback=recovered(result);assert.equal(fallback.index,0);assert.equal(fallback.current.state,'brief');
  assert.equal(fallback.current.score,0);assert.equal(fallback.current.captureSerial,0);
});

test('an adaptation commits together with its new checkpoint, and every interrupted staging write preserves the old result',async()=>{
  const storage=new Storage(),store=repo(storage),s=new JourneySession(73);await store.load();await store.replace(s.snapshot());
  s.begin();s.current.capture(SMALL_LESSON);step(s,420);s.current.capture(WIDE_LESSON);step(s,420);
  assert.equal(s.current.state,'complete');await store.save(s.snapshot());
  const baseline=new Map(storage.values),oldPointer=storage.values.get('journey.active');
  s.chooseEvolution('fission');const next=s.snapshot();assert.equal(next.index,1);
  const trial=new Storage();trial.values=new Map(baseline);const trialRepo=repo(trial);await trialRepo.load();await trialRepo.save(next);
  const totalWrites=trial.writes;
  for(let failure=1;failure<=totalWrites;failure++){
    const broken=new Storage();broken.values=new Map(baseline);broken.failAt=failure;
    const writing=repo(broken);await writing.load();await assert.rejects(writing.save(next));
    assert.equal(broken.values.get('journey.active'),oldPointer);
    const previous=recovered(await repo(broken).load());assert.equal(previous.index,0);assert.equal(previous.current.state,'complete');
    assert.deepEqual(previous.offers,JourneySession.restore(JSON.parse(baseline.get(key(storage))!).data.snapshot).offers);
  }
  await store.save(next);corruptExact(storage);
  const fallback=recovered(await repo(storage).load());assert.equal(fallback.index,1);
  assert.deepEqual(fallback.current.mutations,['fission']);assert.equal(fallback.current.biomass,s.current.biomass);
  assert.equal(fallback.current.score,s.current.score);assert.equal(fallback.current.state,'brief');
});

test('new journey staging cannot pair its exact state with an old-run checkpoint',async()=>{
  const storage=new Storage(),store=repo(storage),old=new JourneySession(73);await store.load();await store.replace(old.snapshot());
  const before=pointer(storage),oldData=new Map(storage.values),fresh=new JourneySession(99);
  const attempted=new Storage();attempted.values=new Map(oldData);attempted.failAt=2;
  const failing=repo(attempted);await failing.load();await assert.rejects(failing.replace(fresh.snapshot()));
  assert.equal(recovered(await repo(attempted).load()).seed,73);
  await store.replace(fresh.snapshot());assert.notEqual(pointer(storage).run,before.run);
  corruptExact(storage);assert.equal(recovered(await repo(storage).load()).seed,99);
  storage.values.set(key(storage,'checkpoint'),'bad');storage.values.set(key(storage,'checkpoint')+'.backup','bad');
  assert.equal((await repo(storage).load()).status,'corrupt');
});

test('growth choices and retry healing survive checkpoint recovery without awarding another retry',async()=>{
  const s=new JourneySession(73);complete(s);s.current.integrity=1;s.current.motherDamage.resetFromIntegrity(1);s.chooseEvolution('continue');
  s.begin();s.current.state='loss';assert.equal(s.retry(),true);assert.equal(s.current.integrity,3);
  s.begin();step(s,60);
  const entry=JourneySession.restore(s.entrySnapshot());assert.equal(entry.current.integrity,3);assert.equal(entry.retries,1);
  const storage=new Storage(),store=repo(storage);await store.load();await store.replace(s.snapshot());corruptExact(storage);
  const retried=recovered(await repo(storage).load());assert.equal(retried.current.integrity,3);assert.equal(retried.retries,1);
  complete(s);s.chooseEvolution('continue');assert.equal(s.current.chooseGrowthRole('feeder'),true);
  await store.save(s.snapshot());s.begin();await store.save(s.snapshot());corruptExact(storage);
  const growth=recovered(await repo(storage).load());assert.equal(growth.current.growthRoles[1],'feeder');assert.equal(growth.current.state,'brief');
});

test('completion fallback retains ending and rewards, while two slots keep storage bounded',async()=>{
  const storage=new Storage(),store=repo(storage),s=new JourneySession(73);await store.load();await store.replace(s.snapshot());
  for(let i=0;i<s.route.length;i++){
    complete(s);await store.save(s.snapshot());if(!s.finished){s.chooseEvolution('continue');await store.save(s.snapshot());}
  }
  const score=s.current.score;corruptExact(storage);const ending=recovered(await repo(storage).load());
  assert.equal(ending.finished,true);assert.equal(ending.current.state,'complete');ending.observeCompletion();assert.equal(ending.current.score,score);
  assert.equal(ending.chooseEvolution('continue'),false);assert.ok(storage.values.size<=10,`Unexpected key growth: ${storage.values.size}`);
});

test('legacy migration preserves unknown retry-entry health and never reimports abandoned legacy data',async()=>{
  const storage=new Storage(),s=new JourneySession(73);complete(s);s.current.integrity=1;s.current.motherDamage.resetFromIntegrity(1);
  s.chooseEvolution('continue');s.begin();s.current.state='loss';s.retry();s.begin();step(s,10);
  const old=s.snapshot();delete old.checkpoint.retryHealing;
  const legacy=new SaveRepository<JourneySnapshot>(storage,'journey',v=>{JourneySession.restore(v);return v as JourneySnapshot;});
  await legacy.save(old);const migrated=repo(storage),loaded=recovered(await migrated.load());
  assert.equal(loaded.snapshot().checkpoint.retryHealing,undefined);await migrated.save(loaded.snapshot());corruptExact(storage);
  const restored=recovered(await repo(storage).load());assert.equal(restored.current.integrity,3);assert.equal(restored.current.elapsed,s.current.elapsed);
  await migrated.replace(new JourneySession(99).snapshot());storage.values.delete('journey.active');
  assert.equal((await repo(storage).load()).status,'corrupt');
});

test('interrupted first migration leaves its explicitly selected legacy journey available',async()=>{
  const storage=new Storage(),s=new JourneySession(73),legacy=new SaveRepository<JourneySnapshot>(storage,'journey',v=>v as JourneySnapshot);
  await legacy.save(s.snapshot());storage.writes=0;storage.failAt=3;
  const migrating=repo(storage);await migrating.load();await assert.rejects(migrating.save(s.snapshot()));
  assert.equal(recovered(await repo(storage).load()).seed,73);
});

test('an acknowledged-late pointer commit reloads the new generation and stale mounted stores cannot overwrite it',async()=>{
  const storage=new Storage(),store=repo(storage),stale=repo(storage),s=new JourneySession(73);await store.load();await store.replace(s.snapshot());await stale.load();
  const baseline=new Map(storage.values),trial=new Storage();trial.values=new Map(baseline);const trialRepo=repo(trial);await trialRepo.load();
  await trialRepo.replace(new JourneySession(99).snapshot());
  storage.writes=0;storage.failAt=trial.writes;storage.afterWrite=true;
  await assert.rejects(store.replace(new JourneySession(99).snapshot()),SaveCommitUncertainError);
  storage.failAt=0;assert.equal(recovered(await repo(storage).load()).seed,99);
  await assert.rejects(stale.save(s.snapshot()),/replaced/);
});

test('future pointer or exact formats prevent recovery and overwrite, including legacy first migration',async()=>{
  const storage=new Storage(),store=repo(storage),s=new JourneySession(73);await store.load();await store.replace(s.snapshot());
  const original=storage.values.get('journey.active')!,future={...JSON.parse(original),version:2};storage.values.set('journey.active',JSON.stringify(future));
  assert.equal((await repo(storage).load()).status,'unsupported');await assert.rejects(store.replace(s.snapshot()),/newer version/);
  storage.values.set('journey.active',original);const envelope=JSON.parse(storage.values.get(key(storage))!);envelope.data.version=2;
  storage.values.set(key(storage),JSON.stringify(envelope));assert.equal((await repo(storage).load()).status,'unsupported');
  const old=new Storage();old.values.set('journey',JSON.stringify({format:'petriverse-local-save',version:2,data:{}}));
  await assert.rejects(repo(old).replace(s.snapshot()),/newer version/);assert.equal(old.values.has('journey.active'),false);
});
