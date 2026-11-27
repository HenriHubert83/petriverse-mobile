import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PreferencesController} from '../src/settings/preferencesController';
import {DEFAULT_PREFERENCES,parsePreferences} from '../src/settings/preferences';
import {SaveRepository,UnsupportedSaveVersionError,type KeyValueStorage} from '../src/storage/saveRepository';
class Storage implements KeyValueStorage {
  data=new Map<string,string>();failRead=false;failWrite=false;writes=0;
  async getItem(key:string){if(this.failRead)throw new Error('offline');return this.data.get(key)??null;}
  async setItem(key:string,value:string){if(this.failWrite)throw new Error('full');this.writes++;this.data.set(key,value);}
  async removeItem(key:string){this.data.delete(key);}
}
const envelope=(data:unknown)=>JSON.stringify({format:'petriverse-local-save',version:1,data});

test('preferences preserve original defaults and migrate partial legacy preferences',()=>{
  assert.deepEqual(parsePreferences({}),DEFAULT_PREFERENCES);
  const migrated=parsePreferences({version:0,musicVolume:.3,highContrast:true});
  assert.equal(migrated.version,1);assert.equal(migrated.musicVolume,.3);assert.equal(migrated.highContrast,true);assert.equal(migrated.subtitles,true);
  for(const invalid of [null,[],{version:1},{version:'1'},{musicVolume:NaN},{effectsVolume:1.1},{muted:1},{visualQuality:1.5}])assert.throws(()=>parsePreferences(invalid));
  assert.throws(()=>parsePreferences({version:2}),UnsupportedSaveVersionError);
});
test('settings changes take effect immediately and persist in update order',async()=>{
  const storage=new Storage(),controller=new PreferencesController(storage);await controller.load();
  assert.equal(controller.loaded,true);assert.equal(controller.writable,true);
  const first=controller.update({musicVolume:.2}),second=controller.update({reducedMotion:true});
  assert.equal(controller.value.musicVolume,.2);assert.equal(controller.value.reducedMotion,true);assert.equal(controller.saving,true);
  await Promise.all([first,second]);assert.equal(controller.saving,false);assert.equal(controller.error,'');
  const restored=new PreferencesController(storage);await restored.load();assert.deepEqual(restored.value,controller.value);
});
test('failed writes retain active preferences and retry writes the newest values',async()=>{
  const storage=new Storage(),controller=new PreferencesController(storage);await controller.load();await controller.update({effectsVolume:.3});
  storage.failWrite=true;await controller.update({effectsVolume:.9,largeText:true});
  assert.equal(controller.value.effectsVolume,.9);assert.match(controller.error,/could not be saved/);
  storage.failWrite=false;await controller.retry();assert.equal(controller.error,'');
  const restored=new PreferencesController(storage);await restored.load();assert.equal(restored.value.effectsVolume,.9);assert.equal(restored.value.largeText,true);
});
test('corrupt settings recover verified backup and future versions remain untouched',async()=>{
  const storage=new Storage(),controller=new PreferencesController(storage);await controller.load();
  await controller.update({highContrast:true});await controller.update({musicVolume:.1});
  storage.data.set('petriverse.preferences','broken');
  const restored=new PreferencesController(storage);await restored.load();assert.equal(restored.value.highContrast,true);assert.equal(restored.value.musicVolume,.65);
  storage.data.set('petriverse.preferences',envelope({version:2}));
  const future=new PreferencesController(storage),before=new Map(storage.data);await future.load();
  assert.equal(future.writable,false);await future.update({muted:true});assert.deepEqual(storage.data,before);assert.match(future.error,/newer version/);
});
test('unreadable preferences never overwrite saved settings and retry recovers access',async()=>{
  const storage=new Storage(),repo=new SaveRepository(storage,'petriverse.preferences',parsePreferences);
  await repo.save({...DEFAULT_PREFERENCES,muted:true});storage.failRead=true;
  const controller=new PreferencesController(storage);await controller.load();const writes=storage.writes;
  await controller.update({musicVolume:0});assert.equal(storage.writes,writes);assert.equal(controller.writable,false);
  storage.failRead=false;await controller.retry();assert.equal(controller.value.muted,true);assert.equal(controller.writable,true);
});
test('newer backup discovered while saving is protected and disables further writes',async()=>{
  const storage=new Storage(),controller=new PreferencesController(storage);await controller.load();
  storage.data.set('petriverse.preferences.backup',envelope({version:5}));const writes=storage.writes;
  await controller.update({musicVolume:0});assert.equal(controller.writable,false);assert.equal(storage.writes,writes);assert.match(controller.error,/newer version/);
});
