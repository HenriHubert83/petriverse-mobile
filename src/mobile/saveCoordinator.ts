import type {SaveLoadResult} from '../storage/saveRepository';

export const AUTOSAVE_INTERVAL_MS=8000;
interface Repository<T>{load():Promise<SaveLoadResult<T>>;save(value:T):Promise<void>;replace?:(value:T)=>Promise<void>}
export interface SaveCoordinatorOptions<Session,Snapshot,Profile>{
  journey:Repository<Snapshot>;profile:Repository<Profile>;
  createSession:(profile:Profile)=>Session;capture:(session:Session)=>Snapshot;restore:(snapshot:Snapshot)=>Session;
  createProfile:()=>Profile;observeProfile:(profile:Profile,session:Session)=>Profile;
  finished:(session:Session)=>boolean;pause:(session:Session)=>void;
}

// Owns the lifecycle of saves independently of React and native storage. A queued
// snapshot belongs to one session. Replacing a journey waits behind older writes;
// delayed callbacks from that older session cannot overwrite the new journey.
export class SaveCoordinator<Session,Snapshot,Profile>{
  session:Session|undefined;
  profile:Profile;
  screen:'menu'|'game'='menu';
  loaded=false;busy=false;saving=false;
  notice='';error='';profileError='';savedAt:number|undefined;
  private loadStatus:SaveLoadResult<Snapshot>['status']='empty';
  private profileWritable=false;
  private loading:Promise<void>|undefined;
  private queue:Promise<unknown>=Promise.resolve();
  private pending=0;
  private attached=true;
  private listeners=new Set<()=>void>();
  constructor(private readonly options:SaveCoordinatorOptions<Session,Snapshot,Profile>){
    this.profile=options.createProfile();
  }
  subscribe(listener:()=>void):()=>void{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
  attach():void{this.attached=true;}
  detach():void{this.attached=false;}
  private notify():void{for(const listener of this.listeners)listener();}
  get canStart():boolean{return this.loaded&&!this.busy&&!['error','unsupported'].includes(this.loadStatus);}
  get needsConfirmation():boolean{return this.loadStatus==='corrupt'||(this.session!==undefined&&!this.options.finished(this.session));}
  get canContinue():boolean{return this.loaded&&!this.busy&&this.session!==undefined;}
  get canRetryLoad():boolean{return this.loaded&&!this.busy&&!this.session&&['error','unsupported'].includes(this.loadStatus);}
  get isFinished():boolean{return this.session!==undefined&&this.options.finished(this.session);}
  get canEditProfile():boolean{return this.loaded&&!this.busy&&this.profileWritable&&this.attached;}
  private enqueue<T>(operation:()=>Promise<T>):Promise<T>{
    this.pending++;this.saving=true;this.notify();
    const result=this.queue.then(operation);
    this.queue=result.then(()=>undefined,()=>undefined);
    return result.finally(()=>{this.pending--;this.saving=this.pending>0;this.notify();});
  }
  load():Promise<void>{
    if(this.loading)return this.loading;
    if(this.loaded)return Promise.resolve();
    this.busy=true;this.notify();
    this.loading=this.loadData().finally(()=>{this.loaded=true;this.busy=false;this.loading=undefined;this.notify();});
    return this.loading;
  }
  private async loadData():Promise<void>{
    const safeLoad=async<T>(repo:Repository<T>):Promise<SaveLoadResult<T>>=>{
      try{return await repo.load();}catch{return {status:'error',message:'Local saves could not be accessed. Please try again.'};}
    };
    const [journey,profile]=await Promise.all([safeLoad(this.options.journey),safeLoad(this.options.profile)]);
    this.loadStatus=journey.status;
    if(journey.status==='ready'||journey.status==='recovered'){
      try{
        this.session=this.options.restore(journey.value);
        this.options.pause(this.session);
        if(journey.status==='recovered')this.notice=journey.recovery==='checkpoint'?
          'Recovered a safe encounter checkpoint. Progress since that checkpoint may be missing.':
          'Recovered your previous save from backup. A little recent progress may be missing.';
      }catch(error){
        this.loadStatus=error instanceof Error&&error.name==='UnsupportedSaveVersionError'?'unsupported':'corrupt';
        this.error=this.loadStatus==='unsupported'?'This journey needs a newer version of Petriverse. Your save has been kept unchanged.':'Your journey could not be restored. Its saved data has been kept unchanged.';
      }
    }else if('message' in journey)this.error=journey.message;
    this.applyProfileLoad(profile);
  }
  private applyProfileLoad(result:SaveLoadResult<Profile>):void{
    if(result.status==='ready'||result.status==='recovered'){
      this.profile=result.value;this.profileWritable=true;
      this.profileError=result.status==='recovered'?'Recovered your previous profile from backup. A little recent progress may be missing.':'';
    }else if(result.status==='empty'){
      this.profile=this.options.createProfile();this.profileWritable=true;this.profileError='';
    }else{
      this.profileWritable=false;
      this.profileError=result.status==='unsupported'?'Your profile needs a newer version of Petriverse. It has been kept unchanged.':'Your profile could not be loaded. Journey progress can still be saved. Retry profile loading when ready.';
    }
  }
  async retryLoad():Promise<void>{
    if(!this.canRetryLoad)return;
    this.loaded=false;this.error='';this.notice='';return this.load();
  }
  async retryProfile():Promise<void>{
    if(this.busy||!this.loaded)return;
    this.busy=true;this.notify();
    await this.enqueue(async()=>{try{
      if(!this.attached)return;
      // A failed write leaves a newer in-memory profile. Reloading the older
      // disk copy here would discard discoveries from an earlier encounter.
      if(!this.profileWritable){
        try{this.applyProfileLoad(await this.options.profile.load());}
        catch{this.profileWritable=false;this.profileError='Your profile could not be loaded. Journey saves are still available.';}
      }
      if(this.profileWritable){
        if(this.session)this.profile=this.options.observeProfile(this.profile,this.session);
        await this.saveProfile(this.profile);
      }
    }catch{this.profileError='Your profile could not be updated. Your journey is still available.';}
    finally{this.busy=false;this.notify();}
    });
  }
  continueJourney():boolean{
    if(!this.canContinue)return false;
    this.options.pause(this.session!);this.screen='game';this.notify();return true;
  }
  // Profile-only actions use the same queue as journey observations. Keep the
  // newest edits in memory after a write failure so Retry never reloads over them.
  updateProfile(update:(profile:Profile)=>Profile):Promise<boolean>{
    if(!this.canEditProfile)return Promise.resolve(false);
    let next:Profile;
    try{next=update(this.profile);}
    catch{this.profileError='Your pond could not be updated. Please try again.';this.notify();return Promise.resolve(false);}
    this.profile=next;this.notify();
    return this.enqueue(async()=>{
      if(!this.attached||!this.profileWritable)return false;
      return this.saveProfile(next);
    });
  }
  async startNew(confirmed=false):Promise<boolean>{
    if(!this.canStart||(this.needsConfirmation&&!confirmed))return false;
    this.busy=true;this.error='';this.notify();
    let candidate:Session,snapshot:Snapshot;
    try{candidate=this.options.createSession(this.profile);snapshot=this.options.capture(candidate);}
    catch{this.busy=false;this.error='A new journey could not be prepared. Your existing journey is unchanged.';this.notify();return false;}
    return this.enqueue(async()=>{
      try{
        if(!this.attached||['error','unsupported'].includes(this.loadStatus))return false;
        await (this.options.journey.replace?.(snapshot)??this.options.journey.save(snapshot));
        // Publish the new session only after the journey write succeeds.
        this.session=candidate;this.screen='game';this.loadStatus='ready';this.savedAt=Date.now();this.notice='';
        if(this.profileWritable&&this.attached){
          try{this.profile=this.options.observeProfile(this.profile,candidate);await this.saveProfile(this.profile);}
          catch{this.profileError='Your new journey was saved, but your profile could not be updated. Please try again.';}
        }
        return true;
      }catch(error){
        if(this.unconfirmedCommit(error))return false;
        this.error=this.session?'The new journey could not be saved. Your previous journey is still available. Please try again.':'The new journey could not be saved. Please try again.';
        return false;
      }finally{this.busy=false;this.notify();}
    });
  }
  save(session:Session|undefined=this.session):Promise<boolean>{
    if(!session||session!==this.session||!this.loaded||this.busy||['error','unsupported'].includes(this.loadStatus))return Promise.resolve(false);
    let snapshot:Snapshot,profile=this.profile,saveProfile=this.profileWritable,profileObservationError='';
    try{
      snapshot=this.options.capture(session);
    }catch{this.error='Your progress could not be prepared for saving. Please try again.';this.notify();return Promise.resolve(false);}
    if(this.profileWritable){
      try{profile=this.options.observeProfile(this.profile,session);this.profile=profile;}
      catch{saveProfile=false;profileObservationError='Your profile could not be updated. Journey saving is still available.';this.profileError=profileObservationError;}
    }
    return this.enqueue(async()=>{
      try{
        if(!this.attached||session!==this.session||['error','unsupported'].includes(this.loadStatus))return false;
        await this.options.journey.save(snapshot);
        this.loadStatus='ready';this.savedAt=Date.now();this.error='';
        if(saveProfile&&this.attached)await this.saveProfile(profile);
        else if(profileObservationError)this.profileError=profileObservationError;
        return true;
      }catch(error){
        if(this.unconfirmedCommit(error))return false;
        this.error='Your latest progress could not be saved. Keep the app open and try again.';
        return false;
      }
    });
  }
  private unconfirmedCommit(error:unknown):boolean{
    if(!(error instanceof Error)||error.name!=='SaveCommitUncertainError')return false;
    // A storage readback failure cannot tell us whether the pointer committed.
    // Reload before permitting old in-memory state to replace durable progress.
    this.loadStatus='error';this.session=undefined;this.screen='menu';
    this.error='Saving could not be confirmed. Retry loading to check your saved journey.';return true;
  }
  private async saveProfile(profile:Profile):Promise<boolean>{
    try{await this.options.profile.save(profile);this.profileError='';return true;}
    catch{this.profileError=this.session?'Your journey was saved, but your profile could not be saved. Please try saving again.':'Your pond could not be saved. Keep the app open and try again.';return false;}
  }
  interrupt(session:Session|undefined=this.session):Promise<boolean>{
    if(!session||session!==this.session)return Promise.resolve(false);
    this.options.pause(session);this.notify();return this.save(session);
  }
  returnToTitle():Promise<boolean>{
    if(this.busy)return Promise.resolve(false);
    if(this.session)this.options.pause(this.session);
    this.screen='menu';this.notify();return this.save();
  }
  autosave():Promise<boolean>{return this.screen==='game'?this.save():Promise.resolve(false);}
}
