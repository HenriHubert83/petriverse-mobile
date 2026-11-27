import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journalEntries,journalProgress,creatureSearchHint} from '../src/content/journal';
import {CREATURE_CATALOGUE,EXPEDITION_FORMS,formDefinition} from '../src/content/creatureCatalogue';

test('journal masks undiscovered names and behavior but keeps all 44 entries reachable',()=>{
  const all=journalEntries([]);assert.equal(all.length,44);
  assert.equal(new Set(all.map(entry=>entry.id)).size,44);
  assert.ok(all.every(entry=>!entry.known&&entry.name==='Undiscovered'));
  assert.ok(all.every(entry=>entry.detail!==CREATURE_CATALOGUE.find(c=>c.id===entry.id)!.detail));
  assert.deepEqual(journalEntries([],'discovered'),[]);
  assert.equal(journalEntries(CREATURE_CATALOGUE.map(c=>c.id),'undiscovered').length,0);
});
test('journal combines saved and current discoveries without inflating catalogue progress',()=>{
  const saved=['moonlace','food','food','unknown'],seen=['food','glasswing_spore'];
  assert.deepEqual(journalProgress(saved,seen),{found:3,total:44});
  const discovered=journalEntries(saved,'discovered',seen);
  assert.equal(discovered.length,3);assert.ok(discovered.every(entry=>entry.known&&entry.name!=='Undiscovered'));
  assert.equal(discovered.find(entry=>entry.id==='moonlace')!.detail,formDefinition('moonlace')!.detail);
  assert.equal(journalEntries(saved,'undiscovered',seen).length,41);
});
test('undiscovered helpers and expedition forms retain actionable original habitat directions',()=>{
  for(const id of ['moonlace','glass_harp','glowdrift'])assert.match(creatureSearchHint(formDefinition(id)!),/sheltered route/);
  for(const entry of EXPEDITION_FORMS){
    const hint=creatureSearchHint(entry);assert.match(hint,/one of four/);assert.doesNotMatch(hint,/sheltered route/);
    assert.ok(hint.includes(entry.firstStage<4?'Stillwater':entry.firstStage<8?'Glassgarden':'Blue Deep'));
  }
  assert.match(creatureSearchHint(formDefinition('sail_spore')!),/form varies/);
});
