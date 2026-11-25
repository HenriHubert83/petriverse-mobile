// Local durable saves adapted from prototype/scripts/journey_save.gd.
// Each backend setItem replaces one key. Multi-key writes are serialized here.
// Temporary data is never promoted by load; only a validated primary or backup is used.
export interface KeyValueStorage {
  getItem(key:string):Promise<string|null>;
  setItem(key:string,value:string):Promise<void>;
  removeItem(key:string):Promise<void>;
}

export type SaveLoadResult<T> =
  | {status:'ready'|'recovered';value:T}
  | {status:'empty'}
  | {status:'corrupt'|'unsupported'|'error';message:string};

export class UnsupportedSaveVersionError extends Error {
  constructor(message='This save was created by a newer version of Petriverse.'){
    super(message);this.name='UnsupportedSaveVersionError';
  }
}
export class SaveStorageError extends Error {
  constructor(message:string){super(message);this.name='SaveStorageError';}
}

type Inspection<T> = {kind:'valid';value:T;raw:string}|{kind:'missing'|'invalid'|'unsupported'};
const FORMAT='petriverse-local-save',VERSION=1,MAX_TEXT_LENGTH=8*1024*1024;
// A remounted React root can create a new repository while old native writes finish.
// Serialize by backend identity and key across repository instances as well.
const queues=new WeakMap<KeyValueStorage,Map<string,Promise<unknown>>>();
const unsupported=(error:unknown)=>error instanceof Error&&error.name==='UnsupportedSaveVersionError';
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);

export class SaveRepository<T> {
  readonly backupKey:string;
  readonly temporaryKey:string;
  readonly backupTemporaryKey:string;
  constructor(private readonly storage:KeyValueStorage,readonly key:string,private readonly parse:(value:unknown)=>T){
    if(!key)throw new Error('A save key is required.');
    this.backupKey=key+'.backup';this.temporaryKey=key+'.temporary';this.backupTemporaryKey=key+'.backup.temporary';
  }

  private enqueue<R>(operation:()=>Promise<R>):Promise<R>{
    let backendQueues=queues.get(this.storage);
    if(!backendQueues){backendQueues=new Map();queues.set(this.storage,backendQueues);}
    const result=(backendQueues.get(this.key)??Promise.resolve()).then(operation);
    backendQueues.set(this.key,result.catch(()=>undefined));return result;
  }
  private inspect(raw:string|null):Inspection<T>{
    if(raw===null)return {kind:'missing'};
    if(raw.length>MAX_TEXT_LENGTH)return {kind:'invalid'};
    try{
      const envelope:unknown=JSON.parse(raw);
      if(!record(envelope)||envelope.format!==FORMAT||!Number.isSafeInteger(envelope.version))return {kind:'invalid'};
      if((envelope.version as number)>VERSION)return {kind:'unsupported'};
      if(envelope.version!==VERSION||!Object.hasOwn(envelope,'data'))return {kind:'invalid'};
      return {kind:'valid',value:this.parse(envelope.data),raw};
    }catch(error){return {kind:unsupported(error)?'unsupported':'invalid'};}
  }

  load():Promise<SaveLoadResult<T>>{
    return this.enqueue(async()=>{
      try{
        const primary=this.inspect(await this.storage.getItem(this.key));
        if(primary.kind==='valid')return {status:'ready',value:primary.value};
        if(primary.kind==='unsupported')return {status:'unsupported',message:'This save needs a newer version of Petriverse. It has been kept unchanged.'};
        const backup=this.inspect(await this.storage.getItem(this.backupKey));
        if(backup.kind==='unsupported')return {status:'unsupported',message:'The saved backup needs a newer version of Petriverse. It has been kept unchanged.'};
        if(backup.kind==='valid')return {status:'recovered',value:backup.value};
        if(primary.kind==='missing'&&backup.kind==='missing')return {status:'empty'};
        return {status:'corrupt',message:'The journey and its backup could not be read. Start a new journey when you are ready.'};
      }catch{return {status:'error',message:'Local saves could not be accessed. Please try again.'};}
    });
  }

  // Capture and validate synchronously when queued, before callers can mutate value.
  save(value:T):Promise<void>{
    let raw:string;
    try{
      raw=JSON.stringify({format:FORMAT,version:VERSION,data:value});
      const candidate=this.inspect(raw);
      if(candidate.kind==='unsupported')throw new UnsupportedSaveVersionError();
      if(candidate.kind!=='valid')throw new SaveStorageError('The current journey could not be saved because its data is invalid.');
    }catch(error){return Promise.reject(error);}
    return this.enqueue(()=>this.write(raw));
  }

  private async writeVerified(key:string,raw:string):Promise<void>{
    await this.storage.setItem(key,raw);
    const stored=await this.storage.getItem(key);
    if(stored!==raw||this.inspect(stored).kind!=='valid')throw new SaveStorageError('The saved data could not be verified. Your previous save is retained when available.');
  }
  private async cleanup(key:string):Promise<void>{
    try{await this.storage.removeItem(key);}catch{/* Committed saves remain usable if temporary cleanup fails. */}
  }
  private async write(raw:string):Promise<void>{
    // Read both before writing. A future-format backup must not be destroyed either.
    const primary=this.inspect(await this.storage.getItem(this.key));
    const backup=this.inspect(await this.storage.getItem(this.backupKey));
    if(primary.kind==='unsupported'||backup.kind==='unsupported')throw new UnsupportedSaveVersionError();
    try{
      await this.writeVerified(this.temporaryKey,raw);
      if(primary.kind==='valid'){
        // If primary is corrupt, retain the previous valid backup rather than copying corruption.
        await this.writeVerified(this.backupTemporaryKey,primary.raw);
        await this.writeVerified(this.backupKey,primary.raw);
      }
      await this.writeVerified(this.key,raw);
    }finally{
      await this.cleanup(this.temporaryKey);await this.cleanup(this.backupTemporaryKey);
    }
  }
}
