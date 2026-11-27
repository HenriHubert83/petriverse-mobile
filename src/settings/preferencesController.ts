import {SaveRepository,UnsupportedSaveVersionError,type KeyValueStorage} from '../storage/saveRepository';
import {DEFAULT_PREFERENCES,parsePreferences,type Preferences,type PreferencesPatch} from './preferences';

export class PreferencesController {
  value:Readonly<Preferences>={...DEFAULT_PREFERENCES};
  loaded=false;
  saving=false;
  writable=false;
  error='';
  private dirty=false;
  private revision=0;
  private pending=0;
  private loading:Promise<void>|undefined;
  private readonly listeners=new Set<()=>void>();
  private readonly repository:SaveRepository<Preferences>;
  constructor(storage:KeyValueStorage,key='petriverse.preferences'){
    this.repository=new SaveRepository(storage,key,parsePreferences);
  }
  subscribe(listener:()=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
  private notify(){for(const listener of this.listeners)listener();}
  load():Promise<void>{
    if(this.loading)return this.loading;
    this.loading=this.read().finally(()=>{this.loading=undefined;});return this.loading;
  }
  private async read(){
    if(this.dirty&&this.writable){await this.persist();return;}
    const result=await this.repository.load();
    this.loaded=true;this.writable=result.status==='empty'||result.status==='ready'||result.status==='recovered';
    if(result.status==='ready'||result.status==='recovered')this.value=Object.freeze(result.value);
    if(result.status==='empty')this.value=Object.freeze({...DEFAULT_PREFERENCES});
    this.error=this.writable?'':result.status==='unsupported'?
      'These settings need a newer version of Petriverse. They have been kept unchanged.':
      'Your saved settings could not be read. Please retry. Defaults are in use for now.';
    this.notify();
  }
  async update(patch:PreferencesPatch):Promise<void>{
    if(!this.loaded||!this.writable)return;
    const next=parsePreferences({...this.value,...patch,version:1});
    if(JSON.stringify(next)===JSON.stringify(this.value))return;
    this.value=Object.freeze(next);this.revision++;this.dirty=true;
    await this.persist();
  }
  private async persist(){
    const revision=this.revision,value={...this.value};
    this.pending++;this.saving=true;this.notify();
    try{
      await this.repository.save(value);
      if(revision===this.revision){this.dirty=false;this.error='';}
    }catch(error){
      if(error instanceof UnsupportedSaveVersionError){
        this.writable=false;this.dirty=false;
        this.error='These settings need a newer version of Petriverse. They have been kept unchanged.';
      }else if(revision===this.revision){
        this.error='Your settings are active but could not be saved. Please retry.';
      }
    }finally{this.pending--;this.saving=this.pending>0;this.notify();}
  }
  async retry():Promise<void>{if(this.writable&&this.dirty)await this.persist();else await this.load();}
}
