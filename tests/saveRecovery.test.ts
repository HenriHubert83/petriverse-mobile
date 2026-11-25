import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SaveRepository,UnsupportedSaveVersionError} from '../src/storage/saveRepository';
import type {KeyValueStorage} from '../src/storage/saveRepository';

type Saved={version:1;score:number;checkpoint:{stage:number}};
const sample=(score:number):Saved=>({version:1,score,checkpoint:{stage:2}});
function parse(value:unknown):Saved{
  const v=value as Saved;
  if(v&&v.version>1)throw new UnsupportedSaveVersionError();
  if(!v||v.version!==1||!Number.isFinite(v.score)||v.score<0||!v.checkpoint||!Number.isInteger(v.checkpoint.stage))throw new Error('Invalid snapshot');
  return {version:1,score:v.score,checkpoint:{stage:v.checkpoint.stage}};
}
class MemoryStorage implements KeyValueStorage {
  data=new Map<string,string>();writes:{key:string;value:string}[]=[];
  failGet='';failSet='';failRemove=false;corruptWrite='';
  async getItem(key:string):Promise<string|null>{if(key===this.failGet)throw new Error('read failed');return this.data.get(key)??null;}
  async setItem(key:string,value:string):Promise<void>{
    if(key===this.failSet)throw new Error('write failed');
    this.writes.push({key,value});this.data.set(key,key===this.corruptWrite?'incomplete write':value);
  }
  async removeItem(key:string):Promise<void>{if(this.failRemove)throw new Error('remove failed');this.data.delete(key);}
}
const setup=()=>{const backend=new MemoryStorage();return {backend,repo:new SaveRepository(backend,'journey',parse)};};
function score(result:Awaited<ReturnType<SaveRepository<Saved>['load']>>):number{
  assert.ok(result.status==='ready'||result.status==='recovered');return result.value.score;
}

test('durable primary and previous backup roundtrip, including recovery without copying corrupt primary',async()=>{
  const {backend,repo}=setup();assert.deepEqual(await repo.load(),{status:'empty'});
  await repo.save(sample(111));assert.equal(score(await repo.load()),111);
  await repo.save(sample(222));assert.equal(score(await repo.load()),222);
  backend.data.set(repo.key,'not JSON');
  let loaded=await repo.load();assert.equal(loaded.status,'recovered');assert.equal(score(loaded),111);
  await repo.save(sample(333));assert.equal((await repo.load()).status,'ready');assert.equal(score(await repo.load()),333);
  backend.data.set(repo.key,'broken again');loaded=await repo.load();assert.equal(loaded.status,'recovered');assert.equal(score(loaded),111);
});

test('malformed payload checkpoint falls back, and both invalid copies are rejected safely',async()=>{
  const {backend,repo}=setup();await repo.save(sample(111));await repo.save(sample(222));
  const envelope=JSON.parse(backend.data.get(repo.key)!);envelope.data.checkpoint='invalid';backend.data.set(repo.key,JSON.stringify(envelope));
  assert.equal(score(await repo.load()),111);backend.data.set(repo.backupKey,'invalid');
  assert.equal((await repo.load()).status,'corrupt');
  await repo.save(sample(333));assert.equal(score(await repo.load()),333);
});

test('temporary and backup refresh failures preserve existing primary and backup',async()=>{
  for(const destination of ['temporary','backupTemporary','backup'] as const){
    const {backend,repo}=setup();await repo.save(sample(111));await repo.save(sample(222));
    const originalPrimary=backend.data.get(repo.key),originalBackup=backend.data.get(repo.backupKey);
    backend.failSet=destination==='temporary'?repo.temporaryKey:destination==='backupTemporary'?repo.backupTemporaryKey:repo.backupKey;
    await assert.rejects(repo.save(sample(999)));assert.equal(backend.data.get(repo.key),originalPrimary);
    assert.equal(backend.data.get(repo.backupKey),originalBackup);assert.equal(score(await repo.load()),222);
  }
});

test('failed primary write retains current primary and a recoverable prior value',async()=>{
  const {backend,repo}=setup();await repo.save(sample(111));backend.failSet=repo.key;
  await assert.rejects(repo.save(sample(999)));assert.equal(score(await repo.load()),111);
  backend.data.set(repo.key,'corrupt');assert.equal((await repo.load()).status,'recovered');assert.equal(score(await repo.load()),111);
});

test('readback verification detects incomplete writes and retains a validated recovery copy',async()=>{
  const {backend,repo}=setup();await repo.save(sample(111));await repo.save(sample(222));
  backend.corruptWrite=repo.temporaryKey;await assert.rejects(repo.save(sample(333)));assert.equal(score(await repo.load()),222);
  backend.corruptWrite=repo.key;await assert.rejects(repo.save(sample(444)));assert.equal((await repo.load()).status,'recovered');assert.equal(score(await repo.load()),222);
});

test('read errors are distinct from missing or corrupted saves and do not cause writes',async()=>{
  const {backend,repo}=setup();await repo.save(sample(111));const writes=backend.writes.length;
  backend.failGet=repo.key;assert.equal((await repo.load()).status,'error');await assert.rejects(repo.save(sample(999)));
  assert.equal(backend.writes.length,writes);backend.failGet='';assert.equal(score(await repo.load()),111);
  backend.data.set(repo.key,'bad');backend.failGet=repo.backupKey;assert.equal((await repo.load()).status,'error');
});

test('newer envelope or payload versions are preserved instead of falling back or overwriting',async()=>{
  for(const field of ['envelope','payload'] as const){
    const {backend,repo}=setup();await repo.save(sample(111));await repo.save(sample(222));
    const next=JSON.parse(backend.data.get(repo.key)!);if(field==='envelope')next.version=2;else next.data.version=2;
    backend.data.set(repo.key,JSON.stringify(next));const before=new Map(backend.data);
    assert.equal((await repo.load()).status,'unsupported');await assert.rejects(repo.save(sample(333)),UnsupportedSaveVersionError);
    assert.deepEqual(backend.data,before);
  }
  const {backend,repo}=setup();await repo.save(sample(111));
  const future=JSON.parse(backend.data.get(repo.key)!);future.version=2;backend.data.set(repo.backupKey,JSON.stringify(future));
  await assert.rejects(repo.save(sample(222)),UnsupportedSaveVersionError);assert.equal(score(await repo.load()),111);
});

test('queued snapshots are frozen at request time and newer saves cannot be overtaken',async()=>{
  const {backend,repo}=setup(),first=sample(1);
  const a=repo.save(first);first.score=999;first.checkpoint.stage=9;
  const b=repo.save(sample(2)),c=repo.save(sample(3));await Promise.all([a,b,c]);
  assert.equal(score(await repo.load()),3);
  assert.deepEqual(backend.writes.filter(w=>w.key===repo.key).map(w=>JSON.parse(w.value).data.score),[1,2,3]);
  const initial=JSON.parse(backend.writes.find(w=>w.key===repo.key)!.value);assert.equal(initial.data.checkpoint.stage,2);
  backend.data.set(repo.key,'bad');assert.equal(score(await repo.load()),2);
});

test('a rejected save does not poison the write queue, and stale temporary data never becomes a save',async()=>{
  const {backend,repo}=setup();backend.failSet=repo.temporaryKey;await assert.rejects(repo.save(sample(1)));
  backend.failSet='';await repo.save(sample(2));assert.equal(score(await repo.load()),2);
  const stale=backend.data.get(repo.key)!;backend.data.clear();backend.data.set(repo.temporaryKey,stale);
  assert.equal((await repo.load()).status,'empty');
  backend.failRemove=true;await repo.save(sample(3));assert.equal(score(await repo.load()),3);
});

test('a remounted repository waits for older writes to the same backend and key',async()=>{
  const {backend,repo}=setup(),remounted=new SaveRepository(backend,repo.key,parse);
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const get=backend.getItem.bind(backend);let blocked=false;
  backend.getItem=async key=>{if(key===repo.key&&!blocked){blocked=true;await gate;}return get(key);};
  const earlier=repo.save(sample(1));await Promise.resolve();
  const newer=remounted.save(sample(2));await Promise.resolve();release();await Promise.all([earlier,newer]);
  assert.equal(score(await remounted.load()),2);
  assert.deepEqual(backend.writes.filter(w=>w.key===repo.key).map(w=>JSON.parse(w.value).data.score),[1,2]);
});

test('invalid snapshots are rejected before any storage access or mutation',async()=>{
  const {backend,repo}=setup();await repo.save(sample(111));const original=new Map(backend.data),writes=backend.writes.length;
  await assert.rejects(repo.save({...sample(2),score:NaN}));await assert.rejects(repo.save({...sample(2),checkpoint:null} as unknown as Saved));
  assert.equal(backend.writes.length,writes);assert.deepEqual(backend.data,original);
});
