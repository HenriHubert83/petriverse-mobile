import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASE_CREATURES,CREATURE_CATALOGUE,CREATURE_FORMS,EXPEDITION_FORMS,assignCreatureForm,creatureDefinition,discoveryId,formDefinition,validForm} from '../src/content/creatureCatalogue';

test('the original journal contains 17 base species and 27 distinct forms with source identities',()=>{
  assert.equal(BASE_CREATURES.length,17);assert.equal(CREATURE_FORMS.length,27);assert.equal(CREATURE_CATALOGUE.length,44);
  assert.equal(new Set(CREATURE_CATALOGUE.map(entry=>entry.id)).size,44);
  assert.deepEqual(BASE_CREATURES.map(entry=>entry.id),['bacterium','phage','amoeba','bell_bud','food','cyst','spore','drifter','shellback','twinspore','bellwether','regent','conjoined','grazer','parasite','divider','warden']);
  assert.equal(creatureDefinition('bacterium')?.name,'Copper bacterium');
  assert.equal(creatureDefinition('moonlace')?.detail,'Rare visitor. Releases green food as its petals open. Leave it to feed the water, or loop around its pearl to bring it home.');
  assert.equal(creatureDefinition('shellback')?.detail,'A ridged glass shell protects its nucleus. Two pulses, or one wide Enzyme membrane.');
  for(const entry of CREATURE_FORMS){
    assert.ok(BASE_CREATURES.some(base=>base.id===entry.kind));
    assert.ok(entry.uv.x>0&&entry.uv.x<1&&entry.uv.y>0&&entry.uv.y<1);
    assert.ok(Number.isInteger(entry.firstStage)&&entry.firstStage>=0&&entry.firstStage<12);
  }
  assert.deepEqual(formDefinition('comet_spore')?.uv,{x:0.52,y:0.335});
  assert.deepEqual(formDefinition('glowdrift')?.uv,{x:0.574,y:0.419});
});

test('expedition catalogue retains four rare local choices in each biome',()=>{
  assert.equal(EXPEDITION_FORMS.length,12);
  assert.deepEqual(EXPEDITION_FORMS.map(entry=>entry.id),['chalice_grazer','sundial_alga','glasswing_spore','trident_hunter','crown_rotifer','amber_nautilus','veil_parasite','thistle_capsule','ribbon_divider','comet_spore','prism_hunter','sieve_alga']);
  for(let biome=0;biome<3;biome++)assert.equal(EXPEDITION_FORMS.filter(entry=>Math.floor(entry.firstStage/4)===biome).length,4);
  assert.ok(EXPEDITION_FORMS.every(entry=>entry.rare&&entry.expedition));
  assert.deepEqual(CREATURE_FORMS.filter(entry=>entry.rare&&!entry.expedition).map(entry=>entry.id),['glowdrift','glass_harp','moonlace']);
});

test('form choice matches independent unsigned 64-bit PCG reference vectors',()=>{
  // Reference vectors produced by a separate Python integer implementation of PCG32.
  // The large IDs detect accidental 32-bit coercion in the cosmetic seed expression.
  const ids=[1,2,3,17,50,100000,999999999];
  const choose=(kind:string,seed:number)=>ids.map(id=>assignCreatureForm({id,kind,form:''},seed,11));
  assert.deepEqual(choose('food',73),['spiral_alga','','fern_desmid','','','spiral_alga','fern_desmid']);
  assert.deepEqual(choose('spore',73),['sail_spore','','snow_spore','','','sail_spore','snow_spore']);
  assert.deepEqual(choose('divider',123456789),['','hourglass_divider','','hourglass_divider','hourglass_divider','','']);
});

test('ordinary cosmetic choices obey introduction stages and never introduce rare visitors',()=>{
  const selected=new Set<string>();
  for(let stage=0;stage<12;stage++)for(const base of BASE_CREATURES)for(let id=1;id<=80;id++){
    const body={id,kind:base.id,form:''};
    const result=assignCreatureForm(body,73,stage);assert.equal(body.form,result);
    if(!result)continue;
    const entry=formDefinition(result);assert.ok(entry);assert.equal(entry.kind,base.id);
    assert.ok(entry.firstStage<=stage);assert.equal(entry.rare,false);selected.add(result);
  }
  assert.deepEqual([...selected].sort(),CREATURE_FORMS.filter(entry=>!entry.rare).map(entry=>entry.id).sort());
  assert.equal(assignCreatureForm({id:1,kind:'food',form:''},73,0),'');
  assert.throws(()=>assignCreatureForm({id:1.5,kind:'food',form:''},73,0),RangeError);
  assert.throws(()=>assignCreatureForm({id:1,kind:'food',form:''},NaN,0),RangeError);
});

test('discovery identities tolerate legacy base forms and reject mismatched or unknown forms',()=>{
  assert.equal(validForm('','spore'),true);
  assert.equal(validForm('sail_spore','spore'),true);assert.equal(validForm('sail_spore','food'),false);
  assert.equal(discoveryId('spore','sail_spore'),'sail_spore');
  assert.equal(discoveryId('spore',''),'spore');assert.equal(discoveryId('food','sail_spore'),'food');
  assert.equal(discoveryId('food','unknown_form'),'food');assert.equal(discoveryId('unknown_species','unknown_form'),'');
  assert.equal(formDefinition('food'),undefined);assert.equal(creatureDefinition('__proto__'),undefined);
  assert.equal(discoveryId('constructor','toString'),'');
});
