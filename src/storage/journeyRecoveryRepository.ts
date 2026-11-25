import {JourneySession} from '../campaign/journeySession';
import type {JourneySnapshot} from '../campaign/journeySession';
import {SaveRepository,SaveStorageError,UnsupportedSaveVersionError} from './saveRepository';
import type {KeyValueStorage,SaveLoadResult} from './saveRepository';

interface Pointer {format:'petriverse-journey-pointer';version:1;slot:0|1;generation:string;run:string;boundary:string}
type PointerRead={kind:'ready';value:Pointer}|{kind:'missing'|'legacy'|'corrupt'|'unsupported'};
const queues=new WeakMap<KeyValueStorage,Map<string,Promise<unknown>>>();
let sequence=0;
const identity=()=>`${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2)}`;
const plain=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[a-z0-9-]{1,100}$/.test(v);
const boundary=(s:JourneySnapshot)=>JSON.stringify([s.seed,s.index,s.retries,
  ['complete','loss'].includes(s.encounter.run.state)?s.encounter.run.state:'entry',s.encounter.run.growthRoles]);
const validate=(value:unknown):JourneySnapshot=>{JourneySession.restore(value);return value as JourneySnapshot;};

export class SaveCommitUncertainError extends SaveStorageError {
  constructor(){super('The save commit could not be confirmed. Reload the saved journey before writing again.');this.name='SaveCommitUncertainError';}
}

// Two bounded slots keep a whole boundary change atomic. Only the pointer selects
// committed data. A partially written inactive slot can never become a fallback.
// The pointer intentionally has no previous-generation backup: that could revive
// a replaced journey or replay already committed encounter rewards.
export class JourneyRecoveryRepository {
  readonly pointerKey:string;
  private loadedRun:string|null|undefined;
  private readonly legacy:SaveRepository<JourneySnapshot>;
  constructor(private readonly storage:KeyValueStorage,readonly key:string){
    this.pointerKey=key+'.active';this.legacy=new SaveRepository(storage,key,validate);
  }
  private enqueue<T>(action:()=>Promise<T>):Promise<T>{
    let pending=queues.get(this.storage);if(!pending){pending=new Map();queues.set(this.storage,pending);}
    const result=(pending.get(this.pointerKey)??Promise.resolve()).then(action);
    pending.set(this.pointerKey,result.catch(()=>undefined));return result;
  }
  private async pointer():Promise<PointerRead>{
    const raw=await this.storage.getItem(this.pointerKey);
    if(raw===null)return {kind:await this.storage.getItem(this.key+'.managed')===null?'missing':'corrupt'};
    try{
      const p:unknown=JSON.parse(raw);
      if(!plain(p)||p.format!=='petriverse-journey-pointer')return {kind:'corrupt'};
      if(typeof p.version==='number'&&p.version>1)return {kind:'unsupported'};
      if(p.version===1&&p.legacy===true)return {kind:'legacy'};
      if(p.version!==1||(p.slot!==0&&p.slot!==1)||!identifier(p.generation)||!identifier(p.run)||
        typeof p.boundary!=='string'||p.boundary.length>1024)return {kind:'corrupt'};
      return {kind:'ready',value:p as unknown as Pointer};
    }catch{return {kind:'corrupt'};}
  }
  private repository(pointer:Pointer,kind:'exact'|'checkpoint'){
    return new SaveRepository<{version:1;generation:string;snapshot:JourneySnapshot}>(this.storage,
      `${this.key}.slot${pointer.slot}.${kind}`,value=>{
        if(!plain(value))throw new Error('Invalid journey record');
        if(typeof value.version==='number'&&value.version>1)throw new UnsupportedSaveVersionError();
        if(value.version!==1||value.generation!==pointer.generation)throw new Error('Uncommitted journey generation');
        const snapshot=validate(value.snapshot);
        if(boundary(snapshot)!==pointer.boundary)throw new Error('Mismatched encounter checkpoint');
        return {version:1,generation:pointer.generation,snapshot};
      });
  }
  load():Promise<SaveLoadResult<JourneySnapshot>>{
    return this.enqueue(async()=>{
      try{
        const read=await this.pointer();
        if(read.kind==='missing'||read.kind==='legacy'){
          this.loadedRun=null;return this.legacy.load();
        }
        if(read.kind==='unsupported')return {status:'unsupported',message:'This journey needs a newer version of Petriverse. It has been kept unchanged.'};
        if(read.kind==='corrupt')return {status:'corrupt',message:'The saved journey index could not be read. Its data has been kept unchanged.'};
        if(read.kind!=='ready')throw new Error('Invalid journey pointer');
        this.loadedRun=read.value.run;
        const exact=await this.repository(read.value,'exact').load();
        if(exact.status==='ready'||exact.status==='recovered')return {status:exact.status,value:exact.value.snapshot};
        if(exact.status==='unsupported'||exact.status==='error')return exact;
        const checkpoint=await this.repository(read.value,'checkpoint').load();
        if(checkpoint.status==='ready'||checkpoint.status==='recovered')return {status:'recovered',recovery:'checkpoint',value:checkpoint.value.snapshot};
        if(checkpoint.status==='unsupported'||checkpoint.status==='error')return checkpoint;
        return {status:'corrupt',message:'The journey, backup and encounter checkpoint could not be read. Their data has been kept unchanged.'};
      }catch{return {status:'error',message:'Local saves could not be accessed. Please try again.'};}
    });
  }
  save(snapshot:JourneySnapshot):Promise<void>{return this.prepare(snapshot,false);}
  replace(snapshot:JourneySnapshot):Promise<void>{return this.prepare(snapshot,true);}
  private prepare(value:JourneySnapshot,replace:boolean):Promise<void>{
    let snapshot:JourneySnapshot;
    try{snapshot=validate(JSON.parse(JSON.stringify(value)));}catch(error){return Promise.reject(error);}
    return this.enqueue(async()=>{
      const read=await this.pointer();
      if(read.kind==='unsupported')throw new UnsupportedSaveVersionError();
      if(!replace&&read.kind==='corrupt')throw new SaveStorageError('The saved journey index could not be read. Reload before saving.');
      const current=read.kind==='ready'?read.value:undefined;
      if(read.kind==='missing'||read.kind==='legacy'){
        const legacy=await this.legacy.load();
        if(legacy.status==='unsupported')throw new UnsupportedSaveVersionError();
        if(legacy.status==='error')throw new SaveStorageError(legacy.message);
        // A durable legacy pointer keeps old saves available if first migration
        // is interrupted. The marker prevents a missing migrated pointer from
        // ever importing an abandoned legacy journey again.
        await this.storage.setItem(this.pointerKey,JSON.stringify({format:'petriverse-journey-pointer',version:1,legacy:true}));
        await this.storage.setItem(this.key+'.managed','1');
        if(await this.storage.getItem(this.key+'.managed')!=='1')throw new SaveStorageError('The save index could not be initialized.');
      }else if(await this.storage.getItem(this.key+'.managed')===null){
        await this.storage.setItem(this.key+'.managed','1');
        if(await this.storage.getItem(this.key+'.managed')!=='1')throw new SaveStorageError('The save index could not be initialized.');
      }
      if(!replace&&current&&this.loadedRun!==current.run)throw new SaveStorageError('This journey has been replaced. Reload before saving.');
      if(!replace&&current&&current.boundary===boundary(snapshot)){
        await this.repository(current,'exact').save({version:1,generation:current.generation,snapshot});return;
      }
      if(!replace&&current){
        const previous=JSON.parse(current.boundary) as [number,number,number,string,Record<string,string>];
        if(snapshot.seed!==previous[0]||snapshot.index<previous[1]||snapshot.retries<previous[2]||
          (snapshot.index===previous[1]&&snapshot.retries===previous[2]&&previous[3]!=='entry'&&
            !['complete','loss'].includes(snapshot.encounter.run.state)))throw new SaveStorageError('An older encounter cannot replace the current checkpoint.');
      }
      if(current){
        // Replacing a boundary must respect future data in either selected
        // record, just as an ordinary exact save respects its future backup.
        for(const kind of ['exact','checkpoint'] as const){
          const saved=await this.repository(current,kind).load();
          if(saved.status==='unsupported')throw new UnsupportedSaveVersionError();
          if(saved.status==='error')throw new SaveStorageError(saved.message);
        }
      }
      const generation=identity();
      const next:Pointer={format:'petriverse-journey-pointer',version:1,slot:current?.slot===0?1:0,
        generation,run:replace||!current?generation:current.run,boundary:boundary(snapshot)};
      // Old snapshots did not record whether retry healing had been applied.
      // Keep their exact state rather than guessing at a different entry health.
      const checkpoint=snapshot.checkpoint.retryHealing===undefined?snapshot:JourneySession.restore(snapshot).entrySnapshot();
      await this.repository(next,'checkpoint').save({version:1,generation,snapshot:checkpoint});
      await this.repository(next,'exact').save({version:1,generation,snapshot});
      const raw=JSON.stringify(next);
      // setItem commits one key atomically; readback failure cannot establish
      // whether that commit happened, so callers must reload instead of guessing.
      try{
        await this.storage.setItem(this.pointerKey,raw);
        if(await this.storage.getItem(this.pointerKey)!==raw)throw new Error('Unconfirmed pointer');
      }catch{throw new SaveCommitUncertainError();}
      this.loadedRun=next.run;
    });
  }
}
