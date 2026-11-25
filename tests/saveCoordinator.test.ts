import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SaveCoordinator} from '../src/mobile/saveCoordinator';
import type {SaveLoadResult} from '../src/storage/saveRepository';

interface Session{id:number;score:number;state:'brief'|'active'|'paused';selected:boolean;finished:boolean}
interface Profile{best:number;seen:number[]}
const copy=<T>(value:T):T=>structuredClone(value);
const oldSession=():Session=>({id:9,score:20,state:'active',selected:true,finished:false});
function deferred<T=void>(){
  let resolve!:(value:T|PromiseLike<T>)=>void,reject!:(reason?:unknown)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};
}
class Repository<T>{
  stored:T|undefined;result:SaveLoadResult<T>|undefined;writes:T[]=[];loads=0;fail=false;
  beforeLoad?:()=>Promise<void>;beforeWrite?:(value:T)=>Promise<void>;
  constructor(initial?:T){this.stored=initial;}
  async load():Promise<SaveLoadResult<T>>{
    this.loads++;await this.beforeLoad?.();
    return this.result??(this.stored?{status:'ready',value:copy(this.stored)}:{status:'empty'});
  }
  async save(value:T):Promise<void>{
    await this.beforeWrite?.(value);if(this.fail)throw new Error('Storage unavailable');
    this.stored=copy(value);this.writes.push(copy(value));
  }
}
function fixture(saved?:Session){
  const journey=new Repository(saved),profile=new Repository<Profile>({best:10,seen:[]});let next=100;
  const coordinator=new SaveCoordinator<Session,Session,Profile>({journey,profile,
    createSession:():Session=>({id:next++,score:0,state:'brief',selected:false,finished:false}),
    capture:(value:Session)=>copy(value),restore:(value:Session)=>copy(value),
    createProfile:():Profile=>({best:0,seen:[]}),
    observeProfile:(p:Profile,s:Session):Profile=>({best:Math.max(p.best,s.score),seen:[...new Set([...p.seen,s.id])]}),
    finished:(s:Session)=>s.finished,pause:(s:Session)=>{s.selected=false;if(s.state==='active')s.state='paused';},
  });
  return {coordinator,journey,profile};
}

test('startup waits for saved data and duplicate effects do not load or create twice',async()=>{
  const {coordinator,journey}=fixture(oldSession()),hold=deferred();journey.beforeLoad=()=>hold.promise;
  const first=coordinator.load(),second=coordinator.load();assert.strictEqual(first,second);
  assert.equal(await coordinator.startNew(),false);assert.equal(coordinator.continueJourney(),false);
  assert.equal(journey.writes.length,0);hold.resolve();await first;
  assert.equal(journey.loads,1);assert.equal(coordinator.screen,'menu');
  assert.equal(coordinator.session!.state,'paused');assert.equal(coordinator.session!.selected,false);
  assert.equal(coordinator.session!.score,20);assert.equal(journey.writes.length,0);
  assert.equal(coordinator.continueJourney(),true);assert.equal(coordinator.screen,'game');
});

test('unsupported or inaccessible journey data cannot be overwritten by startup or New Journey',async()=>{
  for(const status of ['unsupported','error'] as const){
    const {coordinator,journey}=fixture();journey.result={status,message:'Saved data is not available'};
    await coordinator.load();assert.equal(coordinator.canStart,false);assert.equal(await coordinator.startNew(true),false);
    assert.equal(await coordinator.autosave(),false);assert.equal(journey.writes.length,0);
    journey.result={status:'empty'};await coordinator.retryLoad();assert.equal(coordinator.canStart,true);
  }
});

test('recovery is visible and replacing an unfinished or unreadable journey requires confirmation',async()=>{
  const {coordinator,journey}=fixture();journey.result={status:'recovered',value:oldSession()};await coordinator.load();
  assert.match(coordinator.notice,/backup/);assert.equal(await coordinator.startNew(),false);assert.equal(journey.writes.length,0);
  assert.equal(await coordinator.startNew(true),true);assert.equal(coordinator.session!.id,100);assert.equal(coordinator.notice,'');
  const broken=fixture();broken.journey.result={status:'corrupt',message:'Both copies were damaged'};
  await broken.coordinator.load();assert.equal(broken.coordinator.needsConfirmation,true);
  assert.equal(await broken.coordinator.startNew(),false);assert.equal(await broken.coordinator.startNew(true),true);
});

test('replacement waits for older snapshots and rejects callbacks from the former journey',async()=>{
  const {coordinator,journey}=fixture(oldSession());await coordinator.load();coordinator.continueJourney();
  const old=coordinator.session!,started=deferred(),hold=deferred();
  journey.beforeWrite=async value=>{if(value.id===old.id){started.resolve();await hold.promise;}};
  old.score=45;const oldSave=coordinator.save(old);await started.promise;
  old.score=99;const replacing=coordinator.startNew(true);
  assert.equal(await coordinator.save(old),false);assert.equal(coordinator.session!.id,old.id);
  hold.resolve();assert.equal(await oldSave,true);assert.equal(await replacing,true);
  assert.deepEqual(journey.writes.map(s=>[s.id,s.score]),[[9,45],[100,0]]);
  assert.equal(await coordinator.save(old),false);assert.equal(journey.stored!.id,100);
});

test('failed replacement preserves the existing in-memory journey and remains retryable',async()=>{
  const {coordinator,journey}=fixture(oldSession());await coordinator.load();const old=coordinator.session;
  journey.fail=true;assert.equal(await coordinator.startNew(true),false);
  assert.strictEqual(coordinator.session,old);assert.equal(coordinator.screen,'menu');assert.equal(journey.stored!.id,9);
  assert.equal(coordinator.busy,false);assert.match(coordinator.error,/previous journey/);
  journey.fail=false;assert.equal(await coordinator.startNew(true),true);assert.notEqual(coordinator.session!.id,9);
});

test('a failed profile write does not turn a successful journey save into a reported journey failure',async()=>{
  const {coordinator,journey,profile}=fixture();await coordinator.load();profile.fail=true;
  assert.equal(await coordinator.startNew(),true);assert.equal(coordinator.error,'');assert.match(coordinator.profileError,/journey was saved/);
  coordinator.session!.score=200;assert.equal(await coordinator.save(),true);
  assert.equal(journey.stored!.score,200);assert.equal(coordinator.error,'');assert.match(coordinator.profileError,/profile/);
  profile.fail=false;assert.equal(await coordinator.save(),true);assert.equal(coordinator.profileError,'');assert.equal(profile.stored!.best,200);
});

test('an unreadable profile is preserved while journey saves continue, and recovery merges current progress',async()=>{
  const {coordinator,journey,profile}=fixture(oldSession());profile.result={status:'unsupported',message:'Future profile'};
  await coordinator.load();assert.equal(await coordinator.save(),true);assert.equal(journey.writes.length,1);assert.equal(profile.writes.length,0);
  coordinator.session!.score=50;profile.result={status:'ready',value:{best:900,seen:[77]}};
  await coordinator.retryProfile();assert.equal(coordinator.profile.best,900);assert.deepEqual(coordinator.profile.seen,[77,9]);
  assert.equal(profile.writes.length,1);assert.equal(profile.stored!.best,900);assert.equal(coordinator.profileError,'');
});

test('retrying a failed profile save retains records accumulated before replacing the journey',async()=>{
  const {coordinator,profile}=fixture(oldSession());await coordinator.load();profile.fail=true;
  coordinator.session!.score=500;await coordinator.save();
  assert.deepEqual(coordinator.profile.seen,[9]);assert.equal(profile.stored!.best,10);
  await coordinator.startNew(true);assert.deepEqual(coordinator.profile.seen,[9,100]);
  profile.fail=false;const previousLoads=profile.loads;await coordinator.retryProfile();
  assert.equal(profile.loads,previousLoads);assert.equal(profile.stored!.best,500);assert.deepEqual(profile.stored!.seen,[9,100]);
});

test('interruptions and returning to title cancel unfinished gestures and save paused state',async()=>{
  const {coordinator,journey}=fixture(oldSession());await coordinator.load();coordinator.continueJourney();
  coordinator.session!.state='active';coordinator.session!.selected=true;
  assert.equal(await coordinator.interrupt(),true);assert.equal(journey.stored!.state,'paused');assert.equal(journey.stored!.selected,false);
  assert.equal(await coordinator.returnToTitle(),true);assert.equal(coordinator.screen,'menu');
  const writes=journey.writes.length;assert.equal(await coordinator.autosave(),false);assert.equal(journey.writes.length,writes);
  coordinator.continueJourney();assert.equal(coordinator.session!.state,'paused');
});

test('detaching a former view discards queued snapshots that have not begun writing',async()=>{
  const {coordinator,journey}=fixture(oldSession());await coordinator.load();
  const hold=deferred(),started=deferred();journey.beforeWrite=async()=>{started.resolve();await hold.promise;};
  coordinator.session!.score=30;const first=coordinator.save();await started.promise;
  coordinator.session!.score=60;const queued=coordinator.save();coordinator.detach();hold.resolve();
  assert.equal(await first,true);assert.equal(await queued,false);assert.equal(journey.stored!.score,30);
  assert.equal(coordinator.saving,false);coordinator.attach();assert.equal(await coordinator.save(),true);assert.equal(journey.stored!.score,60);
});
